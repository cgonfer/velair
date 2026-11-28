"""Per-zone High depth changes guards without changing comfort thresholds."""
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from . import test_room_assist_braking as braking
from .helpers import NOW
from custom_components.velair.models import normalize_preconditioning_data, normalize_schedule_data
from custom_components.velair.room_assist_braking import HIGH_STEPS_KEY, braking_policy
from custom_components.velair.storage import convert_portable_temperature_data


class HighBrakingStepsTest(unittest.IsolatedAsyncioTestCase):
    setUp = braking.RoomAssistBrakingTest.setUp
    _async_save = braking.RoomAssistBrakingTest._async_save
    configure = braking.RoomAssistBrakingTest.configure
    setup_braking = braking.RoomAssistBrakingTest.setup_braking
    refresh = braking.RoomAssistBrakingTest.refresh
    asyncTearDown = braking.RoomAssistBrakingTest.asyncTearDown

    def test_defaults_and_malformed_stored_counts(self):
        for value in (None, True, False, 1, 11, 2.5, 3.0, "3", float("nan"), float("inf")):
            self.assertEqual(normalize_preconditioning_data({HIGH_STEPS_KEY: value})[HIGH_STEPS_KEY], 2)
        self.assertEqual(normalize_preconditioning_data({})[HIGH_STEPS_KEY], 2)
        self.assertEqual(normalize_preconditioning_data({HIGH_STEPS_KEY: 10})[HIGH_STEPS_KEY], 10)

    def test_custom_guard_heat_cool_limits_and_stronger_correction(self):
        for mode, phase, edge, expected, stronger_room, stronger in (
            ("heat", "towards_lower", 20, 19, 25, 18.5),
            ("cool", "towards_upper", 21, 22, 16, 22.5),
        ):
            config = self.setup_braking(mode)
            config[HIGH_STEPS_KEY] = 3
            for room, applied in ((20.5, expected), (stronger_room, stronger)):
                result = self.scheduler._room_sensor_assist_target(
                    self.entity_id, config, mode, 20.5, room, 20.5,
                    hysteresis_phase=phase, hysteresis_target=edge)
                self.assertEqual(result.applied_temperature, applied)
                self.assertEqual(result.braking["steps"], 3)
                self.assertEqual(result.braking["temperature_delta"], 1.5)
            self.climate.limits[self.entity_id] = (20, 21)
            result = self.scheduler._room_sensor_assist_target(
                self.entity_id, config, mode, 20.5, 20.5, 20.5,
                hysteresis_phase=phase, hysteresis_target=edge)
            self.assertEqual(result.applied_temperature, 20 if mode == "heat" else 21)
            self.assertEqual(result.limited_by, "minimum" if mode == "heat" else "maximum")

    def test_count_does_not_change_moderate_default_or_thresholds(self):
        for mode in ("heat", "cool"):
            for level in ("default", "moderate", "high"):
                config = self.setup_braking(mode, level)
                phase = "towards_lower" if mode == "heat" else "towards_upper"
                original = braking_policy(config, mode, 20.5, .5, phase)
                custom = braking_policy({**config, HIGH_STEPS_KEY: 10}, mode, 20.5, .5, phase)
                for key in ("stop_temperature", "resume_temperature", "active"):
                    self.assertEqual(original[key], custom[key])
                if level != "high":
                    self.assertEqual(original["setpoint_bound"], custom["setpoint_bound"])

    def test_fahrenheit_uses_native_step_and_positive_equivalent_delta(self):
        config = self.setup_braking()
        config.update({HIGH_STEPS_KEY: 3, "room_sensor_assist_deadband": .9,
                       "room_sensor_assist_max_delta": 3.6})
        self.climate.steps[self.entity_id] = .9
        self.climate.limits[self.entity_id] = (41, 95)
        for mode, phase, edge, expected in (("heat", "towards_lower", 68, 66.2),
                                             ("cool", "towards_upper", 69.8, 71.6)):
            result = self.scheduler._room_sensor_assist_target(
                self.entity_id, config, mode, 68.9, 68.9, 68.9,
                hysteresis_phase=phase, hysteresis_target=edge)
            self.assertAlmostEqual(result.applied_temperature, expected)
            self.assertAlmostEqual(result.braking["temperature_delta"], 2.7)
            self.assertEqual(result.braking["steps"], 3)

    async def test_fahrenheit_live_save_delivers_custom_depth_and_thresholds(self):
        for mode, initial_room, expected, resume in (("heat", 67, 66.2, 68),
                                                      ("cool", 71, 71.6, 69.8)):
            self.scheduler._room_sensor_assist_states.clear()
            self.configure(mode=mode, target=68.9, room=str(initial_room), climate_temperature=68.9)
            self.hass.states["sensor.room"].attributes["unit_of_measurement"] = "°F"
            self.climate.temperature_unit = lambda _entity: "°F"
            self.climate.steps[self.entity_id] = .9
            self.climate.limits[self.entity_id] = (41, 95)
            self.data["zones"][self.entity_id]["preconditioning"].update(
                room_sensor_assist_braking_level="high", room_sensor_assist_deadband=.9,
                room_sensor_assist_max_delta=3.6)
            self.scheduler._prepare_runtime_projection(NOW, configuration=True)
            await self.scheduler.async_apply_current_schedule()
            await self.refresh(68.9)
            await self.scheduler.async_update_zone_preconditioning(self.entity_id, {HIGH_STEPS_KEY: 3})
            state = self.scheduler._room_sensor_assist_states[self.entity_id]
            self.assertAlmostEqual(state.applied_temperature, expected)
            self.assertAlmostEqual(state.braking["temperature_delta"], 2.7)
            self.assertAlmostEqual(state.braking["resume_temperature"], resume)
            self.assertEqual(state.braking["steps"], 3)

    async def test_save_recalculates_fixed_guard_and_preserves_phase_and_pure_status(self):
        self.setup_braking()
        await self.scheduler.async_apply_current_schedule()
        await self.refresh(20.5)
        await self.refresh(20.3)
        before = self.scheduler._room_sensor_assist_states[self.entity_id]
        await self.scheduler.async_update_zone_preconditioning(self.entity_id, {HIGH_STEPS_KEY: 3})
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(state.hysteresis_phase, before.hysteresis_phase)
        self.assertEqual(state.applied_temperature, 19)
        self.assertEqual(state.braking["high_steps"], 3)
        self.assertEqual(state.braking["resume_temperature"], 20)
        calls = len(self.climate.calls)
        for _ in range(3):
            status = self.scheduler.get_room_sensor_assist_status(self.entity_id)
            self.assertEqual(status["braking"]["steps"], 3)
            status["braking"]["steps"] = 99
            self.assertIs(self.scheduler._room_sensor_assist_states[self.entity_id], state)
        self.assertEqual(state.braking["steps"], 3)
        self.assertEqual(len(self.climate.calls), calls)
        self.assertEqual((await self.refresh(20.3)).applied_temperature, 19)
        self.assertFalse((await self.refresh(20)).braking["active"])

    async def test_invalid_updates_and_failed_save_preserve_count_and_runtime(self):
        self.setup_braking()
        await self.scheduler.async_apply_current_schedule()
        await self.refresh(20.5)
        before = self.scheduler._room_sensor_assist_states[self.entity_id]
        for value in (True, False, None, 1, 11, 2.5, 3.0, "3", float("nan"), float("inf")):
            with self.subTest(value=value), self.assertRaises(ValueError):
                await self.scheduler.async_update_zone_preconditioning(self.entity_id, {HIGH_STEPS_KEY: value})
            self.assertIs(self.scheduler._room_sensor_assist_states[self.entity_id], before)
        with patch.object(self.scheduler, "_async_save_data", new=AsyncMock(side_effect=OSError("disk unavailable"))):
            with self.assertRaises(OSError):
                await self.scheduler.async_update_zone_preconditioning(self.entity_id, {HIGH_STEPS_KEY: 3})
        self.assertEqual(normalize_preconditioning_data(self.data["zones"][self.entity_id]["preconditioning"])[HIGH_STEPS_KEY], 2)
        self.assertIs(self.scheduler._room_sensor_assist_states[self.entity_id], before)

    async def test_settings_reset_retains_zone_depth(self):
        self.setup_braking()
        await self.scheduler.async_update_zone_preconditioning(self.entity_id, {HIGH_STEPS_KEY: 3})
        await self.scheduler.async_reset_zone_preconditioning_settings(self.entity_id)
        self.assertEqual(self.data["zones"][self.entity_id]["preconditioning"][HIGH_STEPS_KEY], 3)

    async def test_reload_retains_saved_count_and_rebuilds_guard(self):
        from .helpers import VelairScheduler
        self.setup_braking()
        await self.scheduler.async_update_zone_preconditioning(self.entity_id, {HIGH_STEPS_KEY: 3})
        saved = normalize_schedule_data(deepcopy(self.data), [self.entity_id])
        await self.scheduler.async_stop()
        self.scheduler = VelairScheduler(self.hass, saved, self.climate, self._async_save)
        self.hass.states["sensor.room"].state = "20.5"
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity_id].applied_temperature, 19)
        self.assertEqual(saved["zones"][self.entity_id]["preconditioning"][HIGH_STEPS_KEY], 3)


class HighStepsPortabilityTest(unittest.TestCase):
    def test_api_and_import_reject_invalid_counts_without_truncation(self):
        from .test_api import PortableTemperatureContractTest, api_module
        import voluptuous as vol
        fixture = PortableTemperatureContractTest()
        runtime = fixture._runtime(api_module.CELSIUS)
        runtime["entry"] = SimpleNamespace(options={})
        payload = api_module._build_export_payload(runtime, ["zones"])
        for value in (True, False, None, 1, 11, 2.5, 3.0, "3", float("nan"), float("inf")):
            with self.subTest(value=value):
                with self.assertRaises(vol.Invalid):
                    api_module._high_braking_steps(value)
                bad = deepcopy(payload)
                bad["sections"]["zones"]["climate.salon"]["preconditioning"][HIGH_STEPS_KEY] = value
                with self.assertRaises(ValueError):
                    api_module._build_import_data(fixture._runtime(api_module.CELSIUS), bad, ["zones"])
        self.assertEqual(api_module._high_braking_steps(3), 3)

    def test_cross_unit_roundtrip_old_payload_and_independent_zones(self):
        from .test_api import PortableTemperatureContractTest, api_module
        fixture = PortableTemperatureContractTest()
        runtime = fixture._runtime(api_module.CELSIUS)
        runtime["entry"] = SimpleNamespace(options={})
        zone = runtime["storage"].data["zones"]["climate.salon"]
        zone["preconditioning"][HIGH_STEPS_KEY] = 3
        runtime["storage"].data["zones"]["climate.bedroom"] = deepcopy(zone)
        runtime["storage"].data["zones"]["climate.bedroom"]["preconditioning"][HIGH_STEPS_KEY] = 5
        payload = api_module._build_export_payload(runtime, ["zones"])
        self.assertEqual(payload["model_version"], 30)
        destination = fixture._runtime(api_module.FAHRENHEIT)
        destination["storage"].data["zones"]["climate.bedroom"] = deepcopy(destination["storage"].data["zones"]["climate.salon"])
        imported = api_module._build_import_data(destination, payload, ["zones"])
        for entity, count in (("climate.salon", 3), ("climate.bedroom", 5)):
            self.assertEqual(imported["zones"][entity]["preconditioning"][HIGH_STEPS_KEY], count)
        converted = convert_portable_temperature_data(imported, api_module.FAHRENHEIT, api_module.CELSIUS, None)
        reloaded = normalize_schedule_data(converted, list(converted["zones"]))
        self.assertEqual(reloaded["zones"]["climate.salon"]["preconditioning"][HIGH_STEPS_KEY], 3)
        self.assertEqual(reloaded["zones"]["climate.bedroom"]["preconditioning"][HIGH_STEPS_KEY], 5)
        old = deepcopy(payload)
        old["model_version"] = 29
        for zone in old["sections"]["zones"].values():
            zone["preconditioning"].pop(HIGH_STEPS_KEY)
        restored = api_module._build_import_data(fixture._runtime(api_module.CELSIUS), old, ["zones"])
        self.assertEqual(normalize_preconditioning_data(restored["zones"]["climate.salon"]["preconditioning"])[HIGH_STEPS_KEY], 2)
        future = deepcopy(payload)
        future["model_version"] = 31
        with self.assertRaises(ValueError):
            api_module._build_import_data(fixture._runtime(api_module.CELSIUS), future, ["zones"])


class HighStepsFixedRangeTest(unittest.IsolatedAsyncioTestCase):
    setUp = braking.BrakingFixedRangeTest.setUp
    save = braking.BrakingFixedRangeTest.save
    asyncTearDown = braking.BrakingFixedRangeTest.asyncTearDown
    block = braking.BrakingFixedRangeTest.block
    configure = braking.BrakingFixedRangeTest.configure

    async def test_custom_depth_keeps_complete_pair_and_physical_limits(self):
        for mode in ("heat", "cool"):
            for reference, target in (("low", 21), ("high", 25)):
                for steps in (3, 10):
                    with self.subTest(mode=mode, reference=reference, steps=steps):
                        self.scheduler._room_sensor_assist_states.clear()
                        zone = self.configure(mode, reference, target - 2 if mode == "heat" else target + 2)
                        zone["preconditioning"].update({"room_sensor_assist_braking_level": "high", HIGH_STEPS_KEY: steps})
                        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                        await self.scheduler.async_apply_current_schedule()
                        self.hass.states["sensor.room"].state = str(target)
                        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity)
                        state = self.scheduler._room_sensor_assist_states[self.entity]
                        self.assertTrue(state.braking["active"])
                        self.assertEqual(state.braking["steps"], steps)
                        self.assertAlmostEqual(state.braking["setpoint_bound"], target + (-1 if mode == "heat" else 1) * .5 * steps)
                        self.assertAlmostEqual(state.applied_target_temp_high - state.applied_target_temp_low, 4)
                        self.assertGreaterEqual(state.applied_target_temp_low, 16)
                        self.assertLessEqual(state.applied_target_temp_high, 30)


class HighStepsPreparationTest(unittest.IsolatedAsyncioTestCase):
    from .test_preconditioning_offset_runtime import PreconditioningOffsetRuntimeTest as _fixture
    setUp = _fixture.setUp
    configure = _fixture.configure
    preparation = _fixture.preparation
    _async_save = _fixture._async_save
    asyncTearDown = _fixture.asyncTearDown

    async def test_depth_save_preserves_active_preparation_offset(self):
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        before = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(before.preconditioning_offset["applied"], 2)
        await self.scheduler.async_update_zone_preconditioning(self.entity_id, {HIGH_STEPS_KEY: 3})
        after = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(after.preconditioning_offset["applied"], 2)
        self.assertEqual(after.applied_temperature, before.applied_temperature)
        self.assertEqual(after.target_temperature, before.target_temperature)
