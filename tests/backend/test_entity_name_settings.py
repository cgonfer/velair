"""Persist climate name presentation without changing climate configuration."""

from __future__ import annotations

from copy import deepcopy
import importlib
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import helpers
import voluptuous as vol


api = importlib.import_module("custom_components.velair.api")
models = importlib.import_module("custom_components.velair.models")
storage_module = importlib.import_module("custom_components.velair.storage")


class MemoryStore:
    def __init__(self, data=None):
        self.data = deepcopy(data)

    async def async_load(self):
        return deepcopy(self.data)

    async def async_save(self, data):
        self.data = deepcopy(data)


class EntityNameSettingsNormalizationTest(unittest.TestCase):
    def test_absent_preference_preserves_the_existing_settings_shape(self):
        for raw in (None, {}, {"first_weekday": "sunday"}):
            with self.subTest(raw=raw):
                normalized = models.normalize_panel_settings(raw, ["climate.room"])
                self.assertNotIn("entity_name_display", normalized)
                self.assertEqual(normalized["first_weekday"], "sunday" if raw else "monday")

    def test_persisted_unknown_preferences_fall_back_to_legacy(self):
        for value in (None, "", "unsupported", 12, [], {}):
            with self.subTest(value=value):
                normalized = models.normalize_panel_settings(
                    {"entity_name_display": value, "first_weekday": "sunday"},
                    ["climate.room"],
                )
                self.assertEqual(normalized["entity_name_display"], "legacy")
                self.assertEqual(normalized["first_weekday"], "sunday")

    def test_api_accepts_only_supported_preferences(self):
        schema = vol.Schema(api.PANEL_SETTINGS_WS_SCHEMA, extra=vol.PREVENT_EXTRA)
        # The lightweight HA test harness does not execute dictionary field
        # validators. Exercise the actual validator registered for this field.
        validator = next(value for key, value in api.PANEL_SETTINGS_WS_SCHEMA.items()
                         if getattr(key, "schema", key) == "entity_name_display")
        for value in ("legacy", "legacy_area", "entity_context"):
            with self.subTest(value=value):
                message = {"type": "velair/update_settings", "entity_name_display": value}
                self.assertEqual(schema(message), message)
                self.assertEqual(validator(value), value)
        for value in (None, "", "unsupported", 12, [], {}):
            with self.subTest(value=value):
                with self.assertRaises(vol.Invalid):
                    validator(value)


class EntityNameSettingsPersistenceTest(unittest.IsolatedAsyncioTestCase):
    def make_storage(self, store):
        hass = helpers.FakeHass()
        with patch.object(storage_module, "Store", return_value=store):
            return storage_module.VelairStorage(hass, "naming-test")

    async def test_preference_survives_store_reload_and_settings_only_portability(self):
        for value in ("legacy", "legacy_area", "entity_context"):
            with self.subTest(value=value):
                store = MemoryStore()
                storage = self.make_storage(store)
                await storage.async_load(["climate.room"])
                climate = helpers.FakeClimateManager()
                scheduler = helpers.VelairScheduler(
                    helpers.FakeHass(), storage.data, climate, storage.async_save
                )
                before_zones = deepcopy(storage.data["zones"])
                await scheduler.async_update_settings({
                    "entity_name_display": value,
                    "first_weekday": "sunday",
                    "zone_order": ["climate.room"],
                })
                await scheduler.async_update_settings({"min_temperature": 10})
                self.assertEqual(storage.data["settings"]["entity_name_display"], value)
                self.assertEqual(storage.data["zones"], before_zones)
                self.assertEqual(climate.calls, [])

                restarted = self.make_storage(store)
                await restarted.async_load(["climate.room"])
                self.assertEqual(restarted.data["settings"]["entity_name_display"], value)
                self.assertEqual(restarted.data["settings"]["first_weekday"], "sunday")
                self.assertEqual(restarted.data["settings"]["min_temperature"], 10)
                self.assertEqual(restarted.data["settings"]["zone_order"], ["climate.room"])
                entry = SimpleNamespace(options={}, data={"climate_entities": ["climate.room"]})
                runtime = {"storage": restarted, "entry": entry}
                payload = api._build_export_payload(runtime, ["settings"])
                self.assertEqual(payload["sections"]["settings"]["entity_name_display"], value)
                imported = api._build_import_data(runtime, payload, ["settings"])
                self.assertEqual(imported["settings"]["entity_name_display"], value)
                self.assertEqual(imported["settings"]["first_weekday"], "sunday")

    async def test_older_storage_keeps_implicit_legacy_after_reload(self):
        store = MemoryStore()
        storage = self.make_storage(store)
        await storage.async_load(["climate.room"])
        self.assertNotIn("entity_name_display", store.data["settings"])
        restarted = self.make_storage(store)
        await restarted.async_load(["climate.room"])
        self.assertNotIn("entity_name_display", restarted.data["settings"])

    async def test_committed_import_roundtrips_all_preferences(self):
        for mode in ("legacy", "legacy_area", "entity_context"):
            source = self.make_storage(MemoryStore())
            await source.async_load(["climate.room"])
            source_scheduler = helpers.VelairScheduler(
                helpers.FakeHass(), source.data, helpers.FakeClimateManager(), source.async_save
            )
            await source_scheduler.async_update_settings({
                "entity_name_display": mode, "first_weekday": "sunday",
            })
            entry = SimpleNamespace(options={}, data={"climate_entities": ["climate.room"]})
            for export_sections, import_sections in (
                (["settings"], ["settings"]),
                (list(api.EXPORT_SECTIONS), ["settings"]),
                (list(api.EXPORT_SECTIONS), list(api.EXPORT_SECTIONS)),
            ):
                with self.subTest(mode=mode, export=export_sections, selected=import_sections):
                    payload = api._build_export_payload(
                        {"storage": source, "entry": entry}, export_sections
                    )
                    store = MemoryStore()
                    target = self.make_storage(store)
                    await target.async_load(["climate.room"])
                    scheduler = helpers.VelairScheduler(
                        helpers.FakeHass(), target.data, helpers.FakeClimateManager(), target.async_save
                    )
                    await scheduler.async_update_settings({
                        "entity_name_display": "legacy_area" if mode != "legacy_area" else "entity_context",
                    })
                    imported = api._build_import_data(
                        {"storage": target, "entry": entry, "scheduler": scheduler},
                        payload, import_sections,
                    )
                    imported.pop("apply_active_schedule_on_startup", None)
                    await scheduler.async_replace_portable_data(**imported)
                    restarted = self.make_storage(store)
                    await restarted.async_load(["climate.room"])
                    self.assertEqual(restarted.data["settings"]["entity_name_display"], mode)
                    self.assertEqual(restarted.data["settings"]["first_weekday"], "sunday")

    async def test_portability_section_selection_and_legacy_preferences(self):
        store = MemoryStore()
        storage = self.make_storage(store)
        await storage.async_load(["climate.room"])
        scheduler = helpers.VelairScheduler(
            helpers.FakeHass(), storage.data, helpers.FakeClimateManager(), storage.async_save
        )
        entry = SimpleNamespace(options={}, data={"climate_entities": ["climate.room"]})
        runtime = {"storage": storage, "entry": entry, "scheduler": scheduler}
        for mode in ("legacy", "legacy_area", "entity_context"):
            await scheduler.async_update_settings({"entity_name_display": mode})
            zones_only = api._build_export_payload(runtime, ["zones"])
            self.assertNotIn("settings", zones_only["sections"])
            full = api._build_export_payload(runtime, list(api.EXPORT_SECTIONS))
            for payload in (zones_only, full):
                imported = api._build_import_data(runtime, payload, ["zones"])
                self.assertNotIn("settings", imported)
                await scheduler.async_replace_portable_data(**imported)
                restarted = self.make_storage(store)
                await restarted.async_load(["climate.room"])
                self.assertEqual(restarted.data["settings"]["entity_name_display"], mode)
        older = api._build_export_payload(runtime, ["settings"])
        older["model_version"] = 1
        older["sections"]["settings"].pop("entity_name_display")
        imported = api._build_import_data(runtime, older, ["settings"])
        imported.pop("apply_active_schedule_on_startup", None)
        await scheduler.async_replace_portable_data(**imported)
        restarted = self.make_storage(store)
        await restarted.async_load(["climate.room"])
        self.assertNotIn("entity_name_display", restarted.data["settings"])
        for invalid in (None, "", "unsupported", 12, [], {}):
            with self.subTest(invalid=invalid):
                older["sections"]["settings"]["entity_name_display"] = invalid
                imported = api._build_import_data(runtime, older, ["settings"])
                imported.pop("apply_active_schedule_on_startup", None)
                await scheduler.async_replace_portable_data(**imported)
                restarted = self.make_storage(store)
                await restarted.async_load(["climate.room"])
                self.assertEqual(restarted.data["settings"]["entity_name_display"], "legacy")

    async def test_failed_persistence_does_not_publish_the_preference(self):
        data = models.normalize_schedule_data(None, ["climate.room"])
        save = AsyncMock(side_effect=OSError("storage unavailable"))
        scheduler = helpers.VelairScheduler(
            helpers.FakeHass(), data, helpers.FakeClimateManager(), save
        )
        original = deepcopy(data["settings"])
        with self.assertRaises(OSError):
            await scheduler.async_update_settings({"entity_name_display": "entity_context"})
        self.assertEqual(data["settings"], original)

    async def test_api_forwards_the_preference_without_discarding_other_settings(self):
        scheduler = SimpleNamespace(async_update_settings=AsyncMock())
        runtime = {
            "scheduler": scheduler,
            "storage": SimpleNamespace(temperature_migration_required=False),
            "operation_active": None,
            "operation_recovery": None,
        }
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with patch.object(api, "_get_runtime", return_value=runtime), patch.object(
            api, "_build_schedule_response", return_value={"updated": True}
        ):
            await api.ws_update_settings(SimpleNamespace(), connection, {
                "id": 1,
                "type": "velair/update_settings",
                "entity_name_display": "legacy_area",
                "first_weekday": "sunday",
            })
        scheduler.async_update_settings.assert_awaited_once_with({
            "entity_name_display": "legacy_area", "first_weekday": "sunday",
        })
        connection.send_result.assert_called_once_with(1, {"updated": True})
        connection.send_error.assert_not_called()
