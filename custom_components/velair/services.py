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
    ATTR_HVAC_MODE,
    ATTR_SOURCE_WEEKDAY,
    ATTR_TARGET_WEEKDAYS,
    ATTR_TEMPERATURE,
    ATTR_WEEKDAY,
    DOMAIN,
    HVAC_MODE_OPTIONS,
    MODE_AUTO,
    MODE_PAUSED,
    SERVICE_APPLY_SCHEDULE,
    SERVICE_BOOST,
    SERVICE_CLEAR_SCHEDULE,
    SERVICE_COPY_DAY_SCHEDULE,
    SERVICE_PAUSE,
    SERVICE_PAUSE_ZONE,
    SERVICE_RESUME,
    SERVICE_RESUME_ZONE,
    SERVICE_SET_DAILY_SCHEDULE,
    SERVICE_SET_TEMPERATURE,
    ZONE_PAUSE_ACTION_NONE,
    ZONE_PAUSE_ACTION_OPTIONS,
)
from .models import WEEKDAYS, normalize_schedule_blocks

SCHEDULE_BLOCK_SCHEMA = vol.Schema(
    {
        vol.Required("start"): cv.string,
        vol.Optional(ATTR_ACTION, default=ACTION_SET_TEMPERATURE): vol.In(ACTION_OPTIONS),
        vol.Optional(ATTR_TEMPERATURE): vol.Coerce(float),
        vol.Optional(ATTR_HVAC_MODE): vol.In(HVAC_MODE_OPTIONS),
    }
)

SET_TEMPERATURE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_TEMPERATURE): vol.Coerce(float),
        vol.Optional(ATTR_HVAC_MODE): vol.In(HVAC_MODE_OPTIONS),
    }
)

APPLY_SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_HVAC_MODE): vol.In(HVAC_MODE_OPTIONS),
    }
)

BOOST_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_TEMPERATURE): vol.Coerce(float),
        vol.Required(ATTR_DURATION_MINUTES): vol.All(vol.Coerce(int), vol.Range(min=1)),
        vol.Optional(ATTR_HVAC_MODE): vol.In(HVAC_MODE_OPTIONS),
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
    }
)

RESUME_ZONE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_APPLY_CURRENT_SCHEDULE, default=True): cv.boolean,
    }
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
                call.data[ATTR_TEMPERATURE],
                ensure_on=True,
                hvac_mode=call.data.get(ATTR_HVAC_MODE),
                log_action=False,
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

    async def async_boost(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        paused_until = (
            datetime.now(UTC) + timedelta(minutes=call.data[ATTR_DURATION_MINUTES])
        ).isoformat()

        try:
            await scheduler.async_set_temperature(
                entity_id,
                call.data[ATTR_TEMPERATURE],
                ensure_on=True,
                hvac_mode=call.data.get(ATTR_HVAC_MODE),
            )
            await scheduler.async_set_zone_boost(
                entity_id,
                call.data[ATTR_TEMPERATURE],
                paused_until,
                call.data.get(ATTR_HVAC_MODE),
            )
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
            await scheduler.async_pause_zone(
                entity_id,
                until=paused_until,
                action=call.data[ATTR_ACTION],
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_resume_zone(call: ServiceCall) -> None:
        scheduler = _get_scheduler(hass)
        entity_id = call.data[ATTR_ENTITY_ID]
        _ensure_managed_entity(scheduler, entity_id)
        await scheduler.async_resume_zone(
            entity_id,
            apply_current_schedule=call.data[ATTR_APPLY_CURRENT_SCHEDULE],
        )

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
        SERVICE_BOOST,
        async_boost,
        schema=BOOST_SCHEMA,
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


async def async_unload_services(hass: HomeAssistant) -> None:
    """Remove integration services."""
    for service in (
        SERVICE_SET_TEMPERATURE,
        SERVICE_APPLY_SCHEDULE,
        SERVICE_BOOST,
        SERVICE_PAUSE,
        SERVICE_PAUSE_ZONE,
        SERVICE_RESUME,
        SERVICE_RESUME_ZONE,
        SERVICE_SET_DAILY_SCHEDULE,
        SERVICE_COPY_DAY_SCHEDULE,
        SERVICE_CLEAR_SCHEDULE,
    ):
        hass.services.async_remove(DOMAIN, service)


def _get_scheduler(hass: HomeAssistant) -> Any:
    """Return the active scheduler instance."""
    entries = hass.data.get(DOMAIN, {})
    if not entries:
        raise RuntimeError("Velair is not loaded")

    return next(iter(entries.values()))["scheduler"]


def _ensure_managed_entity(scheduler: Any, entity_id: str) -> None:
    """Raise a Home Assistant error if an entity is not managed."""
    try:
        scheduler.ensure_managed_entity(entity_id)
    except ValueError as err:
        raise HomeAssistantError(str(err)) from err
