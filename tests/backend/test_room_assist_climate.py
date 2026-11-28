"""Room Assist thermostat targets are distinct from physical and scheduled targets."""

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
from custom_components.velair.models import ClimateEvent, empty_week_schedule, serialize_schedule_data


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
        self.scheduler = VelairScheduler(self.hass, self.data, self.climate, self.save)

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

    async def test_timer_waits_for_nominal_block_instead_of_early_preparation_during_hold(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 20)
        arrival = self.now + timedelta(hours=1)
        early = ClimateEvent(self.room, self.now, 24, "tuesday", "19:00",
                             hvac_mode="heat", target_when=arrival)
        with patch.object(self.scheduler, "_iter_future_events", return_value=[early]):
            self.assertEqual(self.scheduler._calculate_next_action_time(self.now), arrival)

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

    async def test_opt_out_reverts_target_without_turning_off_assist(self):
        await self.opt_in()
        await self.scheduler.async_set_room_assist_climate_temperature(self.room, 21)
        await self.scheduler.async_update_zone_preconditioning(self.room, {"room_assist_climate_enabled": False})
        self.assertEqual(self.scheduler.room_assist_climate_zones(), {})
        self.assertEqual(self.scheduler.get_room_sensor_assist_status(self.room)["target_temperature"], 19)
        await self.opt_in()
        self.assertEqual(self.scheduler.room_assist_climate_temperatures(self.room), (17, 19))

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
