"""Select entities for Velair."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import VelairConfigEntry
from .const import MODE_DEFAULT_OPTION, MODE_MANUAL_OPTION
from .entity import VelairEntity

DEFAULT_OPTION = MODE_DEFAULT_OPTION
MANUAL_OPTION = MODE_MANUAL_OPTION


async def async_setup_entry(
    hass: HomeAssistant,
    entry: VelairConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the Velair mode select."""
    async_add_entities([VelairModeSelect(entry)])


class VelairModeSelect(VelairEntity, SelectEntity):
    """Native selector for Default, Manual, and user-defined modes."""

    _attr_translation_key = "mode"

    def __init__(self, entry: VelairConfigEntry) -> None:
        """Initialize the select."""
        super().__init__(entry, "mode")

    @property
    def available(self) -> bool:
        """Return whether Mode selection is safe to use."""
        return not self.scheduler.temperature_migration_blocked

    @property
    def options(self) -> list[str]:
        """Return built-in options followed by custom mode names."""
        return [
            DEFAULT_OPTION,
            MANUAL_OPTION,
            *(mode["name"] for mode in self.scheduler.get_modes()),
        ]

    @property
    def current_option(self) -> str:
        """Derive the selector state from the active profile and mode marker."""
        active_profile_ids = self.scheduler.active_profile_ids
        if not active_profile_ids:
            return DEFAULT_OPTION
        active_mode_id = self.scheduler.active_mode_id
        for mode in self.scheduler.get_modes():
            if (
                mode["key"] == active_mode_id
                and mode["profile_ids"] == active_profile_ids
            ):
                return mode["name"]
        return MANUAL_OPTION

    async def async_select_option(self, option: str) -> None:
        """Apply a built-in or custom mode."""
        if option == DEFAULT_OPTION:
            await self.scheduler.async_deactivate_profile(source="select")
            return
        if option == MANUAL_OPTION:
            await self.scheduler.async_clear_velair_mode()
            return
        mode = next(
            (
                mode
                for mode in self.scheduler.get_modes()
                if mode["name"] == option
            ),
            None,
        )
        if mode is None:
            raise ValueError(f"Unknown mode option: {option}")
        await self.scheduler.async_select_velair_mode(mode["key"])
