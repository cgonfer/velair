"""Accepted delivery and restart continuity for master-dependent preparation."""
import asyncio
from copy import deepcopy
from datetime import timedelta
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import NOW, VelairScheduler, scheduler_module
from homeassistant.exceptions import HomeAssistantError
from . import test_scheduler_application as application
from custom_components.velair.models import normalize_schedule_data, serialize_schedule_data
from custom_components.velair.preconditioning_dependencies import occurrence_id


class PreconditioningDependencyRuntimeTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        fixture = application.VelairSchedulerPreconditioningTest()
        fixture.setUp()
        self.scheduler, self.data = fixture.scheduler, fixture.data
        self.hass, self.climate = fixture.hass, fixture.climate
        self.master, self.child = fixture.entity_id, "climate.child"
        self.data["zones"][self.child] = deepcopy(self.data["zones"][self.master])
        self.data["zones"][self.child]["preconditioning"]["master_entity_id"] = self.master
        self.hass.states[self.child] = deepcopy(self.hass.states[self.master])
        for entity, start, target in ((self.master, "18:10", 21), (self.child, "18:30", 23)):
            self.data["zones"][entity]["schedule"]["tuesday"] = [
                {"start": "00:00", "temperature": 18, "hvac_mode": "heat"},
                {"start": start, "temperature": target, "hvac_mode": "heat"},
            ]
        normalized = normalize_schedule_data(self.data, [self.master, self.child])
        self.data.clear()
        self.data.update(normalized)
        self.now = NOW
        self.clock = patch.object(scheduler_module.dt_util, "now", side_effect=lambda: self.now)
        self.clock.start()
        self.addCleanup(self.clock.stop)
        self.addAsyncCleanup(self.scheduler.async_stop)
        self.release = patch.object(self.scheduler, "_async_release_preconditioning_dependents", new_callable=AsyncMock)
        self.release_mock = self.release.start()
        self.addCleanup(self.release.stop)

    def plan(self, entity):
        return next(event for event in self.scheduler.calculate_next_events_by_zone(self.now)
                    if event.entity_id == entity)

    async def accept_master(self):
        master = self.plan(self.master)
        self.assertTrue(await self.scheduler._async_apply_event(master, applied_at=master.when))
        await asyncio.sleep(0)
        return master

    async def test_master_acceptance_replaces_planned_start_and_child_uses_remaining_window(self):
        child = self.plan(self.child)
        self.assertFalse(await self.scheduler._async_apply_event(child, applied_at=child.when))
        self.assertEqual(self.climate.calls, [])
        original = self.climate.async_set_temperature

        async def delayed_master(*args, **kwargs):
            if args[0] == self.master:
                self.now = NOW + timedelta(minutes=5)
            await original(*args, **kwargs)

        self.climate.async_set_temperature = delayed_master
        master = await self.accept_master()
        anchor = self.data["preconditioning_accepted_anchors"][occurrence_id(master)]
        self.assertEqual(anchor["accepted_start"], self.now.isoformat())
        child = self.plan(self.child)
        self.assertEqual(child.when, self.now)
        self.hass.states[self.child].attributes["current_temperature"] = 20.4
        self.assertTrue(await self.scheduler._async_apply_event(child, applied_at=NOW))
        observation = self.scheduler._preconditioning_sessions[self.child]
        self.assertEqual(observation.started_at, self.now)
        self.assertEqual(observation.start_temperature, 20.4)
        self.assertEqual(observation.startup_minutes, 25)

    async def test_restart_retains_valid_anchor_without_restoring_observation(self):
        master = await self.accept_master()
        raw = serialize_schedule_data(self.data)
        restored_data = normalize_schedule_data(raw, [self.master, self.child])
        restored = VelairScheduler(self.hass, restored_data, self.climate, AsyncMock())
        self.addAsyncCleanup(restored.async_stop)
        self.assertEqual(restored._preconditioning_sessions, {})
        self.assertIn(occurrence_id(master), restored._accepted_dependency_anchors(self.now))
        child = next(item for item in restored.calculate_next_events_by_zone(self.now)
                     if item.entity_id == self.child)
        self.assertTrue(restored._dependency_delivery_allowed(child))
        restored_data["zones"][self.master]["schedule"]["tuesday"][-1]["temperature"] = 24
        self.assertEqual(restored._accepted_dependency_anchors(self.now), {})

    async def test_automatic_recovery_does_not_release_child_until_master_accepts(self):
        self.release.stop()
        original = self.climate.async_set_temperature
        attempts = []

        async def transient_failure(*args, **kwargs):
            if args[0] == self.master:
                attempts.append(self.now)
                if len(attempts) == 1:
                    raise HomeAssistantError("temporary master failure")
                self.now = NOW + timedelta(minutes=4)
            await original(*args, **kwargs)

        self.climate.async_set_temperature = transient_failure
        master = self.plan(self.master)
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0,)):
            self.assertFalse(await self.scheduler._async_apply_event(master, applied_at=master.when))
            self.assertFalse(self.scheduler._dependency_delivery_allowed(self.plan(self.child)))
            self.assertNotIn(self.child, self.scheduler._preconditioning_sessions)
            for _ in range(8):
                await asyncio.sleep(0)
        self.assertEqual(len(attempts), 2)
        anchor = self.data["preconditioning_accepted_anchors"][occurrence_id(master)]
        self.assertEqual(anchor["accepted_start"], self.now.isoformat())
        self.assertTrue(self.scheduler._dependency_delivery_allowed(self.plan(self.child)))
        calls = [call[1] for call in self.climate.calls if call[0] == "set_temperature"]
        self.assertEqual(calls, [self.master, self.child])
        self.assertEqual(self.scheduler._preconditioning_sessions[self.child].started_at, self.now)

    async def test_started_child_is_not_truncated_when_source_completes(self):
        await self.accept_master()
        child = self.plan(self.child)
        self.assertTrue(await self.scheduler._async_apply_event(child, applied_at=self.now))
        observation = self.scheduler._preconditioning_sessions[self.child]
        self.now += timedelta(minutes=12)
        self.hass.states[self.master].attributes["current_temperature"] = 21
        updated = self.plan(self.child)
        self.assertEqual(updated.target_when, child.target_when)
        self.assertTrue(self.scheduler._dependency_delivery_allowed(updated))
        self.assertIs(self.scheduler._preconditioning_sessions[self.child], observation)

    async def test_anchor_save_failure_still_releases_child_without_repeating_master(self):
        self.release.stop()
        self.scheduler._async_save_data = AsyncMock(side_effect=OSError("storage unavailable"))
        master = self.plan(self.master)
        self.assertTrue(await self.scheduler._async_apply_event(master, applied_at=master.when))
        for _ in range(8):
            await asyncio.sleep(0)
        calls = [call[1] for call in self.climate.calls if call[0] == "set_temperature"]
        self.assertEqual(calls, [self.master, self.child])
        self.assertIn(occurrence_id(master), self.scheduler._accepted_dependency_anchors(self.now))
        self.assertIn(self.child, self.scheduler._preconditioning_sessions)

    async def test_concurrent_graph_writes_cannot_create_a_cycle(self):
        self.data["zones"][self.child]["preconditioning"]["master_entity_id"] = None
        results = await asyncio.gather(
            self.scheduler.async_update_zone_preconditioning(self.child, {"master_entity_id": self.master}),
            self.scheduler.async_update_zone_preconditioning(self.master, {"master_entity_id": self.child}),
            return_exceptions=True,
        )
        self.assertEqual(sum(isinstance(result, ValueError) for result in results), 1)
        links = [zone["preconditioning"].get("master_entity_id") for zone in self.data["zones"].values()]
        self.assertEqual(sum(link is not None for link in links), 1)

    async def test_unrelated_room_setting_does_not_erase_accepted_master(self):
        other = "climate.unrelated"
        self.data["zones"][other] = deepcopy(self.data["zones"][self.master])
        self.hass.states[other] = deepcopy(self.hass.states[self.master])
        master = await self.accept_master()
        await self.scheduler.async_update_zone_preconditioning(other, {"room_sensor_assist_deadband": 0.7})
        self.assertIn(occurrence_id(master), self.scheduler._accepted_dependency_anchors(self.now))
        self.assertTrue(self.scheduler._dependency_delivery_allowed(self.plan(self.child)))
