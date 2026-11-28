"""Logbook explains the accepted request without changing nominal control data."""

import asyncio
from datetime import timedelta
import unittest
from unittest.mock import AsyncMock, patch

from . import test_preconditioning_offset_runtime as offset
from . import test_room_assist_single_delivery as transport
from . import test_range_only_runtime as range_runtime
from .helpers import NOW, EVENT_TYPE_CLIMATE_TARGET_APPLIED, EVENT_VELAIR
from custom_components.velair.delivery_guard import (
    accepted_temperature_target, capture_delivery_receipt, record_delivery_receipt,
)


class PreconditioningLogbookTest(unittest.IsolatedAsyncioTestCase):
    setUp = offset.PreconditioningOffsetRuntimeTest.setUp
    asyncTearDown = offset.PreconditioningOffsetRuntimeTest.asyncTearDown
    _async_save = transport.RoomAssistSingleDeliveryTest._async_save
    preparation = offset.PreconditioningOffsetRuntimeTest.preparation

    def configure(self, **kwargs):
        block = transport.RoomAssistSingleDeliveryTest.configure(self, **kwargs)
        self.hass.states[self.entity_id].attributes["friendly_name"] = "Salon"
        return block

    def messages(self):
        return [data["message"] for domain, service, data, _ in self.hass.services.calls
                if domain == "logbook" and service == "log"]

    def applied_events(self):
        return [data for event, data in self.hass.bus.events
                if event == EVENT_VELAIR and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED]

    async def test_preparation_both_directions_has_one_entry_and_nominal_learning(self):
        for mode, request, extra in (("heat", 23, "+2"), ("cool", 19, "-2")):
            with self.subTest(mode=mode):
                self.scheduler._applied_preconditioning_targets.clear()
                self.hass.services.calls.clear()
                self.hass.services.logbook_enabled = True
                event = self.preparation(mode, assist=False)
                await self.scheduler._async_apply_event(event, source="test")
                self.assertEqual(self.messages(), [
                    f"Preparing Salon: room target 21 °C; requested from equipment {request} °C "
                    f"({'Heat' if mode == 'heat' else 'Cool'}); preparation extra {extra} °C"])
                self.assertEqual(self.applied_events()[-1]["temperature"], 21)
                self.assertEqual(self.scheduler._preconditioning_sessions[self.entity_id].target_temperature, 21)

    async def test_room_assist_logs_final_combined_request_not_its_prelimit_request(self):
        self.hass.services.logbook_enabled = True
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        self.assertIn("room target 21 °C; requested from equipment 25 °C", self.messages()[0])
        self.assertIn("preparation extra +2 °C", self.messages()[0])
        self.assertEqual(self.climate.calls[-1][2], 25)

    async def test_limited_extra_reports_effective_value_including_zero(self):
        for maximum, expected in ((22, 1), (21, 0)):
            with self.subTest(maximum=maximum):
                self.scheduler._applied_preconditioning_targets.clear()
                self.hass.services.calls.clear()
                self.hass.services.logbook_enabled = True
                self.preparation(assist=False)
                self.climate.limits[self.entity_id] = (5, maximum)
                self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                event = self.scheduler.calculate_next_event(NOW)
                await self.scheduler._async_apply_event(event, source="test")
                extra = f"+{expected}" if expected else "0"
                self.assertIn(f"preparation extra {extra} °C (limited by device limits or step)", self.messages()[0])
                self.assertNotIn("extra +2", self.messages()[0])
                self.assertEqual(self.climate.calls[-1][2], maximum)

    async def test_removal_reports_remaining_assisted_request(self):
        self.hass.services.logbook_enabled = True
        event = self.preparation()
        await self.scheduler._async_apply_event(event, source="test")
        self.hass.services.calls.clear()
        self.hass.states["sensor.room"].state = "20.9"
        await self.scheduler._async_observe_preconditioning_temperature(
            self.entity_id, NOW + timedelta(minutes=5), 20.9)
        message = next(message for message in self.messages() if "Preparation extra removed" in message)
        requested = self.climate.calls[-1][2]
        self.assertIn(f"room target 21 °C; requested from equipment {requested:g} °C", message)
        self.assertNotIn("preparation extra +2", message)

    async def test_extra_reduced_by_step_is_not_reported_as_configured_value(self):
        self.hass.services.logbook_enabled = True
        self.preparation(assist=False)
        self.data["zones"][self.entity_id]["preconditioning"]["heating_setpoint_offset"] = 1.2
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        event = self.scheduler.calculate_next_event(NOW)
        await self.scheduler._async_apply_event(event, source="test")
        self.assertIn("requested from equipment 22 °C", self.messages()[0])
        self.assertIn("preparation extra +1 °C (limited by device limits or step)", self.messages()[0])
        self.assertNotIn("extra +1.2", self.messages()[0])

    async def test_spanish_explanation(self):
        self.hass.config.language = "es"
        self.hass.services.logbook_enabled = True
        event = self.preparation(assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        self.assertEqual(self.messages(), [
            "Preparando Salon: objetivo 21 °C; solicitado al equipo 23 °C (Calor); extra de preparación +2 °C"])

    async def test_ordinary_and_manual_entries_retain_existing_format(self):
        self.hass.services.logbook_enabled = True
        self.configure(enabled=False, target=21)
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.messages(), ["Adjusted Salon to 21 °C (Heat)"])
        self.hass.services.calls.clear()
        await self.scheduler.async_set_temperature(self.entity_id, 20, hvac_mode="heat")
        self.assertEqual(self.messages(), ["Set Salon to 20 °C (Heat)"])

    async def test_failed_request_has_no_success_log(self):
        self.hass.services.logbook_enabled = True
        event = self.preparation(assist=False)
        self.climate.async_set_temperature = AsyncMock(side_effect=ValueError("rejected"))
        with self.assertRaises(ValueError):
            await self.scheduler._async_apply_event(event, source="test")
        self.assertEqual(self.messages(), [])
        self.assertEqual(self.applied_events(), [])

    async def test_retry_logs_only_the_latest_accepted_target(self):
        self.hass.services.logbook_enabled = True
        event = self.preparation(assist=False)
        original = self.climate.async_set_temperature
        attempts = []

        async def retrying(*args, **kwargs):
            attempts.append(args[1])
            if len(attempts) == 1:
                self.data["zones"][self.entity_id]["schedule"]["tuesday"][0]["temperature"] = 22
                self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                raise offset.scheduler_module.HomeAssistantError("temporary rejection")
            await original(*args, **kwargs)

        self.climate.async_set_temperature = retrying
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)):
            await self.scheduler._async_apply_event(event, source="test")
            for _ in range(30):
                if self.messages():
                    break
                await asyncio.sleep(0)
        self.assertEqual(attempts, [23, 24])
        self.assertEqual(len(self.messages()), 1)
        self.assertIn("room target 22 °C; requested from equipment 24 °C", self.messages()[0])
        self.assertEqual(len(self.applied_events()), 1)
        self.assertEqual(self.applied_events()[0]["temperature"], 22)


class RangeLogbookTest(unittest.IsolatedAsyncioTestCase):
    setUp = offset.PreconditioningOffsetRangeTest.setUp
    save = offset.PreconditioningOffsetRangeTest.save
    asyncTearDown = offset.PreconditioningOffsetRangeTest.asyncTearDown
    block = offset.PreconditioningOffsetRangeTest.block
    configure = offset.PreconditioningOffsetRangeTest.configure
    prepare = offset.PreconditioningOffsetRangeTest.prepare

    async def test_native_range_matches_actual_delivery_and_preserves_nominal_event(self):
        self.scheduler._async_logbook = AsyncMock()
        event = await self.prepare("heat", assist=False, climate=18)
        message = self.scheduler._async_logbook.await_args.args[0]
        sent = next(data for service, data in reversed(self.calls) if service == "set_temperature")
        requested = f"{sent['target_temp_low']:g}–{sent['target_temp_high']:g} °C"
        self.assertIn("room target 21–25 °C", message)
        self.assertIn(f"requested from equipment {requested}", message)
        self.assertIn("preparation extra +3 °C", message)
        self.assertEqual((event.target_temp_low, event.target_temp_high), (21, 25))

    async def test_assisted_range_matches_actual_request_and_effective_extra(self):
        self.scheduler._async_logbook = AsyncMock()
        await self.prepare("cool", climate=24)
        state = self.scheduler._room_sensor_assist_states[self.entity]
        message = self.scheduler._async_logbook.await_args.args[0]
        requested = f"{state.applied_target_temp_low:g}–{state.applied_target_temp_high:g} °C"
        self.assertIn(f"requested from equipment {requested}", message)
        self.assertIn("preparation extra -2 °C (limited", message)


class AcceptedLogbookTargetTest(unittest.IsolatedAsyncioTestCase):
    async def test_task_owned_receipt_reads_actual_values_without_leaking_or_mutating(self):
        self.assertIsNone(accepted_temperature_target("climate.room"))
        with capture_delivery_receipt() as receipt:
            record_delivery_receipt("climate.room", {"temperature": 20.5, "hvac_mode": "heat"})
            target = accepted_temperature_target("climate.room")
            self.assertEqual(target, {"temperature": 20.5})
            target["temperature"] = 0
            self.assertEqual(receipt["climate.room"]["temperature"], 20.5)

            async def child():
                return accepted_temperature_target("climate.room")

            self.assertIsNone(await asyncio.create_task(child()))
        self.assertIsNone(accepted_temperature_target("climate.room"))


class AdapterRoundingLogbookTest(unittest.IsolatedAsyncioTestCase):
    setUp = range_runtime.RangeOnlyRuntimeTest.setUp
    save = range_runtime.RangeOnlyRuntimeTest.save
    asyncTearDown = range_runtime.RangeOnlyRuntimeTest.asyncTearDown
    block = range_runtime.RangeOnlyRuntimeTest.block

    async def test_scalar_uses_adapter_receipt_after_grid_change(self):
        self.scheduler._async_logbook = AsyncMock()
        self.state.attributes["supported_features"] = 1
        self.block().clear()
        self.block().update(start="00:00", action="set_temperature", temperature=20.7, hvac_mode="heat")
        await self.scheduler.async_apply_current_schedule()
        message = self.scheduler._async_logbook.await_args.args[0]
        self.assertIn("room target 20.7 °C; requested from equipment 20.5 °C", message)
        target = next(data for service, data in reversed(self.calls) if service == "set_temperature")
        self.assertEqual(target["temperature"], 20.5)

    async def test_range_uses_adapter_receipt_after_grid_change(self):
        self.scheduler._async_logbook = AsyncMock()
        self.state.attributes["target_temp_step"] = .3
        self.block()["hvac_mode"] = "heat"
        await self.scheduler.async_apply_current_schedule()
        message = self.scheduler._async_logbook.await_args.args[0]
        self.assertIn("room target 21–25 °C; requested from equipment 21.1–25 °C", message)
        target = next(data for service, data in reversed(self.calls) if service == "set_temperature")
        self.assertEqual((target["target_temp_low"], target["target_temp_high"]), (21.1, 25))
