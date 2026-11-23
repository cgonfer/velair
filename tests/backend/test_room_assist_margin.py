"""Minimum corrections preserve room thresholds and device delivery contracts."""
from copy import deepcopy
import math
import unittest
from unittest.mock import AsyncMock, patch

from . import test_room_assist_single_delivery as transport
from .helpers import NOW
from custom_components.velair.models import normalize_preconditioning_data


class MinimumMarginTest(unittest.IsolatedAsyncioTestCase):
    setUp = transport.RoomAssistSingleDeliveryTest.setUp
    _async_save = transport.RoomAssistSingleDeliveryTest._async_save
    configure = transport.RoomAssistSingleDeliveryTest.configure

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    def configured(self, mode="heat", margin=10, maximum=10, band=.3, room=None):
        self.configure(mode=mode, target=19.5, room=room or ("19" if mode == "heat" else "20"), climate_temperature=21.5)
        config = self.data["zones"][self.entity_id]["preconditioning"]
        config.update(room_sensor_assist_minimum_margin=margin,
                      room_sensor_assist_max_delta=maximum, room_sensor_assist_deadband=band)
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        return normalize_preconditioning_data(config)

    async def test_complete_heat_and_cool_cycles_keep_room_thresholds(self):
        for mode in ("heat", "cool"):
            with self.subTest(mode=mode):
                self.scheduler._room_sensor_assist_states.clear()
                self.configured(mode)
                await self.scheduler.async_apply_current_schedule()
                active = 31.5 if mode == "heat" else 11.5
                neutral = 11.5 if mode == "heat" else 31.5
                self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity_id].applied_temperature, active)
                for room, expected in ((19.8 if mode == "heat" else 19.2, neutral),
                                       (19.5, neutral), (19.2 if mode == "heat" else 19.8, active)):
                    self.hass.states["sensor.room"].state = str(room)
                    await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
                    state = self.scheduler._room_sensor_assist_states[self.entity_id]
                    self.assertEqual(state.applied_temperature, expected)
                    self.assertTrue(state.minimum_margin["active"])
                    self.assertIsNone(state.minimum_margin["limited_by"])
                thresholds = self.scheduler.get_shared_demand_room_assist(self.entity_id)["thresholds"][mode]
                self.assertEqual(thresholds["start_temperature"], 19.2 if mode == "heat" else 19.8)
                self.assertEqual(thresholds["stop_temperature"], 19.8 if mode == "heat" else 19.2)

    def test_margin_zero_retains_legacy_calculation(self):
        config = self.configured(margin=0, maximum=2)
        legacy = dict(config)
        legacy.pop("room_sensor_assist_minimum_margin")
        for mode in ("heat", "cool"):
            for room in (18, 19.5, 21):
                for fixed in (True, False):
                    args = (self.entity_id, config, mode, 19.5, room, 21.7)
                    actual = self.scheduler._room_sensor_assist_target(*args, fixed_direction=fixed)
                    expected = self.scheduler._room_sensor_assist_target(self.entity_id, legacy, *args[2:], fixed_direction=fixed)
                    self.assertEqual(actual, expected)

    def test_scalar_auto_holding_does_not_strengthen_retained_direction(self):
        config = self.configured()
        for direction in ("heat", "cool"):
            neutral = self.scheduler._room_sensor_assist_target(self.entity_id, config, direction, 19.5, 19.5, 21.5, fixed_direction=False)
            self.assertFalse(neutral.minimum_margin["active"])
            self.assertEqual(neutral.applied_temperature, 21.5)
        for room, direction, target in ((19, "heat", 31.5), (20, "cool", 11.5)):
            result = self.scheduler._room_sensor_assist_target(self.entity_id, config, direction, 19.5, room, 21.5, fixed_direction=False)
            self.assertEqual(result.applied_temperature, target)

    def test_zero_deadband_equality_stays_neutral(self):
        config = self.configured(band=0)
        for mode in ("heat", "cool"):
            result = self.scheduler._room_sensor_assist_target(self.entity_id, config, mode, 19.5, 19.5, 21.5)
            self.assertFalse(result.minimum_margin["active"])
            for room in (19, 20):
                result = self.scheduler._room_sensor_assist_target(self.entity_id, config, mode, 19.5, room, 21.5)
                self.assertTrue(result.minimum_margin["active"])

    def test_step_and_physical_limits_are_reported(self):
        config = self.configured()
        result = self.scheduler._room_sensor_assist_target(self.entity_id, config, "heat", 19.5, 19, 21.7,
                                                         hysteresis_phase="towards_upper", hysteresis_target=19.8)
        self.assertEqual(result.applied_temperature, 31.5)
        self.assertEqual(result.minimum_margin["limited_by"], "step")
        result = self.scheduler._room_sensor_assist_target(self.entity_id, config, "heat", 19.5, 19, 30,
                                                         hysteresis_phase="towards_upper", hysteresis_target=19.8)
        self.assertEqual(result.applied_temperature, 35)
        self.assertEqual(result.minimum_margin["limited_by"], "maximum")
        config.update(room_sensor_assist_minimum_margin=.1, room_sensor_assist_max_delta=.1)
        for room, mode, expected in ((19, "heat", 22), (20, "cool", 21.5)):
            result = self.scheduler._room_sensor_assist_target(self.entity_id, config, mode, 19.5, room, 21.7, fixed_direction=False)
            self.assertEqual(result.applied_temperature, expected)
            self.assertEqual(result.minimum_margin["limited_by"], "step")

    def test_stronger_scheduled_guard_remains_authoritative(self):
        config = self.configured(margin=2, maximum=2)
        result = self.scheduler._room_sensor_assist_target(self.entity_id, config, "heat", 19.5, 20, 30,
                                                         hysteresis_phase="towards_lower", hysteresis_target=19.2)
        self.assertEqual(result.applied_temperature, 19.5)
        self.assertEqual(result.scheduled_target_guard, "heating_ceiling")

    async def test_merged_validation_and_failed_save_preserve_committed_state(self):
        self.configured(margin=1, maximum=2)
        await self.scheduler.async_apply_current_schedule()
        before = self.scheduler._room_sensor_assist_states[self.entity_id]
        for update in ({"room_sensor_assist_minimum_margin": 3}, {"room_sensor_assist_max_delta": .5},
                       {"room_sensor_assist_minimum_margin": math.nan}, {"room_sensor_assist_minimum_margin": -1},
                       {"room_sensor_assist_minimum_margin": 10.1}):
            with self.assertRaises(ValueError):
                await self.scheduler.async_update_zone_preconditioning(self.entity_id, update)
            self.assertIs(self.scheduler._room_sensor_assist_states[self.entity_id], before)
        with patch.object(self.scheduler, "_async_save_data", new=AsyncMock(side_effect=OSError("disk unavailable"))):
            with self.assertRaises(OSError):
                await self.scheduler.async_update_zone_preconditioning(self.entity_id, {"room_sensor_assist_minimum_margin": 2})
        self.assertEqual(self.data["zones"][self.entity_id]["preconditioning"]["room_sensor_assist_minimum_margin"], 1)
        self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity_id].hysteresis_phase, before.hysteresis_phase)

    async def test_successful_margin_update_preserves_phase_and_reports_accepted_value(self):
        self.configured(margin=1, maximum=10, room="19")
        await self.scheduler.async_apply_current_schedule()
        self.hass.states["sensor.room"].state = "19.5"
        before = self.scheduler._room_sensor_assist_states[self.entity_id]
        await self.scheduler.async_update_zone_preconditioning(self.entity_id, {"room_sensor_assist_minimum_margin": 10})
        after = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(after.hysteresis_phase, before.hysteresis_phase)
        self.assertEqual(after.applied_temperature, 31.5)
        status = self.scheduler.get_room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["minimum_margin"], {"configured": 10, "active": True, "limited_by": None})
        status["minimum_margin"]["configured"] = 0
        self.assertEqual(after.minimum_margin["configured"], 10)

    async def test_failed_delivery_does_not_commit_margin_or_opposite_target(self):
        self.configured()
        with patch.object(self.climate, "async_set_temperature", new=AsyncMock(side_effect=ValueError("device rejected"))):
            with self.assertRaisesRegex(ValueError, "device rejected"):
                await self.scheduler.async_apply_current_schedule()
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertFalse(self.scheduler.get_room_sensor_assist_status(self.entity_id)["minimum_margin"]["active"])

    async def test_superseded_calculation_does_not_commit_margin(self):
        self.configured()
        calculate = self.scheduler._room_sensor_assist_target
        def supersede(*args, **kwargs):
            result = calculate(*args, **kwargs)
            self.scheduler._climate_delivery.cancel(self.entity_id)
            return result
        with patch.object(self.scheduler, "_room_sensor_assist_target", side_effect=supersede):
            await self.scheduler.async_apply_current_schedule()
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.climate.calls, [])

    def test_native_range_margin_keeps_width_and_holding_stable(self):
        config = self.configured()
        for room, direction in ((18, "heat"), (25, "cool")):
            result = self.scheduler._room_sensor_assist_range_target(self.entity_id, config, 19, 24, room, 21.5)
            self.assertEqual(result.applied_high - result.applied_low, 5)
            self.assertTrue(result.minimum_margin["active"])
            self.assertLessEqual(result.applied_high, 35)
            self.assertGreaterEqual(result.applied_low, 5)
        holding = self.scheduler._room_sensor_assist_range_target(self.entity_id, config, 19, 24, 21, 21.5)
        self.assertFalse(holding.minimum_margin["active"])

    def test_fahrenheit_uses_delta_without_absolute_offset(self):
        config = self.configured(margin=18, maximum=18)
        self.climate.limits[self.entity_id] = (41, 95)
        self.climate.steps[self.entity_id] = .9
        result = self.scheduler._room_sensor_assist_target(self.entity_id, config, "heat", 68, 65, 70.7,
                                                         hysteresis_phase="towards_upper", hysteresis_target=68.9)
        self.assertAlmostEqual(result.applied_temperature, 88.7)
        self.assertAlmostEqual(result.minimum_margin["configured"], 18)


class MarginPortabilityTest(unittest.TestCase):
    def test_roundtrip_old_defaults_and_rejected_inconsistent_import(self):
        from .test_api import PortableTemperatureContractTest, api_module
        from types import SimpleNamespace
        fixture = PortableTemperatureContractTest()
        runtime = fixture._runtime(api_module.CELSIUS)
        runtime["entry"] = SimpleNamespace(options={})
        config = runtime["storage"].data["zones"]["climate.salon"]["preconditioning"]
        config.update(room_sensor_assist_minimum_margin=10, room_sensor_assist_max_delta=10)
        payload = api_module._build_export_payload(runtime, ["zones"])
        self.assertEqual(payload["model_version"], 29)
        imported = api_module._build_import_data(fixture._runtime(api_module.FAHRENHEIT), payload, ["zones"])
        self.assertEqual(imported["zones"]["climate.salon"]["preconditioning"]["room_sensor_assist_minimum_margin"], 18)
        old = deepcopy(payload)
        old["model_version"] = 28
        del old["sections"]["zones"]["climate.salon"]["preconditioning"]["room_sensor_assist_minimum_margin"]
        imported = api_module._build_import_data(fixture._runtime(api_module.CELSIUS), old, ["zones"])
        self.assertEqual(normalize_preconditioning_data(imported["zones"]["climate.salon"]["preconditioning"])["room_sensor_assist_minimum_margin"], 0)
        for margin, maximum in ((3, 2), (11, 11), (math.nan, 2)):
            bad = deepcopy(payload)
            bad["sections"]["zones"]["climate.salon"]["preconditioning"].update(
                room_sensor_assist_minimum_margin=margin, room_sensor_assist_max_delta=maximum)
            with self.assertRaises(ValueError):
                api_module._build_import_data(fixture._runtime(api_module.CELSIUS), bad, ["zones"])


class MinimumMarginRangeTest(unittest.IsolatedAsyncioTestCase):
    from .test_fixed_range_reference import FixedRangeReferenceTest as _fixture
    setUp = _fixture.setUp
    save = _fixture.save
    asyncTearDown = _fixture.asyncTearDown
    block = _fixture.block
    configure = _fixture.configure

    async def test_all_fixed_references_preserve_width_and_margin_metadata(self):
        for mode in ("heat", "cool"):
            for reference, target in (("low", 21), ("high", 25)):
                with self.subTest(mode=mode, reference=reference):
                    self.scheduler._room_sensor_assist_states.clear()
                    zone = self.configure(mode, reference, target - 1 if mode == "heat" else target + 1)
                    zone["preconditioning"].update(room_sensor_assist_minimum_margin=2,
                                                  room_sensor_assist_max_delta=10)
                    self.state.attributes["current_temperature"] = 22
                    self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                    await self.scheduler.async_apply_current_schedule()
                    state = self.scheduler._room_sensor_assist_states[self.entity]
                    self.assertEqual(state.applied_target_temp_high - state.applied_target_temp_low, 4)
                    self.assertTrue(state.minimum_margin["active"])
                    self.assertIsNone(state.minimum_margin["limited_by"])

    async def test_native_range_status_keeps_accepted_margin_and_holding_is_stable(self):
        zone = self.configure("heat_cool", "low", 20)
        zone.pop("target_range_reference")
        zone["preconditioning"].update(room_sensor_assist_minimum_margin=2,
                                      room_sensor_assist_max_delta=10)
        self.state.attributes["hvac_modes"].append("heat_cool")
        self.state.attributes["current_temperature"] = 22
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        await self.scheduler.async_apply_current_schedule()
        state = self.scheduler._room_sensor_assist_states[self.entity]
        status = self.scheduler.get_room_sensor_assist_status(self.entity)
        self.assertEqual(status["minimum_margin"], state.minimum_margin)
        self.assertTrue(status["minimum_margin"]["active"])
        self.hass.states["sensor.room"].state = "23"
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity)
        holding = self.scheduler._room_sensor_assist_states[self.entity]
        self.assertFalse(holding.minimum_margin["active"])
        pair = (holding.applied_target_temp_low, holding.applied_target_temp_high)
        self.state.attributes["current_temperature"] = 24
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity)
        after = self.scheduler._room_sensor_assist_states[self.entity]
        self.assertEqual((after.applied_target_temp_low, after.applied_target_temp_high), pair)

    def test_native_and_fixed_ranges_report_unavoidable_step_cap_fallback(self):
        for native in (False, True):
            with self.subTest(native=native):
                mode = "heat_cool" if native else "heat"
                zone = self.configure(mode, "low", 20)
                if native:
                    zone.pop("target_range_reference")
                zone["preconditioning"].update(room_sensor_assist_minimum_margin=.1,
                                              room_sensor_assist_max_delta=.1)
                config = normalize_preconditioning_data(zone["preconditioning"])
                result = self.scheduler._room_sensor_assist_range_target(
                    self.entity, config, 21, 25, 20, 21.7, hvac_mode=mode)
                self.assertEqual((result.applied_low, result.applied_high), (22, 26))
                self.assertTrue(result.minimum_margin["active"])
                self.assertEqual(result.minimum_margin["limited_by"], "step")

    def test_preparation_ignores_non_driving_fixed_reference_phase_in_metadata(self):
        from types import SimpleNamespace
        for mode in ("heat", "cool"):
            for reference, target in (("low", 21), ("high", 25)):
                with self.subTest(mode=mode, reference=reference):
                    room = target - .2 if mode == "heat" else target + .2
                    zone = self.configure(mode, reference, room)
                    zone["preconditioning"].update(room_sensor_assist_minimum_margin=2,
                                                  room_sensor_assist_max_delta=10)
                    config = normalize_preconditioning_data(zone["preconditioning"])
                    with patch.object(self.scheduler, "_offset_preparation", return_value=SimpleNamespace(direction=mode)):
                        result = self.scheduler._room_sensor_assist_range_target(
                            self.entity, config, 21, 25, room, 22, hvac_mode=mode)
                    self.assertTrue(result.minimum_margin["active"])
                    self.assertIsNone(result.minimum_margin["limited_by"])


class MinimumMarginPreparationTest(unittest.IsolatedAsyncioTestCase):
    from .test_preconditioning_offset_runtime import PreconditioningOffsetRuntimeTest as _fixture
    setUp = _fixture.setUp
    configure = _fixture.configure
    preparation = _fixture.preparation
    _async_save = _fixture._async_save
    asyncTearDown = _fixture.asyncTearDown

    async def test_margin_change_preserves_preparation_offset_and_effective_target(self):
        event = self.preparation()
        config = self.data["zones"][self.entity_id]["preconditioning"]
        config.update(room_sensor_assist_minimum_margin=1, room_sensor_assist_max_delta=10)
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        await self.scheduler._async_apply_event(event, source="test")
        await self.scheduler.async_update_zone_preconditioning(self.entity_id, {"room_sensor_assist_minimum_margin": 10})
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(state.target_temperature, 21)
        self.assertEqual(state.applied_temperature, 33)
        self.assertEqual(state.preconditioning_offset["applied"], 2)
        self.assertTrue(state.minimum_margin["active"])
