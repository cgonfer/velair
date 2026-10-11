"""Shared resource boundary and portability tests."""
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import helpers
import voluptuous as vol
from custom_components.velair import api, services, storage
from custom_components.velair.models import normalize_schedule_data


class LibrarySchemaTest(unittest.TestCase):
    def test_reference_is_exclusive_with_local_configuration(self):
        for schema in (api.SCHEDULE_BLOCK_SCHEMA, services.SCHEDULE_BLOCK_SCHEMA):
            self.assertEqual(schema({"start": "07:00", "preset_key": "comfort"}), {"start": "07:00", "preset_key": "comfort"})
            with self.assertRaises(vol.Invalid):
                schema({"start": "07:00", "preset_key": "comfort", "temperature": 21})

    def test_daily_service_requires_exactly_one_source(self):
        base = {"entity_id": "climate.room", "weekday": "monday"}
        for extra in ({}, {"blocks": [], "template_link": {}}):
            with self.assertRaises(vol.Invalid):
                services.SET_DAILY_SCHEDULE_SCHEMA({**base, **extra})
        link = {"template_key": "day", "bindings": {}}
        self.assertEqual(services.SET_DAILY_SCHEDULE_SCHEMA({**base, "template_link": link})["template_link"], link)

    def test_conversion_preserves_references_and_converts_each_value_once(self):
        config = {"action": "set_temperature", "temperature": 20}
        data = {"block_presets": [{"key": "p", "name": "Comfort", "config": deepcopy(config)}], "zones": {"climate.room": {"schedule": {"monday": [{"start": "07:00", "preset_key": "p"}]}, "template_links": {"tuesday": {"template_key": "day", "bindings": {"a": deepcopy(config), "b": {"preset_key": "p"}}}}}}, "profiles": [{"zones": {"climate.room": {"template_links": {"monday": {"template_key": "day", "bindings": {"a": deepcopy(config)}}}}}}]}
        converted = storage.convert_portable_temperature_data(data, "°C", "°F", None)
        self.assertEqual(converted["block_presets"][0]["config"]["temperature"], 68)
        self.assertEqual(converted["zones"]["climate.room"]["template_links"]["tuesday"]["bindings"]["a"]["temperature"], 68)
        self.assertEqual(converted["profiles"][0]["zones"]["climate.room"]["template_links"]["monday"]["bindings"]["a"]["temperature"], 68)
        self.assertEqual(converted["zones"]["climate.room"]["schedule"]["monday"][0], {"start": "07:00", "preset_key": "p"})
        self.assertEqual(data["block_presets"][0]["config"]["temperature"], 20)

    def test_dependency_selection_finds_default_and_profile_bindings(self):
        payload = {"zones": {"climate.room": {"template_links": {"monday": {"template_key": "day", "bindings": {"a": {"preset_key": "p"}}}}}}, "templates": [], "block_presets": []}
        self.assertEqual(api._with_dependency_sections(["zones"], payload), ["zones", "templates", "block_presets"])
        with self.assertRaisesRegex(ValueError, "missing"):
            api._with_dependency_sections(["zones"], {"zones": payload["zones"]})

    def portable_runtime(self, data):
        return {"storage": SimpleNamespace(data=data, effective_temperature_unit=storage.CELSIUS, raw_data=lambda: deepcopy(data)), "entry": SimpleNamespace(options={})}

    def linked_data(self):
        data = normalize_schedule_data(None, ["climate.room"])
        data["block_presets"] = [{"key": "p", "name": "Comfort", "config": {"action": "set_temperature", "temperature": 21, "hvac_mode": "heat"}}]
        data["templates"] = [{"key": "day", "name": "Day", "blocks": [{"slot_id": "a", "start": "07:00", "action": "turn_off"}]}]
        data["zones"]["climate.room"]["schedule"]["monday"] = []
        data["zones"]["climate.room"]["template_links"] = {"monday": {"template_key": "day", "bindings": {"a": {"preset_key": "p"}}}}
        return data

    def test_default_link_round_trip_auto_includes_libraries(self):
        data = self.linked_data()
        payload = api._build_export_payload(self.portable_runtime(data), ["zones"])
        self.assertEqual(set(payload["sections"]), {"zones", "templates", "block_presets"})
        current = normalize_schedule_data(None, ["climate.room"])
        imported = api._build_import_data(self.portable_runtime(current), payload, ["zones"])
        self.assertEqual(imported["zones"]["climate.room"]["template_links"], {"monday": {**data["zones"]["climate.room"]["template_links"]["monday"], "mode": "hours"}})
        self.assertEqual(imported["templates"][0]["blocks"][0]["slot_id"], "a")
        self.assertEqual(imported["block_presets"], data["block_presets"])

    def test_import_rejects_duplicate_template_ids_and_preset_template_blocks(self):
        data = self.linked_data()
        runtime = self.portable_runtime(data)
        payload = api._build_export_payload(runtime, ["templates"])
        payload["sections"]["templates"][0]["blocks"].append({"slot_id": "a", "start": "09:00", "action": "turn_off"})
        with self.assertRaises(ValueError):
            api._build_import_data(runtime, payload, ["templates"])
        payload["sections"]["templates"][0]["blocks"] = [{"start": "07:00", "slot_id": "a", "preset_key": "p"}]
        with self.assertRaises(ValueError):
            api._build_import_data(runtime, payload, ["templates"])

    def test_preset_import_merges_keys_and_validates_existing_consumers(self):
        data = self.linked_data()
        data["block_presets"].append({"key": "local", "name": "Local", "config": {"action": "turn_off"}})
        payload = {"format": api.EXPORT_FORMAT, "model_version": 13, "temperature_unit": storage.CELSIUS, "sections": {"block_presets": [{"key": "p", "name": "Comfort", "config": {"action": "set_temperature", "temperature": 20}}]}}
        imported = api._build_import_data(self.portable_runtime(data), payload, ["block_presets"])
        self.assertEqual({p["key"] for p in imported["block_presets"]}, {"p", "local"})
        self.assertEqual(next(p for p in imported["block_presets"] if p["key"] == "p")["config"]["temperature"], 20)
        payload["sections"]["templates"] = []
        with self.assertRaises(ValueError):
            api._build_import_data(self.portable_runtime(data), payload, ["templates"])



class LibraryApiTest(unittest.IsolatedAsyncioTestCase):
    def runtime(self, scheduler):
        return {"scheduler": scheduler, "storage": SimpleNamespace(temperature_migration_required=False)}

    async def test_daily_link_forwarded_without_resolved_copy(self):
        scheduler = SimpleNamespace(async_set_daily_schedule=AsyncMock())
        link = {"template_key": "day", "bindings": {"a": {"preset_key": "p"}}}
        msg = {"id": 1, "entity_id": "climate.room", "weekday": "monday", "template_link": link, "expected_revision": 4}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with patch.object(api, "_get_runtime", return_value=self.runtime(scheduler)), patch.object(api, "_build_schedule_response", return_value={}):
            await api.ws_set_daily_schedule(None, connection, msg)
        scheduler.async_set_daily_schedule.assert_awaited_once_with("climate.room", "monday", None, template_link=link, expected_revision=4)
        connection.send_error.assert_not_called()

    async def test_template_update_retains_slot_identity_and_assignments(self):
        scheduler = SimpleNamespace(async_set_schedule_template=AsyncMock())
        blocks = [{"start": "07:00", "slot_id": "stable", "action": "turn_off"}]
        assignments = [{"source": "default", "entity_id": "climate.room", "weekday": "monday", "bindings": {"stable": {"action": "turn_off"}}}]
        msg = {"id": 1, "name": "Day", "key": "day", "blocks": blocks, "assignments": assignments, "expected_revision": 3}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with patch.object(api, "_get_runtime", return_value=self.runtime(scheduler)), patch.object(api, "_build_schedule_response", return_value={}):
            await api.ws_set_schedule_template(None, connection, msg)
        scheduler.async_set_schedule_template.assert_awaited_once_with("Day", blocks, "day", assignments=assignments, expected_revision=3)

    async def test_preset_update_requires_scheduler_validation(self):
        scheduler = SimpleNamespace(async_set_block_preset=AsyncMock())
        msg = {"id": 2, "name": "Cool", "config": {"action": "set_temperature", "temperature": 25, "hvac_mode": "cool"}, "expected_revision": 1}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with patch.object(api, "_get_runtime", return_value=self.runtime(scheduler)), patch.object(api, "_build_schedule_response", return_value={}):
            await api.ws_set_block_preset(None, connection, msg)
        scheduler.async_set_block_preset.assert_awaited_once_with("Cool", msg["config"], None, expected_revision=1)

    async def test_template_preview_forwards_revision_and_draft_assignments(self):
        scheduler = SimpleNamespace(preview_schedule_template_update=Mock(return_value={"pending": []}))
        msg = {"id": 3, "name": "Day", "key": "day", "blocks": [], "assignments": [], "expected_revision": 4}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with patch.object(api, "_get_runtime", return_value=self.runtime(scheduler)):
            await api.ws_preview_schedule_template_update(None, connection, msg)
        scheduler.preview_schedule_template_update.assert_called_once_with("Day", [], "day", assignments=[], expected_revision=4)
        connection.send_result.assert_called_once_with(3, {"pending": []})
