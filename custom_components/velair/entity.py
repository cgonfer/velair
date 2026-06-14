"""Base entities for Velair."""

from __future__ import annotations

from homeassistant.core import callback
from homeassistant.helpers.device_registry import DeviceEntryType
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo, Entity

from . import VelairConfigEntry
from .const import DOMAIN, SIGNAL_SCHEDULER_UPDATED
from .scheduler import VelairScheduler


class VelairEntity(Entity):
    """Base class for Velair entities."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(
        self,
        entry: VelairConfigEntry,
        key: str,
    ) -> None:
        """Initialize the entity."""
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_{key}"

    @property
    def device_info(self) -> DeviceInfo:
        """Return the service device info."""
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name="Velair",
            entry_type=DeviceEntryType.SERVICE,
            manufacturer="Velair",
        )

    @property
    def scheduler(self) -> VelairScheduler:
        """Return the scheduler runtime object."""
        return self._entry.runtime_data.scheduler

    async def async_added_to_hass(self) -> None:
        """Subscribe to scheduler updates."""
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                SIGNAL_SCHEDULER_UPDATED,
                self._handle_scheduler_update,
            )
        )

    @callback
    def _handle_scheduler_update(self) -> None:
        """Write the latest scheduler state."""
        self.async_write_ha_state()
