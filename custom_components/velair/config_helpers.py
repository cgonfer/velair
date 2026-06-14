"""Config entry helpers for Velair."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry

from .const import CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP, CONF_CLIMATE_ENTITIES


def get_configured_climate_entities(entry: ConfigEntry) -> list[str]:
    """Return configured climate entities from options or initial data."""
    return list(
        entry.options.get(
            CONF_CLIMATE_ENTITIES,
            entry.data.get(CONF_CLIMATE_ENTITIES, []),
        )
    )


def should_apply_active_schedule_on_startup(entry: ConfigEntry) -> bool:
    """Return whether Velair should apply active schedules after startup."""
    return bool(
        entry.options.get(
            CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP,
            entry.data.get(CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP, False),
        )
    )
