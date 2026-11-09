"""Virtual heating controller used by the public screenshot household."""

from homeassistant.components.climate import ClimateEntity, ClimateEntityFeature, HVACMode
from homeassistant.const import UnitOfTemperature
from homeassistant.core import callback

from . import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    entity = ScreenshotController()
    hass.data[DOMAIN][entry.entry_id]["entity"] = entity
    async_add_entities([entity])


class ScreenshotController(ClimateEntity):
    _attr_should_poll = False
    _attr_unique_id = "velair_screenshot_guest_room"
    _attr_name = "Guest Room"
    _attr_hvac_modes = [HVACMode.OFF, HVACMode.HEAT]
    _attr_hvac_mode = HVACMode.HEAT
    _attr_native_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_native_current_temperature = 19.5
    _attr_native_target_temperature = 20.0
    _attr_min_temp = 5
    _attr_max_temp = 35
    _attr_target_temperature_step = 0.5
    _attr_supported_features = ClimateEntityFeature.TARGET_TEMPERATURE | ClimateEntityFeature.TURN_ON | ClimateEntityFeature.TURN_OFF

    def __init__(self):
        self.entity_id = "climate.showcase_guest_room"
        self._schedule = []

    @property
    def extra_state_attributes(self):
        return {"screenshot_virtual_controller": True, "accepted_schedule_days": len(self._schedule)}

    @callback
    def accept_schedule(self, schedule):
        self._schedule = schedule
        self.async_write_ha_state()

    async def async_set_temperature(self, **kwargs):
        if "temperature" in kwargs:
            self._attr_native_target_temperature = kwargs["temperature"]
        if "hvac_mode" in kwargs:
            self._attr_hvac_mode = kwargs["hvac_mode"]
        self.async_write_ha_state()

    async def async_set_hvac_mode(self, hvac_mode):
        self._attr_hvac_mode = hvac_mode
        self.async_write_ha_state()

    async def async_turn_on(self):
        await self.async_set_hvac_mode(HVACMode.HEAT)

    async def async_turn_off(self):
        await self.async_set_hvac_mode(HVACMode.OFF)
