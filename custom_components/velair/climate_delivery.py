"""Event-driven, runtime-only delivery coordination for climate targets."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
import logging
from typing import Any

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_state_change_event

from .climate_manager import STATE_UNAVAILABLE, STATE_UNKNOWN
from .delivery_guard import DeliverySuperseded, check_delivery, delivery_guard, capture_delivery_receipt

_LOGGER = logging.getLogger(__name__)

AsyncStep = Callable[[], Awaitable[None]]
CurrentGuard = Callable[[], bool]
CommitStep = Callable[[CurrentGuard], Awaitable[None]]
DeliveryObserver = Callable[[str, str, dict[str, Any] | None], None]


@dataclass(frozen=True, slots=True)
class Delivery:
    """Physical apply and generation-guarded success commit."""

    apply: AsyncStep
    commit: CommitStep | None = None
    is_current: CurrentGuard | None = None
    commit_key: Any = None


DeliveryResolver = Callable[[], Delivery | None]
RETRY_DELAYS = (2.0, 10.0)
FINAL_CONFIRMATION_DELAY = 5.0


class ClimateDeliveryCoordinator:
    """Serialize delivery and recover current intent without polling."""

    def __init__(
        self,
        hass: HomeAssistant,
        observer: DeliveryObserver | None = None,
    ) -> None:
        self._hass = hass
        self._generations: dict[str, int] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._tasks: dict[str, set[asyncio.Task[None]]] = {}
        self._owners: dict[str, asyncio.Task[object] | None] = {}
        self._pending_generations: dict[str, int] = {}
        self._last_cancelled_generation: dict[str, int] = {}
        self._eligible: dict[str, DeliveryResolver] = {}
        self._eligible_generations: dict[str, int] = {}
        self._availability_unsubs: dict[str, CALLBACK_TYPE] = {}
        self._last_available: dict[str, bool] = {}
        self._stopped = False
        self._observer = observer
        self._state_provider = hass.states.get
        self._entity_provider = lambda entity_id: [entity_id]
        self._target_valid = lambda _entity_id: True
        self._receipt_matcher = lambda _receipt: {"matches": True}
        self._receipt_confirmed = lambda _receipt: None
        self._receipts: dict[str, dict[str, dict[str, Any]]] = {}
        self._receipt_evidence: dict[str, dict[str, Any]] = {}
        self._accepted: dict[str, tuple[int, Any]] = {}
        self._retry_counts: dict[str, int] = {}
        self._confirmation_events: dict[str, asyncio.Event] = {}
        self._confirmation_deadlines: dict[str, asyncio.TimerHandle] = {}

    async def async_deliver(
        self,
        entity_id: str,
        resolver: DeliveryResolver,
        *,
        resilient: bool = True,
        recovery_resolver: DeliveryResolver | None = None,
    ) -> bool:
        """Attempt the newest intent once and arrange conservative recovery."""
        generation = self._replace(entity_id)
        if self._stopped:
            return False
        current_resolver = recovery_resolver or resolver
        if resilient:
            self._set_eligible(entity_id, generation, current_resolver)
        else:
            self._clear_eligibility(entity_id)
        self._pending_generations[entity_id] = generation
        try:
            outcome = await self._async_attempt(
                entity_id,
                generation,
                resolver,
                catch_recoverable=resilient,
            )
        except Exception:
            self._clear_eligibility(entity_id, generation)
            raise
        finally:
            if self._pending_generations.get(entity_id) == generation:
                self._pending_generations.pop(entity_id, None)
        if outcome == "success":
            self._observe(entity_id, "success", self._success_details(entity_id, 0))
            if resilient and entity_id in self._receipts:
                self._schedule_confirmation_deadline(entity_id, generation, current_resolver)
            return True
        if outcome == "cancelled":
            self._observe_cancelled_once(entity_id, generation)
            self._clear_eligibility(entity_id, generation)
            return False
        if outcome != "failed" or not resilient:
            return False
        self._spawn(
            entity_id,
            self._async_recover(entity_id, generation, current_resolver, outcome)
        )
        return False

    def cancel(self, entity_id: str) -> None:
        """Invalidate pending delivery for one entity."""
        self._replace(entity_id, reason="cancelled")
        self._clear_eligibility(entity_id)

    def retry_current(self, entity_id: str) -> bool:
        """Back off after a recoverable failure outside the base delivery."""
        resolver = self._eligible.get(entity_id)
        if resolver is None or self._stopped:
            return False
        generation = self._generations[entity_id]
        if entity_id in self._confirmation_deadlines or any(not task.done() for task in self._tasks.get(entity_id, ())):
            return True
        self._spawn(
            entity_id,
            self._async_recover(entity_id, generation, resolver, "failed")
        )
        return True

    def is_deferred(self, entity_id: str) -> bool:
        """Return whether a scheduler-owned intent remains eligible for recovery."""
        return entity_id in self._eligible and not self._stopped

    def register_current(self, entity_id: str, resolver: DeliveryResolver) -> bool:
        """Remember a restored intent without issuing an immediate physical call."""
        self._replace(entity_id)
        if self._stopped:
            return False
        self._set_eligible(entity_id, self._generations[entity_id], resolver)
        return True

    async def async_serialize(self, entity_id: str, step: AsyncStep) -> None:
        """Run one physical RA/restore step inside the entity delivery lock."""
        current = asyncio.current_task()
        if self._owners.get(entity_id) is current:
            await step()
            return
        async with self._locks.setdefault(entity_id, asyncio.Lock()):
            self._owners[entity_id] = current
            try:
                with capture_delivery_receipt() as receipt:
                    await step()
                resolver = self._eligible.get(entity_id)
                if receipt and resolver is not None and not self._stopped:
                    previous_acceptance = self._accepted.get(entity_id)
                    generation = self._replace(entity_id, notify=False)
                    self._eligible_generations[entity_id] = generation
                    self._accepted[entity_id] = (generation, previous_acceptance[1] if previous_acceptance else None)
                    self._set_receipt(entity_id, receipt)
                    self._observe(entity_id, "success", self._success_details(entity_id, 0))
                    if entity_id in self._receipts:
                        self._schedule_confirmation_deadline(entity_id, generation, resolver)
            finally:
                if self._owners.get(entity_id) is current:
                    self._owners.pop(entity_id, None)

    async def async_stop(self) -> None:
        """Cancel every pending delivery and prevent new attempts."""
        self._stopped = True
        for entity_id in (
            set(self._eligible)
            | set(self._tasks)
            | set(self._owners)
            | set(self._pending_generations)
            | set(self._confirmation_deadlines)
        ):
            if not self._has_active_work(entity_id):
                continue
            self._observe_cancelled_once(
                entity_id,
                self._generations.get(entity_id, 0),
                {"reason": "stopped"},
            )
        for entity_id in list(self._eligible):
            self._clear_eligibility(entity_id)
        tasks = [task for entity_tasks in self._tasks.values() for task in entity_tasks]
        self._tasks.clear()
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._receipts.clear()
        self._receipt_evidence.clear()
        self._confirmation_events.clear()
        self._accepted.clear()
        self._retry_counts.clear()
        for handle in self._confirmation_deadlines.values():
            handle.cancel()
        self._confirmation_deadlines.clear()

    def _replace(
        self,
        entity_id: str,
        *,
        reason: str = "replaced",
        notify: bool = True,
    ) -> int:
        if (
            notify
            and entity_id in self._generations
            and self._has_active_work(entity_id)
        ):
            self._observe_cancelled_once(
                entity_id,
                self._generations[entity_id],
                {"reason": reason},
            )
        generation = self._generations.get(entity_id, 0) + 1
        self._generations[entity_id] = generation
        self._cancel_confirmation_deadline(entity_id)
        self._receipts.pop(entity_id, None)
        self._receipt_evidence.pop(entity_id, None)
        self._confirmation_events.pop(entity_id, None)
        self._retry_counts.pop(entity_id, None)
        self._accepted.pop(entity_id, None)
        current = asyncio.current_task()
        for task in list(self._tasks.get(entity_id, ())):
            if task is not current:
                task.cancel()
        return generation

    def _has_active_work(self, entity_id: str) -> bool:
        """Return whether replacing the intent cancels actual delivery work."""
        tasks = self._tasks.get(entity_id, ())
        if any(not task.done() for task in tasks):
            return True
        if entity_id in self._confirmation_deadlines:
            return True
        if entity_id in self._owners:
            return True
        if entity_id in self._pending_generations:
            return True
        return entity_id in self._eligible and not self._is_available(entity_id)

    def _observe_cancelled_once(
        self,
        entity_id: str,
        generation: int,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Publish at most one cancellation event for a delivery generation."""
        if self._last_cancelled_generation.get(entity_id) == generation:
            return
        self._last_cancelled_generation[entity_id] = generation
        self._observe(entity_id, "cancelled", details)

    def _is_current(self, entity_id: str, generation: int) -> bool:
        return not self._stopped and self._generations.get(entity_id) == generation

    def _is_available(self, entity_id: str) -> bool:
        state = self._state_provider(entity_id)
        if state is None:
            return False
        state_value = getattr(state, "state", None)
        if state_value is None:
            return False
        return state_value not in (
            STATE_UNKNOWN,
            STATE_UNAVAILABLE,
        )

    async def _async_attempt(
        self,
        entity_id: str,
        generation: int,
        resolver: DeliveryResolver,
        *,
        catch_recoverable: bool = True,
        retry_count: int = 0,
    ) -> str:
        if not self._is_current(entity_id, generation):
            return "cancelled"
        if not self._is_available(entity_id):
            self._observe(
                entity_id,
                "unavailable",
                {"retry_count": retry_count},
            )
            return "unavailable"
        async with self._locks.setdefault(entity_id, asyncio.Lock()):
            if not self._is_current(entity_id, generation) or not self._target_valid(entity_id):
                return "cancelled"
            current = asyncio.current_task()
            self._owners[entity_id] = current
            try:
                delivery = resolver()
                if delivery is None:
                    return "cancelled"
                def is_current() -> bool:
                    return (
                        self._is_current(entity_id, generation)
                        and self._target_valid(entity_id)
                        and (delivery.is_current is None or delivery.is_current())
                    )

                try:
                    with delivery_guard(lambda: is_current() and self._is_available(entity_id)):
                        check_delivery()
                        with capture_delivery_receipt() as receipt:
                            await delivery.apply()
                except DeliverySuperseded:
                    if self._is_current(entity_id, generation) and not self._is_available(entity_id):
                        self._observe(entity_id, "unavailable", {"retry_count": retry_count})
                        return "unavailable"
                    return "cancelled"
                except asyncio.CancelledError:
                    raise
                except HomeAssistantError:
                    if not catch_recoverable:
                        self._observe(
                            entity_id,
                            "failed",
                            {
                                "message": "Home Assistant service call failed",
                                "retry_count": retry_count,
                            },
                        )
                        raise
                    _LOGGER.warning(
                        "Climate delivery failed for %s; recovery will re-resolve current intent",
                        entity_id,
                        exc_info=True,
                    )
                    self._observe(
                        entity_id,
                        "failed",
                        {
                            "message": "Home Assistant service call failed",
                            "retry_count": retry_count,
                        },
                    )
                    return "failed"
                if not is_current():
                    return "cancelled"
                acceptance_key = (generation, delivery.commit_key)
                already_accepted = self._accepted.get(entity_id) == acceptance_key
                self._accepted[entity_id] = acceptance_key
                self._set_receipt(entity_id, receipt)
                if delivery.commit is not None and not already_accepted:
                    try:
                        await delivery.commit(is_current)
                    except asyncio.CancelledError:
                        raise
                    except Exception:
                        _LOGGER.exception(
                            "Climate delivery side-effect commit failed for %s",
                            entity_id,
                        )
                return "success"
            finally:
                if self._owners.get(entity_id) is current:
                    self._owners.pop(entity_id, None)

    def _set_eligible(
        self,
        entity_id: str,
        generation: int,
        resolver: DeliveryResolver,
    ) -> None:
        """Remember current scheduler-owned intent and observe reconnections."""
        self._eligible[entity_id] = resolver
        self._eligible_generations[entity_id] = generation
        self._last_available[entity_id] = self._is_available(entity_id)
        if entity_id in self._availability_unsubs:
            return

        @callback
        def _state_changed(_event) -> None:
            had_receipt = entity_id in self._receipts
            event_data = getattr(_event, "data", {})
            old_state = event_data.get("old_state")
            new_state = event_data.get("new_state")
            if old_state is not None and new_state is not None and old_state.state == new_state.state:
                expected = self._receipts.get(entity_id, {}).get(event_data.get("entity_id"), {})
                if not any(old_state.attributes.get(field) != new_state.attributes.get(field)
                           for field in expected if field not in ("hvac_mode", "__not_off__")):
                    return
            available = self._is_available(entity_id)
            was_available = self._last_available.get(entity_id, available)
            self._last_available[entity_id] = available
            signal = self._confirmation_events.get(entity_id)
            if signal is not None:
                signal.set()
            has_recovery_task = any(not task.done() for task in self._tasks.get(entity_id, ()))
            # Until the first deadline, the existing listener owns confirmation.
            # An actual recovery worker owns comparisons while it is active.
            if not has_recovery_task and entity_id not in self._owners and entity_id in self._receipts:
                evidence = self._receipt_matcher(self._receipts[entity_id])
                if evidence["matches"]:
                    self._confirm(entity_id, evidence)
            member_recovered = (len(self._entity_provider(entity_id)) > 1
                and getattr(old_state, "state", "unavailable") in ("unknown", "unavailable")
                and getattr(new_state, "state", "unavailable") not in ("unknown", "unavailable"))
            if (available and (not was_available or member_recovered)
                and entity_id in self._eligible
                and not has_recovery_task
                and entity_id not in self._confirmation_deadlines
                and (not had_receipt or entity_id in self._receipts)):
                self._spawn(
                    entity_id,
                    self._async_redeliver_current(entity_id)
                )

        self._availability_unsubs[entity_id] = async_track_state_change_event(
            self._hass, self._entity_provider(entity_id), _state_changed
        )

    def _clear_eligibility(
        self,
        entity_id: str,
        expected_generation: int | None = None,
    ) -> bool:
        if (
            expected_generation is not None
            and self._eligible_generations.get(entity_id) != expected_generation
        ):
            return False
        self._eligible.pop(entity_id, None)
        self._cancel_confirmation_deadline(entity_id)
        self._receipt_evidence.pop(entity_id, None)
        self._accepted.pop(entity_id, None)
        self._retry_counts.pop(entity_id, None)
        self._receipts.pop(entity_id, None)
        self._confirmation_events.pop(entity_id, None)
        self._eligible_generations.pop(entity_id, None)
        self._last_available.pop(entity_id, None)
        unsub = self._availability_unsubs.pop(entity_id, None)
        if unsub is not None:
            unsub()
        return True

    def _spawn(self, entity_id: str, awaitable: Awaitable[None]) -> None:
        task = self._hass.async_create_task(awaitable)
        self._tasks.setdefault(entity_id, set()).add(task)

        def _done(completed: asyncio.Task[None]) -> None:
            tasks = self._tasks.get(entity_id)
            if tasks is None:
                return
            tasks.discard(completed)
            if not tasks:
                self._tasks.pop(entity_id, None)

        task.add_done_callback(_done)

    def _cancel_confirmation_deadline(self, entity_id: str) -> None:
        handle = self._confirmation_deadlines.pop(entity_id, None)
        if handle is not None:
            handle.cancel()

    def _schedule_confirmation_deadline(
        self, entity_id: str, generation: int, resolver: DeliveryResolver,
    ) -> None:
        """Let normal echoes confirm through the listener without a coroutine."""
        self._cancel_confirmation_deadline(entity_id)

        @callback
        def expired() -> None:
            if (not self._is_current(entity_id, generation)
                    or self._confirmation_deadlines.get(entity_id) is not handle):
                return
            self._confirmation_deadlines.pop(entity_id, None)
            receipt = self._receipts.get(entity_id)
            if receipt is None:
                return
            evidence = self._receipt_matcher(receipt)
            if evidence["matches"]:
                self._confirm(entity_id, evidence)
                return
            self._spawn(entity_id, self._async_recover(
                entity_id, generation, resolver, "pending", first_wait_elapsed=True,
            ))

        handle = asyncio.get_running_loop().call_later(RETRY_DELAYS[0] if RETRY_DELAYS else 0, expired)
        self._confirmation_deadlines[entity_id] = handle

    async def _async_redeliver_current(self, entity_id: str) -> None:
        """Apply the latest eligible intent after an availability transition."""
        resolver = self._eligible.get(entity_id)
        if resolver is None or self._stopped:
            return
        generation = self._replace(entity_id, notify=False)
        self._eligible_generations[entity_id] = generation
        try:
            outcome = await self._async_attempt(entity_id, generation, resolver)
        except Exception:
            self._clear_eligibility(entity_id, generation)
            _LOGGER.exception(
                "Current climate intent became invalid for %s", entity_id
            )
            self._observe(
                entity_id,
                "invalid_intent",
                {
                    "message": "Current intent could not be resolved",
                    "retry_count": 0,
                },
            )
            return
        if outcome == "success":
            self._observe(entity_id, "success", self._success_details(entity_id, 0))
            if entity_id in self._receipts and self._is_current(entity_id, generation):
                self._schedule_confirmation_deadline(entity_id, generation, resolver)
        elif outcome == "failed" and self._is_current(entity_id, generation):
            self._spawn(
                entity_id,
                self._async_recover(entity_id, generation, resolver, outcome)
            )

    def _set_receipt(self, entity_id: str, receipt: dict[str, dict[str, Any]]) -> None:
        """Keep only an accepted target which has yet to be observed."""
        self._receipts.pop(entity_id, None)
        evidence = self._receipt_matcher(receipt) if receipt else None
        if evidence is None:
            self._receipt_evidence.pop(entity_id, None)
        else:
            self._receipt_evidence[entity_id] = evidence
        if receipt and not evidence["matches"]:
            self._receipts[entity_id] = receipt
        elif receipt:
            self._receipt_confirmed(receipt)

    def _success_details(self, entity_id: str, retry_count: int) -> dict[str, Any]:
        details = {"retry_count": retry_count}
        evidence = self._receipt_evidence.get(entity_id)
        if evidence:
            details["confirmation"] = {**evidence, "status": "confirmed" if evidence["matches"] else "pending", "retry_count": retry_count}
        return details

    def _confirm(self, entity_id: str, evidence: dict[str, Any]) -> None:
        receipt = self._receipts.pop(entity_id, None)
        if receipt is None:
            return
        self._cancel_confirmation_deadline(entity_id)
        retries = self._retry_counts.get(entity_id, 0)
        self._receipt_evidence[entity_id] = evidence
        self._receipt_confirmed(receipt)
        self._observe(entity_id, "recovered" if retries else "confirmation_confirmed", {
            **evidence, "retry_count": retries,
        })

    async def _async_wait_confirmation(self, entity_id: str, generation: int, delay: float) -> bool:
        """Wait for existing state events within one fixed retry deadline."""
        deadline = asyncio.get_running_loop().time() + delay
        signal = self._confirmation_events.setdefault(entity_id, asyncio.Event())
        while self._is_current(entity_id, generation):
            receipt = self._receipts.get(entity_id)
            if receipt is None:
                return True
            evidence = self._receipt_matcher(receipt)
            if evidence["matches"]:
                self._confirm(entity_id, evidence)
                return True
            remaining = deadline - asyncio.get_running_loop().time()
            if remaining <= 0:
                return False
            signal.clear()
            try:
                await asyncio.wait_for(signal.wait(), remaining)
            except asyncio.TimeoutError:
                return False
        return True

    async def _async_recover(
        self, entity_id: str, generation: int, resolver: DeliveryResolver, outcome: str,
        *, first_wait_elapsed: bool = False,
    ) -> None:
        retry_index = self._retry_counts.get(entity_id, 0)
        try:
            while self._is_current(entity_id, generation):
                has_receipt = entity_id in self._receipts
                if self._accepted.get(entity_id, (None, None))[0] == generation and not has_receipt and outcome != "failed":
                    return
                if retry_index >= len(RETRY_DELAYS):
                    if has_receipt:
                        if await self._async_wait_confirmation(entity_id, generation, FINAL_CONFIRMATION_DELAY):
                            return
                        self._observe(entity_id, "unconfirmed", {
                            **self._receipt_matcher(self._receipts[entity_id]), "retry_count": retry_index,
                        })
                    else:
                        self._observe(entity_id, "exhausted", {"message": "Retry limit reached", "retry_count": retry_index})
                    return
                if has_receipt:
                    # State may have changed after the deadline queued this task.
                    # Revalidate before any retry without adding another wait.
                    delay = 0 if first_wait_elapsed else RETRY_DELAYS[retry_index]
                    first_wait_elapsed = False
                    if await self._async_wait_confirmation(entity_id, generation, delay):
                        return
                else:
                    await asyncio.sleep(RETRY_DELAYS[retry_index])
                if not self._is_current(entity_id, generation):
                    return
                # Unavailability is event driven and never consumes the retry budget.
                waited_for_availability = False
                while not self._is_available(entity_id):
                    waited_for_availability = True
                    signal = self._confirmation_events.setdefault(entity_id, asyncio.Event())
                    signal.clear()
                    await signal.wait()
                    if not self._is_current(entity_id, generation):
                        return
                if waited_for_availability and entity_id in self._receipts:
                    evidence = self._receipt_matcher(self._receipts[entity_id])
                    if evidence["matches"]:
                        self._confirm(entity_id, evidence)
                        return
                previous_receipt = self._receipts.get(entity_id)
                retry_index += 1
                self._retry_counts[entity_id] = retry_index
                self._observe(entity_id, "retrying", {"retry_count": retry_index})
                try:
                    outcome = await self._async_attempt(entity_id, generation, resolver, retry_count=retry_index)
                except Exception:
                    self._clear_eligibility(entity_id, generation)
                    _LOGGER.exception("Current climate intent became invalid for %s", entity_id)
                    self._observe(entity_id, "invalid_intent", {"message": "Current intent could not be resolved", "retry_count": retry_index})
                    return
                if outcome == "success":
                    evidence = self._receipt_evidence.get(entity_id)
                    if previous_receipt and evidence and evidence["matches"]:
                        self._observe(entity_id, "success", {"retry_count": retry_index})
                        self._observe(entity_id, "recovered", {**evidence, "retry_count": retry_index})
                        return
                    self._observe(entity_id, "success", self._success_details(entity_id, retry_index))
                    if entity_id not in self._receipts:
                        return
                elif outcome == "cancelled":
                    self._observe_cancelled_once(entity_id, generation)
                    self._clear_eligibility(entity_id, generation)
                    return
                elif outcome == "unavailable":
                    retry_index -= 1
        except asyncio.CancelledError:
            return

    def _observe(
        self,
        entity_id: str,
        status: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Publish best-effort evidence without changing delivery behavior."""
        if self._observer is None:
            return
        try:
            self._observer(entity_id, status, details)
        except Exception:
            _LOGGER.exception("Velair diagnostics observer failed")
