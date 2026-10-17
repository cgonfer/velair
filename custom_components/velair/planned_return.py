"""Backend-owned occupancy episodes and scheduled return preparation."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from dataclasses import asdict, replace
from datetime import datetime, timedelta
import logging
import math

from homeassistant.core import callback
from homeassistant.helpers.event import async_track_point_in_time, async_track_state_change_event
from homeassistant.util import dt as dt_util

from .models import WEEKDAYS, ClimateEvent, temperature_target_from_mapping
from .planned_return_preparation import preparation_status

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

    @property
    def config(self):
        return self.scheduler._data.get("planned_return", {})

    @property
    def episode(self):
        # Storage sees the proposed cancellation, but timers/listeners retain
        # committed authority until the atomic selection save succeeds.
        return self._cancel_previous_episode or self.scheduler._data.get("planned_return_episode")

    def suppress_departure_delivery(self):
        return bool(self.episode and self.episode["state"] == "away" and self.occupancy() == "home")

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

    def plans(self, now):
        episode = self.episode
        arrival = parse_instant((episode or {}).get("return_at"))
        if not self.available() or not episode or episode["state"] != "away" or arrival is None or arrival <= now:
            return []
        owner = self.scheduler
        try:
            profiles = self.profiles(episode["destination_mode_id"])
        except ValueError:
            return []
        events = []
        for entity, zone in owner._data["zones"].items():
            if not zone["enabled"] or owner._is_external_execution(entity):
                continue
            schedule = owner._effective_schedule_from_profiles(profiles, entity)
            target = owner._current_schedule_event_for_schedule(entity, schedule, dt_util.as_local(arrival))
            if target is None or target.action != "set_temperature":
                continue
            block = {"start": target.start, "action": target.action, "temperature_only": target.temperature_only, **temperature_target_from_mapping({key: value for key, value in asdict(target).items() if value is not None})}
            if target.hvac_mode:
                block["hvac_mode"] = target.hvac_mode
            if target.temperature_only and owner._current_hvac_mode(entity) == "off":
                continue
            start, diagnostics = owner._preconditioned_event_details(entity, zone, block, arrival)
            if start >= arrival:
                if entity not in episode.get("preparing_entities", []) or entity in self._temperature_only_suspensions:
                    continue
                start = parse_instant(episode["started_at"]) or now
            events.append(replace(target, when=start, target_when=arrival, preconditioning_diagnostics=diagnostics))
        return events

    @callback
    def mark_temperature_only_suspended(self, entity):
        """Relinquish preparation immediately; the runtime tick owns persistence."""
        episode = self.episode
        if not episode or episode.get("state") != "away":
            return False
        arrival = parse_instant(episode.get("return_at"))
        if arrival is None:
            return False
        try:
            profiles = self.profiles(episode["destination_mode_id"])
        except ValueError:
            return False
        schedule = self.scheduler._effective_schedule_from_profiles(profiles, entity)
        target = self.scheduler._current_schedule_event_for_schedule(entity, schedule, dt_util.as_local(arrival))
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
        if entity not in owner._data["zones"] or owner._is_zone_override_active(entity, now):
            return None
        return next((event for event in self.plans(now) if event.entity_id == entity and (event.when <= now or self.is_preparing(entity))), None)

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
            profiles = self.profiles(mode_id)
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
        elif previous is not None and (self.episode or {}).get("state") != "away":
            self._emit("confirmation_reset", reason="absence_not_confirmed")

    def status(self):
        now = dt_util.now()
        episode = self.episode
        plans = self.plans(now)
        state = (episode or {}).get("state", "idle" if self.config.get("enabled") else "disabled")
        if self._confirmation is not None:
            state = "confirming_absence"
        elif state == "away" and any(self.target(event.entity_id, now) for event in plans):
            state = "preparing"
        if self.error:
            state = "error"
        arrival = parse_instant((episode or {}).get("return_at"))
        if (episode or {}).get("state") not in ("armed", "away") or arrival is None or arrival <= now:
            arrival = None
        mode_id = (episode["destination_mode_id"] if arrival else self.config.get("destination_mode_id", "default"))
        preparation = preparation_status(self, now, arrival, mode_id, plans)
        terminal = (episode or {}).get("state") in ("cancelled", "fulfilled", "skipped")
        dismissed = terminal and (episode or {}).get("dismissed") is True
        episode_active = (episode or {}).get("state") in ("armed", "away")
        return {"state": state, "occupancy": self.occupancy(), "sources": self.sources(), "origin": (episode or {}).get("origin"), "can_start": self.can_start(), "dismissed": dismissed, "can_dismiss": terminal and not dismissed, "episode_active": episode_active, "can_cancel": episode is not None and not dismissed, "notice": getattr(self, "notice", None), "return_at": (episode or {}).get("return_at"), "departure_at": (episode or {}).get("departure_at"), "away_mode_id": (episode or {}).get("away_mode_id"), "destination_mode_id": (episode or {}).get("destination_mode_id"), "absence_confirm_at": self._confirmation.isoformat() if self._confirmation else None, "preparation": preparation, "zones": [{"entity_id": event.entity_id, "start_at": event.when.isoformat(), "target_when": event.target_when.isoformat(), **temperature_target_from_mapping({key: value for key, value in asdict(event).items() if value is not None}), "preparing": self.target(event.entity_id, now) is not None} for event in plans], "error": self.error}

    @callback
    def refresh(self):
        """Rebind changed configuration and schedule the next real action."""
        self._timer_generation += 1
        if self._timer:
            self._timer()
            self._timer = None
        if not self.available():
            self.stop()
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
        if self.error:
            return
        eligible_departure = bool(self.source_ids()) and ((self.episode or {}).get("state") == "armed" or (self.episode is None and self.config.get("enabled")))
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
            try:
                profiles = self.profiles(episode["destination_mode_id"])
            except ValueError:
                profiles = None
            if profiles is not None:
                for entity in episode.get("preparing_entities", []):
                    if owner._current_hvac_mode(entity) != "off":
                        continue
                    schedule = owner._effective_schedule_from_profiles(profiles, entity)
                    target = owner._current_schedule_event_for_schedule(entity, schedule, dt_util.as_local(arrival))
                    if target is not None and target.temperature_only:
                        self.mark_temperature_only_suspended(entity)
        times = [self._confirmation] if self._confirmation else []
        if self._temperature_only_suspensions:
            times.append(now)
        if self.episode and self.episode["state"] in ("armed", "away"):
            arrival = parse_instant(self.episode.get("return_at"))
            if arrival:
                times.append(arrival)
            times.extend(event.when for event in self.plans(now) if self._applied.get(event.entity_id) != self._intent(event) and not owner._is_zone_override_active(event.entity_id, now))
        if self.occupancy() == "home" and self.episode is not None and self.episode["state"] != "armed":
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
            await owner._async_save_data()
        except BaseException:
            owner._data["planned_return_episode"] = previous
            raise
        finally:
            self._persistence_depth -= 1

    async def _select(self, mode_id, *, episode=None, on_persisted=None):
        owner = self.scheduler
        async with owner._profile_mutation_lock:
            current_episode = self.episode
            if episode is not None and episode["state"] == "fulfilled" and (not current_episode or current_episode["state"] not in ("away", "skipped")):
                return
            sensorless_manual = episode is not None and episode.get("origin") == "manual" and not self.source_ids()
            if episode is not None and episode["state"] == "away" and not sensorless_manual and self.occupancy() != "away":
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
                if on_persisted is not None:
                    on_persisted()
                if episode is not None and (current_episode or {}).get("state") != episode["state"]:
                    if episode["state"] == "away":
                        self._emit("departed")
                    elif episode["state"] == "fulfilled":
                        self._emit("fulfilled")

            try:
                if ids == owner.active_profile_ids and mode_marker == owner.active_mode_id and not owner.profile_selection["zone_profile_overrides"]:
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
                elif presence == "home":
                    if episode and episode.get("dismissed") is True:
                        await self._persist_episode(None)
                    elif episode is None or episode["state"] != "armed":
                        await self.arrive()
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
                        for event in self.plans(now):
                            if event.when > now or self._applied.get(event.entity_id) == self._intent(event) or self.scheduler._is_zone_override_active(event.entity_id, now):
                                continue
                            updated = deepcopy(self.episode)
                            if event.entity_id not in updated["preparing_entities"]:
                                updated["preparing_entities"].append(event.entity_id)
                                await self._persist_episode(updated)
                                self._emit("preparation_started", entity_id=event.entity_id)
                            await self.scheduler._async_apply_event(event, source="planned_return", applied_at=now)
                            self._applied[event.entity_id] = self._intent(event)
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

    async def _fulfill(self):
        episode = self.episode
        if not episode or episode["state"] not in ("away", "skipped"):
            return
        # Latch before selection so profile transition resolves destination normally.
        updated = deepcopy(episode)
        updated["state"] = "fulfilled"
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

    async def start(self, return_at):
        arrival = self.validate_return_at(return_at)
        if not self.operational():
            raise ValueError("Enable Automatic scheduling before planning a return")
        sensorless = not self.source_ids()
        if not sensorless:
            self.validate_sources()
        self.validate_transition()
        if self.episode and self.episode["state"] in ("armed", "away"):
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
        if sensorless:
            updated.update(state="away", departure_at=updated["started_at"])

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
            if sensorless:
                await self._select(updated["away_mode_id"], episode=updated, on_persisted=accept_start)
            else:
                await self._persist_episode(updated)
                accept_start()
        except BaseException:
            if restarting or sensorless:
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
