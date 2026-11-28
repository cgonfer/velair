"""Config entry helpers for Velair."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP, CONF_CLIMATE_ENTITIES, DOMAIN


def get_configured_climate_entities(entry: ConfigEntry) -> list[str]:
    """Return configured climate entities from options or initial data."""
    return list(
        entry.options.get(
            CONF_CLIMATE_ENTITIES,
            entry.data.get(CONF_CLIMATE_ENTITIES, []),
        )
    )


def velair_climate_entity_ids(hass: HomeAssistant) -> list[str]:
    """Find Velair climates by registry ownership, even when renamed or disabled."""
    from homeassistant.helpers import entity_registry as er

    return sorted(item.entity_id for item in er.async_get(hass).entities.values()
                  if item.domain == "climate" and item.platform == DOMAIN)


def should_apply_active_schedule_on_startup(entry: ConfigEntry) -> bool:
    """Return whether Velair should apply active schedules after startup."""
    return bool(
        entry.options.get(
            CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP,
            entry.data.get(CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP, False),
        )
    )
