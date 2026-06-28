"""Event-driven climate scheduler."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import datetime, time, timedelta
import logging
from uuid import uuid4

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import (
    async_track_point_in_time,
    async_track_state_change_event,
)
from homeassistant.util import dt as dt_util

from .climate_manager import ClimateManager
from .const import (
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
    DOMAIN,
    EVENT_TYPE_BOOST_ENDED,
    EVENT_TYPE_BOOST_STARTED,
    EVENT_TYPE_CLIMATE_TARGET_APPLIED,
    EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED,
    EVENT_TYPE_SCHEDULER_MODE_CHANGED,
    EVENT_TYPE_ZONE_PAUSED,
    EVENT_TYPE_ZONE_RESUMED,
    EVENT_VELAIR,
    MODE_AUTO,
    MODE_PAUSED,
    NAME,
    SIGNAL_SCHEDULER_UPDATED,
    ZONE_PAUSE_ACTION_NONE,
    ZONE_PAUSE_ACTION_TURN_OFF,
)
from .models import (
    ClimateEvent,
    DEFAULT_SCHEDULE_TEMPLATES_VERSION,
    PanelSettingsData,
    PreconditioningData,
    PreconditioningLearningData,
    PreconditioningObservation,
    ScheduleBlock,
    ScheduleTemplateData,
    SchedulerData,
    ZoneOverride,
    ZoneData,
    WEEKDAYS,
    empty_preconditioning_learning_data,
    normalize_panel_settings,
    normalize_preconditioning_data,
    preconditioning_observations_for_direction,
    predict_preconditioning_lead,
    trim_preconditioning_observations,
)

_LOGGER = logging.getLogger(__name__)
LOGBOOK_DOMAIN = "logbook"
LOGBOOK_SERVICE_LOG = "log"

HVAC_MODE_LABELS_EN = {
    "auto": "Auto",
    "cool": "Cool",
    "dry": "Dry",
    "fan_only": "Fan",
    "heat": "Heat",
    "heat_cool": "Heat/Cool",
    "off": "Off",
}

HVAC_MODE_LABELS_ES = {
    "auto": "Automático",
    "cool": "Frío",
    "dry": "Seco",
    "fan_only": "Ventilador",
    "heat": "Calor",
    "heat_cool": "Calor/Frío",
    "off": "Apagado",
}

PRECONDITIONING_HEATING_MODES = {"heat"}
PRECONDITIONING_COOLING_MODES = {"cool"}
PRECONDITIONING_AUTO_MODES = {"auto", "heat_cool"}
PRECONDITIONING_REPLAN_DEBOUNCE = timedelta(seconds=30)
PRECONDITIONING_REPLAN_MIN_TEMPERATURE_CHANGE = 0.2


@dataclass(frozen=True, slots=True)
class _PreconditioningSession:
    """Runtime-only state for one local learning attempt."""

    entity_id: str
    direction: str
    started_at: datetime
    target_when: datetime
    weekday: str
    start: str
    target_temperature: float
    start_temperature: float
    hvac_mode: str | None
    startup_minutes: int
    outdoor_temp_start: float | None


class VelairScheduler:
    """Calculate and execute climate schedule events."""

    def __init__(
        self,
        hass: HomeAssistant,
        data: SchedulerData,
        climate_manager: ClimateManager,
        async_save_data: Callable[[], Awaitable[None]],
    ) -> None:
        """Initialize the scheduler."""
        self._hass = hass
        self._data = data
        self._climate_manager = climate_manager
        self._async_save_data = async_save_data
        self._unsub_timer: CALLBACK_TYPE | None = None
        self._unsub_preconditioning_listener: CALLBACK_TYPE | None = None
        self._unsub_preconditioning_replan_listener: CALLBACK_TYPE | None = None
        self._unsub_preconditioning_replan_timer: CALLBACK_TYPE | None = None
        self._applied_preconditioning_targets: dict[str, datetime] = {}
        self._preconditioning_sessions: dict[str, _PreconditioningSession] = {}
        self._preconditioning_replan_entities: tuple[str, ...] = ()
        self._preconditioning_replan_temperatures: dict[str, float] = {}
        self._preconditioning_plan_snapshots: dict[str, tuple] = {}
        self.next_event: ClimateEvent | None = None
        self.next_events: list[ClimateEvent] = []

    @property
    def mode(self) -> str:
        """Return the current scheduler mode."""
        return self._data["global_"]["mode"]

    async def async_start(self, *, apply_current_schedule: bool = False) -> None:
        """Start scheduling events."""
        self.async_schedule_next_event()
        if apply_current_schedule and self.mode == MODE_AUTO:
            await self.async_apply_current_schedule(source="startup")

    async def async_stop(self) -> None:
        """Stop scheduling events."""
        self._clear_timer()
        self._clear_preconditioning_sessions()
        self._clear_preconditioning_replan_listener()
        self._clear_preconditioning_replan_timer()
        self._preconditioning_plan_snapshots.clear()

    async def async_apply_current_schedule(
        self,
        entity_id: str | None = None,
        *,
        hvac_mode: str | None = None,
        source: str = "current_schedule",
    ) -> None:
        """Apply the last schedule block effective now."""
        now = dt_util.now()
        for event in self._iter_current_events(now, entity_id):
            if self._is_zone_override_active(event.entity_id, now):
                continue

            await self._async_apply_event(
                event,
                hvac_mode=hvac_mode or event.hvac_mode,
                source=source,
            )

    async def async_set_temperature(
        self,
        entity_id: str,
        temperature: float,
        *,
        ensure_on: bool = False,
        hvac_mode: str | None = None,
        log_action: bool = True,
        event_source: str | None = None,
    ) -> None:
        """Apply a manual temperature."""
        self.ensure_temperature_in_limits(entity_id, temperature)
        await self._climate_manager.async_set_temperature(
            entity_id,
            temperature,
            ensure_on=ensure_on,
            hvac_mode=hvac_mode,
        )
        if log_action:
            await self._async_log_climate_temperature(
                entity_id,
                temperature,
                hvac_mode=hvac_mode,
                scheduled=False,
            )
        if event_source is not None:
            self._async_fire_climate_target_applied_data(
                {
                    "entity_id": entity_id,
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": temperature,
                    "hvac_mode": hvac_mode,
                    "source": event_source,
                }
            )

    async def async_set_mode(
        self,
        mode: str,
        *,
        paused_until: str | None = None,
        apply_current_schedule: bool = False,
    ) -> None:
        """Set the scheduler mode."""
        previous_mode = self._data["global_"]["mode"]
        previous_paused_until = self._data["global_"].get("paused_until")
        if mode != MODE_AUTO:
            self._clear_preconditioning_sessions()
        self._data["global_"]["mode"] = mode
        self._data["global_"]["paused_until"] = paused_until
        self._data["global_"]["paused_started_at"] = (
            dt_util.now().isoformat()
            if mode == MODE_PAUSED and paused_until is not None
            else None
        )
        await self._async_save_data()
        self.async_schedule_next_event()

        if previous_mode != mode or previous_paused_until != paused_until:
            self._async_fire_scheduler_mode_changed(
                mode,
                previous_mode=previous_mode,
                paused_until=paused_until,
                paused_started_at=self._data["global_"].get("paused_started_at"),
            )
        if apply_current_schedule:
            await self.async_apply_current_schedule(source="scheduler_resumed")
        await self._async_log_mode_change(
            mode,
            previous_mode=previous_mode,
            paused_until=paused_until,
        )

    def get_current_event(self, entity_id: str) -> ClimateEvent | None:
        """Return the active event for one climate entity."""
        if entity_id not in self._data["zones"]:
            return None

        override = self._get_active_zone_override(entity_id, dt_util.now())
        if _is_boost_override(override):
            return ClimateEvent(
                entity_id=entity_id,
                when=dt_util.now(),
                temperature=float(override["temperature"]),
                weekday="override",
                start=override["type"],
                action=ACTION_SET_TEMPERATURE,
                hvac_mode=override.get("hvac_mode"),
            )
        if _is_pause_override(override):
            return None

        events = self._iter_current_events(dt_util.now(), entity_id)
        return events[0] if events else None

    def get_active_overrides(self) -> dict[str, dict]:
        """Return active zone overrides keyed by entity ID."""
        now = dt_util.now()
        return {
            entity_id: override
            for entity_id in self._data["zones"]
            if (override := self._get_active_zone_override(entity_id, now)) is not None
            and _is_boost_override(override)
        }

    def get_operational_status(self) -> str:
        """Return a human-readable operational status."""
        if self.mode != MODE_AUTO:
            return self.mode

        if self.get_active_overrides():
            return "override_active"

        if self.next_event is not None:
            return "scheduled"

        return "idle"

    def get_temperature_limits(self, entity_id: str) -> tuple[float, float]:
        """Return the target temperature range for one managed climate."""
        self.ensure_managed_entity(entity_id)
        return self._climate_manager.temperature_limits(entity_id)

    def ensure_temperature_in_limits(self, entity_id: str, temperature: float) -> None:
        """Raise if a temperature is outside a climate entity range."""
        min_temperature, max_temperature = self.get_temperature_limits(entity_id)
        if temperature < min_temperature or temperature > max_temperature:
            raise ValueError(
                f"Temperature must be between {min_temperature:g} and {max_temperature:g}"
            )

    def ensure_blocks_in_temperature_limits(
        self,
        entity_id: str,
        blocks: list[ScheduleBlock],
    ) -> None:
        """Raise if any scheduled temperature is outside a climate entity range."""
        for block in blocks:
            if block.get("action", ACTION_SET_TEMPERATURE) == ACTION_TURN_OFF:
                continue

            temperature = block.get("temperature")
            if temperature is None:
                raise ValueError(f"Missing temperature for {block['start']}")

            self.ensure_temperature_in_limits(entity_id, float(temperature))

    def ensure_managed_entity(self, entity_id: str) -> None:
        """Raise if an entity is not managed by this scheduler."""
        if entity_id not in self._data["zones"]:
            raise ValueError(f"{entity_id} is not managed by Velair")

    async def async_set_zone_boost(
        self,
        entity_id: str,
        temperature: float,
        until: str,
        hvac_mode: str | None = None,
    ) -> None:
        """Set a temporary boost override for one zone."""
        self.ensure_managed_entity(entity_id)
        self.ensure_temperature_in_limits(entity_id, temperature)
        self._discard_preconditioning_session(entity_id)
        current_override = self._data["zones"][entity_id].get("override")
        stored_previous_state = (
            current_override.get("previous_state")
            if _is_boost_override(current_override)
            else None
        )
        previous_state = (
            dict(stored_previous_state)
            if isinstance(stored_previous_state, dict)
            else self._climate_manager.climate_state_snapshot(entity_id)
        )
        if not previous_state:
            raise ValueError(
                f"Cannot start boost while {entity_id} state is unavailable"
            )

        await self.async_set_temperature(
            entity_id,
            temperature,
            ensure_on=True,
            hvac_mode=hvac_mode,
        )
        override = {
            "type": "boost",
            "started_at": dt_util.now().isoformat(),
            "until": until,
            "temperature": temperature,
            "previous_state": previous_state,
        }
        if hvac_mode is not None:
            override["hvac_mode"] = hvac_mode

        self._data["zones"][entity_id]["override"] = override
        await self._async_save_data()
        self.async_schedule_next_event()
        self._async_fire_boost_started(
            entity_id,
            temperature,
            until,
            hvac_mode=hvac_mode,
            started_at=override["started_at"],
        )
        await self._async_log_boost(entity_id, temperature, until, hvac_mode=hvac_mode)

    async def async_cancel_zone_boost(self, entity_id: str) -> None:
        """Cancel one active boost and restore the scheduled or previous state."""
        self.ensure_managed_entity(entity_id)
        override = self._data["zones"][entity_id].get("override")
        if not _is_boost_override(override):
            return

        self._data["zones"][entity_id]["override"] = None
        await self._async_save_data()
        await self._async_finish_zone_boost(
            entity_id,
            override,
            dt_util.now(),
            reason="manual",
        )
        self.async_schedule_next_event()

    async def async_pause_zone(
        self,
        entity_id: str,
        *,
        until: str | None = None,
        action: str = ZONE_PAUSE_ACTION_NONE,
    ) -> None:
        """Pause automatic schedule execution for one zone."""
        self.ensure_managed_entity(entity_id)
        if action not in (ZONE_PAUSE_ACTION_NONE, ZONE_PAUSE_ACTION_TURN_OFF):
            raise ValueError(f"Invalid zone pause action: {action}")

        self._discard_preconditioning_session(entity_id)
        override: ZoneOverride = {
            "type": "pause",
            "started_at": dt_util.now().isoformat(),
            "action": action,
        }
        if until is not None:
            override["until"] = until

        self._data["zones"][entity_id]["override"] = override
        await self._async_save_data()
        if action == ZONE_PAUSE_ACTION_TURN_OFF:
            await self._climate_manager.async_turn_off(entity_id)
            self._async_fire_climate_target_applied_data(
                {
                    "entity_id": entity_id,
                    "action": ACTION_TURN_OFF,
                    "temperature": None,
                    "hvac_mode": None,
                    "weekday": None,
                    "start": None,
                    "source": "zone_paused",
                }
            )

        self.async_schedule_next_event()
        self._async_fire_zone_paused(entity_id, override)
        await self._async_log_zone_pause(entity_id, override)

    async def async_resume_zone(
        self,
        entity_id: str,
        *,
        apply_current_schedule: bool = True,
    ) -> None:
        """Resume automatic schedule execution for one zone."""
        self.ensure_managed_entity(entity_id)
        override = self._data["zones"][entity_id].get("override")
        if not _is_pause_override(override):
            return

        self._data["zones"][entity_id]["override"] = None
        await self._async_save_data()
        self._async_fire_zone_resumed(entity_id, override, reason="manual")
        await self._async_log_zone_resume(entity_id, reason="manual")

        if apply_current_schedule and self.mode == MODE_AUTO:
            await self.async_apply_current_schedule(
                entity_id,
                source="zone_resumed",
            )

        self.async_schedule_next_event()

    async def async_set_daily_schedule(
        self,
        entity_id: str,
        weekday: str,
        blocks: list[ScheduleBlock],
    ) -> None:
        """Set one weekday schedule for one zone."""
        self.ensure_managed_entity(entity_id)
        self.ensure_blocks_in_temperature_limits(entity_id, blocks)
        self._discard_preconditioning_session(entity_id)
        self._data["zones"][entity_id]["schedule"][weekday] = blocks
        await self._async_save_data()
        self.async_schedule_next_event()
        await self._async_apply_saved_schedule_if_current(entity_id, weekday)

    async def async_copy_day_schedule(
        self,
        entity_id: str,
        source_weekday: str,
        target_weekdays: list[str],
    ) -> None:
        """Copy one weekday schedule to one or more target weekdays."""
        self.ensure_managed_entity(entity_id)
        source_blocks = [
            block.copy()
            for block in self._data["zones"][entity_id]["schedule"][source_weekday]
        ]
        self.ensure_blocks_in_temperature_limits(entity_id, source_blocks)

        for weekday in target_weekdays:
            self._data["zones"][entity_id]["schedule"][weekday] = [
                block.copy() for block in source_blocks
            ]
        self._discard_preconditioning_session(entity_id)

        await self._async_save_data()
        self.async_schedule_next_event()
        today = self._today_weekday()
        if today in target_weekdays:
            await self._async_apply_saved_schedule_if_current(entity_id, today)

    async def async_clear_schedule(
        self,
        entity_id: str,
        weekday: str | None = None,
    ) -> None:
        """Clear a zone schedule."""
        self.ensure_managed_entity(entity_id)
        self._discard_preconditioning_session(entity_id)

        if weekday is None:
            for day in WEEKDAYS:
                self._data["zones"][entity_id]["schedule"][day] = []
        else:
            self._data["zones"][entity_id]["schedule"][weekday] = []

        await self._async_save_data()
        self.async_schedule_next_event()

    async def async_set_schedule_template(
        self,
        name: str,
        blocks: list[ScheduleBlock],
        key: str | None = None,
    ) -> str:
        """Create or update a custom schedule template."""
        template_key = key or uuid4().hex
        templates = self._data.setdefault("templates", [])
        template = {
            "key": template_key,
            "name": name.strip(),
            "blocks": [block.copy() for block in blocks],
        }

        for index, existing_template in enumerate(templates):
            if existing_template["key"] == template_key:
                templates[index] = template
                break
        else:
            templates.append(template)

        await self._async_save_data()
        self._async_write_state()
        return template_key

    async def async_update_settings(self, settings: dict) -> PanelSettingsData:
        """Update persisted panel settings."""
        next_settings = normalize_panel_settings(
            {
                **self._data["settings"],
                **settings,
            },
            list(self._data["zones"]),
        )
        self._data["settings"] = next_settings
        await self._async_save_data()
        self._async_write_state()
        return next_settings

    async def async_update_zone_preconditioning(
        self,
        entity_id: str,
        preconditioning: dict,
    ) -> PreconditioningData:
        """Update persisted preconditioning settings for one zone."""
        self.ensure_managed_entity(entity_id)
        next_preconditioning = normalize_preconditioning_data(
            {
                **self._data["zones"][entity_id].get("preconditioning", {}),
                **preconditioning,
            }
        )
        self._data["zones"][entity_id]["preconditioning"] = next_preconditioning
        if not next_preconditioning["enabled"]:
            self._discard_preconditioning_session(entity_id)
        await self._async_save_data()
        self.async_schedule_next_event()
        return next_preconditioning

    async def async_reset_zone_preconditioning_learning(
        self,
        entity_id: str,
        direction: str,
    ) -> None:
        """Delete local adaptive preconditioning observations for one zone direction."""
        self.ensure_managed_entity(entity_id)
        if direction not in ("heat", "cool"):
            raise ValueError(f"Unsupported preconditioning direction: {direction}")

        session = self._preconditioning_sessions.get(entity_id)
        if session is not None and session.direction == direction:
            self._discard_preconditioning_session(entity_id)

        learning = self._data.setdefault("preconditioning_learning", {})
        zone_learning = learning.get(entity_id)
        if isinstance(zone_learning, dict):
            zone_learning[direction] = {"observations": []}
        await self._async_save_data()
        self.async_schedule_next_event()

    async def async_reset_zone_preconditioning_settings(
        self,
        entity_id: str,
    ) -> PreconditioningData:
        """Restore tuning defaults without changing enablement or learning data."""
        self.ensure_managed_entity(entity_id)
        current = normalize_preconditioning_data(
            self._data["zones"][entity_id].get("preconditioning")
        )
        defaults = normalize_preconditioning_data(None)
        defaults["enabled"] = current["enabled"]
        self._data["zones"][entity_id]["preconditioning"] = defaults
        await self._async_save_data()
        self.async_schedule_next_event()
        return defaults

    async def async_delete_schedule_template(self, key: str) -> None:
        """Delete a custom schedule template."""
        templates = self._data.setdefault("templates", [])
        next_templates = [
            template for template in templates if template["key"] != key
        ]
        if len(next_templates) == len(templates):
            raise ValueError(f"Unknown schedule template: {key}")

        self._data["templates"] = next_templates
        await self._async_save_data()
        self._async_write_state()

    async def async_replace_portable_data(
        self,
        *,
        zones: dict[str, ZoneData] | None = None,
        templates: list[ScheduleTemplateData] | None = None,
        settings: PanelSettingsData | None = None,
        preconditioning_learning: dict[str, PreconditioningLearningData]
        | None = None,
    ) -> None:
        """Replace persisted sections from a portable import."""
        if zones is not None:
            self._clear_preconditioning_sessions()
            self._data["zones"] = zones
        if templates is not None:
            self._data["templates"] = templates
            self._data["templates_seeded"] = True
            self._data["templates_seeded_version"] = DEFAULT_SCHEDULE_TEMPLATES_VERSION
        if settings is not None:
            self._data["settings"] = settings
        if preconditioning_learning is not None:
            current_learning = self._data.setdefault(
                "preconditioning_learning",
                {},
            )
            current_learning.update(preconditioning_learning)
            for entity_id in preconditioning_learning:
                self._preconditioning_sessions.pop(entity_id, None)
            self._refresh_preconditioning_listener()

        await self._async_save_data()
        self.async_schedule_next_event()

    async def async_reset_data(self, data: SchedulerData) -> None:
        """Replace all persisted scheduler data with a fresh default model."""
        self._clear_preconditioning_sessions()
        self._data.clear()
        self._data.update(data)
        await self._async_save_data()
        self.async_schedule_next_event()

    async def _async_apply_saved_schedule_if_current(
        self,
        entity_id: str,
        weekday: str,
    ) -> None:
        """Apply a saved schedule when it changes the active block for a zone."""
        if self.mode != MODE_AUTO:
            return

        today = self._today_weekday()
        if weekday != today:
            return

        event = self.get_current_event(entity_id)
        if event is None or event.weekday != weekday:
            return

        try:
            await self.async_apply_current_schedule(
                entity_id,
                source="schedule_saved",
            )
        except Exception:
            _LOGGER.exception(
                "Failed to apply current schedule after saving %s for %s",
                weekday,
                entity_id,
            )

    def _today_weekday(self) -> str:
        """Return the current local weekday key."""
        return WEEKDAYS[dt_util.now().weekday()]

    def async_schedule_next_event(self) -> None:
        """Schedule the next scheduler action."""
        self._clear_timer()
        now = dt_util.now()
        self._refresh_preconditioning_replan_listener()

        if self.mode == MODE_AUTO:
            zone_events = self.calculate_next_events_by_zone(now)
            next_time = min((event.when for event in zone_events), default=None)
            self.next_events = (
                [event for event in zone_events if event.when == next_time]
                if next_time is not None
                else []
            )
            self.next_event = self.next_events[0] if self.next_events else None
            self._async_update_preconditioning_plans(zone_events)
        else:
            self.next_events = []
            self.next_event = None
            self._preconditioning_plan_snapshots.clear()
        next_action = self._calculate_next_action_time(now)
        if next_action is None:
            self._async_write_state()
            return

        if next_action <= now:
            self._hass.async_create_task(self._handle_timer(now))
            self._async_write_state()
            return

        self._unsub_timer = async_track_point_in_time(
            self._hass,
            self._handle_timer,
            next_action,
        )
        self._async_write_state()

    def calculate_next_event(self, now: datetime) -> ClimateEvent | None:
        """Return the next schedule event after now."""
        next_events = self.calculate_next_events(now)
        return next_events[0] if next_events else None

    def calculate_next_events(self, now: datetime) -> list[ClimateEvent]:
        """Return all next schedule events sharing the earliest timestamp."""
        candidates = [
            event
            for event in self._iter_future_events(now)
            if event.when > now or _is_due_preconditioning_event(event, now)
        ]
        if not candidates:
            return []

        next_time = min(event.when for event in candidates)
        return [event for event in candidates if event.when == next_time]

    def calculate_next_events_by_zone(self, now: datetime) -> list[ClimateEvent]:
        """Return the next schedule event for each zone."""
        events_by_entity: dict[str, ClimateEvent] = {}
        for event in self._iter_future_events(now):
            if event.when <= now and not _is_due_preconditioning_event(event, now):
                continue

            current = events_by_entity.get(event.entity_id)
            if current is None or event.when < current.when:
                events_by_entity[event.entity_id] = event

        return sorted(events_by_entity.values(), key=lambda event: event.when)

    async def _handle_timer(self, now: datetime) -> None:
        """Handle the next scheduler action."""
        expired_overrides = await self._async_clear_expired_zone_overrides(now)
        await self._async_clear_expired_global_mode(now)
        await self._async_expire_preconditioning_sessions(now)
        expired_entities = set(expired_overrides)

        due_events: list[ClimateEvent] = []
        if self.mode == MODE_AUTO:
            due_events = [
                event
                for event in self._iter_future_events(now - timedelta(minutes=1))
                if event.when <= now
                and event.entity_id not in expired_entities
                and not self._is_zone_override_active(event.entity_id, now)
            ]

        for event in due_events:
            try:
                await self._async_apply_event(
                    event,
                    source="scheduled_event",
                    applied_at=now,
                )
            except Exception:
                _LOGGER.exception("Failed to apply climate event for %s", event.entity_id)

        for entity_id, override in expired_overrides.items():
            if _is_boost_override(override):
                await self._async_finish_zone_boost(
                    entity_id,
                    override,
                    now,
                    reason="expired",
                )
            elif _is_pause_override(override):
                await self._async_apply_expired_zone_pause(entity_id)

        self.async_schedule_next_event()

    async def _async_finish_zone_boost(
        self,
        entity_id: str,
        override: ZoneOverride,
        now: datetime,
        *,
        reason: str,
    ) -> None:
        """Finalize a boost through the same path for expiry and cancellation."""
        await self._async_logbook(
            self._message(
                "Boost cancelled" if reason == "manual" else "Boost ended",
                "Refuerzo cancelado" if reason == "manual" else "Refuerzo finalizado",
            ),
            entity_id=entity_id,
        )
        self._async_fire_boost_ended(entity_id, override, reason=reason)
        await self._async_apply_ended_zone_boost(entity_id, override, now)

    async def _async_apply_ended_zone_boost(
        self,
        entity_id: str,
        override: ZoneOverride,
        now: datetime,
    ) -> None:
        """Apply the correct target after one temporary zone override ends."""
        if self.mode == MODE_AUTO:
            events = self._iter_current_events(now, entity_id)
            event = events[0] if events else None
            if event is not None and _event_has_explicit_target(event):
                await self._async_apply_event(event, source="boost_ended")
                return

        await self._async_restore_previous_climate_state(entity_id, override)

    async def _async_apply_expired_zone_pause(self, entity_id: str) -> None:
        """Apply the current schedule after a temporary zone pause ends."""
        if self.mode != MODE_AUTO:
            return

        await self.async_apply_current_schedule(
            entity_id,
            source="zone_pause_expired",
        )

    async def _async_restore_previous_climate_state(
        self,
        entity_id: str,
        override: ZoneOverride,
    ) -> None:
        """Restore the climate state captured before a temporary override."""
        previous_state = override.get("previous_state")
        if not previous_state:
            return

        await self._climate_manager.async_restore_state(entity_id, previous_state)

    async def _async_clear_expired_global_mode(self, now: datetime) -> None:
        """Return to auto mode when a temporary global mode expires."""
        paused_until = self._data["global_"].get("paused_until")
        expiration = dt_util.parse_datetime(paused_until) if paused_until else None
        if expiration is None or dt_util.as_local(expiration) > now:
            return

        previous_mode = self._data["global_"]["mode"]
        paused_started_at = self._data["global_"].get("paused_started_at")
        self._data["global_"]["mode"] = MODE_AUTO
        self._data["global_"]["paused_until"] = None
        self._data["global_"]["paused_started_at"] = None
        await self._async_save_data()
        self._async_fire_scheduler_mode_changed(
            MODE_AUTO,
            previous_mode=previous_mode,
            paused_until=None,
            paused_started_at=paused_started_at,
        )
        await self._async_logbook(
            self._message(
                "Scheduler resumed automatically",
                "Planificador reanudado automáticamente",
            )
        )

    def _iter_future_events(self, now: datetime) -> list[ClimateEvent]:
        """Return upcoming events in the next seven days."""
        events: list[ClimateEvent] = []
        today = now.date()
        self._clear_applied_preconditioning_targets(now)

        for day_offset in range(8):
            event_date = today + timedelta(days=day_offset)
            weekday = WEEKDAYS[event_date.weekday()]

            for entity_id, zone in self._data["zones"].items():
                if not zone["enabled"]:
                    continue
                if self._is_zone_override_active(entity_id, now):
                    continue

                for block in zone["schedule"][weekday]:
                    event_time = _parse_start_time(block["start"])
                    if event_time is None:
                        continue

                    target_when = dt_util.as_local(
                        datetime.combine(event_date, event_time).replace(
                            tzinfo=now.tzinfo
                        )
                    )
                    if target_when <= now:
                        continue

                    event_when = self._preconditioned_event_when(
                        entity_id,
                        zone,
                        block,
                        target_when,
                    )
                    target_when_for_event = (
                        target_when if event_when != target_when else None
                    )
                    if (
                        target_when_for_event is not None
                        and self._preconditioning_event_key(
                            entity_id,
                            weekday,
                            block["start"],
                            target_when_for_event,
                        )
                        in self._applied_preconditioning_targets
                    ):
                        continue

                    events.append(
                        ClimateEvent(
                            entity_id=entity_id,
                            when=event_when,
                            temperature=_event_temperature(block),
                            weekday=weekday,
                            start=block["start"],
                            action=block.get("action", ACTION_SET_TEMPERATURE),
                            hvac_mode=block.get("hvac_mode"),
                            target_when=target_when_for_event,
                        )
                    )

        return events

    def _iter_current_events(
        self,
        now: datetime,
        entity_id_filter: str | None = None,
    ) -> list[ClimateEvent]:
        """Return the active schedule block for each zone."""
        current_events: list[ClimateEvent] = []
        today = now.date()

        for entity_id, zone in self._data["zones"].items():
            if entity_id_filter is not None and entity_id != entity_id_filter:
                continue

            if not zone["enabled"]:
                continue

            candidate: ClimateEvent | None = None
            weekday = WEEKDAYS[today.weekday()]
            for block in zone["schedule"][weekday]:
                event_time = _parse_start_time(block["start"])
                if event_time is None:
                    continue

                event_when = dt_util.as_local(
                    datetime.combine(today, event_time).replace(tzinfo=now.tzinfo)
                )
                if event_when > now:
                    continue

                event = ClimateEvent(
                    entity_id=entity_id,
                    when=event_when,
                    temperature=_event_temperature(block),
                    weekday=weekday,
                    start=block["start"],
                    action=block.get("action", ACTION_SET_TEMPERATURE),
                    hvac_mode=block.get("hvac_mode"),
                )
                if candidate is None or event.when > candidate.when:
                    candidate = event

            if candidate is not None:
                current_events.append(candidate)

        return current_events

    def _preconditioning_event_key(
        self,
        entity_id: str,
        weekday: str,
        start: str,
        target_when: datetime,
    ) -> str:
        """Return a stable runtime key for one preconditioning target."""
        return f"{entity_id}|{weekday}|{start}|{target_when.isoformat()}"

    def _mark_preconditioning_applied(self, event: ClimateEvent) -> None:
        """Remember one applied preconditioning target until its comfort time passes."""
        if event.target_when is None:
            return

        self._applied_preconditioning_targets[
            self._preconditioning_event_key(
                event.entity_id,
                event.weekday,
                event.start,
                event.target_when,
            )
        ] = event.target_when

    def _clear_applied_preconditioning_targets(self, now: datetime) -> None:
        """Forget applied preconditioning targets after their comfort time."""
        expired_keys = [
            key
            for key, target_when in self._applied_preconditioning_targets.items()
            if target_when <= now
        ]
        for key in expired_keys:
            self._applied_preconditioning_targets.pop(key, None)

    def _preconditioned_event_when(
        self,
        entity_id: str,
        zone: ZoneData,
        block: ScheduleBlock,
        target_when: datetime,
    ) -> datetime:
        """Return the apply time for a scheduled block."""
        lead_minutes = self._preconditioning_lead_minutes(
            entity_id,
            normalize_preconditioning_data(zone.get("preconditioning")),
            block,
        )
        if lead_minutes <= 0:
            return target_when

        return target_when - timedelta(minutes=lead_minutes)

    def _preconditioning_lead_minutes(
        self,
        entity_id: str,
        config: PreconditioningData,
        block: ScheduleBlock,
    ) -> int:
        """Return an early-start lead time for one block."""
        if not config["enabled"]:
            return 0
        if block.get("action", ACTION_SET_TEMPERATURE) == ACTION_TURN_OFF:
            return 0
        if "temperature" not in block:
            return 0

        direction = self._preconditioning_direction(entity_id, config, block)
        if direction is None:
            return 0

        adaptive_lead = self._adaptive_preconditioning_lead_minutes(
            entity_id,
            config,
            block,
            direction,
        )
        return adaptive_lead if adaptive_lead is not None else 0

    def _adaptive_preconditioning_lead_minutes(
        self,
        entity_id: str,
        config: PreconditioningData,
        block: ScheduleBlock,
        direction: str,
    ) -> int | None:
        """Return adaptive lead time for one direction."""
        target_temperature = _event_temperature(block)
        current_temperature = self._current_temperature(entity_id)
        if target_temperature is None or current_temperature is None:
            return None
        learning = self._data.get("preconditioning_learning", {}).get(entity_id, {})
        raw_observations = preconditioning_observations_for_direction(
            learning,
            direction,
        )

        prediction = predict_preconditioning_lead(
            raw_observations,
            direction,
            target_temp=target_temperature,
            current_temp=current_temperature,
            config=config,
            now=dt_util.now(),
            outdoor_temp_target=self._outdoor_temperature(entity_id, config),
        )
        return prediction["recommended_lead_minutes"]

    def _preconditioning_direction(
        self,
        entity_id: str,
        config: PreconditioningData,
        block: ScheduleBlock,
    ) -> str | None:
        """Return whether the block should start early for heating or cooling."""
        target_temperature = _event_temperature(block)
        if target_temperature is None:
            return None

        current_temperature = self._current_temperature(entity_id)
        mode = block.get("hvac_mode") or self._current_hvac_mode(entity_id)
        minimum_delta = config["minimum_delta_temperature"]

        if mode in PRECONDITIONING_HEATING_MODES:
            if current_temperature is None:
                return None
            return (
                "heat"
                if current_temperature < target_temperature - minimum_delta
                else None
            )

        if mode in PRECONDITIONING_COOLING_MODES:
            if current_temperature is None:
                return None
            return (
                "cool"
                if current_temperature > target_temperature + minimum_delta
                else None
            )

        if mode not in PRECONDITIONING_AUTO_MODES:
            return None

        if current_temperature is None:
            return None
        if current_temperature < target_temperature - minimum_delta:
            return "heat"
        if current_temperature > target_temperature + minimum_delta:
            return "cool"

        return None

    def _current_hvac_mode(self, entity_id: str) -> str | None:
        """Return the current HVAC mode for one climate entity."""
        state = self._hass.states.get(entity_id)
        mode = getattr(state, "state", None)
        if not isinstance(mode, str) or mode in ("unknown", "unavailable"):
            return None

        return mode

    def _current_temperature(self, entity_id: str) -> float | None:
        """Return the current measured temperature for one climate entity."""
        return _state_temperature(self._hass.states.get(entity_id))

    def _outdoor_temperature(
        self,
        entity_id: str,
        config: PreconditioningData,
    ) -> float | None:
        """Return optional local outdoor temperature for adaptive prediction."""
        if not config["use_outdoor_temperature"]:
            return None
        outdoor_entity_id = config.get("outdoor_temperature_entity_id")
        if not outdoor_entity_id:
            return None
        return _state_numeric_temperature(self._hass.states.get(outdoor_entity_id))

    async def _async_apply_event(
        self,
        event: ClimateEvent,
        *,
        hvac_mode: str | None = None,
        source: str = "schedule",
        applied_at: datetime | None = None,
    ) -> None:
        """Apply one resolved schedule event."""
        if event.action == ACTION_TURN_OFF:
            await self._climate_manager.async_turn_off(event.entity_id)
            await self._async_logbook(
                self._message(
                    f"Turned off {self._friendly_entity_name(event.entity_id)}",
                    f"Apagado {self._friendly_entity_name(event.entity_id)}",
                ),
                entity_id=event.entity_id,
            )
            self._async_fire_climate_target_applied(
                event,
                hvac_mode=None,
                source=source,
            )
            return

        if event.temperature is None:
            raise ValueError(f"Missing temperature for {event.entity_id} schedule event")

        target_mode = hvac_mode or event.hvac_mode
        await self._climate_manager.async_set_temperature(
            event.entity_id,
            event.temperature,
            ensure_on=True,
            hvac_mode=target_mode,
        )
        await self._async_log_climate_temperature(
            event.entity_id,
            event.temperature,
            hvac_mode=target_mode,
            scheduled=True,
        )
        self._async_fire_climate_target_applied(
            event,
            hvac_mode=target_mode,
            source=source,
        )
        self._mark_preconditioning_applied(event)
        self._start_preconditioning_session(
            event,
            target_mode,
            applied_at or dt_util.now(),
        )

    def _start_preconditioning_session(
        self,
        event: ClimateEvent,
        hvac_mode: str | None,
        started_at: datetime,
    ) -> None:
        """Start a runtime learning session for one preconditioning event."""
        if event.target_when is None or event.temperature is None:
            return
        config = normalize_preconditioning_data(
            self._data["zones"][event.entity_id].get("preconditioning")
        )
        if not config["enabled"]:
            return

        start_temperature = self._current_temperature(event.entity_id)
        if start_temperature is None:
            return

        direction = self._preconditioning_session_direction(
            event,
            hvac_mode,
            start_temperature,
        )
        if direction is None:
            return
        startup_minutes = max(
            0,
            int(round((event.target_when - started_at).total_seconds() / 60)),
        )
        if startup_minutes <= 0:
            return

        self._preconditioning_sessions[event.entity_id] = _PreconditioningSession(
            entity_id=event.entity_id,
            direction=direction,
            started_at=started_at,
            target_when=event.target_when,
            weekday=event.weekday,
            start=event.start,
            target_temperature=event.temperature,
            start_temperature=start_temperature,
            hvac_mode=hvac_mode or event.hvac_mode,
            startup_minutes=startup_minutes,
            outdoor_temp_start=self._outdoor_temperature(
                event.entity_id,
                config,
            ),
        )
        self._refresh_preconditioning_listener()

    def _preconditioning_session_direction(
        self,
        event: ClimateEvent,
        hvac_mode: str | None,
        start_temperature: float,
    ) -> str | None:
        """Return the learning direction for one preconditioning session."""
        if event.temperature is None:
            return None

        mode = hvac_mode or event.hvac_mode or self._current_hvac_mode(event.entity_id)
        if mode in PRECONDITIONING_HEATING_MODES:
            minimum_delta = self._preconditioning_minimum_delta(event.entity_id)
            return "heat" if event.temperature - start_temperature > minimum_delta else None
        if mode in PRECONDITIONING_COOLING_MODES:
            minimum_delta = self._preconditioning_minimum_delta(event.entity_id)
            return "cool" if start_temperature - event.temperature > minimum_delta else None
        if mode not in PRECONDITIONING_AUTO_MODES:
            return None
        minimum_delta = self._preconditioning_minimum_delta(event.entity_id)
        if event.temperature - start_temperature > minimum_delta:
            return "heat"
        if start_temperature - event.temperature > minimum_delta:
            return "cool"
        return None

    def _refresh_preconditioning_listener(self) -> None:
        """Subscribe to climate state changes while learning sessions are active."""
        if self._unsub_preconditioning_listener is not None:
            self._unsub_preconditioning_listener()
            self._unsub_preconditioning_listener = None

        if not self._preconditioning_sessions:
            return

        self._unsub_preconditioning_listener = async_track_state_change_event(
            self._hass,
            list(self._preconditioning_sessions),
            self._handle_preconditioning_state_change,
        )

    def _handle_preconditioning_state_change(self, event) -> None:
        """Handle a Home Assistant state change for a learning session."""
        entity_id = event.data.get("entity_id")
        new_state = event.data.get("new_state")
        temperature = _state_temperature(new_state)
        if not isinstance(entity_id, str) or temperature is None:
            return

        self._hass.async_create_task(
            self._async_observe_preconditioning_temperature(
                entity_id,
                dt_util.now(),
                temperature,
            )
        )

    def _refresh_preconditioning_replan_listener(self) -> None:
        """Subscribe to useful temperature changes while preconditioning is enabled."""
        entity_ids = self._preconditioning_replan_entity_ids(dt_util.now())
        if entity_ids == self._preconditioning_replan_entities:
            return

        self._clear_preconditioning_replan_listener()
        self._preconditioning_replan_entities = entity_ids
        self._preconditioning_replan_temperatures = {
            entity_id: temperature
            for entity_id in entity_ids
            if (temperature := self._current_temperature(entity_id)) is not None
        }

        if not entity_ids:
            self._clear_preconditioning_replan_timer()
            return

        self._unsub_preconditioning_replan_listener = async_track_state_change_event(
            self._hass,
            list(entity_ids),
            self._handle_preconditioning_replan_state_change,
        )

    def _preconditioning_replan_entity_ids(self, now: datetime) -> tuple[str, ...]:
        """Return climates whose temperature changes can affect preconditioning."""
        if self.mode != MODE_AUTO:
            return ()
        return tuple(
            sorted(
                entity_id
                for entity_id, zone in self._data["zones"].items()
                if zone["enabled"]
                and normalize_preconditioning_data(
                    zone.get("preconditioning")
                )["enabled"]
                and self._zone_has_future_preconditioning_candidate(zone, now)
            )
        )

    def _zone_has_future_preconditioning_candidate(
        self,
        zone: ZoneData,
        now: datetime,
    ) -> bool:
        """Return whether a zone has a future block that temperature can replan."""
        today = now.date()
        for day_offset in range(8):
            event_date = today + timedelta(days=day_offset)
            weekday = WEEKDAYS[event_date.weekday()]
            for block in zone["schedule"][weekday]:
                if block.get("action", ACTION_SET_TEMPERATURE) == ACTION_TURN_OFF:
                    continue
                if "temperature" not in block:
                    continue
                event_time = _parse_start_time(block["start"])
                if event_time is None:
                    continue
                target_when = dt_util.as_local(
                    datetime.combine(event_date, event_time).replace(
                        tzinfo=now.tzinfo
                    )
                )
                if target_when > now:
                    return True
        return False

    @callback
    def _handle_preconditioning_replan_state_change(self, event) -> None:
        """Debounce scheduler recalculation after relevant temperature changes."""
        entity_id = event.data.get("entity_id")
        new_state = event.data.get("new_state")
        temperature = _state_temperature(new_state)
        if not isinstance(entity_id, str) or temperature is None:
            return
        if entity_id in self._preconditioning_sessions:
            return
        if entity_id not in self._preconditioning_replan_entities:
            return

        previous_temperature = self._preconditioning_replan_temperatures.get(entity_id)
        threshold = self._preconditioning_replan_temperature_threshold(entity_id)
        if (
            previous_temperature is not None
            and abs(temperature - previous_temperature) < threshold
        ):
            return

        self._preconditioning_replan_temperatures[entity_id] = temperature
        self._schedule_preconditioning_replan()

    def _preconditioning_replan_temperature_threshold(self, entity_id: str) -> float:
        """Return the minimum temperature movement that should trigger replan."""
        configured_delta = self._preconditioning_minimum_delta(entity_id)
        if configured_delta <= 0:
            return PRECONDITIONING_REPLAN_MIN_TEMPERATURE_CHANGE
        return min(
            PRECONDITIONING_REPLAN_MIN_TEMPERATURE_CHANGE,
            configured_delta,
        )

    def _schedule_preconditioning_replan(self) -> None:
        """Schedule one debounced recalculation for adaptive preconditioning."""
        if self._unsub_preconditioning_replan_timer is not None:
            return

        self._unsub_preconditioning_replan_timer = async_track_point_in_time(
            self._hass,
            self._handle_preconditioning_replan_timer,
            dt_util.now() + PRECONDITIONING_REPLAN_DEBOUNCE,
        )

    @callback
    def _handle_preconditioning_replan_timer(self, now: datetime) -> None:
        """Recalculate the next scheduler timer after debounced temperature changes."""
        self._unsub_preconditioning_replan_timer = None
        self.async_schedule_next_event()

    async def _async_observe_preconditioning_temperature(
        self,
        entity_id: str,
        now: datetime,
        temperature: float,
    ) -> None:
        """Close a learning session when its target has been reached."""
        session = self._preconditioning_sessions.get(entity_id)
        if session is None:
            return
        zone = self._data["zones"].get(entity_id)
        if zone is None or not normalize_preconditioning_data(
            zone.get("preconditioning")
        )["enabled"]:
            self._discard_preconditioning_session(entity_id)
            return
        if self.mode != MODE_AUTO or self._is_zone_override_active(entity_id, now):
            self._discard_preconditioning_session(entity_id)
            return
        if not self._preconditioning_session_reached_target(session, temperature):
            return

        await self._async_finish_preconditioning_session(
            session,
            now,
            temperature,
            quality="complete",
        )

    async def _async_expire_preconditioning_sessions(self, now: datetime) -> None:
        """Close learning sessions whose comfort time has passed."""
        expired_sessions = [
            session
            for session in self._preconditioning_sessions.values()
            if session.target_when <= now
        ]
        for session in expired_sessions:
            current_temperature = self._current_temperature(session.entity_id)
            if current_temperature is None:
                self._discard_preconditioning_session(session.entity_id)
                continue
            quality = (
                "complete"
                if self._preconditioning_session_reached_target(
                    session,
                    current_temperature,
                )
                else "partial"
            )
            await self._async_finish_preconditioning_session(
                session,
                now,
                current_temperature,
                quality=quality,
            )

    async def _async_finish_preconditioning_session(
        self,
        session: _PreconditioningSession,
        completed_at: datetime,
        observed_temperature: float,
        *,
        quality: str,
    ) -> None:
        """Persist one useful local learning observation and close the session."""
        zone = self._data["zones"].get(session.entity_id)
        if zone is None or not normalize_preconditioning_data(
            zone.get("preconditioning")
        )["enabled"]:
            self._discard_preconditioning_session(session.entity_id)
            return
        minutes_observed = max(
            0,
            int(round((completed_at - session.started_at).total_seconds() / 60)),
        )
        reached = quality == "complete"
        observation: PreconditioningObservation = {
            "entity_id": session.entity_id,
            "mode": session.direction,
            "created_at": completed_at.isoformat(),
            "scheduled_time": session.target_when.isoformat(),
            "start_time": session.started_at.isoformat(),
            "target_temp": session.target_temperature,
            "initial_temp": session.start_temperature,
            "observed_temp": observed_temperature,
            "outdoor_temp_start": session.outdoor_temp_start,
            "outdoor_temp_target": self._outdoor_temperature(
                session.entity_id,
                normalize_preconditioning_data(
                    self._data["zones"][session.entity_id].get("preconditioning")
                ),
            ),
            "delta_t": round(max(0.0, self._preconditioning_session_delta(session)), 3),
            "startup_minutes": session.startup_minutes,
            "reached": reached,
            "minutes_to_reach": minutes_observed if reached else None,
            "quality": quality,
        }
        if (
            observation["delta_t"] <= self._preconditioning_minimum_delta(session.entity_id)
            or (reached and minutes_observed < 3)
            or (reached and minutes_observed > self._preconditioning_max_lead_minutes(session.entity_id))
        ):
            observation["quality"] = "invalid"
            observation["invalid_reason"] = "out_of_bounds"

        learning = self._data.setdefault("preconditioning_learning", {})
        zone_learning = learning.setdefault(
            session.entity_id,
            empty_preconditioning_learning_data(),
        )
        direction_learning = zone_learning.setdefault(
            session.direction,
            {"observations": []},
        )
        observations = direction_learning.setdefault("observations", [])
        observations.append(observation)
        direction_learning["observations"] = trim_preconditioning_observations(
            observations,
            self._preconditioning_history_size(session.entity_id),
        )
        self._discard_preconditioning_session(session.entity_id)
        await self._async_save_data()
        self._async_write_state()

    def _preconditioning_session_reached_target(
        self,
        session: _PreconditioningSession,
        temperature: float,
    ) -> bool:
        """Return whether a learning session reached its comfort threshold."""
        minimum_delta = self._preconditioning_minimum_delta(session.entity_id)
        if session.direction == "heat":
            return temperature >= session.target_temperature - minimum_delta
        return temperature <= session.target_temperature + minimum_delta

    def _preconditioning_session_delta(self, session: _PreconditioningSession) -> float:
        """Return initial required temperature movement for one session."""
        if session.direction == "heat":
            return session.target_temperature - session.start_temperature
        return session.start_temperature - session.target_temperature

    def _preconditioning_minimum_delta(self, entity_id: str) -> float:
        """Return the configured target threshold for one zone."""
        zone = self._data["zones"].get(entity_id)
        if zone is None:
            return 0.0
        return normalize_preconditioning_data(zone.get("preconditioning"))[
            "minimum_delta_temperature"
        ]

    def _preconditioning_max_lead_minutes(self, entity_id: str) -> int:
        """Return maximum adaptive lead minutes for one zone."""
        zone = self._data["zones"].get(entity_id)
        if zone is None:
            return normalize_preconditioning_data(None)["max_lead_minutes"]
        return normalize_preconditioning_data(zone.get("preconditioning"))[
            "max_lead_minutes"
        ]

    def _preconditioning_history_size(self, entity_id: str) -> int:
        """Return learning history size for one zone."""
        zone = self._data["zones"].get(entity_id)
        if zone is None:
            return normalize_preconditioning_data(None)["learning_history_size"]
        return normalize_preconditioning_data(zone.get("preconditioning"))[
            "learning_history_size"
        ]

    def _discard_preconditioning_session(self, entity_id: str) -> None:
        """Forget one runtime learning session without persisting it."""
        if entity_id not in self._preconditioning_sessions:
            return
        self._preconditioning_sessions.pop(entity_id, None)
        self._refresh_preconditioning_listener()

    def _clear_preconditioning_sessions(self) -> None:
        """Forget all runtime learning sessions."""
        self._preconditioning_sessions.clear()
        self._refresh_preconditioning_listener()

    def _clear_preconditioning_replan_listener(self) -> None:
        """Stop listening for preconditioning replan state changes."""
        if self._unsub_preconditioning_replan_listener is not None:
            self._unsub_preconditioning_replan_listener()
            self._unsub_preconditioning_replan_listener = None
        self._preconditioning_replan_entities = ()
        self._preconditioning_replan_temperatures = {}

    def _clear_preconditioning_replan_timer(self) -> None:
        """Cancel a pending debounced preconditioning replan."""
        if self._unsub_preconditioning_replan_timer is not None:
            self._unsub_preconditioning_replan_timer()
            self._unsub_preconditioning_replan_timer = None

    def _clear_timer(self) -> None:
        """Cancel the active timer if one exists."""
        if self._unsub_timer is not None:
            self._unsub_timer()
            self._unsub_timer = None

    def _async_write_state(self) -> None:
        """Notify entities that scheduler state changed."""
        async_dispatcher_send(self._hass, SIGNAL_SCHEDULER_UPDATED)

    def _async_fire_event(self, event_name: str, event_data: dict) -> None:
        """Fire a Home Assistant event for automation triggers."""
        self._hass.bus.async_fire(
            EVENT_VELAIR,
            {
                "domain": DOMAIN,
                "event": event_name,
                **event_data,
            },
        )

    def _async_fire_scheduler_mode_changed(
        self,
        mode: str,
        *,
        previous_mode: str,
        paused_until: str | None,
        paused_started_at: str | None,
    ) -> None:
        """Fire an event when the scheduler mode changes."""
        data = {
            "mode": mode,
            "previous_mode": previous_mode,
            "paused_until": paused_until,
            "paused_started_at": paused_started_at,
        }
        self._async_fire_event(EVENT_TYPE_SCHEDULER_MODE_CHANGED, data)

    def _async_fire_boost_started(
        self,
        entity_id: str,
        temperature: float,
        until: str,
        *,
        hvac_mode: str | None,
        started_at: str | None,
    ) -> None:
        """Fire an event when a zone boost starts."""
        self._async_fire_event(
            EVENT_TYPE_BOOST_STARTED,
            {
                "entity_id": entity_id,
                "temperature": temperature,
                "hvac_mode": hvac_mode,
                "started_at": started_at,
                "until": until,
            },
        )

    def _async_fire_boost_ended(
        self,
        entity_id: str,
        override: ZoneOverride,
        *,
        reason: str,
    ) -> None:
        """Fire an event when a zone boost ends."""
        self._async_fire_event(
            EVENT_TYPE_BOOST_ENDED,
            {
                "entity_id": entity_id,
                "temperature": override.get("temperature"),
                "hvac_mode": override.get("hvac_mode"),
                "started_at": override.get("started_at"),
                "until": override.get("until"),
                "reason": reason,
            },
        )

    def _async_fire_zone_paused(
        self,
        entity_id: str,
        override: ZoneOverride,
    ) -> None:
        """Fire an event when one zone scheduler is paused."""
        self._async_fire_event(
            EVENT_TYPE_ZONE_PAUSED,
            {
                "entity_id": entity_id,
                "started_at": override.get("started_at"),
                "until": override.get("until"),
                "action": override.get("action", ZONE_PAUSE_ACTION_NONE),
            },
        )

    def _async_fire_zone_resumed(
        self,
        entity_id: str,
        override: ZoneOverride,
        *,
        reason: str,
    ) -> None:
        """Fire an event when one zone scheduler resumes."""
        self._async_fire_event(
            EVENT_TYPE_ZONE_RESUMED,
            {
                "entity_id": entity_id,
                "started_at": override.get("started_at"),
                "until": override.get("until"),
                "action": override.get("action", ZONE_PAUSE_ACTION_NONE),
                "reason": reason,
            },
        )

    def _async_fire_climate_target_applied(
        self,
        event: ClimateEvent,
        *,
        hvac_mode: str | None,
        source: str,
    ) -> None:
        """Fire an event when Velair applies a climate target."""
        data = {
            "entity_id": event.entity_id,
            "action": event.action,
            "temperature": event.temperature,
            "hvac_mode": hvac_mode,
            "weekday": event.weekday,
            "start": event.start,
            "source": source,
        }
        if event.target_when is not None:
            data["target_when"] = event.target_when.isoformat()

        self._async_fire_climate_target_applied_data(data)

    def _async_fire_climate_target_applied_data(self, data: dict) -> None:
        """Fire a target-applied event from arbitrary scheduler data."""
        self._async_fire_event(
            EVENT_TYPE_CLIMATE_TARGET_APPLIED,
            data,
        )

    def _async_update_preconditioning_plans(
        self,
        events: list[ClimateEvent],
    ) -> None:
        """Fire automation events for new or changed preconditioning plans."""
        next_snapshots: dict[str, tuple] = {}
        for event in events:
            data = self._preconditioning_plan_event_data(event)
            if data is None:
                continue
            snapshot = tuple(sorted(data.items()))
            next_snapshots[event.entity_id] = snapshot
            if self._preconditioning_plan_snapshots.get(event.entity_id) == snapshot:
                continue
            self._async_fire_event(EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED, data)

        self._preconditioning_plan_snapshots = next_snapshots

    def _preconditioning_plan_event_data(
        self,
        event: ClimateEvent,
    ) -> dict | None:
        """Build the available prediction context for one early-start event."""
        if event.target_when is None or event.temperature is None:
            return None
        zone = self._data["zones"].get(event.entity_id)
        if zone is None:
            return None
        config = normalize_preconditioning_data(zone.get("preconditioning"))
        if not config["enabled"]:
            return None

        block: ScheduleBlock = {
            "start": event.start,
            "action": event.action,
            "temperature": event.temperature,
        }
        if event.hvac_mode is not None:
            block["hvac_mode"] = event.hvac_mode
        direction = self._preconditioning_direction(event.entity_id, config, block)
        current_temperature = self._current_temperature(event.entity_id)
        if direction is None or current_temperature is None:
            return None

        outdoor_temperature = self._outdoor_temperature(event.entity_id, config)
        learning = self._data.get("preconditioning_learning", {}).get(
            event.entity_id,
            {},
        )
        prediction = predict_preconditioning_lead(
            preconditioning_observations_for_direction(learning, direction),
            direction,
            target_temp=event.temperature,
            current_temp=current_temperature,
            config=config,
            now=dt_util.now(),
            outdoor_temp_target=outdoor_temperature,
        )
        lead_minutes = max(
            0,
            int(round((event.target_when - event.when).total_seconds() / 60)),
        )
        return {
            "entity_id": event.entity_id,
            "scheduled_when": event.target_when.isoformat(),
            "preconditioning_when": event.when.isoformat(),
            "lead_minutes": lead_minutes,
            "direction": direction,
            "target_temperature": event.temperature,
            "current_temperature": current_temperature,
            "temperature_delta": round(abs(event.temperature - current_temperature), 3),
            "hvac_mode": event.hvac_mode,
            "model_source": prediction["source"],
            "complete_sample_count": prediction["complete_sample_count"],
            "partial_sample_count": prediction["partial_sample_count"],
            "similar_sample_count": prediction["similar_sample_count"],
            "comfort_percentile": prediction["comfort_percentile"],
            "used_outdoor_temperature": prediction["used_outdoor_temperature"],
            "outdoor_temperature": outdoor_temperature,
            "weekday": event.weekday,
            "start": event.start,
        }

    async def _async_log_mode_change(
        self,
        mode: str,
        *,
        previous_mode: str,
        paused_until: str | None = None,
    ) -> None:
        """Write a scheduler mode change to the Home Assistant logbook."""
        if mode == MODE_PAUSED and paused_until is not None:
            await self._async_logbook(
                self._message(
                    f"Scheduler paused until {paused_until}",
                    f"Planificador pausado hasta {paused_until}",
                )
            )
            return

        if mode == MODE_PAUSED:
            await self._async_logbook(
                self._message("Scheduler paused", "Planificador pausado")
            )
            return

        if mode == MODE_AUTO and previous_mode == MODE_PAUSED:
            await self._async_logbook(
                self._message("Scheduler resumed", "Planificador reanudado")
            )

    async def _async_log_boost(
        self,
        entity_id: str,
        temperature: float,
        until: str,
        *,
        hvac_mode: str | None = None,
    ) -> None:
        """Write a boost action to the Home Assistant logbook."""
        target = self._format_temperature(temperature)
        mode = (
            f" ({self._format_hvac_mode(hvac_mode)})"
            if hvac_mode is not None
            else ""
        )
        await self._async_logbook(
            self._message(
                f"Boost set to {target}{mode} until {until}",
                f"Refuerzo ajustado a {target}{mode} hasta {until}",
            ),
            entity_id=entity_id,
        )

    async def _async_log_zone_pause(
        self,
        entity_id: str,
        override: ZoneOverride,
    ) -> None:
        """Write a zone pause action to the Home Assistant logbook."""
        until = override.get("until")
        action = override.get("action", ZONE_PAUSE_ACTION_NONE)
        action_text = " and turned off" if action == ZONE_PAUSE_ACTION_TURN_OFF else ""
        action_text_es = " y apagado" if action == ZONE_PAUSE_ACTION_TURN_OFF else ""
        if until:
            english = (
                f"Paused {self._friendly_entity_name(entity_id)}{action_text} until {until}"
            )
            spanish = (
                f"Pausado {self._friendly_entity_name(entity_id)}{action_text_es} hasta {until}"
            )
        else:
            english = f"Paused {self._friendly_entity_name(entity_id)}{action_text}"
            spanish = f"Pausado {self._friendly_entity_name(entity_id)}{action_text_es}"

        await self._async_logbook(
            self._message(english, spanish),
            entity_id=entity_id,
        )

    async def _async_log_zone_resume(
        self,
        entity_id: str,
        *,
        reason: str,
    ) -> None:
        """Write a zone resume action to the Home Assistant logbook."""
        reason_text = "automatically" if reason == "expired" else "manually"
        reason_text_es = "automaticamente" if reason == "expired" else "manualmente"
        await self._async_logbook(
            self._message(
                f"Resumed {self._friendly_entity_name(entity_id)} {reason_text}",
                f"Reanudado {self._friendly_entity_name(entity_id)} {reason_text_es}",
            ),
            entity_id=entity_id,
        )

    async def _async_log_climate_temperature(
        self,
        entity_id: str,
        temperature: float,
        *,
        hvac_mode: str | None = None,
        scheduled: bool,
    ) -> None:
        """Write an applied climate target to the Home Assistant logbook."""
        target = self._format_temperature(temperature)
        mode = (
            f" ({self._format_hvac_mode(hvac_mode)})"
            if hvac_mode is not None
            else ""
        )
        if scheduled:
            english = f"Adjusted {self._friendly_entity_name(entity_id)} to {target}{mode}"
            spanish = f"Ajustado {self._friendly_entity_name(entity_id)} a {target}{mode}"
        else:
            english = f"Set {self._friendly_entity_name(entity_id)} to {target}{mode}"
            spanish = f"Configurado {self._friendly_entity_name(entity_id)} a {target}{mode}"

        await self._async_logbook(
            self._message(english, spanish),
            entity_id=entity_id,
        )

    async def _async_logbook(
        self,
        message: str,
        *,
        entity_id: str | None = None,
    ) -> None:
        """Write a lightweight logbook entry when the logbook integration is loaded."""
        services = getattr(self._hass, "services", None)
        has_service = getattr(services, "has_service", None)
        async_call = getattr(services, "async_call", None)
        if not callable(has_service) or not callable(async_call):
            return
        if not has_service(LOGBOOK_DOMAIN, LOGBOOK_SERVICE_LOG):
            return

        data = {
            "name": NAME,
            "message": message,
        }
        if entity_id is not None:
            data["entity_id"] = entity_id

        await async_call(
            LOGBOOK_DOMAIN,
            LOGBOOK_SERVICE_LOG,
            data,
            blocking=False,
        )

    def _message(self, english: str, spanish: str) -> str:
        """Return a short user-facing message for the configured HA language."""
        return spanish if self._is_spanish() else english

    def _is_spanish(self) -> bool:
        """Return whether Home Assistant is configured in Spanish."""
        language = getattr(getattr(self._hass, "config", None), "language", None)
        return str(language).lower().startswith("es")

    def _friendly_entity_name(self, entity_id: str) -> str:
        """Return a friendly climate name when Home Assistant has one."""
        states = getattr(self._hass, "states", None)
        state = states.get(entity_id) if states is not None else None
        return getattr(state, "attributes", {}).get("friendly_name", entity_id)

    def _format_hvac_mode(self, hvac_mode: str) -> str:
        """Return a short HVAC mode label."""
        labels = HVAC_MODE_LABELS_ES if self._is_spanish() else HVAC_MODE_LABELS_EN
        return labels.get(hvac_mode, hvac_mode)

    def _format_temperature(self, temperature: float) -> str:
        """Return a compact temperature label for logbook messages."""
        return f"{temperature:g} °C"

    def _calculate_next_action_time(self, now: datetime) -> datetime | None:
        """Return the next timer action."""
        candidates: list[datetime] = []

        if self.next_event is not None:
            candidates.append(self.next_event.when)

        if self._preconditioning_sessions:
            candidates.append(
                min(
                    session.target_when
                    for session in self._preconditioning_sessions.values()
                )
            )

        global_expiration = self._get_global_mode_expiration()
        if global_expiration is not None:
            candidates.append(global_expiration)

        zone_expiration = self._get_next_zone_override_expiration()
        if zone_expiration is not None:
            candidates.append(zone_expiration)

        return min(candidates) if candidates else None

    def _get_global_mode_expiration(self) -> datetime | None:
        """Return the temporary global mode expiration time."""
        paused_until = self._data["global_"].get("paused_until")
        if paused_until is None:
            return None

        expiration = dt_util.parse_datetime(paused_until)
        return dt_util.as_local(expiration) if expiration is not None else None

    def _get_next_zone_override_expiration(self) -> datetime | None:
        """Return the next zone override expiration time."""
        expirations = [
            expiration
            for expiration in (
                self._parse_zone_override_expiration(entity_id)
                for entity_id in self._data["zones"]
            )
            if expiration is not None
        ]
        return min(expirations) if expirations else None

    async def _async_clear_expired_zone_overrides(
        self,
        now: datetime,
    ) -> dict[str, ZoneOverride]:
        """Clear expired zone overrides and return affected entity overrides."""
        expired: dict[str, ZoneOverride] = {}

        for entity_id in self._data["zones"]:
            expiration = self._parse_zone_override_expiration(entity_id)
            if expiration is None or expiration > now:
                continue

            override = self._data["zones"][entity_id].get("override")
            self._data["zones"][entity_id]["override"] = None
            if isinstance(override, dict):
                expired[entity_id] = override

        if expired:
            await self._async_save_data()
            for entity_id, override in expired.items():
                if _is_pause_override(override):
                    await self._async_log_zone_resume(entity_id, reason="expired")
                    self._async_fire_zone_resumed(entity_id, override, reason="expired")

        return expired

    def _is_zone_override_active(self, entity_id: str, now: datetime) -> bool:
        """Return whether one zone has an active override."""
        override = self._data["zones"][entity_id].get("override")
        if not isinstance(override, dict):
            return False

        expiration = self._parse_zone_override_expiration(entity_id)
        if expiration is None:
            return _is_pause_override(override)

        return expiration > now

    def _get_active_zone_override(
        self,
        entity_id: str,
        now: datetime,
    ) -> ZoneOverride | None:
        """Return an active zone override."""
        if not self._is_zone_override_active(entity_id, now):
            return None

        return self._data["zones"][entity_id].get("override")

    def _parse_zone_override_expiration(self, entity_id: str) -> datetime | None:
        """Return a zone override expiration datetime."""
        override = self._data["zones"][entity_id].get("override")
        if not isinstance(override, dict):
            return None

        until = override.get("until")
        if not isinstance(until, str) or not until:
            return None

        expiration = dt_util.parse_datetime(until)
        return dt_util.as_local(expiration) if expiration is not None else None


def _parse_start_time(value: str) -> time | None:
    """Parse an HH:MM start time."""
    try:
        hour, minute = value.split(":", 1)
        return time(hour=int(hour), minute=int(minute))
    except (TypeError, ValueError):
        return None


def _event_temperature(block: ScheduleBlock) -> float | None:
    """Return a block temperature when the block uses one."""
    if block.get("action", ACTION_SET_TEMPERATURE) == ACTION_TURN_OFF:
        return None

    return float(block["temperature"])


def _state_temperature(state) -> float | None:
    """Return current temperature from a Home Assistant climate state."""
    attributes = getattr(state, "attributes", {}) if state is not None else {}
    try:
        return float(attributes["current_temperature"])
    except (KeyError, TypeError, ValueError):
        return None


def _state_numeric_temperature(state) -> float | None:
    """Return a numeric temperature from a state or current_temperature attribute."""
    if state is None:
        return None
    attribute_temperature = _state_temperature(state)
    if attribute_temperature is not None:
        return attribute_temperature
    value = getattr(state, "state", None)
    if isinstance(value, str) and value in ("unknown", "unavailable"):
        return None
    if not isinstance(value, (int, float, str)):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _event_has_explicit_target(event: ClimateEvent) -> bool:
    """Return whether a current event should replace an expired boost."""
    return event.action == ACTION_TURN_OFF or event.hvac_mode is not None


def _is_due_preconditioning_event(event: ClimateEvent, now: datetime) -> bool:
    """Return whether an early-start event is inside its target window."""
    return (
        event.target_when is not None
        and event.when <= now
        and event.target_when > now
    )


def _is_boost_override(override: ZoneOverride | dict | None) -> bool:
    """Return whether a zone override is a boost."""
    return (
        isinstance(override, dict)
        and override.get("type") == "boost"
        and "temperature" in override
    )


def _is_pause_override(override: ZoneOverride | dict | None) -> bool:
    """Return whether a zone override is a schedule pause."""
    return isinstance(override, dict) and override.get("type") == "pause"
