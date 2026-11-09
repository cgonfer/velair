"""Blocked schedule authority waits; matured assist work has one owner."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .helpers import NOW, scheduler_module
from . import test_scheduler_deadlines as deadline_tests
from . import test_local_projection_guards as guard_tests
from . import test_prepared_return_projection as projection_tests
from custom_components.velair import planned_return as return_module


class DeferredSchedulerWorkTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        fixture = deadline_tests.SchedulerDeadlineTest()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        self.s, self.data, self.hass = fixture.scheduler, fixture.data, fixture.hass
        self.climate, self.entity, self.zone = fixture.climate, fixture.entity, fixture.zone
        self.clock, self.fixture = fixture.clock, fixture
        self.addAsyncCleanup(self.s.async_stop)
        self.zone["preconditioning"]["fallback_minutes_per_degree"] = 50
        self.zone["schedule"]["tuesday"] = [fixture.block("20:00")]
        self.s._timer_cursor = self.clock[0]
        self.s._prepare_runtime_projection(configuration=True)

    async def settle(self):
        for _ in range(12):
            await asyncio.sleep(0)

    async def test_due_early_start_waits_without_rearming_and_recovers_once(self):
        with self.s._projection_save_scope({self.entity}):
            for _ in range(4):
                await self.s._handle_timer(self.clock[0])
                await self.settle()
                self.assertIsNone(self.s._calculate_next_action_time(self.clock[0]))
            self.assertEqual(self.climate.calls, [])
            self.assertFalse(self.s._attempted_preconditioning_events)
            self.assertIn(self.entity, self.s._deferred_timer_cursors)
        await self.settle()
        self.assertEqual(self.climate.calls, [("set_temperature", self.entity, 21.0, True, "heat")])
        self.assertFalse(self.s._deferred_timer_cursors)
        self.assertIsNone(self.s._deferred_timer_task)
        await self.s._handle_timer(self.clock[0])
        self.assertEqual(len(self.climate.calls), 1)

    async def test_other_zone_keeps_its_deadline_and_does_not_replay(self):
        other = self.fixture.add_zone([self.fixture.block("19:00", 23)])
        self.s._prepare_runtime_projection(configuration=True)
        with self.s._projection_save_scope({self.entity}):
            await self.s._handle_timer(self.clock[0])
            deadline = self.clock[0] + timedelta(hours=1)
            self.assertEqual(self.s._calculate_next_action_time(self.clock[0]), deadline)
            self.clock[0] = deadline
            await self.s._handle_timer(deadline)
            self.assertEqual(self.climate.calls, [("set_temperature", other, 23.0, True, "heat")])
        await self.settle()
        self.assertEqual(sum(call[1] == other for call in self.climate.calls), 1)
        self.assertEqual(sum(call[1] == self.entity for call in self.climate.calls), 1)

    async def _public_save_crossing_deadline(self, fail, mode="heat"):
        self.zone["preconditioning"]["enabled"] = False
        self.hass.states[self.entity].state = mode
        self.zone["schedule"]["tuesday"] = [
            self.fixture.block("17:00", 18, mode), self.fixture.block("19:00", 21, mode),
            self.fixture.block("19:02", 23, mode)]
        self.s._prepare_runtime_projection(configuration=True)
        entered, release = asyncio.Event(), asyncio.Event()
        original_save = self.s._async_save_data
        async def save():
            entered.set()
            await release.wait()
            if fail:
                raise OSError("held save failed")
            await original_save()
        with patch.object(self.s, "_async_save_data", save):
            mutation = asyncio.create_task(self.s.async_set_daily_schedule(
                self.entity, "tuesday", [self.fixture.block("17:00", 18, mode), self.fixture.block("19:00", 22, mode)]))
            await entered.wait()
            self.clock[0] += timedelta(hours=1, minutes=3)
            await self.s._handle_timer(self.clock[0])
            self.assertEqual(self.climate.calls, [])
            self.assertFalse(self.s._attempted_preconditioning_events)
            release.set()
            if fail:
                with self.assertRaisesRegex(OSError, "held save failed"):
                    await mutation
            else:
                await mutation
            await self.settle()
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity, 23.0 if fail else 22.0, True, mode)])
        self.assertFalse(self.s._deferred_timer_cursors)
        await self.s._handle_timer(self.clock[0])
        self.assertEqual(len(self.climate.calls), 1)

    async def test_successful_public_save_catches_up_latest_committed_block_once(self):
        await self._public_save_crossing_deadline(False)

    async def test_failed_public_save_catches_up_latest_restored_block_once(self):
        await self._public_save_crossing_deadline(True)

    async def test_failed_public_cooling_save_catches_up_latest_restored_block_once(self):
        await self._public_save_crossing_deadline(True, "cool")

    async def test_save_finishing_during_active_catchup_keeps_its_wakeup(self):
        other = self.fixture.add_zone([self.fixture.block("19:00", 23)])
        self.s._prepare_runtime_projection(configuration=True)
        entered, release = asyncio.Event(), asyncio.Event()
        original = self.climate.async_set_temperature
        async def slow(entity, *args, **kwargs):
            if entity == self.entity:
                entered.set()
                await release.wait()
            await original(entity, *args, **kwargs)
        with patch.object(self.climate, "async_set_temperature", slow):
            with self.s._projection_save_scope({self.entity}):
                await self.s._handle_timer(self.clock[0])
            await entered.wait()
            with self.s._projection_save_scope({other}):
                self.clock[0] += timedelta(hours=1, minutes=1)
                self.s.async_schedule_next_event()
                self.assertIn(other, self.s._deferred_timer_cursors)
            release.set()
            await self.settle()
        self.assertEqual(sum(call[1] == other for call in self.climate.calls), 1)
        self.assertFalse(self.s._deferred_timer_cursors)
        self.assertIsNone(self.s._deferred_timer_task)

    async def test_overlapping_save_scopes_resume_each_zone_once(self):
        other = self.fixture.add_zone([self.fixture.block("20:00", 24)], preconditioning=True, current=20)
        self.s._prepare_runtime_projection(configuration=True)
        first = self.s._projection_save_scope({self.entity})
        second = self.s._projection_save_scope({other})
        first.__enter__()
        second.__enter__()
        try:
            await self.s._handle_timer(self.clock[0])
            first.__exit__(None, None, None)
            await self.settle()
            self.assertEqual(self.climate.calls, [])
        finally:
            second.__exit__(None, None, None)
        await self.settle()
        self.assertEqual({call[1] for call in self.climate.calls}, {self.entity, other})
        self.assertEqual(len(self.climate.calls), 2)

    async def test_pending_master_withholds_child_authority(self):
        master = self.fixture.add_zone([self.fixture.block("20:00", 22)], preconditioning=True, current=18)
        self.zone["preconditioning"]["master_entity_id"] = master
        self.s._prepare_runtime_projection(configuration=True)
        with self.s._projection_save_scope({master}):
            self.assertTrue(self.s._timer_authority_pending(self.entity))
            await self.s._handle_timer(self.clock[0])
            self.assertEqual(self.climate.calls, [])
            self.assertIsNone(self.s._calculate_next_action_time(self.clock[0]))
        await self.settle()
        self.assertTrue(self.climate.calls)
        self.assertEqual(self.climate.calls[0][1], master)

    async def test_stop_cancels_waiting_wake_and_restart_has_no_stale_work(self):
        with self.s._projection_save_scope({self.entity}):
            await self.s._handle_timer(self.clock[0])
            self.s._queue_deferred_timer()
            await self.settle()
            await self.s.async_stop()
        await self.settle()
        self.assertFalse(self.s._deferred_timer_cursors)
        self.assertIsNone(self.s._deferred_timer_task)
        self.assertEqual(self.climate.calls, [])
        await self.s.async_start()
        await self.settle()
        self.assertEqual(len(self.climate.calls), 1)


class AssistWorkerTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.enterContext(patch.object(scheduler_module.dt_util, "now", return_value=NOW))
        fixture = guard_tests.LocalProjectionGuardTest()
        self.f = fixture.make()
        self.s, self.hass, self.manager = self.f.s, self.f.hass, self.f.manager
        self.addAsyncCleanup(self.s.async_stop)
        for zone in self.f.data["zones"].values():
            zone["preconditioning"]["room_sensor_assist_debounce_seconds"] = 0
        self.s._prepare_runtime_projection(configuration=True)
        self.s._refresh_room_sensor_assist_listener()

    async def settle(self):
        for _ in range(12):
            await asyncio.sleep(0)

    def event(self, entity=guard_tests.LOCAL):
        self.s._handle_room_sensor_assist_state_change(SimpleNamespace(data={"entity_id": guard_tests.sensor(entity)}))

    async def test_forty_matured_callbacks_share_one_worker(self):
        writes = []
        with patch.object(self.s, "_async_write_state", side_effect=lambda: writes.append(True)):
            for _ in range(40):
                self.event()
            worker = self.s._room_sensor_assist_task
            self.assertIsNotNone(worker)
            await worker
        self.assertEqual(len(writes), 1)
        self.assertIsNone(self.s._room_sensor_assist_task)
        self.assertFalse(self.s._pending_room_sensor_assist_entities)
        self.assertEqual(len(self.manager.calls), 2)

    async def test_eager_worker_reserves_admission_before_reentrant_publication(self):
        loop = asyncio.get_running_loop()
        previous_factory = loop.get_task_factory()
        seen = []
        first = True
        async def refresh(entities):
            nonlocal first
            seen.append(tuple(entities))
            if first:
                first = False
                self.event()
        try:
            loop.set_task_factory(asyncio.eager_task_factory)
            with patch.object(self.s, "_async_refresh_room_sensor_assist_candidates", refresh):
                self.event()
            self.assertEqual(len(seen), 2)
            self.assertIsNone(self.s._room_sensor_assist_task)
            self.assertIsNone(self.s._room_sensor_assist_worker_token)
        finally:
            loop.set_task_factory(previous_factory)

    async def test_reports_during_await_retain_latest_input_without_new_worker(self):
        lock = self.s._room_sensor_assist_locks.setdefault(guard_tests.LOCAL, asyncio.Lock())
        await lock.acquire()
        writes = []
        try:
            with patch.object(self.s, "_async_write_state", side_effect=lambda: writes.append(True)):
                self.event()
                await self.settle()
                worker = self.s._room_sensor_assist_task
                for _ in range(40):
                    self.event()
                    await asyncio.sleep(0)
                    self.assertIs(self.s._room_sensor_assist_task, worker)
                self.hass.states[guard_tests.sensor(guard_tests.LOCAL)].state = "19"
                lock.release()
                await worker
        finally:
            if lock.locked():
                lock.release()
        self.assertEqual(len(writes), 2)
        self.assertEqual(sum(call[1] == guard_tests.LOCAL for call in self.manager.calls), 1)
        self.assertEqual(self.s._room_sensor_assist_states[guard_tests.LOCAL].applied_temperature, 22)

    async def test_matured_scheduled_sources_keep_their_union(self):
        lock = self.s._room_sensor_assist_locks.setdefault(guard_tests.LOCAL, asyncio.Lock())
        await lock.acquire()
        try:
            self.s._pending_room_sensor_sources = {guard_tests.sensor(guard_tests.LOCAL)}
            self.s._handle_room_sensor_assist_timer(NOW)
            await self.settle()
            worker = self.s._room_sensor_assist_task
            self.hass.states[guard_tests.sensor(guard_tests.OTHER)].state = "19"
            self.s._pending_room_sensor_sources = {guard_tests.sensor(guard_tests.OTHER)}
            self.s._handle_room_sensor_assist_timer(NOW)
            self.assertIs(self.s._room_sensor_assist_task, worker)
            lock.release()
            await worker
        finally:
            if lock.locked():
                lock.release()
        self.assertEqual({call[1] for call in self.manager.calls}, {guard_tests.LOCAL, guard_tests.OTHER})
        self.assertEqual(self.s._room_sensor_assist_states[guard_tests.OTHER].applied_temperature, 22)

    async def test_positive_debounce_does_not_start_unmatured_work(self):
        timers = []
        def track(_hass, callback, when):
            timer = SimpleNamespace(callback=callback, when=when, active=True)
            timers.append(timer)
            return lambda: setattr(timer, "active", False)
        for zone in self.f.data["zones"].values():
            zone["preconditioning"]["room_sensor_assist_debounce_seconds"] = 20
        self.s._prepare_runtime_projection(configuration=True)
        with patch.object(scheduler_module, "async_track_point_in_time", track):
            for _ in range(40):
                self.event()
            self.assertEqual(len(timers), 1)
            self.assertEqual(timers[0].when, NOW + timedelta(seconds=20))
            await self.settle()
            self.assertIsNone(self.s._room_sensor_assist_task)
            self.assertEqual(self.manager.calls, [])
            timers[0].active = False
            timers[0].callback(timers[0].when)
            await self.s._room_sensor_assist_task
        self.assertEqual(len(self.manager.calls), 2)

    async def test_failure_in_one_zone_does_not_block_other_zone(self):
        original = self.s._async_refresh_room_sensor_assist_from_current_event
        async def refresh(entity):
            if entity == guard_tests.LOCAL:
                raise scheduler_module.HomeAssistantError("zone unavailable")
            await original(entity)
        with patch.object(self.s, "_async_refresh_room_sensor_assist_from_current_event", refresh):
            self.event()
            await self.s._room_sensor_assist_task
        self.assertEqual({call[1] for call in self.manager.calls}, {guard_tests.OTHER})
        self.assertIsNone(self.s._room_sensor_assist_task)

    async def test_stop_cancels_inflight_worker_before_assist_teardown(self):
        entered = asyncio.Event()
        original = self.manager.async_set_temperature
        first = True
        async def slow(*args, **kwargs):
            nonlocal first
            if first:
                first = False
                entered.set()
                await asyncio.Event().wait()
            await original(*args, **kwargs)
        with patch.object(self.manager, "async_set_temperature", slow):
            self.event()
            await entered.wait()
            worker = self.s._room_sensor_assist_task
            self.event()
            await asyncio.wait_for(self.s.async_stop(), 1)
        self.assertTrue(worker.done())
        self.assertIsNone(self.s._room_sensor_assist_task)
        self.assertFalse(self.s._pending_room_sensor_assist_entities)
        self.s._handle_room_sensor_assist_timer(NOW)
        self.assertIsNone(self.s._room_sensor_assist_task)


class ReturnMembershipTest(unittest.TestCase):
    def setUp(self):
        fixture = projection_tests.PreparedReturnProjectionTest()
        fixture.setUp()
        self.s, self.r, self.data, self.entity = fixture.scheduler, fixture.runtime, fixture.data, fixture.entity

    def test_membership_matches_detached_plan_reader_across_episode_states(self):
        for state in ("away", "armed", "fulfilled", "cancelled", "skipped"):
            for now in (NOW, NOW + timedelta(hours=2)):
                with self.subTest(state=state, now=now):
                    self.r.episode["state"] = state
                    self.assertEqual(self.r.has_preparation_plan(self.entity, now),
                                     any(event.entity_id == self.entity for event in self.r.plans(now)))
        self.assertFalse(self.r.has_preparation_plan("climate.missing", NOW))

    def test_membership_does_not_copy_or_generate_global_plans(self):
        expected = self.s._preconditioning_replan_entity_ids(NOW)
        with patch.object(self.r, "plans", side_effect=AssertionError("global Return plan copied")), \
             patch.object(return_module, "deepcopy", side_effect=AssertionError("Return data copied")), \
             patch.object(self.s, "_iter_future_events", side_effect=AssertionError("calendar generated")):
            self.assertTrue(self.r.has_preparation_plan(self.entity, NOW))
            self.assertEqual(self.s._preconditioning_replan_entity_ids(NOW), expected)

    def test_override_and_disabled_zone_keep_existing_membership_semantics(self):
        self.data["zones"][self.entity]["override"] = {
            "type": "boost", "temperature": 24, "until": (NOW + timedelta(minutes=15)).isoformat()}
        self.r.prepare(NOW)
        self.assertEqual(self.r.has_preparation_plan(self.entity, NOW),
                         any(event.entity_id == self.entity for event in self.r.plans(NOW)))
        self.data["zones"][self.entity]["enabled"] = False
        self.r.prepare(NOW)
        self.assertFalse(self.r.has_preparation_plan(self.entity, NOW))
