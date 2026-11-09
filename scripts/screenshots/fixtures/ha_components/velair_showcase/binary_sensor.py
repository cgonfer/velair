"""Native closed-window and open-door examples; no polling or window automation."""
from homeassistant.components.binary_sensor import BinarySensorEntity
from . import ENTITIES


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([ShowcaseWindow(spec) for spec in ENTITIES["binary_sensor"]])


class ShowcaseWindow(BinarySensorEntity):
    _attr_should_poll = False

    def __init__(self, spec):
        self.entity_id = spec["entity_id"]
        self._attr_unique_id = self.entity_id
        self._attr_name = spec["name"]
        self._attr_device_class = spec["device_class"]
        self._attr_is_on = spec["value"]
