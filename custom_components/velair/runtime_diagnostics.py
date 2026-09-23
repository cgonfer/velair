"""Bounded, runtime-only diagnostics for Velair."""

from __future__ import annotations

from collections import deque
from copy import deepcopy
from datetime import UTC, datetime
import logging
import math
import re
from typing import Any

from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback, valid_entity_id
from homeassistant.helpers.dispatcher import (
    async_dispatcher_connect,
    async_dispatcher_send,
)
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.storage import Store

from .climate_manager import STATE_UNAVAILABLE, STATE_UNKNOWN
from .const import (
    DIAGNOSTIC_HISTORY_CATEGORIES,
    DOMAIN,
    EVENT_VELAIR,
    EVENT_TYPE_DIAGNOSTIC_ISSUE_CHANGED,
    EVENT_TYPE_EXTERNAL_CLIMATE_CHANGE_DETECTED,
    SIGNAL_DIAGNOSTICS_UPDATED,
    SIGNAL_SCHEDULER_UPDATED,
)
from .temperature import CELSIUS, normalize_temperature_unit, state_temperature_unit

DIAGNOSTIC_HISTORY_LIMIT = 100
DIAGNOSTIC_POLICY_VERSION = 1
_CONTROL_EVENT_FIELDS = (
    "action",
    "changed_fields",
    "control_mode",
    "duration_minutes",
    "event",
    "hvac_mode",
    "mode",
    "operation",
    "previous_mode",
    "previous_control_mode",
    "profile_id",
    "reason",
    "source",
    "start",
    "started_at",
    "temperature",
    "target_temp_high",
    "target_temp_low",
    "until",
    "weekday",
    "policy",
)
_CONTROL_SNAPSHOT_FIELDS = (
    "hvac_mode",
    "temperature",
    "target_temp_low",
    "target_temp_high",
)
_MANUAL_CONTROL_EVENTS = {
    "external_climate_change_detected",
    "zone_control_changed",
}
_FEATURE_EVENT_FIELDS: dict[str, tuple[str, ...]] = {
    "room_assist": (
        "applied_offset",
        "applied_target_temp_high",
        "applied_target_temp_low",
        "applied_temperature",
        "assist_delta",
        "calculated_temperature",
        "climate_temperature",
        "debounce_seconds",
        "direction",
        "enabled",
        "event",
        "hvac_mode",
        "hysteresis_phase",
        "hysteresis_target",
        "deadband_low",
        "deadband_high",
        "max_delta",
        "previous_enabled",
        "range_shift",
        "reason",
        "room_temperature",
        "room_temperature_entity_id",
        "scheduled_target_guard",
        "target_temp_high",
        "target_temp_low",
        "target_temperature",
    ),
    "preconditioning": (
        "direction",
        "event",
        "boundary_temperature",
        "current_temperature",
        "lead_minutes",
        "model_source",
        "outdoor_temperature",
        "preconditioning_when",
        "reason",
        "scheduled_when",
        "source",
        "start",
        "stored_sample_count",
        "target_boundary",
        "target_kind",
        "target_temp_high",
        "target_temp_low",
        "target_temperature",
        "target_when",
        "temperature_delta",
    ),
    "comfort": (
        "air_quality",
        "co2",
        "comfort_zone",
        "condition",
        "data_issues",
        "data_quality",
        "derived_metrics",
        "event",
        "humidity",
        "insights",
        "outdoor",
        "previous_range_summary",
        "range_status_changed",
        "range_summary",
        "range_summary_changed",
        "temperature",
        "ventilation_opportunity",
    ),
}

_LOGGER = logging.getLogger(__name__)
_EMBEDDED_ENTITY_ID = re.compile(
    r"(?<![a-z0-9_])([a-z_][a-z0-9_]*\.[a-z0-9_]+)(?![a-z0-9_])"
)


class RuntimeDiagnosticsManager:
    """Observe existing runtime signals without affecting climate control."""

    def __init__(
        self,
        hass: HomeAssistant,
        entity_ids: list[str],
        entry_id: str | None = None,
    ) -> None:
        self._hass = hass
        self._entity_ids = tuple(entity_ids)
        self._history: deque[dict[str, Any]] = deque(maxlen=DIAGNOSTIC_HISTORY_LIMIT)
        self._delivery: dict[str, dict[str, Any]] = {}
        self._last_applied: dict[str, dict[str, Any]] = {}
        self._unsubs: list[CALLBACK_TYPE] = []
        self._unsub_associated_sensors: CALLBACK_TYPE | None = None
        self._associated_sensor_ids: tuple[str, ...] = ()
        self._notification_pending = False
        self._revision = 0
        self._cached_revision = -1
        self._cached_snapshot: dict[str, Any] | None = None
        self._runtime: dict[str, Any] | None = None
        self._active_issue_index: dict[
            tuple[str | None, str, str | None], dict[str, Any]
        ] = {}
        self._issue_events_enabled = False
        self._history_categories = {
            category: True for category in DIAGNOSTIC_HISTORY_CATEGORIES
        }
        self._policy_store: Store[dict[str, Any]] | None = (
            Store(
                hass,
                DIAGNOSTIC_POLICY_VERSION,
                f"{DOMAIN}.{entry_id}.diagnostics",
            )
            if entry_id is not None
            else None
        )

    async def async_load_policy(self) -> None:
        """Load the persisted retention policy without restoring runtime history."""
        if self._policy_store is None:
            return
        try:
            stored = await self._policy_store.async_load()
        except Exception:
            _LOGGER.exception(
                "Unable to load Velair diagnostics history settings; using defaults"
            )
            return
        categories = stored.get("categories") if isinstance(stored, dict) else None
        if not isinstance(categories, dict):
            return
        self._history_categories = {
            category: bool(categories.get(category, True))
            for category in DIAGNOSTIC_HISTORY_CATEGORIES
        }

    async def async_update_history_categories(
        self,
        enabled_categories: list[str],
    ) -> None:
        """Persist the retention policy and discard newly disabled history."""
        enabled = set(enabled_categories)
        updated_categories = {
            category: category in enabled
            for category in DIAGNOSTIC_HISTORY_CATEGORIES
        }
        if self._policy_store is not None:
            await self._policy_store.async_save(
                {"categories": deepcopy(updated_categories)}
            )
        self._history_categories = updated_categories
        self._history = deque(
            (
                item
                for item in self._history
                if self._history_categories.get(item.get("category", "control"), False)
            ),
            maxlen=DIAGNOSTIC_HISTORY_LIMIT,
        )
        self._schedule_notify()

    @callback
    def async_clear_history(self) -> None:
        """Clear retained runtime evidence without changing current diagnostics."""
        self._history.clear()
        self._schedule_notify()

    @callback
    def async_reset_runtime_evidence(self) -> None:
        """Clear all non-persisted evidence after a successful Velair data reset."""
        self._history.clear()
        self._delivery.clear()
        self._last_applied.clear()
        self._schedule_notify()

    def async_start(self, runtime: dict[str, Any] | None = None) -> None:
        """Start passive event listeners."""
        self._runtime = runtime
        if runtime is not None:
            # Existing issues form the baseline. Automations should only see
            # changes that happen after the integration has started.
            self._active_issue_index = self._index_issues(
                self.active_issues(runtime)
            )
        self._unsubs.append(self._hass.bus.async_listen(EVENT_VELAIR, self._handle_event))
        self._unsubs.append(
            async_dispatcher_connect(
                self._hass,
                SIGNAL_SCHEDULER_UPDATED,
                self._handle_scheduler_update,
            )
        )
        self._unsubs.append(
            async_track_state_change_event(
                self._hass,
                self._entity_ids,
                self._handle_climate_state_change,
            )
        )
        self._refresh_associated_sensor_listener()

    def async_stop(self) -> None:
        """Stop passive event listeners."""
        for unsub in self._unsubs:
            try:
                unsub()
            except Exception:
                # Cleanup is best effort and must not prevent other listeners
                # or the integration itself from unloading.
                continue
        self._unsubs.clear()
        if self._unsub_associated_sensors is not None:
            try:
                self._unsub_associated_sensors()
            except Exception:
                pass
            self._unsub_associated_sensors = None
        self._associated_sensor_ids = ()
        self._runtime = None
        self._active_issue_index.clear()
        self._issue_events_enabled = False

    @callback
    def async_finish_startup(self) -> None:
        """Set the final startup baseline before enabling issue transitions."""
        if self._runtime is None:
            return
        self._active_issue_index = self._index_issues(
            self.active_issues(self._runtime)
        )
        self._issue_events_enabled = True

    @callback
    def observe_delivery(
        self,
        entity_id: str,
        status: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Record delivery evidence emitted by the existing coordinator."""
        now = _now_iso()
        current = self._delivery.setdefault(
            entity_id,
            {"status": "idle", "retry_count": 0, "last_error": None},
        )
        current["status"] = status
        current["updated_at"] = now
        if status in (
            "success",
            "failed",
            "retrying",
            "exhausted",
            "invalid_intent",
            "unavailable",
        ):
            current["retry_count"] = int((details or {}).get("retry_count", 0))
        elif status == "cancelled":
            current["retry_count"] = 0
        if status in ("failed", "exhausted", "invalid_intent"):
            current["last_error"] = {
                "at": now,
                "code": status,
                "message": (details or {}).get("message"),
            }
        severity = (
            "error" if status in ("exhausted", "invalid_intent")
            else "info" if status == "cancelled"
            else "warning"
        )
        if status in ("failed", "retrying", "exhausted", "invalid_intent", "cancelled"):
            self._record(
                "delivery",
                severity,
                entity_id=entity_id,
                data={"status": status, **(details or {})},
            )
        self._schedule_notify()

    @callback
    def observe_target_applied(self, data: dict[str, Any]) -> None:
        """Record trusted target evidence emitted directly by the scheduler."""
        entity_id = data.get("entity_id")
        if not isinstance(entity_id, str) or entity_id not in self._entity_ids:
            return
        safe_data = {
            key: deepcopy(data[key])
            for key in _CONTROL_EVENT_FIELDS
            if key in data and key != "changed_fields"
        }
        last_applied = {"at": _now_iso(), **safe_data}
        if any(
            safe_data.get(key) is not None
            for key in ("temperature", "target_temp_low", "target_temp_high")
        ):
            configured_unit = normalize_temperature_unit(
                getattr(
                    getattr(getattr(self._hass, "config", None), "units", None),
                    "temperature_unit",
                    CELSIUS,
                ),
                CELSIUS,
            )
            last_applied["temperature_unit"] = state_temperature_unit(
                self._hass.states.get(entity_id),
                configured_unit,
            )
        self._last_applied[entity_id] = last_applied
        self._schedule_notify()

    @callback
    def _handle_event(self, event: Event) -> None:
        data = event.data
        if data.get("domain") != DOMAIN:
            return
        event_name = str(data.get("event", "event"))
        if event_name == EVENT_TYPE_DIAGNOSTIC_ISSUE_CHANGED:
            # This manager emits issue transitions for automations. Feeding
            # them back into runtime history would create redundant evidence.
            return
        entity_id = data.get("entity_id") if isinstance(data.get("entity_id"), str) else None
        category = _event_history_category(event_name)
        safe_fields = _FEATURE_EVENT_FIELDS.get(category, _CONTROL_EVENT_FIELDS)
        safe_data = {
            key: deepcopy(data[key])
            for key in safe_fields
            if key in data and key != "changed_fields"
        }
        if event_name in _MANUAL_CONTROL_EVENTS:
            changed_fields = _sanitized_changed_fields(data.get("changed_fields"))
            if changed_fields:
                safe_data["changed_fields"] = changed_fields
            for key in ("previous", "current"):
                snapshot = _sanitized_control_snapshot(data.get(key))
                if snapshot:
                    safe_data[key] = snapshot
        if event_name in _MANUAL_CONTROL_EVENTS:
            ha_context = _sanitized_ha_context(data.get("ha_context"))
            if ha_context:
                safe_data["ha_context"] = ha_context
        if event_name == EVENT_TYPE_EXTERNAL_CLIMATE_CHANGE_DETECTED:
            diagnostics_context = self._external_change_diagnostics_context(entity_id)
            if diagnostics_context:
                safe_data["diagnostics_context"] = diagnostics_context
        self._record(
            "event",
            "info",
            entity_id=entity_id,
            data=safe_data,
            category=category,
        )
        self._schedule_notify()

    def _external_change_diagnostics_context(
        self, entity_id: str | None
    ) -> dict[str, Any]:
        """Return runtime evidence attached to one external climate change."""
        if entity_id is None:
            return {}
        context: dict[str, Any] = {}
        last_application = self._last_applied.get(entity_id)
        if isinstance(last_application, dict):
            context["last_application"] = deepcopy(last_application)
            age_seconds = _age_seconds(last_application.get("at"))
            if age_seconds is not None:
                context["last_application_age_seconds"] = age_seconds
        delivery = self._delivery.get(entity_id)
        if isinstance(delivery, dict):
            context["delivery"] = deepcopy(delivery)
        if self._runtime is not None:
            scheduler = self._runtime.get("scheduler")
            if scheduler is not None:
                try:
                    zone_runtime = scheduler.get_zone_runtime_statuses().get(entity_id)
                except Exception:
                    zone_runtime = None
                if isinstance(zone_runtime, dict):
                    context["intent"] = deepcopy(zone_runtime)
                try:
                    room_assist = scheduler.get_room_sensor_assist_statuses().get(entity_id)
                except Exception:
                    room_assist = None
                if isinstance(room_assist, dict):
                    context["room_assist"] = deepcopy(room_assist)
            climate_manager = self._runtime.get("climate_manager")
            settling_diagnostics = getattr(
                climate_manager, "command_settling_diagnostics", None
            )
            if callable(settling_diagnostics):
                try:
                    context["command_settling"] = settling_diagnostics(entity_id)
                except Exception:
                    pass
        return context

    @callback
    def _handle_climate_state_change(self, event: Event) -> None:
        entity_id = event.data.get("entity_id")
        new_state = event.data.get("new_state")
        old_state = event.data.get("old_state")
        if not isinstance(entity_id, str):
            return
        new_value = getattr(new_state, "state", None)
        old_value = getattr(old_state, "state", None)
        if new_value != old_value and (
            new_value in (STATE_UNAVAILABLE, STATE_UNKNOWN) or (
            old_value in (STATE_UNAVAILABLE, STATE_UNKNOWN) and new_value is not None
            )
        ):
            self._record(
                "availability",
                "warning" if new_value in (STATE_UNAVAILABLE, STATE_UNKNOWN) else "info",
                entity_id=entity_id,
                data={"state": new_value or "missing"},
            )
        self._schedule_notify()

    @callback
    def _handle_associated_sensor_state_change(self, _event: Event) -> None:
        """Invalidate diagnostics when an actively associated sensor changes."""
        self._schedule_notify()

    @callback
    def _handle_scheduler_update(self) -> None:
        """Invalidate diagnostics derived from authoritative scheduler state."""
        self._refresh_associated_sensor_listener()
        self._schedule_notify()

    @callback
    def _refresh_associated_sensor_listener(self) -> None:
        """Track only sensors whose configured diagnostic purpose is active."""
        entity_ids = self._active_associated_sensor_ids()
        if entity_ids == self._associated_sensor_ids:
            return
        if self._unsub_associated_sensors is not None:
            try:
                self._unsub_associated_sensors()
            except Exception:
                pass
            self._unsub_associated_sensors = None
        self._associated_sensor_ids = entity_ids
        if entity_ids:
            self._unsub_associated_sensors = async_track_state_change_event(
                self._hass,
                entity_ids,
                self._handle_associated_sensor_state_change,
            )

    def _active_associated_sensor_ids(self) -> tuple[str, ...]:
        """Return the deduplicated active sensor IDs from backend configuration."""
        if self._runtime is None:
            return ()
        zones = self._runtime["storage"].data.get("zones", {})
        entity_ids: set[str] = set()
        for zone in zones.values():
            preconditioning = zone.get("preconditioning", {})
            comfort = zone.get("comfort", {})
            candidates = (
                (
                    preconditioning.get("room_temperature_entity_id"),
                    bool(
                        preconditioning.get("enabled")
                        or preconditioning.get("room_sensor_assist_enabled")
                    ),
                ),
                (
                    preconditioning.get("outdoor_temperature_entity_id"),
                    bool(
                        preconditioning.get("enabled")
                        and preconditioning.get("use_outdoor_temperature")
                    ),
                ),
                (
                    comfort.get("temperature_entity_id"),
                    bool(comfort.get("enabled")),
                ),
                (
                    comfort.get("humidity_entity_id"),
                    bool(
                        comfort.get("enabled")
                        and comfort.get("humidity_enabled")
                    ),
                ),
                (
                    comfort.get("co2_entity_id"),
                    bool(comfort.get("enabled")),
                ),
                (
                    comfort.get("outdoor_temperature_entity_id"),
                    bool(
                        comfort.get("enabled")
                        and comfort.get("outdoor_comparison_enabled")
                    ),
                ),
                (
                    comfort.get("outdoor_humidity_entity_id"),
                    bool(
                        comfort.get("enabled")
                        and comfort.get("outdoor_comparison_enabled")
                    ),
                ),
                *tuple(
                    (
                        metric_config.get("entity_id"),
                        bool(
                            comfort.get("enabled")
                            and metric_config.get("enabled")
                            and metric_config.get("source") == "entity"
                        ),
                    )
                    for metric_config in (
                        comfort.get("derived_metrics", {}).values()
                        if isinstance(comfort.get("derived_metrics"), dict)
                        else ()
                    )
                    if isinstance(metric_config, dict)
                ),
            )
            entity_ids.update(
                entity_id
                for entity_id, active in candidates
                if active and isinstance(entity_id, str) and entity_id
            )
        return tuple(sorted(entity_ids))

    @callback
    def async_runtime_changed(self) -> None:
        """Invalidate diagnostics after non-scheduler runtime state changes."""
        self._schedule_notify()

    @callback
    def _schedule_notify(self) -> None:
        """Coalesce updates and defer subscriber work to the event loop."""
        self._revision += 1
        self._cached_snapshot = None
        if self._notification_pending:
            return
        self._notification_pending = True
        self._hass.loop.call_soon(self._notify)

    @callback
    def _notify(self) -> None:
        self._notification_pending = False
        self._publish_issue_changes()
        async_dispatcher_send(self._hass, SIGNAL_DIAGNOSTICS_UPDATED)

    def _record(
        self,
        kind: str,
        severity: str,
        *,
        entity_id: str | None,
        data: dict[str, Any],
        category: str | None = None,
    ) -> None:
        history_category = category or kind
        if history_category not in DIAGNOSTIC_HISTORY_CATEGORIES:
            history_category = "control"
        if not self._history_categories[history_category]:
            return
        item = {
            "at": _now_iso(),
            "kind": kind,
            "category": history_category,
            "severity": severity,
            "entity_id": entity_id,
            "data": deepcopy(data),
        }
        self._history.append(item)

    def active_issues(self, runtime: dict[str, Any]) -> list[dict[str, Any]]:
        """Return the current compact issue set used by UI and automations."""
        snapshot = self.cached_snapshot(runtime)
        issues = [deepcopy(issue) for issue in snapshot["overall"]["issues"]]
        for entity_id, unit in snapshot["units"].items():
            for issue in unit["issues"]:
                issues.append({"entity_id": entity_id, **deepcopy(issue)})
        return sorted(
            issues,
            key=lambda issue: (
                str(issue.get("entity_id", "")),
                str(issue.get("code", "")),
                str(issue.get("purpose", "")),
            ),
        )

    def automation_summary(self) -> dict[str, Any]:
        """Return compact, safe state for the Home Assistant sensor."""
        if self._runtime is None:
            return {
                "status": "ok",
                "scheduler_mode": None,
                "scheduler_status": None,
                "unit_counts": {"ok": 0, "warning": 0, "error": 0},
                "issue_count": 0,
                "warning_count": 0,
                "error_count": 0,
                "issue_codes": [],
            }
        snapshot = self.cached_snapshot(self._runtime)
        issues = self.active_issues(self._runtime)
        return {
            "status": snapshot["overall"]["status"],
            "scheduler_mode": snapshot["overall"]["scheduler_mode"],
            "scheduler_status": snapshot["overall"]["scheduler_status"],
            "unit_counts": deepcopy(snapshot["overall"]["unit_counts"]),
            "issue_count": len(issues),
            "warning_count": sum(
                issue.get("severity") == "warning" for issue in issues
            ),
            "error_count": sum(
                issue.get("severity") == "error" for issue in issues
            ),
            "issue_codes": sorted(
                {
                    str(issue["code"])
                    for issue in issues
                    if isinstance(issue.get("code"), str)
                }
            ),
        }

    def zone_delivery_diagnostics(self, entity_id: str) -> dict[str, Any]:
        """Return compact runtime-only delivery evidence for one zone."""
        delivery = self._delivery.get(entity_id, {})
        raw_status = delivery.get("status", "idle")
        public_statuses = {
            "idle",
            "success",
            "failed",
            "retrying",
            "exhausted",
            "invalid_intent",
            "cancelled",
            "unavailable",
        }
        last_error = delivery.get("last_error")
        last_accepted = self._last_applied.get(entity_id)
        result: dict[str, Any] = {
            "status": raw_status if raw_status in public_statuses else "failed",
            "updated_at": delivery.get("updated_at"),
            "retry_count": int(delivery.get("retry_count", 0)),
            "last_error_at": (
                delivery.get("updated_at")
                if raw_status not in public_statuses
                else last_error.get("at")
                if isinstance(last_error, dict)
                else None
            ),
            "last_error_code": (
                "unknown_delivery_status"
                if raw_status not in public_statuses
                else last_error.get("code")
                if isinstance(last_error, dict)
                else None
            ),
        }
        if isinstance(last_accepted, dict):
            result.update(
                {
                    "last_accepted_at": last_accepted.get("at"),
                    "last_accepted_source": _public_delivery_source(
                        last_accepted.get("source")
                    ),
                    "last_accepted_action": _public_delivery_action(
                        last_accepted.get("action")
                    ),
                    "last_accepted_hvac_mode": last_accepted.get("hvac_mode"),
                    "last_accepted_temperature_unit": last_accepted.get(
                        "temperature_unit"
                    ),
                    "last_accepted_temperature": last_accepted.get("temperature"),
                    "last_accepted_target_temp_low": last_accepted.get(
                        "target_temp_low"
                    ),
                    "last_accepted_target_temp_high": last_accepted.get(
                        "target_temp_high"
                    ),
                }
            )
        return result

    @staticmethod
    def _issue_identity(
        issue: dict[str, Any],
    ) -> tuple[str | None, str, str | None]:
        """Return the stable identity of one detected issue."""
        entity_id = issue.get("entity_id")
        purpose = issue.get("purpose")
        return (
            entity_id if isinstance(entity_id, str) else None,
            str(issue["code"]),
            purpose if isinstance(purpose, str) else None,
        )

    @classmethod
    def _index_issues(
        cls, issues: list[dict[str, Any]]
    ) -> dict[tuple[str | None, str, str | None], dict[str, Any]]:
        """Index issues by their public, evidence-based identity."""
        return {cls._issue_identity(issue): issue for issue in issues}

    @callback
    def _publish_issue_changes(self) -> None:
        """Emit deduplicated issue lifecycle events after the startup baseline."""
        if self._runtime is None:
            return
        current = self._index_issues(self.active_issues(self._runtime))
        if not self._issue_events_enabled:
            self._active_issue_index = current
            return
        previous = self._active_issue_index
        for identity in sorted(current.keys() - previous.keys(), key=str):
            self._fire_issue_change("detected", current[identity])
        for identity in sorted(previous.keys() - current.keys(), key=str):
            self._fire_issue_change("resolved", previous[identity])
        self._active_issue_index = current

    @callback
    def _fire_issue_change(self, change: str, issue: dict[str, Any]) -> None:
        """Fire one privacy-conscious Home Assistant automation event."""
        data: dict[str, Any] = {
            "domain": DOMAIN,
            "event": EVENT_TYPE_DIAGNOSTIC_ISSUE_CHANGED,
            "change": change,
            "severity": issue["severity"],
            "code": issue["code"],
        }
        for key in ("entity_id", "purpose"):
            if isinstance(issue.get(key), str):
                data[key] = issue[key]
        self._hass.bus.async_fire(EVENT_VELAIR, data)

    def snapshot(self, runtime: dict[str, Any]) -> dict[str, Any]:
        """Build a read-only snapshot from current authoritative runtime state."""
        scheduler = runtime["scheduler"]
        storage = runtime["storage"]
        data = storage.data
        zones = data.get("zones", {})
        room_assist = (
            {} if scheduler.temperature_migration_blocked
            else scheduler.get_room_sensor_assist_statuses()
        )
        comfort = (
            {} if scheduler.temperature_migration_blocked
            else scheduler.get_comfort_assessments()
        )
        zone_runtime = (
            {} if scheduler.temperature_migration_blocked
            else scheduler.get_zone_runtime_statuses()
        )
        units: dict[str, Any] = {}
        counts = {"ok": 0, "warning": 0, "error": 0}
        climate_manager = runtime.get("climate_manager")
        for entity_id, zone in zones.items():
            unit = self._unit_snapshot(
                entity_id,
                zone,
                data,
                zone_runtime.get(entity_id),
                room_assist.get(entity_id),
                comfort.get(entity_id),
                scheduler,
            )
            settling_diagnostics = getattr(
                climate_manager, "command_settling_diagnostics", None
            )
            if callable(settling_diagnostics):
                unit["command_settling"] = settling_diagnostics(entity_id)
                if unit["command_settling"]["mismatches"]:
                    unit["issues"].append({
                        "severity": "warning",
                        "code": "command_settling_mismatch",
                    })
                    if unit["status"] != "error":
                        unit["status"] = "warning"
            units[entity_id] = unit
            counts[unit["status"]] += 1

        issues: list[dict[str, Any]] = []
        if storage.temperature_migration_required:
            issues.append({"severity": "error", "code": "temperature_migration_required"})
        if runtime.get("operation_recovery"):
            issues.append({"severity": "error", "code": "operation_recovery_required"})
        overall = (
            "error"
            if issues or counts["error"]
            else "warning"
            if counts["warning"]
            else "ok"
        )
        return {
            "generated_at": _now_iso(),
            "history_limit": DIAGNOSTIC_HISTORY_LIMIT,
            "history_policy": {
                "categories": deepcopy(self._history_categories),
                "runtime_only": True,
                "cleared_on_restart": True,
            },
            "overall": {
                "status": overall,
                "scheduler_mode": scheduler.mode,
                "scheduler_status": scheduler.get_operational_status(),
                "unit_counts": counts,
                "issues": issues,
            },
            "units": units,
            "history": list(reversed(self._history)),
        }

    def cached_snapshot(self, runtime: dict[str, Any]) -> dict[str, Any]:
        """Share one immutable-by-convention snapshot for one diagnostics revision."""
        if self._cached_snapshot is None or self._cached_revision != self._revision:
            self._cached_snapshot = self.snapshot(runtime)
            self._cached_revision = self._revision
        return self._cached_snapshot

    def export_snapshot(
        self,
        runtime: dict[str, Any],
        *,
        redact_entity_ids: bool = True,
    ) -> dict[str, Any]:
        """Return a report with local entity identifiers replaced."""
        snapshot = self.snapshot(runtime)
        aliases = {
            entity_id: f"climate_unit_{index}"
            for index, entity_id in enumerate(self._entity_ids, start=1)
        }
        structured_ids = _entity_like_values(snapshot)
        state_ids = (
            set(self._hass.states)
            if isinstance(self._hass.states, dict)
            else set(self._hass.states.async_entity_ids())
        )
        known_domains = {
            entity_id.split(".", 1)[0]
            for entity_id in state_ids | structured_ids | set(aliases)
            if _is_entity_id(entity_id)
        }
        sensor_ids = sorted(
            _entity_like_values(snapshot, embedded_domains=known_domains)
            - set(aliases)
        )
        aliases.update(
            {
                entity_id: f"associated_entity_{index}"
                for index, entity_id in enumerate(sensor_ids, start=1)
            }
        )
        return {
            "privacy": {
                "entity_ids_redacted": redact_entity_ids,
                "operational_identifiers_redacted": True,
                "history_is_runtime_only": True,
                "review_before_sharing": True,
            },
            "diagnostics": _replace_entity_ids(
                snapshot,
                aliases if redact_entity_ids else {},
            ),
        }

    def _unit_snapshot(
        self,
        entity_id: str,
        zone: dict[str, Any],
        data: dict[str, Any],
        runtime_status: dict[str, Any] | None,
        room_assist: dict[str, Any] | None,
        comfort: dict[str, Any] | None,
        scheduler: Any,
    ) -> dict[str, Any]:
        state = self._hass.states.get(entity_id)
        issues: list[dict[str, Any]] = []
        status = "ok"
        if state is None:
            issues.append({"severity": "error", "code": "entity_missing"})
            status = "error"
        elif state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            issues.append({"severity": "warning", "code": f"entity_{state.state}"})
            status = "warning"
        attributes = getattr(state, "attributes", {}) if state is not None else {}
        modes = attributes.get("hvac_modes") if isinstance(attributes, dict) else None
        if state is not None and (
            not isinstance(modes, (list, tuple)) or not modes
        ):
            issues.append({"severity": "warning", "code": "hvac_modes_not_reported"})
            status = "warning"

        delivery = deepcopy(
            self._delivery.get(
                entity_id,
                {"status": "idle", "retry_count": 0, "last_error": None},
            )
        )
        delivery_status = delivery.get("status")
        if delivery_status in ("exhausted", "invalid_intent"):
            issues.append({"severity": "error", "code": f"delivery_{delivery_status}"})
            status = "error"
        elif delivery_status in ("failed", "retrying"):
            issues.append({"severity": "warning", "code": f"delivery_{delivery_status}"})
            if status != "error":
                status = "warning"
        if runtime_status is None and not scheduler.temperature_migration_blocked:
            issues.append({"severity": "warning", "code": "runtime_status_unavailable"})
            if status != "error":
                status = "warning"
        if state is not None and (
            not isinstance(attributes.get("min_temp"), (int, float))
            or not isinstance(attributes.get("max_temp"), (int, float))
        ):
            issues.append({"severity": "warning", "code": "temperature_range_not_reported"})
            if status != "error":
                status = "warning"

        preconditioning = deepcopy(zone.get("preconditioning", {}))
        comfort_config = deepcopy(zone.get("comfort", {}))
        sensors = []
        sensor_candidates = [
            (
                "room_temperature",
                preconditioning.get("room_temperature_entity_id"),
                bool(
                    preconditioning.get("enabled")
                    or preconditioning.get("room_sensor_assist_enabled")
                ),
            ),
            (
                "outdoor_temperature",
                preconditioning.get("outdoor_temperature_entity_id"),
                bool(
                    preconditioning.get("enabled")
                    and preconditioning.get("use_outdoor_temperature")
                ),
            ),
            (
                "comfort_temperature",
                comfort_config.get("temperature_entity_id"),
                bool(comfort_config.get("enabled")),
            ),
            (
                "comfort_humidity",
                comfort_config.get("humidity_entity_id"),
                bool(
                    comfort_config.get("enabled")
                    and comfort_config.get("humidity_enabled")
                ),
            ),
            (
                "comfort_co2",
                comfort_config.get("co2_entity_id"),
                bool(comfort_config.get("enabled")),
            ),
            (
                "comfort_outdoor_temperature",
                comfort_config.get("outdoor_temperature_entity_id"),
                bool(
                    comfort_config.get("enabled")
                    and comfort_config.get("outdoor_comparison_enabled")
                ),
            ),
            (
                "comfort_outdoor_humidity",
                comfort_config.get("outdoor_humidity_entity_id"),
                bool(
                    comfort_config.get("enabled")
                    and comfort_config.get("outdoor_comparison_enabled")
                ),
            ),
        ]
        derived_config = comfort_config.get("derived_metrics", {})
        if isinstance(derived_config, dict):
            sensor_candidates.extend(
                (
                    f"comfort_{metric}",
                    metric_config.get("entity_id"),
                    bool(
                        comfort_config.get("enabled")
                        and metric_config.get("enabled")
                        and metric_config.get("source") == "entity"
                    ),
                )
                for metric, metric_config in derived_config.items()
                if isinstance(metric_config, dict)
            )
        for purpose, sensor_id, active in sensor_candidates:
            if isinstance(sensor_id, str) and sensor_id:
                sensor_state = self._hass.states.get(sensor_id)
                sensor_value = getattr(sensor_state, "state", "missing")
                sensors.append({
                    "purpose": purpose,
                    "entity_id": sensor_id,
                    "state": sensor_value,
                    "active": active,
                })
                if active and sensor_value in ("missing", STATE_UNAVAILABLE, STATE_UNKNOWN):
                    issues.append({
                        "severity": "warning",
                        "code": "associated_sensor_unavailable",
                        "purpose": purpose,
                    })
                    if status != "error":
                        status = "warning"

        return {
            "status": status,
            "issues": issues,
            "state": getattr(state, "state", "missing"),
            "capabilities": {
                "hvac_modes": list(modes) if isinstance(modes, (list, tuple)) else [],
                "min_temperature": attributes.get("min_temp"),
                "max_temperature": attributes.get("max_temp"),
                "target_temperature_step": attributes.get("target_temp_step"),
            },
            "configuration": {
                "enabled": bool(zone.get("enabled", True)),
                "preconditioning": preconditioning,
                "comfort": comfort_config,
            },
            "effective_setup": scheduler.get_zone_effective_setup(entity_id),
            "intent": deepcopy(runtime_status),
            "last_application": deepcopy(self._last_applied.get(entity_id)),
            "delivery": delivery,
            "override": deepcopy(zone.get("override")),
            "pauses": deepcopy(zone.get("pauses", [])),
            "room_assist": deepcopy(room_assist),
            "comfort": deepcopy(comfort),
            "preconditioning_learning": _learning_summary(
                data.get("preconditioning_learning", {}).get(entity_id)
            ),
            "sensors": sensors,
        }


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _event_history_category(event_name: str) -> str:
    """Classify known feature events; unknown future events remain visible."""
    normalized = event_name.lower()
    if "room_assist" in normalized or "room_sensor_assist" in normalized:
        return "room_assist"
    if normalized.startswith("preconditioning_"):
        return "preconditioning"
    if normalized.startswith("comfort_"):
        return "comfort"
    return "control"


def _sanitized_changed_fields(value: Any) -> list[str]:
    if not isinstance(value, (list, tuple)):
        return []
    return [
        field
        for field in value
        if isinstance(field, str) and field in _CONTROL_SNAPSHOT_FIELDS
    ]


def _sanitized_control_snapshot(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    snapshot: dict[str, Any] = {}
    hvac_mode = value.get("hvac_mode")
    if isinstance(hvac_mode, str):
        snapshot["hvac_mode"] = hvac_mode
    for field in _CONTROL_SNAPSHOT_FIELDS[1:]:
        candidate = value.get(field)
        if (
            isinstance(candidate, (int, float))
            and not isinstance(candidate, bool)
            and math.isfinite(candidate)
        ):
            snapshot[field] = candidate
    return snapshot


def _sanitized_ha_context(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    return {
        key: bool(value.get(key))
        for key in ("has_context_id", "has_parent_id", "has_user_id")
        if key in value
    }


def _age_seconds(value: Any) -> int | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return max(0, int((datetime.now(UTC) - parsed.astimezone(UTC)).total_seconds()))


def _event_time(event: Event) -> str:
    value = getattr(event, "time_fired", None)
    return value.isoformat() if value is not None else _now_iso()


def _replace_entity_ids(value: Any, aliases: dict[str, str]) -> Any:
    if isinstance(value, dict):
        return {
            _replace_entity_ids_in_string(str(key), aliases): (
                "REDACTED"
                if _redacted_operational_identifier(key, item)
                else _replace_entity_ids(item, aliases)
            )
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_replace_entity_ids(item, aliases) for item in value]
    if isinstance(value, str):
        return _replace_entity_ids_in_string(value, aliases)
    return value


def _replace_entity_ids_in_string(value: str, aliases: dict[str, str]) -> str:
    """Replace exact or embedded known IDs while preserving their relationships."""
    redacted = value
    for entity_id in sorted(aliases, key=lambda item: (-len(item), item)):
        redacted = redacted.replace(entity_id, aliases[entity_id])
    return redacted


def _redacted_operational_identifier(key: Any, value: Any) -> bool:
    """Hide user-chosen closed identifiers while retaining structural evidence."""
    return value is not None and key in {
        "context_id",
        "mode_id",
        "mode_name",
        "pause_id",
        "pause_ids",
        "parent_id",
        "previous_profile_ids",
        "profile_id",
        "profile_ids",
        "profile_owner_id",
        "profile_owner_name",
        "user_id",
    }


def _entity_like_values(
    value: Any,
    *,
    embedded_domains: set[str] | None = None,
    structured: bool = False,
) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        for key, item in value.items():
            if isinstance(key, str) and _is_entity_id(key):
                found.add(key)
            found.update(
                _entity_like_values(
                    item,
                    embedded_domains=embedded_domains,
                    structured=isinstance(key, str)
                    and (key == "entity_id" or key.endswith("_entity_id")),
                )
            )
    elif isinstance(value, (list, tuple)):
        for item in value:
            found.update(
                _entity_like_values(
                    item,
                    embedded_domains=embedded_domains,
                    structured=structured,
                )
            )
    elif isinstance(value, str):
        if structured and _is_entity_id(value):
            found.add(value)
        if embedded_domains is not None:
            for match in _EMBEDDED_ENTITY_ID.finditer(value):
                candidate = match.group(1)
                domain = candidate.split(".", 1)[0]
                if domain in embedded_domains and _is_entity_id(candidate):
                    found.add(candidate)
    return found


def _is_entity_id(value: str) -> bool:
    """Reject timestamp/decimal strings that HA's permissive helper accepts."""
    if not valid_entity_id(value):
        return False
    domain, _object_id = value.split(".", 1)
    return domain.isidentifier() and domain.islower()


def _learning_summary(value: Any) -> dict[str, Any] | None:
    """Summarize learning evidence without copying its bounded sample payload."""
    if not isinstance(value, dict):
        return None
    summary: dict[str, Any] = {}
    for direction in ("heat", "cool"):
        item = value.get(direction)
        observations = item.get("observations") if isinstance(item, dict) else None
        summary[direction] = {
            "observation_count": len(observations) if isinstance(observations, list) else 0,
        }
    return summary


def _public_delivery_source(value: Any) -> str:
    """Map internal scheduler reasons to a small public contract."""
    if value in ("service_set_temperature", "service_set_hvac_mode"):
        return "manual"
    if value == "boost":
        return "boost"
    if value == "external_change_reasserted":
        return "automatic_reassertion"
    return "automatic"


def _public_delivery_action(value: Any) -> str:
    """Return a stable public action without leaking internal values."""
    return value if value in ("set_temperature", "set_hvac_mode", "turn_off") else "other"
