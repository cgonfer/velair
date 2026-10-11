"""Regression coverage for weekly deadlines and timer catch-up."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from zoneinfo import ZoneInfo

from .helpers import ACTION_SET_TEMPERATURE, ACTION_TURN_OFF, NOW, empty_week_schedule, scheduler_module
from . import test_scheduler_application as application_tests
from . import test_planned_return_runtime as return_tests
from custom_components.velair.execution import ExecutionAuthority


class SchedulerDeadlineTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        fixture = application_tests.VelairSchedulerPreconditioningTest()
        fixture.setUp()
        self.scheduler = fixture.scheduler
        self.data = fixture.data
        self.hass = fixture.hass
        self.climate = fixture.climate
        self.entity = fixture.entity_id
        self.zone = self.data["zones"][self.entity]
        self.clock = [datetime(2026, 5, 19, 18, tzinfo=timezone.utc)]
        self.clock_patch = patch.object(scheduler_module.dt_util, "now", lambda: self.clock[0])
        self.clock_patch.start()
        self.addCleanup(self.clock_patch.stop)
        self.zone["preconditioning"]["fallback_minutes_per_degree"] = 40
        self.hass.states[self.entity].attributes["current_temperature"] = 18

    def block(self, start, target=21, mode="heat"):
        return {"start": start, "action": ACTION_SET_TEMPERATURE,
                "temperature": target, "hvac_mode": mode}

    def add_zone(self, blocks, *, preconditioning=False, mode="heat", current=20):
        entity = "climate.second"
        zone = deepcopy(self.zone)
        zone["schedule"]["tuesday"] = blocks
        zone["preconditioning"]["enabled"] = preconditioning
        self.data["zones"][entity] = zone
        self.hass.states[entity] = SimpleNamespace(
            state=mode, attributes={"current_temperature": current})
        return entity

    async def test_other_zone_timer_survives_applied_early_window(self):
        for mode, current, target in (("heat", 18, 21), ("cool", 26, 23)):
            with self.subTest(mode=mode):
                self.setUp()
                self.hass.states[self.entity] = SimpleNamespace(
                    state=mode, attributes={"current_temperature": current})
                self.zone["schedule"]["tuesday"] = [self.block("20:00", target, mode)]
                other = self.add_zone([self.block("19:00", target, mode)], mode=mode)
                await self.scheduler._handle_timer(self.clock[0])
                expected = self.clock[0] + timedelta(hours=1)
                self.assertEqual(self.scheduler._calculate_next_action_time(self.clock[0]), expected)
                self.clock[0] = expected
                await self.scheduler._handle_timer(expected)
                self.assertTrue(any(call[1] == other for call in self.climate.calls))

    async def test_other_early_start_gets_its_own_timer(self):
        self.zone["schedule"]["tuesday"] = [self.block("20:00")]
        other = self.add_zone([self.block("20:15", 21)], preconditioning=True, current=20)
        await self.scheduler._handle_timer(self.clock[0])
        due = next(event.when for event in self.scheduler.next_events_by_zone if event.entity_id == other)
        self.assertEqual(self.scheduler._calculate_next_action_time(self.clock[0]), due)
        self.clock[0] = due
        await self.scheduler._handle_timer(due)
        self.assertTrue(any(call[1] == other for call in self.climate.calls))

    async def test_intervening_off_suppresses_early_start_and_reheats_at_comfort(self):
        self.zone["schedule"]["tuesday"] = [
            {"start": "19:00", "action": ACTION_TURN_OFF}, self.block("20:00")]
        events = self.scheduler.calculate_next_events_by_zone(self.clock[0])
        self.assertEqual(events[0].start, "19:00")
        heat = next(event for event in self.scheduler._iter_future_events(self.clock[0])
                    if event.start == "20:00")
        self.assertIsNone(heat.target_when)
        self.assertIsNone(heat.preconditioning_diagnostics)
        await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(self.climate.calls, [])
        self.clock[0] += timedelta(hours=1)
        await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(self.climate.calls, [("turn_off", self.entity)])
        self.clock[0] += timedelta(hours=1)
        await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(self.climate.calls[-1], ("set_temperature", self.entity, 21.0, True, "heat"))

    def test_early_start_equal_to_predecessor_is_suppressed(self):
        self.zone["schedule"]["tuesday"] = [self.block("18:00", 19), self.block("20:00")]
        event = next(event for event in self.scheduler._iter_future_events(self.clock[0])
                     if event.start == "20:00")
        self.assertIsNone(event.target_when)

    def test_manual_expiration_uses_next_nominal_block(self):
        # Non-overlapping starts can still reorder events from the visible plan.
        self.zone["schedule"]["tuesday"] = [
            {"start": "19:00", "action": ACTION_TURN_OFF}, self.block("20:00")]
        until = self.scheduler._manual_control_until(
            self.entity, {"action": "until_next_block"}, self.clock[0], preserve_existing=False)
        self.assertEqual(until, "2026-05-19T19:00:00+00:00")

    async def test_delayed_callback_applies_latest_block_only(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00", 20), self.block("19:01", 22)]
        self.scheduler.async_schedule_next_event()
        scheduled = self.clock[0] + timedelta(hours=1)
        self.clock[0] = scheduled + timedelta(minutes=3)
        await self.scheduler._handle_timer(scheduled)
        self.assertEqual(self.climate.calls, [("set_temperature", self.entity, 22.0, True, "heat")])

    async def test_slow_delivery_drains_other_zone_and_latest_crossed_transition(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00")]
        other = self.add_zone([self.block("19:01", 20), self.block("19:02", 22)])
        self.scheduler.async_schedule_next_event()
        original = self.climate.async_set_temperature
        async def slow(*args, **kwargs):
            await original(*args, **kwargs)
            self.clock[0] = datetime(2026, 5, 19, 19, 3, tzinfo=timezone.utc)
        self.clock[0] += timedelta(hours=1)
        with patch.object(self.climate, "async_set_temperature", slow):
            await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity, 21.0, True, "heat"),
            ("set_temperature", other, 22.0, True, "heat")])

    async def test_concurrent_and_duplicate_callbacks_apply_once(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00")]
        self.scheduler.async_schedule_next_event()
        self.clock[0] += timedelta(hours=1)
        await asyncio.gather(self.scheduler._handle_timer(self.clock[0]),
                             self.scheduler._handle_timer(self.clock[0]))
        await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(len(self.climate.calls), 1)

    async def test_start_does_not_replay_historical_blocks(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("17:00")]
        await self.scheduler.async_start(apply_current_schedule=False)
        await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(self.climate.calls, [])

    async def test_stopped_scheduler_aborts_catchup_after_slow_delivery(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00")]
        self.add_zone([self.block("19:01", 22)])
        self.scheduler.async_schedule_next_event()
        original = self.climate.async_set_temperature
        async def stop(*args, **kwargs):
            await original(*args, **kwargs)
            self.clock[0] = datetime(2026, 5, 19, 19, 2, tzinfo=timezone.utc)
            await self.scheduler.async_stop()
        self.clock[0] += timedelta(hours=1)
        with patch.object(self.climate, "async_set_temperature", stop):
            await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(len(self.climate.calls), 1)
        self.assertIsNone(self.scheduler._unsub_timer)

    async def test_replan_after_missed_deadline_schedules_catchup(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00")]
        self.scheduler.async_schedule_next_event()
        self.clock[0] += timedelta(hours=1, minutes=2)
        self.scheduler.async_schedule_next_event()
        await asyncio.sleep(0)
        self.assertEqual(self.climate.calls, [("set_temperature", self.entity, 21.0, True, "heat")])

    def test_cross_midnight_window_does_not_cross_previous_off(self):
        self.clock[0] = datetime(2026, 5, 19, 23, tzinfo=timezone.utc)
        self.zone["schedule"]["tuesday"] = [{"start": "23:30", "action": ACTION_TURN_OFF}]
        self.zone["schedule"]["wednesday"] = [self.block("01:00")]
        event = next(event for event in self.scheduler._iter_future_events(self.clock[0])
                     if event.weekday == "wednesday")
        self.assertIsNone(event.target_when)
        self.zone["schedule"]["tuesday"][0]["start"] = "22:00"
        event = next(event for event in self.scheduler._iter_future_events(self.clock[0])
                     if event.weekday == "wednesday")
        self.assertIsNotNone(event.target_when)

    def test_dst_overlap_window_compares_actual_instants(self):
        tz = ZoneInfo("Europe/Madrid")
        self.clock[0] = datetime(2026, 10, 25, 1, tzinfo=tz)
        self.zone["schedule"]["sunday"] = [
            {"start": "02:00", "action": ACTION_TURN_OFF}, self.block("03:00")]
        event = next(event for event in self.scheduler._iter_future_events(self.clock[0])
                     if event.start == "03:00")
        # 03:00 CET minus two real hours equals 02:00 CEST, the predecessor.
        self.assertIsNone(event.target_when)

    async def test_inserted_block_invalidates_retained_early_intent(self):
        self.zone["schedule"]["tuesday"] = [self.block("20:00")]
        await self.scheduler._handle_timer(self.clock[0])
        previous = self.scheduler.get_active_target_event(self.entity)
        self.assertIsNotNone(previous.target_when)
        self.zone["schedule"]["tuesday"].insert(0, {"start": "19:00", "action": ACTION_TURN_OFF})
        await self.scheduler._async_finalize_schedule_mutation(
            self.entity, previous, self.clock[0], reason="schedule_changed")
        self.assertNotIn(self.entity, self.scheduler._preconditioning_sessions)
        self.assertFalse(self.scheduler._applied_preconditioning_targets)
        self.clock[0] += timedelta(hours=1)
        await self.scheduler._handle_timer(self.clock[0])
        event = self.scheduler._room_sensor_assist_target_event(self.entity)
        self.assertEqual(event.action, ACTION_TURN_OFF)
        self.assertEqual(self.climate.calls[-1], ("turn_off", self.entity))

    async def test_advancing_clock_finishes_without_idle_drain_loop(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00")]
        reads = 0
        def advancing_now():
            nonlocal reads
            reads += 1
            if reads > 200:
                raise AssertionError("scheduler must not drain an idle advancing clock")
            self.clock[0] += timedelta(microseconds=1)
            return self.clock[0]
        with patch.object(scheduler_module.dt_util, "now", advancing_now):
            self.scheduler.async_schedule_next_event()
            self.clock[0] += timedelta(hours=1)
            await asyncio.wait_for(self.scheduler._handle_timer(self.clock[0]), timeout=1)
        self.assertLess(reads, 100)
        self.assertEqual(len(self.climate.calls), 1)

    async def test_delayed_range_and_cooling_delivery_preserve_latest_targets(self):
        self.zone["preconditioning"]["enabled"] = False
        self.climate.temperature_range_support[self.entity] = True
        self.zone["schedule"]["tuesday"] = [{
            "start": "19:00", "action": ACTION_SET_TEMPERATURE,
            "target_temp_low": 19, "target_temp_high": 24, "hvac_mode": "heat_cool"}]
        other = self.add_zone([self.block("19:01", 23, "cool")], mode="cool", current=26)
        self.scheduler.async_schedule_next_event()
        scheduled = self.clock[0] + timedelta(hours=1)
        self.clock[0] = scheduled + timedelta(minutes=3)
        await self.scheduler._handle_timer(scheduled)
        self.assertEqual(self.climate.calls, [
            ("set_temperature_range", self.entity, 19.0, 24.0, True, "heat_cool"),
            ("set_temperature", other, 23.0, True, "cool")])

    async def test_new_ownership_gates_during_delivery_prevent_catchup(self):
        for gate in ("disabled", "external", "paused"):
            with self.subTest(gate=gate):
                self.setUp()
                self.zone["preconditioning"]["enabled"] = False
                self.zone["schedule"]["tuesday"] = [self.block("19:00")]
                other = self.add_zone([self.block("19:01", 22)])
                self.scheduler._execution_authority = ExecutionAuthority(self.data)
                self.scheduler.async_schedule_next_event()
                original = self.climate.async_set_temperature
                async def change_authority(*args, **kwargs):
                    await original(*args, **kwargs)
                    self.clock[0] = datetime(2026, 5, 19, 19, 2, tzinfo=timezone.utc)
                    if gate == "disabled":
                        self.data["zones"][other]["enabled"] = False
                    elif gate == "external":
                        self.data["zones"][other]["execution"] = {"type": "external", "provider": "test"}
                    else:
                        self.data["global_"]["mode"] = "paused"
                self.clock[0] += timedelta(hours=1)
                with patch.object(self.climate, "async_set_temperature", change_authority):
                    await self.scheduler._handle_timer(self.clock[0])
                self.assertEqual(len(self.climate.calls), 1)

    async def test_zone_override_expiration_crossed_during_delivery_is_restored(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00")]
        other = self.add_zone([self.block("19:01", 22)])
        self.data["zones"][other]["override"] = {
            "type": "boost", "started_at": self.clock[0].isoformat(),
            "until": "2026-05-19T19:01:00+00:00", "temperature": 25,
            "previous_state": {"hvac_mode": "heat", "temperature": 20}}
        self.scheduler.async_schedule_next_event()
        original = self.climate.async_set_temperature
        async def slow(*args, **kwargs):
            await original(*args, **kwargs)
            self.clock[0] = datetime(2026, 5, 19, 19, 2, tzinfo=timezone.utc)
        self.clock[0] += timedelta(hours=1)
        with patch.object(self.climate, "async_set_temperature", slow):
            await self.scheduler._handle_timer(self.clock[0])
        self.assertIsNone(self.data["zones"][other]["override"])
        self.assertEqual(self.climate.calls[-1], ("set_temperature", other, 22.0, True, "heat"))

    async def test_cancelled_timer_cannot_dispatch_after_replan(self):
        callbacks = []
        def register(hass, callback, when):
            callbacks.append(callback)
            return lambda: None
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00")]
        with patch.object(scheduler_module, "async_track_point_in_time", register):
            self.scheduler.async_schedule_next_event()
            self.scheduler.async_schedule_next_event()
            self.clock[0] += timedelta(hours=1)
            await callbacks[0](self.clock[0])
            self.assertEqual(self.climate.calls, [])
            await callbacks[1](self.clock[0])
        self.assertEqual(len(self.climate.calls), 1)

    async def test_late_accepted_start_does_not_keep_invalid_session_after_mutation(self):
        self.zone["schedule"]["tuesday"] = [self.block("20:00")]
        self.clock[0] += timedelta(minutes=30)
        await self.scheduler._handle_timer(self.clock[0])
        previous = self.scheduler.get_active_target_event(self.entity)
        self.assertIsNotNone(previous.target_when)
        self.zone["schedule"]["tuesday"].insert(0, {"start": "18:15", "action": ACTION_TURN_OFF})
        await self.scheduler._async_finalize_schedule_mutation(
            self.entity, previous, self.clock[0], reason="schedule_changed")
        self.assertNotIn(self.entity, self.scheduler._preconditioning_sessions)
        self.assertFalse(self.scheduler._applied_preconditioning_targets)
        self.assertEqual(self.climate.calls[-1], ("turn_off", self.entity))
        self.assertEqual(self.scheduler.get_active_target_event(self.entity).action, ACTION_TURN_OFF)

    async def test_failed_early_delivery_keeps_coordinator_recovery_without_immediate_loop(self):
        self.zone["schedule"]["tuesday"] = [self.block("20:00")]
        calls = []
        async def fail(*args, **kwargs):
            calls.append(args)
            raise scheduler_module.HomeAssistantError("temporarily unavailable")
        with patch.object(self.climate, "async_set_temperature", fail):
            await self.scheduler._handle_timer(self.clock[0])
            await asyncio.sleep(0)
            self.assertTrue(self.scheduler._climate_delivery.is_deferred(self.entity))
            self.assertEqual(self.scheduler._calculate_next_action_time(self.clock[0]),
                             datetime(2026, 5, 19, 20, tzinfo=timezone.utc))
            await self.scheduler._handle_timer(self.clock[0])
            self.assertEqual(len(calls), 1)
        await self.scheduler.async_stop()

    async def test_stop_restart_during_delivery_does_not_drain_old_lifecycle(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00")]
        self.add_zone([self.block("19:01", 22)])
        self.scheduler.async_schedule_next_event()
        original = self.climate.async_set_temperature
        async def restart(*args, **kwargs):
            await original(*args, **kwargs)
            self.clock[0] = datetime(2026, 5, 19, 19, 2, tzinfo=timezone.utc)
            await self.scheduler.async_stop()
            await self.scheduler.async_start(apply_current_schedule=False)
        self.clock[0] += timedelta(hours=1)
        with patch.object(self.climate, "async_set_temperature", restart):
            await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(len(self.climate.calls), 1)

    async def test_fresh_latest_delivery_is_not_repeated_in_catchup_pass(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00")]
        other = self.add_zone([self.block("19:00", 20), self.block("19:02", 23)])
        self.scheduler.async_schedule_next_event()
        original = self.climate.async_set_temperature
        async def slow(*args, **kwargs):
            await original(*args, **kwargs)
            self.clock[0] = datetime(2026, 5, 19, 19, 3, tzinfo=timezone.utc)
        self.clock[0] += timedelta(hours=1)
        with patch.object(self.climate, "async_set_temperature", slow):
            await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity, 21.0, True, "heat"),
            ("set_temperature", other, 23.0, True, "heat")])

    async def test_own_new_transition_crossed_during_call_is_delivered(self):
        self.zone["preconditioning"]["enabled"] = False
        self.zone["schedule"]["tuesday"] = [self.block("19:00"), self.block("19:02", 23)]
        self.scheduler.async_schedule_next_event()
        original = self.climate.async_set_temperature
        async def slow(*args, **kwargs):
            await original(*args, **kwargs)
            self.clock[0] = datetime(2026, 5, 19, 19, 3, tzinfo=timezone.utc)
        self.clock[0] += timedelta(hours=1)
        with patch.object(self.climate, "async_set_temperature", slow):
            await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity, 21.0, True, "heat"),
            ("set_temperature", self.entity, 23.0, True, "heat")])

    async def test_previous_success_does_not_suppress_newly_due_early_plan(self):
        self.zone["schedule"]["tuesday"] = [self.block("17:00", 19), self.block("20:00")]
        self.hass.states[self.entity].attributes["current_temperature"] = 20
        self.clock[0] = datetime(2026, 5, 19, 17, tzinfo=timezone.utc)
        await self.scheduler._handle_timer(self.clock[0])
        self.assertTrue(self.scheduler._climate_delivery.is_deferred(self.entity))
        self.clock[0] = datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc)
        await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(len(self.climate.calls), 1)
        self.hass.states[self.entity].attributes["current_temperature"] = 18
        self.clock[0] += timedelta(minutes=10)
        self.assertLessEqual(self.scheduler._calculate_next_action_time(self.clock[0]), self.clock[0])
        await self.scheduler._handle_timer(self.clock[0])
        self.assertEqual(self.climate.calls[-1], ("set_temperature", self.entity, 21.0, True, "heat"))
        self.assertEqual(len(self.climate.calls), 2)

    async def test_away_week_mutation_preserves_planned_return_preparation(self):
        self.clock[0] = NOW
        fixture = return_tests.PlannedReturnRuntimeTest()
        await fixture.asyncSetUp()
        self.addAsyncCleanup(fixture.asyncTearDown)
        owner = fixture.scheduler
        schedule = empty_week_schedule()
        schedule["tuesday"] = [self.block("00:00", 16), self.block("19:00")]
        await owner.async_set_profile({
            "key": "away_profile", "name": "Away", "color": "#336699",
            "zones": {"climate.salon": {"behavior": "schedule", "schedule": schedule}}})
        owner._data["zones"]["climate.salon"]["preconditioning"]["enabled"] = True
        await fixture.depart()
        owner._data["planned_return_episode"]["preparing_entities"] = ["climate.salon"]
        with patch.object(owner, "_preconditioned_event_details", return_value=(NOW, None)):
            target = fixture.runtime.target("climate.salon")
            await owner._async_apply_event(target, source="planned_return")
            self.assertIn("climate.salon", owner._preconditioning_sessions)
            previous = owner.get_active_target_event("climate.salon")
            owner._profile_by_id("away_profile")["zones"]["climate.salon"]["schedule"]["tuesday"].insert(
                1, {"start": "18:15", "action": ACTION_TURN_OFF})
            fixture.climate.calls.clear()
            await owner._async_finalize_schedule_mutation(
                "climate.salon", previous, NOW, reason="schedule_changed")
            self.assertIn("climate.salon", owner._preconditioning_sessions)
            self.assertTrue(owner._applied_preconditioning_targets)
            self.assertEqual(fixture.climate.calls, [])
            self.assertEqual(owner._room_sensor_assist_applied_preconditioning_event(
                "climate.salon", "tuesday", "19:00", 21, "heat").temperature, 21)
        await owner.async_adjust_planned_return((NOW + timedelta(days=2)).isoformat())
        self.assertIsNone(fixture.runtime.target("climate.salon"))
        self.assertNotIn("climate.salon", owner._preconditioning_sessions)
        self.assertFalse(owner._applied_preconditioning_targets)
        self.assertEqual(owner.get_active_target_event("climate.salon").temperature, 16)
        self.assertEqual(fixture.climate.calls[-1], ("set_temperature", "climate.salon", 16.0, True, "heat"))
