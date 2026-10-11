"""Pure resolution of reusable climate settings and linked template hours."""
from __future__ import annotations

from copy import deepcopy
from math import isfinite
from typing import Any
from uuid import uuid4

from .models import WEEKDAYS, normalize_schedule_blocks, normalize_start_time


class ConfigurationResourceError(ValueError):
    """A reference cannot safely be resolved."""

    def __init__(self, code: str, message: str, usages: list | None = None):
        super().__init__(message)
        self.code = code
        self.usages = usages or []
        self.details = {"usages": self.usages}


PRESET_CONFIG_FIELDS = frozenset({
    "temperature", "target_temp_low", "target_temp_high", "hvac_mode",
    "fan_mode", "preset_mode", "swing_mode", "swing_horizontal_mode", "humidity",
})


def validate_preset_update_request(operation, fields, clear_fields=()) -> None:
    """Reject ambiguous automation requests before merging stored settings."""
    if operation not in ("update", "replace") or not isinstance(fields, dict):
        raise ValueError("Use update or replace for the preset operation")
    if set(fields) - (PRESET_CONFIG_FIELDS | {"action"}):
        raise ValueError("Unsupported preset configuration fields")
    if not isinstance(clear_fields, (list, tuple)) or any(not isinstance(field, str) or field not in PRESET_CONFIG_FIELDS for field in clear_fields):
        raise ValueError("clear_fields must contain climate configuration fields")
    if len(set(clear_fields)) != len(clear_fields) or set(fields) & set(clear_fields):
        raise ValueError("Fields cannot be duplicated or both supplied and cleared")
    if operation == "update" and "action" in fields:
        raise ValueError("Changing action requires operation: replace")
    if operation == "replace" and ("action" not in fields or clear_fields):
        raise ValueError("replace requires action and does not accept clear_fields")
    numeric = {"temperature", "target_temp_low", "target_temp_high", "humidity"}
    for field, value in fields.items():
        if value is None or isinstance(value, str) and not value.strip():
            raise ValueError(f"{field} cannot be empty; use clear_fields to remove a setting")
        if field in numeric:
            try:
                valid = not isinstance(value, bool) and isfinite(float(value))
            except (TypeError, ValueError):
                valid = False
            if not valid:
                raise ValueError(f"{field} must be a finite number")
            if field == "humidity" and not 0 <= float(value) <= 100:
                raise ValueError("humidity must be between 0 and 100")
        elif not isinstance(value, str):
            raise ValueError(f"{field} must be text")
    if ("target_temp_low" in fields) != ("target_temp_high" in fields):
        raise ValueError("Supply both target_temp_low and target_temp_high")
    if "temperature" in fields and "target_temp_low" in fields:
        raise ValueError("Use a single temperature or a complete range")


def updated_preset_config(current: dict, fields: dict, *, operation="update", clear_fields=()) -> dict:
    """Build a complete validated configuration without mutating its source."""
    validate_preset_update_request(operation, fields, clear_fields)
    result = deepcopy(current) if operation == "update" else {}
    for field in clear_fields:
        result.pop(field, None)
    if "temperature" in fields:
        result.pop("target_temp_low", None)
        result.pop("target_temp_high", None)
    elif "target_temp_low" in fields:
        result.pop("temperature", None)
    result.update(fields)
    return normalize_config(result)


def normalize_config(config: dict) -> dict:
    """Validate an action without accepting schedule or reference metadata."""
    if not isinstance(config, dict) or set(config) & {"start", "slot_id", "preset_key"}:
        raise ConfigurationResourceError("incompatible_configuration", "Invalid preset configuration")
    allowed = {"action", "temperature", "target_temp_low", "target_temp_high", "hvac_mode", "fan_mode", "preset_mode", "swing_mode", "swing_horizontal_mode", "humidity"}
    if set(config) - allowed:
        raise ValueError("Unsupported preset configuration fields")
    if config.get("action") == "turn_off" and set(config) != {"action"}:
        raise ValueError("Turn Off cannot contain climate settings")
    result = normalize_schedule_blocks([{"start": "00:00", **config}])[0]
    result.pop("start")
    return result


def normalize_binding(binding: dict) -> dict:
    if isinstance(binding, dict) and "preset_key" in binding:
        if set(binding) != {"preset_key"} or not isinstance(binding["preset_key"], str) or not binding["preset_key"].strip():
            raise ValueError("Preset reference cannot contain local settings")
        return {"preset_key": binding["preset_key"]}
    return normalize_config(binding)


def profile_has_resource_references(profile: dict | None) -> bool:
    if profile is None:
        return False
    return any(
        zone.get("template_links")
        or any("preset_key" in block for blocks in zone.get("schedule", {}).values() for block in blocks)
        for zone in profile.get("zones", {}).values()
    )


def normalize_links(links: Any) -> dict:
    if not isinstance(links, dict) or set(links) - set(WEEKDAYS):
        raise ValueError("Template links must map valid weekdays")
    result = {}
    for day, link in links.items():
        if not isinstance(link, dict) or not isinstance(link.get("template_key"), str) or not link["template_key"]:
            raise ValueError("Invalid template link")
        mode = link.get("mode", "hours")
        if mode not in ("hours", "full"):
            raise ValueError("Invalid template link mode")
        expected = {"template_key", "mode"} if mode == "full" else {"template_key", "bindings", "mode"}
        if set(link) - expected or (mode == "hours" and not isinstance(link.get("bindings"), dict)):
            raise ValueError("Invalid template link configuration")
        result[day] = {"template_key": link["template_key"], "mode": mode}
        if mode == "hours":
            result[day]["bindings"] = {key: normalize_binding(value) for key, value in link["bindings"].items()}
    return result


def template_blocks(blocks: list[dict]) -> list[dict]:
    """Assign identity to new slots; never infer identity from their position."""
    normalized = normalize_schedule_blocks([{key: value for key, value in block.items() if key != "slot_id"} for block in blocks])
    ids = {normalize_start_time(block["start"]): block.get("slot_id") or uuid4().hex for block in blocks}
    if len(set(ids.values())) != len(ids) or any(not isinstance(key, str) or not key for key in ids.values()):
        raise ValueError("Duplicate or invalid template slot ID")
    return [{**block, "slot_id": ids[block["start"]]} for block in normalized]


def resolve_binding(data: dict, binding: dict) -> dict:
    binding = normalize_binding(binding)
    if "preset_key" not in binding:
        return binding
    preset = referenced_resource(data, "block_presets", binding["preset_key"])
    if preset is None:
        raise ConfigurationResourceError("reference_not_found", f"Unknown climate preset: {binding['preset_key']}")
    return normalize_config(preset["config"])


def referenced_resource(data: dict, collection: str, key: str) -> dict | None:
    """Never choose an arbitrary definition for an ambiguous stored reference."""
    library = data.get(collection, [])
    if not isinstance(library, list):
        raise ConfigurationResourceError("incompatible_configuration", f"Invalid stored {collection} library")
    matches = [item for item in library if isinstance(item, dict) and item.get("key") == key]
    if len(matches) > 1:
        raise ConfigurationResourceError("incompatible_configuration", f"Ambiguous {collection} reference: {key}")
    return matches[0] if matches else None


def materialize_day(data: dict, zone: dict, day: str, *, resolve_presets: bool = True) -> list[dict]:
    """Resolve hours, optionally retaining climate preset references for a copy."""
    raw_links = zone.get("template_links", {})
    if not isinstance(raw_links, dict):
        raise ConfigurationResourceError("incompatible_configuration", "Invalid stored template links")
    link = raw_links.get(day)
    if link is not None:
        link = normalize_links({day: link})[day]
    if link is None:
        blocks = deepcopy(zone.get("schedule", {}).get(day, []))
    else:
        template = referenced_resource(data, "templates", link["template_key"])
        if template is None:
            raise ConfigurationResourceError("reference_not_found", f"Unknown schedule template: {link['template_key']}")
        slots = template.get("blocks")
        if not isinstance(slots, list) or any(not isinstance(slot, dict) or not isinstance(slot.get("slot_id"), str) or not slot["slot_id"] for slot in slots):
            raise ConfigurationResourceError("incompatible_configuration", "Invalid stored template slots")
        if len({slot["slot_id"] for slot in slots}) != len(slots):
            raise ConfigurationResourceError("incompatible_configuration", "Duplicate template slot IDs")
        # Validate stored template data without replacing missing identities.
        normalize_schedule_blocks([{key: value for key, value in slot.items() if key != "slot_id"} for slot in slots])
        if link.get("mode", "hours") == "hours" and set(link["bindings"]) != {slot["slot_id"] for slot in slots}:
            raise ConfigurationResourceError("incomplete_assignments", "Every template slot must have exactly one assignment")
        if zone.get("schedule", {}).get(day):
            raise ValueError("Linked day cannot contain independent blocks")
        blocks = [{"start": slot["start"], **normalize_binding({key: value for key, value in slot.items() if key not in ("start", "slot_id")} if link.get("mode") == "full" else link["bindings"][slot["slot_id"]])} for slot in slots]
    if resolve_presets:
        blocks = [{"start": block["start"], **resolve_binding(data, {key: value for key, value in block.items() if key != "start"})} for block in blocks]
    return normalize_schedule_blocks(blocks)


def resolve_week(data: dict, zone: dict) -> dict:
    return {day: materialize_day(data, zone, day) for day in WEEKDAYS}


def resolution_metadata(data: dict, zone: dict, resolved: dict) -> dict:
    """Describe origins and destination adaptations without storing derived data."""
    requested = resolve_week(data, zone)
    metadata = {}
    for day in WEEKDAYS:
        raw_blocks = materialize_day(data, zone, day, resolve_presets=False)
        link = zone.get("template_links", {}).get(day)
        slots = {}
        if link:
            template = next(item for item in data["templates"] if item["key"] == link["template_key"])
            slots = {normalize_start_time(slot["start"]): slot["slot_id"] for slot in template["blocks"]}
        entries = []
        for raw, intent, effective in zip(raw_blocks, requested[day], resolved[day]):
            entry = {"start": effective["start"], "adaptations": {}}
            if "preset_key" in raw:
                entry["preset_key"] = raw["preset_key"]
            if link:
                entry.update(template_key=link["template_key"], slot_id=slots[raw["start"]], template_link_mode=link.get("mode", "hours"))
            for field in set(intent) | set(effective):
                if field != "start" and intent.get(field) != effective.get(field):
                    entry["adaptations"][field] = {"requested": intent.get(field), "effective": effective.get(field)}
            entries.append(entry)
        metadata[day] = entries
    return metadata


def destinations(data: dict):
    for entity, zone in data.get("zones", {}).items():
        yield {"source": "default", "entity_id": entity}, zone
    for profile in data.get("profiles", []):
        for entity, zone in profile["zones"].items():
            if zone["behavior"] == "schedule":
                yield {"source": "profile", "profile_key": profile["key"], "entity_id": entity}, zone


def resource_usages(data: dict) -> dict:
    usages = {"presets": {}, "templates": {}}
    for template in data.get("templates", []):
        for slot in template.get("blocks", []):
            if isinstance(slot, dict) and isinstance(slot.get("preset_key"), str):
                usages["presets"].setdefault(slot["preset_key"], []).append({"source": "template", "template_key": template["key"], "slot_id": slot.get("slot_id"), "start": slot.get("start")})
    for destination, zone in destinations(data):
        for day in WEEKDAYS:
            links = zone.get("template_links", {})
            link = links.get(day) if isinstance(links, dict) else None
            if isinstance(link, dict):
                if isinstance(link.get("template_key"), str):
                    usages["templates"].setdefault(link["template_key"], []).append({**destination, "weekday": day, "mode": link.get("mode", "hours")})
                raw_bindings = link.get("bindings", {})
                bindings = list(raw_bindings.items()) if isinstance(raw_bindings, dict) else []
                if link.get("mode") == "full":
                    template = referenced_resource(data, "templates", link.get("template_key"))
                    bindings = [(slot.get("slot_id"), slot) for slot in (template or {}).get("blocks", [])]
            else:
                bindings = [(block.get("start", ""), block) for block in zone.get("schedule", {}).get(day, []) if isinstance(block, dict)]
            for slot, binding in bindings:
                if isinstance(binding, dict) and isinstance(binding.get("preset_key"), str):
                    usages["presets"].setdefault(binding["preset_key"], []).append({**destination, "weekday": day, "slot_id" if link else "start": slot, **({"template_key": link["template_key"], "start": binding.get("start"), "indirect": True} if link and link.get("mode") == "full" else {})})
    return usages


def validate_reference_graph(data: dict) -> None:
    """Reject dangling references before persistence or portable import."""
    for template in data.get("templates", []):
        for slot in template_blocks(template["blocks"]):
            resolve_binding(data, {key: value for key, value in slot.items() if key not in ("start", "slot_id")})
    for _destination, zone in destinations(data):
        resolve_week(data, zone)
