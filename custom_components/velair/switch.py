"""Switch entities for Velair."""

from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import VelairConfigEntry
from .const import MODE_AUTO, MODE_PAUSED
from .entity import VelairEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: VelairConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up Velair switches."""
    async_add_entities([ScheduleEnabledSwitch(entry)])


class ScheduleEnabledSwitch(VelairEntity, SwitchEntity):
    """Switch controlling automatic schedule execution."""

    _attr_translation_key = "schedule_enabled"

    def __init__(self, entry: VelairConfigEntry) -> None:
        """Initialize the switch."""
        super().__init__(entry, "schedule_enabled")

    @property
    def is_on(self) -> bool:
        """Return whether automatic scheduling is enabled."""
        return self.scheduler.mode == MODE_AUTO

    async def async_turn_on(self, **kwargs) -> None:
        """Enable automatic scheduling."""
        await self.scheduler.async_set_mode(MODE_AUTO, apply_current_schedule=True)

    async def async_turn_off(self, **kwargs) -> None:
        """Pause automatic scheduling indefinitely."""
        await self.scheduler.async_set_mode(MODE_PAUSED)
