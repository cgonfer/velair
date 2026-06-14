"""Storage helpers for Velair."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN
from .models import SchedulerData, normalize_schedule_data, serialize_schedule_data

STORAGE_VERSION = 1


class VelairStorage:
    """Typed wrapper around Home Assistant's Store helper."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        """Initialize storage."""
        self._store: Store[dict[str, Any]] = Store(
            hass,
            STORAGE_VERSION,
            f"{DOMAIN}.{entry_id}",
        )
        self.data: SchedulerData | None = None

    async def async_load(self, climate_entities: list[str]) -> SchedulerData:
        """Load and normalize scheduler data."""
        raw_data = await self._store.async_load()
        self.data = normalize_schedule_data(raw_data, climate_entities)
        await self.async_save()
        return self.data

    async def async_save(self) -> None:
        """Save current scheduler data."""
        if self.data is None:
            return

        await self._store.async_save(serialize_schedule_data(self.data))
