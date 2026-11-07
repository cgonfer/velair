"""Observe managed climates for control changes not initiated by Velair."""

from __future__ import annotations

import asyncio
from collections import deque
import logging
import math
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event

from .climate_manager import ClimateManager
from .execution import ExecutionAuthority
from .const import (
    ATTR_HVAC_MODE,
    ATTR_TARGET_TEMP_HIGH,
    ATTR_TARGET_TEMP_LOW,
    ATTR_TEMPERATURE,
)

_LOGGER = logging.getLogger(__name__)
_UNAVAILABLE = {"unknown", "unavailable"}
_TARGET_FIELDS = {ATTR_TEMPERATURE, ATTR_TARGET_TEMP_LOW, ATTR_TARGET_TEMP_HIGH}


class ClimateChangeMonitor:
    """Classify state changes using ClimateManager's ownership ledger."""

    def __init__(
        self,
        hass: HomeAssistant,
        entity_ids: list[str],
        climate_manager: ClimateManager,
        scheduler: Any,
        execution_authority: ExecutionAuthority | None = None,
    ) -> None:
        self._hass = hass
        self._entity_ids = entity_ids
        self._climate_manager = climate_manager
        self._scheduler = scheduler
        self._execution_authority = execution_authority
        self._unsubscribe = None
        self._tasks: set[asyncio.Task[Any]] = set()
        self._last_states = {}
        self._pending_changes = {}
        self._processing_tokens = {}
        self._queued_changes: dict[str, deque[dict[str, Any]]] = {}
        self._workers: dict[str, asyncio.Task[Any]] = {}
        self._latest_tokens: dict[str, object] = {}
        self._active = False

    def async_start(self) -> None:
        """Start listening without polling."""
        if self._unsubscribe is None:
            self._last_states = {entity: self._hass.states.get(entity) for entity in self._entity_ids}
            self._active = True
            self._scheduler.pending_external_change_fields = self.pending_external_fields
            self._unsubscribe = async_track_state_change_event(
                self._hass, self._entity_ids, self._handle_state_change
            )

    @callback
    def async_stop(self) -> None:
        """Stop listening."""
        if self._unsubscribe is not None:
            self._unsubscribe()
            self._unsubscribe = None
        for task in self._tasks:
            task.cancel()
        self._tasks.clear()
        self._active = False
        self._last_states.clear()
        self._pending_changes.clear()
        self._processing_tokens.clear()
        for queued in self._queued_changes.values():
            queued.clear()
        self._queued_changes.clear()
        self._workers.clear()
        self._latest_tokens.clear()

    def pending_external_fields(self, entity_id):
        """Read changes whose ownership listener or policy task is pending."""
        if not self._active:
            return set()
        try:
            token = self._processing_tokens.get(asyncio.current_task())
        except RuntimeError:
            token = None
        pending = set().union(*(fields for key, fields in
            self._pending_changes.get(entity_id, {}).items() if key is not token))
        old = self._last_states.get(entity_id)
        new = self._hass.states.get(entity_id)
        if old is None or new is None or old is new:
            return pending
        if old.state in _UNAVAILABLE or new.state in _UNAVAILABLE:
            return pending
        if self._execution_authority is not None and self._execution_authority.is_external(entity_id):
            return pending
        changed, _, _ = _control_change(old, new)
        if not changed:
            return pending
        owned = self._climate_manager.preview_owned_state_change_fields(entity_id, new, old)
        assist = getattr(self._scheduler, "room_sensor_assist_owned_state_change_fields", None)
        assisted = assist(entity_id, new) if callable(assist) else set()
        pending.update(self._external_fields(old, new, changed, owned, assisted))
        return pending

    def _external_fields(
        self, old_state, new_state, changed_fields, owned_fields, assisted_fields,
        *, event_context=None,
    ) -> list[str]:
        """Keep invalid Off placeholders out of both pending and processed input."""
        external = [field for field in changed_fields
                    if field not in owned_fields and field not in assisted_fields]
        if (
            not external
            or not set(external) <= _TARGET_FIELDS
            or new_state.state != "off"
            or (old_state.state != "off" and ATTR_HVAC_MODE not in owned_fields)
        ):
            return external
        for context in (getattr(new_state, "context", None), event_context):
            if context is not None and (
                getattr(context, "user_id", None) is not None
                or getattr(context, "parent_id", None) is not None
            ):
                return external
        attributes = new_state.attributes
        minimum, maximum = attributes.get("min_temp"), attributes.get("max_temp")
        values = [minimum, maximum, *(attributes.get(field) for field in external)]
        if not all(isinstance(value, int | float) and not isinstance(value, bool)
                   and math.isfinite(value) for value in values):
            return external
        # Only explicit device limits are evidence; adapter defaults are not.
        if minimum >= maximum or any(minimum <= value <= maximum for value in values[2:]):
            return external
        maintaining_off = getattr(self._scheduler, "is_maintaining_off", None)
        if callable(maintaining_off) and maintaining_off(new_state.entity_id):
            return []
        return external

    @callback
    def _handle_state_change(self, event: Any) -> None:
        old_state = event.data.get("old_state")
        new_state = event.data.get("new_state")
        entity_id = event.data.get("entity_id") or getattr(new_state, "entity_id", None)
        if isinstance(entity_id, str):
            self._last_states[entity_id] = new_state
        if old_state is None or new_state is None:
            return
        if (
            self._execution_authority is not None
            and self._execution_authority.is_external(new_state.entity_id)
        ):
            return
        if old_state.state in _UNAVAILABLE or new_state.state in _UNAVAILABLE:
            return
        changed_fields, previous, current = _control_change(old_state, new_state)
        if not changed_fields:
            return
        observed_snapshot = self._climate_manager.climate_state_snapshot_from_state(
            new_state.entity_id, new_state
        )
        owned_fields = self._climate_manager.owned_state_change_fields(
            new_state.entity_id, new_state, old_state
        )
        room_assist_owned_fields = set()
        room_assist_owned_state_change_fields = getattr(
            self._scheduler,
            "room_sensor_assist_owned_state_change_fields",
            None,
        )
        if callable(room_assist_owned_state_change_fields):
            room_assist_owned_fields = room_assist_owned_state_change_fields(
                new_state.entity_id,
                new_state,
            )
        external_fields = self._external_fields(
            old_state, new_state, changed_fields, owned_fields, room_assist_owned_fields,
            event_context=getattr(event, "context", None),
        )
        if not external_fields:
            return
        previous = {field: previous.get(field) for field in external_fields}
        current = {field: current.get(field) for field in external_fields}

        token = object()
        self._pending_changes.setdefault(new_state.entity_id, {})[token] = frozenset(external_fields)
        owner_for_entity = getattr(self._scheduler, "owner_for_entity", None)
        owner = (owner_for_entity(new_state.entity_id)
                 if callable(owner_for_entity) else new_state.entity_id)
        queued = self._queued_changes.get(owner)
        start_worker = queued is None
        if queued is None:
            # Reserve ownership before HA can eagerly start the worker. A
            # reentrant report from its first service call joins this queue.
            queued = deque()
            self._queued_changes[owner] = queued
        queued.append({
            "token": token, "entity_id": new_state.entity_id,
            "changed_fields": external_fields, "previous": previous,
            "current": current, "observed_snapshot": observed_snapshot,
            "change_context": _event_context_snapshot(event),
        })
        self._latest_tokens[owner] = token
        if not start_worker:
            return

        @callback
        def release_queue():
            if self._queued_changes.get(owner) is not queued:
                return
            # Cancellation retires this producer's remaining observations. Do
            # not leave an unowned queue or pending authority blocking later
            # reports, and never remove a replacement producer's queue.
            for change in queued:
                pending = self._pending_changes.get(change["entity_id"], {})
                pending.pop(change["token"], None)
                if not pending:
                    self._pending_changes.pop(change["entity_id"], None)
            queued.clear()
            self._queued_changes.pop(owner, None)
            self._latest_tokens.pop(owner, None)

        async def _async_process() -> None:
            task = asyncio.current_task()
            try:
                while queued:
                    change = queued.popleft()
                    current_token = change["token"]
                    self._processing_tokens[task] = current_token
                    arguments = {key: value for key, value in change.items()
                                 if key not in ("token", "entity_id", "change_context")}
                    if change["change_context"] is not None:
                        arguments["change_context"] = change["change_context"]
                    # Every report keeps its policy/evidence processing. Only
                    # obsolete physical keep-automatic corrections are skipped,
                    # after the scheduler acquires the logical zone lock.
                    arguments["reassert_if_current"] = (
                        lambda token=current_token: self._latest_tokens.get(owner) is token)
                    try:
                        await self._scheduler.async_handle_external_climate_change(
                            change["entity_id"], **arguments)
                    except Exception:
                        _LOGGER.exception(
                            "Failed to process external climate change for %s",
                            change["entity_id"],
                        )
                    finally:
                        self._processing_tokens.pop(task, None)
                        pending = self._pending_changes.get(change["entity_id"], {})
                        pending.pop(current_token, None)
                        if not pending:
                            self._pending_changes.pop(change["entity_id"], None)
                    if queued:
                        # Obsolete corrections can finish without I/O. Keep a
                        # long evidence queue from monopolizing the HA loop.
                        await asyncio.sleep(0)
            finally:
                self._processing_tokens.pop(task, None)
                release_queue()
                if self._workers.get(owner) is task:
                    self._workers.pop(owner, None)

        task = self._hass.async_create_task(_async_process())
        self._workers[owner] = task
        self._tasks.add(task)

        @callback
        def finished(completed):
            self._tasks.discard(completed)
            # A task cancelled before its first step never enters its finally.
            release_queue()
            if self._workers.get(owner) is completed:
                self._workers.pop(owner, None)

        task.add_done_callback(finished)


def _control_change(
    old_state: Any, new_state: Any
) -> tuple[list[str], dict[str, object], dict[str, object]]:
    """Project relevant HVAC mode and scalar/range setpoint changes."""
    old = _projection(old_state)
    new = _projection(new_state)
    changed = [key for key in new if old.get(key) != new.get(key)]
    changed.extend(key for key in old if key not in new)
    changed = list(dict.fromkeys(changed))
    return changed, {key: old.get(key) for key in changed}, {
        key: new.get(key) for key in changed
    }


def _projection(state: Any) -> dict[str, object]:
    result: dict[str, object] = {ATTR_HVAC_MODE: state.state}
    for key in (ATTR_TEMPERATURE, ATTR_TARGET_TEMP_LOW, ATTR_TARGET_TEMP_HIGH):
        value = state.attributes.get(key)
        if isinstance(value, int | float):
            result[key] = float(value)
    return result


def _event_context_snapshot(event: Any) -> dict[str, object] | None:
    """Return redaction-friendly Home Assistant context evidence."""
    context = getattr(event, "context", None)
    if context is None:
        return None
    snapshot = {
        "has_context_id": getattr(context, "id", None) is not None,
        "has_parent_id": getattr(context, "parent_id", None) is not None,
        "has_user_id": getattr(context, "user_id", None) is not None,
    }
    return snapshot if any(snapshot.values()) else None
