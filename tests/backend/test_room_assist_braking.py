"""Bounded fixed-direction braking, committed thresholds and configuration."""
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from . import test_room_assist_single_delivery as transport
from .helpers import NOW
from custom_components.velair.models import normalize_preconditioning_data
from custom_components.velair.room_assist_braking import braking_policy, validate_braking_settings


class RoomAssistBrakingTest(unittest.IsolatedAsyncioTestCase):
    setUp = transport.RoomAssistSingleDeliveryTest.setUp
    _async_save = transport.RoomAssistSingleDeliveryTest._async_save
    configure = transport.RoomAssistSingleDeliveryTest.configure

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    def setup_braking(self, mode="heat", level="high", room=None):
        self.configure(mode=mode, target=20.5, room=room or ("19" if mode == "heat" else "22"), climate_temperature=20.5)
        config = self.data["zones"][self.entity_id]["preconditioning"]
        config.update(room_sensor_assist_braking_level=level, room_sensor_assist_deadband=.5)
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        return normalize_preconditioning_data(config)

    async def refresh(self, temperature):
        self.hass.states["sensor.room"].state = str(temperature)
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
        return self.scheduler._room_sensor_assist_states[self.entity_id]

    async def test_full_cycles_and_committed_supply_thresholds(self):
        for mode in ("heat", "cool"):
            for level in ("moderate", "high"):
                with self.subTest(mode=mode, level=level):
                    self.scheduler._room_sensor_assist_states.clear()
                    self.setup_braking(mode, level)
                    await self.scheduler.async_apply_current_schedule()
                    driven = "towards_upper" if mode == "heat" else "towards_lower"
                    non_driven = "towards_lower" if mode == "heat" else "towards_upper"
                    stop = 20.5 if level == "high" else (21 if mode == "heat" else 20)
                    resume = 20 if mode == "heat" else 21
                    state = self.scheduler._room_sensor_assist_states[self.entity_id]
                    self.assertEqual(state.hysteresis_phase, driven)
                    self.assertEqual(state.hysteresis_target, 21 if mode == "heat" else 20)
                    state = await self.refresh(stop)
                    self.assertEqual(state.hysteresis_phase, non_driven)
                    self.assertTrue(state.braking["active"])
                    supply = self.scheduler.get_shared_demand_room_assist(self.entity_id)
                    self.assertTrue(supply["valid"])
                    self.assertFalse(supply["demand"])
                    self.assertEqual(supply["thresholds"][mode]["stop_temperature"], stop)
                    self.assertEqual(supply["thresholds"][mode]["start_temperature"], resume)
                    state = await self.refresh((stop + resume) / 2)
                    self.assertEqual(state.hysteresis_phase, non_driven)
                    state = await self.refresh(resume)
                    self.assertEqual(state.hysteresis_phase, driven)
                    self.assertFalse(state.braking["active"])

    async def test_braking_is_fixed_not_cumulative_and_readers_do_not_advance(self):
        self.setup_braking()
        await self.scheduler.async_apply_current_schedule()
        self.hass.states["sensor.room"].state = "20.5"
        before = self.scheduler._room_sensor_assist_states[self.entity_id]
        calls = len(self.climate.calls)
        for _ in range(3):
            status = self.scheduler.get_room_sensor_assist_status(self.entity_id)
            self.assertFalse(status["braking"]["active"])
            self.assertIs(self.scheduler._room_sensor_assist_states[self.entity_id], before)
        self.assertEqual(len(self.climate.calls), calls)
        state = await self.refresh(20.5)
        self.assertEqual(state.applied_temperature, 19.5)
        calls = len(self.climate.calls)
        for _ in range(3):
            state = await self.refresh(20.5)
            self.assertEqual(state.applied_temperature, 19.5)
        self.assertEqual(len(self.climate.calls), calls)
        self.assertTrue(self.scheduler.get_room_sensor_assist_status(self.entity_id)["braking"]["active"])

    def test_steps_limits_and_stronger_existing_inverse_correction(self):
        for mode, phase, sign in (("heat", "towards_lower", 1), ("cool", "towards_upper", -1)):
            for level, count in (("moderate", 1), ("high", 2)):
                config = self.setup_braking(mode, level)
                result = self.scheduler._room_sensor_assist_target(
                    self.entity_id, config, mode, 20.5, 20.5, 20.5,
                    hysteresis_phase=phase, hysteresis_target=20 if mode == "heat" else 21)
                self.assertEqual(result.applied_temperature, 20.5 - sign * .5 * count)
                stronger = self.scheduler._room_sensor_assist_target(
                    self.entity_id, config, mode, 20.5, 25 if mode == "heat" else 16, 20.5,
                    hysteresis_phase=phase, hysteresis_target=20 if mode == "heat" else 21)
                self.assertEqual(stronger.applied_temperature, 18.5 if mode == "heat" else 22.5)
        config = self.setup_braking()
        self.climate.limits[self.entity_id] = (20, 35)
        limited = self.scheduler._room_sensor_assist_target(
            self.entity_id, config, "heat", 20.5, 20.5, 20.5,
            hysteresis_phase="towards_lower", hysteresis_target=20)
        self.assertEqual(limited.applied_temperature, 20)
        self.assertEqual(limited.limited_by, "minimum")

    def test_high_preserves_original_driving_correction(self):
        config = self.setup_braking()
        for mode, phase, edge, room in (("heat", "towards_upper", 21, 20.4), ("cool", "towards_lower", 20, 20.6)):
            high = self.scheduler._room_sensor_assist_target(self.entity_id, config, mode, 20.5, room, 20.5, hysteresis_phase=phase, hysteresis_target=edge)
            default = self.scheduler._room_sensor_assist_target(self.entity_id, {**config, "room_sensor_assist_braking_level": "default"}, mode, 20.5, room, 20.5, hysteresis_phase=phase, hysteresis_target=edge)
            self.assertEqual(high.applied_temperature, default.applied_temperature)
            self.assertFalse(high.braking["active"])

    async def test_zero_band_stored_level_is_retained_but_suspended(self):
        self.setup_braking()
        config = self.data["zones"][self.entity_id]["preconditioning"]
        config["room_sensor_assist_deadband"] = 0
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        await self.scheduler.async_apply_current_schedule()
        braking = self.scheduler.get_room_sensor_assist_status(self.entity_id)["braking"]
        self.assertEqual(braking["configured_level"], "high")
        self.assertEqual(braking["effective_level"], "default")
        self.assertEqual(braking["reason"], "zero_deadband")
        self.assertFalse(braking["active"])

    async def test_level_and_nondefault_deadband_changes_reset_phase(self):
        config = self.setup_braking()
        await self.scheduler.async_apply_current_schedule()
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        for patch_config in ({"room_sensor_assist_braking_level": "moderate"}, {"room_sensor_assist_deadband": .6}):
            values = {**config, **patch_config}
            phase = self.scheduler._room_sensor_assist_hysteresis(self.entity_id, values, 20.5, 20.4, "heat", "sensor.room", "tuesday", "17:00", state)
            self.assertEqual(phase[0], "towards_lower")

    async def test_final_merged_update_validation_and_failed_save_preserve_runtime(self):
        self.setup_braking()
        await self.scheduler.async_apply_current_schedule()
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        for patch_values in ({"room_sensor_assist_deadband": 0}, {"room_sensor_assist_braking_level": "unknown"}):
            with self.assertRaises(ValueError):
                await self.scheduler.async_update_zone_preconditioning(self.entity_id, patch_values)
            self.assertIs(self.scheduler._room_sensor_assist_states[self.entity_id], state)
        with patch.object(self.scheduler, "_async_save_data", new=AsyncMock(side_effect=OSError("disk unavailable"))):
            with self.assertRaises(OSError):
                await self.scheduler.async_update_zone_preconditioning(self.entity_id, {"room_sensor_assist_braking_level": "moderate"})
        self.assertEqual(self.data["zones"][self.entity_id]["preconditioning"]["room_sensor_assist_braking_level"], "high")
        self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity_id].braking["configured_level"], "high")

    def test_normalization_and_pure_policy_suspend_unsupported_modes(self):
        self.assertEqual(normalize_preconditioning_data({})["room_sensor_assist_braking_level"], "default")
        self.assertEqual(normalize_preconditioning_data({"room_sensor_assist_braking_level": "unknown"})["room_sensor_assist_braking_level"], "default")
        config = self.setup_braking()
        for mode in ("auto", "heat_cool", None):
            policy = braking_policy(config, mode, 20.5, .5, "towards_lower")
            self.assertEqual(policy["reason"], "unsupported_mode")
            self.assertFalse(policy["active"])
        for values in ({"room_sensor_assist_braking_level": "bad"}, {"room_sensor_assist_braking_level": "high", "room_sensor_assist_deadband": 0}):
            with self.assertRaises(ValueError):
                validate_braking_settings(values)

    async def test_phase_is_committed_even_when_physical_limit_keeps_same_setpoint(self):
        self.setup_braking()
        self.climate.limits[self.entity_id] = (20, 35)
        self.hass.states[self.entity_id].attributes["current_temperature"] = 18
        await self.scheduler.async_apply_current_schedule()
        calls = len(self.climate.calls)
        state = await self.refresh(20.5)
        self.assertEqual(state.applied_temperature, 20)
        self.assertTrue(state.braking["active"])
        self.assertEqual(len(self.climate.calls), calls)
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity_id)["demand"])

    def test_fahrenheit_step_and_band_are_used_without_celsius_assumptions(self):
        config = self.setup_braking()
        config.update(room_sensor_assist_deadband=.9, room_sensor_assist_max_delta=3.6)
        self.climate.steps[self.entity_id] = .9
        self.climate.limits[self.entity_id] = (41, 95)
        result = self.scheduler._room_sensor_assist_target(
            self.entity_id, config, "heat", 68.9, 68.9, 68.9,
            hysteresis_phase="towards_lower", hysteresis_target=68)
        self.assertAlmostEqual(result.braking["setpoint_bound"], 67.1)
        self.assertAlmostEqual(result.applied_temperature, 67.1)
        self.assertAlmostEqual(result.braking["resume_temperature"], 68)

    async def test_disabled_and_native_source_report_suspended_policy(self):
        self.setup_braking()
        config = self.data["zones"][self.entity_id]["preconditioning"]
        config["room_sensor_assist_enabled"] = False
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        self.assertEqual(self.scheduler.get_room_sensor_assist_status(self.entity_id)["braking"]["reason"], "disabled")
        config.update(room_sensor_assist_enabled=True, room_sensor_schedule={"enabled": True, "default_source": None, "periods": []})
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        braking = self.scheduler.get_room_sensor_assist_status(self.entity_id)["braking"]
        self.assertEqual(braking["reason"], "native_reference")
        self.assertEqual(braking["configured_level"], "high")
        self.assertEqual(braking["effective_level"], "default")

    async def test_status_suspends_missing_readings_and_keeps_committed_step_bound(self):
        self.setup_braking()
        await self.scheduler.async_apply_current_schedule()
        await self.refresh(20.5)
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(state.braking["setpoint_bound"], 19.5)
        calls = len(self.climate.calls)
        self.climate.steps[self.entity_id] = 1
        status = self.scheduler.get_room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["braking"]["setpoint_bound"], 19.5)
        # The read is detached from committed state even for nested metadata.
        status["braking"]["setpoint_bound"] = -100
        self.assertEqual(state.braking["setpoint_bound"], 19.5)
        self.hass.states["sensor.room"].state = "unavailable"
        status = self.scheduler.get_room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["braking"]["reason"], "room_sensor_unavailable")
        self.assertEqual(status["braking"]["effective_level"], "default")
        self.assertFalse(status["braking"]["active"])
        self.hass.states["sensor.room"].state = "20.5"
        self.hass.states[self.entity_id].attributes["current_temperature"] = None
        status = self.scheduler.get_room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["braking"]["reason"], "climate_temperature_unavailable")
        self.assertFalse(status["braking"]["active"])
        self.assertEqual(len(self.climate.calls), calls)


class BrakingFixedRangeTest(unittest.IsolatedAsyncioTestCase):
    from .test_fixed_range_reference import FixedRangeReferenceTest as _fixture
    setUp = _fixture.setUp
    save = _fixture.save
    asyncTearDown = _fixture.asyncTearDown
    block = _fixture.block
    configure = _fixture.configure

    async def test_braking_preserves_range_width_and_supply_reference(self):
        for mode in ("heat", "cool"):
            for reference, target in (("low", 21), ("high", 25)):
                for level in ("moderate", "high"):
                    with self.subTest(mode=mode, reference=reference, level=level):
                        self.scheduler._room_sensor_assist_states.clear()
                        zone = self.configure(mode, reference, target - 2 if mode == "heat" else target + 2)
                        zone["preconditioning"]["room_sensor_assist_braking_level"] = level
                        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                        await self.scheduler.async_apply_current_schedule()
                        stop = target if level == "high" else target + (.5 if mode == "heat" else -.5)
                        self.hass.states["sensor.room"].state = str(stop)
                        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity)
                        state = self.scheduler._room_sensor_assist_states[self.entity]
                        self.assertTrue(state.braking["active"])
                        self.assertAlmostEqual(state.applied_target_temp_high - state.applied_target_temp_low, 4)
                        self.assertGreaterEqual(state.applied_target_temp_low, 16)
                        self.assertLessEqual(state.applied_target_temp_high, 30)
                        self.assertEqual(self.scheduler.get_shared_demand_room_assist(self.entity)["thresholds"][mode]["stop_temperature"], stop)
                        self.assertEqual(self.scheduler.get_room_sensor_assist_status(self.entity)["braking"]["stop_temperature"], stop)


class BrakingPortabilityTest(unittest.TestCase):
    def test_roundtrip_cross_unit_and_old_payload_defaults(self):
        from .test_api import PortableTemperatureContractTest, api_module
        fixture = PortableTemperatureContractTest()
        runtime = fixture._runtime(api_module.CELSIUS)
        runtime["entry"] = SimpleNamespace(options={})
        config = runtime["storage"].data["zones"]["climate.salon"]["preconditioning"]
        config.update(room_sensor_assist_braking_level="high", room_sensor_assist_deadband=.5)
        payload = api_module._build_export_payload(runtime, ["zones"])
        self.assertEqual(payload["model_version"], 29)
        imported = api_module._build_import_data(fixture._runtime(api_module.FAHRENHEIT), payload, ["zones"])
        restored = imported["zones"]["climate.salon"]["preconditioning"]
        self.assertEqual(restored["room_sensor_assist_braking_level"], "high")
        self.assertAlmostEqual(restored["room_sensor_assist_deadband"], .9)
        old = deepcopy(payload)
        old["model_version"] = 26
        del old["sections"]["zones"]["climate.salon"]["preconditioning"]["room_sensor_assist_braking_level"]
        imported = api_module._build_import_data(fixture._runtime(api_module.CELSIUS), old, ["zones"])
        self.assertEqual(normalize_preconditioning_data(imported["zones"]["climate.salon"]["preconditioning"])["room_sensor_assist_braking_level"], "default")
        for level, band in (("unknown", .5), ("high", 0)):
            broken = deepcopy(payload)
            broken["sections"]["zones"]["climate.salon"]["preconditioning"].update(room_sensor_assist_braking_level=level, room_sensor_assist_deadband=band)
            with self.assertRaises(ValueError):
                api_module._build_import_data(fixture._runtime(api_module.CELSIUS), broken, ["zones"])

