"""Observe managed climates for control changes not initiated by Velair."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event

from .climate_manager import ClimateManager
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
    ) -> None:
        self._hass = hass
        self._entity_ids = entity_ids
        self._climate_manager = climate_manager
        self._scheduler = scheduler
        self._unsubscribe = None
        self._tasks: set[asyncio.Task[Any]] = set()

    def async_start(self) -> None:
        """Start listening without polling."""
        if self._unsubscribe is None:
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

    @callback
    def _handle_state_change(self, event: Any) -> None:
        old_state = event.data.get("old_state")
        new_state = event.data.get("new_state")
        if old_state is None or new_state is None:
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
        external_fields = [
            field for field in changed_fields if field not in owned_fields
        ]
        if not external_fields:
            return
        previous = {field: previous.get(field) for field in external_fields}
        current = {field: current.get(field) for field in external_fields}

        async def _async_process() -> None:
            try:
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
