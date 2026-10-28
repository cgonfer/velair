"""Control-unit membership and detached configuration transformations.

Groups own the existing zone configuration; members remain physical endpoints.
This module deliberately contains no scheduler or Home Assistant side effects.
"""

from __future__ import annotations

from copy import deepcopy
import re
from typing import Any
from uuid import uuid4


def normalize_room_groups(raw: Any, physical_ids: list[str]) -> dict[str, dict[str, Any]]:
    """Validate membership without dropping invalid persisted ownership silently."""
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise ValueError("Room groups must be an object")
    known = set(physical_ids)
    claimed: set[str] = set()
    names: set[str] = set()
    result = {}
    for key, value in raw.items():
        if not isinstance(key, str) or not re.fullmatch(r"group\.[a-z0-9_]+", key):
            raise ValueError("Invalid room group identifier")
        if not isinstance(value, dict) or value.get("id", key) != key:
            raise ValueError("Invalid room group configuration")
        name = value.get("name")
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100:
            raise ValueError("Room group name must contain 1 to 100 characters")
        if name.strip().casefold() in names:
            raise ValueError("Room group names must be unique")
        names.add(name.strip().casefold())
        members = value.get("members")
        if not isinstance(members, list) or not members or any(not isinstance(item, str) or item not in known for item in members):
            raise ValueError("Room group members must be configured climate entities")
        if len(set(members)) != len(members) or claimed.intersection(members):
            raise ValueError("A climate can belong to only one room group")
        claimed.update(members)
        temperature = value.get("temperature_entity_id")
        if not isinstance(temperature, str) or not re.fullmatch(r"(?:sensor|climate)\.[a-z0-9_]+", temperature):
            raise ValueError("Choose an explicit sensor or climate temperature reference")
        if temperature.startswith("climate.") and temperature not in members:
            raise ValueError("Climate temperature reference must belong to the room group")
        mode = value.get("delivery_mode", "all")
        if mode not in ("all", "selected"):
            raise ValueError("Room group delivery mode must be all or selected")
        delivery = value.get("delivery_entity_id")
        if mode == "selected" and delivery not in members:
            raise ValueError("Selected delivery entity must belong to the room group")
        result[key] = {"id": key, "name": name.strip(), "members": list(members),
                       "temperature_entity_id": temperature, "delivery_mode": mode}
        if mode == "selected":
            result[key]["delivery_entity_id"] = delivery
    return result


def member_to_unit(groups: dict[str, Any]) -> dict[str, str]:
    """Return physical member ownership."""
    return {member: key for key, group in groups.items() for member in group["members"]}


def control_unit_ids(groups: dict[str, Any], physical_ids: list[str]) -> list[str]:
    """Collapse members at the first physical member position."""
    owners = member_to_unit(groups)
    return list(dict.fromkeys(owners.get(entity, entity) for entity in physical_ids))


def resolve_control_unit(data: dict[str, Any], entity_id: str) -> str:
    """Resolve member actions to their one configuration owner."""
    return member_to_unit(data.get("room_groups", {})).get(entity_id, entity_id)


def comfort_settings(data: dict[str, Any], entity_id: str) -> dict[str, Any]:
    """Resolve physical Comfort independently from shared control ownership."""
    owner = resolve_control_unit(data, entity_id)
    if owner != entity_id:
        return data.get("member_comfort", {}).get(
            entity_id, data["zones"][owner].get("comfort", {})
        )
    return data["zones"].get(entity_id, {}).get("comfort", {})


def delivery_members(data: dict[str, Any], entity_id: str) -> list[str]:
    """Return only physical command destinations for a control unit."""
    unit = resolve_control_unit(data, entity_id)
    group = data.get("room_groups", {}).get(unit)
    if group is None:
        return [unit]
    return [group["delivery_entity_id"]] if group["delivery_mode"] == "selected" else list(group["members"])


def _clear_temporary(zone: dict[str, Any]) -> dict[str, Any]:
    result = deepcopy(zone)
    result["override"] = None
    result["pauses"] = []
    return result


def _replace_references(data: dict[str, Any], old: set[str], replacements: list[str], source: str) -> None:
    for profile in data.get("profiles", []):
        zones = profile.get("zones", {})
        chosen = deepcopy(zones.get(source))
        for entity in old:
            zones.pop(entity, None)
        if chosen is not None:
            for entity in replacements:
                zones[entity] = deepcopy(chosen)
    global_data = data.get("global_", data.get("global", {}))
    overrides = global_data.get("zone_profile_overrides", {})
    has_source = source in overrides
    chosen = overrides.get(source)
    for entity in old:
        overrides.pop(entity, None)
    if has_source:
        overrides.update({entity: chosen for entity in replacements})
    episode = data.get("planned_return_episode")
    if isinstance(episode, dict):
        selection = episode.get("previous_selection")
        previous = selection.get("zone_profile_overrides", {}) if isinstance(selection, dict) else {}
        has_previous = source in previous
        chosen_previous = previous.get(source)
        for entity in old:
            previous.pop(entity, None)
        if has_previous:
            previous.update({entity: chosen_previous for entity in replacements})
        preparing = episode.get("preparing_entities")
        if isinstance(preparing, list):
            episode["preparing_entities"] = list(dict.fromkeys(
                replacement for entity in preparing for replacement in (replacements if entity in old else [entity])))
    for entity_id, zone in data.get("zones", {}).items():
        dependency = zone.get("preconditioning", {})
        if dependency.get("master_entity_id") in old:
            master = replacements[0] if len(replacements) == 1 else None
            dependency["master_entity_id"] = master if master != entity_id else None
    for supply in data.get("settings", {}).get("shared_demand_groups", []):
        zones = supply.get("zones", {})
        values = [zones[entity] for entity in old if entity in zones]
        if not values:
            continue
        if any(value != values[0] for value in values[1:]):
            raise ValueError("Shared climate supply overrides differ; align them before grouping")
        for entity in old:
            zones.pop(entity, None)
        for entity in replacements:
            zones[entity] = deepcopy(values[0])


def build_group_candidate(data: dict[str, Any], physical_ids: list[str], group: dict[str, Any], source_entity_id: str | None = None) -> tuple[dict[str, Any], dict[str, Any]]:
    """Build a reviewed transformation; never mutate the published configuration."""
    if not isinstance(group, dict):
        raise ValueError("Room group configuration must be an object")
    group = deepcopy(group)
    key = group.get("id") or f"group.{uuid4().hex}"
    group["id"] = key
    existing = data.get("room_groups", {}).get(key)
    raw_groups = deepcopy(data.get("room_groups", {}))
    raw_groups[key] = group
    groups = normalize_room_groups(raw_groups, physical_ids)
    group = groups[key]
    # Stored legacy sensor references remain loadable. New selections use a
    # member climate; optional external feedback belongs to Room Assist.
    if (not group["temperature_entity_id"].startswith("climate.")
            and (existing is None or group["temperature_entity_id"] != existing["temperature_entity_id"])):
        raise ValueError("Choose a member climate as the native temperature reference; configure external sensors in Room Assist")
    source = key if existing else source_entity_id
    if source not in data["zones"] or (not existing and source not in group["members"]):
        raise ValueError("Choose an existing member configuration to adopt")
    candidate = deepcopy(data)
    candidate["room_groups"] = groups
    independent_comfort = candidate.setdefault("member_comfort", {})
    for member in group["members"]:
        independent_comfort[member] = deepcopy(comfort_settings(data, member))
    removed = [entity for entity in existing["members"] if entity not in group["members"]] if existing else []
    conflicts = []
    source_zone = data["zones"][source]
    for member in group["members"]:
        if member in data["zones"]:
            fields = [field for field in ("enabled", "schedule", "template_links", "day_layout_key", "preconditioning", "external_change_policy", "execution", "target_range_modes", "target_range_reference", "target_temp_step_override", "override", "pauses") if data["zones"][member].get(field) != source_zone.get(field)]
            if any(profile.get("zones", {}).get(member) != profile.get("zones", {}).get(source) for profile in data.get("profiles", [])):
                fields.append("profiles")
            overrides = data.get("global_", {}).get("zone_profile_overrides", {})
            if (member in overrides, overrides.get(member)) != (source in overrides, overrides.get(source)):
                fields.append("zone_profile_overrides")
            if fields:
                conflicts.append({"entity_id": member, "fields": fields})
    changed = not existing or set(existing["members"]) != set(group["members"]) or any(
        existing.get(field) != group.get(field) for field in ("temperature_entity_id", "delivery_mode", "delivery_entity_id"))
    for entity in removed:
        candidate["zones"][entity] = _clear_temporary(source_zone)
        candidate["zones"][entity]["comfort"] = deepcopy(comfort_settings(data, entity))
        independent_comfort.pop(entity, None)
    if removed:
        _replace_references(candidate, set(), removed, source)
    candidate["zones"][key] = _clear_temporary(source_zone) if changed else deepcopy(source_zone)
    _replace_references(candidate, set(group["members"]) | ({key} if existing else set()), [key], source)
    for entity in group["members"]:
        candidate["zones"].pop(entity, None)
    learning = candidate.setdefault("preconditioning_learning", {})
    for entity in group["members"] + removed + ([key] if changed else []):
        learning.pop(entity, None)
    if changed:
        candidate["preconditioning_accepted_anchors"] = {}
    settings = candidate.setdefault("settings", {})
    owners = member_to_unit(groups)
    order = settings.get("unit_order") or settings.get("zone_order") or physical_ids
    settings["unit_order"] = list(dict.fromkeys(owners.get(entity, entity) for entity in order if owners.get(entity, entity) in candidate["zones"]))
    settings["unit_order"].extend(entity for entity in candidate["zones"] if entity not in settings["unit_order"])
    return candidate, {"group": deepcopy(group), "source_entity_id": source, "conflicts": conflicts, "removed_members": removed, "learning_reset": changed,
                       "temporary_control_reset": changed and any(data["zones"].get(entity, {}).get("override") or data["zones"].get(entity, {}).get("pauses") for entity in [source, *group["members"]]),
                       "configuration_revision": data.get("configuration_revision", 0)}


def remove_group_candidate(data: dict[str, Any], group_id: str) -> dict[str, Any]:
    """Dissolve a group into independent copies without copying thermal history."""
    if group_id not in data.get("room_groups", {}):
        raise ValueError("Unknown room group")
    candidate = deepcopy(data)
    group = candidate["room_groups"].pop(group_id)
    source = candidate["zones"][group_id]
    for member in group["members"]:
        candidate["zones"][member] = _clear_temporary(source)
        candidate["zones"][member]["comfort"] = deepcopy(comfort_settings(data, member))
        candidate.get("member_comfort", {}).pop(member, None)
    _replace_references(candidate, {group_id}, group["members"], group_id)
    candidate["zones"].pop(group_id)
    candidate.get("preconditioning_learning", {}).pop(group_id, None)
    candidate["preconditioning_accepted_anchors"] = {}
    settings = candidate.setdefault("settings", {})
    order = settings.get("unit_order", list(data["zones"]))
    settings["unit_order"] = [member for entity in order for member in (group["members"] if entity == group_id else [entity])]
    return candidate
