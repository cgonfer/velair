"""Transactional application of a daily template to complete layout groups."""
from copy import deepcopy

from .day_layouts import BUILTIN_DAY_LAYOUTS, validate_day_layout_key
from .models import WEEKDAYS, validate_climate_profiles, validate_modes
from .schedule_resources import (
    ConfigurationResourceError, materialize_day, normalize_binding,
    referenced_resource, resolve_binding,
)


def _error(error):
    return {"code": getattr(error, "code", "incompatible_configuration"), "message": str(error)}


def _raw_day(zone, day):
    """Compare references, not their coincidentally equal resolved values."""
    return {"blocks": zone.get("schedule", {}).get(day, []), "link": zone.get("template_links", {}).get(day)}


def build_template_application(scheduler, request):
    """Build a candidate and review without mutating scheduler-owned state."""
    snapshot = scheduler._data
    revision = snapshot.get("configuration_revision", 0)
    expected = request.get("expected_revision")
    if type(expected) is not int or expected < 0 or expected != revision:
        raise ConfigurationResourceError("revision_conflict", "Configuration changed; reload before applying")
    if set(request) - {"template_key", "source", "profile_key", "day_layout_key", "mode", "groups", "expected_revision"}:
        raise ValueError("Unsupported template application fields")
    source, mode = request.get("source"), request.get("mode")
    if source not in ("default", "profile") or mode not in ("copy", "hours", "full"):
        raise ValueError("Choose a destination and application mode")
    key = request.get("template_key")
    if not isinstance(key, str) or not key.strip():
        raise ValueError("Provide a template key")
    template = referenced_resource(snapshot, "templates", key)
    if template is None:
        raise ConfigurationResourceError("reference_not_found", "Schedule template no longer exists")
    layout = validate_day_layout_key(request.get("day_layout_key"))
    groups = request.get("groups")
    if not isinstance(groups, list) or not groups:
        raise ValueError("Select at least one destination group")
    profile = None
    if source == "profile":
        profile_key = request.get("profile_key")
        if not isinstance(profile_key, str) or not profile_key.strip():
            raise ValueError("Provide a Profile key")
        profile = referenced_resource(snapshot, "profiles", profile_key)
        if profile is None:
            raise ConfigurationResourceError("reference_not_found", "Profile no longer exists")
    elif "profile_key" in request:
        raise ValueError("Default cannot specify a Profile")
    seen = set()
    for group in groups:
        if not isinstance(group, dict) or set(group) - {"entity_id", "weekdays", "base_weekday", "bindings"}:
            raise ValueError("Invalid destination group")
        entity, days = group.get("entity_id"), group.get("weekdays")
        if not isinstance(entity, str):
            raise ValueError("Provide a managed climate entity")
        scheduler.ensure_managed_entity(entity)
        if not isinstance(days, list) or not days or any(not isinstance(day, str) or day not in WEEKDAYS for day in days) or len(set(days)) != len(days):
            raise ValueError("Provide unique valid weekdays")
        if not any(set(days) == set(builtin) for builtin in BUILTIN_DAY_LAYOUTS[layout]):
            raise ValueError("Select a complete group from the chosen layout")
        if any((entity, day) in seen for day in days):
            raise ValueError("Destination groups must not overlap")
        seen.update((entity, day) for day in days)
        if "base_weekday" in group and group["base_weekday"] not in days:
            raise ValueError("The base day must belong to the selected group")
        if mode != "hours" and ("bindings" in group or "base_weekday" in group):
            raise ValueError("Only hours links accept bindings or a base day")
        if "bindings" in group and (not isinstance(group["bindings"], dict) or set(group["bindings"]) - {slot["slot_id"] for slot in template["blocks"]}):
            raise ValueError("Bindings must identify template slots")
    candidate = deepcopy(snapshot)
    target_zones = candidate["zones"] if profile is None else referenced_resource(candidate, "profiles", profile["key"])["zones"]
    saved_zones = snapshot["zones"] if profile is None else profile["zones"]
    preview = {"configuration_revision": revision, "can_apply": False, "groups": [], "warnings": [], "errors": []}
    converted = set()
    for group in groups:
        entity = group["entity_id"]
        days = [day for day in WEEKDAYS if day in group["weekdays"]]
        saved = saved_zones.get(entity, {})
        behavior = "schedule" if source == "default" else saved.get("behavior", "none")
        report = {"entity_id": entity, "weekdays": days, "requires_base": False, "alternatives": [], "proposals": [], "pending": [], "errors": [], "layout_before": saved.get("day_layout_key", "individual"), "behavior_before": behavior, "replacements": []}
        preview["groups"].append(report)
        zone = target_zones.setdefault(entity, {})
        zone.setdefault("schedule", {day: [] for day in WEEKDAYS})
        zone.setdefault("template_links", {})
        zone["day_layout_key"] = layout
        if source == "profile":
            zone["behavior"] = "schedule"
            zone.pop("action", None)
            if behavior != "schedule" and entity not in converted:
                preview["warnings"].append({"code": "profile_behavior_changed", "message": "This zone will use a Profile schedule", "entity_id": entity})
                converted.add(entity)
        for day in days:
            link = saved.get("template_links", {}).get(day)
            report["replacements"].append({"weekday": day, "mode": link.get("mode", "hours") if link else "copy", **({"template_key": link["template_key"]} if link else {})})
        try:
            if scheduler._is_external_execution(entity) and scheduler._external_execution is not None:
                available = getattr(scheduler._external_execution, "ensure_provider_available", None)
                if available is not None:
                    available(entity, snapshot["zones"][entity].get("execution", {}).get("provider"))
            base = group.get("base_weekday")
            bindings = {}
            if mode == "hours":
                for day in days:
                    alternative = next((item for item in report["alternatives"] if _raw_day(saved, item["weekday"]) == _raw_day(saved, day)), None)
                    if alternative is None:
                        report["alternatives"].append({"weekday": day, "weekdays": [day], "blocks": materialize_day(snapshot, saved, day)})
                    else:
                        alternative["weekdays"].append(day)
                report["requires_base"] = len(report["alternatives"]) > 1 and base is None
                if report["requires_base"]:
                    continue
                base = base or days[0]
                report["base_weekday"] = base
                donors = materialize_day(snapshot, saved, base, resolve_presets=False)
                for slot in template["blocks"]:
                    slot_id, start = slot["slot_id"], slot["start"]
                    supplied = group.get("bindings", {})
                    choices = [("manual", supplied[slot_id], None)] if slot_id in supplied else [
                        ("exact" if donor["start"] == start else "previous" if donor["start"] < start else "next", {field: value for field, value in donor.items() if field != "start"}, donor["start"])
                        for donor in sorted(donors, key=lambda donor: (0 if donor["start"] == start else 1 if donor["start"] < start else 2, -int(donor["start"].replace(":", "")) if donor["start"] < start else int(donor["start"].replace(":", ""))))]
                    failure = None
                    for origin, raw, donor_start in choices:
                        try:
                            binding = normalize_binding(raw)
                            effective = scheduler._adapt_resource_blocks(entity, [{"start": start, **resolve_binding(snapshot, binding)}])[0]
                            if scheduler._is_external_execution(entity) and scheduler._external_execution is not None:
                                scheduler._external_execution.ensure_block_supported(entity, {field: value for field, value in effective.items() if field != "start"})
                        except (ValueError, KeyError, TypeError, AttributeError) as error:
                            failure = error
                            continue
                        bindings[slot_id] = deepcopy(binding)
                        report["proposals"].append({"slot_id": slot_id, "start": start, "binding": binding, "origin": origin, "effective_config": {field: value for field, value in effective.items() if field != "start"}, **({"donor_start": donor_start} if donor_start else {})})
                        break
                    else:
                        report["proposals"].append({"slot_id": slot_id, "start": start})
                        report["pending"].append({"slot_id": slot_id, "message": str(failure) if failure else "Choose climate settings from the destination or enter them manually"})
                if report["pending"]:
                    continue
            for day in days:
                zone["schedule"][day] = []
                if mode == "copy":
                    zone["template_links"].pop(day, None)
                    raw = [{field: value for field, value in slot.items() if field != "slot_id"} for slot in template["blocks"]]
                    concrete = scheduler._adapt_resource_blocks(entity, [{"start": block["start"], **resolve_binding(snapshot, {field: value for field, value in block.items() if field != "start"})} for block in raw])
                    by_start = {block["start"]: block for block in concrete}
                    zone["schedule"][day] = [deepcopy(block if "preset_key" in block else by_start[block["start"]]) for block in raw]
                else:
                    zone["template_links"][day] = {"template_key": key, "mode": mode, **({"bindings": deepcopy(bindings)} if mode == "hours" else {})}
        except (ValueError, KeyError, TypeError, AttributeError) as error:
            report["errors"].append(_error(error))
    for entity in {group["entity_id"] for group in groups}:
        zone = target_zones[entity]
        for builtin in BUILTIN_DAY_LAYOUTS[layout]:
            if any((entity, day) in seen for day in builtin):
                continue
            if any(_raw_day(zone, day) != _raw_day(zone, builtin[0]) for day in builtin[1:]):
                preview["warnings"].append({"code": "mixed_unselected_group", "message": "Unselected days retain different schedules under the chosen layout", "entity_id": entity, "weekdays": builtin})
        reports = [report for report in preview["groups"] if report["entity_id"] == entity]
        if any(report["requires_base"] or report["pending"] or report["errors"] for report in reports):
            continue
        try:
            scheduler._resolved_resource_week(candidate, entity, zone, validate=True)
        except (ValueError, KeyError, TypeError, AttributeError) as error:
            for report in reports:
                report["errors"].append(_error(error))
    preview["can_apply"] = not preview["errors"] and all(not report["requires_base"] and not report["pending"] and not report["errors"] for report in preview["groups"])
    if source == "profile":
        try:
            validate_climate_profiles([referenced_resource(candidate, "profiles", profile["key"])], list(candidate["zones"]))
            validate_modes(candidate.get("modes", []), {item["key"]: set(item["zones"]) for item in candidate["profiles"]})
            conflicts = scheduler._conflicting_profile_zones(candidate["profiles"], scheduler.active_profile_ids)
            if conflicts:
                raise ValueError("Base Profiles cannot configure the same zone: " + ", ".join(sorted(conflicts)))
        except ValueError as error:
            preview["errors"].append(_error(error))
            preview["can_apply"] = False
    return candidate, preview
