"""Learning explanations describe runtime decisions, without changing learning."""
from copy import deepcopy
from dataclasses import replace
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import test_scheduler_application as fixtures
from .helpers import NOW, VelairScheduler, normalize_schedule_data
from .test_runtime_diagnostics import diagnostics_module
from custom_components.velair.models import ClimateEvent
from custom_components.velair.api import _build_preconditioning_learning_response
from custom_components.velair import api as api_module


class LearningActivityTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        fixture = fixtures.VelairSchedulerPreconditioningTest()
        fixture.setUp()
        self.scheduler, self.hass, self.data = fixture.scheduler, fixture.hass, fixture.data
        self.entity = fixture.entity_id
        self.climate = fixture.climate

    def event(self, direction="heat", *, lead=True):
        self.hass.states[self.entity] = SimpleNamespace(
            state=direction, attributes={"current_temperature": 18 if direction == "heat" else 26})
        return ClimateEvent(entity_id=self.entity, when=NOW, weekday="tuesday", start="20:00",
                            temperature=21, hvac_mode=direction,
                            target_when=NOW + timedelta(minutes=60) if lead else None)

    def events(self, name=None):
        return [data for _, data in self.hass.bus.events
                if str(data.get("event", "")).startswith("preconditioning_observation_")
                and (name is None or data["event"] == name)]

    def start(self, direction="heat"):
        event = self.event(direction)
        self.scheduler._start_preconditioning_session(event, direction, NOW)
        self.scheduler._record_learning_transition(event, direction, NOW)
        return event

    def test_heat_and_cool_active_waiting_and_restart(self):
        for direction in ("heat", "cool"):
            with self.subTest(direction=direction):
                self.scheduler._clear_preconditioning_sessions(report=False)
                self.start(direction)
                activity = self.scheduler.preconditioning_learning_activity(self.entity, direction)
                self.assertEqual(activity, {"state": "observing", "at": NOW.isoformat()})
                restarted = VelairScheduler(self.hass, deepcopy(self.data), self.climate, AsyncMock())
                self.assertEqual(restarted.preconditioning_learning_activity(self.entity, direction), {"state": "waiting"})

    def test_prediction_does_not_emit_learning_decisions(self):
        self.event()
        for _ in range(3):
            self.scheduler.calculate_next_events(NOW)
        self.assertEqual(self.events(), [])

    def test_real_skip_is_deduplicated_and_records_evidence(self):
        event = self.event(lead=False)
        self.hass.states[self.entity].attributes["current_temperature"] = 20.9
        for _ in range(3):
            self.scheduler._record_learning_transition(event, "heat", NOW)
        self.assertEqual(len(self.events()), 1)
        decision = self.events()[0]
        self.assertEqual(decision["status"], "skipped")
        self.assertEqual(decision["reason"], "delta_too_small")
        self.assertAlmostEqual(decision["delta_t"], 0.1)
        self.assertEqual(decision["minimum_delta_temperature"], 0.3)

    def test_missing_temperature_does_not_create_direction_for_auto(self):
        event = self.event(lead=False)
        self.hass.states[self.entity] = SimpleNamespace(state="auto", attributes={})
        event = replace(event, hvac_mode="auto")
        self.scheduler._record_learning_transition(event, "auto", NOW)
        self.assertEqual(self.events(), [])
        self.assertEqual(self.scheduler.preconditioning_learning_activity(self.entity, "heat"),
                         {"state": "unavailable", "reason": "temperature_unavailable"})

    def test_unsupported_and_disabled_activity(self):
        self.climate.hvac_modes[self.entity] = ["heat", "off"]
        self.assertIsNone(self.scheduler.preconditioning_learning_activity(self.entity, "cool"))
        response = _build_preconditioning_learning_response(self.data, self.climate, self.scheduler)
        self.assertNotIn("activity", response[self.entity]["cool"])
        self.data["zones"][self.entity]["preconditioning"]["enabled"] = False
        self.assertEqual(self.scheduler.preconditioning_learning_activity(self.entity, "heat"), {"state": "disabled"})

    async def test_completion_has_one_result_and_no_interruption(self):
        self.start()
        session = self.scheduler._preconditioning_sessions[self.entity]
        await self.scheduler._async_finish_preconditioning_session(session, NOW + timedelta(minutes=20), 21, quality="complete")
        events = self.events()
        self.assertEqual([item["status"] for item in events], ["started", "complete"])
        self.assertEqual(events[-1]["reason"], "target_reached")
        self.assertEqual(events[-1]["minutes_observed"], 20)

    async def test_successful_delivery_commit_records_start_and_regular_skip(self):
        for lead, expected in ((True, "started"), (False, "skipped")):
            with self.subTest(lead=lead):
                self.scheduler._clear_preconditioning_sessions(report=False)
                self.scheduler._learning_transition_keys.clear()
                self.hass.bus.events.clear()
                event = self.event(lead=lead)
                await self.scheduler._async_commit_resolved_event(
                    event, hvac_mode="heat", source="scheduled_event", applied_at=NOW,
                    is_current=lambda: True)
                self.assertEqual([item["status"] for item in self.events()], [expected])

    def test_range_transition_records_correct_boundary_for_both_directions(self):
        for initial, direction, target in ((18, "heat", 20), (26, "cool", 24)):
            with self.subTest(direction=direction):
                event = replace(self.event(), temperature=None, hvac_mode="heat_cool",
                                target_temp_low=20, target_temp_high=24)
                self.hass.states[self.entity] = SimpleNamespace(
                    state="heat_cool", attributes={"current_temperature": initial})
                self.scheduler._start_preconditioning_session(event, "heat_cool", NOW)
                self.scheduler._record_learning_transition(event, "heat_cool", NOW)
                result = self.events()[-1]
                self.assertEqual((result["direction"], result["target_temp"]), (direction, target))
                self.assertEqual(result["status"], "started")

    async def test_precise_invalid_reasons_and_partial_duration(self):
        for minutes, initial, quality, expected in (
            (1, 18, "complete", "duration_too_short"),
            (181, 18, "complete", "duration_too_long"),
            (20, 20.8, "complete", "delta_too_small"),
            (60, 18, "partial", "target_not_reached"),
        ):
            with self.subTest(expected=expected):
                self.start()
                session = self.scheduler._preconditioning_sessions[self.entity]
                session = replace(session, start_temperature=initial)
                await self.scheduler._async_finish_preconditioning_session(session, NOW + timedelta(minutes=minutes), 21, quality=quality)
                result = self.events("preconditioning_observation_recorded")[-1]
                self.assertEqual(result["reason"], expected)
                self.assertEqual(result["minutes_observed"], minutes)

    async def test_failed_reset_keeps_session_without_false_interruption(self):
        self.start()
        session = self.scheduler._preconditioning_sessions[self.entity]
        with patch.object(self.scheduler, "_async_save_data", AsyncMock(side_effect=RuntimeError("save failed"))), \
             patch.object(self.scheduler, "_async_restore_delivery_after_failed_mutation", AsyncMock()):
            with self.assertRaises(RuntimeError):
                await self.scheduler.async_reset_zone_preconditioning_learning(self.entity, "heat")
        self.assertIs(self.scheduler._preconditioning_sessions[self.entity], session)
        self.assertEqual(self.events("preconditioning_observation_interrupted"), [])

    async def test_diagnostics_history_clear_retention_and_event_evidence(self):
        self.start()
        manager = diagnostics_module.RuntimeDiagnosticsManager(self.hass, [self.entity])
        manager._schedule_notify = lambda: None
        for event in self.events():
            manager._handle_event(SimpleNamespace(data=event))
        summary = manager._learning_summary(self.entity, self.data, self.scheduler)
        self.assertEqual(summary["heat"]["last_transition"]["status"], "started")
        self.assertEqual(summary["heat"]["last_transition"]["initial_temp"], 18)
        manager.async_clear_history()
        self.assertNotIn("last_transition", manager._learning_summary(self.entity, self.data, self.scheduler)["heat"])
        await manager.async_update_history_categories([])
        for event in self.events():
            manager._handle_event(SimpleNamespace(data=event))
        self.assertNotIn("last_transition", manager._learning_summary(self.entity, self.data, self.scheduler)["heat"])
        self.assertEqual(manager._learning_summary(self.entity, self.data, self.scheduler)["heat"]["activity"]["state"], "observing")

    async def test_real_schedule_response_projects_only_retained_history(self):
        event = self.event(lead=False)
        self.scheduler._record_learning_transition(event, "heat", NOW)
        manager = diagnostics_module.RuntimeDiagnosticsManager(self.hass, [self.entity])
        manager._schedule_notify = lambda: None
        manager._handle_event(SimpleNamespace(data=self.events()[0]))
        runtime = {
            "scheduler": self.scheduler,
            "storage": SimpleNamespace(data=normalize_schedule_data(self.data, [self.entity])),
            "entry": SimpleNamespace(options={}, data={}),
            "climate_manager": self.climate, "diagnostics": manager,
        }
        def summary():
            return api_module._build_schedule_response(runtime)["preconditioning_learning"][self.entity]["heat"]
        self.assertEqual(summary()["last_transition"]["status"], "skipped")
        manager.async_clear_history()
        self.assertNotIn("last_transition", summary())
        manager._handle_event(SimpleNamespace(data=self.events()[0]))
        await manager.async_update_history_categories([])
        self.assertNotIn("last_transition", summary())

    def test_subscription_updates_history_projection_and_removes_both_listeners(self):
        manager = diagnostics_module.RuntimeDiagnosticsManager(self.hass, [self.entity])
        runtime = {"storage": SimpleNamespace(data=self.data), "diagnostics": manager, "scheduler": self.scheduler}
        connection = SimpleNamespace(subscriptions={}, send_result=Mock(), send_message=Mock(), send_error=Mock())
        callbacks, removed = {}, []
        def connect(_hass, signal, cb):
            callbacks[signal] = cb
            return lambda: removed.append(signal)
        with patch.object(api_module, "_get_runtime", return_value=runtime), \
             patch.object(api_module, "_build_schedule_response", return_value={}), \
             patch.object(api_module, "async_dispatcher_connect", side_effect=connect):
            api_module.ws_subscribe_updates(self.hass, connection, {"id": 42})
            self.assertEqual(connection.send_message.call_count, 1)
            callbacks[api_module.SIGNAL_DIAGNOSTICS_UPDATED]()
            self.assertEqual(connection.send_message.call_count, 1)
            manager._record("event", "info", entity_id=self.entity,
                            category="preconditioning", data={"status": "skipped", "direction": "heat"})
            callbacks[api_module.SIGNAL_DIAGNOSTICS_UPDATED]()
            self.assertEqual(connection.send_message.call_count, 2)
            manager._history.clear()
            callbacks[api_module.SIGNAL_DIAGNOSTICS_UPDATED]()
            self.assertEqual(connection.send_message.call_count, 3)
            self.hass.states[self.entity].attributes.clear()
            callbacks[api_module.SIGNAL_DIAGNOSTICS_UPDATED]()
            self.assertEqual(connection.send_message.call_count, 4)
            self.hass.states[self.entity].attributes["current_temperature"] = 19
            callbacks[api_module.SIGNAL_DIAGNOSTICS_UPDATED]()
            self.assertEqual(connection.send_message.call_count, 5)
            self.hass.states[self.entity].attributes["current_temperature"] = 19.2
            callbacks[api_module.SIGNAL_DIAGNOSTICS_UPDATED]()
            self.assertEqual(connection.send_message.call_count, 5)
            connection.subscriptions[42]()
        self.assertCountEqual(removed, [api_module.SIGNAL_SCHEDULER_UPDATED, api_module.SIGNAL_DIAGNOSTICS_UPDATED])

