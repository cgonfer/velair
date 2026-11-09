"""Planned Return hands deferred preparation to event-driven recovery once."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from dataclasses import replace
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .helpers import NOW, scheduler_module
from . import test_planned_return_runtime as return_tests
from custom_components.velair import climate_delivery as delivery_module
from custom_components.velair import planned_return as return_module
from homeassistant.exceptions import HomeAssistantError


class PlannedReturnDeliveryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.clock = [NOW]
        self.sleep = asyncio.sleep
        self.timers = []
        self.listeners = []
        self.enterContext(patch.object(scheduler_module.dt_util, "now", lambda: self.clock[0]))
        self.enterContext(patch.object(return_module, "async_track_point_in_time", self.track_timer))
        self.enterContext(patch.object(delivery_module, "async_track_state_change_event", self.track_listener))
        fixture = return_tests.PlannedReturnRuntimeTest()
        await fixture.asyncSetUp()
        self.addAsyncCleanup(fixture.asyncTearDown)
        self.scheduler = fixture.scheduler
        self.runtime = fixture.runtime
        self.data = fixture.data
        self.hass = fixture.hass
        self.climate = fixture.climate
        self.save = fixture.save
        self.entity = "climate.salon"
        self.coordinator = self.scheduler._climate_delivery
        config = deepcopy(self.runtime.config)
        config.update(enabled=False, occupancy_entity_ids=[])
        await self.scheduler.async_update_planned_return(config)
        self.arrival = NOW + timedelta(minutes=45)
        await self.scheduler.async_start_planned_return(self.arrival.isoformat())
        self.data["zones"][self.entity]["preconditioning"]["enabled"] = True
        self.enterContext(patch.object(self.scheduler, "_preconditioned_event_details", lambda *args: (NOW, None)))
        self.scheduler._prepare_runtime_projection(configuration=True)
        self.climate.calls.clear()
        self.save.reset_mock()

    def track_timer(self, _hass, callback, when):
        timer = {"callback": callback, "when": when, "active": True}
        self.timers.append(timer)
        def cancel():
            timer["active"] = False
        return cancel

    def track_listener(self, _hass, entities, callback):
        listener = {"entities": entities, "callback": callback, "active": True}
        self.listeners.append(listener)
        def cancel():
            listener["active"] = False
        return cancel

    def next_timer(self):
        active = [timer for timer in self.timers if timer["active"]]
        self.assertEqual(len(active), 1)
        return active[0]["when"]

    async def settle(self):
        for _ in range(10):
            await self.sleep(0)

    async def tick(self):
        await self.runtime._tick(self.clock[0], self.runtime._generation)
        await self.settle()

    def report(self, state):
        previous = self.hass.states[self.entity]
        current = SimpleNamespace(state=state, attributes=deepcopy(previous.attributes))
        self.hass.states[self.entity] = current
        event = SimpleNamespace(data={"entity_id": self.entity, "old_state": previous, "new_state": current})
        for listener in list(self.listeners):
            if listener["active"] and self.entity in listener["entities"]:
                listener["callback"](event)

    async def test_unavailable_waits_for_reconnect_without_immediate_timer(self):
        self.report("unavailable")
        await self.tick()
        generation = self.coordinator._generations[self.entity]
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.runtime._applied, {})
        self.assertEqual(self.next_timer(), self.arrival)
        saves = self.save.await_count
        for _ in range(4):
            self.clock[0] += timedelta(seconds=1)
            self.runtime.refresh()
            await self.tick()
        self.assertEqual(self.coordinator._generations[self.entity], generation)
        self.assertEqual(self.save.await_count, saves)
        self.assertEqual(self.next_timer(), self.arrival)
        self.report("heat")
        await self.settle()
        self.assertEqual(self.climate.calls, [("set_temperature", self.entity, 18.0, True, "heat")])
        self.assertIn(self.entity, self.runtime._applied)
        saves = self.save.await_count
        await self.tick()
        self.assertEqual(len(self.climate.calls), 1)
        self.assertEqual(self.save.await_count, saves)

    async def test_recoverable_failure_preserves_two_backoff_attempts(self):
        waits = []
        calls = []
        original = self.climate.async_set_temperature
        async def recovering(*args, **kwargs):
            calls.append(args)
            if len(calls) < 3:
                raise HomeAssistantError("temporary failure")
            await original(*args, **kwargs)
        async def wait(delay):
            gate = asyncio.Event()
            waits.append((delay, gate))
            await gate.wait()
        with patch.object(self.climate, "async_set_temperature", recovering), patch.object(delivery_module.asyncio, "sleep", wait):
            await self.tick()
            generation = self.coordinator._generations[self.entity]
            self.assertEqual([delay for delay, _gate in waits], [2.0])
            for _ in range(3):
                self.hass.states[self.entity].attributes["current_temperature"] += 0.1
                self.clock[0] += timedelta(seconds=0.1)
                self.runtime.refresh()
                await self.tick()
            self.assertEqual(len(calls), 1)
            self.assertEqual(self.coordinator._generations[self.entity], generation)
            waits[0][1].set()
            await self.settle()
            self.assertEqual([delay for delay, _gate in waits], [2.0, 10.0])
            self.runtime.refresh()
            await self.tick()
            self.assertEqual(len(calls), 2)
            waits[1][1].set()
            await self.settle()
        self.assertEqual(len(calls), 3)
        self.assertIn(self.entity, self.runtime._applied)
        self.assertEqual(self.next_timer(), self.arrival)

    async def test_failed_reconnect_keeps_same_handoff_during_recovery(self):
        waits = []
        async def wait(delay):
            gate = asyncio.Event()
            waits.append((delay, gate))
            await gate.wait()
        async def fail(*args, **kwargs):
            raise HomeAssistantError("reconnect not ready")
        self.report("unavailable")
        await self.tick()
        with patch.object(self.climate, "async_set_temperature", fail), patch.object(delivery_module.asyncio, "sleep", wait):
            self.report("heat")
            await self.settle()
            generation = self.coordinator._generations[self.entity]
            for _ in range(3):
                self.runtime.refresh()
                await self.tick()
            self.assertEqual(self.coordinator._generations[self.entity], generation)
            self.assertEqual([delay for delay, _gate in waits], [2.0])
            self.assertEqual(self.next_timer(), self.arrival)

    async def test_missing_entity_and_unknown_wait_without_services(self):
        for state in (None, "unknown"):
            with self.subTest(state=state):
                self.coordinator.cancel(self.entity)
                previous = self.hass.states[self.entity]
                if state is None:
                    self.hass.states.pop(self.entity)
                else:
                    previous.state = state
                await self.tick()
                self.assertEqual(self.climate.calls, [])
                self.assertEqual(self.next_timer(), self.arrival)
                self.hass.states[self.entity] = previous

    async def test_external_cancel_wakes_due_preparation_then_hands_off_once(self):
        self.report("unavailable")
        await self.tick()
        self.coordinator.cancel(self.entity)
        await self.settle()
        self.assertEqual(self.next_timer(), self.clock[0])
        await self.tick()
        generation = self.coordinator._generations[self.entity]
        await self.tick()
        self.assertEqual(self.coordinator._generations[self.entity], generation)
        self.assertEqual(self.next_timer(), self.arrival)

    async def test_noop_waits_until_delivery_gate_changes(self):
        with patch.object(self.scheduler, "_pending_external_change_blocks_delivery", return_value=True):
            await self.tick()
            generation = self.coordinator._generations[self.entity]
            await self.tick()
            self.assertEqual(self.coordinator._generations[self.entity], generation)
            self.assertEqual(self.climate.calls, [])
            self.assertEqual(self.next_timer(), self.arrival)
        self.runtime.refresh()
        self.assertEqual(self.next_timer(), self.clock[0])
        await self.tick()
        self.assertEqual(len(self.climate.calls), 1)

    async def test_capability_refresh_reapplies_without_manual_return_wakeup(self):
        self.hass.states[self.entity].attributes["min_temp"] = 6
        self.assertFalse(self.scheduler._schedule_projection.capabilities_current(self.entity))
        await self.runtime._tick(self.clock[0], self.runtime._generation)
        self.assertIsNotNone(self.scheduler._projection_capability_task)
        self.assertEqual(self.climate.calls, [])
        await self.settle()
        self.assertTrue(self.scheduler._schedule_projection.capabilities_current(self.entity))
        self.assertIn(self.entity, self.runtime._applied)
        self.assertEqual(len(self.climate.calls), 1)
        await self.tick()
        self.assertEqual(len(self.climate.calls), 1)

    async def test_pause_resume_replaces_handoff_and_recovers_return(self):
        self.report("unavailable")
        await self.tick()
        await self.scheduler.async_pause_zone(self.entity)
        await self.settle()
        self.report("heat")
        await self.settle()
        self.assertNotIn(self.entity, self.runtime._applied)
        await self.scheduler.async_resume_zone(self.entity)
        await self.settle()
        self.assertIn(self.entity, self.runtime._applied)
        calls = len(self.climate.calls)
        await self.tick()
        self.assertEqual(len(self.climate.calls), calls)

    async def test_boost_cancel_restores_return_once_without_timer_duplicate(self):
        self.report("unavailable")
        await self.tick()
        await self.scheduler.async_set_zone_boost(
            self.entity, temperature=24, until=(NOW + timedelta(minutes=10)).isoformat(), hvac_mode="heat")
        self.report("heat")
        await self.settle()
        self.assertEqual(self.climate.calls[-1][2], 24)
        self.assertNotIn(self.entity, self.runtime._applied)
        await self.scheduler.async_cancel_zone_boost(self.entity)
        await self.settle()
        self.assertEqual([call[2] for call in self.climate.calls if call[0] == "set_temperature"], [24, 18])
        self.assertIn(self.entity, self.runtime._applied)
        await self.tick()
        self.assertEqual(len(self.climate.calls), 2)

    async def test_boost_cancel_while_unavailable_leaves_return_with_recovery(self):
        self.report("unavailable")
        await self.tick()
        await self.scheduler.async_set_zone_boost(
            self.entity, temperature=24, until=(NOW + timedelta(minutes=10)).isoformat(), hvac_mode="heat")
        await self.scheduler.async_cancel_zone_boost(self.entity)
        await self.settle()
        generation = self.coordinator._generations[self.entity]
        self.assertEqual(self.next_timer(), self.arrival)
        await self.tick()
        self.assertEqual(self.coordinator._generations[self.entity], generation)
        self.report("heat")
        await self.settle()
        self.assertEqual(self.climate.calls, [("set_temperature", self.entity, 18.0, True, "heat")])
        self.assertIn(self.entity, self.runtime._applied)

    async def test_schedule_change_replaces_unavailable_preparation_target(self):
        self.report("unavailable")
        await self.tick()
        generation = self.coordinator._generations[self.entity]
        await self.scheduler.async_set_daily_schedule(self.entity, "tuesday", [
            {"start": "00:00", "action": "set_temperature", "temperature": 22, "hvac_mode": "heat"}])
        await self.tick()
        self.assertGreater(self.coordinator._generations[self.entity], generation)
        self.report("heat")
        await self.settle()
        self.assertEqual(self.climate.calls[-1], ("set_temperature", self.entity, 22.0, True, "heat"))
        calls = len(self.climate.calls)
        await self.tick()
        self.assertEqual(len(self.climate.calls), calls)

    async def test_replacement_during_await_does_not_claim_new_handoff(self):
        started, release = asyncio.Event(), asyncio.Event()
        original = self.climate.async_set_temperature
        async def slow(*args, **kwargs):
            started.set()
            await release.wait()
            await original(*args, **kwargs)
        with patch.object(self.climate, "async_set_temperature", slow):
            task = asyncio.create_task(self.runtime._tick(self.clock[0], self.runtime._generation))
            await asyncio.wait_for(started.wait(), timeout=2)
            self.coordinator.cancel(self.entity)
            release.set()
            await asyncio.wait_for(task, timeout=2)
        await self.settle()
        self.assertNotIn(self.entity, self.runtime._applied)
        self.assertEqual(self.next_timer(), self.clock[0])
        await self.tick()
        self.assertIn(self.entity, self.runtime._applied)

    async def test_explicit_schedule_reapply_owns_acceptance_without_duplicate(self):
        self.report("unavailable")
        await self.tick()
        self.report("heat")
        # Deliver explicitly before the queued reconnect worker runs.
        await self.scheduler.async_apply_current_schedule(self.entity, source="test_reconcile")
        await self.settle()
        calls = len(self.climate.calls)
        self.assertIn(self.entity, self.runtime._applied)
        await self.tick()
        self.assertEqual(len(self.climate.calls), calls)

    async def test_keep_automatic_reassertion_is_not_repeated_by_return_timer(self):
        self.data["zones"][self.entity]["external_change_policy"]["action"] = "keep_automatic"
        self.report("unavailable")
        await self.tick()
        self.hass.states[self.entity].state = "heat"
        await self.scheduler.async_handle_external_climate_change(
            self.entity, changed_fields=["temperature"],
            previous={"temperature": 18}, current={"temperature": 20})
        await self.settle()
        self.assertEqual(len(self.climate.calls), 1)
        self.assertIn(self.entity, self.runtime._applied)
        await self.tick()
        self.assertEqual(len(self.climate.calls), 1)

    async def test_ordinary_requested_event_accepts_actual_return_preparation(self):
        self.report("unavailable")
        await self.tick()
        self.hass.states[self.entity].state = "heat"
        ordinary = replace(self.runtime.plans(self.clock[0])[0], target_when=None)
        self.assertIsNone(ordinary.target_when)
        self.assertTrue(await self.scheduler._async_apply_event(ordinary, source="test_schedule"))
        await self.settle()
        self.assertIn(self.entity, self.runtime._applied)
        await self.tick()
        self.assertEqual(len(self.climate.calls), 1)

    async def test_arrival_retires_handoff_and_pending_preparation(self):
        self.report("unavailable")
        await self.tick()
        self.clock[0] = self.arrival
        await self.tick()
        self.assertEqual(self.runtime.episode["state"], "fulfilled")
        self.assertFalse(self.runtime._delivery_handoffs)
        self.assertFalse(any(timer["active"] for timer in self.timers))
        self.report("heat")
        await self.settle()
        self.assertNotIn(self.entity, self.runtime._applied)

    async def test_retime_and_cancel_retire_pending_return(self):
        self.report("unavailable")
        await self.tick()
        same = self.coordinator._generations[self.entity]
        await self.scheduler.async_adjust_planned_return(self.arrival.isoformat())
        self.assertEqual(self.coordinator._generations[self.entity], same)
        self.arrival += timedelta(hours=1)
        await self.scheduler.async_adjust_planned_return(self.arrival.isoformat())
        await self.tick()
        self.assertGreater(self.coordinator._generations[self.entity], same)
        self.assertEqual(self.next_timer(), self.arrival)
        await self.scheduler.async_cancel_planned_return()
        await self.settle()
        self.assertFalse(self.runtime._delivery_handoffs)
        self.report("heat")
        await self.settle()
        self.assertNotIn(self.entity, self.runtime._applied)

    async def test_independent_cooling_zone_progresses_while_heating_unavailable(self):
        other = "climate.office"
        self.data["zones"][other] = deepcopy(self.data["zones"][self.entity])
        self.data["zones"][other]["schedule"]["tuesday"] = [
            {"start": "00:00", "action": "set_temperature", "temperature": 23, "hvac_mode": "cool"}]
        self.hass.states[other] = SimpleNamespace(state="cool", attributes={"current_temperature": 27, "hvac_modes": ["off", "heat", "cool"]})
        self.climate.snapshots[other] = {"state": "cool", "temperature": 25, "hvac_mode": "cool"}
        self.scheduler._prepare_runtime_projection(configuration=True)
        self.report("unavailable")
        await self.tick()
        self.assertEqual(self.climate.calls, [("set_temperature", other, 23.0, True, "cool")])
        self.assertIn(other, self.runtime._applied)
        self.assertNotIn(self.entity, self.runtime._applied)
        self.assertEqual(self.next_timer(), self.arrival)

    async def test_recovered_master_releases_return_dependent_once(self):
        child = "climate.child"
        self.data["zones"][child] = deepcopy(self.data["zones"][self.entity])
        self.data["zones"][child]["preconditioning"]["master_entity_id"] = self.entity
        self.hass.states[child] = deepcopy(self.hass.states[self.entity])
        self.climate.snapshots[child] = deepcopy(self.climate.snapshots[self.entity])
        self.scheduler._prepare_runtime_projection(configuration=True)
        self.report("unavailable")
        await self.tick()
        self.assertEqual(self.climate.calls, [])
        self.assertNotIn(child, self.runtime._applied)
        self.assertEqual(self.next_timer(), self.arrival)
        self.report("heat")
        await self.settle()
        await self.settle()
        self.assertEqual([call[1] for call in self.climate.calls if call[0] == "set_temperature"], [self.entity, child])
        self.assertIn(self.entity, self.runtime._applied)
        self.assertIn(child, self.runtime._applied)
        await self.tick()
        self.assertEqual(len(self.climate.calls), 2)


if __name__ == "__main__":
    unittest.main()
