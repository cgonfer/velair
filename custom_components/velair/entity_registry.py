"""Entity registry maintenance for Velair."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN, ZONE_SENSOR_UNIQUE_ID_SUFFIXES


def cleanup_entity_registry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    climate_entities: list[str],
) -> None:
    """Remove retired controls and sensors for climates no longer managed."""
    registry = er.async_get(hass)
    _migrate_mode_select(registry, entry.entry_id)
    expected_zone_unique_ids = {
        _zone_sensor_unique_id(entry.entry_id, entity_id, suffix)
        for entity_id in climate_entities
        for suffix in ZONE_SENSOR_UNIQUE_ID_SUFFIXES
    }
    zone_prefix = f"{entry.entry_id}_climate_"
    zone_suffixes = tuple(
        f"_{suffix}"
        for suffix in ZONE_SENSOR_UNIQUE_ID_SUFFIXES
    )

    for entity_id, registry_entry in list(registry.entities.items()):
        if (
            registry_entry.config_entry_id != entry.entry_id
            or registry_entry.platform != DOMAIN
        ):
            continue

        unique_id = registry_entry.unique_id
        if (
            entity_id.startswith("sensor.")
            and unique_id.startswith(zone_prefix)
            and unique_id.endswith(zone_suffixes)
            and unique_id not in expected_zone_unique_ids
        ):
            registry.async_remove(entity_id)

    legacy_select = registry.async_get_entity_id(
        "select",
        DOMAIN,
        f"{entry.entry_id}_scheduler_mode",
    )
    if legacy_select is not None:
        registry.async_remove(legacy_select)


def _migrate_mode_select(registry: er.EntityRegistry, entry_id: str) -> None:
    """Migrate the unpublished mode select while preserving custom entity IDs."""
    old_unique_id = f"{entry_id}_profile_mode"
    entity_id = registry.async_get_entity_id("select", DOMAIN, old_unique_id)
    if entity_id is None:
        return

    changes: dict[str, str] = {"new_unique_id": f"{entry_id}_mode"}
    if entity_id == "select.velair_profile_mode":
        changes["new_entity_id"] = "select.velair_mode"
    registry.async_update_entity(entity_id, **changes)


def _zone_sensor_unique_id(
    entry_id: str,
    climate_entity_id: str,
    suffix: str,
) -> str:
    """Return the deterministic unique ID for one zone sensor."""
    zone_key = climate_entity_id.replace(".", "_")
    return f"{entry_id}_{zone_key}_{suffix}"
