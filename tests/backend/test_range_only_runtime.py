"""Issue 51 regressions using the real climate adapter and scheduler."""
from copy import deepcopy
from dataclasses import replace
from datetime import timedelta
from types import SimpleNamespace
import unittest
import asyncio
from unittest.mock import patch

from .helpers import FakeHass, NOW, VelairScheduler, empty_week_schedule, normalize_panel_settings
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.models import ClimateEvent, normalize_preconditioning_data, normalize_schedule_data
from custom_components.velair.planned_return_preparation import _arrival_preparation
from custom_components.velair.scheduler import _RoomSensorAssistState
from custom_components.velair.storage import convert_portable_temperature_data
from custom_components.velair.schedule_resources import resolve_week


class RangeOnlyRuntimeTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.entity = "climate.room"
        self.hass = FakeHass()
        self.state = SimpleNamespace(state="heat", attributes={
            "temperature": 28, "target_temp_low": 20, "target_temp_high": 24,
            "current_temperature": 17, "supported_features": 394,
            "hvac_modes": ["off", "heat", "cool", "auto", "dry", "fan_only"],
            "target_temp_step": .5, "min_temp": 16, "max_temp": 30})
        self.hass.states[self.entity] = self.state
        self.calls = []

        async def call(domain, service, data, **kwargs):
            if domain != "climate":
                return
            self.calls.append((service, dict(data)))
            if service == "set_hvac_mode":
                self.state.state = data["hvac_mode"]
            elif service == "set_temperature":
                self.state.attributes.update({key: value for key, value in data.items() if key != "entity_id"})

        self.hass.services.async_call = call
        self.manager = ClimateManager(self.hass)
        self.weekday = NOW.strftime("%A").lower()
        schedule = empty_week_schedule()
        schedule[self.weekday] = [{"start": "00:00", "action": "set_temperature", "target_temp_low": 21, "target_temp_high": 25}]
        self.data = normalize_schedule_data({"zones": {self.entity: {"enabled": True, "schedule": schedule}},
                    "settings": normalize_panel_settings(None, [self.entity])}, [self.entity])
        self.scheduler = VelairScheduler(self.hass, self.data, self.manager, self.save)
        self.clock = patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW)
        self.clock.start()

    async def save(self):
        pass

    async def asyncTearDown(self):
        self.clock.stop()
        await self.scheduler._climate_delivery.async_stop()

    def block(self):
        return self.data["zones"][self.entity]["schedule"][self.weekday][0]

    def assert_pair(self, low=21, high=25):
        payload = next(data for service, data in reversed(self.calls) if service == "set_temperature")
        self.assertEqual(payload, {"entity_id": self.entity, "target_temp_low": low, "target_temp_high": high})

    async def test_explicit_modes_validate_and_deliver_exact_pair(self):
        for mode in ("heat", "cool", "auto"):
            for low, high in ((21, 25), (23, 23)):
                with self.subTest(mode=mode, low=low):
                    self.block().update(hvac_mode=mode, target_temp_low=low, target_temp_high=high)
                    self.scheduler.ensure_blocks_in_temperature_limits(self.entity, [self.block()])
                    self.calls.clear()
                    await self.scheduler.async_apply_current_schedule()
                    self.assertEqual(self.state.state, mode)
                    self.assert_pair(low, high)

    async def test_keep_starts_first_compatible_and_preserves_on_modes(self):
        self.state.attributes["hvac_modes"] = ["off", "dry", "cool", "heat", "auto"]
        self.state.state = "off"
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.state.state, "cool")
        self.assert_pair()
        self.calls.clear()
        self.state.state = "auto"
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual([service for service, _ in self.calls], ["set_temperature"])

    async def test_temperature_only_off_sends_pair_without_starting(self):
        self.block()["temperature_only"] = True
        self.state.state = "off"
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.state.state, "off")
        self.assertEqual([service for service, _ in self.calls], ["set_temperature"])
        self.assert_pair()

    async def test_incompatible_modes_and_scalar_off_fail_without_calls(self):
        for mode in ("dry", "fan_only", "unadvertised"):
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                await self.manager.async_set_temperature_range(self.entity, 21, 25, hvac_mode=mode)
        self.state.state = "dry"
        with self.assertRaises(ValueError):
            await self.manager.async_set_temperature_range(self.entity, 21, 25, ensure_on=True)
        self.state.state = "off"
        for configured in (False, True):
            with self.assertRaises(ValueError):
                if configured:
                    self.manager.validate_configured_temperature_target(self.entity, range_target=False, hvac_mode="heat")
                else:
                    await self.manager.async_set_temperature(self.entity, 22, ensure_on=True)
        self.assertEqual(self.calls, [])

    async def test_snapshot_uses_immutable_pair_and_drops_invalid_range(self):
        observation = deepcopy(self.state)
        self.state.attributes["supported_features"] = 1
        self.state.attributes["target_temp_low"] = 27
        snapshot = self.manager.climate_state_snapshot_from_state(self.entity, observation)
        self.assertEqual(snapshot, {"hvac_mode": "heat", "target_temp_low": 20, "target_temp_high": 24})
        observation.attributes["target_temp_high"] = None
        self.assertEqual(self.manager.climate_state_snapshot_from_state(self.entity, observation), {"hvac_mode": "heat"})

    async def test_boost_and_cancel_restore_pair_then_pause_resume(self):
        await self.scheduler.async_set_zone_boost(self.entity, None, (NOW + timedelta(minutes=20)).isoformat(), "cool", target_temp_low=22, target_temp_high=26)
        self.assert_pair(22, 26)
        self.calls.clear()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.assert_pair(20, 24)
        self.calls.clear()
        await self.scheduler.async_pause_zone(self.entity, pause_id="window", action="turn_off")
        self.assertEqual(self.state.state, "off")
        await self.scheduler.async_resume_zone(self.entity, pause_id="window")
        self.assertEqual(self.state.state, "heat")
        self.assert_pair()

    async def test_manual_status_never_exposes_residual_scalar(self):
        self.assertIsNone(self.scheduler._climate_target_temperature(self.entity))
        self.assertEqual(self.scheduler._climate_target_range(self.entity), (20, 24))
        snapshot = self.manager.climate_state_snapshot(self.entity)
        await self.manager.async_restore_state(self.entity, snapshot)
        self.assert_pair(20, 24)

    async def test_boost_from_temperature_free_modes_restores_mode_only(self):
        self.data["zones"][self.entity]["schedule"] = empty_week_schedule()
        for mode in ("dry", "fan_only"):
            with self.subTest(mode=mode):
                self.state.state = mode
                self.assertEqual(self.manager.climate_state_snapshot(self.entity), {"hvac_mode": mode})
                await self.scheduler.async_set_zone_boost(self.entity, None, (NOW + timedelta(minutes=20)).isoformat(), "heat", target_temp_low=22, target_temp_high=26)
                self.calls.clear()
                await self.scheduler.async_cancel_zone_boost(self.entity)
                self.assertEqual(self.state.state, mode)
                self.assertEqual(self.calls, [("set_hvac_mode", {"entity_id": self.entity, "hvac_mode": mode})])

    async def test_temperature_only_mode_change_removes_shift_without_replaying_mode(self):
        self.block()["temperature_only"] = True
        self.state.attributes["hvac_modes"].append("heat_cool")
        self.state.attributes.update(target_temp_low=23, target_temp_high=27)
        self.scheduler._room_sensor_assist_states[self.entity] = _RoomSensorAssistState(
            self.entity, None, None, 3, "heat", None, "sensor.room", self.weekday, "00:00",
            target_temp_low=21, target_temp_high=25, temperature_only=True,
            applied_target_temp_low=23, applied_target_temp_high=27)
        await self.scheduler.async_handle_external_climate_change(
            self.entity, changed_fields=["hvac_mode"],
            previous={"hvac_mode": "heat_cool"}, current={"hvac_mode": "heat"})
        self.assertEqual([service for service, _ in self.calls], ["set_temperature"])
        self.assertEqual(self.state.state, "heat")
        self.assert_pair()
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)

    async def test_no_thermal_interpretation_or_old_room_assist_restore(self):
        zone = self.data["zones"][self.entity]
        zone["preconditioning"] = {"enabled": True, "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.room"}
        self.hass.states["sensor.room"] = SimpleNamespace(state="16", attributes={"unit_of_measurement": "°C"})
        arrival = NOW + timedelta(hours=1)
        self.assertEqual(self.scheduler._preconditioned_event_details(self.entity, zone, self.block(), arrival), (arrival, None))
        event = self.scheduler.get_current_event(self.entity)
        self.scheduler._record_learning_transition(event, "heat", NOW)
        self.assertEqual(self.scheduler._learning_transition_keys, {})
        self.scheduler._start_preconditioning_session(event, "heat", NOW)
        self.assertEqual(self.scheduler._preconditioning_sessions, {})
        self.scheduler._room_sensor_assist_states[self.entity] = _RoomSensorAssistState(self.entity, 22, 26, 4, "heat", "heat", "sensor.room", self.weekday, "00:00")
        await self.scheduler.async_apply_current_schedule()
        self.assert_pair()
        self.assertEqual(len(self.calls), 1)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)
        status = self.scheduler._room_sensor_assist_status(self.entity)
        self.assertEqual(status["reason"], "unsupported_range_mode")
        self.assertEqual(status["status"], "unavailable")
        self.assertEqual(self.scheduler.preconditioning_learning_activity(self.entity, "heat"),
                         {"state": "unavailable", "reason": "unsupported_range_mode"})
        row = {}
        _arrival_preparation(self.scheduler, self.scheduler._planned_return, self.entity, zone,
                             normalize_preconditioning_data(zone["preconditioning"]), self.block(), arrival, NOW, None, False, row)
        self.assertEqual(row["preparation"], "arrival_only")
        self.assertEqual(row["reason"], "unsupported_range_mode")

    async def test_range_learning_session_stops_after_effective_mode_changes(self):
        self.data["zones"][self.entity]["preconditioning"] = {"enabled": True}
        self.state.attributes["hvac_modes"].append("heat_cool")
        for path in ("observe", "expire", "finish", "new_target"):
            with self.subTest(path=path):
                self.state.state = "heat_cool"
                event = replace(self.scheduler.get_current_event(self.entity), target_when=NOW + timedelta(minutes=20))
                self.scheduler._start_preconditioning_session(event, None, NOW)
                session = self.scheduler._preconditioning_sessions[self.entity]
                self.state.state = "heat"
                if path == "observe":
                    await self.scheduler._async_observe_preconditioning_temperature(self.entity, NOW + timedelta(minutes=10), 22)
                elif path == "expire":
                    await self.scheduler._async_expire_preconditioning_sessions(NOW + timedelta(minutes=30))
                elif path == "finish":
                    await self.scheduler._async_finish_preconditioning_session(session, NOW + timedelta(minutes=10), 22, quality="complete")
                else:
                    self.scheduler._start_preconditioning_session(event, None, NOW)
                self.assertEqual(self.scheduler._preconditioning_sessions, {})
                for learning in self.data.get("preconditioning_learning", {}).values():
                    self.assertTrue(all(not direction["observations"] for direction in learning.values()))

    async def test_restart_retains_pair_without_migration(self):
        restored = normalize_schedule_data(deepcopy(self.data), [self.entity])
        restarted = VelairScheduler(self.hass, restored, self.manager, self.save)
        try:
            await restarted.async_apply_current_schedule()
            self.assert_pair()
            self.assertNotIn("temperature", restored["zones"][self.entity]["schedule"][self.weekday][0])
        finally:
            await restarted._climate_delivery.async_stop()

    async def test_recovery_re_resolves_current_range_and_mode(self):
        callbacks = []
        def track(hass, entities, callback):
            callbacks.append(callback)
            return lambda: None
        self.state.state = "unavailable"
        with patch("custom_components.velair.climate_delivery.async_track_state_change_event", track):
            await self.scheduler.async_apply_current_schedule()
            self.assertEqual(self.calls, [])
            self.block().update(hvac_mode="auto", target_temp_low=22, target_temp_high=26)
            self.state.state = "heat"
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)
        self.assertEqual(self.state.state, "auto")
        self.assert_pair(22, 26)

    async def test_template_profile_and_portable_roundtrip_keep_range(self):
        block = {**self.block(), "hvac_mode": "auto"}
        key = await self.scheduler.async_set_schedule_template("Range", [block])
        await self.scheduler.async_set_daily_schedule(self.entity, self.weekday,
                                                     template_link={"template_key": key, "mode": "full"},
                                                     expected_revision=self.data.get("configuration_revision", 0))
        profile_schedule = empty_week_schedule()
        profile_schedule[self.weekday] = [block]
        await self.scheduler.async_set_profile({"key": "range", "name": "Range", "color": "#3949ab", "icon": "", "description": "",
            "zones": {self.entity: {"behavior": "schedule", "schedule": profile_schedule}}})
        fahrenheit = convert_portable_temperature_data(deepcopy(self.data), "°C", "°F", None)
        celsius = convert_portable_temperature_data(fahrenheit, "°F", "°C", None)
        restored = normalize_schedule_data(celsius, [self.entity])
        resolved = resolve_week(restored, restored["zones"][self.entity])[self.weekday][0]
        self.assertEqual(resolved["target_temp_low"], 21)
        self.assertEqual(resolved["target_temp_high"], 25)
        self.assertEqual(resolved["hvac_mode"], "auto")
        restarted = VelairScheduler(self.hass, restored, self.manager, self.save)
        try:
            for profile in restarted.get_profiles():
                restarted._validate_profile(profile)
            await restarted.async_apply_current_schedule()
            self.assert_pair()
            self.assertEqual(self.state.state, "auto")
        finally:
            await restarted._climate_delivery.async_stop()
