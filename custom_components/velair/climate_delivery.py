"""Event-driven, runtime-only delivery coordination for climate targets."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
import logging
from typing import Any

from homeassistant.core import CALLBACK_TYPE, HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_state_change_event

from .climate_manager import STATE_UNAVAILABLE, STATE_UNKNOWN

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


DeliveryResolver = Callable[[], Delivery | None]
RETRY_DELAYS = (2.0, 10.0)


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
            self._observe(entity_id, "success")
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
        generation = self._replace(entity_id)
        self._eligible_generations[entity_id] = generation
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
                await step()
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
        state = self._hass.states.get(entity_id)
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
    ) -> str:
        if not self._is_current(entity_id, generation):
            return "cancelled"
        if not self._is_available(entity_id):
            self._observe(entity_id, "unavailable")
            return "unavailable"
        async with self._locks.setdefault(entity_id, asyncio.Lock()):
            if not self._is_current(entity_id, generation):
                return "cancelled"
            current = asyncio.current_task()
            self._owners[entity_id] = current
            try:
                delivery = resolver()
                if delivery is None:
                    return "cancelled"
                try:
                    await delivery.apply()
                except asyncio.CancelledError:
                    raise
                except HomeAssistantError:
                    if not catch_recoverable:
                        raise
                    _LOGGER.warning(
                        "Climate delivery failed for %s; recovery will re-resolve current intent",
                        entity_id,
                        exc_info=True,
                    )
                    self._observe(
                        entity_id,
                        "failed",
                        {"message": "Home Assistant service call failed"},
                    )
                    return "failed"
                if not self._is_current(entity_id, generation):
                    return "cancelled"
                if delivery.commit is not None:
                    try:
                        await delivery.commit(
                            lambda: self._is_current(entity_id, generation)
                        )
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

        def _state_changed(_event) -> None:
            available = self._is_available(entity_id)
            was_available = self._last_available.get(entity_id, available)
            self._last_available[entity_id] = available
            if not was_available and available and entity_id in self._eligible:
                self._spawn(
                    entity_id,
                    self._async_redeliver_current(entity_id)
                )

        self._availability_unsubs[entity_id] = async_track_state_change_event(
            self._hass, [entity_id], _state_changed
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
                {"message": "Current intent could not be resolved"},
            )
            return
        if outcome == "success":
            self._observe(entity_id, "success")
        if outcome == "failed" and self._is_current(entity_id, generation):
            self._spawn(
                entity_id,
                self._async_recover(entity_id, generation, resolver, outcome)
            )

    async def _async_recover(
        self,
        entity_id: str,
        generation: int,
        resolver: DeliveryResolver,
        outcome: str,
    ) -> None:
        retry_index = 0
        try:
            while self._is_current(entity_id, generation):
                if retry_index >= len(RETRY_DELAYS):
                    self._observe(entity_id, "exhausted", {"message": "Retry limit reached"})
                    return
                await asyncio.sleep(RETRY_DELAYS[retry_index])
                retry_index += 1
                self._observe(entity_id, "retrying", {"retry_count": retry_index})
                try:
                    outcome = await self._async_attempt(
                        entity_id, generation, resolver
                    )
                except Exception:
                    self._clear_eligibility(entity_id, generation)
                    _LOGGER.exception(
                        "Current climate intent became invalid for %s", entity_id
                    )
                    self._observe(
                        entity_id,
                        "invalid_intent",
                        {"message": "Current intent could not be resolved"},
                    )
                    return
                if outcome != "failed":
                    if outcome == "success":
                        self._observe(entity_id, "success")
                    return
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
