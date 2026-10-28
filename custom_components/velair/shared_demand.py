"""Event-driven control of shared heating/cooling supply switches.

Configuration is backend-owned; demand and timer deadlines live only in memory.
A single coalescing worker serializes service calls, including configuration changes.
"""
from __future__ import annotations

import asyncio
from collections import deque
from copy import deepcopy
from contextlib import nullcontext
from datetime import datetime, timedelta, timezone
import logging
import math
from typing import Any

from homeassistant import core
from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
from homeassistant.helpers.event import async_track_point_in_time, async_track_state_change_event
from homeassistant.util import dt as dt_util

from .const import SIGNAL_SCHEDULER_UPDATED
from .shared_demand_config import normalize_groups
from .shared_supply_notifications import SharedSupplyNotifications
from .target_format_policy import selected_range_boundary

_LOGGER = logging.getLogger(__name__)
SIGNAL_SHARED_DEMAND_UPDATED = "velair_shared_demand_updated"
SIGNAL_SHARED_DEMAND_LIVE_UPDATED = "velair_shared_demand_live_updated"
_RELEVANT = ("current_temperature", "temperature", "target_temp_low", "target_temp_high", "temperature_unit", "supported_features", "hvac_modes")


def _utc_now() -> datetime:
    """Use elapsed UTC time for protection delays across daylight-saving changes."""
    return dt_util.now().astimezone(timezone.utc)


def _finite(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        converted = float(value)
    except OverflowError:
        return None
    return converted if math.isfinite(converted) else None


def _control_settings(group: dict | None) -> dict | None:
    """Exclude metadata and dormant values from runtime invalidation."""
    if group is None:
        return None
    control = {**group, "hysteresis_mode": group.get("hysteresis_mode", "at_target")}
    control.pop("name", None)
    if control["hysteresis_mode"] != "custom":
        control.pop("hysteresis_stop", None)
        control["zones"] = {
            entity: {key: value for key, value in settings.items() if key != "hysteresis_stop"}
            for entity, settings in group["zones"].items()
        }
    return control


class SharedDemandController:
    """Estimate zoned demand without polling or one task per sensor event."""

    def __init__(self, hass, data: dict, save_callback, scheduler) -> None:
        self._hass = hass
        self._data = data
        self._save = save_callback
        self._scheduler = scheduler
        self._groups: dict[str, dict] = {}
        self._status: dict[str, dict] = {}
        self._live_status: dict[str, dict] = {}
        self._live_initialized = False
        self._phases: dict[tuple[str, str], tuple[tuple, bool]] = {}
        self._off_since: dict[str, datetime] = {}
        self._no_demand_since: dict[str, datetime] = {}
        self._demand_since: dict[str, datetime] = {}
        self._timers: dict[str, tuple[datetime, Any]] = {}
        self._commands: dict[str, tuple[bool, int]] = {}
        self._retry_due: dict[str, datetime] = {}
        self._contexts: deque[str] = deque(maxlen=512)
        self._retired: set[str] = set()
        self._retirement_failures: set[str] = set()
        self._cleanup_confirmed: set[str] = set()
        self._cleanup_save_attempts = 0
        self._cleanup_save_due: datetime | None = None
        self._pending_suspensions: set[str] = set()
        self._safety_suspended: set[str] = set()
        self._manual_off_versions: dict[str, int] = {}
        self._suspension_attempts: dict[str, int] = {}
        self._suspension_retry: dict[str, datetime] = {}
        self._suspension_failed: set[str] = set()
        self._unsub_states = None
        self._unsub_scheduler = None
        self._entities: tuple[str, ...] = ()
        self._task: asyncio.Task | None = None
        self._dirty = False
        self._dirty_groups: set[str] = set()
        self._entity_groups: dict[str, set[str]] = {}
        self._invalid_configuration = False
        self._started = False
        self._lock = asyncio.Lock()
        self._configuration_pending = False
        self._external_ons: dict[str, tuple[str, deque[str]]] = {}
        self._supply_notifications = SharedSupplyNotifications(hass)

    def get_statuses(self) -> dict[str, dict]:
        """Return a detached public snapshot, suitable for websocket responses."""
        return deepcopy(self._status)

    def get_live_statuses(self) -> dict[str, dict]:
        """Return committed readings, including observation-only inactive rooms."""
        return deepcopy(self._live_status)

    async def async_start(self) -> None:
        if self._started:
            return
        self._started = True
        self._unsub_scheduler = async_dispatcher_connect(
            self._hass, SIGNAL_SCHEDULER_UPDATED, self.reconfigure
        )
        self.reconfigure()

    async def async_stop(self) -> None:
        """Unload listeners and timers and settle any outstanding worker."""
        self._started = False
        self._external_ons.clear()
        await self._supply_notifications.async_stop()
        if self._unsub_states:
            self._unsub_states()
            self._unsub_states = None
        if self._unsub_scheduler:
            self._unsub_scheduler()
            self._unsub_scheduler = None
        for group_id in list(self._timers):
            self._cancel_timer(group_id)
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        # A manual-off write cancelled with the worker is not yet durable.
        # Settle it once before releasing ownership; never start a retry loop.
        if self._pending_suspensions or self._suspension_failed or self._suspension_retry:
            async with getattr(self._scheduler, "_profile_mutation_lock", nullcontext()), self._lock:
                self._pending_suspensions.update(self._suspension_failed)
                self._pending_suspensions.update(self._suspension_retry)
                await self._persist_suspensions()
        self._entities = ()
        self._dirty = False
        # Releasing ownership must not leave a shared supply running indefinitely.
        outputs = self._retired | {
            group["switch_entity_id"] for group in self._groups.values()
            if group["enabled"] and not group["suspended"]
            and group["id"] not in self._safety_suspended
        }
        for output in outputs:
            state = self._hass.states.get(output)
            if state is not None and state.state == "on":
                self._commands.pop(output, None)
                if not await self._command(output, False, None):
                    _LOGGER.error("Could not turn off shared supply %s during unload", output)
        self._groups = {}
        self._phases.clear()
        self._commands.clear()
        self._demand_since.clear()
        self._no_demand_since.clear()

    @callback
    def reconfigure(self, *_args) -> None:
        """Refresh configured entities after settings, import or scheduler changes."""
        if not self._started or self._configuration_pending:
            return
        data = getattr(self._scheduler, "_data", self._data)
        self._data = data
        raw = data.get("settings", {}).get("shared_demand_groups", [])
        try:
            # A removed managed climate remains visible as unknown demand. Validate
            # all other stored fields before installing listeners or touching outputs.
            declared = {entity for g in raw if isinstance(g, dict)
                        for entity in g.get("zones", {})} if isinstance(raw, list) else set()
            validated = normalize_groups(raw, set(data.get("zones", {})) | declared)
        except (ValueError, TypeError):
            if not self._invalid_configuration:
                _LOGGER.error("Invalid stored shared demand configuration; control disabled")
            self._invalid_configuration = True
            validated = []
        else:
            self._invalid_configuration = False
        groups = {g["id"]: g for g in validated}
        active_outputs = {g["switch_entity_id"] for g in groups.values() if g["enabled"]}
        previous_outputs = {g["switch_entity_id"] for g in self._groups.values() if g["enabled"]}
        for output in active_outputs ^ previous_outputs:
            # Disabled outputs may change without a group listener. Reacquiring
            # ownership must use their current last_changed, not an earlier off.
            self._off_since.pop(output, None)
            self._commands.pop(output, None)
            self._retry_due.pop(output, None)
        cleanup = data.get("settings", {}).get("shared_demand_cleanup", [])
        self._retired.update(entity for entity in cleanup
            if isinstance(entity, str) and entity.startswith("switch.") and core.valid_entity_id(entity))
        self._retired.difference_update(active_outputs)
        self._retirement_failures.difference_update(active_outputs)
        for output in active_outputs:
            self._cancel_timer(f"cleanup:{output}")
        for group_id, old in self._groups.items():
            new = groups.get(group_id)
            if old["enabled"] and old["switch_entity_id"] not in active_outputs:
                self._retired.add(old["switch_entity_id"])
            if new != old and _control_settings(new) != _control_settings(old):
                self._external_ons.pop(group_id, None)
                self._cancel_timer(group_id)
                self._no_demand_since.pop(group_id, None)
                self._demand_since.pop(group_id, None)
                self._commands.pop(old["switch_entity_id"], None)
                for key in [key for key in self._phases if key[0] == group_id]:
                    del self._phases[key]
        self._groups = groups
        # Room Assist commits can change demand without a device state event.
        # Preserve interruptions even when refreshes coalesce before evaluation.
        for group_id in list(self._demand_since):
            group = groups.get(group_id)
            if group is not None:
                self._reset_interrupted_demand(group)
        self._supply_notifications.retain(groups)
        self._manual_off_versions = {key: value for key, value in self._manual_off_versions.items() if key in groups}
        self._pending_suspensions.intersection_update(groups)
        self._safety_suspended.intersection_update(groups)
        self._suspension_failed.intersection_update(groups)
        self._suspension_retry = {key: value for key, value in self._suspension_retry.items() if key in groups}
        self._suspension_attempts = {key: value for key, value in self._suspension_attempts.items() if key in groups}
        entities = set(self._retired)
        entity_groups: dict[str, set[str]] = {}
        for group in groups.values():
            entities.add(group["switch_entity_id"])
            entity_groups.setdefault(group["switch_entity_id"], set()).add(group["id"])
            for entity_id in group["zones"]:
                members = getattr(self._scheduler, "physical_members", None)
                watched_members = data.get("room_groups", {}).get(entity_id, {}).get("members")
                if watched_members is None:
                    watched_members = members(entity_id) if callable(members) else [entity_id]
                for member_id in watched_members:
                    entities.add(member_id)
                    entity_groups.setdefault(member_id, set()).add(group["id"])
                preconditioning = data.get("zones", {}).get(entity_id, {}).get("preconditioning") or {}
                external = preconditioning.get("room_temperature_entity_id")
                native = data.get("room_groups", {}).get(entity_id, {}).get("temperature_entity_id")
                for source in (native, external):
                    if source:
                        entities.add(source)
                        entity_groups.setdefault(source, set()).add(group["id"])
        self._entity_groups = entity_groups
        watched = tuple(sorted(entities))
        if watched != self._entities:
            if self._unsub_states:
                self._unsub_states()
            self._unsub_states = (
                async_track_state_change_event(self._hass, watched, self._state_changed)
                if watched else None
            )
            self._entities = watched
        self._queue()

    @callback
    def request_refresh(self, *_args) -> None:
        """Refresh configuration and demand after a scheduler control change."""
        self.reconfigure()

    async def async_update_groups(self, value: object, *, _resume_group_id: str | None = None) -> list[dict]:
        """Validate and persist a complete replacement before applying effects."""
        async with getattr(self._scheduler, "_profile_mutation_lock", nullcontext()), self._lock:
            if _resume_group_id is not None:
                value = deepcopy(self._data.get("settings", {}).get("shared_demand_groups", []))
                resumed = next((g for g in value if g["id"] == _resume_group_id), None)
                if resumed is None:
                    raise ValueError("Unknown shared supply")
                resumed["suspended"] = False
                resumed.pop("suspension_reason", None)
            groups = normalize_groups(value, self._data.get("zones", {}))
            settings = self._data.setdefault("settings", {})
            previous = settings.get("shared_demand_groups", [])
            suspended = {g["id"] for g in previous if g.get("suspended")} | self._safety_suspended
            for group in groups:
                if group["id"] in suspended and group["id"] != _resume_group_id:
                    group["suspended"] = True
                    old = next((g for g in previous if g["id"] == group["id"]), {})
                    reason = "external_off" if group["id"] in self._safety_suspended else old.get("suspension_reason")
                    if reason:
                        group["suspension_reason"] = reason
                    else:
                        group.pop("suspension_reason", None)
            active = {g["switch_entity_id"] for g in groups if g["enabled"]}
            cleanup_present = "shared_demand_cleanup" in settings
            cleanup_previous = settings.get("shared_demand_cleanup", [])
            retired = set(cleanup_previous) | {
                g["switch_entity_id"] for g in previous
                if g["enabled"] and g["switch_entity_id"] not in active
            }
            manual_off_versions = self._manual_off_versions.copy()
            self._configuration_pending = True
            settings["shared_demand_cleanup"] = sorted(retired - active)
            revision = self._data.get("configuration_revision", 0)
            self._data["configuration_revision"] = revision + 1
            settings["shared_demand_groups"] = groups
            try:
                await self._save()
            except BaseException:
                settings["shared_demand_groups"] = previous
                if cleanup_present:
                    settings["shared_demand_cleanup"] = cleanup_previous
                else:
                    settings.pop("shared_demand_cleanup", None)
                self._data["configuration_revision"] = revision
                self._configuration_pending = False
                self.reconfigure()
                raise
            self._configuration_pending = False
            newer_offs = {g["id"] for g in groups
                          if self._manual_off_versions.get(g["id"], 0) != manual_off_versions.get(g["id"], 0)}
            self._safety_suspended.intersection_update(
                g["id"] for g in groups if g["suspended"] or g["id"] in newer_offs
            )
            for group in groups:
                if group["id"] not in newer_offs and (group["suspended"] or group["id"] == _resume_group_id):
                    group_id = group["id"]
                    self._pending_suspensions.discard(group_id)
                    self._suspension_failed.discard(group_id)
                    self._suspension_retry.pop(group_id, None)
                    self._suspension_attempts.pop(group_id, None)
            self._cleanup_save_attempts = 0
            self._cleanup_save_due = None
            self.reconfigure()
            # Metadata edits can leave every runtime status unchanged. Publish
            # their committed configuration/revision to other connected panels.
            async_dispatcher_send(self._hass, SIGNAL_SHARED_DEMAND_UPDATED)
            return deepcopy(groups)

    async def async_resume(self, group_id: str) -> None:
        # Capture current settings only after acquiring the same lock as saves.
        await self.async_update_groups(None, _resume_group_id=group_id)

    @callback
    def _state_changed(self, event) -> None:
        entity_id = event.data.get("entity_id")
        old, new = event.data.get("old_state"), event.data.get("new_state")
        if old is not None and new is not None and old.state == new.state and all(
            old.attributes.get(key) == new.attributes.get(key) for key in _RELEVANT
        ):
            return
        if entity_id in self._retired:
            self._commands.pop(entity_id, None)
            self._retry_due.pop(entity_id, None)
        for group_id in self._entity_groups.get(entity_id, ()):
            group = self._groups[group_id]
            if entity_id != group["switch_entity_id"] or not group["enabled"]:
                continue
            self._commands.pop(entity_id, None)
            self._retry_due.pop(entity_id, None)
            context = getattr(new, "context", None)
            context_ids = {getattr(context, "id", None), getattr(context, "parent_id", None)}
            owned = bool(context_ids.intersection(self._contexts))
            if old is not None and new is not None and old.state == "off" and new.state == "on":
                if not owned and self._notice_eligible(group):
                    self._external_ons[group_id] = (entity_id, deque(maxlen=3))
                else:
                    self._external_ons.pop(group_id, None)
            candidate = self._external_ons.get(group_id)
            if new is None or new.state not in ("on", "off"):
                self._external_ons.pop(group_id, None)
            if new is not None and new.state == "off":
                self._external_ons.pop(group_id, None)
                if (candidate is not None and candidate[0] == entity_id
                        and old is not None and old.state == "on"
                        and context_ids.intersection(candidate[1]) and self._notice_eligible(group)):
                    self._supply_notifications.queue(group, new, _utc_now())
                self._off_since[entity_id] = _utc_now()
                context = getattr(new, "context", None)
                owned = context is not None and (
                    getattr(context, "id", None) in self._contexts
                    or getattr(context, "parent_id", None) in self._contexts
                )
                if old is not None and old.state == "on" and not owned:
                    if not group["suspended"] and group_id not in self._safety_suspended:
                        self._supply_notifications.queue(group, new, _utc_now(), kind="suspension")
                    self._demand_since.pop(group_id, None)
                    self._manual_off_versions[group_id] = self._manual_off_versions.get(group_id, 0) + 1
                    self._safety_suspended.add(group_id)
                    self._pending_suspensions.add(group_id)
                    self._suspension_attempts.pop(group_id, None)
                    self._suspension_retry.pop(group_id, None)
        # A brief interruption must reset the continuous-demand window even if
        # another state event restores demand before the coalescing worker runs.
        for group_id in self._entity_groups.get(entity_id, ()):
            self._reset_interrupted_demand(self._groups[group_id])
        self._queue(self._entity_groups.get(entity_id, set()))

    @callback
    def _reset_interrupted_demand(self, group: dict) -> None:
        group_id = group["id"]
        if group_id not in self._demand_since:
            return
        output_state = self._hass.states.get(group["switch_entity_id"])
        if (getattr(output_state, "state", None) != "off"
                or not any(value is True for value in self._preview_demands(group))):
            self._demand_since.pop(group_id, None)

    @callback
    def _notice_eligible(self, group: dict) -> bool:
        """Reporting requires a known absence of demand, never a fail-safe off."""
        if not (self._started and group["enabled"] and not group["suspended"]
                and group["id"] not in self._safety_suspended
                and not self._unsafe_output(group["switch_entity_id"])
                and not getattr(self._scheduler, "temperature_migration_blocked", False)):
            return False
        return all(value is False for value in self._preview_demands(group))

    def _preview_demands(self, group: dict) -> list[bool | None]:
        """Observe aggregate demand without committing retained phases."""
        previous = {key: self._phases.get(key) for key in
                    ((group["id"], entity) for entity in group["zones"])}
        try:
            return [self._zone_demand(group, entity, options)["demand"]
                    for entity, options in group["zones"].items()]
        finally:
            for key, value in previous.items():
                if value is None:
                    self._phases.pop(key, None)
                else:
                    self._phases[key] = value

    @callback
    def _queue(self, group_ids=None) -> None:
        if not self._started:
            return
        self._dirty = True
        self._dirty_groups.update(self._groups if group_ids is None else group_ids)
        if self._task is None or self._task.done():
            self._task = self._hass.async_create_task(self._run())

    async def _run(self) -> None:
        try:
            # Merge synchronous bursts before calculating or calling services.
            await asyncio.sleep(0)
            while self._dirty and self._started:
                self._dirty = False
                async with getattr(self._scheduler, "_profile_mutation_lock", nullcontext()), self._lock:
                    await self._persist_suspensions()
                    await self._persist_completed_cleanup()
                    for output in list(self._retired):
                        timer_key = f"cleanup:{output}"
                        if await self._command(output, False, timer_key):
                            self._retired.discard(output)
                            self._retirement_failures.discard(output)
                            self._cleanup_confirmed.add(output)
                            self._cancel_timer(timer_key)
                        else:
                            self._retirement_failures.add(output)
                            retry = self._retry_due.get(output)
                            if retry is not None:
                                self._set_timer(timer_key, retry)
                    await self._persist_completed_cleanup()
                    group_ids = self._dirty_groups.copy()
                    self._dirty_groups.clear()
                    statuses = {key: value for key, value in self._status.items() if key in self._groups}
                    for group_id in group_ids:
                        group = self._groups.get(group_id)
                        if group is not None:
                            statuses[group_id] = await self._evaluate(group)
                    if self._cleanup_save_attempts:
                        statuses["cleanup:persistence"] = {"status": "cleanup_persistence_failed"}
                    for output in self._retirement_failures:
                        statuses[f"cleanup:{output}"] = {"status": "delivery_failed",
                            "switch_entity_id": output, "demand": False}
                    if self._invalid_configuration:
                        statuses["_configuration"] = {"status": "invalid_configuration"}
                    changed = set(statuses) != set(self._status) or any(
                        value is not self._status.get(key)
                        and self._notification_snapshot({key: value})
                        != self._notification_snapshot({key: self._status.get(key, {})})
                        for key, value in statuses.items()
                    )
                    live_statuses = {}
                    for group_id, status in statuses.items():
                        group = self._groups.get(group_id)
                        live_statuses[group_id] = status
                        if group is not None:
                            zones = {}
                            for entity in group["zones"]:
                                zone = status.get("zones", {}).get(entity)
                                if zone is None:
                                    zone = {"demand": None, "source": "estimated", "reason": status["status"]}
                                if "temperature" not in zone:
                                    zone = {**zone, **self._zone_observation(entity)}
                                zones[entity] = zone
                            live_statuses[group_id] = {**status, "zones": zones}
                    live_changed = live_statuses != self._live_status or not self._live_initialized
                    self._status = statuses
                    self._live_status = live_statuses
                    self._live_initialized = True
                    if live_changed:
                        async_dispatcher_send(self._hass, SIGNAL_SHARED_DEMAND_LIVE_UPDATED)
                    if changed:
                        async_dispatcher_send(self._hass, SIGNAL_SHARED_DEMAND_UPDATED)
        except asyncio.CancelledError:
            raise
        except Exception:
            _LOGGER.exception("Shared demand evaluation failed")
        finally:
            self._task = None

    async def _persist_completed_cleanup(self) -> None:
        settings = self._data.setdefault("settings", {})
        previous = settings.get("shared_demand_cleanup", [])
        completed = set(previous) & self._cleanup_confirmed
        updated = sorted((set(previous) | self._retired) - self._cleanup_confirmed)
        if updated == previous:
            self._cleanup_confirmed.difference_update(completed)
            return
        if self._cleanup_save_attempts >= 3:
            return
        if self._cleanup_save_due is not None and self._cleanup_save_due > _utc_now():
            return
        settings["shared_demand_cleanup"] = updated
        self._cleanup_save_attempts += 1
        try:
            await self._save()
        except Exception:
            settings["shared_demand_cleanup"] = previous
            _LOGGER.exception("Could not persist completed shared supply cleanup")
            if self._cleanup_save_attempts < 3:
                self._cleanup_save_due = _utc_now() + timedelta(seconds=(2, 10)[self._cleanup_save_attempts - 1])
                self._set_timer("cleanup:persistence", self._cleanup_save_due)
        else:
            self._cleanup_confirmed.difference_update(completed)
            self._cleanup_save_attempts = 0
            self._cleanup_save_due = None
            self._cancel_timer("cleanup:persistence")

    @staticmethod
    def _notification_snapshot(statuses: dict) -> dict:
        # Readings can change often. Publish only changes to control meaning,
        # avoiding a full frontend scheduler snapshot for every sensor report.
        return {
            key: {**group, "zones": {
                entity: {field: value for field, value in zone.items() if field != "temperature"}
                for entity, zone in group.get("zones", {}).items()
            }} for key, group in statuses.items()
        }

    async def _persist_suspensions(self) -> None:
        pending = self._pending_suspensions.copy() | {
            key for key, due in self._suspension_retry.items() if due <= _utc_now()
        }
        pending.intersection_update(self._groups)
        if not pending:
            return
        self._pending_suspensions.difference_update(pending)
        for group_id in pending:
            self._suspension_retry.pop(group_id, None)
            self._suspension_attempts[group_id] = self._suspension_attempts.get(group_id, 0) + 1
        groups = self._data.get("settings", {}).get("shared_demand_groups", [])
        previous = deepcopy(groups)
        for group in groups:
            if group["id"] in pending:
                group["suspended"] = True
                group["suspension_reason"] = "external_off"
                if group["id"] in self._groups:
                    self._groups[group["id"]]["suspended"] = True
                    self._groups[group["id"]]["suspension_reason"] = "external_off"
        revision = self._data.get("configuration_revision", 0)
        self._data["configuration_revision"] = revision + 1
        try:
            await self._save()
        except asyncio.CancelledError:
            self._data["configuration_revision"] = revision
            self._data["settings"]["shared_demand_groups"] = previous
            self._pending_suspensions.update(pending)
            raise
        except Exception:
            self._data["configuration_revision"] = revision
            self._data["settings"]["shared_demand_groups"] = previous
            # Remain suspended in memory even if storage fails. Retry a bounded
            # number of times, expose the failure, and never switch back on.
            self._suspension_failed.update(pending)
            for group_id in pending:
                attempts = self._suspension_attempts[group_id]
                if attempts < 3:
                    self._suspension_retry[group_id] = _utc_now() + timedelta(seconds=(2, 10)[attempts - 1])
            _LOGGER.exception("Could not persist shared demand manual suspension")
        else:
            for group_id in pending:
                self._suspension_failed.discard(group_id)
                self._suspension_attempts.pop(group_id, None)

    def _zone_state(self, entity_id: str):
        """Read a control unit through the scheduler, retaining physical fallback."""
        reader = getattr(self._scheduler, "climate_state", None)
        return reader(entity_id) if callable(reader) else self._hass.states.get(entity_id)

    def _zone_observation(self, entity_id: str) -> dict:
        """Observe real readings without evaluating demand or corrected targets."""
        state = self._zone_state(entity_id)
        if entity_id not in self._data.get("zones", {}) or state is None or state.state in ("unknown", "unavailable"):
            return {}
        assist = self._scheduler.get_shared_demand_room_assist(entity_id)
        if assist.get("active"):
            return {"source": "room_assist", **{
                key: assist[key] for key in ("temperature", "temperature_unit", "sensor_entity_id")
                if key in assist}} if assist.get("valid") else {}
        current = _finite(state.attributes.get("current_temperature"))
        if current is None:
            return {}
        unit = state.attributes.get("temperature_unit", getattr(
            getattr(getattr(self._hass, "config", None), "units", None), "temperature_unit", None))
        source = self._data.get("room_groups", {}).get(entity_id, {}).get("temperature_entity_id", entity_id)
        return {"temperature": current, "temperature_unit": unit, "sensor_entity_id": source}

    def _zone_demand(self, group: dict, entity_id: str, settings: dict) -> dict:
        state = self._zone_state(entity_id)
        direction = group["direction"]
        key = (group["id"], entity_id)
        def unknown(reason):
            self._phases.pop(key, None)
            return {"demand": None, "source": "estimated", "reason": reason}
        if entity_id not in self._data.get("zones", {}):
            return unknown("unmanaged")
        if state is None or state.state in ("unknown", "unavailable"):
            return unknown("unavailable")
        if state.state == "off":
            self._phases.pop(key, None)
            return {"demand": False, "source": "estimated", "reason": "off"}
        assist = self._scheduler.get_shared_demand_room_assist(entity_id)
        if assist.get("active"):
            self._phases.pop(key, None)
            reference = {
                field: assist[field] for field in ("temperature", "temperature_unit", "sensor_entity_id")
                if field in assist
            }
            thresholds = assist.get("thresholds", {}).get(direction, {})
            if assist.get("valid") and assist.get("demand") is False and assist.get("direction") is None:
                return {"demand": False, "source": "room_assist", "reason": None,
                        **reference, **thresholds}
            if not assist.get("valid") or assist.get("direction") not in ("heat", "cool"):
                return {"demand": None, "source": "room_assist", "reason": "unavailable"}
            compatible = bool(thresholds) or assist["direction"] == direction
            return {"demand": bool(assist.get("demand")) if assist["direction"] == direction else False,
                    "source": "room_assist", "reason": None if compatible else "incompatible_mode",
                    **reference, **thresholds}
        mode = state.state
        if mode not in (direction, "heat_cool", "auto"):
            self._phases.pop(key, None)
            return {"demand": False, "source": "estimated", "reason": "incompatible_mode"}
        attrs = state.attributes
        current = _finite(attrs.get("current_temperature"))
        low, high = _finite(attrs.get("target_temp_low")), _finite(attrs.get("target_temp_high"))
        scalar = _finite(attrs.get("temperature"))
        resolve_policy = getattr(self._scheduler, "get_target_format_policy", None)
        policy = resolve_policy(entity_id) if resolve_policy is not None else {}
        target_format = policy.get("formats_by_mode", {}).get(mode)
        if mode in policy.get("invalid_modes", []):
            return unknown("ambiguous_target")
        if target_format == "range":
            if low is None or high is None or low > high:
                return unknown("missing_temperature")
            target = low if direction == "heat" else high
        elif target_format == "single":
            if mode in ("auto", "heat_cool"):
                return unknown("ambiguous_target")
            target = scalar
        else:
            # For legacy/incomplete capability reports, accept only one complete
            # representation. Mixed reports need the configured per-mode policy.
            has_range = low is not None and high is not None and low <= high
            if scalar is not None and (low is not None or high is not None):
                return unknown("ambiguous_target")
            if has_range:
                target_format = "range"
                target = low if direction == "heat" else high
            elif mode in ("heat_cool", "auto"):
                return unknown("ambiguous_target")
            else:
                target_format = "single"
                target = scalar
        if current is None or target is None:
            return unknown("missing_temperature")
        if target_format == "range":
            reference = selected_range_boundary(self._data["zones"][entity_id], mode)
            if reference is not None:
                target = low if reference == "low" else high
        # HA climate attributes normally use HA's configured temperature unit.
        # Honour explicit units from integrations when present.
        hysteresis_mode = group.get("hysteresis_mode", "at_target")
        hysteresis = settings.get("hysteresis", group["hysteresis"])
        stop_offset = 0.0
        if hysteresis_mode == "symmetric":
            stop_offset = hysteresis
        elif hysteresis_mode == "custom":
            stop_offset = settings.get("hysteresis_stop", group.get("hysteresis_stop", 0))
        ha_unit = getattr(getattr(getattr(self._hass, "config", None), "units", None), "temperature_unit", None)
        entity_unit = attrs.get("temperature_unit", ha_unit)
        if ha_unit == "°C" and entity_unit == "°F":
            hysteresis *= 1.8
            stop_offset *= 1.8
        elif ha_unit == "°F" and entity_unit == "°C":
            hysteresis /= 1.8
            stop_offset /= 1.8
        if not math.isfinite(hysteresis) or not math.isfinite(stop_offset):
            return unknown("invalid_hysteresis")
        if direction == "heat":
            start_temperature, stop_temperature = target - hysteresis, target + stop_offset
        else:
            start_temperature, stop_temperature = target + hysteresis, target - stop_offset
        if not math.isfinite(start_temperature) or not math.isfinite(stop_temperature):
            return unknown("invalid_hysteresis")
        identity = (mode, direction, target, target_format, hysteresis_mode,
                    hysteresis, stop_offset, entity_unit)
        previous = self._phases.get(key)
        retained = previous[1] if previous and previous[0] == identity else False
        if direction == "heat":
            demand = False if current >= stop_temperature else current <= start_temperature or retained
        else:
            demand = False if current <= stop_temperature else current >= start_temperature or retained
        self._phases[key] = (identity, demand)
        return {"demand": demand, "source": "estimated", "reason": None,
                "temperature": current, "target": target, "hysteresis": hysteresis,
                "temperature_unit": entity_unit, "sensor_entity_id": entity_id,
                "hysteresis_mode": hysteresis_mode, "hysteresis_stop": stop_offset,
                "start_temperature": start_temperature, "stop_temperature": stop_temperature}

    async def _evaluate(self, group: dict) -> dict:
        group_id, output = group["id"], group["switch_entity_id"]
        now = _utc_now()
        state = self._hass.states.get(output)
        actual = getattr(state, "state", "unavailable")
        unsafe_output = self._unsafe_output(output)
        if group_id in self._external_ons and not self._notice_eligible(group):
            self._external_ons.pop(group_id, None)
        status = {"enabled": group["enabled"], "suspended": group["suspended"] or group_id in self._safety_suspended,
                  "switch_entity_id": output, "output_state": actual, "demand": False,
                  "status": "disabled", "zones": {}, "pending_until": None}
        if status["suspended"]:
            reason = "external_off" if group_id in self._safety_suspended else group.get("suspension_reason")
            if reason:
                status["suspension_reason"] = reason
        if unsafe_output:
            self._demand_since.pop(group_id, None)
            self._cancel_timer(group_id)
            status["status"] = "invalid_output"
            return status
        if not group["enabled"] or status["suspended"]:
            self._demand_since.pop(group_id, None)
            self._cancel_timer(group_id)
            self._no_demand_since.pop(group_id, None)
            status["status"] = "suspended" if status["suspended"] else "disabled"
            retries = []
            if status["suspended"] and actual == "on":
                context = getattr(state, "context", None)
                # A delayed acknowledgement of our own in-flight turn_on must
                # not undo a manual off that suspended the group meanwhile.
                if context is not None and (getattr(context, "id", None) in self._contexts
                    or getattr(context, "parent_id", None) in self._contexts):
                    if not await self._command(output, False, group_id):
                        status["status"] = "delivery_failed"
                        retry = self._retry_due.get(output)
                        if retry is not None:
                            retries.append(retry)
            if group_id in self._suspension_failed:
                status["status"] = "suspension_persistence_failed"
                retry = self._suspension_retry.get(group_id)
                if retry is not None:
                    retries.append(retry)
            if retries:
                retry = min(retries)
                self._set_timer(group_id, retry)
                status["pending_until"] = retry.isoformat()
            return status
        if getattr(self._scheduler, "temperature_migration_blocked", False):
            self._demand_since.pop(group_id, None)
            self._cancel_timer(group_id)
            self._no_demand_since.pop(group_id, None)
            for key in [key for key in self._phases if key[0] == group_id]:
                del self._phases[key]
            status["status"] = "temperature_migration_blocked"
            if actual == "on" and not await self._command(output, False, group_id):
                status["status"] = "delivery_failed"
                retry = self._retry_due.get(output)
                if retry is not None:
                    self._set_timer(group_id, retry)
                    status["pending_until"] = retry.isoformat()
            return status
        zones = {entity: self._zone_demand(group, entity, options) for entity, options in group["zones"].items()}
        demand = any(z["demand"] is True for z in zones.values())
        status.update(zones=zones, demand=demand)
        if actual not in ("on", "off"):
            self._demand_since.pop(group_id, None)
            self._cancel_timer(group_id)
            status["status"] = "unavailable"
            return status
        if actual == "off" and output not in self._off_since:
            changed = getattr(state, "last_changed", None)
            self._off_since[output] = changed.astimezone(timezone.utc) if isinstance(changed, datetime) and changed.tzinfo else now
        deadline = None
        desired = demand
        if demand:
            self._no_demand_since.pop(group_id, None)
            if actual == "off":
                since = self._demand_since.setdefault(group_id, now)
                on_deadline = since + timedelta(seconds=group["on_delay_seconds"])
                protection_deadline = self._off_since[output] + timedelta(seconds=group["minimum_off_seconds"])
                deadline = max(on_deadline, protection_deadline)
                if deadline > now:
                    desired = False
                    status["status"] = "on_delay" if on_deadline >= protection_deadline else "minimum_off"
                else:
                    deadline = None
            else:
                self._demand_since.pop(group_id, None)
        else:
            self._demand_since.pop(group_id, None)
            if actual == "on" and group["off_delay_seconds"]:
                since = self._no_demand_since.setdefault(group_id, now)
                deadline = since + timedelta(seconds=group["off_delay_seconds"])
                if deadline > now:
                    desired = True
                    status["status"] = "off_delay"
                else:
                    deadline = None
        if deadline:
            self._set_timer(group_id, deadline)
            status["pending_until"] = deadline.isoformat()
        else:
            self._cancel_timer(group_id)
        if (actual == "on") != desired:
            ok = await self._command(output, desired, group_id)
            if not ok:
                status["status"] = "delivery_failed"
                retry = self._retry_due.get(output)
                if retry is not None:
                    self._set_timer(group_id, retry)
                    status["pending_until"] = retry.isoformat()
        if status["status"] == "disabled":
            status["status"] = "demand" if demand else "idle"
        return status

    def _unsafe_output(self, output: str) -> bool:
        try:
            from homeassistant.helpers import entity_registry as er
            entry = er.async_get(self._hass).async_get(output)
            return entry is not None and entry.platform == "velair"
        except (ImportError, AttributeError):
            return False

    async def _command(self, output: str, desired: bool, group_id: str | None) -> bool:
        """At most three attempts for one intent; coalesce sensor traffic."""
        if self._unsafe_output(output):
            return False
        prior = self._commands.get(output)
        attempts = 0
        if prior is not None and prior[0] == desired:
            attempts = prior[1]
            if attempts == 0:
                return True
            retry = self._retry_due.get(output)
            if attempts >= 3 or retry is None or retry > _utc_now():
                return False
        state = self._hass.states.get(output)
        if state is None or state.state not in ("on", "off"):
            return False
        if (state.state == "on") == desired:
            return True
        context = core.Context()
        self._contexts.append(context.id)
        candidate = self._external_ons.get(group_id)
        if not desired and candidate is not None and candidate[0] == output:
            # Arm before the service await: integrations may acknowledge inline.
            candidate[1].append(context.id)
        self._commands[output] = (desired, attempts + 1)
        self._retry_due.pop(output, None)
        try:
            await self._hass.services.async_call("switch", "turn_on" if desired else "turn_off",
                {"entity_id": output}, blocking=True, context=context)
        except Exception:
            _LOGGER.warning("Shared demand could not set %s to %s", output, desired, exc_info=True)
            if group_id is not None and attempts < 2:
                self._retry_due[output] = _utc_now() + timedelta(seconds=(2, 10)[attempts])
            return False
        self._commands[output] = (desired, 0)
        if not desired:
            self._off_since[output] = _utc_now()
        return True

    @callback
    def _cancel_timer(self, group_id: str) -> None:
        existing = self._timers.pop(group_id, None)
        if existing:
            existing[1]()

    @callback
    def _set_timer(self, group_id: str, deadline: datetime) -> None:
        existing = self._timers.get(group_id)
        if existing and existing[0] == deadline:
            return
        self._cancel_timer(group_id)
        @callback
        def wake(_now):
            self._timers.pop(group_id, None)
            self._queue({group_id})
        self._timers[group_id] = (deadline, async_track_point_in_time(self._hass, wake, deadline))
