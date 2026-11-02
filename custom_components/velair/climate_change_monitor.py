"""Observe managed climates for control changes not initiated by Velair."""

from __future__ import annotations

import asyncio
import logging
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
        pending.update(field for field in changed if field not in owned and field not in assisted)
        return pending

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
        external_fields = [
            field
            for field in changed_fields
            if field not in owned_fields and field not in room_assist_owned_fields
        ]
        if not external_fields:
            return
        previous = {field: previous.get(field) for field in external_fields}
        current = {field: current.get(field) for field in external_fields}

        token = object()
        self._pending_changes.setdefault(new_state.entity_id, {})[token] = frozenset(external_fields)

        async def _async_process() -> None:
            task = asyncio.current_task()
            self._processing_tokens[task] = token
            try:
                context_snapshot = _event_context_snapshot(event)
                if context_snapshot is not None:
                    await self._scheduler.async_handle_external_climate_change(
                        new_state.entity_id,
                        changed_fields=external_fields,
                        previous=previous,
                        current=current,
                        observed_snapshot=observed_snapshot,
                        change_context=context_snapshot,
                    )
                else:
                    await self._scheduler.async_handle_external_climate_change(
                        new_state.entity_id,
                        changed_fields=external_fields,
                        previous=previous,
                        current=current,
                        observed_snapshot=observed_snapshot,
                    )
            except Exception:
                _LOGGER.exception(
                    "Failed to process external climate change for %s",
                    new_state.entity_id,
                )

            finally:
                self._processing_tokens.pop(task, None)
                pending = self._pending_changes.get(new_state.entity_id, {})
                pending.pop(token, None)
                if not pending:
                    self._pending_changes.pop(new_state.entity_id, None)

        task = self._hass.async_create_task(_async_process())
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)


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
