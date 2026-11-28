"""Offset configuration transactions and portable control-rule compatibility."""
import asyncio
from copy import deepcopy
from datetime import timedelta
from dataclasses import replace
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from . import test_preconditioning_offset_runtime as runtime
from . import test_scheduler_application as application
from .helpers import NOW, normalize_schedule_data
from custom_components.velair import api
from custom_components.velair.models import normalize_preconditioning_data
from custom_components.velair.storage import convert_portable_temperature_data


def learning():
    return application._preconditioning_learning([
        application._preconditioning_sample("heat", "complete", 30, delta_t=2),
        application._preconditioning_sample("cool", "complete", 30, delta_t=2),
    ])


class OffsetConfigurationTest(unittest.IsolatedAsyncioTestCase):
    setUp = runtime.PreconditioningOffsetRuntimeTest.setUp
    configure = runtime.PreconditioningOffsetRuntimeTest.configure
    preparation = runtime.PreconditioningOffsetRuntimeTest.preparation
    _async_save = runtime.PreconditioningOffsetRuntimeTest._async_save

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    async def begin(self, direction="cool"):
        event = self.preparation(direction)
        await self.scheduler._async_apply_event(event, source="test")
        self.data["preconditioning_learning"] = {self.entity_id: learning()}
        return event

    async def test_change_clears_only_matching_history_preserving_opposite_control(self):
        await self.begin("cool")
        session = self.scheduler._preconditioning_sessions[self.entity_id]
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        markers = dict(self.scheduler._applied_preconditioning_targets)
        old_context = self.scheduler._compute_dependency_context(self.entity_id)
        self.data["preconditioning_accepted_anchors"] = {
            "heat": {"entity_id": self.entity_id, "direction": "heat", "context": "old", "episode": None},
            "cool": {"entity_id": self.entity_id, "direction": "cool", "context": old_context, "episode": None},
            "stale_cool": {"entity_id": self.entity_id, "direction": "cool", "context": "stale", "episode": None},
        }
        await self.scheduler.async_update_zone_preconditioning(
            self.entity_id, {"heating_setpoint_offset": 1.5})
        histories = self.data["preconditioning_learning"][self.entity_id]
        self.assertEqual(histories["heat"]["observations"], [])
        self.assertEqual(len(histories["cool"]["observations"]), 1)
        self.assertIs(self.scheduler._preconditioning_sessions[self.entity_id], session)
        self.assertEqual(self.scheduler._applied_preconditioning_targets, {
            key: replace(marker,
                context=self.scheduler._dependency_context(self.entity_id, marker.episode),
                completion_context=self.scheduler._completion_context(self.entity_id, marker.episode))
            for key, marker in markers.items()})
        self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity_id], state)
        self.assertEqual(set(self.data["preconditioning_accepted_anchors"]), {"cool"})
        self.assertEqual(self.data["preconditioning_accepted_anchors"]["cool"]["context"],
                         self.scheduler._compute_dependency_context(self.entity_id))

    async def test_change_active_direction_commits_without_frozen_state_mutation(self):
        await self.begin("heat")
        old_session = self.scheduler._preconditioning_sessions[self.entity_id]
        result = await self.scheduler.async_update_zone_preconditioning(
            self.entity_id, {"heating_setpoint_offset": 1.5})
        self.assertEqual(result["heating_setpoint_offset"], 1.5)
        self.assertIsNot(self.scheduler._preconditioning_sessions.get(self.entity_id), old_session)
        self.assertEqual(self.data["preconditioning_learning"][self.entity_id]["heat"]["observations"], [])
        self.assertEqual(len(self.data["preconditioning_learning"][self.entity_id]["cool"]["observations"]), 1)

    async def test_failed_or_cancelled_save_preserves_rule_history_and_session(self):
        for failure in (OSError("storage"), asyncio.CancelledError()):
            with self.subTest(failure=type(failure).__name__):
                await self.begin("heat")
                session = self.scheduler._preconditioning_sessions[self.entity_id]
                before = deepcopy(self.data)
                self.scheduler._async_save_data = AsyncMock(side_effect=failure)
                with self.assertRaises(type(failure)):
                    await self.scheduler.async_update_zone_preconditioning(
                        self.entity_id, {"heating_setpoint_offset": 1.5})
                self.assertEqual(self.data["zones"], before["zones"])
                self.assertEqual(self.data["preconditioning_learning"], before["preconditioning_learning"])
                self.assertIs(self.scheduler._preconditioning_sessions[self.entity_id], session)
                self.scheduler._async_save_data = self._async_save

    async def test_completion_waiting_for_committed_edit_cannot_restore_old_sample(self):
        await self.begin("heat")
        session = self.scheduler._preconditioning_sessions[self.entity_id]
        started, release = asyncio.Event(), asyncio.Event()

        async def save():
            started.set()
            await release.wait()

        self.scheduler._async_save_data = save
        edit = asyncio.create_task(self.scheduler.async_update_zone_preconditioning(
            self.entity_id, {"heating_setpoint_offset": 1.5}))
        await started.wait()
        finish = asyncio.create_task(self.scheduler._async_finish_preconditioning_session(
            session, NOW + timedelta(minutes=10), 21, quality="complete"))
        await asyncio.sleep(0)
        release.set()
        await asyncio.gather(edit, finish)
        self.assertEqual(self.data["preconditioning_learning"][self.entity_id]["heat"]["observations"], [])

    async def test_validation_uses_device_delta_step_and_runtime_unit_maximum(self):
        self.climate.steps[self.entity_id] = .5
        for value in (-.5, 5.5, float("nan"), float("inf"), .3):
            with self.subTest(value=value), self.assertRaises(ValueError):
                await self.scheduler.async_update_zone_preconditioning(
                    self.entity_id, {"heating_setpoint_offset": value})
        self.climate.temperature_unit = lambda _: "°F"
        await self.scheduler.async_update_zone_preconditioning(
            self.entity_id, {"heating_setpoint_offset": 9})
        self.assertEqual(self.data["zones"][self.entity_id]["preconditioning"]["heating_setpoint_offset"], 9)
        with self.assertRaises(ValueError):
            await self.scheduler.async_update_zone_preconditioning(
                self.entity_id, {"heating_setpoint_offset": 9.5})

    async def test_changed_device_step_keeps_saved_request_on_unrelated_edit(self):
        self.data["zones"][self.entity_id]["preconditioning"]["heating_setpoint_offset"] = .9
        self.climate.steps[self.entity_id] = .5
        result = await self.scheduler.async_update_zone_preconditioning(
            self.entity_id, {"heating_setpoint_offset": .9, "max_lead_minutes": 120})
        self.assertEqual(result["heating_setpoint_offset"], .9)

    async def test_restore_defaults_clears_changed_learning_preserving_braking(self):
        config = self.data["zones"][self.entity_id]["preconditioning"]
        config.update(heating_setpoint_offset=2, room_sensor_assist_braking_level="high")
        self.data["preconditioning_learning"] = {self.entity_id: learning()}
        result = await self.scheduler.async_reset_zone_preconditioning_settings(self.entity_id)
        self.assertEqual(result["heating_setpoint_offset"], 0)
        self.assertEqual(result["cooling_setpoint_offset"], 0)
        self.assertEqual(result["room_sensor_assist_braking_level"], "high")
        self.assertEqual(self.data["preconditioning_learning"][self.entity_id]["heat"]["observations"], [])
        self.assertEqual(len(self.data["preconditioning_learning"][self.entity_id]["cool"]["observations"]), 1)

    async def test_edit_or_defaults_restores_unassisted_target_after_room_reaches_goal(self):
        for restore_defaults in (False, True):
            with self.subTest(defaults=restore_defaults):
                self.scheduler._applied_preconditioning_targets.clear()
                event = self.preparation("heat", assist=False)
                await self.scheduler._async_apply_event(event, source="test")
                self.assertEqual(self.climate.calls[-1][2], 23)
                # The settings transaction runs before the queued arrival observer.
                self.hass.states["sensor.room"].state = "21"
                self.hass.states[self.entity_id].attributes["current_temperature"] = 21
                if restore_defaults:
                    await self.scheduler.async_reset_zone_preconditioning_settings(self.entity_id)
                else:
                    await self.scheduler.async_update_zone_preconditioning(
                        self.entity_id, {"heating_setpoint_offset": 0})
                self.assertEqual(self.climate.calls[-1][2], 21)
                self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))

    async def test_disabling_preconditioning_restores_active_unassisted_extra(self):
        event = self.preparation("heat", assist=False)
        await self.scheduler._async_apply_event(event, source="test")
        self.assertEqual(self.climate.calls[-1][2], 23)
        await self.scheduler.async_update_zone_preconditioning(self.entity_id, {"enabled": False})
        self.assertEqual(self.climate.calls[-1][2], 21)
        self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))

    async def test_arrival_during_failed_edit_or_defaults_still_restores_unassisted_target(self):
        for restore_defaults in (False, True):
            with self.subTest(defaults=restore_defaults):
                self.scheduler._applied_preconditioning_targets.clear()
                event = self.preparation("heat", assist=False)
                await self.scheduler._async_apply_event(event, source="test")
                started, release = asyncio.Event(), asyncio.Event()
                calls = 0

                async def save():
                    nonlocal calls
                    calls += 1
                    if calls == 1:
                        started.set()
                        await release.wait()
                        raise OSError("storage")

                self.scheduler._async_save_data = save
                edit = asyncio.create_task(
                    self.scheduler.async_reset_zone_preconditioning_settings(self.entity_id)
                    if restore_defaults else self.scheduler.async_update_zone_preconditioning(
                        self.entity_id, {"heating_setpoint_offset": 1.5}))
                await started.wait()
                self.hass.states["sensor.room"].state = "21"
                self.hass.states[self.entity_id].attributes["current_temperature"] = 21
                arrival = asyncio.create_task(self.scheduler._async_observe_preconditioning_temperature(
                    self.entity_id, NOW + timedelta(minutes=10), 21))
                await asyncio.sleep(0)
                release.set()
                with self.assertRaises(OSError):
                    await edit
                await arrival
                self.assertEqual(self.climate.calls[-1][2], 21,
                                 (self.scheduler._applied_preconditioning_targets,
                                  self.scheduler._projection_pending_entities, self.climate.calls))
                self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))
                self.scheduler._async_save_data = self._async_save

    async def test_delayed_timer_keeps_expired_sample_when_next_preparation_starts(self):
        event = self.preparation("heat", assist=False)
        self.data["zones"][self.entity_id]["schedule"]["tuesday"].append({
            "start": "20:00", "action": "set_temperature", "temperature": 24, "hvac_mode": "heat"})
        self.scheduler._prepare_runtime_projection(NOW, configuration=True, refresh_horizon=True)
        await self.scheduler._async_apply_event(event, source="test")
        self.scheduler._timer_cursor = NOW
        late = NOW + timedelta(minutes=70)
        self.hass.states["sensor.room"].state = "23"
        self.hass.states[self.entity_id].attributes["current_temperature"] = 23
        with patch.object(application.scheduler_module.dt_util, "now", return_value=late):
            await self.scheduler._handle_timer(late)
        history = self.data.get("preconditioning_learning", {}).get(self.entity_id, {}).get("heat", {}).get("observations", [])
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["target_temp"], 21)
        self.assertEqual(history[0]["quality"], "complete")
        self.assertEqual(self.scheduler._preconditioning_sessions[self.entity_id].target_temperature, 24)

    async def test_zones_only_import_resets_changed_direction_and_combined_import_keeps_supplied(self):
        for groups in (None, {}):
            for supplied in (None, {self.entity_id: learning()}):
                with self.subTest(groups=groups, supplied=supplied is not None):
                    self.data["preconditioning_learning"] = {self.entity_id: learning()}
                    zones = deepcopy(self.data["zones"])
                    previous = zones[self.entity_id]["preconditioning"].get("heating_setpoint_offset", 0)
                    zones[self.entity_id]["preconditioning"]["heating_setpoint_offset"] = 1 if previous != 1 else 2
                    await self.scheduler.async_replace_portable_data(
                        zones=zones, room_groups=groups, preconditioning_learning=supplied)
                    history = self.data["preconditioning_learning"][self.entity_id]
                    self.assertEqual(len(history["heat"]["observations"]), 1 if supplied else 0)
                    self.assertEqual(len(history["cool"]["observations"]), 1)

    async def test_import_revalidates_rule_after_concurrent_settings_save_rolls_back(self):
        await self.begin("heat")
        started, release = asyncio.Event(), asyncio.Event()

        async def failing_save():
            started.set()
            await release.wait()
            raise OSError("storage")

        self.scheduler._async_save_data = failing_save
        edit = asyncio.create_task(self.scheduler.async_update_zone_preconditioning(
            self.entity_id, {"heating_setpoint_offset": 1.5}))
        await started.wait()
        exported = {self.entity_id: learning()}
        exported[self.entity_id]["heat"]["setpoint_offset"] = 1.5
        exported[self.entity_id]["cool"]["setpoint_offset"] = 2
        preview = api._normalize_import_preconditioning_learning(exported, self.data["zones"])
        importing = asyncio.create_task(self.scheduler.async_replace_portable_data(
            preconditioning_learning=preview))
        await asyncio.sleep(0)
        release.set()
        with self.assertRaises(OSError):
            await edit
        with self.assertRaisesRegex(ValueError, "does not match"):
            await importing
        self.assertEqual(self.data["zones"][self.entity_id]["preconditioning"]["heating_setpoint_offset"], 2)
        self.assertNotIn("setpoint_offset", self.data["preconditioning_learning"][self.entity_id]["heat"])


class OffsetPortabilityTest(unittest.TestCase):
    def setUp(self):
        self.data = normalize_schedule_data(None, ["climate.salon"])
        self.data["zones"]["climate.salon"]["preconditioning"]["heating_setpoint_offset"] = .5
        self.data["preconditioning_learning"] = {"climate.salon": learning()}
        self.runtime = {"entry": SimpleNamespace(data={}, options={}),
                        "storage": SimpleNamespace(data=self.data, effective_temperature_unit="°C")}

    def test_export_tags_confirmed_configuration_without_changing_internal_samples(self):
        exported = api._export_preconditioning_learning(self.data)
        self.assertEqual(exported["climate.salon"]["heat"]["setpoint_offset"], .5)
        self.assertEqual(exported["climate.salon"]["cool"]["setpoint_offset"], 0)
        self.assertNotIn("setpoint_offset", self.data["preconditioning_learning"]["climate.salon"]["heat"])

    def test_learning_only_incompatible_rule_rejects_without_mutation(self):
        payload = api._build_export_payload(self.runtime, ["preconditioning_learning"])
        payload["sections"]["preconditioning_learning"]["climate.salon"]["heat"]["setpoint_offset"] = 1
        before = deepcopy(self.data)
        with self.assertRaisesRegex(ValueError, "does not match"):
            api._build_import_data(self.runtime, payload, ["preconditioning_learning"])
        self.assertEqual(self.data, before)

    def test_combined_import_compares_with_candidate_configuration(self):
        payload = api._build_export_payload(self.runtime, ["zones", "preconditioning_learning"])
        self.data["zones"]["climate.salon"]["preconditioning"]["heating_setpoint_offset"] = 2
        result = api._build_import_data(self.runtime, payload, ["zones", "preconditioning_learning"])
        self.assertEqual(result["zones"]["climate.salon"]["preconditioning"]["heating_setpoint_offset"], .5)
        self.assertEqual(len(result["preconditioning_learning"]["climate.salon"]["heat"]["observations"]), 1)

    def test_legacy_learning_means_zero_offset(self):
        payload = api._build_export_payload(self.runtime, ["preconditioning_learning"])
        payload["model_version"] = 27
        with self.assertRaisesRegex(ValueError, "does not match"):
            api._build_import_data(self.runtime, payload, ["preconditioning_learning"])
        self.data["zones"]["climate.salon"]["preconditioning"]["heating_setpoint_offset"] = 0
        self.assertIn("climate.salon", api._build_import_data(
            self.runtime, payload, ["preconditioning_learning"])["preconditioning_learning"])

    def test_delta_conversion_preserves_physical_value_and_learning_tag(self):
        payload = api._build_export_payload(self.runtime, ["zones", "preconditioning_learning"])
        converted = convert_portable_temperature_data(payload["sections"], "°C", "°F", None)
        self.assertEqual(converted["zones"]["climate.salon"]["preconditioning"]["heating_setpoint_offset"], .9)
        self.assertEqual(converted["preconditioning_learning"]["climate.salon"]["heat"]["setpoint_offset"], .9)
        self.runtime["storage"].effective_temperature_unit = "°F"
        result = api._build_import_data(self.runtime, payload, ["zones", "preconditioning_learning"])
        self.assertEqual(result["zones"]["climate.salon"]["preconditioning"]["heating_setpoint_offset"], .9)
        self.assertEqual(len(result["preconditioning_learning"]["climate.salon"]["heat"]["observations"]), 1)

    def test_invalid_stored_offsets_repair_to_disabled_without_rounding_valid_delta(self):
        for value in (-1, float("nan"), float("inf"), "broken"):
            self.assertEqual(normalize_preconditioning_data({"heating_setpoint_offset": value})["heating_setpoint_offset"], 0)
        self.assertEqual(normalize_preconditioning_data({"heating_setpoint_offset": .123456})["heating_setpoint_offset"], .123456)
