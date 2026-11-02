"""Diagnostics group synchronous reads without retaining obsolete generations."""
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeHass, FakeClimateManager, VelairScheduler, normalize_schedule_data

sys.modules["homeassistant.core"].Event = object
from custom_components.velair import runtime_diagnostics as diagnostics


class DiagnosticsObservationGroupingTest(unittest.TestCase):
    def setUp(self):
        self.entity = "climate.grouped_observation"
        self.hass = FakeHass()
        self.hass.states[self.entity] = SimpleNamespace(
            state="heat", attributes={"current_temperature": 18, "current_humidity": 45})
        data = normalize_schedule_data({"zones": {self.entity: {
            "comfort": {"enabled": True}}}}, [self.entity])
        self.scheduler = VelairScheduler(self.hass, data, FakeClimateManager(), AsyncMock())
        self.manager = diagnostics.RuntimeDiagnosticsManager(self.hass, [self.entity])
        self.runtime = {"scheduler": self.scheduler}
        self.manager._runtime = self.runtime

    def test_issue_evaluation_and_dispatch_share_one_observation_then_release_it(self):
        results = []
        def read(*_args):
            self.assertIsNotNone(self.scheduler._observation_values)
            results.append(self.scheduler.get_comfort_assessment(self.entity))
        with patch.object(self.manager, "_publish_issue_changes", side_effect=read), \
             patch.object(diagnostics, "async_dispatcher_send", side_effect=read), \
             patch.object(self.scheduler, "_build_comfort_assessment",
                          wraps=self.scheduler._build_comfort_assessment) as assess:
            self.manager._notify()
            self.assertEqual(assess.call_count, 1)
        self.assertEqual(results[0], results[1])
        self.assertIsNone(self.scheduler._observation_values)
        self.hass.states[self.entity].attributes["current_temperature"] = 23
        self.assertEqual(self.scheduler.get_comfort_assessment(self.entity)["temperature"]["value"], 23)

    def test_issue_event_listener_gets_fresh_reads_and_rebases_outer_scope(self):
        def listener(*_args):
            self.assertIsNone(self.scheduler._observation_values)
            for temperature in (23, 21):
                self.hass.states[self.entity].attributes["current_temperature"] = temperature
                value = self.scheduler.get_comfort_assessment(self.entity)
                self.assertEqual(value["temperature"]["value"], temperature)
        with self.scheduler.observation_snapshot():
            self.scheduler.get_comfort_assessment(self.entity)
            with patch.object(self.hass.bus, "async_fire", side_effect=listener):
                self.manager._fire_issue_change("detected", {"severity": "warning", "code": "test"})
            self.assertEqual(self.scheduler.get_comfort_assessment(self.entity)["temperature"]["value"], 21)
        self.assertIsNone(self.scheduler._observation_values)

    def test_invalidated_snapshot_is_not_stamped_with_new_revision(self):
        calls = []
        def build(_runtime):
            revision = self.manager._revision
            calls.append(revision)
            if len(calls) == 1:
                self.manager._revision += 1
                self.manager._cached_snapshot = None
            return {"revision": revision}
        with patch.object(self.manager, "snapshot", side_effect=build):
            result = self.manager.cached_snapshot(self.runtime)
        self.assertEqual(len(calls), 2)
        self.assertEqual(result["revision"], self.manager._revision)
        self.assertEqual(self.manager._cached_revision, self.manager._revision)

    def test_exception_cannot_leave_an_observation_active(self):
        with patch.object(self.manager, "_publish_issue_changes", side_effect=RuntimeError("listener failed")):
            with self.assertRaisesRegex(RuntimeError, "listener failed"):
                self.manager._notify()
        self.assertIsNone(self.scheduler._observation_values)
        self.assertIsNone(self.scheduler._observation_at)
