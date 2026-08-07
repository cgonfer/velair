"""Sensor entities for Velair."""

from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

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
        sensor
        for entity_id in climate_entities
        for sensor in (
            ZoneActiveTargetTemperatureSensor(
                entry,
                entity_id,
                temperature_unit=_climate_temperature_unit(hass, entity_id),
                zone_name=_climate_name(hass, entity_id),
            ),
            ZoneEnvironmentalConditionSensor(
                entry,
                entity_id,
                zone_name=_climate_name(hass, entity_id),
            ),
            ZoneAirQualitySensor(
                entry,
                entity_id,
                zone_name=_climate_name(hass, entity_id),
            ),
            ZoneOverrideStateSensor(
                entry,
                entity_id,
                zone_name=_climate_name(hass, entity_id),
            ),
            ZonePreconditioningStartSensor(
                entry,
                entity_id,
                zone_name=_climate_name(hass, entity_id),
            ),
            ZoneRoomAssistStateSensor(
                entry,
                entity_id,
                zone_name=_climate_name(hass, entity_id),
            ),
        )
    )
    async_add_entities(entities)


class NextClimateEventSensor(VelairEntity, SensorEntity):
    """Sensor exposing the next scheduled climate event."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
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
            **_serialize_event(event),
            "event_count": len(events),
            "events": [_serialize_event(next_event) for next_event in events],
        }


class CurrentScheduleStateSensor(VelairEntity, SensorEntity):
    """Sensor exposing the current operational scheduler status."""

    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = [
        "paused",
        "override_active",
        "scheduled",
        "idle",
        "temperature_migration_required",
    ]
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

        return attributes or None


class _ZoneSensor(VelairEntity, SensorEntity):
    """Base sensor associated with one managed climate zone."""

    def __init__(
        self,
        entry: VelairConfigEntry,
        climate_entity_id: str,
        key: str,
        *,
        zone_name: str | None = None,
    ) -> None:
        """Initialize a zone sensor."""
        self._climate_entity_id = climate_entity_id
        zone_key = climate_entity_id.replace(".", "_")
        super().__init__(entry, f"{zone_key}_{key}")
        self._attr_translation_placeholders = {
            "zone": zone_name or climate_entity_id
        }

    @property
    def available(self) -> bool:
        """Hide unit-bound zone projections while scheduler data is blocked."""
        return not bool(
            getattr(self.scheduler, "temperature_migration_blocked", False)
        )


class ZoneActiveTargetTemperatureSensor(_ZoneSensor):
    """Sensor exposing the active scheduled target temperature for one zone."""

    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_suggested_display_precision = 1
    _attr_translation_key = "zone_active_target_temperature"

    def __init__(
        self,
        entry: VelairConfigEntry,
        climate_entity_id: str,
        *,
        temperature_unit: str = UnitOfTemperature.CELSIUS,
        zone_name: str | None = None,
    ) -> None:
        """Initialize the sensor."""
        self._attr_native_unit_of_measurement = temperature_unit
        super().__init__(
            entry,
            climate_entity_id,
            "active_target_temperature",
            zone_name=zone_name,
        )

    @property
    def native_value(self) -> float | None:
        """Return the active scheduled target temperature."""
        event = self.scheduler.get_active_target_event(self._climate_entity_id)
        return event.temperature if event is not None else None

    @property
    def extra_state_attributes(self) -> dict[str, str | float | None] | None:
        """Return details about the active schedule block."""
        event = self.scheduler.get_active_target_event(self._climate_entity_id)
        if event is None:
            return None

        return _serialize_event(event)


class ZoneEnvironmentalConditionSensor(_ZoneSensor):
    """Sensor exposing the environmental condition for one zone."""

    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = [
        "monitoring_off",
        "no_readings",
        "temperature_comfortable",
        "humidity_comfortable",
        "comfortable",
        "cold",
        "hot",
        "dry",
        "humid",
        "cold_and_dry",
        "cold_and_humid",
        "hot_and_dry",
        "hot_and_humid",
    ]
    _attr_translation_key = "zone_environmental_condition"

    def __init__(
        self,
        entry: VelairConfigEntry,
        climate_entity_id: str,
        *,
        zone_name: str | None = None,
    ) -> None:
        """Initialize the environmental condition sensor."""
        super().__init__(
            entry,
            climate_entity_id,
            "environmental_condition",
            zone_name=zone_name,
        )

    @property
    def native_value(self) -> str:
        """Return the current human environmental condition."""
        assessment = self.scheduler.get_comfort_assessment(
            self._climate_entity_id
        )
        condition = assessment.get("condition")
        return condition if isinstance(condition, str) else "no_readings"

    @property
    def extra_state_attributes(self) -> dict[str, object] | None:
        """Return compact source and reading-quality context."""
        assessment = self.scheduler.get_comfort_assessment(
            self._climate_entity_id
        )
        return _compact_attributes(
            {
                "data_quality": assessment.get("data_quality"),
                "data_issues": assessment.get("data_issues"),
                "temperature_source": _metric_entity_id(
                    assessment.get("temperature")
                ),
                "humidity_source": _metric_entity_id(
                    assessment.get("humidity")
                ),
            }
        )


class ZoneAirQualitySensor(_ZoneSensor):
    """Sensor exposing the CO2-derived air-quality state for one zone."""

    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = ["not_monitored", "unavailable", "good", "elevated", "poor"]
    _attr_translation_key = "zone_air_quality"

    def __init__(
        self,
        entry: VelairConfigEntry,
        climate_entity_id: str,
        *,
        zone_name: str | None = None,
    ) -> None:
        """Initialize the air-quality sensor."""
        super().__init__(
            entry,
            climate_entity_id,
            "air_quality",
            zone_name=zone_name,
        )

    @property
    def native_value(self) -> str:
        """Return the current CO2-derived air quality."""
        assessment = self.scheduler.get_comfort_assessment(
            self._climate_entity_id
        )
        air_quality = assessment.get("air_quality")
        return air_quality if isinstance(air_quality, str) else "unavailable"

    @property
    def extra_state_attributes(self) -> dict[str, object] | None:
        """Return compact CO2 source context."""
        assessment = self.scheduler.get_comfort_assessment(
            self._climate_entity_id
        )
        co2 = assessment.get("co2")
        return _compact_attributes(
            {
                "availability": (
                    co2.get("availability") if isinstance(co2, dict) else None
                ),
                "co2_source": _metric_entity_id(co2),
            }
        )


class ZoneOverrideStateSensor(_ZoneSensor):
    """Sensor exposing whether one zone has an active override."""

    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = ["none", "boost", "paused", "disabled"]
    _attr_translation_key = "zone_override_state"

    def __init__(
        self,
        entry: VelairConfigEntry,
        climate_entity_id: str,
        *,
        zone_name: str | None = None,
    ) -> None:
        """Initialize the zone override sensor."""
        super().__init__(
            entry,
            climate_entity_id,
            "override_state",
            zone_name=zone_name,
        )

    @property
    def native_value(self) -> str:
        """Return the current override state."""
        status = self.scheduler.get_zone_override_status(self._climate_entity_id)
        state = status.get("state")
        return state if isinstance(state, str) else "none"

    @property
    def extra_state_attributes(self) -> dict[str, object] | None:
        """Return compact active override context."""
        status = self.scheduler.get_zone_override_status(self._climate_entity_id)
        return _compact_attributes(
            {
                key: status.get(key)
                for key in ("started_at", "until", "action")
            }
        )


class ZonePreconditioningStartSensor(_ZoneSensor):
    """Sensor exposing the next or active preconditioning start."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_translation_key = "zone_preconditioning_start"

    def __init__(
        self,
        entry: VelairConfigEntry,
        climate_entity_id: str,
        *,
        zone_name: str | None = None,
    ) -> None:
        """Initialize the preconditioning start sensor."""
        super().__init__(
            entry,
            climate_entity_id,
            "preconditioning_start",
            zone_name=zone_name,
        )

    @property
    def native_value(self):
        """Return the calculated preconditioning start timestamp."""
        event = self._preconditioning_event()
        return event.when if event is not None else None

    @property
    def extra_state_attributes(self) -> dict[str, object] | None:
        """Return compact prediction context."""
        event = self._preconditioning_event()
        if event is None or event.target_when is None:
            return None

        diagnostics = event.preconditioning_diagnostics or {}
        return _compact_attributes(
            {
                "status": "active" if event.when <= dt_util.now() else "planned",
                "scheduled_for": event.target_when.isoformat(),
                "lead_minutes": round(
                    (event.target_when - event.when).total_seconds() / 60
                ),
                "direction": diagnostics.get("direction"),
                "model_source": diagnostics.get("source"),
                "target_temperature": event.temperature,
                "hvac_mode": event.hvac_mode,
            }
        )

    def _preconditioning_event(self):
        """Return the cached preconditioning event for this zone."""
        event = self.scheduler.get_next_event_for_zone(self._climate_entity_id)
        if (
            event is not None
            and event.target_when is not None
            and event.when < event.target_when
        ):
            return event
        return None


class ZoneRoomAssistStateSensor(_ZoneSensor):
    """Sensor exposing the Room Assist runtime state for one zone."""

    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = [
        "unavailable",
        "not_configured",
        "disabled",
        "blocked",
        "idle",
        "holding",
        "assisting",
        "ready",
    ]
    _attr_translation_key = "zone_room_assist_state"

    def __init__(
        self,
        entry: VelairConfigEntry,
        climate_entity_id: str,
        *,
        zone_name: str | None = None,
    ) -> None:
        """Initialize the Room Assist state sensor."""
        super().__init__(
            entry,
            climate_entity_id,
            "room_assist_state",
            zone_name=zone_name,
        )

    @property
    def native_value(self) -> str:
        """Return the current Room Assist state."""
        status = self.scheduler.get_room_sensor_assist_status(
            self._climate_entity_id
        )
        value = status.get("status")
        return value if isinstance(value, str) else "unavailable"

    @property
    def extra_state_attributes(self) -> dict[str, object] | None:
        """Return compact Room Assist target context."""
        status = self.scheduler.get_room_sensor_assist_status(
            self._climate_entity_id
        )
        attributes = {
            key: status.get(key)
            for key in (
                "room_temperature_entity_id",
                "target_temperature",
                "applied_temperature",
                "direction",
                "hvac_mode",
                "active_from",
                "target_when",
            )
        }
        assist_delta = status.get("assist_delta")
        if isinstance(assist_delta, int | float) and assist_delta > 0:
            attributes["assist_delta"] = assist_delta
        return _compact_attributes(attributes)


def _serialize_event(event) -> dict[str, str | float | None]:
    """Serialize a climate event for entity attributes."""
    return {
        "entity_id": event.entity_id,
        "action": event.action,
        "hvac_mode": event.hvac_mode,
        "temperature": event.temperature,
        "weekday": event.weekday,
        "start": event.start,
        "when": event.when.isoformat(),
        "target_when": (
            event.target_when.isoformat()
            if event.target_when is not None
            else None
        ),
    }


def _metric_entity_id(metric: object) -> str | None:
    """Return a comfort metric source entity ID."""
    if not isinstance(metric, dict):
        return None
    entity_id = metric.get("entity_id")
    return entity_id if isinstance(entity_id, str) else None


def _compact_attributes(values: dict[str, object]) -> dict[str, object] | None:
    """Drop unavailable optional attributes."""
    attributes = {
        key: value
        for key, value in values.items()
        if value is not None and value != []
    }
    return attributes or None


def _climate_temperature_unit(hass: HomeAssistant, entity_id: str) -> str:
    """Return the climate unit, falling back to the Home Assistant unit system."""
    state = hass.states.get(entity_id)
    attributes = getattr(state, "attributes", {}) if state is not None else {}
    unit = attributes.get("unit_of_measurement")
    if unit in (UnitOfTemperature.CELSIUS, UnitOfTemperature.FAHRENHEIT):
        return unit

    configured_unit = getattr(
        getattr(getattr(hass, "config", None), "units", None),
        "temperature_unit",
        None,
    )
    if configured_unit in (
        UnitOfTemperature.CELSIUS,
        UnitOfTemperature.FAHRENHEIT,
    ):
        return configured_unit
    return UnitOfTemperature.CELSIUS


def _climate_name(hass: HomeAssistant, entity_id: str) -> str:
    """Return a readable climate name for entity translation placeholders."""
    state = hass.states.get(entity_id)
    attributes = getattr(state, "attributes", {}) if state is not None else {}
    friendly_name = attributes.get("friendly_name")
    if isinstance(friendly_name, str) and friendly_name:
        return friendly_name
    return entity_id
