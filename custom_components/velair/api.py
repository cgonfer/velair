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
from homeassistant.util import dt as dt_util

from .const import (
    ACTION_OPTIONS,
    ACTION_SET_TEMPERATURE,
    ATTR_BLOCKS,
    ATTR_ACTION,
    ATTR_FAN_MODE,
    ATTR_HVAC_MODE,
    ATTR_HUMIDITY,
    ATTR_KEY,
    ATTR_NAME,
    ATTR_PROFILE_ID,
    ATTR_PRESET_MODE,
    ATTR_SOURCE_WEEKDAY,
    ATTR_SWING_HORIZONTAL_MODE,
    ATTR_SWING_MODE,
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
    DEFAULT_COMFORT_TEMPERATURE_MAX,
    DEFAULT_COMFORT_TEMPERATURE_MIN,
    DEFAULT_MAX_TEMPERATURE,
    DEFAULT_MIN_TEMPERATURE,
    DEFAULT_PRECONDITIONING_FALLBACK_MINUTES_PER_DEGREE,
    DEFAULT_PRECONDITIONING_MINIMUM_DELTA,
    DEFAULT_ROOM_SENSOR_ASSIST_MAX_DELTA,
    WEEKDAYS,
    ClimateEvent,
    MIN_PRECONDITIONING_COMPLETE_SAMPLES,
    normalize_comfort_data,
    normalize_panel_settings,
    normalize_preconditioning_data,
    normalize_preconditioning_learning_data,
    preconditioning_comfort_percentile,
    preconditioning_observations_for_direction,
    normalize_schedule_blocks,
    normalize_schedule_data,
    normalize_schedule_templates,
    serialize_schedule_data,
    validate_climate_profiles,
    validate_modes,
)
from .storage import STORAGE_VERSION, convert_portable_temperature_data
from .temperature import (
    CELSIUS,
    FAHRENHEIT,
    absolute_temperature,
    rate_per_degree,
    temperature_delta,
)
from .temperature_migration import (
    async_dismiss_temperature_migration_notification,
)

API_REGISTERED = f"{DOMAIN}_websocket_api_registered"
EXPORT_FORMAT = "velair_portable_data"
EXPORT_MODEL_VERSION = 5
EXPORT_SECTIONS = (
    "zones",
    "templates",
    "settings",
    "preconditioning_learning",
    "profiles",
    "modes",
)
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
        vol.Optional(ATTR_FAN_MODE): cv.string,
        vol.Optional(ATTR_PRESET_MODE): cv.string,
        vol.Optional(ATTR_SWING_MODE): cv.string,
        vol.Optional(ATTR_SWING_HORIZONTAL_MODE): cv.string,
        vol.Optional(ATTR_HUMIDITY): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
    }
)

PRECONDITIONING_SCHEMA = vol.Schema(
    {
        vol.Optional("enabled"): bool,
        vol.Optional("max_lead_minutes"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=1440),
        ),
        vol.Optional("minimum_delta_temperature"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0, max=9),
        ),
        vol.Optional("learning_history_size"): vol.All(
            vol.Coerce(int),
            vol.Range(min=10, max=500),
        ),
        vol.Optional("similar_sample_count"): vol.All(
            vol.Coerce(int),
            vol.Range(min=5, max=100),
        ),
        vol.Optional("comfort_percentile"): vol.All(
            vol.Coerce(int),
            vol.Range(min=50, max=95),
        ),
        vol.Optional("adaptive_percentile_enabled"): bool,
        vol.Optional("partial_expiry_days"): vol.All(
            vol.Coerce(int),
            vol.Range(min=1, max=365),
        ),
        vol.Optional("recency_decay_days"): vol.All(
            vol.Coerce(int),
            vol.Range(min=1, max=365),
        ),
        vol.Optional("min_start_minutes"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=1440),
        ),
        vol.Optional("fallback_minutes_per_degree"): vol.All(
            vol.Coerce(float),
            vol.Range(min=5 / 9, max=120),
        ),
        vol.Optional("use_outdoor_temperature"): bool,
        vol.Optional("outdoor_temperature_entity_id"): vol.Any(None, cv.entity_id),
        vol.Optional("room_temperature_entity_id"): vol.Any(None, cv.entity_id),
        vol.Optional("room_sensor_assist_enabled"): bool,
        vol.Optional("room_sensor_assist_max_delta"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0.1, max=18.0),
        ),
        vol.Optional("room_sensor_assist_debounce_seconds"): vol.All(
            vol.Coerce(int),
            vol.Range(min=0, max=300),
        ),
    }
)

COMFORT_SCHEMA = vol.Schema(
    {
        vol.Optional("enabled"): bool,
        vol.Optional("temperature_entity_id"): vol.Any(None, cv.entity_id),
        vol.Optional("humidity_enabled"): bool,
        vol.Optional("humidity_entity_id"): vol.Any(None, cv.entity_id),
        vol.Optional("co2_entity_id"): vol.Any(None, cv.entity_id),
        vol.Optional("temperature_min"): vol.All(
            vol.Coerce(float),
            vol.Range(min=-58, max=212),
        ),
        vol.Optional("temperature_max"): vol.All(
            vol.Coerce(float),
            vol.Range(min=-58, max=212),
        ),
        vol.Optional("humidity_min"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0, max=100),
        ),
        vol.Optional("humidity_max"): vol.All(
            vol.Coerce(float),
            vol.Range(min=0, max=100),
        ),
        vol.Optional("co2_attention"): vol.All(
            vol.Coerce(float),
            vol.Range(min=400, max=10000),
        ),
        vol.Optional("co2_poor"): vol.All(
            vol.Coerce(int),
            vol.Range(min=400, max=10000),
        ),
        vol.Optional("stale_after_minutes"): vol.All(
            vol.Coerce(int),
            vol.Range(min=5, max=1440),
        ),
    }
)


def async_setup_api(hass: HomeAssistant) -> None:
    """Register WebSocket API commands."""
    if hass.data.get(API_REGISTERED):
        return

    websocket_api.async_register_command(hass, ws_get_schedule)
    websocket_api.async_register_command(hass, ws_resolve_temperature_migration)
    websocket_api.async_register_command(hass, ws_set_daily_schedule)
    websocket_api.async_register_command(hass, ws_copy_day_schedule)
    websocket_api.async_register_command(hass, ws_clear_schedule)
    websocket_api.async_register_command(hass, ws_set_schedule_template)
    websocket_api.async_register_command(hass, ws_delete_schedule_template)
    websocket_api.async_register_command(hass, ws_set_profile)
    websocket_api.async_register_command(hass, ws_delete_profile)
    websocket_api.async_register_command(hass, ws_activate_profile)
    websocket_api.async_register_command(hass, ws_set_mode)
    websocket_api.async_register_command(hass, ws_delete_mode)
    websocket_api.async_register_command(hass, ws_select_mode)
    websocket_api.async_register_command(hass, ws_update_settings)
    websocket_api.async_register_command(hass, ws_update_zone_preconditioning)
    websocket_api.async_register_command(hass, ws_update_zone_comfort)
    websocket_api.async_register_command(hass, ws_reset_zone_preconditioning_settings)
    websocket_api.async_register_command(hass, ws_reset_zone_preconditioning_learning)
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
    _send_update()


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
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
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
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
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
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
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

    if _reject_temperature_migration_mutation(runtime, connection, msg):
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
        vol.Required("type"): f"{DOMAIN}/set_profile",
        vol.Required("profile"): dict,
    }
)
@websocket_api.async_response
async def ws_set_profile(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create or update one persisted climate profile."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return
    try:
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
        key = await runtime["scheduler"].async_set_profile(msg["profile"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_profile", str(err))
        return
    response = _build_schedule_response(runtime)
    response["profile_id"] = key
    connection.send_result(msg["id"], response)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/delete_profile",
        vol.Required(ATTR_KEY): cv.string,
    }
)
@websocket_api.async_response
async def ws_delete_profile(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete one persisted climate profile."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return
    try:
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
        await runtime["scheduler"].async_delete_profile(msg[ATTR_KEY])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_profile", str(err))
        return
    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/activate_profile",
        vol.Optional(ATTR_PROFILE_ID): vol.Any(None, cv.string),
    }
)
@websocket_api.async_response
async def ws_activate_profile(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Select a profile, with a missing/empty key selecting Default."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return
    try:
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
        await runtime["scheduler"].async_activate_profile(
            msg.get(ATTR_PROFILE_ID), source="panel"
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_profile", str(err))
        return
    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/set_mode",
        vol.Required("mode"): dict,
    }
)
@websocket_api.async_response
async def ws_set_mode(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create or update one native mode."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return
    try:
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
        key = await runtime["scheduler"].async_set_velair_mode(msg["mode"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_mode", str(err))
        return
    response = _build_schedule_response(runtime)
    response["mode_id"] = key
    connection.send_result(msg["id"], response)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/delete_mode",
        vol.Required(ATTR_KEY): cv.string,
    }
)
@websocket_api.async_response
async def ws_delete_mode(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete one native mode."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return
    try:
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
        await runtime["scheduler"].async_delete_velair_mode(msg[ATTR_KEY])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_mode", str(err))
        return
    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/select_mode",
        vol.Required("selection"): {
            vol.Required("kind"): vol.In(("default", "manual", "custom")),
            vol.Optional(ATTR_KEY): cv.string,
        },
    }
)
@websocket_api.async_response
async def ws_select_mode(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Select a built-in or custom Mode from the Velair panel."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return
    try:
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
        selection = msg["selection"]
        kind = selection["kind"]
        key = selection.get(ATTR_KEY)
        if kind == "custom":
            if not isinstance(key, str) or not key.strip():
                raise ValueError("Custom Mode selection requires a key")
            await runtime["scheduler"].async_select_velair_mode(
                key.strip(), source="panel"
            )
        elif key is not None:
            raise ValueError("Built-in Mode selection cannot include a key")
        elif kind == "default":
            await runtime["scheduler"].async_deactivate_profile(source="panel")
        else:
            await runtime["scheduler"].async_clear_velair_mode()
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_mode", str(err))
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

    if _reject_temperature_migration_mutation(runtime, connection, msg):
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
        vol.Required("type"): f"{DOMAIN}/update_zone_preconditioning",
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required("preconditioning"): PRECONDITIONING_SCHEMA,
    }
)
@websocket_api.async_response
async def ws_update_zone_preconditioning(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle persisted zone preconditioning setting updates."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    scheduler = runtime["scheduler"]
    try:
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
        await scheduler.async_update_zone_preconditioning(
            msg[ATTR_ENTITY_ID],
            msg["preconditioning"],
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_preconditioning", str(err))
        return

    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/resolve_temperature_migration",
        vol.Required("source_unit"): vol.In((CELSIUS, FAHRENHEIT)),
        vol.Required("migration_id"): cv.string,
        vol.Required("expected_revision"): vol.All(vol.Coerce(int), vol.Range(min=0)),
    }
)
@websocket_api.async_response
async def ws_resolve_temperature_migration(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Resolve ambiguous legacy temperatures and restart automatic scheduling."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    storage = runtime["storage"]
    scheduler = runtime["scheduler"]
    entry = runtime["entry"]
    if not _begin_exclusive_operation(
        runtime, connection, msg, "temperature_migration"
    ):
        return
    source_unit = msg["source_unit"]
    target_unit = getattr(storage, "home_assistant_temperature_unit", CELSIUS)
    persisted = False
    try:
        applied = await storage.async_resolve_temperature_migration(
            source_unit,
            migration_id=msg["migration_id"],
            expected_revision=msg["expected_revision"],
        )
    except ValueError as err:
        runtime["operation_active"] = None
        scheduler.set_temperature_migration_blocked(
            storage.temperature_migration_required
        )
        connection.send_error(msg["id"], "invalid_temperature_migration", str(err))
        return
    except Exception as err:
        runtime["operation_active"] = None
        scheduler.set_temperature_migration_blocked(
            storage.temperature_migration_required
        )
        connection.send_error(msg["id"], "temperature_migration_failed", str(err))
        return
    try:
        persisted = applied
        if applied:
            if not storage.temperature_migration_required:
                await scheduler.async_restore_room_sensor_assist_after_temperature_operation(
                    source_unit, target_unit, reason="temperature_migration"
                )
                scheduler.handle_temperature_unit_change()
        blocked = _finish_exclusive_operation(runtime)
        if not blocked:
            await async_dismiss_temperature_migration_notification(hass, entry.entry_id)
            await scheduler.async_start(
                apply_current_schedule=should_apply_active_schedule_on_startup(entry)
            )
    except Exception as err:  # Recovery must remain visible after persistence.
        if persisted:
            _mark_operation_recovery(runtime, "temperature_migration", err)
            connection.send_error(
                msg["id"],
                "operation_recovery_required",
                "Velair saved the data but could not restore climate state. "
                "The scheduler remains stopped. Reload the Velair integration or "
                "restart Home Assistant to recover. "
                f"Details: {err}",
            )
            return
        raise
    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/update_zone_comfort",
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required("comfort"): COMFORT_SCHEMA,
    }
)
@websocket_api.async_response
async def ws_update_zone_comfort(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle persisted zone comfort monitoring setting updates."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    scheduler = runtime["scheduler"]
    try:
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
        await scheduler.async_update_zone_comfort(
            msg[ATTR_ENTITY_ID],
            msg["comfort"],
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_comfort", str(err))
        return

    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/reset_zone_preconditioning_settings",
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
    }
)
@websocket_api.async_response
async def ws_reset_zone_preconditioning_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Restore default preconditioning settings without deleting learning data."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    scheduler = runtime["scheduler"]
    try:
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
        await scheduler.async_reset_zone_preconditioning_settings(
            msg[ATTR_ENTITY_ID]
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_preconditioning", str(err))
        return

    connection.send_result(msg["id"], _build_schedule_response(runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/reset_zone_preconditioning_learning",
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required("direction"): vol.In(("heat", "cool")),
    }
)
@websocket_api.async_response
async def ws_reset_zone_preconditioning_learning(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete local adaptive preconditioning observations for one zone."""
    runtime = _get_runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_loaded", "Integration is not loaded")
        return

    scheduler = runtime["scheduler"]
    try:
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
        await scheduler.async_reset_zone_preconditioning_learning(
            msg[ATTR_ENTITY_ID],
            msg["direction"],
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_preconditioning", str(err))
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
    if runtime.get("operation_active"):
        connection.send_error(
            msg["id"],
            "operation_in_progress",
            "Another Velair data operation is in progress",
        )
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

    if _reject_temperature_migration_mutation(runtime, connection, msg):
        return
    try:
        import_data = _build_import_data(runtime, msg["payload"], msg["sections"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_import", str(err))
        return

    if not _begin_exclusive_operation(runtime, connection, msg, "portable_import"):
        return

    startup_option = import_data.pop("apply_active_schedule_on_startup", None)
    scheduler = runtime["scheduler"]
    source_unit = getattr(runtime["storage"], "effective_temperature_unit", CELSIUS)
    target_unit = getattr(runtime["storage"], "effective_temperature_unit", CELSIUS)
    persisted = False
    try:
        await scheduler.async_replace_portable_data(**import_data)
        persisted = True
        if startup_option is not None:
            entry = runtime["entry"]
            next_options = {
                **entry.options,
                CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP: bool(startup_option),
            }
            hass.config_entries.async_update_entry(entry, options=next_options)
        if not runtime["storage"].temperature_migration_required:
            await scheduler.async_restore_room_sensor_assist_after_temperature_operation(
                source_unit, target_unit, reason="portable_import"
            )
        blocked = _finish_exclusive_operation(runtime)
        if not blocked:
            await scheduler.async_start(apply_current_schedule=False)
    except Exception as err:
        if persisted:
            _mark_operation_recovery(runtime, "portable_import", err)
            connection.send_error(
                msg["id"],
                "operation_recovery_required",
                "Velair saved the imported data but could not restore climate state. "
                "The scheduler remains stopped. Reload the Velair integration or "
                "restart Home Assistant to recover. "
                f"Details: {err}",
            )
            return
        runtime["operation_active"] = None
        scheduler.set_temperature_migration_blocked(
            runtime["storage"].temperature_migration_required
        )
        connection.send_error(msg["id"], "invalid_import", str(err))
        return
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
    storage = runtime["storage"]
    if (
        storage.temperature_migration_required
        and not getattr(storage, "legacy_temperature_reset_required", False)
    ):
        _reject_temperature_migration_mutation(runtime, connection, msg)
        return

    entry = runtime["entry"]
    next_options = {
        **entry.options,
        CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP: False,
    }

    scheduler = runtime["scheduler"]
    if not _begin_exclusive_operation(runtime, connection, msg, "data_reset"):
        return
    source_unit = getattr(storage, "effective_temperature_unit", CELSIUS)
    persisted = False
    try:
        await storage.async_reset_to_defaults()
        persisted = True
        hass.config_entries.async_update_entry(entry, options=next_options)
        await scheduler.async_prepare_data_reset()
        target_unit = getattr(storage, "effective_temperature_unit", CELSIUS)
        if not storage.temperature_migration_required:
            await scheduler.async_restore_room_sensor_assist_after_temperature_operation(
                source_unit, target_unit, reason="data_reset"
            )
            scheduler.handle_temperature_unit_change()
        blocked = _finish_exclusive_operation(runtime)
        if not blocked:
            await async_dismiss_temperature_migration_notification(hass, entry.entry_id)
            await scheduler.async_start(apply_current_schedule=False)
    except Exception as err:
        if persisted:
            _mark_operation_recovery(runtime, "data_reset", err)
            connection.send_error(
                msg["id"],
                "operation_recovery_required",
                "Velair reset the stored data but could not restore climate state. "
                "The scheduler remains stopped. Reload the Velair integration or "
                "restart Home Assistant to recover. "
                f"Details: {err}",
            )
            return
        runtime["operation_active"] = None
        blocker = getattr(scheduler, "set_temperature_migration_blocked", None)
        if blocker is not None:
            blocker(storage.temperature_migration_required)
        raise
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
        if _reject_temperature_migration_mutation(runtime, connection, msg):
            return
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
    runtime = entry_runtimes[0] if entry_runtimes else None
    if runtime is not None:
        runtime["scheduler"].set_temperature_migration_blocked(bool(
            runtime["storage"].temperature_migration_required
            or runtime.get("operation_active")
            or runtime.get("operation_recovery")
        ))
    return runtime


def _reject_temperature_migration_mutation(
    runtime: dict[str, Any],
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> bool:
    """Reject writes while the source unit of legacy temperatures is unresolved."""
    if runtime.get("operation_active"):
        connection.send_error(
            msg["id"],
            "operation_in_progress",
            "Another Velair data operation is in progress",
        )
        return True
    if runtime.get("operation_recovery"):
        connection.send_error(
            msg["id"],
            "operation_recovery_required",
            "Velair is stopped because a persisted data operation needs recovery",
        )
        return True
    if not runtime["storage"].temperature_migration_required:
        return False
    connection.send_error(
        msg["id"],
        "temperature_migration_required",
        "The Velair scheduler is stopped until the existing temperature unit is confirmed",
    )
    return True


def _begin_exclusive_operation(
    runtime: dict[str, Any],
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    operation: str,
) -> bool:
    """Acquire the runtime-wide write guard and stop scheduler side effects."""
    if runtime.get("operation_active") or runtime.get("operation_recovery"):
        _reject_temperature_migration_mutation(runtime, connection, msg)
        return False
    runtime["operation_active"] = operation
    blocker = getattr(runtime["scheduler"], "set_temperature_migration_blocked", None)
    if blocker is not None:
        blocker(True)
    return True


def _finish_exclusive_operation(runtime: dict[str, Any]) -> bool:
    """Release a successful operation and return whether scheduling stays blocked."""
    runtime["operation_active"] = None
    blocked = bool(
        runtime["storage"].temperature_migration_required
        or runtime.get("operation_recovery")
    )
    blocker = getattr(runtime["scheduler"], "set_temperature_migration_blocked", None)
    if blocker is not None:
        blocker(blocked)
    return blocked


def _mark_operation_recovery(
    runtime: dict[str, Any], operation: str, err: Exception
) -> None:
    """Keep scheduling stopped after a failure following persisted mutation."""
    runtime["operation_active"] = None
    runtime["operation_recovery"] = {
        "operation": operation,
        "phase": "recovery",
        "persisted": True,
        "message": str(err),
    }
    blocker = getattr(runtime["scheduler"], "set_temperature_migration_blocked", None)
    if blocker is not None:
        blocker(True)


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
        "temperature_unit": getattr(storage, "effective_temperature_unit", CELSIUS),
        "home_assistant_temperature_unit": getattr(
            storage, "home_assistant_temperature_unit", CELSIUS
        ),
        "temperature_migration": (
            storage.temperature_migration_status()
            if hasattr(storage, "temperature_migration_status")
            else {"required": False, "reason": None}
        ),
        "operation_recovery": runtime.get("operation_recovery"),
        "operation_status": getattr(scheduler, "operation_status", None),
        "global": stored_data["global"],
        "profiles": stored_data.get("profiles", []),
        "active_profile_ids": stored_data["global"].get("active_profile_ids", []),
        "modes": stored_data.get("modes", []),
        "active_mode_id": stored_data["global"].get(
            "active_mode_id"
        ),
        "settings": settings,
        "zones": stored_data["zones"],
        "operational_status": scheduler.get_operational_status(),
        "next_event": _serialize_event(scheduler.next_event),
        "next_events": [
            _serialize_event(event)
            for event in _schedule_response_next_events(scheduler)
        ],
        "active_overrides": scheduler.get_active_overrides(),
        "room_sensor_assist": (
            {} if getattr(scheduler, "temperature_migration_blocked", False)
            else scheduler.get_room_sensor_assist_statuses()
        ),
        "comfort": (
            {} if getattr(scheduler, "temperature_migration_blocked", False)
            else scheduler.get_comfort_assessments()
        ),
        "zone_runtime": (
            {} if getattr(scheduler, "temperature_migration_blocked", False)
            else getattr(scheduler, "get_zone_runtime_statuses", lambda: {})()
        ),
        "preconditioning_learning": _build_preconditioning_learning_response(
            stored_data,
            _runtime_climate_manager(runtime),
        ),
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
    raw_data = getattr(storage, "raw_data", None)
    stored_data = (
        raw_data()
        if callable(raw_data)
        else serialize_schedule_data(storage.data)
    )
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
    if "preconditioning_learning" in sections:
        exported_sections["preconditioning_learning"] = (
            _export_preconditioning_learning(stored_data)
        )
    if "profiles" in sections:
        exported_sections["profiles"] = deepcopy(stored_data.get("profiles", []))
    if "modes" in sections:
        exported_sections["modes"] = deepcopy(
            stored_data.get("modes", [])
        )

    return {
        "format": EXPORT_FORMAT,
        "model_version": EXPORT_MODEL_VERSION,
        "temperature_unit": getattr(storage, "effective_temperature_unit", CELSIUS),
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
    payload_unit = payload.get("temperature_unit", CELSIUS)
    target_unit = getattr(storage, "effective_temperature_unit", CELSIUS)
    current_zones = storage.data["zones"]
    import_data: dict[str, Any] = {}

    missing_sections = [
        section for section in sections if section not in payload_sections
    ]
    if missing_sections:
        raise ValueError(
            f"Import file does not contain: {', '.join(missing_sections)}"
        )

    selected_payload = {
        section: deepcopy(payload_sections[section]) for section in sections
    }
    validated_selected_profiles = None
    if "profiles" in sections:
        validated_selected_profiles = validate_climate_profiles(
            selected_payload["profiles"],
            list(current_zones),
        )
    target_profiles = (
        validated_selected_profiles
        if validated_selected_profiles is not None
        else storage.data.get("profiles", [])
    )
    if "modes" in sections:
        validate_modes(
            selected_payload["modes"],
            {
                profile["key"]: set(profile.get("zones", {}))
                for profile in target_profiles
                if isinstance(profile, dict) and isinstance(profile.get("key"), str)
            },
        )
    _hydrate_portable_temperature_defaults(selected_payload, payload_unit)
    payload_sections = convert_portable_temperature_data(
        selected_payload,
        payload_unit,
        target_unit,
        getattr(storage, "_hass", None),
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
    if "preconditioning_learning" in sections:
        import_data["preconditioning_learning"] = (
            _normalize_import_preconditioning_learning(
                payload_sections["preconditioning_learning"],
                current_zones,
            )
        )
    if "profiles" in sections:
        raw_profiles = payload_sections["profiles"]
        if not isinstance(raw_profiles, list):
            raise ValueError("Profiles section is not valid")
        import_data["profiles"] = validate_climate_profiles(
            raw_profiles,
            list(current_zones),
        )
    if "modes" in sections:
        raw_modes = payload_sections["modes"]
        profile_zones = {
            profile["key"]: set(profile.get("zones", {}))
            for profile in import_data.get(
                "profiles", storage.data.get("profiles", [])
            )
        }
        import_data["modes"] = validate_modes(
            raw_modes, profile_zones
        )

    return import_data


def _hydrate_portable_temperature_defaults(
    sections: dict[str, Any], source_unit: str
) -> None:
    """Add source-unit defaults before a portable payload is converted."""
    settings = sections.get("settings")
    if isinstance(settings, dict):
        settings.setdefault(
            "min_temperature",
            absolute_temperature(DEFAULT_MIN_TEMPERATURE, CELSIUS, source_unit),
        )
        settings.setdefault(
            "max_temperature",
            absolute_temperature(DEFAULT_MAX_TEMPERATURE, CELSIUS, source_unit),
        )

    zones = sections.get("zones")
    if not isinstance(zones, dict):
        return
    for zone in zones.values():
        if not isinstance(zone, dict):
            continue
        comfort = zone.setdefault("comfort", {})
        if isinstance(comfort, dict):
            comfort.setdefault(
                "temperature_min",
                absolute_temperature(
                    DEFAULT_COMFORT_TEMPERATURE_MIN, CELSIUS, source_unit
                ),
            )
            comfort.setdefault(
                "temperature_max",
                absolute_temperature(
                    DEFAULT_COMFORT_TEMPERATURE_MAX, CELSIUS, source_unit
                ),
            )
        preconditioning = zone.setdefault("preconditioning", {})
        if isinstance(preconditioning, dict):
            preconditioning.setdefault(
                "minimum_delta_temperature",
                temperature_delta(
                    DEFAULT_PRECONDITIONING_MINIMUM_DELTA, CELSIUS, source_unit
                ),
            )
            preconditioning.setdefault(
                "room_sensor_assist_max_delta",
                temperature_delta(
                    DEFAULT_ROOM_SENSOR_ASSIST_MAX_DELTA, CELSIUS, source_unit
                ),
            )
            preconditioning.setdefault(
                "fallback_minutes_per_degree",
                rate_per_degree(
                    DEFAULT_PRECONDITIONING_FALLBACK_MINUTES_PER_DEGREE,
                    CELSIUS,
                    source_unit,
                ),
            )


def _validate_import_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate portable payload metadata and return its sections."""
    if payload.get("format") != EXPORT_FORMAT:
        raise ValueError("Import file is not a Velair export")

    model_version = payload.get("model_version")
    if not isinstance(model_version, int) or model_version < 1:
        raise ValueError("Import file has an invalid model version")
    if model_version > EXPORT_MODEL_VERSION:
        raise ValueError("Import file was created by a newer Velair version")
    if model_version == 2 and payload.get("temperature_unit", CELSIUS) != CELSIUS:
        raise ValueError("Portable model version 2 contains Celsius data")
    if payload.get("temperature_unit", CELSIUS) not in (CELSIUS, FAHRENHEIT):
        raise ValueError("Portable temperature_unit must be °C or °F")

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
            "preconditioning": deepcopy(zone.get("preconditioning", {})),
            "comfort": deepcopy(zone.get("comfort", {})),
        }
        for entity_id, zone in zones.items()
    }


def _export_preconditioning_learning(
    stored_data: dict[str, Any],
) -> dict[str, Any]:
    """Export normalized learning only for managed climates with samples."""
    zones = stored_data["zones"]
    history_sizes = {
        entity_id: normalize_preconditioning_data(zone.get("preconditioning"))[
            "learning_history_size"
        ]
        for entity_id, zone in zones.items()
    }
    normalized = normalize_preconditioning_learning_data(
        stored_data.get("preconditioning_learning"),
        list(zones),
        history_sizes,
    )
    return {
        entity_id: learning
        for entity_id, learning in normalized.items()
        if any(
            learning[direction]["observations"]
            for direction in ("heat", "cool")
        )
    }


def _normalize_import_preconditioning_learning(
    raw_learning: Any,
    current_zones: dict[str, Any],
) -> dict[str, Any]:
    """Normalize learning for matching managed climates and ignore the rest."""
    if not isinstance(raw_learning, dict):
        raise ValueError("Preconditioning learning section is not valid")

    matched_entities = [
        entity_id for entity_id in current_zones if entity_id in raw_learning
    ]
    history_sizes = {
        entity_id: normalize_preconditioning_data(
            current_zones[entity_id].get("preconditioning")
        )["learning_history_size"]
        for entity_id in matched_entities
    }
    normalized = normalize_preconditioning_learning_data(
        raw_learning,
        matched_entities,
        history_sizes,
    )
    for entity_id, learning in normalized.items():
        for direction in ("heat", "cool"):
            for observation in learning[direction]["observations"]:
                observation["entity_id"] = entity_id
    return {
        entity_id: learning
        for entity_id, learning in normalized.items()
        if any(
            learning[direction]["observations"]
            for direction in ("heat", "cool")
        )
    }


def _build_preconditioning_learning_response(
    stored_data: dict[str, Any],
    climate_manager,
) -> dict[str, Any]:
    """Build non-portable local adaptive preconditioning status."""
    zones = stored_data["zones"]
    learning = stored_data.get("preconditioning_learning", {})
    return {
        entity_id: _build_zone_preconditioning_learning_summary(
            zone,
            learning.get(entity_id, {}),
            climate_manager.supported_hvac_modes(entity_id),
        )
        for entity_id, zone in zones.items()
    }


def _runtime_climate_manager(runtime: dict[str, Any]):
    """Return the climate manager from current or legacy runtime data."""
    climate_manager = runtime.get("climate_manager")
    if climate_manager is not None:
        return climate_manager

    entry = runtime.get("entry")
    runtime_data = getattr(entry, "runtime_data", None)
    climate_manager = getattr(runtime_data, "climate_manager", None)
    if climate_manager is not None:
        return climate_manager

    return getattr(runtime["scheduler"], "_climate_manager")


def _schedule_response_next_events(scheduler) -> list[ClimateEvent]:
    """Return upcoming events intended for the UI response."""
    cached = getattr(scheduler, "next_events_by_zone", None)
    if isinstance(cached, list):
        return cached

    calculate_by_zone = getattr(scheduler, "calculate_next_events_by_zone", None)
    if callable(calculate_by_zone):
        return calculate_by_zone(dt_util.now())

    return list(getattr(scheduler, "next_events", []))


def _build_zone_preconditioning_learning_summary(
    zone: dict[str, Any],
    learning: dict[str, Any],
    supported_hvac_modes: list[str],
) -> dict[str, Any]:
    """Build learning status for one zone."""
    heat_observations = preconditioning_observations_for_direction(learning, "heat")
    cool_observations = preconditioning_observations_for_direction(learning, "cool")

    heat_supported = _supports_preconditioning_direction(supported_hvac_modes, "heat")
    cool_supported = _supports_preconditioning_direction(supported_hvac_modes, "cool")
    preconditioning = normalize_preconditioning_data(zone.get("preconditioning"))
    heat = _build_preconditioning_direction_summary(
        heat_observations,
        preconditioning,
        direction="heat",
        supported=heat_supported,
    )
    cool = _build_preconditioning_direction_summary(
        cool_observations,
        preconditioning,
        direction="cool",
        supported=cool_supported,
    )
    ready = heat["status"] == "ready" or cool["status"] == "ready"

    return {
        "status": "ready" if ready else ("learning" if preconditioning["enabled"] else "disabled"),
        "required_samples": MIN_PRECONDITIONING_COMPLETE_SAMPLES,
        "total_samples": len(heat_observations) + len(cool_observations),
        "heat": heat,
        "cool": cool,
    }


def _build_preconditioning_direction_summary(
    observations: list[Any],
    preconditioning: dict[str, Any],
    *,
    direction: str,
    supported: bool,
) -> dict[str, Any]:
    """Build learning status for one preconditioning direction."""
    directional = [
        observation
        for observation in observations
        if isinstance(observation, dict)
    ]
    complete_count = sum(
        1
        for observation in directional
        if observation.get("quality") == "complete" and observation.get("reached") is True
    )
    partial_count = sum(
        1
        for observation in directional
        if observation.get("quality") == "partial" and observation.get("reached") is False
    )
    invalid_count = sum(
        1 for observation in directional if observation.get("quality") == "invalid"
    )
    status = (
        "ready"
        if complete_count >= MIN_PRECONDITIONING_COMPLETE_SAMPLES
        else "learning"
    )
    model_source = "history" if status == "ready" else "initial_model"
    last_observation = directional[-1] if directional else None
    active_comfort_percentile = preconditioning_comfort_percentile(
        directional,
        direction,
        preconditioning,
    )
    if not supported:
        return {
            "status": "unsupported",
            "sample_count": complete_count,
            "total_samples": len(directional),
            "required_samples": MIN_PRECONDITIONING_COMPLETE_SAMPLES,
            "effective_lead_minutes": None,
            "effective_lead_source": "unsupported",
            "partial_sample_count": partial_count,
            "complete_sample_count": complete_count,
            "invalid_sample_count": invalid_count,
            "lead_limited_by_max": False,
            "last_quality": None,
            "model_source": None,
            "comfort_percentile": active_comfort_percentile,
            "similar_sample_count": preconditioning["similar_sample_count"],
        }

    return {
        "status": status,
        "sample_count": complete_count,
        "total_samples": len(directional),
        "required_samples": MIN_PRECONDITIONING_COMPLETE_SAMPLES,
        "effective_lead_minutes": None,
        "effective_lead_source": model_source,
        "partial_sample_count": partial_count,
        "complete_sample_count": complete_count,
        "invalid_sample_count": invalid_count,
        "lead_limited_by_max": False,
        "last_quality": (
            last_observation.get("quality")
            if isinstance(last_observation, dict)
            else None
        ),
        "model_source": model_source,
        "comfort_percentile": active_comfort_percentile,
        "similar_sample_count": preconditioning["similar_sample_count"],
    }


def _supports_preconditioning_direction(
    supported_hvac_modes: list[str],
    direction: str,
) -> bool:
    """Return whether a climate supports a preconditioning direction."""
    if not supported_hvac_modes:
        return True

    supported_modes = set(supported_hvac_modes)
    if direction == "heat":
        return bool({"heat", "heat_cool", "auto"}.intersection(supported_modes))
    return bool({"cool", "heat_cool", "auto"}.intersection(supported_modes))


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

    payload: dict[str, Any] = {
        "entity_id": event.entity_id,
        "when": event.when.isoformat(),
        "action": event.action,
        "temperature": event.temperature,
        "hvac_mode": event.hvac_mode,
        "weekday": event.weekday,
        "start": event.start,
        "target_when": (
            event.target_when.isoformat() if event.target_when is not None else None
        ),
    }
    for attr in (
        ATTR_FAN_MODE,
        ATTR_PRESET_MODE,
        ATTR_SWING_MODE,
        ATTR_SWING_HORIZONTAL_MODE,
        ATTR_HUMIDITY,
    ):
        value = getattr(event, attr, None)
        if value not in (None, ""):
            payload[attr] = value
    if event.preconditioning_diagnostics is not None:
        payload["preconditioning_diagnostics"] = event.preconditioning_diagnostics
    return payload
