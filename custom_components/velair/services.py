"""Service handlers for Velair."""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
import re
from typing import Any

import voluptuous as vol

from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util

from .const import (
    ACTION_OPTIONS,
    ACTION_SET_TEMPERATURE,
    ATTR_ACTION,
    ATTR_APPLY_CURRENT_SCHEDULE,
    ATTR_BLOCKS,
    ATTR_DURATION_MINUTES,
    ATTR_FAN_MODE,
    ATTR_HVAC_MODE,
    ATTR_HUMIDITY,
    ATTR_PAUSE_ID,
    ATTR_PRESET_MODE,
    ATTR_PROFILE_ID,
    ATTR_RESUME_ALL,
    ATTR_SOURCE_WEEKDAY,
    ATTR_SWING_HORIZONTAL_MODE,
    ATTR_SWING_MODE,
    ATTR_TARGET_TEMP_HIGH,
    ATTR_TARGET_TEMP_LOW,
    ATTR_TARGET_WEEKDAYS,
    ATTR_TEMPERATURE,
    ATTR_WEEKDAY,
    ATTR_POLICY,
    DOMAIN,
    HVAC_MODE_OPTIONS,
    MODE_AUTO,
    MODE_PAUSED,
    SERVICE_APPLY_SCHEDULE,
    SERVICE_ACTIVATE_PROFILE,
    SERVICE_ACTIVATE_PROFILES,
    SERVICE_APPLY_PROFILES,
    SERVICE_SET_ZONE_PROFILE,
    SERVICE_CLEAR_PROFILE_OVERRIDES,
    SERVICE_DEACTIVATE_PROFILE,
    SERVICE_BOOST,
    SERVICE_CANCEL_BOOST,
    SERVICE_CLEAR_SCHEDULE,
    SERVICE_COPY_DAY_SCHEDULE,
    SERVICE_DISABLE_ROOM_SENSOR_ASSIST,
    SERVICE_ENABLE_ROOM_SENSOR_ASSIST,
    SERVICE_PAUSE,
    SERVICE_PAUSE_ZONE,
    SERVICE_RESUME,
    SERVICE_RESUME_ZONE,
    SERVICE_SET_DAILY_SCHEDULE,
    SERVICE_SET_HVAC_MODE,
    SERVICE_SET_TEMPERATURE,
    SERVICE_UPDATE_BLOCK_PRESET,
    SERVICE_SET_EXTERNAL_CHANGE_POLICY,
    SERVICE_ENTER_MANUAL_ADJUSTMENT,
    SERVICE_RESUME_AUTOMATIC_CONTROL,
    SERVICE_START_PLANNED_RETURN,
    SERVICE_CANCEL_PLANNED_RETURN,
    ZONE_PAUSE_ACTION_NONE,
    ZONE_PAUSE_ACTION_OPTIONS,
    EXTERNAL_CHANGE_POLICY_OPTIONS,
)
from .models import WEEKDAYS, normalize_schedule_blocks, validate_pause_id
from .schedule_resources import ConfigurationResourceError, PRESET_CONFIG_FIELDS, validate_preset_update_request
from .selection_requests import (
    clear_overrides_request, profile_set_request, zone_profile_request,
)


def _validate_block_preset_update(data):
    """Validate the flat service request, leaving omission meaningful."""
    try:
        if not isinstance(data.get("preset_key"), str) or not data["preset_key"].strip():
            raise ValueError("preset_key is required")
        operation = data.get("operation", "update")
        if operation == "replace" and "clear_fields" in data:
            raise ValueError("clear_fields is only supported by update")
        validate_preset_update_request(operation, {
            key: value for key, value in data.items() if key in PRESET_CONFIG_FIELDS or key == "action"
        }, data.get("clear_fields", []))
    except (ValueError, TypeError) as err:
        raise vol.Invalid(str(err)) from err
    return data


UPDATE_BLOCK_PRESET_SCHEMA = vol.All(
    vol.Schema({
        vol.Required("preset_key"): cv.string,
        vol.Optional("operation", default="update"): vol.In(("update", "replace")),
        vol.Optional("clear_fields"): [cv.string],
        **{vol.Optional(field): lambda value: value for field in PRESET_CONFIG_FIELDS | {"action"}},
    }, extra=vol.PREVENT_EXTRA),
    _validate_block_preset_update,
)


def _validate_pause_id(value: str) -> str:
    """Validate an optional pause owner for service schemas."""
    try:
        return validate_pause_id(value)
    except ValueError as err:
        raise vol.Invalid(str(err)) from err


def _validate_resume_zone_data(data: dict[str, Any]) -> dict[str, Any]:
    """Reject ambiguous selective-resume combinations."""
    has_id = ATTR_PAUSE_ID in data
    has_resume_all = ATTR_RESUME_ALL in data
    if has_id and has_resume_all:
        raise vol.Invalid("pause_id and resume_all cannot be used together")
    if not has_id and data.get(ATTR_RESUME_ALL) is False:
        raise vol.Invalid("resume_all: false requires pause_id")
    return data


def _validate_pause_zone_data(data: dict[str, Any]) -> dict[str, Any]:
    """Keep fixed-duration and next-block pause expiry mutually exclusive."""
    if data.get("until_next_block") and ATTR_DURATION_MINUTES in data:
        raise vol.Invalid("until_next_block and duration_minutes cannot be used together")
    return data


def _validate_temperature_target_data(data: dict[str, Any]) -> dict[str, Any]:
    """Require exactly one scalar or complete range target."""
    has_temperature = ATTR_TEMPERATURE in data
    has_low = ATTR_TARGET_TEMP_LOW in data
    has_high = ATTR_TARGET_TEMP_HIGH in data
    if has_temperature == (has_low or has_high) or has_low != has_high:
        raise vol.Invalid(
            "Use either temperature or target_temp_low and target_temp_high"
        )
    if has_low and float(data[ATTR_TARGET_TEMP_LOW]) > float(data[ATTR_TARGET_TEMP_HIGH]):
        raise vol.Invalid("target_temp_low must not be greater than target_temp_high")
    return data


INLINE_SCHEDULE_BLOCK_SCHEMA = vol.Schema(
    {
        vol.Required("start"): cv.string,
        vol.Optional(ATTR_ACTION, default=ACTION_SET_TEMPERATURE): vol.In(ACTION_OPTIONS),
        vol.Optional(ATTR_TEMPERATURE): vol.Coerce(float),
        vol.Optional(ATTR_TARGET_TEMP_LOW): vol.Coerce(float),
        vol.Optional(ATTR_TARGET_TEMP_HIGH): vol.Coerce(float),
        vol.Optional(ATTR_HVAC_MODE): vol.In(HVAC_MODE_OPTIONS),
        vol.Optional(ATTR_FAN_MODE): cv.string,
        vol.Optional(ATTR_PRESET_MODE): cv.string,
        vol.Optional(ATTR_SWING_MODE): cv.string,
        vol.Optional(ATTR_SWING_HORIZONTAL_MODE): cv.string,
        vol.Optional(ATTR_HUMIDITY): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
    }
)

def _exclusive_preset_reference(block):
    if "preset_key" in block and set(block) != {"start", "preset_key"}:
        raise vol.Invalid("Preset references cannot contain inline settings")
    return block


SCHEDULE_BLOCK_SCHEMA = vol.All(_exclusive_preset_reference, vol.Any(
    vol.Schema({vol.Required("start"): cv.string, vol.Required("preset_key"): cv.string}),
    INLINE_SCHEDULE_BLOCK_SCHEMA,
))


def _daily_schedule_choice(data):
    if (ATTR_BLOCKS in data) == ("template_link" in data):
        raise vol.Invalid("Provide exactly one of blocks or template_link")
    return data


SET_TEMPERATURE_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Required(ATTR_ENTITY_ID): cv.entity_id,
            vol.Optional(ATTR_TEMPERATURE): vol.Coerce(float),
            vol.Optional(ATTR_TARGET_TEMP_LOW): vol.Coerce(float),
            vol.Optional(ATTR_TARGET_TEMP_HIGH): vol.Coerce(float),
            vol.Optional(ATTR_HVAC_MODE): vol.In(HVAC_MODE_OPTIONS),
            vol.Optional(ATTR_FAN_MODE): cv.string,
            vol.Optional(ATTR_PRESET_MODE): cv.string,
            vol.Optional(ATTR_SWING_MODE): cv.string,
            vol.Optional(ATTR_SWING_HORIZONTAL_MODE): cv.string,
            vol.Optional(ATTR_HUMIDITY): vol.All(
                vol.Coerce(float), vol.Range(min=0, max=100)
            ),
        }
    ),
    _validate_temperature_target_data,
)

SET_HVAC_MODE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_HVAC_MODE): cv.string,
    },
    extra=vol.PREVENT_EXTRA,
)

APPLY_SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_HVAC_MODE): vol.In(HVAC_MODE_OPTIONS),
    }
)

BOOST_SCHEMA = vol.All(
    vol.Schema({
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_TEMPERATURE): vol.Coerce(float),
        vol.Optional(ATTR_TARGET_TEMP_LOW): vol.Coerce(float),
        vol.Optional(ATTR_TARGET_TEMP_HIGH): vol.Coerce(float),
        vol.Required(ATTR_DURATION_MINUTES): vol.All(vol.Coerce(int), vol.Range(min=1)),
        vol.Optional(ATTR_HVAC_MODE): vol.In(HVAC_MODE_OPTIONS),
        vol.Optional(ATTR_FAN_MODE): cv.string,
        vol.Optional(ATTR_PRESET_MODE): cv.string,
        vol.Optional(ATTR_SWING_MODE): cv.string,
        vol.Optional(ATTR_SWING_HORIZONTAL_MODE): cv.string,
        vol.Optional(ATTR_HUMIDITY): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
    }),
    _validate_temperature_target_data,
)

CANCEL_BOOST_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
    }
)

PAUSE_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_DURATION_MINUTES): vol.All(vol.Coerce(int), vol.Range(min=1)),
    }
)

PAUSE_ZONE_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Required(ATTR_ENTITY_ID): cv.entity_id,
            vol.Optional(ATTR_DURATION_MINUTES): vol.All(vol.Coerce(int), vol.Range(min=1)),
            vol.Optional(ATTR_ACTION, default=ZONE_PAUSE_ACTION_NONE): vol.In(
                ZONE_PAUSE_ACTION_OPTIONS
            ),
            vol.Optional(ATTR_PAUSE_ID): vol.All(cv.string, _validate_pause_id),
            vol.Optional("until_next_block"): cv.boolean,
        }
    ),
    _validate_pause_zone_data,
)

RESUME_ZONE_SCHEMA = vol.All(
    vol.Schema({
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_APPLY_CURRENT_SCHEDULE, default=True): cv.boolean,
        vol.Optional(ATTR_PAUSE_ID): vol.All(cv.string, _validate_pause_id),
        vol.Optional(ATTR_RESUME_ALL): cv.boolean,
    }),
    _validate_resume_zone_data,
)

SET_DAILY_SCHEDULE_SCHEMA = vol.All(vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_WEEKDAY): vol.In(WEEKDAYS),
        vol.Optional(ATTR_BLOCKS): vol.All(cv.ensure_list, [SCHEDULE_BLOCK_SCHEMA]),
        vol.Optional("template_link"): dict,
        vol.Optional("unlink_template"): bool,
        vol.Optional("expected_revision"): int,
    }
), _daily_schedule_choice)

COPY_DAY_SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_SOURCE_WEEKDAY): vol.In(WEEKDAYS),
        vol.Optional("target_entity_ids"): vol.All(cv.ensure_list, [cv.entity_id], vol.Length(min=1)),
        vol.Optional("expected_revision"): vol.All(vol.Coerce(int), vol.Range(min=0)),
        vol.Required(ATTR_TARGET_WEEKDAYS): vol.All(
            cv.ensure_list,
            [vol.In(WEEKDAYS)],
            vol.Length(min=1),
        ),
    }
)

CLEAR_SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_WEEKDAY): vol.In(WEEKDAYS),
    }
)

ROOM_SENSOR_ASSIST_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
    }
)

ACTIVATE_PROFILE_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_PROFILE_ID): vol.Any(None, cv.string),
    }
)

PROFILE_SET_SCHEMA = vol.All(vol.Schema({vol.Required("profile_ids"): object}), profile_set_request)
SET_ZONE_PROFILE_SCHEMA = vol.All(vol.Schema({
    vol.Required(ATTR_ENTITY_ID): object,
    vol.Required(ATTR_PROFILE_ID): object,
}), zone_profile_request)
CLEAR_PROFILE_OVERRIDES_SCHEMA = vol.All(vol.Schema({
    vol.Required(ATTR_ENTITY_ID): object,
}), clear_overrides_request)

EXTERNAL_CHANGE_POLICY_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_POLICY): vol.In(EXTERNAL_CHANGE_POLICY_OPTIONS),
        vol.Optional(ATTR_DURATION_MINUTES): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=10080)
        ),
    }
)

RESUME_AUTOMATIC_CONTROL_SCHEMA = vol.Schema(
    {vol.Required(ATTR_ENTITY_ID): cv.entity_id}
)

ENTER_MANUAL_ADJUSTMENT_SCHEMA = vol.Schema(
    {vol.Required(ATTR_ENTITY_ID): cv.entity_id},
    extra=vol.PREVENT_EXTRA,
)


def _validate_return_time(value: str) -> str:
    """Keep automation inputs at the panel's minute resolution."""
    if not isinstance(value, str) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d(?::00)?", value):
        raise vol.Invalid("return_time must use 24-hour HH:MM format (optional seconds must be 00)")
    return value[:5]


def _validate_apply_away_now(value: Any) -> bool:
    if not isinstance(value, bool):
        raise vol.Invalid("apply_away_now must be a boolean")
    return value


def _validate_start_return_data(data: dict[str, Any]) -> dict[str, Any]:
    value = data.get("return_date")
    try:
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError
        return_date = date.fromisoformat(value)
    except ValueError as err:
        raise vol.Invalid("return_date must be a valid YYYY-MM-DD date") from err
    result = {"return_date": return_date.isoformat(), "return_time": _validate_return_time(data.get("return_time"))}
    if "apply_away_now" in data:
        result["apply_away_now"] = _validate_apply_away_now(data["apply_away_now"])
    return result


START_PLANNED_RETURN_SCHEMA = vol.All(
    vol.Schema({vol.Required("return_date"): cv.string, vol.Required("return_time"): cv.string,
                vol.Optional("apply_away_now"): _validate_apply_away_now}, extra=vol.PREVENT_EXTRA),
    _validate_start_return_data,
)
CANCEL_PLANNED_RETURN_SCHEMA = vol.Schema({}, extra=vol.PREVENT_EXTRA)


async def async_setup_services(hass: HomeAssistant) -> None:
    """Register integration services."""
    if hass.services.has_service(DOMAIN, SERVICE_SET_TEMPERATURE):
        return

    async def async_start_planned_return(call: ServiceCall) -> None:
        # Reuse the scheduler's DST occurrence resolver; explicit nonexistent
        # wall times must be rejected rather than shifted like schedule blocks.
        from .scheduler import _local_schedule_occurrences

        scheduler = _get_scheduler(hass)
        hour, minute = map(int, call.data["return_time"].split(":"))
        now = dt_util.now()
        requested_date = date.fromisoformat(call.data["return_date"])
        requested = time(hour, minute)
        arrival = next((candidate for candidate in _local_schedule_occurrences(
            requested_date, requested, dt_util.as_local(now).tzinfo,
        ) if candidate.date() == requested_date and candidate.time() == requested
            and dt_util.as_utc(candidate) > dt_util.as_utc(now)), None)
        if arrival is None:
            raise HomeAssistantError("Return date and time must be valid and in the future in the Home Assistant time zone")
        try:
            options = {"apply_away_now": call.data["apply_away_now"]} if "apply_away_now" in call.data else {}
            await scheduler.async_start_planned_return(dt_util.as_utc(arrival).isoformat(), **options)
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_cancel_planned_return(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass, allow_migration_blocked=True)
        try:
            await scheduler.async_cancel_planned_return()
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_update_block_preset(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        try:
            await scheduler.async_update_block_preset(
                call.data["preset_key"],
                {key: value for key, value in call.data.items() if key in PRESET_CONFIG_FIELDS or key == "action"},
                operation=call.data.get("operation", "update"),
                clear_fields=call.data.get("clear_fields", []),
            )
        except ConfigurationResourceError as err:
            affected = [
                f"{'Default' if usage.get('source') == 'default' else 'Profile ' + str(usage.get('profile_key', '?'))}: {usage.get('entity_id', '?')}"
                for usage in err.usages
            ]
            message = str(err)
            if affected:
                message += "; affected destinations: " + "; ".join(affected)
            raise HomeAssistantError(message) from err
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_set_temperature(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            await scheduler.async_set_temperature(
                entity_id,
                call.data.get(ATTR_TEMPERATURE),
                target_temp_low=call.data.get(ATTR_TARGET_TEMP_LOW),
                target_temp_high=call.data.get(ATTR_TARGET_TEMP_HIGH),
                ensure_on=True,
                fan_mode=call.data.get(ATTR_FAN_MODE),
                hvac_mode=call.data.get(ATTR_HVAC_MODE),
                humidity=call.data.get(ATTR_HUMIDITY),
                log_action=False,
                preset_mode=call.data.get(ATTR_PRESET_MODE),
                swing_mode=call.data.get(ATTR_SWING_MODE),
                swing_horizontal_mode=call.data.get(ATTR_SWING_HORIZONTAL_MODE),
                event_source="service_set_temperature",
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_set_hvac_mode(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            await scheduler.async_set_hvac_mode(
                entity_id,
                call.data[ATTR_HVAC_MODE],
                event_source="service_set_hvac_mode",
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_apply_schedule(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data.get(ATTR_ENTITY_ID)
        if entity_id is not None:
            _ensure_managed_entity(scheduler, entity_id)
        await scheduler.async_apply_current_schedule(
            entity_id,
            hvac_mode=call.data.get(ATTR_HVAC_MODE),
        )

    async def async_activate_profile(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        try:
            await scheduler.async_activate_profile(
                call.data.get(ATTR_PROFILE_ID), source="service"
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_deactivate_profile(_call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        try:
            await scheduler.async_deactivate_profile(source="service")
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_activate_profiles(call: ServiceCall) -> None:
        try:
            await _get_scheduler(hass).async_activate_profiles(call.data["profile_ids"], source="service")
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_apply_profiles(call: ServiceCall) -> None:
        try:
            await _get_scheduler(hass).async_apply_profiles(call.data["profile_ids"], source="service")
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_set_zone_profile(call: ServiceCall) -> None:
        try:
            await _get_scheduler(hass).async_set_zone_profile(
                call.data[ATTR_ENTITY_ID], call.data[ATTR_PROFILE_ID], source="service"
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_clear_profile_overrides(call: ServiceCall) -> None:
        try:
            await _get_scheduler(hass).async_clear_profile_overrides(call.data[ATTR_ENTITY_ID], source="service")
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_boost(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        paused_until = (
            datetime.now(UTC) + timedelta(minutes=call.data[ATTR_DURATION_MINUTES])
        ).isoformat()

        try:
            await scheduler.async_set_zone_boost(
                entity_id,
                call.data.get(ATTR_TEMPERATURE),
                paused_until,
                call.data.get(ATTR_HVAC_MODE),
                target_temp_low=call.data.get(ATTR_TARGET_TEMP_LOW),
                target_temp_high=call.data.get(ATTR_TARGET_TEMP_HIGH),
                fan_mode=call.data.get(ATTR_FAN_MODE),
                humidity=call.data.get(ATTR_HUMIDITY),
                preset_mode=call.data.get(ATTR_PRESET_MODE),
                swing_mode=call.data.get(ATTR_SWING_MODE),
                swing_horizontal_mode=call.data.get(ATTR_SWING_HORIZONTAL_MODE),
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_cancel_boost(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            await scheduler.async_cancel_zone_boost(entity_id)
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_pause(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)

        duration = call.data.get(ATTR_DURATION_MINUTES)
        paused_until = (
            (datetime.now(UTC) + timedelta(minutes=duration)).isoformat()
            if duration is not None
            else None
        )
        await scheduler.async_set_mode(MODE_PAUSED, paused_until=paused_until)

    async def async_resume(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        await scheduler.async_set_mode(MODE_AUTO, apply_current_schedule=True)

    async def async_pause_zone(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        duration = call.data.get(ATTR_DURATION_MINUTES)
        paused_until = (
            (datetime.now(UTC) + timedelta(minutes=duration)).isoformat()
            if duration is not None
            else None
        )
        try:
            expiry_kwargs = {}
            if "until_next_block" in call.data:
                expiry_kwargs["until_next_block"] = call.data["until_next_block"]
            await scheduler.async_pause_zone(
                entity_id,
                until=paused_until,
                action=call.data[ATTR_ACTION],
                pause_id=call.data.get(ATTR_PAUSE_ID),
                **expiry_kwargs,
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_resume_zone(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            resume_kwargs = {
                "apply_current_schedule": call.data[ATTR_APPLY_CURRENT_SCHEDULE],
                "pause_id": call.data.get(ATTR_PAUSE_ID),
                "reason": "service",
            }
            if ATTR_RESUME_ALL in call.data:
                resume_kwargs["resume_all"] = call.data[ATTR_RESUME_ALL]
            await scheduler.async_resume_zone(entity_id, **resume_kwargs)
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_set_daily_schedule(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            _daily_schedule_choice(call.data)
            blocks = normalize_schedule_blocks(call.data[ATTR_BLOCKS]) if ATTR_BLOCKS in call.data else None
            await scheduler.async_set_daily_schedule(
                entity_id,
                call.data[ATTR_WEEKDAY],
                blocks,
                **{key: call.data[key] for key in ("template_link", "unlink_template", "expected_revision") if key in call.data},
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_copy_day_schedule(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            await scheduler.async_copy_day_schedule(
                entity_id,
                call.data[ATTR_SOURCE_WEEKDAY],
                call.data[ATTR_TARGET_WEEKDAYS],
                target_entity_ids=call.data.get("target_entity_ids"),
                expected_revision=call.data.get("expected_revision"),
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_clear_schedule(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            await scheduler.async_clear_schedule(
                entity_id,
                call.data.get(ATTR_WEEKDAY),
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_enable_room_sensor_assist(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            await scheduler.async_set_room_sensor_assist(entity_id, True)
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_disable_room_sensor_assist(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            await scheduler.async_set_room_sensor_assist(entity_id, False)
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_set_external_change_policy(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        policy = {"action": call.data[ATTR_POLICY]}
        if ATTR_DURATION_MINUTES in call.data:
            policy[ATTR_DURATION_MINUTES] = call.data[ATTR_DURATION_MINUTES]
        try:
            await scheduler.async_update_external_change_policy(entity_id, policy)
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_resume_automatic_control(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            await scheduler.async_resume_automatic_control(entity_id)
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_enter_manual_adjustment(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        try:
            await scheduler.async_enter_manual_adjustment(entity_id)
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_BLOCK_PRESET,
        async_update_block_preset,
        schema=UPDATE_BLOCK_PRESET_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_TEMPERATURE,
        async_set_temperature,
        schema=SET_TEMPERATURE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_HVAC_MODE,
        async_set_hvac_mode,
        schema=SET_HVAC_MODE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_APPLY_SCHEDULE,
        async_apply_schedule,
        schema=APPLY_SCHEDULE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_ACTIVATE_PROFILE,
        async_activate_profile,
        schema=ACTIVATE_PROFILE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_DEACTIVATE_PROFILE,
        async_deactivate_profile,
    )
    for service, handler, schema in (
        (SERVICE_ACTIVATE_PROFILES, async_activate_profiles, PROFILE_SET_SCHEMA),
        (SERVICE_APPLY_PROFILES, async_apply_profiles, PROFILE_SET_SCHEMA),
        (SERVICE_SET_ZONE_PROFILE, async_set_zone_profile, SET_ZONE_PROFILE_SCHEMA),
        (SERVICE_CLEAR_PROFILE_OVERRIDES, async_clear_profile_overrides, CLEAR_PROFILE_OVERRIDES_SCHEMA),
    ):
        hass.services.async_register(DOMAIN, service, handler, schema=schema)
    hass.services.async_register(
        DOMAIN,
        SERVICE_BOOST,
        async_boost,
        schema=BOOST_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_CANCEL_BOOST,
        async_cancel_boost,
        schema=CANCEL_BOOST_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_PAUSE,
        async_pause,
        schema=PAUSE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_RESUME,
        async_resume,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_PAUSE_ZONE,
        async_pause_zone,
        schema=PAUSE_ZONE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_RESUME_ZONE,
        async_resume_zone,
        schema=RESUME_ZONE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_DAILY_SCHEDULE,
        async_set_daily_schedule,
        schema=SET_DAILY_SCHEDULE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_COPY_DAY_SCHEDULE,
        async_copy_day_schedule,
        schema=COPY_DAY_SCHEDULE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_CLEAR_SCHEDULE,
        async_clear_schedule,
        schema=CLEAR_SCHEDULE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_ENABLE_ROOM_SENSOR_ASSIST,
        async_enable_room_sensor_assist,
        schema=ROOM_SENSOR_ASSIST_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_DISABLE_ROOM_SENSOR_ASSIST,
        async_disable_room_sensor_assist,
        schema=ROOM_SENSOR_ASSIST_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_EXTERNAL_CHANGE_POLICY,
        async_set_external_change_policy,
        schema=EXTERNAL_CHANGE_POLICY_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_ENTER_MANUAL_ADJUSTMENT,
        async_enter_manual_adjustment,
        schema=ENTER_MANUAL_ADJUSTMENT_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_RESUME_AUTOMATIC_CONTROL,
        async_resume_automatic_control,
        schema=RESUME_AUTOMATIC_CONTROL_SCHEMA,
    )


    hass.services.async_register(
        DOMAIN, SERVICE_START_PLANNED_RETURN, async_start_planned_return,
        schema=START_PLANNED_RETURN_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_CANCEL_PLANNED_RETURN, async_cancel_planned_return,
        schema=CANCEL_PLANNED_RETURN_SCHEMA,
    )


async def async_unload_services(hass: HomeAssistant) -> None:
    """Remove integration services."""
    for service in (
        SERVICE_UPDATE_BLOCK_PRESET,
        SERVICE_SET_TEMPERATURE,
        SERVICE_SET_HVAC_MODE,
        SERVICE_APPLY_SCHEDULE,
        SERVICE_ACTIVATE_PROFILE,
        SERVICE_DEACTIVATE_PROFILE,
        SERVICE_ACTIVATE_PROFILES,
        SERVICE_APPLY_PROFILES,
        SERVICE_SET_ZONE_PROFILE,
        SERVICE_CLEAR_PROFILE_OVERRIDES,
        SERVICE_BOOST,
        SERVICE_CANCEL_BOOST,
        SERVICE_PAUSE,
        SERVICE_PAUSE_ZONE,
        SERVICE_RESUME,
        SERVICE_RESUME_ZONE,
        SERVICE_SET_DAILY_SCHEDULE,
        SERVICE_COPY_DAY_SCHEDULE,
        SERVICE_CLEAR_SCHEDULE,
        SERVICE_ENABLE_ROOM_SENSOR_ASSIST,
        SERVICE_DISABLE_ROOM_SENSOR_ASSIST,
        SERVICE_SET_EXTERNAL_CHANGE_POLICY,
        SERVICE_ENTER_MANUAL_ADJUSTMENT,
        SERVICE_RESUME_AUTOMATIC_CONTROL,
        SERVICE_START_PLANNED_RETURN,
        SERVICE_CANCEL_PLANNED_RETURN,
    ):
        hass.services.async_remove(DOMAIN, service)


def _get_scheduler(hass: HomeAssistant, *, allow_migration_blocked: bool = False) -> Any:
    """Return the active scheduler instance."""
    entries = hass.data.get(DOMAIN, {})
    if not entries:
        raise RuntimeError("Velair is not loaded")

    runtime = next(iter(entries.values()))
    scheduler = runtime["scheduler"]
    scheduler.set_temperature_migration_blocked(bool(
        runtime["storage"].temperature_migration_required
        or runtime.get("operation_active")
        or runtime.get("operation_recovery")
    ))
    if getattr(scheduler, "temperature_migration_blocked", False) and (
        not allow_migration_blocked or runtime.get("operation_active") or runtime.get("operation_recovery")
    ):
        raise HomeAssistantError(
            "Velair is stopped until the temperature-data migration is resolved"
        )
    return scheduler


def _ensure_managed_entity(scheduler: Any, entity_id: str) -> None:
    """Raise a Home Assistant error if an entity is not managed."""
    try:
        scheduler.ensure_managed_entity(entity_id)
    except ValueError as err:
        raise HomeAssistantError(str(err)) from err
