"""Room Assist thermostat targets are distinct from physical and scheduled targets."""

import asyncio
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import (
    EVENT_TYPE_BOOST_ENDED, EVENT_TYPE_CLIMATE_TARGET_APPLIED, EVENT_VELAIR,
    FakeClimateManager, FakeHass, NOW, VelairScheduler, normalize_schedule_data,
    scheduler_module,
)
from custom_components.velair import climate_delivery
from custom_components.velair.delivery_guard import check_delivery
from custom_components.velair.models import empty_week_schedule, serialize_schedule_data


class RoomAssistClimateTests(unittest.IsolatedAsyncioTestCase):
    room = "climate.radiator"
    sensor = "sensor.room"

    def setUp(self):
        self.now = NOW
        clock = patch.object(scheduler_module.dt_util, "now", side_effect=lambda: self.now)
        clock.start()
        self.addCleanup(clock.stop)
        self.hass = FakeHass()
        self.hass.states[self.room] = SimpleNamespace(
            state="heat", attributes={"current_temperature": 21, "temperature": 19},
        )
        self.hass.states[self.sensor] = SimpleNamespace(state="17", attributes={"unit_of_measurement": "°C"})
        self.climate = FakeClimateManager()
        self.climate.steps[self.room] = 0.5
        self.climate.limits[self.room] = (5, 35)
        self.climate.current_hvac_modes[self.room] = "heat"
        self.data = normalize_schedule_data({"zones": {self.room: {
            "schedule": {"tuesday": [{"start": start, "temperature": 19, "hvac_mode": "heat"}
                                     for start in ("17:00", "19:00")]},
            "preconditioning": {"room_temperature_entity_id": self.sensor, "room_sensor_assist_enabled": True},
        }}}, [self.room])
        self.save = AsyncMock()
        self.delivery_statuses = []
        coordinator = climate_delivery.ClimateDeliveryCoordinator(
            self.hass, lambda _, status, details: self.delivery_statuses.append(status),
        )
        self.scheduler = VelairScheduler(self.hass, self.data, self.climate, self.save, climate_delivery=coordinator)

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    async def opt_in(self):
        await self.scheduler.async_update_zone_preconditioning(self.room, {"room_assist_climate_enabled": True})

    async def test_room_target_survives_reload_and_expires_at_same_temperature_block(self):
        self.assertEqual(self.scheduler.room_assist_climate_zones(), {})
        await self.opt_in()
        self.assertEqual(set(self.scheduler.room_assist_climate_zones()), {self.room})
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 19))
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20.2)
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 20))
        self.assertEqual(self.scheduler.get_room_sensor_assist_status(self.room)["target_temperature"], 20)
        self.assertEqual(self.climate.calls[-1][:5], ("set_temperature", self.room, 23, False, None))
        self.assertEqual(self.scheduler.get_active_overrides(), {})
        self.assertEqual([block["temperature"] for block in self.data["zones"][self.room]["schedule"]["tuesday"]], [19, 19])
        save_count = self.save.await_count
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20)
        self.assertEqual(self.save.await_count, save_count)

        stored = deepcopy(serialize_schedule_data(self.data))
        await self.scheduler.async_stop()
        self.data = normalize_schedule_data(stored, [self.room])
        self.scheduler = VelairScheduler(self.hass, self.data, self.climate, self.save)
        await self.scheduler.async_start()
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 20))
        self.assertEqual(self.climate.calls[-1][:5], ("set_temperature", self.room, 23, False, None))
        self.now += timedelta(hours=1)
        await self.scheduler._handle_timer(self.now)
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 19))
        self.assertEqual(self.scheduler.get_room_sensor_assist_status(self.room)["target_temperature"], 19)
        self.assertTrue(self.climate.calls[-1][3])

    def applied_temperatures(self):
        return [data["temperature"] for event, data in self.hass.bus.events
                if event == EVENT_VELAIR and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED]

    async def test_keep_boost_return_with_sensor_loss_sends_nominal_target(self):
        blocks = [{"start": start, "temperature": 19} for start in ("17:00", "19:00")]
        await self.scheduler.async_set_daily_schedule(self.room, "tuesday", blocks)
        self.climate.snapshots[self.room] = {"hvac_mode": "heat", "temperature": 19}
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20)
        await self.scheduler.async_set_zone_boost(
            self.room, 24, (self.now + timedelta(minutes=40)).isoformat(), hvac_mode="heat",
        )
        self.hass.states[self.sensor].state = "unavailable"
        self.climate.calls.clear()
        self.hass.bus.events.clear()

        await self.scheduler.async_cancel_zone_boost(self.room)

        self.assertEqual(self.climate.calls, [("set_temperature", self.room, 19, True, "heat")])
        self.assertEqual(self.applied_temperatures(), [19])
        self.assertTrue(any(data.get("event") == EVENT_TYPE_BOOST_ENDED for _, data in self.hass.bus.events))

    async def assert_moved_boundary(self, boundary):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20)
        persisted = []
        self.save.side_effect = lambda: persisted.append(deepcopy(serialize_schedule_data(self.data)))
        await self.scheduler.async_set_daily_schedule(self.room, "tuesday", [
            {"start": "17:00", "temperature": 19, "hvac_mode": "heat"},
            {"start": boundary, "temperature": 24, "hvac_mode": "heat"},
        ])
        # The first durable schedule save must already contain the new deadline.
        expected = self.now.replace(hour=int(boundary[:2]), minute=int(boundary[3:]))
        self.assertEqual(persisted[0]["zones"][self.room]["room_assist_target_override"]["until"], expected.isoformat())
        self.now = expected - timedelta(minutes=1)
        self.climate.calls.clear()
        self.hass.states[self.sensor].state = "23"
        self.hass.states[self.room].attributes["current_temperature"] = 26
        self.assertTrue(await self.scheduler.async_apply_current_schedule(self.room))
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (23, 20))
        self.assertLess(self.climate.calls[-1][2], 26)  # Withdraw heat for the held target.
        self.now = expected
        self.climate.calls.clear()
        await self.scheduler._handle_timer(self.now)
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (23, 24))
        self.assertGreater(self.climate.calls[-1][2], 26)  # Heat for the next block.
        self.assertEqual(self.applied_temperatures()[-1], 24)

    async def test_hold_follows_next_block_moved_later(self):
        await self.assert_moved_boundary("20:00")

    async def test_hold_follows_next_block_moved_earlier(self):
        await self.assert_moved_boundary("18:30")

    async def test_only_the_effective_profile_schedule_rebases_the_hold(self):
        def profile(next_start):
            schedule = empty_week_schedule()
            schedule["tuesday"] = [
                {"start": start, "temperature": 19, "hvac_mode": "heat"}
                for start in ("17:00", next_start)
            ]
            return {"key": "active", "name": "Active", "zones": {
                self.room: {"behavior": "schedule", "schedule": schedule},
            }}

        await self.scheduler.async_set_profile(profile("19:00"))
        await self.scheduler.async_activate_profile("active")
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20)
        await self.scheduler.async_set_daily_schedule(self.room, "tuesday", [
            {"start": "17:00", "temperature": 19, "hvac_mode": "heat"},
            {"start": "18:30", "temperature": 19, "hvac_mode": "heat"},
        ])
        persisted = self.data["zones"][self.room]["room_assist_target_override"]
        self.assertEqual(persisted["until"], self.now.replace(hour=19).isoformat())
        await self.scheduler.async_set_profile(profile("20:00"))
        self.now += timedelta(hours=1, minutes=5)
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 20))
        self.assertTrue(await self.scheduler.async_apply_current_schedule(self.room))
        self.assertEqual(self.applied_temperatures()[-1], 20)

    async def assert_preparation_rearmed(self, *, opt_out):
        await self.scheduler.async_update_zone_preconditioning(self.room, {
            "enabled": True, "max_lead_minutes": 35,
        })
        await self.opt_in()
        preparation = self.now + timedelta(minutes=25)
        arrival = self.now + timedelta(hours=1)
        with patch.object(scheduler_module, "async_track_point_in_time", return_value=lambda: None) as track:
            self.scheduler.async_schedule_next_event()
            self.assertEqual(track.call_args.args[-1], preparation)
            self.assertEqual(self.scheduler.get_next_effective_events()[0]["when"], preparation)
            await self.scheduler.async_set_room_assist_climate_temperature(self.room, 14)
            self.assertEqual(track.call_args.args[-1], arrival)
            self.assertEqual(self.scheduler.get_next_event_for_zone(self.room).when, arrival)
            self.assertEqual(self.scheduler.calculate_next_event(self.now).when, arrival)
            self.assertIsNone(self.scheduler.get_next_event_for_zone(self.room).target_when)
            self.assertEqual(self.scheduler.get_next_effective_events()[0]["when"], arrival)

            if opt_out:
                await self.scheduler.async_update_zone_preconditioning(self.room, {"room_assist_climate_enabled": False})
            else:
                await self.scheduler.async_set_room_assist_climate_temperature(self.room, 19)
            self.assertNotIn("room_assist_target_override", self.data["zones"][self.room])
            self.assertEqual(track.call_args.args[-1], preparation)
            self.assertEqual(self.scheduler.get_next_event_for_zone(self.room).when, preparation)
            self.assertEqual(self.scheduler.get_next_event_for_zone(self.room).target_when, arrival)
            self.assertEqual(self.scheduler.calculate_next_event(self.now).when, preparation)
            self.assertEqual(self.scheduler.get_next_effective_events()[0]["when"], preparation)
            self.now = preparation
            await track.call_args.args[1](preparation)
            self.assertEqual(self.applied_temperatures()[-1], 19)

    async def test_opt_out_rearms_preparation_and_updates_next_event_preview(self):
        await self.assert_preparation_rearmed(opt_out=True)

    async def test_setting_nominal_target_releases_hold_and_rearms_preparation(self):
        await self.assert_preparation_rearmed(opt_out=False)

    async def test_moving_next_block_before_now_replaces_the_hold_immediately(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20)
        self.hass.states[self.sensor].state = "23"
        self.climate.calls.clear()
        await self.scheduler.async_set_daily_schedule(self.room, "tuesday", [
            {"start": "17:00", "temperature": 19, "hvac_mode": "heat"},
            {"start": "17:45", "temperature": 24, "hvac_mode": "heat"},
        ])
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (23, 24))
        self.assertGreater(self.climate.calls[-1][2], 21)
        self.assertEqual(self.applied_temperatures()[-1], 24)

    async def test_failed_schedule_edit_keeps_original_deadline(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20)
        self.save.side_effect = OSError("write failed")
        with self.assertRaisesRegex(OSError, "write failed"):
            await self.scheduler.async_set_daily_schedule(self.room, "tuesday", [
                {"start": "17:00", "temperature": 19, "hvac_mode": "heat"},
                {"start": "20:00", "temperature": 24, "hvac_mode": "heat"},
            ])
        self.now += timedelta(hours=1)
        await self.scheduler._handle_timer(self.now)
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 19))

    async def test_expired_hold_does_not_revive_if_next_block_moves_later(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20)
        self.now += timedelta(hours=1, minutes=5)
        await self.scheduler._handle_timer(self.now)
        await self.scheduler.async_set_daily_schedule(self.room, "tuesday", [
            {"start": "17:00", "temperature": 19, "hvac_mode": "heat"},
            {"start": "20:00", "temperature": 24, "hvac_mode": "heat"},
        ])
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 19))
        self.assertNotIn("room_assist_target_override", self.data["zones"][self.room])

    async def test_nominal_fallback_does_not_commit_after_block_changes_in_flight(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20)
        self.hass.states[self.sensor].state = "unavailable"
        set_temperature = self.climate.async_set_temperature

        async def accept_then_cross_boundary(*args, **kwargs):
            await set_temperature(*args, **kwargs)
            self.now += timedelta(hours=1)

        with patch.object(self.climate, "async_set_temperature", side_effect=accept_then_cross_boundary):
            self.assertFalse(await self.scheduler.async_apply_current_schedule(self.room))
        self.assertEqual(self.applied_temperatures(), [])

    async def test_sensor_loss_uses_nominal_device_target_not_room_override(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20)
        self.hass.states[self.sensor].state = "unavailable"
        self.climate.calls.clear()
        self.assertTrue(await self.scheduler.async_apply_current_schedule(self.room))
        self.assertEqual(self.applied_temperatures(), [19])
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (None, None))
        self.assertEqual(self.climate.calls[-1][:5], ("set_temperature", self.room, 19, True, "heat"))
        with self.assertRaisesRegex(ValueError, "heating schedule block"):
            await self.scheduler.async_set_room_assist_climate_temperature(self.room, 21)
        self.hass.states[self.sensor].state = "18"
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (18, 20))

    async def opt_out(self):
        return await self.scheduler.async_update_zone_preconditioning(self.room, {"room_assist_climate_enabled": False})

    def turn_equipment_off(self):
        self.hass.states[self.room].state = "off"
        self.climate.current_hvac_modes[self.room] = "off"

    async def test_opt_out_restores_temperature_only_without_turning_off_assist(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 14)
        self.climate.calls.clear()
        await self.opt_out()
        self.assertEqual(len(self.climate.calls), 1)
        self.assert_temperature_only(self.climate.calls[0], 23)
        self.assertEqual(self.scheduler.room_assist_climate_zones(), {})
        self.assertEqual(self.scheduler.get_room_sensor_assist_status(self.room)["target_temperature"], 19)
        await self.opt_in()
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 19))

    async def test_opt_out_does_not_restore_when_equipment_switches_off_during_save(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 14)
        self.climate.calls.clear()
        self.save.side_effect = self.turn_equipment_off
        await self.opt_out()
        self.assertEqual(self.hass.states[self.room].state, "off")
        self.assertEqual(self.scheduler.room_assist_climate_zones(), {})
        self.assertEqual(self.climate.calls, [])

    async def test_opt_out_combined_with_assist_settings_never_restores_mode(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 14)
        self.climate.calls.clear()
        self.save.side_effect = self.turn_equipment_off
        await self.scheduler.async_update_zone_preconditioning(self.room, {
            "room_assist_climate_enabled": False, "room_sensor_assist_deadband": 0.5,
        })
        self.assertEqual(self.scheduler.room_assist_climate_zones(), {})
        self.assertEqual(self.climate.calls, [])

    async def test_opt_out_checks_mode_at_physical_delivery(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 14)
        self.climate.calls.clear()
        original = self.climate.async_set_temperature

        async def switch_off_before_service(*args, **kwargs):
            self.turn_equipment_off()
            check_delivery()  # The real climate manager checks at the service boundary.
            await original(*args, **kwargs)

        with patch.object(self.climate, "async_set_temperature", side_effect=switch_off_before_service) as write:
            await self.opt_out()
            write.assert_awaited_once()
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.scheduler.room_assist_climate_zones(), {})

    def assert_temperature_only(self, call, temperature):
        operation, entity, target, ensure_on, mode, options = call
        self.assertEqual((operation, entity, target, ensure_on, mode),
                         ("set_temperature", self.room, temperature, False, None))
        self.assertEqual({key: value for key, value in options.items() if value is not None}, {"temperature_only": True})

    async def assert_recovery(self, *, opt_out, repeat):
        await self.opt_in()
        await self.scheduler.async_apply_current_schedule(self.room)

        async def set_hold():
            await self.scheduler.async_set_room_assist_climate_temperature(self.room, 14)

        if opt_out:
            await set_hold()
        self.climate.calls.clear()
        action = self.opt_out if opt_out else set_hold
        expected = 19 if opt_out else 14
        statuses = self.delivery_statuses
        original = self.climate.async_set_temperature
        delivered = asyncio.Event()
        first = True

        async def fail_first_write(*args, **kwargs):
            nonlocal first
            if first:
                first = False
                raise scheduler_module.HomeAssistantError("climate unavailable")
            await original(*args, **kwargs)
            delivered.set()

        with (
            patch.object(climate_delivery, "RETRY_DELAYS", (60,) if repeat else (0,)),
            patch.object(self.climate, "async_set_temperature", side_effect=fail_first_write) as write,
        ):
            # A physical error is reported as delivery failure/retry, not as
            # failure of the committed settings operation.
            with self.assertLogs(climate_delivery.__name__, level="WARNING"):
                await action()
            save_count = self.save.await_count
            self.assertEqual("failed", statuses[-1])
            self.assertEqual(self.climate.calls, [])
            self.assertEqual(self.scheduler.room_assist_climate_zones(), {} if opt_out else {self.room: self.room})
            if not opt_out:
                self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, expected))
            if repeat:
                await action()
            else:
                await asyncio.wait_for(delivered.wait(), timeout=1)
                self.assertIn("retrying", statuses)
            self.assertEqual(statuses[-1], "success")
            self.assertEqual(self.scheduler.get_room_sensor_assist_status(self.room)["target_temperature"], expected)
            self.assert_temperature_only(self.climate.calls[-1], 23 if opt_out else 14)
            await action()
            self.assertEqual(self.save.await_count, save_count)
            self.assertEqual(write.await_count, 2)

    async def test_hold_recovers_after_failed_delivery(self):
        await self.assert_recovery(opt_out=False, repeat=False)

    async def test_opt_out_recovers_after_failed_delivery(self):
        await self.assert_recovery(opt_out=True, repeat=False)

    async def test_repeating_failed_hold_reconciles_without_resaving(self):
        await self.assert_recovery(opt_out=False, repeat=True)

    async def test_repeating_failed_opt_out_reconciles_without_resaving(self):
        await self.assert_recovery(opt_out=True, repeat=True)

    async def test_opt_out_supersedes_a_failed_hold_even_if_the_write_may_have_landed(self):
        await self.opt_in()
        await self.scheduler.async_apply_current_schedule(self.room)
        self.climate.calls.clear()
        original = self.climate.async_set_temperature

        async def accept_then_fail(*args, **kwargs):
            await original(*args, **kwargs)
            raise scheduler_module.HomeAssistantError("uncertain delivery")

        with patch.object(climate_delivery, "RETRY_DELAYS", (0,)):
            with patch.object(self.climate, "async_set_temperature", side_effect=accept_then_fail):
                with self.assertLogs(climate_delivery.__name__, level="WARNING"):
                    await self.scheduler.async_set_room_assist_climate_temperature(self.room, 14)
            await self.opt_out()
            await asyncio.sleep(0)
            await asyncio.sleep(0)
        self.assertEqual([call[2] for call in self.climate.calls], [14, 23])
        self.assertEqual(self.scheduler.get_room_sensor_assist_status(self.room)["target_temperature"], 19)

    async def test_new_hold_supersedes_failed_opt_out(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 14)
        self.climate.calls.clear()
        with patch.object(climate_delivery, "RETRY_DELAYS", (0,)):
            with patch.object(self.climate, "async_set_temperature", side_effect=scheduler_module.HomeAssistantError("offline")):
                with self.assertLogs(climate_delivery.__name__, level="WARNING"):
                    await self.opt_out()
            await self.opt_in()
            await self.scheduler.async_set_room_assist_climate_temperature(self.room, 15)
            await asyncio.sleep(0)
            await asyncio.sleep(0)
        self.assertEqual(len(self.climate.calls), 1)
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 15))
        self.assertEqual(self.scheduler.get_room_sensor_assist_status(self.room)["target_temperature"], 15)

    async def test_opt_out_retry_rechecks_current_mode(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 14)
        self.climate.calls.clear()
        with (
            patch.object(climate_delivery, "RETRY_DELAYS", (0,)),
            patch.object(self.climate, "async_set_temperature", side_effect=scheduler_module.HomeAssistantError("offline")) as write,
        ):
            with self.assertLogs(climate_delivery.__name__, level="WARNING"):
                await self.opt_out()
            self.turn_equipment_off()
            await asyncio.sleep(0)
            await asyncio.sleep(0)
            self.assertEqual(self.delivery_statuses[-1], "cancelled")
            write.assert_awaited_once()
        self.assertEqual(self.climate.calls, [])

    async def test_opt_out_fences_a_hold_waiting_at_the_service_boundary(self):
        await self.opt_in()
        writing = asyncio.Event()
        release = asyncio.Event()
        saved = asyncio.Event()
        original = self.climate.async_set_temperature

        async def delay_hold(*args, **kwargs):
            if args[1] == 14:
                writing.set()
                await release.wait()
            check_delivery()
            await original(*args, **kwargs)

        with patch.object(self.climate, "async_set_temperature", side_effect=delay_hold):
            hold = asyncio.create_task(self.scheduler.async_set_room_assist_climate_temperature(self.room, 14))
            await asyncio.wait_for(writing.wait(), timeout=1)
            self.save.side_effect = saved.set
            opt_out = asyncio.create_task(self.opt_out())
            try:
                await asyncio.wait_for(saved.wait(), timeout=1)
            finally:
                release.set()
                await asyncio.gather(hold, opt_out)
        self.assertEqual(len(self.climate.calls), 1)
        self.assert_temperature_only(self.climate.calls[0], 23)
        self.assertEqual(self.scheduler.room_assist_climate_zones(), {})

    async def test_failed_opt_out_save_keeps_hold_and_does_not_write(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 14)
        self.climate.calls.clear()
        self.save.side_effect = OSError("write failed")
        with self.assertRaisesRegex(OSError, "write failed"):
            await self.opt_out()
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 14))
        self.assertEqual(self.climate.calls, [])

    async def test_rejects_non_heating_and_invalid_targets(self):
        await self.opt_in()
        for temperature in (float("nan"), float("inf"), 100):
            with self.assertRaisesRegex(ValueError, "Temperature must be"):
                await self.scheduler.async_set_room_assist_climate_temperature(self.room, temperature)
        self.hass.states[self.room].state = "cool"
        self.climate.current_hvac_modes[self.room] = "cool"
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, None))
        with self.assertRaisesRegex(ValueError, "heating schedule block"):
            await self.scheduler.async_set_room_assist_climate_temperature(self.room, 21)
        self.assertEqual(self.climate.calls, [])

    async def test_failed_save_does_not_change_room_target_or_actuator(self):
        await self.opt_in()
        self.save.side_effect = OSError("write failed")
        with self.assertRaisesRegex(OSError, "write failed"):
            await self.scheduler.async_set_room_assist_climate_temperature(self.room, 21)
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 19))
        self.assertEqual(self.climate.calls, [])
