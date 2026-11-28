"""Small, event-driven helpers for returning a temporary Boost to Keep."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import replace
from uuid import uuid4


def pending_boost_return(boost, now, reason):
    """Capture the existing snapshot without freezing a future schedule target."""
    return {"id": uuid4().hex, "ended_at": now.isoformat(),
            "reason": reason, "boost": deepcopy(boost)}


def is_thermal_keep(event):
    """Keep with a target is distinct from mode-only and option-only commands."""
    return (event is not None and event.action == "set_temperature"
            and event.hvac_mode is None and not event.temperature_only
            and (event.temperature is not None
                 or event.target_temp_low is not None and event.target_temp_high is not None))


def keep_return_event(event, pending, manager):
    """Combine the live target with the saved mode, never its old temperature."""
    if not pending or pending.get("mode_retired") or not is_thermal_keep(event):
        return event
    snapshot = pending.get("boost", {}).get("previous_state", {})
    range_target = event.target_temp_low is not None and event.target_temp_high is not None
    mode = manager.boost_return_hvac_mode(event.entity_id, snapshot, range_target=range_target)
    option_keys = ("fan_mode", "preset_mode", "swing_mode", "swing_horizontal_mode", "humidity")
    options = manager.boost_return_options(
        event.entity_id, snapshot,
        {key: getattr(event, key) for key in option_keys if getattr(event, key) is not None},
        hvac_mode=mode)
    # Explicit None removes unchanged saved options from the physical call.
    return replace(event, hvac_mode=mode, **{key: options.get(key) for key in option_keys})


def return_authority_changed(before, after, entity_id):
    """Availability and Keep target edits do not supersede a saved return mode."""
    old = before.get("zones", {}).get(entity_id, {})
    new = after.get("zones", {}).get(entity_id, {})
    if any(old.get(key) != new.get(key) for key in ("enabled", "execution", "override", "pauses")):
        return True
    if old.get("schedule") != new.get("schedule") and not any(new.get("schedule", {}).values()):
        return True
    if before.get("room_groups", {}).get(entity_id) != after.get("room_groups", {}).get(entity_id):
        return True
    old_global, new_global = before.get("global_", {}), after.get("global_", {})
    if old_global.get("mode") != new_global.get("mode"):
        return True
    if (old_global.get("base_mode_id", old_global.get("active_mode_id"))
            != new_global.get("base_mode_id", new_global.get("active_mode_id"))):
        return True
    if (old_global.get("base_profile_ids", old_global.get("active_profile_ids", []))
            != new_global.get("base_profile_ids", new_global.get("active_profile_ids", []))):
        return True
    old_overrides = old_global.get("zone_profile_overrides", {})
    new_overrides = new_global.get("zone_profile_overrides", {})
    if ((entity_id in old_overrides, old_overrides.get(entity_id))
            != (entity_id in new_overrides, new_overrides.get(entity_id))):
        return True
    return before.get("planned_return_episode") != after.get("planned_return_episode")
