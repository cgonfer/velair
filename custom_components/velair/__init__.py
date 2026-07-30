"""Velair integration."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_CORE_CONFIG_UPDATE
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.typing import ConfigType

from .api import async_setup_api
from .climate_manager import ClimateManager
from .config_helpers import (
    get_configured_climate_entities,
    should_apply_active_schedule_on_startup,
)
from .const import DOMAIN, PLATFORMS
from .entity_registry import cleanup_entity_registry
from .frontend import (
    async_setup_frontend,
    async_setup_frontend_route,
    async_unload_frontend,
)
from .scheduler import VelairScheduler
from .services import async_setup_services, async_unload_services
from .storage import VelairStorage
from .temperature_migration import (
    async_dismiss_temperature_migration_notification,
    async_notify_temperature_migration,
)


@dataclass(slots=True)
class VelairData:
    """Runtime data for Velair."""

    climate_manager: ClimateManager
    scheduler: VelairScheduler
    storage: VelairStorage


type VelairConfigEntry = ConfigEntry[VelairData]


async def async_setup(hass: HomeAssistant, _config: ConfigType) -> bool:
    """Set up Velair before config entries are loaded."""
    await async_setup_frontend_route(hass)
    return True


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
    scheduler.set_temperature_migration_blocked(
        storage.temperature_migration_required
    )

    entry.runtime_data = VelairData(
        climate_manager=climate_manager,
        scheduler=scheduler,
        storage=storage,
    )

    hass.data.setdefault(DOMAIN, {})
    runtime = {
        "climate_manager": climate_manager,
        "entry": entry,
        "operation_active": None,
        "operation_recovery": None,
        "scheduler": scheduler,
        "storage": storage,
    }
    hass.data[DOMAIN][entry.entry_id] = runtime

    async_setup_api(hass)
    await async_setup_frontend(hass)
    await async_setup_services(hass)

    @callback
    def _handle_temperature_unit_update(_event: Event) -> None:
        blocked = bool(
            storage.temperature_migration_required
            or runtime.get("operation_active")
            or runtime.get("operation_recovery")
        )
        was_blocked = scheduler.temperature_migration_blocked
        scheduler.set_temperature_migration_blocked(blocked)
        if blocked:
            hass.async_create_task(
                async_notify_temperature_migration(
                    hass,
                    entry.entry_id,
                    storage.temperature_migration_status().get("reason"),
                )
            )
        elif was_blocked:

            async def _async_resume_after_unit_revert() -> None:
                await async_dismiss_temperature_migration_notification(
                    hass, entry.entry_id
                )
                await scheduler.async_start(
                    apply_current_schedule=(
                        should_apply_active_schedule_on_startup(entry)
                    )
                )

            hass.async_create_task(_async_resume_after_unit_revert())

    entry.async_on_unload(
        hass.bus.async_listen(EVENT_CORE_CONFIG_UPDATE, _handle_temperature_unit_update)
    )
    entry.async_on_unload(
        async_track_state_change_event(
            hass,
            climate_entities,
            _handle_temperature_unit_update,
        )
    )

    if storage.temperature_migration_required:
        await async_notify_temperature_migration(
            hass,
            entry.entry_id,
            storage.temperature_migration_status().get("reason"),
        )
    else:
        await scheduler.async_start(
            apply_current_schedule=should_apply_active_schedule_on_startup(entry)
        )

    cleanup_entity_registry(hass, entry, climate_entities)

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
