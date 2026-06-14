"""Select entities for Velair."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import VelairConfigEntry
from .const import MODE_AUTO, MODE_OPTIONS
from .entity import VelairEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: VelairConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up Velair selects."""
    async_add_entities([SchedulerModeSelect(entry)])


class SchedulerModeSelect(VelairEntity, SelectEntity):
    """Select controlling the global scheduler mode."""

    _attr_options = MODE_OPTIONS
    _attr_translation_key = "scheduler_mode"

    def __init__(self, entry: VelairConfigEntry) -> None:
        """Initialize the select."""
        super().__init__(entry, "scheduler_mode")

    @property
    def current_option(self) -> str:
        """Return the current scheduler mode."""
        return self.scheduler.mode

    async def async_select_option(self, option: str) -> None:
        """Select a scheduler mode."""
        if option not in MODE_OPTIONS:
            return

        await self.scheduler.async_set_mode(
            option,
            apply_current_schedule=option == MODE_AUTO,
        )
