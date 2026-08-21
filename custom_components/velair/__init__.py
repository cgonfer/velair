"""Velair integration."""

from __future__ import annotations

from dataclasses import dataclass
import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_CORE_CONFIG_UPDATE
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.typing import ConfigType

from .api import async_setup_api
from .climate_delivery import ClimateDeliveryCoordinator
from .climate_manager import ClimateManager
from .climate_change_monitor import ClimateChangeMonitor
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
from .runtime_diagnostics import RuntimeDiagnosticsManager
from .scheduler import VelairScheduler
from .services import async_setup_services, async_unload_services
from .storage import VelairStorage
from .temperature_migration import (
    async_dismiss_temperature_migration_notification,
    async_notify_temperature_migration,
)

_LOGGER = logging.getLogger(__name__)

@dataclass(slots=True)
class VelairData:
    """Runtime data for Velair."""

    climate_delivery: ClimateDeliveryCoordinator
    climate_manager: ClimateManager
    diagnostics: RuntimeDiagnosticsManager
    scheduler: VelairScheduler
    storage: VelairStorage
    climate_change_monitor: ClimateChangeMonitor


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
    diagnostics = RuntimeDiagnosticsManager(hass, climate_entities, entry.entry_id)
    await diagnostics.async_load_policy()
    climate_delivery = ClimateDeliveryCoordinator(hass, diagnostics.observe_delivery)
    scheduler = VelairScheduler(
        hass,
        data,
        climate_manager,
        storage.async_save,
        climate_delivery,
    )
    scheduler.set_temperature_migration_blocked(
        storage.temperature_migration_required
    )
    climate_change_monitor = ClimateChangeMonitor(
        hass, climate_entities, climate_manager, scheduler
    )

    entry.runtime_data = VelairData(
        climate_delivery=climate_delivery,
        climate_manager=climate_manager,
        diagnostics=diagnostics,
        scheduler=scheduler,
        storage=storage,
        climate_change_monitor=climate_change_monitor,
    )

    hass.data.setdefault(DOMAIN, {})
    runtime = {
        "climate_delivery": climate_delivery,
        "climate_manager": climate_manager,
        "entry": entry,
        "diagnostics": diagnostics,
        "operation_active": None,
        "operation_recovery": None,
        "scheduler": scheduler,
        "storage": storage,
        "climate_change_monitor": climate_change_monitor,
    }
    hass.data[DOMAIN][entry.entry_id] = runtime

    async_setup_api(hass)
    await async_setup_frontend(hass)
    await async_setup_services(hass)
    diagnostics.async_start(runtime)
    entry.async_on_unload(diagnostics.async_stop)

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

    climate_change_monitor.async_start()
    entry.async_on_unload(climate_change_monitor.async_stop)

    diagnostics.async_finish_startup()
    cleanup_entity_registry(hass, entry, climate_entities)

    if PLATFORMS:
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: VelairConfigEntry,
) -> bool:
    """Unload a Velair config entry."""
    if PLATFORMS and not await hass.config_entries.async_unload_platforms(
        entry, PLATFORMS
    ):
        return False

    try:
        try:
            await entry.runtime_data.scheduler.async_stop()
        except Exception:  # Keep unload recoverable after best-effort RA restore.
            _LOGGER.exception("Failed to stop the Velair scheduler cleanly")
    finally:
        try:
            await entry.runtime_data.climate_delivery.async_stop()
        except Exception:
            _LOGGER.exception("Failed to stop Velair climate delivery cleanly")
        try:
            entry.runtime_data.diagnostics.async_stop()
        except Exception:
            _LOGGER.exception("Failed to stop Velair diagnostics cleanly")

    await async_unload_frontend(hass)
    hass.data[DOMAIN].pop(entry.entry_id, None)
    if not hass.data[DOMAIN]:
        await async_unload_services(hass)

    return True
