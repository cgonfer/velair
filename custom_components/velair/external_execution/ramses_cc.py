"""ramses_cc/Evohome weekly schedule provider."""

from __future__ import annotations

import json
from typing import Any

from homeassistant.const import ATTR_ENTITY_ID, UnitOfTemperature

from ..const import (
    ACTION_SET_TEMPERATURE,
    ATTR_FAN_MODE,
    ATTR_HUMIDITY,
    ATTR_PRESET_MODE,
    ATTR_SWING_HORIZONTAL_MODE,
    ATTR_SWING_MODE,
)
from ..models import WEEKDAYS
from ..temperature import absolute_temperature
from .models import ExternalScheduleCapabilities

DOMAIN = "ramses_cc"
SET_SCHEDULE_SERVICE = "set_zone_schedule"
OPTION_FIELDS = {
    ATTR_FAN_MODE,
    ATTR_HUMIDITY,
    ATTR_PRESET_MODE,
    ATTR_SWING_HORIZONTAL_MODE,
    ATTR_SWING_MODE,
}


class RamsesCcScheduleProvider:
    """Publish compatible Velair schedules through ramses_cc services only."""

    key = DOMAIN
    capabilities = ExternalScheduleCapabilities(
        provider=DOMAIN,
        name="Evohome via ramses_cc",
        implicit_midnight_change_counts_toward_limit=True,
    )

    def __init__(self, hass: Any) -> None:
        self._hass = hass

    def compatible_entities(self, managed_entities: list[str]) -> list[str]:
        """Return conservatively detected loaded ramses climate entities."""
        services = getattr(self._hass, "services", None)
        if services is None or not services.has_service(DOMAIN, SET_SCHEDULE_SERVICE):
            return []
        try:
            from homeassistant.helpers import entity_registry as er

            registry = er.async_get(self._hass)
        except (ImportError, AttributeError):
            return []

        compatible: list[str] = []
        for entity_id in managed_entities:
            entry = registry.async_get(entity_id)
            if entry is None or getattr(entry, "platform", None) != DOMAIN:
                continue
            if not self._config_entry_loaded(getattr(entry, "config_entry_id", None)):
                continue
            state = self._hass.states.get(entity_id)
            attrs = state.attributes if state is not None else {}
            modes = attrs.get("hvac_modes", [])
            features = int(attrs.get("supported_features", 0) or 0)
            if "heat" not in modes or not features & 1:
                continue
            compatible.append(entity_id)
        return compatible

    def _config_entry_loaded(self, entry_id: str | None) -> bool:
        if not entry_id:
            return False
        entry = self._hass.config_entries.async_get_entry(entry_id)
        if entry is None:
            return False
        state = getattr(entry, "state", None)
        return getattr(state, "value", state) == "loaded"

    async def async_publish(
        self,
        entity_id: str,
        schedule: dict[str, list[dict[str, Any]]],
        temperature_unit: str,
    ) -> None:
        """Upload one full weekly schedule with a blocking HA service call."""
        payload = translate_weekly_schedule(schedule, temperature_unit)
        # ramses_cc accepts either its schedule object or JSON text depending on
        # version; the entity service schema currently exposes the latter.
        await self._hass.services.async_call(
            DOMAIN,
            SET_SCHEDULE_SERVICE,
            {ATTR_ENTITY_ID: entity_id, "schedule": json.dumps(payload)},
            blocking=True,
        )


def translate_weekly_schedule(
    schedule: dict[str, list[dict[str, Any]]],
    temperature_unit: str,
) -> list[dict[str, Any]]:
    """Translate losslessly to the Evohome seven-day heating schedule."""
    converted: dict[str, list[dict[str, Any]]] = {}
    last_temperature: float | None = None
    for day in reversed(WEEKDAYS):
        for block in reversed(schedule.get(day, [])):
            if block.get("action", ACTION_SET_TEMPERATURE) == ACTION_SET_TEMPERATURE:
                value = block.get("temperature")
                if isinstance(value, int | float):
                    last_temperature = float(value)
                    break
        if last_temperature is not None:
            break
    if last_temperature is None:
        raise ValueError("External schedules require at least one temperature block")

    for day in WEEKDAYS:
        switchpoints: list[dict[str, Any]] = []
        blocks = schedule.get(day, [])
        if not isinstance(blocks, list):
            raise ValueError(f"Invalid {day} schedule")
        if not blocks or blocks[0].get("start") != "00:00":
            switchpoints.append(_switchpoint("00:00", last_temperature, temperature_unit))
        for block in blocks:
            start = str(block.get("start", ""))
            if block.get("temperature_only") is True:
                raise ValueError("External schedules do not support temperature-only blocks")
            try:
                hour, minute = (int(part) for part in start.split(":"))
            except (TypeError, ValueError) as err:
                raise ValueError(f"Invalid schedule time on {day}: {start}") from err
            if hour not in range(24) or minute not in range(60) or minute % 5:
                raise ValueError(f"{day} {start} is not on the required 5-minute grid")
            if block.get("action", ACTION_SET_TEMPERATURE) != ACTION_SET_TEMPERATURE:
                raise ValueError("External schedules do not support turn-off blocks")
            if "target_temp_low" in block or "target_temp_high" in block:
                raise ValueError("External schedules require scalar temperatures")
            if block.get("hvac_mode") not in (None, "heat"):
                raise ValueError("External schedules support only heating mode")
            if any(field in block for field in OPTION_FIELDS):
                raise ValueError("External schedules do not support climate options")
            value = block.get("temperature")
            if not isinstance(value, int | float):
                raise ValueError(f"Missing scalar temperature on {day} at {start}")
            last_temperature = float(value)
            switchpoints.append(_switchpoint(start, last_temperature, temperature_unit))
        if len(switchpoints) > 6:
            raise ValueError(f"{day} exceeds the 6-switchpoint external limit")
        converted[day] = switchpoints

    return [
        {"day_of_week": index, "switchpoints": converted[day]}
        for index, day in enumerate(WEEKDAYS)
    ]


def _switchpoint(start: str, temperature: float, unit: str) -> dict[str, Any]:
    celsius = absolute_temperature(
        temperature,
        unit,
        UnitOfTemperature.CELSIUS,
    )
    return {"time_of_day": start, "heat_setpoint": round(celsius, 2)}
