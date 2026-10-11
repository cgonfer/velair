"""Automatic linked-slot settings and atomic template updates."""
from copy import deepcopy
import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

from . import test_linked_schedule_acceptance as acceptance
from custom_components.velair.execution import ExecutionAuthority
from custom_components.velair.models import DEFAULT_SCHEDULE_TEMPLATES_VERSION, normalize_schedule_data
from custom_components.velair.schedule_resources import ConfigurationResourceError


class TemplateAutoAssignmentTest(unittest.IsolatedAsyncioTestCase):
    setUp = acceptance.LinkedScheduleAcceptanceTest.setUp
    save = acceptance.LinkedScheduleAcceptanceTest.save
    link = acceptance.LinkedScheduleAcceptanceTest.link
    profile = acceptance.LinkedScheduleAcceptanceTest.profile
    resolved = acceptance.LinkedScheduleAcceptanceTest.resolved

    def draft(self, temperature=22, start="12:00"):
        return deepcopy(self.data["templates"][0]["blocks"]) + [{"slot_id": "new", "start": start, "action": "set_temperature", "temperature": temperature}]

    def preview(self, blocks, **kwargs):
        return self.scheduler.preview_schedule_template_update("Workday", blocks, "workday", expected_revision=0, **kwargs)

    async def test_linked_template_order_survives_preview_save_and_reload(self):
        self.data["templates_seeded_version"] = DEFAULT_SCHEDULE_TEMPLATES_VERSION
        self.data["templates"].insert(0, {"key": "first", "name": "First", "blocks": []})
        self.data["templates"].append({"key": "last", "name": "Last", "blocks": []})
        expected = ["first", "workday", "last"]
        blocks = deepcopy(self.data["templates"][1]["blocks"])
        blocks[0]["start"] = "08:00"
        candidate, _ = self.scheduler._schedule_template_update_candidate(
            "Updated", blocks, "workday", expected_revision=0)
        self.assertEqual([item["key"] for item in candidate["templates"]], expected)
        self.assertEqual(self.data["templates"][1]["blocks"][0]["start"], "07:00")
        await self.scheduler.async_set_schedule_template("Updated", blocks, "workday", expected_revision=0)
        self.assertEqual([item["key"] for item in self.data["templates"]], expected)
        reloaded = normalize_schedule_data(deepcopy(self.data), ["climate.salon"])
        self.assertEqual([item["key"] for item in reloaded["templates"]], expected)
        self.assertEqual(reloaded["templates"][1]["blocks"][0]["start"], "08:00")
        self.assertEqual([day[0]["start"] for day in self.resolved()], ["08:00"] * 3)

    def test_loading_keeps_preset_and_damaged_template_positions_for_repair(self):
        self.data["templates_seeded_version"] = DEFAULT_SCHEDULE_TEMPLATES_VERSION
        preset = {"key": "preset", "name": "Preset", "blocks": [
            {"slot_id": "p", "start": "09:00", "preset_key": "usual"}]}
        damaged = {"key": "broken", "name": "Broken", "blocks": [
            {"slot_id": "bad", "start": "not-a-time", "action": "turn_off"}]}
        self.data["zones"]["climate.salon"]["template_links"]["wednesday"] = {
            "mode": "full", "template_key": "broken"}
        self.data["templates"] = [preset, {"key": "plain", "name": "Plain", "blocks": []},
                                  self.data["templates"][0], damaged]
        reloaded = normalize_schedule_data(deepcopy(self.data), ["climate.salon"])
        self.assertEqual([item["key"] for item in reloaded["templates"]],
                         ["preset", "plain", "workday", "broken"])
        self.assertEqual(reloaded["templates"][0]["blocks"][0]["preset_key"], "usual")
        self.assertEqual(reloaded["templates"][3], damaged)

    async def test_template_copy_is_independent_and_covers_inactive_destinations(self):
        blocks = self.draft()
        preview = self.preview(blocks)
        self.assertEqual([p["origin"] for p in preview["proposals"]], ["template"] * 3)
        self.assertEqual(preview["pending"], [])
        self.assertEqual(self.data["templates"][0]["blocks"][-1]["slot_id"], "night")
        await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=0)
        self.assertEqual([day[1]["temperature"] for day in self.resolved()], [22] * 3)
        self.assertEqual(self.saves, 1)

    async def test_previous_fallback_preserves_each_destinations_preset(self):
        preview = self.preview(self.draft(99))
        self.assertEqual([p["origin"] for p in preview["proposals"]], ["saved_previous"] * 3)
        self.assertEqual([p["binding"] for p in preview["proposals"]], [{"preset_key": key} for key in ("usual", "winter", "summer")])
        self.assertEqual([p["donor_start"] for p in preview["proposals"]], ["07:00"] * 3)

    async def test_exact_removed_donor_and_moved_donor_use_saved_times(self):
        blocks = self.draft(99, "07:00")
        blocks.pop(0)
        blocks[0]["start"] = "20:00"
        preview = self.preview(blocks)
        self.assertEqual([p["origin"] for p in preview["proposals"]], ["saved_match"] * 3)
        self.assertEqual([p["donor_slot_id"] for p in preview["proposals"]], ["morning"] * 3)
        self.assertEqual({change["kind"] for change in preview["changes"]}, {"removed", "moved", "added"})

    async def test_invalid_previous_skipped_then_next_and_new_slots_never_donors(self):
        for preset in self.data["block_presets"]:
            preset["config"]["temperature"] = 99
        blocks = self.draft(99)
        blocks.pop(0)
        blocks.append({"slot_id": "another", "start": "13:00", "action": "set_temperature", "temperature": 99})
        preview = self.preview(blocks)
        self.assertEqual(len(preview["proposals"]), 6)
        self.assertTrue(all(p["origin"] == "saved_next" and p["donor_slot_id"] == "night" for p in preview["proposals"]))
        self.assertEqual(preview["destination_errors"], [])

    async def test_previous_order_skips_nearest_invalid(self):
        self.data["templates"][0]["blocks"].insert(1, {"slot_id": "invalid", "start": "11:00", "action": "turn_off"})
        for zone in [self.data["zones"]["climate.salon"]] + [profile["zones"]["climate.salon"] for profile in self.data["profiles"]]:
            zone["template_links"]["tuesday"]["bindings"]["invalid"] = {"preset_key": "missing"}
        blocks = [block for block in self.draft(99) if block["slot_id"] != "invalid"]
        preview = self.preview(blocks)
        self.assertTrue(all(p["donor_slot_id"] == "morning" for p in preview["proposals"]))

    async def test_no_valid_donor_pending_and_atomic_rejection(self):
        for zone in [self.data["zones"]["climate.salon"]] + [profile["zones"]["climate.salon"] for profile in self.data["profiles"]]:
            zone["template_links"]["tuesday"]["bindings"] = {"morning": {"preset_key": "missing"}, "night": {"preset_key": "missing"}}
        blocks = [self.draft(99)[-1]]
        original = deepcopy(self.data)
        self.assertEqual(len(self.preview(blocks)["pending"]), 3)
        with self.assertRaises(ConfigurationResourceError):
            await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=0)
        self.assertEqual(self.data, original)
        self.assertEqual(self.saves, 0)

    async def test_manual_invalid_does_not_fallback_and_valid_manual_wins(self):
        assignment = {"source": "default", "entity_id": "climate.salon", "weekday": "tuesday", "bindings": {"new": {"preset_key": "missing"}}}
        preview = self.preview(self.draft(), assignments=[assignment])
        self.assertEqual(len(preview["pending"]), 1)
        self.assertEqual(preview["pending"][0]["destination"]["source"], "default")
        assignment["bindings"]["new"] = {"preset_key": "usual"}
        preview = self.preview(self.draft(), assignments=[assignment])
        self.assertEqual(preview["proposals"][0]["origin"], "manual")
        self.assertEqual(preview["proposals"][0]["binding"], {"preset_key": "usual"})

    async def test_unknown_duplicate_existing_slot_assignments_and_revision_rejected(self):
        valid = {"source": "default", "entity_id": "climate.salon", "weekday": "tuesday", "bindings": {"new": {"action": "turn_off"}}}
        for supplied in ([valid, valid], [{**valid, "weekday": "monday"}], [{**valid, "bindings": {"morning": {"action": "turn_off"}}}]):
            with self.assertRaises(ValueError):
                self.preview(self.draft(), assignments=supplied)
        with self.assertRaises(ConfigurationResourceError) as failure:
            self.scheduler.preview_schedule_template_update("Workday", self.draft(), "workday", expected_revision=99)
        self.assertEqual(failure.exception.code, "revision_conflict")

    async def test_week_provider_error_does_not_change_valid_template_proposal(self):
        self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "test"}
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        self.scheduler._external_execution = SimpleNamespace(ensure_provider_available=Mock(), ensure_block_supported=Mock(), ensure_schedule_supported=Mock(side_effect=ValueError("Too many switchpoints")))
        preview = self.preview(self.draft())
        self.assertEqual([p["origin"] for p in preview["proposals"]], ["template"] * 3)
        self.assertEqual(len(preview["destination_errors"]), 3)
        self.assertEqual(preview["pending"], [])

    async def test_provider_unavailable_is_destination_error_without_donor_search(self):
        self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "test"}
        block_check = Mock()
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        self.scheduler._external_execution = SimpleNamespace(ensure_provider_available=Mock(side_effect=ValueError("Offline")), ensure_block_supported=block_check)
        preview = self.preview(self.draft(99))
        block_check.assert_not_called()
        self.assertEqual(preview["proposals"], [])
        self.assertEqual(preview["pending"], [])
        self.assertTrue(all(err["code"] == "provider_unavailable" for err in preview["destination_errors"]))

    async def test_save_storage_failure_preserves_previous_template_and_bindings(self):
        original = deepcopy(self.data)
        self.fail_save = True
        with self.assertRaises(RuntimeError):
            await self.scheduler.async_set_schedule_template("Workday", self.draft(), "workday", expected_revision=0)
        self.assertEqual(self.data, original)

    async def test_external_block_configuration_failure_uses_saved_donor(self):
        self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "test"}
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        def check(_entity, config):
            if config.get("temperature") == 22:
                raise ValueError("Provider cannot execute this target")
        self.scheduler._external_execution = SimpleNamespace(ensure_provider_available=Mock(), ensure_block_supported=check, ensure_schedule_supported=Mock())
        preview = self.preview(self.draft())
        self.assertEqual([p["origin"] for p in preview["proposals"]], ["saved_previous"] * 3)

    async def test_range_cooling_and_option_adaptation_are_destination_validated(self):
        self.climate.hvac_modes["climate.salon"] = ["off", "heat", "cool", "heat_cool"]
        self.climate.temperature_range_support["climate.salon"] = True
        self.climate.climate_options["climate.salon"] = {"fan_mode": ["auto"]}
        for config in (
            {"action": "set_temperature", "hvac_mode": "cool", "temperature": 24},
            {"action": "set_temperature", "hvac_mode": "heat_cool", "target_temp_low": 19, "target_temp_high": 24},
            {"action": "set_climate_options", "fan_mode": "auto"},
        ):
            blocks = self.draft()
            blocks[-1] = {"slot_id": "new", "start": "12:00", **config}
            preview = self.preview(blocks)
            self.assertEqual(preview["pending"], [])
            self.assertTrue(all(p["origin"] == "template" for p in preview["proposals"]))

    async def test_cancellation_before_storage_retains_old_snapshot(self):
        original = deepcopy(self.data)
        entered = asyncio.Event()
        async def suspended_save():
            entered.set()
            await asyncio.Event().wait()
        self.scheduler._async_save_data = suspended_save
        task = asyncio.create_task(self.scheduler.async_set_schedule_template("Workday", self.draft(), "workday", expected_revision=0))
        await entered.wait()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertEqual(self.data, original)

    async def test_malformed_assignment_destinations_are_rejected_without_mutation(self):
        valid = {"source": "default", "entity_id": "climate.salon", "weekday": "tuesday", "bindings": {"new": {"action": "turn_off"}}}
        original = deepcopy(self.data)
        for item in (None, [], {**valid, "entity_id": []}, {**valid, "profile_key": []}, {**valid, "weekday": []}, {**valid, "source": []}):
            with self.subTest(item=item), self.assertRaises(ValueError):
                self.preview(self.draft(), assignments=[item])
            self.assertEqual(self.data, original)
        self.assertEqual(self.saves, 0)

    def mixed_climates(self):
        self.data["profiles"] = []
        self.data["zones"]["climate.cool"] = deepcopy(self.data["zones"]["climate.salon"])
        self.data["zones"]["climate.cool"]["template_links"]["tuesday"]["bindings"]["morning"] = {"preset_key": "summer"}
        self.climate.hvac_modes["climate.salon"] = ["off", "heat"]
        self.climate.hvac_modes["climate.cool"] = ["off", "cool"]
        blocks = self.draft()
        blocks[-1]["hvac_mode"] = "heat"
        return blocks

    async def test_mixed_heat_cool_destinations_keep_their_own_assignments(self):
        blocks = self.mixed_climates()
        preview = self.preview(blocks)
        by_entity = {proposal["destination"]["entity_id"]: proposal for proposal in preview["proposals"]}
        self.assertEqual(by_entity["climate.salon"]["origin"], "template")
        self.assertEqual(by_entity["climate.salon"]["binding"]["hvac_mode"], "heat")
        self.assertEqual(by_entity["climate.cool"]["origin"], "saved_previous")
        self.assertEqual(by_entity["climate.cool"]["binding"], {"preset_key": "summer"})
        self.assertEqual(preview["destination_errors"], [])
        self.assertEqual(preview["pending"], [])
        await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=0)
        self.assertEqual(self.data["zones"]["climate.cool"]["template_links"]["tuesday"]["bindings"]["new"], {"preset_key": "summer"})
        self.assertEqual(self.saves, 1)

    async def test_one_offline_climate_preserves_other_proposals_and_blocks_commit(self):
        blocks = self.mixed_climates()
        self.data["zones"]["climate.cool"]["execution"] = {"type": "external", "provider": "test"}
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        self.scheduler._external_execution = SimpleNamespace(ensure_provider_available=Mock(side_effect=ValueError("Offline")), ensure_block_supported=Mock())
        original = deepcopy(self.data)
        preview = self.preview(blocks)
        self.assertEqual(len(preview["proposals"]), 1)
        self.assertEqual(preview["proposals"][0]["destination"]["entity_id"], "climate.salon")
        self.assertEqual(preview["pending"], [])
        self.assertEqual(preview["destination_errors"][0]["destination"]["entity_id"], "climate.cool")
        with self.assertRaises(ConfigurationResourceError):
            await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=0)
        self.assertEqual(self.data, original)
        self.assertEqual(self.saves, 0)
