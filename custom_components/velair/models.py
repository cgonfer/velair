"""Data models for Velair."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, NotRequired, TypedDict

from .const import (
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
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


class ScheduleBlock(TypedDict):
    """A single schedule change."""

    start: str
    action: NotRequired[str]
    temperature: NotRequired[float]
    hvac_mode: NotRequired[str]


class ZoneOverride(TypedDict):
    """A temporary override for one zone."""

    type: str
    started_at: NotRequired[str]
    until: NotRequired[str]
    temperature: NotRequired[float]
    hvac_mode: NotRequired[str]
    action: NotRequired[str]
    previous_state: NotRequired["ClimateStateSnapshot"]


class ClimateStateSnapshot(TypedDict, total=False):
    """Stored climate state captured before a temporary override."""

    hvac_mode: str
    temperature: float


class ZoneData(TypedDict):
    """Stored state for one climate zone."""

    enabled: bool
    schedule: dict[str, list[ScheduleBlock]]
    override: NotRequired[ZoneOverride | None]


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
    vacation: dict[str, Any] | None
    paused_until: NotRequired[str | None]
    paused_started_at: NotRequired[str | None]


class SchedulerData(TypedDict):
    """Stored scheduler data."""

    version: int
    zones: dict[str, ZoneData]
    global_: GlobalData
    settings: PanelSettingsData
    templates: list[ScheduleTemplateData]
    templates_seeded: bool
    templates_seeded_version: int


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
        }

    for entity_id in climate_entities:
        zones.setdefault(
            entity_id,
            {
                "enabled": True,
                "schedule": empty_week_schedule(),
                "override": None,
            },
        )

    global_data = data.get("global", data.get("global_", {}))
    if not isinstance(global_data, dict):
        global_data = {}
    mode = str(global_data.get("mode", "auto"))
    if mode == "boost":
        mode = "auto"

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

    return {
        "version": 1,
        "zones": zones,
        "global_": {
            "mode": mode,
            "vacation": global_data.get("vacation"),
            "paused_until": global_data.get("paused_until"),
            "paused_started_at": global_data.get("paused_started_at"),
        },
        "settings": normalize_panel_settings(data.get("settings"), climate_entities),
        "templates": _dedupe_schedule_templates(templates),
        "templates_seeded": templates_seeded,
        "templates_seeded_version": templates_seeded_version,
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
    }


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


def _normalize_temperature_limit(value: Any, fallback: float) -> float:
    """Normalize one temperature limit."""
    try:
        temperature = float(value)
    except (TypeError, ValueError):
        return fallback

    if temperature < -50 or temperature > 100:
        return fallback

    return temperature


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
