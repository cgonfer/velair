"""Event-driven, runtime-only delivery coordination for climate targets."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime
import logging
import math
from time import monotonic
from typing import Any

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import (
    async_call_later,
    async_track_state_change_event,
)

from .climate_manager import STATE_UNAVAILABLE, STATE_UNKNOWN
from .const import HVAC_MODE_OFF

_LOGGER = logging.getLogger(__name__)

AsyncStep = Callable[[], Awaitable[None]]
CurrentGuard = Callable[[], bool]
CommitStep = Callable[[CurrentGuard], Awaitable[None]]
DeliveryObserver = Callable[[str, str, dict[str, Any] | None], None]
RequestedTargetResolver = Callable[[], dict[str, Any] | None]
OutcomeListener = Callable[[dict[str, Any]], None]
StaggerResolver = Callable[[], float | int | None]

DEFAULT_CONFIRM_TIMEOUT_SECONDS = 25.0
DEFAULT_CONFIRM_ATTEMPTS = 3
DEFAULT_CONFIRMATION_TEMPERATURE_STEP = 0.5
CONFIRMATION_TARGET_FIELDS = ("temperature", "target_temp_low", "target_temp_high")


@dataclass(frozen=True, slots=True)
class DeliveryConfirmation:
    """Opt-in readback confirmation for one accepted delivery sequence.

    ``requested`` is resolved when the watch starts, after the complete
    physical call sequence was accepted, so it describes what was actually
    sent (for example a Room Assist adjusted target). It returns a mapping
    with ``action`` (``set_temperature`` or ``turn_off``), an optional
    ``hvac_mode`` (``None`` means any non-off mode is acceptable), the scalar
    ``temperature`` or both ``target_temp_low``/``target_temp_high`` ends, and
    an optional ``step`` used for the half-step tolerance. Returning ``None``
    means there is nothing observable to confirm.
    """

    requested: RequestedTargetResolver
    timeout: float = DEFAULT_CONFIRM_TIMEOUT_SECONDS
    attempts: int = DEFAULT_CONFIRM_ATTEMPTS
    source: str | None = None
    on_outcome: OutcomeListener | None = None


@dataclass(frozen=True, slots=True)
class Delivery:
    """Physical apply and generation-guarded success commit."""

    apply: AsyncStep
    commit: CommitStep | None = None
    confirm: DeliveryConfirmation | None = None


@dataclass(slots=True)
class _ConfirmationWatch:
    """Runtime-only readback watch for one delivery generation."""

    generation: int
    attempt: int
    confirmation: DeliveryConfirmation
    requested: dict[str, Any]
    unsub_state: CALLBACK_TYPE | None = None
    cancel_timer: CALLBACK_TYPE | None = None


DeliveryResolver = Callable[[], Delivery | None]
RETRY_DELAYS = (2.0, 10.0)


class ClimateDeliveryCoordinator:
    """Serialize delivery and recover current intent without polling."""

    def __init__(
        self,
        hass: HomeAssistant,
        observer: DeliveryObserver | None = None,
        *,
        stagger_seconds: StaggerResolver | None = None,
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
        self._stagger_seconds = stagger_seconds
        self._stagger_lock: asyncio.Lock | None = None
        self._stagger_waiters: dict[str, asyncio.Future[None]] = {}
        self._last_sequence_start: float | None = None
        self._clock = monotonic
        self._confirmations: dict[str, dict[str, Any]] = {}
        self._confirmation_watches: dict[str, _ConfirmationWatch] = {}

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

    def confirmation_status(self, entity_id: str) -> dict[str, Any]:
        """Return the latest readback confirmation evidence for one entity."""
        status = self._confirmations.get(entity_id) or {}
        return {
            "outcome": status.get("outcome"),
            "attempts": int(status.get("attempts", 0) or 0),
            "confirmed_at": status.get("confirmed_at"),
            "last_attempt_at": status.get("last_attempt_at"),
        }

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
        for entity_id in list(self._confirmation_watches):
            self._cancel_confirmation(entity_id)
        for entity_id in list(self._stagger_waiters):
            self._release_stagger_waiter(entity_id)
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
        self._release_stagger_waiter(entity_id)
        self._cancel_confirmation(entity_id)
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
        confirm_attempt: int = 1,
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
                if not await self._async_wait_for_stagger_slot(entity_id, generation):
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
                self._observe(entity_id, "success")
                if delivery.confirm is not None and self._is_current(entity_id, generation):
                    self._start_confirmation(
                        entity_id, generation, delivery.confirm, confirm_attempt
                    )
                elif delivery.confirm is None:
                    self._confirmations.pop(entity_id, None)
                return "success"
            finally:
                if self._owners.get(entity_id) is current:
                    self._owners.pop(entity_id, None)

    def _current_stagger_seconds(self) -> float:
        """Return the configured cross-entity start gap, or zero."""
        if self._stagger_seconds is None:
            return 0.0
        try:
            value = float(self._stagger_seconds() or 0)
        except Exception:
            _LOGGER.exception("Velair delivery stagger setting could not be read")
            return 0.0
        return value if math.isfinite(value) and value > 0 else 0.0

    async def _async_wait_for_stagger_slot(self, entity_id: str, generation: int) -> bool:
        """Space the start of physical sequences across every managed entity.

        The stagger lock is always taken after the per-entity lock and never
        the other way round, so it cannot deadlock with ``async_serialize``.
        A generation superseded while waiting is dropped without executing.
        """
        gap = self._current_stagger_seconds()
        if gap <= 0:
            return self._is_current(entity_id, generation)
        if self._stagger_lock is None:
            self._stagger_lock = asyncio.Lock()
        async with self._stagger_lock:
            if not self._is_current(entity_id, generation):
                return False
            last_start = self._last_sequence_start
            wait = 0.0 if last_start is None else last_start + gap - self._clock()
            if wait > 0:
                waiter: asyncio.Future[None] = asyncio.get_running_loop().create_future()
                self._stagger_waiters[entity_id] = waiter
                try:
                    await asyncio.wait_for(waiter, timeout=wait)
                    return False
                except TimeoutError:
                    pass
                finally:
                    if self._stagger_waiters.get(entity_id) is waiter:
                        self._stagger_waiters.pop(entity_id, None)
                if not self._is_current(entity_id, generation):
                    return False
            self._last_sequence_start = self._clock()
            return True

    def _release_stagger_waiter(self, entity_id: str) -> None:
        """Wake a superseded stagger waiter so it can drop its obsolete work."""
        waiter = self._stagger_waiters.pop(entity_id, None)
        if waiter is not None and not waiter.done():
            waiter.set_result(None)

    def _start_confirmation(
        self,
        entity_id: str,
        generation: int,
        confirmation: DeliveryConfirmation,
        attempt: int,
    ) -> None:
        """Watch the entity until it reports the requested target, or times out."""
        self._cancel_confirmation(entity_id, clear_pending=False)
        try:
            requested = confirmation.requested()
        except Exception:
            _LOGGER.exception(
                "Velair could not describe the delivery to confirm for %s", entity_id
            )
            requested = None
        if not requested:
            self._confirmations.pop(entity_id, None)
            return
        status = self._confirmations.setdefault(entity_id, {})
        status.update(
            {
                "outcome": "pending",
                "attempts": attempt,
                "confirmed_at": None,
                "last_attempt_at": _now_iso(),
            }
        )
        watch = _ConfirmationWatch(generation, attempt, confirmation, dict(requested))
        self._confirmation_watches[entity_id] = watch
        self._observe(
            entity_id,
            "confirming",
            {
                "attempt": attempt,
                "attempts": max(1, int(confirmation.attempts)),
                "requested": _public_target(requested),
            },
        )
        if self._check_confirmation(entity_id, watch):
            return

        @callback
        def _state_changed(_event: Any) -> None:
            if self._confirmation_watches.get(entity_id) is not watch:
                return
            self._check_confirmation(entity_id, watch)

        @callback
        def _timed_out(_now: Any) -> None:
            if self._confirmation_watches.get(entity_id) is not watch:
                return
            watch.cancel_timer = None
            self._handle_confirmation_timeout(entity_id, watch)

        watch.unsub_state = async_track_state_change_event(
            self._hass, [entity_id], _state_changed
        )
        watch.cancel_timer = async_call_later(
            self._hass, max(0.0, float(confirmation.timeout)), _timed_out
        )

    def _check_confirmation(self, entity_id: str, watch: _ConfirmationWatch) -> bool:
        """Finish the watch as confirmed when the entity reports the target."""
        if not _target_converged(self._hass.states.get(entity_id), watch.requested):
            return False
        self._finish_confirmation(entity_id, watch, "confirmed")
        return True

    def _handle_confirmation_timeout(self, entity_id: str, watch: _ConfirmationWatch) -> None:
        """Re-send the current intent while attempts remain, else give up."""
        if self._check_confirmation(entity_id, watch):
            return
        resolver = self._eligible.get(entity_id)
        if (
            watch.attempt < max(1, int(watch.confirmation.attempts))
            and resolver is not None
            and self._is_current(entity_id, watch.generation)
        ):
            self._teardown_confirmation(entity_id, watch)
            self._spawn(
                entity_id,
                self._async_redeliver_current(
                    entity_id, confirm_attempt=watch.attempt + 1
                ),
            )
            return
        self._finish_confirmation(entity_id, watch, "unconfirmed")

    def _finish_confirmation(
        self,
        entity_id: str,
        watch: _ConfirmationWatch,
        outcome: str,
    ) -> None:
        self._teardown_confirmation(entity_id, watch)
        observed = _observed_target(self._hass.states.get(entity_id))
        requested = _public_target(watch.requested)
        status = self._confirmations.setdefault(entity_id, {})
        status.update(
            {
                "outcome": outcome,
                "attempts": watch.attempt,
                "confirmed_at": _now_iso() if outcome == "confirmed" else None,
            }
        )
        details = {
            "attempts": watch.attempt,
            "requested": requested,
            "observed": observed,
        }
        self._observe(entity_id, outcome, details)
        if watch.confirmation.on_outcome is None:
            return
        try:
            watch.confirmation.on_outcome(
                {
                    "entity_id": entity_id,
                    "outcome": outcome,
                    "attempts": watch.attempt,
                    "source": watch.confirmation.source,
                    "requested": requested,
                    "observed": observed,
                }
            )
        except Exception:
            _LOGGER.exception("Velair delivery outcome listener failed for %s", entity_id)

    def _teardown_confirmation(self, entity_id: str, watch: _ConfirmationWatch) -> None:
        if self._confirmation_watches.get(entity_id) is watch:
            self._confirmation_watches.pop(entity_id, None)
        unsub = watch.unsub_state
        watch.unsub_state = None
        if unsub is not None:
            try:
                unsub()
            except Exception:
                _LOGGER.exception("Velair confirmation listener cleanup failed")
        cancel_timer = watch.cancel_timer
        watch.cancel_timer = None
        if cancel_timer is not None:
            try:
                cancel_timer()
            except Exception:
                _LOGGER.exception("Velair confirmation timer cleanup failed")

    def _cancel_confirmation(self, entity_id: str, *, clear_pending: bool = True) -> None:
        """Drop a pending readback watch when its generation is superseded."""
        watch = self._confirmation_watches.get(entity_id)
        if watch is not None:
            self._teardown_confirmation(entity_id, watch)
        if not clear_pending:
            return
        status = self._confirmations.get(entity_id)
        if status is not None and status.get("outcome") == "pending":
            status["outcome"] = None

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

    async def _async_redeliver_current(
        self,
        entity_id: str,
        *,
        confirm_attempt: int = 1,
    ) -> None:
        """Apply the latest eligible intent after an availability transition."""
        resolver = self._eligible.get(entity_id)
        if resolver is None or self._stopped:
            return
        generation = self._replace(entity_id, notify=False)
        self._eligible_generations[entity_id] = generation
        try:
            outcome = await self._async_attempt(
                entity_id, generation, resolver, confirm_attempt=confirm_attempt
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
        if outcome == "failed" and self._is_current(entity_id, generation):
            self._spawn(
                entity_id,
                self._async_recover(
                    entity_id,
                    generation,
                    resolver,
                    outcome,
                    confirm_attempt=confirm_attempt,
                ),
            )

    async def _async_recover(
        self,
        entity_id: str,
        generation: int,
        resolver: DeliveryResolver,
        outcome: str,
        *,
        confirm_attempt: int = 1,
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
                        entity_id,
                        generation,
                        resolver,
                        confirm_attempt=confirm_attempt,
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


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _finite(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _confirmation_tolerance(requested: dict[str, Any], attributes: Any) -> float:
    """Return half of the entity's target step, the readback tolerance."""
    step = _finite(requested.get("step"))
    if step is None or step <= 0:
        step = _finite(attributes.get("target_temp_step")) if isinstance(attributes, dict) else None
    if step is None or step <= 0:
        step = DEFAULT_CONFIRMATION_TEMPERATURE_STEP
    return step / 2 + 1e-9


def _target_converged(state: Any, requested: dict[str, Any]) -> bool:
    """Return whether the reported state matches the requested target."""
    mode = getattr(state, "state", None)
    if not isinstance(mode, str) or mode in (STATE_UNKNOWN, STATE_UNAVAILABLE):
        return False
    if requested.get("action") == "turn_off":
        return mode == HVAC_MODE_OFF
    if mode == HVAC_MODE_OFF:
        return False
    hvac_mode = requested.get("hvac_mode")
    if hvac_mode is not None and mode != hvac_mode:
        return False
    attributes = getattr(state, "attributes", None)
    if not isinstance(attributes, dict):
        attributes = {}
    tolerance = _confirmation_tolerance(requested, attributes)
    for field in CONFIRMATION_TARGET_FIELDS:
        expected = _finite(requested.get(field))
        if expected is None:
            continue
        observed = _finite(attributes.get(field))
        if observed is None or abs(observed - expected) > tolerance:
            return False
    return True


def _observed_target(state: Any) -> dict[str, Any]:
    """Describe the control fields currently reported by the entity."""
    mode = getattr(state, "state", None)
    observed: dict[str, Any] = {"hvac_mode": mode if isinstance(mode, str) else None}
    attributes = getattr(state, "attributes", None)
    if isinstance(attributes, dict):
        for field in CONFIRMATION_TARGET_FIELDS:
            value = _finite(attributes.get(field))
            if value is not None:
                observed[field] = value
    return observed


def _public_target(requested: dict[str, Any]) -> dict[str, Any]:
    """Reduce the requested mapping to the fields worth publishing."""
    public: dict[str, Any] = {"hvac_mode": requested.get("hvac_mode")}
    if requested.get("action") == "turn_off":
        public["hvac_mode"] = HVAC_MODE_OFF
        return public
    for field in CONFIRMATION_TARGET_FIELDS:
        value = _finite(requested.get(field))
        if value is not None:
            public[field] = value
    return public
