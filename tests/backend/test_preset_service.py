"""Automation preset updates through the real service and scheduler boundary."""
import asyncio
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock

from . import test_linked_schedule_acceptance as acceptance
from .test_services import _ServiceRegistry
from .helpers import NOW
from custom_components.velair.const import DOMAIN, SERVICE_UPDATE_BLOCK_PRESET
from custom_components.velair.execution import ExecutionAuthority
from custom_components.velair.schedule_resources import updated_preset_config
from custom_components.velair.services import (
    UPDATE_BLOCK_PRESET_SCHEMA, async_setup_services, async_unload_services,
)


class PresetUpdateConfigTest(unittest.TestCase):
    def test_patch_preserves_omitted_fields_without_mutating_source(self):
        current = {"action": "set_temperature", "temperature": 21, "hvac_mode": "heat", "fan_mode": "quiet"}
        result = updated_preset_config(current, {"temperature": 20})
        self.assertEqual(result, {**current, "temperature": 20})
        self.assertEqual(current["temperature"], 21)

    def test_scalar_range_switches_are_exclusive(self):
        ranged = updated_preset_config({"action": "set_temperature", "temperature": 21}, {"target_temp_low": 19, "target_temp_high": 24})
        self.assertNotIn("temperature", ranged)
        self.assertEqual(updated_preset_config(ranged, {"temperature": 20}), {"action": "set_temperature", "temperature": 20})

    def test_replace_supports_each_action_and_removes_old_settings(self):
        for fields in ({"action": "turn_off"}, {"action": "set_hvac_mode", "hvac_mode": "cool"}, {"action": "set_climate_options", "fan_mode": "quiet"}, {"action": "set_temperature", "temperature": 24, "hvac_mode": "cool"}):
            with self.subTest(fields=fields):
                self.assertEqual(updated_preset_config({"action": "set_temperature", "temperature": 20, "preset_mode": "home"}, fields, operation="replace"), fields)

    def test_clear_preserves_other_settings_and_rejects_empty_action(self):
        current = {"action": "set_climate_options", "fan_mode": "quiet", "humidity": 50}
        self.assertEqual(updated_preset_config(current, {}, clear_fields=["fan_mode"]), {"action": "set_climate_options", "humidity": 50})
        with self.assertRaises(ValueError):
            updated_preset_config(current, {}, clear_fields=["fan_mode", "humidity"])

    def test_humidity_bounds_apply_to_updates_and_replacements_of_all_actions(self):
        for action, other in (("set_temperature", {"temperature": 21}), ("set_climate_options", {"fan_mode": "quiet"})):
            for humidity in (-1, 101):
                for operation in ("update", "replace"):
                    with self.subTest(action=action, humidity=humidity, operation=operation), self.assertRaises(ValueError):
                        fields = {"humidity": humidity}
                        if operation == "replace":
                            fields.update(action=action, **other)
                        updated_preset_config({"action": action, **other}, fields, operation=operation)

    def test_schema_rejects_ambiguous_empty_and_nonfinite_payloads(self):
        invalid = [
            {"preset_key": ""}, {"temperature": None}, {"temperature": ""}, {"temperature": True},
            {"temperature": float("nan")}, {"humidity": float("inf")}, {"fan_mode": " "},
            {"humidity": -1}, {"humidity": 101},
            {"temperature": 20, "clear_fields": ["temperature"]}, {"clear_fields": ["action"]},
            {"clear_fields": ["fan_mode", "fan_mode"]}, {"target_temp_low": 20},
            {"temperature": 20, "target_temp_low": 19, "target_temp_high": 24},
            {"action": "turn_off"}, {"operation": "replace"},
            {"unknown": "value"}, {"name": "Renamed"}, {"start": "07:00"},
            {"operation": "replace", "action": "turn_off", "clear_fields": []},
        ]
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                UPDATE_BLOCK_PRESET_SCHEMA({"preset_key": "usual", **payload})


class PresetServiceRuntimeTest(unittest.IsolatedAsyncioTestCase):
    setUp = acceptance.LinkedScheduleAcceptanceTest.setUp
    save = acceptance.LinkedScheduleAcceptanceTest.save
    link = acceptance.LinkedScheduleAcceptanceTest.link
    profile = acceptance.LinkedScheduleAcceptanceTest.profile
    resolved = acceptance.LinkedScheduleAcceptanceTest.resolved

    async def invoke(self, **payload):
        registry = _ServiceRegistry()
        hass = SimpleNamespace(services=registry, data={DOMAIN: {"entry": {
            "scheduler": self.scheduler, "storage": SimpleNamespace(temperature_migration_required=False),
        }}})
        await async_setup_services(hass)
        handler, schema = registry.handlers[(DOMAIN, SERVICE_UPDATE_BLOCK_PRESET)]
        await handler(SimpleNamespace(data=schema({"preset_key": "usual", **payload})))
        return hass

    async def test_service_applies_active_temperature_and_preserves_library_order(self):
        before = [(item["key"], item["name"]) for item in self.data["block_presets"]]
        hass = await self.invoke(temperature=19)
        self.assertIn(("set_temperature", "climate.salon", 19, True, "heat"), self.climate.calls)
        self.assertEqual([(item["key"], item["name"]) for item in self.data["block_presets"]], before)
        self.assertEqual(self.saves, 1)
        self.assertEqual(self.data["configuration_revision"], 1)
        await async_unload_services(hass)
        self.assertIn((DOMAIN, SERVICE_UPDATE_BLOCK_PRESET), hass.services.removed)

    async def test_noop_does_not_persist_revise_or_deliver(self):
        await self.invoke(temperature=20)
        await self.invoke()
        self.assertEqual(self.saves, 0)
        self.assertEqual(self.data["configuration_revision"], 0)
        self.assertEqual(self.climate.calls, [])

    async def test_unknown_key_and_invalid_target_reject_atomically(self):
        before = deepcopy(self.data)
        for payload in ({"preset_key": "missing", "temperature": 20}, {"temperature": 99}):
            with self.subTest(payload=payload), self.assertRaises((RuntimeError, ValueError)):
                await self.invoke(**payload)
            self.assertEqual(self.data, before)
        self.assertEqual(self.saves, 0)
        self.assertEqual(self.climate.calls, [])

    async def test_hidden_default_and_inactive_profile_are_updated_without_orders(self):
        self.data["global_"]["active_profile_ids"] = ["summer"]
        await self.invoke(temperature=19)
        await self.invoke(preset_key="winter", temperature=22)
        self.assertEqual([day[0]["temperature"] for day in self.resolved()], [19, 22, 25])
        self.assertEqual(self.climate.calls, [])

    async def test_profile_normal_inherits_updated_default(self):
        profile = self.profile("inherit")
        profile["zones"]["climate.salon"] = {"behavior": "normal"}
        await self.scheduler.async_set_profile(profile)
        await self.scheduler.async_activate_profile("inherit")
        self.climate.calls.clear()
        await self.invoke(temperature=19)
        self.assertIn(("set_temperature", "climate.salon", 19, True, "heat"), self.climate.calls)

    async def test_manual_global_pause_and_stop_prevent_delivery(self):
        for authority in ("manual", "paused", "stopped"):
            with self.subTest(authority=authority):
                self.setUp()
                if authority == "manual":
                    self.climate.snapshots["climate.salon"] = {"hvac_mode": "heat", "temperature": 20}
                    await self.scheduler.async_enter_manual_adjustment("climate.salon")
                elif authority == "paused":
                    await self.scheduler.async_set_mode("paused")
                else:
                    await self.scheduler.async_stop()
                self.climate.calls.clear()
                await self.invoke(temperature=19)
                self.assertEqual(self.data["block_presets"][0]["config"]["temperature"], 19)
                self.assertEqual(self.climate.calls, [])

    async def test_fahrenheit_targets_are_stored_and_applied_without_conversion(self):
        self.climate.limits["climate.salon"] = (41, 95)
        for preset in self.data["block_presets"]:
            preset["config"]["temperature"] = 68
        self.data["temperature_unit"] = "°F"
        await self.invoke(temperature=70)
        self.assertEqual(self.data["block_presets"][0]["config"]["temperature"], 70)
        self.assertIn(("set_temperature", "climate.salon", 70, True, "heat"), self.climate.calls)

    async def test_mode_only_delivers_no_temperature(self):
        await self.invoke(operation="replace", action="set_hvac_mode", hvac_mode="cool")
        self.assertEqual(self.climate.calls, [("set_hvac_mode", "climate.salon", "cool")])

    async def test_full_template_references_receive_transitive_update(self):
        self.data["templates"][0]["blocks"][0] = {"slot_id": "morning", "start": "07:00", "preset_key": "usual"}
        self.data["zones"]["climate.salon"]["template_links"]["tuesday"] = {"mode": "full", "template_key": "workday"}
        await self.invoke(temperature=19)
        self.assertEqual(self.resolved()[0][0]["temperature"], 19)
        self.assertEqual(self.data["templates"][0]["blocks"][0]["preset_key"], "usual")

    async def test_replacement_off_is_applied_without_stale_target(self):
        await self.invoke(operation="replace", action="turn_off")
        self.assertEqual(self.data["block_presets"][0]["config"], {"action": "turn_off"})
        self.assertIn(("turn_off", "climate.salon"), self.climate.calls)

    async def test_concurrent_partial_updates_merge_the_latest_snapshot(self):
        await asyncio.gather(self.scheduler.async_update_block_preset("usual", {"temperature": 19}), self.scheduler.async_update_block_preset("usual", {"hvac_mode": "cool"}))
        self.assertEqual(self.data["block_presets"][0]["config"], {"action": "set_temperature", "temperature": 19, "hvac_mode": "cool"})
        self.assertEqual(self.saves, 2)

    async def test_open_editor_revision_conflicts_after_automation(self):
        await self.invoke(temperature=19)
        with self.assertRaises(ValueError):
            await self.scheduler.async_set_block_preset("Usual", {"temperature": 22}, "usual", expected_revision=0)
        self.assertEqual(self.data["block_presets"][0]["config"]["temperature"], 19)

    async def test_storage_failure_restores_previous_snapshot(self):
        before = deepcopy(self.data)
        self.fail_save = True
        with self.assertRaises(RuntimeError):
            await self.invoke(temperature=19)
        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, [])

    async def test_boost_and_window_pauses_remain_owned(self):
        self.climate.snapshots["climate.salon"] = {"hvac_mode": "heat", "temperature": 20}
        await self.scheduler.async_set_zone_boost("climate.salon", 24, "2026-05-19T20:00:00+00:00", hvac_mode="heat")
        await self.scheduler.async_pause_zone("climate.salon", pause_id="window")
        zone = self.data["zones"]["climate.salon"]
        override, pauses = deepcopy(zone["override"]), deepcopy(zone["pauses"])
        self.climate.calls.clear()
        await self.invoke(temperature=19)
        self.assertEqual(zone["override"], override)
        self.assertEqual(zone["pauses"], pauses)
        self.assertEqual(self.climate.calls, [])

    async def test_migration_blocks_even_noop_before_returning(self):
        self.scheduler.set_temperature_migration_blocked(True)
        with self.assertRaises(ValueError):
            await self.scheduler.async_update_block_preset("usual", {"temperature": 20})
        self.assertEqual(self.saves, 0)

    async def test_native_range_and_options_only_delivery(self):
        self.climate.temperature_range_support["climate.salon"] = True
        self.climate.hvac_modes["climate.salon"] = ["off", "heat", "cool", "heat_cool"]
        await self.invoke(operation="replace", action="set_temperature", hvac_mode="heat_cool", target_temp_low=19, target_temp_high=24)
        self.assertIn(("set_temperature_range", "climate.salon", 19, 24, True, "heat_cool"), self.climate.calls)
        self.climate.climate_options["climate.salon"] = {"fan_mode": ["quiet"]}
        self.climate.async_apply_climate_options = AsyncMock()
        self.climate.calls.clear()
        await self.invoke(operation="replace", action="set_climate_options", fan_mode="quiet")
        self.climate.async_apply_climate_options.assert_awaited_once()
        self.assertEqual(self.climate.async_apply_climate_options.await_args.kwargs["fan_mode"], "quiet")
        self.assertEqual(self.climate.calls, [])

    async def test_inactive_destination_incompatibility_reports_its_profile(self):
        self.data["global_"]["active_profile_ids"] = ["summer"]
        self.climate.hvac_modes["climate.salon"] = ["off", "heat", "cool"]
        before = deepcopy(self.data)
        with self.assertRaisesRegex(RuntimeError, "Profile winter: climate.salon"):
            await self.invoke(preset_key="winter", hvac_mode="dry")
        self.assertEqual(self.data, before)
        self.assertEqual(self.saves, 0)

    async def test_external_publication_and_failure_never_deliver_locally(self):
        self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "test"}
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        provider = SimpleNamespace(ensure_schedule_supported=Mock(), async_schedule_saved=AsyncMock())
        self.scheduler._external_execution = provider
        await self.invoke(temperature=19)
        provider.async_schedule_saved.assert_awaited_once()
        published = provider.async_schedule_saved.await_args.args[1]
        self.assertEqual(published["tuesday"][0]["temperature"], 19)
        provider.async_schedule_saved.side_effect = RuntimeError("provider unavailable")
        with self.assertLogs("custom_components.velair.scheduler", level="ERROR"):
            await self.invoke(temperature=18)
        self.assertEqual(self.data["block_presets"][0]["config"]["temperature"], 18)
        self.assertEqual(self.climate.calls, [])

    async def test_external_restriction_rejects_before_save(self):
        self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "test"}
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        self.scheduler._external_execution = SimpleNamespace(ensure_schedule_supported=Mock(side_effect=ValueError("provider does not support this schedule")), async_schedule_saved=AsyncMock())
        before = deepcopy(self.data)
        with self.assertRaisesRegex(RuntimeError, "Default: climate.salon"):
            await self.invoke(temperature=19)
        self.assertEqual(self.data, before)
        self.assertEqual(self.saves, 0)
        self.assertEqual(self.climate.calls, [])

    async def test_future_heating_and_cooling_plans_are_recalculated(self):
        for mode, current, old, new in (("heat", 18, 20, 21), ("cool", 28, 26, 25), ("heat", 18, 21, 20), ("cool", 28, 25, 26)):
            with self.subTest(mode=mode):
                self.setUp()
                zone = self.data["zones"]["climate.salon"]
                zone["template_links"] = {}
                zone["schedule"]["tuesday"] = [{"start": "00:00", "action": "turn_off"}, {"start": "20:00", "preset_key": "usual"}]
                zone["preconditioning"] = {"enabled": True, "max_lead_minutes": 180, "minimum_delta_temperature": 0.3, "fallback_minutes_per_degree": 20}
                self.data["block_presets"][0]["config"].update(temperature=old, hvac_mode=mode)
                self.scheduler._hass.states["climate.salon"] = SimpleNamespace(state=mode, attributes={"current_temperature": current})
                self.scheduler.async_schedule_next_event()
                before = self.scheduler.calculate_next_event(NOW)
                self.assertIsNotNone(before.target_when)
                await self.invoke(temperature=new)
                after = self.scheduler.calculate_next_event(NOW)
                self.assertEqual(after.temperature, new)
                if abs(new - current) > abs(old - current):
                    self.assertLess(after.when, before.when)
                else:
                    self.assertGreater(after.when, before.when)
                self.assertEqual(after.target_when, before.target_when)
                self.assertEqual(self.climate.calls, [])

    async def test_active_preconditioning_is_replaced_and_off_discards_session(self):
        for mode, current, old, new in (("heat", 18, 21, 22), ("cool", 28, 25, 24)):
            with self.subTest(mode=mode):
                self.setUp()
                zone = self.data["zones"]["climate.salon"]
                zone["template_links"] = {}
                zone["schedule"]["tuesday"] = [{"start": "00:00", "action": "turn_off"}, {"start": "19:00", "preset_key": "usual"}]
                zone["preconditioning"] = {"enabled": True, "max_lead_minutes": 180, "minimum_delta_temperature": 0.3, "fallback_minutes_per_degree": 20}
                self.data["block_presets"][0]["config"].update(temperature=old, hvac_mode=mode)
                self.scheduler._hass.states["climate.salon"] = SimpleNamespace(state=mode, attributes={"current_temperature": current})
                await self.scheduler._handle_timer(NOW)
                previous = self.scheduler._preconditioning_sessions["climate.salon"]
                self.climate.calls.clear()
                await self.invoke(temperature=new)
                session = self.scheduler._preconditioning_sessions["climate.salon"]
                self.assertIsNot(session, previous)
                self.assertEqual(session.target_temperature, new)
                self.assertEqual(session.direction, mode)
                self.assertIn(("set_temperature", "climate.salon", new, True, mode), self.climate.calls)
                await self.invoke(operation="replace", action="turn_off")
                self.assertNotIn("climate.salon", self.scheduler._preconditioning_sessions)
                self.assertIn(("turn_off", "climate.salon"), self.climate.calls)

    async def test_room_assist_reconciles_the_updated_preset_target(self):
        zone = self.data["zones"]["climate.salon"]
        self.climate.steps["climate.salon"] = 0.5
        self.scheduler._hass.states["climate.salon"] = SimpleNamespace(state="heat", attributes={"current_temperature": 17.1, "temperature": 20})
        self.scheduler._hass.states["sensor.room"] = SimpleNamespace(state="19", attributes={"unit_of_measurement": "°C"})
        zone["preconditioning"] = {"enabled": False, "room_temperature_entity_id": "sensor.room", "room_sensor_assist_enabled": True, "room_sensor_assist_max_delta": 2}
        await self.scheduler.async_apply_current_schedule()
        previous = self.scheduler._room_sensor_assist_states["climate.salon"]
        self.climate.calls.clear()
        await self.invoke(temperature=22)
        state = self.scheduler._room_sensor_assist_states["climate.salon"]
        self.assertIsNot(state, previous)
        self.assertEqual(state.target_temperature, 22)
        self.assertIn(("set_temperature", "climate.salon", 22, True, "heat"), self.climate.calls)

