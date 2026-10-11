"""End-to-end acceptance for shared hours across Default and seasonal Profiles."""
from copy import deepcopy
import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from .helpers import FakeClimateManager, FakeHass, VelairScheduler, _scheduler_data_for_zones
from custom_components.velair.models import WEEKDAYS, normalize_schedule_data
from custom_components.velair import api
from custom_components.velair.execution import ExecutionAuthority
from custom_components.velair.schedule_resources import ConfigurationResourceError, resolve_week


class LinkedScheduleAcceptanceTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.data = _scheduler_data_for_zones(["climate.salon"])
        self.data["configuration_revision"] = 0
        self.data["block_presets"] = [
            {"key": "usual", "name": "Usual", "config": {"action": "set_temperature", "hvac_mode": "heat", "temperature": 20}},
            {"key": "winter", "name": "Winter", "config": {"action": "set_temperature", "hvac_mode": "heat", "temperature": 21}},
            {"key": "summer", "name": "Summer", "config": {"action": "set_temperature", "hvac_mode": "cool", "temperature": 25}},
        ]
        self.data["templates"] = [{"key": "workday", "name": "Workday", "blocks": [
            {"slot_id": "morning", "start": "07:00", "action": "turn_off"},
            {"slot_id": "night", "start": "23:00", "action": "turn_off"},
        ]}]
        zone = self.data["zones"]["climate.salon"]
        zone["schedule"] = {day: [] for day in WEEKDAYS}
        zone["template_links"] = {"tuesday": self.link("usual")}
        self.data["profiles"] = [self.profile("winter"), self.profile("summer")]
        self.data["global_"]["active_profile_ids"] = []
        hass = FakeHass()
        hass.states["climate.salon"] = SimpleNamespace(state="heat", attributes={"current_temperature": 20})
        self.climate = FakeClimateManager()
        self.saves = 0
        self.fail_save = False
        self.scheduler = VelairScheduler(hass, self.data, self.climate, self.save)

    async def save(self):
        if self.fail_save:
            raise RuntimeError("storage unavailable")
        self.saves += 1

    def link(self, preset):
        return {"template_key": "workday", "bindings": {"morning": {"preset_key": preset}, "night": {"action": "turn_off"}}}

    def profile(self, key):
        return {"key": key, "name": key.title(), "icon": "mdi:calendar", "color": "#123456", "description": "", "zones": {
            "climate.salon": {"behavior": "schedule", "schedule": {day: [] for day in WEEKDAYS}, "template_links": {"tuesday": self.link(key)}}}}

    def resolved(self):
        resources = self.scheduler.get_configuration_resources()
        return [resources["resolved_default_schedules"]["climate.salon"]["tuesday"]] + [
            resources["resolved_profile_schedules"][key]["climate.salon"]["tuesday"] for key in ("winter", "summer")]

    async def test_shared_time_edit_preserves_three_distinct_configurations(self):
        blocks = deepcopy(self.data["templates"][0]["blocks"])
        blocks[0]["start"] = "07:30"
        blocks[0].update(action="set_temperature", temperature=15, hvac_mode="heat")
        await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=0)
        resolved = self.resolved()
        self.assertEqual([day[0]["start"] for day in resolved], ["07:30"] * 3)
        self.assertEqual([day[0]["temperature"] for day in resolved], [20, 21, 25])
        self.assertEqual([day[0]["hvac_mode"] for day in resolved], ["heat", "heat", "cool"])
        self.assertEqual(self.saves, 1)

    async def test_preset_edit_only_updates_its_uses(self):
        await self.scheduler.async_set_block_preset("Winter", {"action": "set_temperature", "hvac_mode": "heat", "temperature": 22}, "winter", expected_revision=0)
        self.assertEqual([day[0]["temperature"] for day in self.resolved()], [20, 22, 25])
        self.assertEqual(self.data["profiles"][0]["zones"]["climate.salon"]["template_links"]["tuesday"]["bindings"]["morning"], {"preset_key": "winter"})

    async def test_active_preset_change_applies_and_hidden_default_does_not(self):
        await self.scheduler.async_activate_profile("winter")
        self.climate.calls.clear()
        revision = self.data["configuration_revision"]
        await self.scheduler.async_set_block_preset("Winter", {"action": "set_temperature", "hvac_mode": "heat", "temperature": 22}, "winter", expected_revision=revision)
        self.assertIn(("set_temperature", "climate.salon", 22.0, True, "heat"), self.climate.calls)
        self.climate.calls.clear()
        await self.scheduler.async_set_block_preset("Usual", {"action": "set_temperature", "hvac_mode": "heat", "temperature": 19}, "usual", expected_revision=self.data["configuration_revision"])
        self.assertEqual(self.climate.calls, [])
        await self.scheduler.async_activate_profile(None)
        self.assertIn(("set_temperature", "climate.salon", 19.0, True, "heat"), self.climate.calls)

    async def test_profile_normal_behavior_inherits_live_default(self):
        profile = self.profile("inherit")
        profile["zones"]["climate.salon"] = {"behavior": "normal"}
        await self.scheduler.async_set_profile(profile)
        await self.scheduler.async_activate_profile("inherit")
        self.climate.calls.clear()
        await self.scheduler.async_set_block_preset("Usual", {"action": "set_temperature", "hvac_mode": "heat", "temperature": 19}, "usual", expected_revision=self.data["configuration_revision"])
        self.assertIn(("set_temperature", "climate.salon", 19.0, True, "heat"), self.climate.calls)

    async def test_shared_rename_updates_revision_without_device_commands(self):
        await self.scheduler.async_activate_profile("winter")
        self.climate.calls.clear()
        revision = self.data["configuration_revision"]
        await self.scheduler.async_set_block_preset("Winter comfort", self.data["block_presets"][1]["config"], "winter", expected_revision=revision)
        self.assertEqual(self.data["configuration_revision"], revision + 1)
        self.assertEqual(self.climate.calls, [])

    async def test_preset_edit_preserves_boost_until_it_finishes(self):
        self.climate.snapshots["climate.salon"] = {"hvac_mode": "heat", "temperature": 20}
        await self.scheduler.async_set_zone_boost("climate.salon", 24, "2026-05-19T20:00:00+00:00", hvac_mode="heat")
        previous = deepcopy(self.data["zones"]["climate.salon"]["override"])
        self.climate.calls.clear()
        await self.scheduler.async_set_block_preset("Usual", {"action": "set_temperature", "hvac_mode": "heat", "temperature": 19}, "usual", expected_revision=self.data["configuration_revision"])
        self.assertEqual(self.data["zones"]["climate.salon"]["override"], previous)
        self.assertEqual(self.climate.calls, [])
        await self.scheduler.async_cancel_zone_boost("climate.salon")
        self.assertIn(("set_temperature", "climate.salon", 19.0, True, "heat"), self.climate.calls)

    async def test_preset_edit_preserves_independently_owned_window_pauses(self):
        await self.scheduler.async_pause_zone("climate.salon", pause_id="window-left")
        await self.scheduler.async_pause_zone("climate.salon", pause_id="window-right")
        pauses = deepcopy(self.data["zones"]["climate.salon"]["pauses"])
        self.climate.calls.clear()
        await self.scheduler.async_set_block_preset("Usual", {"action": "set_temperature", "hvac_mode": "heat", "temperature": 19}, "usual", expected_revision=self.data["configuration_revision"])
        self.assertEqual(self.data["zones"]["climate.salon"]["pauses"], pauses)
        self.assertEqual(self.climate.calls, [])

    async def test_resolution_reports_origin_and_step_adaptation_without_changing_library(self):
        self.climate.steps["climate.salon"] = 0.5
        await self.scheduler.async_set_block_preset("Usual", {"action": "set_temperature", "hvac_mode": "heat", "temperature": 20.3}, "usual", expected_revision=0)
        resources = self.scheduler.get_configuration_resources()
        metadata = resources["resolved_block_metadata"]["default"]["climate.salon"]["tuesday"][0]
        self.assertEqual(metadata["template_key"], "workday")
        self.assertEqual(metadata["slot_id"], "morning")
        self.assertEqual(metadata["preset_key"], "usual")
        self.assertEqual(metadata["adaptations"]["temperature"], {"requested": 20.3, "effective": 20.5})
        preset = next(item for item in self.data["block_presets"] if item["key"] == "usual")
        self.assertEqual(preset["config"]["temperature"], 20.3)

    async def test_invalid_reference_has_visible_destination_diagnostic(self):
        self.data["zones"]["climate.salon"]["template_links"]["tuesday"]["template_key"] = "missing"
        resources = self.scheduler.get_configuration_resources()
        self.assertIsNone(resources["resolved_default_schedules"]["climate.salon"])
        self.assertEqual(resources["resource_diagnostics"][0]["source"], "default")
        self.assertEqual(resources["resource_diagnostics"][0]["code"], "reference_not_found")
        self.assertIsNotNone(resources["resolved_profile_schedules"]["winter"]["climate.salon"])

    async def test_ambiguous_presets_block_only_their_affected_destination(self):
        duplicate = deepcopy(self.data["block_presets"][0])
        duplicate["config"]["temperature"] = 10
        self.data["block_presets"].append(duplicate)
        resources = self.scheduler.get_configuration_resources()
        self.assertIsNone(resources["resolved_default_schedules"]["climate.salon"])
        self.assertIsNotNone(resources["resolved_profile_schedules"]["winter"]["climate.salon"])
        await self.scheduler.async_apply_current_schedule("climate.salon")
        self.assertEqual(self.climate.calls, [])

    async def test_ambiguous_linked_templates_survive_reload_and_block_execution(self):
        duplicate = deepcopy(self.data["templates"][0])
        duplicate["blocks"][0]["start"] = "08:00"
        self.data["templates"].append(duplicate)
        loaded = normalize_schedule_data(self.data, ["climate.salon"])
        self.assertEqual(sum(item["key"] == "workday" for item in loaded["templates"]), 2)
        with self.assertRaises(ConfigurationResourceError):
            resolve_week(loaded, loaded["zones"]["climate.salon"])

    async def test_resource_preview_respects_unresolved_temperature_unit_gate(self):
        method = Mock()
        runtime = {"storage": SimpleNamespace(temperature_migration_required=True), "scheduler": SimpleNamespace(preview_daily_schedule=method)}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with patch.object(api, "_get_runtime", return_value=runtime):
            await api._configuration_preview(None, connection, {"id": 1}, "preview_daily_schedule", "climate.salon", "tuesday", [])
        method.assert_not_called()
        self.assertEqual(connection.send_error.call_args.args[1], "temperature_migration_required")

    async def test_hidden_default_edit_revalidates_provider_after_waiting_for_zone_lock(self):
        await self.scheduler.async_activate_profile("winter")
        before = deepcopy(self.data)
        authority = ExecutionAuthority(self.data)

        def provider_validate(_entity, week):
            if week["tuesday"] and week["tuesday"][0].get("temperature") == 19:
                raise ValueError("Provider does not support this dormant schedule")

        self.scheduler._execution_authority = authority
        self.scheduler._external_execution = SimpleNamespace(authority=authority, ensure_schedule_supported=provider_validate, async_schedule_saved=AsyncMock())
        async with self.scheduler._zone_override_lock("climate.salon"):
            task = asyncio.create_task(self.scheduler.async_set_block_preset("Usual", {"action": "set_temperature", "hvac_mode": "heat", "temperature": 19}, "usual", expected_revision=self.data["configuration_revision"]))
            await asyncio.sleep(0)
            await asyncio.sleep(0)
            self.assertFalse(task.done())
            self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "test"}
        with self.assertRaisesRegex(ValueError, "dormant schedule"):
            await task
        self.assertEqual(self.data["block_presets"], before["block_presets"])
        self.assertEqual(self.data["configuration_revision"], before["configuration_revision"])

    async def test_external_preset_edit_publishes_concrete_week_and_has_no_local_fallback(self):
        self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "test"}
        authority = ExecutionAuthority(self.data)
        publish = AsyncMock()
        self.scheduler._execution_authority = authority
        self.scheduler._external_execution = SimpleNamespace(authority=authority, ensure_schedule_supported=Mock(), async_schedule_saved=publish)
        await self.scheduler.async_set_block_preset("Usual", {"action": "set_temperature", "hvac_mode": "heat", "temperature": 19}, "usual", expected_revision=0)
        published = publish.call_args.args[1]
        self.assertEqual(published["tuesday"][0]["temperature"], 19)
        self.assertNotIn("preset_key", published["tuesday"][0])
        self.assertEqual(self.climate.calls, [])
        publish.side_effect = RuntimeError("provider unavailable")
        await self.scheduler.async_set_block_preset("Usual", {"action": "set_temperature", "hvac_mode": "heat", "temperature": 18}, "usual", expected_revision=1)
        self.assertEqual(self.resolved()[0][0]["temperature"], 18)
        self.assertEqual(self.climate.calls, [])

    async def test_inactive_linked_profile_edit_revalidates_provider_under_zone_lock(self):
        profile = deepcopy(self.data["profiles"][1])
        profile["zones"]["climate.salon"]["template_links"]["tuesday"]["bindings"]["morning"] = {"action": "set_temperature", "temperature": 19, "hvac_mode": "heat"}
        before = deepcopy(self.data)
        authority = ExecutionAuthority(self.data)

        def provider_validate(_entity, week):
            if week["tuesday"] and week["tuesday"][0].get("temperature") == 19:
                raise ValueError("Provider cannot execute this inactive Profile")

        self.scheduler._execution_authority = authority
        self.scheduler._external_execution = SimpleNamespace(authority=authority, ensure_schedule_supported=provider_validate, async_schedule_saved=AsyncMock())
        async with self.scheduler._zone_override_lock("climate.salon"):
            task = asyncio.create_task(self.scheduler.async_set_profile(profile, expected_revision=0))
            await asyncio.sleep(0)
            await asyncio.sleep(0)
            self.assertFalse(task.done())
            self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "test"}
        with self.assertRaisesRegex(ValueError, "inactive Profile"):
            await task
        self.assertEqual(self.data["profiles"], before["profiles"])
        self.assertEqual(self.data["configuration_revision"], 0)

    async def test_addition_requires_hidden_default_and_inactive_profiles(self):
        blocks = deepcopy(self.data["templates"][0]["blocks"])
        blocks.append({"slot_id": "lunch", "start": "12:00", "action": "turn_off"})
        original = deepcopy(self.data)
        incomplete = [{"source": "default", "entity_id": "climate.salon", "weekday": "tuesday", "bindings": {"lunch": {"action": "turn_off"}}}]
        with self.assertRaises(ValueError):
            await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=0, assignments=incomplete)
        self.assertEqual(self.data, original)
        self.assertEqual(self.saves, 0)
        complete = incomplete + [{"source": "profile", "profile_key": key, "entity_id": "climate.salon", "weekday": "tuesday", "bindings": {"lunch": {"action": "turn_off"}}} for key in ("winter", "summer")]
        await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=0, assignments=complete)
        self.assertEqual([len(day) for day in self.resolved()], [3, 3, 3])
        self.assertEqual(self.saves, 1)

    async def test_revision_conflict_and_storage_failure_leave_graph_unchanged(self):
        original = deepcopy(self.data)
        with self.assertRaises(ConfigurationResourceError):
            await self.scheduler.async_set_block_preset("Winter", {"action": "turn_off"}, "winter", expected_revision=99)
        self.assertEqual(self.data, original)
        self.fail_save = True
        with self.assertRaises(RuntimeError):
            await self.scheduler.async_set_block_preset("Winter", {"action": "turn_off"}, "winter", expected_revision=0)
        self.assertEqual(self.data, original)

    async def test_used_resources_cannot_be_deleted(self):
        with self.assertRaises(ConfigurationResourceError) as failure:
            await self.scheduler.async_delete_schedule_template("workday", expected_revision=0)
        self.assertEqual(failure.exception.code, "resource_in_use")
        with self.assertRaises(ConfigurationResourceError):
            await self.scheduler.async_delete_block_preset("winter", expected_revision=0)
        self.assertEqual(self.saves, 0)

    async def test_clear_default_day_only_removes_its_own_link(self):
        await self.scheduler.async_clear_schedule("climate.salon", "tuesday")
        self.assertNotIn("tuesday", self.data["zones"]["climate.salon"].get("template_links", {}))
        for profile in self.data["profiles"]:
            week = resolve_week(self.data, profile["zones"]["climate.salon"])
            self.assertEqual(len(week["tuesday"]), 2)
        self.assertEqual(len(self.data["templates"][0]["blocks"]), 2)
