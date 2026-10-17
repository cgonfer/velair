"""Temperature-only policy survives configuration boundaries without mode effects."""
from dataclasses import replace
from datetime import datetime, timezone
from types import SimpleNamespace
import unittest

from . import helpers  # noqa: F401 - install Home Assistant stubs
from . import test_library_api as library
from custom_components.velair import api
from custom_components.velair.external_execution.manager import ExternalExecutionManager
from custom_components.velair.external_execution.ramses_cc import RamsesCcScheduleProvider, translate_weekly_schedule
from custom_components.velair.models import (
    ClimateEvent, empty_week_schedule, normalize_schedule_blocks,
    normalize_schedule_data, validate_climate_profiles,
)
from custom_components.velair.schedule_resources import (
    materialize_day, normalize_config, template_blocks, updated_preset_config,
)
from custom_components.velair.storage import convert_portable_temperature_data
from custom_components.velair.services import UPDATE_BLOCK_PRESET_SCHEMA


class TemperatureOnlyContractsTest(unittest.TestCase):
    def setUp(self):
        self.config = {"action": "set_temperature", "temperature": 20, "temperature_only": True}
        self.block = {"start": "07:00", **self.config}

    def test_scalar_and_range_normalize_without_changing_legacy_blocks(self):
        for target in ({"temperature": 20}, {"target_temp_low": 19, "target_temp_high": 24}):
            with self.subTest(target=target):
                block = {"start": "07:00", **target, "temperature_only": True}
                normalized = normalize_schedule_blocks([block])[0]
                self.assertTrue(normalized["temperature_only"])
                self.assertEqual(normalize_schedule_blocks([normalized]), [normalized])
                block["temperature_only"] = False
                self.assertNotIn("temperature_only", normalize_schedule_blocks([block])[0])

    def test_rejects_non_boolean_modes_options_and_other_actions(self):
        invalid = [{**self.block, "temperature_only": value} for value in (1, 0, "true", None)]
        invalid += [{**self.block, field: value} for field, value in (
            ("hvac_mode", "heat"), ("hvac_mode", "cool"), ("fan_mode", "auto"),
            ("preset_mode", "eco"), ("swing_mode", "off"),
            ("swing_horizontal_mode", "off"), ("humidity", 50),
        )]
        invalid += [{**self.block, "action": action} for action in (
            "turn_off", "set_hvac_mode", "set_climate_options",
        )]
        for block in invalid:
            with self.subTest(block=block), self.assertRaises(ValueError):
                normalize_schedule_blocks([block])

    def test_websocket_and_service_input_validation_requires_boolean_policy(self):
        self.assertTrue(api.INLINE_SCHEDULE_BLOCK_SCHEMA(self.block)["temperature_only"])
        for value in ("true", 1, None):
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_schedule_blocks([
                    api.INLINE_SCHEDULE_BLOCK_SCHEMA({**self.block, "temperature_only": value})
                ])
            with self.subTest(service_value=value), self.assertRaises(ValueError):
                UPDATE_BLOCK_PRESET_SCHEMA({"preset_key": "quiet", "temperature_only": value})

    def test_presets_service_updates_and_linked_templates_preserve_policy(self):
        self.assertEqual(normalize_config(self.config), self.config)
        self.assertTrue(UPDATE_BLOCK_PRESET_SCHEMA({"preset_key": "quiet", "temperature_only": True})["temperature_only"])
        legacy = {"action": "set_temperature", "temperature": 20, "hvac_mode": "heat"}
        with self.assertRaises(ValueError):
            updated_preset_config(legacy, {"temperature_only": True})
        self.assertEqual(updated_preset_config(legacy, {"temperature_only": True}, clear_fields=["hvac_mode"]), self.config)
        self.assertNotIn("temperature_only", updated_preset_config(self.config, {"temperature_only": False}))
        data = {
            "templates": [{"key": "day", "blocks": template_blocks([{**self.block, "slot_id": "morning"}])}],
            "block_presets": [{"key": "quiet", "config": self.config}],
        }
        for link in (
            {"template_key": "day", "mode": "full"},
            {"template_key": "day", "bindings": {"morning": self.config}},
            {"template_key": "day", "bindings": {"morning": {"preset_key": "quiet"}}},
        ):
            with self.subTest(link=link):
                zone = {"schedule": {}, "template_links": {"monday": link}}
                self.assertEqual(materialize_day(data, zone, "monday"), [self.block])

    def test_profiles_storage_portability_and_conversion_retain_policy(self):
        week = empty_week_schedule()
        week["monday"] = [self.block]
        profiles = [{"key": "guest", "name": "Guest", "zones": {
            "climate.room": {"behavior": "schedule", "schedule": week},
        }}]
        validated = validate_climate_profiles(profiles, ["climate.room"])
        self.assertTrue(validated[0]["zones"]["climate.room"]["schedule"]["monday"][0]["temperature_only"])
        data = normalize_schedule_data({"profiles": profiles, "zones": {"climate.room": {"schedule": week}}}, ["climate.room"])
        runtime = library.LibrarySchemaTest().portable_runtime(data)
        payload = api._build_export_payload(runtime, ["zones", "profiles"])
        self.assertEqual(payload["model_version"], 18)
        imported = api._build_import_data(runtime, payload, ["zones", "profiles"])
        self.assertTrue(imported["zones"]["climate.room"]["schedule"]["monday"][0]["temperature_only"])
        converted = convert_portable_temperature_data(payload["sections"], "°C", "°F", None)
        block = converted["zones"]["climate.room"]["schedule"]["monday"][0]
        self.assertEqual(block["temperature"], 68)
        self.assertIs(block["temperature_only"], True)
        self.assertEqual(api._build_import_data(runtime, payload, ["zones", "profiles"]), imported)

    def test_event_serialization_exposes_policy_only_when_selected(self):
        event = ClimateEvent("climate.room", datetime.now(timezone.utc), 20, "monday", "07:00")
        self.assertNotIn("temperature_only", api._serialize_event(event))
        self.assertIs(api._serialize_event(replace(event, temperature_only=True))["temperature_only"], True)

    def test_external_provider_must_explicitly_support_policy(self):
        provider = SimpleNamespace(capabilities=RamsesCcScheduleProvider.capabilities)
        manager = ExternalExecutionManager({"zones": {}}, {"provider": provider}, lambda: None, lambda _: "°C")
        with self.assertRaisesRegex(ValueError, "temperature-only"):
            manager.ensure_block_supported("climate.room", self.block, "provider")
        provider.capabilities = replace(provider.capabilities, supports_temperature_only=True)
        manager.ensure_block_supported("climate.room", self.block, "provider")
        week = empty_week_schedule()
        week["monday"] = [self.block]
        with self.assertRaisesRegex(ValueError, "temperature-only"):
            translate_weekly_schedule(week, "°C")

