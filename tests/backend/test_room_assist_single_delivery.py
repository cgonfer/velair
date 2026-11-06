"""One physical target per scheduled block, including Room Assist fallback."""

import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import test_scheduler_application as application
from . import test_planned_return_runtime as planned_return
from .helpers import EVENT_TYPE_CLIMATE_TARGET_APPLIED, EVENT_VELAIR


class RoomAssistSingleDeliveryTest(unittest.IsolatedAsyncioTestCase):
    setUp = application.VelairSchedulerPreconditioningTest.setUp
    _async_save = application.VelairSchedulerPreconditioningTest._async_save

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    def configure(self, *, mode="heat", enabled=True, room="16.5", target=18,
                  climate_temperature=18, state=None):
        self.hass.states[self.entity_id] = SimpleNamespace(
            state=state or mode,
            attributes={"current_temperature": climate_temperature, "temperature": 22},
        )
        self.hass.states["sensor.room"] = SimpleNamespace(
            state=room, attributes={"unit_of_measurement": "°C"},
        )
        self.climate.steps[self.entity_id] = 0.5
        self.climate.limits[self.entity_id] = (5, 35)
        self.data["zones"][self.entity_id]["preconditioning"].update(
            enabled=False, room_temperature_entity_id="sensor.room",
            room_sensor_assist_enabled=enabled, room_sensor_assist_max_delta=2,
        )
        block = {"start": "17:00", "action": "set_temperature",
                 "temperature": target, "hvac_mode": mode}
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [block]
        return block

    def applied_events(self):
        return [data for event, data in self.hass.bus.events
                if event == EVENT_VELAIR
                and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED]

    async def test_heat_block_sends_only_assisted_target(self):
        self.configure()
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity_id, 19.5, True, "heat"),
        ])
        self.assertEqual(len(self.applied_events()), 1)
        self.assertEqual(self.applied_events()[0]["temperature"], 18)
        self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity_id].target_temperature, 18)

    async def test_cool_block_sends_only_assisted_target(self):
        self.configure(mode="cool", target=24, room="25.5", climate_temperature=24)
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity_id, 22.5, True, "cool"),
        ])

    async def test_off_climate_sends_one_assisted_target_with_power_and_mode(self):
        self.configure(state="off")
        self.climate.current_hvac_modes[self.entity_id] = "off"
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity_id, 19.5, True, "heat"),
        ])

    async def test_disabled_assist_skips_evaluation_and_sends_one_base_target(self):
        self.configure(enabled=False)
        self.scheduler._room_sensor_assist_target = Mock(side_effect=AssertionError("Unexpected correction"))
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity_id, 18.0, True, "heat"),
        ])
        self.scheduler._room_sensor_assist_target.assert_not_called()

    async def test_missing_room_reading_falls_back_to_one_base_target(self):
        self.configure(room="unavailable")
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity_id, 18.0, True, "heat"),
        ])

    async def test_missing_reading_never_restores_previous_block_before_fallback(self):
        block = self.configure()
        await self.scheduler.async_apply_current_schedule()
        self.climate.calls.clear()
        block["temperature"] = 20
        self.hass.states["sensor.room"].state = "unavailable"
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity_id, 20.0, True, "heat"),
        ])
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)

    async def test_assisted_delivery_preserves_block_options(self):
        block = self.configure()
        block["fan_mode"] = "auto"
        self.climate.climate_options[self.entity_id] = {"fan_mode": ["auto"]}
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity_id, 19.5, True, "heat", {
                "fan_mode": "auto", "humidity": None, "preset_mode": None,
                "swing_mode": None, "swing_horizontal_mode": None,
            }),
        ])

    async def test_failed_assisted_call_never_falls_back_to_uncorrected_target(self):
        self.configure()
        attempted = []
        async def fail(_entity, temperature, **_kwargs):
            attempted.append(temperature)
            raise ValueError("Rejected assisted target")
        with patch.object(self.climate, "async_set_temperature", side_effect=fail):
            with self.assertRaisesRegex(ValueError, "Rejected assisted target"):
                await self.scheduler.async_apply_current_schedule()
        self.assertEqual(attempted, [19.5])
        self.assertEqual(self.applied_events(), [])

    async def test_cancelled_assisted_call_never_sends_base_target_or_commits(self):
        self.configure()
        attempted = []
        async def cancel(_entity, temperature, **_kwargs):
            attempted.append(temperature)
            raise asyncio.CancelledError()
        with patch.object(self.climate, "async_set_temperature", side_effect=cancel):
            with self.assertRaises(asyncio.CancelledError):
                await self.scheduler.async_apply_current_schedule()
        self.assertEqual(attempted, [19.5])
        self.assertEqual(self.applied_events(), [])

    async def test_native_range_sends_only_assisted_pair(self):
        block = self.configure(mode="heat_cool")
        block.pop("temperature")
        block.update(target_temp_low=18, target_temp_high=24)
        self.climate.temperature_range_support[self.entity_id] = True
        self.climate.hvac_modes[self.entity_id] = ["off", "heat", "cool", "heat_cool"]
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(len(self.climate.calls), 1, self.climate.calls)
        call = self.climate.calls[0]
        self.assertEqual(call[0], "set_temperature_range")
        self.assertNotEqual(call[2:4], (18, 24))
        self.assertEqual(call[3] - call[2], 6)
        self.assertEqual(call[4:], (True, "heat_cool"))

    async def test_service_error_uses_existing_recovery_without_base_fallback(self):
        from homeassistant.exceptions import HomeAssistantError

        self.configure()
        attempted = []
        async def fail(_entity, temperature, **_kwargs):
            attempted.append(temperature)
            raise HomeAssistantError("Temporary delivery failure")
        with patch.object(self.climate, "async_set_temperature", side_effect=fail), \
             patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60,)), \
             self.assertLogs("custom_components.velair.climate_delivery", level="WARNING"):
            await self.scheduler.async_apply_current_schedule()
        self.assertEqual(attempted, [19.5])
        self.assertEqual(self.applied_events(), [])

    async def test_superseded_calculation_has_no_base_fallback_or_success_event(self):
        self.configure()
        calculate = self.scheduler._room_sensor_assist_target
        def cancel_intent(*args, **kwargs):
            result = calculate(*args, **kwargs)
            self.scheduler._climate_delivery.cancel(self.entity_id)
            return result
        self.scheduler._room_sensor_assist_target = cancel_intent
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.applied_events(), [])

    async def test_first_early_block_sends_only_assisted_target(self):
        block = self.configure(target=24, room="22", climate_temperature=17.1)
        block["start"] = "19:00"
        self.data["zones"][self.entity_id]["preconditioning"].update(
            enabled=True, room_sensor_assist_max_delta=5,
        )
        self.assertEqual(self.scheduler._preconditioning_sessions, {})
        await self.scheduler._handle_timer(application.NOW)
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity_id, 19.0, True, "heat"),
        ])
        self.assertEqual(len(self.applied_events()), 1)
        self.assertEqual(self.applied_events()[0]["temperature"], 24)
        self.assertEqual(self.scheduler._preconditioning_sessions[self.entity_id].target_temperature, 24)

    async def test_disabled_assist_retires_previous_state_without_restoring_it(self):
        block = self.configure()
        await self.scheduler.async_apply_current_schedule()
        self.climate.calls.clear()
        self.data["zones"][self.entity_id]["preconditioning"]["room_sensor_assist_enabled"] = False
        block["temperature"] = 20
        self.scheduler._async_refresh_room_sensor_assist = AsyncMock(
            side_effect=AssertionError("Disabled assist should not be evaluated"),
        )
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls, [
            ("set_temperature", self.entity_id, 20.0, True, "heat"),
        ])
        self.scheduler._async_refresh_room_sensor_assist.assert_not_called()
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)

class RoomAssistTransportTest(unittest.IsolatedAsyncioTestCase):
    """Count actual climate service payloads through the production adapter."""

    setUp = RoomAssistSingleDeliveryTest.setUp
    _async_save = RoomAssistSingleDeliveryTest._async_save
    configure = RoomAssistSingleDeliveryTest.configure
    asyncTearDown = RoomAssistSingleDeliveryTest.asyncTearDown

    def use_real_adapter(self):
        from custom_components.velair.climate_manager import ClimateManager
        from .helpers import VelairScheduler

        self.hass.states[self.entity_id].attributes.update(
            hvac_modes=["off", "heat", "cool"], min_temp=5, max_temp=35,
            target_temp_step=0.5, supported_features=1,
        )
        self.scheduler = VelairScheduler(
            self.hass, self.data, ClimateManager(self.hass), self._async_save,
        )

    async def test_heat_has_one_physical_temperature_service(self):
        self.configure()
        self.use_real_adapter()
        await self.scheduler.async_apply_current_schedule()
        calls = [(service, data) for domain, service, data, _blocking
                 in self.hass.services.calls if domain == "climate"]
        self.assertEqual(calls, [
            ("set_hvac_mode", {"entity_id": self.entity_id, "hvac_mode": "heat"}),
            ("set_temperature", {"entity_id": self.entity_id, "temperature": 19.5}),
        ])

    async def test_cool_has_one_physical_temperature_service(self):
        self.configure(mode="cool", target=24, room="25.5", climate_temperature=24)
        self.use_real_adapter()
        await self.scheduler.async_apply_current_schedule()
        targets = [data for domain, service, data, _blocking in self.hass.services.calls
                   if domain == "climate" and service == "set_temperature"]
        self.assertEqual(targets, [{"entity_id": self.entity_id, "temperature": 22.5}])

    async def test_off_climate_still_receives_mode_and_one_corrected_target(self):
        self.configure(state="off")
        self.use_real_adapter()
        await self.scheduler.async_apply_current_schedule()
        calls = [(service, data) for domain, service, data, _blocking
                 in self.hass.services.calls if domain == "climate"]
        self.assertEqual(calls, [
            ("set_hvac_mode", {"entity_id": self.entity_id, "hvac_mode": "heat"}),
            ("set_temperature", {"entity_id": self.entity_id, "temperature": 19.5}),
        ])

    async def test_off_keep_mode_uses_first_non_off_mode_once(self):
        block = self.configure(state="off")
        block.pop("hvac_mode")
        self.use_real_adapter()
        self.hass.states[self.entity_id].attributes["hvac_modes"] = ["off", "cool", "heat"]
        await self.scheduler.async_apply_current_schedule()
        calls = [(service, data) for domain, service, data, _blocking
                 in self.hass.services.calls if domain == "climate"]
        targets = [data for service, data in calls if service == "set_temperature"]
        self.assertEqual(targets, [{"entity_id": self.entity_id, "temperature": 20.0}])
        self.assertEqual(calls[0], ("set_hvac_mode", {
            "entity_id": self.entity_id, "hvac_mode": "cool",
        }))

    async def test_disabled_has_one_unadjusted_temperature_service(self):
        self.configure(enabled=False)
        self.use_real_adapter()
        await self.scheduler.async_apply_current_schedule()
        targets = [data for domain, service, data, _blocking in self.hass.services.calls
                   if domain == "climate" and service == "set_temperature"]
        self.assertEqual(targets, [{"entity_id": self.entity_id, "temperature": 18.0}])

    async def test_temperature_only_assist_sends_one_target_without_mode(self):
        block = self.configure()
        block.pop("hvac_mode")
        block["temperature_only"] = True
        self.use_real_adapter()
        await self.scheduler.async_apply_current_schedule()
        calls = [(service, data) for domain, service, data, _blocking
                 in self.hass.services.calls if domain == "climate"]
        self.assertEqual(calls, [
            ("set_temperature", {"entity_id": self.entity_id, "temperature": 19.5}),
        ])

    async def test_temperature_only_while_off_sends_base_without_power_or_mode(self):
        block = self.configure(state="off")
        block.pop("hvac_mode")
        block["temperature_only"] = True
        self.use_real_adapter()
        await self.scheduler.async_apply_current_schedule()
        calls = [(service, data) for domain, service, data, _blocking
                 in self.hass.services.calls if domain == "climate"]
        self.assertEqual(calls, [
            ("set_temperature", {"entity_id": self.entity_id, "temperature": 18.0}),
        ])

    async def test_native_range_has_one_physical_temperature_service(self):
        block = self.configure(mode="heat_cool")
        block.pop("temperature")
        block.update(target_temp_low=18, target_temp_high=24)
        self.use_real_adapter()
        self.hass.states[self.entity_id].attributes.update(
            hvac_modes=["off", "heat", "cool", "heat_cool"],
            supported_features=2, target_temp_low=18, target_temp_high=24,
        )
        await self.scheduler.async_apply_current_schedule()
        targets = [data for domain, service, data, _blocking in self.hass.services.calls
                   if domain == "climate" and service == "set_temperature"]
        self.assertEqual(targets, [{
            "entity_id": self.entity_id, "target_temp_low": 19.5, "target_temp_high": 25.5,
        }])

    async def test_off_hidden_scalar_feature_still_sends_one_assisted_target(self):
        self.configure(state="off")
        self.use_real_adapter()
        self.hass.states[self.entity_id].attributes["supported_features"] = 384
        await self.scheduler.async_apply_current_schedule()
        targets = [data for domain, service, data, _blocking in self.hass.services.calls
                   if domain == "climate" and service == "set_temperature"]
        self.assertEqual(targets, [{"entity_id": self.entity_id, "temperature": 19.5}])

class RoomAssistPlannedReturnTest(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = planned_return.PlannedReturnRuntimeTest.asyncSetUp
    asyncTearDown = planned_return.PlannedReturnRuntimeTest.asyncTearDown
    depart = planned_return.PlannedReturnRuntimeTest.depart

    async def test_first_return_preparation_sends_one_assisted_target(self):
        await self.depart()
        self.climate.steps["climate.salon"] = 0.5
        self.hass.states["sensor.return_room"] = SimpleNamespace(
            state="19", attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"]["climate.salon"]["preconditioning"].update(
            enabled=True, room_temperature_entity_id="sensor.return_room",
            room_sensor_assist_enabled=True,
        )
        self.climate.calls.clear()
        with patch.object(self.scheduler, "_preconditioned_event_details", return_value=(application.NOW, None)):
            await self.runtime._tick(application.NOW, self.runtime._generation)
        targets = [call for call in self.climate.calls if call[0] == "set_temperature"]
        self.assertEqual(len(targets), 1, self.climate.calls)
        self.assertNotEqual(targets[0][2], 21)
        self.assertEqual(self.scheduler._room_sensor_assist_states["climate.salon"].target_temperature, 21)
        self.assertEqual(self.data["planned_return_episode"]["preparing_entities"], ["climate.salon"])
