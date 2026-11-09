"""Native devices loaded only in a disposable documentation HA installation."""
import json
from pathlib import Path

import voluptuous as vol
from homeassistant.helpers.discovery import async_load_platform

DOMAIN = "velair_showcase"
CONFIG_SCHEMA = vol.Schema({DOMAIN: vol.Schema({})}, extra=vol.ALLOW_EXTRA)
ENTITIES = json.loads(Path(__file__).with_name("entities.json").read_text(encoding="utf-8"))


async def async_setup(hass, config):
    for platform in ("sensor", "binary_sensor", "climate"):
        hass.async_create_task(async_load_platform(hass, platform, DOMAIN, {}, config))
    return True
