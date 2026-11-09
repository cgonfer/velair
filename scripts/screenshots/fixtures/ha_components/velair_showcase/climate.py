"""Virtual cooling thermostat with a native, derived HVAC action."""
from homeassistant.components.climate import ClimateEntity, ClimateEntityFeature, HVACAction, HVACMode
from homeassistant.const import UnitOfTemperature
from . import ENTITIES


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([ShowcaseClimate()])


class ShowcaseClimate(ClimateEntity):
    _attr_should_poll = False
    _attr_hvac_modes = [HVACMode.OFF, HVACMode.COOL]
    _attr_hvac_mode = HVACMode.COOL
    _attr_native_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_min_temp = 5
    _attr_max_temp = 35
    _attr_target_temperature_step = 0.5
    _attr_supported_features = (ClimateEntityFeature.TARGET_TEMPERATURE
                                | ClimateEntityFeature.TURN_ON | ClimateEntityFeature.TURN_OFF)

    def __init__(self):
        spec = ENTITIES["climate"]
        self.entity_id = spec["entity_id"]
        self._attr_unique_id = self.entity_id
        self._attr_name = spec["name"]
        self._attr_native_current_temperature = spec["current_temperature"]
        self._attr_native_target_temperature = spec["temperature"]

    @property
    def hvac_action(self):
        if self.hvac_mode == HVACMode.OFF:
            return HVACAction.OFF
        return HVACAction.COOLING if self.native_current_temperature > self.native_target_temperature else HVACAction.IDLE

    async def async_set_hvac_mode(self, hvac_mode):
        self._attr_hvac_mode = hvac_mode
        self.async_write_ha_state()

    async def async_set_temperature(self, **kwargs):
        if "temperature" in kwargs:
            self._attr_native_target_temperature = kwargs["temperature"]
        if "hvac_mode" in kwargs:
            self._attr_hvac_mode = kwargs["hvac_mode"]
        self.async_write_ha_state()

    async def async_turn_on(self):
        await self.async_set_hvac_mode(HVACMode.COOL)

    async def async_turn_off(self):
        await self.async_set_hvac_mode(HVACMode.OFF)
