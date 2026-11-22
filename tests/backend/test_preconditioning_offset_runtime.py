"""Temporary setpoint delivery remains separate from nominal learning targets."""
from datetime import timedelta
from dataclasses import replace
from copy import deepcopy
import asyncio
from unittest.mock import AsyncMock, patch
import unittest

from . import test_room_assist_single_delivery as transport
from .helpers import NOW
from .helpers import scheduler_module
from custom_components.velair.preconditioning_offset import displace_target
from custom_components.velair.const import MODE_PAUSED, MODE_AUTO
from . import test_fixed_range_reference as range_fixture


class OffsetDisplacementTest(unittest.TestCase):
    def test_shared_capacity_preserves_width_and_zero_anchored_grid(self):
        for direction, base, limits, expected in (
            ("heat", {"target_temp_low": 20, "target_temp_high": 24}, (5, 25), (21, 25)),
            ("cool", {"target_temp_low": 20, "target_temp_high": 24}, (19, 35), (19, 23)),
        ):
            target, status = displace_target(base, direction, 3, *limits, .5)
            self.assertEqual(tuple(target.values()), expected)
            self.assertEqual(target["target_temp_high"] - target["target_temp_low"], 4)
            self.assertEqual(abs(status["applied"]), 1)
        target, status = displace_target({"temperature": 20.2}, "heat", 1.4, 5, 35, .5)
        self.assertEqual(target["temperature"], 21.2)
        self.assertEqual(status["limited_by"], "step")


class PreconditioningOffsetRuntimeTest(unittest.IsolatedAsyncioTestCase):
    configure = transport.RoomAssistSingleDeliveryTest.configure
    _async_save = transport.RoomAssistSingleDeliveryTest._async_save

    def setUp(self):
        transport.RoomAssistSingleDeliveryTest.setUp(self)
        self.enterContext(patch.object(scheduler_module.dt_util, "now", return_value=NOW))

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    def preparation(self, mode="heat", assist=True):
        target, room = (21, "18") if mode == "heat" else (21, "24")
        block = self.configure(mode=mode, enabled=assist, target=target, room=room, climate_temperature=21)
        block["start"] = "19:00"
        config = self.data["zones"][self.entity_id]["preconditioning"]
        config.update(enabled=True, heating_setpoint_offset=2, cooling_setpoint_offset=2,
                      room_sensor_assist_deadband=.5, minimum_delta_temperature=.1)
        if not assist:
            self.hass.states[self.entity_id].attributes["current_temperature"] = float(room)
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        event = self.scheduler.calculate_next_event(NOW)
        self.assertIsNotNone(event.target_when)
        return event

    async def test_delivery_and_learning_keep_nominal_target_both_directions(self):
        for mode in ("heat", "cool"):
            self.scheduler._room_sensor_assist_states.clear()
            self.scheduler._applied_preconditioning_targets.clear()
            event = self.preparation(mode)
            await self.scheduler._async_apply_event(event, source="test")
            state = self.scheduler._room_sensor_assist_states[self.entity_id]
            self.assertEqual(state.target_temperature, 21)
            self.assertEqual(state.applied_temperature, 25 if mode == "heat" else 17)
            self.assertEqual(state.preconditioning_offset["applied"], 2 if mode == "heat" else -2)
            self.assertEqual(self.scheduler._preconditioning_sessions[self.entity_id].target_temperature, 21)

    async def test_saturated_zero_retains_control_priority_and_supply_threshold(self):
        event = self.preparation()
        self.climate.limits[self.entity_id] = (5, 21)
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        event = self.scheduler.calculate_next_event(NOW)
        await self.scheduler._async_apply_event(event, source="test")
        self.assertIsNotNone(self.scheduler._accepted_preconditioning_offset(self.entity_id), str((self.climate.calls, self.scheduler._applied_preconditioning_targets)))
        self.assertEqual(self.scheduler._accepted_preconditioning_offset(self.entity_id)["applied"], 0)
        self.scheduler._discard_preconditioning_session(self.entity_id, report=False)
        self.assertIsNotNone(self.scheduler._unsub_preconditioning_listener)
        demand = self.scheduler.get_shared_demand_room_assist(self.entity_id)
        self.assertTrue(demand["demand"])
        self.assertEqual(demand["thresholds"]["heat"]["stop_temperature"], 20.9)
        self.hass.states["sensor.room"].state = "20.9"
        await self.scheduler._async_observe_preconditioning_temperature(self.entity_id, NOW + timedelta(minutes=1), 20.9)
        self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))
        self.assertTrue(next(iter(self.scheduler._applied_preconditioning_targets.values())).retired)

    async def test_without_assist_restores_before_invalid_short_sample_save(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        self.assertEqual(self.climate.calls[-1][2], 23)
        self.hass.states["sensor.room"].state = "20.9"
        self.scheduler._async_save_data = AsyncMock(side_effect=RuntimeError("storage"))
        with self.assertRaises(RuntimeError):
            await self.scheduler._async_observe_preconditioning_temperature(self.entity_id, NOW + timedelta(minutes=1), 20.9)
        self.assertEqual(self.climate.calls[-1][2], 21)
        self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))

    async def test_accepted_sensor_drift_keeps_receipt_without_learning_session(self):
        event = self.preparation(assist=False)
        original = self.climate.async_set_temperature
        async def accepted(*args, **kwargs):
            await original(*args, **kwargs)
            self.hass.states[self.entity_id].attributes["current_temperature"] = 20.9
        self.climate.async_set_temperature = accepted
        await self.scheduler._async_apply_event(event, source="test")
        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        self.assertEqual(self.scheduler._accepted_preconditioning_offset(self.entity_id)["applied"], 2)
        self.assertIsNotNone(self.scheduler._unsub_preconditioning_listener)
        await self.scheduler._async_observe_preconditioning_temperature(self.entity_id, NOW, 20.9)
        self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))
        self.assertEqual(self.climate.calls[-1][2], 21)

    async def test_inherited_braking_phase_is_bypassed_without_changing_phase(self):
        event = self.preparation()
        self.data["zones"][self.entity_id]["preconditioning"]["room_sensor_assist_braking_level"] = "high"
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        await self.scheduler._async_apply_event(event, source="test")
        previous = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.scheduler._room_sensor_assist_states[self.entity_id] = replace(previous,
            hysteresis_phase="towards_lower", hysteresis_target=20.5)
        self.hass.states["sensor.room"].state = "20.7"
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(state.hysteresis_phase, "towards_lower")
        self.assertFalse(state.braking["active"])
        self.assertGreater(state.applied_temperature, 21)
        self.assertTrue(self.scheduler.get_shared_demand_room_assist(self.entity_id)["demand"])

    async def test_expiry_without_learning_session_restores_and_retires(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        self.scheduler._discard_preconditioning_session(self.entity_id, report=False)
        await self.scheduler._async_expire_preconditioning_sessions(event.target_when)
        self.assertTrue(next(iter(self.scheduler._applied_preconditioning_targets.values())).retired)
        self.assertEqual(self.climate.calls[-1][2], 21)

    async def test_same_delivered_target_commits_changed_extra_without_service(self):
        self.preparation()
        self.climate.limits[self.entity_id] = (5, 21)
        self.hass.states[self.entity_id].attributes["current_temperature"] = 17
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        event = self.scheduler.calculate_next_event(NOW)
        await self.scheduler._async_apply_event(event, source="test")
        before = len(self.climate.calls)
        self.assertEqual(self.scheduler._accepted_preconditioning_offset(self.entity_id)["applied"], 2)
        self.hass.states[self.entity_id].attributes["current_temperature"] = 18
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
        self.assertEqual(len(self.climate.calls), before)
        offset = self.scheduler._accepted_preconditioning_offset(self.entity_id)
        self.assertEqual(offset["applied"], 1)
        self.assertEqual(offset["base_target"], {"temperature": 20})
        session = self.scheduler._preconditioning_sessions[self.entity_id]
        self.hass.states["sensor.room"].state = "20.9"
        await self.scheduler._async_observe_preconditioning_temperature(self.entity_id, NOW + timedelta(minutes=5), 20.9)
        observation = self.data["preconditioning_learning"][self.entity_id]["heat"]["observations"][-1]
        self.assertEqual(observation["target_temp"], 21)
        self.assertEqual(observation["initial_temp"], session.start_temperature)
        self.assertEqual(observation["delta_t"], 3)
        self.assertEqual(observation["quality"], "complete")

    async def test_no_assist_scalar_projection_uses_accepted_target_before_report(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        status = self.scheduler.get_zone_runtime_status(self.entity_id)
        self.assertEqual(status["target_temperature"], 21)
        self.assertEqual(status["applied_temperature"], 23)

    async def test_arrival_before_refresh_never_flips_preparation_direction(self):
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        self.hass.states["sensor.room"].state = "24"
        self.assertIsNone(self.scheduler._offset_preparation(self.entity_id))
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
        self.assertIsNone(self.scheduler._room_sensor_assist_states[self.entity_id].preconditioning_offset)
        self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))

    async def test_control_deadline_survives_discarded_observation_and_projection_cleanup(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        self.scheduler._discard_preconditioning_session(self.entity_id, report=False)
        self.scheduler._clear_applied_preconditioning_targets(event.target_when)
        self.assertTrue(self.scheduler._applied_preconditioning_targets)
        self.assertLessEqual(self.scheduler._calculate_next_action_time(NOW), event.target_when)
        self.assertTrue(self.scheduler._has_crossed_scheduler_deadline(NOW, event.target_when))

    async def test_retired_occurrence_cannot_restart_learning_after_temperature_drop(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        self.hass.states[self.entity_id].attributes["current_temperature"] = 20.9
        await self.scheduler._async_observe_preconditioning_temperature(self.entity_id, NOW + timedelta(minutes=5), 20.9)
        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        self.hass.states[self.entity_id].attributes["current_temperature"] = 18
        await self.scheduler._async_apply_event(event, source="recovery")
        self.scheduler._start_preconditioning_session(event, "heat", NOW + timedelta(minutes=10))
        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        self.assertEqual(self.climate.calls[-1][2], 21)
        self.assertIsNone(self.scheduler._offset_preparation(self.entity_id, event))

    async def test_assisted_final_acceptance_drift_keeps_accepted_extra(self):
        event = self.preparation()
        original = self.climate.async_set_temperature
        async def accepted(*args, **kwargs):
            await original(*args, **kwargs)
            self.hass.states["sensor.room"].state = "20.9"
        self.climate.async_set_temperature = accepted
        await self.scheduler._async_apply_event(event, source="test")
        offset = self.scheduler._accepted_preconditioning_offset(self.entity_id)
        self.assertEqual(offset["applied"], 2)
        self.assertEqual(offset["base_target"], {"temperature": 23})
        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        await self.scheduler._async_observe_preconditioning_temperature(self.entity_id, NOW, 20.9)
        self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))

    async def test_group_commit_and_observation_expiry_use_same_lock_order(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        session = self.scheduler._preconditioning_sessions[self.entity_id]
        self.scheduler._preconditioning_sessions[self.entity_id] = replace(session, target_when=NOW)
        timers = []

        async def group_mutation():
            async with self.scheduler._profile_mutation_lock:
                # The expiry task gets a deterministic chance to reach its
                # first lock before the shielded group commit is started.
                timer = asyncio.create_task(self.scheduler._handle_timer(NOW))
                timers.append(timer)
                await asyncio.sleep(0)
                await self.scheduler._async_commit_group_candidate(deepcopy(self.data))
            await timer

        mutation = asyncio.create_task(group_mutation())
        try:
            await asyncio.wait_for(asyncio.shield(mutation), timeout=2)
        finally:
            # A regression must fail boundedly even though the group commit
            # intentionally shields its owned storage task from cancellation.
            for task in timers:
                task.cancel()
            mutation.cancel()
            await asyncio.gather(mutation, *timers, return_exceptions=True)
        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        self.assertFalse(self.scheduler._profile_mutation_lock.locked())
        self.assertFalse(self.scheduler._timer_lock.locked())

    async def test_profile_owner_can_await_child_timer_with_real_observation_expiry(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        session = self.scheduler._preconditioning_sessions[self.entity_id]
        self.scheduler._preconditioning_sessions[self.entity_id] = replace(session, target_when=NOW)
        async with self.scheduler._profile_mutation_lock:
            child = asyncio.create_task(self.scheduler._handle_timer(NOW))
            try:
                await asyncio.wait_for(asyncio.shield(child), timeout=2)
            finally:
                child.cancel()
                await asyncio.gather(child, return_exceptions=True)
        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        history = self.data["preconditioning_learning"][self.entity_id]["heat"]["observations"]
        self.assertEqual(len(history), 1)

    async def test_final_service_sensor_update_is_caught_without_another_report(self):
        for assist in (False, True):
            with self.subTest(assist=assist):
                self.scheduler._applied_preconditioning_targets.clear()
                self.scheduler._room_sensor_assist_states.clear()
                event = self.preparation(assist=assist)
                original = self.climate.async_set_temperature
                async def accepted(*args, _original=original, **kwargs):
                    await _original(*args, **kwargs)
                    self.hass.states[self.entity_id].attributes["current_temperature"] = 20.9
                    self.hass.states["sensor.room"].state = "20.9"
                self.climate.async_set_temperature = accepted
                tasks = []
                def capture(awaitable):
                    task = asyncio.create_task(awaitable)
                    tasks.append(task)
                    return task
                self.hass.async_create_task = capture
                await self.scheduler._async_apply_event(event, source="test")
                await asyncio.gather(*tasks)
                self.assertTrue(next(iter(self.scheduler._applied_preconditioning_targets.values())).retired)
                self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))
                self.assertLessEqual(self.climate.calls[-1][2], 21.5)
                self.climate.async_set_temperature = original

    async def test_scalar_automatic_modes_keep_preparation_direction_inside_assist_deadband(self):
        for direction, room, internal, expected in (("heat", 20.7, 22.2, 22.5), ("cool", 21.3, 19.8, 19.5)):
            for mode in ("auto", "heat_cool"):
                event = self.preparation(direction)
                event = replace(event, hvac_mode=mode)
                self.hass.states[self.entity_id].state = mode
                self.hass.states[self.entity_id].attributes["current_temperature"] = internal
                self.hass.states["sensor.room"].state = str(room)
                self.climate.hvac_modes[self.entity_id] = ["off", "heat", "cool", mode]
                self.scheduler._preconditioning_offset_calculations[self.entity_id] = event
                config = self.scheduler._prepared_preconditioning(self.entity_id)
                result = self.scheduler._room_sensor_assist_target(
                    self.entity_id, config, "cool" if direction == "heat" else "heat", 21,
                    room, internal, fixed_direction=False)
                self.assertEqual(result.applied_temperature, expected)
                self.assertEqual(self.scheduler._room_sensor_assist_direction(self.entity_id, config, 21, mode), direction)
                self.scheduler._preconditioning_offset_calculations.clear()

    async def test_global_pause_restores_no_assist_extra_and_resume_keeps_it_retired(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        self.assertEqual(self.climate.calls[-1][2], 23)
        await self.scheduler.async_set_mode(MODE_PAUSED)
        self.assertEqual(self.climate.calls[-1][2], 21)
        self.assertTrue(next(iter(self.scheduler._applied_preconditioning_targets.values())).retired)
        await self.scheduler.async_set_mode(MODE_AUTO, apply_current_schedule=True)
        self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))
        self.assertEqual(self.climate.calls[-1][2], 21)

    async def test_zone_pause_restores_no_assist_extra(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        await self.scheduler.async_pause_zone(self.entity_id)
        self.assertEqual(self.climate.calls[-1][2], 21)
        self.assertTrue(next(iter(self.scheduler._applied_preconditioning_targets.values())).retired)

    async def test_zone_pause_preserve_and_turnoff_do_not_restore_old_target(self):
        for kwargs in ({"preserve_current_climate_state": True}, {"action": "turn_off"}):
            with self.subTest(kwargs=kwargs):
                self.data["zones"][self.entity_id]["override"] = None
                self.data["zones"][self.entity_id]["pauses"] = []
                self.scheduler._applied_preconditioning_targets.clear()
                event = self.preparation(assist=False)
                await self.scheduler._async_apply_event(event, source="test")
                before = len(self.climate.calls)
                await self.scheduler.async_pause_zone(self.entity_id, **kwargs)
                new_calls = self.climate.calls[before:]
                self.assertFalse(any(call[0] == "set_temperature" for call in new_calls))
                self.assertTrue(next(iter(self.scheduler._applied_preconditioning_targets.values())).retired)
                if kwargs.get("action") == "turn_off":
                    self.assertEqual(new_calls[-1][0], "turn_off")

    async def test_failed_pause_save_does_not_restore_a_force_retired_observation(self):
        for global_pause in (False, True):
            with self.subTest(global_pause=global_pause):
                self.data["zones"][self.entity_id]["override"] = None
                self.data["zones"][self.entity_id]["pauses"] = []
                self.scheduler._applied_preconditioning_targets.clear()
                event = self.preparation(assist=False)
                await self.scheduler._async_apply_event(event, source="test")
                previous_history = deepcopy(self.data.get("preconditioning_learning", {}))
                self.scheduler._async_save_data = AsyncMock(side_effect=RuntimeError("storage"))
                with self.assertRaisesRegex(RuntimeError, "storage"):
                    if global_pause:
                        await self.scheduler.async_set_mode(MODE_PAUSED)
                    else:
                        await self.scheduler.async_pause_zone(self.entity_id)
                self.assertEqual(self.scheduler.mode, MODE_AUTO)
                self.assertIsNone(self.data["zones"][self.entity_id].get("override"))
                self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
                self.assertEqual(self.data.get("preconditioning_learning", {}), previous_history)
                self.assertEqual(self.climate.calls[-1][2], 21)
                self.assertTrue(next(iter(self.scheduler._applied_preconditioning_targets.values())).retired)
                self.scheduler._async_save_data = self._async_save

    async def test_failed_global_pause_keeps_observation_of_an_unaffected_direction(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        original = replace(self.scheduler._preconditioning_sessions[self.entity_id], direction="cool")
        self.scheduler._preconditioning_sessions[self.entity_id] = original
        self.scheduler._async_save_data = AsyncMock(side_effect=RuntimeError("storage"))
        with self.assertRaisesRegex(RuntimeError, "storage"):
            await self.scheduler.async_set_mode(MODE_PAUSED)
        self.assertEqual(self.scheduler._preconditioning_sessions[self.entity_id], original)

    async def test_group_portable_commit_refreshes_history_completed_while_waiting_for_timer(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        zones = deepcopy(self.data["zones"])
        zones[self.entity_id]["preconditioning"]["cooling_setpoint_offset"] = 1
        entered = asyncio.Event()
        original = self.scheduler._async_commit_group_candidate_owned

        async def owned(*args, **kwargs):
            entered.set()
            await original(*args, **kwargs)

        await self.scheduler._timer_lock.acquire()
        importing = None
        try:
            with patch.object(self.scheduler, "_async_commit_group_candidate_owned", side_effect=owned):
                importing = asyncio.create_task(self.scheduler.async_replace_portable_data(
                    zones=zones, room_groups={}))
                await asyncio.wait_for(entered.wait(), timeout=2)
                self.hass.states[self.entity_id].attributes["current_temperature"] = 20.9
                await self.scheduler._async_observe_preconditioning_temperature(
                    self.entity_id, NOW + timedelta(minutes=5), 20.9)
                self.scheduler._timer_lock.release()
                await asyncio.wait_for(asyncio.shield(importing), timeout=2)
        finally:
            if self.scheduler._timer_lock.locked():
                self.scheduler._timer_lock.release()
            if importing is not None:
                importing.cancel()
                await asyncio.gather(importing, return_exceptions=True)
        history = self.data["preconditioning_learning"][self.entity_id]
        self.assertEqual(len(history["heat"]["observations"]), 1)
        self.assertEqual(history["heat"]["observations"][0]["target_temp"], 21)
        self.assertEqual(history["cool"]["observations"], [])

    async def test_profile_import_completion_failure_keeps_committed_config_and_new_sample(self):
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        profile = {"key": "imported", "name": "Imported", "color": "#336699",
                   "description": "", "icon": "mdi:home",
                   "zones": {self.entity_id: {"behavior": "normal"}}}

        async def completion(**kwargs):
            self.assertFalse(self.scheduler._preconditioning_learning_mutation_lock.locked())
            self.hass.states[self.entity_id].attributes["current_temperature"] = 20.9
            await self.scheduler._async_observe_preconditioning_temperature(
                self.entity_id, NOW + timedelta(minutes=5), 20.9)
            raise RuntimeError("physical completion failed")

        with patch.object(self.scheduler, "_async_complete_profile_transition", side_effect=completion):
            with self.assertRaisesRegex(RuntimeError, "physical completion failed") as failure:
                await self.scheduler.async_replace_portable_data(profiles=[profile])
        self.assertTrue(failure.exception.velair_import_persisted)
        self.assertEqual(self.data["profiles"][0]["key"], "imported")
        history = self.data["preconditioning_learning"][self.entity_id]["heat"]["observations"]
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["target_temp"], 21)
        self.assertFalse(self.scheduler._preconditioning_learning_mutation_lock.locked())

    async def test_changed_step_metadata_matches_real_scalar_delivery(self):
        from custom_components.velair.climate_manager import ClimateManager
        self.preparation("cool", assist=False)
        self.data["zones"][self.entity_id]["schedule"]["tuesday"][0]["temperature"] = 24
        self.data["zones"][self.entity_id]["preconditioning"]["cooling_setpoint_offset"] = .5
        state = self.hass.states[self.entity_id]
        state.attributes.update(current_temperature=27, temperature=24, min_temp=5, max_temp=35,
                                target_temp_step=.3, temperature_unit="°C", supported_features=385,
                                hvac_modes=["off", "cool"])
        delivered = []

        async def service(domain, action, data, **kwargs):
            if domain == "climate" and action == "set_temperature":
                delivered.append(dict(data))
                state.attributes["temperature"] = data["temperature"]

        self.hass.services.async_call = service
        manager = ClimateManager(self.hass)
        self.scheduler._physical_climate_manager = manager
        self.scheduler._climate_manager = manager
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        event = self.scheduler.calculate_next_event(NOW)
        await self.scheduler._async_apply_event(event, source="step_changed")
        offset = self.scheduler._accepted_preconditioning_offset(self.entity_id)
        self.assertEqual(event.temperature, 24)
        self.assertEqual(offset["base_target"], {"temperature": 23.9})
        self.assertEqual(offset["requested"], -.5)
        self.assertEqual(offset["applied"], -.3)
        self.assertEqual(delivered[-1]["temperature"], 23.6)
        self.assertAlmostEqual(offset["base_target"]["temperature"] + offset["applied"], delivered[-1]["temperature"])

    def test_overlay_base_keeps_canonical_rejection_and_missing_step_policy(self):
        event = self.preparation(assist=False)
        for invalid in (100, -100, float("nan"), float("inf")):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                self.scheduler._offset_target(self.entity_id, {"temperature": invalid}, event)
        with patch.object(self.scheduler, "get_temperature_step", return_value=None):
            target, offset = self.scheduler._offset_target(self.entity_id, {"temperature": 20.4}, event)
            self.assertEqual(offset["base_target"], {"temperature": 20.4})
            self.assertEqual(target, {"temperature": 22.4})
            with self.assertRaises(ValueError):
                self.scheduler._offset_target(self.entity_id, {"temperature": 35.1}, event)


class PreconditioningOffsetRangeTest(unittest.IsolatedAsyncioTestCase):
    setUp = range_fixture.FixedRangeReferenceTest.setUp
    save = range_fixture.FixedRangeReferenceTest.save
    asyncTearDown = range_fixture.FixedRangeReferenceTest.asyncTearDown
    block = range_fixture.FixedRangeReferenceTest.block
    configure = range_fixture.FixedRangeReferenceTest.configure

    async def prepare(self, direction, *, native=True, climate=22, reference="low", assist=True):
        mode = "heat_cool" if native else direction
        self.state.attributes["hvac_modes"].append("heat_cool")
        room = 18 if direction == "heat" else 28
        zone = self.configure(mode, reference, room)
        self.state.attributes["current_temperature"] = climate
        self.block()["start"] = "19:00"
        zone["preconditioning"].update(heating_setpoint_offset=3, cooling_setpoint_offset=3,
                                       minimum_delta_temperature=.1, room_sensor_assist_enabled=assist)
        self.scheduler._prepare_runtime_projection(NOW, configuration=True, refresh_horizon=True)
        event = self.scheduler.calculate_next_event(NOW)
        self.assertIsNotNone(event.target_when)
        await self.scheduler._async_apply_event(event, source="test")
        return event

    async def test_native_range_both_directions_partial_and_zero_capacity(self):
        for direction, climate, expected in (("heat", 22, 2), ("heat", 24, 0),
                                              ("cool", 24, -2), ("cool", 22, 0)):
            with self.subTest(direction=direction, climate=climate):
                self.scheduler._applied_preconditioning_targets.clear()
                self.scheduler._room_sensor_assist_states.clear()
                await self.prepare(direction, climate=climate)
                state = self.scheduler._room_sensor_assist_states[self.entity]
                self.assertEqual(state.preconditioning_offset["applied"], expected)
                self.assertEqual(state.applied_target_temp_high - state.applied_target_temp_low, 4)
                self.assertEqual((state.target_temp_low, state.target_temp_high), (21, 25))
                self.assertFalse(state.braking and state.braking["active"])

    async def test_fixed_references_use_original_selected_boundary(self):
        for direction in ("heat", "cool"):
            for reference, target in (("low", 21), ("high", 25)):
                self.scheduler._applied_preconditioning_targets.clear()
                self.scheduler._room_sensor_assist_states.clear()
                await self.prepare(direction, native=False, reference=reference)
                state = self.scheduler._room_sensor_assist_states[self.entity]
                self.assertEqual(state.preconditioning_offset["direction"], direction)
                demand = self.scheduler.get_shared_demand_room_assist(self.entity)
                self.assertEqual(demand["thresholds"][direction]["stop_temperature"], target + (-.1 if direction == "heat" else .1))

    async def test_no_assist_projection_uses_accepted_pair_before_report(self):
        # Leave Home Assistant's old pair untouched after a successful service.
        async def delayed(domain, service, data, **kwargs):
            self.calls.append((service, dict(data)))
        self.hass.services.async_call = delayed
        self.state.attributes["current_temperature"] = 18
        await self.prepare("heat", climate=18, assist=False)
        status = self.scheduler.get_zone_runtime_status(self.entity)
        self.assertEqual((status["target_temp_low"], status["target_temp_high"]), (21, 25))
        self.assertEqual((status["applied_target_temp_low"], status["applied_target_temp_high"]), (24, 28))

    async def test_native_range_discards_directed_base_when_retiring_inside_assist_deadband(self):
        await self.prepare("heat", climate=22)
        self.data["zones"][self.entity]["preconditioning"]["room_sensor_assist_deadband"] = .6
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        self.hass.states["sensor.room"].state = "20.5"
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity)
        state = self.scheduler._room_sensor_assist_states[self.entity]
        self.assertIsNone(state.direction)
        self.assertEqual(state.preconditioning_offset["base_target"], {"target_temp_low": 22.5, "target_temp_high": 26.5})
        self.hass.states["sensor.room"].state = "20.9"
        await self.scheduler._async_observe_preconditioning_temperature(self.entity, NOW + timedelta(minutes=5), 20.9)
        state = self.scheduler._room_sensor_assist_states[self.entity]
        self.assertIsNone(state.preconditioning_offset)
        self.assertEqual((state.applied_target_temp_low, state.applied_target_temp_high), (21, 25))
        self.assertLess(state.applied_target_temp_low, self.state.attributes["current_temperature"])

    async def test_changed_step_range_metadata_uses_deliverable_base_width(self):
        self.state.attributes["hvac_modes"].append("heat_cool")
        zone = self.configure("heat_cool", "low", 18)
        self.block()["start"] = "19:00"
        zone["preconditioning"].update(heating_setpoint_offset=.5, cooling_setpoint_offset=.5,
                                       minimum_delta_temperature=.1, room_sensor_assist_enabled=False)
        self.state.attributes.update(min_temp=5, target_temp_step=.3, current_temperature=17)
        self.scheduler._prepare_runtime_projection(NOW, configuration=True, refresh_horizon=True)
        event = self.scheduler.calculate_next_event(NOW)
        await self.scheduler._async_apply_event(event, source="step_changed")
        offset = self.scheduler._accepted_preconditioning_offset(self.entity)
        delivered = next(data for action, data in reversed(self.calls) if action == "set_temperature")
        self.assertEqual((event.target_temp_low, event.target_temp_high), (21, 25))
        self.assertEqual(offset["base_target"], {"target_temp_low": 20.9, "target_temp_high": 25.1})
        self.assertEqual(offset["applied"], .3)
        self.assertEqual((delivered["target_temp_low"], delivered["target_temp_high"]), (21.2, 25.4))
        self.assertAlmostEqual(delivered["target_temp_high"] - delivered["target_temp_low"],
                               offset["base_target"]["target_temp_high"] - offset["base_target"]["target_temp_low"])
