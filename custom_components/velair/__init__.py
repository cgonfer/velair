"""Velair integration."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .api import async_setup_api
from .climate_manager import ClimateManager
from .config_helpers import (
    get_configured_climate_entities,
    should_apply_active_schedule_on_startup,
)
from .const import DOMAIN, PLATFORMS
from .frontend import async_setup_frontend, async_unload_frontend
from .scheduler import VelairScheduler
from .services import async_setup_services, async_unload_services
from .storage import VelairStorage


@dataclass(slots=True)
class VelairData:
    """Runtime data for Velair."""

    climate_manager: ClimateManager
    scheduler: VelairScheduler
    storage: VelairStorage


type VelairConfigEntry = ConfigEntry[VelairData]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: VelairConfigEntry,
) -> bool:
    """Set up Velair from a config entry."""
    climate_entities = get_configured_climate_entities(entry)
    storage = VelairStorage(hass, entry.entry_id)
    data = await storage.async_load(climate_entities)
    climate_manager = ClimateManager(hass)
    scheduler = VelairScheduler(hass, data, climate_manager, storage.async_save)

    entry.runtime_data = VelairData(
        climate_manager=climate_manager,
        scheduler=scheduler,
        storage=storage,
    )

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {
        "entry": entry,
        "scheduler": scheduler,
        "storage": storage,
    }

    async_setup_api(hass)
    await async_setup_frontend(hass)
    await async_setup_services(hass)
    await scheduler.async_start(
        apply_current_schedule=should_apply_active_schedule_on_startup(entry)
    )

    if PLATFORMS:
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: VelairConfigEntry,
) -> bool:
    """Unload a Velair config entry."""
    await entry.runtime_data.scheduler.async_stop()

    unload_ok = True

    if PLATFORMS:
        unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        await async_unload_frontend(hass)
        hass.data[DOMAIN].pop(entry.entry_id, None)
        if not hass.data[DOMAIN]:
            await async_unload_services(hass)

    return unload_ok
