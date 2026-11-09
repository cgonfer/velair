"""Heating, cooling and range-capable virtual thermostats."""

from homeassistant.components.climate import ClimateEntity, ClimateEntityFeature, HVACMode
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature

from . import FixtureEntity, entity_count


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([TestClimate(index) for index in range(entity_count(hass, 3, 30))])


class TestClimate(FixtureEntity, ClimateEntity):
    _attr_native_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_min_temp = 5
    _attr_max_temp = 35
    _attr_target_temperature_step = 0.5

    def __init__(self, index):
        self.kind = ("heat", "cool", "range")[index % 3]
        self._attr_hvac_modes = [HVACMode.OFF, {"heat": HVACMode.HEAT, "cool": HVACMode.COOL, "range": HVACMode.HEAT_COOL}[self.kind]]
        self._attr_supported_features = (ClimateEntityFeature.TARGET_TEMPERATURE_RANGE if self.kind == "range" else ClimateEntityFeature.TARGET_TEMPERATURE) | ClimateEntityFeature.TURN_ON | ClimateEntityFeature.TURN_OFF
        super().__init__(f"climate.quality_{self.kind}_{index + 1:02}", f"Quality {self.kind.title()} {index + 1:02}")

    def reset(self):
        super().reset()
        self._attr_hvac_mode = HVACMode.OFF
        self._attr_native_current_temperature = 20.0
        self._attr_native_target_temperature = 21.0
        self._attr_native_target_temperature_low = 19.0
        self._attr_native_target_temperature_high = 24.0

    async def async_set_hvac_mode(self, hvac_mode):
        await self.before_command()
        self._attr_hvac_mode = hvac_mode
        self.async_write_ha_state()

    async def async_set_temperature(self, **kwargs):
        await self.before_command()
        for key, attribute in ((ATTR_TEMPERATURE, "_attr_native_target_temperature"), ("target_temp_low", "_attr_native_target_temperature_low"), ("target_temp_high", "_attr_native_target_temperature_high"), ("hvac_mode", "_attr_hvac_mode")):
            if key in kwargs:
                setattr(self, attribute, kwargs[key])
        self.async_write_ha_state()

    async def async_turn_on(self):
        await self.async_set_hvac_mode(self.hvac_modes[1])

    async def async_turn_off(self):
        await self.async_set_hvac_mode(HVACMode.OFF)
