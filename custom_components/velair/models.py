"""Data models for Velair."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from math import ceil, exp, isfinite
import re
from typing import Any, NotRequired, TypedDict

from .const import (
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
    ATTR_FAN_MODE,
    ATTR_HUMIDITY,
    ATTR_PRESET_MODE,
    ATTR_SWING_HORIZONTAL_MODE,
    ATTR_SWING_MODE,
    MODE_AUTO,
    MODE_PAUSED,
    ZONE_PAUSE_ACTION_NONE,
    ZONE_PAUSE_ACTION_OPTIONS,
)

WEEKDAYS = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)

DEFAULT_MIN_TEMPERATURE = 5.0
DEFAULT_MAX_TEMPERATURE = 35.0
DEFAULT_SCHEDULE_TEMPLATES_VERSION = 2
DEFAULT_SCHEDULE_TEMPLATE_MIGRATIONS = {
    2: ("clear_day",),
}
DEFAULT_PRECONDITIONING_MAX_LEAD_MINUTES = 1440
MAX_PRECONDITIONING_LEAD_MINUTES = 1440
DEFAULT_PRECONDITIONING_MINIMUM_DELTA = 0.3
DEFAULT_PRECONDITIONING_MIN_START_MINUTES = 10
DEFAULT_PRECONDITIONING_HISTORY_SIZE = 120
DEFAULT_PRECONDITIONING_SIMILAR_SAMPLE_COUNT = 25
DEFAULT_PRECONDITIONING_COMFORT_PERCENTILE = 80
DEFAULT_PRECONDITIONING_PARTIAL_EXPIRY_DAYS = 30
DEFAULT_PRECONDITIONING_RECENCY_DECAY_DAYS = 30
DEFAULT_PRECONDITIONING_FALLBACK_MINUTES_PER_DEGREE = 25
DEFAULT_ROOM_SENSOR_ASSIST_MAX_DELTA = 2.0
DEFAULT_ROOM_SENSOR_ASSIST_DEBOUNCE_SECONDS = 20
DEFAULT_COMFORT_TEMPERATURE_MIN = 20.0
DEFAULT_COMFORT_TEMPERATURE_MAX = 24.0
DEFAULT_COMFORT_HUMIDITY_MIN = 40.0
DEFAULT_COMFORT_HUMIDITY_MAX = 60.0
DEFAULT_COMFORT_CO2_ATTENTION = 1000
DEFAULT_COMFORT_CO2_POOR = 1500
DEFAULT_COMFORT_STALE_AFTER_MINUTES = 120
MAX_PRECONDITIONING_INVALID_OBSERVATIONS = 10
MIN_PRECONDITIONING_COMPLETE_SAMPLES = 5
PARTIAL_PRECONDITIONING_FLOOR_INCREMENT_RATIO = 0.2
PRECONDITIONING_OBSERVATION_QUALITIES = ("complete", "partial", "invalid")
PRECONDITIONING_OBSERVATION_DIRECTIONS = ("heat", "cool")
PRECONDITIONING_LEAD_SOURCES = ("history", "initial_model", "unsupported")
CLIMATE_OPTION_STRING_FIELDS = (
    ATTR_FAN_MODE,
    ATTR_PRESET_MODE,
    ATTR_SWING_MODE,
    ATTR_SWING_HORIZONTAL_MODE,
)
CLIMATE_OPTION_NUMERIC_FIELDS = (ATTR_HUMIDITY,)
CLIMATE_OPTION_FIELDS = CLIMATE_OPTION_STRING_FIELDS + CLIMATE_OPTION_NUMERIC_FIELDS
PROFILE_ACCENT_COLORS = (
    "#3949ab",
    "#00897b",
    "#7b1fa2",
    "#d84315",
    "#00838f",
    "#c2185b",
    "#5d4037",
    "#2e7d32",
)
PROFILE_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


class ScheduleBlock(TypedDict):
    """A single schedule change."""

    start: str
    action: NotRequired[str]
    temperature: NotRequired[float]
    hvac_mode: NotRequired[str]
    fan_mode: NotRequired[str]
    preset_mode: NotRequired[str]
    swing_mode: NotRequired[str]
    swing_horizontal_mode: NotRequired[str]
    humidity: NotRequired[float]


class ZoneOverride(TypedDict):
    """A temporary override for one zone."""

    type: str
    started_at: NotRequired[str]
    until: NotRequired[str]
    temperature: NotRequired[float]
    hvac_mode: NotRequired[str]
    fan_mode: NotRequired[str]
    preset_mode: NotRequired[str]
    swing_mode: NotRequired[str]
    swing_horizontal_mode: NotRequired[str]
    humidity: NotRequired[float]
    action: NotRequired[str]
    previous_state: NotRequired["ClimateStateSnapshot"]


class ClimateStateSnapshot(TypedDict, total=False):
    """Stored climate state captured before a temporary override."""

    hvac_mode: str
    temperature: float
    fan_mode: str
    preset_mode: str
    swing_mode: str
    swing_horizontal_mode: str
    humidity: float


class PreconditioningData(TypedDict):
    """Stored preconditioning settings for one climate zone."""

    enabled: bool
    max_lead_minutes: int
    minimum_delta_temperature: float
    learning_history_size: int
    similar_sample_count: int
    comfort_percentile: int
    adaptive_percentile_enabled: bool
    partial_expiry_days: int
    recency_decay_days: int
    min_start_minutes: int
    fallback_minutes_per_degree: float
    use_outdoor_temperature: bool
    outdoor_temperature_entity_id: str | None
    room_temperature_entity_id: str | None
    room_sensor_assist_enabled: bool
    room_sensor_assist_max_delta: float
    room_sensor_assist_debounce_seconds: int


class ComfortData(TypedDict):
    """Stored comfort monitoring settings for one climate zone."""

    enabled: bool
    temperature_entity_id: str | None
    humidity_enabled: bool
    humidity_entity_id: str | None
    co2_entity_id: str | None
    temperature_min: float
    temperature_max: float
    humidity_min: float
    humidity_max: float
    co2_attention: int
    co2_poor: int
    stale_after_minutes: int


class PreconditioningObservation(TypedDict, total=False):
    """One local adaptive preconditioning learning sample."""

    entity_id: str
    mode: str
    created_at: str
    scheduled_time: str
    start_time: str
    target_temp: float
    initial_temp: float
    observed_temp: float
    outdoor_temp_start: float | None
    outdoor_temp_target: float | None
    temperature_source: str
    room_temperature_entity_id: str | None
    delta_t: float
    startup_minutes: int
    reached: bool
    minutes_to_reach: int | None
    quality: str
    invalid_reason: str


class PreconditioningPredictionDiagnostics(TypedDict):
    """Intermediate adaptive preconditioning prediction values."""

    direction: str
    delta_temperature: float
    complete_sample_count: int
    partial_sample_count: int
    invalid_sample_count: int
    similar_sample_count: int
    comfort_percentile: int
    complete_rate_minutes_per_degree: float | None
    complete_estimate_minutes: float | None
    partial_floor_minutes: int
    combined_estimate_minutes: float
    rounded_estimate_minutes: int
    final_lead_minutes: int | None
    limited_by_min_start: bool
    limited_by_max_lead: bool
    source: str | None
    used_outdoor_temperature: bool
    initial_model_lead_minutes: int | None


class PreconditioningPrediction(TypedDict):
    """Adaptive preconditioning prediction details."""

    recommended_lead_minutes: int | None
    source: str | None
    complete_sample_count: int
    partial_sample_count: int
    invalid_sample_count: int
    similar_sample_count: int
    comfort_percentile: int
    used_outdoor_temperature: bool
    initial_model_lead_minutes: int | None
    diagnostics: PreconditioningPredictionDiagnostics | None


class PreconditioningDirectionLearningData(TypedDict):
    """Stored local adaptive preconditioning learning data for one direction."""

    observations: list[PreconditioningObservation]


class PreconditioningLearningData(TypedDict):
    """Stored local adaptive preconditioning learning data."""

    heat: PreconditioningDirectionLearningData
    cool: PreconditioningDirectionLearningData


class ZoneData(TypedDict):
    """Stored state for one climate zone."""

    enabled: bool
    schedule: dict[str, list[ScheduleBlock]]
    override: NotRequired[ZoneOverride | None]
    preconditioning: PreconditioningData
    comfort: ComfortData


class ScheduleTemplateData(TypedDict):
    """A reusable schedule template."""

    key: str
    name: str
    blocks: list[ScheduleBlock]


class PanelSettingsData(TypedDict):
    """Stored panel preferences."""

    first_weekday: str
    zone_order: list[str]
    min_temperature: float
    max_temperature: float


class GlobalData(TypedDict):
    """Stored global scheduler state."""

    mode: str
    paused_until: NotRequired[str | None]
    paused_started_at: NotRequired[str | None]
    active_profile_id: NotRequired[str | None]


class ClimateProfileZoneData(TypedDict):
    """One sparse zone behavior stored in a climate profile."""

    behavior: str
    schedule: NotRequired[dict[str, list[ScheduleBlock]]]
    action: NotRequired[str]


class ClimateProfileData(TypedDict):
    """A reusable whole-home climate profile."""

    key: str
    name: str
    icon: str
    color: str
    description: str
    zones: dict[str, ClimateProfileZoneData]


class SchedulerData(TypedDict):
    """Stored scheduler data."""

    version: int
    zones: dict[str, ZoneData]
    global_: GlobalData
    settings: PanelSettingsData
    templates: list[ScheduleTemplateData]
    templates_seeded: bool
    templates_seeded_version: int
    preconditioning_learning: dict[str, PreconditioningLearningData]
    profiles: list[ClimateProfileData]


DEFAULT_SCHEDULE_TEMPLATES: list[ScheduleTemplateData] = [
    {
        "key": "home_day",
        "name": "Home day",
        "blocks": [
            {
                "start": "07:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
            },
            {
                "start": "23:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 17,
            },
        ],
    },
    {
        "key": "away_workday",
        "name": "Away workday",
        "blocks": [
            {
                "start": "06:30",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
            },
            {
                "start": "08:30",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 18,
            },
            {
                "start": "17:30",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
            },
            {
                "start": "23:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 17,
            },
        ],
    },
    {
        "key": "all_day_comfort",
        "name": "All-day comfort",
        "blocks": [
            {
                "start": "00:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
            }
        ],
    },
    {
        "key": "night_setback",
        "name": "Night setback",
        "blocks": [
            {
                "start": "00:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 17,
            },
            {
                "start": "06:30",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
            },
            {
                "start": "23:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 17,
            },
        ],
    },
    {
        "key": "off_day",
        "name": "Off all day",
        "blocks": [
            {
                "start": "00:00",
                "action": ACTION_TURN_OFF,
            }
        ],
    },
    {
        "key": "clear_day",
        "name": "Clear day",
        "blocks": [],
    },
]


@dataclass(frozen=True, slots=True)
class ClimateEvent:
    """A resolved climate event."""

    entity_id: str
    when: datetime
    temperature: float | None
    weekday: str
    start: str
    action: str = ACTION_SET_TEMPERATURE
    hvac_mode: str | None = None
    fan_mode: str | None = None
    preset_mode: str | None = None
    swing_mode: str | None = None
    swing_horizontal_mode: str | None = None
    humidity: float | None = None
    target_when: datetime | None = None
    preconditioning_diagnostics: PreconditioningPredictionDiagnostics | None = None


def empty_week_schedule() -> dict[str, list[ScheduleBlock]]:
    """Return an empty schedule for every weekday."""
    return {day: [] for day in WEEKDAYS}


def normalize_schedule_blocks(raw_blocks: list[dict[str, Any]]) -> list[ScheduleBlock]:
    """Normalize, validate, and sort schedule blocks."""
    normalized: list[ScheduleBlock] = []
    seen_starts: set[str] = set()

    for block in raw_blocks:
        start = normalize_start_time(str(block["start"]))
        if start in seen_starts:
            raise ValueError(f"Duplicate schedule start time: {start}")

        action = str(block.get("action", ACTION_SET_TEMPERATURE))
        normalized_block: ScheduleBlock = {
            "start": start,
            "action": action,
        }

        if action == ACTION_TURN_OFF:
            normalized.append(normalized_block)
            seen_starts.add(start)
            continue

        if action != ACTION_SET_TEMPERATURE:
            raise ValueError(f"Invalid schedule action: {action}")

        if "temperature" not in block:
            raise ValueError(f"Missing temperature for schedule block: {start}")

        normalized_block["temperature"] = float(block["temperature"])
        hvac_mode = block.get("hvac_mode")
        if isinstance(hvac_mode, str) and hvac_mode:
            normalized_block["hvac_mode"] = hvac_mode
        _copy_climate_options(block, normalized_block)

        normalized.append(normalized_block)
        seen_starts.add(start)

    return sorted(normalized, key=lambda block: block["start"])


def normalize_start_time(value: str) -> str:
    """Normalize an HH:MM time string."""
    try:
        hour_text, minute_text = value.split(":", 1)
        hour = int(hour_text)
        minute = int(minute_text)
    except ValueError as err:
        raise ValueError(f"Invalid schedule start time: {value}") from err

    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError(f"Invalid schedule start time: {value}")

    return f"{hour:02d}:{minute:02d}"


def climate_options_from_block(block: ScheduleBlock | dict[str, Any]) -> dict[str, Any]:
    """Return the optional climate settings stored in a schedule block."""
    options: dict[str, Any] = {}
    for field in CLIMATE_OPTION_STRING_FIELDS:
        value = block.get(field)
        if isinstance(value, str) and value:
            options[field] = value

    for field in CLIMATE_OPTION_NUMERIC_FIELDS:
        if field not in block:
            continue
        try:
            value = float(block[field])
        except (TypeError, ValueError):
            continue
        options[field] = value

    return options


def _copy_climate_options(
    source: ScheduleBlock | dict[str, Any],
    target: ScheduleBlock | dict[str, Any],
) -> None:
    """Copy valid optional climate settings from one block into another."""
    target.update(climate_options_from_block(source))


def normalize_schedule_data(
    raw_data: dict[str, Any] | None,
    climate_entities: list[str],
) -> SchedulerData:
    """Normalize stored data and ensure selected zones exist."""
    data: dict[str, Any] = raw_data or {}
    zones: dict[str, ZoneData] = {}

    configured_entities = set(climate_entities)

    for entity_id, zone_data in data.get("zones", {}).items():
        if not isinstance(entity_id, str) or not isinstance(zone_data, dict):
            continue
        if entity_id not in configured_entities:
            continue

        raw_schedule = zone_data.get("schedule", {})
        schedule = empty_week_schedule()
        if isinstance(raw_schedule, dict):
            for weekday in WEEKDAYS:
                raw_blocks = raw_schedule.get(weekday, [])
                if not isinstance(raw_blocks, list):
                    continue

                valid_blocks = [
                    block
                    for block in raw_blocks
                    if isinstance(block, dict)
                    and "start" in block
                    and (
                        "temperature" in block
                        or block.get("action") == ACTION_TURN_OFF
                    )
                ]
                try:
                    schedule[weekday] = normalize_schedule_blocks(valid_blocks)
                except ValueError:
                    schedule[weekday] = []

        zones[entity_id] = {
            "enabled": bool(zone_data.get("enabled", True)),
            "schedule": schedule,
            "override": _normalize_zone_override(zone_data.get("override")),
            "preconditioning": normalize_preconditioning_data(
                zone_data.get("preconditioning")
            ),
            "comfort": normalize_comfort_data(zone_data.get("comfort")),
        }

    for entity_id in climate_entities:
        zones.setdefault(
            entity_id,
            {
                "enabled": True,
                "schedule": empty_week_schedule(),
                "override": None,
                "preconditioning": normalize_preconditioning_data(None),
                "comfort": normalize_comfort_data(None),
            },
        )

    global_data = data.get("global", data.get("global_", {}))
    if not isinstance(global_data, dict):
        global_data = {}
    mode = str(global_data.get("mode", MODE_AUTO))
    if mode == "boost":
        mode = MODE_AUTO
    elif mode not in (MODE_AUTO, MODE_PAUSED):
        mode = MODE_PAUSED

    templates_seeded = bool(data.get("templates_seeded"))
    templates_seeded_version = _normalize_templates_seeded_version(
        data.get("templates_seeded_version"),
        templates_seeded,
    )
    templates = normalize_schedule_templates(data.get("templates"))
    default_templates = normalize_schedule_templates(DEFAULT_SCHEDULE_TEMPLATES)
    if not templates_seeded:
        templates = [
            *default_templates,
            *templates,
        ]
        templates_seeded = True
        templates_seeded_version = DEFAULT_SCHEDULE_TEMPLATES_VERSION
    elif templates_seeded_version < DEFAULT_SCHEDULE_TEMPLATES_VERSION:
        templates = _add_missing_migrated_default_templates(
            templates,
            default_templates,
            templates_seeded_version,
        )
        templates_seeded_version = DEFAULT_SCHEDULE_TEMPLATES_VERSION

    profiles = normalize_climate_profiles(data.get("profiles"), climate_entities)
    profile_keys = {profile["key"] for profile in profiles}
    active_profile_id = global_data.get("active_profile_id")
    if not isinstance(active_profile_id, str) or active_profile_id not in profile_keys:
        active_profile_id = None

    return {
        "version": 2,
        "zones": zones,
        "global_": {
            "mode": mode,
            "paused_until": global_data.get("paused_until"),
            "paused_started_at": global_data.get("paused_started_at"),
            "active_profile_id": active_profile_id,
        },
        "settings": normalize_panel_settings(data.get("settings"), climate_entities),
        "templates": _dedupe_schedule_templates(templates),
        "templates_seeded": templates_seeded,
        "templates_seeded_version": templates_seeded_version,
        "preconditioning_learning": normalize_preconditioning_learning_data(
            data.get("preconditioning_learning"),
            climate_entities,
            {
                entity_id: zone["preconditioning"]["learning_history_size"]
                for entity_id, zone in zones.items()
            },
        ),
        "profiles": profiles,
    }


def serialize_schedule_data(data: SchedulerData) -> dict[str, Any]:
    """Serialize scheduler data using storage-friendly keys."""
    return {
        "version": data["version"],
        "zones": data["zones"],
        "global": data["global_"],
        "settings": data.get(
            "settings",
            normalize_panel_settings(None, list(data["zones"])),
        ),
        "templates": data.get("templates", []),
        "templates_seeded": data.get("templates_seeded", False),
        "templates_seeded_version": data.get("templates_seeded_version", 0),
        "preconditioning_learning": data.get(
            "preconditioning_learning",
            normalize_preconditioning_learning_data(
                None,
                list(data["zones"]),
                {
                    entity_id: zone["preconditioning"]["learning_history_size"]
                    for entity_id, zone in data["zones"].items()
                },
            ),
        ),
        "profiles": data.get("profiles", []),
    }


def normalize_climate_profiles(
    raw_profiles: Any,
    climate_entities: list[str],
) -> list[ClimateProfileData]:
    """Normalize profiles and discard duplicate, malformed, or unmanaged data."""
    if not isinstance(raw_profiles, list):
        return []

    managed = set(climate_entities)
    profiles: list[ClimateProfileData] = []
    seen_keys: set[str] = set()
    for raw_profile in raw_profiles:
        if not isinstance(raw_profile, dict):
            continue
        key = raw_profile.get("key")
        name = raw_profile.get("name")
        if not isinstance(key, str) or not key.strip() or key.strip() in seen_keys:
            continue
        if not isinstance(name, str) or not name.strip():
            continue

        zones: dict[str, ClimateProfileZoneData] = {}
        raw_zones = raw_profile.get("zones")
        if isinstance(raw_zones, dict):
            for entity_id, raw_zone in raw_zones.items():
                if entity_id not in managed or not isinstance(raw_zone, dict):
                    continue
                behavior = raw_zone.get("behavior", "normal")
                if behavior == "normal":
                    zones[entity_id] = {"behavior": "normal"}
                    continue
                if behavior == "pause":
                    action = raw_zone.get("action", ZONE_PAUSE_ACTION_NONE)
                    if action not in ZONE_PAUSE_ACTION_OPTIONS:
                        action = ZONE_PAUSE_ACTION_NONE
                    zones[entity_id] = {"behavior": "pause", "action": action}
                    continue
                if behavior != "schedule":
                    continue

                schedule = empty_week_schedule()
                raw_schedule = raw_zone.get("schedule")
                if isinstance(raw_schedule, dict):
                    for weekday in WEEKDAYS:
                        blocks = raw_schedule.get(weekday, [])
                        if not isinstance(blocks, list):
                            continue
                        valid_blocks = [
                            block
                            for block in blocks
                            if isinstance(block, dict)
                            and "start" in block
                            and (
                                "temperature" in block
                                or block.get("action") == ACTION_TURN_OFF
                            )
                        ]
                        try:
                            schedule[weekday] = normalize_schedule_blocks(valid_blocks)
                        except ValueError:
                            schedule[weekday] = []
                zones[entity_id] = {"behavior": "schedule", "schedule": schedule}

        color = raw_profile.get("color")
        if not isinstance(color, str) or not PROFILE_COLOR_PATTERN.fullmatch(color):
            color = climate_profile_color(key.strip())

        profiles.append(
            {
                "key": key.strip(),
                "name": name.strip(),
                "icon": str(raw_profile.get("icon", "")).strip(),
                "color": color.lower(),
                "description": str(raw_profile.get("description", "")).strip(),
                "zones": zones,
            }
        )
        seen_keys.add(key.strip())
    return profiles


def validate_climate_profiles(
    raw_profiles: Any,
    climate_entities: list[str],
) -> list[ClimateProfileData]:
    """Strictly validate profile input before using tolerant normalization."""
    if not isinstance(raw_profiles, list):
        raise ValueError("Profiles must be a list")

    managed = set(climate_entities)
    seen_keys: set[str] = set()
    prepared: list[dict[str, Any]] = []
    profile_fields = {"key", "name", "icon", "color", "description", "zones"}
    zone_fields = {"behavior", "action", "schedule"}
    block_fields = {
        "start",
        "action",
        "temperature",
        "hvac_mode",
        *CLIMATE_OPTION_FIELDS,
    }

    for index, raw_profile in enumerate(raw_profiles):
        if not isinstance(raw_profile, dict):
            raise ValueError(f"Profile at index {index} must be an object")
        unknown_profile_fields = set(raw_profile) - profile_fields
        if unknown_profile_fields:
            raise ValueError(
                f"Profile contains unsupported fields: {', '.join(sorted(unknown_profile_fields))}"
            )

        key = raw_profile.get("key")
        if not isinstance(key, str) or not key.strip():
            raise ValueError("Profile key is required")
        key = key.strip()
        if key in seen_keys:
            raise ValueError(f"Duplicate climate profile key: {key}")
        seen_keys.add(key)

        name = raw_profile.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"Profile name is required for {key}")
        for field in ("icon", "description"):
            value = raw_profile.get(field, "")
            if not isinstance(value, str):
                raise ValueError(f"Profile {field} must be text for {key}")
        color = raw_profile.get("color")
        if "color" in raw_profile and not is_valid_climate_profile_color(color):
            raise ValueError("Profile color must use the #RRGGBB format")

        raw_zones = raw_profile.get("zones", {})
        if not isinstance(raw_zones, dict):
            raise ValueError(f"Profile zones must be an object for {key}")
        prepared_zones: dict[str, ClimateProfileZoneData] = {}
        for entity_id, raw_zone in raw_zones.items():
            if not isinstance(entity_id, str) or entity_id not in managed:
                raise ValueError(
                    f"Climate entity is not managed by Velair: {entity_id}"
                )
            if not isinstance(raw_zone, dict):
                raise ValueError(f"Invalid profile behavior for {entity_id}")
            unknown_zone_fields = set(raw_zone) - zone_fields
            if unknown_zone_fields:
                raise ValueError(
                    f"Profile zone {entity_id} contains unsupported fields: "
                    f"{', '.join(sorted(unknown_zone_fields))}"
                )

            behavior = raw_zone.get("behavior")
            if behavior not in ("normal", "schedule", "pause"):
                raise ValueError(f"Invalid profile behavior for {entity_id}: {behavior}")
            if behavior == "normal":
                if set(raw_zone) != {"behavior"}:
                    raise ValueError(f"Normal profile behavior has extra data for {entity_id}")
                prepared_zones[entity_id] = {"behavior": "normal"}
                continue
            if behavior == "pause":
                if set(raw_zone) - {"behavior", "action"}:
                    raise ValueError(f"Pause profile behavior has extra data for {entity_id}")
                action = raw_zone.get("action", ZONE_PAUSE_ACTION_NONE)
                if action not in ZONE_PAUSE_ACTION_OPTIONS:
                    raise ValueError(f"Invalid profile pause action for {entity_id}")
                prepared_zones[entity_id] = {
                    "behavior": "pause",
                    "action": action,
                }
                continue

            if set(raw_zone) != {"behavior", "schedule"}:
                raise ValueError(f"Schedule profile behavior is invalid for {entity_id}")
            raw_schedule = raw_zone.get("schedule")
            if not isinstance(raw_schedule, dict) or set(raw_schedule) != set(WEEKDAYS):
                raise ValueError(
                    f"Profile schedule for {entity_id} must include every weekday"
                )
            schedule = empty_week_schedule()
            for weekday in WEEKDAYS:
                raw_blocks = raw_schedule[weekday]
                if not isinstance(raw_blocks, list):
                    raise ValueError(f"Invalid {weekday} schedule for {entity_id}")
                for block_index, block in enumerate(raw_blocks):
                    if not isinstance(block, dict):
                        raise ValueError(
                            f"Invalid block {block_index} in {weekday} for {entity_id}"
                        )
                    unknown_block_fields = set(block) - block_fields
                    if unknown_block_fields:
                        raise ValueError(
                            f"Schedule block contains unsupported fields for {entity_id}: "
                            f"{', '.join(sorted(unknown_block_fields))}"
                        )
                    if not isinstance(block.get("start"), str):
                        raise ValueError(
                            f"Schedule block start must be text for {entity_id}"
                        )
                    action = block.get("action", ACTION_SET_TEMPERATURE)
                    if not isinstance(action, str):
                        raise ValueError(f"Invalid schedule action for {entity_id}")
                    if action == ACTION_TURN_OFF:
                        if set(block) - {"start", "action"}:
                            raise ValueError(
                                f"Turn Off block has unsupported targets for {entity_id}"
                            )
                        continue
                    if action != ACTION_SET_TEMPERATURE:
                        raise ValueError(f"Invalid schedule action for {entity_id}: {action}")
                    temperature = block.get("temperature")
                    if (
                        not isinstance(temperature, (int, float))
                        or isinstance(temperature, bool)
                        or not isfinite(float(temperature))
                    ):
                        raise ValueError(
                            f"Schedule block temperature must be a finite number for {entity_id}"
                        )
                    for field in ("hvac_mode", *CLIMATE_OPTION_STRING_FIELDS):
                        if field in block and (
                            not isinstance(block[field], str) or not block[field]
                        ):
                            raise ValueError(
                                f"Schedule block {field} must be non-empty text for {entity_id}"
                            )
                    if ATTR_HUMIDITY in block:
                        humidity = block[ATTR_HUMIDITY]
                        if (
                            not isinstance(humidity, (int, float))
                            or isinstance(humidity, bool)
                            or not isfinite(float(humidity))
                        ):
                            raise ValueError(
                                f"Schedule block humidity must be a finite number for {entity_id}"
                            )
                try:
                    schedule[weekday] = normalize_schedule_blocks(raw_blocks)
                except (KeyError, TypeError, ValueError, OverflowError) as err:
                    raise ValueError(
                        f"Invalid {weekday} schedule for {entity_id}: {err}"
                    ) from err
            prepared_zones[entity_id] = {
                "behavior": "schedule",
                "schedule": schedule,
            }

        prepared.append(
            {
                "key": key,
                "name": name.strip(),
                "icon": raw_profile.get("icon", "").strip(),
                **({"color": color} if color is not None else {}),
                "description": raw_profile.get("description", "").strip(),
                "zones": prepared_zones,
            }
        )

    normalized = normalize_climate_profiles(prepared, climate_entities)
    if len(normalized) != len(prepared):
        raise ValueError("Profiles could not be normalized without data loss")
    return normalized


def climate_profile_color(key: str) -> str:
    """Return the stable default accent color for a profile key."""
    hash_value = 0
    for character in key:
        hash_value = ((hash_value << 5) - hash_value + ord(character)) & 0xFFFFFFFF
    if hash_value >= 0x80000000:
        hash_value -= 0x100000000
    return PROFILE_ACCENT_COLORS[abs(hash_value) % len(PROFILE_ACCENT_COLORS)]


def is_valid_climate_profile_color(value: Any) -> bool:
    """Return whether a value is a supported persisted profile color."""
    return isinstance(value, str) and PROFILE_COLOR_PATTERN.fullmatch(value) is not None


def normalize_panel_settings(
    raw_settings: Any,
    climate_entities: list[str],
) -> PanelSettingsData:
    """Normalize stored panel preferences."""
    settings = raw_settings if isinstance(raw_settings, dict) else {}
    first_weekday = settings.get("first_weekday")
    if first_weekday not in WEEKDAYS:
        first_weekday = "monday"

    known_entities = set(climate_entities)
    raw_zone_order = settings.get("zone_order", [])
    zone_order = (
        [
            entity_id
            for entity_id in raw_zone_order
            if isinstance(entity_id, str) and entity_id in known_entities
        ]
        if isinstance(raw_zone_order, list)
        else []
    )

    min_temperature = _normalize_temperature_limit(
        settings.get("min_temperature"),
        DEFAULT_MIN_TEMPERATURE,
    )
    max_temperature = _normalize_temperature_limit(
        settings.get("max_temperature"),
        DEFAULT_MAX_TEMPERATURE,
    )
    if min_temperature >= max_temperature:
        min_temperature = DEFAULT_MIN_TEMPERATURE
        max_temperature = DEFAULT_MAX_TEMPERATURE

    return {
        "first_weekday": str(first_weekday),
        "zone_order": zone_order,
        "min_temperature": min_temperature,
        "max_temperature": max_temperature,
    }


def normalize_preconditioning_data(raw_data: Any) -> PreconditioningData:
    """Normalize stored preconditioning settings."""
    data = raw_data if isinstance(raw_data, dict) else {}

    max_lead_minutes = _normalize_minutes(
        data.get("max_lead_minutes"),
        DEFAULT_PRECONDITIONING_MAX_LEAD_MINUTES,
    )

    return {
        "enabled": bool(data.get("enabled", False)),
        "max_lead_minutes": max_lead_minutes,
        "minimum_delta_temperature": _normalize_preconditioning_delta(
            data.get("minimum_delta_temperature")
        ),
        "learning_history_size": _normalize_int(
            data.get("learning_history_size"),
            DEFAULT_PRECONDITIONING_HISTORY_SIZE,
            minimum=10,
            maximum=500,
        ),
        "similar_sample_count": _normalize_int(
            data.get("similar_sample_count"),
            DEFAULT_PRECONDITIONING_SIMILAR_SAMPLE_COUNT,
            minimum=5,
            maximum=100,
        ),
        "comfort_percentile": _normalize_int(
            data.get("comfort_percentile"),
            DEFAULT_PRECONDITIONING_COMFORT_PERCENTILE,
            minimum=50,
            maximum=95,
        ),
        "adaptive_percentile_enabled": bool(
            data.get("adaptive_percentile_enabled", True)
        ),
        "partial_expiry_days": _normalize_int(
            data.get("partial_expiry_days"),
            DEFAULT_PRECONDITIONING_PARTIAL_EXPIRY_DAYS,
            minimum=1,
            maximum=365,
        ),
        "recency_decay_days": _normalize_int(
            data.get("recency_decay_days"),
            DEFAULT_PRECONDITIONING_RECENCY_DECAY_DAYS,
            minimum=1,
            maximum=365,
        ),
        "min_start_minutes": _normalize_int(
            data.get("min_start_minutes"),
            DEFAULT_PRECONDITIONING_MIN_START_MINUTES,
            minimum=0,
            maximum=MAX_PRECONDITIONING_LEAD_MINUTES,
        ),
        "fallback_minutes_per_degree": _normalize_float(
            data.get("fallback_minutes_per_degree"),
            DEFAULT_PRECONDITIONING_FALLBACK_MINUTES_PER_DEGREE,
            # Model normalization operates in canonical minutes per °C.
            minimum=1,
            maximum=120,
        ),
        "use_outdoor_temperature": bool(data.get("use_outdoor_temperature", True)),
        "outdoor_temperature_entity_id": _normalize_optional_entity_id(
            data.get("outdoor_temperature_entity_id")
        ),
        "room_temperature_entity_id": _normalize_optional_entity_id(
            data.get("room_temperature_entity_id")
        ),
        "room_sensor_assist_enabled": bool(data.get("room_sensor_assist_enabled", False)),
        "room_sensor_assist_max_delta": _normalize_float(
            data.get("room_sensor_assist_max_delta"),
            DEFAULT_ROOM_SENSOR_ASSIST_MAX_DELTA,
            minimum=0.1,
            maximum=18.0,
        ),
        "room_sensor_assist_debounce_seconds": _normalize_int(
            data.get("room_sensor_assist_debounce_seconds"),
            DEFAULT_ROOM_SENSOR_ASSIST_DEBOUNCE_SECONDS,
            minimum=0,
            maximum=300,
        ),
    }


def normalize_comfort_data(raw_data: Any) -> ComfortData:
    """Normalize stored comfort monitoring settings."""
    data = raw_data if isinstance(raw_data, dict) else {}

    temperature_min = _normalize_temperature_limit(
        data.get("temperature_min"),
        DEFAULT_COMFORT_TEMPERATURE_MIN,
    )
    temperature_max = _normalize_temperature_limit(
        data.get("temperature_max"),
        DEFAULT_COMFORT_TEMPERATURE_MAX,
    )
    if temperature_min >= temperature_max:
        temperature_min = DEFAULT_COMFORT_TEMPERATURE_MIN
        temperature_max = DEFAULT_COMFORT_TEMPERATURE_MAX

    humidity_min = _normalize_float(
        data.get("humidity_min"),
        DEFAULT_COMFORT_HUMIDITY_MIN,
        minimum=0,
        maximum=100,
    )
    humidity_max = _normalize_float(
        data.get("humidity_max"),
        DEFAULT_COMFORT_HUMIDITY_MAX,
        minimum=0,
        maximum=100,
    )
    if humidity_min >= humidity_max:
        humidity_min = DEFAULT_COMFORT_HUMIDITY_MIN
        humidity_max = DEFAULT_COMFORT_HUMIDITY_MAX

    co2_attention = _normalize_int(
        data.get("co2_attention"),
        DEFAULT_COMFORT_CO2_ATTENTION,
        minimum=400,
        maximum=10000,
    )
    co2_poor = _normalize_int(
        data.get("co2_poor"),
        DEFAULT_COMFORT_CO2_POOR,
        minimum=400,
        maximum=10000,
    )
    if co2_attention >= co2_poor:
        co2_attention = DEFAULT_COMFORT_CO2_ATTENTION
        co2_poor = DEFAULT_COMFORT_CO2_POOR

    return {
        "enabled": bool(data.get("enabled", False)),
        "temperature_entity_id": _normalize_optional_entity_id(
            data.get("temperature_entity_id")
        ),
        "humidity_enabled": bool(data.get("humidity_enabled", True)),
        "humidity_entity_id": _normalize_optional_entity_id(
            data.get("humidity_entity_id")
        ),
        "co2_entity_id": _normalize_optional_entity_id(data.get("co2_entity_id")),
        "temperature_min": temperature_min,
        "temperature_max": temperature_max,
        "humidity_min": humidity_min,
        "humidity_max": humidity_max,
        "co2_attention": co2_attention,
        "co2_poor": co2_poor,
        "stale_after_minutes": _normalize_int(
            data.get("stale_after_minutes"),
            DEFAULT_COMFORT_STALE_AFTER_MINUTES,
            minimum=5,
            maximum=1440,
        ),
    }


def predict_preconditioning_lead(
    raw_observations: Any,
    mode: str,
    *,
    target_temp: float,
    current_temp: float,
    config: PreconditioningData,
    now: datetime | None = None,
    outdoor_temp_target: float | None = None,
    temperature_delta_scale: float = 1.0,
) -> PreconditioningPrediction:
    """Predict adaptive lead minutes using similar local learning samples."""
    prediction_now = now or datetime.now().astimezone()
    delta_t = _preconditioning_delta_for_mode(mode, target_temp, current_temp)
    observations = raw_observations if isinstance(raw_observations, list) else []
    comfort_percentile = preconditioning_comfort_percentile(
        observations,
        mode,
        config,
    )
    empty_prediction: PreconditioningPrediction = {
        "recommended_lead_minutes": None,
        "source": None,
        "complete_sample_count": 0,
        "partial_sample_count": 0,
        "invalid_sample_count": 0,
        "similar_sample_count": 0,
        "comfort_percentile": comfort_percentile,
        "used_outdoor_temperature": False,
        "initial_model_lead_minutes": None,
        "diagnostics": None,
    }
    if mode not in PRECONDITIONING_OBSERVATION_DIRECTIONS:
        return empty_prediction
    if delta_t <= config["minimum_delta_temperature"]:
        return empty_prediction

    valid_samples = [
        observation
        for observation in observations
        if _preconditioning_observation_is_valid(observation, mode, config)
    ]
    invalid_count = sum(
        1
        for observation in observations
        if isinstance(observation, dict)
        and observation.get("mode") == mode
        and observation.get("quality") == "invalid"
    )
    current_context = {
        "delta_t": delta_t,
        "target_temp": target_temp,
        "outdoor_temp_target": outdoor_temp_target,
    }
    similar_samples, used_outdoor = _similar_preconditioning_samples(
        valid_samples,
        current_context,
        config,
        temperature_delta_scale,
    )
    complete_samples = [
        sample
        for sample in similar_samples
        if sample.get("quality") == "complete"
        and sample.get("reached") is True
        and isinstance(sample.get("minutes_to_reach"), int)
    ]
    partial_samples = [
        sample
        for sample in similar_samples
        if sample.get("quality") == "partial" and sample.get("reached") is False
    ]

    initial_model_lead = _initial_preconditioning_model_lead(
        delta_t,
        config,
    )
    if len(complete_samples) >= MIN_PRECONDITIONING_COMPLETE_SAMPLES:
        complete_rate = _weighted_percentile(
            [
                _preconditioning_minutes_per_degree(sample)
                for sample in complete_samples
            ],
            [
                _preconditioning_recency_weight(
                    str(sample["created_at"]),
                    prediction_now,
                    config["recency_decay_days"],
                )
                * _preconditioning_similarity_weight(
                    _preconditioning_distance(current_context, sample)
                    * temperature_delta_scale
                )
                for sample in complete_samples
            ],
            empty_prediction["comfort_percentile"],
        )
        complete_estimate = complete_rate * delta_t
        source = "history"
    else:
        complete_rate = None
        complete_estimate = initial_model_lead
        source = "initial_model"

    partial_floor = _partial_preconditioning_floor(
        partial_samples,
        valid_samples,
        config,
        prediction_now,
        temperature_delta_scale,
    )
    combined_estimate = max(complete_estimate, partial_floor)
    rounded_estimate = _round_up_to_next_5(combined_estimate)
    limited_by_min_start = rounded_estimate < config["min_start_minutes"]
    limited_by_max_lead = rounded_estimate > config["max_lead_minutes"]
    if limited_by_min_start:
        final_estimate = 0
    else:
        final_estimate = max(
            config["min_start_minutes"],
            min(config["max_lead_minutes"], rounded_estimate),
        )
    recommended_lead = final_estimate if final_estimate > 0 else None
    diagnostics: PreconditioningPredictionDiagnostics = {
        "direction": mode,
        "delta_temperature": round(delta_t, 3),
        "complete_sample_count": len(complete_samples),
        "partial_sample_count": len(partial_samples),
        "invalid_sample_count": invalid_count,
        "similar_sample_count": len(similar_samples),
        "comfort_percentile": empty_prediction["comfort_percentile"],
        "complete_rate_minutes_per_degree": (
            round(complete_rate, 3) if complete_rate is not None else None
        ),
        "complete_estimate_minutes": round(complete_estimate, 3),
        "partial_floor_minutes": partial_floor,
        "combined_estimate_minutes": round(combined_estimate, 3),
        "rounded_estimate_minutes": rounded_estimate,
        "final_lead_minutes": recommended_lead,
        "limited_by_min_start": limited_by_min_start,
        "limited_by_max_lead": limited_by_max_lead,
        "source": source if recommended_lead is not None else None,
        "used_outdoor_temperature": used_outdoor,
        "initial_model_lead_minutes": initial_model_lead,
    }

    return {
        "recommended_lead_minutes": recommended_lead,
        "source": source if recommended_lead is not None else None,
        "complete_sample_count": len(complete_samples),
        "partial_sample_count": len(partial_samples),
        "invalid_sample_count": invalid_count,
        "similar_sample_count": len(similar_samples),
        "comfort_percentile": empty_prediction["comfort_percentile"],
        "used_outdoor_temperature": used_outdoor,
        "initial_model_lead_minutes": initial_model_lead,
        "diagnostics": diagnostics,
    }


def _preconditioning_delta_for_mode(
    mode: str,
    target_temp: float,
    current_temp: float,
) -> float:
    """Return positive useful delta for heating or cooling."""
    if mode == "heat":
        return target_temp - current_temp
    if mode == "cool":
        return current_temp - target_temp
    return 0.0


def _preconditioning_observation_is_valid(
    observation: Any,
    mode: str,
    config: PreconditioningData,
) -> bool:
    """Return whether one observation can participate in prediction."""
    if not isinstance(observation, dict):
        return False
    if observation.get("quality") not in ("complete", "partial"):
        return False
    if observation.get("mode") != mode:
        return False
    if not isinstance(observation.get("delta_t"), (int, float)):
        return False
    if float(observation["delta_t"]) <= config["minimum_delta_temperature"]:
        return False
    if not isinstance(observation.get("startup_minutes"), int):
        return False
    if int(observation["startup_minutes"]) <= 0:
        return False
    if observation.get("quality") == "complete":
        return (
            observation.get("reached") is True
            and isinstance(observation.get("minutes_to_reach"), int)
            and 3 <= int(observation["minutes_to_reach"]) <= config["max_lead_minutes"]
        )
    return observation.get("reached") is False


def _preconditioning_minutes_per_degree(
    sample: PreconditioningObservation,
) -> float:
    """Return the thermal effort rate represented by one complete sample."""
    return int(sample["minutes_to_reach"]) / float(sample["delta_t"])


def _similar_preconditioning_samples(
    samples: list[PreconditioningObservation],
    current_context: dict[str, float | None],
    config: PreconditioningData,
    temperature_delta_scale: float = 1.0,
) -> tuple[list[PreconditioningObservation], bool]:
    """Return the most similar samples for the current prediction context."""
    candidate_samples = samples
    used_outdoor = False
    current_outdoor = current_context.get("outdoor_temp_target")
    if current_outdoor is not None:
        outdoor_samples = [
            sample
            for sample in samples
            if sample.get("outdoor_temp_target") is not None
        ]
        outdoor_complete_count = sum(
            1 for sample in outdoor_samples if sample.get("quality") == "complete"
        )
        if outdoor_complete_count >= MIN_PRECONDITIONING_COMPLETE_SAMPLES:
            candidate_samples = outdoor_samples
            used_outdoor = True

    ordered = sorted(
        candidate_samples,
        key=lambda sample: (
            _preconditioning_distance(current_context, sample)
            * temperature_delta_scale
        ),
    )
    return ordered[: config["similar_sample_count"]], used_outdoor


def _preconditioning_distance(
    current_context: dict[str, float | None],
    sample: PreconditioningObservation,
) -> float:
    """Return similarity distance between a prediction context and a sample."""
    current_delta = float(current_context["delta_t"] or 0)
    current_target = float(current_context["target_temp"] or 0)
    sample_delta = float(sample.get("delta_t", 0))
    sample_target = float(sample.get("target_temp", 0))
    distance = abs(current_delta - sample_delta) + abs(current_target - sample_target)
    current_outdoor = current_context.get("outdoor_temp_target")
    sample_outdoor = sample.get("outdoor_temp_target")
    if current_outdoor is not None and sample_outdoor is not None:
        distance += abs(float(current_outdoor) - float(sample_outdoor)) / 5
    return distance


def _preconditioning_similarity_weight(distance: float) -> float:
    """Return a smooth weight multiplier for one similarity distance."""
    return exp(-max(0.0, distance))


def _sample_to_sample_preconditioning_distance(
    sample: PreconditioningObservation,
    other: PreconditioningObservation,
) -> float:
    """Return similarity distance between two stored samples."""
    context = {
        "delta_t": sample.get("delta_t"),
        "target_temp": sample.get("target_temp"),
        "outdoor_temp_target": sample.get("outdoor_temp_target"),
    }
    return _preconditioning_distance(context, other)


def _partial_preconditioning_floor(
    partial_samples: list[PreconditioningObservation],
    valid_samples: list[PreconditioningObservation],
    config: PreconditioningData,
    now: datetime,
    temperature_delta_scale: float = 1.0,
) -> int:
    """Return the lower bound implied by active censored partial samples."""
    floor_values: list[int] = []
    for sample in partial_samples:
        if _partial_preconditioning_sample_expired(
            sample,
            valid_samples,
            config,
            now,
            temperature_delta_scale,
        ):
            continue
        startup_minutes = int(sample["startup_minutes"])
        increment = max(
            1,
            ceil(startup_minutes * PARTIAL_PRECONDITIONING_FLOOR_INCREMENT_RATIO),
        )
        floor_values.append(startup_minutes + increment)
    return max(floor_values, default=0)


def _partial_preconditioning_sample_expired(
    sample: PreconditioningObservation,
    valid_samples: list[PreconditioningObservation],
    config: PreconditioningData,
    now: datetime,
    temperature_delta_scale: float = 1.0,
) -> bool:
    """Return whether a partial sample should no longer influence prediction."""
    sample_created = _parse_datetime(str(sample["created_at"]))
    if sample_created is None:
        return True
    if (now - sample_created).total_seconds() > config["partial_expiry_days"] * 86400:
        return True

    later_similar_complete = [
        other
        for other in valid_samples
        if other.get("quality") == "complete"
        and other.get("reached") is True
        and (other_created := _parse_datetime(str(other.get("created_at", "")))) is not None
        and other_created > sample_created
        and (
            _sample_to_sample_preconditioning_distance(sample, other)
            * temperature_delta_scale
        ) < 2.0
    ]
    return len(later_similar_complete) >= 3


def _initial_preconditioning_model_lead(
    delta_t: float,
    config: PreconditioningData,
) -> int:
    """Return fallback prediction before enough complete samples exist."""
    estimate = 30 + (config["fallback_minutes_per_degree"] * delta_t)
    return _round_up_to_next_5(max(30, min(config["max_lead_minutes"], estimate)))


def preconditioning_comfort_percentile(
    observations: list[Any],
    mode: str,
    config: PreconditioningData,
) -> int:
    """Return the active comfort percentile from recent local sample quality."""
    default_percentile = config["comfort_percentile"]
    if not config["adaptive_percentile_enabled"]:
        return default_percentile

    recent_qualities = [
        observation.get("quality")
        for observation in observations
        if isinstance(observation, dict)
        and observation.get("mode") == mode
        and observation.get("quality") in ("complete", "partial")
    ][-10:]
    if not recent_qualities:
        return default_percentile

    failure_rate = recent_qualities.count("partial") / len(recent_qualities)
    if failure_rate > 0.2:
        return max(default_percentile, 90)
    if failure_rate < 0.1:
        return min(default_percentile, 80)
    return default_percentile


def _preconditioning_recency_weight(
    created_at: str,
    now: datetime,
    decay_days: int,
) -> float:
    """Return recency weight for a stored observation."""
    created = _parse_datetime(created_at)
    if created is None:
        return 0.0
    age_days = max(0.0, (now - created).total_seconds() / 86400)
    return exp(-age_days / decay_days)


def _weighted_percentile(
    values: list[float],
    weights: list[float],
    percentile: int,
) -> float:
    """Return weighted percentile using ascending cumulative weight."""
    if not values:
        return 0
    weighted_values = sorted(zip(values, weights, strict=False), key=lambda item: item[0])
    total_weight = sum(max(0.0, weight) for _, weight in weighted_values)
    if total_weight <= 0:
        return weighted_values[-1][0]
    threshold = total_weight * (percentile / 100)
    cumulative = 0.0
    for value, weight in weighted_values:
        cumulative += max(0.0, weight)
        if cumulative + 1e-9 >= threshold:
            return value
    return weighted_values[-1][0]


def _round_up_to_next_5(value: float) -> int:
    """Round a minute value up to the next 5-minute boundary."""
    return int(ceil(value / 5) * 5)


def _parse_datetime(value: str) -> datetime | None:
    """Parse an ISO datetime string."""
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.astimezone()
    return parsed


def normalize_preconditioning_learning_data(
    raw_data: Any,
    climate_entities: list[str],
    history_sizes: dict[str, int] | None = None,
) -> dict[str, PreconditioningLearningData]:
    """Normalize stored local adaptive preconditioning observations."""
    data = raw_data if isinstance(raw_data, dict) else {}
    learning: dict[str, PreconditioningLearningData] = {}

    for entity_id in climate_entities:
        raw_learning = data.get(entity_id)
        learning[entity_id] = empty_preconditioning_learning_data()
        if not isinstance(raw_learning, dict):
            continue
        for direction in PRECONDITIONING_OBSERVATION_DIRECTIONS:
            raw_direction_learning = raw_learning.get(direction)
            raw_observations = (
                raw_direction_learning.get("observations")
                if isinstance(raw_direction_learning, dict)
                else []
            )
            observations = (
                [
                    observation
                    for raw_observation in raw_observations
                    if isinstance(raw_observation, dict)
                    and (
                        observation := _normalize_preconditioning_observation(
                            raw_observation
                        )
                    )
                    is not None
                    and observation["mode"] == direction
                ]
                if isinstance(raw_observations, list)
                else []
            )
            learning[entity_id][direction] = {
                "observations": trim_preconditioning_observations(
                    observations,
                    (history_sizes or {}).get(
                        entity_id,
                        DEFAULT_PRECONDITIONING_HISTORY_SIZE,
                    ),
                ),
            }

    return learning


def empty_preconditioning_learning_data() -> PreconditioningLearningData:
    """Return empty local adaptive preconditioning learning data."""
    return {
        "heat": {"observations": []},
        "cool": {"observations": []},
    }


def preconditioning_observations_for_direction(
    learning: Any,
    direction: str,
) -> list[Any]:
    """Return stored observations for one preconditioning direction."""
    if direction not in PRECONDITIONING_OBSERVATION_DIRECTIONS:
        return []
    if not isinstance(learning, dict):
        return []
    direction_learning = learning.get(direction)
    if not isinstance(direction_learning, dict):
        return []
    observations = direction_learning.get("observations")
    return observations if isinstance(observations, list) else []


def trim_preconditioning_observations(
    observations: list[PreconditioningObservation],
    history_size: int = DEFAULT_PRECONDITIONING_HISTORY_SIZE,
) -> list[PreconditioningObservation]:
    """Keep useful learning history plus a small bounded diagnostic history."""
    useful_count = 0
    invalid_count = 0
    kept_reversed: list[PreconditioningObservation] = []
    for observation in reversed(observations):
        if observation.get("quality") == "invalid":
            if invalid_count >= MAX_PRECONDITIONING_INVALID_OBSERVATIONS:
                continue
            invalid_count += 1
        else:
            if useful_count >= history_size:
                continue
            useful_count += 1
        kept_reversed.append(observation)

    return list(reversed(kept_reversed))


def _normalize_preconditioning_observation(
    raw_observation: dict[str, Any],
) -> PreconditioningObservation | None:
    """Normalize one stored preconditioning observation."""
    quality = str(raw_observation.get("quality", ""))
    mode = str(raw_observation.get("mode", ""))
    if quality not in PRECONDITIONING_OBSERVATION_QUALITIES:
        return None
    if mode not in PRECONDITIONING_OBSERVATION_DIRECTIONS:
        return None

    entity_id = raw_observation.get("entity_id")
    created_at = raw_observation.get("created_at")
    scheduled_time = raw_observation.get("scheduled_time")
    start_time = raw_observation.get("start_time")
    if not all(
        isinstance(value, str) and value
        for value in (entity_id, created_at, scheduled_time, start_time)
    ):
        return None

    try:
        target_temp = float(raw_observation["target_temp"])
        initial_temp = float(raw_observation["initial_temp"])
        delta_t = float(raw_observation["delta_t"])
        startup_minutes = int(raw_observation["startup_minutes"])
    except (KeyError, TypeError, ValueError):
        return None

    if startup_minutes < 0:
        return None

    observation: PreconditioningObservation = {
        "entity_id": entity_id,
        "mode": mode,
        "created_at": created_at,
        "scheduled_time": scheduled_time,
        "start_time": start_time,
        "target_temp": target_temp,
        "initial_temp": initial_temp,
        "outdoor_temp_start": _optional_float(raw_observation.get("outdoor_temp_start")),
        "outdoor_temp_target": _optional_float(raw_observation.get("outdoor_temp_target")),
        "delta_t": max(0.0, delta_t),
        "startup_minutes": startup_minutes,
        "reached": bool(raw_observation.get("reached", False)),
        "minutes_to_reach": None,
        "quality": quality,
    }

    temperature_source = raw_observation.get("temperature_source")
    if isinstance(temperature_source, str) and temperature_source:
        observation["temperature_source"] = temperature_source

    room_temperature_entity_id = _normalize_optional_entity_id(
        raw_observation.get("room_temperature_entity_id")
    )
    if room_temperature_entity_id is not None:
        observation["room_temperature_entity_id"] = room_temperature_entity_id

    try:
        minutes_to_reach = int(raw_observation["minutes_to_reach"])
    except (KeyError, TypeError, ValueError):
        minutes_to_reach = None
    if minutes_to_reach is not None and minutes_to_reach >= 0:
        observation["minutes_to_reach"] = minutes_to_reach

    try:
        observed_temp = float(raw_observation["observed_temp"])
    except (KeyError, TypeError, ValueError):
        observed_temp = None
    if observed_temp is not None:
        observation["observed_temp"] = observed_temp

    invalid_reason = raw_observation.get("invalid_reason")
    if isinstance(invalid_reason, str) and invalid_reason:
        observation["invalid_reason"] = invalid_reason

    return observation


def _normalize_temperature_limit(value: Any, fallback: float) -> float:
    """Normalize one temperature limit."""
    try:
        temperature = float(value)
    except (TypeError, ValueError):
        return fallback

    # Broad runtime envelope covering -50..100 °C and -58..212 °F.
    if temperature < -58 or temperature > 212:
        return fallback

    return temperature


def _optional_float(value: Any) -> float | None:
    """Return a float or None for optional numeric storage fields."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_optional_entity_id(value: Any) -> str | None:
    """Return a simple Home Assistant entity id string or None."""
    if not isinstance(value, str):
        return None
    entity_id = value.strip()
    if not entity_id or "." not in entity_id:
        return None
    return entity_id


def _normalize_int(value: Any, fallback: int, *, minimum: int, maximum: int) -> int:
    """Normalize a bounded integer field."""
    try:
        number = int(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(number, maximum))


def _normalize_float(
    value: Any,
    fallback: float,
    *,
    minimum: float,
    maximum: float,
) -> float:
    """Normalize a bounded float field."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(number, maximum))


def _normalize_minutes(value: Any, fallback: int) -> int:
    """Normalize a bounded minute value."""
    try:
        minutes = int(value)
    except (TypeError, ValueError):
        return fallback

    return max(0, min(minutes, MAX_PRECONDITIONING_LEAD_MINUTES))


def _normalize_preconditioning_delta(value: Any) -> float:
    """Normalize the minimum temperature delta used before starting early."""
    try:
        delta = float(value)
    except (TypeError, ValueError):
        return DEFAULT_PRECONDITIONING_MINIMUM_DELTA

    if delta < 0 or delta > 9:
        return DEFAULT_PRECONDITIONING_MINIMUM_DELTA

    return delta


def normalize_schedule_templates(raw_templates: Any) -> list[ScheduleTemplateData]:
    """Normalize stored custom schedule templates."""
    if not isinstance(raw_templates, list):
        return []

    templates: list[ScheduleTemplateData] = []
    seen_keys: set[str] = set()

    for raw_template in raw_templates:
        if not isinstance(raw_template, dict):
            continue

        key = str(raw_template.get("key", "")).strip()
        name = str(raw_template.get("name", "")).strip()
        raw_blocks = raw_template.get("blocks", [])
        if not key or not name or key in seen_keys or not isinstance(raw_blocks, list):
            continue

        valid_blocks = [
            block
            for block in raw_blocks
            if isinstance(block, dict)
            and "start" in block
            and (
                "temperature" in block
                or block.get("action") == ACTION_TURN_OFF
            )
        ]

        try:
            blocks = normalize_schedule_blocks(valid_blocks)
        except ValueError:
            continue

        templates.append(
            {
                "key": key,
                "name": name,
                "blocks": blocks,
            }
        )
        seen_keys.add(key)

    return templates


def _dedupe_schedule_templates(
    templates: list[ScheduleTemplateData],
) -> list[ScheduleTemplateData]:
    """Return templates without duplicate keys, preserving first occurrence."""
    deduped: list[ScheduleTemplateData] = []
    seen_keys: set[str] = set()
    for template in templates:
        if template["key"] in seen_keys:
            continue

        deduped.append(template)
        seen_keys.add(template["key"])

    return deduped


def _normalize_templates_seeded_version(value: Any, templates_seeded: bool) -> int:
    """Normalize the default template seed version."""
    if not templates_seeded:
        return 0

    try:
        version = int(value)
    except (TypeError, ValueError):
        return 1

    if version < 1:
        return 1

    return min(version, DEFAULT_SCHEDULE_TEMPLATES_VERSION)


def _add_missing_migrated_default_templates(
    templates: list[ScheduleTemplateData],
    default_templates: list[ScheduleTemplateData],
    current_version: int,
) -> list[ScheduleTemplateData]:
    """Add only newly introduced default templates for legacy seeded data."""
    existing_keys = {template["key"] for template in templates}
    migration_keys = {
        key
        for version, keys in DEFAULT_SCHEDULE_TEMPLATE_MIGRATIONS.items()
        if version > current_version
        for key in keys
    }
    missing_defaults = [
        template
        for template in default_templates
        if template["key"] in migration_keys and template["key"] not in existing_keys
    ]

    return [*templates, *missing_defaults]


def _normalize_zone_override(raw_override: Any) -> ZoneOverride | None:
    """Normalize a stored zone override."""
    if not isinstance(raw_override, dict):
        return None

    override_type = str(raw_override.get("type", "boost"))
    if override_type == "pause":
        return _normalize_zone_pause_override(raw_override)
    if override_type != "boost":
        return None

    if "until" not in raw_override or "temperature" not in raw_override:
        return None

    override: ZoneOverride = {
        "type": "boost",
        "until": str(raw_override["until"]),
    }

    try:
        override["temperature"] = float(raw_override["temperature"])
    except (TypeError, ValueError):
        return None

    started_at = raw_override.get("started_at")
    if isinstance(started_at, str) and started_at:
        override["started_at"] = started_at

    hvac_mode = raw_override.get("hvac_mode")
    if isinstance(hvac_mode, str) and hvac_mode:
        override["hvac_mode"] = hvac_mode

    previous_state = _normalize_climate_state_snapshot(
        raw_override.get("previous_state")
    )
    if previous_state:
        override["previous_state"] = previous_state

    return override


def _normalize_zone_pause_override(raw_override: dict[str, Any]) -> ZoneOverride | None:
    """Normalize a stored zone pause override."""
    override: ZoneOverride = {"type": "pause"}

    started_at = raw_override.get("started_at")
    if isinstance(started_at, str) and started_at:
        override["started_at"] = started_at

    until = raw_override.get("until")
    if isinstance(until, str) and until:
        override["until"] = until

    action = str(raw_override.get("action", ZONE_PAUSE_ACTION_NONE))
    override["action"] = (
        action if action in ZONE_PAUSE_ACTION_OPTIONS else ZONE_PAUSE_ACTION_NONE
    )

    return override


def _normalize_climate_state_snapshot(raw_state: Any) -> ClimateStateSnapshot | None:
    """Normalize a stored climate state snapshot."""
    if not isinstance(raw_state, dict):
        return None

    snapshot: ClimateStateSnapshot = {}

    hvac_mode = raw_state.get("hvac_mode")
    if isinstance(hvac_mode, str) and hvac_mode:
        snapshot["hvac_mode"] = hvac_mode

    try:
        temperature = float(raw_state["temperature"])
    except (KeyError, TypeError, ValueError):
        temperature = None
    if temperature is not None:
        snapshot["temperature"] = temperature

    return snapshot or None
