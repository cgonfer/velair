"""Tests for resilient climate delivery coordination."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from . import helpers  # noqa: F401 - installs Home Assistant test stubs
from custom_components.velair.climate_delivery import (
    ClimateDeliveryCoordinator,
    Delivery,
)
from homeassistant.exceptions import HomeAssistantError


class _Hass:
    def __init__(self) -> None:
        self.states: dict[str, SimpleNamespace] = {}

    def async_create_task(self, awaitable):
        return asyncio.create_task(awaitable)


class ClimateDeliveryCoordinatorTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.hass = _Hass()
        self.entity_id = "climate.room"
        self.hass.states[self.entity_id] = SimpleNamespace(state="heat")
        self.coordinator = ClimateDeliveryCoordinator(self.hass)

    async def asyncTearDown(self) -> None:
        await self.coordinator.async_stop()

    async def test_explicit_failure_re_resolves_twice_then_stops(self) -> None:
        resolved: list[int] = []

        def resolver():
            attempt = len(resolved) + 1
            resolved.append(attempt)

            async def deliver() -> None:
                raise HomeAssistantError(f"failure {attempt}")

            return Delivery(deliver)

        with patch(
            "custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)
        ):
            applied = await self.coordinator.async_deliver(self.entity_id, resolver)
            self.assertFalse(applied)
            await asyncio.sleep(0)
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(resolved, [1, 2, 3])

    async def test_observer_failure_does_not_block_delivery_retries(self) -> None:
        attempts: list[int] = []

        def failing_observer(_entity_id, _status, _details) -> None:
            raise RuntimeError("diagnostics unavailable")

        coordinator = ClimateDeliveryCoordinator(self.hass, failing_observer)

        def resolver():
            attempt = len(attempts) + 1
            attempts.append(attempt)

            async def deliver() -> None:
                if attempt == 1:
                    raise HomeAssistantError("temporary")

            return Delivery(deliver)

        with (
            patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0,)),
            patch("custom_components.velair.climate_delivery._LOGGER.exception") as log,
        ):
            applied = await coordinator.async_deliver(self.entity_id, resolver)
            self.assertFalse(applied)
            await asyncio.sleep(0)
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual([1, 2], attempts)
        self.assertGreaterEqual(log.call_count, 2)
        await coordinator.async_stop()

    async def test_replace_cancel_and_stop_publish_cancelled_evidence(self) -> None:
        observed = []
        coordinator = ClimateDeliveryCoordinator(
            self.hass,
            lambda entity_id, status, details: observed.append((entity_id, status, details)),
        )

        async def apply() -> None:
            return None

        self.hass.states[self.entity_id] = SimpleNamespace(state="unavailable")
        coordinator.register_current(self.entity_id, lambda: Delivery(apply))
        coordinator.register_current(self.entity_id, lambda: Delivery(apply))
        coordinator.cancel(self.entity_id)
        coordinator.register_current(self.entity_id, lambda: Delivery(apply))
        await coordinator.async_stop()

        cancelled_reasons = [
            details.get("reason")
            for _, status, details in observed
            if status == "cancelled"
        ]
        self.assertIn("replaced", cancelled_reasons)
        self.assertIn("cancelled", cancelled_reasons)
        self.assertIn("stopped", cancelled_reasons)

    async def test_inactive_eligible_replacement_does_not_report_cancelled(self) -> None:
        observed = []
        coordinator = ClimateDeliveryCoordinator(
            self.hass,
            lambda entity_id, status, details: observed.append(
                (entity_id, status, details)
            ),
        )

        async def apply() -> None:
            return None

        coordinator.register_current(self.entity_id, lambda: Delivery(apply))
        coordinator.register_current(self.entity_id, lambda: Delivery(apply))
        coordinator.cancel(self.entity_id)
        await coordinator.async_stop()

        self.assertFalse(any(status == "cancelled" for _, status, _ in observed))

    async def test_availability_redelivery_reports_success_without_self_cancel(self) -> None:
        observed = []
        coordinator = ClimateDeliveryCoordinator(
            self.hass,
            lambda entity_id, status, details: observed.append((status, details)),
        )
        coordinator.register_current(
            self.entity_id,
            lambda: Delivery(lambda: asyncio.sleep(0)),
        )
        observed.clear()
        await coordinator._async_redeliver_current(self.entity_id)
        self.assertIn(("success", None), observed)
        self.assertFalse(any(status == "cancelled" for status, _ in observed))
        await coordinator.async_stop()

    async def test_unavailable_waits_for_transition_without_polling(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(state="unavailable")
        callbacks = []
        delivered = []

        def track(_hass, entity_ids, callback):
            self.assertEqual(entity_ids, [self.entity_id])
            callbacks.append(callback)
            return lambda: callbacks.remove(callback) if callback in callbacks else None

        def resolver():
            async def deliver() -> None:
                delivered.append("current")

            return Delivery(deliver)

        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            applied = await self.coordinator.async_deliver(self.entity_id, resolver)
            self.assertFalse(applied)
            await asyncio.sleep(0)
            self.assertEqual(delivered, [])
            self.assertEqual(len(callbacks), 1)
            self.hass.states[self.entity_id] = SimpleNamespace(state="cool")
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(delivered, ["current"])
        self.assertEqual(len(callbacks), 1)

    async def test_missing_state_waits_until_entity_appears_available(self) -> None:
        self.hass.states.pop(self.entity_id)
        callbacks = []
        delivered = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: None

        def resolver():
            async def apply() -> None:
                delivered.append("available")

            return Delivery(apply)

        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            self.assertFalse(
                await self.coordinator.async_deliver(self.entity_id, resolver)
            )
            self.assertEqual(delivered, [])
            self.hass.states[self.entity_id] = SimpleNamespace(state="heat")
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(delivered, ["available"])

    async def test_none_state_waits_until_entity_becomes_available(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(state=None)
        callbacks = []
        delivered = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: None

        def resolver():
            async def apply() -> None:
                delivered.append("available")

            return Delivery(apply)

        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            self.assertFalse(
                await self.coordinator.async_deliver(self.entity_id, resolver)
            )
            self.hass.states[self.entity_id] = SimpleNamespace(state="cool")
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(delivered, ["available"])

    async def test_old_invalid_failure_cannot_clear_new_unavailable_resolver(self) -> None:
        callbacks = []
        old_started = asyncio.Event()
        release_old = asyncio.Event()
        delivered: list[str] = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: None

        def old_resolver():
            async def apply() -> None:
                old_started.set()
                await release_old.wait()
                raise ValueError("old intent became invalid")

            return Delivery(apply)

        def new_resolver():
            async def apply() -> None:
                delivered.append("new")

            return Delivery(apply)

        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            old_task = asyncio.create_task(
                self.coordinator.async_deliver(self.entity_id, old_resolver)
            )
            await old_started.wait()
            self.hass.states[self.entity_id] = SimpleNamespace(state="unavailable")
            self.assertFalse(
                await self.coordinator.async_deliver(self.entity_id, new_resolver)
            )
            release_old.set()
            with self.assertRaisesRegex(ValueError, "old intent"):
                await old_task
            self.assertIs(
                self.coordinator._eligible[self.entity_id], new_resolver
            )
            self.hass.states[self.entity_id] = SimpleNamespace(state="cool")
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(delivered, ["new"])

    async def test_old_failure_cannot_clear_new_generation_reusing_same_resolver(self) -> None:
        callbacks = []
        old_started = asyncio.Event()
        release_old = asyncio.Event()
        resolver_calls = 0
        delivered: list[str] = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: None

        def resolver():
            nonlocal resolver_calls
            resolver_calls += 1
            invocation = resolver_calls

            async def apply() -> None:
                if invocation == 1:
                    old_started.set()
                    await release_old.wait()
                    raise ValueError("old invalid")
                delivered.append("current")

            return Delivery(apply)

        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            old_task = asyncio.create_task(
                self.coordinator.async_deliver(self.entity_id, resolver)
            )
            await old_started.wait()
            self.hass.states[self.entity_id] = SimpleNamespace(state="unavailable")
            self.assertFalse(
                await self.coordinator.async_deliver(self.entity_id, resolver)
            )
            release_old.set()
            with self.assertRaisesRegex(ValueError, "old invalid"):
                await old_task
            self.assertTrue(self.coordinator.is_deferred(self.entity_id))
            self.hass.states[self.entity_id] = SimpleNamespace(state="heat")
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(delivered, ["current"])

    async def test_stop_cancels_and_awaits_active_redelivery_task(self) -> None:
        callbacks = []
        redelivery_started = asyncio.Event()
        attempts = 0

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: None

        def resolver():
            async def apply() -> None:
                nonlocal attempts
                attempts += 1
                if attempts > 1:
                    redelivery_started.set()
                    await asyncio.Event().wait()

            return Delivery(apply)

        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            self.assertTrue(
                await self.coordinator.async_deliver(self.entity_id, resolver)
            )
            self.hass.states[self.entity_id] = SimpleNamespace(state="unavailable")
            callbacks[0](object())
            self.hass.states[self.entity_id] = SimpleNamespace(state="heat")
            callbacks[0](object())
            await redelivery_started.wait()
            await self.coordinator.async_stop()

        self.assertEqual(self.coordinator._tasks, {})
        self.assertEqual(attempts, 2)

    async def test_new_generation_cancels_old_unavailable_intent(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(state="unknown")
        callbacks = []
        delivered: list[str] = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: callbacks.remove(callback) if callback in callbacks else None

        def resolver(label: str):
            def resolve():
                async def deliver() -> None:
                    delivered.append(label)

                return Delivery(deliver)

            return resolve

        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            await self.coordinator.async_deliver(self.entity_id, resolver("old"))
            await asyncio.sleep(0)
            await self.coordinator.async_deliver(self.entity_id, resolver("new"))
            await asyncio.sleep(0)
            self.hass.states[self.entity_id] = SimpleNamespace(state="heat_cool")
            callbacks[-1](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(delivered, ["new"])

    async def test_non_resilient_one_shot_never_reappears(self) -> None:
        attempts = 0

        def resolver():
            async def deliver() -> None:
                nonlocal attempts
                attempts += 1
                raise HomeAssistantError("explicit failure")

            return Delivery(deliver)

        with self.assertRaisesRegex(HomeAssistantError, "explicit failure"):
            await self.coordinator.async_deliver(
                self.entity_id, resolver, resilient=False
            )
        await asyncio.sleep(0)

        self.assertEqual(attempts, 1)
        self.assertNotIn(self.entity_id, self.coordinator._tasks)

    async def test_register_current_waits_for_future_reconnect_without_applying(self) -> None:
        callbacks = []
        delivered: list[str] = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: None

        def resolver():
            async def apply() -> None:
                delivered.append("restored")

            return Delivery(apply)

        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            self.hass.states[self.entity_id] = SimpleNamespace(state="unavailable")
            self.assertTrue(
                self.coordinator.register_current(self.entity_id, resolver)
            )
            self.assertEqual(delivered, [])
            self.hass.states[self.entity_id] = SimpleNamespace(state="heat")
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(delivered, ["restored"])

    async def test_local_validation_error_is_not_retried(self) -> None:
        attempts = 0

        def resolver():
            async def deliver() -> None:
                nonlocal attempts
                attempts += 1
                raise ValueError("invalid local target")

            return Delivery(deliver)

        with self.assertRaisesRegex(ValueError, "invalid local target"):
            await self.coordinator.async_deliver(self.entity_id, resolver)
        await asyncio.sleep(0)

        self.assertEqual(attempts, 1)
        self.assertNotIn(self.entity_id, self.coordinator._tasks)

    async def test_successful_intent_is_re_resolved_after_later_reconnect(self) -> None:
        callbacks = []
        current = "heat"
        delivered: list[str] = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: callbacks.remove(callback) if callback in callbacks else None

        def resolver():
            target = current

            async def deliver() -> None:
                delivered.append(target)

            return Delivery(deliver)

        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            self.assertTrue(
                await self.coordinator.async_deliver(self.entity_id, resolver)
            )
            self.hass.states[self.entity_id] = SimpleNamespace(state="unavailable")
            callbacks[0](object())
            current = "cool"
            self.hass.states[self.entity_id] = SimpleNamespace(state="cool")
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(delivered, ["heat", "cool"])

    async def test_side_effect_runs_only_after_retry_succeeds(self) -> None:
        attempts = 0
        applied_events: list[str] = []

        def resolver():
            async def apply() -> None:
                nonlocal attempts
                attempts += 1
                if attempts == 1:
                    raise HomeAssistantError("temporary")

            async def commit(_is_current) -> None:
                applied_events.append("applied")

            return Delivery(apply, commit)

        with patch(
            "custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)
        ):
            self.assertFalse(
                await self.coordinator.async_deliver(self.entity_id, resolver)
            )
            self.assertEqual(applied_events, [])
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(applied_events, ["applied"])

    async def test_commit_failure_does_not_retry_physical_apply(self) -> None:
        applies = 0

        def resolver():
            async def apply() -> None:
                nonlocal applies
                applies += 1

            async def commit(_is_current) -> None:
                raise RuntimeError("logbook unavailable")

            return Delivery(apply, commit)

        with self.assertLogs(
            "custom_components.velair.climate_delivery", level="ERROR"
        ):
            self.assertTrue(
                await self.coordinator.async_deliver(self.entity_id, resolver)
            )

        self.assertEqual(applies, 1)
        self.assertNotIn(self.entity_id, self.coordinator._tasks)

    async def test_slow_superseded_apply_cannot_commit_side_effects(self) -> None:
        old_started = asyncio.Event()
        release_old = asyncio.Event()
        commits: list[str] = []

        def resolver(label: str):
            def resolve():
                async def apply() -> None:
                    if label == "old":
                        old_started.set()
                        await release_old.wait()

                async def commit(_is_current) -> None:
                    commits.append(label)

                return Delivery(apply, commit)

            return resolve

        old_task = asyncio.create_task(
            self.coordinator.async_deliver(self.entity_id, resolver("old"))
        )
        await old_started.wait()
        new_task = asyncio.create_task(
            self.coordinator.async_deliver(self.entity_id, resolver("new"))
        )
        await asyncio.sleep(0)
        release_old.set()
        await asyncio.gather(old_task, new_task)

        self.assertEqual(commits, ["new"])

    async def test_overlapping_replacement_reports_one_cancellation(self) -> None:
        observed = []
        coordinator = ClimateDeliveryCoordinator(
            self.hass,
            lambda entity_id, status, details: observed.append(
                (entity_id, status, details)
            ),
        )
        old_started = asyncio.Event()
        release_old = asyncio.Event()

        def resolver(label: str):
            def resolve():
                async def apply() -> None:
                    if label == "old":
                        old_started.set()
                        await release_old.wait()

                return Delivery(apply)

            return resolve

        old_task = asyncio.create_task(
            coordinator.async_deliver(self.entity_id, resolver("old"))
        )
        await old_started.wait()
        new_task = asyncio.create_task(
            coordinator.async_deliver(self.entity_id, resolver("new"))
        )
        await asyncio.sleep(0)
        release_old.set()
        await asyncio.gather(old_task, new_task)
        await coordinator.async_stop()

        cancellations = [
            item for item in observed if item[1] == "cancelled"
        ]
        self.assertEqual(1, len(cancellations))
        self.assertEqual("replaced", cancellations[0][2]["reason"])

    async def test_reconnect_re_resolves_after_retries_were_exhausted(self) -> None:
        callbacks = []
        current = "old"
        resolved: list[str] = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: callbacks.remove(callback) if callback in callbacks else None

        def resolver():
            target = current

            async def deliver() -> None:
                resolved.append(target)
                if target == "old":
                    raise HomeAssistantError("still disconnected")

            return Delivery(deliver)

        with (
            patch(
                "custom_components.velair.climate_delivery.async_track_state_change_event",
                track,
            ),
            patch(
                "custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)
            ),
        ):
            await self.coordinator.async_deliver(self.entity_id, resolver)
            for _ in range(4):
                await asyncio.sleep(0)
            self.assertEqual(resolved, ["old", "old", "old"])

            self.hass.states[self.entity_id] = SimpleNamespace(state="unavailable")
            callbacks[0](object())
            current = "new"
            self.hass.states[self.entity_id] = SimpleNamespace(state="cool")
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(resolved, ["old", "old", "old", "new"])
