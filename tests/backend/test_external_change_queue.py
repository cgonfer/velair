"""External control evidence stays ordered while physical corrections coalesce."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeHass, NOW, VelairScheduler, normalize_schedule_data
from custom_components.velair import climate_delivery as delivery_module
from custom_components.velair.climate_change_monitor import ClimateChangeMonitor
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.room_groups import build_group_candidate


class ExternalChangeQueueTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.hass = FakeHass()
        self.hass.config.units = SimpleNamespace(temperature_unit="°C")
        self.entities = ["climate.queued", "climate.independent"]
        for entity in self.entities:
            self.hass.states[entity] = self.state(entity, "heat", temperature=18)
        self.data = normalize_schedule_data(None, self.entities)
        for zone in self.data["zones"].values():
            zone["schedule"]["tuesday"] = [{"start": "00:00", "temperature": 21, "hvac_mode": "heat"}]
        self.save = AsyncMock()
        self.manager = ClimateManager(self.hass)
        self.scheduler = VelairScheduler(self.hass, self.data, self.manager, self.save)
        self.monitor = ClimateChangeMonitor(self.hass, self.entities, self.manager, self.scheduler)
        self.monitor.async_start()
        self.calls = []
        self.sleep = asyncio.sleep
        self.service_hook = None
        self.hass.services.async_call = self.service
        self.addAsyncCleanup(self.shutdown)

    async def shutdown(self):
        tasks = list(self.monitor._tasks)
        self.monitor.async_stop()
        await asyncio.gather(*tasks, return_exceptions=True)
        await self.scheduler.async_stop()

    def state(self, entity, mode, *, context=None, **targets):
        return SimpleNamespace(entity_id=entity, state=mode, context=context, attributes={
            "current_temperature": 18, "hvac_modes": ["off", "heat", "cool", "heat_cool"],
            "supported_features": 2 if "target_temp_low" in targets else 1,
            "min_temp": 7, "max_temp": 35, "target_temp_step": .5, **targets})

    async def service(self, domain, name, data, **kwargs):
        if domain != "climate":
            return
        self.calls.append((name, deepcopy(data)))
        if self.service_hook is not None:
            await self.service_hook(name, data)
        entity = data["entity_id"]
        old = self.hass.states[entity]
        attributes = deepcopy(old.attributes)
        attributes.update({key: value for key, value in data.items()
                           if key not in ("entity_id", "hvac_mode")})
        mode = data.get("hvac_mode", old.state)
        if name == "turn_off":
            mode = "off"
        current = SimpleNamespace(entity_id=entity, state=mode,
                                  attributes=attributes, context=kwargs.get("context"))
        self.hass.states[entity] = current
        self.monitor._handle_state_change(SimpleNamespace(data={
            "entity_id": entity, "old_state": old, "new_state": current},
            context=kwargs.get("context")))

    def emit(self, entity, *, mode=None, **targets):
        old = self.hass.states[entity]
        context = SimpleNamespace(id=f"user-{len(self.hass.bus.events)}-{id(targets)}",
                                  parent_id=None, user_id="synthetic")
        current = SimpleNamespace(entity_id=entity, state=mode or old.state,
                                  attributes={**old.attributes, **targets}, context=context)
        self.hass.states[entity] = current
        self.monitor._handle_state_change(SimpleNamespace(data={
            "entity_id": entity, "old_state": old, "new_state": current}, context=context))

    async def drain(self):
        while self.monitor._tasks:
            await asyncio.gather(*list(self.monitor._tasks))
            await self.sleep(0)

    async def settle(self):
        for _ in range(12):
            await self.sleep(0)

    def observations(self):
        return [data for _kind, data in self.hass.bus.events
                if data.get("event") == "external_climate_change_detected"]

    async def test_queued_heat_reports_keep_all_evidence_but_correct_once(self):
        entity = self.entities[0]
        targets = [18.5 if index % 2 == 0 else 19 for index in range(20)]
        async with self.scheduler._zone_override_lock(entity):
            for target in targets:
                self.emit(entity, temperature=target)
                await asyncio.sleep(0)
            self.assertEqual(len(self.monitor._tasks), 1)
            self.assertEqual(len(self.monitor._pending_changes[entity]), 20)
        await self.drain()
        self.assertEqual([data["temperature"] for name, data in self.calls
                          if name == "set_temperature"], [21])
        observations = self.observations()
        self.assertEqual([item["current"]["temperature"] for item in observations], targets)
        self.assertTrue(all(item["policy"] == "keep_automatic" for item in observations))
        self.assertTrue(all(item["ha_context"]["has_user_id"] for item in observations))
        self.assertFalse(self.data["zones"][entity]["pauses"])
        self.assertFalse(self.monitor._pending_changes)
        self.assertFalse(self.monitor._processing_tokens)

    async def test_cooling_reports_correct_once_using_latest_schedule(self):
        entity = self.entities[0]
        self.hass.states[entity] = self.state(entity, "cool", temperature=26)
        self.data["zones"][entity]["schedule"]["tuesday"] = [
            {"start": "00:00", "temperature": 23, "hvac_mode": "cool"}]
        self.scheduler._prepare_runtime_projection(configuration=True)
        async with self.scheduler._zone_override_lock(entity):
            for target in (26.5, 27, 26.5, 27):
                self.emit(entity, temperature=target)
                await self.sleep(0)
            # Authority changes during the queue remain authoritative at delivery.
            self.data["zones"][entity]["schedule"]["tuesday"][0]["temperature"] = 22
        await self.drain()
        targets = [data for name, data in self.calls if name == "set_temperature"]
        self.assertEqual(len(targets), 1)
        self.assertEqual(targets[0]["temperature"], 22)
        self.assertEqual(self.hass.states[entity].state, "cool")
        self.assertEqual(len(self.observations()), 4)

    async def test_native_range_reports_correct_once(self):
        entity = self.entities[0]
        self.hass.states[entity] = self.state(entity, "heat_cool", target_temp_low=20, target_temp_high=25)
        self.data["zones"][entity]["schedule"]["tuesday"] = [{
            "start": "00:00", "target_temp_low": 19, "target_temp_high": 24, "hvac_mode": "heat_cool"}]
        self.scheduler._prepare_runtime_projection(configuration=True)
        async with self.scheduler._zone_override_lock(entity):
            for low in (20.5, 21, 20.5, 21):
                self.emit(entity, target_temp_low=low, target_temp_high=low + 5)
                await self.sleep(0)
        await self.drain()
        targets = [data for name, data in self.calls if name == "set_temperature"]
        self.assertEqual(len(targets), 1)
        self.assertEqual((targets[0]["target_temp_low"], targets[0]["target_temp_high"]), (19, 24))
        self.assertEqual(len(self.observations()), 4)

    async def assert_manual_reports(self, policy):
        entity = self.entities[0]
        await self.scheduler.async_update_external_change_policy(
            entity, {"action": policy, "duration_minutes": 17})
        self.save.reset_mock()
        async with self.scheduler._zone_override_lock(entity):
            for target in (18.5, 19, 19.5):
                self.emit(entity, temperature=target)
                await self.sleep(0)
            self.assertEqual(len(self.monitor._tasks), 1)
        await self.drain()
        observations = self.observations()
        self.assertEqual([item["current"]["temperature"] for item in observations], [18.5, 19, 19.5])
        self.assertTrue(all(item["policy"] == policy for item in observations))
        # Every report is observed; identical same-instant pause metadata is
        # persisted once, and only the final captured state needs restoration.
        self.assertEqual(self.save.await_count, 1)
        pauses = self.data["zones"][entity]["pauses"]
        self.assertEqual(len(pauses), 1)
        self.assertEqual(pauses[0]["manual_policy"], policy)
        self.assertEqual(self.hass.states[entity].attributes["temperature"], 19.5)
        self.assertFalse(self.monitor.pending_external_fields(entity))

    async def test_until_resumed_keeps_each_observed_policy_transition(self):
        await self.assert_manual_reports("until_resumed")

    async def test_duration_keeps_each_observed_policy_transition(self):
        await self.assert_manual_reports("for_duration")

    async def test_next_block_keeps_each_observed_policy_transition(self):
        await self.assert_manual_reports("until_next_block")

    async def test_independent_zone_progresses_while_first_zone_is_locked(self):
        entity, other = self.entities
        async with self.scheduler._zone_override_lock(entity):
            for target in (18.5, 19, 19.5):
                self.emit(entity, temperature=target)
            self.emit(other, temperature=24)
            await self.monitor._workers[other]
            self.assertEqual([data["entity_id"] for name, data in self.calls
                              if name == "set_temperature"], [other])
            self.assertEqual(len(self.monitor._pending_changes[entity]), 3)
        await self.drain()
        self.assertEqual([data["entity_id"] for name, data in self.calls
                          if name == "set_temperature"], [other, entity])

    async def test_queued_evidence_yields_to_other_ready_work_between_records(self):
        entity = self.entities[0]
        ready_counts, jobs = [], []
        original = self.hass.bus.async_fire
        async def ready():
            ready_counts.append(len(self.observations()))
        def fire(kind, data):
            original(kind, data)
            if data.get("event") == "external_climate_change_detected" and not jobs:
                jobs.append(asyncio.create_task(ready()))
        self.hass.bus.async_fire = fire
        self.addCleanup(setattr, self.hass.bus, "async_fire", original)
        async with self.scheduler._zone_override_lock(entity):
            for index in range(20):
                self.emit(entity, temperature=18.5 if index % 2 == 0 else 19)
        await self.drain()
        await asyncio.gather(*jobs)
        self.assertEqual(ready_counts, [1])
        self.assertEqual(len(self.observations()), 20)
        self.assertEqual([data["temperature"] for name, data in self.calls
                          if name == "set_temperature"], [21])

    async def test_new_report_during_delivery_is_drained_by_same_worker(self):
        entity = self.entities[0]
        entered, release = asyncio.Event(), asyncio.Event()
        seen = False
        async def hold_first(name, data):
            nonlocal seen
            if name == "set_temperature" and not seen:
                seen = True
                entered.set()
                await release.wait()
        self.service_hook = hold_first
        self.emit(entity, temperature=18.5)
        await entered.wait()
        worker = self.monitor._workers[entity]
        self.emit(entity, temperature=19)
        self.emit(entity, temperature=19.5)
        self.assertIs(self.monitor._workers[entity], worker)
        release.set()
        await self.drain()
        self.assertEqual(len(self.observations()), 3)
        self.assertEqual([data["temperature"] for name, data in self.calls
                          if name == "set_temperature"], [21, 21])
        self.assertEqual(self.hass.states[entity].attributes["temperature"], 21)
        self.assertFalse(self.monitor._pending_changes)
        self.assertFalse(self.monitor._queued_changes)

    async def test_boost_stays_authoritative_for_queued_corrections(self):
        entity = self.entities[0]
        await self.scheduler.async_set_zone_boost(
            entity, temperature=24, until=(NOW + timedelta(minutes=30)).isoformat())
        self.calls.clear()
        async with self.scheduler._zone_override_lock(entity):
            for target in (18.5, 19, 19.5):
                self.emit(entity, temperature=target)
        await self.drain()
        self.assertEqual([data["temperature"] for name, data in self.calls
                          if name == "set_temperature"], [24])
        self.assertEqual(self.data["zones"][entity]["override"]["type"], "boost")
        self.assertEqual(len(self.observations()), 3)

    async def test_pause_gate_preserves_observations_without_correction(self):
        entity = self.entities[0]
        await self.scheduler.async_pause_zone(entity, pause_id="window")
        self.calls.clear()
        async with self.scheduler._zone_override_lock(entity):
            for target in (18.5, 19, 19.5):
                self.emit(entity, temperature=target)
        await self.drain()
        self.assertEqual(self.calls, [])
        self.assertEqual(len(self.observations()), 3)
        self.assertEqual(self.data["zones"][entity]["pauses"][0]["pause_id"], "window")

    async def test_failed_correction_retains_coordinator_recovery(self):
        entity = self.entities[0]
        waits = []
        attempts = 0
        async def fail_once(name, data):
            nonlocal attempts
            if name == "set_temperature":
                attempts += 1
                if attempts == 1:
                    raise RuntimeError("synthetic service outage")
        async def wait(delay):
            if delay == 0:
                await self.sleep(0)
                return
            gate = asyncio.Event()
            waits.append((delay, gate))
            await gate.wait()
        self.service_hook = fail_once
        with patch.object(delivery_module.asyncio, "sleep", wait):
            async with self.scheduler._zone_override_lock(entity):
                for target in (18.5, 19, 19.5):
                    self.emit(entity, temperature=target)
            with self.assertLogs("custom_components.velair.climate_delivery", level="WARNING"):
                await self.drain()
            self.assertEqual(attempts, 1)
            self.assertEqual([delay for delay, _ in waits], [2.0])
            self.assertTrue(self.scheduler._climate_delivery.is_deferred(entity))
            self.assertEqual(len(self.observations()), 3)
            waits[0][1].set()
            await self.settle()
        self.assertEqual(attempts, 2)
        self.assertEqual(self.hass.states[entity].attributes["temperature"], 21)

    async def test_stop_and_restart_clear_old_queue_without_losing_new_work(self):
        entity = self.entities[0]
        async with self.scheduler._zone_override_lock(entity):
            self.emit(entity, temperature=18.5)
            await self.sleep(0)
            self.emit(entity, temperature=19)
            tasks = list(self.monitor._tasks)
            self.monitor.async_stop()
            await asyncio.gather(*tasks, return_exceptions=True)
        self.assertFalse(self.monitor._pending_changes)
        self.assertFalse(self.monitor._processing_tokens)
        self.assertFalse(self.monitor._queued_changes)
        self.assertFalse(self.monitor._workers)
        self.assertEqual(self.calls, [])
        self.monitor.async_start()
        self.emit(entity, temperature=19.5)
        await self.drain()
        self.assertEqual(len(self.observations()), 1)
        self.assertEqual([data["temperature"] for name, data in self.calls
                          if name == "set_temperature"], [21])

    async def assert_cancelled_worker_releases_queue(self, *, started):
        entity = self.entities[0]
        async with self.scheduler._zone_override_lock(entity):
            self.emit(entity, temperature=18.5)
            if started:
                await self.sleep(0)
            self.emit(entity, temperature=19)
            tasks = list(self.monitor._tasks)
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            await self.sleep(0)
        self.assertFalse(self.monitor._queued_changes)
        self.assertFalse(self.monitor._pending_changes)
        self.assertFalse(self.monitor._processing_tokens)
        self.assertFalse(self.monitor._workers)
        self.emit(entity, temperature=19.5)
        await self.drain()
        self.assertEqual(len(self.observations()), 1)
        self.assertEqual([data["temperature"] for name, data in self.calls
                          if name == "set_temperature"], [21])

    async def test_cancelled_running_worker_releases_pending_queue(self):
        await self.assert_cancelled_worker_releases_queue(started=True)

    async def test_cancelled_worker_before_first_step_releases_pending_queue(self):
        await self.assert_cancelled_worker_releases_queue(started=False)

    async def test_service_cancellation_retires_queue_and_accepts_new_reports(self):
        entity = self.entities[0]
        async def cancel_with_pending_report(name, data):
            self.emit(entity, temperature=19)
            raise asyncio.CancelledError()
        self.service_hook = cancel_with_pending_report
        self.emit(entity, temperature=18.5)
        task = next(iter(self.monitor._tasks))
        await asyncio.gather(task, return_exceptions=True)
        await self.sleep(0)
        self.assertFalse(self.monitor._queued_changes)
        self.assertFalse(self.monitor._pending_changes)
        self.service_hook = None
        self.emit(entity, temperature=19.5)
        await self.drain()
        self.assertEqual([data["temperature"] for name, data in self.calls
                          if name == "set_temperature"], [21])
        self.assertEqual([item["current"]["temperature"] for item in self.observations()], [18.5, 19.5])

    async def test_eager_completed_worker_does_not_block_later_reports(self):
        loop = asyncio.get_running_loop()
        original = loop.get_task_factory()
        loop.set_task_factory(asyncio.eager_task_factory)
        try:
            entity = self.entities[0]
            self.emit(entity, temperature=18.5)
            self.emit(entity, temperature=19)
            await self.drain()
        finally:
            loop.set_task_factory(original)
        self.assertEqual([data["temperature"] for name, data in self.calls
                          if name == "set_temperature"], [21, 21])
        self.assertEqual(len(self.observations()), 2)
        self.assertFalse(self.monitor._workers)
        self.assertFalse(self.monitor._queued_changes)

    async def test_eager_reentrant_report_joins_worker_before_task_registration(self):
        entity = self.entities[0]
        entered, release = asyncio.Event(), asyncio.Event()
        first = True
        async def reenter(name, data):
            nonlocal first
            if first:
                first = False
                self.emit(entity, temperature=19)
                entered.set()
                await release.wait()
        self.service_hook = reenter
        loop = asyncio.get_running_loop()
        original = loop.get_task_factory()
        loop.set_task_factory(asyncio.eager_task_factory)
        try:
            self.emit(entity, temperature=18.5)
            self.assertTrue(entered.is_set())
            self.assertEqual(len(self.monitor._tasks), 1)
        finally:
            release.set()
            await self.drain()
            loop.set_task_factory(original)
        self.assertEqual([item["current"]["temperature"] for item in self.observations()], [18.5, 19])
        self.assertFalse(self.monitor._workers)
        self.assertFalse(self.monitor._queued_changes)

    async def make_group(self):
        self.monitor.async_stop()
        await self.scheduler.async_stop()
        group = "group.queued_room"
        self.data, _ = build_group_candidate(self.data, self.entities, {
            "id": group, "name": "Queued room", "members": self.entities,
            "temperature_entity_id": self.entities[0], "delivery_mode": "all",
        }, self.entities[0])
        self.scheduler = VelairScheduler(self.hass, self.data, self.manager, self.save)
        self.monitor = ClimateChangeMonitor(self.hass, self.entities, self.manager, self.scheduler)
        self.monitor.async_start()
        return group

    async def test_group_members_share_one_correction_worker(self):
        group = await self.make_group()
        async with self.scheduler._zone_override_lock(group):
            for index in range(10):
                self.emit(self.entities[index % 2], temperature=18.5 + (index // 2) % 2)
                await self.sleep(0)
            self.assertEqual(len(self.monitor._tasks), 1)
            self.assertEqual(sum(map(len, self.monitor._pending_changes.values())), 10)
        await self.drain()
        self.assertEqual([data["entity_id"] for name, data in self.calls
                          if name == "set_temperature"], self.entities)
        self.assertEqual(len(self.observations()), 10)
        self.assertTrue(all(item["entity_id"] == group for item in self.observations()))

    async def test_group_manual_queue_preserves_each_member_final_snapshot(self):
        group = await self.make_group()
        await self.scheduler.async_update_external_change_policy(group, {"action": "until_resumed"})
        async with self.scheduler._zone_override_lock(group):
            for entity, target in ((self.entities[0], 18.5), (self.entities[1], 19),
                                   (self.entities[0], 19.5), (self.entities[1], 20)):
                self.emit(entity, temperature=target)
                await self.sleep(0)
            self.assertEqual(len(self.monitor._tasks), 1)
        await self.drain()
        self.assertEqual([item["current"]["temperature"] for item in self.observations()], [18.5, 19, 19.5, 20])
        self.assertTrue(all(item["entity_id"] == group for item in self.observations()))
        self.assertEqual([self.hass.states[entity].attributes["temperature"] for entity in self.entities], [19.5, 20])
        self.assertEqual(self.data["zones"][group]["pauses"][0]["manual_policy"], "until_resumed")
        self.assertFalse(self.monitor._pending_changes)


if __name__ == "__main__":
    unittest.main()
