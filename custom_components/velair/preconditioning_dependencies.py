"""Pure occurrence selection and dependent preconditioning timing."""
from dataclasses import replace
from datetime import datetime, timezone

from .models import ClimateEvent


def resolve_dependencies(events, relations, *, source_events=(), accepted=None, directions=None):
    """Constrain independent plans without consulting runtime or mutating input.

    Select the closest nominal transition first, including ineligible transitions.
    A later eligible transition must never replace the selected ineligible one.
    """
    accepted = accepted or {}
    directions = directions or {}
    by_entity = {}
    for event in [*events, *source_events]:
        by_entity.setdefault(event.entity_id, {})[occurrence_id(event)] = event
    resolved = []
    for event in events:
        master = relations.get(event.entity_id)
        if not master:
            resolved.append(event)
            continue
        target = event.target_when or event.when
        choices = by_entity.get(master, {}).values()
        source = min(choices, key=lambda item: (
            abs((_utc(item.target_when or item.when) - _utc(target)).total_seconds()),
            _utc(item.target_when or item.when)), default=None)
        anchor = accepted.get(occurrence_id(source)) if source else None
        source_start = anchor or (source.when if source and source.target_when else None)
        reason = "planned"
        if source is None:
            reason = "master_missing"
        elif source_start is None:
            reason = "master_no_preconditioning"
        elif directions.get(occurrence_id(event)) and directions.get(occurrence_id(source)) and directions[occurrence_id(event)] != directions[occurrence_id(source)]:
            reason = "master_direction_mismatch"
        elif _utc(source_start) >= _utc(target):
            reason = "master_start_after_target"
        effective = max(event.when, source_start, key=_utc) if reason == "planned" and source_start else target
        if event.target_when is None:
            effective = target
        metadata = {
            "master_entity_id": master,
            "independent_start": event.when.isoformat(),
            "independent_lead_minutes": max(0, (_utc(target) - _utc(event.when)).total_seconds() / 60),
            "master_start": source_start.isoformat() if source_start else None,
            "master_target_when": (source.target_when or source.when).isoformat() if source else None,
            "master_occurrence_id": occurrence_id(source) if source else None,
            "master_start_accepted": anchor is not None,
            "effective_start": effective.isoformat(),
            "effective_lead_minutes": max(0, (_utc(target) - _utc(effective)).total_seconds() / 60),
            "reason": reason, "result": "constrained" if _utc(effective) < _utc(target) else "blocked",
        }
        resolved.append(replace(event, when=effective,
            target_when=target if _utc(effective) < _utc(target) else None,
            preconditioning_diagnostics=event.preconditioning_diagnostics if _utc(effective) < _utc(target) else None,
            preconditioning_dependency=metadata))
    return resolved


def occurrence_id(event: ClimateEvent) -> str:
    """Stable identity independent of a changing prediction."""
    return f"{event.entity_id}|{event.weekday}|{event.start}|{_utc(event.target_when or event.when).isoformat()}"


def _utc(value: datetime) -> datetime:
    return value.astimezone(timezone.utc)
