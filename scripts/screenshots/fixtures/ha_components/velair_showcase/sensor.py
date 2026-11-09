"""Fixed fictional measurements exposed as native HA sensor entities."""
from homeassistant.components.sensor import SensorEntity, SensorStateClass
from . import ENTITIES


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([ShowcaseSensor(spec) for spec in ENTITIES["sensor"]])


class ShowcaseSensor(SensorEntity):
    _attr_should_poll = False
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, spec):
        self.entity_id = spec["entity_id"]
        self._attr_unique_id = self.entity_id
        self._attr_name = spec["name"]
        self._attr_device_class = spec["device_class"]
        self._attr_native_unit_of_measurement = spec["unit"]
        self._attr_native_value = spec["value"]
