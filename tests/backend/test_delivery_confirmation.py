"""Focused contracts for accepted physical delivery confirmation."""

import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from . import helpers  # noqa: F401
from custom_components.velair.climate_delivery import ClimateDeliveryCoordinator, Delivery
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.delivery_guard import capture_delivery_receipt, record_delivery_receipt
from homeassistant.exceptions import HomeAssistantError


class DeliveryConfirmationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.entity = "climate.room"
        self.hass = SimpleNamespace(
            states={self.entity: SimpleNamespace(state="cool", attributes={"temperature": 25, "target_temp_step": 0.5})},
            async_create_task=asyncio.create_task,
        )
        self.manager = ClimateManager(self.hass)
        self.events = []
        self.coordinator = ClimateDeliveryCoordinator(self.hass, lambda entity, status, details: self.events.append((status, details)))
        self.coordinator._receipt_matcher = self.manager.compare_receipt

    async def asyncTearDown(self):
        await self.coordinator.async_stop()

    async def drain(self):
        for _ in range(30):
            await asyncio.sleep(0)

    async def test_explicit_failure_and_silent_success_share_two_retries(self):
        attempts = []
        commits = []

        async def apply():
            attempts.append(1)
            if len(attempts) == 1:
                raise HomeAssistantError("first call failed")
            record_delivery_receipt(self.entity, {"temperature": 23})

        async def commit(_current):
            commits.append(1)

        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)), patch("custom_components.velair.climate_delivery.FINAL_CONFIRMATION_DELAY", 0):
            await self.coordinator.async_deliver(self.entity, lambda: Delivery(apply, commit))
            await self.drain()
        self.assertEqual(len(attempts), 3)
        self.assertEqual(len(commits), 1)
        self.assertEqual(self.events[-1][0], "unconfirmed")
        self.assertEqual(self.events[-1][1]["retry_count"], 2)

    async def test_manual_one_shot_never_recovers_silent_success(self):
        attempts = []

        async def apply():
            attempts.append(1)
            record_delivery_receipt(self.entity, {"temperature": 23})

        await self.coordinator.async_deliver(self.entity, lambda: Delivery(apply), resilient=False)
        await self.drain()
        self.assertEqual(len(attempts), 1)
        self.assertFalse(self.coordinator._tasks)

    async def test_receipt_final_format_and_task_isolation(self):
        with capture_delivery_receipt() as receipt:
            record_delivery_receipt(self.entity, {"temperature": 23, "target_temp_low": None})
            await asyncio.create_task(self.record_inherited())
            record_delivery_receipt(self.entity, {"target_temp_low": 20, "target_temp_high": 24})
        self.assertEqual(receipt, {self.entity: {"target_temp_low": 20, "target_temp_high": 24}})

    async def record_inherited(self):
        record_delivery_receipt("climate.unrelated", {"temperature": 30})

    async def test_nonfinite_and_unavailable_never_confirm(self):
        for value in (float("nan"), float("inf"), None):
            self.hass.states[self.entity].attributes["temperature"] = value
            self.assertFalse(self.manager.compare_receipt({self.entity: {"temperature": 23}})["matches"])
        self.hass.states[self.entity].attributes["temperature"] = 23
        self.hass.states[self.entity].state = "unavailable"
        self.assertFalse(self.manager.compare_receipt({self.entity: {"temperature": 23}})["matches"])

    async def test_native_step_match_and_comparison_is_read_only(self):
        self.hass.states[self.entity].attributes["temperature"] = 23.2
        expected = {self.entity: {"temperature": 23}}
        self.assertTrue(self.manager.compare_receipt(expected)["matches"])
        self.assertFalse(self.manager._expected)
        self.assertFalse(self.manager._settling)
        self.assertEqual(expected, {self.entity: {"temperature": 23}})

    async def test_retry_reports_latest_resolved_target(self):
        attempts = []

        async def apply():
            target = 23 if not attempts else 22
            attempts.append(target)
            record_delivery_receipt(self.entity, {"temperature": target})
            if len(attempts) > 1:
                self.hass.states[self.entity].attributes["temperature"] = target

        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)):
            await self.coordinator.async_deliver(self.entity, lambda: Delivery(apply))
            await self.drain()
        recovered = [details for status, details in self.events if status == "recovered"]
        self.assertEqual(attempts, [23, 22])
        self.assertEqual(len(recovered), 1)
        self.assertEqual(recovered[0]["expected"][self.entity]["temperature"], 22)
        self.assertTrue(recovered[0]["matches"])

    async def test_new_serialized_target_replaces_pending_receipt(self):
        target = 23
        attempts = []

        async def apply():
            attempts.append(target)
            record_delivery_receipt(self.entity, {"temperature": target})

        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60, 60)):
            await self.coordinator.async_deliver(self.entity, lambda: Delivery(apply))
            target = 22
            self.hass.states[self.entity].attributes["temperature"] = target
            await self.coordinator.async_serialize(self.entity, apply)
            await self.drain()
        self.assertEqual(attempts, [23, 22])
        self.assertFalse(self.coordinator._receipts)
        self.assertFalse(self.coordinator._tasks)

    async def test_cancel_discards_silent_recovery(self):
        attempts = []

        async def apply():
            attempts.append(1)
            record_delivery_receipt(self.entity, {"temperature": 23})

        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60, 60)):
            await self.coordinator.async_deliver(self.entity, lambda: Delivery(apply))
            self.coordinator.cancel(self.entity)
            await self.drain()
        self.assertEqual(len(attempts), 1)
        self.assertFalse(self.coordinator._receipts)
        self.assertFalse(self.coordinator._tasks)

    async def test_unrelated_sensor_attribute_events_do_not_compare_or_wake(self):
        callbacks = []

        async def apply():
            record_delivery_receipt(self.entity, {"temperature": 23})

        with patch("custom_components.velair.climate_delivery.async_track_state_change_event", side_effect=lambda _hass, _entities, cb: callbacks.append(cb) or (lambda: None)), patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60, 60)):
            await self.coordinator.async_deliver(self.entity, lambda: Delivery(apply))
            await self.drain()
            matcher = unittest.mock.Mock(wraps=self.manager.compare_receipt)
            self.coordinator._receipt_matcher = matcher
            old = self.hass.states[self.entity]
            new = SimpleNamespace(state=old.state, attributes={**old.attributes, "current_temperature": 19})
            self.hass.states[self.entity] = new
            callbacks[0](SimpleNamespace(data={"entity_id": self.entity, "old_state": old, "new_state": new}))
            await self.drain()
            matcher.assert_not_called()

    async def test_pending_target_event_is_compared_once_without_recovery_worker(self):
        callbacks = []

        async def apply():
            record_delivery_receipt(self.entity, {"temperature": 23})

        with patch("custom_components.velair.climate_delivery.async_track_state_change_event", side_effect=lambda _hass, _entities, cb: callbacks.append(cb) or (lambda: None)), patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60, 60)):
            await self.coordinator.async_deliver(self.entity, lambda: Delivery(apply))
            await self.drain()
            matcher = unittest.mock.Mock(wraps=self.manager.compare_receipt)
            self.coordinator._receipt_matcher = matcher
            old = self.hass.states[self.entity]
            new = SimpleNamespace(state=old.state, attributes={**old.attributes, "temperature": 24})
            self.hass.states[self.entity] = new
            callbacks[0](SimpleNamespace(data={"entity_id": self.entity, "old_state": old, "new_state": new}))
            await self.drain()
            matcher.assert_called_once()
            self.assertFalse(self.coordinator._tasks)
            self.assertNotIn(self.entity, self.coordinator._retry_counts)

    async def test_unavailability_waits_for_existing_listener_without_spending_retry(self):
        callbacks = []
        attempts = []

        async def apply():
            attempts.append(1)
            record_delivery_receipt(self.entity, {"temperature": 23})
            if len(attempts) > 1:
                self.hass.states[self.entity].attributes["temperature"] = 23

        def report(mode):
            old = self.hass.states[self.entity]
            new = SimpleNamespace(state=mode, attributes=dict(old.attributes))
            self.hass.states[self.entity] = new
            callbacks[0](SimpleNamespace(data={"entity_id": self.entity, "old_state": old, "new_state": new}))

        with patch("custom_components.velair.climate_delivery.async_track_state_change_event", side_effect=lambda _hass, _entities, cb: callbacks.append(cb) or (lambda: None)), patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)):
            await self.coordinator.async_deliver(self.entity, lambda: Delivery(apply))
            report("unavailable")
            await self.drain()
            self.assertEqual(len(attempts), 1)
            self.assertEqual(self.coordinator._retry_counts.get(self.entity, 0), 0)
            report("cool")
            await self.drain()
        self.assertEqual(len(callbacks), 1)
        self.assertEqual(len(attempts), 2)
        self.assertEqual(self.coordinator._retry_counts[self.entity], 1)

    async def test_new_intent_without_observable_target_never_reports_recovered(self):
        attempts = []

        async def apply():
            attempts.append(1)
            if len(attempts) == 1:
                record_delivery_receipt(self.entity, {"temperature": 23})

        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)):
            await self.coordinator.async_deliver(self.entity, lambda: Delivery(apply))
            await self.drain()
        self.assertEqual(len(attempts), 2)
        self.assertFalse(any(status == "recovered" for status, _details in self.events))
        self.assertNotIn("confirmation", self.events[-1][1])
        self.assertFalse(self.coordinator._receipts)

    async def test_new_logical_intent_commits_once_during_recovery(self):
        attempts = []
        commits = []

        def resolve():
            target = 23 if not attempts else 22
            key = ("schedule-block", target)

            async def apply():
                attempts.append(target)
                record_delivery_receipt(self.entity, {"temperature": target})
                if len(attempts) > 1:
                    self.hass.states[self.entity].attributes["temperature"] = target

            async def commit(_current):
                commits.append(key)

            return Delivery(apply, commit, commit_key=key)

        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)):
            await self.coordinator.async_deliver(self.entity, resolve)
            await self.drain()
        self.assertEqual(attempts, [23, 22])
        self.assertEqual(commits, [("schedule-block", 23), ("schedule-block", 22)])
