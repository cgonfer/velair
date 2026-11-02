"""Backend-owned occupancy episodes and scheduled return preparation."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from contextlib import nullcontext
from dataclasses import asdict, replace
from datetime import datetime, timedelta
import logging
import math

from homeassistant.core import callback
from homeassistant.helpers.event import async_track_point_in_time, async_track_state_change_event
from homeassistant.util import dt as dt_util

from .models import WEEKDAYS, ClimateEvent, temperature_target_from_mapping, normalize_preconditioning_data, preconditioning_observations_for_direction
from .planned_return_preparation import preparation_status
from .projection_inputs import input_value, thermal_input

_LOGGER = logging.getLogger(__name__)


def occupancy(state, entity_id=None) -> str:
    """Interpret supported HA presence signals with fail-closed unknown states."""
    value = getattr(state, "state", None)
    if entity_id == "zone.home":
        try:
            count = float(value)
        except (TypeError, ValueError):
            return "unknown"
        if not math.isfinite(count) or count < 0 or not count.is_integer():
            return "unknown"
        return "home" if count > 0 else "away"
    if value in ("on", "home"):
        return "home"
    if value in ("off", "not_home"):
        return "away"
    return "unknown"


def parse_instant(value) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(value)
        return dt_util.as_utc(parsed) if parsed.tzinfo is not None else None
    except (TypeError, ValueError):
        return None


class PlannedReturnRuntime:
    """Own one persisted absence episode and event-driven timers."""

    def __init__(self, scheduler):
        self.scheduler = scheduler
        self._listener = None
        self._timer = None
        self._entities = ()
        self._generation = 0
        self._timer_generation = 0
        self._confirmation = None
        self._lock = asyncio.Lock()
        self.error = None
        self._applied = {}
        self._temperature_only_suspensions = set()
        self._persistence_depth = 0
        self._reported_confirmation = None
        self._last_error = None
        self._cancel_previous_episode = None
        self._projection_configuration = None
        self._projection_inputs = None
        self._nominal_key = None
        self._projected_profiles = {}
        self._destination_profiles = None
        self._prepared_schedules = {}
        self._prepared_nominals = {}
        self._prepared_arrival_effects = {}
        self.generation = 0
        self._prepared_events = ()
        self._prepared_by_entity = {}
        self._prepared_status = {}
        self._prepared_until = None
        self._prepared_at = None
        self._preparing = False
        self._projection_eligibility = None
        self._prepared_can_start = False
        self.control_generation = 0
        self._zone_order = ()
        self._zone_positions = {}
        self._zone_configs = {}
        self._zone_config_values = {}
        self._return_blocks = {}
        self._return_relations = {}
        self._return_dependents = {}
        self._has_return_master = False
        self._profile_effects = {}
        self._dependency_contexts = {}
        self._dependency_context_key = None
        self._dependency_episode_key = None
        self._zone_prediction_inputs = {}
        self._prediction_values = {}
        self._prepared_predictions = {}
        self._raw_return_events = {}
        self._raw_return_inputs = {}
        self._zone_resolution_inputs = {}
        self._zone_live_inputs = {}
        self._zone_row_inputs = {}
        self._zone_row_facts = {}
        self._zone_rows = {}
        self._zone_external = {}
        self._control_events = {}
        self._control_pending = set()
        self._resolution_dirty = set()
        self._status_dirty = True
        self._published_plans_key = None

    @property
    def config(self):
        return self.scheduler._data.get("planned_return", {})

    @property
    def episode(self):
        # Storage sees the proposed cancellation, but timers/listeners retain
        # committed authority until the atomic selection save succeeds.
        return self._cancel_previous_episode or self.scheduler._data.get("planned_return_episode")

    def suppress_departure_delivery(self):
        return bool(self.episode and self.episode["state"] == "away" and self.occupancy() == "home"
                    and not self.awaiting_departure_confirmation())

    def awaiting_departure_confirmation(self):
        """Manual Away is active, but presence must not yet count as a return."""
        episode = self.episode or {}
        return episode.get("state") in ("away", "skipped") and episode.get("awaiting_departure_confirmation") is True

    def operational(self):
        owner = self.scheduler
        return bool(not owner._stopped
                    and not owner.temperature_migration_blocked and owner.mode == "auto")

    def available(self, episode=None):
        episode = self.episode if episode is None else episode
        manual = (episode or {}).get("origin") == "manual"
        terminal = (episode or {}).get("state") in ("fulfilled", "cancelled", "skipped")
        return self.operational() and bool(manual or (
            self.source_ids() and (self.config.get("enabled") or terminal)))

    def source_ids(self):
        sources = self.config.get("occupancy_entity_ids")
        if isinstance(sources, list):
            return sources
        legacy = self.config.get("occupancy_entity_id")
        return [legacy] if legacy else []

    def sources(self):
        return [{"entity_id": entity, "state": occupancy(
            self.scheduler._hass.states.get(entity), entity
        )} for entity in self.source_ids()]

    def occupancy(self):
        states = [source["state"] for source in self.sources()]
        if "home" in states:
            return "home"
        if states and all(state == "away" for state in states):
            return "away"
        return "unknown"

    def validate_sources(self):
        sources = self.source_ids()
        if not sources:
            raise ValueError("Configure at least one occupancy source before planning a return")
        for entity in sources:
            if entity != "zone.home" and entity.split(".", 1)[0] not in ("binary_sensor", "input_boolean", "group"):
                raise ValueError(f"Unsupported occupancy source: {entity}")
            if self.scheduler._hass.states.get(entity) is None:
                raise ValueError(f"Occupancy entity is unavailable: {entity}")

    def can_start(self):
        if not self.operational() or (self.episode or {}).get("state") not in (None, "armed", "away", "cancelled", "fulfilled", "skipped"):
            return False
        try:
            if self.source_ids():
                self.validate_sources()
            self.validate_transition()
        except (ValueError, KeyError):
            return False
        return True

    @callback
    def stop(self, *, preserve_confirmation=False):
        self._temperature_only_suspensions.clear()
        self._generation += 1
        self._timer_generation += 1
        if self._listener:
            self._listener()
        if self._timer:
            self._timer()
        self._listener = self._timer = None
        self._entities = ()
        if not preserve_confirmation:
            self._confirmation = None
            self._reported_confirmation = None
        self._applied.clear()

    def profiles(self, mode_id):
        if mode_id == "default":
            return []
        mode = next((item for item in self.scheduler.get_modes() if item["key"] == mode_id), None)
        if mode is None:
            raise ValueError(f"Unknown return mode: {mode_id}")
        # Validation canonicalizes schedules. Read projections must not silently
        # normalize persisted profiles while describing a return.
        profiles = [deepcopy(self.scheduler._profile_by_id(key)) for key in mode["profile_ids"]]
        if any(item is None for item in profiles):
            raise ValueError("Return mode references a missing profile")
        for item in profiles:
            self.scheduler._validate_profile(item)
        return profiles

    def validate_transition(self):
        owner = self.scheduler
        configurations = [owner._active_profiles(), self.profiles(self.config["away_mode_id"]), self.profiles(self.config["destination_mode_id"])]
        for entity in owner._data["zones"]:
            if owner._is_external_execution(entity):
                effects = [owner._profile_effect_from_profiles(profiles, entity) for profiles in configurations]
                if any(effect != effects[0] for effect in effects[1:]):
                    raise ValueError(f"Planned return requires local execution for {entity}")

    def invalidate_configuration(self):
        """Retire derived destination data after a configuration commit."""
        self._projection_configuration = None
        self._projection_inputs = None
        self._nominal_key = None
        self._projection_eligibility = None
        self._projected_profiles.clear()

    def _profiles_for_projection(self, mode_id):
        if mode_id not in self._projected_profiles:
            try:
                self._projected_profiles[mode_id] = self.profiles(mode_id)
            except ValueError:
                self._projected_profiles[mode_id] = None
        profiles = self._projected_profiles[mode_id]
        if profiles is None:
            raise ValueError("Return mode references a missing or invalid profile")
        return profiles

    def prepared_profiles(self):
        """Read the destination context without validating or resolving it."""
        return deepcopy(self._destination_profiles or [])

    def prepared_arrival_effects(self):
        """Read active/destination effects already resolved for the arrival."""
        return deepcopy(self._prepared_arrival_effects)

    def prepared_schedule(self, entity):
        """Read an already resolved destination week, never materialize it."""
        return deepcopy(self._prepared_schedules.get(entity))

    def _nominal_context(self, now):
        owner = self.scheduler
        revision = getattr(getattr(owner, "_schedule_projection", None), "configuration_revision", 0)
        episode = self.episode or {}
        arrival = parse_instant(episode.get("return_at"))
        if episode.get("state") not in ("armed", "away") or arrival is None or arrival <= now:
            arrival = None
        mode_id = episode["destination_mode_id"] if arrival else self.config.get("destination_mode_id", "default")
        return (revision, mode_id, arrival), arrival, mode_id

    def control_ready(self, entity, now):
        """Fail closed if a local guard encounters unprepared Return authority."""
        episode = self.episode or {}
        arrival = parse_instant(episode.get("return_at"))
        if episode.get("state") != "away" or arrival is None or arrival <= now:
            return True
        key, _arrival, _mode = self._nominal_context(now)
        pending = getattr(self.scheduler, "_projection_pending_entities", {})
        return (key == self._nominal_key and self.scheduler._dependency_episode() == self._dependency_episode_key
                and entity in self._zone_positions and entity not in self._control_pending and entity not in pending
                and self._return_relations.get(entity) not in pending)

    def prepared_profile_effect(self, entity):
        """Read only the small destination ownership descriptor."""
        profile, behavior = self._profile_effects.get(entity, (None, {"behavior": "normal"}))
        return profile, dict(behavior)

    def prepared_dependency_context(self, entity):
        """Read the committed anchor context without hashing calendar inputs."""
        return self._dependency_contexts.get(entity)

    def _prepare_nominal_context(self, now, key, arrival, mode_id):
        owner = self.scheduler
        revision = key[0]
        if revision != self._projection_configuration:
            self._projected_profiles.clear()
            self._projection_configuration = revision
        if key == self._nominal_key:
            self._prepare_dependency_contexts()
            return
        episode = self.episode or {}
        if episode.get("away_mode_id"):
            try:
                self._profiles_for_projection(episode["away_mode_id"])
            except ValueError:
                pass
        try:
            profiles = self._profiles_for_projection(mode_id)
        except ValueError:
            profiles = None
        order = tuple(owner._data["zones"])
        schedules, nominals, effects, profile_effects = {}, {}, {}, {}
        local_arrival = dt_util.as_local(arrival) if arrival is not None else None
        active = owner._active_profiles() if local_arrival is not None and profiles is not None else []
        configs, config_values, relations, dependents, blocks = {}, {}, {}, {}, {}
        for entity in order:
            zone = owner._data["zones"][entity]
            config = normalize_preconditioning_data(zone.get("preconditioning"))
            configs[entity] = config
            config_values[entity] = input_value((
                config, zone.get("target_range_reference"), zone.get("target_range_modes"),
                zone.get("target_temp_step_override"), zone.get("last_reported_target_temp_step")))
            relation = config.get("master_entity_id")
            relations[entity] = relation
            if relation:
                dependents.setdefault(relation, set()).add(entity)
            profile_id, behavior = owner._profile_effect_from_profiles(profiles or [], entity)
            descriptor = {"behavior": behavior["behavior"]}
            if "action" in behavior:
                descriptor["action"] = behavior["action"]
            profile_effects[entity] = (profile_id, descriptor)
            if local_arrival is not None and profiles is not None:
                schedule = owner._effective_schedule_from_profiles(profiles, entity)
                target = owner._current_schedule_event_for_schedule(entity, schedule, local_arrival)
                schedules[entity], nominals[entity] = schedule, target
                if target is not None and target.action == "set_temperature":
                    block = {"start": target.start, "action": target.action,
                             "temperature_only": target.temperature_only,
                             **temperature_target_from_mapping({name: value for name, value in asdict(target).items() if value is not None})}
                    if target.hvac_mode:
                        block["hvac_mode"] = target.hvac_mode
                    blocks[entity] = block
                before = owner._profile_transition_effect(active, entity, local_arrival)
                after = (profile_id, behavior["behavior"],
                         behavior.get("action") if behavior["behavior"] == "pause" else None, target)
                effects[entity] = (before, after)
        self._destination_profiles = profiles
        self._prepared_schedules, self._prepared_nominals = deepcopy(schedules), deepcopy(nominals)
        self._prepared_arrival_effects = deepcopy(effects)
        self._profile_effects = profile_effects
        self._zone_order, self._zone_positions = order, {entity: index for index, entity in enumerate(order)}
        self._zone_configs, self._zone_config_values, self._return_blocks = configs, config_values, blocks
        self._return_relations, self._return_dependents = relations, dependents
        self._has_return_master = any(relations.values())
        self._nominal_key = key
        self._control_pending.clear()
        for values in (self._zone_prediction_inputs, self._prediction_values, self._raw_return_events,
                       self._raw_return_inputs, self._zone_resolution_inputs, self._zone_row_inputs,
                       self._zone_rows, self._control_events, self._prepared_by_entity, self._prepared_predictions,
                       self._zone_live_inputs, self._zone_row_facts, self._zone_external):
            for entity in set(values) - self._zone_positions.keys():
                values.pop(entity, None)
        self._resolution_dirty.intersection_update(order)
        self._prepare_dependency_contexts()
        self._status_dirty = True

    def _prepare_dependency_contexts(self):
        owner = self.scheduler
        episode_key = owner._dependency_episode()
        context_key = (self._nominal_key, episode_key)
        if context_key == self._dependency_context_key:
            return
        compute = getattr(owner, "_compute_dependency_context", None)
        self._dependency_contexts = ({entity: compute(entity, episode_key) for entity in self._zone_order}
                                     if compute is not None and episode_key is not None else {})
        self._dependency_context_key, self._dependency_episode_key = context_key, episode_key
        self._resolution_dirty.update(self._zone_order)
        self._status_dirty = True

    def _authority_selection(self, entities):
        selected = {entity for entity in entities if entity in self._zone_positions}
        selected.update(master for entity in tuple(selected)
                        if (master := self._return_relations.get(entity)) in self._zone_positions)
        return tuple(sorted(selected, key=self._zone_positions.__getitem__))

    def _zone_inputs(self, entity, now, arrival):
        owner = self.scheduler
        zone = owner._data["zones"][entity]
        config = self._zone_configs[entity]
        target = self._prepared_nominals.get(entity)
        external = owner._is_external_execution(entity)
        consumes_temperature = target is not None and target.action == "set_temperature"
        thermal = thermal_input(owner, entity, config) if consumes_temperature else None
        mode_getter = getattr(owner._climate_manager, "effective_hvac_mode", None)
        effective_mode = (
            mode_getter(entity, None if target.temperature_only else target.hvac_mode,
                        ensure_on=not target.temperature_only,
                        range_target=target.target_temp_low is not None and target.target_temp_high is not None)
            if consumes_temperature and callable(mode_getter) else None)
        thermal = (thermal, effective_mode) if consumes_temperature else None
        learning = owner._data.get("preconditioning_learning", {}).get(entity, {}) if consumes_temperature else {}
        history = any(bool(preconditioning_observations_for_direction(learning, direction)) for direction in ("heat", "cool"))
        prediction = (arrival, target, self._zone_config_values[entity], thermal, input_value(learning),
                      dt_util.as_utc(now) if history else None,
                      owner._preconditioned_event_details, owner._adaptive_preconditioning_prediction)
        override = owner._is_zone_override_active(entity, now) if arrival is not None else False
        manual = owner._manual_control_status(entity, now) if override else None
        latched = self.is_preparing(entity)
        current_mode = owner._current_hvac_mode(entity) if target is not None and target.temperature_only else None
        gate = (self.available() and (self.episode or {}).get("state") == "away",
                zone.get("enabled"), external, current_mode, latched,
                entity in self._temperature_only_suspensions, (self.episode or {}).get("started_at"), self._has_return_master)
        row = (self._zone_config_values[entity], self._profile_effects.get(entity),
               zone.get("enabled"), external, owner.mode, owner._stopped,
               owner.temperature_migration_blocked, override, input_value(manual),
               (zone.get("override") or {}).get("type"), thermal, latched)
        return prediction, gate, row, external

    def _independent_return_event(self, entity, now, arrival, gate, prediction):
        target = self._prepared_nominals.get(entity)
        active, enabled, external, current_mode, latched, suspended, started_at, has_master = gate
        episode = self.episode or {}
        if (target is None or target.action != "set_temperature" or arrival is None
                or not active or episode.get("state") != "away" or not enabled or external
                or target.temperature_only and current_mode == "off"):
            return None
        start, diagnostics = prediction
        if start >= arrival:
            if not latched or suspended:
                return replace(target, when=arrival, target_when=None) if has_master else None
            start = parse_instant(started_at) or now
        return replace(target, when=start, target_when=arrival, preconditioning_diagnostics=diagnostics)

    def _anchor_inputs(self, entity, now, arrival):
        owner = self.scheduler
        target = self._prepared_nominals.get(entity)
        if target is None or arrival is None:
            return None
        key = owner._preconditioning_event_key(entity, target.weekday, target.start, arrival)
        anchor = owner._data.get("preconditioning_accepted_anchors", {}).get(key)
        marker = owner._applied_preconditioning_targets.get(key)
        expiry = parse_instant(anchor.get("expires_at")) if anchor else None
        marker_value = ((getattr(marker, "active_from", None), marker.target_when,
                         input_value(getattr(marker, "dependency", None)), marker.target_when > now)
                        if marker is not None else None)
        return input_value(anchor), expiry is not None and expiry > now, marker_value

    def _resolve_return_controls(self, now, selected, arrival):
        owner = self.scheduler
        episode = owner._dependency_episode()
        evidence = {entity: self._anchor_inputs(entity, now, arrival) for entity in selected}
        signatures = {}
        for entity in selected:
            master = self._return_relations.get(entity)
            event = self._raw_return_events.get(entity)
            source = self._raw_return_events.get(master)
            instants = tuple((item.when <= now, (item.target_when or item.when) > now)
                             for item in (event, source) if item is not None)
            signatures[entity] = (
                event, source, evidence.get(entity), evidence.get(master),
                self._zone_live_inputs.get(entity), self._zone_live_inputs.get(master), episode, instants,
                self._dependency_contexts.get(entity), self._dependency_contexts.get(master),
                owner._preconditioning_master_reason_detail(master, now, episode=episode) if master else None)
        if all(signatures[entity] == self._zone_resolution_inputs.get(entity)
               and entity not in self._resolution_dirty for entity in selected):
            return set()
        raw = [event for entity in selected if (event := self._raw_return_events.get(entity)) is not None]
        resolved = owner._resolve_preconditioning_dependencies(raw, now, episode=episode, entities=selected) if raw else []
        by_entity = {event.entity_id: event for event in resolved}
        changed = set()
        for entity in selected:
            event = by_entity.get(entity)
            if event != self._control_events.get(entity):
                changed.add(entity)
                if event is None:
                    self._control_events.pop(entity, None)
                else:
                    self._control_events[entity] = event
            if event is not None and event.target_when is not None:
                self._prepared_by_entity[entity] = event
            else:
                self._prepared_by_entity.pop(entity, None)
            if signatures[entity] != self._zone_resolution_inputs.get(entity):
                self._resolution_dirty.update(self._return_dependents.get(entity, ()))
            self._zone_resolution_inputs[entity] = signatures[entity]
        self._resolution_dirty.difference_update(selected)
        self._control_pending.difference_update(selected)
        return changed

    def _prepare_controls(self, now, selected, arrival):
        owner = self.scheduler
        changed = set()
        for entity in selected:
            prediction_key, gate, row, external = self._zone_inputs(entity, now, arrival)
            if prediction_key != self._zone_prediction_inputs.get(entity):
                target = self._prepared_nominals.get(entity)
                if target is not None and target.action == "set_temperature" and arrival is not None:
                    block = self._return_blocks[entity]
                    prediction = owner._preconditioned_event_details(entity, owner._data["zones"][entity], block, arrival)
                else:
                    prediction = (arrival, None)
                self._prepared_predictions[entity] = prediction
                self._prediction_values[entity] = input_value(prediction)
                self._zone_prediction_inputs[entity] = prediction_key
                changed.add(entity)
            raw_key = (self._prepared_nominals.get(entity), self._prediction_values.get(entity), gate)
            if raw_key != self._raw_return_inputs.get(entity):
                self._raw_return_events[entity] = self._independent_return_event(
                    entity, now, arrival, gate, self._prepared_predictions[entity])
                self._raw_return_inputs[entity] = raw_key
                changed.add(entity)
            if row != self._zone_row_facts.get(entity):
                changed.add(entity)
            self._zone_live_inputs[entity] = (gate, row)
            self._zone_row_facts[entity] = row
            self._zone_external[entity] = external
        changed.update(self._resolve_return_controls(now, selected, arrival))
        if changed:
            self.control_generation += 1
            self._status_dirty = True
        return changed

    def _publish_prepared_return(self, now, arrival, mode_id):
        owner = self.scheduler
        self._prepared_events = tuple(sorted(
            (self._control_events[entity] for entity in self._zone_order if entity in self._control_events),
            key=lambda event: bool(self._return_relations.get(event.entity_id))))
        plans = self.plans(now, include_nominal=True)
        events = {event.entity_id: event for event in plans}
        rows_changed = False
        for entity in self._zone_order:
            event = events.get(entity)
            row_key = (arrival, mode_id, self._destination_profiles is not None,
                       self._prepared_nominals.get(entity), self._zone_row_facts.get(entity),
                       self._prediction_values.get(entity), event,
                       event.when <= now if event is not None else None)
            if row_key == self._zone_row_inputs.get(entity):
                continue
            projection = preparation_status(
                self, now, arrival, mode_id, [event] if event is not None else [],
                prepared_profiles=self._destination_profiles, prepared_targets=self._prepared_nominals,
                prepared_predictions=self._prepared_predictions, prepared_configs=self._zone_configs,
                entities=(entity,))
            row = projection["zones"][0]
            rows_changed |= row != self._zone_rows.get(entity)
            self._zone_rows[entity] = row
            self._zone_row_inputs[entity] = row_key
        episode = self.episode or {}
        sources = self.sources()
        eligibility = (self._projection_configuration, self.operational(),
                       episode.get("state") in (None, "armed", "away", "cancelled", "fulfilled", "skipped"),
                       tuple((source, owner._hass.states.get(source) is not None) for source in self.source_ids()),
                       tuple((entity, self._zone_external.get(entity)) for entity in self._zone_order))
        if eligibility != self._projection_eligibility:
            self._prepared_can_start = self.can_start()
            self._projection_eligibility = eligibility
        household = (self._nominal_key, tuple((name, episode.get(name)) for name in (
            "state", "origin", "return_at", "departure_at", "away_mode_id", "destination_mode_id",
            "awaiting_departure_confirmation", "dismissed")), self._confirmation, self.error,
            getattr(self, "notice", None), input_value(sources), self._prepared_can_start)
        plans_key = input_value(self._prepared_events)
        if self._status_dirty or rows_changed or household != self._projection_inputs or plans_key != self._published_plans_key:
            status = self._build_prepared_status(now)
            if status != self._prepared_status or plans_key != self._published_plans_key:
                self._prepared_status = status
                self.generation += 1
            self._published_plans_key = plans_key
            self._projection_inputs = household
        self._prepared_at = dt_util.as_utc(now)
        self._status_dirty = False

    @callback
    def prepare(self, now, entities=None, publish=True):
        """Reconcile one control component or publish a complete read projection."""
        owner = self.scheduler
        if self._preparing or (publish or entities is None) and getattr(owner, "_projection_save_depth", 0):
            return frozenset()
        key, arrival, mode_id = self._nominal_context(now)
        if not publish and entities is not None:
            selected = self._authority_selection(entities)
            pending = getattr(owner, "_projection_pending_entities", {})
            selected = tuple(entity for entity in selected
                             if entity not in pending and self._return_relations.get(entity) not in pending)
            if not selected:
                return frozenset()
            if key != self._nominal_key or owner._dependency_episode() != self._dependency_episode_key:
                self._control_pending.update(selected)
                for entity in selected:
                    self._prepared_by_entity.pop(entity, None)
                self._status_dirty = True
                return frozenset(selected)
            if (self.episode or {}).get("state") != "away" or arrival is None:
                return frozenset()
        else:
            selected = None
        self._preparing = True
        try:
            if publish:
                self._prepare_nominal_context(now, key, arrival, mode_id)
                selected = self._zone_order
            elif selected is None:
                selected = self._zone_order
            changed = self._prepare_controls(now, selected, arrival)
            if publish:
                self._publish_prepared_return(now, arrival, mode_id)
            return frozenset(changed)
        finally:
            self._preparing = False

    def plans(self, now, *, include_nominal=False):
        """Read a prepared plan; producer boundaries own all prediction work."""
        episode = self.episode
        arrival = parse_instant((episode or {}).get("return_at"))
        if not self.available() or not episode or episode["state"] != "away" or arrival is None or arrival <= now:
            return []
        return deepcopy([event for event in self._prepared_events
                         if event.target_when is not None or include_nominal and event.preconditioning_dependency])

    @callback
    def mark_temperature_only_suspended(self, entity):
        """Relinquish preparation immediately; the runtime tick owns persistence."""
        episode = self.episode
        if not episode or episode.get("state") != "away":
            return False
        arrival = parse_instant(episode.get("return_at"))
        if arrival is None:
            return False
        target = self._prepared_nominals.get(entity)
        if target is None or not target.temperature_only:
            return False
        if entity not in episode.get("preparing_entities", []) and entity not in self._applied:
            return False
        self._temperature_only_suspensions.add(entity)
        self._applied.pop(entity, None)
        self.scheduler._invalidate_climate_delivery(entity)
        self.scheduler._discard_preconditioning_session(entity)
        self.scheduler._clear_applied_preconditioning_targets_for_entity(entity)
        return True

    async def async_suspend_temperature_only(self, entity):
        """Persist a suspension while the runtime/profile locks are held."""
        episode = self.episode
        if not episode or episode.get("state") != "away":
            self._temperature_only_suspensions.discard(entity)
            return False
        if entity not in self._temperature_only_suspensions:
            if not self.mark_temperature_only_suspended(entity):
                return False
        updated = deepcopy(episode)
        updated["preparing_entities"] = [item for item in episode.get("preparing_entities", []) if item != entity]
        await self._persist_episode(updated)
        self._temperature_only_suspensions.discard(entity)
        return True

    @staticmethod
    def _intent(event):
        return (event.target_when, event.temperature, event.target_temp_low, event.target_temp_high, event.hvac_mode, event.weekday, event.start, event.temperature_only)

    def is_preparing(self, entity):
        return entity not in self._temperature_only_suspensions and entity in (self.episode or {}).get("preparing_entities", [])

    def target(self, entity, now=None):
        now = now or dt_util.now()
        owner = self.scheduler
        if not self.control_ready(entity, now):
            return None
        if entity not in owner._data["zones"] or owner._is_zone_override_active(entity, now):
            return None
        episode = self.episode
        arrival = parse_instant((episode or {}).get("return_at"))
        if not self.available() or not episode or episode["state"] != "away" or arrival is None or arrival <= now:
            return None
        event = self._prepared_by_entity.get(entity)
        return deepcopy(event) if event is not None and (event.when <= now or self.is_preparing(entity)) and owner._dependency_delivery_allowed(event) else None

    def zone_context(self, entity, now, *, planned_target=None, effective_event=None, blocked=False):
        """Describe the winning return intent, never a forecast or delivery receipt."""
        owner = self.scheduler
        episode = self.episode
        zone = owner._data["zones"].get(entity)
        if (blocked or not self.operational() or not zone or not zone["enabled"]
                or not episode or episode["state"] != "away"
                or self.suppress_departure_delivery()):
            return None
        phase = "preparing" if planned_target is not None else "away"
        mode_id = episode["destination_mode_id" if phase == "preparing" else "away_mode_id"]
        if phase == "away" and owner.active_mode_id != (None if mode_id == "default" else mode_id):
            return None
        try:
            profiles = self._projected_profiles.get(mode_id)
            if profiles is None:
                return None
        except ValueError:
            return None
        profile = next((item for item in profiles if entity in item["zones"]), None)
        if phase == "away" and mode_id != "default" and profile is None:
            return None
        if phase == "away":
            active_profile = owner._active_profile_for_zone(entity)
            if (active_profile["key"] if active_profile else None) != (profile["key"] if profile else None):
                return None
        behavior = profile["zones"][entity] if profile else {"behavior": "normal"}
        if phase == "preparing":
            effect = "schedule"
        elif behavior["behavior"] == "pause":
            effect = "turn_off" if behavior.get("action") == "turn_off" else "pause"
        else:
            effect = "turn_off" if effective_event is not None and effective_event.action == "turn_off" else "schedule"
        return {"phase": phase, "origin": episode["origin"], "mode_id": mode_id,
                "profile_id": profile["key"] if profile else None, "effect": effect}

    @callback
    def _emit(self, transition, *, episode=None, **details):
        """Publish safe accepted transitions to bounded runtime diagnostics."""
        current = self.episode if episode is None else episode
        fields = ("origin", "state", "departure_at", "return_at", "away_mode_id", "destination_mode_id")
        data = {key: current[key] for key in fields if current and key in current}
        self.scheduler._async_fire_event("planned_return_changed", {
            **data, "transition": transition, **details})

    @callback
    def _report_confirmation(self):
        if self._persistence_depth or self._reported_confirmation == self._confirmation:
            return
        previous = self._reported_confirmation
        self._reported_confirmation = self._confirmation
        if self._confirmation is not None:
            self._emit("confirmation_started", absence_confirm_at=self._confirmation.isoformat())
        elif previous is not None and ((self.episode or {}).get("state") != "away" or self.awaiting_departure_confirmation()):
            self._emit("confirmation_reset", reason="absence_not_confirmed")

    def status(self):
        """Read the complete Return publication without rebuilding plans."""
        return deepcopy(self._prepared_status)

    def _build_prepared_status(self, now):
        episode = self.episode
        plans = self.plans(now, include_nominal=True)
        state = (episode or {}).get("state", "idle" if self.config.get("enabled") else "disabled")
        if self._confirmation is not None and not self.awaiting_departure_confirmation():
            state = "confirming_absence"
        elif state == "away" and any(self.target(event.entity_id, now) for event in plans):
            state = "preparing"
        if self.error:
            state = "error"
        arrival = parse_instant((episode or {}).get("return_at"))
        if (episode or {}).get("state") not in ("armed", "away") or arrival is None or arrival <= now:
            arrival = None
        mode_id = (episode["destination_mode_id"] if arrival else self.config.get("destination_mode_id", "default"))
        preparation = preparation_status(self, now, arrival, mode_id, plans,
            prepared_profiles=self._destination_profiles,
            prepared_targets=self._prepared_nominals,
            prepared_predictions=self._prepared_predictions,
            prepared_configs=self._zone_configs, prepared_rows=self._zone_rows)
        terminal = (episode or {}).get("state") in ("cancelled", "fulfilled", "skipped")
        dismissed = terminal and (episode or {}).get("dismissed") is True
        episode_active = (episode or {}).get("state") in ("armed", "away")
        return {"awaiting_departure_confirmation": self.awaiting_departure_confirmation(), "state": state, "occupancy": self.occupancy(), "sources": self.sources(), "origin": (episode or {}).get("origin"), "can_start": self._prepared_can_start, "dismissed": dismissed, "can_dismiss": terminal and not dismissed, "episode_active": episode_active, "can_cancel": episode is not None and not dismissed, "notice": getattr(self, "notice", None), "return_at": (episode or {}).get("return_at"), "departure_at": (episode or {}).get("departure_at"), "away_mode_id": (episode or {}).get("away_mode_id"), "destination_mode_id": (episode or {}).get("destination_mode_id"), "absence_confirm_at": self._confirmation.isoformat() if self._confirmation else None, "preparation": preparation, "zones": [{"entity_id": event.entity_id, "start_at": event.when.isoformat(), "target_when": (event.target_when or event.when).isoformat(), "preconditioning_dependency": event.preconditioning_dependency, **temperature_target_from_mapping({key: value for key, value in asdict(event).items() if value is not None}), "preparing": self.target(event.entity_id, now) is not None} for event in plans], "error": self.error}

    @callback
    def refresh(self):
        """Rebind changed configuration and schedule the next real action."""
        self._timer_generation += 1
        if self._timer:
            self._timer()
            self._timer = None
        if not self.available():
            self.stop()
            self.prepare(dt_util.now())
            return
        owner = self.scheduler
        entities = set(self.source_ids())
        for entity in owner._data["zones"]:
            entities.add(owner._temperature_source_entity_id(entity))
        entities = tuple(sorted(entities))
        if entities != self._entities:
            if self._listener:
                self._listener()
            self._generation += 1
            if self._entities:
                self._confirmation = None
            self._entities = entities
            generation = self._generation
            @callback
            def state_changed(event):
                if generation == self._generation:
                    self._state_changed(event)
            self._listener = async_track_state_change_event(owner._hass, entities, state_changed)
        now = dt_util.now()
        self.prepare(now)
        if self.error:
            return
        eligible_departure = bool(self.source_ids()) and (self.awaiting_departure_confirmation() or (self.episode or {}).get("state") == "armed" or (self.episode is None and self.config.get("enabled")))
        if not eligible_departure or self.occupancy() != "away":
            self._confirmation = None
        if self.occupancy() == "away" and eligible_departure and self._confirmation is None:
            self._confirmation = dt_util.as_utc(now) + timedelta(minutes=self.config["absence_delay_minutes"])
        self._report_confirmation()
        # Restart may restore a preparation latch while the device is OFF.
        # Remember the observed suspension synchronously so a rapid ON cannot
        # revive that old latch before its durable cleanup task runs.
        episode = self.episode or {}
        arrival = parse_instant(episode.get("return_at"))
        if episode.get("state") != "away" or arrival is None or arrival <= now:
            self._temperature_only_suspensions.clear()
        else:
            self._temperature_only_suspensions.intersection_update(episode.get("preparing_entities", []))
        if episode.get("state") == "away" and arrival is not None and arrival > now:
            for entity in episode.get("preparing_entities", []):
                target = self._prepared_nominals.get(entity)
                if owner._current_hvac_mode(entity) == "off" and target is not None and target.temperature_only:
                    self.mark_temperature_only_suspended(entity)
        self.prepare(now)
        times = [self._confirmation] if self._confirmation else []
        if self._temperature_only_suspensions:
            times.append(now)
        if self.episode and self.episode["state"] in ("armed", "away"):
            arrival = parse_instant(self.episode.get("return_at"))
            if arrival:
                times.append(arrival)
            times.extend(event.when for event in self.plans(now) if self._applied.get(event.entity_id) != self._intent(event) and not owner._is_zone_override_active(event.entity_id, now) and (event.when > now or owner._dependency_delivery_allowed(event)))
        if self.occupancy() == "home" and self.episode is not None and self.episode["state"] != "armed" and not self.awaiting_departure_confirmation():
            times.append(now)
        if times:
            when = max(now, min(times))
            generation, timer_generation = self._generation, self._timer_generation
            @callback
            def timer_fired(instant):
                if generation == self._generation and timer_generation == self._timer_generation:
                    self._timer_fired(instant)
            self._timer = async_track_point_in_time(owner._hass, timer_fired, when)

    @callback
    def _state_changed(self, event):
        if event.data.get("entity_id") in self.source_ids():
            self.error = None
            if self.occupancy() != "away":
                self._confirmation = None
        self.refresh()
        self.scheduler._async_write_state()

    @callback
    def _timer_fired(self, now):
        self._timer = None
        generation = self._generation
        self.scheduler._hass.async_create_task(self._tick(now, generation))

    async def _persist_episode(self, episode):
        owner = self.scheduler
        previous = deepcopy(self.episode)
        owner._data["planned_return_episode"] = episode
        self._persistence_depth += 1
        try:
            with getattr(owner, "_projection_save_scope", nullcontext)():
                await owner._async_save_data()
        except BaseException:
            owner._data["planned_return_episode"] = previous
            raise
        finally:
            self._persistence_depth -= 1
        self._projection_inputs = None
        self.prepare(dt_util.now())

    async def _select(self, mode_id, *, episode=None, on_persisted=None):
        owner = self.scheduler
        async with owner._profile_mutation_lock:
            current_episode = self.episode
            if episode is not None and episode["state"] == "fulfilled" and (not current_episode or current_episode["state"] not in ("away", "skipped")):
                return
            sensorless_manual = episode is not None and episode.get("origin") == "manual" and not self.source_ids()
            immediate_manual = episode is not None and episode.get("origin") == "manual" and episode.get("awaiting_departure_confirmation") is True
            if episode is not None and episode["state"] == "away" and not (sensorless_manual or immediate_manual) and self.occupancy() != "away":
                return
            if not self.available(episode):
                return
            self.validate_transition()
            profiles = self.profiles(mode_id)
            previous = deepcopy(owner._data)
            if episode is not None:
                owner._data["planned_return_episode"] = episode
            mode_marker = None if mode_id == "default" else mode_id
            ids = [profile["key"] for profile in profiles]
            committed = False
            self._persistence_depth += 1

            @callback
            def persisted():
                nonlocal committed
                committed = True
                self._persistence_depth -= 1
                self._projection_inputs = None
                self.prepare(dt_util.now())
                if on_persisted is not None:
                    on_persisted()
                if episode is not None and (current_episode or {}).get("state") != episode["state"]:
                    if episode["state"] == "away":
                        self._emit("departed")
                    elif episode["state"] == "fulfilled":
                        self._emit("fulfilled")

            try:
                if ids == owner.active_profile_ids and mode_marker == owner.active_mode_id and not owner.profile_selection["zone_profile_overrides"]:
                    with getattr(owner, "_projection_save_scope", nullcontext)():
                        await owner._async_save_data()
                    persisted()
                else:
                    await owner._async_activate_profiles_locked(ids, source="planned_return", mode_id=mode_marker, rollback_data=previous, on_persisted=persisted)
            except BaseException:
                if not committed:
                    self._persistence_depth -= 1
                    owner._data["planned_return_episode"] = previous.get("planned_return_episode")
                else:
                    # Delivery can be interrupted after the mode and episode
                    # are durable. Keep their return timer authority aligned.
                    self.refresh()
                raise

    async def _tick(self, now, generation):
        async with self._lock, self.scheduler._profile_mutation_lock:
            if generation != self._generation or not self.available():
                return
            try:
                presence = self.occupancy()
                episode = self.episode
                deadline = parse_instant((episode or {}).get("return_at"))
                # An unconfirmed absence must never apply Away at its deadline.
                if episode and episode["state"] == "armed" and deadline and deadline <= now:
                    await self._persist_episode(None)
                    self._emit("cancelled", episode=episode, reason="absence_not_confirmed_before_arrival")
                    self._confirmation = None
                elif presence == "home" and not self.awaiting_departure_confirmation():
                    if episode and episode.get("dismissed") is True:
                        await self._persist_episode(None)
                    elif episode is None or episode["state"] != "armed":
                        await self.arrive()
                elif self.awaiting_departure_confirmation() and presence == "away" and self._confirmation and now >= self._confirmation:
                    updated = deepcopy(episode)
                    updated.pop("awaiting_departure_confirmation", None)
                    await self._persist_episode(updated)
                    self._confirmation = None
                    self._emit("absence_confirmed")
                elif self.source_ids() and presence == "away" and self._confirmation and now >= self._confirmation and (episode is None or episode["state"] == "armed"):
                    self.validate_sources()
                    self.validate_transition()
                    if episode is None:
                        local_now = dt_util.as_local(now)
                        weekly_time = self.config["weekly"].get(WEEKDAYS[local_now.weekday()])
                        arrival = None
                        if weekly_time:
                            from .scheduler import _local_schedule_occurrences, _parse_start_time
                            arrival = min(_local_schedule_occurrences(local_now.date(), _parse_start_time(weekly_time), local_now.tzinfo), key=dt_util.as_utc)
                            if dt_util.as_utc(arrival) <= dt_util.as_utc(now):
                                arrival = None
                        episode = {"state": "away", "origin": "automatic", "started_at": now.isoformat(), "return_at": arrival.isoformat() if arrival else None, "away_mode_id": self.config["away_mode_id"], "destination_mode_id": self.config["destination_mode_id"], "preparing_entities": [], "previous_selection": self._selection_snapshot()}
                    else:
                        episode = deepcopy(episode)
                        episode["state"] = "away"
                    episode["departure_at"] = now.isoformat()
                    self._confirmation = None
                    await self._select(episode["away_mode_id"], episode=episode)
                episode = self.episode
                if episode and episode["state"] == "away":
                    arrival = parse_instant(episode.get("return_at"))
                    if arrival and now >= arrival:
                        await self._fulfill()
                    else:
                        for entity in tuple(self._temperature_only_suspensions):
                            await self.async_suspend_temperature_only(entity)
                            self._temperature_only_suspensions.discard(entity)
                        self.prepare(now)
                        for event in self.plans(now):
                            if event.when > now or self._applied.get(event.entity_id) == self._intent(event) or self.scheduler._is_zone_override_active(event.entity_id, now):
                                continue
                            if not self.scheduler._dependency_delivery_allowed(event):
                                continue
                            linked = bool(event.preconditioning_dependency) or any(zone.get("preconditioning", {}).get("master_entity_id") == event.entity_id for zone in self.scheduler._data["zones"].values())
                            if not linked and event.entity_id not in self.episode["preparing_entities"]:
                                # Preserve the existing independent preparation
                                # transaction and its storage failure behavior.
                                updated = deepcopy(self.episode)
                                updated["preparing_entities"].append(event.entity_id)
                                await self._persist_episode(updated)
                                self._emit("preparation_started", entity_id=event.entity_id)
                            episode_key = self.scheduler._dependency_episode()

                            async def accepted(is_current, *, applied_event=event, expected_episode=episode_key):
                                if not is_current() or expected_episode != self.scheduler._dependency_episode():
                                    return
                                # Recovery uses the same commit callback. Latch
                                # before yielding so an anchor wake cannot repeat
                                # the accepted master while storage is pending.
                                self._applied[applied_event.entity_id] = self._intent(applied_event)
                                self.scheduler._hass.async_create_task(self._persist_accepted_preparation(applied_event, expected_episode))

                            await self.scheduler._async_apply_event(event, source="planned_return", applied_at=now, on_success=accepted)
                            if self._applied.get(event.entity_id) == self._intent(event):
                                await self._persist_preparation_locked(event, episode_key)
                self.error = None
                self._last_error = None
            except Exception as err:
                if self._last_error != (type(err).__name__, str(err)):
                    self._emit("error", reason="transition_failed")
                    self._last_error = (type(err).__name__, str(err))
                self.error = str(err)
                _LOGGER.exception("Failed to process planned return")
                # Do not spin on an already-due failed transition.
                self._confirmation = None
                if self.episode and self.episode["state"] == "away":
                    try:
                        await self.cancel()
                    except Exception:
                        _LOGGER.exception("Failed to persist planned return cancellation")
            finally:
                self.refresh()
                self.scheduler._async_write_state()

    async def _persist_accepted_preparation(self, event, expected_episode):
        """Persist accepted preparation under runtime ownership, outside delivery."""
        async with self._lock, self.scheduler._profile_mutation_lock:
            try:
                await self._persist_preparation_locked(event, expected_episode)
            except Exception as err:
                self.error = str(err)
                self._last_error = (type(err).__name__, str(err))
                self.refresh()

    async def _persist_preparation_locked(self, event, expected_episode):
        if expected_episode != self.scheduler._dependency_episode() or self._applied.get(event.entity_id) != self._intent(event):
            return
        updated = deepcopy(self.episode)
        if event.entity_id in updated["preparing_entities"]:
            return
        updated["preparing_entities"].append(event.entity_id)
        try:
            await self._persist_episode(updated)
        except Exception:
            _LOGGER.warning("Accepted return preparation could not be persisted for %s", event.entity_id, exc_info=True)
            raise
        self._emit("preparation_started", entity_id=event.entity_id)

    async def _fulfill(self):
        episode = self.episode
        if not episode or episode["state"] not in ("away", "skipped"):
            return
        # Latch before selection so profile transition resolves destination normally.
        updated = deepcopy(episode)
        updated["state"] = "fulfilled"
        updated.pop("awaiting_departure_confirmation", None)
        owner = self.scheduler
        destination = self.profiles(episode["destination_mode_id"])
        unchanged = {entity for entity in episode.get("preparing_entities", []) if owner._profile_effect_from_profiles(owner._active_profiles(), entity) == owner._profile_effect_from_profiles(destination, entity)}
        await owner._async_expire_preconditioning_sessions(dt_util.now())
        await self._select(episode["destination_mode_id"], episode=updated)
        for entity in unchanged:
            owner._invalidate_climate_delivery(entity)
            owner._discard_preconditioning_session(entity)
            owner._clear_applied_preconditioning_targets_for_entity(entity)
            current = owner._current_schedule_event(entity, dt_util.now())
            if current is not None:
                await owner._async_apply_event(current, source="planned_return_arrived", applied_at=dt_util.now())
        self._applied.clear()

    async def arrive(self):
        if not self.available():
            raise ValueError("Planned return is unavailable or scheduler is stopped")
        if self.episode and self.episode["state"] == "armed":
            raise ValueError("Absence has not been confirmed for this return")
        if self.episode and self.episode["state"] in ("away", "skipped"):
            await self._fulfill()
        if self.occupancy() == "home" and self.episode:
            await self._persist_episode(None)
        self._confirmation = None
        self.refresh()

    async def cancel(self, *, skipped=False):
        episode = self.episode
        if skipped and (not episode or episode["state"] != "away"):
            raise ValueError("Only an active absence can skip its scheduled return")
        if episode is None and self.available() and self.occupancy() == "away":
            episode = {"state": "away", "origin": "automatic", "started_at": dt_util.now().isoformat(), "return_at": None, "away_mode_id": self.config["away_mode_id"], "destination_mode_id": self.config["destination_mode_id"], "preparing_entities": []}
        if episode and episode["state"] in ("armed", "away"):
            self._generation += 1
            self._entities = ()
            updated = deepcopy(episode)
            updated["state"] = "skipped" if skipped else "cancelled"
            if not skipped:
                updated.pop("awaiting_departure_confirmation", None)
            updated["preparing_entities"] = []
            await self._persist_episode(updated)
            self._emit("skipped" if skipped else "cancelled", previous_state=episode["state"])
            for entity in self.scheduler._data["zones"]:
                self.scheduler._invalidate_climate_delivery(entity)
                self.scheduler._discard_preconditioning_session(entity)
        self._confirmation = None
        self._applied.clear()
        self.refresh()

    async def adjust(self, return_at):
        arrival = self.validate_return_at(return_at)
        if not self.available() or not self.episode or self.episode["state"] not in ("armed", "away"):
            raise ValueError("There is no pending return to adjust")
        changed = arrival != parse_instant(self.episode.get("return_at"))
        previous_return_at = self.episode.get("return_at")
        previously_preparing = (set(self.episode.get("preparing_entities", [])) | set(self._applied)) if changed else set()
        previously_preparing.intersection_update(self.scheduler._data["zones"])
        updated = deepcopy(self.episode)
        if changed:
            updated["preparing_entities"] = []
        updated["return_at"] = arrival.isoformat()
        updated["origin"] = "manual"
        try:
            await self._persist_episode(updated)
        except BaseException:
            # Listeners may have rebound timers while storage exposed the draft.
            self.refresh()
            raise
        if changed:
            self._emit("arrival_changed", previous_return_at=previous_return_at)
        for entity in previously_preparing:
            self.scheduler._clear_applied_preconditioning_targets_for_entity(entity)
            if not self.scheduler._is_zone_override_active(entity, dt_util.now()):
                self.scheduler._invalidate_climate_delivery(entity)
                self.scheduler._discard_preconditioning_session(entity)
        if changed:
            self._applied.clear()
        self.refresh()
        for entity in previously_preparing:
            if self.scheduler._is_zone_override_active(entity, dt_util.now()):
                continue
            await self.scheduler._async_clear_room_sensor_assist(
                entity, restore=False, reason="planned_return_adjusted")
            if self.target(entity) is None:
                await self.scheduler.async_apply_current_schedule(entity, source="planned_return_adjusted")

    def validate_return_at(self, return_at):
        arrival = parse_instant(return_at)
        now = dt_util.now()
        if arrival is None or arrival <= dt_util.as_utc(now):
            raise ValueError("Return date and time must be in the future with a timezone")
        return arrival

    async def start(self, return_at, *, apply_away_now=False):
        if not isinstance(apply_away_now, bool):
            raise ValueError("apply_away_now must be a boolean")
        arrival = self.validate_return_at(return_at)
        if not self.operational():
            raise ValueError("Enable Automatic scheduling before planning a return")
        sensorless = not self.source_ids()
        if not sensorless:
            self.validate_sources()
        self.validate_transition()
        if self.episode and (self.episode["state"] == "away" or self.episode["state"] == "armed" and not apply_away_now):
            await self.adjust(arrival.isoformat())
            self.error = None
            self._last_error = None
            self.notice = None
            return
        restarting = (self.episode or {}).get("state") in ("cancelled", "fulfilled", "skipped")
        # Terminal preparation lists are history. Only a current runtime-owned
        # intent can justify replacing delivery during a fresh pending start.
        stale_preparation = set(self._applied) if restarting else set()
        stale_preparation.intersection_update(self.scheduler._data["zones"])
        updated = deepcopy(self.episode) if self.episode and not restarting else {
            "state": "armed", "started_at": dt_util.now().isoformat(),
            "away_mode_id": self.config["away_mode_id"],
            "destination_mode_id": self.config["destination_mode_id"],
            "preparing_entities": [],
            "previous_selection": self._selection_snapshot(),
        }
        updated.update(origin="manual", return_at=arrival.isoformat())
        immediate = sensorless or apply_away_now
        if immediate:
            updated.update(state="away", departure_at=dt_util.now().isoformat())
            if not sensorless:
                updated["awaiting_departure_confirmation"] = True

        @callback
        def accept_start():
            # A saved fresh intent owns runtime state even if subsequent climate
            # delivery is interrupted. Failed persistence retains the old state.
            if restarting:
                self.stop()
            self.error = None
            self._last_error = None
            self.notice = None
            for entity in stale_preparation:
                self.scheduler._clear_applied_preconditioning_targets_for_entity(entity)
                if not self.scheduler._is_zone_override_active(entity, dt_util.now()):
                    self.scheduler._invalidate_climate_delivery(entity)
                    self.scheduler._discard_preconditioning_session(entity)
            self._applied.clear()
            self._emit("registered")

        try:
            if immediate:
                await self._select(updated["away_mode_id"], episode=updated, on_persisted=accept_start)
            else:
                await self._persist_episode(updated)
                accept_start()
        except BaseException:
            if restarting or immediate:
                # A source event may have seen the tentative armed state while
                # storage was awaited. Reconcile timers with the restored latch.
                self.refresh()
            raise
        self.refresh()
        for entity in stale_preparation:
            if self.scheduler._is_zone_override_active(entity, dt_util.now()):
                continue
            try:
                await self.scheduler._async_clear_room_sensor_assist(
                    entity, restore=False, reason="planned_return_restarted")
                await self.scheduler.async_apply_current_schedule(
                    entity, source="planned_return_restarted")
            except Exception:
                _LOGGER.exception("Failed to restore current profile after restarting return for %s", entity)

    def _selection_snapshot(self):
        """Retain the exact selection, independently of future Mode edits."""
        return self.scheduler.profile_selection

    def _restorable_selection(self, episode):
        selection = episode.get("previous_selection")
        if episode["state"] != "away" or selection is None:
            return None
        owner = self.scheduler
        selection = {"profile_ids": selection.get("base_profile_ids", selection.get("profile_ids", [])),
                     "mode_id": selection.get("base_mode_id", selection.get("mode_id")),
                     "zone_profile_overrides": deepcopy(selection.get("zone_profile_overrides", {}))}
        owner._validate_zone_profile_overrides(selection["zone_profile_overrides"])
        claimed = set()
        for key in selection["profile_ids"]:
            profile = owner._profile_by_id(key)
            if profile is None:
                raise ValueError("The previous profile selection can no longer be restored")
            if claimed.intersection(profile["zones"]):
                raise ValueError("The previous profile selection now contains conflicting climates")
            claimed.update(profile["zones"])
        for profile in owner._selection_profiles(selection["profile_ids"], selection["zone_profile_overrides"]):
            owner._validate_profile(profile)
        mode_id = selection["mode_id"]
        mode = next((item for item in owner._data.get("modes", []) if item["key"] == mode_id), None)
        if mode_id is not None and (mode is None or mode["profile_ids"] != selection["profile_ids"]):
            mode_id = None
        return {"mode_id": mode_id, "profile_ids": selection["profile_ids"],
                "zone_profile_overrides": selection["zone_profile_overrides"]}

    async def cancel_pending(self):
        """Withdraw return authority and restore the selection before departure."""
        episode = self.episode
        if episode is None:
            raise ValueError("There is no planned return to cancel")
        if episode.get("dismissed") is True:
            return
        active = episode["state"] in ("armed", "away")
        preparing = set(episode.get("preparing_entities", [])) | set(self._applied) if active else set()
        preparing.intersection_update(self.scheduler._data["zones"])
        updated = deepcopy(episode)
        if active:
            updated["state"] = "cancelled"
            updated.pop("awaiting_departure_confirmation", None)
            updated["preparing_entities"] = []
        updated["dismissed"] = True
        owner = self.scheduler
        previous = deepcopy(owner._data)
        committed = False
        restore_error = None
        try:
            selection = self._restorable_selection(episode)
        except ValueError as err:
            # Deleted or incompatible Profiles must not trap the user in a trip.
            selection = None
            restore_error = str(err)

        @callback
        def persisted():
            nonlocal committed
            committed = True
            self._persistence_depth -= 1
            self._cancel_previous_episode = None
            self.stop()
            if active:
                self._emit("cancelled", previous_state=episode["state"])
            self.error = restore_error
            if restore_error is not None:
                self._emit("error", reason="restoration_unavailable")
            self.notice = None
            for entity in preparing:
                owner._clear_applied_preconditioning_targets_for_entity(entity)
                if not owner._is_zone_override_active(entity, dt_util.now()):
                    owner._invalidate_climate_delivery(entity)
                    owner._discard_preconditioning_session(entity)

        self._persistence_depth += 1
        self._cancel_previous_episode = episode
        owner._data["planned_return_episode"] = updated
        try:
            if selection is None or (selection["profile_ids"] == owner.active_profile_ids and selection["mode_id"] == owner.profile_selection["base_mode_id"] and selection["zone_profile_overrides"] == owner.profile_selection["zone_profile_overrides"]):
                with getattr(owner, "_projection_save_scope", nullcontext)():
                    await owner._async_save_data()
                persisted()
            else:
                await owner._async_activate_profiles_locked(
                    selection["profile_ids"], mode_id=selection["mode_id"],
                    source="planned_return", rollback_data=previous,
                    on_persisted=persisted,
                    zone_profile_overrides=selection["zone_profile_overrides"])
        except BaseException:
            if not committed:
                self._persistence_depth -= 1
                self._cancel_previous_episode = None
                owner._restore_profile_mutation_data(previous)
                owner._data["planned_return_episode"] = previous.get("planned_return_episode")
                self.refresh()
                raise
            # Delivery errors after the durable withdrawal cannot revive a trip.
            _LOGGER.exception("Climate delivery interrupted after cancelling planned return")
        if active:
            for entity in preparing:
                if owner._is_zone_override_active(entity, dt_util.now()):
                    continue
                try:
                    await owner._async_clear_room_sensor_assist(
                        entity, restore=False, reason="planned_return_cancelled")
                    if self.operational():
                        await owner.async_apply_current_schedule(
                            entity, source="planned_return_cancelled")
                except Exception:
                    # Cancellation is already committed. A climate delivery
                    # failure must never revive return authority or masquerade
                    # as a failed cancellation requiring an unsafe retry.
                    _LOGGER.exception("Failed to restore current profile after cancelling return for %s", entity)
        self.refresh()
