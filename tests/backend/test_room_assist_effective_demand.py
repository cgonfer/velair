"""Room Assist publishes accepted control intent; demand readers consume it."""
import asyncio
from dataclasses import replace
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from . import test_preconditioning_offset_runtime as offsets
from .helpers import NOW, scheduler_module
from custom_components.velair.shared_demand import SharedDemandController
from custom_components.velair import climate_delivery as delivery_module
from custom_components.velair import shared_demand as supply_module


class EffectiveRoomAssistDemandTest(unittest.IsolatedAsyncioTestCase):
    setUp = offsets.PreconditioningOffsetRuntimeTest.setUp
    asyncTearDown = offsets.PreconditioningOffsetRuntimeTest.asyncTearDown
    configure = offsets.PreconditioningOffsetRuntimeTest.configure
    preparation = offsets.PreconditioningOffsetRuntimeTest.preparation
    _async_save = offsets.PreconditioningOffsetRuntimeTest._async_save

    def supply(self, direction):
        controller = SharedDemandController(self.hass, self.data, self._async_save, self.scheduler)
        return controller._zone_demand({"id": "shared", "direction": direction, "hysteresis": .3}, self.entity_id, {})

    async def test_inherited_phase_and_effective_intent_remain_separate_both_directions(self):
        for direction, room, threshold in (("heat", 20.7, 20.9), ("cool", 21.3, 21.1)):
            with self.subTest(direction=direction):
                self.scheduler._room_sensor_assist_states.clear()
                self.scheduler._applied_preconditioning_targets.clear()
                event = self.preparation(direction)
                config = self.data["zones"][self.entity_id]["preconditioning"]
                config["room_sensor_assist_braking_level"] = "high"
                self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                await self.scheduler._async_apply_event(event, source="test")
                state = self.scheduler._room_sensor_assist_states[self.entity_id]
                phase = "towards_lower" if direction == "heat" else "towards_upper"
                self.scheduler._room_sensor_assist_states[self.entity_id] = replace(
                    state, hysteresis_phase=phase, hysteresis_target=20.5 if direction == "heat" else 21.5)
                self.hass.states["sensor.room"].state = str(room)
                await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
                state = self.scheduler._room_sensor_assist_states[self.entity_id]
                self.assertEqual(state.hysteresis_phase, phase)
                self.assertFalse(state.braking["active"])
                self.assertEqual(state.effective_control_intent["source"], "preconditioning")
                self.assertTrue(state.effective_control_intent["demand"])
                demand = self.supply(direction)
                self.assertTrue(demand["demand"])
                self.assertEqual(demand["target"], 21)
                self.assertEqual(demand["stop_temperature"], threshold)
                self.hass.states["sensor.room"].state = str(threshold)
                await self.scheduler._async_observe_preconditioning_temperature(
                    self.entity_id, NOW + timedelta(minutes=5), threshold)
                state = self.scheduler._room_sensor_assist_states[self.entity_id]
                self.assertEqual(state.hysteresis_phase, phase)
                self.assertTrue(state.braking["active"])
                self.assertEqual(state.effective_control_intent["source"], "normal")
                self.assertFalse(self.supply(direction)["demand"])
                self.assertEqual(self.supply(direction)["stop_temperature"], 21)

    async def test_ordinary_cache_keeps_each_braking_policy_threshold(self):
        for direction in ("heat", "cool"):
            for level in ("default", "moderate", "high"):
                self.scheduler._room_sensor_assist_states.clear()
                self.configure(mode=direction, target=21, room="18" if direction == "heat" else "24")
                config = self.data["zones"][self.entity_id]["preconditioning"]
                config.update(room_sensor_assist_braking_level=level, room_sensor_assist_deadband=.5)
                self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                await self.scheduler.async_apply_current_schedule()
                self.assertTrue(self.supply(direction)["demand"])
                stop = 21 if level == "high" else (21.5 if direction == "heat" else 20.5)
                self.hass.states["sensor.room"].state = str(stop)
                await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
                state = self.scheduler._room_sensor_assist_states[self.entity_id]
                self.assertEqual(state.effective_control_intent["source"], "normal")
                demand = self.supply(direction)
                self.assertFalse(demand["demand"])
                self.assertEqual(demand["stop_temperature"], stop)
                self.assertEqual(demand["start_temperature"], 20.5 if direction == "heat" else 21.5)

    async def test_repeated_reads_and_missing_cache_never_compute_control(self):
        event = self.preparation()
        with patch.object(self.scheduler, "_room_sensor_assist_effective_control_intent",
                          wraps=self.scheduler._room_sensor_assist_effective_control_intent) as build:
            await self.scheduler._async_apply_event(event, source="test")
            self.assertEqual(build.call_count, 1)
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        calls = list(self.climate.calls)
        with patch.object(self.scheduler, "_room_sensor_assist_effective_control_intent", side_effect=AssertionError("reader intent")), \
             patch.object(self.scheduler, "_normal_room_sensor_assist_control_intent", side_effect=AssertionError("reader normal intent")), \
             patch.object(self.scheduler, "_offset_preparation", side_effect=AssertionError("reader preparation")), \
             patch.object(scheduler_module, "predict_preconditioning_lead", side_effect=AssertionError("reader learning")):
            for _ in range(12):
                result = self.scheduler.get_shared_demand_room_assist(self.entity_id)
                self.assertTrue(result["demand"])
                result["thresholds"]["heat"]["target"] = -100
            self.assertEqual(state.effective_control_intent["thresholds"]["heat"]["target"], 21)
            self.scheduler._room_sensor_assist_states[self.entity_id] = replace(state, effective_control_intent=None)
            missing = self.scheduler.get_shared_demand_room_assist(self.entity_id)
            self.assertTrue(missing["active"])
            self.assertFalse(missing["valid"])
        self.assertEqual(self.climate.calls, calls)

    async def test_zero_extra_and_no_command_refresh_commit_intent_once(self):
        self.preparation()
        self.climate.limits[self.entity_id] = (5, 21)
        self.hass.states[self.entity_id].attributes["current_temperature"] = 17
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        event = self.scheduler.calculate_next_event(NOW)
        await self.scheduler._async_apply_event(event, source="test")
        calls = len(self.climate.calls)
        self.hass.states[self.entity_id].attributes["current_temperature"] = 21
        with patch.object(self.scheduler, "_room_sensor_assist_effective_control_intent",
                          wraps=self.scheduler._room_sensor_assist_effective_control_intent) as build:
            await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
            self.assertEqual(build.call_count, 1)
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(len(self.climate.calls), calls)
        self.assertEqual(state.preconditioning_offset["applied"], 0)
        self.assertEqual(state.effective_control_intent["source"], "preconditioning")
        self.assertTrue(self.supply("heat")["demand"])

    async def test_retirement_restore_failure_invalidates_cached_prep_before_await(self):
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        self.assertTrue(self.supply("heat")["demand"])
        entered, release = asyncio.Event(), asyncio.Event()

        async def fail(*args, **kwargs):
            entered.set()
            await release.wait()
            raise scheduler_module.HomeAssistantError("unavailable")

        self.hass.states["sensor.room"].state = "20.9"
        with patch.object(self.climate, "async_set_temperature", side_effect=fail):
            task = asyncio.create_task(self.scheduler._async_observe_preconditioning_temperature(
                self.entity_id, NOW + timedelta(minutes=5), 20.9))
            try:
                await asyncio.wait_for(entered.wait(), timeout=2)
                result = self.scheduler.get_shared_demand_room_assist(self.entity_id)
                self.assertTrue(result["active"])
                self.assertFalse(result["valid"])
                self.assertIsNone(self.supply("heat")["demand"])
            finally:
                release.set()
            await task
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity_id)["valid"])

    async def test_failed_and_cancelled_refresh_never_publish_candidate_cache(self):
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        before = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.hass.states[self.entity_id].attributes["current_temperature"] = 23
        for error in (scheduler_module.HomeAssistantError("failed"), asyncio.CancelledError()):
            with patch.object(self.climate, "async_set_temperature", side_effect=error):
                with self.assertRaises(type(error)):
                    await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
            self.assertIs(self.scheduler._room_sensor_assist_states[self.entity_id], before)

    async def test_superseded_accepted_call_does_not_publish_candidate_cache(self):
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        before = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.hass.states[self.entity_id].attributes["current_temperature"] = 23
        original = self.climate.async_set_temperature

        async def superseded(*args, **kwargs):
            await original(*args, **kwargs)
            self.data["zones"][self.entity_id]["enabled"] = False

        with patch.object(self.climate, "async_set_temperature", side_effect=superseded):
            await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
        self.assertIs(self.scheduler._room_sensor_assist_states[self.entity_id], before)
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity_id)["valid"])

    async def test_removing_occurrence_invalidates_only_its_preparation_cache(self):
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        self.scheduler._invalidate_room_sensor_assist_preparation_intent(self.entity_id, {"unrelated"})
        self.assertTrue(self.supply("heat")["demand"])
        self.scheduler._clear_applied_preconditioning_targets_for_entity(self.entity_id)
        result = self.scheduler.get_shared_demand_room_assist(self.entity_id)
        self.assertTrue(result["active"])
        self.assertFalse(result["valid"])
        self.assertIsNone(self.supply("heat")["demand"])

    async def test_unit_change_invalidates_snapshot_before_queued_refresh(self):
        self.configure(target=21, room="18")
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        await self.scheduler.async_apply_current_schedule()
        self.assertTrue(self.supply("heat")["demand"])
        tasks = []

        def schedule(awaitable):
            task = asyncio.create_task(awaitable)
            tasks.append(task)
            return task

        with patch.object(self.hass, "async_create_task", side_effect=schedule):
            self.scheduler.handle_temperature_unit_change()
            result = self.scheduler.get_shared_demand_room_assist(self.entity_id)
            self.assertTrue(result["active"])
            self.assertFalse(result["valid"])
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    async def test_without_assist_supply_keeps_existing_native_estimation(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        self.hass.states[self.entity_id].attributes["temperature"] = 23
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity_id)["active"])
        result = self.supply("heat")
        self.assertTrue(result["demand"])
        self.assertEqual(result["source"], "estimated")

    async def test_scalar_braking_level_change_still_invalidates_old_policy(self):
        for direction in ("heat", "cool"):
            self.scheduler._room_sensor_assist_states.clear()
            self.configure(mode=direction, target=21, room="18" if direction == "heat" else "24")
            config = self.data["zones"][self.entity_id]["preconditioning"]
            config.update(room_sensor_assist_braking_level="high", room_sensor_assist_deadband=.5)
            self.scheduler._prepare_runtime_projection(NOW, configuration=True)
            await self.scheduler.async_apply_current_schedule()
            self.assertTrue(self.scheduler.get_shared_demand_room_assist(self.entity_id)["valid"])
            config["room_sensor_assist_braking_level"] = "moderate"
            self.scheduler._prepare_runtime_projection(NOW, configuration=True)
            self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity_id)["valid"])

    async def test_disabled_assist_pending_failure_and_retry_keep_public_demand_unknown(self):
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        self.hass.states[self.entity_id].attributes["current_temperature"] = 21.5
        self.hass.states["sensor.room"].state = "20.7"
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
        self.hass.states[self.entity_id].attributes["temperature"] = 23.5
        output = "switch.shared"
        self.hass.states[output] = SimpleNamespace(state="off", attributes={}, last_changed=NOW - timedelta(hours=1))
        self.data["settings"]["shared_demand_groups"] = [{
            "id": "shared", "name": "Shared", "enabled": True, "switch_entity_id": output,
            "direction": "heat", "hysteresis": .3, "minimum_off_seconds": 0,
            "on_delay_seconds": 0, "off_delay_seconds": 0, "zones": {self.entity_id: {}}, "suspended": False}]

        async def service(domain, action, data, **kwargs):
            if domain == "switch":
                self.hass.states[data["entity_id"]].state = "on" if action == "turn_on" else "off"

        self.hass.services.async_call = service
        controller = SharedDemandController(self.hass, self.data, self._async_save, self.scheduler)
        self.scheduler.shared_demand_changed = controller.reconfigure
        entered = [asyncio.Event() for _ in range(3)]
        release = [asyncio.Event() for _ in range(3)]
        original = self.climate.async_set_temperature
        attempts = 0

        async def controlled(*args, **kwargs):
            nonlocal attempts
            index = attempts
            attempts += 1
            entered[index].set()
            await release[index].wait()
            if index < 2:
                raise scheduler_module.HomeAssistantError("available delivery failure")
            await original(*args, **kwargs)
            self.hass.states[self.entity_id].attributes["temperature"] = args[1]

        async def flush():
            for _ in range(12):
                task = controller._task
                if task is None:
                    return
                await task
            self.fail("Supply worker did not settle")

        def public_zone():
            return controller.get_statuses()["shared"]["zones"][self.entity_id]

        with patch.object(supply_module.core, "Context", return_value=SimpleNamespace(id="supply"), create=True), \
             patch.object(delivery_module, "RETRY_DELAYS", (0, 0, 0)), \
             patch.object(self.climate, "async_set_temperature", side_effect=controlled):
            changing = None
            try:
                await controller.async_start()
                await flush()
                self.assertTrue(public_zone()["demand"])
                changing = asyncio.create_task(self.scheduler.async_update_zone_preconditioning(
                    self.entity_id, {"room_sensor_assist_enabled": False}))
                await asyncio.wait_for(entered[0].wait(), timeout=2)
                await flush()
                self.assertEqual(public_zone()["source"], "room_assist")
                self.assertIsNone(public_zone()["demand"])
                self.assertEqual(self.hass.states[self.entity_id].attributes["temperature"], 23.5)
                release[0].set()
                await asyncio.wait_for(entered[1].wait(), timeout=2)
                await flush()
                self.assertEqual(public_zone()["source"], "room_assist")
                self.assertIsNone(public_zone()["demand"])
                self.assertEqual(self.hass.states[self.entity_id].state, "heat")
                release[1].set()
                await changing
                await asyncio.wait_for(entered[2].wait(), timeout=2)
                await flush()
                self.assertIsNone(public_zone()["demand"])
                release[2].set()
                for _ in range(20):
                    await asyncio.sleep(0)
                await flush()
                self.assertEqual(public_zone()["source"], "estimated")
                self.assertFalse(public_zone()["demand"])
                self.assertEqual(self.hass.states[self.entity_id].attributes["temperature"], 21)
                self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
            finally:
                for gate in release:
                    gate.set()
                if changing is not None:
                    await asyncio.gather(changing, return_exceptions=True)
                await controller.async_stop()
                self.scheduler.shared_demand_changed = None

    async def test_older_committed_disable_cannot_retire_newer_enable_policy(self):
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        entered, release = asyncio.Event(), asyncio.Event()
        original = self.climate.async_set_temperature
        attempts = 0

        async def delayed(*args, **kwargs):
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                entered.set()
                await release.wait()
            await original(*args, **kwargs)

        with patch.object(self.climate, "async_set_temperature", side_effect=delayed):
            older = asyncio.create_task(self.scheduler.async_update_zone_preconditioning(
                self.entity_id, {"room_sensor_assist_enabled": False}))
            newer = None
            try:
                await asyncio.wait_for(entered.wait(), timeout=2)
                newer = asyncio.create_task(self.scheduler.async_update_zone_preconditioning(
                    self.entity_id, {"room_sensor_assist_enabled": True}))
                for _ in range(12):
                    await asyncio.sleep(0)
                self.assertTrue(self.data["zones"][self.entity_id]["preconditioning"]["room_sensor_assist_enabled"])
                release.set()
                old_result, new_result = await asyncio.wait_for(asyncio.gather(older, newer), timeout=2)
                self.assertFalse(old_result["room_sensor_assist_enabled"])
                self.assertTrue(new_result["room_sensor_assist_enabled"])
                state = self.scheduler._room_sensor_assist_states[self.entity_id]
                self.assertNotEqual(state.effective_control_intent["source"], "retiring")
                self.assertTrue(self.scheduler.get_shared_demand_room_assist(self.entity_id)["valid"])
                self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_suppressed)
            finally:
                release.set()
                await asyncio.gather(older, *([newer] if newer is not None else []), return_exceptions=True)


class EffectiveRangeDemandTest(unittest.IsolatedAsyncioTestCase):
    setUp = offsets.PreconditioningOffsetRangeTest.setUp
    save = offsets.PreconditioningOffsetRangeTest.save
    asyncTearDown = offsets.PreconditioningOffsetRangeTest.asyncTearDown
    block = offsets.PreconditioningOffsetRangeTest.block
    configure = offsets.PreconditioningOffsetRangeTest.configure
    prepare = offsets.PreconditioningOffsetRangeTest.prepare

    async def test_native_and_all_fixed_references_cache_original_boundary(self):
        for direction in ("heat", "cool"):
            for native, reference in ((True, "low"), (False, "low"), (False, "high")):
                self.scheduler._room_sensor_assist_states.clear()
                self.scheduler._applied_preconditioning_targets.clear()
                await self.prepare(direction, native=native, reference=reference)
                state = self.scheduler._room_sensor_assist_states[self.entity]
                target = 21 if reference == "low" or native and direction == "heat" else 25
                if native and direction == "cool":
                    target = 25
                stop = target + (-.1 if direction == "heat" else .1)
                intent = state.effective_control_intent
                self.assertEqual(intent["source"], "preconditioning")
                self.assertTrue(intent["demand"])
                self.assertEqual(intent["thresholds"][direction]["target"], target)
                self.assertEqual(intent["thresholds"][direction]["stop_temperature"], stop)
                self.assertEqual(self.scheduler.get_shared_demand_room_assist(self.entity)["thresholds"], intent["thresholds"])

    async def test_reference_change_cannot_reuse_old_selected_boundary_cache(self):
        await self.prepare("heat", native=False, reference="low")
        self.assertTrue(self.scheduler.get_shared_demand_room_assist(self.entity)["valid"])
        self.data["zones"][self.entity]["target_range_reference"]["heat"] = "high"
        result = self.scheduler.get_shared_demand_room_assist(self.entity)
        self.assertTrue(result["active"])
        self.assertFalse(result["valid"])

    async def test_unsupported_native_braking_preserves_zero_extra_demand_until_arrival(self):
        for direction in ("heat", "cool"):
            for level in ("high", "moderate"):
                with self.subTest(direction=direction, level=level):
                    self.scheduler._room_sensor_assist_states.clear()
                    self.scheduler._applied_preconditioning_targets.clear()
                    await self.prepare(direction, climate=24 if direction == "heat" else 22)
                    config = self.data["zones"][self.entity]["preconditioning"]
                    config["room_sensor_assist_braking_level"] = level
                    self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                    await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity)
                    state = self.scheduler._room_sensor_assist_states[self.entity]
                    self.assertIsNone(state.braking)
                    self.assertEqual(state.preconditioning_offset["applied"], 0)
                    assist = self.scheduler.get_room_sensor_assist_status(self.entity)
                    self.assertIn(assist["status"], ("assisting", "holding"))
                    self.assertEqual(assist["applied_target_temp_low"], state.applied_target_temp_low)
                    self.assertEqual(assist["applied_target_temp_high"], state.applied_target_temp_high)
                    self.assertFalse(assist["braking"]["active"])
                    demand = self.scheduler.get_shared_demand_room_assist(self.entity)
                    threshold = 20.9 if direction == "heat" else 25.1
                    self.assertTrue(demand["valid"])
                    self.assertTrue(demand["demand"])
                    self.assertEqual(demand["thresholds"][direction]["stop_temperature"], threshold)
                    self.hass.states["sensor.room"].state = str(threshold)
                    await self.scheduler._async_observe_preconditioning_temperature(
                        self.entity, NOW + timedelta(minutes=5), threshold)
                    demand = self.scheduler.get_shared_demand_room_assist(self.entity)
                    self.assertTrue(demand["valid"])
                    self.assertFalse(demand["demand"])
                    state = self.scheduler._room_sensor_assist_states[self.entity]
                    self.assertEqual(state.effective_control_intent["source"], "normal")
                    self.assertIsNone(state.preconditioning_offset)

    async def test_fixed_reference_braking_level_changes_still_invalidate_old_policy(self):
        for direction in ("heat", "cool"):
            for reference in ("low", "high"):
                self.scheduler._room_sensor_assist_states.clear()
                self.scheduler._applied_preconditioning_targets.clear()
                await self.prepare(direction, native=False, reference=reference)
                config = self.data["zones"][self.entity]["preconditioning"]
                config["room_sensor_assist_braking_level"] = "high"
                self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity)
                self.assertTrue(self.scheduler.get_shared_demand_room_assist(self.entity)["valid"])
                config["room_sensor_assist_braking_level"] = "moderate"
                self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["valid"])
