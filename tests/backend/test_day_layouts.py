"""Atomic grouped editing and presentation-only persistence regressions."""
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from . import test_linked_schedule_acceptance as acceptance
from .helpers import normalize_schedule_data
from custom_components.velair.models import WEEKDAYS, serialize_schedule_data
from custom_components.velair.day_layouts import BUILTIN_DAY_LAYOUTS, normalize_day_layout_key
from custom_components.velair.schedule_resources import ConfigurationResourceError
from custom_components.velair import api


class DayLayoutValidationTest(unittest.TestCase):
    def test_three_builtin_partitions_cover_week(self):
        self.assertEqual(set(BUILTIN_DAY_LAYOUTS), {"individual", "weekdays_weekend", "all"})
        for groups in BUILTIN_DAY_LAYOUTS.values():
            self.assertEqual([day for group in groups for day in group], list(WEEKDAYS))
        for key in (None, "custom", [], {}):
            self.assertEqual(normalize_day_layout_key(key), "individual")


class DayLayoutRuntimeTest(unittest.IsolatedAsyncioTestCase):
    setUp = acceptance.LinkedScheduleAcceptanceTest.setUp
    save = acceptance.LinkedScheduleAcceptanceTest.save
    link = acceptance.LinkedScheduleAcceptanceTest.link
    profile = acceptance.LinkedScheduleAcceptanceTest.profile

    async def test_builtin_assignment_reload_and_no_runtime_effect(self):
        self.scheduler.async_schedule_next_event = Mock()
        before = deepcopy(self.data["zones"]["climate.salon"]["schedule"])
        for revision, key in enumerate(BUILTIN_DAY_LAYOUTS):
            await self.scheduler.async_set_schedule_days("climate.salon", day_layout_key=key, expected_revision=revision)
            loaded = normalize_schedule_data(serialize_schedule_data(normalize_schedule_data(self.data, ["climate.salon"])), ["climate.salon"])
            self.assertEqual(loaded["zones"]["climate.salon"]["day_layout_key"], key)
        self.assertEqual(self.data["zones"]["climate.salon"]["schedule"], before)
        self.scheduler.async_schedule_next_event.assert_not_called()
        self.assertEqual(self.climate.calls, [])
        resources = self.scheduler.get_configuration_resources()
        self.assertNotIn("day_layouts", resources)
        self.assertNotIn("day_layout_usages", resources)
        self.assertFalse(hasattr(api, "ws_set_day_layout"))
        self.assertFalse(hasattr(api, "ws_delete_day_layout"))
        self.assertFalse(hasattr(self.scheduler, "async_set_day_layout"))

    async def test_legacy_layout_only_does_not_add_links_or_reschedule(self):
        self.data["zones"]["climate.salon"].pop("template_links")
        self.scheduler.async_schedule_next_event = Mock()
        await self.scheduler.async_set_schedule_days("climate.salon", day_layout_key="all", expected_revision=0)
        self.assertNotIn("template_links", self.data["zones"]["climate.salon"])
        self.scheduler.async_schedule_next_event.assert_not_called()

    async def test_active_profile_layout_only_does_not_reconcile(self):
        self.data["global_"]["active_profile_ids"] = ["winter"]
        self.data["global_"]["base_profile_ids"] = ["winter"]
        profile = deepcopy(self.data["profiles"][0])
        profile["zones"]["climate.salon"]["day_layout_key"] = "all"
        self.scheduler.async_schedule_next_event = Mock()
        await self.scheduler.async_set_profile(profile, expected_revision=0)
        self.assertEqual(self.climate.calls, [])
        self.scheduler.async_schedule_next_event.assert_not_called()
        self.assertEqual(self.data["profiles"][0]["zones"]["climate.salon"]["day_layout_key"], "all")

    async def test_metadata_commit_ignores_and_preserves_concurrent_runtime_change(self):
        original = self.scheduler._async_commit_configuration_owned
        async def mutate_then_commit(candidate, expected_revision=None, *, commit_state):
            self.data["zones"]["climate.salon"]["override"] = {"type": "boost", "temperature": 23}
            await original(candidate, expected_revision, commit_state=commit_state)
        self.scheduler._async_commit_configuration_owned = mutate_then_commit
        self.scheduler.async_schedule_next_event = Mock()
        await self.scheduler.async_set_schedule_days("climate.salon", day_layout_key="all", expected_revision=0)
        self.scheduler.async_schedule_next_event.assert_not_called()
        self.assertEqual(self.data["zones"]["climate.salon"]["override"]["type"], "boost")

    async def test_noop_profile_save_retains_revision(self):
        profile = deepcopy(self.data["profiles"][0])
        await self.scheduler.async_set_profile(profile, expected_revision=0)
        self.assertEqual(self.data["configuration_revision"], 0)
        self.assertEqual(self.saves, 0)

    async def test_group_link_unlink_and_atomic_failure(self):
        await self.scheduler.async_set_schedule_days("climate.salon", ["monday", "tuesday"], template_link=self.link("summer"), expected_revision=0)
        zone = self.data["zones"]["climate.salon"]
        self.assertEqual(zone["template_links"]["monday"], zone["template_links"]["tuesday"])
        before = deepcopy(self.data)
        with self.assertRaises(ConfigurationResourceError):
            await self.scheduler.async_set_schedule_days("climate.salon", ["monday", "tuesday"], [], expected_revision=1)
        self.assertEqual(self.data, before)
        self.fail_save = True
        with self.assertRaises(RuntimeError):
            await self.scheduler.async_set_schedule_days("climate.salon", ["monday", "tuesday"], [], unlink_template=True, expected_revision=1)
        self.assertEqual(self.data, before)
        self.fail_save = False
        await self.scheduler.async_set_schedule_days("climate.salon", ["monday", "tuesday"], [], unlink_template=True, expected_revision=1)
        self.assertEqual(zone["template_links"], {})
        self.assertEqual(zone["schedule"]["wednesday"], before["zones"]["climate.salon"]["schedule"]["wednesday"])

    async def test_group_full_template_preset_and_heat_cool_actions(self):
        for mode, temperature in (("heat", 20), ("cool", 25)):
            await self.scheduler.async_set_schedule_days("climate.salon", ["monday", "wednesday"], [{"start": "07:00", "temperature": temperature, "hvac_mode": mode}], expected_revision=self.data["configuration_revision"])
            zone = self.data["zones"]["climate.salon"]
            self.assertEqual(zone["schedule"]["monday"], zone["schedule"]["wednesday"])
            self.assertEqual(zone["schedule"]["monday"][0]["hvac_mode"], mode)
        await self.scheduler.async_set_schedule_days("climate.salon", ["monday", "wednesday"], [{"start": "07:00", "preset_key": "summer"}], expected_revision=self.data["configuration_revision"])
        self.assertEqual(zone["schedule"]["monday"][0]["preset_key"], "summer")
        await self.scheduler.async_set_schedule_days("climate.salon", ["monday", "wednesday"], template_link={"template_key": "workday", "mode": "full"}, expected_revision=self.data["configuration_revision"])
        self.assertEqual(zone["template_links"]["monday"], zone["template_links"]["wednesday"])
        self.assertEqual(zone["template_links"]["monday"]["mode"], "full")

    async def test_bad_reference_revision_and_unmanaged_target_are_atomic(self):
        before = deepcopy(self.data)
        for options in ({"day_layout_key": "missing", "expected_revision": 0}, {"day_layout_key": "all", "expected_revision": 42}):
            with self.subTest(options=options), self.assertRaises(ValueError):
                await self.scheduler.async_set_schedule_days("climate.salon", **options)
            self.assertEqual(self.data, before)
        with self.assertRaises(ValueError):
            await self.scheduler.async_set_schedule_days("climate.unmanaged", day_layout_key="all", expected_revision=0)

    async def test_websocket_group_save_and_validation_error(self):
        runtime = {"scheduler": self.scheduler, "storage": SimpleNamespace(temperature_migration_required=False)}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with patch.object(api, "_get_runtime", return_value=runtime), patch.object(api, "_build_schedule_response", return_value={"saved": True}):
            await api.ws_set_schedule_days(None, connection, {"id": 1, "entity_id": "climate.salon", "day_layout_key": "all", "expected_revision": 0})
            connection.send_result.assert_called_once_with(1, {"saved": True})
            await api.ws_set_schedule_days(None, connection, {"id": 2, "entity_id": "climate.salon", "day_layout_key": "individual", "expected_revision": 0})
            self.assertEqual(connection.send_error.call_args.args[1], "revision_conflict")
            self.assertEqual(self.data["zones"]["climate.salon"]["day_layout_key"], "all")

    async def test_metadata_storage_failure_rolls_back(self):
        before = deepcopy(self.data)
        self.fail_save = True
        with self.assertRaises(RuntimeError):
            await self.scheduler.async_set_schedule_days("climate.salon", day_layout_key="all", expected_revision=0)
        self.assertEqual(self.data, before)

    def test_retired_references_and_library_are_discarded_on_load(self):
        before = deepcopy(self.data)
        self.data["day_layouts"] = [{"key": "custom", "groups": [list(WEEKDAYS)]}]
        self.data["zones"]["climate.salon"]["day_layout_key"] = "custom"
        self.data["profiles"][0]["zones"]["climate.salon"]["day_layout_key"] = "custom"
        loaded = normalize_schedule_data(self.data, ["climate.salon"])
        self.assertNotIn("day_layouts", loaded)
        self.assertEqual(loaded["zones"]["climate.salon"]["day_layout_key"], "individual")
        self.assertEqual(loaded["profiles"][0]["zones"]["climate.salon"]["day_layout_key"], "individual")
        self.assertEqual(loaded["zones"]["climate.salon"]["schedule"], before["zones"]["climate.salon"]["schedule"])
        self.assertEqual(loaded["zones"]["climate.salon"]["template_links"]["tuesday"]["bindings"], before["zones"]["climate.salon"]["template_links"]["tuesday"]["bindings"])
        self.assertEqual(loaded["profiles"][0]["zones"]["climate.salon"]["template_links"]["tuesday"]["bindings"], before["profiles"][0]["zones"]["climate.salon"]["template_links"]["tuesday"]["bindings"])

    def test_malformed_layout_reference_does_not_block_configuration_load(self):
        for key in (["bad"], {"bad": True}):
            with self.subTest(key=key):
                self.data["zones"]["climate.salon"]["day_layout_key"] = key
                resources = self.scheduler.get_configuration_resources()
                self.assertTrue(any(item["source"] == "day_layout" for item in resources["resource_diagnostics"]))

    async def test_group_copy_keeps_layout(self):
        self.data["zones"]["climate.salon"]["day_layout_key"] = "weekdays_weekend"
        await self.scheduler.async_copy_day_schedule("climate.salon", "tuesday", ["monday", "wednesday"], expected_revision=0)
        self.assertEqual(self.data["zones"]["climate.salon"]["day_layout_key"], "weekdays_weekend")

    async def test_profile_rejects_custom_layout_atomically(self):
        before = deepcopy(self.data)
        profile = deepcopy(self.data["profiles"][0])
        profile["zones"]["climate.salon"]["day_layout_key"] = "custom"
        with self.assertRaises(ValueError):
            await self.scheduler.async_set_profile(profile, expected_revision=0)
        self.assertEqual(self.data, before)

    def test_portable_legacy_custom_fallback_preserves_daily_data(self):
        runtime = {"storage": SimpleNamespace(data=normalize_schedule_data(self.data, ["climate.salon"])), "entry": SimpleNamespace(options={}, data={}), "scheduler": self.scheduler}
        payload = api._build_export_payload(runtime, ["zones", "profiles"])
        self.assertEqual(payload["model_version"], 18)
        self.assertNotIn("day_layouts", payload["sections"])
        self.assertNotIn("day_layouts", api.EXPORT_SECTIONS)
        legacy = deepcopy(payload)
        legacy["sections"]["day_layouts"] = [{"key": "custom", "name": "Old", "groups": [list(WEEKDAYS)]}]
        legacy["sections"]["zones"]["climate.salon"]["day_layout_key"] = "custom"
        legacy["sections"]["profiles"][0]["zones"]["climate.salon"]["day_layout_key"] = "custom"
        imported = api._build_import_data(runtime, legacy, ["zones", "profiles"])
        self.assertNotIn("day_layouts", imported)
        self.assertEqual(imported["zones"]["climate.salon"]["day_layout_key"], "individual")
        self.assertEqual(imported["profiles"][0]["zones"]["climate.salon"]["day_layout_key"], "individual")
        self.assertEqual(imported["zones"]["climate.salon"]["schedule"], payload["sections"]["zones"]["climate.salon"]["schedule"])
        self.assertEqual(imported["zones"]["climate.salon"]["template_links"], payload["sections"]["zones"]["climate.salon"]["template_links"])
        self.assertEqual(imported["profiles"][0]["zones"]["climate.salon"]["template_links"], payload["sections"]["profiles"][0]["zones"]["climate.salon"]["template_links"])
        self.assertEqual(self.climate.calls, [])
        legacy["model_version"] = 16
        legacy["sections"]["zones"]["climate.salon"].pop("day_layout_key")
        self.assertEqual(api._build_import_data(runtime, legacy, ["zones"])["zones"]["climate.salon"]["day_layout_key"], "individual")
