"""Prepared Return readers and dependency-driven thermal production."""
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeHass, FakeClimateManager, VelairScheduler, NOW, normalize_schedule_data, empty_week_schedule


class PreparedReturnProjectionTest(unittest.TestCase):
    def setUp(self):
        self.hass = FakeHass()
        self.climate = FakeClimateManager()
        self.entity = "climate.salon"
        week = empty_week_schedule()
        week["tuesday"] = [{"start": "00:00", "temperature": 18, "hvac_mode": "heat"},
                           {"start": "19:00", "temperature": 21, "hvac_mode": "heat"}]
        self.hass.states[self.entity] = SimpleNamespace(state="heat", attributes={
            "current_temperature": 16, "hvac_modes": ["off", "heat", "cool"]})
        self.climate.snapshots[self.entity] = {"state": "heat", "hvac_mode": "heat", "temperature": 18}
        self.data = normalize_schedule_data({"zones": {self.entity: {"enabled": True,
            "schedule": week, "preconditioning": {"enabled": True, "max_lead_minutes": 180,
            "fallback_minutes_per_degree": 40}}}}, [self.entity])
        self.scheduler = VelairScheduler(self.hass, self.data, self.climate, AsyncMock())
        self.runtime = self.scheduler._planned_return
        self.data["planned_return_episode"] = {"state": "away", "origin": "manual",
            "started_at": NOW.isoformat(), "return_at": (NOW + timedelta(minutes=90)).isoformat(),
            "away_mode_id": "default", "destination_mode_id": "default", "preparing_entities": []}
        self.runtime.prepare(NOW)

    def test_readers_do_not_resolve_destination_or_global_plans(self):
        expected = self.runtime.status()
        self.assertEqual(self.runtime.target(self.entity, NOW).temperature, 21)
        with patch.object(self.runtime, "prepare", side_effect=AssertionError("reader produced a plan")), \
             patch.object(self.runtime, "profiles", side_effect=AssertionError("reader validated profiles")), \
             patch.object(self.scheduler, "_effective_schedule_from_profiles", side_effect=AssertionError("reader resolved a week")), \
             patch.object(self.scheduler, "_current_schedule_event_for_schedule", side_effect=AssertionError("reader generated a calendar")):
            for _ in range(3):
                self.assertEqual(self.runtime.target(self.entity, NOW).temperature, 21)
                self.assertEqual(self.runtime.plans(NOW)[0].temperature, 21)
                self.assertEqual(self.runtime.status(), expected)

    def test_changed_temperature_reuses_nominal_destination(self):
        self.hass.states[self.entity].attributes["current_temperature"] = 20
        with patch.object(self.runtime, "profiles", side_effect=AssertionError("temperature validated profiles")), \
             patch.object(self.scheduler, "_effective_schedule_from_profiles", side_effect=AssertionError("temperature resolved a week")), \
             patch.object(self.scheduler, "_current_schedule_event_for_schedule", side_effect=AssertionError("temperature generated a calendar")):
            self.runtime.prepare(NOW)
        self.assertIsNone(self.runtime.target(self.entity, NOW))
        self.assertEqual(self.runtime.plans(NOW)[0].temperature, 21)
        self.assertGreater(self.runtime.plans(NOW)[0].when, NOW)

    def test_unchanged_inputs_share_prediction_and_detached_publication(self):
        with patch.object(self.scheduler, "_preconditioned_event_details", wraps=self.scheduler._preconditioned_event_details) as predict:
            self.runtime.prepare(NOW)
            calls = predict.call_count
            self.runtime.prepare(NOW)
            self.assertEqual(predict.call_count, calls)
        status = self.runtime.status()
        status["zones"].clear()
        self.assertTrue(self.runtime.status()["zones"])
        plans = self.runtime.plans(NOW)
        plans.clear()
        self.assertEqual(self.runtime.plans(NOW)[0].temperature, 21)

    def test_arrival_expires_control_without_replaying_a_prepared_target(self):
        later = NOW + timedelta(minutes=91)
        self.assertIsNone(self.runtime.target(self.entity, later))
        self.assertEqual(self.runtime.plans(later), [])
        self.runtime.prepare(later)
        self.assertEqual(self.runtime.status()["zones"], [])

    def test_override_expiry_reconciles_without_its_listener(self):
        override = {"type": "boost", "temperature": 24,
                    "until": (NOW + timedelta(minutes=5)).isoformat()}
        self.data["zones"][self.entity]["override"] = override
        self.runtime.prepare(NOW)
        self.assertEqual(self.runtime.status()["preparation"]["zones"][0]["reason"], "boost")
        later = NOW + timedelta(minutes=6)
        with patch.object(self.scheduler, "_effective_schedule_from_profiles", side_effect=AssertionError("expiry resolved week")), \
             patch.object(self.scheduler, "_current_schedule_event_for_schedule", side_effect=AssertionError("expiry calendar")):
            self.runtime.prepare(later)
        row = self.runtime.status()["preparation"]["zones"][0]
        self.assertEqual(row["state"], "preparing")
        self.assertNotEqual(row["reason"], "boost")
        self.assertIsNotNone(self.runtime.target(self.entity, later))
        self.assertIs(self.data["zones"][self.entity]["override"], override)
