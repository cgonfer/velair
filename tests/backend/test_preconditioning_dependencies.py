"""Master-dependent timing is a constraint, never boiler feedback."""
from copy import deepcopy
from dataclasses import replace
from datetime import timedelta, datetime
from zoneinfo import ZoneInfo
import asyncio
import unittest
from unittest.mock import patch, AsyncMock

from .helpers import NOW
from . import test_scheduler_application as fixtures
from homeassistant.exceptions import HomeAssistantError
from custom_components.velair.models import ClimateEvent
from custom_components.velair.preconditioning_dependencies import resolve_dependencies, occurrence_id


def event(entity, target=60, lead=30, mode="heat"):
    return ClimateEvent(entity_id=entity, when=NOW + timedelta(minutes=target-lead),
        target_when=NOW + timedelta(minutes=target) if lead else None,
        weekday="tuesday", start=f"{target}", temperature=22, hvac_mode=mode)


class DependencyResolverTest(unittest.TestCase):
    def resolve(self, slave, sources, **kwargs):
        return resolve_dependencies([slave], {"climate.slave": "climate.master"}, source_events=sources, **kwargs)[0]

    def test_independent_identity_preserved(self):
        original = event("climate.slave")
        self.assertIs(resolve_dependencies([original], {})[0], original)

    def test_later_start_wins_for_heat_and_cool(self):
        for mode in ("heat", "cool"):
            for own, source in ((50, 20), (20, 50)):
                slave, master = event("climate.slave", lead=own, mode=mode), event("climate.master", lead=source, mode=mode)
                result = self.resolve(slave, [master])
                self.assertEqual(result.when, max(slave.when, master.when))
                self.assertEqual(result.target_when, slave.target_when)

    def test_nearest_ineligible_does_not_fall_back(self):
        slave = event("climate.slave")
        result = self.resolve(slave, [event("climate.master", 61, 0), event("climate.master", 90, 50)])
        self.assertIsNone(result.target_when)
        self.assertEqual(result.preconditioning_dependency["reason"], "master_no_preconditioning")

    def test_tie_chooses_earlier_and_deadline_is_not_shifted(self):
        slave = event("climate.slave", 60, 45)
        result = self.resolve(slave, [event("climate.master", 70, 0), event("climate.master", 50, 20)])
        self.assertEqual(result.when, NOW + timedelta(minutes=30))
        late = self.resolve(slave, [event("climate.master", 100, 20)])
        self.assertIsNone(late.target_when)

    def test_missing_and_direction_mismatch(self):
        slave, master = event("climate.slave"), event("climate.master", mode="cool")
        self.assertIsNone(self.resolve(slave, []).target_when)
        result = self.resolve(slave, [master], directions={occurrence_id(slave): "heat", occurrence_id(master): "cool"})
        self.assertEqual(result.preconditioning_dependency["reason"], "master_direction_mismatch")

    def test_accepted_anchor_survives_source_reaching_target(self):
        slave, master = event("climate.slave", 90, 60), event("climate.master", 60, 0)
        result = self.resolve(slave, [master], accepted={occurrence_id(master): NOW+timedelta(minutes=40)})
        self.assertEqual(result.when, NOW+timedelta(minutes=40))
        self.assertTrue(result.preconditioning_dependency["master_start_accepted"])

    def test_fold_lead_uses_elapsed_time(self):
        zone = ZoneInfo("Europe/Madrid")
        start = datetime(2026, 10, 25, 2, 30, tzinfo=zone, fold=0)
        target = datetime(2026, 10, 25, 2, 30, tzinfo=zone, fold=1)
        slave = replace(event("climate.slave"), when=start, target_when=target)
        master = replace(event("climate.master"), when=start, target_when=target)
        result = self.resolve(slave, [master])
        self.assertEqual(result.preconditioning_dependency["effective_lead_minutes"], 60)
        self.assertIsNotNone(result.target_when)


class DependencySchedulerTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        fixture = fixtures.VelairSchedulerPreconditioningTest()
        fixture.setUp()
        self.scheduler, self.data, self.hass = fixture.scheduler, fixture.data, fixture.hass
        self.master = fixture.entity_id
        self.slave = "climate.slave"
        self.data["zones"][self.slave] = deepcopy(self.data["zones"][self.master])
        self.data["zones"][self.slave]["preconditioning"]["master_entity_id"] = self.master
        self.hass.states[self.slave] = deepcopy(self.hass.states[self.master])
        self.addAsyncCleanup(self.scheduler.async_stop)

    def test_filtered_scan_includes_source_and_exposes_metadata(self):
        for entity, start in ((self.master, "18:00"), (self.slave, "18:10")):
            self.data["zones"][entity]["schedule"]["tuesday"] = [{"start": start, "temperature": 22, "hvac_mode": "heat"}]
        with patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW):
            plans = self.scheduler._iter_future_events(NOW, entity_id_filter=self.slave)
        self.assertTrue(plans)
        self.assertTrue(all(item.entity_id == self.slave for item in plans))
        self.assertEqual(plans[0].preconditioning_dependency["master_entity_id"], self.master)

    def test_runtime_requires_accepted_source(self):
        slave, master = event(self.slave), event(self.master)
        with patch.object(self.scheduler, "_current_schedule_event", return_value=None):
            plan = self.scheduler._resolve_preconditioning_dependencies([slave, master], NOW)[1]
        self.assertFalse(self.scheduler._dependency_delivery_allowed(plan))

    def test_waiting_timer_defers_to_nominal(self):
        slave, master = event(self.slave, 60, 90), event(self.master, 60, 90)
        with patch.object(self.scheduler, "_current_schedule_event", return_value=None):
            plan = self.scheduler._resolve_preconditioning_dependencies([slave, master], NOW)[1]
        with patch.object(self.scheduler, "_iter_future_events", return_value=[plan]):
            self.assertEqual(self.scheduler._calculate_next_action_time(NOW), slave.target_when)

    def test_saved_anchor_direction_survives_range_target_reached(self):
        slave, master = event(self.slave, 90, 60), event(self.master, 60, 0, "heat_cool")
        key = occurrence_id(master)
        self.data["preconditioning_accepted_anchors"] = {key: {
            "entity_id": self.master, "accepted_start": NOW.isoformat(),
            "target_when": (NOW+timedelta(minutes=60)).isoformat(),
            "expires_at": (NOW+timedelta(minutes=90)).isoformat(),
            "context": self.scheduler._dependency_context(self.master), "episode": None, "direction": "heat"}}
        with patch.object(self.scheduler, "_current_schedule_event", return_value=None):
            result = self.scheduler._resolve_preconditioning_dependencies([slave, master], NOW)[1]
        self.assertTrue(self.scheduler._dependency_delivery_allowed(result))
        self.assertEqual(result.preconditioning_dependency["reason"], "planned")

    def test_anchor_invalidated_by_selection_or_unavailable_source(self):
        master = event(self.master)
        key = occurrence_id(master)
        self.data["preconditioning_accepted_anchors"] = {key: {"entity_id": self.master,
            "accepted_start": NOW.isoformat(), "expires_at": (NOW+timedelta(hours=1)).isoformat(),
            "context": self.scheduler._dependency_context(self.master), "episode": None}}
        self.assertIn(key, self.scheduler._accepted_dependency_anchors(NOW))
        self.data["profiles"] = [{"key": "changed", "zones": {self.master: {"behavior": "normal"}}}]
        self.data["global_"]["active_profile_ids"] = ["changed"]
        self.data["global_"]["base_profile_ids"] = ["changed"]
        self.assertNotIn(key, self.scheduler._accepted_dependency_anchors(NOW))

    async def test_graph_write_rejects_chain_without_mutation(self):
        previous = deepcopy(self.data)
        with self.assertRaises(ValueError):
            await self.scheduler.async_update_zone_preconditioning(self.master, {"master_entity_id": self.slave})
        self.assertEqual(self.data, previous)

    async def test_return_recovery_latches_master_and_prepares_child_once(self):
        for entity, target in ((self.master, 21), (self.slave, 23)):
            self.data["zones"][entity]["schedule"]["tuesday"] = [{"start": "00:00", "temperature": target, "hvac_mode": "heat"}]
        self.data["planned_return_episode"] = {"state": "away", "origin": "manual",
            "started_at": (NOW-timedelta(hours=1)).isoformat(), "return_at": (NOW+timedelta(minutes=20)).isoformat(),
            "away_mode_id": "default", "destination_mode_id": "default", "preparing_entities": []}
        runtime = self.scheduler._planned_return
        original = self.scheduler._climate_manager.async_set_temperature
        attempts = []
        now = NOW

        async def fail_once(*args, **kwargs):
            nonlocal now
            if args[0] == self.master:
                attempts.append(now)
                if len(attempts) == 1:
                    raise HomeAssistantError("temporarily unavailable")
                now = NOW+timedelta(minutes=4)
            return await original(*args, **kwargs)

        with patch("custom_components.velair.scheduler.dt_util.now", side_effect=lambda: now), patch.object(self.scheduler._climate_manager, "async_set_temperature", side_effect=fail_once), patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0,)):
            await runtime._tick(now, runtime._generation)
            self.assertNotIn(self.master, runtime._applied)
            for _ in range(15):
                await asyncio.sleep(0)
            self.assertEqual(len(attempts), 2)
            self.assertIn(self.master, runtime._applied)
            self.assertIn(self.slave, runtime._applied)
            self.assertCountEqual(runtime.episode["preparing_entities"], [self.master, self.slave])
            self.assertEqual(self.scheduler._preconditioning_sessions[self.slave].started_at, now)

    async def test_anchor_save_failure_still_wakes_waiting_dependents(self):
        for entity, start in ((self.master, "18:10"), (self.slave, "18:30")):
            self.data["zones"][entity]["schedule"]["tuesday"] = [{"start": start, "temperature": 23, "hvac_mode": "heat"}]
        with patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW), patch.object(self.scheduler, "_async_save_data", new=AsyncMock(side_effect=OSError("storage unavailable"))), patch.object(self.scheduler, "_async_release_preconditioning_dependents", new_callable=AsyncMock) as release:
            master = next(item for item in self.scheduler._iter_future_events(NOW) if item.entity_id == self.master)
            self.assertTrue(await self.scheduler._async_apply_event(master, applied_at=NOW))
            await asyncio.sleep(0)
            release.assert_awaited_once_with(self.master)
            self.assertTrue(self.scheduler._accepted_dependency_anchors(NOW))

    async def test_queued_return_persistence_does_not_restore_replaced_episode(self):
        self.data["planned_return_episode"] = {"state": "away", "origin": "manual",
            "started_at": NOW.isoformat(), "return_at": (NOW+timedelta(hours=1)).isoformat(),
            "destination_mode_id": "default", "away_mode_id": "default", "preparing_entities": []}
        runtime = self.scheduler._planned_return
        accepted = event(self.master)
        runtime._applied[self.master] = runtime._intent(accepted)
        previous_episode = self.scheduler._dependency_episode()
        async with runtime._lock:
            pending = asyncio.create_task(runtime._persist_accepted_preparation(accepted, previous_episode))
            await asyncio.sleep(0)
            self.data["planned_return_episode"]["return_at"] = (NOW+timedelta(hours=2)).isoformat()
        await pending
        self.assertEqual(runtime.episode["preparing_entities"], [])
        self.assertEqual(runtime.episode["return_at"], (NOW+timedelta(hours=2)).isoformat())

    async def test_weekly_release_is_not_skipped_during_away_return_episode(self):
        self.data["planned_return_episode"] = {"state": "away"}
        child = replace(event(self.slave, 30, 60), preconditioning_dependency={"master_entity_id": self.master, "master_start_accepted": True})
        with patch.object(self.scheduler._planned_return, "_tick", new_callable=AsyncMock) as return_tick, patch.object(self.scheduler, "_iter_future_events", return_value=[child]), patch.object(self.scheduler, "_async_apply_event", new_callable=AsyncMock) as apply, patch.object(self.scheduler, "async_schedule_next_event"), patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW):
            await self.scheduler._async_release_preconditioning_dependents(self.master)
            return_tick.assert_awaited_once()
            apply.assert_awaited_once_with(child, source="dependency_release", applied_at=NOW)

    def test_past_master_block_cannot_gain_new_predicted_anticipation(self):
        for entity, start in ((self.master, "17:50"), (self.slave, "18:30")):
            self.data["zones"][entity]["schedule"]["tuesday"] = [{"start": start, "temperature": 23, "hvac_mode": "heat"}]
        with patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW):
            child = next(item for item in self.scheduler._iter_future_events(NOW) if item.entity_id == self.slave)
        self.assertIsNone(child.target_when)
        self.assertEqual(child.preconditioning_dependency["reason"], "master_no_preconditioning")
