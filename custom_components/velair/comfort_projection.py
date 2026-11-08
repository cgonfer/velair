"""Maintained physical Comfort readings with explicit consumed dependencies."""
from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
import math

from .room_groups import comfort_settings


def _value(value):
    """Detach configuration values without conflating booleans and numbers."""
    if isinstance(value, dict):
        return (dict, tuple(sorted(((_value(key), _value(item))
                                   for key, item in value.items()), key=repr)))
    if isinstance(value, (list, tuple)):
        return (type(value), tuple(_value(item) for item in value))
    if isinstance(value, (set, frozenset)):
        return (type(value), frozenset(_value(item) for item in value))
    if isinstance(value, float) and math.isnan(value):
        return (type(value), "nan")
    if isinstance(value, float) and value == 0:
        return (type(value), value, math.copysign(1.0, value))
    return (type(value), value)


def _same_value(left, right):
    """Compare detached configuration without allocating a key on each read."""
    if type(left) is not type(right):
        return False
    if isinstance(left, dict):
        if not (left.keys() == right.keys()):
            return False
        for key, item in left.items():
            other = right[key]
            if type(item) is not type(other):
                return False
            if isinstance(item, (dict, list, tuple)):
                if not _same_value(item, other):
                    return False
            elif isinstance(item, float) and math.isnan(item):
                if not math.isnan(other):
                    return False
            elif not (item == other):
                return False
            elif isinstance(item, float) and item == 0 and other == 0:
                if math.copysign(1.0, item) != math.copysign(1.0, other):
                    return False
        return True
    if isinstance(left, (list, tuple)):
        if len(left) != len(right):
            return False
        for item, other in zip(left, right):
            if type(item) is not type(other):
                return False
            if isinstance(item, (dict, list, tuple)):
                if not _same_value(item, other):
                    return False
            elif isinstance(item, float) and math.isnan(item):
                if not math.isnan(other):
                    return False
            elif not (item == other):
                return False
            elif isinstance(item, float) and item == 0 and other == 0:
                if math.copysign(1.0, item) != math.copysign(1.0, other):
                    return False
        return True
    if isinstance(left, float) and math.isnan(left):
        return math.isnan(right)
    if isinstance(left, float) and left == 0 and right == 0:
        return math.copysign(1.0, left) == math.copysign(1.0, right)
    return left == right


@dataclass
class _Entry:
    context: tuple
    settings: dict | None
    assessment: dict | None = None
    reads: dict = field(default_factory=dict)


@dataclass
class _Capture:
    stale_after: int
    reads: dict = field(default_factory=dict)
    changed: bool = False


class ComfortProjection:
    """Own normalized settings and current prepared assessments per climate."""

    def __init__(self, owner, freshness):
        self.owner = owner
        self.freshness = freshness
        self._entries = {}
        self._captures = []

    def _context(self, entity):
        owner = self.owner
        physical = owner._data["zones"].get(entity)
        if physical is not None and entity.startswith("climate."):
            raw = physical.get("comfort", {})
        else:
            group = next((key for key, value in owner._data.get("room_groups", {}).items()
                          if entity in value["members"]), None)
            if group is None:
                return (False,), None
            raw = owner._data.get("member_comfort", {}).get(
                entity, owner._data["zones"][group].get("comfort", {}))
            physical = {}
        preconditioning = physical.get("preconditioning")
        fallback = (preconditioning.get("room_temperature_entity_id")
                    if isinstance(preconditioning, dict) else None)
        return (True, raw, owner._comfort_temperature_unit(entity), fallback), raw

    def _settings_entry(self, entity):
        owner = self.owner
        while True:
            context, raw = self._context(entity)
            saved = self._entries.get(entity)
            if (not owner._projection_save_depth and saved is not None
                    and _same_value(saved.context, context)):
                return saved
            # The raw source is mutable. Detach before normalization or any
            # nested callback can change the inputs being prepared.
            context = deepcopy(context)
            settings = (owner._normalize_comfort_for_entity(entity, raw)
                        if context[0] else None)
            if not _same_value(self._context(entity)[0], context):
                continue
            entry = _Entry(context, settings)
            if not owner._projection_save_depth and context[0]:
                self._entries[entity] = entry
            return entry

    def settings(self, entity):
        """Validate current configuration before returning detached settings."""
        return deepcopy(self._settings_entry(entity).settings)

    def enabled_entities(self, entities):
        """Capture the scan's initial eligibility before any outward events."""
        entities = tuple(entities)
        if not self.owner._projection_save_depth:
            for retired in self._entries.keys() - set(entities):
                self._entries.pop(retired, None)
        enabled = []
        for entity in entities:
            raw = comfort_settings(self.owner._data, entity)
            source = dict(raw) if isinstance(raw, dict) else {}
            if bool(source.get("enabled", False)):
                enabled.append(entity)
        return tuple(enabled)

    def configuration_changes(self):
        """Find pending in-place settings changes without evaluating assessments."""
        return {entity for entity, entry in self._entries.items()
                if not _same_value(self._context(entity)[0], entry.context)}

    def _state_value(self, state, stale_after):
        if state is None:
            return None
        attributes = getattr(state, "attributes", {})
        return (_value(getattr(state, "state", None)),
                tuple((key, key in attributes, _value(attributes.get(key)))
                      for key in ("current_temperature", "current_humidity",
                                  "unit_of_measurement")),
                self.freshness(state, stale_after))

    def read_state(self, entity):
        """Capture each dependency when read, including in reentrant builders."""
        state = self.owner.climate_state(entity)
        for capture in self._captures:
            value = self._state_value(state, capture.stale_after)
            if entity in capture.reads and capture.reads[entity] != value:
                capture.changed = True
            capture.reads[entity] = value
        return state

    def _matches(self, entry):
        stale_after = entry.settings["stale_after_minutes"] if entry.settings else 0
        return all(self._state_value(self.read_state(entity), stale_after) == value
                   for entity, value in entry.reads.items())

    def current(self, entity, *, detached=True):
        """Reconcile live inputs before every read; never return a changed build."""
        owner = self.owner
        while True:
            epoch = owner._observation_epoch
            entry = self._settings_entry(entity)
            if (not owner._projection_save_depth and entry.assessment is not None
                    and self._matches(entry)
                    and _same_value(self._context(entity)[0], entry.context)
                    and epoch == owner._observation_epoch):
                return deepcopy(entry.assessment) if detached else entry.assessment
            capture = _Capture(entry.settings["stale_after_minutes"] if entry.settings else 0)
            self._captures.append(capture)
            try:
                assessment = owner._build_comfort_assessment(entity)
            finally:
                self._captures.pop()
            built = _Entry(entry.context, entry.settings, assessment, capture.reads)
            if (capture.changed or not _same_value(self._context(entity)[0], entry.context)
                    or not self._matches(built) or epoch != owner._observation_epoch):
                continue
            if not owner._projection_save_depth and entry.context[0]:
                self._entries[entity] = built
            return deepcopy(assessment) if detached else assessment
