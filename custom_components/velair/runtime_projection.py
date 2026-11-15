"""Backend-owned prepared nominal schedules and live thermal projections."""
from __future__ import annotations
from copy import deepcopy
from dataclasses import replace
from datetime import datetime, timezone

from homeassistant.util import dt as dt_util

from .models import normalize_preconditioning_data, preconditioning_prediction_time_input
from .schedule_projection import PreparedSchedule, utc
from .projection_inputs import input_value, thermal_input, target_feature_presence

_CAPABILITY_FIELDS = (
    "min_temp", "max_temp", "target_temp_step", "temperature_unit",
    "supported_features", "hvac_modes", "fan_modes", "preset_modes", "unit_of_measurement",
    "swing_modes", "swing_horizontal_modes", "min_humidity", "max_humidity",
)


def capability_state_signature(state):
    """Ignore ordinary readings while observing capability/availability changes."""
    attributes = state.attributes if state is not None else {}
    return (getattr(state, "state", None) in (None, "unknown", "unavailable"),
            tuple((key, input_value(attributes.get(key))) for key in _CAPABILITY_FIELDS),
            target_feature_presence(attributes))


def _past(value, now):
    try:
        instant = datetime.fromisoformat(value)
        return instant.tzinfo is not None and utc(instant) <= utc(now)
    except (TypeError, ValueError):
        return False


def _preset_keys(value):
    if isinstance(value, dict):
        key = value.get("preset_key")
        if isinstance(key, str):
            yield key
        for item in value.values():
            yield from _preset_keys(item)
    elif isinstance(value, list):
        for item in value:
            yield from _preset_keys(item)


class RuntimeScheduleProjection:
    """One detached nominal schedule and thermal forecast per zone."""
    def __init__(self, owner, resolve_occurrences, parse_start, make_event):
        self.owner = owner
        self.resolve_occurrences = resolve_occurrences
        self.parse_start = parse_start
        self.make_event = make_event
        self.schedules = {}
        self.schedule_resolution = {}
        self.preconditioning = {}
        self.configuration_revision = 0
        self.configuration_data = None
        self.published_room_sensor_schedules = ()
        self.generation = 0
        self._configuration_inputs = {}
        self._runtime_configuration = None
        self._forecast_inputs = {}
        self._raw_forecasts = {}
        self._raw_generations = {}
        self._thermal_results = {}
        self._source_forecast_contexts = {}
        self._resolution_at = None
        self._next_resolution_deadline = None
        self._resolved_forecasts = ()
        self._forecasts_by_entity = {}
        self._next_by_entity = {}
        self._resolution_inputs = {}
        self._resolution_at_by_entity = {}
        self._resolution_deadlines = {}
        self._dependency_dirty = set()
        self._preconditioning_inputs = {}
        self.masters = {}
        self.dependents = {}
        self.entity_order = {}
        self.dependency_contexts = {}
        self._relations_contexts = {}
        self._authority_inputs = {}
        self._authority_contexts = {}
        self._authority_generation = 0
        self._candidate_inputs = {}
        self.candidates = set()
        self.candidate_sources = {}
        self.preparing = False

    def _configuration_input(self, entity, zone):
        owner = self.owner
        behavior = owner._profile_zone_behavior(entity)
        source = behavior if behavior.get("behavior") == "schedule" else zone
        links = source.get("template_links", {})
        keys = {link.get("template_key") for link in links.values() if isinstance(link, dict)}
        templates = [item for item in owner._data.get("templates", []) if item.get("key") in keys]
        presets = set(_preset_keys([source.get("schedule", {}), links, templates]))
        resources = [item for item in owner._data.get("block_presets", []) if item.get("key") in presets]
        state = owner.climate_state(entity)
        attrs = state.attributes if state is not None else {}
        return (
            source.get("schedule", {}), links, templates, resources,
            behavior.get("behavior"), zone.get("target_range_modes"),
            zone.get("target_range_reference"),
            getattr(state, "state", None) in (None, "unknown", "unavailable"),
            owner.get_temperature_step(entity),
            owner.get_temperature_limits(entity),
            (tuple((key, input_value(attrs.get(key))) for key in _CAPABILITY_FIELDS), target_feature_presence(attrs)),
        )

    def capabilities_current(self, entity):
        """Compare live capabilities without resolving any schedule resources."""
        previous = self._configuration_inputs.get(entity)
        if previous is None:
            return False
        owner = self.owner
        state = owner.climate_state(entity)
        if state is None or state.state in ("unknown", "unavailable"):
            return True
        attrs = state.attributes
        current = (owner.get_temperature_step(entity), owner.get_temperature_limits(entity),
                   (tuple((key, input_value(attrs.get(key))) for key in _CAPABILITY_FIELDS), target_feature_presence(attrs)))
        return previous[-3:] == current

    def prepare_configuration(self, now, *, refresh_horizon=False):
        """Install detached committed inputs at an explicit producer boundary."""
        owner = self.owner
        changed = False
        configured = set(owner._data["zones"])
        for entity in set(self.schedules) - configured:
            self.schedules.pop(entity, None)
            self.schedule_resolution.pop(entity, None)
            self.preconditioning.pop(entity, None)
            owner._room_sensor_schedules.entries.pop(entity, None)
            self._configuration_inputs.pop(entity, None)
            self._forecast_inputs.pop(entity, None)
            self._raw_forecasts.pop(entity, None)
            self._thermal_results.pop(entity, None)
            self._source_forecast_contexts.pop(entity, None)
            self._candidate_inputs.pop(entity, None)
            self.candidates.discard(entity)
            self.candidate_sources.pop(entity, None)
            changed = True
        for entity, zone in owner._data["zones"].items():
            signature = self._configuration_input(entity, zone)
            previous = self.schedules.get(entity)
            different = signature != self._configuration_inputs.get(entity)
            if different or previous is None:
                schedule, resolution = owner._resolve_effective_schedule(entity, zone)
                self.schedule_resolution[entity] = resolution
                self.schedules[entity] = PreparedSchedule(
                    entity, schedule, now, self.resolve_occurrences, self.parse_start, self.make_event)
                self._configuration_inputs[entity] = deepcopy(signature)
                self._forecast_inputs.pop(entity, None)
                changed = True
            elif refresh_horizon and previous.needs_horizon_refresh(now):
                self.schedules[entity] = PreparedSchedule(
                    entity, previous.week, now, self.resolve_occurrences, self.parse_start, self.make_event)
                self._forecast_inputs.pop(entity, None)
            raw_preconditioning = input_value(zone.get("preconditioning"))
            if raw_preconditioning != self._preconditioning_inputs.get(entity) or entity not in self.preconditioning:
                self.preconditioning[entity] = normalize_preconditioning_data(zone.get("preconditioning"))
                owner._room_sensor_schedules.configure(entity, self.preconditioning[entity], now)
                self._preconditioning_inputs[entity] = raw_preconditioning
        runtime_configuration = (
            {entity: (zone.get("enabled"), zone.get("execution"), zone.get("preconditioning"),
                      zone.get("target_range_reference"), zone.get("target_range_modes"), zone.get("day_layout_key"))
             for entity, zone in owner._data["zones"].items()},
            owner._data.get("room_groups", {}), owner._data.get("modes", []),
            owner._data.get("global_", {}), owner._data.get("planned_return", {}),
            owner._data.get("profiles", []), owner._data.get("templates", []),
            owner._data.get("block_presets", []), owner._data.get("day_layouts", {}),
            owner._data.get("configuration_revision", 0),
        )
        if runtime_configuration != self._runtime_configuration:
            self._runtime_configuration = deepcopy(runtime_configuration)
            changed = True
        self._prepare_topology()
        if owner._data != self.configuration_data:
            self.configuration_data = deepcopy(owner._data)
            self.published_room_sensor_schedules = tuple(
                zone["preconditioning"]["room_sensor_schedule"]
                for zone in self.configuration_data["zones"].values()
                if isinstance(zone.get("preconditioning"), dict)
                and isinstance(zone["preconditioning"].get("room_sensor_schedule"), dict))
        if changed:
            self.configuration_revision += 1
            invalidate = getattr(owner._planned_return, "invalidate_configuration", None)
            if invalidate is not None:
                invalidate()
        return changed

    def _prepare_topology(self):
        owner = self.owner
        zones = owner._data["zones"]
        self.entity_order = {entity: index for index, entity in enumerate(zones)}
        self.masters = {entity: zone.get("preconditioning", {}).get("master_entity_id")
                        for entity, zone in zones.items()}
        children = {}
        for entity, master in self.masters.items():
            if master:
                children.setdefault(master, []).append(entity)
        self.dependents = {master: tuple(items) for master, items in children.items()}
        self._relations_contexts = {
            entity: tuple((key, self.masters.get(key)) for key in zones
                          if key == entity or self.masters.get(key) == entity)
            for entity in zones}
        globals_ = owner._data.get("global_", {})
        for entity, zone in zones.items():
            authority = input_value((
                tuple((key, zone.get(key)) for key in (
                    "enabled", "execution", "preconditioning", "override", "pauses",
                    "target_range_modes", "target_range_reference")),
                owner._data.get("room_groups", {}).get(entity),
                globals_.get("active_profile_ids"), globals_.get("base_profile_ids"),
                globals_.get("zone_profile_overrides", {}).get(entity),
                self._configuration_inputs.get(entity), self._relations_contexts[entity]))
            if authority != self._authority_inputs.get(entity):
                self._authority_generation += 1
                self._authority_inputs[entity] = authority
                self._authority_contexts[entity] = self._authority_generation
        compute = getattr(owner, "_compute_dependency_context", owner._dependency_context)
        self.dependency_contexts = {entity: compute(entity, None) for entity in zones}
        for mapping in (self._resolution_inputs, self._resolution_at_by_entity,
                        self._resolution_deadlines, self._forecasts_by_entity,
                        self._next_by_entity, self._raw_generations, self._authority_inputs,
                        self._authority_contexts, self._preconditioning_inputs):
            for entity in mapping.keys() - zones.keys():
                mapping.pop(entity, None)
        self._dependency_dirty.intersection_update(zones)

    def authority_entities(self, entity):
        master = self.masters.get(entity)
        return frozenset((entity, master)) if master else frozenset((entity,))

    def related_entities(self, entity):
        return self.authority_entities(entity) | frozenset(self.dependents.get(entity, ()))

    def relations_context(self, entity):
        return list(self._relations_contexts.get(entity, ()))

    def authority_context(self, entity):
        return tuple((key, self._authority_contexts.get(key)) for key in
                     sorted(self.authority_entities(entity), key=lambda key: self.entity_order.get(key, -1)))

    def schedule(self, entity):
        item = self.schedules.get(entity)
        return item.week if item is not None else None

    def current(self, entity, now, *, copy=True):
        item = self.schedules.get(entity)
        return item.current(now, copy=copy) if item is not None and item.is_current_horizon(now) else None

    def block(self, entity, weekday, start):
        item = self.schedules.get(entity)
        return item.blocks.get((weekday, start)) if item is not None else None

    def _forecast_input(self, entity, zone, now):
        owner = self.owner
        config = self.preconditioning.get(entity, {})
        learning = owner._data.get("preconditioning_learning", {}).get(entity, {})
        prediction_time = preconditioning_prediction_time_input(
            learning, config, dt_util.as_utc(dt_util.now()))
        return (
            self.schedules.get(entity), now.date(), zone.get("enabled"),
            owner._is_external_execution(entity), owner._is_zone_override_active(entity, now),
            thermal_input(owner, entity, config) if config.get("enabled") else None,
            self._preconditioning_inputs.get(entity), input_value(learning), prediction_time,
        )

    def _resolution_input(self, entity, now):
        owner = self.owner
        scope = self.authority_entities(entity)
        master = self.masters.get(entity)
        anchors = tuple((key, input_value(anchor)) for key, anchor in
                        owner._data.get("preconditioning_accepted_anchors", {}).items()
                        if anchor.get("entity_id") in scope)
        markers = tuple((key, input_value(marker)) for key, marker in
                        owner._applied_preconditioning_targets.items()
                        if key.split("|", 1)[0] in scope)
        ordered = sorted(scope, key=lambda key: self.entity_order.get(key, -1))
        return (
            self.authority_context(entity),
            tuple((key, self._raw_generations.get(key, 0)) for key in ordered),
            tuple((key, getattr(owner.climate_state(key), "state", None))
                  for key in ordered),
            self.current(master, now, copy=False) if master else None,
            owner._preconditioning_master_reason_detail(master, now) if master else None,
            anchors, markers, owner._dependency_episode(),
        )

    def _resolve_entity(self, entity, now, signature):
        owner = self.owner
        instant = utc(now)
        scope = self.authority_entities(entity)
        raw = [event for key in scope for event in self._raw_forecasts.get(key, ())
               if utc(event.target_when or event.when) > instant]
        raw.sort(key=lambda event: ((event.target_when or event.when).date(),
                                   self.entity_order.get(event.entity_id, -1), event.start or ""))
        resolved = tuple(event for event in owner._resolve_preconditioning_dependencies(
            raw, now, entities=scope) if event.entity_id == entity)
        changed = resolved != self._forecasts_by_entity.get(entity, ())
        self._forecasts_by_entity[entity] = resolved
        upcoming, deadlines = None, []
        for event in resolved:
            nominal, application = utc(event.target_when or event.when), utc(event.when)
            deadlines.extend(value for value in (application, nominal) if value > instant)
            due = event.target_when is not None and application <= instant < nominal
            if nominal <= instant or application <= instant and not due:
                continue
            if upcoming is None or application < utc(upcoming.when):
                upcoming = event
        for anchor in owner._data.get("preconditioning_accepted_anchors", {}).values():
            if anchor.get("entity_id") not in scope:
                continue
            try:
                expiry = datetime.fromisoformat(anchor.get("expires_at"))
                if expiry.tzinfo is not None and utc(expiry) > instant:
                    deadlines.append(utc(expiry))
            except (ValueError, TypeError):
                pass
        if upcoming is None:
            self._next_by_entity.pop(entity, None)
        else:
            self._next_by_entity[entity] = upcoming
        self._resolution_inputs[entity] = signature
        self._resolution_at_by_entity[entity] = instant
        self._resolution_deadlines[entity] = min(deadlines, default=None)
        self._dependency_dirty.discard(entity)
        return changed

    def reconcile(self, now, entities=None):
        """Reconcile local thermal inputs and affected dependency projections."""
        owner = self.owner
        selected = set(owner._data["zones"]) if entities is None else {entity for entity in entities if entity in owner._data["zones"]}
        changed = set()
        reference = datetime(2000, 1, 1, tzinfo=timezone.utc)
        for entity in sorted(selected, key=lambda key: self.entity_order.get(key, -1)):
            zone = owner._data["zones"][entity]
            signature = (*self._forecast_input(entity, zone, now), owner._preconditioned_event_details)
            previous = self._forecast_inputs.get(entity)
            if signature == previous:
                continue
            prepared = self.schedules.get(entity)
            eligible = (prepared is not None and zone.get("enabled")
                        and not owner._is_external_execution(entity)
                        and not owner._is_zone_override_active(entity, now))
            results = {}
            if eligible:
                for key, block in prepared.thermal_contexts.items():
                    start, diagnostics = owner._preconditioned_event_details(entity, zone, block, reference)
                    results[key] = (reference - start, deepcopy(diagnostics))
            source_entry = owner._room_sensor_schedules.entries.get(entity)
            source_context = ((source_entry["prepared"], owner._temperature_source_entity_id(entity))
                              if source_entry else None)
            source_changed = source_context != self._source_forecast_contexts.get(entity)
            if source_context is not None:
                self._source_forecast_contexts[entity] = source_context
            else:
                self._source_forecast_contexts.pop(entity, None)
            rebuild = (previous is None or source_changed or signature[:5] != previous[:5]
                       or results != self._thermal_results.get(entity))
            if rebuild:
                events = []
                if eligible:
                    for row in prepared.future(now):
                        nominal = row.event
                        key = prepared.thermal_context_ids[(nominal.weekday, nominal.start)]
                        lead, diagnostics = results[key]
                        start = nominal.when - lead
                        if not prepared.window_is_valid(start, nominal.when):
                            start, diagnostics = nominal.when, None
                        if entity in owner._room_sensor_schedules.entries:
                            requested_start = start
                            start = owner._room_sensor_schedules.earliest_start(entity, start, nominal.when, now)
                            if utc(start) >= utc(nominal.when):
                                start, diagnostics = nominal.when, None
                            elif utc(start) != utc(requested_start) and diagnostics is not None:
                                diagnostics = {**diagnostics, "final_lead_minutes": max(0, int(round(
                                    (utc(nominal.when) - utc(start)).total_seconds() / 60)))}
                        early = utc(start) != utc(nominal.when)
                        events.append(replace(nominal, when=start,
                            target_when=nominal.when if early else None,
                            preconditioning_diagnostics=deepcopy(diagnostics) if early else None))
                self._raw_forecasts[entity] = tuple(events)
                self._raw_generations[entity] = self._raw_generations.get(entity, 0) + 1
                changed.add(entity)
            self._thermal_results[entity] = results
            self._forecast_inputs[entity] = signature
        pending = set(selected)
        visited = set()
        instant = utc(now)
        while pending:
            entity = min(pending, key=lambda key: (bool(self.masters.get(key)), self.entity_order.get(key, -1)))
            pending.remove(entity)
            if entity in visited or entity not in owner._data["zones"]:
                continue
            visited.add(entity)
            signature = self._resolution_input(entity, now)
            previous_at = self._resolution_at_by_entity.get(entity)
            deadline = self._resolution_deadlines.get(entity)
            crossed = (previous_at is None or instant < previous_at
                       or deadline is not None and instant >= deadline)
            if (entity in self._dependency_dirty or crossed
                    or signature != self._resolution_inputs.get(entity)):
                if self._resolve_entity(entity, now, signature):
                    changed.add(entity)
                children = set(self.dependents.get(entity, ()))
                self._dependency_dirty.update(children)
                pending.update((children & selected) - visited)
        if changed:
            self.generation += 1
        return frozenset(changed)

    def future(self, now, entity=None):
        """Return detached forecasts, assembling global output only on request."""
        if entity is not None:
            prepared = self.schedules.get(entity)
            if prepared is None or not prepared.is_current_horizon(now):
                return []
            source = self._forecasts_by_entity.get(entity, ())
        else:
            if any(not item.is_current_horizon(now) for item in self.schedules.values()):
                return []
            source = [event for events in self._forecasts_by_entity.values() for event in events]
            source.sort(key=lambda event: (
                bool(self.masters.get(event.entity_id)),
                (event.target_when or event.when).date(),
                self.entity_order.get(event.entity_id, -1), event.start or ""))
        cutoff = utc(now)
        return [deepcopy(event) for event in source if utc(event.target_when or event.when) > cutoff]

    def due(self, entity, now):
        """Read the prepared next event without scanning other occurrences."""
        schedule = self.schedules.get(entity)
        if schedule is None or not schedule.is_current_horizon(now):
            return None
        event = self._next_by_entity.get(entity)
        if event is not None and event.target_when is not None and utc(event.when) <= utc(now) < utc(event.target_when):
            return deepcopy(event)
        return None

    def update_candidates(self, now, entities=None):
        """Maintain listener contributions from prepared per-zone authority."""
        owner = self.owner
        selected = owner._data["zones"] if entities is None else entities
        for entity in selected:
            zone = owner._data["zones"].get(entity)
            if zone is None:
                continue
            config = owner._prepared_preconditioning(entity)
            if (owner.mode != "auto" or owner._temperature_migration_blocked or owner._stopped
                    or owner._is_external_execution(entity)
                    or entity in owner._room_sensor_assist_suppressed
                    or not zone.get("enabled") or owner._is_zone_override_active(entity, now)
                    or not config.get("room_sensor_assist_enabled") or not config.get("room_temperature_entity_id")):
                self.candidates.discard(entity)
                self.candidate_sources.pop(entity, None)
                self._candidate_inputs.pop(entity, None)
                continue
            target = owner._room_sensor_assist_target_event(entity, now=now)
            supports = owner._room_sensor_assist_supports_single_target(entity, getattr(target, "hvac_mode", None))
            signature = (
                owner.mode, owner._temperature_migration_blocked, owner._stopped,
                owner._is_external_execution(entity), entity in owner._room_sensor_assist_suppressed,
                zone.get("enabled"), owner._is_zone_override_active(entity, now),
                config.get("room_sensor_assist_enabled"), config.get("room_temperature_entity_id"),
                target, supports,
            )
            signature = input_value(signature)
            if signature == self._candidate_inputs.get(entity):
                continue
            self._candidate_inputs[entity] = signature
            candidate = (
                owner.mode == "auto" and not owner._temperature_migration_blocked and not owner._stopped
                and not owner._is_external_execution(entity)
                and entity not in owner._room_sensor_assist_suppressed
                and zone.get("enabled") and not owner._is_zone_override_active(entity, now)
                and config.get("room_sensor_assist_enabled") and config.get("room_temperature_entity_id")
                and target is not None
                and (target.temperature is not None or target.target_temp_low is not None and target.target_temp_high is not None)
                and (target.temperature is None or supports))
            if candidate:
                self.candidates.add(entity)
                self.candidate_sources[entity] = frozenset((entity, config["room_temperature_entity_id"]))
            else:
                self.candidates.discard(entity)
                self.candidate_sources.pop(entity, None)
