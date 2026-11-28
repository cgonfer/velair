"""Room Assist graphics consume accepted intent without controlling the climate."""

from copy import deepcopy
from dataclasses import replace
from datetime import timedelta
import unittest
from unittest.mock import patch

from . import test_preconditioning_offset_runtime as offsets
from . import test_fixed_range_reference as fixed_ranges
from .helpers import NOW


class RoomAssistDisplayProjectionTest(unittest.IsolatedAsyncioTestCase):
    setUp = offsets.PreconditioningOffsetRuntimeTest.setUp
    asyncTearDown = offsets.PreconditioningOffsetRuntimeTest.asyncTearDown
    configure = offsets.PreconditioningOffsetRuntimeTest.configure
    preparation = offsets.PreconditioningOffsetRuntimeTest.preparation
    _async_save = offsets.PreconditioningOffsetRuntimeTest._async_save

    async def test_normal_demand_and_wait_project_committed_thresholds_both_directions(self):
        for direction in ("heat", "cool"):
            with self.subTest(direction=direction):
                self.scheduler._room_sensor_assist_states.clear()
                self.configure(mode=direction, target=21, room="18" if direction == "heat" else "24")
                config = self.data["zones"][self.entity_id]["preconditioning"]
                config.update(room_sensor_assist_braking_level="high", room_sensor_assist_deadband=.5)
                self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                await self.scheduler.async_apply_current_schedule()
                intent = self.scheduler.get_room_sensor_assist_status(self.entity_id)["control_intent"]
                self.assertTrue(intent["active"])
                self.assertTrue(intent["valid"])
                self.assertTrue(intent["demand"])
                self.assertEqual(intent["source"], "normal")
                self.assertEqual(intent["direction"], direction)
                self.assertEqual(intent["thresholds"][direction], {
                    "target": 21, "start_temperature": 20.5 if direction == "heat" else 21.5,
                    "stop_temperature": 21,
                })
                self.hass.states["sensor.room"].state = "21"
                await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
                intent = self.scheduler.get_room_sensor_assist_status(self.entity_id)["control_intent"]
                self.assertTrue(intent["valid"])
                self.assertFalse(intent["demand"])
                self.assertEqual(intent["thresholds"][direction]["stop_temperature"], 21)

    async def test_preparation_threshold_and_zero_effective_extra_do_not_need_supply(self):
        self.assertFalse(self.data["settings"].get("shared_demand_groups"))
        for direction in ("heat", "cool"):
            with self.subTest(direction=direction):
                self.scheduler._room_sensor_assist_states.clear()
                self.scheduler._applied_preconditioning_targets.clear()
                self.preparation(direction)
                self.climate.limits[self.entity_id] = (5, 21) if direction == "heat" else (21, 35)
                self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                event = self.scheduler.calculate_next_event(NOW)
                await self.scheduler._async_apply_event(event, source="test")
                status = self.scheduler.get_room_sensor_assist_status(self.entity_id)
                self.assertEqual(status["preconditioning_offset"]["applied"], 0)
                intent = status["control_intent"]
                self.assertTrue(intent["valid"])
                self.assertTrue(intent["demand"])
                self.assertEqual(intent["source"], "preconditioning")
                self.assertEqual(intent["thresholds"][direction]["target"], 21)
                self.assertEqual(intent["thresholds"][direction]["stop_temperature"],
                                 20.9 if direction == "heat" else 21.1)
                self.assertNotIn("preparation_key", intent)

    async def test_repeated_display_reads_do_not_resolve_new_intent_or_mutate_runtime(self):
        await self.scheduler._async_apply_event(self.preparation(), source="test")
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        original_intent = deepcopy(state.effective_control_intent)
        original_data = deepcopy(self.data)
        original_calls = list(self.climate.calls)
        with patch.object(self.scheduler, "_room_sensor_assist_effective_control_intent",
                          side_effect=AssertionError("display rebuilt control intent")), \
             patch.object(self.scheduler, "_normal_room_sensor_assist_control_intent",
                          side_effect=AssertionError("display advanced a control phase")):
            for _ in range(6):
                intent = self.scheduler.get_room_sensor_assist_status(self.entity_id)["control_intent"]
                self.assertTrue(intent["valid"])
                intent["thresholds"]["heat"]["stop_temperature"] = -100
        self.assertIs(self.scheduler._room_sensor_assist_states[self.entity_id], state)
        self.assertEqual(state.effective_control_intent, original_intent)
        self.assertEqual(self.data, original_data)
        self.assertEqual(self.climate.calls, original_calls)

    async def test_uncommitted_missing_sensor_and_expired_preparation_remain_unknown(self):
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        for condition in ("uncommitted", "missing_sensor", "expired"):
            with self.subTest(condition=condition):
                self.scheduler._room_sensor_assist_states[self.entity_id] = (
                    replace(state, effective_control_intent=None) if condition == "uncommitted" else state)
                self.hass.states["sensor.room"].state = "unavailable" if condition == "missing_sensor" else "18"
                now = event.target_when + timedelta(seconds=1) if condition == "expired" else NOW
                with patch("custom_components.velair.scheduler.dt_util.now", return_value=now):
                    intent = self.scheduler.get_room_sensor_assist_status(self.entity_id)["control_intent"]
                self.assertTrue(intent["active"])
                self.assertFalse(intent["valid"])
                self.assertIsNone(intent["demand"])
                self.assertIsNone(intent["direction"])
                self.assertNotIn("source", intent)
                self.assertNotIn("thresholds", intent)

    async def test_disabled_without_owned_state_has_no_stale_intent(self):
        self.configure(enabled=False)
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        intent = self.scheduler.get_room_sensor_assist_status(self.entity_id)["control_intent"]
        self.assertEqual(intent, {"active": False, "valid": False, "demand": None, "direction": None})


class RoomAssistRangeDisplayProjectionTest(unittest.IsolatedAsyncioTestCase):
    setUp = offsets.PreconditioningOffsetRangeTest.setUp
    save = offsets.PreconditioningOffsetRangeTest.save
    asyncTearDown = offsets.PreconditioningOffsetRangeTest.asyncTearDown
    block = offsets.PreconditioningOffsetRangeTest.block
    configure = offsets.PreconditioningOffsetRangeTest.configure
    prepare = offsets.PreconditioningOffsetRangeTest.prepare

    async def test_native_and_fixed_reference_preserve_actual_preparation_threshold(self):
        for direction in ("heat", "cool"):
            for native, reference in ((True, "low"), (False, "low"), (False, "high")):
                with self.subTest(direction=direction, native=native, reference=reference):
                    self.scheduler._room_sensor_assist_states.clear()
                    self.scheduler._applied_preconditioning_targets.clear()
                    await self.prepare(direction, native=native, reference=reference)
                    status = self.scheduler.get_room_sensor_assist_status(self.entity)
                    intent = status["control_intent"]
                    committed = self.scheduler._room_sensor_assist_states[self.entity].effective_control_intent
                    self.assertTrue(intent["valid"])
                    self.assertEqual(intent["source"], "preconditioning")
                    self.assertEqual(intent["thresholds"], committed["thresholds"])
                    if native:
                        self.assertNotIn("reference_setpoint", status)
                    else:
                        evidence = status["reference_setpoint"]
                        self.assertEqual(evidence["boundary"], reference)
                        self.assertEqual(evidence["applied_temperature"], status[f"applied_target_temp_{reference}"])
                        self.assertIsNone(evidence["scheduled_target_guard"])


class RoomAssistReferenceSetpointProjectionTest(unittest.IsolatedAsyncioTestCase):
    setUp = fixed_ranges.FixedRangeReferenceTest.setUp
    save = fixed_ranges.FixedRangeReferenceTest.save
    asyncTearDown = fixed_ranges.FixedRangeReferenceTest.asyncTearDown
    block = fixed_ranges.FixedRangeReferenceTest.block
    configure = fixed_ranges.FixedRangeReferenceTest.configure

    async def seed(self, direction, reference, *, level="high", stop_offset=0, limits=(16, 30)):
        self.scheduler._room_sensor_assist_states.clear()
        target = 21 if reference == "low" else 25
        sign = 1 if direction == "heat" else -1
        zone = self.configure(direction, reference, target - 2 * sign)
        zone["preconditioning"].update(enabled=False, room_sensor_assist_braking_level=level)
        self.state.attributes["current_temperature"] = target + stop_offset * sign
        self.state.attributes.update(min_temp=limits[0], max_temp=limits[1])
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        await self.scheduler.async_apply_current_schedule()
        self.hass.states["sensor.room"].state = str(target + stop_offset * sign)
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity)
        return target, sign

    async def test_both_directions_and_references_preserve_actual_guard_provenance(self):
        for direction in ("heat", "cool"):
            for reference in ("low", "high"):
                with self.subTest(direction=direction, reference=reference):
                    target, sign = await self.seed(direction, reference)
                    status = self.scheduler.get_room_sensor_assist_status(self.entity)
                    evidence = status["reference_setpoint"]
                    self.assertTrue(status["control_intent"]["valid"])
                    self.assertTrue(status["braking"]["active"])
                    self.assertEqual(evidence["boundary"], reference)
                    self.assertEqual(evidence["calculated_temperature"], target - .5 * sign)
                    self.assertEqual(evidence["requested_temperature"], target - sign)
                    self.assertEqual(evidence["applied_temperature"], status[f"applied_target_temp_{reference}"])
                    self.assertEqual(evidence["scheduled_target_guard"],
                                     "heating_ceiling" if direction == "heat" else "cooling_floor")
                    # Scalar fields retain their existing range meaning and
                    # status classification is not changed by display evidence.
                    for field in ("calculated_temperature", "requested_temperature", "scheduled_target_guard"):
                        self.assertIsNone(status[field])
                    self.assertEqual(status["status"], "assisting")

    async def test_moderate_active_without_additional_guard_effect(self):
        for direction in ("heat", "cool"):
            for reference in ("low", "high"):
                with self.subTest(direction=direction, reference=reference):
                    await self.seed(direction, reference, level="moderate", stop_offset=.5)
                    status = self.scheduler.get_room_sensor_assist_status(self.entity)
                    evidence = status["reference_setpoint"]
                    self.assertTrue(status["braking"]["active"])
                    self.assertIsNone(evidence["scheduled_target_guard"])
                    self.assertEqual(evidence["calculated_temperature"], evidence["requested_temperature"])

    async def test_applied_reference_uses_whole_band_limits_after_scalar_guard(self):
        for direction, reference, limits in (("heat", "high", (21, 30)), ("cool", "low", (16, 25))):
            with self.subTest(direction=direction):
                target, _ = await self.seed(direction, reference, limits=limits)
                status = self.scheduler.get_room_sensor_assist_status(self.entity)
                evidence = status["reference_setpoint"]
                self.assertEqual(evidence["applied_temperature"], target)
                self.assertNotEqual(evidence["requested_temperature"], evidence["applied_temperature"])
                self.assertEqual(status["applied_target_temp_high"] - status["applied_target_temp_low"], 4)

    async def test_detached_read_only_and_invalid_or_native_state_excludes_evidence(self):
        await self.seed("heat", "low")
        state = self.scheduler._room_sensor_assist_states[self.entity]
        original = dict(state.reference_setpoint)
        calls = deepcopy(self.calls)
        status = self.scheduler.get_room_sensor_assist_status(self.entity)
        status["reference_setpoint"]["calculated_temperature"] = -100
        self.assertEqual(state.reference_setpoint, original)
        self.assertEqual(self.calls, calls)
        self.assertIs(self.scheduler._room_sensor_assist_states[self.entity], state)
        self.scheduler._room_sensor_assist_states[self.entity] = replace(state, effective_control_intent=None)
        self.assertNotIn("reference_setpoint", self.scheduler.get_room_sensor_assist_status(self.entity))
        self.scheduler._room_sensor_assist_states.clear()
        zone = self.configure("heat_cool", None, 22)
        zone["target_range_reference"] = {}
        self.state.attributes["hvac_modes"].append("heat_cool")
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        await self.scheduler.async_apply_current_schedule()
        self.assertIsNone(self.scheduler._room_sensor_assist_states[self.entity].reference_setpoint)
        self.assertNotIn("reference_setpoint", self.scheduler.get_room_sensor_assist_status(self.entity))
