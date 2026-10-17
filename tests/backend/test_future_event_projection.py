"""Zone-scoped future queries preserve global scheduling and fresh intent."""

from copy import deepcopy
from datetime import datetime, timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from zoneinfo import ZoneInfo

from . import test_scheduler_application as application
from .helpers import NOW, scheduler_module
from custom_components.velair.execution import ExecutionAuthority
from custom_components.velair.models import WEEKDAYS


class FutureEventProjectionTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        fixture = application.VelairSchedulerPreconditioningTest()
        fixture.setUp()
        self.scheduler, self.data = fixture.scheduler, fixture.data
        self.hass, self.climate = fixture.hass, fixture.climate
        self.entities = [fixture.entity_id] + [f"climate.room_{index}" for index in range(1, 6)]
        base = deepcopy(self.data["zones"][fixture.entity_id])
        for entity in self.entities:
            zone = deepcopy(base)
            zone["schedule"]["tuesday"] = [{
                "start": "19:00", "action": "set_temperature", "temperature": 21, "hvac_mode": "heat",
            }]
            self.data["zones"][entity] = zone
            self.hass.states[entity] = SimpleNamespace(state="heat", attributes={"current_temperature": 18})

    async def asyncTearDown(self):
        await self.scheduler._climate_delivery.async_stop()

    def assert_filtered_matches_global(self, now):
        global_events = self.scheduler._iter_future_events(now)
        for entity in self.entities:
            with self.subTest(entity=entity):
                self.assertEqual(
                    self.scheduler._iter_future_events(now, entity_id_filter=entity),
                    [event for event in global_events if event.entity_id == entity],
                )
        self.assertEqual(self.scheduler._iter_future_events(now, entity_id_filter="climate.missing"), [])

    def test_scoped_queries_match_global_for_heat_cool_and_ranges(self):
        for mode, current, target in (("heat", 18, 21), ("cool", 26, 23), ("heat_cool", 18, None)):
            with self.subTest(mode=mode):
                for entity in self.entities:
                    self.hass.states[entity] = SimpleNamespace(state=mode, attributes={"current_temperature": current})
                    self.climate.hvac_modes[entity] = ["off", "heat", "cool", "heat_cool"]
                    self.climate.temperature_range_support[entity] = True
                    block = {"start": "19:00", "action": "set_temperature", "hvac_mode": mode}
                    block.update({"temperature": target} if target is not None else {"target_temp_low": 21, "target_temp_high": 24})
                    self.data["zones"][entity]["schedule"]["tuesday"] = [block]
                self.assert_filtered_matches_global(NOW)

    def test_effective_week_is_resolved_once_per_requested_zone_and_never_retained(self):
        for zone in self.data["zones"].values():
            zone["preconditioning"]["enabled"] = False
        selected = self.entities[0]
        original = self.scheduler._effective_schedule
        with patch.object(self.scheduler, "_effective_schedule", wraps=original) as resolve:
            self.scheduler._iter_future_events(NOW, entity_id_filter=selected)
            self.assertEqual([call.args[0] for call in resolve.call_args_list], [selected])
        self.data["zones"][selected]["schedule"]["tuesday"][0]["temperature"] = 22
        refreshed = self.scheduler._iter_future_events(NOW, entity_id_filter=selected)
        self.assertTrue(refreshed)
        self.assertTrue(all(event.temperature == 22 for event in refreshed))
        with patch.object(self.scheduler, "_effective_schedule", wraps=original) as resolve:
            events = self.scheduler._iter_future_events(NOW)
            self.assertEqual([call.args[0] for call in resolve.call_args_list], self.entities)
        self.assertEqual({event.entity_id for event in events}, set(self.entities))

    def test_due_preconditioning_query_predicts_only_its_destination(self):
        original = self.scheduler._preconditioned_event_details
        for now in (NOW - timedelta(hours=1), NOW, NOW + timedelta(hours=2)):
            for entity in self.entities:
                expected = next((event for event in self.scheduler.calculate_next_events_by_zone(now)
                                 if event.entity_id == entity and scheduler_module._is_due_preconditioning_event(event, now)), None)
                with patch.object(self.scheduler, "_preconditioned_event_details", wraps=original) as predict:
                    actual = self.scheduler._room_sensor_assist_due_preconditioning_event(entity, now)
                self.assertEqual(actual, expected)
                self.assertTrue(predict.called)
                self.assertEqual({call.args[0] for call in predict.call_args_list}, {entity})

    async def test_profiles_disabled_paused_boosted_and_external_zones(self):
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        self.data["zones"][self.entities[1]]["enabled"] = False
        self.data["zones"][self.entities[2]]["execution"] = {"type": "external", "provider": "test"}
        await self.scheduler.async_pause_zone(self.entities[3], pause_id="window")
        self.climate.snapshots[self.entities[4]] = {"hvac_mode": "heat", "temperature": 21}
        await self.scheduler.async_set_zone_boost(self.entities[4], 23, (NOW + timedelta(hours=2)).isoformat(), hvac_mode="heat")
        week = {day: [] for day in WEEKDAYS}
        week["wednesday"] = [{"start": "08:00", "action": "set_temperature", "temperature": 24, "hvac_mode": "cool"}]
        self.data["profiles"] = [{"key": "season", "name": "Season", "zones": {
            self.entities[5]: {"behavior": "schedule", "schedule": week},
        }}]
        self.data["global_"]["active_profile_ids"] = ["season"]
        self.data["global_"]["base_profile_ids"] = ["season"]
        self.assert_filtered_matches_global(NOW)
        self.assertEqual({event.entity_id for event in self.scheduler._iter_future_events(NOW)}, {self.entities[0], self.entities[5]})

    def test_scoped_query_preserves_global_marker_cleanup_and_read_only_option(self):
        other = self.entities[-1]
        expired_key = (other, "tuesday", "17:00", NOW - timedelta(hours=1))
        future_key = (other, "tuesday", "19:00", NOW + timedelta(hours=1))
        self.scheduler._attempted_preconditioning_events.update({expired_key, future_key})
        expired = SimpleNamespace(target_when=NOW - timedelta(hours=1))
        self.scheduler._applied_preconditioning_targets["expired-other-zone"] = expired
        self.scheduler._iter_future_events(NOW, entity_id_filter=self.entities[0], clear_applied=False)
        self.assertIn(expired_key, self.scheduler._attempted_preconditioning_events)
        self.assertIs(self.scheduler._applied_preconditioning_targets["expired-other-zone"], expired)
        self.scheduler._iter_future_events(NOW, entity_id_filter=self.entities[0])
        self.assertNotIn(expired_key, self.scheduler._attempted_preconditioning_events)
        self.assertIn(future_key, self.scheduler._attempted_preconditioning_events)
        self.assertNotIn("expired-other-zone", self.scheduler._applied_preconditioning_targets)

    def test_date_and_entity_order_dst_and_weekly_continuity(self):
        madrid = ZoneInfo("Europe/Madrid")
        for zone in self.data["zones"].values():
            zone["preconditioning"]["enabled"] = False
            zone["schedule"]["sunday"] = [
                {"start": "02:15", "action": "turn_off"},
                {"start": "02:45", "action": "set_temperature", "temperature": 21, "hvac_mode": "heat"},
            ]
        for now in (NOW, datetime(2026, 3, 29, 1, tzinfo=madrid), datetime(2026, 10, 25, 2, 30, tzinfo=madrid, fold=1)):
            self.assert_filtered_matches_global(now)
        events = self.scheduler._iter_future_events(NOW)
        self.assertEqual([event.entity_id for event in events[:6]], self.entities)
