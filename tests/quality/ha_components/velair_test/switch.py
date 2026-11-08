"""Service-capable switches."""

from homeassistant.components.switch import SwitchEntity
from . import FixtureEntity, entity_count


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([TestSwitch(index) for index in range(entity_count(hass, 5, 10))])


class TestSwitch(FixtureEntity, SwitchEntity):
    def __init__(self, index):
        super().__init__(f"switch.quality_switch_{index + 1:02}", f"Quality Switch {index + 1:02}")

    async def async_turn_on(self, **kwargs):
        await self.before_command()
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs):
        await self.before_command()
        self._attr_is_on = False
        self.async_write_ha_state()
