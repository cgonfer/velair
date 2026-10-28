"""Explicit fixed-mode range references share scalar thermal semantics."""
from dataclasses import replace
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from . import test_range_only_runtime as range_fixture
from .helpers import NOW
from custom_components.velair.models import normalize_preconditioning_data
from custom_components.velair.planned_return_preparation import _arrival_preparation


class FixedRangeReferenceTest(unittest.IsolatedAsyncioTestCase):
    setUp = range_fixture.RangeOnlyRuntimeTest.setUp
    save = range_fixture.RangeOnlyRuntimeTest.save
    asyncTearDown = range_fixture.RangeOnlyRuntimeTest.asyncTearDown
    block = range_fixture.RangeOnlyRuntimeTest.block

    def configure(self, mode, reference, room):
        self.state.state = mode
        self.block()["hvac_mode"] = mode
        zone = self.data["zones"][self.entity]
        zone["target_range_reference"] = {mode: reference}
        zone["preconditioning"] = {
            "enabled": True, "room_sensor_assist_enabled": True,
            "room_temperature_entity_id": "sensor.room",
            "room_sensor_assist_deadband": .5,
        }
        self.hass.states["sensor.room"] = SimpleNamespace(state=str(room), attributes={"unit_of_measurement": "°C"})
        return zone

    async def test_predictor_uses_selected_boundary_and_only_fixed_direction(self):
        for mode in ("heat", "cool"):
            for reference, target in (("low", 21), ("high", 25)):
                with self.subTest(mode=mode, reference=reference):
                    zone = self.configure(mode, reference, 17 if mode == "heat" else 29)
                    config = normalize_preconditioning_data(zone["preconditioning"])
                    resolved = self.scheduler._resolve_preconditioning_target(self.entity, config, self.block())
                    self.assertEqual((resolved.direction, resolved.boundary, resolved.boundary_temperature), (mode, reference, target))
                    wrong_side = target + 3 if mode == "heat" else target - 3
                    self.assertIsNone(self.scheduler._resolve_preconditioning_target(self.entity, config, self.block(), current_temperature=wrong_side))

    async def test_assist_delivers_complete_pair_and_shared_hysteresis(self):
        for mode in ("heat", "cool"):
            for reference in ("low", "high"):
                with self.subTest(mode=mode, reference=reference):
                    self.scheduler._room_sensor_assist_states.clear()
                    self.configure(mode, reference, 17 if mode == "heat" else 29)
                    await self.scheduler.async_apply_current_schedule()
                    state = self.scheduler._room_sensor_assist_states[self.entity]
                    self.assertEqual(state.direction, mode)
                    self.assertEqual(state.range_reference_temperature, 21 if reference == "low" else 25)
                    self.assertAlmostEqual(state.applied_target_temp_high - state.applied_target_temp_low, 4)
                    self.assertGreaterEqual(state.applied_target_temp_low, 16)
                    self.assertLessEqual(state.applied_target_temp_high, 30)
                    supply = self.scheduler.get_shared_demand_room_assist(self.entity)
                    self.assertTrue(supply["valid"])
                    self.assertTrue(supply["demand"])
                    self.assertEqual(set(supply["thresholds"]), {mode})
                    self.assertEqual(supply["thresholds"][mode]["target"], state.range_reference_temperature)

    async def test_heat_upper_holds_at_upper_even_below_lower_is_not_required(self):
        self.configure("heat", "high", 24)
        await self.scheduler.async_apply_current_schedule()
        state = self.scheduler._room_sensor_assist_states[self.entity]
        self.assertEqual(state.hysteresis_phase, "towards_upper")
        self.hass.states["sensor.room"].state = "25.5"
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity)
        state = self.scheduler._room_sensor_assist_states[self.entity]
        self.assertEqual(state.hysteresis_phase, "towards_lower")
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["demand"])

    async def test_range_session_cancels_changed_mode_or_reference(self):
        for change in ("mode", "reference", "sensor"):
            with self.subTest(change=change):
                zone = self.configure("heat", "high", 17)
                event = replace(self.scheduler.get_current_event(self.entity), target_when=NOW + timedelta(minutes=20))
                self.scheduler._start_preconditioning_session(event, None, NOW)
                self.assertIn(self.entity, self.scheduler._preconditioning_sessions)
                if change == "mode":
                    self.state.state = "cool"
                    zone["target_range_reference"]["cool"] = "high"
                elif change == "reference":
                    zone["target_range_reference"]["heat"] = "low"
                else:
                    zone["preconditioning"]["room_temperature_entity_id"] = "sensor.other"
                await self.scheduler._async_observe_preconditioning_temperature(self.entity, NOW + timedelta(minutes=10), 26)
                self.assertNotIn(self.entity, self.scheduler._preconditioning_sessions)

    async def test_auto_unconfigured_and_temperature_only_off_stay_inactive(self):
        zone = self.configure("heat", "low", 17)
        for mode in ("heat", "auto"):
            zone["target_range_reference"] = {}
            self.block()["hvac_mode"] = mode
            self.assertFalse(self.scheduler._range_thermal_mode_supported(self.entity, mode))
        zone["target_range_reference"] = {"heat": "high"}
        self.block().pop("hvac_mode")
        self.block()["temperature_only"] = True
        self.state.state = "off"
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.state.state, "off")
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)

    async def test_return_reached_uses_selected_fixed_boundary(self):
        for mode, reference, temperature, reached in (("heat", "high", 22, False), ("heat", "low", 22, True), ("cool", "low", 24, False), ("cool", "high", 24, True)):
            with self.subTest(mode=mode, reference=reference):
                zone = self.configure(mode, reference, temperature)
                row = {}
                _arrival_preparation(self.scheduler, self.scheduler._planned_return, self.entity, zone,
                    normalize_preconditioning_data(zone["preconditioning"]), self.block(), NOW + timedelta(hours=1), NOW, None, False, row)
                self.assertEqual(row["state"] == "reached", reached)

    async def test_reference_save_failure_retains_runtime_then_success_replaces_it(self):
        zone = self.configure("heat", "high", 24)
        await self.scheduler.async_apply_current_schedule()
        original = self.scheduler._room_sensor_assist_states[self.entity]
        revision = self.data.get("configuration_revision", 0)
        with patch.object(self.scheduler, "_async_save_data", AsyncMock(side_effect=RuntimeError("storage failed"))):
            with self.assertRaisesRegex(RuntimeError, "storage failed"):
                await self.scheduler.async_update_zone_range_reference(self.entity, {"heat": "low"}, revision)
        self.assertEqual(zone["target_range_reference"], {"heat": "high"})
        self.assertIs(self.scheduler._room_sensor_assist_states[self.entity], original)
        await self.scheduler.async_update_zone_range_reference(self.entity, {"heat": "low"}, revision)
        updated = self.scheduler._room_sensor_assist_states[self.entity]
        self.assertEqual(updated.range_reference_temperature, 21)
        self.assertEqual(updated.hysteresis_phase, "towards_lower")
        self.assertEqual(zone["target_range_reference"], {"heat": "low"})

    async def test_status_drops_stale_range_phase_on_mode_sensor_or_reference_change(self):
        for change in ("mode", "sensor", "reference"):
            with self.subTest(change=change):
                zone = self.configure("heat", "high", 24)
                await self.scheduler.async_apply_current_schedule()
                self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity].hysteresis_phase, "towards_upper")
                if change == "mode":
                    self.block()["hvac_mode"] = "cool"
                    zone["target_range_reference"]["cool"] = "high"
                elif change == "sensor":
                    zone["preconditioning"]["room_temperature_entity_id"] = "sensor.other"
                    self.hass.states["sensor.other"] = SimpleNamespace(state="25", attributes={"unit_of_measurement": "°C"})
                else:
                    zone["target_range_reference"]["heat"] = "low"
                status = self.scheduler._room_sensor_assist_status(self.entity)
                self.assertIsNone(status["applied_target_temp_low"])
                self.assertIsNone(status["applied_target_temp_high"])

    async def test_completed_learning_keeps_early_range_until_its_scheduled_time(self):
        for mode, reference in (("heat", "low"), ("heat", "high"), ("cool", "low"), ("cool", "high"), ("heat_cool", None)):
            with self.subTest(mode=mode, reference=reference):
                zone = self.configure(mode, reference, 17 if mode != "cool" else 29)
                if mode == "heat_cool":
                    zone["target_range_reference"] = {}
                    self.state.attributes["hvac_modes"].append(mode)
                self.block().update(target_temp_low=21, target_temp_high=25)
                arrival = NOW + timedelta(minutes=20)
                start = arrival.strftime("%H:%M")
                future = {**self.block(), "start": start}
                zone["schedule"][self.weekday] = [self.block(), future]
                current = zone["schedule"][self.weekday][0]
                current.update(target_temp_low=16 if mode != "cool" else 26,
                               target_temp_high=18 if mode != "cool" else 28)
                event = replace(self.scheduler.get_current_event(self.entity), start=start,
                                target_temp_low=21, target_temp_high=25, when=NOW, target_when=arrival)
                self.scheduler._mark_preconditioning_applied(event)
                self.scheduler._start_preconditioning_session(event, None, NOW)
                await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity)
                observed = 26 if mode != "cool" else 20
                self.hass.states["sensor.room"].state = str(observed)
                await self.scheduler._async_observe_preconditioning_temperature(self.entity, NOW + timedelta(minutes=10), observed)
                self.assertNotIn(self.entity, self.scheduler._preconditioning_sessions)
                held = self.scheduler._room_sensor_assist_target_event(self.entity)
                self.assertEqual((held.start, held.target_temp_low, held.target_temp_high), (start, 21, 25))
