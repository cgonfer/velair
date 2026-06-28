"""Climate service adapter."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant

from .const import (
    ATTR_HVAC_MODE,
    ATTR_TEMPERATURE,
    HVAC_MODE_OFF,
)

CLIMATE_DOMAIN = "climate"
CLIMATE_SERVICE_SET_HVAC_MODE = "set_hvac_mode"
CLIMATE_SERVICE_SET_TEMPERATURE = "set_temperature"
CLIMATE_SERVICE_TURN_OFF = "turn_off"
CLIMATE_SERVICE_TURN_ON = "turn_on"

_LOGGER = logging.getLogger(__name__)

DEFAULT_MIN_TEMPERATURE = 5.0
DEFAULT_MAX_TEMPERATURE = 35.0
STATE_UNAVAILABLE = "unavailable"
STATE_UNKNOWN = "unknown"


class ClimateManager:
    """Apply target temperatures through Home Assistant climate services."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the climate manager."""
        self._hass = hass

    async def async_set_temperature(
        self,
        entity_id: str,
        temperature: float,
        *,
        blocking: bool = False,
        ensure_on: bool = False,
        hvac_mode: str | None = None,
    ) -> None:
        """Set the target temperature for a climate entity."""
        if hvac_mode is not None:
            await self.async_set_hvac_mode(entity_id, hvac_mode)
        elif ensure_on:
            await self.async_ensure_on(entity_id, hvac_mode=hvac_mode)

        await self._hass.services.async_call(
            CLIMATE_DOMAIN,
            CLIMATE_SERVICE_SET_TEMPERATURE,
            {
                ATTR_ENTITY_ID: entity_id,
                ATTR_TEMPERATURE: temperature,
            },
            blocking=blocking,
        )

    def climate_state_snapshot(self, entity_id: str) -> dict[str, Any]:
        """Return the restorable climate state for an entity."""
        state = self._hass.states.get(entity_id)
        if state is None:
            return {}

        if state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return {}

        snapshot: dict[str, Any] = {}
        snapshot[ATTR_HVAC_MODE] = state.state

        try:
            temperature = float(state.attributes[ATTR_TEMPERATURE])
        except (KeyError, TypeError, ValueError):
            temperature = None
        if temperature is not None:
            snapshot[ATTR_TEMPERATURE] = temperature

        return snapshot

    async def async_restore_state(
        self,
        entity_id: str,
        snapshot: dict[str, Any],
    ) -> None:
        """Restore a climate entity from a stored state snapshot."""
        hvac_mode = snapshot.get(ATTR_HVAC_MODE)
        temperature = snapshot.get(ATTR_TEMPERATURE)

        if hvac_mode == HVAC_MODE_OFF:
            await self.async_turn_off(entity_id)
            return

        if temperature is not None:
            await self.async_set_temperature(
                entity_id,
                float(temperature),
                ensure_on=hvac_mode is not None,
                hvac_mode=hvac_mode,
            )
            return

        if hvac_mode is not None:
            await self.async_set_hvac_mode(entity_id, str(hvac_mode))

    async def async_ensure_on(
        self,
        entity_id: str,
        *,
        hvac_mode: str | None = None,
    ) -> None:
        """Ensure a climate entity is not off before setting temperature."""
        state = self._hass.states.get(entity_id)
        if state is None or state.state != HVAC_MODE_OFF:
            return

        target_mode = hvac_mode or self._resolve_first_non_off_hvac_mode(entity_id)
        if target_mode is None:
            await self._hass.services.async_call(
                CLIMATE_DOMAIN,
                CLIMATE_SERVICE_TURN_ON,
                {ATTR_ENTITY_ID: entity_id},
                blocking=True,
            )
            return

        await self.async_set_hvac_mode(entity_id, target_mode)

    async def async_set_hvac_mode(self, entity_id: str, hvac_mode: str) -> None:
        """Set a climate entity HVAC mode."""
        _LOGGER.debug("Setting %s HVAC mode to %s", entity_id, hvac_mode)
        await self._hass.services.async_call(
            CLIMATE_DOMAIN,
            CLIMATE_SERVICE_SET_HVAC_MODE,
            {
                ATTR_ENTITY_ID: entity_id,
                ATTR_HVAC_MODE: hvac_mode,
            },
            blocking=True,
        )

    async def async_turn_off(self, entity_id: str) -> None:
        """Turn off a climate entity."""
        state = self._hass.states.get(entity_id)
        supported_modes = state.attributes.get("hvac_modes") if state is not None else None
        if isinstance(supported_modes, list) and HVAC_MODE_OFF in supported_modes:
            await self.async_set_hvac_mode(entity_id, HVAC_MODE_OFF)
            return

        _LOGGER.debug("Turning off %s", entity_id)
        await self._hass.services.async_call(
            CLIMATE_DOMAIN,
            CLIMATE_SERVICE_TURN_OFF,
            {ATTR_ENTITY_ID: entity_id},
            blocking=True,
        )

    def _resolve_first_non_off_hvac_mode(self, entity_id: str) -> str | None:
        """Resolve the first supported HVAC mode that is not off."""
        state = self._hass.states.get(entity_id)
        if state is None:
            return None

        supported_modes = state.attributes.get("hvac_modes")
        if not isinstance(supported_modes, list):
            return None

        return next(
            (
                mode
                for mode in supported_modes
                if isinstance(mode, str) and mode != HVAC_MODE_OFF
            ),
            None,
        )

    def temperature_limits(self, entity_id: str) -> tuple[float, float]:
        """Return a climate entity target temperature range."""
        state = self._hass.states.get(entity_id)
        attributes = state.attributes if state is not None else {}
        min_temperature = _coerce_temperature(
            attributes.get("min_temp"),
            DEFAULT_MIN_TEMPERATURE,
        )
        max_temperature = _coerce_temperature(
            attributes.get("max_temp"),
            DEFAULT_MAX_TEMPERATURE,
        )

        if min_temperature >= max_temperature:
            return DEFAULT_MIN_TEMPERATURE, DEFAULT_MAX_TEMPERATURE

        return min_temperature, max_temperature

    def supported_hvac_modes(self, entity_id: str) -> list[str]:
        """Return supported HVAC modes for one climate entity."""
        state = self._hass.states.get(entity_id)
        supported_modes = state.attributes.get("hvac_modes") if state is not None else None
        if not isinstance(supported_modes, list):
            return []

        return [mode for mode in supported_modes if isinstance(mode, str)]


def _coerce_temperature(value: object, fallback: float) -> float:
    """Return a valid numeric temperature."""
    try:
        temperature = float(value)
    except (TypeError, ValueError):
        return fallback

    return temperature
