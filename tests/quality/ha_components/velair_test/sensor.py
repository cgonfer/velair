"""Stable temperature/humidity fixtures and test-only event loop telemetry."""

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.const import UnitOfTemperature

from . import DOMAIN, FixtureEntity, entity_count


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    entities = [TestSensor(index) for index in range(entity_count(hass, 3, 30))]
    entities.extend([TestSensor(0, "humidity"), LoopLagSensor()])
    async_add_entities(entities)


class TestSensor(FixtureEntity, SensorEntity):
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, index, kind="temperature"):
        self.kind = kind
        self._attr_device_class = SensorDeviceClass.TEMPERATURE if kind == "temperature" else SensorDeviceClass.HUMIDITY
        self._attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS if kind == "temperature" else "%"
        super().__init__(f"sensor.quality_{kind}_{index + 1:02}", f"Quality {kind.title()} {index + 1:02}")

    def reset(self):
        super().reset()
        self._attr_current_temperature = 20.0 if self.kind == "temperature" else 45.0

    @property
    def native_value(self):
        return self._attr_current_temperature


class LoopLagSensor(FixtureEntity, SensorEntity):
    _attr_native_unit_of_measurement = "ms"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self):
        super().__init__("sensor.quality_event_loop_lag", "Quality event loop lag")

    @property
    def native_value(self):
        return round(self.hass.data[DOMAIN]["event_loop_lag_ms"], 3)
