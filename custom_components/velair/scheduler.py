"""Event-driven climate scheduler."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime, time, timedelta
import logging
from uuid import uuid4

from homeassistant.core import CALLBACK_TYPE, HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.util import dt as dt_util

from .climate_manager import ClimateManager
from .const import (
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
    DOMAIN,
    EVENT_TYPE_BOOST_ENDED,
    EVENT_TYPE_BOOST_STARTED,
    EVENT_TYPE_CLIMATE_TARGET_APPLIED,
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
    ScheduleBlock,
    ScheduleTemplateData,
    SchedulerData,
    ZoneOverride,
    ZoneData,
    WEEKDAYS,
    normalize_panel_settings,
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
        override = {
            "type": "boost",
            "started_at": dt_util.now().isoformat(),
            "until": until,
            "temperature": temperature,
        }
        previous_state = self._climate_manager.climate_state_snapshot(entity_id)
        if previous_state:
            override["previous_state"] = previous_state
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
    ) -> None:
        """Replace persisted sections from a portable import."""
        if zones is not None:
            self._data["zones"] = zones
        if templates is not None:
            self._data["templates"] = templates
            self._data["templates_seeded"] = True
            self._data["templates_seeded_version"] = DEFAULT_SCHEDULE_TEMPLATES_VERSION
        if settings is not None:
            self._data["settings"] = settings

        await self._async_save_data()
        self.async_schedule_next_event()

    async def async_reset_data(self, data: SchedulerData) -> None:
        """Replace all persisted scheduler data with a fresh default model."""
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

        if self.mode == MODE_AUTO:
            self.next_events = self.calculate_next_events(now)
            self.next_event = self.next_events[0] if self.next_events else None
        else:
            self.next_events = []
            self.next_event = None
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
            event for event in self._iter_future_events(now) if event.when > now
        ]
        if not candidates:
            return []

        next_time = min(event.when for event in candidates)
        return [event for event in candidates if event.when == next_time]

    async def _handle_timer(self, now: datetime) -> None:
        """Handle the next scheduler action."""
        expired_overrides = await self._async_clear_expired_zone_overrides(now)
        await self._async_clear_expired_global_mode(now)
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
                await self._async_apply_event(event, source="scheduled_event")
            except Exception:
                _LOGGER.exception("Failed to apply climate event for %s", event.entity_id)

        for entity_id, override in expired_overrides.items():
            if _is_boost_override(override):
                await self._async_apply_expired_zone_override(entity_id, override, now)
            elif _is_pause_override(override):
                await self._async_apply_expired_zone_pause(entity_id)

        self.async_schedule_next_event()

    async def _async_apply_expired_zone_override(
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

        self._data["global_"]["mode"] = MODE_AUTO
        self._data["global_"]["paused_until"] = None
        self._data["global_"]["paused_started_at"] = None
        await self._async_save_data()
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

                    event_when = dt_util.as_local(
                        datetime.combine(event_date, event_time).replace(
                            tzinfo=now.tzinfo
                        )
                    )
                    if event_when <= now:
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

    async def _async_apply_event(
        self,
        event: ClimateEvent,
        *,
        hvac_mode: str | None = None,
        source: str = "schedule",
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
    ) -> None:
        """Fire an event when the scheduler mode changes."""
        data = {
            "mode": mode,
            "previous_mode": previous_mode,
            "paused_until": paused_until,
            "paused_started_at": self._data["global_"].get("paused_started_at"),
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
        self._async_fire_climate_target_applied_data(
            {
                "entity_id": event.entity_id,
                "action": event.action,
                "temperature": event.temperature,
                "hvac_mode": hvac_mode,
                "weekday": event.weekday,
                "start": event.start,
                "source": source,
            }
        )

    def _async_fire_climate_target_applied_data(self, data: dict) -> None:
        """Fire a target-applied event from arbitrary scheduler data."""
        self._async_fire_event(
            EVENT_TYPE_CLIMATE_TARGET_APPLIED,
            data,
        )

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
                if _is_boost_override(override):
                    await self._async_logbook(
                        self._message(
                            "Boost ended",
                            "Refuerzo finalizado",
                        ),
                        entity_id=entity_id,
                    )
                    self._async_fire_boost_ended(entity_id, override)
                elif _is_pause_override(override):
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


def _event_has_explicit_target(event: ClimateEvent) -> bool:
    """Return whether a current event should replace an expired boost."""
    return event.action == ACTION_TURN_OFF or event.hvac_mode is not None


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
