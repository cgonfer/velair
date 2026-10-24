"""Persistence, portable units and committed Room Assist demand boundaries."""
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import patch, Mock, AsyncMock

from .helpers import FakeHass, VelairScheduler
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.models import normalize_schedule_data, serialize_schedule_data
from custom_components.velair.scheduler import _RoomSensorAssistState
from custom_components.velair.storage import convert_portable_temperature_data
from custom_components.velair import api


def supply_group():
    return {"id": "boiler", "name": "Boiler", "enabled": True,
            "switch_entity_id": "switch.boiler", "direction": "heat",
            "hysteresis": .3, "minimum_off_seconds": 60, "off_delay_seconds": 20,
            "zones": {"climate.room": {"hysteresis": .5}}, "suspended": False}


class SharedDemandContractTest(unittest.TestCase):
    def test_import_rejects_fractional_timing_without_mutating_payload_or_storage(self):
        data = normalize_schedule_data({}, ["climate.room"])
        runtime = {"storage": SimpleNamespace(data=data, effective_temperature_unit="°C"),
                   "scheduler": SimpleNamespace(), "entry": SimpleNamespace(options={}, data={})}
        original_data = deepcopy(data)
        for field in ("minimum_off_seconds", "off_delay_seconds"):
            with self.subTest(field=field):
                group = supply_group()
                group[field] = 1.5
                payload = {"format": api.EXPORT_FORMAT, "model_version": 22,
                           "temperature_unit": "°C", "sections": {"settings": {"shared_demand_groups": [group]}}}
                original_payload = deepcopy(payload)
                with self.assertRaisesRegex(ValueError, field + " must be a whole number"):
                    api._build_import_data(runtime, payload, ["settings"])
                self.assertEqual(data, original_data)
                self.assertEqual(payload, original_payload)

    def test_settings_roundtrip_and_unmanaged_reference_retention(self):
        data = normalize_schedule_data({}, ["climate.room"])
        data["settings"]["shared_demand_groups"] = [supply_group()]
        restored = normalize_schedule_data(serialize_schedule_data(data), [])
        self.assertEqual(restored["settings"]["shared_demand_groups"], [supply_group()])
        restored["settings"]["shared_demand_groups"][0]["name"] = "Edited"
        self.assertEqual(data["settings"]["shared_demand_groups"][0]["name"], "Boiler")

    def test_hysteresis_is_a_temperature_difference(self):
        original = {"settings": {"shared_demand_groups": [supply_group()]}}
        converted = convert_portable_temperature_data(original, "°C", "°F", None)
        group = converted["settings"]["shared_demand_groups"][0]
        self.assertEqual(group["hysteresis"], .54)
        self.assertEqual(group["zones"]["climate.room"]["hysteresis"], .9)
        self.assertEqual(group["minimum_off_seconds"], 60)
        self.assertEqual(original["settings"]["shared_demand_groups"][0]["hysteresis"], .3)

    def test_portable_import_never_energizes_an_output(self):
        data = normalize_schedule_data({}, ["climate.room"])
        runtime = {"storage": SimpleNamespace(data=data, effective_temperature_unit="°C"),
                   "scheduler": SimpleNamespace(), "entry": SimpleNamespace(options={}, data={})}
        payload = {"format": api.EXPORT_FORMAT, "model_version": 21,
                   "temperature_unit": "°C", "sections": {"settings": {"shared_demand_groups": [supply_group()]}}}
        imported = api._build_import_data(runtime, payload, ["settings"])
        group = imported["settings"]["shared_demand_groups"][0]
        self.assertFalse(group["enabled"])
        self.assertTrue(group["suspended"])
        self.assertTrue(payload["sections"]["settings"]["shared_demand_groups"][0]["enabled"])

    def test_advanced_offsets_roundtrip_as_differences_including_dormant_values(self):
        group = supply_group()
        group.update(hysteresis_mode="symmetric", hysteresis_stop=.7)
        group["zones"]["climate.room"]["hysteresis_stop"] = .8
        original = {"settings": {"shared_demand_groups": [group]}}
        converted = convert_portable_temperature_data(original, "°C", "°F", None)
        result = converted["settings"]["shared_demand_groups"][0]
        self.assertEqual(result["hysteresis_mode"], "symmetric")
        self.assertEqual(result["hysteresis_stop"], 1.26)
        self.assertEqual(result["zones"]["climate.room"]["hysteresis_stop"], 1.44)
        self.assertEqual(convert_portable_temperature_data(converted, "°F", "°C", None), original)

    def test_model_22_preserves_custom_group_and_sparse_overrides_on_import(self):
        data = normalize_schedule_data({}, ["climate.room"])
        runtime = {"storage": SimpleNamespace(data=data, effective_temperature_unit="°C"),
                   "scheduler": SimpleNamespace(), "entry": SimpleNamespace(options={}, data={})}
        group = supply_group()
        group.update(hysteresis_mode="custom", hysteresis_stop=.7)
        group["zones"]["climate.room"] = {"hysteresis_stop": .8}
        payload = {"format": api.EXPORT_FORMAT, "model_version": 22,
                   "temperature_unit": "°C", "sections": {"settings": {"shared_demand_groups": [group]}}}
        restored = api._build_import_data(runtime, payload, ["settings"])["settings"]["shared_demand_groups"][0]
        self.assertEqual(restored["hysteresis_mode"], "custom")
        self.assertEqual(restored["hysteresis_stop"], .7)
        self.assertEqual(restored["zones"]["climate.room"], {"hysteresis_stop": .8})
        self.assertFalse(restored["enabled"])
        self.assertTrue(restored["suspended"])

    def test_large_valid_offsets_import_into_fahrenheit_without_raw_unit_cap(self):
        data = normalize_schedule_data({}, ["climate.room"])
        runtime = {"storage": SimpleNamespace(data=data, effective_temperature_unit="°F"),
                   "scheduler": SimpleNamespace(), "entry": SimpleNamespace(options={}, data={})}
        group = supply_group()
        group.update(hysteresis_mode="custom", hysteresis=12, hysteresis_stop=12)
        group["zones"]["climate.room"] = {"hysteresis": 12, "hysteresis_stop": 12}
        payload = {"format": api.EXPORT_FORMAT, "model_version": 22,
                   "temperature_unit": "°C", "sections": {"settings": {"shared_demand_groups": [group]}}}
        restored = api._build_import_data(runtime, payload, ["settings"])["settings"]["shared_demand_groups"][0]
        self.assertEqual(restored["hysteresis"], 21.6)
        self.assertEqual(restored["hysteresis_stop"], 21.6)
        self.assertEqual(restored["zones"]["climate.room"], {"hysteresis": 21.6, "hysteresis_stop": 21.6})
        self.assertFalse(restored["enabled"])
        self.assertTrue(restored["suspended"])

    def test_import_preview_never_copies_local_or_foreign_cleanup(self):
        data = normalize_schedule_data({}, ["climate.room"])
        data["settings"]["shared_demand_groups"] = [supply_group()]
        data["settings"]["shared_demand_cleanup"] = ["switch.previous"]
        runtime = {"storage": SimpleNamespace(data=data, effective_temperature_unit="°C"),
                   "scheduler": SimpleNamespace(), "entry": SimpleNamespace(options={}, data={})}
        payload = {"format": api.EXPORT_FORMAT, "model_version": 21,
                   "temperature_unit": "°C", "sections": {"settings": {"shared_demand_cleanup": ["switch.foreign"]}}}
        imported = api._build_import_data(runtime, payload, ["settings"])
        self.assertNotIn("shared_demand_cleanup", imported["settings"])
        exported = api._build_export_payload(runtime, ["settings"])
        self.assertNotIn("shared_demand_cleanup", exported["sections"]["settings"])


class SharedDemandRoomAssistTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.hass = FakeHass()
        self.entity = "climate.room"
        self.hass.states[self.entity] = SimpleNamespace(state="heat", attributes={"temperature": 30, "current_temperature": 18})
        self.data = normalize_schedule_data({}, [self.entity])
        self.data["zones"][self.entity]["preconditioning"].update({
            "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.room"})
        async def save():
            pass
        self.scheduler = VelairScheduler(self.hass, self.data, ClimateManager(self.hass), save)
        self.scheduler._stopped = False
        self.target = SimpleNamespace(temperature_only=False, weekday="monday", start="08:00", temperature=21,
                                      target_temp_low=None, target_temp_high=None)
        self.target_patch = patch.object(self.scheduler, "_room_sensor_assist_target_event", return_value=self.target)
        self.temp_patch = patch.object(self.scheduler, "_external_temperature", return_value=20)
        self.target_patch.start()
        self.temp_patch.start()

    async def asyncTearDown(self):
        self.target_patch.stop()
        self.temp_patch.stop()
        await self.scheduler._climate_delivery.async_stop()

    def committed(self, mode="heat", phase="towards_upper"):
        self.hass.states[self.entity].state = mode
        self.scheduler._room_sensor_assist_states[self.entity] = _RoomSensorAssistState(
            entity_id=self.entity, target_temperature=21, applied_temperature=30,
            applied_offset=9, direction=mode, hvac_mode=mode,
            room_temperature_entity_id="sensor.room", weekday="monday", start="08:00",
            hysteresis_phase=phase, hysteresis_mode=mode)

    def test_only_committed_phase_drives_shared_source(self):
        # No runtime commit: a preview or corrected thermostat target cannot drive it.
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["valid"])
        for mode, phase, expected in (("heat", "towards_upper", True), ("heat", "towards_lower", False),
                                      ("cool", "towards_lower", True), ("cool", "towards_upper", False)):
            with self.subTest(mode=mode, phase=phase):
                self.committed(mode, phase)
                result = self.scheduler.get_shared_demand_room_assist(self.entity)
                self.assertTrue(result["valid"])
                self.assertEqual(result["demand"], expected)

    def test_target_sensor_mode_or_suppression_invalidates_commit(self):
        self.committed()
        self.target.temperature = 22
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["valid"])
        self.target.temperature = 21
        self.data["zones"][self.entity]["preconditioning"]["room_temperature_entity_id"] = "sensor.other"
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["valid"])
        self.data["zones"][self.entity]["preconditioning"]["room_temperature_entity_id"] = "sensor.room"
        self.hass.states[self.entity].state = "cool"
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["valid"])
        self.hass.states[self.entity].state = "heat"
        self.scheduler._room_sensor_assist_suppressed.add(self.entity)
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["valid"])

    def test_same_block_mode_edit_waits_for_new_commit(self):
        self.committed()
        self.target.hvac_mode = "cool"
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["valid"])

    def test_keep_mode_commit_and_paused_manual_fallback(self):
        from dataclasses import replace
        self.committed()
        state = self.scheduler._room_sensor_assist_states[self.entity]
        self.scheduler._room_sensor_assist_states[self.entity] = replace(state, hvac_mode=None)
        self.assertTrue(self.scheduler.get_shared_demand_room_assist(self.entity)["demand"])
        self.data["global_"]["mode"] = "paused"
        # Retire the correction first; never reuse the adjusted target mid-restore.
        self.assertTrue(self.scheduler.get_shared_demand_room_assist(self.entity)["active"])
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["valid"])
        self.scheduler._room_sensor_assist_states.clear()
        self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["active"])

    def test_missing_room_sensor_does_not_reuse_climate_target(self):
        self.committed()
        with patch.object(self.scheduler, "_external_temperature", return_value=None):
            result = self.scheduler.get_shared_demand_room_assist(self.entity)
        self.assertTrue(result["active"])
        self.assertFalse(result["valid"])

    def test_unsupported_assist_shape_does_not_claim_native_demand(self):
        self.target.temperature = None
        self.target.target_temp_low = 20
        self.target.target_temp_high = 24
        self.target.hvac_mode = "heat"
        with patch.object(self.scheduler, "_range_thermal_mode_supported", return_value=False):
            self.assertFalse(self.scheduler.get_shared_demand_room_assist(self.entity)["active"])

    def test_commits_without_device_commands_notify_demand(self):
        calls = []
        self.scheduler.shared_demand_changed = lambda: calls.append(True)
        with patch.object(self.scheduler, "_room_sensor_assist_candidate_entities", return_value=set()):
            self.scheduler._refresh_room_sensor_assist_listener()
            self.scheduler._refresh_room_sensor_assist_listener()
        self.assertEqual(len(calls), 2)
        self.scheduler._clear_room_sensor_assist_listener()


class SharedDemandApiTest(unittest.IsolatedAsyncioTestCase):
    async def test_fractional_timing_is_rejected_before_controller_or_storage_mutation(self):
        original = deepcopy(self.data)
        for field in ("minimum_off_seconds", "off_delay_seconds"):
            with self.subTest(field=field):
                self.connection.reset_mock()
                group = supply_group()
                group[field] = 1.5
                await api._shared_demand_mutation(self.hass, self.connection,
                    {"id": 1, "groups": [group]}, resume=False)
                self.connection.send_error.assert_called_once_with(
                    1, "invalid_shared_demand", field + " must be a whole number of seconds")
                self.connection.send_result.assert_not_called()
                self.controller.async_update_groups.assert_not_awaited()
                self.assertEqual(self.data, original)

    async def asyncSetUp(self):
        import asyncio
        import sys
        self.data = normalize_schedule_data({}, ["climate.room"])
        self.controller = SimpleNamespace(async_update_groups=AsyncMock(), async_resume=AsyncMock())
        self.runtime = {"storage": SimpleNamespace(data=self.data, temperature_migration_required=False),
                        "scheduler": SimpleNamespace(_profile_mutation_lock=asyncio.Lock()),
                        "shared_demand": self.controller}
        # Match HA's actual surface: there is no connection.require_admin().
        self.connection = Mock(spec_set=["user", "send_result", "send_error"])
        self.connection.user = SimpleNamespace(is_admin=True)
        self.hass = SimpleNamespace(states={"switch.boiler": SimpleNamespace(state="off")})
        self.registry = SimpleNamespace(async_get=lambda _id: SimpleNamespace(platform="test"))
        self.registry_module = SimpleNamespace(async_get=lambda _hass: self.registry)
        self.patches = [patch.object(api, "_get_runtime", return_value=self.runtime),
                        patch.object(api, "_reject_temperature_migration_mutation", return_value=False),
                        patch.object(api, "_build_schedule_response", return_value={"saved": True}),
                        patch.object(sys.modules["homeassistant.helpers"], "entity_registry", self.registry_module, create=True)]
        for item in self.patches:
            item.start()

    async def asyncTearDown(self):
        for item in reversed(self.patches):
            item.stop()

    async def test_revision_conflict_does_not_mutate_or_touch_output(self):
        await api._shared_demand_mutation(self.hass, self.connection, {"id": 1, "groups": [supply_group()], "expected_revision": 99}, resume=False)
        self.controller.async_update_groups.assert_not_awaited()
        self.connection.send_error.assert_called_once()

    async def test_duplicate_outputs_rejected_before_registry_or_mutation(self):
        other = {**supply_group(), "id": "other"}
        await api._shared_demand_mutation(self.hass, self.connection, {"id": 1, "groups": [supply_group(), other]}, resume=False)
        self.controller.async_update_groups.assert_not_awaited()
        self.connection.send_error.assert_called_once()

    async def test_resume_requires_admin_and_uses_explicit_command(self):
        await api._shared_demand_mutation(self.hass, self.connection, {"id": 1, "group_id": "boiler"}, resume=True)
        self.controller.async_resume.assert_awaited_once_with("boiler")
        self.controller.async_update_groups.assert_not_awaited()
        self.connection.send_result.assert_called_once_with(1, {"saved": True})

    async def test_non_admin_or_missing_user_cannot_save_or_resume(self):
        for user in (None, SimpleNamespace(is_admin=False)):
            for resume in (False, True):
                with self.subTest(user=user, resume=resume):
                    self.connection.reset_mock()
                    self.connection.user = user
                    await api._shared_demand_mutation(self.hass, self.connection,
                        {"id": 1, "groups": [supply_group()], "group_id": "boiler"}, resume=resume)
                    self.connection.send_error.assert_called_once_with(1, "unauthorized", "Administrator access is required")
                    self.connection.send_result.assert_not_called()
        self.controller.async_update_groups.assert_not_awaited()
        self.controller.async_resume.assert_not_awaited()

    async def test_admin_can_save_using_actual_connection_surface(self):
        from homeassistant.helpers import entity_registry as er
        with patch.object(er, "async_get", return_value=self.registry):
            await api._shared_demand_mutation(self.hass, self.connection,
                {"id": 1, "groups": [supply_group()]}, resume=False)
        self.controller.async_update_groups.assert_awaited_once()
        self.connection.send_result.assert_called_once_with(1, {"saved": True})
        self.connection.send_error.assert_not_called()

    async def test_unexpected_save_or_resume_failure_logs_cause(self):
        from homeassistant.helpers import entity_registry as er
        for resume in (False, True):
            with self.subTest(resume=resume):
                self.connection.reset_mock()
                method = self.controller.async_resume if resume else self.controller.async_update_groups
                method.side_effect = OSError("test storage failure")
                with patch.object(er, "async_get", return_value=self.registry), self.assertLogs(api._LOGGER, level="ERROR") as captured:
                    await api._shared_demand_mutation(self.hass, self.connection,
                        {"id": 1, "groups": [supply_group()], "group_id": "boiler"}, resume=resume)
                self.assertIn("test storage failure", "\n".join(captured.output))
                self.assertIsNotNone(captured.records[0].exc_info)
                self.connection.send_error.assert_called_once_with(1, "shared_demand_save_failed",
                    "Unable to save shared supply settings. See Home Assistant logs for details.")
                self.connection.send_result.assert_not_called()

    async def test_actual_resume_transaction_reenters_scheduler_lock(self):
        import asyncio
        from custom_components.velair.shared_demand import SharedDemandController
        hass = FakeHass()
        self.data["settings"]["shared_demand_groups"] = [{**supply_group(), "suspended": True}]
        save = AsyncMock()
        scheduler = VelairScheduler(hass, self.data, ClimateManager(hass), save)
        controller = SharedDemandController(hass, self.data, save, scheduler)
        self.runtime.update(scheduler=scheduler, shared_demand=controller)
        await asyncio.wait_for(api._shared_demand_mutation(hass, self.connection,
            {"id": 1, "group_id": "boiler", "expected_revision": self.data.get("configuration_revision", 0)}, resume=True), timeout=1)
        self.assertFalse(self.data["settings"]["shared_demand_groups"][0]["suspended"])
        save.assert_awaited_once()
        self.connection.send_result.assert_called_once()
        await scheduler._climate_delivery.async_stop()

    async def test_reset_persists_retired_outputs_with_defaults(self):
        from .test_temperature import make_storage
        storage = make_storage("°C")
        await storage.async_load(["climate.room"])
        storage.data["settings"]["shared_demand_groups"] = [supply_group()]
        storage.data["settings"]["shared_demand_cleanup"] = ["switch.previous"]
        await storage.async_reset_to_defaults()
        self.assertEqual(storage.data["settings"]["shared_demand_cleanup"], ["switch.boiler", "switch.previous"])
        self.assertEqual(storage._store.saved[-1]["settings"]["shared_demand_cleanup"], ["switch.boiler", "switch.previous"])

    async def test_import_merges_authoritative_cleanup_at_commit(self):
        hass = FakeHass()
        self.data["settings"]["shared_demand_groups"] = [supply_group()]
        self.data["settings"]["shared_demand_cleanup"] = ["switch.previous"]
        writes = []
        async def save():
            writes.append(deepcopy(self.data))
        scheduler = VelairScheduler(hass, self.data, ClimateManager(hass), save)
        await scheduler.async_replace_portable_data(settings={"first_weekday": "monday", "zone_order": [],
            "min_temperature": 5, "max_temperature": 35, "shared_demand_groups": [], "shared_demand_cleanup": ["switch.untrusted"]})
        self.assertEqual(self.data["settings"]["shared_demand_cleanup"], ["switch.boiler", "switch.previous"])
        self.assertEqual(writes[-1]["settings"]["shared_demand_cleanup"], ["switch.boiler", "switch.previous"])
        await scheduler._climate_delivery.async_stop()
