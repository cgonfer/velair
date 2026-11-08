"""Deterministic service-capable entities, loaded only in disposable CI HA."""

from __future__ import annotations

import asyncio
from datetime import timedelta
from time import monotonic

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.discovery import async_load_platform
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.event import async_track_time_interval

DOMAIN = "velair_test"
PLATFORMS = ("climate", "sensor", "binary_sensor", "light", "switch", "cover")
CONFIG_SCHEMA = vol.Schema({DOMAIN: vol.Schema({vol.Optional("size", default="small"): vol.In(("small", "large"))})}, extra=vol.ALLOW_EXTRA)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    size = config[DOMAIN]["size"]
    hass.data[DOMAIN] = {"size": size, "entities": {}, "event_loop_lag_ms": 0.0}

    async def control(call: ServiceCall) -> None:
        entity = hass.data[DOMAIN]["entities"].get(call.data["entity_id"])
        if entity is None:
            raise HomeAssistantError("Only Velair CI fixture entities can be controlled")
        entity.control(dict(call.data))

    async def reset(_call: ServiceCall) -> None:
        for entity in hass.data[DOMAIN]["entities"].values():
            entity.reset()
            entity.async_write_ha_state()

    hass.services.async_register(DOMAIN, "control", control, schema=vol.Schema({
        vol.Required("entity_id"): cv.entity_id,
        vol.Optional("available"): cv.boolean,
        vol.Optional("delay_ms"): vol.All(vol.Coerce(float), vol.Range(min=0, max=30000)),
        vol.Optional("current_temperature"): vol.Coerce(float),
        vol.Optional("temperature"): vol.Coerce(float),
        vol.Optional("target_temp_low"): vol.Coerce(float),
        vol.Optional("target_temp_high"): vol.Coerce(float),
        vol.Optional("hvac_mode"): vol.In(("off", "heat", "cool", "heat_cool")),
        vol.Optional("state"): vol.In(("on", "off")),
        vol.Optional("brightness"): vol.All(vol.Coerce(int), vol.Range(min=0, max=255)),
        vol.Optional("position"): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
    }))
    hass.services.async_register(DOMAIN, "reset", reset, schema=vol.Schema({}))

    expected = monotonic() + 1

    @callback
    def measure_lag(_now) -> None:
        nonlocal expected
        now = monotonic()
        hass.data[DOMAIN]["event_loop_lag_ms"] = max(0, (now - expected) * 1000)
        expected = now + 1
        lag = hass.data[DOMAIN]["entities"].get("sensor.quality_event_loop_lag")
        if lag is not None:
            lag.async_write_ha_state()

    async_track_time_interval(hass, measure_lag, timedelta(seconds=1))
    for platform in PLATFORMS:
        hass.async_create_task(async_load_platform(hass, platform, DOMAIN, {}, config))
    return True


class FixtureEntity(Entity):
    """Shared test controls; no polling or physical device access."""

    _attr_should_poll = False

    def __init__(self, entity_id: str, name: str) -> None:
        self.entity_id = entity_id
        self._attr_unique_id = entity_id
        self._attr_name = name
        self.reset()

    def reset(self) -> None:
        self._attr_available = True
        self.delay_ms = 0.0
        self._attr_is_on = False
        self._attr_current_cover_position = 0
        self._attr_brightness = 128

    async def async_added_to_hass(self) -> None:
        self.hass.data[DOMAIN]["entities"][self.entity_id] = self

    async def async_will_remove_from_hass(self) -> None:
        self.hass.data[DOMAIN]["entities"].pop(self.entity_id, None)

    async def before_command(self) -> None:
        if self.delay_ms:
            await asyncio.sleep(self.delay_ms / 1000)
        if not self.available:
            raise HomeAssistantError("CI fixture is unavailable")

    @callback
    def control(self, data: dict) -> None:
        if "hvac_mode" in data and data["hvac_mode"] not in getattr(self, "hvac_modes", ()):
            raise HomeAssistantError("Unsupported HVAC mode for CI fixture")
        fields = {"available": "_attr_available", "delay_ms": "delay_ms",
                  "current_temperature": "_attr_current_temperature", "temperature": "_attr_target_temperature",
                  "target_temp_low": "_attr_target_temperature_low", "target_temp_high": "_attr_target_temperature_high",
                  "brightness": "_attr_brightness", "position": "_attr_current_cover_position"}
        for key, attribute in fields.items():
            if key in data:
                if self.entity_id.startswith("climate.") and key in ("current_temperature", "temperature", "target_temp_low", "target_temp_high"):
                    attribute = attribute.replace("_attr_", "_attr_native_", 1)
                setattr(self, attribute, data[key])
        if "hvac_mode" in data:
            self._attr_hvac_mode = data["hvac_mode"]
        if "state" in data:
            self._attr_is_on = data["state"] == "on"
        self.async_write_ha_state()


def entity_count(hass: HomeAssistant, small: int, large: int) -> int:
    return small if hass.data[DOMAIN]["size"] == "small" else large
