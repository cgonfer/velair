"""Service handlers for Velair."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import voluptuous as vol

from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

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
    DOMAIN,
    HVAC_MODE_OPTIONS,
    MODE_AUTO,
    MODE_PAUSED,
    SERVICE_APPLY_SCHEDULE,
    SERVICE_ACTIVATE_PROFILE,
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
    SERVICE_SET_TEMPERATURE,
    ZONE_PAUSE_ACTION_NONE,
    ZONE_PAUSE_ACTION_OPTIONS,
)
from .models import WEEKDAYS, normalize_schedule_blocks, validate_pause_id


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


SCHEDULE_BLOCK_SCHEMA = vol.Schema(
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

PAUSE_ZONE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_DURATION_MINUTES): vol.All(vol.Coerce(int), vol.Range(min=1)),
        vol.Optional(ATTR_ACTION, default=ZONE_PAUSE_ACTION_NONE): vol.In(
            ZONE_PAUSE_ACTION_OPTIONS
        ),
        vol.Optional(ATTR_PAUSE_ID): vol.All(cv.string, _validate_pause_id),
    }
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

SET_DAILY_SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_WEEKDAY): vol.In(WEEKDAYS),
        vol.Required(ATTR_BLOCKS): vol.All(cv.ensure_list, [SCHEDULE_BLOCK_SCHEMA]),
    }
)

COPY_DAY_SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_SOURCE_WEEKDAY): vol.In(WEEKDAYS),
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


async def async_setup_services(hass: HomeAssistant) -> None:
    """Register integration services."""
    if hass.services.has_service(DOMAIN, SERVICE_SET_TEMPERATURE):
        return

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
        await scheduler.async_cancel_zone_boost(entity_id)

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
            await scheduler.async_pause_zone(
                entity_id,
                until=paused_until,
                action=call.data[ATTR_ACTION],
                pause_id=call.data.get(ATTR_PAUSE_ID),
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
            blocks = normalize_schedule_blocks(call.data[ATTR_BLOCKS])
            await scheduler.async_set_daily_schedule(
                entity_id,
                call.data[ATTR_WEEKDAY],
                blocks,
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

    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_TEMPERATURE,
        async_set_temperature,
        schema=SET_TEMPERATURE_SCHEMA,
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


async def async_unload_services(hass: HomeAssistant) -> None:
    """Remove integration services."""
    for service in (
        SERVICE_SET_TEMPERATURE,
        SERVICE_APPLY_SCHEDULE,
        SERVICE_ACTIVATE_PROFILE,
        SERVICE_DEACTIVATE_PROFILE,
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
    ):
        hass.services.async_remove(DOMAIN, service)


def _get_scheduler(hass: HomeAssistant) -> Any:
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
    if getattr(scheduler, "temperature_migration_blocked", False):
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
