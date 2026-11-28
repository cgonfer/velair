"""Opt-in Home Assistant thermostats for Room Assist targets."""

from __future__ import annotations

from homeassistant.components.climate import ClimateEntity, ClimateEntityFeature, HVACMode
from homeassistant.const import ATTR_TEMPERATURE
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_platform, entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.typing import UNDEFINED

from . import VelairConfigEntry
from .const import DOMAIN, SIGNAL_COMFORT_UPDATED, SIGNAL_SCHEDULER_UPDATED
from .entity import VelairEntity

_KEY = "room_assist_thermostat"


def _thermostat_key(zone: str) -> str:
    return f"{zone.replace('.', '_')}_{_KEY}"


async def async_setup_entry(hass: HomeAssistant, entry: VelairConfigEntry, _add_entities) -> None:
    """Reconcile opt-in entities in place without reloading the scheduler."""
    platform = entity_platform.async_get_current_platform()
    registry = er.async_get(hass)
    scheduler = entry.runtime_data.scheduler
    entities: dict[str, RoomAssistClimate] = {}
    task = None
    dirty = False

    async def reconcile() -> None:
        nonlocal dirty
        while dirty:
            dirty = False
            zones = scheduler.room_assist_climate_zones()
            wanted = {RoomAssistClimate.unique_id_for(entry, zone) for zone in zones}
            for zone in entities.keys() - zones.keys():
                entity = entities.pop(zone)
                if platform.entities.get(entity.entity_id) is entity:
                    await entity.async_remove(force_remove=True)
            for item in er.async_entries_for_config_entry(registry, entry.entry_id):
                if (item.domain == "climate" and item.platform == DOMAIN
                        and item.unique_id.endswith(f"_{_KEY}") and item.unique_id not in wanted):
                    registry.async_remove(item.entity_id)
            new = []
            for zone, name in zones.items():
                if zone not in entities:
                    entity = entities[zone] = RoomAssistClimate(entry, zone, name)
                    new.append(entity)
                elif entities[zone].zone_name != name:
                    entities[zone].async_set_zone_name(name, registry)
            if new:
                await platform.async_add_entities(new)

    @callback
    def handle_update() -> None:
        nonlocal dirty, task
        # Ordinary scheduler observations don't need to touch the registry.
        if (task is None or task.done()) and scheduler.room_assist_climate_zones() == {
            zone: entity.zone_name for zone, entity in entities.items()
        }:
            return
        dirty = True
        if task is None or task.done():
            task = entry.async_create_task(hass, reconcile(), "Velair Room Assist climate entities")

    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_SCHEDULER_UPDATED, handle_update))
    dirty = True
    task = entry.async_create_task(hass, reconcile(), "Set up Velair Room Assist climate entities")
    await task


class RoomAssistClimate(VelairEntity, ClimateEntity):
    """Show room readings and adjust only the room temperature target."""

    _attr_translation_key = _KEY
    _attr_hvac_modes = [HVACMode.HEAT]
    _attr_hvac_mode = HVACMode.HEAT
    _attr_supported_features = ClimateEntityFeature.TARGET_TEMPERATURE
    _enable_turn_on_off_backwards_compatibility = False

    @staticmethod
    def unique_id_for(entry: VelairConfigEntry, zone: str) -> str:
        return f"{entry.entry_id}_{_thermostat_key(zone)}"

    def __init__(self, entry: VelairConfigEntry, zone: str, name: str) -> None:
        super().__init__(entry, _thermostat_key(zone))
        self._zone = zone
        self._attr_translation_placeholders = {"zone": name}
        self._temperatures: tuple[float | None, float | None] = (None, None)

    @property
    def zone_name(self) -> str:
        return self._attr_translation_placeholders["zone"]

    @callback
    def async_set_zone_name(self, name: str, registry: er.EntityRegistry) -> None:
        """Refresh HA's translated default without changing user registry fields."""
        self._attr_translation_placeholders = {"zone": name}
        # HA caches the translated name separately from its placeholders.
        self.__dict__.pop("name", None)
        entity_id = registry.async_get_entity_id("climate", DOMAIN, self.unique_id)
        if entity_id is not None:
            original_name = self.name
            # The registry update also refreshes the state of an enabled entity.
            registry.async_update_entity(entity_id, original_name=None if original_name is UNDEFINED else original_name)

    @property
    def suggested_object_id(self) -> str:
        return f"{self._zone.partition('.')[2]}_{_KEY}"

    @property
    def available(self) -> bool:
        return self.native_target_temperature is not None

    @property
    def native_temperature_unit(self) -> str:
        return self.scheduler.room_assist_climate_temperature_unit(self._zone)

    @property
    def min_temp(self) -> float:
        return self.scheduler.get_temperature_limits(self._zone)[0]

    @property
    def max_temp(self) -> float:
        return self.scheduler.get_temperature_limits(self._zone)[1]

    @property
    def target_temperature_step(self) -> float | None:
        return self.scheduler.get_temperature_step(self._zone)

    @property
    def native_current_temperature(self) -> float | None:
        return self._temperatures[0]

    @property
    def native_target_temperature(self) -> float | None:
        return self._temperatures[1]

    # Older HA climate platforms read the pre-native property names.
    if not hasattr(ClimateEntity, "native_temperature_unit"):
        temperature_unit = native_temperature_unit
        current_temperature = native_current_temperature
        target_temperature = native_target_temperature

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"velair_room_assist_zone": self._zone}

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(async_dispatcher_connect(
            self.hass, SIGNAL_COMFORT_UPDATED, self._handle_comfort_update))
        self._refresh_readings()

    def _refresh_readings(self) -> None:
        self._temperatures = self.scheduler.room_assist_climate_temperatures(self._zone)
        self._attr_current_humidity = self.scheduler.room_assist_climate_humidity(self._zone)

    @callback
    def _handle_scheduler_update(self) -> None:
        self._refresh_readings()
        super()._handle_scheduler_update()

    @callback
    def _handle_comfort_update(self, entities: frozenset[str]) -> None:
        if self.scheduler.room_assist_climate_comfort_entity(self._zone) not in entities:
            return
        humidity = self.scheduler.room_assist_climate_humidity(self._zone)
        if humidity != self._attr_current_humidity:
            self._attr_current_humidity = humidity
            self.async_write_ha_state()

    async def async_set_temperature(self, **kwargs) -> None:
        if kwargs.get("hvac_mode", HVACMode.HEAT) != HVACMode.HEAT or ATTR_TEMPERATURE not in kwargs:
            raise HomeAssistantError("Room Assist thermostats accept a single heating target")
        try:
            await self.scheduler.async_set_room_assist_climate_temperature(self._zone, kwargs[ATTR_TEMPERATURE])
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        if hvac_mode != HVACMode.HEAT:
            raise HomeAssistantError("Room Assist thermostats do not control HVAC mode")
