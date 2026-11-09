"""Service-capable lights with deterministic brightness."""

from homeassistant.components.light import ColorMode, LightEntity
from . import FixtureEntity, entity_count


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([TestLight(index) for index in range(entity_count(hass, 5, 10))])


class TestLight(FixtureEntity, LightEntity):
    _attr_color_mode = ColorMode.BRIGHTNESS
    _attr_supported_color_modes = {ColorMode.BRIGHTNESS}

    def __init__(self, index):
        super().__init__(f"light.quality_light_{index + 1:02}", f"Quality Light {index + 1:02}")

    async def async_turn_on(self, **kwargs):
        await self.before_command()
        self._attr_is_on = True
        self._attr_brightness = kwargs.get("brightness", self._attr_brightness)
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs):
        await self.before_command()
        self._attr_is_on = False
        self.async_write_ha_state()
