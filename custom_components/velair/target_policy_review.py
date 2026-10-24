"""Pure candidate review for per-climate target representation changes."""
from copy import deepcopy

from .models import WEEKDAYS, normalize_schedule_blocks
from .schedule_resources import (
    ConfigurationResourceError, destinations, normalize_links, resolve_week,
)
from .target_format_policy import validate_range_modes


def build_policy_review(scheduler, entity_id, target_range_modes, expected_revision,
                        corrections=None):
    """Build an isolated candidate; report all affected blocks before any write."""
    scheduler.ensure_managed_entity(entity_id)
    revision = scheduler._data.get("configuration_revision", 0)
    if expected_revision != revision:
        raise ConfigurationResourceError("revision_conflict", "Configuration changed; reload before saving")
    modes = validate_range_modes(target_range_modes)
    policy = scheduler.get_target_format_policy(entity_id)
    if policy["kind"] != "mixed":
        raise ValueError("Only climates advertising both target formats have configurable range modes")
    if set(modes) - set(policy["hvac_modes"]):
        raise ValueError("Select only HVAC modes advertised by this climate")
    candidate = deepcopy(scheduler._data)
    candidate["zones"][entity_id]["target_range_modes"] = modes
    corrections = {} if corrections is None else corrections
    if not isinstance(corrections, dict) or set(corrections) - {"destinations"}:
        raise ValueError("Unsupported target policy corrections")
    if not isinstance(corrections.get("destinations", []), list):
        raise ValueError("Destination corrections must be a list")
    unlinked = []
    seen = set()
    for correction in corrections.get("destinations", []):
        if not isinstance(correction, dict) or set(correction) - {"source", "profile_key", "entity_id", "schedule", "template_links"}:
            raise ValueError("Invalid destination correction")
        reference = {key: correction[key] for key in ("source", "profile_key", "entity_id") if key in correction}
        key = tuple(sorted(reference.items()))
        if key in seen or reference.get("entity_id") != entity_id:
            raise ValueError("Correct only destinations of the affected climate, once each")
        seen.add(key)
        zone = next((zone for destination, zone in destinations(candidate) if destination == reference), None)
        if zone is None:
            raise ValueError("Unknown policy correction destination")
        raw = correction.get("schedule")
        if not isinstance(raw, dict) or set(raw) != set(WEEKDAYS):
            raise ValueError("A corrected destination requires its complete weekly schedule")
        zone["schedule"] = {day: normalize_schedule_blocks(blocks) for day, blocks in raw.items()}
        previous_links = zone.get("template_links", {})
        links = normalize_links(correction.get("template_links", {}))
        unlinked.extend({**reference, "weekday": day} for day in previous_links if day not in links)
        zone["template_links"] = links
    policy = scheduler.get_target_format_policy(entity_id, candidate["zones"][entity_id])
    failures = []
    affected = []
    for destination, zone in destinations(candidate):
        week = resolve_week(candidate, zone)
        day_failures = []
        for day, blocks in week.items():
            for index, block in enumerate(blocks):
                try:
                    scheduler._resolved_resource_week(candidate, destination["entity_id"],
                        {"schedule": {weekday: [block] if weekday == day else [] for weekday in WEEKDAYS}}, validate=True)
                except (ValueError, KeyError, TypeError, AttributeError) as block_err:
                    mode = block.get("hvac_mode")
                    effective_policy = scheduler.get_target_format_policy(destination["entity_id"], candidate["zones"][destination["entity_id"]])
                    shape = effective_policy["formats_by_mode"].get(mode)
                    expected = [shape] if shape in ("single", "range") else sorted(set(effective_policy["formats_by_mode"].values()) - {"unknown"})
                    failure = {**destination, "weekday": day, "block_index": index,
                               "block": deepcopy(block), "expected_formats": expected,
                               "message": str(block_err)}
                    failures.append(failure)
                    day_failures.append(failure)
        if day_failures:
            affected.append({**destination, "schedule": deepcopy(week),
                             "template_links": deepcopy(zone.get("template_links", {})),
                             "errors": day_failures})
    changed_entities = (
        {entity_id}
        if scheduler._data["zones"][entity_id].get("target_range_modes") != modes
        else set()
    )
    blockers, automatic_actions = temporary_policy_review(scheduler, candidate, changed_entities)
    if not failures:
        scheduler._validate_configuration_resources(candidate)
    return candidate, {"configuration_revision": revision, "policy": policy,
        "affected_destinations": affected, "affected_blocks": failures,
        "temporary_blockers": blockers, "errors": failures,
        "automatic_actions": automatic_actions,
        "unlinked_days": unlinked,
        "can_apply": not failures and not blockers}


def temporary_policy_review(scheduler, candidate, entities, *, allow_room_assist_stop=True):
    """Check live temporary and restoration targets under candidate settings."""
    blockers = []
    automatic_actions = []
    for entity in entities:
        policy = scheduler.get_target_format_policy(entity, candidate["zones"][entity])
        state = scheduler._hass.states.get(entity)
        def check(target, kind):
            if not isinstance(target, dict):
                return
            shape = "range" if "target_temp_low" in target else "single" if "temperature" in target else None
            if shape is None:
                return
            mode = target.get("hvac_mode") or (state.state if state is not None else None)
            if mode == "off":
                if target.get("hvac_mode") == "off" and not target.get("temperature_only"):
                    return
                compatible = shape in policy["formats_by_mode"].values()
            else:
                compatible = policy["formats_by_mode"].get(mode) in (shape, "unknown")
            if kind == "room_assist" and shape == "range" and mode in policy["hvac_modes"] and mode != "heat_cool":
                compatible = False
            if not compatible and kind == "room_assist" and allow_room_assist_stop:
                action = {"entity_id": entity, "type": "stop_room_assist"}
                if action not in automatic_actions:
                    automatic_actions.append(action)
            elif not compatible:
                blockers.append({"entity_id": entity, "type": kind,
                                 "message": "Active or restorable target conflicts with the proposed format"})
        live = scheduler._data["zones"][entity]
        override = live.get("override") or {}
        check(override, override.get("type", "override"))
        check(override.get("previous_state"), "previous_state")
        if live.get("pauses") or override.get("type") == "pause":
            snapshot = getattr(scheduler._climate_manager, "climate_state_snapshot", lambda _entity: {})(entity)
            check(snapshot, "preserved_state")
        for collection in ("_room_sensor_assist_states", "_room_sensor_assist_inflight"):
            assist = getattr(scheduler, collection, {}).get(entity)
            if assist is not None:
                check({"hvac_mode": assist.hvac_mode,
                       **({"target_temp_low": assist.target_temp_low} if assist.target_temp_low is not None
                          else {"temperature": assist.target_temperature})}, "room_assist")
        session = scheduler._preconditioning_sessions.get(entity)
        if session is not None:
            check({"hvac_mode": session.hvac_mode,
                   **({"target_temp_low": session.target_temp_low} if session.target_kind == "range"
                      else {"temperature": session.target_temperature})}, "preconditioning")
        from homeassistant.util import dt as dt_util
        if any(key.startswith(f"{entity}|") and marker.target_when > dt_util.now()
               for key, marker in getattr(scheduler, "_applied_preconditioning_targets", {}).items()):
            event = scheduler.get_active_target_event(entity)
            if event is not None:
                check({"hvac_mode": event.hvac_mode,
                       **({"target_temp_low": event.target_temp_low} if event.target_temp_low is not None
                          else {"temperature": event.temperature})}, "preconditioning_target")
    return blockers, automatic_actions
