"""Temperature-only mode ownership across real scheduler delivery boundaries."""
import asyncio
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .helpers import FakeHass, NOW, VelairScheduler, empty_week_schedule, normalize_panel_settings
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.models import ClimateEvent


class TemperatureOnlyRuntimeTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.entity = "climate.room"
        self.hass = FakeHass()
        self.state = SimpleNamespace(state="off", attributes={
            "temperature": 19, "current_temperature": 17,
            "supported_features": 1, "hvac_modes": ["off", "heat", "cool", "heat_cool"],
            "target_temp_step": .5, "min_temp": 5, "max_temp": 35})
        self.hass.states[self.entity] = self.state
        self.calls = []

        async def call(domain, service, data, **kwargs):
            if domain != "climate":
                return
            self.calls.append((service, dict(data)))
            if service == "set_hvac_mode":
                self.state.state = data["hvac_mode"]
            elif service == "turn_off":
                self.state.state = "off"
            elif service == "set_temperature":
                self.state.attributes.update({key: value for key, value in data.items() if key != "entity_id"})

        self.hass.services.async_call = call
        self.manager = ClimateManager(self.hass)
        schedule = empty_week_schedule()
        schedule[NOW.strftime("%A").lower()] = [{"start": "00:00", "action": "set_temperature", "temperature": 21, "temperature_only": True}]
        self.data = {"version": 1, "global_": {"mode": "auto"},
                     "zones": {self.entity: {"enabled": True, "schedule": schedule, "override": None}},
                     "settings": normalize_panel_settings(None, [self.entity]),
                     "templates": [], "templates_seeded": True}
        self.scheduler = VelairScheduler(self.hass, self.data, self.manager, self.save)
        self.clock = patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW)
        self.clock.start()

    async def save(self):
        pass

    async def asyncTearDown(self):
        self.clock.stop()
        await self.scheduler._climate_delivery.async_stop()

    def block(self):
        return self.data["zones"][self.entity]["schedule"][NOW.strftime("%A").lower()][0]

    def assert_no_mode_calls(self):
        self.assertTrue(self.calls)
        self.assertTrue(all(service == "set_temperature" for service, _ in self.calls), self.calls)
        self.assertTrue(all("hvac_mode" not in data for _, data in self.calls))

    async def test_schedule_and_injected_override_never_change_power_or_mode(self):
        for mode in ("off", "heat", "cool"):
            with self.subTest(mode=mode):
                self.state.state = mode
                self.calls.clear()
                event = self.scheduler.get_current_event(self.entity)
                self.assertTrue(event.temperature_only)
                await self.scheduler._async_apply_event(event, hvac_mode="heat")
                self.assertEqual(self.state.state, mode)
                self.assertEqual(self.state.attributes["temperature"], 21)
                self.assert_no_mode_calls()

    async def test_legacy_keep_still_starts_hidden_off_capability(self):
        self.block().pop("temperature_only")
        self.state.attributes["supported_features"] = 0
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.state.state, "heat")
        self.assertEqual([service for service, _ in self.calls], ["set_hvac_mode", "set_temperature"])

    async def test_missing_off_capability_fails_without_any_calls(self):
        for features in (0, 2):
            self.state.attributes["supported_features"] = features
            with self.assertRaises(ValueError):
                await self.scheduler._async_apply_resolved_event_call(
                    self.scheduler.get_current_event(self.entity), source="schedule")
            self.assertEqual(self.calls, [])
            self.assertEqual(self.state.state, "off")

    async def test_off_native_range_only_new_policy_and_advertised_feature(self):
        self.state.attributes["supported_features"] = 2
        block = self.block()
        block.pop("temperature")
        block.update(target_temp_low=19, target_temp_high=24)
        await self.scheduler.async_apply_current_schedule()
        self.assert_no_mode_calls()
        self.assertEqual(self.state.state, "off")
        self.assertEqual(self.state.attributes["target_temp_low"], 19)
        with self.assertRaises(ValueError):
            await self.manager.async_set_temperature_range(self.entity, 19, 24)

    async def test_external_power_changes_observed_without_manual_for_every_policy(self):
        zone = self.data["zones"][self.entity]
        for policy in ("keep_automatic", "until_next_block", "for_duration", "until_resumed"):
            for mode in ("off", "heat", "cool"):
                with self.subTest(policy=policy, mode=mode):
                    zone["external_change_policy"] = {"action": policy, "duration_minutes": 30}
                    self.state.state = mode
                    self.calls.clear()
                    await self.scheduler.async_handle_external_climate_change(
                        self.entity, changed_fields=["hvac_mode"],
                        previous={"hvac_mode": "heat"}, current={"hvac_mode": mode})
                    self.assertEqual(self.calls, [])
                    self.assertIsNone(self.scheduler._manual_control_status(self.entity, NOW))

    async def test_external_temperature_keeps_yield_policy(self):
        self.data["zones"][self.entity]["external_change_policy"] = {"action": "until_resumed"}
        await self.scheduler.async_handle_external_climate_change(
            self.entity, changed_fields=["temperature"],
            previous={"temperature": 21}, current={"temperature": 23})
        self.assertIsNotNone(self.scheduler._manual_control_status(self.entity, NOW))
        self.assertEqual(self.state.state, "off")

    async def test_blueprint_owned_pauses_resume_only_after_final_reason_without_starting(self):
        self.state.state = "heat"
        await self.scheduler.async_pause_zone(self.entity, pause_id="window_a", action="turn_off")
        await self.scheduler.async_pause_zone(self.entity, pause_id="window_b", action="turn_off")
        self.assertEqual(self.state.state, "off")
        self.calls.clear()
        await self.scheduler.async_resume_zone(self.entity, pause_id="window_a")
        self.assertEqual(self.calls, [])
        await self.scheduler.async_resume_zone(self.entity, pause_id="window_b")
        self.assert_no_mode_calls()
        self.assertEqual(self.state.state, "off")

    async def test_preconditioning_off_has_no_early_start_or_learning(self):
        zone = self.data["zones"][self.entity]
        zone["preconditioning"] = {"enabled": True}
        arrival = NOW + timedelta(hours=1)
        start, diagnostics = self.scheduler._preconditioned_event_details(self.entity, zone, self.block(), arrival)
        self.assertEqual(start, arrival)
        self.assertIsNone(diagnostics)
        event = ClimateEvent(self.entity, NOW, 21, "tuesday", "00:00", target_when=arrival, temperature_only=True)
        self.scheduler._start_preconditioning_session(event, None, NOW)
        self.assertEqual(self.scheduler._preconditioning_sessions, {})

    async def test_room_assist_off_clears_old_target_without_restoring(self):
        from custom_components.velair.scheduler import _RoomSensorAssistState
        self.scheduler._room_sensor_assist_states[self.entity] = _RoomSensorAssistState(
            self.entity, 21, 24, 3, "heat", "heat", "sensor.room", "tuesday", "00:00")
        await self.scheduler.async_apply_current_schedule()
        self.assert_no_mode_calls()
        self.assertEqual(self.state.state, "off")
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)

    async def test_power_transition_hiding_target_does_not_enter_manual(self):
        for policy in ("keep_automatic", "until_next_block", "for_duration", "until_resumed"):
            self.data["zones"][self.entity]["external_change_policy"] = {"action": policy}
            await self.scheduler.async_handle_external_climate_change(
                self.entity, changed_fields=["hvac_mode", "temperature"],
                previous={"hvac_mode": "heat", "temperature": 21},
                current={"hvac_mode": "off", "temperature": None},
                observed_snapshot={"hvac_mode": "off"})
            self.assertIsNone(self.scheduler._manual_control_status(self.entity, NOW))
            self.assertEqual(self.calls, [])

    async def test_external_target_snapshot_does_not_replay_captured_mode(self):
        self.data["zones"][self.entity]["external_change_policy"] = {"action": "until_resumed"}
        await self.scheduler.async_handle_external_climate_change(
            self.entity, changed_fields=["temperature"],
            previous={"temperature": 21}, current={"temperature": 23},
            observed_snapshot={"hvac_mode": "heat", "temperature": 23, "preset_mode": "comfort"})
        self.assert_no_mode_calls()
        self.assertEqual(self.state.state, "off")

    async def test_recovery_re_resolves_legacy_mode_into_temperature_only(self):
        callbacks = []
        def track(hass, entities, callback):
            callbacks.append(callback)
            return lambda: None
        self.state.state = "unavailable"
        self.block().pop("temperature_only")
        self.block()["hvac_mode"] = "heat"
        with patch("custom_components.velair.climate_delivery.async_track_state_change_event", track):
            await self.scheduler.async_apply_current_schedule()
            self.assertEqual(self.calls, [])
            self.block().pop("hvac_mode")
            self.block().update(temperature_only=True, temperature=24)
            self.state.state = "off"
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)
        self.assert_no_mode_calls()
        self.assertEqual(self.state.state, "off")
        self.assertEqual(self.state.attributes["temperature"], 24)

    async def test_deliberate_boost_can_start_and_return_to_temperature_only(self):
        await self.scheduler.async_set_zone_boost(self.entity, 24, (NOW + timedelta(minutes=20)).isoformat(), "heat")
        self.assertEqual(self.state.state, "heat")
        self.assertIn("set_hvac_mode", [service for service, data in self.calls])
        self.calls.clear()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.assert_no_mode_calls()
        self.assertEqual(self.state.state, "heat")
        self.assertEqual(self.state.attributes["temperature"], 21)

    async def test_manager_rejects_temperature_only_side_effect_options(self):
        with self.assertRaises(ValueError):
            await self.manager.async_set_temperature(self.entity, 21, temperature_only=True, preset_mode="comfort")
        self.assertEqual(self.calls, [])

    async def test_room_assist_uses_live_cooling_mode_and_restores_without_mode(self):
        self.state.state = "cool"
        self.state.attributes["current_temperature"] = 26
        self.hass.states["sensor.room"] = SimpleNamespace(state="28", attributes={"unit_of_measurement": "°C"})
        self.data["zones"][self.entity]["preconditioning"] = {
            "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.room"}
        await self.scheduler.async_apply_current_schedule()
        self.assert_no_mode_calls()
        assist = self.scheduler._room_sensor_assist_states[self.entity]
        self.assertTrue(assist.temperature_only)
        self.assertEqual(assist.direction, "cool")
        self.assertIsNone(assist.hvac_mode)
        self.state.state = "off"
        self.calls.clear()
        await self.scheduler._async_clear_room_sensor_assist(self.entity, restore=True, reason="test")
        self.assert_no_mode_calls()
        self.assertEqual(self.state.state, "off")

    async def test_planned_return_off_discards_persisted_preparation_latch(self):
        runtime = self.scheduler._planned_return
        arrival = NOW + timedelta(hours=1)
        self.data["planned_return_episode"] = {
            "state": "away", "origin": "manual", "started_at": NOW.isoformat(),
            "return_at": arrival.isoformat(), "destination_mode_id": "default",
            "away_mode_id": "default", "preparing_entities": [self.entity]}
        runtime._applied[self.entity] = (arrival, 21, None, None, None, "tuesday", "00:00", True)
        self.assertTrue(await runtime.async_suspend_temperature_only(self.entity))
        self.assertEqual(runtime.episode["preparing_entities"], [])
        self.assertNotIn(self.entity, runtime._applied)
        self.state.state = "heat"
        with patch.object(runtime, "available", return_value=True), patch.object(
                self.scheduler, "_preconditioned_event_details", return_value=(NOW + timedelta(minutes=30), None)):
            self.assertIsNone(runtime.target(self.entity, NOW))

    async def test_restart_off_latch_is_invalidated_before_rapid_on(self):
        runtime = self.scheduler._planned_return
        arrival = NOW + timedelta(hours=1)
        self.data["planned_return_episode"] = {
            "state": "away", "origin": "manual", "started_at": NOW.isoformat(),
            "return_at": arrival.isoformat(), "destination_mode_id": "default",
            "away_mode_id": "default", "preparing_entities": [self.entity]}
        with patch.object(runtime, "available", return_value=True), patch.object(
                self.scheduler, "_preconditioned_event_details", return_value=(NOW + timedelta(minutes=30), None)):
            runtime.refresh()
            self.assertIn(self.entity, runtime._temperature_only_suspensions)
            self.state.state = "heat"
            self.assertIsNone(runtime.target(self.entity, NOW))
            await runtime._tick(NOW, runtime._generation)
            self.assertEqual(runtime.episode["preparing_entities"], [])
            self.assertNotIn(self.entity, runtime._temperature_only_suspensions)
            self.assertIsNone(runtime.target(self.entity, NOW))
        runtime.stop()

    async def test_learning_expiry_does_not_record_passive_temperature_while_off(self):
        from custom_components.velair.scheduler import _PreconditioningSession
        self.data["zones"][self.entity]["preconditioning"] = {"enabled": True}
        session = _PreconditioningSession(
            entity_id=self.entity, direction="heat", started_at=NOW-timedelta(minutes=30),
            target_when=NOW, weekday="tuesday", start="00:00", target_temperature=21,
            target_kind="scalar", target_boundary="temperature", start_temperature=17,
            hvac_mode=None, startup_minutes=30, outdoor_temp_start=None, temperature_only=True)
        self.scheduler._preconditioning_sessions[self.entity] = session
        await self.scheduler._async_expire_preconditioning_sessions(NOW)
        self.assertEqual(self.data.get("preconditioning_learning", {}), {})
        self.assertEqual(self.scheduler._preconditioning_sessions, {})

    async def test_cancelled_or_arrived_return_drops_pending_suspension_timer(self):
        runtime = self.scheduler._planned_return
        arrival = NOW + timedelta(hours=1)
        episode = {"state": "away", "origin": "manual", "started_at": NOW.isoformat(),
                   "return_at": arrival.isoformat(), "destination_mode_id": "default",
                   "away_mode_id": "default", "preparing_entities": [self.entity]}
        self.data["planned_return_episode"] = episode
        with patch.object(runtime, "available", return_value=True):
            runtime.refresh()
            self.assertIn(self.entity, runtime._temperature_only_suspensions)
            episode["state"] = "cancelled"
            runtime.refresh()
            self.assertEqual(runtime._temperature_only_suspensions, set())
            episode["state"] = "away"
            episode["return_at"] = NOW.isoformat()
            runtime._temperature_only_suspensions.add(self.entity)
            runtime.refresh()
            self.assertEqual(runtime._temperature_only_suspensions, set())
            runtime._temperature_only_suspensions.add(self.entity)
            runtime.stop()
            self.assertEqual(runtime._temperature_only_suspensions, set())
