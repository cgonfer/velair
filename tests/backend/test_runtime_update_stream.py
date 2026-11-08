"""Small runtime pushes preserve full snapshots, isolation and legacy readers."""

from collections import defaultdict
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from .helpers import FakeHass, FakeClimateManager, NOW, VelairScheduler, normalize_schedule_data, scheduler_module
from custom_components.velair import api
from custom_components.velair.const import (
    SIGNAL_COMFORT_UPDATED, SIGNAL_OPERATION_UPDATED, SIGNAL_SCHEDULER_UPDATED,
)


ZONE = "climate.stream_room"


class RuntimeUpdateStreamTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.hass = FakeHass()
        self.hass.states[ZONE] = SimpleNamespace(state="heat", attributes={
            "current_temperature": 20, "current_humidity": 50}, last_reported=NOW)
        self.data = normalize_schedule_data(None, [ZONE])
        self.data["zones"][ZONE]["comfort"]["enabled"] = True
        self.scheduler = VelairScheduler(self.hass, self.data, FakeClimateManager(), AsyncMock())
        self.addAsyncCleanup(self.scheduler.async_stop)
        self.runtime = {"scheduler": self.scheduler,
                        "storage": SimpleNamespace(data=self.data, _climate_entities=[ZONE]),
                        "entry": SimpleNamespace(data={}, options={})}
        self.current_runtime = self.runtime
        self.listeners = defaultdict(list)
        def connect(_hass, signal, listener):
            self.listeners[signal].append(listener)
            return lambda: self.listeners[signal].remove(listener)
        for target, name, value in (
            (api, "_get_runtime", lambda _: self.current_runtime),
            (api, "_async_ready_runtime", AsyncMock(return_value=self.runtime)),
            (api, "async_dispatcher_connect", connect),
            (scheduler_module, "async_dispatcher_send", self.dispatch),
        ):
            patched = patch.object(target, name, value)
            patched.start()
            self.addCleanup(patched.stop)

    def dispatch(self, _hass, signal, *args):
        for listener in tuple(self.listeners[signal]):
            listener(*args)

    async def subscribe(self, *, partial=True):
        connection = SimpleNamespace(subscriptions={}, send_result=Mock(), send_message=Mock())
        await api.ws_subscribe_updates(self.hass, connection,
            {"id": 1, **({"partial_updates": True} if partial else {})})
        initial = connection.send_message.call_args.args[0]["event"]
        self.assertTrue(initial["loaded"])
        self.assertIn("schedule", initial)
        connection.send_message.reset_mock()
        return connection

    async def test_comfort_patch_contains_only_changed_assessments_without_full_preparation(self):
        connection = await self.subscribe()
        self.hass.states[ZONE].attributes["current_humidity"] = 77
        with patch.object(api, "_build_schedule_response_snapshot",
                          side_effect=AssertionError("Comfort built full schedule")), \
             patch.object(self.scheduler, "_prepare_runtime_projection",
                          side_effect=AssertionError("Comfort prepared schedule")):
            self.dispatch(self.hass, SIGNAL_COMFORT_UPDATED, frozenset({ZONE}))
        event = connection.send_message.call_args.args[0]["event"]
        self.assertEqual(set(event), {"loaded", "comfort"})
        self.assertEqual(set(event["comfort"]), {ZONE})
        self.assertEqual(event["comfort"][ZONE]["humidity"]["value"], 77)

    async def test_operation_progress_uses_small_pushes_and_final_state_remains_authoritative(self):
        connection = await self.subscribe()
        with patch.object(api, "_build_schedule_response_snapshot",
                          side_effect=AssertionError("Progress built full schedule")), \
             patch.object(self.scheduler, "_prepare_runtime_projection",
                          side_effect=AssertionError("Progress prepared schedule")):
            self.scheduler._begin_operation("mode_change", "away", 2)
            self.scheduler._set_operation_total(1)
            self.scheduler._start_operation_entity(ZONE)
            self.scheduler._mark_operation_entity_deferred(ZONE)
            self.scheduler._mark_operation_entity_failed(ZONE)
            self.scheduler._advance_operation(ZONE)
        messages = [call.args[0]["event"] for call in connection.send_message.call_args_list]
        self.assertEqual(len(messages), 4)
        self.assertTrue(all(set(message) == {"loaded", "operation_status"} for message in messages))
        self.assertEqual(messages[0]["operation_status"]["completed"], 0)
        self.assertEqual(messages[-1]["operation_status"]["completed"], 1)
        self.assertEqual(messages[-1]["operation_status"]["deferred_entity_ids"], [ZONE])
        self.assertEqual(messages[-1]["operation_status"]["failed_entity_ids"], [ZONE])
        with patch.object(api, "_build_schedule_response_snapshot",
                          wraps=api._build_schedule_response_snapshot) as build:
            self.scheduler._finish_operation()
            self.assertEqual(build.call_count, 1)
        final = connection.send_message.call_args.args[0]["event"]["schedule"]
        self.assertEqual(final["operation_status"]["state"], "completed_with_errors")

    async def test_failed_or_cancelled_operation_finishes_with_full_current_state(self):
        connection = await self.subscribe()
        for code in ("cancelled", "operation_failed"):
            with self.subTest(code=code):
                self.scheduler._begin_operation("profile_selection", None, 1)
                self.scheduler._finish_operation(failed=True, error_code=code)
                final = connection.send_message.call_args.args[0]["event"]["schedule"]
                self.assertEqual(final["operation_status"]["state"], "failed")
                self.assertEqual(final["operation_status"]["error_code"], code)
                self.assertIsNotNone(final["operation_status"]["finished_at"])

    async def test_legacy_reader_retains_full_comfort_and_operation_messages(self):
        legacy = await self.subscribe(partial=False)
        self.dispatch(self.hass, SIGNAL_COMFORT_UPDATED, frozenset({ZONE}))
        self.scheduler._begin_operation("mode_change", "away", 1)
        self.assertEqual(legacy.send_message.call_count, 2)
        for call in legacy.send_message.call_args_list:
            self.assertEqual(set(call.args[0]["event"]), {"loaded", "schedule"})
        self.assertEqual(legacy.send_message.call_args.args[0]["event"]
                         ["schedule"]["operation_status"]["state"], "running")

    async def test_full_publication_builds_once_for_multiple_readers_and_detaches_payloads(self):
        first, second = await self.subscribe(), await self.subscribe()
        def mutate(message):
            message["event"]["schedule"]["comfort"][ZONE]["temperature"]["value"] = -999
        first.send_message.side_effect = mutate
        with patch.object(api, "_build_schedule_response_snapshot",
                          wraps=api._build_schedule_response_snapshot) as build:
            self.scheduler._async_write_state()
        self.assertEqual(build.call_count, 1)
        self.assertEqual(second.send_message.call_args.args[0]["event"]
                         ["schedule"]["comfort"][ZONE]["temperature"]["value"], 20)
        self.assertEqual(self.scheduler.get_comfort_assessment(ZONE)["temperature"]["value"], 20)

    async def test_nested_publication_invalidates_shared_full_response_before_other_readers(self):
        first, second = await self.subscribe(), await self.subscribe()
        reentered = False
        def publish_new_state(_message):
            nonlocal reentered
            if not reentered:
                reentered = True
                self.hass.states[ZONE].attributes["current_temperature"] = 25
                self.scheduler._async_write_state()
        first.send_message.side_effect = publish_new_state
        self.scheduler._async_write_state()
        for call in second.send_message.call_args_list:
            self.assertEqual(call.args[0]["event"]["schedule"]["comfort"][ZONE]
                             ["temperature"]["value"], 25)

    async def test_partial_readers_receive_unloaded_and_unsubscribe_retires_all_signals(self):
        connection = await self.subscribe()
        self.current_runtime = None
        self.dispatch(self.hass, SIGNAL_COMFORT_UPDATED, frozenset({ZONE}))
        self.dispatch(self.hass, SIGNAL_OPERATION_UPDATED)
        self.assertEqual(connection.send_message.call_count, 2)
        self.assertTrue(all(call.args[0]["event"] == {"loaded": False}
                            for call in connection.send_message.call_args_list))
        connection.subscriptions[1]()
        connection.send_message.reset_mock()
        self.current_runtime = self.runtime
        for signal, args in ((SIGNAL_COMFORT_UPDATED, (frozenset({ZONE}),)),
                             (SIGNAL_OPERATION_UPDATED, ()), (SIGNAL_SCHEDULER_UPDATED, ())):
            self.dispatch(self.hass, signal, *args)
        connection.send_message.assert_not_called()

    async def test_operation_payloads_are_detached_between_readers_and_from_runtime(self):
        first, second = await self.subscribe(), await self.subscribe()
        first.send_message.side_effect = lambda message: message["event"]["operation_status"]\
            ["failed_entity_ids"].append("climate.injected")
        self.scheduler._begin_operation("mode_change", "away", 1)
        self.assertEqual(self.scheduler.operation_status["failed_entity_ids"], [])
        self.assertEqual(second.send_message.call_args.args[0]["event"]
                         ["operation_status"]["failed_entity_ids"], [])
