"""Regression coverage for logical room ownership and physical delivery."""

from copy import deepcopy
import asyncio
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock
from unittest.mock import patch

from .helpers import FakeHass, NOW, normalize_schedule_data, VelairScheduler
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.group_climate_manager import GroupClimateManager
from custom_components.velair.room_groups import build_group_candidate
from custom_components.velair.models import ClimateEvent


GROUP = {"id": "group.room", "name": "Room", "members": ["climate.a", "climate.b"],
         "temperature_entity_id": "climate.a", "delivery_mode": "all"}


class RoomGroupRuntimeTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.hass = FakeHass()
        self.hass.config.units = SimpleNamespace(temperature_unit="°C")
        for member in GROUP["members"]:
            self.hass.states[member] = SimpleNamespace(state="heat", attributes={
                "hvac_modes": ["off", "heat", "cool"], "supported_features": 1,
                "current_temperature": 19.0, "temperature": 20.0,
                "min_temp": 5.0, "max_temp": 35.0, "target_temp_step": 0.5})
        self.hass.states["sensor.room"] = SimpleNamespace(state="18.5", attributes={"unit_of_measurement": "°C"})
        self.base = normalize_schedule_data(None, GROUP["members"])
        self.data, _ = build_group_candidate(self.base, GROUP["members"], GROUP, "climate.a")
        self.physical = ClimateManager(self.hass)
        self.adapter = GroupClimateManager(self.hass, self.data, self.physical)
        self.save = AsyncMock()
        self.scheduler = VelairScheduler(self.hass, self.data, self.physical, self.save)

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    async def test_heating_and_cooling_share_target_but_keep_individual_evidence(self):
        for mode, temperature in (("heat", 22.0), ("cool", 18.0)):
            await self.adapter.async_set_temperature("group.room", temperature, hvac_mode=mode, ensure_on=True)
            expected = self.adapter.delivery_status["group.room"]
            self.assertEqual(set(expected), set(GROUP["members"]))
            self.assertTrue(all(item["status"] == "success" for item in expected.values()))
            for member in GROUP["members"]:
                entries = self.physical._expected[member]
                self.assertTrue(any(entry["expected"].get("temperature") == temperature for entry in entries))
        self.assertIsNone(self.hass.states.get("group.room"))

    async def test_reference_is_shared_and_members_route_to_one_boost(self):
        self.assertEqual(self.scheduler._current_temperature("group.room"), 19.0)
        self.assertEqual(self.scheduler._temperature_source_entity_id("group.room"), "climate.a")
        await self.scheduler.async_set_zone_boost("climate.b", 23.0, (NOW + timedelta(hours=1)).isoformat(), "heat")
        self.assertEqual(set(self.data["zones"]), {"group.room"})
        self.assertEqual(self.data["zones"]["group.room"]["override"]["temperature"], 23.0)
        self.assertEqual(self.scheduler.get_zone_override_status("climate.a"), self.scheduler.get_zone_override_status("group.room"))

    async def test_partial_delivery_does_not_commit_learning_or_success(self):
        async def fail_one(domain, service, data, **kwargs):
            if data["entity_id"] == "climate.b":
                raise RuntimeError("device rejected target")
        self.hass.services.async_call = fail_one
        with self.assertRaisesRegex(RuntimeError, "incomplete"):
            await self.scheduler.async_set_temperature("group.room", 22.0, hvac_mode="heat")
        status = self.scheduler.group_delivery_status("group.room")
        self.assertEqual(status["climate.a"]["status"], "success")
        self.assertEqual(status["climate.b"]["status"], "failed")
        self.assertEqual(self.scheduler._preconditioning_sessions, {})
        events = [payload for _event, payload in self.hass.bus.events if payload.get("type") == "climate_target_applied"]
        self.assertEqual(events, [])

    async def test_selected_delivery_registers_bounded_mirror_expectations(self):
        self.data["room_groups"]["group.room"].update(delivery_mode="selected", delivery_entity_id="climate.a")
        await self.adapter.async_set_temperature("group.room", 21.0, hvac_mode="heat", ensure_on=True)
        calls = [call for call in self.hass.services.calls if call[0] == "climate"]
        self.assertTrue(all(call[2]["entity_id"] == "climate.a" for call in calls))
        self.assertTrue(self.physical._expected["climate.b"])
        old = self.hass.states["climate.b"]
        new = SimpleNamespace(state="heat", attributes={**old.attributes, "temperature": 21.0})
        self.assertIn("temperature", self.physical.owned_state_change_fields("climate.b", old, new))

    async def test_dissolve_clones_configuration_without_thermal_history(self):
        self.data["preconditioning_learning"] = {"group.room": {"observations": []}}
        await self.scheduler.async_remove_room_group("group.room", self.data.get("configuration_revision", 0))
        self.assertEqual(set(self.data["zones"]), set(GROUP["members"]))
        self.assertEqual(self.data["room_groups"], {})
        self.assertNotIn("group.room", self.data["preconditioning_learning"])
        self.assertEqual(self.save.await_count, 1)

    async def test_storage_failure_restores_previous_group_ownership(self):
        previous = deepcopy(self.data)
        self.save.side_effect = RuntimeError("disk unavailable")
        with self.assertRaisesRegex(RuntimeError, "disk unavailable"):
            await self.scheduler.async_remove_room_group("group.room", self.data.get("configuration_revision", 0))
        self.assertEqual(self.data, previous)
        self.assertEqual(self.scheduler.owner_for_entity("climate.a"), "group.room")

    async def test_different_temperature_steps_rejected_before_persistence(self):
        self.hass.states["climate.b"].attributes["target_temp_step"] = 0.2
        with self.assertRaisesRegex(ValueError, "same temperature step"):
            self.scheduler.preview_room_group(GROUP, self.data.get("configuration_revision", 0))
        self.save.assert_not_awaited()

    async def test_unavailable_reference_never_uses_member_temperature(self):
        self.hass.states["climate.a"].state = "unavailable"
        self.assertIsNone(self.scheduler._current_temperature("group.room"))
        self.hass.states["climate.a"].state = "heat"
        self.hass.states["climate.a"].attributes["current_temperature"] = float("nan")
        self.assertIsNone(self.scheduler._current_temperature("group.room"))

    async def test_mixed_effective_modes_require_an_explicit_choice(self):
        self.hass.states["climate.b"].state = "cool"
        with self.assertRaisesRegex(ValueError, "explicit group mode"):
            await self.adapter.async_set_temperature("group.room", 21.0, ensure_on=True)

    async def test_unavailable_member_does_not_block_healthy_peer(self):
        self.hass.states["climate.b"].state = "unavailable"
        with self.assertRaisesRegex(RuntimeError, "incomplete"):
            await self.scheduler.async_set_temperature("group.room", 22.0, hvac_mode="heat")
        status = self.scheduler.group_delivery_status("group.room")
        self.assertEqual(status["climate.a"]["status"], "success")
        self.assertEqual(status["climate.b"]["status"], "failed")

    async def test_rename_and_member_reorder_preserve_active_learning(self):
        self.data["zones"]["group.room"]["preconditioning"]["enabled"] = True
        event = ClimateEvent(entity_id="group.room", when=NOW, weekday="tuesday", start="19:00",
                             temperature=22.0, hvac_mode="heat", target_when=NOW + timedelta(hours=1))
        self.scheduler._start_preconditioning_session(event, "heat", NOW)
        session = self.scheduler._preconditioning_sessions["group.room"]
        group = {**GROUP, "name": "Living room", "members": list(reversed(GROUP["members"]))}
        await self.scheduler.async_set_room_group(group, self.data.get("configuration_revision", 0))
        self.assertIs(self.scheduler._preconditioning_sessions["group.room"], session)
        self.assertEqual(set(self.scheduler._preconditioning_sessions), {"group.room"})
        self.assertEqual(self.hass.services.calls, [])

    async def test_unrelated_boost_survives_group_waiting_for_runtime_lock(self):
        self.data["zones"]["climate.c"] = deepcopy(self.base["zones"]["climate.a"])
        self.hass.states["climate.c"] = deepcopy(self.hass.states["climate.a"])
        await self.scheduler._timer_lock.acquire()
        task = asyncio.create_task(self.scheduler.async_set_room_group(
            {**GROUP, "name": "Renamed room"}, self.data.get("configuration_revision", 0)))
        try:
            await asyncio.sleep(0)
            await asyncio.sleep(0)
            await self.scheduler.async_set_zone_boost("climate.c", 24.0, (NOW + timedelta(hours=1)).isoformat(), "heat")
        finally:
            self.scheduler._timer_lock.release()
        await task
        self.assertEqual(self.data["zones"]["climate.c"]["override"]["temperature"], 24.0)

    async def test_queued_member_action_rejects_stale_owner_after_group_creation(self):
        self.data.clear()
        self.data.update(deepcopy(self.base))
        lock = self.scheduler._zone_override_lock("climate.a")
        await lock.acquire()
        create = asyncio.create_task(self.scheduler.async_set_room_group(
            GROUP, self.data.get("configuration_revision", 0), "climate.a"))
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        boost = asyncio.create_task(self.scheduler.async_set_zone_boost(
            "climate.a", 24.0, (NOW + timedelta(hours=1)).isoformat(), "heat"))
        await asyncio.sleep(0)
        lock.release()
        await create
        with self.assertRaisesRegex(ValueError, "membership changed"):
            await boost
        self.assertEqual(set(self.data["zones"]), {"group.room"})

    async def test_import_updates_schedule_with_unchanged_group_membership(self):
        zones = deepcopy(self.data["zones"])
        zones["group.room"]["schedule"]["monday"] = [{"start": "08:00", "temperature": 23.0, "hvac_mode": "heat"}]
        await self.scheduler.async_replace_portable_data(room_groups=deepcopy(self.data["room_groups"]), zones=zones, profiles=[])
        self.assertEqual(self.data["zones"]["group.room"]["schedule"]["monday"][0]["temperature"], 23.0)

    async def test_import_can_create_group_in_singleton_runtime(self):
        grouped = deepcopy(self.data)
        self.data.clear()
        self.data.update(deepcopy(self.base))
        await self.scheduler.async_replace_portable_data(room_groups=grouped["room_groups"], zones=grouped["zones"], profiles=[])
        self.assertEqual(set(self.data["zones"]), {"group.room"})
        self.assertEqual(self.scheduler.owner_for_entity("climate.b"), "group.room")

    async def test_group_off_routes_from_member_to_all_targets(self):
        await self.scheduler.async_set_hvac_mode("climate.b", "off")
        calls = [call for call in self.hass.services.calls if call[0] == "climate"]
        self.assertEqual({call[2]["entity_id"] for call in calls}, set(GROUP["members"]))
        self.assertTrue(all(call[1] in ("turn_off", "set_hvac_mode") for call in calls))

    async def test_learning_only_import_is_not_overwritten_by_live_history(self):
        imported = {"group.room": {"observations": []}}
        self.data["preconditioning_learning"] = {"group.room": {"observations": [{"test": "old"}]}}
        await self.scheduler.async_replace_portable_data(room_groups=deepcopy(self.data["room_groups"]), preconditioning_learning=imported)
        self.assertEqual(self.data["preconditioning_learning"], imported)

    async def test_member_reconnection_recovers_even_when_group_stayed_available(self):
        callbacks = []
        def subscribe(_hass, entities, callback):
            callbacks.append(callback)
            return lambda: None
        delivery = self.scheduler._climate_delivery
        with patch("custom_components.velair.climate_delivery.async_track_state_change_event", subscribe):
            delivery.register_current("group.room", lambda: None)
        delivery._async_redeliver_current = AsyncMock()
        callbacks[0](SimpleNamespace(data={"old_state": SimpleNamespace(state="unavailable"),
                                         "new_state": SimpleNamespace(state="heat")}))
        await asyncio.sleep(0)
        delivery._async_redeliver_current.assert_awaited_once_with("group.room")

    async def test_import_prunes_removed_active_profile_and_mode_references(self):
        self.data["profiles"] = [{"key": "night", "name": "Night", "zones": {"group.room": {"behavior": "normal"}}}]
        self.data["modes"] = [{"key": "night_mode", "name": "Night mode", "profile_ids": ["night"]}]
        self.data["global_"].update(active_profile_ids=["night"], base_profile_ids=["night"],
            active_mode_id="night_mode", base_mode_id="night_mode", zone_profile_overrides={"group.room": "night"})
        await self.scheduler.async_replace_portable_data(room_groups=deepcopy(self.data["room_groups"]), profiles=[])
        self.assertEqual(self.data["global_"]["active_profile_ids"], [])
        self.assertEqual(self.data["global_"]["base_profile_ids"], [])
        self.assertEqual(self.data["global_"]["zone_profile_overrides"], {})
        self.assertIsNone(self.data["global_"]["base_mode_id"])

    async def test_room_assist_uses_native_baseline_and_fans_shared_heat_cool_corrections(self):
        for mode, native, room, target, corrected in (("heat", 20.0, 20.5, 21.0, 20.5), ("cool", 25.0, 24.0, 23.0, 24.0)):
            with self.subTest(mode=mode):
                for member in GROUP["members"]:
                    self.hass.states[member].state = mode
                    self.hass.states[member].attributes["current_temperature"] = native
                self.hass.states["sensor.room"].state = str(room)
                self.data["zones"]["group.room"]["schedule"]["tuesday"] = [{"start": "17:00", "temperature": target, "hvac_mode": mode}]
                self.hass.services.calls.clear()
                await self.scheduler.async_update_zone_preconditioning("group.room", {
                    "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.room"})
                calls = [call[2] for call in self.hass.services.calls if call[1] == "set_temperature"]
                self.assertEqual({call["entity_id"] for call in calls}, set(GROUP["members"]))
                self.assertTrue(all(call["temperature"] == corrected for call in calls))
                self.assertNotEqual(corrected, target)
                self.assertEqual(self.scheduler._climate_current_temperature("group.room"), native)
                self.assertEqual(self.scheduler._current_temperature("group.room"), room)
                self.assertEqual(set(self.scheduler._room_sensor_assist_states), {"group.room"})
                self.hass.services.calls.clear()
                await self.scheduler.async_update_zone_preconditioning("group.room", {"room_sensor_assist_enabled": False})
                restored = [call[2] for call in self.hass.services.calls if call[1] == "set_temperature"]
                self.assertEqual({call["entity_id"] for call in restored}, set(GROUP["members"]))
                self.assertTrue(all(call["temperature"] == target for call in restored))
                self.assertEqual(self.scheduler._current_temperature("group.room"), native)
                self.assertEqual(self.scheduler._temperature_source_entity_id("group.room"), "climate.a")
                self.assertEqual(self.scheduler._temperature_source_label("group.room"), "climate")

    async def test_enabled_missing_external_source_does_not_fall_back_to_native(self):
        await self.scheduler.async_update_zone_preconditioning("group.room", {
            "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.missing"})
        self.assertIsNone(self.scheduler._current_temperature("group.room"))
        self.assertEqual(self.scheduler._temperature_source_entity_id("group.room"), "sensor.missing")
        self.assertEqual(self.scheduler._temperature_source_label("group.room"), "room_sensor")
        await self.scheduler.async_update_zone_preconditioning("group.room", {"room_sensor_assist_enabled": False})
        self.assertEqual(self.scheduler._current_temperature("group.room"), 19.0)

    async def test_room_assist_converts_external_fahrenheit_without_changing_native_reading(self):
        self.hass.states["climate.a"].attributes["current_temperature"] = 20.0
        self.hass.states["sensor.room"].state = "68.9"
        self.hass.states["sensor.room"].attributes["unit_of_measurement"] = "°F"
        self.data["zones"]["group.room"]["schedule"]["tuesday"] = [{"start": "17:00", "temperature": 21.0, "hvac_mode": "heat"}]
        await self.scheduler.async_update_zone_preconditioning("group.room", {
            "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.room"})
        self.assertAlmostEqual(self.scheduler._current_temperature("group.room"), 20.5)
        self.assertEqual(self.scheduler._climate_current_temperature("group.room"), 20.0)
        calls = [call[2] for call in self.hass.services.calls if call[1] == "set_temperature"]
        self.assertEqual({call["entity_id"] for call in calls}, set(GROUP["members"]))
        self.assertTrue(all(call["temperature"] == 20.5 for call in calls))

    async def test_learning_metadata_distinguishes_native_member_from_room_assist_sensor(self):
        config = self.data["zones"]["group.room"]["preconditioning"]
        config["enabled"] = True
        event = ClimateEvent(entity_id="group.room", when=NOW, weekday="tuesday", start="19:00",
                             temperature=22.0, hvac_mode="heat", target_when=NOW + timedelta(hours=1))
        self.scheduler._start_preconditioning_session(event, "heat", NOW)
        await self.scheduler._async_observe_preconditioning_temperature("group.room", NOW + timedelta(minutes=30), 22.0)
        observation = self.data["preconditioning_learning"]["group.room"]["heat"]["observations"][-1]
        self.assertEqual(observation.get("temperature_source", "climate"), "climate")
        self.assertNotIn("room_temperature_entity_id", observation)
        config.update(room_sensor_assist_enabled=True, room_temperature_entity_id="sensor.room")
        self.scheduler._start_preconditioning_session(event, "heat", NOW)
        await self.scheduler._async_observe_preconditioning_temperature("group.room", NOW + timedelta(minutes=35), 22.0)
        observation = self.data["preconditioning_learning"]["group.room"]["heat"]["observations"][-1]
        self.assertEqual(observation["temperature_source"], "room_sensor")
        self.assertEqual(observation["room_temperature_entity_id"], "sensor.room")

    async def test_selected_delivery_observes_different_native_member_for_room_assist(self):
        self.data["room_groups"]["group.room"].update(temperature_entity_id="climate.b", delivery_mode="selected", delivery_entity_id="climate.a")
        self.hass.states["climate.b"].attributes["current_temperature"] = 20.0
        self.hass.states["climate.a"].attributes["current_temperature"] = 25.0
        self.hass.states["sensor.room"].state = "20.5"
        self.data["zones"]["group.room"]["schedule"]["tuesday"] = [{"start": "17:00", "temperature": 21.0, "hvac_mode": "heat"}]
        await self.scheduler.async_update_zone_preconditioning("group.room", {
            "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.room"})
        calls = [call[2] for call in self.hass.services.calls if call[1] == "set_temperature"]
        self.assertEqual(calls, [{"entity_id": "climate.a", "temperature": 20.5}])
        self.assertTrue({"climate.a", "climate.b", "sensor.room"}.issubset(self.scheduler._room_sensor_assist_entities))

    async def test_replan_and_learning_follow_changed_assist_source_on_same_unit(self):
        from unittest.mock import Mock
        self.data["zones"]["group.room"]["preconditioning"]["enabled"] = True
        self.data["zones"]["group.room"]["schedule"]["tuesday"] = [{"start": "19:00", "temperature": 22.0, "hvac_mode": "heat"}]
        subscriptions = []
        def subscribe(_hass, entities, callback):
            if callback.__name__ == "_handle_preconditioning_replan_state_change":
                subscriptions.append(set(entities))
            return Mock()
        with patch("custom_components.velair.scheduler.async_track_state_change_event", subscribe):
            self.scheduler.async_schedule_next_event()
            self.assertEqual(subscriptions[-1], {"climate.a"})
            event = ClimateEvent(entity_id="group.room", when=NOW, weekday="tuesday", start="19:00",
                                 temperature=22.0, hvac_mode="heat", target_when=NOW + timedelta(hours=1))
            self.scheduler._start_preconditioning_session(event, "heat", NOW)
            self.assertEqual(self.scheduler._preconditioning_sessions["group.room"].temperature_source_entity_id, "climate.a")
            await self.scheduler.async_update_zone_preconditioning("group.room", {
                "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.room"})
            self.assertEqual(subscriptions[-1], {"sensor.room"})
            self.assertNotIn("group.room", self.scheduler._preconditioning_sessions)
            self.hass.states["sensor.other"] = SimpleNamespace(state="18", attributes={"unit_of_measurement": "°C"})
            self.scheduler._start_preconditioning_session(event, "heat", NOW)
            await self.scheduler.async_update_zone_preconditioning("group.room", {"room_temperature_entity_id": "sensor.other"})
            self.assertEqual(subscriptions[-1], {"sensor.other"})
            self.assertNotIn("group.room", self.scheduler._preconditioning_sessions)
            await self.scheduler.async_update_zone_preconditioning("group.room", {"room_sensor_assist_enabled": False})
            self.assertEqual(subscriptions[-1], {"climate.a"})

    async def test_legacy_sensor_native_reference_loads_without_enabling_or_rewriting_assist(self):
        from custom_components.velair.models import serialize_schedule_data
        legacy = deepcopy(self.data)
        legacy["room_groups"]["group.room"]["temperature_entity_id"] = "sensor.room"
        legacy["zones"]["group.room"]["preconditioning"].update(
            room_sensor_assist_enabled=False, room_temperature_entity_id="sensor.optional")
        loaded = normalize_schedule_data(serialize_schedule_data(legacy), GROUP["members"])
        self.data.clear()
        self.data.update(loaded)
        self.assertEqual(self.scheduler._current_temperature("group.room"), 18.5)
        self.assertEqual(self.scheduler._temperature_source_entity_id("group.room"), "sensor.room")
        self.assertFalse(self.data["zones"]["group.room"]["preconditioning"]["room_sensor_assist_enabled"])
        self.assertEqual(self.data["zones"]["group.room"]["preconditioning"]["room_temperature_entity_id"], "sensor.optional")
        await self.scheduler.async_set_room_group({**legacy["room_groups"]["group.room"], "name": "Renamed legacy"}, self.data.get("configuration_revision", 0))
        self.assertEqual(self.scheduler._current_temperature("group.room"), 18.5)
        await self.scheduler.async_set_room_group({**GROUP, "name": "Native room"}, self.data.get("configuration_revision", 0))
        self.assertEqual(self.scheduler._current_temperature("group.room"), 19.0)
        self.assertEqual(self.data["zones"]["group.room"]["preconditioning"]["room_temperature_entity_id"], "sensor.optional")

    async def test_room_assist_range_correction_fans_out_for_both_directions(self):
        for room, direction in ((18.0, "heat"), (26.0, "cool")):
            with self.subTest(direction=direction):
                for member in GROUP["members"]:
                    state = self.hass.states[member]
                    state.state = "heat_cool"
                    state.attributes.update(hvac_modes=["off", "heat_cool"], supported_features=3,
                        target_temp_low=20.0, target_temp_high=24.0, current_temperature=19.0 if direction == "heat" else 25.0)
                self.hass.states["sensor.room"].state = str(room)
                self.data["zones"]["group.room"]["schedule"]["tuesday"] = [{"start": "17:00", "target_temp_low": 20.0, "target_temp_high": 24.0, "hvac_mode": "heat_cool"}]
                self.hass.services.calls.clear()
                await self.scheduler.async_update_zone_preconditioning("group.room", {
                    "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.room"})
                calls = [call[2] for call in self.hass.services.calls if call[1] == "set_temperature"]
                self.assertEqual({call["entity_id"] for call in calls}, set(GROUP["members"]))
                self.assertTrue(all((call["target_temp_low"], call["target_temp_high"]) ==
                                    (calls[0]["target_temp_low"], calls[0]["target_temp_high"]) for call in calls))
                self.assertEqual(self.scheduler._room_sensor_assist_states["group.room"].direction, direction)
                self.assertNotEqual((calls[0]["target_temp_low"], calls[0]["target_temp_high"]), (20.0, 24.0))
                self.hass.services.calls.clear()
                await self.scheduler.async_update_zone_preconditioning("group.room", {"room_temperature_entity_id": None})
                restored = [call[2] for call in self.hass.services.calls if call[1] == "set_temperature"]
                self.assertEqual({call["entity_id"] for call in restored}, set(GROUP["members"]))
                self.assertTrue(all((call["target_temp_low"], call["target_temp_high"]) == (20.0, 24.0) for call in restored))
                self.assertEqual(self.scheduler._temperature_source_entity_id("group.room"), "climate.a")
                self.assertEqual(self.data["zones"]["group.room"]["schedule"]["tuesday"][0]["target_temp_low"], 20.0)
