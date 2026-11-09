"""Test-only controller transport for screenshots; never part of Velair packages.

The production Velair adapter performs its normal detection and HA service call.
This fixture validates and accepts that call rather than manufacturing publication
status or replacing any Velair response. It does not represent physical RF delivery.
"""

from __future__ import annotations

import json

import voluptuous as vol

from homeassistant.const import Platform
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

from .transport import PublicationTransport

DOMAIN = "ramses_cc"


def validated_schedule(raw):
    schedule = json.loads(raw)
    if not isinstance(schedule, list) or len(schedule) != 7:
        raise ValueError("The virtual controller requires a complete seven-day week")
    for index, day in enumerate(schedule):
        if not isinstance(day, dict) or day.get("day_of_week") != index:
            raise ValueError("Controller weekdays must be ordered from Monday")
        points = day.get("switchpoints")
        if not isinstance(points, list) or not 1 <= len(points) <= 6:
            raise ValueError("The virtual controller accepts one to six switchpoints")
        previous = -1
        for point in points:
            hour, minute = map(int, point["time_of_day"].split(":"))
            when = hour * 60 + minute
            value = point["heat_setpoint"]
            if not 0 <= hour < 24 or not 0 <= minute < 60 or minute % 5 or when <= previous:
                raise ValueError("Controller times must be increasing on a five-minute grid")
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not 5 <= value <= 35:
                raise ValueError("Controller temperatures must be between 5 and 35 degrees")
            previous = when
    return schedule


async def async_setup(hass, config):
    return True


async def async_setup_entry(hass, entry):
    transport = PublicationTransport()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"entity": None, "transport": transport}

    async def control_publication(call):
        entity = hass.data[DOMAIN][entry.entry_id]["entity"]
        if entity is None or call.data["entity_id"] != entity.entity_id:
            raise HomeAssistantError("Only the screenshot controller entity is supported")
        transport.configure(hold=call.data.get("hold"), fail=call.data.get("fail"))

    async def set_zone_schedule(call):
        entity = hass.data[DOMAIN][entry.entry_id]["entity"]
        requested = call.data["entity_id"]
        if entity is None or requested != entity.entity_id:
            raise HomeAssistantError("Only the screenshot controller entity is supported")
        try:
            schedule = validated_schedule(call.data["schedule"])
        except (ValueError, TypeError, KeyError) as error:
            raise HomeAssistantError("Invalid virtual-controller schedule") from error
        try:
            await transport.deliver()
        except (RuntimeError, TimeoutError) as error:
            raise HomeAssistantError("Virtual controller rejected the schedule") from error
        entity.accept_schedule(schedule)

    hass.services.async_register(DOMAIN, "set_zone_schedule", set_zone_schedule, schema=vol.Schema({
        vol.Required("entity_id"): cv.entity_id,
        vol.Required("schedule"): str,
    }))
    hass.services.async_register(DOMAIN, "control_publication", control_publication, schema=vol.Schema({
        vol.Required("entity_id"): cv.entity_id,
        vol.Optional("hold"): cv.boolean,
        vol.Optional("fail"): cv.boolean,
    }))
    await hass.config_entries.async_forward_entry_setups(entry, [Platform.CLIMATE])
    return True


async def async_unload_entry(hass, entry):
    unloaded = await hass.config_entries.async_unload_platforms(entry, [Platform.CLIMATE])
    if unloaded:
        hass.data[DOMAIN][entry.entry_id]["transport"].configure(hold=False)
        hass.data[DOMAIN].pop(entry.entry_id, None)
        hass.services.async_remove(DOMAIN, "set_zone_schedule")
        hass.services.async_remove(DOMAIN, "control_publication")
    return unloaded
