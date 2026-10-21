"""Exact dependency explanations must never change scheduler decisions."""
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .helpers import NOW, scheduler_module
from . import test_scheduler_application as application
from .test_preconditioning_dependencies import event


class PreconditioningDependencyReasonTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        fixture = application.VelairSchedulerPreconditioningTest()
        fixture.setUp()
        self.scheduler, self.data, self.hass = fixture.scheduler, fixture.data, fixture.hass
        self.master, self.child = fixture.entity_id, "climate.child"
        self.data["zones"][self.child] = deepcopy(self.data["zones"][self.master])
        self.data["zones"][self.child]["preconditioning"]["master_entity_id"] = self.master
        self.hass.states[self.child] = deepcopy(self.hass.states[self.master])
        self.clock = patch.object(scheduler_module.dt_util, "now", return_value=NOW)
        self.clock.start()
        self.addCleanup(self.clock.stop)
        self.addAsyncCleanup(self.scheduler.async_stop)

    def resolve(self, mode="heat"):
        return next(item for item in self.scheduler._resolve_preconditioning_dependencies(
            [event(self.child, 60, 50, mode), event(self.master, 60, 30, mode)], NOW
        ) if item.entity_id == self.child)

    @staticmethod
    def execution_projection(item):
        metadata = item.preconditioning_dependency
        return (item.when, item.target_when, metadata["reason"], metadata["result"],
                metadata["master_start_accepted"], metadata["effective_lead_minutes"])

    def test_exact_conditions_preserve_every_execution_field_for_both_directions(self):
        original_zone = deepcopy(self.data["zones"][self.master])
        original_state = deepcopy(self.hass.states[self.master])
        for mode in ("heat", "cool"):
            for scenario, expected in (
                ("normal", None), ("off", None),
                ("disabled", "master_scheduling_disabled"),
                ("preconditioning_disabled", "master_preconditioning_disabled"),
                ("missing", "master_entity_missing"),
                ("unavailable", "master_unavailable"),
                ("unknown", "master_state_unknown"),
                ("not_managed", "master_not_managed"),
                ("external", "master_ineligible"),
            ):
                with self.subTest(mode=mode, scenario=scenario):
                    self.data["zones"][self.master] = deepcopy(original_zone)
                    self.hass.states[self.master] = deepcopy(original_state)
                    self.scheduler._execution_authority = None
                    if scenario == "disabled": self.data["zones"][self.master]["enabled"] = False
                    elif scenario == "preconditioning_disabled": self.data["zones"][self.master]["preconditioning"]["enabled"] = False
                    elif scenario == "missing": self.hass.states.pop(self.master)
                    elif scenario in ("off", "unavailable", "unknown"): self.hass.states[self.master].state = scenario
                    elif scenario == "not_managed": self.data["zones"].pop(self.master)
                    elif scenario == "external": self.scheduler._execution_authority = SimpleNamespace(is_external=lambda entity: entity == self.master)
                    with patch.object(self.scheduler, "_preconditioning_master_reason_detail", return_value=None):
                        baseline = self.resolve(mode)
                    explained = self.resolve(mode)
                    self.assertEqual(self.execution_projection(explained), self.execution_projection(baseline))
                    self.assertEqual(explained.preconditioning_dependency.get("reason_detail"), expected)

    def test_return_uses_destination_profile_instead_of_active_away_profile(self):
        self.data["planned_return_episode"] = {
            "state": "away", "started_at": NOW.isoformat(),
            "return_at": (NOW + timedelta(hours=2)).isoformat(),
            "destination_mode_id": "default", "preparing_entities": [],
        }
        episode = self.scheduler._dependency_episode()
        paused = [{"key": "destination", "zones": {self.master: {"behavior": "pause", "action": "turn_off"}}}]
        with patch.object(self.scheduler, "_profile_zone_behavior", return_value={"behavior": "pause", "action": "turn_off"}):
            self.assertEqual(self.scheduler._preconditioning_master_reason_detail(self.master, NOW), "master_profile_paused")
            self.assertIsNone(self.scheduler._preconditioning_master_reason_detail(self.master, NOW, episode=episode))
        with patch.object(self.scheduler._planned_return, "profiles", return_value=paused):
            self.assertEqual(self.scheduler._preconditioning_master_reason_detail(self.master, NOW, episode=episode), "master_profile_paused")

    def test_override_reason_is_factual_without_changing_effective_window(self):
        with patch.object(self.scheduler, "_is_zone_override_active", return_value=True):
            self.assertEqual(self.resolve().preconditioning_dependency["reason_detail"], "master_override_active")

    def test_no_transition_is_not_reported_as_missing_or_unavailable_entity(self):
        result = self.scheduler._resolve_preconditioning_dependencies([event(self.child)], NOW)[0]
        self.assertEqual(result.preconditioning_dependency["reason"], "master_missing")
        self.assertEqual(result.preconditioning_dependency["reason_detail"], "master_no_transition")
        self.assertIsNone(result.target_when)

    def test_started_observation_keeps_its_original_dependency_explanation(self):
        original = self.resolve()
        self.scheduler._mark_preconditioning_applied(original)
        self.data["zones"][self.master]["preconditioning"]["enabled"] = False
        explained = self.resolve()
        self.assertEqual(explained.preconditioning_dependency, original.preconditioning_dependency)
        self.assertEqual(self.execution_projection(explained), self.execution_projection(original))

    def test_unavailable_master_with_external_temperature_keeps_its_forecast(self):
        self.data["zones"][self.master]["schedule"]["tuesday"] = [{"start": "19:10", "temperature": 21, "hvac_mode": "heat"}]
        self.data["zones"][self.child]["schedule"]["tuesday"] = [{"start": "19:00", "temperature": 23, "hvac_mode": "heat"}]
        self.data["zones"][self.master]["preconditioning"].update(room_sensor_assist_enabled=True, room_temperature_entity_id="sensor.master")
        self.hass.states[self.master] = SimpleNamespace(state="unavailable", attributes={})
        self.hass.states["sensor.master"] = SimpleNamespace(state="20", attributes={"unit_of_measurement": "°C"})
        with patch.object(self.scheduler, "_preconditioning_master_reason_detail", return_value=None):
            baseline = next(item for item in self.scheduler.calculate_next_events_by_zone(NOW) if item.entity_id == self.child)
        self.hass.bus.events.clear()
        for _ in range(3):
            explained = next(item for item in self.scheduler.calculate_next_events_by_zone(NOW) if item.entity_id == self.child)
            self.assertEqual(self.execution_projection(explained), self.execution_projection(baseline))
            self.assertEqual(explained.preconditioning_dependency["reason_detail"], "master_unavailable")
            self.assertEqual(explained.preconditioning_dependency["result"], "constrained")
        self.assertEqual(self.hass.bus.events, [])
