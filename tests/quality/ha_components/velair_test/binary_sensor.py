"""Controllable occupancy fixture."""

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from . import FixtureEntity


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([Occupancy()])


class Occupancy(FixtureEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.OCCUPANCY

    def __init__(self):
        super().__init__("binary_sensor.quality_occupancy", "Quality occupancy")
