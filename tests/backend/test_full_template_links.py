"""Full template links and climate presets owned by daily templates."""
from copy import deepcopy
import unittest

from . import test_template_auto_assignments as allocation
from custom_components.velair.schedule_resources import materialize_day, normalize_links, resource_usages, validate_reference_graph, ConfigurationResourceError
from custom_components.velair import api, storage
from custom_components.velair.models import normalize_schedule_data
from . import test_library_api as library


class FullTemplateLinksTest(unittest.IsolatedAsyncioTestCase):
    setUp = allocation.TemplateAutoAssignmentTest.setUp
    save = allocation.TemplateAutoAssignmentTest.save
    link = allocation.TemplateAutoAssignmentTest.link
    profile = allocation.TemplateAutoAssignmentTest.profile

    def full(self):
        self.data["templates"][0]["blocks"][0] = {"start": "07:00", "slot_id": "morning", "preset_key": "usual"}
        self.data["zones"]["climate.salon"]["template_links"]["tuesday"] = {"mode": "full", "template_key": "workday"}

    async def test_full_resolves_preset_and_clone_retains_link(self):
        self.full()
        zone = self.data["zones"]["climate.salon"]
        self.assertEqual(materialize_day(self.data, zone, "tuesday")[0]["temperature"], 20)
        raw = materialize_day(self.data, zone, "tuesday", resolve_presets=False)
        self.assertEqual(raw[0], {"start": "07:00", "preset_key": "usual"})
        await self.scheduler.async_copy_day_schedule("climate.salon", "tuesday", ["wednesday"], expected_revision=0)
        self.assertEqual(zone["schedule"]["wednesday"], [])
        self.assertEqual(zone["template_links"]["wednesday"], zone["template_links"]["tuesday"])

    async def test_legacy_hours_explicit_full_rejects_local_bindings(self):
        self.assertEqual(normalize_links({"tuesday": self.link("usual")})["tuesday"]["mode"], "hours")
        for link in ({"mode": "full", "template_key": "workday", "bindings": {}}, {"mode": "unknown", "template_key": "workday"}):
            with self.assertRaises(ValueError):
                normalize_links({"tuesday": link})

    async def test_mixed_full_hours_changes_only_full_climate_assignments(self):
        self.full()
        blocks = deepcopy(self.data["templates"][0]["blocks"])
        blocks[0] = {"start": "08:00", "slot_id": "morning", "preset_key": "summer"}
        preview = self.scheduler.preview_schedule_template_update("Workday", blocks, "workday", expected_revision=0)
        self.assertEqual(preview["resolved_template_blocks"][0]["temperature"], 25)
        self.assertTrue(any(change["kind"] == "configuration" for change in preview["changes"]))
        await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=0)
        resources = self.scheduler.get_configuration_resources()
        self.assertEqual(resources["resolved_default_schedules"]["climate.salon"]["tuesday"][0]["temperature"], 25)
        self.assertEqual(resources["resolved_profile_schedules"]["winter"]["climate.salon"]["tuesday"][0]["temperature"], 21)
        self.assertEqual(resources["resolved_block_metadata"]["default"]["climate.salon"]["tuesday"][0]["template_link_mode"], "full")

    async def test_new_invalid_full_slot_has_no_donor_and_prevents_atomic_save(self):
        self.full()
        blocks = deepcopy(self.data["templates"][0]["blocks"]) + [{"slot_id": "new", "start": "12:00", "action": "set_temperature", "temperature": 99}]
        original = deepcopy(self.data)
        preview = self.scheduler.preview_schedule_template_update("Workday", blocks, "workday", expected_revision=0)
        self.assertFalse(any(p["slot_id"] == "new" and p["destination"]["source"] == "default" for p in preview["proposals"]))
        self.assertTrue(any(e["destination"]["source"] == "default" for e in preview["destination_errors"]))
        with self.assertRaises(ValueError):
            await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=0)
        self.assertEqual(self.data, original)

    async def test_template_direct_and_full_indirect_usages_are_distinct(self):
        self.full()
        usages = resource_usages(self.data)["presets"]["usual"]
        self.assertEqual(sum(use["source"] == "template" for use in usages), 1)
        self.assertEqual(sum(use.get("indirect", False) for use in usages), 1)
        with self.assertRaises(ConfigurationResourceError):
            await self.scheduler.async_delete_block_preset("usual", expected_revision=0)
        self.data["zones"]["climate.salon"]["template_links"] = {}
        self.assertEqual(resource_usages(self.data)["presets"]["usual"], [{"source": "template", "template_key": "workday", "slot_id": "morning", "start": "07:00"}])

    async def test_invalid_unused_template_reference_blocks_graph_and_load_preserves(self):
        self.full()
        self.data["zones"]["climate.salon"]["template_links"] = {}
        self.data["profiles"] = []
        self.data["templates"][0]["blocks"][0]["preset_key"] = "missing"
        with self.assertRaises(ConfigurationResourceError):
            validate_reference_graph(self.data)
        loaded = normalize_schedule_data(self.data, ["climate.salon"])
        retained = next(template for template in loaded["templates"] if template["key"] == "workday")
        self.assertEqual(retained["blocks"][0]["preset_key"], "missing")
        self.assertIsNone(self.scheduler.get_configuration_resources()["resolved_template_blocks"]["workday"])

    async def test_preset_edit_revalidates_inactive_full_profile(self):
        self.full()
        self.data["profiles"][0]["zones"]["climate.salon"]["template_links"]["tuesday"] = {"mode": "full", "template_key": "workday"}
        original = deepcopy(self.data)
        with self.assertRaises(ValueError):
            await self.scheduler.async_set_block_preset("Usual", {"action": "set_temperature", "temperature": 99}, "usual", expected_revision=0)
        self.assertEqual(self.data, original)

    async def test_portable_closure_and_roundtrip_include_presets_from_full_template(self):
        self.full()
        runtime = library.LibrarySchemaTest().portable_runtime(self.data)
        payload = api._build_export_payload(runtime, ["zones"])
        self.assertEqual(payload["model_version"], 18)
        self.assertEqual(set(payload["sections"]), {"zones", "templates", "block_presets"})
        imported = api._build_import_data(runtime, payload, ["zones"])
        self.assertEqual(imported["zones"]["climate.salon"]["template_links"]["tuesday"], {"mode": "full", "template_key": "workday"})
        self.assertEqual(imported["templates"][0]["blocks"][0]["preset_key"], "usual")
        converted = storage.convert_portable_temperature_data(payload["sections"], "°C", "°F", None)
        self.assertEqual(converted["block_presets"][0]["config"]["temperature"], 68)
        self.assertEqual(converted["templates"][0]["blocks"][0]["preset_key"], "usual")

    async def test_full_destination_manual_assignments_rejected(self):
        self.full()
        blocks = deepcopy(self.data["templates"][0]["blocks"]) + [{"slot_id": "new", "start": "12:00", "action": "turn_off"}]
        assignment = {"source": "default", "entity_id": "climate.salon", "weekday": "tuesday", "bindings": {"new": {"action": "turn_off"}}}
        with self.assertRaises(ValueError):
            self.scheduler.preview_schedule_template_update("Workday", blocks, "workday", assignments=[assignment])

    def materialization_fixture(self, mode):
        self.full()
        self.data["profiles"] = []
        self.climate.steps["climate.salon"] = 0.5
        self.climate.temperature_range_support["climate.salon"] = True
        self.climate.hvac_modes["climate.salon"] = ["off", "heat", "cool", "heat_cool"]
        self.climate.climate_options["climate.salon"] = {"fan_mode": ["auto"]}
        self.data["block_presets"][0]["config"]["temperature"] = 20.3
        slots = [
            {"slot_id": "manual", "start": "07:00", "action": "set_temperature", "temperature": 18.3, "hvac_mode": "heat", "fan_mode": "unsupported"},
            {"slot_id": "range", "start": "12:00", "action": "set_temperature", "target_temp_low": 19.3, "target_temp_high": 24.3, "hvac_mode": "heat_cool"},
            {"slot_id": "reference", "start": "18:00", "preset_key": "usual"},
        ]
        self.data["templates"][0]["blocks"] = slots
        link = {"mode": mode, "template_key": "workday"}
        if mode == "hours":
            link["bindings"] = {slot["slot_id"]: {key: value for key, value in slot.items() if key not in ("start", "slot_id")} for slot in slots}
        self.data["zones"]["climate.salon"]["template_links"]["tuesday"] = link
        return link

    async def assert_materialized_preview_and_copy(self, mode):
        link = self.materialization_fixture(mode)
        original = deepcopy(self.data)
        preview = self.scheduler.preview_daily_schedule("climate.salon", "tuesday", template_link=link)
        materialized = preview["materialized_blocks"]
        self.assertEqual(materialized[0], {"start": "07:00", "action": "set_temperature", "temperature": 18.5, "hvac_mode": "heat"})
        self.assertEqual(materialized[1], {"start": "12:00", "action": "set_temperature", "target_temp_low": 19.5, "target_temp_high": 24.5, "hvac_mode": "heat_cool"})
        self.assertEqual(materialized[2], {"start": "18:00", "preset_key": "usual"})
        self.assertEqual(preview["blocks"][2]["temperature"], 20.5)
        self.assertEqual(self.data, original)
        await self.scheduler.async_copy_day_schedule("climate.salon", "tuesday", ["wednesday"], expected_revision=0)
        self.assertEqual(self.data["zones"]["climate.salon"]["schedule"]["wednesday"], [])
        self.assertEqual(self.data["templates"], original["templates"])
        self.assertEqual(self.data["block_presets"], original["block_presets"])
        self.assertEqual(self.data["zones"]["climate.salon"]["template_links"]["wednesday"], link)

    async def test_full_materialization_adapts_manual_values_and_retains_presets(self):
        await self.assert_materialized_preview_and_copy("full")

    async def test_hours_materialization_adapts_manual_values_and_retains_presets(self):
        await self.assert_materialized_preview_and_copy("hours")

    async def test_profile_materialization_uses_its_week_instead_of_invalid_default_week(self):
        from types import SimpleNamespace
        from unittest.mock import Mock
        from custom_components.velair.execution import ExecutionAuthority
        link = self.materialization_fixture("full")
        profile = self.profile("winter")
        profile["zones"]["climate.salon"]["template_links"]["tuesday"] = link
        self.data["zones"]["climate.salon"]["template_links"] = {}
        self.data["zones"]["climate.salon"]["schedule"]["tuesday"] = [{"start": f"{hour:02d}:00", "action": "set_temperature", "temperature": 20} for hour in range(9)]
        self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "test"}
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        def check(_entity, week):
            if len(week["tuesday"]) > 3:
                raise ValueError("Too many Default switchpoints")
        self.scheduler._external_execution = SimpleNamespace(ensure_schedule_supported=check)
        original = deepcopy(self.data)
        preview = self.scheduler.preview_profile(profile)
        self.assertEqual(preview["materialized_schedules"]["climate.salon"]["tuesday"][0]["temperature"], 18.5)
        self.assertEqual(preview["materialized_schedules"]["climate.salon"]["tuesday"][2], {"start": "18:00", "preset_key": "usual"})
        self.assertEqual(self.data, original)
