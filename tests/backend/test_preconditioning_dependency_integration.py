"""Master constraints across effective schedules, return episodes and Room Assist."""
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .helpers import NOW, empty_week_schedule, scheduler_module
from . import test_scheduler_application as application


class PreconditioningDependencyIntegrationTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        fixture = application.VelairSchedulerPreconditioningTest()
        fixture.setUp()
        self.scheduler, self.data, self.hass, self.climate = fixture.scheduler, fixture.data, fixture.hass, fixture.climate
        self.master, self.child = fixture.entity_id, "climate.child"
        self.data["zones"][self.child] = deepcopy(self.data["zones"][self.master])
        self.data["zones"][self.child]["preconditioning"]["master_entity_id"] = self.master
        self.hass.states[self.child] = deepcopy(self.hass.states[self.master])
        self.clock = patch.object(scheduler_module.dt_util, "now", return_value=NOW)
        self.clock.start()
        self.addCleanup(self.clock.stop)
        self.addAsyncCleanup(self.scheduler.async_stop)
        self.data["zones"][self.master]["schedule"] = self.schedule("19:10", 21)
        self.data["zones"][self.child]["schedule"] = self.schedule("19:00", 23)

    @staticmethod
    def schedule(start, target):
        schedule = empty_week_schedule()
        schedule["tuesday"] = [{"start": "00:00", "temperature": 18, "hvac_mode": "heat"},
                               {"start": start, "temperature": target, "hvac_mode": "heat"}]
        return schedule

    def child_event(self):
        return next(event for event in self.scheduler.calculate_next_events_by_zone(NOW) if event.entity_id == self.child)

    async def test_profile_and_explicit_default_exception_choose_effective_master_block(self):
        await self.scheduler.async_set_profile({"key": "work", "name": "Work", "color": "#336699", "zones": {
            self.master: {"behavior": "schedule", "schedule": self.schedule("18:50", 21)}}})
        await self.scheduler.async_activate_profiles(["work"])
        profile_event = self.child_event()
        self.assertEqual(profile_event.preconditioning_dependency["master_target_when"], "2026-05-19T18:50:00+00:00")
        await self.scheduler.async_set_zone_profile(self.master, None)
        default_event = self.child_event()
        self.assertEqual(default_event.preconditioning_dependency["master_target_when"], "2026-05-19T19:10:00+00:00")
        self.assertGreater(default_event.when, profile_event.when)
        self.assertEqual(profile_event.target_when, default_event.target_when)

    async def test_prediction_queries_do_not_write_history_or_apply_climates(self):
        self.hass.bus.events.clear()
        self.climate.calls.clear()
        for _ in range(3):
            self.scheduler.calculate_next_events_by_zone(NOW)
            self.scheduler.calculate_next_events(NOW)
            self.scheduler._iter_future_events(NOW, entity_id_filter=self.child)
        self.assertEqual(self.hass.bus.events, [])
        self.assertEqual(self.climate.calls, [])

    async def test_room_assist_cannot_use_due_child_before_master_acceptance(self):
        self.data["zones"][self.master]["schedule"] = self.schedule("18:10", 21)
        self.data["zones"][self.child]["schedule"] = self.schedule("18:30", 23)
        event = self.child_event()
        self.assertLessEqual(event.when, NOW)
        self.assertFalse(self.scheduler._dependency_delivery_allowed(event))
        self.assertIsNone(self.scheduler._room_sensor_assist_due_preconditioning_event(self.child, NOW))
        config = self.data["zones"][self.child]["preconditioning"]
        config.update(room_sensor_assist_enabled=True, room_temperature_entity_id="sensor.child_temperature")
        self.hass.states["sensor.child_temperature"] = SimpleNamespace(state="17", attributes={})
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.child)
        self.assertFalse(any(call[0] == "set_temperature" and call[1] == self.child and call[2] == 23
                             for call in self.climate.calls))
        self.assertNotIn(self.child, self.scheduler._preconditioning_sessions)

    async def test_return_without_master_anticipation_keeps_child_at_nominal_arrival(self):
        self.data["zones"][self.master]["preconditioning"]["enabled"] = False
        self.data["planned_return_episode"] = {
            "state": "away", "origin": "manual", "started_at": NOW.isoformat(),
            "return_at": (NOW + timedelta(hours=2)).isoformat(), "away_mode_id": "default",
            "destination_mode_id": "default", "preparing_entities": [],
        }
        runtime = self.scheduler._planned_return
        self.assertEqual(runtime.plans(NOW), [])
        self.assertIsNone(runtime.target(self.child, NOW))
        self.assertEqual(self.climate.calls, [])
        row = next(row for row in runtime.status()["preparation"]["zones"] if row["entity_id"] == self.child)
        self.assertEqual(row["preparation"], "arrival_only")
        self.assertEqual(row["reason"], "master_no_preconditioning")
        self.assertEqual(row["preconditioning_dependency"]["reason_detail"], "master_preconditioning_disabled")
        self.assertIsNone(row["start_at"])
        self.assertEqual(row["preconditioning_dependency"]["master_entity_id"], self.master)
        await runtime._tick(NOW, runtime._generation)
        self.assertFalse(any(call[0] == "set_temperature" and call[1] == self.child and call[2] == 23
                             for call in self.climate.calls))
        self.assertNotIn(self.child, self.scheduler._preconditioning_sessions)

    async def test_return_episode_does_not_reuse_weekly_master_anchor(self):
        weekly = next(event for event in self.scheduler._iter_future_events(NOW) if event.entity_id == self.master)
        from custom_components.velair.preconditioning_dependencies import occurrence_id
        self.data["preconditioning_accepted_anchors"] = {occurrence_id(weekly): {
            "entity_id": self.master, "accepted_start": NOW.isoformat(),
            "target_when": (NOW + timedelta(hours=1)).isoformat(),
            "expires_at": (NOW + timedelta(hours=3)).isoformat(), "episode": None,
            "context": self.scheduler._dependency_context(self.master, None),
        }}
        self.data["planned_return_episode"] = {
            "state": "away", "origin": "manual", "started_at": NOW.isoformat(),
            "return_at": (NOW + timedelta(hours=2)).isoformat(), "away_mode_id": "default",
            "destination_mode_id": "default", "preparing_entities": [],
        }
        episode = self.scheduler._dependency_episode()
        self.assertTrue(episode)
        self.assertEqual(self.scheduler._accepted_dependency_anchors(NOW, episode), {})
        self.assertTrue(self.scheduler._accepted_dependency_anchors(NOW, None))

    def test_dependency_reason_and_effective_window_survive_retained_history(self):
        from .test_runtime_diagnostics import RuntimeDiagnosticsTest
        fixture = RuntimeDiagnosticsTest()
        fixture.setUp()
        dependency = {"master_entity_id": "climate.master", "reason": "master_no_preconditioning",
                      "reason_detail": "master_preconditioning_disabled",
                      "result": "blocked", "independent_start": NOW.isoformat(),
                      "effective_start": None, "effective_lead_minutes": 0,
                      "private_unrecognized_field": {"secret": "excluded"}}
        fixture.manager._handle_event(SimpleNamespace(data={
            "domain": "velair", "event": "preconditioning_plan_updated",
            "entity_id": "climate.living_room", "preconditioning_dependency": dependency,
        }))
        retained = fixture.manager.snapshot(fixture.runtime)["history"][0]["data"]["preconditioning_dependency"]
        self.assertEqual(retained["master_entity_id"], "climate.master")
        self.assertEqual(retained["reason"], "master_no_preconditioning")
        self.assertEqual(retained["reason_detail"], "master_preconditioning_disabled")
        self.assertEqual(retained["independent_start"], NOW.isoformat())
        self.assertIsNone(retained["effective_start"])
        self.assertNotIn("private_unrecognized_field", retained)
