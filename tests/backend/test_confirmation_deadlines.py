"""Delayed climate echoes should not start a recovery coroutine per climate."""

import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from . import helpers  # noqa: F401
from . import test_runtime_diagnostics as diagnostics_tests
from custom_components.velair.climate_delivery import ClimateDeliveryCoordinator, Delivery
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.delivery_guard import record_delivery_receipt


class _Deadline:
    def __init__(self, when, callback, args):
        self.when = when
        self.callback = callback
        self.args = args
        self.cancelled = False

    def cancel(self):
        self.cancelled = True


class _Clock:
    def __init__(self):
        self.now = 0
        self.handles = []

    def call_later(self, delay, callback, *args, **_kwargs):
        handle = _Deadline(self.now + delay, callback, args)
        self.handles.append(handle)
        return handle

    def advance(self, seconds):
        self.now += seconds
        due = [handle for handle in self.handles if handle.when <= self.now]
        for handle in due:
            self.handles.remove(handle)
            if not handle.cancelled:
                handle.callback(*handle.args)


class ConfirmationDeadlineTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.entities = [f"climate.zone_{index}" for index in range(9)]
        self.spawn = Mock(side_effect=asyncio.create_task)
        self.hass = SimpleNamespace(states={entity: SimpleNamespace(
            state="heat", attributes={"temperature": 22, "target_temp_step": 0.5},
        ) for entity in self.entities}, async_create_task=self.spawn)
        self.manager = ClimateManager(self.hass)
        self.observations = []
        self.coordinator = ClimateDeliveryCoordinator(self.hass, lambda entity, status, details: self.observations.append((entity, status, details)))
        self.matcher = Mock(wraps=self.manager.compare_receipt)
        self.coordinator._receipt_matcher = self.matcher
        self.callbacks = {}
        self.clock = _Clock()
        self.calls = []
        self.attempts = {}
        self.echo_on_apply = False
        self.tracking = patch("custom_components.velair.climate_delivery.async_track_state_change_event", self.track)
        self.tracking.start()
        self.addCleanup(self.tracking.stop)
        self.timer_patch = patch.object(asyncio.get_running_loop(), "call_later", self.clock.call_later)
        self.timer_patch.start()
        self.addCleanup(self.timer_patch.stop)

    async def asyncTearDown(self):
        await self.coordinator.async_stop()

    def track(self, _hass, entities, callback):
        entity = tuple(entities)[0]
        self.callbacks[entity] = callback
        return lambda: self.callbacks.pop(entity, None)

    def report(self, entity, target):
        old = self.hass.states[entity]
        new = SimpleNamespace(state=old.state, attributes={**old.attributes, "temperature": target})
        self.hass.states[entity] = new
        self.callbacks[entity](SimpleNamespace(data={"entity_id": entity, "old_state": old, "new_state": new}))

    async def send(self, entity, target=21.5):
        async def apply():
            self.calls.append((entity, target))
            self.attempts[entity] = self.attempts.get(entity, 0) + 1
            record_delivery_receipt(entity, {"temperature": target})
            if self.echo_on_apply:
                self.report(entity, target)
        await self.coordinator.async_deliver(entity, lambda: Delivery(apply))

    async def drain(self):
        for _ in range(30):
            await asyncio.sleep(0)

    async def test_nine_normal_delayed_echoes_need_no_recovery_tasks(self):
        for entity in self.entities:
            await self.send(entity)
        await self.drain()
        self.spawn.assert_not_called()
        self.assertEqual(self.matcher.call_count, 9)
        self.clock.advance(0.5)
        for entity in self.entities:
            self.report(entity, 21.5)
        await self.drain()
        self.assertEqual(self.matcher.call_count, 18)
        self.spawn.assert_not_called()
        self.clock.advance(10)
        await self.drain()
        self.assertEqual(len(self.calls), 9)
        self.assertEqual(sum(status == "confirmation_confirmed" for _, status, _ in self.observations), 9)

    async def test_only_missing_echo_starts_recovery_at_original_deadline(self):
        for entity in self.entities:
            await self.send(entity)
        for entity in self.entities[1:]:
            self.report(entity, 21.5)
        self.echo_on_apply = True
        self.clock.advance(1.99)
        await self.drain()
        self.spawn.assert_not_called()
        self.clock.advance(0.01)
        await self.drain()
        self.assertEqual(self.spawn.call_count, 1)
        self.assertEqual(self.calls, [(entity, 21.5) for entity in self.entities] + [(self.entities[0], 21.5)])
        self.assertTrue(any(entity == self.entities[0] and status == "recovered" for entity, status, _ in self.observations))

    async def test_echo_queued_after_deadline_but_before_worker_avoids_retry(self):
        await self.send(self.entities[0])
        self.clock.advance(2)
        self.report(self.entities[0], 21.5)
        await self.drain()
        self.assertEqual(self.calls, [(self.entities[0], 21.5)])
        self.assertFalse(any(status == "retrying" for _, status, _ in self.observations))

    async def test_new_intent_retires_old_confirmation_deadline(self):
        await self.send(self.entities[0])
        self.echo_on_apply = True
        await self.send(self.entities[0], 20.5)
        self.clock.advance(20)
        await self.drain()
        self.spawn.assert_not_called()
        self.assertEqual(self.calls, [(self.entities[0], 21.5), (self.entities[0], 20.5)])

    async def test_stopping_cancels_all_confirmation_deadlines(self):
        for entity in self.entities:
            await self.send(entity)
        await self.coordinator.async_stop()
        self.clock.advance(20)
        await self.drain()
        self.spawn.assert_not_called()
        self.assertEqual(len(self.calls), 9)
        self.assertFalse(self.callbacks)

    async def test_echo_during_awaited_commit_confirms_without_starting_worker(self):
        entity = self.entities[0]

        async def apply():
            self.calls.append((entity, 21.5))
            record_delivery_receipt(entity, {"temperature": 21.5})

        async def commit(_current):
            await asyncio.sleep(0)
            self.report(entity, 21.5)

        await self.coordinator.async_deliver(entity, lambda: Delivery(apply, commit))
        self.clock.advance(2)
        await self.drain()
        self.spawn.assert_not_called()
        self.assertEqual(self.calls, [(entity, 21.5)])
        self.assertTrue(any(status == "confirmation_confirmed" for _, status, _ in self.observations))

    async def test_reconnect_before_deadline_keeps_original_budget_and_wait(self):
        entity = self.entities[0]
        await self.send(entity)
        for mode in ("unavailable", "heat"):
            old = self.hass.states[entity]
            new = SimpleNamespace(state=mode, attributes=dict(old.attributes))
            self.hass.states[entity] = new
            self.callbacks[entity](SimpleNamespace(data={"entity_id": entity, "old_state": old, "new_state": new}))
        await self.drain()
        self.assertTrue(self.coordinator.retry_current(entity))
        self.spawn.assert_not_called()
        self.assertNotIn(entity, self.coordinator._retry_counts)
        self.echo_on_apply = True
        self.clock.advance(2)
        await self.drain()
        self.assertEqual(self.spawn.call_count, 1)
        self.assertEqual(self.attempts[entity], 2)
        self.assertEqual(self.coordinator._retry_counts[entity], 1)

    async def test_new_room_assist_receipt_replaces_old_deadline(self):
        entity = self.entities[0]
        await self.send(entity)
        self.clock.advance(1)

        async def refresh():
            self.calls.append((entity, 20.5))
            record_delivery_receipt(entity, {"temperature": 20.5})

        await self.coordinator.async_serialize(entity, refresh)
        self.clock.advance(1)
        await self.drain()
        self.spawn.assert_not_called()
        self.report(entity, 20.5)
        self.clock.advance(20)
        await self.drain()
        self.spawn.assert_not_called()
        self.assertEqual(self.calls, [(entity, 21.5), (entity, 20.5)])

    async def test_reconnect_with_correct_target_confirms_without_retry(self):
        entity = self.entities[0]
        await self.send(entity)
        old = self.hass.states[entity]
        unavailable = SimpleNamespace(state="unavailable", attributes=dict(old.attributes))
        self.hass.states[entity] = unavailable
        self.callbacks[entity](SimpleNamespace(data={"entity_id": entity, "old_state": old, "new_state": unavailable}))
        self.clock.advance(2)
        await self.drain()
        self.assertEqual(self.spawn.call_count, 1)
        recovered = SimpleNamespace(state="heat", attributes={**old.attributes, "temperature": 21.5})
        self.hass.states[entity] = recovered
        self.callbacks[entity](SimpleNamespace(data={"entity_id": entity, "old_state": unavailable, "new_state": recovered}))
        await self.drain()
        self.assertEqual(self.calls, [(entity, 21.5)])
        self.assertNotIn(entity, self.coordinator._retry_counts)
        self.assertTrue(any(status == "confirmation_confirmed" for _, status, _ in self.observations))

    async def test_manual_action_retires_pending_automatic_confirmation(self):
        entity = self.entities[0]
        await self.send(entity)

        async def manual():
            self.calls.append((entity, 20.5))
            record_delivery_receipt(entity, {"temperature": 20.5})

        await self.coordinator.async_deliver(entity, lambda: Delivery(manual), resilient=False)
        self.clock.advance(20)
        await self.drain()
        self.spawn.assert_not_called()
        self.assertEqual(self.calls, [(entity, 21.5), (entity, 20.5)])

    async def test_confirmed_mismatch_cleanup_reuses_existing_proof(self):
        entity = self.entities[0]
        self.hass.states[entity].attributes["temperature"] = 21.5
        self.manager._settling_mismatches[entity] = {
            "temperature": {"expected": 21.5}, "hvac_mode": {"expected": "heat"},
            "target_temp_high": {"expected": 25},
        }
        states = Mock(wraps=self.hass.states)
        self.hass.states = states
        with patch.object(self.manager, "_expected_matches", side_effect=AssertionError("Target was already confirmed")):
            self.manager.clear_confirmed_mismatches({entity: {"temperature": 21.5, "__not_off__": True}})
        states.get.assert_not_called()
        self.assertEqual(self.manager._settling_mismatches[entity], {"target_temp_high": {"expected": 25}})

    async def test_state_report_and_confirmation_share_diagnostic_notification(self):
        self.hass.loop = asyncio.get_running_loop()
        self.hass.bus = SimpleNamespace(async_fire=Mock())
        diagnostic = diagnostics_tests.diagnostics_module.RuntimeDiagnosticsManager(self.hass, self.entities)
        self.addCleanup(diagnostic.async_stop)
        self.coordinator._observer = diagnostic.observe_delivery
        with patch.object(diagnostic, "_notify", wraps=diagnostic._notify) as notify:
            await self.send(self.entities[0])
            await self.drain()
            notify.reset_mock()
            event = SimpleNamespace(data={"entity_id": self.entities[0], "old_state": self.hass.states[self.entities[0]],
                                          "new_state": SimpleNamespace(state="heat")})
            diagnostic._handle_climate_state_change(event)
            self.report(self.entities[0], 21.5)
            await self.drain()
            notify.assert_called_once()
            self.assertEqual(diagnostic._delivery[self.entities[0]]["confirmation"]["status"], "confirmed")
