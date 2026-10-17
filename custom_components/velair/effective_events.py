"""Read-only next-control projection; never a scheduler execution source."""
from __future__ import annotations

from dataclasses import replace
from datetime import datetime

from homeassistant.util import dt as dt_util

from .models import ClimateEvent, WEEKDAYS
from .planned_return import parse_instant
from .planned_return_preparation import _suspension


def project_next_effective_events(owner, now: datetime, *, weekly_events=None) -> list[dict]:
    """Project one next action per local climate using the current authority rules."""
    # Imported lazily to keep this independent module outside scheduler startup.
    from .scheduler import _event_control_intent, _is_due_preconditioning_event

    weekly = {}
    candidates = (owner._iter_future_events(now, clear_applied=False)
                  if weekly_events is None else weekly_events)
    for event in candidates:
        if dt_util.as_utc(event.when) <= dt_util.as_utc(now) and not _is_due_preconditioning_event(event, now):
            continue
        if owner._is_applied_preconditioning_event(event):
            continue
        previous = weekly.get(event.entity_id)
        if previous is None or dt_util.as_utc(event.when) < dt_util.as_utc(previous.when):
            weekly[event.entity_id] = event

    rows = {entity: _weekly_row(event, owner.active_mode_id) for entity, event in weekly.items()}
    runtime = owner._planned_return
    episode = runtime.episode or {}
    arrival = parse_instant(episode.get("return_at"))
    if (episode.get("state") != "away" or arrival is None or arrival <= dt_util.as_utc(now)
            or runtime.suppress_departure_delivery()
            or not (episode.get("origin") == "manual" or (
                runtime.config.get("enabled") and runtime.source_ids()))):
        return _sorted(rows.values())
    try:
        destination = runtime.profiles(episode["destination_mode_id"])
    except (KeyError, ValueError):
        return _sorted(rows.values())

    plans = {event.entity_id: event for event in runtime.plans(now)}
    active = owner._active_profiles()
    arrival_local = dt_util.as_local(arrival)
    for entity, zone in owner._data["zones"].items():
        if not zone["enabled"] or owner._is_external_execution(entity):
            continue
        before = owner._profile_transition_effect(active, entity, arrival_local)
        after = owner._profile_transition_effect(destination, entity, arrival_local)
        changed = before[:3] != after[:3] or _event_control_intent(before[3]) != _event_control_intent(after[3])
        plan = plans.get(entity)
        if not changed and plan is None:
            continue
        reason = _suspension(owner, entity, now)
        target = after[3]
        if after[1] == "pause":
            target = (ClimateEvent(entity, arrival, None, WEEKDAYS[arrival_local.weekday()],
                                   arrival_local.strftime("%H:%M"), action="turn_off")
                      if after[2] == "turn_off" else None)
        elif target is not None:
            target = replace(target, when=arrival, target_when=None,
                             preconditioning_diagnostics=None)
        row = {"entity_id": entity, "source": "planned_return", "phase": "arrival",
               "when": arrival, "event": target, "weekly_event": weekly.get(entity),
               "mode_id": episode["destination_mode_id"], "reason": None,
               "blocked_until": None, "return_at": arrival}
        if reason:
            row.update(phase="suspended", when=None, event=None, reason=reason,
                       blocked_until=_blocked_until(owner, entity, now))
        else:
            # Ownership is due/latching, never the preparation preview's reached flag.
            owns = plan is not None and (dt_util.as_utc(plan.when) <= dt_util.as_utc(now)
                                        or runtime.is_preparing(entity))
            if plan is not None and not owns:
                row.update(phase="preparation", when=plan.when, event=plan)
            candidate = weekly.get(entity)
            if not owns and candidate is not None and dt_util.as_utc(candidate.when) < dt_util.as_utc(row["when"]):
                continue
        rows[entity] = row
    return _sorted(rows.values())


def _weekly_row(event, mode_id):
    return {"entity_id": event.entity_id, "source": "weekly_schedule", "phase": "scheduled",
            "when": event.when, "event": event, "weekly_event": event, "mode_id": mode_id,
            "reason": None, "blocked_until": None, "return_at": None}


def _blocked_until(owner, entity, now):
    """Only report a deadline if every active blocker has a known expiry."""
    if owner._stopped or owner.temperature_migration_blocked:
        return None
    expiries = []
    if owner.mode != "auto":
        expiries.append(parse_instant(owner._data["global_"].get("paused_until"))
                        if owner.mode == "paused" else None)
    pauses = owner._active_zone_pause_reasons(entity, now)
    if pauses:
        expiries.extend(parse_instant(item.get("until")) for item in pauses)
    override = owner._data["zones"][entity].get("override") or {}
    if override.get("type") != "pause" and owner._is_zone_override_active(entity, now):
        expiries.append(parse_instant(override.get("until")))
    return max(expiries) if expiries and all(item is not None for item in expiries) else None


def _sorted(rows):
    return sorted(rows, key=lambda row: (row["when"] is None,
                  dt_util.as_utc(row["when"] or row["return_at"]), row["entity_id"]))
