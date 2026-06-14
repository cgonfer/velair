"""Sensor entities for Velair."""

from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import VelairConfigEntry
from .config_helpers import get_configured_climate_entities
from .entity import VelairEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: VelairConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up Velair sensors."""
    climate_entities = get_configured_climate_entities(entry)
    entities: list[SensorEntity] = [
        NextClimateEventSensor(entry),
        CurrentScheduleStateSensor(entry),
    ]
    entities.extend(
        ZoneActiveTargetTemperatureSensor(entry, entity_id)
        for entity_id in climate_entities
    )
    async_add_entities(entities)


class NextClimateEventSensor(VelairEntity, SensorEntity):
    """Sensor exposing the next scheduled climate event."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_translation_key = "next_climate_event"

    def __init__(self, entry: VelairConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "next_climate_event")

    @property
    def native_value(self):
        """Return the next event timestamp."""
        event = self.scheduler.next_event
        return event.when if event is not None else None

    @property
    def extra_state_attributes(self) -> dict[str, str | float | int | list | None] | None:
        """Return details about the next event time."""
        event = self.scheduler.next_event
        if event is None:
            return None

        events = self.scheduler.next_events
        return {
            "entity_id": event.entity_id,
            "action": event.action,
            "event_count": len(events),
            "events": [_serialize_event(next_event) for next_event in events],
            "hvac_mode": event.hvac_mode,
            "temperature": event.temperature,
            "weekday": event.weekday,
            "start": event.start,
        }


class CurrentScheduleStateSensor(VelairEntity, SensorEntity):
    """Sensor exposing the current operational scheduler status."""

    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_translation_key = "scheduler_status"

    def __init__(self, entry: VelairConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "current_schedule_state")

    @property
    def native_value(self) -> str:
        """Return the current operational status."""
        return self.scheduler.get_operational_status()

    @property
    def extra_state_attributes(self) -> dict[str, str | dict | None] | None:
        """Return mode expiration details."""
        attributes: dict[str, str | dict | None] = {}
        paused_until = self._entry.runtime_data.storage.data["global_"].get(
            "paused_until"
        )
        if paused_until is not None:
            attributes["paused_until"] = paused_until
        paused_started_at = self._entry.runtime_data.storage.data["global_"].get(
            "paused_started_at"
        )
        if paused_started_at is not None:
            attributes["paused_started_at"] = paused_started_at

        attributes["global_mode"] = self.scheduler.mode

        if self.scheduler.next_event is not None:
            attributes["next_event"] = _serialize_event(self.scheduler.next_event)
            attributes["next_event_count"] = len(self.scheduler.next_events)

        active_overrides = self.scheduler.get_active_overrides()
        if active_overrides:
            attributes["active_overrides"] = active_overrides

        return attributes or None


class ZoneActiveTargetTemperatureSensor(VelairEntity, SensorEntity):
    """Sensor exposing the active scheduled target temperature for one zone."""

    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_suggested_display_precision = 1
    _attr_translation_key = "zone_active_target_temperature"

    def __init__(
        self,
        entry: VelairConfigEntry,
        climate_entity_id: str,
    ) -> None:
        """Initialize the sensor."""
        self._climate_entity_id = climate_entity_id
        zone_key = climate_entity_id.replace(".", "_")
        super().__init__(entry, f"{zone_key}_active_target_temperature")
        self._attr_translation_placeholders = {"zone": climate_entity_id}

    @property
    def native_value(self) -> float | None:
        """Return the active scheduled target temperature."""
        event = self.scheduler.get_current_event(self._climate_entity_id)
        return event.temperature if event is not None else None

    @property
    def extra_state_attributes(self) -> dict[str, str] | None:
        """Return details about the active schedule block."""
        event = self.scheduler.get_current_event(self._climate_entity_id)
        if event is None:
            return None

        return {
            "entity_id": event.entity_id,
            "action": event.action,
            "hvac_mode": event.hvac_mode,
            "weekday": event.weekday,
            "start": event.start,
        }


def _serialize_event(event) -> dict[str, str | float | None]:
    """Serialize a climate event for entity attributes."""
    return {
        "entity_id": event.entity_id,
        "action": event.action,
        "hvac_mode": event.hvac_mode,
        "temperature": event.temperature,
        "weekday": event.weekday,
        "start": event.start,
    }
