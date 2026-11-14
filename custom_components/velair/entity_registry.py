"""Entity registry maintenance for Velair."""

from __future__ import annotations

from hashlib import sha256
import json

import attr

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
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


def zone_sensor_object_id(climate_entity_id: str, sensor_key: str) -> str:
    """Return a language-independent source for Home Assistant's ID generation."""
    return f"{climate_entity_id.partition('.')[2]}_{sensor_key}"


def _legacy_sensor_entity_id(hass, registry, item, candidate, reserved):
    """Use older Home Assistant device naming and native collision allocation."""
    if getattr(item, "has_entity_name", False) and getattr(item, "device_id", None):
        from homeassistant.helpers import device_registry as dr

        device = dr.async_get(hass).async_get(item.device_id)
        if device is not None and (device_name := device.name_by_user or device.name):
            candidate = f"{device_name} {candidate}"
    allocator = getattr(registry, "async_get_available_entity_id", None)
    if not callable(allocator):
        allocator = getattr(registry, "async_generate_entity_id", None)
    if not callable(allocator):
        raise ValueError("Native entity ID allocation is unavailable")
    try:
        return allocator("sensor", candidate, current_entity_id=item.entity_id,
                         reserved_entity_ids=reserved)
    except TypeError:
        # Older allocators do not accept a reservation set. The preview still
        # rejects duplicate proposals before any selected IDs can be written.
        return allocator("sensor", candidate, current_entity_id=item.entity_id)


@callback
def preview_sensor_entity_ids(hass: HomeAssistant, entry: ConfigEntry) -> dict:
    """Preview owned registered zone sensors without changing registry entries."""
    from .config_helpers import get_configured_climate_entities

    registry = er.async_get(hass)
    climates = sorted(get_configured_climate_entities(entry))
    expected = {
        _zone_sensor_unique_id(entry.entry_id, climate, key): (climate, key)
        for climate in climates
        for key in ZONE_SENSOR_UNIQUE_ID_SUFFIXES
    }
    rows = []
    reserved: set[str] = set()
    registry_snapshot = []
    occupied_ids = sorted(registry.entities)
    for entity_id, item in sorted(registry.entities.items()):
        if (not entity_id.startswith("sensor.")
                or item.config_entry_id != entry.entry_id
                or item.platform != DOMAIN
                or item.unique_id not in expected):
            continue
        registry_snapshot.append((entity_id, {
            field: getattr(item, field, None)
            for field in ("unique_id", "config_entry_id", "platform", "name",
                          "original_name", "object_id_base", "suggested_object_id",
                          "has_entity_name", "device_id", "area_id", "disabled_by")
        }))
        climate, key = expected[item.unique_id]
        candidate = zone_sensor_object_id(climate, key)
        proposed = entity_id
        status = "conflict"
        regenerate = getattr(registry, "async_regenerate_entity_id", None)
        try:
            fields = {field.name for field in attr.fields(type(item))} if attr.has(type(item)) else set()
            if callable(regenerate) and "object_id_base" in fields:
                changes = {"object_id_base": candidate, "name": None}
                if "suggested_object_id" in fields:
                    changes["suggested_object_id"] = None
                proposed = regenerate(attr.evolve(item, **changes), reserved_entity_ids=reserved)
            else:
                proposed = _legacy_sensor_entity_id(hass, registry, item, candidate, reserved)
            if (isinstance(proposed, str) and proposed.startswith("sensor.")
                    and proposed not in reserved
                    and (proposed == entity_id or proposed not in registry.entities)):
                status = "unchanged" if proposed == entity_id else "ready"
        except (AttributeError, TypeError, ValueError):
            # Older HA versions cannot reproduce the new native naming policy.
            # Keep their rows visible but do not offer an inaccurate rename.
            proposed = entity_id
        if status != "conflict":
            reserved.add(proposed)
        rows.append({
            "entity_id": entity_id,
            "proposed_entity_id": proposed,
            "climate_entity_id": climate,
            "sensor_key": key,
            "name": getattr(item, "name", None) or getattr(item, "original_name", None) or entity_id,
            "status": status,
        })
    fingerprint = {
        "entry_id": entry.entry_id,
        "climates": climates,
        "config": [entry.data, entry.options],
        "registry": registry_snapshot,
        "occupied_ids": occupied_ids,
        "rows": rows,
    }
    return {
        "preview_id": sha256(json.dumps(fingerprint, sort_keys=True, default=str).encode()).hexdigest(),
        "rows": rows,
    }


@callback
def apply_sensor_entity_ids(hass: HomeAssistant, entry: ConfigEntry,
                            preview_id: str, entity_ids: list[str]) -> dict:
    """Validate a fresh plan, then rename selected entries in one event-loop turn."""
    preview = preview_sensor_entity_ids(hass, entry)
    if preview_id != preview["preview_id"]:
        raise ValueError("sensor_entity_ids_stale")
    by_id = {row["entity_id"]: row for row in preview["rows"]}
    if (not entity_ids or len(set(entity_ids)) != len(entity_ids)
            or any(entity_id not in by_id or by_id[entity_id]["status"] != "ready"
                   for entity_id in entity_ids)):
        raise ValueError("invalid_sensor_entity_ids")
    registry = er.async_get(hass)
    identities = {
        entity_id: registry.entities[entity_id].unique_id
        for entity_id in entity_ids
    }

    def current_id(old_entity_id):
        return next((entity_id for entity_id, item in registry.entities.items()
                     if entity_id.startswith("sensor.")
                     and item.unique_id == identities[old_entity_id]
                     and item.config_entry_id == entry.entry_id
                     and item.platform == DOMAIN), None)

    attempted = []
    failed = []
    for entity_id in entity_ids:
        proposed = by_id[entity_id]["proposed_entity_id"]
        attempted.append(entity_id)
        try:
            registry.async_update_entity(entity_id, new_entity_id=proposed)
        except Exception:  # Registry errors must trigger best-effort rollback.
            failed.append({"entity_id": entity_id, "code": "rename_failed", "message": "The entity ID could not be changed"})
            # A registry listener may raise after the rename was committed, so
            # inspect identity instead of assuming an exception means no change.
            for old_entity_id in reversed(attempted):
                actual_id = current_id(old_entity_id)
                if actual_id is None:
                    failed.append({"entity_id": old_entity_id, "code": "rollback_failed", "message": "The sensor registry entry could not be found"})
                    continue
                if actual_id == old_entity_id:
                    continue
                try:
                    registry.async_update_entity(actual_id, new_entity_id=old_entity_id)
                except Exception:
                    failed.append({"entity_id": actual_id, "code": "rollback_failed", "message": "The previous entity ID could not be restored"})
            break
    # Report the actual surviving renames, including unsuccessful rollbacks.
    renamed = [
        {"old_entity_id": entity_id, "new_entity_id": actual_id}
        for entity_id in entity_ids
        if (actual_id := current_id(entity_id)) is not None and actual_id != entity_id
    ]
    return {
        "status": ("recovery_required" if renamed or any(current_id(entity_id) is None for entity_id in entity_ids) else "rolled_back") if failed else "applied",
        "renamed": renamed,
        "failed": failed,
        "preview": preview_sensor_entity_ids(hass, entry),
    }
