"""Immediate deterministic cover positions, with configurable command delay."""

from homeassistant.components.cover import CoverEntity, CoverEntityFeature
from . import FixtureEntity, entity_count


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([TestCover(index) for index in range(entity_count(hass, 3, 10))])


class TestCover(FixtureEntity, CoverEntity):
    _attr_supported_features = CoverEntityFeature.OPEN | CoverEntityFeature.CLOSE | CoverEntityFeature.SET_POSITION

    def __init__(self, index):
        super().__init__(f"cover.quality_cover_{index + 1:02}", f"Quality Cover {index + 1:02}")

    @property
    def is_closed(self):
        return self.current_cover_position == 0

    async def async_set_cover_position(self, **kwargs):
        await self.before_command()
        self._attr_current_cover_position = kwargs["position"]
        self.async_write_ha_state()

    async def async_open_cover(self, **kwargs):
        await self.async_set_cover_position(position=100)

    async def async_close_cover(self, **kwargs):
        await self.async_set_cover_position(position=0)
