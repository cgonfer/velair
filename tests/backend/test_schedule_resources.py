"""Reference integrity, runtime authority and cancellation of shared resources."""
import asyncio
from copy import deepcopy
import unittest

from .helpers import normalize_schedule_data
from . import test_linked_schedule_acceptance as acceptance
from custom_components.velair.models import normalize_schedule_templates
from custom_components.velair.schedule_resources import (
    ConfigurationResourceError, materialize_day, normalize_config, resolve_week,
    template_blocks,
)


class ResourceResolutionTest(unittest.TestCase):
    def test_unpadded_legacy_time_migrates_and_retains_slot_identity(self):
        templates = normalize_schedule_templates([{"key": "day", "name": "Day", "blocks": [{"start": "7:00", "temperature": 21}]}])
        self.assertEqual(templates[0]["blocks"][0]["start"], "07:00")
        self.assertEqual(normalize_schedule_templates(templates), templates)
        self.assertEqual(template_blocks([{"start": "7:00", "temperature": 21}])[0]["start"], "07:00")

    def test_reference_cannot_mix_with_inline_settings(self):
        data = normalize_schedule_data({"zones": {"climate.room": {"schedule": {"monday": [
            {"start": "07:00", "preset_key": "missing", "temperature": 21}
        ]}}}}, ["climate.room"])
        self.assertEqual(data["zones"]["climate.room"]["schedule"]["monday"][0]["temperature"], 21)
        with self.assertRaises(ValueError):
            resolve_week(data, data["zones"]["climate.room"])

    def test_duplicate_slots_are_not_interpreted_as_shared_assignments(self):
        data = {"templates": [{"key": "day", "blocks": [
            {"slot_id": "same", "start": "07:00", "action": "turn_off"},
            {"slot_id": "same", "start": "23:00", "action": "turn_off"},
        ]}]}
        zone = {"schedule": {}, "template_links": {"monday": {"template_key": "day", "bindings": {"same": {"action": "turn_off"}}}}}
        with self.assertRaises(ConfigurationResourceError):
            materialize_day(data, zone, "monday")

    def test_linked_damaged_template_survives_load_for_repair(self):
        template = {"key": "day", "name": "Day", "blocks": [{"slot_id": "a", "start": "bad", "temperature": 21}]}
        data = normalize_schedule_data({"templates": [template], "templates_seeded": True,
            "zones": {"climate.room": {"template_links": {"monday": {"template_key": "day", "bindings": {"a": {"action": "turn_off"}}}}}}}, ["climate.room"])
        self.assertEqual(next(item for item in data["templates"] if item["key"] == "day"), template)
        with self.assertRaises(ValueError):
            resolve_week(data, data["zones"]["climate.room"])

    def test_missing_identity_in_linked_template_is_preserved_for_repair(self):
        template = {"key": "day", "name": "Day", "blocks": [{"start": "07:00", "temperature": 21}]}
        raw = {"templates": [template], "templates_seeded": True, "zones": {"climate.room": {"template_links": {"monday": {"template_key": "day", "bindings": {"lost": {"action": "turn_off"}}}}}}}
        data = normalize_schedule_data(raw, ["climate.room"])
        stored = next(item for item in data["templates"] if item["key"] == "day")
        self.assertNotIn("slot_id", stored["blocks"][0])
        with self.assertRaises(ConfigurationResourceError):
            resolve_week(data, data["zones"]["climate.room"])

    def test_presets_support_current_actions_without_inventing_combinations(self):
        for config in ({"temperature": 21, "hvac_mode": "heat"}, {"action": "set_hvac_mode", "hvac_mode": "cool"}, {"action": "set_climate_options", "preset_mode": "eco"}, {"action": "turn_off"}):
            with self.subTest(config=config):
                self.assertTrue(normalize_config(config))
        for config in ({}, {"action": "turn_off", "temperature": 21}, {"action": "set_hvac_mode", "hvac_mode": "cool", "fan_mode": "auto"}):
            with self.subTest(config=config), self.assertRaises(ValueError):
                normalize_config(config)


class ResourceRuntimeTest(unittest.IsolatedAsyncioTestCase):
    setUp = acceptance.LinkedScheduleAcceptanceTest.setUp
    save = acceptance.LinkedScheduleAcceptanceTest.save
    link = acceptance.LinkedScheduleAcceptanceTest.link
    profile = acceptance.LinkedScheduleAcceptanceTest.profile
    resolved = acceptance.LinkedScheduleAcceptanceTest.resolved

    async def test_profile_activation_resolves_configuration_before_delivery(self):
        await self.scheduler.async_activate_profile("winter")
        self.assertIn(("set_temperature", "climate.salon", 21, True, "heat"), self.climate.calls)

    async def test_active_preset_edit_uses_old_snapshot_and_reapplies(self):
        self.data["global_"]["active_profile_ids"] = ["winter"]
        await self.scheduler.async_set_block_preset("Winter", {"temperature": 22, "hvac_mode": "heat"}, "winter", expected_revision=0)
        self.assertIn(("set_temperature", "climate.salon", 22, True, "heat"), self.climate.calls)

    async def test_preset_edits_preserve_library_order_through_reload(self):
        keys = [preset["key"] for preset in self.data["block_presets"]]
        for index, key in enumerate(keys):
            with self.subTest(position=index):
                config = deepcopy(self.data["block_presets"][index]["config"])
                config["temperature"] += 0.5
                await self.scheduler.async_set_block_preset(
                    f"Edited {index}", config, key,
                    expected_revision=self.data["configuration_revision"])
                self.assertEqual([preset["key"] for preset in self.data["block_presets"]], keys)
                self.assertEqual(self.data["block_presets"][index]["name"], f"Edited {index}")
                reloaded = normalize_schedule_data(deepcopy(self.data), ["climate.salon"])
                self.assertEqual(reloaded["block_presets"], self.data["block_presets"])
        added = await self.scheduler.async_set_block_preset(
            "New preset", {"action": "turn_off"},
            expected_revision=self.data["configuration_revision"])
        self.assertEqual([preset["key"] for preset in self.data["block_presets"]], keys + [added])

    async def test_hidden_default_edit_does_not_override_profile(self):
        self.data["global_"]["active_profile_ids"] = ["summer"]
        await self.scheduler.async_set_block_preset("Usual", {"temperature": 22, "hvac_mode": "heat"}, "usual", expected_revision=0)
        self.assertEqual(self.climate.calls, [])

    async def test_preset_edit_preserves_boost_and_other_pause_reasons(self):
        override = {"type": "boost", "temperature": 23, "until": "2030-01-01T00:00:00+00:00"}
        self.data["zones"]["climate.salon"]["override"] = deepcopy(override)
        await self.scheduler.async_set_block_preset("Usual", {"temperature": 22, "hvac_mode": "heat"}, "usual", expected_revision=0)
        self.assertEqual(self.data["zones"]["climate.salon"]["override"], override)
        self.assertEqual(self.climate.calls, [])

    async def test_cancellation_before_storage_commit_restores_graph(self):
        entered, release = asyncio.Event(), asyncio.Event()
        async def blocked_save():
            entered.set()
            await release.wait()
        self.scheduler._async_save_data = blocked_save
        before = deepcopy(self.data)
        task = asyncio.create_task(self.scheduler.async_set_block_preset("Usual", {"temperature": 22}, "usual", expected_revision=0))
        await entered.wait()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertEqual(self.data, before)

    async def test_cancellation_after_commit_finishes_runtime_before_return(self):
        entered, release = asyncio.Event(), asyncio.Event()
        original = self.scheduler._async_finalize_schedule_mutation
        async def blocked_finalize(*args, **kwargs):
            entered.set()
            await release.wait()
            await original(*args, **kwargs)
        self.scheduler._async_finalize_schedule_mutation = blocked_finalize
        task = asyncio.create_task(self.scheduler.async_set_block_preset("Usual", {"temperature": 22, "hvac_mode": "heat"}, "usual", expected_revision=0))
        await entered.wait()
        task.cancel()
        await asyncio.sleep(0)
        self.assertFalse(task.done())
        release.set()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertEqual(self.data["configuration_revision"], 1)
        self.assertIn(("set_temperature", "climate.salon", 22, True, "heat"), self.climate.calls)

    async def test_invalid_stored_links_are_quarantined_without_losing_data(self):
        self.data["zones"]["climate.salon"]["template_links"] = {"tuesday": {"template_key": "workday", "bindings": None}}
        self.assertIsNone(self.scheduler._effective_schedule("climate.salon", self.data["zones"]["climate.salon"]))
        self.assertIsNone(self.scheduler.get_configuration_resources()["resolved_default_schedules"]["climate.salon"])
        self.assertIsNone(self.data["zones"]["climate.salon"]["template_links"]["tuesday"]["bindings"])

    async def test_persisted_incompatible_preset_blocks_execution(self):
        self.data["block_presets"][0]["config"]["temperature"] = 99
        self.assertIsNone(self.scheduler._effective_schedule("climate.salon", self.data["zones"]["climate.salon"]))
        await self.scheduler.async_apply_current_schedule("climate.salon")
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.data["block_presets"][0]["config"]["temperature"], 99)

    async def test_import_combines_libraries_and_links_before_validation(self):
        presets = deepcopy(self.data["block_presets"])
        presets[0]["config"]["temperature"] = 22
        await self.scheduler.async_replace_portable_data(block_presets=presets)
        self.assertEqual(self.resolved()[0][0]["temperature"], 22)
        self.assertIn(("set_temperature", "climate.salon", 22, True, "heat"), self.climate.calls)
