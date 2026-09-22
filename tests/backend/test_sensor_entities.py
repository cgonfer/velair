"""Sensor entity behavior and translation contract tests."""

from __future__ import annotations

from datetime import datetime, timezone
import importlib
import json
from pathlib import Path
import re
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from . import helpers


ROOT = Path(__file__).resolve().parents[2]


def _load_sensor_module():
    """Load sensor.py with the small Home Assistant entity surface it needs."""
    module_names = (
        "homeassistant.components.sensor",
        "homeassistant.helpers.entity",
        "homeassistant.helpers.entity_platform",
        "custom_components.velair.entity",
    )
    previous_modules = {
        name: sys.modules.get(name)
        for name in module_names
    }
    package = sys.modules["custom_components.velair"]
    previous_entry_type = getattr(package, "VelairConfigEntry", None)
    homeassistant_const = sys.modules["homeassistant.const"]
    previous_temperature_unit = getattr(
        homeassistant_const,
        "UnitOfTemperature",
        None,
    )

    class FakeVelairEntity:
        _attr_has_entity_name = True
        _attr_should_poll = False

        def __init__(self, entry, key: str) -> None:
            self._entry = entry
            self._attr_unique_id = f"{entry.entry_id}_{key}"

        @property
        def scheduler(self):
            return self._entry.runtime_data.scheduler

    try:
        homeassistant_const.UnitOfTemperature = SimpleNamespace(
            CELSIUS="°C",
            FAHRENHEIT="°F",
        )

        sensor_platform = ModuleType("homeassistant.components.sensor")
        sensor_platform.SensorDeviceClass = SimpleNamespace(
            ENUM="enum",
            TEMPERATURE="temperature",
            TIMESTAMP="timestamp",
        )
        sensor_platform.SensorEntity = object
        sys.modules["homeassistant.components.sensor"] = sensor_platform

        entity_helper = ModuleType("homeassistant.helpers.entity")
        entity_helper.EntityCategory = SimpleNamespace(DIAGNOSTIC="diagnostic")
        sys.modules["homeassistant.helpers.entity"] = entity_helper

        entity_platform = ModuleType("homeassistant.helpers.entity_platform")
        entity_platform.AddConfigEntryEntitiesCallback = object
        sys.modules["homeassistant.helpers.entity_platform"] = entity_platform

        velair_entity = ModuleType("custom_components.velair.entity")
        velair_entity.VelairEntity = FakeVelairEntity
        sys.modules["custom_components.velair.entity"] = velair_entity

        package.VelairConfigEntry = object
        return importlib.import_module("custom_components.velair.sensor")
    finally:
        for name, previous in previous_modules.items():
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous
        if previous_entry_type is None:
            delattr(package, "VelairConfigEntry")
        else:
            package.VelairConfigEntry = previous_entry_type
        if previous_temperature_unit is None:
            delattr(homeassistant_const, "UnitOfTemperature")
        else:
            homeassistant_const.UnitOfTemperature = previous_temperature_unit


sensor_module = _load_sensor_module()


class SensorEntitiesTest(unittest.IsolatedAsyncioTestCase):
    """Verify generated sensors remain useful and unit aware."""

    def _entry(self, scheduler, entity_ids: list[str]):
        return SimpleNamespace(
            entry_id="entry",
            data={"climate_entities": entity_ids},
            options={},
            runtime_data=SimpleNamespace(
                diagnostics=SimpleNamespace(
                    zone_delivery_diagnostics=lambda _entity_id: {
                        "status": "idle",
                        "retry_count": 0,
                    },
                    automation_summary=lambda: {
                        "status": "ok",
                        "scheduler_mode": "auto",
                        "scheduler_status": "idle",
                        "unit_counts": {"ok": len(entity_ids), "warning": 0, "error": 0},
                        "issue_count": 0,
                        "warning_count": 0,
                        "error_count": 0,
                        "issue_codes": [],
                    }
                ),
                scheduler=scheduler,
                storage=SimpleNamespace(
                    data={
                        "global_": {
                            "paused_until": None,
                            "paused_started_at": None,
                        }
                    }
                ),
            ),
        )

    def test_zone_sensors_are_unavailable_while_temperature_data_is_blocked(self) -> None:
        scheduler = SimpleNamespace(temperature_migration_blocked=True)
        entry = self._entry(scheduler, ["climate.living_room"])
        sensor = sensor_module.ZoneActiveTargetTemperatureSensor(
            entry, "climate.living_room"
        )

        self.assertFalse(sensor.available)

    def test_zone_sensors_default_to_available_without_migration_state(self) -> None:
        scheduler = SimpleNamespace()
        entry = self._entry(scheduler, ["climate.living_room"])
        sensor = sensor_module.ZoneActiveTargetTemperatureSensor(
            entry, "climate.living_room"
        )

        self.assertTrue(sensor.available)

    def test_runtime_context_sensors_remain_available_during_unit_migration(self) -> None:
        scheduler = SimpleNamespace(
            temperature_migration_blocked=True,
            get_zone_control_status=lambda _entity_id: {
                "control_mode": "automatic",
                "runtime_state": "temperature_migration_required",
                "schedule_source": "default",
            },
        )
        entry = self._entry(scheduler, ["climate.living_room"])

        control = sensor_module.ZoneControlSensor(entry, "climate.living_room")
        self.assertTrue(control.available)
        self.assertEqual(
            "temperature_migration_required",
            control.extra_state_attributes["runtime_state"],
        )
        self.assertTrue(
            sensor_module.ZoneDeliveryDiagnosticsSensor(
                entry, "climate.living_room"
            ).available
        )

    def test_runtime_context_sensors_suggest_clean_entity_ids(self) -> None:
        scheduler = SimpleNamespace(
            get_zone_control_status=lambda _entity_id: {
                "control_mode": "automatic"
            }
        )
        entry = self._entry(scheduler, ["climate.living_room"])

        control = sensor_module.ZoneControlSensor(entry, "climate.living_room")
        diagnostics = sensor_module.ZoneDeliveryDiagnosticsSensor(
            entry, "climate.living_room"
        )

        self.assertEqual(
            "velair_control_living_room",
            control._attr_suggested_object_id,
        )
        self.assertEqual(
            "velair_delivery_diagnostics_living_room",
            diagnostics._attr_suggested_object_id,
        )

    async def test_setup_creates_three_global_and_nine_sensors_per_climate(
        self,
    ) -> None:
        scheduler = SimpleNamespace(
            mode="auto",
            next_event=None,
            next_events=[],
            get_active_overrides=lambda: {},
            get_active_target_event=lambda entity_id: None,
            get_comfort_assessment=lambda entity_id: {},
            get_next_event_for_zone=lambda entity_id: None,
            get_operational_status=lambda: "idle",
            get_room_sensor_assist_status=lambda entity_id: {},
            get_zone_override_status=lambda entity_id: {"state": "none"},
            get_zone_control_status=lambda entity_id: {
                "control_mode": "automatic",
                "runtime_state": "idle",
                "schedule_source": "default",
            },
        )
        entry = self._entry(
            scheduler,
            ["climate.living_room", "climate.bedroom"],
        )
        hass = SimpleNamespace(
            config=SimpleNamespace(
                units=SimpleNamespace(temperature_unit="°C"),
            ),
            states={
                "climate.living_room": SimpleNamespace(
                    attributes={
                        "friendly_name": "Living room",
                        "unit_of_measurement": "°C",
                    }
                ),
                "climate.bedroom": SimpleNamespace(
                    attributes={
                        "friendly_name": "Bedroom",
                        "unit_of_measurement": "°F",
                    }
                ),
            },
        )
        entities = []

        await sensor_module.async_setup_entry(hass, entry, entities.extend)

        self.assertEqual(len(entities), 21)
        target_sensors = [
            entity
            for entity in entities
            if isinstance(entity, sensor_module.ZoneActiveTargetTemperatureSensor)
        ]
        self.assertEqual(
            [sensor._attr_native_unit_of_measurement for sensor in target_sensors],
            ["°C", "°F"],
        )
        self.assertEqual(
            [sensor._attr_translation_placeholders["zone"] for sensor in target_sensors],
            ["Living room", "Bedroom"],
        )
        self.assertEqual(
            sum(
                isinstance(
                    entity,
                    sensor_module.ZoneEnvironmentalConditionSensor,
                )
                for entity in entities
            ),
            2,
        )
        living_prefix = "entry_climate_living_room_"
        self.assertEqual(
            {
                entity._attr_unique_id.removeprefix(living_prefix)
                for entity in entities
                if entity._attr_unique_id.startswith(living_prefix)
            },
            set(helpers.const_module.ZONE_SENSOR_UNIQUE_ID_SUFFIXES),
        )

    def test_active_target_exposes_preconditioning_times(self) -> None:
        event = helpers.models_module.ClimateEvent(
            entity_id="climate.living_room",
            when=datetime(2026, 7, 9, 5, 35, tzinfo=timezone.utc),
            temperature=21,
            weekday="thursday",
            start="07:00",
            action=helpers.ACTION_SET_TEMPERATURE,
            hvac_mode="heat",
            target_when=datetime(2026, 7, 9, 7, 0, tzinfo=timezone.utc),
        )
        scheduler = SimpleNamespace(
            get_active_target_event=lambda entity_id: event,
        )
        entry = self._entry(scheduler, ["climate.living_room"])
        sensor = sensor_module.ZoneActiveTargetTemperatureSensor(
            entry,
            "climate.living_room",
            temperature_unit="°C",
            zone_name="Living room",
        )

        self.assertEqual(sensor.native_value, 21)
        self.assertEqual(
            sensor.extra_state_attributes,
            {
                "entity_id": "climate.living_room",
                "action": helpers.ACTION_SET_TEMPERATURE,
                "hvac_mode": "heat",
                "temperature": 21,
                "weekday": "thursday",
                "start": "07:00",
                "when": "2026-07-09T05:35:00+00:00",
                "target_when": "2026-07-09T07:00:00+00:00",
            },
        )

    def test_active_target_exposes_range_without_inventing_scalar_value(self) -> None:
        event = helpers.models_module.ClimateEvent(
            entity_id="climate.living_room",
            when=datetime(2026, 7, 9, 7, 0, tzinfo=timezone.utc),
            temperature=None,
            target_temp_low=20,
            target_temp_high=24,
            weekday="thursday",
            start="07:00",
            action=helpers.ACTION_SET_TEMPERATURE,
            hvac_mode="heat_cool",
        )
        scheduler = SimpleNamespace(get_active_target_event=lambda _entity_id: event)
        sensor = sensor_module.ZoneActiveTargetTemperatureSensor(
            self._entry(scheduler, ["climate.living_room"]),
            "climate.living_room",
            temperature_unit="Â°C",
            zone_name="Living room",
        )

        self.assertIsNone(sensor.native_value)
        self.assertIsNone(sensor.extra_state_attributes["temperature"])
        self.assertEqual(sensor.extra_state_attributes["target_temp_low"], 20)
        self.assertEqual(sensor.extra_state_attributes["target_temp_high"], 24)

    def test_next_event_sensor_exposes_apply_and_target_times(self) -> None:
        event = helpers.models_module.ClimateEvent(
            entity_id="climate.bedroom",
            when=datetime(2026, 7, 9, 20, 30, tzinfo=timezone.utc),
            temperature=24,
            weekday="thursday",
            start="22:00",
            action=helpers.ACTION_SET_TEMPERATURE,
            hvac_mode="cool",
            target_when=datetime(2026, 7, 9, 22, 0, tzinfo=timezone.utc),
        )
        scheduler = SimpleNamespace(
            next_event=event,
            next_events=[event],
        )
        entry = self._entry(scheduler, ["climate.bedroom"])
        sensor = sensor_module.NextClimateEventSensor(entry)

        self.assertEqual(sensor.native_value, event.when)
        self.assertEqual(
            sensor.extra_state_attributes["when"],
            "2026-07-09T20:30:00+00:00",
        )
        self.assertEqual(
            sensor.extra_state_attributes["target_when"],
            "2026-07-09T22:00:00+00:00",
        )
        self.assertEqual(sensor.extra_state_attributes["event_count"], 1)

    def test_scheduler_status_does_not_duplicate_next_event_attributes(self) -> None:
        event = helpers.models_module.ClimateEvent(
            entity_id="climate.bedroom",
            when=datetime(2026, 7, 9, 20, 30, tzinfo=timezone.utc),
            temperature=24,
            weekday="thursday",
            start="22:00",
            action=helpers.ACTION_SET_TEMPERATURE,
            hvac_mode="cool",
        )
        scheduler = SimpleNamespace(
            mode="auto",
            next_event=event,
            next_events=[event],
            get_active_overrides=lambda: {},
            get_operational_status=lambda: "scheduled",
        )
        entry = self._entry(scheduler, ["climate.bedroom"])
        sensor = sensor_module.CurrentScheduleStateSensor(entry)

        self.assertEqual(sensor.native_value, "scheduled")
        self.assertEqual(
            sensor.extra_state_attributes,
            {"global_mode": "auto"},
        )

    def test_diagnostics_status_exposes_only_compact_safe_attributes(self) -> None:
        summary = {
            "status": "error",
            "scheduler_mode": "auto",
            "scheduler_status": "scheduled",
            "unit_counts": {"ok": 1, "warning": 2, "error": 1},
            "issue_count": 3,
            "warning_count": 2,
            "error_count": 1,
            "issue_codes": ["associated_sensor_unavailable", "delivery_exhausted"],
        }
        entry = self._entry(SimpleNamespace(), ["climate.living_room"])
        entry.runtime_data.diagnostics = SimpleNamespace(
            automation_summary=lambda: summary
        )
        sensor = sensor_module.DiagnosticsStatusSensor(entry)

        self.assertEqual("error", sensor.native_value)
        self.assertEqual("diagnostic", sensor._attr_entity_category)
        self.assertFalse(sensor._attr_should_poll)
        self.assertEqual(
            sensor.extra_state_attributes,
            {
                "scheduler_mode": "auto",
                "scheduler_status": "scheduled",
                "units_ok": 1,
                "units_warning": 2,
                "units_error": 1,
                "issue_count": 3,
                "warning_count": 2,
                "error_count": 1,
                "issue_codes": [
                    "associated_sensor_unavailable",
                    "delivery_exhausted",
                ],
            },
        )

    async def test_diagnostics_status_subscribes_without_polling(self) -> None:
        entry = self._entry(SimpleNamespace(), ["climate.living_room"])
        sensor = sensor_module.DiagnosticsStatusSensor(entry)
        sensor.hass = SimpleNamespace()
        sensor.async_on_remove = Mock()
        sensor.async_write_ha_state = Mock()
        unsubscribe = Mock()

        with patch.object(
            sensor_module,
            "async_dispatcher_connect",
            return_value=unsubscribe,
        ) as connect:
            await sensor.async_added_to_hass()

        connect.assert_called_once_with(
            sensor.hass,
            helpers.const_module.SIGNAL_DIAGNOSTICS_UPDATED,
            sensor._handle_diagnostics_update,
        )
        sensor.async_on_remove.assert_called_once_with(unsubscribe)
        sensor._handle_diagnostics_update()
        sensor.async_write_ha_state.assert_called_once_with()

    def test_temperature_unit_falls_back_to_home_assistant_unit_system(self) -> None:
        hass = SimpleNamespace(
            config=SimpleNamespace(
                units=SimpleNamespace(temperature_unit="°F"),
            ),
            states={},
        )

        self.assertEqual(
            sensor_module._climate_temperature_unit(hass, "climate.missing"),
            "°F",
        )

    def test_comfort_and_air_quality_keep_independent_states(self) -> None:
        assessment = {
            "condition": "cold_and_humid",
            "air_quality": "elevated",
            "data_quality": "partial",
            "data_issues": ["humidity_stale"],
            "range_summary": {
                "status": "mixed",
                "thermal_relation": "mixed",
                "positions": {
                    "temperature": "below",
                    "humidity": "above",
                    "humidex": "above",
                },
            },
            "temperature": {"entity_id": "sensor.room_temperature"},
            "humidity": {"entity_id": "sensor.room_humidity"},
            "co2": {
                "entity_id": "sensor.room_co2",
                "availability": "current",
            },
            "derived_metrics": {
                "dew_point": {
                    "availability": "current",
                    "value": 12.3,
                    "unit": "°C",
                },
                "humidex": {
                    "availability": "current",
                    "value": 25.4,
                    "unit": None,
                    "temperature_range_position": "above",
                },
            },
            "insights": [
                {
                    "code": "co2_elevated",
                    "kind": "context",
                    "tone": "attention",
                    "metrics": ["co2"],
                }
            ],
            "outdoor": {
                "enabled": True,
                "data_quality": "complete",
                "data_issues": [],
                "guidance_thresholds": {
                    "temperature_delta": 1.0,
                    "temperature_unit": "°C",
                    "humidity_delta_percentage_points": 5.0,
                    "absolute_humidity_delta_g_m3": 1.0,
                },
                "indoor_absolute_humidity": {
                    "availability": "current",
                    "metric": "indoor_absolute_humidity",
                    "value": 9.81,
                    "unit": "g/m³",
                },
                "temperature": {
                    "availability": "current",
                    "entity_id": "sensor.outdoor_temperature",
                    "value": 15,
                    "unit": "°C",
                },
                "humidity": {
                    "availability": "current",
                    "entity_id": "sensor.outdoor_humidity",
                    "value": 50,
                    "unit": "%",
                },
                "comparison": {
                    "temperature": {
                        "availability": "current",
                        "effect": "cooler",
                        "potential": "cooling",
                        "blocked_by": [],
                    }
                },
            },
            "ventilation_opportunity": {
                "state": "may_help",
                "evaluation_scope": "temperature_and_humidity",
                "potential_effects": ["cooling"],
                "blocked_by": [],
                "reason": "moves_toward_comfort",
            },
        }
        scheduler = SimpleNamespace(
            get_comfort_assessment=lambda entity_id: assessment,
        )
        entry = self._entry(scheduler, ["climate.living_room"])
        condition = sensor_module.ZoneEnvironmentalConditionSensor(
            entry,
            "climate.living_room",
        )
        air_quality = sensor_module.ZoneAirQualitySensor(
            entry,
            "climate.living_room",
        )

        self.assertEqual(condition.native_value, "cold_and_humid")
        self.assertEqual(
            condition.extra_state_attributes,
            {
                "data_quality": "partial",
                "data_issues": ["humidity_stale"],
                "range_summary": assessment["range_summary"],
                "ventilation_opportunity": assessment[
                    "ventilation_opportunity"
                ],
                "temperature_source": "sensor.room_temperature",
                "humidity_source": "sensor.room_humidity",
                "derived_metrics": {
                    "dew_point": {
                        "availability": "current",
                        "value": 12.3,
                        "unit": "°C",
                    },
                    "humidex": {
                        "availability": "current",
                        "value": 25.4,
                        "unit": None,
                        "temperature_range_position": "above",
                    },
                },
                "insights": [
                    {
                        "code": "co2_elevated",
                        "kind": "context",
                        "tone": "attention",
                        "metrics": ["co2"],
                    }
                ],
                "outdoor": assessment["outdoor"],
            },
        )
        ventilation = sensor_module.ZoneVentilationOpportunitySensor(
            entry,
            "climate.living_room",
        )
        self.assertEqual(ventilation.native_value, "may_help")
        self.assertEqual(
            ventilation.extra_state_attributes,
            {
                "evaluation_scope": "temperature_and_humidity",
                "potential_effects": ["cooling"],
                "blocked_by": [],
                "reason": "moves_toward_comfort",
                "data_quality": "complete",
                "outdoor_temperature_source": "sensor.outdoor_temperature",
                "outdoor_humidity_source": "sensor.outdoor_humidity",
            },
        )
        self.assertEqual(air_quality.native_value, "elevated")
        self.assertEqual(
            air_quality.extra_state_attributes,
            {
                "availability": "current",
                "co2_source": "sensor.room_co2",
            },
        )

    def test_optional_feature_sensors_expose_clear_inactive_states(self) -> None:
        scheduler = SimpleNamespace(
            get_comfort_assessment=lambda entity_id: {
                "condition": "monitoring_off",
                "air_quality": "not_monitored",
                "data_quality": "unavailable",
                "data_issues": [],
            },
            get_room_sensor_assist_status=lambda entity_id: {
                "status": "not_configured",
            },
            get_zone_override_status=lambda entity_id: {"state": "none"},
        )
        entry = self._entry(scheduler, ["climate.living_room"])

        self.assertEqual(
            sensor_module.ZoneEnvironmentalConditionSensor(
                entry,
                "climate.living_room",
            ).native_value,
            "monitoring_off",
        )
        self.assertEqual(
            sensor_module.ZoneAirQualitySensor(
                entry,
                "climate.living_room",
            ).native_value,
            "not_monitored",
        )
        ventilation = sensor_module.ZoneVentilationOpportunitySensor(
            entry,
            "climate.living_room",
        )
        self.assertEqual(ventilation.native_value, "unavailable")
        self.assertEqual(
            ventilation.extra_state_attributes,
            {
                "potential_effects": [],
                "blocked_by": [],
            },
        )
        self.assertEqual(
            sensor_module.ZoneRoomAssistStateSensor(
                entry,
                "climate.living_room",
            ).native_value,
            "not_configured",
        )
        self.assertEqual(
            sensor_module.ZoneOverrideStateSensor(
                entry,
                "climate.living_room",
            ).native_value,
            "none",
        )

    def test_zone_override_exposes_only_current_override_context(self) -> None:
        scheduler = SimpleNamespace(
            get_zone_override_status=lambda entity_id: {
                "state": "paused",
                "started_at": "2026-07-09T10:00:00+00:00",
                "until": "2026-07-09T11:00:00+00:00",
                "action": "turn_off",
                "pause_id": "window_guard",
            },
        )
        entry = self._entry(scheduler, ["climate.living_room"])
        sensor = sensor_module.ZoneOverrideStateSensor(
            entry,
            "climate.living_room",
        )

        self.assertEqual(sensor.native_value, "paused")
        self.assertEqual(
            sensor.extra_state_attributes,
            {
                "started_at": "2026-07-09T10:00:00+00:00",
                "until": "2026-07-09T11:00:00+00:00",
                "action": "turn_off",
                "pause_id": "window_guard",
            },
        )

    def test_zone_control_exposes_low_churn_context_and_manual_fields(self) -> None:
        scheduler = SimpleNamespace(
            get_zone_control_status=lambda _entity_id: {
                "control_mode": "manual",
                "runtime_state": "paused",
                "schedule_source": "profile",
                "profile_id": "weekday",
                "profile_name": "Weekday",
                "mode_id": "home",
                "mode_name": "Home",
                "manual_source": "external_change",
                "manual_started_at": "2026-09-04T10:00:00+00:00",
                "manual_until": "2026-09-04T12:00:00+00:00",
                "manual_policy": "for_duration",
            }
        )
        sensor = sensor_module.ZoneControlSensor(
            self._entry(scheduler, ["climate.living_room"]),
            "climate.living_room",
        )

        self.assertEqual("manual", sensor.native_value)
        self.assertEqual("paused", sensor.extra_state_attributes["runtime_state"])
        self.assertEqual("weekday", sensor.extra_state_attributes["profile_id"])
        self.assertEqual("external_change", sensor.extra_state_attributes["manual_source"])
        self.assertNotIn("temperature", sensor.extra_state_attributes)

    def test_zone_delivery_diagnostics_is_disabled_and_omits_error_message(self) -> None:
        entry = self._entry(SimpleNamespace(), ["climate.living_room"])
        entry.runtime_data.diagnostics.zone_delivery_diagnostics = lambda _entity_id: {
            "status": "retrying",
            "updated_at": "2026-09-04T10:00:05+00:00",
            "retry_count": 1,
            "last_error_at": "2026-09-04T10:00:04+00:00",
            "last_error_code": "failed",
            "last_accepted_at": "2026-09-04T09:00:00+00:00",
            "last_accepted_source": "scheduled_event",
            "last_accepted_action": "set_temperature",
            "last_accepted_hvac_mode": "cool",
            "last_accepted_temperature_unit": "°C",
            "last_accepted_temperature": 24,
        }
        sensor = sensor_module.ZoneDeliveryDiagnosticsSensor(
            entry,
            "climate.living_room",
        )

        self.assertEqual("retrying", sensor.native_value)
        self.assertEqual("diagnostic", sensor._attr_entity_category)
        self.assertFalse(sensor._attr_entity_registry_enabled_default)
        self.assertEqual(1, sensor.extra_state_attributes["retry_count"])
        self.assertEqual(24, sensor.extra_state_attributes["last_accepted_temperature"])
        self.assertEqual("°C", sensor.extra_state_attributes["last_accepted_temperature_unit"])
        self.assertNotIn("message", str(sensor.extra_state_attributes))

    def test_preconditioning_start_uses_cached_zone_prediction(self) -> None:
        event = helpers.models_module.ClimateEvent(
            entity_id="climate.bedroom",
            when=datetime(2026, 7, 9, 20, 30, tzinfo=timezone.utc),
            temperature=24,
            weekday="thursday",
            start="22:00",
            action=helpers.ACTION_SET_TEMPERATURE,
            hvac_mode="cool",
            target_when=datetime(2026, 7, 9, 22, 0, tzinfo=timezone.utc),
            preconditioning_diagnostics={
                "direction": "cool",
                "source": "history",
            },
        )
        scheduler = SimpleNamespace(
            get_next_event_for_zone=lambda entity_id: event,
        )
        entry = self._entry(scheduler, ["climate.bedroom"])
        sensor = sensor_module.ZonePreconditioningStartSensor(
            entry,
            "climate.bedroom",
        )

        self.assertEqual(sensor.native_value, event.when)
        self.assertEqual(
            sensor.extra_state_attributes,
            {
                "status": "planned",
                "scheduled_for": "2026-07-09T22:00:00+00:00",
                "lead_minutes": 90,
                "direction": "cool",
                "model_source": "history",
                "target_temperature": 24,
                "hvac_mode": "cool",
            },
        )

    def test_room_assist_omits_duplicated_source_readings(self) -> None:
        scheduler = SimpleNamespace(
            get_room_sensor_assist_status=lambda entity_id: {
                "status": "assisting",
                "room_temperature_entity_id": "sensor.room_temperature",
                "target_temperature": 21,
                "applied_temperature": 21,
                "applied_offset": 1,
                "calculated_temperature": 24,
                "scheduled_target_guard": "heating_ceiling",
                "hysteresis_phase": "towards_lower",
                "hysteresis_target": 20.7,
                "deadband_low": 20.7,
                "deadband_high": 21.3,
                "assist_delta": 2,
                "direction": "heat",
                "hvac_mode": "heat",
                "room_temperature": 18,
                "climate_temperature": 20,
            },
        )
        entry = self._entry(scheduler, ["climate.living_room"])
        sensor = sensor_module.ZoneRoomAssistStateSensor(
            entry,
            "climate.living_room",
        )

        self.assertEqual(sensor.native_value, "assisting")
        self.assertEqual(
            sensor.extra_state_attributes,
            {
                "room_temperature_entity_id": "sensor.room_temperature",
                "target_temperature": 21,
                "applied_temperature": 21,
                "applied_offset": 1,
                "calculated_temperature": 24,
                "scheduled_target_guard": "heating_ceiling",
                "hysteresis_phase": "towards_lower",
                "hysteresis_target": 20.7,
                "deadband_low": 20.7,
                "deadband_high": 21.3,
                "assist_delta": 2,
                "direction": "heat",
                "hvac_mode": "heat",
            },
        )

    def test_room_assist_exposes_native_range_context_without_scalar_offset(self) -> None:
        scheduler = SimpleNamespace(
            get_room_sensor_assist_status=lambda entity_id: {
                "status": "holding",
                "room_temperature_entity_id": "sensor.room_temperature",
                "target_temp_low": 20,
                "target_temp_high": 24,
                "applied_target_temp_low": 19.5,
                "applied_target_temp_high": 23.5,
                "climate_target_temp_low": 19.5,
                "climate_target_temp_high": 23.5,
                "range_shift": -0.5,
                "applied_offset": None,
                "assist_delta": 0,
                "direction": None,
                "hvac_mode": "heat_cool",
            },
        )
        entry = self._entry(scheduler, ["climate.living_room"])
        sensor = sensor_module.ZoneRoomAssistStateSensor(
            entry,
            "climate.living_room",
        )

        self.assertEqual(sensor.native_value, "holding")
        self.assertEqual(
            sensor.extra_state_attributes,
            {
                "room_temperature_entity_id": "sensor.room_temperature",
                "target_temp_low": 20,
                "target_temp_high": 24,
                "applied_target_temp_low": 19.5,
                "applied_target_temp_high": 23.5,
                "climate_target_temp_low": 19.5,
                "climate_target_temp_high": 23.5,
                "range_shift": -0.5,
                "hvac_mode": "heat_cool",
            },
        )


class SensorTranslationTest(unittest.TestCase):
    """Verify sensor names and states have complete translations."""

    def test_sensor_translation_keys_and_states_match(self) -> None:
        translations = {
            language: json.loads(
                (
                    ROOT
                    / "custom_components"
                    / "velair"
                    / "translations"
                    / f"{language}.json"
                ).read_text(encoding="utf-8")
            )
            for language in ("de", "en", "es", "fr", "it", "nl", "pl", "pt", "pt-BR", "ru")
        }
        expected_states = {
            "paused",
            "override_active",
            "scheduled",
            "idle",
            "temperature_migration_required",
        }

        for language, translation in translations.items():
            with self.subTest(language=language):
                sensors = translation["entity"]["sensor"]
                self.assertEqual(
                    set(sensors),
                    {
                        "next_climate_event",
                        "diagnostics_status",
                        "scheduler_status",
                        "zone_active_target_temperature",
                        "zone_environmental_condition",
                        "zone_ventilation_opportunity",
                        "zone_air_quality",
                        "zone_override_state",
                        "zone_control",
                        "zone_delivery_diagnostics",
                        "zone_preconditioning_start",
                        "zone_room_assist_state",
                    },
                )
                self.assertEqual(
                    set(sensors["scheduler_status"]["state"]),
                    expected_states,
                )
                self.assertEqual(
                    set(sensors["diagnostics_status"]["state"]),
                    {"ok", "warning", "error"},
                )
                self.assertEqual(
                    set(sensors["zone_control"]["state"]),
                    {"automatic", "manual", "external"},
                )
                self.assertEqual(
                    set(sensors["zone_ventilation_opportunity"]["state"]),
                    {
                        "unavailable",
                        "no_opportunity",
                        "may_help",
                        "comfort_possible",
                        "trade_off",
                        "already_comfortable",
                    },
                )
                self.assertEqual(
                    set(sensors["zone_delivery_diagnostics"]["state"]),
                    {
                        "idle",
                        "success",
                        "failed",
                        "retrying",
                        "exhausted",
                        "invalid_intent",
                        "cancelled",
                        "unavailable",
                    },
                )
                self.assertEqual(
                    set(translation["entity"]["select"]),
                    {"mode"},
                )
                self.assertEqual(
                    set(translation["entity"]["switch"]),
                    {"automatic_scheduling"},
                )

        self.assertEqual(
            translations["es"]["entity"]["sensor"]["next_climate_event"]["name"],
            "Próximo evento programado",
        )
        self.assertEqual(
            translations["pt-BR"]["entity"]["switch"]["automatic_scheduling"]["name"],
            "Programação automática",
        )
        self.assertEqual(
            translations["pt"]["entity"]["sensor"]["zone_air_quality"]["state"]["poor"],
            "Má",
        )
        self.assertEqual(
            translations["pl"]["entity"]["switch"]["automatic_scheduling"]["name"],
            "Automatyczny harmonogram",
        )
        for language in ("de", "es", "fr", "it", "nl", "pl", "pt", "pt-BR", "ru"):
            self.assertNotEqual(
                translations[language]["entity"]["sensor"]["zone_override_state"]["state"]["boost"],
                "Boost",
                f"Contextual boost translation missing in {language}",
            )

        def flatten(value, prefix=""):
            entries = {}
            for key, child in value.items():
                path = f"{prefix}.{key}" if prefix else key
                if isinstance(child, dict):
                    entries.update(flatten(child, path))
                else:
                    entries[path] = child
            return entries

        source_entries = flatten(translations["en"])
        for language, translation in translations.items():
            with self.subTest(language=language, contract="complete"):
                entries = flatten(translation)
                self.assertEqual(set(entries), set(source_entries))
                for key, source_value in source_entries.items():
                    self.assertTrue(entries[key])
                    self.assertEqual(
                        sorted(re.findall(r"\{([^}]+)\}", entries[key])),
                        sorted(re.findall(r"\{([^}]+)\}", source_value)),
                        f"Placeholder mismatch in {language}.{key}",
                    )

    def test_user_guide_explains_generated_entities_and_language_behavior(
        self,
    ) -> None:
        usage = (ROOT / "docs" / "user" / "usage.md").read_text(encoding="utf-8")

        for expected in (
            "## Home Assistant Entities",
            "**Next scheduled event**",
            "**Scheduler status**",
            "**Active target temperature**",
            "**Environmental condition**",
            "**Air quality**",
            "**Zone override**",
            "**Zone control**",
            "**Zone delivery diagnostics**",
            "**Preconditioning start**",
            "**Room Assist**",
            "**Automatic scheduling**",
            "backend language when",
        ):
            self.assertIn(expected, usage)


if __name__ == "__main__":
    unittest.main()
