"""WebSocket API for Velair."""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
import json
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import (
    ACTION_OPTIONS,
    ACTION_SET_TEMPERATURE,
    ATTR_BLOCKS,
    ATTR_ACTION,
    ATTR_HVAC_MODE,
    ATTR_KEY,
    ATTR_NAME,
    ATTR_SOURCE_WEEKDAY,
    ATTR_TARGET_WEEKDAYS,
    ATTR_TEMPERATURE,
    ATTR_WEEKDAY,
    CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP,
    DOMAIN,
    HVAC_MODE_OPTIONS,
    SIGNAL_SCHEDULER_UPDATED,
)
from .config_helpers import (
    get_configured_climate_entities,
    should_apply_active_schedule_on_startup,
)
from .models import (
    WEEKDAYS,
    ClimateEvent,
    normalize_panel_settings,
    normalize_schedule_blocks,
    normalize_schedule_data,
    normalize_schedule_templates,
    serialize_schedule_data,
)
from .storage import STORAGE_VERSION

API_REGISTERED = f"{DOMAIN}_websocket_api_registered"
EXPORT_FORMAT = "velair_portable_data"
EXPORT_MODEL_VERSION = 1
EXPORT_SECTIONS = ("zones", "templates", "settings")
EXPORT_SECTION_SCHEMA = vol.All(
    cv.ensure_list,
    [vol.In(EXPORT_SECTIONS)],
    vol.Length(min=1),
)
INTEGRATION_VERSION = "unknown"
try:
    INTEGRATION_VERSION = str(
        json.loads(Path(__file__).with_name("manifest.json").read_text())["version"]
    )
except (OSError, KeyError, TypeError, json.JSONDecodeError):
    pass

SCHEDULE_BLOCK_SCHEMA = vol.Schema(
    {
        vol.Required("start"): cv.string,
        vol.Optional(ATTR_ACTION, default=ACTION_SET_TEMPERATURE): vol.In(ACTION_OPTIONS),
        vol.Optional(ATTR_TEMPERATURE): vol.Coerce(float),
        vol.Optional(ATTR_HVAC_MODE): vol.In(HVAC_MODE_OPTIONS),
    }
)


def async_setup_api(hass: HomeAssistant) -> None:
    """Register WebSocket API commands."""
    if hass.data.get(API_REGISTERED):
        return

    websocket_api.async_register_command(hass, ws_get_schedule)
    websocket_api.async_register_command(hass, ws_set_daily_schedule)
    websocket_api.async_register_command(hass, ws_copy_day_schedule)
    websocket_api.async_register_command(hass, ws_clear_schedule)
    websocket_api.async_register_command(hass, ws_set_schedule_template)
    websocket_api.async_register_command(hass, ws_delete_schedule_template)
    websocket_api.async_register_command(hass, ws_update_settings)
    websocket_api.async_register_command(hass, ws_export_data)
    websocket_api.async_register_command(hass, ws_import_data)
    websocket_api.async_register_command(hass, ws_reset_data)
    websocket_api.async_register_command(hass, ws_subscribe_updates)
    hass.data[API_REGISTERED] = True


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/get_schedule",
    }
)
@callback
def ws_get_schedule(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle schedule state requests."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/subscribe_updates",
    }
)
@callback
def ws_subscribe_updates(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe a frontend client to scheduler updates."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    @callback
    def _send_update() -> None:
        current_runtime = _get_runtime(hass)
        if current_runtime is None:
            connection.send_message(
                websocket_api.event_message(
                    msg["id"],
                    {"loaded": False},
                )
            )
            return

        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "loaded": True,
                    "schedule": _build_schedule_response(current_runtime),
                },
            )
        )

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(
        hass,
        SIGNAL_SCHEDULER_UPDATED,
        _send_update,
    )
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/set_daily_schedule",
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_WEEKDAY): vol.In(WEEKDAYS),
        vol.Required(ATTR_BLOCKS): vol.All(cv.ensure_list, [SCHEDULE_BLOCK_SCHEMA]),
    }
)
@websocket_api.async_response
async def ws_set_daily_schedule(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle daily schedule updates."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    scheduler = runtime["scheduler"]
    try:
        blocks = normalize_schedule_blocks(msg[ATTR_BLOCKS])
        await scheduler.async_set_daily_schedule(
            msg[ATTR_ENTITY_ID],
            msg[ATTR_WEEKDAY],
            blocks,
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_schedule", str(err))
        return

    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/copy_day_schedule",
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_SOURCE_WEEKDAY): vol.In(WEEKDAYS),
        vol.Required(ATTR_TARGET_WEEKDAYS): vol.All(
            cv.ensure_list,
            [vol.In(WEEKDAYS)],
            vol.Length(min=1),
        ),
    }
)
@websocket_api.async_response
async def ws_copy_day_schedule(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle day schedule copies."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    scheduler = runtime["scheduler"]
    try:
        await scheduler.async_copy_day_schedule(
            msg[ATTR_ENTITY_ID],
            msg[ATTR_SOURCE_WEEKDAY],
            msg[ATTR_TARGET_WEEKDAYS],
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_schedule", str(err))
        return

    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/clear_schedule",
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_WEEKDAY): vol.In(WEEKDAYS),
    }
)
@websocket_api.async_response
async def ws_clear_schedule(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle schedule clearing."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    scheduler = runtime["scheduler"]
    try:
        await scheduler.async_clear_schedule(
            msg[ATTR_ENTITY_ID],
            msg.get(ATTR_WEEKDAY),
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_schedule", str(err))
        return

    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/set_schedule_template",
        vol.Optional(ATTR_KEY): cv.string,
        vol.Required(ATTR_NAME): cv.string,
        vol.Required(ATTR_BLOCKS): vol.All(cv.ensure_list, [SCHEDULE_BLOCK_SCHEMA]),
    }
)
@websocket_api.async_response
async def ws_set_schedule_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle custom schedule template creation and updates."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    name = msg[ATTR_NAME].strip()
    if not name:
        connection.send_error(msg["id"], "invalid_template", "Template name is required")
        return

    scheduler = runtime["scheduler"]
    try:
        blocks = normalize_schedule_blocks(msg[ATTR_BLOCKS])
        await scheduler.async_set_schedule_template(
            name,
            blocks,
            msg.get(ATTR_KEY),
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_template", str(err))
        return

    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/update_settings",
        vol.Optional("first_weekday"): vol.In(WEEKDAYS),
        vol.Optional("zone_order"): vol.All(cv.ensure_list, [cv.entity_id]),
        vol.Optional("min_temperature"): vol.Coerce(float),
        vol.Optional("max_temperature"): vol.Coerce(float),
        vol.Optional(CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP): bool,
    }
)
@websocket_api.async_response
async def ws_update_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle persisted panel setting updates."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    if CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP in msg:
        entry = runtime["entry"]
        next_options = {
            **entry.options,
            CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP: bool(
                msg[CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP]
            ),
        }
        hass.config_entries.async_update_entry(entry, options=next_options)

    updates = {
        key: msg[key]
        for key in (
            "first_weekday",
            "zone_order",
            "min_temperature",
            "max_temperature",
        )
        if key in msg
    }

    scheduler = runtime["scheduler"]
    try:
        await scheduler.async_update_settings(updates)
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_settings", str(err))
        return

    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/export_data",
        vol.Required("sections"): EXPORT_SECTION_SCHEMA,
    }
)
@callback
def ws_export_data(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Build a portable Velair export payload."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    connection.send_result(
        msg["id"],
        _build_export_payload(runtime, msg["sections"]),
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/import_data",
        vol.Required("payload"): dict,
        vol.Required("sections"): EXPORT_SECTION_SCHEMA,
    }
)
@websocket_api.async_response
async def ws_import_data(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Import selected sections from a portable Velair payload."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    try:
        import_data = _build_import_data(runtime, msg["payload"], msg["sections"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_import", str(err))
        return

    startup_option = import_data.pop("apply_active_schedule_on_startup", None)
    if startup_option is not None:
        entry = runtime["entry"]
        next_options = {
            **entry.options,
            CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP: bool(startup_option),
        }
        hass.config_entries.async_update_entry(entry, options=next_options)

    scheduler = runtime["scheduler"]
    await scheduler.async_replace_portable_data(**import_data)
    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/reset_data",
        vol.Required("confirmation"): vol.Equal("reset"),
    }
)
@websocket_api.async_response
async def ws_reset_data(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Reset stored Velair data to defaults for the configured thermostats."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    entry = runtime["entry"]
    next_options = {
        **entry.options,
        CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP: False,
    }
    hass.config_entries.async_update_entry(entry, options=next_options)

    data = normalize_schedule_data(None, get_configured_climate_entities(entry))
    await runtime["scheduler"].async_reset_data(data)
    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/delete_schedule_template",
        vol.Required(ATTR_KEY): cv.string,
    }
)
@websocket_api.async_response
async def ws_delete_schedule_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle custom schedule template deletion."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    scheduler = runtime["scheduler"]
    try:
        await scheduler.async_delete_schedule_template(msg[ATTR_KEY])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_template", str(err))
        return

    connection.send_result(msg["id"], _build_schedule_response(runtime))


def _get_runtime(hass: HomeAssistant) -> dict[str, Any] | None:
    """Return the active runtime dictionary."""
    entries = hass.data.get(DOMAIN, {})
    entry_runtimes = [
        runtime
        for key, runtime in entries.items()
        if isinstance(key, str) and key != API_REGISTERED
    ]
    return entry_runtimes[0] if entry_runtimes else None


def _build_schedule_response(runtime: dict[str, Any]) -> dict[str, Any]:
    """Build the schedule API response."""
    scheduler = runtime["scheduler"]
    storage = runtime["storage"]
    entry = runtime["entry"]
    stored_data = serialize_schedule_data(storage.data)
    settings = {
        **stored_data["settings"],
        CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP: (
            should_apply_active_schedule_on_startup(entry)
        ),
    }

    return {
        "configured_entities": list(storage.data["zones"]),
        "global": stored_data["global"],
        "settings": settings,
        "zones": stored_data["zones"],
        "operational_status": scheduler.get_operational_status(),
        "next_event": _serialize_event(scheduler.next_event),
        "next_events": [_serialize_event(event) for event in scheduler.next_events],
        "active_overrides": scheduler.get_active_overrides(),
        "templates": stored_data.get("templates", []),
        "versions": {
            "export_format": EXPORT_FORMAT,
            "portable_model": EXPORT_MODEL_VERSION,
            "storage": STORAGE_VERSION,
            "model": stored_data["version"],
            "integration": INTEGRATION_VERSION,
        },
    }


def _build_export_payload(
    runtime: dict[str, Any],
    sections: list[str],
) -> dict[str, Any]:
    """Build a versioned portable export payload."""
    storage = runtime["storage"]
    entry = runtime["entry"]
    stored_data = serialize_schedule_data(storage.data)
    exported_sections: dict[str, Any] = {}

    if "zones" in sections:
        exported_sections["zones"] = _export_zones(stored_data["zones"])
    if "templates" in sections:
        exported_sections["templates"] = deepcopy(stored_data["templates"])
    if "settings" in sections:
        exported_sections["settings"] = {
            **deepcopy(stored_data["settings"]),
            CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP: (
                should_apply_active_schedule_on_startup(entry)
            ),
        }

    return {
        "format": EXPORT_FORMAT,
        "model_version": EXPORT_MODEL_VERSION,
        "exported_at": datetime.now(UTC).isoformat(),
        "sections": exported_sections,
    }


def _build_import_data(
    runtime: dict[str, Any],
    payload: dict[str, Any],
    sections: list[str],
) -> dict[str, Any]:
    """Validate a portable import payload and return normalized scheduler data."""
    payload_sections = _validate_import_payload(payload)
    storage = runtime["storage"]
    current_zones = storage.data["zones"]
    import_data: dict[str, Any] = {}

    missing_sections = [
        section for section in sections if section not in payload_sections
    ]
    if missing_sections:
        raise ValueError(
            f"Import file does not contain: {', '.join(missing_sections)}"
        )

    if "zones" in sections:
        import_data["zones"] = _normalize_import_zones(
            payload_sections["zones"],
            current_zones,
        )
    if "templates" in sections:
        raw_templates = payload_sections["templates"]
        if not isinstance(raw_templates, list):
            raise ValueError("Templates section is not valid")
        import_data["templates"] = normalize_schedule_templates(raw_templates)
    if "settings" in sections:
        raw_settings = payload_sections["settings"]
        if not isinstance(raw_settings, dict):
            raise ValueError("Settings section is not valid")
        import_data["settings"] = normalize_panel_settings(
            raw_settings,
            list(current_zones),
        )
        if CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP in raw_settings:
            import_data[CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP] = bool(
                raw_settings[CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP]
            )

    return import_data


def _validate_import_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate portable payload metadata and return its sections."""
    if payload.get("format") != EXPORT_FORMAT:
        raise ValueError("Import file is not a Velair export")

    model_version = payload.get("model_version")
    if not isinstance(model_version, int) or model_version < 1:
        raise ValueError("Import file has an invalid model version")
    if model_version > EXPORT_MODEL_VERSION:
        raise ValueError("Import file was created by a newer Velair version")

    sections = payload.get("sections")
    if not isinstance(sections, dict) or not sections:
        raise ValueError("Import file does not contain importable data")

    return sections


def _export_zones(zones: dict[str, Any]) -> dict[str, Any]:
    """Return portable zone data without temporary runtime overrides."""
    return {
        entity_id: {
            "enabled": bool(zone.get("enabled", True)),
            "schedule": deepcopy(zone.get("schedule", {})),
        }
        for entity_id, zone in zones.items()
    }


def _normalize_import_zones(
    raw_zones: Any,
    current_zones: dict[str, Any],
) -> dict[str, Any]:
    """Normalize imported zones while preserving non-matching local zones."""
    if not isinstance(raw_zones, dict):
        raise ValueError("Thermostat schedules section is not valid")

    matched_entities = set(raw_zones).intersection(current_zones)
    if not matched_entities:
        raise ValueError("No matching managed thermostats found in import file")

    normalized_zones = normalize_schedule_data(
        {
            "zones": raw_zones,
            "templates_seeded": True,
        },
        list(current_zones),
    )["zones"]

    return {
        entity_id: (
            normalized_zones[entity_id]
            if entity_id in matched_entities
            else deepcopy(zone)
        )
        for entity_id, zone in current_zones.items()
    }


def _serialize_event(event: ClimateEvent | None) -> dict[str, Any] | None:
    """Serialize a scheduler event for the API."""
    if event is None:
        return None

    return {
        "entity_id": event.entity_id,
        "when": event.when.isoformat(),
        "action": event.action,
        "temperature": event.temperature,
        "hvac_mode": event.hvac_mode,
        "weekday": event.weekday,
        "start": event.start,
    }
