"""Boost return uses current Keep targets and survives interrupted delivery."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .helpers import (
    ACTION_SET_TEMPERATURE,
    EVENT_TYPE_BOOST_ENDED,
    EVENT_VELAIR,
    FakeHass,
    NOW,
    VelairScheduler,
    empty_week_schedule,
    normalize_schedule_data,
    scheduler_module,
)
from .test_climate_restore_delivery import _DelayedClimate
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.room_groups import build_group_candidate


class BoostReturnTests(unittest.IsolatedAsyncioTestCase):
    """Use real adapters, delayed observations, and persisted scheduler snapshots."""

    async def asyncSetUp(self):
        self.entity = "climate.room"
        self.now = NOW
        self.callbacks = []
        self.persisted = []
        self.schedulers = []
        self.target_modes = []
        self.device = _DelayedClimate("cool")
        self.device.reported.attributes.update(temperature=24, current_temperature=23)
        self.device.device = deepcopy(self.device.reported)
        self.hass = FakeHass()
        self.hass.config.units = SimpleNamespace(temperature_unit="°C")
        self.hass.states[self.entity] = self.device.reported
        self.hass.services = SimpleNamespace(async_call=self.route_service)
        self.device.hass = self.hass
        self.clock_patch = patch.object(scheduler_module.dt_util, "now", side_effect=lambda: self.now)
        self.clock_patch.start()
        self.listener_patch = patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            side_effect=self.track,
        )
        self.listener_patch.start()
        self.retry_patch = patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60, 60))
        self.retry_patch.start()
        schedule = empty_week_schedule()
        schedule["tuesday"] = [{"start": "17:00", "temperature": 20, "action": ACTION_SET_TEMPERATURE}]
        self.data = normalize_schedule_data({"zones": {self.entity: {
            "enabled": True, "schedule": schedule,
        }}}, [self.entity])
        self.make_scheduler()

    async def asyncTearDown(self):
        for scheduler in self.schedulers:
            await scheduler.async_stop()
        self.retry_patch.stop()
        self.listener_patch.stop()
        self.clock_patch.stop()

    def track(self, _hass, _entities, callback):
        self.callbacks.append(callback)
        return lambda: self.callbacks.remove(callback) if callback in self.callbacks else None

    async def save(self):
        self.persisted.append(deepcopy(self.data))

    async def route_service(self, domain, service, data, **kwargs):
        if domain == "climate":
            if service == "set_temperature":
                self.target_modes.append(self.device.device.state)
            await self.device.async_call(domain, service, data, **kwargs)

    def make_scheduler(self):
        self.manager = ClimateManager(self.hass)
        self.scheduler = VelairScheduler(self.hass, self.data, self.manager, self.save)
        self.schedulers.append(self.scheduler)

    async def drain(self):
        for _ in range(20):
            await asyncio.sleep(0)

    async def report(self):
        """Publish accepted physical actions through the existing state listener."""
        for observation in self.device.pending:
            previous = self.device.reported
            self.device.reported = observation
            self.hass.states[self.entity] = observation
            self.manager.owned_state_change_fields(self.entity, observation, previous)
            event = SimpleNamespace(data={"entity_id": self.entity, "old_state": previous,
                                          "new_state": observation})
            for callback in list(self.callbacks):
                callback(event)
        self.device.pending.clear()
        await self.drain()

    def block(self, **changes):
        return {"start": "17:00", "action": ACTION_SET_TEMPERATURE, "temperature": 20, **changes}

    async def begin_boost(self, *, mode="heat", temperature=22):
        await self.scheduler.async_set_zone_boost(
            self.entity, temperature, (self.now + timedelta(hours=1)).isoformat(), hvac_mode=mode,
        )
        await self.report()
        self.device.calls.clear()
        self.target_modes.clear()

    def target_calls(self):
        return [data for service, data, _context in self.device.calls if service == "set_temperature"]

    def pending(self):
        return self.data["zones"][self.entity].get("pending_boost_return")

    async def restart(self, *, apply_current_schedule):
        await self.scheduler.async_stop()
        self.data = normalize_schedule_data(deepcopy(self.persisted[-1]), [self.entity])
        self.make_scheduler()
        await self.scheduler.async_start(apply_current_schedule=apply_current_schedule)

    async def test_cancel_restores_saved_cooling_with_current_keep_target(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)

        self.assertEqual(self.device.device.state, "cool")
        self.assertEqual(self.target_calls(), [{"entity_id": self.entity, "temperature": 20}])
        self.assertEqual(self.device.device.attributes["temperature"], 20)
        self.assertIsNone(self.data["zones"][self.entity]["override"])
        self.assertIsNotNone(self.pending(), "An accepted command is not a reported confirmation")
        self.assertEqual(self.hass.states[self.entity].state, "heat")
        await self.report()
        self.assertIsNone(self.pending())

    async def test_heating_mode_and_current_target_are_restored_after_cooling_boost(self):
        self.device.reported.state = self.device.device.state = "heat"
        self.device.reported.attributes["temperature"] = 18.5
        self.device.device.attributes["temperature"] = 18.5
        await self.begin_boost(mode="cool", temperature=19)
        await self.scheduler.async_cancel_zone_boost(self.entity)

        self.assertEqual(self.device.device.state, "heat")
        self.assertEqual(self.target_calls(), [{"entity_id": self.entity, "temperature": 20}])

    async def test_expiration_applies_new_keep_block_not_pre_boost_temperature(self):
        self.data["zones"][self.entity]["schedule"]["tuesday"] = [
            self.block(start="17:00", temperature=18.5), self.block(start="19:00", temperature=16),
        ]
        await self.begin_boost()
        self.now += timedelta(hours=1, seconds=1)
        await self.scheduler._handle_timer(self.now)

        self.assertEqual(self.device.device.state, "cool")
        self.assertTrue(self.target_calls())
        self.assertTrue(all(call.get("temperature") == 16 for call in self.target_calls()))
        ended = [data for event, data in self.hass.bus.events
                 if event == EVENT_VELAIR and data.get("event") == EVENT_TYPE_BOOST_ENDED]
        self.assertEqual(len(ended), 1)

    async def test_native_heat_cool_band_uses_current_limits(self):
        self.device.reported.state = "heat_cool"
        self.device.reported.attributes.pop("temperature")
        self.device.reported.attributes.update(supported_features=18, target_temp_low=18, target_temp_high=26)
        self.device.device = deepcopy(self.device.reported)
        self.data["zones"][self.entity]["schedule"]["tuesday"] = [{
            "start": "17:00", "action": ACTION_SET_TEMPERATURE,
            "target_temp_low": 20, "target_temp_high": 24,
        }]
        await self.scheduler.async_set_zone_boost(
            self.entity, None, (self.now + timedelta(hours=1)).isoformat(),
            hvac_mode="heat_cool", target_temp_low=19, target_temp_high=25,
        )
        await self.report()
        self.device.calls.clear()
        await self.scheduler.async_cancel_zone_boost(self.entity)

        self.assertEqual(self.device.device.state, "heat_cool")
        self.assertEqual(self.target_calls(), [{"entity_id": self.entity,
                                              "target_temp_low": 20, "target_temp_high": 24}])

    async def test_current_block_options_override_saved_options_and_target_is_last(self):
        self.data["zones"][self.entity]["schedule"]["tuesday"] = [self.block(preset_mode="temporary")]
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)

        services = [service for service, _data, _context in self.device.calls]
        self.assertEqual(services[-1], "set_temperature")
        self.assertIn("set_preset_mode", services)
        self.assertEqual(self.device.device.attributes["preset_mode"], "temporary")
        self.assertEqual(self.device.device.attributes["temperature"], 20)

    async def same_mode_return_preserves_preset_and_confirms_mode(self, mode):
        self.device.reported.state = self.device.device.state = mode
        await self.begin_boost(mode=None)
        await self.scheduler.async_cancel_zone_boost(self.entity)

        self.assertEqual([service for service, _data, _context in self.device.calls], ["set_temperature"])
        self.assertEqual(self.device.device.attributes["preset_mode"], "permanent")
        self.assertEqual(self.target_calls(), [{"entity_id": self.entity, "temperature": 20}])
        self.assertIsNotNone(self.pending())
        self.device.pending.clear()

        async def publish(observed_mode):
            previous = self.hass.states[self.entity]
            observation = SimpleNamespace(state=observed_mode,
                attributes={**previous.attributes, "temperature": 20}, context=None)
            self.hass.states[self.entity] = self.device.reported = observation
            for callback in list(self.callbacks):
                callback(SimpleNamespace(data={"entity_id": self.entity, "old_state": previous,
                                               "new_state": observation}))
            await self.drain()

        await publish("cool" if mode == "heat" else "heat")
        self.assertIsNotNone(self.pending(), "Deduplicating the mode command must not omit mode confirmation")
        await publish(mode)
        self.assertIsNone(self.pending())

    async def test_same_heating_mode_return_preserves_preset_and_confirms_mode(self):
        await self.same_mode_return_preserves_preset_and_confirms_mode("heat")

    async def test_same_cooling_mode_return_preserves_preset_and_confirms_mode(self):
        await self.same_mode_return_preserves_preset_and_confirms_mode("cool")

    async def test_room_assist_return_uses_saved_direction_and_existing_correction(self):
        self.hass.states["sensor.room"] = SimpleNamespace(
            state="23", attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity]["preconditioning"].update(
            enabled=False, room_temperature_entity_id="sensor.room",
            room_sensor_assist_enabled=True, room_sensor_assist_max_delta=2,
        )
        await self.scheduler.async_apply_current_schedule(self.entity)
        normal_cooling_target = self.target_calls()[-1]["temperature"]
        await self.report()
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)

        self.assertEqual(self.device.device.state, "cool")
        self.assertEqual(self.target_calls()[-1]["temperature"], normal_cooling_target)
        self.assertNotEqual(normal_cooling_target, 20,
                            "The fixture must exercise an assisted rather than an unadjusted target")

    async def test_saved_off_uses_first_compatible_mode_not_current_boost_mode(self):
        self.device.reported.state = self.device.device.state = "off"
        self.device.reported.attributes["hvac_modes"] = ["off", "cool", "heat"]
        self.device.device.attributes["hvac_modes"] = ["off", "cool", "heat"]
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)

        self.assertEqual(self.device.device.state, "cool")
        self.assertEqual(self.device.device.attributes["temperature"], 20)

    async def test_return_is_persisted_atomically_before_any_return_command(self):
        await self.begin_boost()
        writes = []
        original = self.device.async_call

        async def verify_saved(domain, service, data, **kwargs):
            saved_zone = self.persisted[-1]["zones"][self.entity]
            self.assertIsNone(saved_zone["override"])
            self.assertIsNotNone(saved_zone.get("pending_boost_return"))
            writes.append(service)
            await original(domain, service, data, **kwargs)

        self.device.async_call = verify_saved
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.assertIn("set_temperature", writes)

    async def test_return_persist_failure_keeps_boost_and_sends_nothing(self):
        await self.begin_boost()
        original = deepcopy(self.data["zones"][self.entity]["override"])

        async def fail_save():
            raise OSError("disk unavailable")

        self.scheduler._async_save_data = fail_save
        with self.assertRaisesRegex(OSError, "disk unavailable"):
            await self.scheduler.async_cancel_zone_boost(self.entity)

        self.assertEqual(self.data["zones"][self.entity]["override"], original)
        self.assertIsNone(self.pending())
        self.assertFalse(self.device.calls)

    async def test_restart_after_acceptance_completes_return_with_startup_disabled(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.assertIsNotNone(self.pending())
        self.device.calls.clear()
        await self.restart(apply_current_schedule=False)

        self.assertEqual(self.device.device.state, "cool")
        self.assertEqual(self.target_calls()[-1]["temperature"], 20)
        self.assertIsNotNone(self.pending())
        await self.report()
        self.assertIsNone(self.pending())

    async def test_restart_after_acceptance_completes_return_with_startup_enabled(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.device.calls.clear()
        await self.restart(apply_current_schedule=True)

        self.assertEqual(self.device.device.state, "cool")
        self.assertEqual(self.target_calls()[-1]["temperature"], 20)
        await self.report()
        self.assertIsNone(self.pending())

    async def test_restart_during_boost_preserves_original_mode_until_cancel(self):
        await self.begin_boost()
        await self.restart(apply_current_schedule=True)
        await self.report()
        self.device.calls.clear()
        await self.scheduler.async_cancel_zone_boost(self.entity)

        self.assertEqual(self.device.device.state, "cool")
        self.assertEqual(self.target_calls()[-1]["temperature"], 20)

    async def restart_after_boost_expired_while_stopped(self, apply_current_schedule):
        await self.begin_boost()
        self.now += timedelta(hours=1, seconds=1)
        await self.restart(apply_current_schedule=apply_current_schedule)
        await self.scheduler._handle_timer(self.now)
        await self.drain()

        self.assertEqual(self.device.device.state, "cool")
        self.assertTrue(self.target_calls())
        self.assertTrue(all(call.get("temperature") == 20 for call in self.target_calls()))
        self.assertTrue(all(mode == "cool" for mode in self.target_modes),
                        "Startup must not apply Keep in the lingering temporary Boost mode")

    async def test_expired_while_stopped_returns_with_startup_enabled(self):
        await self.restart_after_boost_expired_while_stopped(True)

    async def test_expired_while_stopped_returns_with_startup_disabled(self):
        await self.restart_after_boost_expired_while_stopped(False)

    async def test_restart_between_mode_and_temperature_completes_current_target(self):
        await self.begin_boost()
        self.device.fail_service = "set_temperature"
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.assertIsNotNone(self.pending())
        self.assertEqual(self.device.device.state, "cool")
        self.device.fail_service = None
        self.device.calls.clear()
        await self.restart(apply_current_schedule=False)

        self.assertEqual(self.target_calls()[-1]["temperature"], 20)
        await self.report()
        self.assertIsNone(self.pending())

    async def test_restart_resolves_latest_keep_target_instead_of_frozen_target(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.persisted[-1]["zones"][self.entity]["schedule"]["tuesday"] = [self.block(temperature=19)]
        self.device.calls.clear()
        await self.restart(apply_current_schedule=False)

        self.assertEqual(self.device.device.state, "cool")
        self.assertEqual(self.target_calls()[-1]["temperature"], 19)

    async def test_new_pause_clears_pending_return_and_restart_does_not_restore_it(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        await self.scheduler.async_pause_zone(self.entity)
        self.assertIsNone(self.pending())
        self.device.calls.clear()
        await self.restart(apply_current_schedule=False)
        self.assertFalse(self.device.calls)

    async def test_new_boost_replaces_pending_return(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        await self.scheduler.async_set_zone_boost(
            self.entity, 23, (self.now + timedelta(hours=2)).isoformat(), hvac_mode="heat",
        )
        self.assertIsNone(self.pending())
        self.assertEqual(self.data["zones"][self.entity]["override"]["temperature"], 23)

    async def test_manual_target_supersedes_pending_return(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        await self.scheduler.async_set_temperature(self.entity, 25, hvac_mode="heat")
        self.assertIsNone(self.pending())
        self.assertEqual(self.device.device.attributes["temperature"], 25)

    async def test_explicit_block_supersedes_saved_mode_before_next_keep(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.data["zones"][self.entity]["schedule"]["tuesday"] = [self.block(hvac_mode="heat", temperature=21)]
        await self.scheduler.async_apply_current_schedule(self.entity)
        self.assertIsNone(self.pending())
        self.data["zones"][self.entity]["schedule"]["tuesday"] = [self.block(temperature=19)]
        await self.scheduler.async_apply_current_schedule(self.entity)

        self.assertEqual(self.device.device.state, "heat")
        self.assertEqual(self.target_calls()[-1]["temperature"], 19)

    async def test_explicit_block_at_restart_retires_saved_mode_before_next_keep(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.persisted[-1]["zones"][self.entity]["schedule"]["tuesday"] = [
            self.block(hvac_mode="heat", temperature=21),
        ]
        await self.restart(apply_current_schedule=False)
        self.assertEqual(self.device.device.state, "heat")
        self.assertEqual(self.target_calls()[-1]["temperature"], 21)

        # The explicit block owns the mode even before its delivery is reported.
        self.data["zones"][self.entity]["schedule"]["tuesday"] = [self.block(temperature=19)]
        await self.scheduler.async_apply_current_schedule(self.entity)
        self.assertEqual(self.device.device.state, "heat")
        self.assertEqual(self.target_calls()[-1]["temperature"], 19)

    async def test_unavailable_return_waits_for_reconnect_without_losing_saved_mode(self):
        await self.begin_boost()
        previous = self.hass.states[self.entity]
        unavailable = SimpleNamespace(state="unavailable", attributes=dict(previous.attributes))
        self.hass.states[self.entity] = unavailable
        for callback in list(self.callbacks):
            callback(SimpleNamespace(data={"entity_id": self.entity, "old_state": previous,
                                           "new_state": unavailable}))
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.assertIsNotNone(self.pending())
        self.assertFalse(self.device.calls)

        self.hass.states[self.entity] = previous
        for callback in list(self.callbacks):
            callback(SimpleNamespace(data={"entity_id": self.entity, "old_state": unavailable,
                                           "new_state": previous}))
        await self.drain()

        self.assertEqual(self.device.device.state, "cool")
        self.assertEqual(self.target_calls()[-1]["temperature"], 20)
        await self.report()
        self.assertIsNone(self.pending())

    async def test_unavailable_return_re_resolves_keep_target_and_event_on_reconnect(self):
        await self.begin_boost()
        previous = self.hass.states[self.entity]
        unavailable = SimpleNamespace(state="unavailable", attributes=dict(previous.attributes))
        self.hass.states[self.entity] = unavailable
        for callback in list(self.callbacks):
            callback(SimpleNamespace(data={"entity_id": self.entity, "old_state": previous,
                                           "new_state": unavailable}))
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.data["zones"][self.entity]["schedule"]["tuesday"] = [self.block(temperature=19)]
        self.scheduler._prepare_runtime_projection(configuration=True)
        self.hass.states[self.entity] = previous
        for callback in list(self.callbacks):
            callback(SimpleNamespace(data={"entity_id": self.entity, "old_state": unavailable,
                                           "new_state": previous}))
        await self.drain()

        self.assertEqual(self.device.device.state, "cool")
        self.assertEqual(self.target_calls(), [{"entity_id": self.entity, "temperature": 19}])
        ended = [data for event, data in self.hass.bus.events
                 if event == EVENT_VELAIR and data.get("event") == EVENT_TYPE_BOOST_ENDED]
        self.assertEqual(len(ended), 1)
        self.assertEqual(ended[0]["restoration"]["target"]["temperature"], 19)

    async def test_explicit_block_on_reconnect_retires_saved_mode_before_next_keep(self):
        await self.begin_boost()
        previous = self.hass.states[self.entity]
        unavailable = SimpleNamespace(state="unavailable", attributes=dict(previous.attributes))
        self.hass.states[self.entity] = unavailable
        for callback in list(self.callbacks):
            callback(SimpleNamespace(data={"entity_id": self.entity, "old_state": previous,
                                           "new_state": unavailable}))
        await self.scheduler.async_cancel_zone_boost(self.entity)
        self.data["zones"][self.entity]["schedule"]["tuesday"] = [
            self.block(hvac_mode="heat", temperature=21),
        ]
        self.scheduler._prepare_runtime_projection(configuration=True)
        self.hass.states[self.entity] = previous
        for callback in list(self.callbacks):
            callback(SimpleNamespace(data={"entity_id": self.entity, "old_state": unavailable,
                                           "new_state": previous}))
        await self.drain()
        self.assertEqual(self.device.device.state, "heat")

        self.data["zones"][self.entity]["schedule"]["tuesday"] = [self.block(temperature=19)]
        await self.scheduler.async_apply_current_schedule(self.entity)
        self.assertEqual(self.device.device.state, "heat")
        self.assertEqual(self.target_calls()[-1]["temperature"], 19)

    async def test_global_pause_supersedes_pending_return_across_restart(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        await self.scheduler.async_set_mode("paused", apply_current_schedule=False)
        self.assertIsNone(self.pending())
        self.device.calls.clear()
        await self.restart(apply_current_schedule=True)
        self.assertFalse(self.device.calls)

    async def test_missing_saved_mode_fails_without_inventing_a_mode(self):
        await self.begin_boost()
        self.data["zones"][self.entity]["override"]["previous_state"].pop("hvac_mode")
        with self.assertRaises(ValueError):
            await self.scheduler.async_cancel_zone_boost(self.entity)
        self.assertFalse(self.device.calls)
        self.assertIsNotNone(self.pending())

    async def test_unsupported_saved_mode_fails_before_any_return_command(self):
        await self.begin_boost()
        self.hass.states[self.entity].attributes["hvac_modes"] = ["off", "heat"]
        with self.assertRaises(ValueError):
            await self.scheduler.async_cancel_zone_boost(self.entity)
        self.assertFalse(self.device.calls)
        self.assertIsNotNone(self.pending())

    async def test_confirmation_cleanup_failure_does_not_repeat_physical_delivery(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        calls = deepcopy(self.device.calls)

        async def fail_save():
            raise OSError("cannot save cleanup")

        self.scheduler._async_save_data = fail_save
        await self.report()
        await self.drain()
        self.assertEqual(self.device.calls, calls)

    async def test_serialized_assisted_target_preserves_return_mode_confirmation(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        await self.scheduler._climate_delivery.async_serialize(
            self.entity, lambda: self.manager.async_set_temperature(self.entity, 21),
        )
        self.device.pending.clear()

        async def publish(mode):
            previous = self.hass.states[self.entity]
            observation = SimpleNamespace(state=mode,
                attributes={**previous.attributes, "temperature": 21}, context=None)
            self.hass.states[self.entity] = observation
            for callback in list(self.callbacks):
                callback(SimpleNamespace(data={"entity_id": self.entity, "old_state": previous,
                                               "new_state": observation}))
            await self.drain()

        await publish("heat")
        self.assertIsNotNone(self.pending(), "A new target alone cannot confirm the saved return mode")
        await publish("cool")
        self.assertIsNone(self.pending())

    async def test_return_restart_does_not_duplicate_boost_ended_event(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        before = [data for event, data in self.hass.bus.events
                  if event == EVENT_VELAIR and data.get("event") == EVENT_TYPE_BOOST_ENDED]
        self.assertEqual(len(before), 1)
        await self.restart(apply_current_schedule=False)
        await self.report()
        after = [data for event, data in self.hass.bus.events
                 if event == EVENT_VELAIR and data.get("event") == EVENT_TYPE_BOOST_ENDED]
        self.assertEqual(len(after), 1)

    async def test_old_confirmation_cannot_clear_newer_pending_return(self):
        await self.begin_boost()
        await self.scheduler.async_cancel_zone_boost(self.entity)
        old = deepcopy(self.pending())
        await self.report()
        await self.begin_boost()
        self.data["zones"][self.entity]["schedule"]["tuesday"] = [self.block(temperature=19)]
        await self.scheduler.async_cancel_zone_boost(self.entity)
        current = deepcopy(self.pending())
        self.assertNotEqual(old["id"], current["id"])

        # Publishing unrelated old target evidence must not complete the new handoff.
        old_state = self.hass.states[self.entity]
        stale = SimpleNamespace(state="cool", attributes={**old_state.attributes, "temperature": 20})
        self.hass.states[self.entity] = stale
        for callback in list(self.callbacks):
            callback(SimpleNamespace(data={"entity_id": self.entity, "old_state": old_state,
                                           "new_state": stale}))
        await self.drain()
        self.assertEqual(self.pending()["id"], current["id"])


class BoostReturnGroupTests(unittest.IsolatedAsyncioTestCase):
    async def test_partial_group_return_survives_restart_until_every_member_confirms(self):
        members = ["climate.one", "climate.two"]
        devices = {member: _DelayedClimate("cool") for member in members}
        hass = FakeHass()
        hass.config.units = SimpleNamespace(temperature_unit="°C")
        callbacks = []
        persisted = []
        schedulers = []
        for member, device in devices.items():
            device.reported.attributes.update(temperature=24, current_temperature=23)
            device.device = deepcopy(device.reported)
            hass.states[member] = device.reported

        async def route(domain, service, payload, **kwargs):
            if domain == "climate":
                await devices[payload["entity_id"]].async_call(domain, service, payload, **kwargs)

        hass.services = SimpleNamespace(async_call=route)
        group = {"id": "group.room", "name": "Room", "members": members,
                 "temperature_entity_id": members[0], "delivery_mode": "all"}
        data, _ = build_group_candidate(normalize_schedule_data(None, members), members, group, members[0])
        data["zones"]["group.room"]["schedule"]["tuesday"] = [
            {"start": "17:00", "action": ACTION_SET_TEMPERATURE, "temperature": 20},
        ]

        async def save():
            persisted.append(deepcopy(data))

        async def report():
            for member, device in devices.items():
                for observation in device.pending:
                    previous = hass.states[member]
                    hass.states[member] = device.reported = observation
                    manager.owned_state_change_fields(member, observation, previous)
                    for callback in list(callbacks):
                        callback(SimpleNamespace(data={"entity_id": member, "old_state": previous,
                                                       "new_state": observation}))
                device.pending.clear()
            for _ in range(20):
                await asyncio.sleep(0)

        def track(_hass, _entities, callback):
            callbacks.append(callback)
            return lambda: callbacks.remove(callback) if callback in callbacks else None

        with patch("custom_components.velair.climate_delivery.async_track_state_change_event", track), \
                patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60, 60)):
            try:
                manager = ClimateManager(hass)
                scheduler = VelairScheduler(hass, data, manager, save)
                schedulers.append(scheduler)
                await scheduler.async_set_zone_boost("group.room", 22,
                    (NOW + timedelta(hours=1)).isoformat(), hvac_mode="heat")
                await report()
                devices[members[1]].fail_service = "set_temperature"
                await scheduler.async_cancel_zone_boost("group.room")
                self.assertIsNotNone(data["zones"]["group.room"].get("pending_boost_return"))
                self.assertEqual(devices[members[0]].device.attributes["temperature"], 20)

                await scheduler.async_stop()
                data = normalize_schedule_data(deepcopy(persisted[-1]), members)
                devices[members[1]].fail_service = None
                manager = ClimateManager(hass)
                scheduler = VelairScheduler(hass, data, manager, save)
                schedulers.append(scheduler)
                await scheduler.async_start(apply_current_schedule=False)
                for device in devices.values():
                    self.assertEqual(device.device.state, "cool")
                    self.assertEqual(device.device.attributes["temperature"], 20)
                self.assertIsNotNone(data["zones"]["group.room"].get("pending_boost_return"))
                await report()
                self.assertIsNone(data["zones"]["group.room"].get("pending_boost_return"))
            finally:
                for scheduler in schedulers:
                    await scheduler.async_stop()

