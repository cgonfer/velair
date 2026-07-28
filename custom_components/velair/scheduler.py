"""Event-driven climate scheduler."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, time, timedelta
import logging
import math
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
    ATTR_FAN_MODE,
    ATTR_HUMIDITY,
    ATTR_PRESET_MODE,
    ATTR_SWING_HORIZONTAL_MODE,
    ATTR_SWING_MODE,
    DOMAIN,
    EVENT_TYPE_BOOST_ENDED,
    EVENT_TYPE_BOOST_STARTED,
    EVENT_TYPE_CLIMATE_TARGET_APPLIED,
    EVENT_TYPE_COMFORT_ASSESSMENT_CHANGED,
    EVENT_TYPE_PRECONDITIONING_OBSERVATION_RECORDED,
    EVENT_TYPE_PRECONDITIONING_PLAN_CANCELLED,
    EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED,
    EVENT_TYPE_PROFILE_CHANGED,
    EVENT_TYPE_ROOM_SENSOR_ASSIST_RESTORED,
    EVENT_TYPE_ROOM_SENSOR_ASSIST_STATE_CHANGED,
    EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED,
    EVENT_TYPE_SCHEDULER_MODE_CHANGED,
    EVENT_TYPE_ZONE_PAUSED,
    EVENT_TYPE_ZONE_RESUMED,
    EVENT_VELAIR,
    MODE_AUTO,
    MODE_PAUSED,
    MAX_PROFILE_DESCRIPTION_LENGTH,
    NAME,
    SIGNAL_SCHEDULER_UPDATED,
    ZONE_PAUSE_ACTION_NONE,
    ZONE_PAUSE_ACTION_TURN_OFF,
)
from .models import (
    ClimateEvent,
    ClimateProfileData,
    ClimateProfileZoneData,
    ComfortData,
    DEFAULT_SCHEDULE_TEMPLATES_VERSION,
    PanelSettingsData,
    VelairModeData,
    PreconditioningData,
    PreconditioningPrediction,
    PreconditioningPredictionDiagnostics,
    PreconditioningLearningData,
    PreconditioningObservation,
    ScheduleBlock,
    ScheduleTemplateData,
    SchedulerData,
    ZoneOverride,
    ZoneData,
    WEEKDAYS,
    climate_options_from_block,
    empty_preconditioning_learning_data,
    is_valid_climate_profile_color,
    normalize_panel_settings,
    normalize_modes,
    validate_climate_profiles,
    validate_modes,
    normalize_comfort_data,
    normalize_preconditioning_data,
    preconditioning_observations_for_direction,
    predict_preconditioning_lead,
    trim_preconditioning_observations,
)
from .temperature import (
    CELSIUS,
    FAHRENHEIT,
    absolute_temperature,
    state_temperature_unit,
    temperature_delta,
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


@dataclass(frozen=True, slots=True)
class _RoomSensorAssistState:
    """Runtime-only state for one assisted climate target."""

    entity_id: str
    target_temperature: float
    applied_temperature: float
    direction: str
    hvac_mode: str | None
    room_temperature_entity_id: str
    weekday: str | None
    start: str | None


@dataclass(frozen=True, slots=True)
class _AppliedPreconditioningTarget:
    """Runtime-only marker for an already applied early-start target."""

    active_from: datetime
    target_when: datetime


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
        self._unsub_room_sensor_assist_listener: CALLBACK_TYPE | None = None
        self._unsub_room_sensor_assist_timer: CALLBACK_TYPE | None = None
        self._unsub_comfort_listener: CALLBACK_TYPE | None = None
        self._applied_preconditioning_targets: dict[
            str,
            _AppliedPreconditioningTarget,
        ] = {}
        self._preconditioning_sessions: dict[str, _PreconditioningSession] = {}
        self._preconditioning_replan_entities: tuple[str, ...] = ()
        self._preconditioning_replan_temperatures: dict[str, float] = {}
        self._preconditioning_plan_snapshots: dict[str, tuple] = {}
        self._room_sensor_assist_states: dict[str, _RoomSensorAssistState] = {}
        self._room_sensor_assist_entities: tuple[str, ...] = ()
        self._comfort_entities: tuple[str, ...] = ()
        self._comfort_assessment_snapshots: dict[str, tuple[object, ...]] = {}
        self.next_event: ClimateEvent | None = None
        self.next_events: list[ClimateEvent] = []
        self.next_events_by_zone: list[ClimateEvent] = []
        self._next_event_by_entity: dict[str, ClimateEvent] = {}
        self._temperature_migration_blocked = False
        self._profile_mutation_lock = asyncio.Lock()

    @property
    def mode(self) -> str:
        """Return the current scheduler mode."""
        return self._data["global_"]["mode"]

    @property
    def temperature_migration_blocked(self) -> bool:
        """Return whether temperature migration blocks scheduler operations."""
        return self._temperature_migration_blocked

    async def async_start(self, *, apply_current_schedule: bool = False) -> None:
        """Start scheduling events."""
        if self._temperature_migration_blocked:
            self.async_schedule_next_event()
            return
        self.async_schedule_next_event()
        if apply_current_schedule and self.mode == MODE_AUTO:
            await self.async_apply_current_schedule(source="startup")

    async def async_stop(self) -> None:
        """Stop scheduling events."""
        await self._async_clear_room_sensor_assist(restore=True, reason="scheduler_stopped")
        self._clear_timer()
        self._clear_preconditioning_sessions()
        self._clear_preconditioning_replan_listener()
        self._clear_preconditioning_replan_timer()
        self._clear_room_sensor_assist_listener()
        self._clear_room_sensor_assist_timer()
        self._clear_comfort_listener()
        self._preconditioning_plan_snapshots.clear()

    def handle_temperature_unit_change(self) -> None:
        """Discard unit-bound runtime caches and rebuild scheduler projections."""
        self._clear_timer()
        self._clear_preconditioning_sessions()
        self._clear_preconditioning_replan_listener()
        self._clear_preconditioning_replan_timer()
        self._applied_preconditioning_targets.clear()
        # Active assist states are recovery records while a unit operation is
        # blocked. Restore them explicitly after persistence succeeds.
        self._clear_room_sensor_assist_listener()
        self._clear_room_sensor_assist_timer()
        self._clear_comfort_listener()
        self._preconditioning_plan_snapshots.clear()
        self.async_schedule_next_event()
        for entity_id in self._room_sensor_assist_candidate_climates():
            self._hass.async_create_task(
                self._async_refresh_room_sensor_assist_from_current_event(entity_id)
            )

    async def async_apply_current_schedule(
        self,
        entity_id: str | None = None,
        *,
        hvac_mode: str | None = None,
        source: str = "current_schedule",
    ) -> None:
        """Apply the effective profile behavior or last schedule block now."""
        if self._temperature_migration_blocked:
            return
        now = dt_util.now()
        target_entities = (
            [entity_id] if entity_id is not None else list(self._data["zones"])
        )
        current_events = {
            event.entity_id: event
            for event in self._iter_current_events(now, entity_id)
        }
        for target_entity_id in target_entities:
            zone = self._data["zones"].get(target_entity_id)
            if zone is None or not zone["enabled"]:
                continue
            if self._is_zone_override_active(target_entity_id, now):
                continue

            behavior = self._profile_zone_behavior(target_entity_id)
            if behavior["behavior"] == "pause":
                if behavior.get("action") == ZONE_PAUSE_ACTION_TURN_OFF:
                    await self._climate_manager.async_turn_off(target_entity_id)
                    self._async_fire_climate_target_applied_data(
                        {
                            "entity_id": target_entity_id,
                            "action": ACTION_TURN_OFF,
                            "temperature": None,
                            "hvac_mode": None,
                            "weekday": None,
                            "start": None,
                            "source": source,
                        }
                    )
                continue

            event = current_events.get(target_entity_id)
            if event is None:
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
        fan_mode: str | None = None,
        hvac_mode: str | None = None,
        humidity: float | None = None,
        log_action: bool = True,
        preset_mode: str | None = None,
        swing_mode: str | None = None,
        swing_horizontal_mode: str | None = None,
        event_source: str | None = None,
    ) -> None:
        """Apply a manual temperature."""
        if self._temperature_migration_blocked:
            raise ValueError("Temperature migration must be resolved before changing targets")
        temperature = self.normalize_target_temperature(entity_id, temperature)
        climate_options = self._climate_options_for_entity(
            entity_id,
            _climate_options(
                fan_mode=fan_mode,
                humidity=humidity,
                preset_mode=preset_mode,
                swing_mode=swing_mode,
                swing_horizontal_mode=swing_horizontal_mode,
            ),
        )
        await self._async_clear_room_sensor_assist(
            entity_id,
            restore=False,
            reason="manual_target",
        )
        if self._temperature_migration_blocked:
            raise ValueError("Temperature migration must be resolved before changing targets")
        await self._climate_manager.async_set_temperature(
            entity_id,
            temperature,
            ensure_on=ensure_on,
            hvac_mode=hvac_mode,
            **climate_options,
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
                    **climate_options,
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
        if self._temperature_migration_blocked:
            raise ValueError(
                "Temperature migration is required before changing scheduler mode"
            )
        previous_mode = self._data["global_"]["mode"]
        previous_paused_until = self._data["global_"].get("paused_until")
        if mode != MODE_AUTO:
            self._clear_preconditioning_sessions()
            await self._async_clear_room_sensor_assist(
                restore=True,
                reason="scheduler_mode_changed",
            )
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
                **_climate_options_from_mapping(override),
            )
        if _is_pause_override(override):
            return None

        events = self._iter_current_events(dt_util.now(), entity_id)
        return events[0] if events else None

    @property
    def active_profile_ids(self) -> list[str]:
        """Return the stable keys of all active profiles."""
        return list(self._data["global_"].get("active_profile_ids", []))

    @property
    def active_mode_id(self) -> str | None:
        """Return the selected custom mode key, if any."""
        return self._data["global_"].get("active_mode_id")

    def get_profiles(self) -> list[ClimateProfileData]:
        """Return a detached profile list for API consumers."""
        return deepcopy(self._data.get("profiles", []))

    def get_modes(self) -> list[VelairModeData]:
        """Return detached custom modes for API and entity consumers."""
        return deepcopy(self._data.get("modes", []))

    def _profile_by_id(self, profile_id: str | None) -> ClimateProfileData | None:
        if profile_id is None:
            return None
        return next(
            (profile for profile in self._data.get("profiles", []) if profile["key"] == profile_id),
            None,
        )

    def _active_profiles(self) -> list[ClimateProfileData]:
        """Return active profiles in their persisted activation order."""
        profiles_by_id = {
            profile["key"]: profile
            for profile in self._data.get("profiles", [])
        }
        return [
            profiles_by_id[profile_id]
            for profile_id in self.active_profile_ids
            if profile_id in profiles_by_id
        ]

    def _active_profile_for_zone(
        self, entity_id: str
    ) -> ClimateProfileData | None:
        """Resolve the single active profile that explicitly owns a zone."""
        return next(
            (
                profile
                for profile in self._active_profiles()
                if entity_id in profile["zones"]
            ),
            None,
        )

    def _profile_zone_behavior(
        self,
        entity_id: str,
    ) -> ClimateProfileZoneData:
        """Resolve sparse profile behavior; omitted zones use the default schedule."""
        profile = self._active_profile_for_zone(entity_id)
        if profile is None:
            return {"behavior": "normal"}
        return profile["zones"].get(entity_id, {"behavior": "normal"})

    def _effective_schedule(
        self, entity_id: str, zone: ZoneData
    ) -> dict[str, list[ScheduleBlock]] | None:
        behavior = self._profile_zone_behavior(entity_id)
        if behavior["behavior"] == "pause":
            return None
        if behavior["behavior"] == "schedule":
            return behavior.get("schedule")
        return zone["schedule"]

    def get_active_target_event(self, entity_id: str) -> ClimateEvent | None:
        """Return the target Velair is actively managing for one climate."""
        return self._room_sensor_assist_target_event(entity_id)

    def get_active_overrides(self) -> dict[str, dict]:
        """Return active zone overrides keyed by entity ID."""
        now = dt_util.now()
        return {
            entity_id: override
            for entity_id in self._data["zones"]
            if (override := self._get_active_zone_override(entity_id, now)) is not None
            and _is_boost_override(override)
        }

    def get_zone_override_status(self, entity_id: str) -> dict[str, object]:
        """Return the current override state for one managed zone."""
        zone = self._data["zones"].get(entity_id)
        if zone is None or not zone["enabled"]:
            return {"state": "disabled"}

        override = self._get_active_zone_override(entity_id, dt_util.now())
        if _is_boost_override(override):
            state = "boost"
        elif _is_pause_override(override):
            state = "paused"
        else:
            return {"state": "none"}

        return {
            "state": state,
            "started_at": override.get("started_at"),
            "until": override.get("until"),
            "action": override.get("action"),
        }

    def get_operational_status(self) -> str:
        """Return a human-readable operational status."""
        if self._temperature_migration_blocked:
            return "temperature_migration_required"
        if self.mode != MODE_AUTO:
            return self.mode

        if self.get_active_overrides():
            return "override_active"

        if self.next_event is not None:
            return "scheduled"

        return "idle"

    def get_room_sensor_assist_statuses(self) -> dict[str, dict[str, object]]:
        """Return runtime Room Sensor Assist status for every managed zone."""
        return {
            entity_id: self.get_room_sensor_assist_status(entity_id)
            for entity_id in self._data["zones"]
        }

    def get_room_sensor_assist_status(self, entity_id: str) -> dict[str, object]:
        """Return the Room Sensor Assist runtime status for one zone."""
        return self._room_sensor_assist_status(entity_id)

    def get_comfort_assessments(self) -> dict[str, dict[str, object]]:
        """Return the local comfort assessment for every managed zone."""
        return {
            entity_id: self.get_comfort_assessment(entity_id)
            for entity_id in self._data["zones"]
        }

    def get_comfort_assessment(self, entity_id: str) -> dict[str, object]:
        """Return the environmental comfort assessment for one zone."""
        return self._comfort_assessment(entity_id)

    def get_zone_runtime_statuses(self) -> dict[str, dict[str, object]]:
        """Return a non-persisted, authoritative overview projection per zone."""
        return {
            entity_id: self._zone_runtime_status(entity_id)
            for entity_id in self._data["zones"]
        }

    def _zone_runtime_status(self, entity_id: str) -> dict[str, object]:
        """Project the current scheduler intent and effective climate target."""
        now = dt_util.now()
        zone = self._data["zones"][entity_id]
        override = self._get_active_zone_override(entity_id, now)
        assist = self._room_sensor_assist_status(entity_id)
        target_event = self.get_active_target_event(entity_id)
        current_event = self._iter_current_events(now, entity_id)
        scheduled_event = current_event[0] if current_event else None
        event = target_event or scheduled_event

        if not zone["enabled"] or self.mode not in (MODE_AUTO, MODE_PAUSED):
            state = "stopped"
        elif self.mode == MODE_PAUSED or _is_pause_override(override):
            state = "paused"
        elif _is_boost_override(override):
            state = "boost"
        elif event is not None and event.target_when is not None and event.target_when > now:
            state = "preconditioning"
        elif scheduled_event is not None:
            state = "scheduled"
        else:
            state = "idle"

        climate_state = self._hass.states.get(entity_id)
        reported_target_temperature = self._climate_target_temperature(entity_id)
        target_temperature = (
            event.temperature if event is not None else reported_target_temperature
        )
        if _is_boost_override(override):
            target_temperature = float(override["temperature"])
        applied_temperature = assist.get("applied_temperature")
        if not isinstance(applied_temperature, int | float):
            applied_temperature = reported_target_temperature
        room_temperature = self._current_temperature(entity_id)

        result: dict[str, object] = {
            "state": state,
            "room_temperature": room_temperature,
            "target_temperature": target_temperature,
            "applied_temperature": applied_temperature,
            "hvac_mode": self._current_hvac_mode(entity_id),
        }
        if event is not None:
            result["target_when"] = event.target_when.isoformat() if event.target_when else None
            result["active_from"] = event.when.isoformat()
        if override is not None:
            result["until"] = override.get("until")
        elif self.mode == MODE_PAUSED:
            result["until"] = self._data["global_"].get("paused_until")
        return result

    def get_next_event_for_zone(self, entity_id: str) -> ClimateEvent | None:
        """Return the cached next event for one managed zone."""
        return self._next_event_by_entity.get(entity_id)

    def get_temperature_limits(self, entity_id: str) -> tuple[float, float]:
        """Return the target temperature range for one managed climate."""
        self.ensure_managed_entity(entity_id)
        return self._climate_manager.temperature_limits(entity_id)

    def _normalize_preconditioning_for_entity(
        self, entity_id: str, raw_data: object
    ) -> PreconditioningData:
        """Normalize thermal tuning directly in the active runtime unit."""
        unit_getter = getattr(self._climate_manager, "temperature_unit", None)
        unit = unit_getter(entity_id) if callable(unit_getter) else CELSIUS
        source = dict(raw_data) if isinstance(raw_data, dict) else {}
        normalized = normalize_preconditioning_data(source)
        defaults = (1.0, 4.0, 14.0) if unit == FAHRENHEIT else (0.3, 2.0, 25.0)

        def direct_float(key: str, default: float, minimum: float, maximum: float) -> float:
            try:
                value = float(source[key])
            except (KeyError, TypeError, ValueError):
                return default
            return value if math.isfinite(value) and minimum <= value <= maximum else default

        minimum_delta_limits = (0.0, 9.0) if unit == FAHRENHEIT else (0.0, 5.0)
        normalized["minimum_delta_temperature"] = direct_float(
            "minimum_delta_temperature", defaults[0], *minimum_delta_limits
        )
        normalized["room_sensor_assist_max_delta"] = direct_float(
            "room_sensor_assist_max_delta",
            defaults[1],
            0.1,
            18.0 if unit == FAHRENHEIT else 10.0,
        )
        rate_limits = (0.6, 66.7) if unit == FAHRENHEIT else (1.0, 120.0)
        normalized["fallback_minutes_per_degree"] = direct_float(
            "fallback_minutes_per_degree", defaults[2], *rate_limits
        )
        return normalized

    def _validate_preconditioning_update(
        self, entity_id: str, preconditioning: dict
    ) -> None:
        """Reject explicitly supplied thermal tuning outside runtime-unit bounds."""
        unit_getter = getattr(self._climate_manager, "temperature_unit", None)
        unit = unit_getter(entity_id) if callable(unit_getter) else CELSIUS
        bounds = {
            "minimum_delta_temperature": (
                0.0,
                9.0 if unit == FAHRENHEIT else 5.0,
            ),
            "room_sensor_assist_max_delta": (
                0.1,
                18.0 if unit == FAHRENHEIT else 10.0,
            ),
            "fallback_minutes_per_degree": (
                (0.6, 66.7) if unit == FAHRENHEIT else (1.0, 120.0)
            ),
        }
        for key, (minimum, maximum) in bounds.items():
            if key not in preconditioning:
                continue
            try:
                value = float(preconditioning[key])
            except (TypeError, ValueError) as err:
                raise ValueError(
                    f"{key} must be between {minimum:g} and {maximum:g}"
                ) from err
            if not math.isfinite(value) or value < minimum or value > maximum:
                raise ValueError(
                    f"{key} must be between {minimum:g} and {maximum:g}"
                )

    def _normalize_comfort_for_entity(
        self, entity_id: str, raw_data: object
    ) -> ComfortData:
        """Normalize Comfort data with absolute defaults in the runtime unit."""
        source = dict(raw_data) if isinstance(raw_data, dict) else {}
        normalized = normalize_comfort_data(source)
        unit_getter = getattr(self._climate_manager, "temperature_unit", None)
        unit = unit_getter(entity_id) if callable(unit_getter) else CELSIUS
        defaults = (68.0, 75.0) if unit == FAHRENHEIT else (20.0, 24.0)
        bounds = (-58.0, 212.0) if unit == FAHRENHEIT else (-50.0, 100.0)

        def direct_temperature(key: str, default: float) -> float:
            try:
                value = float(source[key])
            except (KeyError, TypeError, ValueError):
                return default
            return value if math.isfinite(value) and bounds[0] <= value <= bounds[1] else default

        minimum = direct_temperature("temperature_min", defaults[0])
        maximum = direct_temperature("temperature_max", defaults[1])
        if minimum >= maximum:
            minimum, maximum = defaults
        normalized["temperature_min"] = minimum
        normalized["temperature_max"] = maximum
        return normalized

    def get_temperature_step(self, entity_id: str) -> float | None:
        """Return the exact target step published for one managed climate."""
        self.ensure_managed_entity(entity_id)
        if hasattr(self._climate_manager, "temperature_step"):
            step = self._climate_manager.temperature_step(entity_id)
            if isinstance(step, int | float) and math.isfinite(step) and step > 0:
                return float(step)
        return None

    def ensure_temperature_in_limits(self, entity_id: str, temperature: float) -> None:
        """Raise if a temperature is outside a climate entity range."""
        min_temperature, max_temperature = self.get_temperature_limits(entity_id)
        if temperature < min_temperature or temperature > max_temperature:
            raise ValueError(
                f"Temperature must be between {min_temperature:g} and {max_temperature:g}"
            )

    def normalize_target_temperature(
        self, entity_id: str, temperature: float
    ) -> float:
        """Return a target snapped to Home Assistant's zero-anchored step grid."""
        normalizer = getattr(self._climate_manager, "normalize_target_temperature", None)
        if callable(normalizer):
            return float(normalizer(entity_id, temperature))
        minimum, maximum = self.get_temperature_limits(entity_id)
        value = float(temperature)
        step = self.get_temperature_step(entity_id)
        tolerance = step / 2 if step is not None else 0.0
        if not math.isfinite(value) or value < minimum - tolerance or value > maximum + tolerance:
            raise ValueError(
                f"Temperature must be between {minimum:g} and {maximum:g}"
            )
        if step is None:
            return round(max(minimum, min(maximum, value)), 6)
        first = math.ceil((minimum / step) - 0.000001) * step
        last = math.floor((maximum / step) + 0.000001) * step
        if first > last:
            return round(max(minimum, min(maximum, value)), 6)
        bounded = max(first, min(last, value))
        count = math.floor((bounded / step) + 0.5 + 0.000000001)
        return round(max(first, min(last, count * step)), 6)

    def _snap_blocks_for_entity(
        self, entity_id: str, blocks: list[ScheduleBlock]
    ) -> list[ScheduleBlock]:
        """Snap set-temperature blocks when they become entity-bound."""
        snapped: list[ScheduleBlock] = []
        for block in blocks:
            next_block = block.copy()
            if next_block.get("action", ACTION_SET_TEMPERATURE) != ACTION_TURN_OFF:
                next_block["temperature"] = self.normalize_target_temperature(
                    entity_id, float(next_block["temperature"])
                )
            snapped.append(next_block)
        return snapped

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

    def _blocks_for_entity_capabilities(
        self,
        entity_id: str,
        blocks: list[ScheduleBlock],
    ) -> list[ScheduleBlock]:
        """Return blocks with unsupported optional climate settings removed."""
        supported_options = self._supported_climate_options(entity_id)
        if not supported_options:
            return [_block_without_climate_options(block) for block in blocks]

        return [
            _filter_block_climate_options(block, supported_options)
            for block in blocks
        ]

    def _supported_climate_options(self, entity_id: str) -> dict[str, list[str]]:
        """Return supported optional climate settings for one entity."""
        supported = getattr(self._climate_manager, "supported_climate_options", None)
        if not callable(supported):
            return {}
        options = supported(entity_id)
        return options if isinstance(options, dict) else {}

    def _climate_options_for_entity(
        self,
        entity_id: str,
        options: dict[str, object],
    ) -> dict[str, object]:
        """Return only options supported by one entity."""
        supported_options = self._supported_climate_options(entity_id)
        if not supported_options:
            return {}
        return _filter_climate_options(options, supported_options)

    async def async_set_zone_boost(
        self,
        entity_id: str,
        temperature: float,
        until: str,
        hvac_mode: str | None = None,
        *,
        fan_mode: str | None = None,
        humidity: float | None = None,
        preset_mode: str | None = None,
        swing_mode: str | None = None,
        swing_horizontal_mode: str | None = None,
    ) -> None:
        """Set a temporary boost override for one zone."""
        self.ensure_managed_entity(entity_id)
        temperature = self.normalize_target_temperature(entity_id, temperature)
        climate_options = self._climate_options_for_entity(
            entity_id,
            _climate_options(
                fan_mode=fan_mode,
                humidity=humidity,
                preset_mode=preset_mode,
                swing_mode=swing_mode,
                swing_horizontal_mode=swing_horizontal_mode,
            ),
        )
        self._discard_preconditioning_session(entity_id)
        await self._async_clear_room_sensor_assist(
            entity_id,
            restore=True,
            reason="boost_started",
        )
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
            **climate_options,
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
        override.update(climate_options)

        self._data["zones"][entity_id]["override"] = override
        await self._async_save_data()
        self.async_schedule_next_event()
        self._async_fire_boost_started(
            entity_id,
            temperature,
            until,
            hvac_mode=hvac_mode,
            fan_mode=climate_options.get(ATTR_FAN_MODE),
            humidity=climate_options.get(ATTR_HUMIDITY),
            preset_mode=climate_options.get(ATTR_PRESET_MODE),
            started_at=override["started_at"],
            swing_mode=climate_options.get(ATTR_SWING_MODE),
            swing_horizontal_mode=climate_options.get(ATTR_SWING_HORIZONTAL_MODE),
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
        await self._async_clear_room_sensor_assist(
            entity_id,
            restore=action != ZONE_PAUSE_ACTION_TURN_OFF,
            reason="zone_paused",
        )
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
            if self._temperature_migration_blocked:
                return
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
        blocks = self._blocks_for_entity_capabilities(entity_id, blocks)
        self.ensure_blocks_in_temperature_limits(entity_id, blocks)
        blocks = self._snap_blocks_for_entity(entity_id, blocks)
        self._discard_preconditioning_session(entity_id)
        self._clear_applied_preconditioning_targets_for_entity(entity_id)
        await self._async_clear_room_sensor_assist(
            entity_id,
            restore=True,
            reason="schedule_changed",
        )
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
        source_blocks = self._blocks_for_entity_capabilities(entity_id, source_blocks)
        self.ensure_blocks_in_temperature_limits(entity_id, source_blocks)

        for weekday in target_weekdays:
            self._data["zones"][entity_id]["schedule"][weekday] = [
                block.copy() for block in source_blocks
            ]
        self._discard_preconditioning_session(entity_id)
        self._clear_applied_preconditioning_targets_for_entity(entity_id)
        await self._async_clear_room_sensor_assist(
            entity_id,
            restore=True,
            reason="schedule_changed",
        )

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
        self._clear_applied_preconditioning_targets_for_entity(entity_id)
        await self._async_clear_room_sensor_assist(
            entity_id,
            restore=True,
            reason="schedule_cleared",
        )

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
        self._validate_preconditioning_update(entity_id, preconditioning)
        previous_preconditioning = self._normalize_preconditioning_for_entity(
            entity_id,
            self._data["zones"][entity_id].get("preconditioning")
        )
        next_preconditioning = self._normalize_preconditioning_for_entity(
            entity_id,
            {
                **previous_preconditioning,
                **preconditioning,
            }
        )
        self._data["zones"][entity_id]["preconditioning"] = next_preconditioning
        self._clear_applied_preconditioning_targets_for_entity(entity_id)
        self._clear_room_sensor_assist_timer()
        if not next_preconditioning["enabled"]:
            self._discard_preconditioning_session(entity_id)
        if (
            not next_preconditioning["room_sensor_assist_enabled"]
            or not next_preconditioning.get("room_temperature_entity_id")
        ):
            await self._async_clear_room_sensor_assist(
                entity_id,
                restore=True,
                reason="settings_updated",
            )
        await self._async_save_data()
        if (
            previous_preconditioning["room_sensor_assist_enabled"]
            != next_preconditioning["room_sensor_assist_enabled"]
        ):
            self._async_fire_room_sensor_assist_state_changed(
                entity_id,
                previous_enabled=previous_preconditioning[
                    "room_sensor_assist_enabled"
                ],
                config=next_preconditioning,
            )
        self.async_schedule_next_event()
        if (
            next_preconditioning["room_sensor_assist_enabled"]
            and next_preconditioning.get("room_temperature_entity_id")
            and self.mode == MODE_AUTO
            and not self._is_zone_override_active(entity_id, dt_util.now())
        ):
            await self._async_refresh_room_sensor_assist_from_current_event(entity_id)
        return next_preconditioning

    async def async_update_zone_comfort(
        self,
        entity_id: str,
        comfort: dict,
    ) -> ComfortData:
        """Update persisted comfort monitoring settings for one zone."""
        self.ensure_managed_entity(entity_id)
        next_comfort = self._normalize_comfort_for_entity(
            entity_id,
            {
                **self._data["zones"][entity_id].get("comfort", {}),
                **comfort,
            },
        )
        self._data["zones"][entity_id]["comfort"] = next_comfort
        await self._async_save_data()
        self._refresh_comfort_listener()
        self._async_update_comfort_snapshots(fire_events=True)
        self._async_write_state()
        return next_comfort

    async def async_set_room_sensor_assist(
        self,
        entity_id: str,
        enabled: bool,
    ) -> PreconditioningData:
        """Enable or disable Room Sensor Assist for one zone."""
        self.ensure_managed_entity(entity_id)
        current = self._normalize_preconditioning_for_entity(
            entity_id,
            self._data["zones"][entity_id].get("preconditioning")
        )
        if enabled and not current.get("room_temperature_entity_id"):
            raise ValueError(
                "Room Sensor Assist requires a configured room temperature sensor"
            )
        return await self.async_update_zone_preconditioning(
            entity_id,
            {"room_sensor_assist_enabled": enabled},
        )

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
        current = self._normalize_preconditioning_for_entity(
            entity_id,
            self._data["zones"][entity_id].get("preconditioning")
        )
        defaults = self._normalize_preconditioning_for_entity(entity_id, None)
        defaults["enabled"] = current["enabled"]
        defaults["room_temperature_entity_id"] = current["room_temperature_entity_id"]
        defaults["room_sensor_assist_enabled"] = current["room_sensor_assist_enabled"]
        # Room Assist is configured in its own tab and is not reset by the
        # Adaptive Preconditioning restore action.
        defaults["room_sensor_assist_max_delta"] = current[
            "room_sensor_assist_max_delta"
        ]
        defaults["room_sensor_assist_debounce_seconds"] = current[
            "room_sensor_assist_debounce_seconds"
        ]
        self._data["zones"][entity_id]["preconditioning"] = defaults
        self._clear_applied_preconditioning_targets_for_entity(entity_id)
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

    async def async_set_velair_mode(self, mode: dict) -> str:
        """Create or replace one user-named mode."""
        async with self._profile_mutation_lock:
            if not isinstance(mode, dict):
                raise ValueError("Mode must be an object")
            raw_mode = deepcopy(mode)
            key = raw_mode.get("key", uuid4().hex)
            if not isinstance(key, str) or not key.strip():
                raise ValueError("Mode key must be non-empty text")
            key = key.strip()
            raw_mode["key"] = key
            modes = self._data.setdefault("modes", [])
            existing = next((item for item in modes if item["key"] == key), None)
            candidate = [
                raw_mode if item["key"] == key else item for item in modes
            ]
            if existing is None:
                candidate.append(raw_mode)
            validated = validate_modes(
                candidate,
                {
                    profile["key"]: set(profile["zones"])
                    for profile in self._data.get("profiles", [])
                },
            )
            next_mode = next(item for item in validated if item["key"] == key)
            if modes == validated:
                return key
            previous_data = deepcopy(self._data)
            self._data["modes"] = validated
            if (
                existing is not None
                and self.active_mode_id == key
                and existing["profile_ids"] != next_mode["profile_ids"]
            ):
                await self._async_activate_profiles_locked(
                    next_mode["profile_ids"],
                    source="mode_updated",
                    mode_id=key,
                    rollback_data=previous_data,
                )
                return key
            await self._async_save_profile_mutation(previous_data)
            self._async_write_state()
            return next_mode["key"]

    async def async_delete_velair_mode(self, key: str) -> None:
        """Delete one custom mode while retaining its active profile set."""
        async with self._profile_mutation_lock:
            modes = self._data.setdefault("modes", [])
            next_modes = [mode for mode in modes if mode["key"] != key]
            if len(next_modes) == len(modes):
                raise ValueError(f"Unknown mode: {key}")
            previous_data = deepcopy(self._data)
            self._data["modes"] = next_modes
            if self.active_mode_id == key:
                self._data["global_"]["active_mode_id"] = None
            await self._async_save_profile_mutation(previous_data)
            self._async_write_state()

    async def async_select_velair_mode(
        self, key: str, *, source: str = "select"
    ) -> None:
        """Atomically select a custom mode and its mapped climate profile."""
        async with self._profile_mutation_lock:
            mode = next(
                (
                    item
                    for item in self._data.get("modes", [])
                    if item["key"] == key
                ),
                None,
            )
            if mode is None:
                raise ValueError(f"Unknown mode: {key}")
            await self._async_activate_profiles_locked(
                mode["profile_ids"], source=source, mode_id=key
            )

    async def async_clear_velair_mode(self) -> None:
        """Select Manual by clearing only the custom mode marker."""
        async with self._profile_mutation_lock:
            if self.active_mode_id is None:
                return
            previous_data = deepcopy(self._data)
            self._data["global_"]["active_mode_id"] = None
            await self._async_save_profile_mutation(previous_data)
            self._async_write_state()

    async def async_set_profile(self, profile: dict) -> str:
        """Serialize creation and replacement of climate profiles."""
        async with self._profile_mutation_lock:
            return await self._async_set_profile_locked(profile)

    async def _async_set_profile_locked(self, profile: dict) -> str:
        """Create or replace a validated climate profile."""
        raw_profile = deepcopy(profile)
        if "key" in raw_profile:
            key = raw_profile["key"]
            if not isinstance(key, str) or not key.strip():
                raise ValueError("Profile key must be non-empty text")
        else:
            key = uuid4().hex
            raw_profile["key"] = key
        key = key.strip()
        profiles = self._data.setdefault("profiles", [])
        existing = next((item for item in profiles if item["key"] == key), None)
        if "color" in raw_profile and not is_valid_climate_profile_color(raw_profile["color"]):
            raise ValueError("Profile color must use the #RRGGBB format")
        if "color" not in raw_profile and existing is not None:
            raw_profile["color"] = existing["color"]
        old_active = deepcopy(self._active_profiles())
        next_profile = validate_climate_profiles(
            [raw_profile],
            list(self._data["zones"]),
        )[0]
        next_profile["key"] = key
        self._validate_profile(next_profile)
        if existing == next_profile:
            return key
        candidate_profiles = [
            next_profile if item["key"] == key else item
            for item in profiles
        ]
        if existing is None:
            candidate_profiles.append(next_profile)
        validate_modes(
            self._data.get("modes", []),
            {
                item["key"]: set(item["zones"])
                for item in candidate_profiles
            },
        )
        conflicting_active_zones = self._conflicting_profile_zones(
            candidate_profiles,
            self.active_profile_ids,
        )
        if conflicting_active_zones:
            raise ValueError(
                "Active profiles cannot configure the same zone: "
                + ", ".join(sorted(conflicting_active_zones))
            )
        previous_data = deepcopy(self._data)
        self._data["profiles"] = candidate_profiles
        if key in self.active_profile_ids:
            await self._async_apply_profile_transition(
                old_active,
                deepcopy(self._active_profiles()),
                source="profile_updated",
                persist_change=True,
                rollback_data=previous_data,
            )
        else:
            await self._async_save_profile_mutation(previous_data)
            self._async_write_state()
        return key

    async def async_delete_profile(self, key: str) -> None:
        """Serialize deletion of one climate profile."""
        async with self._profile_mutation_lock:
            await self._async_delete_profile_locked(key)

    async def _async_delete_profile_locked(self, key: str) -> None:
        """Delete a profile, returning to Default when it was active."""
        profiles = self._data.setdefault("profiles", [])
        old_profile = next((profile for profile in profiles if profile["key"] == key), None)
        if old_profile is None:
            raise ValueError(f"Unknown climate profile: {key}")
        was_active = key in self.active_profile_ids
        previous_profile_ids = self.active_profile_ids
        previous_active_profiles = deepcopy(self._active_profiles())
        previous_data = deepcopy(self._data)
        self._data["profiles"] = [profile for profile in profiles if profile["key"] != key]
        removed_mode_keys = {
            mode["key"]
            for mode in self._data.get("modes", [])
            if key in mode["profile_ids"]
        }
        self._data["modes"] = [
            mode
            for mode in self._data.get("modes", [])
            if key not in mode["profile_ids"]
        ]
        if self.active_mode_id in removed_mode_keys:
            self._data["global_"]["active_mode_id"] = None
        if was_active:
            self._data["global_"]["active_profile_ids"] = [
                profile_id
                for profile_id in previous_profile_ids
                if profile_id != key
            ]
        if was_active:
            await self._async_apply_profile_transition(
                previous_active_profiles,
                deepcopy(self._active_profiles()),
                source="profile_deleted",
                persist_change=True,
                rollback_data=previous_data,
            )
            self._async_fire_profile_changed(
                self.active_profile_ids,
                previous_profile_ids=previous_profile_ids,
                source="profile_deleted",
            )
        else:
            await self._async_save_profile_mutation(previous_data)
            self._async_write_state()

    async def async_activate_profile(
        self, profile_id: str | None, *, source: str = "service"
    ) -> None:
        """Serialize profile selection and its runtime transition."""
        async with self._profile_mutation_lock:
            await self._async_activate_profiles_locked(
                [profile_id] if isinstance(profile_id, str) and profile_id.strip() else [],
                source=source,
            )

    async def async_deactivate_profile(self, *, source: str = "service") -> None:
        """Return to default schedules through the public profile API."""
        await self.async_activate_profile(None, source=source)

    async def _async_activate_profiles_locked(
        self,
        profile_ids: list[str],
        *,
        source: str,
        mode_id: str | None = None,
        rollback_data: SchedulerData | None = None,
    ) -> None:
        """Activate a conflict-free profile set atomically; empty selects Default."""
        normalized_ids = [
            profile_id.strip()
            for profile_id in profile_ids
            if isinstance(profile_id, str) and profile_id.strip()
        ]
        if len(set(normalized_ids)) != len(normalized_ids):
            raise ValueError("Active profile IDs must be unique")
        if (
            normalized_ids == self.active_profile_ids
            and mode_id == self.active_mode_id
        ):
            return
        next_profiles: list[ClimateProfileData] = []
        claimed_zones: set[str] = set()
        for profile_id in normalized_ids:
            profile = self._profile_by_id(profile_id)
            if profile is None:
                raise ValueError(f"Unknown climate profile: {profile_id}")
            self._validate_profile(profile)
            duplicate_zones = claimed_zones.intersection(profile["zones"])
            if duplicate_zones:
                raise ValueError(
                    "Active profiles cannot configure the same zone: "
                    + ", ".join(sorted(duplicate_zones))
                )
            claimed_zones.update(profile["zones"])
            next_profiles.append(profile)
        previous_ids = self.active_profile_ids
        previous_profiles = deepcopy(self._active_profiles())
        previous_data = (
            deepcopy(self._data) if rollback_data is None else rollback_data
        )
        self._data["global_"]["active_profile_ids"] = normalized_ids
        self._data["global_"]["active_mode_id"] = mode_id
        if normalized_ids == previous_ids:
            await self._async_save_profile_mutation(previous_data)
            self._async_write_state()
            return
        await self._async_apply_profile_transition(
            previous_profiles,
            deepcopy(next_profiles),
            source="profile_activated" if normalized_ids else "profile_deactivated",
            persist_change=True,
            rollback_data=previous_data,
        )
        self._async_fire_profile_changed(
            normalized_ids,
            previous_profile_ids=previous_ids,
            source=source,
        )

    def _validate_profile(self, profile: ClimateProfileData) -> None:
        """Validate and snap every entity-bound schedule in a profile."""
        if not is_valid_climate_profile_color(profile.get("color")):
            raise ValueError("Profile color must use the #RRGGBB format")
        if len(profile.get("description", "")) > MAX_PROFILE_DESCRIPTION_LENGTH:
            raise ValueError(
                "Profile description must be "
                f"{MAX_PROFILE_DESCRIPTION_LENGTH} characters or fewer"
            )
        for entity_id, behavior in profile["zones"].items():
            self.ensure_managed_entity(entity_id)
            if behavior["behavior"] != "schedule":
                continue
            supported_modes = getattr(
                self._climate_manager, "supported_hvac_modes", lambda _entity_id: []
            )(entity_id)
            schedule = behavior.get("schedule")
            if not isinstance(schedule, dict) or set(schedule) != set(WEEKDAYS):
                raise ValueError(f"Profile schedule for {entity_id} must include every weekday")
            for weekday in WEEKDAYS:
                blocks = self._blocks_for_entity_capabilities(entity_id, schedule[weekday])
                self.ensure_blocks_in_temperature_limits(entity_id, blocks)
                for block in blocks:
                    hvac_mode = block.get("hvac_mode")
                    if hvac_mode and supported_modes and hvac_mode not in supported_modes:
                        raise ValueError(
                            f"HVAC mode {hvac_mode} is not supported by {entity_id}"
                        )
                schedule[weekday] = self._snap_blocks_for_entity(entity_id, blocks)

    @staticmethod
    def _conflicting_profile_zones(
        profiles: list[ClimateProfileData],
        profile_ids: list[str],
    ) -> set[str]:
        """Return zones explicitly claimed by more than one selected profile."""
        profiles_by_id = {profile["key"]: profile for profile in profiles}
        claimed_zones: set[str] = set()
        conflicting_zones: set[str] = set()
        for profile_id in profile_ids:
            profile = profiles_by_id.get(profile_id)
            if profile is None:
                continue
            profile_zones = set(profile["zones"])
            conflicting_zones.update(claimed_zones.intersection(profile_zones))
            claimed_zones.update(profile_zones)
        return conflicting_zones

    @staticmethod
    def _profile_effect_from_profiles(
        profiles: list[ClimateProfileData], entity_id: str
    ) -> tuple[str | None, ClimateProfileZoneData]:
        profile = next(
            (profile for profile in profiles if entity_id in profile["zones"]),
            None,
        )
        return (
            (
                profile["key"],
                profile["zones"][entity_id],
            )
            if profile is not None
            else (None, {"behavior": "normal"})
        )

    async def _async_apply_profile_transition(
        self,
        previous_profiles: list[ClimateProfileData],
        next_profiles: list[ClimateProfileData],
        *,
        source: str,
        persist_change: bool = False,
        rollback_data: SchedulerData | None = None,
    ) -> None:
        """Reset affected runtime state and immediately enact effective behavior."""
        affected = {
            entity_id
            for entity_id in self._data["zones"]
            if self._profile_effect_from_profiles(previous_profiles, entity_id)
            != self._profile_effect_from_profiles(next_profiles, entity_id)
        }
        now = dt_util.now()
        cancelled_boosts: list[tuple[str, ZoneOverride]] = []
        for entity_id in affected:
            override = self._data["zones"][entity_id].get("override")
            if _is_boost_override(override):
                self._data["zones"][entity_id]["override"] = None
                cancelled_boosts.append((entity_id, override))
        if affected or persist_change:
            if rollback_data is None:
                await self._async_save_data()
            else:
                await self._async_save_profile_mutation(rollback_data)

        for entity_id in affected:
            self._discard_preconditioning_session(entity_id)
            self._clear_applied_preconditioning_targets_for_entity(entity_id)

        for entity_id, override in cancelled_boosts:
            self._async_fire_boost_ended(
                entity_id,
                override,
                reason="profile_changed",
                restoration={"type": "none"},
            )

        for entity_id in affected:
            behavior = self._profile_zone_behavior(entity_id)
            replacement_follows = (
                behavior["behavior"] == "pause"
                and behavior.get("action") == ZONE_PAUSE_ACTION_TURN_OFF
            ) or bool(self._iter_current_events(now, entity_id))
            try:
                await self._async_clear_room_sensor_assist(
                    entity_id,
                    restore=not replacement_follows,
                    reason="profile_changed",
                )
            except Exception:
                _LOGGER.exception(
                    "Failed to clear Room Assist after profile change for %s",
                    entity_id,
                )

        if self.mode == MODE_AUTO and not self._temperature_migration_blocked:
            for entity_id in affected:
                if self._is_zone_override_active(entity_id, now):
                    continue
                try:
                    behavior = self._profile_zone_behavior(entity_id)
                    if behavior["behavior"] == "pause":
                        if behavior.get("action") == ZONE_PAUSE_ACTION_TURN_OFF:
                            await self._climate_manager.async_turn_off(entity_id)
                            self._async_fire_climate_target_applied_data(
                                {
                                    "entity_id": entity_id,
                                    "action": ACTION_TURN_OFF,
                                    "temperature": None,
                                    "hvac_mode": None,
                                    "weekday": None,
                                    "start": None,
                                    "source": source,
                                }
                            )
                        continue
                    await self.async_apply_current_schedule(entity_id, source=source)
                except Exception:
                    _LOGGER.exception(
                        "Failed to apply profile behavior for %s",
                        entity_id,
                    )
        self.async_schedule_next_event()

    async def _async_save_profile_mutation(self, previous_data: SchedulerData) -> None:
        """Persist a profile mutation, restoring runtime state if storage fails."""
        try:
            await self._async_save_data()
        except Exception:
            self._data.clear()
            self._data.update(previous_data)
            raise

    async def async_replace_portable_data(
        self,
        *,
        zones: dict[str, ZoneData] | None = None,
        templates: list[ScheduleTemplateData] | None = None,
        settings: PanelSettingsData | None = None,
        preconditioning_learning: dict[str, PreconditioningLearningData]
        | None = None,
        profiles: list[ClimateProfileData] | None = None,
        modes: list[VelairModeData] | None = None,
    ) -> None:
        """Serialize portable replacement with profile mutations."""
        async with self._profile_mutation_lock:
            await self._async_replace_portable_data_locked(
                zones=zones,
                templates=templates,
                settings=settings,
                preconditioning_learning=preconditioning_learning,
                profiles=profiles,
                modes=modes,
            )

    async def _async_replace_portable_data_locked(
        self,
        *,
        zones: dict[str, ZoneData] | None = None,
        templates: list[ScheduleTemplateData] | None = None,
        settings: PanelSettingsData | None = None,
        preconditioning_learning: dict[str, PreconditioningLearningData]
        | None = None,
        profiles: list[ClimateProfileData] | None = None,
        modes: list[VelairModeData] | None = None,
    ) -> None:
        """Replace persisted sections from a portable import."""
        if profiles is not None:
            # Validate the complete profile section before mutating any other
            # imported section so a rejected import remains atomic in memory.
            profiles = validate_climate_profiles(
                profiles,
                list((zones if zones is not None else self._data["zones"])),
            )
            for profile in profiles:
                self._validate_profile(profile)
        target_profiles = (
            profiles if profiles is not None else self._data.get("profiles", [])
        )
        target_profile_zones = {
            profile["key"]: set(profile["zones"])
            for profile in target_profiles
        }
        if modes is not None:
            modes = validate_modes(modes, target_profile_zones)
        if profiles is not None:
            retained_active_profile_ids = [
                profile_id
                for profile_id in self.active_profile_ids
                if profile_id in target_profile_zones
            ]
            duplicate_zones = self._conflicting_profile_zones(
                target_profiles,
                retained_active_profile_ids,
            )
            if duplicate_zones:
                raise ValueError(
                    "Imported profiles would make the active set configure "
                    "the same zone: " + ", ".join(sorted(duplicate_zones))
                )
        previous_data = deepcopy(self._data)
        previous_profile_ids = self.active_profile_ids
        previous_active_profiles = deepcopy(self._active_profiles())
        if zones is not None:
            self._clear_preconditioning_sessions()
            self._applied_preconditioning_targets.clear()
            self._comfort_assessment_snapshots.clear()
            if not self._temperature_migration_blocked:
                await self._async_clear_room_sensor_assist(
                    restore=True,
                    reason="portable_import",
                )
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
        if profiles is not None:
            self._data["profiles"] = profiles
            imported_profile_ids = {profile["key"] for profile in profiles}
            if modes is None:
                self._data["modes"] = normalize_modes(
                    self._data.get("modes", []),
                    {
                        profile["key"]: set(profile["zones"])
                        for profile in profiles
                    },
                )
            # Portable data deliberately never selects new profiles. Retain
            # only active definitions that still exist after replacement.
            self._data["global_"]["active_profile_ids"] = [
                profile_id
                for profile_id in self.active_profile_ids
                if profile_id in imported_profile_ids
            ]
        if modes is not None:
            self._data["modes"] = modes
        if profiles is not None or modes is not None:
            selected_mode = next(
                (
                    mode
                    for mode in self._data.get("modes", [])
                    if mode["key"] == self.active_mode_id
                ),
                None,
            )
            if (
                selected_mode is None
                or selected_mode["profile_ids"] != self.active_profile_ids
            ):
                self._data["global_"]["active_mode_id"] = None
        if profiles is not None:
            next_active_profiles = deepcopy(self._active_profiles())
            await self._async_apply_profile_transition(
                previous_active_profiles,
                next_active_profiles,
                source="portable_import",
                persist_change=True,
                rollback_data=previous_data,
            )
            if previous_profile_ids != self.active_profile_ids:
                self._async_fire_profile_changed(
                    self.active_profile_ids,
                    previous_profile_ids=previous_profile_ids,
                    source="portable_import",
                )
            return

        if modes is not None:
            await self._async_save_profile_mutation(previous_data)
            self._async_write_state()
            return

        await self._async_save_data()
        self.async_schedule_next_event()

    async def async_reset_data(self, data: SchedulerData) -> None:
        """Replace all persisted scheduler data with a fresh default model."""
        await self.async_prepare_data_reset()
        self._data.clear()
        self._data.update(data)
        await self._async_save_data()
        self.async_schedule_next_event()

    async def async_prepare_data_reset(self) -> None:
        """Clear runtime-only state before storage-owned reset replacement."""
        self._clear_preconditioning_sessions()
        self._applied_preconditioning_targets.clear()
        self._comfort_assessment_snapshots.clear()
        if not self._temperature_migration_blocked:
            await self._async_clear_room_sensor_assist(
                restore=True, reason="data_reset"
            )

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
        if self._temperature_migration_blocked:
            self._clear_preconditioning_sessions()
            self._clear_preconditioning_replan_listener()
            self._clear_preconditioning_replan_timer()
            self._clear_room_sensor_assist_listener()
            self._clear_room_sensor_assist_timer()
            self._clear_comfort_listener()
            self.next_events_by_zone = []
            self._next_event_by_entity = {}
            self.next_events = []
            self.next_event = None
            self._async_write_state()
            return
        now = dt_util.now()
        self._refresh_preconditioning_replan_listener()

        if self.mode == MODE_AUTO:
            zone_events = self.calculate_next_events_by_zone(now)
            self.next_events_by_zone = zone_events
            self._next_event_by_entity = {
                event.entity_id: event
                for event in zone_events
            }
            next_time = min((event.when for event in zone_events), default=None)
            self.next_events = (
                [event for event in zone_events if event.when == next_time]
                if next_time is not None
                else []
            )
            self.next_event = self.next_events[0] if self.next_events else None
            self._async_update_preconditioning_plans(zone_events)
        else:
            self.next_events_by_zone = []
            self._next_event_by_entity = {}
            self.next_events = []
            self.next_event = None
            self._async_cancel_preconditioning_plans(reason="scheduler_not_auto")
        next_action = self._calculate_next_action_time(now)
        self._refresh_room_sensor_assist_listener()
        self._refresh_comfort_listener()
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
        if self._temperature_migration_blocked:
            return
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
                and not self._is_applied_preconditioning_event(event)
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
        restoration, scheduled_event = self._resolve_ended_zone_boost_restoration(
            entity_id,
            override,
            now,
        )
        self._async_fire_boost_ended(
            entity_id,
            override,
            reason=reason,
            restoration=restoration,
        )
        await self._async_apply_ended_zone_boost(
            entity_id,
            override,
            scheduled_event=scheduled_event,
        )

    def _resolve_ended_zone_boost_restoration(
        self,
        entity_id: str,
        override: ZoneOverride,
        now: datetime,
    ) -> tuple[dict[str, object], ClimateEvent | None]:
        """Resolve what Velair will apply after a boost ends."""
        if self.mode == MODE_AUTO:
            events = self._iter_current_events(now, entity_id)
            event = events[0] if events else None
            if event is not None and _event_has_explicit_target(event):
                return (
                    {
                        "type": "schedule",
                        "source": "boost_ended",
                        "target": {
                            "action": event.action,
                            "temperature": event.temperature,
                            "hvac_mode": event.hvac_mode,
                            **_climate_options_from_event(event),
                            "weekday": event.weekday,
                            "start": event.start,
                        },
                    },
                    event,
                )

        previous_state = override.get("previous_state")
        if isinstance(previous_state, dict) and previous_state:
            return (
                {
                    "type": "previous_state",
                    "state": dict(previous_state),
                },
                None,
            )
        return ({"type": "none"}, None)

    async def _async_apply_ended_zone_boost(
        self,
        entity_id: str,
        override: ZoneOverride,
        *,
        scheduled_event: ClimateEvent | None,
    ) -> None:
        """Apply the correct target after one temporary zone override ends."""
        if scheduled_event is not None:
            await self._async_apply_event(scheduled_event, source="boost_ended")
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

                schedule = self._effective_schedule(entity_id, zone)
                if schedule is None:
                    continue

                for block in schedule[weekday]:
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

                    event_when, preconditioning_diagnostics = (
                        self._preconditioned_event_details(
                            entity_id,
                            zone,
                            block,
                            target_when,
                        )
                    )
                    target_when_for_event = (
                        target_when if event_when != target_when else None
                    )
                    events.append(
                        ClimateEvent(
                            entity_id=entity_id,
                            when=event_when,
                            temperature=_event_temperature(block),
                            weekday=weekday,
                            start=block["start"],
                            action=block.get("action", ACTION_SET_TEMPERATURE),
                            hvac_mode=block.get("hvac_mode"),
                            **_event_climate_options(block),
                            target_when=target_when_for_event,
                            preconditioning_diagnostics=(
                                preconditioning_diagnostics
                                if target_when_for_event is not None
                                else None
                            ),
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

            schedule = self._effective_schedule(entity_id, zone)
            if schedule is None:
                continue

            candidate: ClimateEvent | None = None
            weekday = WEEKDAYS[today.weekday()]
            for block in schedule[weekday]:
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
                    **_event_climate_options(block),
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
        ] = _AppliedPreconditioningTarget(
            active_from=event.when,
            target_when=event.target_when,
        )

    def _clear_applied_preconditioning_targets(self, now: datetime) -> None:
        """Forget applied preconditioning targets after their comfort time."""
        expired_keys = [
            key
            for key, marker in self._applied_preconditioning_targets.items()
            if marker.target_when <= now
        ]
        for key in expired_keys:
            self._applied_preconditioning_targets.pop(key, None)

    def _clear_applied_preconditioning_targets_for_entity(self, entity_id: str) -> None:
        """Forget applied early-start markers for one zone after schedule changes."""
        key_prefix = f"{entity_id}|"
        for key in list(self._applied_preconditioning_targets):
            if key.startswith(key_prefix):
                self._applied_preconditioning_targets.pop(key, None)

    def _is_applied_preconditioning_event(self, event: ClimateEvent) -> bool:
        """Return whether an early-start event already applied its target."""
        return (
            event.target_when is not None
            and self._preconditioning_event_key(
                event.entity_id,
                event.weekday,
                event.start,
                event.target_when,
            )
            in self._applied_preconditioning_targets
        )

    def _preconditioned_event_when(
        self,
        entity_id: str,
        zone: ZoneData,
        block: ScheduleBlock,
        target_when: datetime,
    ) -> datetime:
        """Return the apply time for a scheduled block."""
        event_when, _diagnostics = self._preconditioned_event_details(
            entity_id,
            zone,
            block,
            target_when,
        )
        return event_when

    def _preconditioned_event_details(
        self,
        entity_id: str,
        zone: ZoneData,
        block: ScheduleBlock,
        target_when: datetime,
    ) -> tuple[datetime, PreconditioningPredictionDiagnostics | None]:
        """Return the apply time and prediction diagnostics for a scheduled block."""
        config = normalize_preconditioning_data(zone.get("preconditioning"))
        if not config["enabled"]:
            return target_when, None
        if block.get("action", ACTION_SET_TEMPERATURE) == ACTION_TURN_OFF:
            return target_when, None
        if "temperature" not in block:
            return target_when, None

        direction = self._preconditioning_direction(entity_id, config, block)
        if direction is None:
            return target_when, None

        prediction = self._adaptive_preconditioning_prediction(
            entity_id,
            config,
            block,
            direction,
        )
        lead_minutes = (
            prediction["recommended_lead_minutes"] if prediction is not None else 0
        )
        if lead_minutes <= 0:
            return target_when, None

        return (
            target_when - timedelta(minutes=lead_minutes),
            prediction["diagnostics"] if prediction is not None else None,
        )

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
        prediction = self._adaptive_preconditioning_prediction(
            entity_id,
            config,
            block,
            direction,
        )
        return prediction["recommended_lead_minutes"] if prediction is not None else None

    def _adaptive_preconditioning_prediction(
        self,
        entity_id: str,
        config: PreconditioningData,
        block: ScheduleBlock,
        direction: str,
    ) -> PreconditioningPrediction | None:
        """Return adaptive prediction data for one direction."""
        target_temperature = _event_temperature(block)
        current_temperature = self._current_temperature(entity_id)
        if target_temperature is None or current_temperature is None:
            return None
        learning = self._data.get("preconditioning_learning", {}).get(entity_id, {})
        raw_observations = preconditioning_observations_for_direction(
            learning,
            direction,
        )

        return predict_preconditioning_lead(
            raw_observations,
            direction,
            target_temp=target_temperature,
            current_temp=current_temperature,
            config=config,
            now=dt_util.now(),
            outdoor_temp_target=self._outdoor_temperature(entity_id, config),
            temperature_delta_scale=self._preconditioning_temperature_delta_scale(
                entity_id
            ),
        )

    def _preconditioning_temperature_delta_scale(self, entity_id: str) -> float:
        """Return the scale that expresses runtime deltas as Celsius deltas."""
        unit_getter = getattr(self._climate_manager, "temperature_unit", None)
        unit = unit_getter(entity_id) if callable(unit_getter) else CELSIUS
        return 5 / 9 if unit == FAHRENHEIT else 1.0

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
        """Return the effective room temperature for one climate entity."""
        zone = self._data["zones"].get(entity_id)
        if zone is None:
            return self._climate_current_temperature(entity_id)
        config = normalize_preconditioning_data(zone.get("preconditioning"))
        room_entity_id = self._effective_room_temperature_entity_id(config)
        if room_entity_id:
            return self._external_temperature(entity_id, room_entity_id)
        return self._climate_current_temperature(entity_id)

    def _climate_current_temperature(self, entity_id: str) -> float | None:
        """Return the current measured temperature reported by the climate entity."""
        return _state_temperature(self._hass.states.get(entity_id))

    def _climate_target_temperature(self, entity_id: str) -> float | None:
        """Return a valid target exactly as reported by Home Assistant."""
        temperature = _state_target_temperature(self._hass.states.get(entity_id))
        if temperature is None:
            return None
        minimum, maximum = self.get_temperature_limits(entity_id)
        if minimum <= temperature <= maximum:
            return temperature
        _LOGGER.debug(
            "Ignoring target temperature reported by %s outside its supported "
            "range: %s (expected %s..%s)",
            entity_id,
            temperature,
            minimum,
            maximum,
        )
        return None

    def _temperature_source_entity_id(self, entity_id: str) -> str:
        """Return the entity whose state represents room temperature for a zone."""
        zone = self._data["zones"].get(entity_id)
        if zone is None:
            return entity_id
        config = normalize_preconditioning_data(zone.get("preconditioning"))
        return self._effective_room_temperature_entity_id(config) or entity_id

    def _temperature_source_label(self, entity_id: str) -> str:
        """Return the source name used for stored observations and events."""
        return (
            "room_sensor"
            if self._temperature_source_entity_id(entity_id) != entity_id
            else "climate"
        )

    def _effective_room_temperature_entity_id(
        self,
        config: PreconditioningData,
    ) -> str | None:
        """Return the configured room sensor only when Room Sensor Assist is active."""
        if not config["room_sensor_assist_enabled"]:
            return None
        return config.get("room_temperature_entity_id")

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
        return self._external_temperature(entity_id, outdoor_entity_id)

    def _external_temperature(
        self,
        climate_entity_id: str,
        sensor_entity_id: str,
        *,
        state=None,
    ) -> float | None:
        """Return an external reading converted to the climate temperature unit."""
        if state is None:
            state = self._hass.states.get(sensor_entity_id)
        value = _state_numeric_temperature(state)
        if value is None:
            return None
        unit_getter = getattr(self._climate_manager, "temperature_unit", None)
        climate_unit = unit_getter(climate_entity_id) if unit_getter else state_temperature_unit(state, "°C")
        source_unit = state_temperature_unit(state, climate_unit)
        return round(absolute_temperature(value, source_unit, climate_unit), 6)

    def _temperature_from_source_state(
        self,
        climate_entity_id: str,
        source_entity_id: str,
        state,
    ) -> float | None:
        """Read a climate value directly or convert a distinct sensor value."""
        if source_entity_id == climate_entity_id:
            return _state_temperature(state)
        return self._external_temperature(
            climate_entity_id,
            source_entity_id,
            state=state,
        )

    async def _async_apply_event(
        self,
        event: ClimateEvent,
        *,
        hvac_mode: str | None = None,
        source: str = "schedule",
        applied_at: datetime | None = None,
    ) -> None:
        """Apply one resolved schedule event."""
        if self._temperature_migration_blocked:
            return
        if event.action == ACTION_TURN_OFF:
            await self._async_clear_room_sensor_assist(
                event.entity_id,
                restore=False,
                reason="turn_off",
            )
            if self._temperature_migration_blocked:
                return
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
        if self._temperature_migration_blocked:
            return
        await self._climate_manager.async_set_temperature(
            event.entity_id,
            event.temperature,
            ensure_on=True,
            fan_mode=event.fan_mode,
            hvac_mode=target_mode,
            humidity=event.humidity,
            preset_mode=event.preset_mode,
            swing_mode=event.swing_mode,
            swing_horizontal_mode=event.swing_horizontal_mode,
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
        await self._async_refresh_room_sensor_assist(
            event.entity_id,
            target_temperature=event.temperature,
            hvac_mode=target_mode or event.hvac_mode,
            weekday=event.weekday,
            start=event.start,
            reason=source,
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

        source_entity_ids = sorted(
            {
                self._temperature_source_entity_id(entity_id)
                for entity_id in self._preconditioning_sessions
            }
        )
        self._unsub_preconditioning_listener = async_track_state_change_event(
            self._hass,
            source_entity_ids,
            self._handle_preconditioning_state_change,
        )

    @callback
    def _handle_preconditioning_state_change(self, event) -> None:
        """Handle a Home Assistant state change for a learning session."""
        source_entity_id = event.data.get("entity_id")
        new_state = event.data.get("new_state")
        if not isinstance(source_entity_id, str):
            return

        for entity_id in list(self._preconditioning_sessions):
            if self._temperature_source_entity_id(entity_id) != source_entity_id:
                continue
            temperature = self._temperature_from_source_state(
                entity_id,
                source_entity_id,
                new_state,
            )
            if temperature is None:
                continue
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

        source_entity_ids = sorted(
            {self._temperature_source_entity_id(entity_id) for entity_id in entity_ids}
        )
        self._unsub_preconditioning_replan_listener = async_track_state_change_event(
            self._hass,
            source_entity_ids,
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
                and self._zone_has_future_preconditioning_candidate(
                    entity_id,
                    zone,
                    now,
                )
            )
        )

    def _zone_has_future_preconditioning_candidate(
        self,
        entity_id: str,
        zone: ZoneData,
        now: datetime,
    ) -> bool:
        """Return whether a zone has a future block that temperature can replan."""
        schedule = self._effective_schedule(entity_id, zone)
        if schedule is None:
            return False
        today = now.date()
        for day_offset in range(8):
            event_date = today + timedelta(days=day_offset)
            weekday = WEEKDAYS[event_date.weekday()]
            for block in schedule[weekday]:
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
        source_entity_id = event.data.get("entity_id")
        new_state = event.data.get("new_state")
        if not isinstance(source_entity_id, str):
            return

        changed = False
        for entity_id in self._preconditioning_replan_entities:
            temperature = self._temperature_from_source_state(
                entity_id,
                source_entity_id,
                new_state,
            )
            if temperature is None:
                continue
            if entity_id in self._preconditioning_sessions:
                continue
            if self._temperature_source_entity_id(entity_id) != source_entity_id:
                continue

            previous_temperature = self._preconditioning_replan_temperatures.get(entity_id)
            threshold = self._preconditioning_replan_temperature_threshold(entity_id)
            if (
                previous_temperature is not None
                and abs(temperature - previous_temperature) < threshold
            ):
                continue

            self._preconditioning_replan_temperatures[entity_id] = temperature
            changed = True

        if changed:
            self._schedule_preconditioning_replan()

    def _preconditioning_replan_temperature_threshold(self, entity_id: str) -> float:
        """Return the minimum temperature movement that should trigger replan."""
        configured_delta = self._preconditioning_minimum_delta(entity_id)
        unit_getter = getattr(self._climate_manager, "temperature_unit", None)
        unit = unit_getter(entity_id) if callable(unit_getter) else CELSIUS
        physical_minimum = temperature_delta(
            PRECONDITIONING_REPLAN_MIN_TEMPERATURE_CHANGE,
            CELSIUS,
            unit,
        )
        if configured_delta <= 0:
            return physical_minimum
        return min(
            physical_minimum,
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
        temperature_source_entity_id = self._temperature_source_entity_id(
            session.entity_id
        )
        if temperature_source_entity_id != session.entity_id:
            observation["temperature_source"] = self._temperature_source_label(
                session.entity_id
            )
            observation["room_temperature_entity_id"] = temperature_source_entity_id
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
        stored_sample_count = len(direction_learning["observations"])
        self._discard_preconditioning_session(session.entity_id)
        await self._async_save_data()
        self._async_fire_preconditioning_observation_recorded(
            observation,
            stored_sample_count=stored_sample_count,
        )
        self._async_write_state()

    def set_temperature_migration_blocked(self, blocked: bool) -> None:
        """Block or unblock all automatic scheduling for temperature migration."""
        if self._temperature_migration_blocked == blocked:
            return
        self._temperature_migration_blocked = blocked
        if blocked:
            self._applied_preconditioning_targets.clear()
            self._comfort_assessment_snapshots.clear()
            self._preconditioning_plan_snapshots.clear()
            self._clear_preconditioning_sessions()
            self._clear_preconditioning_replan_listener()
            self._clear_preconditioning_replan_timer()
            self._clear_room_sensor_assist_listener()
            self._clear_room_sensor_assist_timer()
            self._clear_comfort_listener()
            self.async_schedule_next_event()

    async def async_restore_room_sensor_assist_after_temperature_operation(
        self,
        source_unit: str,
        target_unit: str,
        *,
        reason: str,
    ) -> None:
        """Restore assisted climates to their scheduled target, then clear state."""
        for state in list(self._room_sensor_assist_states.values()):
            target = self.normalize_target_temperature(
                state.entity_id,
                absolute_temperature(
                    state.target_temperature, source_unit, target_unit
                ),
            )
            climate_options = (
                self._room_sensor_assist_scheduled_target_options(
                    state.entity_id, state.weekday, state.start
                )
                if state.weekday is not None and state.start is not None
                else {}
            )
            await self._climate_manager.async_set_temperature(
                state.entity_id,
                target,
                ensure_on=False,
                hvac_mode=state.hvac_mode,
                **climate_options,
            )
            self._room_sensor_assist_states.pop(state.entity_id, None)
            self._async_fire_room_sensor_assist_event(
                EVENT_TYPE_ROOM_SENSOR_ASSIST_RESTORED,
                entity_id=state.entity_id,
                room_temperature_entity_id=state.room_temperature_entity_id,
                target_temperature=target,
                applied_temperature=target,
                room_temperature=self._current_temperature(state.entity_id),
                climate_temperature=self._climate_current_temperature(state.entity_id),
                assist_delta=0.0,
                direction=state.direction,
                hvac_mode=state.hvac_mode,
                reason=reason,
            )
        self._refresh_room_sensor_assist_listener()

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

    async def _async_refresh_room_sensor_assist_from_current_event(
        self,
        entity_id: str,
    ) -> None:
        """Refresh room sensor assist from the active schedule block."""
        current_event = self._room_sensor_assist_target_event(entity_id)
        if current_event is None or current_event.temperature is None:
            _LOGGER.debug(
                "Room Sensor Assist skipped for %s: no active scheduled target",
                entity_id,
            )
            await self._async_clear_room_sensor_assist(
                entity_id,
                restore=True,
                reason="no_active_target",
            )
            return
        await self._async_refresh_room_sensor_assist(
            entity_id,
            target_temperature=current_event.temperature,
            hvac_mode=current_event.hvac_mode,
            weekday=current_event.weekday,
            start=current_event.start,
            reason="current_schedule",
        )

    def _room_sensor_assist_target_event(self, entity_id: str) -> ClimateEvent | None:
        """Return the current target Room Sensor Assist should follow."""
        now = dt_util.now()
        session = self._preconditioning_sessions.get(entity_id)
        if session is not None and session.target_when > now:
            if not self._room_sensor_assist_scheduled_target_exists(
                entity_id,
                session.weekday,
                session.start,
                session.target_temperature,
                session.hvac_mode,
            ):
                self._preconditioning_sessions.pop(entity_id, None)
            else:
                applied_preconditioning_event = (
                    self._room_sensor_assist_applied_preconditioning_event(
                        entity_id,
                        session.weekday,
                        session.start,
                        session.target_temperature,
                        session.hvac_mode,
                    )
                )
                if applied_preconditioning_event is not None:
                    return applied_preconditioning_event

                return ClimateEvent(
                    entity_id=entity_id,
                    when=session.started_at,
                    temperature=session.target_temperature,
                    weekday=session.weekday,
                    start=session.start,
                    action=ACTION_SET_TEMPERATURE,
                    hvac_mode=session.hvac_mode,
                    **self._room_sensor_assist_scheduled_target_options(
                        entity_id,
                        session.weekday,
                        session.start,
                    ),
                    target_when=session.target_when,
                )

        due_event = self._room_sensor_assist_due_preconditioning_event(entity_id, now)
        if due_event is not None:
            return due_event

        state = self._room_sensor_assist_states.get(entity_id)
        if (
            state is not None
            and state.weekday is not None
            and state.start is not None
            and self._room_sensor_assist_scheduled_target_exists(
                entity_id,
                state.weekday,
                state.start,
                state.target_temperature,
                state.hvac_mode,
            )
        ):
            applied_preconditioning_event = (
                self._room_sensor_assist_applied_preconditioning_event(
                    entity_id,
                    state.weekday,
                    state.start,
                    state.target_temperature,
                    state.hvac_mode,
                )
            )
            if applied_preconditioning_event is not None:
                return applied_preconditioning_event

            return ClimateEvent(
                entity_id=entity_id,
                when=now,
                temperature=state.target_temperature,
                weekday=state.weekday,
                start=state.start,
                action=ACTION_SET_TEMPERATURE,
                hvac_mode=state.hvac_mode,
                **self._room_sensor_assist_scheduled_target_options(
                    entity_id,
                    state.weekday,
                    state.start,
                ),
            )

        return self.get_current_event(entity_id)

    def _room_sensor_assist_applied_preconditioning_event(
        self,
        entity_id: str,
        weekday: str,
        start: str,
        target_temperature: float,
        hvac_mode: str | None,
    ) -> ClimateEvent | None:
        """Return an already applied early-start event for a Room Assist state."""
        if not self._room_sensor_assist_scheduled_target_exists(
            entity_id,
            weekday,
            start,
            target_temperature,
            hvac_mode,
        ):
            return None

        key_prefix = f"{entity_id}|{weekday}|{start}|"
        for key, marker in self._applied_preconditioning_targets.items():
            if not key.startswith(key_prefix):
                continue
            return ClimateEvent(
                entity_id=entity_id,
                when=marker.active_from,
                temperature=target_temperature,
                weekday=weekday,
                start=start,
                action=ACTION_SET_TEMPERATURE,
                hvac_mode=hvac_mode,
                **self._room_sensor_assist_scheduled_target_options(
                    entity_id,
                    weekday,
                    start,
                ),
                target_when=marker.target_when,
            )

        return None

    def _room_sensor_assist_scheduled_target_options(
        self,
        entity_id: str,
        weekday: str,
        start: str,
    ) -> dict[str, object]:
        """Return optional climate settings from the current stored block."""
        zone = self._data["zones"].get(entity_id)
        if zone is None:
            return {}
        schedule = self._effective_schedule(entity_id, zone)
        if schedule is None:
            return {}
        for block in schedule.get(weekday, []):
            if block.get("start") == start:
                return _event_climate_options(block)
        return {}

    def _room_sensor_assist_due_preconditioning_event(
        self,
        entity_id: str,
        now: datetime,
    ) -> ClimateEvent | None:
        """Return a due early-start event that should act as the current target."""
        if self.mode != MODE_AUTO or self._is_zone_override_active(entity_id, now):
            return None

        for event in self.calculate_next_events_by_zone(now):
            if event.entity_id != entity_id:
                continue
            if _is_due_preconditioning_event(event, now):
                return event
        return None

    def _room_sensor_assist_scheduled_target_exists(
        self,
        entity_id: str,
        weekday: str,
        start: str,
        target_temperature: float,
        hvac_mode: str | None,
    ) -> bool:
        """Return whether a runtime Room Sensor Assist target still exists."""
        zone = self._data["zones"].get(entity_id)
        if zone is None:
            return False

        schedule = self._effective_schedule(entity_id, zone)
        if schedule is None:
            return False
        for block in schedule.get(weekday, []):
            if block.get("start") != start:
                continue
            if block.get("action", ACTION_SET_TEMPERATURE) != ACTION_SET_TEMPERATURE:
                continue
            block_temperature = _event_temperature(block)
            if (
                block_temperature is None
                or abs(block_temperature - target_temperature) >= 0.000001
            ):
                continue
            block_hvac_mode = block.get("hvac_mode")
            if (
                block_hvac_mode is not None
                and hvac_mode is not None
                and block_hvac_mode != hvac_mode
            ):
                continue
            return True

        return False

    def _room_sensor_assist_state_matches_target_event(
        self,
        state: _RoomSensorAssistState | None,
        target_event: ClimateEvent | None,
    ) -> bool:
        """Return whether a runtime assist state belongs to a target event."""
        if state is None or target_event is None or target_event.temperature is None:
            return False
        if state.weekday != target_event.weekday or state.start != target_event.start:
            return False
        return abs(state.target_temperature - target_event.temperature) < 0.000001

    def _room_sensor_assist_status(self, entity_id: str) -> dict[str, object]:
        """Return a user-facing Room Sensor Assist runtime snapshot."""
        zone = self._data["zones"].get(entity_id)
        config = normalize_preconditioning_data(
            zone.get("preconditioning") if zone is not None else None
        )
        room_entity_id = config.get("room_temperature_entity_id")
        target_step_available = self.get_temperature_step(entity_id) is not None
        target_event = self._room_sensor_assist_target_event(entity_id)
        stored_runtime_state = self._room_sensor_assist_states.get(entity_id)
        runtime_state = (
            stored_runtime_state
            if target_step_available and self._room_sensor_assist_state_matches_target_event(
                stored_runtime_state,
                target_event,
            )
            else None
        )
        target_temperature = (
            target_event.temperature
            if target_event is not None and target_event.temperature is not None
            else None
        )
        hvac_mode = target_event.hvac_mode if target_event is not None else None
        room_temperature = (
            self._external_temperature(entity_id, room_entity_id)
            if room_entity_id
            else None
        )
        climate_temperature = self._climate_current_temperature(entity_id)
        climate_target_temperature = self._climate_target_temperature(entity_id)
        direction = (
            runtime_state.direction
            if runtime_state is not None
            else (
                self._room_sensor_assist_direction(
                    entity_id,
                    target_temperature,
                    hvac_mode,
                )
                if target_step_available and target_temperature is not None
                else None
            )
        )
        calculated_temperature: float | None = None
        assist_delta = 0.0
        if (
            config["room_sensor_assist_enabled"]
            and
            target_step_available
            and
            target_temperature is not None
            and direction is not None
            and room_temperature is not None
            and climate_temperature is not None
        ):
            calculated_temperature, assist_delta = self._room_sensor_assist_target(
                entity_id,
                config,
                direction,
                target_temperature,
                room_temperature,
                climate_temperature,
            )

        if not zone or not zone["enabled"]:
            status = "unavailable"
        elif not room_entity_id:
            status = "not_configured"
        elif not config["room_sensor_assist_enabled"]:
            status = "disabled"
        elif not target_step_available:
            status = "unavailable"
        elif self.mode != MODE_AUTO or self._is_zone_override_active(entity_id, dt_util.now()):
            status = "blocked"
        elif target_temperature is None:
            status = "idle"
        elif runtime_state is not None and calculated_temperature is None:
            status = "holding"
        elif runtime_state is not None:
            status = "assisting"
        elif calculated_temperature is not None:
            status = "ready"
        else:
            status = "idle"

        return {
            "status": status,
            "reason": (
                "missing_target_step"
                if config["room_sensor_assist_enabled"] and not target_step_available
                else None
            ),
            "enabled": config["room_sensor_assist_enabled"],
            "configured": bool(room_entity_id),
            "room_temperature_entity_id": room_entity_id,
            "target_temperature": target_temperature,
            "applied_temperature": (
                runtime_state.applied_temperature
                if runtime_state is not None
                else None
            ),
            "climate_target_temperature": climate_target_temperature,
            "room_temperature": room_temperature,
            "climate_temperature": climate_temperature,
            "assist_delta": assist_delta,
            "direction": direction,
            "hvac_mode": hvac_mode,
            "weekday": target_event.weekday if target_event is not None else None,
            "start": target_event.start if target_event is not None else None,
            "active_from": (
                target_event.when.isoformat() if target_event is not None else None
            ),
            "target_when": (
                target_event.target_when.isoformat()
                if target_event is not None and target_event.target_when is not None
                else None
            ),
        }

    async def _async_refresh_room_sensor_assist(
        self,
        entity_id: str,
        *,
        target_temperature: float,
        hvac_mode: str | None,
        weekday: str | None = None,
        start: str | None = None,
        reason: str,
    ) -> None:
        """Apply or restore a dynamic TRV target using an external room sensor."""
        zone = self._data["zones"].get(entity_id)
        if zone is None or not zone["enabled"]:
            _LOGGER.debug("Room Sensor Assist skipped for %s: zone unavailable", entity_id)
            await self._async_clear_room_sensor_assist(
                entity_id,
                restore=True,
                reason="zone_unavailable",
            )
            return
        if self.mode != MODE_AUTO or self._is_zone_override_active(entity_id, dt_util.now()):
            _LOGGER.debug("Room Sensor Assist skipped for %s: scheduler not auto", entity_id)
            await self._async_clear_room_sensor_assist(
                entity_id,
                restore=True,
                reason="not_auto",
            )
            return

        config = normalize_preconditioning_data(zone.get("preconditioning"))
        room_entity_id = config.get("room_temperature_entity_id")
        if (
            not config["room_sensor_assist_enabled"]
            or not room_entity_id
        ):
            _LOGGER.debug("Room Sensor Assist skipped for %s: assist disabled", entity_id)
            await self._async_clear_room_sensor_assist(
                entity_id,
                restore=True,
                reason="assist_disabled",
            )
            return

        if self.get_temperature_step(entity_id) is None:
            _LOGGER.debug(
                "Room Sensor Assist skipped for %s: climate has no valid target_temp_step",
                entity_id,
            )
            await self._async_clear_room_sensor_assist(
                entity_id,
                restore=True,
                reason="missing_target_step",
            )
            return

        direction = self._room_sensor_assist_direction(
            entity_id,
            target_temperature,
            hvac_mode,
        )
        if direction is None:
            _LOGGER.debug("Room Sensor Assist skipped for %s: unsupported mode", entity_id)
            await self._async_clear_room_sensor_assist(
                entity_id,
                restore=True,
                reason="unsupported_mode",
            )
            return

        room_temperature = self._external_temperature(entity_id, room_entity_id)
        climate_temperature = self._climate_current_temperature(entity_id)
        if room_temperature is None or climate_temperature is None:
            _LOGGER.debug(
                "Room Sensor Assist skipped for %s: missing temperature "
                "(room=%s, climate=%s)",
                entity_id,
                room_temperature,
                climate_temperature,
            )
            await self._async_clear_room_sensor_assist(
                entity_id,
                restore=True,
                reason="missing_temperature",
            )
            return

        desired_temperature, assist_delta = self._room_sensor_assist_target(
            entity_id,
            config,
            direction,
            target_temperature,
            room_temperature,
            climate_temperature,
        )
        if desired_temperature is None:
            await self._async_hold_room_sensor_assist_target(
                entity_id,
                target_temperature=target_temperature,
                room_temperature=room_temperature,
                climate_temperature=climate_temperature,
                direction=direction,
                hvac_mode=hvac_mode,
                room_temperature_entity_id=room_entity_id,
                weekday=weekday,
                start=start,
                reason="target_reached",
            )
            return

        current_state = self._room_sensor_assist_states.get(entity_id)
        temperature_step = self.get_temperature_step(entity_id)
        movement_threshold = temperature_step or 0.000001
        if (
            current_state is not None
            and abs(desired_temperature - current_state.applied_temperature)
            < movement_threshold - 0.000001
        ):
            self._refresh_room_sensor_assist_listener()
            return

        if self._temperature_migration_blocked:
            return
        await self._climate_manager.async_set_temperature(
            entity_id,
            desired_temperature,
            ensure_on=True,
            **(
                self._room_sensor_assist_scheduled_target_options(
                    entity_id,
                    weekday,
                    start,
                )
                if weekday is not None and start is not None
                else {}
            ),
            hvac_mode=hvac_mode,
        )
        _LOGGER.debug(
            "Room Sensor Assist set %s to %s "
            "(target=%s, room=%s, climate=%s, assist_delta=%s)",
            entity_id,
            desired_temperature,
            target_temperature,
            room_temperature,
            climate_temperature,
            assist_delta,
        )
        self._room_sensor_assist_states[entity_id] = _RoomSensorAssistState(
            entity_id=entity_id,
            target_temperature=target_temperature,
            applied_temperature=desired_temperature,
            direction=direction,
            hvac_mode=hvac_mode,
            room_temperature_entity_id=room_entity_id,
            weekday=weekday,
            start=start,
        )
        self._refresh_room_sensor_assist_listener()
        self._async_fire_room_sensor_assist_event(
            EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED,
            entity_id=entity_id,
            room_temperature_entity_id=room_entity_id,
            target_temperature=target_temperature,
            applied_temperature=desired_temperature,
            room_temperature=room_temperature,
            climate_temperature=climate_temperature,
            assist_delta=assist_delta,
            direction=direction,
            hvac_mode=hvac_mode,
            reason=reason,
        )

    async def _async_hold_room_sensor_assist_target(
        self,
        entity_id: str,
        *,
        target_temperature: float,
        room_temperature: float,
        climate_temperature: float,
        direction: str,
        hvac_mode: str | None,
        room_temperature_entity_id: str,
        weekday: str | None,
        start: str | None,
        reason: str,
    ) -> None:
        """Apply a non-driving target while keeping room sensor assist active."""
        hold_temperature = self._room_sensor_assist_hold_target(
            entity_id,
            direction,
            climate_temperature,
        )
        current_state = self._room_sensor_assist_states.get(entity_id)
        temperature_step = self.get_temperature_step(entity_id)
        movement_threshold = temperature_step or 0.000001
        should_apply = (
            abs(
                hold_temperature
                - (
                    current_state.applied_temperature
                    if current_state is not None
                    else target_temperature
                )
            )
            >= movement_threshold - 0.000001
        )

        if should_apply:
            if self._temperature_migration_blocked:
                return
            await self._climate_manager.async_set_temperature(
                entity_id,
                hold_temperature,
                ensure_on=False,
                **(
                    self._room_sensor_assist_scheduled_target_options(
                        entity_id,
                        weekday,
                        start,
                    )
                    if weekday is not None and start is not None
                    else {}
                ),
                hvac_mode=hvac_mode,
            )
            self._async_fire_room_sensor_assist_event(
                EVENT_TYPE_ROOM_SENSOR_ASSIST_RESTORED,
                entity_id=entity_id,
                room_temperature_entity_id=room_temperature_entity_id,
                target_temperature=target_temperature,
                applied_temperature=hold_temperature,
                room_temperature=room_temperature,
                climate_temperature=climate_temperature,
                assist_delta=0.0,
                direction=direction,
                hvac_mode=hvac_mode,
                reason=reason,
            )

        self._room_sensor_assist_states[entity_id] = _RoomSensorAssistState(
            entity_id=entity_id,
            target_temperature=target_temperature,
            applied_temperature=hold_temperature,
            direction=direction,
            hvac_mode=hvac_mode,
            room_temperature_entity_id=room_temperature_entity_id,
            weekday=weekday,
            start=start,
        )
        self._refresh_room_sensor_assist_listener()

    def _room_sensor_assist_direction(
        self,
        entity_id: str,
        target_temperature: float,
        hvac_mode: str | None,
    ) -> str | None:
        """Return heat/cool direction for a room sensor assist target."""
        mode = hvac_mode or self._current_hvac_mode(entity_id)
        if mode in PRECONDITIONING_HEATING_MODES:
            return "heat"
        if mode in PRECONDITIONING_COOLING_MODES:
            return "cool"
        if mode not in PRECONDITIONING_AUTO_MODES:
            return None

        room_temperature = self._current_temperature(entity_id)
        minimum_delta = self._preconditioning_minimum_delta(entity_id)
        if room_temperature is None:
            return None
        if room_temperature < target_temperature - minimum_delta:
            return "heat"
        if room_temperature > target_temperature + minimum_delta:
            return "cool"
        return None

    def _room_sensor_assist_target(
        self,
        entity_id: str,
        config: PreconditioningData,
        direction: str,
        target_temperature: float,
        room_temperature: float,
        climate_temperature: float,
    ) -> tuple[float | None, float]:
        """Return the assisted target temperature and applied delta."""
        minimum_delta = config["minimum_delta_temperature"]
        if direction == "heat":
            pending_delta = target_temperature - room_temperature
            if pending_delta <= minimum_delta:
                return None, 0.0
            assist_delta = min(pending_delta, config["room_sensor_assist_max_delta"])
            desired_temperature = climate_temperature + assist_delta
        else:
            pending_delta = room_temperature - target_temperature
            if pending_delta <= minimum_delta:
                return None, 0.0
            assist_delta = min(pending_delta, config["room_sensor_assist_max_delta"])
            desired_temperature = climate_temperature - assist_delta

        min_temperature, max_temperature = self.get_temperature_limits(entity_id)
        bounded = max(min_temperature, min(max_temperature, desired_temperature))
        stepped = _room_sensor_assist_step_temperature(
            bounded,
            self.get_temperature_step(entity_id),
            direction,
        )
        bounded_stepped = max(min_temperature, min(max_temperature, stepped))
        return round(bounded_stepped, 3), round(abs(assist_delta), 3)

    def _room_sensor_assist_hold_target(
        self,
        entity_id: str,
        direction: str,
        climate_temperature: float,
    ) -> float:
        """Return a target that avoids driving the climate past the room target."""
        min_temperature, max_temperature = self.get_temperature_limits(entity_id)
        bounded = max(min_temperature, min(max_temperature, climate_temperature))
        stepped = _room_sensor_assist_step_temperature(
            bounded,
            self.get_temperature_step(entity_id),
            direction,
        )
        bounded_stepped = max(min_temperature, min(max_temperature, stepped))
        return round(bounded_stepped, 3)

    def _room_sensor_assist_candidate_climates(self) -> set[str]:
        """Return active climates that can use room sensor assist."""
        if self.mode != MODE_AUTO:
            return set()

        now = dt_util.now()
        entity_ids: set[str] = set()
        for entity_id, zone in self._data["zones"].items():
            if not zone["enabled"] or self._is_zone_override_active(entity_id, now):
                continue

            config = normalize_preconditioning_data(zone.get("preconditioning"))
            if (
                not config["room_sensor_assist_enabled"]
                or not config.get("room_temperature_entity_id")
            ):
                continue

            current_event = self._room_sensor_assist_target_event(entity_id)
            if current_event is None or current_event.temperature is None:
                continue

            entity_ids.add(entity_id)

        return entity_ids

    def _room_sensor_assist_candidate_entities(self) -> set[str]:
        """Return entities that should wake room sensor assist recalculation."""
        entity_ids: set[str] = set()
        for climate_entity_id in self._room_sensor_assist_candidate_climates():
            config = normalize_preconditioning_data(
                self._data["zones"][climate_entity_id].get("preconditioning")
            )
            room_entity_id = config.get("room_temperature_entity_id")
            if room_entity_id:
                entity_ids.update({climate_entity_id, room_entity_id})
        return entity_ids

    def _refresh_room_sensor_assist_listener(self) -> None:
        """Listen only to entities that can affect active room sensor assist."""
        entity_ids = sorted(
            self._room_sensor_assist_candidate_entities()
            | {
                entity_id
                for state in self._room_sensor_assist_states.values()
                for entity_id in (state.entity_id, state.room_temperature_entity_id)
            }
        )
        next_entities = tuple(entity_ids)
        if next_entities == self._room_sensor_assist_entities:
            return

        self._clear_room_sensor_assist_listener()
        self._room_sensor_assist_entities = next_entities
        if not entity_ids:
            self._clear_room_sensor_assist_timer()
            return

        self._unsub_room_sensor_assist_listener = async_track_state_change_event(
            self._hass,
            entity_ids,
            self._handle_room_sensor_assist_state_change,
        )

    @callback
    def _handle_room_sensor_assist_state_change(self, event) -> None:
        """Debounce assisted target updates after room or climate changes."""
        entity_id = event.data.get("entity_id")
        if not isinstance(entity_id, str):
            return

        if entity_id not in self._room_sensor_assist_entities:
            _LOGGER.debug(
                "Room Sensor Assist ignored state change for untracked entity %s",
                entity_id,
            )
            return

        _LOGGER.debug("Room Sensor Assist scheduling refresh after %s changed", entity_id)
        self._schedule_room_sensor_assist_refresh()

    def _schedule_room_sensor_assist_refresh(self) -> None:
        """Schedule one debounced room sensor assist refresh."""
        if self._unsub_room_sensor_assist_timer is not None:
            return

        debounce = self._room_sensor_assist_debounce()
        if debounce.total_seconds() <= 0:
            self._handle_room_sensor_assist_timer(dt_util.now())
            return

        self._unsub_room_sensor_assist_timer = async_track_point_in_time(
            self._hass,
            self._handle_room_sensor_assist_timer,
            dt_util.now() + debounce,
        )

    def _room_sensor_assist_debounce(self) -> timedelta:
        """Return the shortest configured Room Sensor Assist debounce."""
        debounce_seconds: list[int] = []
        for entity_id in self._room_sensor_assist_candidate_climates():
            zone = self._data["zones"].get(entity_id)
            if zone is None:
                continue
            config = normalize_preconditioning_data(zone.get("preconditioning"))
            debounce_seconds.append(config["room_sensor_assist_debounce_seconds"])
        for state in self._room_sensor_assist_states.values():
            zone = self._data["zones"].get(state.entity_id)
            if zone is None:
                continue
            config = normalize_preconditioning_data(zone.get("preconditioning"))
            debounce_seconds.append(config["room_sensor_assist_debounce_seconds"])
        if not debounce_seconds:
            return timedelta(0)
        return timedelta(seconds=min(debounce_seconds))

    @callback
    def _handle_room_sensor_assist_timer(self, now: datetime) -> None:
        """Refresh all active assisted targets."""
        self._unsub_room_sensor_assist_timer = None
        entity_ids = sorted(
            set(self._room_sensor_assist_states)
            | self._room_sensor_assist_candidate_climates()
        )
        if not entity_ids:
            _LOGGER.debug("Room Sensor Assist refresh skipped: no active candidates")
            return
        for entity_id in entity_ids:
            self._hass.async_create_task(
                self._async_refresh_room_sensor_assist_from_current_event(entity_id)
            )

    async def _async_clear_room_sensor_assist(
        self,
        entity_id: str | None = None,
        *,
        restore: bool,
        reason: str,
    ) -> None:
        """Clear assisted targets and optionally restore the real target."""
        entity_ids = (
            [entity_id]
            if entity_id is not None
            else list(self._room_sensor_assist_states)
        )
        for assisted_entity_id in entity_ids:
            state = self._room_sensor_assist_states.pop(assisted_entity_id, None)
            if state is None:
                continue
            if restore:
                climate_options = (
                    self._room_sensor_assist_scheduled_target_options(
                        assisted_entity_id,
                        state.weekday,
                        state.start,
                    )
                    if state.weekday is not None and state.start is not None
                    else {}
                )
                await self._climate_manager.async_set_temperature(
                    assisted_entity_id,
                    state.target_temperature,
                    ensure_on=False,
                    hvac_mode=state.hvac_mode,
                    **climate_options,
                )
            self._async_fire_room_sensor_assist_event(
                EVENT_TYPE_ROOM_SENSOR_ASSIST_RESTORED,
                entity_id=assisted_entity_id,
                room_temperature_entity_id=state.room_temperature_entity_id,
                target_temperature=state.target_temperature,
                applied_temperature=state.target_temperature,
                room_temperature=self._current_temperature(assisted_entity_id),
                climate_temperature=self._climate_current_temperature(assisted_entity_id),
                assist_delta=0.0,
                direction=state.direction,
                hvac_mode=state.hvac_mode,
                reason=reason,
            )
        self._refresh_room_sensor_assist_listener()

    def _clear_room_sensor_assist_listener(self) -> None:
        """Stop listening for room sensor assist state changes."""
        if self._unsub_room_sensor_assist_listener is not None:
            self._unsub_room_sensor_assist_listener()
            self._unsub_room_sensor_assist_listener = None
        self._room_sensor_assist_entities = ()

    def _clear_room_sensor_assist_timer(self) -> None:
        """Cancel a pending room sensor assist refresh."""
        if self._unsub_room_sensor_assist_timer is not None:
            self._unsub_room_sensor_assist_timer()
            self._unsub_room_sensor_assist_timer = None

    def _comfort_assessment(self, entity_id: str) -> dict[str, object]:
        """Return the environmental comfort assessment for one managed zone."""
        zone = self._data["zones"].get(entity_id)
        if zone is None:
            return {
                "enabled": False,
                "condition": "monitoring_off",
                "air_quality": "not_monitored",
                "data_quality": "unavailable",
                "data_issues": [],
            }

        config = self._normalize_comfort_for_entity(entity_id, zone.get("comfort"))
        if not config["enabled"]:
            return {
                "enabled": False,
                "condition": "monitoring_off",
                "air_quality": "not_monitored",
                "data_quality": "unavailable",
                "data_issues": [],
            }

        metrics = {
            "temperature": self._comfort_temperature_metric(entity_id, config),
            "humidity": self._comfort_humidity_metric(entity_id, config),
            "co2": self._comfort_co2_metric(config),
        }
        monitored_metrics = [
            metric
            for metric in metrics.values()
            if metric["availability"] != "not_monitored"
        ]
        current_metrics = [
            metric
            for metric in monitored_metrics
            if metric["availability"] == "current"
        ]
        data_issues = sorted(
            f"{metric['metric']}_{metric['availability']}"
            for metric in monitored_metrics
            if metric["availability"] in ("missing", "stale")
        )
        if not current_metrics:
            data_quality = (
                "stale"
                if monitored_metrics
                and all(metric["availability"] == "stale" for metric in monitored_metrics)
                else "unavailable"
            )
        elif data_issues:
            data_quality = "partial"
        else:
            data_quality = "complete"

        return {
            "enabled": True,
            "condition": self._comfort_environment_condition(
                metrics["temperature"],
                metrics["humidity"],
            ),
            "air_quality": self._comfort_air_quality(metrics["co2"]),
            "data_quality": data_quality,
            "data_issues": data_issues,
            "temperature": metrics["temperature"],
            "humidity": metrics["humidity"],
            "co2": metrics["co2"],
        }

    @staticmethod
    def _comfort_environment_condition(
        temperature: dict[str, object],
        humidity: dict[str, object],
    ) -> str:
        """Combine current temperature and humidity into a human condition."""
        temperature_condition = (
            temperature.get("condition")
            if temperature.get("availability") == "current"
            else None
        )
        humidity_condition = (
            humidity.get("condition")
            if humidity.get("availability") == "current"
            else None
        )
        if isinstance(temperature_condition, str) and isinstance(
            humidity_condition, str
        ):
            combinations = {
                ("cold", "dry"): "cold_and_dry",
                ("cold", "comfortable"): "cold",
                ("cold", "humid"): "cold_and_humid",
                ("comfortable", "dry"): "dry",
                ("comfortable", "comfortable"): "comfortable",
                ("comfortable", "humid"): "humid",
                ("hot", "dry"): "hot_and_dry",
                ("hot", "comfortable"): "hot",
                ("hot", "humid"): "hot_and_humid",
            }
            return combinations[(temperature_condition, humidity_condition)]
        if isinstance(temperature_condition, str):
            if (
                temperature_condition == "comfortable"
                and humidity.get("availability") != "not_monitored"
            ):
                return "temperature_comfortable"
            return temperature_condition
        if isinstance(humidity_condition, str):
            if humidity_condition == "comfortable":
                return "humidity_comfortable"
            return humidity_condition
        return "no_readings"

    @staticmethod
    def _comfort_air_quality(co2: dict[str, object]) -> str:
        """Return the current air-quality assessment from CO2."""
        if co2.get("availability") == "not_monitored":
            return "not_monitored"
        if co2.get("availability") != "current":
            return "unavailable"
        condition = co2.get("condition")
        return condition if isinstance(condition, str) else "unavailable"

    def _comfort_temperature_metric(
        self,
        entity_id: str,
        config: ComfortData,
    ) -> dict[str, object]:
        """Return comfort temperature metric details."""
        source_entity_id = config.get("temperature_entity_id")
        source = "sensor"
        if not source_entity_id:
            preconditioning = normalize_preconditioning_data(
                self._data["zones"][entity_id].get("preconditioning")
            )
            source_entity_id = preconditioning.get("room_temperature_entity_id")
            source = "room_sensor"
        if not source_entity_id:
            source_entity_id = entity_id
            source = "climate"

        state = self._hass.states.get(source_entity_id)
        value = (
            self._external_temperature(entity_id, source_entity_id)
            if source_entity_id != entity_id
            else _state_numeric_temperature(state)
        )
        stale = (
            _state_is_stale(state, config["stale_after_minutes"])
            if state is not None
            else False
        )
        return self._comfort_range_metric(
            value,
            stale,
            source=source,
            entity_id=source_entity_id,
            metric="temperature",
            minimum=config["temperature_min"],
            maximum=config["temperature_max"],
        )

    def _comfort_humidity_metric(
        self,
        entity_id: str,
        config: ComfortData,
    ) -> dict[str, object]:
        """Return comfort humidity metric details."""
        if not config["humidity_enabled"]:
            return self._unavailable_comfort_metric(
                "humidity",
                source="disabled",
                entity_id=None,
                availability="not_monitored",
            )

        source_entity_id = config.get("humidity_entity_id")
        source = "sensor"
        if not source_entity_id:
            source_entity_id = entity_id
            source = "climate"
            state = self._hass.states.get(entity_id)
            attributes = getattr(state, "attributes", {}) if state is not None else {}
            if (
                "current_humidity" not in attributes
                and "humidity" not in attributes
            ):
                return self._unavailable_comfort_metric(
                    "humidity",
                    source="missing",
                    entity_id=None,
                    availability="not_monitored",
                )

        value, stale = self._comfort_numeric_state_value(
            source_entity_id,
            "humidity",
            config,
        )
        return self._comfort_range_metric(
            value,
            stale,
            source=source,
            entity_id=source_entity_id,
            metric="humidity",
            minimum=config["humidity_min"],
            maximum=config["humidity_max"],
        )

    def _comfort_co2_metric(self, config: ComfortData) -> dict[str, object]:
        """Return comfort CO2 metric details."""
        source_entity_id = config.get("co2_entity_id")
        if not source_entity_id:
            return self._unavailable_comfort_metric(
                "co2",
                source="missing",
                entity_id=None,
                availability="not_monitored",
            )

        value, stale = self._comfort_numeric_state_value(
            source_entity_id,
            "co2",
            config,
        )
        if stale:
            return self._unavailable_comfort_metric(
                "co2",
                source="sensor",
                entity_id=source_entity_id,
                availability="stale",
                value=value,
            )
        if value is None:
            return self._unavailable_comfort_metric(
                "co2",
                source="sensor",
                entity_id=source_entity_id,
                availability="missing",
            )
        if value >= config["co2_poor"]:
            condition = "poor"
        elif value >= config["co2_attention"]:
            condition = "elevated"
        else:
            condition = "good"

        return {
            "availability": "current",
            "condition": condition,
            "entity_id": source_entity_id,
            "max": config["co2_poor"],
            "attention": config["co2_attention"],
            "metric": "co2",
            "source": "sensor",
            "value": value,
        }

    def _comfort_range_metric(
        self,
        value: float | None,
        stale: bool,
        *,
        source: str,
        entity_id: str | None,
        metric: str,
        minimum: float,
        maximum: float,
    ) -> dict[str, object]:
        """Return the condition for one ranged comfort metric."""
        if stale:
            return self._unavailable_comfort_metric(
                metric,
                source=source,
                entity_id=entity_id,
                availability="stale",
                value=value,
                minimum=minimum,
                maximum=maximum,
            )
        if value is None:
            return self._unavailable_comfort_metric(
                metric,
                source=source,
                entity_id=entity_id,
                availability="missing",
                minimum=minimum,
                maximum=maximum,
            )

        condition = "comfortable"
        if value < minimum:
            condition = "cold" if metric == "temperature" else "dry"
        elif value > maximum:
            condition = "hot" if metric == "temperature" else "humid"

        return {
            "availability": "current",
            "condition": condition,
            "entity_id": entity_id,
            "metric": metric,
            "min": minimum,
            "max": maximum,
            "source": source,
            "value": value,
        }

    def _unavailable_comfort_metric(
        self,
        metric: str,
        *,
        source: str,
        entity_id: str | None,
        availability: str,
        value: float | None = None,
        minimum: float | None = None,
        maximum: float | None = None,
    ) -> dict[str, object]:
        """Return a missing, stale, or unmonitored metric payload."""
        payload: dict[str, object] = {
            "availability": availability,
            "condition": None,
            "entity_id": entity_id,
            "metric": metric,
            "source": source,
            "value": value,
        }
        if minimum is not None:
            payload["min"] = minimum
        if maximum is not None:
            payload["max"] = maximum
        return payload

    def _comfort_numeric_state_value(
        self,
        entity_id: str,
        metric: str,
        config: ComfortData,
    ) -> tuple[float | None, bool]:
        """Return a numeric state value and whether the source is stale."""
        state = self._hass.states.get(entity_id)
        if state is None:
            return None, False
        stale = _state_is_stale(state, config["stale_after_minutes"])
        if metric == "temperature":
            return _state_numeric_temperature(state), stale
        if metric == "humidity":
            return _state_numeric_humidity(state), stale
        return _state_numeric_value(state), stale

    def _comfort_candidate_entities(self) -> set[str]:
        """Return entities that should wake comfort recalculation."""
        entity_ids: set[str] = set()
        for entity_id, zone in self._data["zones"].items():
            config = self._normalize_comfort_for_entity(entity_id, zone.get("comfort"))
            if not config["enabled"]:
                continue

            entity_ids.add(entity_id)
            preconditioning = normalize_preconditioning_data(zone.get("preconditioning"))
            for candidate in (
                config.get("temperature_entity_id"),
                config.get("humidity_entity_id") if config["humidity_enabled"] else None,
                config.get("co2_entity_id"),
                preconditioning.get("room_temperature_entity_id"),
            ):
                if candidate:
                    entity_ids.add(candidate)
        return entity_ids

    def _refresh_comfort_listener(self) -> None:
        """Listen only to entities that can affect enabled comfort monitoring."""
        entity_ids = sorted(self._comfort_candidate_entities())
        next_entities = tuple(entity_ids)
        if next_entities == self._comfort_entities:
            return

        self._clear_comfort_listener()
        self._comfort_entities = next_entities
        if not entity_ids:
            self._comfort_assessment_snapshots.clear()
            return

        self._async_update_comfort_snapshots(fire_events=False)
        self._unsub_comfort_listener = async_track_state_change_event(
            self._hass,
            entity_ids,
            self._handle_comfort_state_change,
        )

    @callback
    def _handle_comfort_state_change(self, event) -> None:
        """Refresh the comfort assessment after a tracked entity changes."""
        entity_id = event.data.get("entity_id")
        if not isinstance(entity_id, str) or entity_id not in self._comfort_entities:
            return
        if self._async_update_comfort_snapshots(fire_events=True):
            self._async_write_state()

    def _async_update_comfort_snapshots(self, *, fire_events: bool) -> bool:
        """Update cached comfort assessments and emit meaningful changes."""
        changed = False
        enabled_entities = set()
        for entity_id, zone in self._data["zones"].items():
            config = self._normalize_comfort_for_entity(entity_id, zone.get("comfort"))
            if not config["enabled"]:
                continue
            enabled_entities.add(entity_id)
            assessment = self._comfort_assessment(entity_id)
            snapshot = self._comfort_snapshot(assessment)
            previous = self._comfort_assessment_snapshots.get(entity_id)
            self._comfort_assessment_snapshots[entity_id] = snapshot
            if previous is None or previous == snapshot:
                continue

            changed = True
            if fire_events and self._comfort_event_snapshot(previous) != self._comfort_event_snapshot(snapshot):
                self._async_fire_comfort_assessment_changed(entity_id, assessment)

        for entity_id in set(self._comfort_assessment_snapshots) - enabled_entities:
            self._comfort_assessment_snapshots.pop(entity_id, None)
            changed = True

        return changed

    def _comfort_snapshot(self, assessment: dict[str, object]) -> tuple[object, ...]:
        """Return a snapshot that changes when visible comfort data changes."""
        return (
            assessment.get("condition"),
            assessment.get("air_quality"),
            assessment.get("data_quality"),
            tuple(assessment.get("data_issues", [])),
            self._comfort_metric_snapshot(assessment.get("temperature")),
            self._comfort_metric_snapshot(assessment.get("humidity")),
            self._comfort_metric_snapshot(assessment.get("co2")),
        )

    @staticmethod
    def _comfort_event_snapshot(snapshot: tuple[object, ...]) -> tuple[object, ...]:
        """Return the public automation-event portion of a comfort snapshot."""
        return snapshot[:4]

    @staticmethod
    def _comfort_metric_snapshot(metric: object) -> tuple[object, ...] | None:
        """Return the visible payload portion for one comfort metric."""
        if not isinstance(metric, dict):
            return None
        return (
            metric.get("availability"),
            metric.get("condition"),
            metric.get("value"),
            metric.get("entity_id"),
        )

    def _clear_comfort_listener(self) -> None:
        """Stop listening for comfort sensor state changes."""
        if self._unsub_comfort_listener is not None:
            self._unsub_comfort_listener()
            self._unsub_comfort_listener = None
        self._comfort_entities = ()

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

    def _async_fire_profile_changed(
        self,
        profile_ids: list[str],
        *,
        previous_profile_ids: list[str],
        source: str = "internal",
    ) -> None:
        """Fire the stable automation event for profile selection changes."""
        self._async_fire_event(
            EVENT_TYPE_PROFILE_CHANGED,
            {
                "profile_ids": list(profile_ids),
                "previous_profile_ids": list(previous_profile_ids),
                "source": source,
            },
        )

    def _async_fire_comfort_assessment_changed(
        self,
        entity_id: str,
        assessment: dict[str, object],
    ) -> None:
        """Fire an event when a zone comfort assessment changes."""
        self._async_fire_event(
            EVENT_TYPE_COMFORT_ASSESSMENT_CHANGED,
            {
                "entity_id": entity_id,
                "condition": assessment.get("condition"),
                "air_quality": assessment.get("air_quality"),
                "data_quality": assessment.get("data_quality"),
                "data_issues": assessment.get("data_issues", []),
                "temperature": assessment.get("temperature"),
                "humidity": assessment.get("humidity"),
                "co2": assessment.get("co2"),
            },
        )

    def _async_fire_boost_started(
        self,
        entity_id: str,
        temperature: float,
        until: str,
        *,
        fan_mode: str | None,
        hvac_mode: str | None,
        humidity: float | None,
        preset_mode: str | None,
        started_at: str | None,
        swing_mode: str | None,
        swing_horizontal_mode: str | None,
    ) -> None:
        """Fire an event when a zone boost starts."""
        self._async_fire_event(
            EVENT_TYPE_BOOST_STARTED,
            {
                "entity_id": entity_id,
                "temperature": temperature,
                "hvac_mode": hvac_mode,
                **_climate_options(
                    fan_mode=fan_mode,
                    humidity=humidity,
                    preset_mode=preset_mode,
                    swing_mode=swing_mode,
                    swing_horizontal_mode=swing_horizontal_mode,
                ),
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
        restoration: dict[str, object],
    ) -> None:
        """Fire an event when a zone boost ends."""
        self._async_fire_event(
            EVENT_TYPE_BOOST_ENDED,
            {
                "entity_id": entity_id,
                "temperature": override.get("temperature"),
                "hvac_mode": override.get("hvac_mode"),
                **_climate_options_from_mapping(override),
                "started_at": override.get("started_at"),
                "until": override.get("until"),
                "reason": reason,
                "restoration": restoration,
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
            **_climate_options_from_event(event),
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

    def _async_fire_room_sensor_assist_event(
        self,
        event_name: str,
        *,
        entity_id: str,
        room_temperature_entity_id: str,
        target_temperature: float,
        applied_temperature: float,
        room_temperature: float | None,
        climate_temperature: float | None,
        assist_delta: float,
        direction: str,
        hvac_mode: str | None,
        reason: str,
    ) -> None:
        """Fire a room sensor assist automation event."""
        self._async_fire_event(
            event_name,
            {
                "entity_id": entity_id,
                "room_temperature_entity_id": room_temperature_entity_id,
                "target_temperature": target_temperature,
                "applied_temperature": applied_temperature,
                "room_temperature": room_temperature,
                "climate_temperature": climate_temperature,
                "assist_delta": assist_delta,
                "direction": direction,
                "hvac_mode": hvac_mode,
                "reason": reason,
            },
        )

    def _async_fire_room_sensor_assist_state_changed(
        self,
        entity_id: str,
        *,
        previous_enabled: bool,
        config: PreconditioningData,
    ) -> None:
        """Fire an event when Room Sensor Assist enablement changes."""
        self._async_fire_event(
            EVENT_TYPE_ROOM_SENSOR_ASSIST_STATE_CHANGED,
            {
                "entity_id": entity_id,
                "enabled": config["room_sensor_assist_enabled"],
                "previous_enabled": previous_enabled,
                "room_temperature_entity_id": config.get(
                    "room_temperature_entity_id"
                ),
                "max_delta": config["room_sensor_assist_max_delta"],
                "debounce_seconds": config["room_sensor_assist_debounce_seconds"],
            },
        )

    def _async_fire_preconditioning_observation_recorded(
        self,
        observation: PreconditioningObservation,
        *,
        stored_sample_count: int,
    ) -> None:
        """Fire an event after a learning observation is persisted."""
        data = dict(observation)
        data["direction"] = data.pop("mode")
        data["stored_sample_count"] = stored_sample_count
        self._async_fire_event(
            EVENT_TYPE_PRECONDITIONING_OBSERVATION_RECORDED,
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

        removed_entity_ids = (
            self._preconditioning_plan_snapshots.keys() - next_snapshots.keys()
        )
        for entity_id in removed_entity_ids:
            previous_data = dict(self._preconditioning_plan_snapshots[entity_id])
            self._async_fire_event(
                EVENT_TYPE_PRECONDITIONING_PLAN_CANCELLED,
                {
                    **previous_data,
                    "reason": "no_longer_planned",
                },
            )

        self._preconditioning_plan_snapshots = next_snapshots

    def _async_cancel_preconditioning_plans(self, *, reason: str) -> None:
        """Fire cancellation events for every currently published plan."""
        for snapshot in self._preconditioning_plan_snapshots.values():
            self._async_fire_event(
                EVENT_TYPE_PRECONDITIONING_PLAN_CANCELLED,
                {
                    **dict(snapshot),
                    "reason": reason,
                },
            )
        self._preconditioning_plan_snapshots.clear()

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
        block.update(_climate_options_from_event(event))
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
            temperature_delta_scale=self._preconditioning_temperature_delta_scale(
                event.entity_id
            ),
        )
        diagnostics = event.preconditioning_diagnostics or prediction["diagnostics"]
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
            **_climate_options_from_event(event),
            "model_source": (
                diagnostics["source"] if diagnostics is not None else prediction["source"]
            ),
            "complete_sample_count": (
                diagnostics["complete_sample_count"]
                if diagnostics is not None
                else prediction["complete_sample_count"]
            ),
            "partial_sample_count": (
                diagnostics["partial_sample_count"]
                if diagnostics is not None
                else prediction["partial_sample_count"]
            ),
            "invalid_sample_count": (
                diagnostics["invalid_sample_count"]
                if diagnostics is not None
                else prediction["invalid_sample_count"]
            ),
            "similar_sample_count": (
                diagnostics["similar_sample_count"]
                if diagnostics is not None
                else prediction["similar_sample_count"]
            ),
            "comfort_percentile": (
                diagnostics["comfort_percentile"]
                if diagnostics is not None
                else prediction["comfort_percentile"]
            ),
            "used_outdoor_temperature": (
                diagnostics["used_outdoor_temperature"]
                if diagnostics is not None
                else prediction["used_outdoor_temperature"]
            ),
            "preconditioning_diagnostics": diagnostics,
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
        target = self._format_temperature(entity_id, temperature)
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
        target = self._format_temperature(entity_id, temperature)
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

    def _format_temperature(self, entity_id: str, temperature: float) -> str:
        """Return a compact temperature label for logbook messages."""
        unit_getter = getattr(self._climate_manager, "temperature_unit", None)
        unit = unit_getter(entity_id) if unit_getter else "°C"
        return f"{temperature:g} {unit}"

    def _calculate_next_action_time(self, now: datetime) -> datetime | None:
        """Return the next timer action."""
        candidates: list[datetime] = []

        if (
            self.next_event is not None
            and not (
                self.next_event.when <= now
                and self._is_applied_preconditioning_event(self.next_event)
            )
        ):
            candidates.append(self.next_event.when)
        if (
            self.next_event is not None
            and self.next_event.target_when is not None
            and self.next_event.when <= now
            and self._is_applied_preconditioning_event(self.next_event)
        ):
            candidates.append(self.next_event.target_when)

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


def _event_climate_options(block: ScheduleBlock) -> dict[str, object]:
    """Return optional climate settings for a schedule event."""
    return climate_options_from_block(block)


def _climate_options_from_mapping(values: dict) -> dict[str, object]:
    """Return optional climate settings from a generic mapping."""
    return _climate_options(
        fan_mode=values.get(ATTR_FAN_MODE),
        humidity=values.get(ATTR_HUMIDITY),
        preset_mode=values.get(ATTR_PRESET_MODE),
        swing_mode=values.get(ATTR_SWING_MODE),
        swing_horizontal_mode=values.get(ATTR_SWING_HORIZONTAL_MODE),
    )


def _climate_options_from_event(event: ClimateEvent) -> dict[str, object]:
    """Return optional climate settings from an event."""
    return _climate_options(
        fan_mode=getattr(event, ATTR_FAN_MODE, None),
        humidity=getattr(event, ATTR_HUMIDITY, None),
        preset_mode=getattr(event, ATTR_PRESET_MODE, None),
        swing_mode=getattr(event, ATTR_SWING_MODE, None),
        swing_horizontal_mode=getattr(event, ATTR_SWING_HORIZONTAL_MODE, None),
    )


def _climate_options(
    *,
    fan_mode: object = None,
    humidity: object = None,
    preset_mode: object = None,
    swing_mode: object = None,
    swing_horizontal_mode: object = None,
) -> dict[str, object]:
    """Return non-empty optional climate settings."""
    options: dict[str, object] = {}
    for attr, value in (
        (ATTR_FAN_MODE, fan_mode),
        (ATTR_PRESET_MODE, preset_mode),
        (ATTR_SWING_MODE, swing_mode),
        (ATTR_SWING_HORIZONTAL_MODE, swing_horizontal_mode),
    ):
        if isinstance(value, str) and value:
            options[attr] = value
    if humidity is not None:
        try:
            options[ATTR_HUMIDITY] = float(humidity)
        except (TypeError, ValueError):
            pass
    return options


def _block_without_climate_options(block: ScheduleBlock) -> ScheduleBlock:
    """Return a block without optional climate settings."""
    clean_block: ScheduleBlock = {
        "start": block["start"],
        "action": block.get("action", ACTION_SET_TEMPERATURE),
    }
    if block.get("action", ACTION_SET_TEMPERATURE) != ACTION_TURN_OFF:
        clean_block["temperature"] = float(block["temperature"])
        if block.get("hvac_mode"):
            clean_block["hvac_mode"] = block["hvac_mode"]
    return clean_block


def _filter_block_climate_options(
    block: ScheduleBlock,
    supported_options: dict[str, list[str]],
) -> ScheduleBlock:
    """Return a block with only supported optional climate settings."""
    clean_block = _block_without_climate_options(block)
    if clean_block.get("action") == ACTION_TURN_OFF:
        return clean_block

    for attr, value in climate_options_from_block(block).items():
        filtered_options = _filter_climate_options({attr: value}, supported_options)
        clean_block.update(filtered_options)
    return clean_block


def _filter_climate_options(
    options: dict[str, object],
    supported_options: dict[str, list[str]],
) -> dict[str, object]:
    """Return only optional climate settings that are supported."""
    filtered: dict[str, object] = {}
    for attr, value in options.items():
        supported_values = supported_options.get(attr)
        if not supported_values:
            continue
        if attr == ATTR_HUMIDITY:
            if _humidity_is_supported(value, supported_values):
                filtered[attr] = float(value)
            continue
        if isinstance(value, str) and value in supported_values:
            filtered[attr] = value
    return filtered


def _humidity_is_supported(value: object, supported_values: list[str]) -> bool:
    """Return whether a humidity value is within the supported range."""
    try:
        humidity = float(value)
        min_humidity = float(supported_values[0])
        max_humidity = float(supported_values[1])
    except (IndexError, TypeError, ValueError):
        return False
    return min_humidity <= humidity <= max_humidity


def _room_sensor_assist_step_temperature(
    temperature: float,
    step: float | None,
    direction: str,
) -> float:
    """Align an assisted target to the climate temperature step."""
    if not isinstance(step, int | float) or not math.isfinite(step) or step <= 0:
        return temperature

    units = temperature / step
    if direction == "heat":
        return math.floor(units + 0.000001) * step
    return math.ceil(units - 0.000001) * step


def _state_temperature(state) -> float | None:
    """Return current temperature from a Home Assistant climate state."""
    attributes = getattr(state, "attributes", {}) if state is not None else {}
    try:
        temperature = float(attributes["current_temperature"])
    except (KeyError, TypeError, ValueError):
        return None
    return temperature if math.isfinite(temperature) else None


def _state_target_temperature(state) -> float | None:
    """Return the target temperature from a Home Assistant climate state."""
    attributes = getattr(state, "attributes", {}) if state is not None else {}
    try:
        temperature = float(attributes["temperature"])
    except (KeyError, TypeError, ValueError):
        return None
    return temperature if math.isfinite(temperature) else None


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
        temperature = float(value)
    except (TypeError, ValueError):
        return None
    return temperature if math.isfinite(temperature) else None


def _state_numeric_humidity(state) -> float | None:
    """Return numeric humidity from state or current_humidity attribute."""
    if state is None:
        return None
    attributes = getattr(state, "attributes", {})
    for attribute in ("current_humidity", "humidity"):
        try:
            return float(attributes[attribute])
        except (KeyError, TypeError, ValueError):
            continue
    return _state_numeric_value(state)


def _state_numeric_value(state) -> float | None:
    """Return a numeric value from a Home Assistant state."""
    value = getattr(state, "state", None)
    if isinstance(value, str) and value in ("unknown", "unavailable"):
        return None
    if not isinstance(value, (int, float, str)):
        return None
    try:
        temperature = float(value)
    except (TypeError, ValueError):
        return None
    return temperature if math.isfinite(temperature) else None


def _state_is_stale(state, stale_after_minutes: int) -> bool:
    """Return whether a Home Assistant state is older than the configured limit."""
    last_updated = getattr(state, "last_updated", None)
    if last_updated is None:
        return False
    try:
        age = dt_util.now() - last_updated
    except TypeError:
        return False
    return age > timedelta(minutes=stale_after_minutes)


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
