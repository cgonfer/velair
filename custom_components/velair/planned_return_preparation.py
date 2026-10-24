"""Read-only explanation of the saved return destination and its preparation."""
from copy import deepcopy
from dataclasses import asdict

from homeassistant.util import dt as dt_util

from .models import normalize_preconditioning_data, temperature_target_from_mapping


def preparation_status(runtime, now, arrival, mode_id, plans):
    """Project every managed zone without changing episodes or thermal learning."""
    owner = runtime.scheduler
    try:
        profiles = runtime.profiles(mode_id)
    except ValueError:
        profiles = None
    context = "arrival" if arrival is not None else "configuration"
    result = {"context": context, "return_at": arrival.isoformat() if arrival else None,
              "mode_id": mode_id, "zones": []}
    events = {event.entity_id: event for event in plans}
    latched = [entity for entity in (runtime.episode or {}).get("preparing_entities", []) if runtime.is_preparing(entity)]
    for entity, zone in owner._data["zones"].items():
        profile_id, effect = owner._profile_effect_from_profiles(profiles or [], entity)
        source = "paused" if effect["behavior"] == "pause" else (
            "profile" if effect["behavior"] == "schedule" else "default")
        config = normalize_preconditioning_data(zone.get("preconditioning"))
        row = {"entity_id": entity, "profile_id": profile_id, "schedule_source": source,
               "preparation": "adaptive" if config["enabled"] else "arrival_only",
               "state": "configured", "reason": None, "start_at": None}
        result["zones"].append(row)
        if not zone["enabled"]:
            _unavailable(row, "zone_disabled")
        elif owner._is_external_execution(entity):
            _unavailable(row, "external_execution")
        elif profiles is None:
            _unavailable(row, "missing_target")
        elif source == "paused":
            _unavailable(row, "profile_paused")
        elif arrival is not None:
            schedule = owner._effective_schedule_from_profiles(profiles, entity)
            target = owner._current_schedule_event_for_schedule(entity, schedule, dt_util.as_local(arrival))
            if target is None or target.action != "set_temperature":
                _unavailable(row, "missing_target")
            else:
                block = {"start": target.start, "action": target.action, "temperature_only": target.temperature_only,
                         **temperature_target_from_mapping({key: value for key, value in asdict(target).items() if value is not None})}
                if target.hvac_mode:
                    block["hvac_mode"] = target.hvac_mode
                row["target"] = temperature_target_from_mapping(block)
                _arrival_preparation(owner, runtime, entity, zone, config, block,
                                     arrival, now, events.get(entity), entity in latched, row)
        if row["preparation"] == "arrival_only" and row["reason"] is None:
            row["reason"] = "preconditioning_disabled"
        if arrival is not None and row["preparation"] != "none":
            reason = _suspension(owner, entity, now)
            if reason:
                row.update(state="suspended", reason=reason)
    return result


def _unavailable(row, reason):
    row.update(preparation="none", state="unavailable", reason=reason)


def _suspension(owner, entity, now):
    if owner._stopped:
        return "scheduler_stopped"
    if owner.mode != "auto" or owner.temperature_migration_blocked:
        return "scheduler_not_auto"
    if owner._is_zone_override_active(entity, now):
        if owner._manual_control_status(entity, now):
            return "manual_adjustment"
        override = owner._data["zones"][entity].get("override") or {}
        return "boost" if override.get("type") == "boost" else "paused"
    return None


def _arrival_preparation(owner, runtime, entity, zone, config, block, arrival,
                         now, event, latched, row):
    row["state"] = "pending"
    dependency = getattr(event, "preconditioning_dependency", None)
    if dependency is not None:
        row["preconditioning_dependency"] = deepcopy(dependency)
        if event.target_when is None:
            row.update(preparation="arrival_only", reason=dependency.get("reason"))
            return
    if not config["enabled"]:
        row["reason"] = "preconditioning_disabled"
        return
    if block.get("temperature_only") and owner._current_hvac_mode(entity) == "off":
        row.update(preparation="arrival_only", reason="unsupported_mode")
        return
    temperature = owner._current_temperature(entity)
    mode_getter = getattr(owner._climate_manager, "effective_hvac_mode", None)
    is_range = "target_temp_low" in block
    mode = (mode_getter(entity, block.get("hvac_mode"), ensure_on=not block.get("temperature_only", False), range_target=is_range)
            if callable(mode_getter) else block.get("hvac_mode") or owner._current_hvac_mode(entity))
    supported = mode == "heat_cool" if is_range else mode in ("heat", "cool", "auto", "heat_cool")
    if is_range and not supported:
        row.update(preparation="arrival_only", reason="unsupported_range_mode")
        return
    reached = False
    if temperature is not None and supported:
        delta = config["minimum_delta_temperature"]
        if is_range:
            reached = block["target_temp_low"] - delta <= temperature <= block["target_temp_high"] + delta
        elif mode == "heat":
            reached = temperature >= block["temperature"] - delta
        elif mode == "cool":
            reached = temperature <= block["temperature"] + delta
        else:
            reached = abs(temperature - block["temperature"]) <= delta
    # Read the predictor's planned time, never the departure fallback of a latched event.
    if event is not None and (event.preconditioning_diagnostics is not None or dependency is not None):
        start = event.when
    else:
        start, _diagnostics = owner._preconditioned_event_details(entity, zone, block, arrival)
    if start < arrival:
        row["start_at"] = start.isoformat()
    if reached:
        row["state"] = "reached"
    elif latched or (event is not None and event.when <= now and (runtime.episode or {}).get("state") == "away"
                    and owner._dependency_delivery_allowed(event)):
        row["state"] = "preparing"
    elif start >= arrival:
        row.update(preparation="arrival_only", reason=("missing_temperature" if temperature is None
                   else "unsupported_mode" if not supported else "no_estimate"))

