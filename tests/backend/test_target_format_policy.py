"""Representation policy, candidate isolation, and atomic review regressions."""
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import patch, Mock
import asyncio

from .helpers import FakeHass, NOW, VelairScheduler, empty_week_schedule
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.models import normalize_schedule_data
from custom_components.velair.target_format_policy import resolve_target_format_policy
from custom_components.velair.api import _export_zones, EXPORT_MODEL_VERSION
from custom_components.velair import api
from custom_components.velair.scheduler import _RoomSensorAssistState


class TargetFormatPolicyTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.entity = "climate.room"
        self.hass = FakeHass()
        self.state = SimpleNamespace(state="heat", attributes={
            "supported_features": 3, "hvac_modes": ["off", "heat", "cool", "auto", "heat_cool"],
            "temperature": 22, "target_temp_low": 20, "target_temp_high": 24,
            "target_temp_step": .5, "min_temp": 16, "max_temp": 30})
        self.hass.states[self.entity] = self.state
        self.manager = ClimateManager(self.hass)
        self.data = normalize_schedule_data({}, [self.entity])
        self.saves = []
        async def save():
            self.saves.append(deepcopy(self.data))
        self.scheduler = VelairScheduler(self.hass, self.data, self.manager, save)
        self.clock = patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW)
        self.clock.start()
        self.weekday = NOW.strftime("%A").lower()

    async def asyncTearDown(self):
        self.clock.stop()
        await self.scheduler._climate_delivery.async_stop()

    def scalar_week(self):
        schedule = empty_week_schedule()
        schedule[self.weekday] = [{"start": "00:00", "action": "set_temperature", "hvac_mode": "heat", "temperature": 22}]
        return schedule

    def range_week(self):
        schedule = empty_week_schedule()
        schedule[self.weekday] = [{"start": "00:00", "action": "set_temperature", "hvac_mode": "heat", "target_temp_low": 20, "target_temp_high": 24}]
        return schedule

    def test_defaults_empty_and_capability_shapes(self):
        policy = self.scheduler.get_target_format_policy(self.entity)
        self.assertEqual(policy["kind"], "mixed")
        self.assertIsNone(policy["configured_modes"])
        self.assertEqual(policy["range_modes"], ["heat_cool"])
        self.assertEqual(self.scheduler.get_target_format_policy(self.entity, {"target_range_modes": []})["range_modes"], [])
        for features, kind in ((1, "single"), (2, "range")):
            attributes = {**self.state.attributes, "supported_features": features}
            self.assertEqual(resolve_target_format_policy(self.entity, attributes)["kind"], kind)
        self.assertEqual(resolve_target_format_policy(self.entity, {}, available=False)["kind"], "unknown")

    def test_unavailable_and_disappeared_modes_preserve_configuration(self):
        self.data["zones"][self.entity]["target_range_modes"] = ["heat", "auto"]
        self.state.attributes["hvac_modes"].remove("auto")
        policy = self.scheduler.get_target_format_policy(self.entity)
        self.assertEqual(policy["invalid_modes"], ["auto"])
        self.state.state = "unavailable"
        self.assertEqual(self.scheduler.get_target_format_policy(self.entity)["kind"], "unknown")
        self.assertEqual(self.data["zones"][self.entity]["target_range_modes"], ["heat", "auto"])

    def test_candidate_validation_does_not_use_saved_policy(self):
        candidate = deepcopy(self.data)
        candidate["zones"][self.entity]["target_range_modes"] = ["heat"]
        zone = {"schedule": self.range_week()}
        self.scheduler._resolved_resource_week(candidate, self.entity, zone, validate=True)
        with self.assertRaises(ValueError):
            self.scheduler._resolved_resource_week(self.data, self.entity, zone, validate=True)
        with self.assertRaises(ValueError):
            self.scheduler._resolved_resource_week(candidate, self.entity, {"schedule": self.scalar_week()}, validate=True)

    def test_offline_configuration_uses_advertised_formats_without_changing_runtime_policy(self):
        for features, configured, mode, pair in (
            (3, None, "heat_cool", True), (3, ["heat"], "heat", True),
            (2, None, "heat", True), (3, None, "heat", False),
            (1, None, "cool", False),
        ):
            with self.subTest(features=features, configured=configured, mode=mode):
                self.state.attributes["supported_features"] = features
                zone = {} if configured is None else {"target_range_modes": configured}
                for state in ("heat", "unavailable", "unknown"):
                    self.state.state = state
                    self.manager.validate_configured_temperature_target(
                        self.entity, range_target=pair, hvac_mode=mode, zone_config=zone)
                    with self.assertRaises(ValueError):
                        self.manager.validate_configured_temperature_target(
                            self.entity, range_target=not pair, hvac_mode=mode, zone_config=zone)
                self.assertEqual(self.manager.target_format_policy(self.entity)["kind"], "unknown")

    def test_unknown_offline_capabilities_do_not_invent_configuration_formats(self):
        self.state.state = "unavailable"
        for attributes in ({}, {"hvac_modes": ["off", "heat"]}, {"supported_features": 3}):
            self.state.attributes = attributes
            for pair in (True, False):
                with self.subTest(attributes=attributes, pair=pair), self.assertRaises(ValueError):
                    self.manager.validate_configured_temperature_target(
                        self.entity, range_target=pair, hvac_mode=None)

    async def test_preset_and_template_api_edits_preserve_unrelated_offline_range_schedule(self):
        schedule = self.range_week()
        schedule[self.weekday][0]["hvac_mode"] = "heat_cool"
        self.data["zones"][self.entity]["schedule"] = deepcopy(schedule)
        self.state.state = "unavailable"
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        runtime = {"scheduler": self.scheduler, "storage": SimpleNamespace(temperature_migration_required=False)}
        with patch.object(api, "_get_runtime", return_value=runtime), patch.object(api, "_build_schedule_response", return_value={}):
            await api.ws_set_block_preset(self.hass, connection, {
                "id": 1, "name": "Unrelated", "config": {"action": "turn_off"}, "expected_revision": 0})
            await api.ws_set_schedule_template(self.hass, connection, {
                "id": 2, "name": "Unrelated day", "blocks": [{"start": "08:00", "action": "turn_off"}],
                "expected_revision": 1})
        connection.send_error.assert_not_called()
        self.assertEqual(connection.send_result.call_count, 2)
        self.assertEqual(len(self.saves), 2)
        self.assertEqual(self.data["zones"][self.entity]["schedule"], schedule)
        calls = []
        async def call(*args, **kwargs):
            calls.append(args)
        self.hass.services.async_call = call
        await self.scheduler.async_apply_current_schedule(self.entity)
        self.assertEqual(calls, [])

    def test_review_is_read_only_and_reports_block_and_profile(self):
        self.data["zones"][self.entity]["schedule"] = self.scalar_week()
        self.data["profiles"] = [{"key": "evening", "zones": {self.entity: {"behavior": "schedule", "schedule": self.scalar_week()}}}]
        before = deepcopy(self.data)
        review = self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0)
        self.assertFalse(review["can_apply"])
        self.assertEqual(len(review["affected_blocks"]), 2)
        self.assertEqual(review["affected_blocks"][0]["expected_formats"], ["range"])
        self.assertEqual(self.data, before)
        self.assertFalse(self.saves)

    async def test_apply_corrected_destination_and_policy_atomically(self):
        self.data["zones"][self.entity]["schedule"] = self.scalar_week()
        correction = {"destinations": [{"source": "default", "entity_id": self.entity, "schedule": self.range_week()}]}
        review = self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0, correction)
        self.assertTrue(review["can_apply"])
        await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, correction)
        self.assertEqual(self.data["zones"][self.entity]["target_range_modes"], ["heat"])
        self.assertEqual(self.data["configuration_revision"], 1)
        self.assertEqual(len(self.saves), 1)

    def active_assist(self, *, mode="heat", inflight=False):
        self.data["zones"][self.entity]["schedule"] = self.scalar_week()
        self.data["zones"][self.entity]["preconditioning"] = {
            "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.room",
            "room_sensor_assist_max_adjustment": 3,
        }
        assist = _RoomSensorAssistState(self.entity, 22, 23, 1, "heat", mode,
                                       "sensor.room", self.weekday, "00:00")
        collection = self.scheduler._room_sensor_assist_inflight if inflight else self.scheduler._room_sensor_assist_states
        collection[self.entity] = assist
        self.calls = []
        async def call(domain, service, data, **kwargs):
            if domain == "climate":
                self.calls.append((service, deepcopy(data)))
        self.hass.services.async_call = call
        return assist

    def range_correction(self):
        return {"destinations": [{"source": "default", "entity_id": self.entity, "schedule": self.range_week()}]}

    async def test_incompatible_assist_preview_is_pure_and_save_delivers_new_nominal(self):
        assist = self.active_assist()
        config = deepcopy(self.data["zones"][self.entity]["preconditioning"])
        before = deepcopy(self.data)
        review = self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0, self.range_correction())
        self.assertTrue(review["can_apply"])
        self.assertEqual(review["temporary_blockers"], [])
        self.assertEqual(review["automatic_actions"], [{"entity_id": self.entity, "type": "stop_room_assist"}])
        self.assertEqual(self.data, before)
        self.assertIs(self.scheduler._room_sensor_assist_states[self.entity], assist)
        self.assertEqual(self.calls, [])
        await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, self.range_correction())
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.data["zones"][self.entity]["preconditioning"], config)
        self.assertEqual(self.calls, [("set_hvac_mode", {"entity_id": self.entity, "hvac_mode": "heat"}), ("set_temperature", {"entity_id": self.entity, "target_temp_low": 20, "target_temp_high": 24})])
        self.assertEqual(self.data["configuration_revision"], 1)
        self.assertEqual(len(self.saves), 1)

    async def test_retired_assist_reactivates_on_next_compatible_target_with_saved_settings(self):
        previous_assist = self.active_assist()
        zone = self.data["zones"][self.entity]
        zone["preconditioning"].update(
            room_sensor_assist_deadband=0.4,
            room_sensor_assist_max_delta=0.5,
            room_sensor_assist_debounce_seconds=17,
        )
        saved_config = deepcopy(zone["preconditioning"])
        self.state.attributes["current_temperature"] = 22
        self.hass.states["sensor.room"] = SimpleNamespace(
            state="18", attributes={"unit_of_measurement": "°C"})
        record_call = self.hass.services.async_call

        async def call_with_mode_feedback(domain, service, data, **kwargs):
            await record_call(domain, service, data, **kwargs)
            if domain == "climate" and service == "set_hvac_mode":
                self.state.state = data["hvac_mode"]

        self.hass.services.async_call = call_with_mode_feedback
        correction = self.range_correction()
        correction["destinations"][0]["schedule"][self.weekday].append({
            "start": "19:00", "action": "set_temperature", "hvac_mode": "heat_cool",
            "target_temp_low": 20, "target_temp_high": 24,
        })
        await self.scheduler.async_apply_target_range_policy(
            self.entity, ["heat", "heat_cool"], 0, correction)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)
        self.assertEqual([data for service, data in self.calls if service == "set_temperature"], [
            {"entity_id": self.entity, "target_temp_low": 20, "target_temp_high": 24},
        ])
        self.assertEqual(zone["preconditioning"], saved_config)
        self.assertEqual(len(self.saves), 1)
        self.calls.clear()

        # The ordinary schedule-delivery path must revive assistance, without
        # toggling its configuration or calling the Room Assist refresh directly.
        with patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW.replace(hour=19)):
            await self.scheduler.async_apply_current_schedule(self.entity)

        resumed = self.scheduler._room_sensor_assist_states[self.entity]
        self.assertIsNot(resumed, previous_assist)
        self.assertEqual(resumed.hvac_mode, "heat_cool")
        self.assertEqual(resumed.start, "19:00")
        self.assertEqual(resumed.room_temperature_entity_id, "sensor.room")
        self.assertEqual((resumed.target_temp_low, resumed.target_temp_high), (20, 24))
        self.assertEqual((resumed.applied_target_temp_low, resumed.applied_target_temp_high), (22.5, 26.5))
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_suppressed)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_inflight)
        self.assertEqual(zone["preconditioning"], saved_config)
        self.assertEqual(self.data["configuration_revision"], 1)
        self.assertEqual(len(self.saves), 1)
        targets = [data for service, data in self.calls if service == "set_temperature"]
        self.assertEqual(targets, [
            {"entity_id": self.entity, "target_temp_low": 20, "target_temp_high": 24},
            {"entity_id": self.entity, "target_temp_low": 22.5, "target_temp_high": 26.5},
        ])

    async def test_storage_failure_preserves_active_inflight_generation_and_delivery(self):
        assist = self.active_assist()
        self.scheduler._room_sensor_assist_inflight[self.entity] = assist
        generation = self.scheduler._room_sensor_assist_generation(self.entity)
        delivery_generation = deepcopy(self.scheduler._climate_delivery._generations)
        async def fail():
            self.assertIs(self.scheduler._room_sensor_assist_states[self.entity], assist)
            self.assertEqual(self.scheduler._room_sensor_assist_generation(self.entity), generation)
            raise OSError("disk failure")
        self.scheduler._async_save_data = fail
        with self.assertRaises(OSError):
            await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, self.range_correction())
        self.assertIs(self.scheduler._room_sensor_assist_states[self.entity], assist)
        self.assertIs(self.scheduler._room_sensor_assist_inflight[self.entity], assist)
        self.assertEqual(self.scheduler._room_sensor_assist_generation(self.entity), generation)
        self.assertEqual(self.scheduler._climate_delivery._generations, delivery_generation)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_suppressed)
        self.assertEqual(self.data["zones"][self.entity]["schedule"], self.scalar_week())
        self.assertNotIn("target_range_modes", self.data["zones"][self.entity])
        self.assertEqual(self.calls, [])

    async def test_other_blockers_and_generic_commits_do_not_retire_assist(self):
        assist = self.active_assist()
        zone = self.data["zones"][self.entity]
        zone["override"] = {"type": "boost", "temperature": 23, "hvac_mode": "heat"}
        review = self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0, self.range_correction())
        self.assertEqual([item["type"] for item in review["temporary_blockers"]], ["boost"])
        self.assertFalse(review["can_apply"])
        with self.assertRaises(ValueError):
            await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, self.range_correction())
        zone["override"] = None
        candidate = deepcopy(self.data)
        candidate["zones"][self.entity].update(target_range_modes=["heat"], schedule=self.range_week())
        with self.assertRaises(ValueError):
            await self.scheduler._async_commit_configuration(candidate, 0)
        self.assertIs(self.scheduler._room_sensor_assist_states[self.entity], assist)
        self.assertFalse(self.saves)
        self.assertEqual(self.calls, [])

    async def test_compatible_assist_and_configuration_remain_active(self):
        assist = self.active_assist()
        review = self.scheduler.preview_target_range_policy(self.entity, ["cool"], 0)
        self.assertEqual(review["automatic_actions"], [])
        await self.scheduler.async_apply_target_range_policy(self.entity, ["cool"], 0)
        self.assertIs(self.scheduler._room_sensor_assist_states[self.entity], assist)
        self.assertTrue(self.data["zones"][self.entity]["preconditioning"]["room_sensor_assist_enabled"])
        self.assertEqual(self.calls, [])

    async def test_explicit_default_policy_preview_matches_commit_for_disappeared_mode(self):
        self.active_assist(mode="heat_cool")
        self.state.attributes["hvac_modes"].remove("heat_cool")
        review = self.scheduler.preview_target_range_policy(self.entity, [], 0)
        self.assertEqual(review["automatic_actions"], [{"entity_id": self.entity, "type": "stop_room_assist"}])
        await self.scheduler.async_apply_target_range_policy(self.entity, [], 0)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.data["zones"][self.entity]["target_range_modes"], [])

    async def test_waits_for_inflight_assist_and_drops_queued_old_refresh(self):
        self.active_assist(inflight=True)
        entered, release = asyncio.Event(), asyncio.Event()
        async def physical_assist():
            entered.set()
            await release.wait()
        holding = asyncio.create_task(self.scheduler._climate_delivery.async_serialize(self.entity, physical_assist))
        await entered.wait()
        applying = asyncio.create_task(self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, self.range_correction()))
        for _ in range(5):
            await asyncio.sleep(0)
        queued = asyncio.create_task(self.scheduler._async_refresh_room_sensor_assist(
            self.entity, target_temperature=22, hvac_mode="heat", weekday=self.weekday, start="00:00", reason="test"))
        await asyncio.sleep(0)
        self.assertFalse(self.saves)
        release.set()
        await asyncio.wait_for(asyncio.gather(holding, applying, queued), 3)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_inflight)
        self.assertEqual(self.calls, [("set_hvac_mode", {"entity_id": self.entity, "hvac_mode": "heat"}), ("set_temperature", {"entity_id": self.entity, "target_temp_low": 20, "target_temp_high": 24})])

    async def test_retirement_reapplies_current_nominal_even_when_intent_is_unchanged(self):
        self.active_assist(mode="cool")
        await self.scheduler.async_apply_target_range_policy(self.entity, ["cool"], 0)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)
        temperatures = [data for service, data in self.calls if service == "set_temperature"]
        self.assertEqual(temperatures, [{"entity_id": self.entity, "temperature": 22}])

    async def test_temperature_only_retirement_does_not_wake_off_climate(self):
        self.active_assist()
        self.state.state = "off"
        self.data["zones"][self.entity]["schedule"][self.weekday][0].update(temperature_only=True)
        self.data["zones"][self.entity]["schedule"][self.weekday][0].pop("hvac_mode")
        correction = self.range_correction()
        block = correction["destinations"][0]["schedule"][self.weekday][0]
        block.update(temperature_only=True)
        block.pop("hvac_mode")
        await self.scheduler.async_apply_target_range_policy(self.entity, ["heat", "cool", "auto", "heat_cool"], 0, correction)
        self.assertEqual(self.calls, [("set_temperature", {"entity_id": self.entity, "target_temp_low": 20, "target_temp_high": 24})])
        self.assertEqual(self.state.state, "off")

    async def test_saved_policy_and_retired_assist_survive_nominal_delivery_retry(self):
        self.active_assist()
        async def call(domain, service, data, **kwargs):
            if domain != "climate":
                return
            self.calls.append((service, deepcopy(data)))
            if service == "set_temperature" and sum(name == service for name, _ in self.calls) == 1:
                raise RuntimeError("temporarily unavailable")
        self.hass.services.async_call = call
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)):
            await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, self.range_correction())
            tasks = self.scheduler._climate_delivery._tasks.get(self.entity, set())
            await asyncio.wait_for(asyncio.gather(*tasks), 3)
        self.assertEqual(self.data["zones"][self.entity]["target_range_modes"], ["heat"])
        self.assertEqual(len(self.saves), 1)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)
        temperatures = [data for service, data in self.calls if service == "set_temperature"]
        self.assertEqual(len(temperatures), 2)
        self.assertTrue(all(data == {"entity_id": self.entity, "target_temp_low": 20, "target_temp_high": 24} for data in temperatures))

    async def test_stale_revision_does_not_retire_assist(self):
        assist = self.active_assist()
        with self.assertRaises(ValueError):
            await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 1, self.range_correction())
        self.assertIs(self.scheduler._room_sensor_assist_states[self.entity], assist)
        self.assertEqual(self.calls, [])
        self.assertFalse(self.saves)

    async def test_both_assist_maps_are_checked_when_saved_state_is_compatible(self):
        self.active_assist(mode="cool")
        self.scheduler._room_sensor_assist_inflight[self.entity] = _RoomSensorAssistState(
            self.entity, 22, 23, 1, "heat", "heat", "sensor.room", self.weekday, "00:00")
        review = self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0, self.range_correction())
        self.assertEqual(review["automatic_actions"], [{"entity_id": self.entity, "type": "stop_room_assist"}])
        await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, self.range_correction())
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_inflight)

    async def test_notification_cleanup_failure_does_not_prevent_nominal_delivery(self):
        self.active_assist()
        with patch.object(self.scheduler, "_async_dismiss_room_sensor_assist_limit_notification",
                          side_effect=RuntimeError("notification unavailable")):
            await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, self.range_correction())
        self.assertEqual(len(self.saves), 1)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.calls[-1], ("set_temperature", {"entity_id": self.entity, "target_temp_low": 20, "target_temp_high": 24}))

    async def test_equal_intent_cancels_old_delivery_eligibility_before_releasing_boundary(self):
        self.active_assist(mode="cool")
        old_resolver = Mock(return_value=None)
        coordinator = self.scheduler._climate_delivery
        coordinator.register_current(self.entity, old_resolver)
        old_generation = coordinator._generations[self.entity]
        original = self.scheduler._async_finalize_schedule_mutation
        async def finalize(*args, **kwargs):
            # Finalization is outside the serialized save boundary, so old
            # retries must already be unable to acquire ownership here.
            self.assertFalse(coordinator._is_current(self.entity, old_generation))
            self.assertNotIn(self.entity, coordinator._eligible)
            await original(*args, **kwargs)
        with patch.object(self.scheduler, "_async_finalize_schedule_mutation", side_effect=finalize):
            await self.scheduler.async_apply_target_range_policy(self.entity, ["cool"], 0)
        old_resolver.assert_not_called()

    async def test_caller_cancellation_after_persist_finishes_retirement_and_delivery(self):
        self.active_assist()
        retiring, release = asyncio.Event(), asyncio.Event()
        original = self.scheduler._async_clear_room_sensor_assist
        async def clear(*args, **kwargs):
            if kwargs.get("reason") == "target_format_changed":
                retiring.set()
                await release.wait()
            await original(*args, **kwargs)
        with patch.object(self.scheduler, "_async_clear_room_sensor_assist", side_effect=clear):
            applying = asyncio.create_task(self.scheduler.async_apply_target_range_policy(
                self.entity, ["heat"], 0, self.range_correction()))
            await asyncio.wait_for(retiring.wait(), 3)
            self.assertEqual(len(self.saves), 1)
            applying.cancel()
            await asyncio.sleep(0)
            self.assertFalse(applying.done())
            release.set()
            with self.assertRaises(asyncio.CancelledError):
                await asyncio.wait_for(applying, 3)
        self.assertNotIn(self.entity, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.calls[-1], ("set_temperature", {"entity_id": self.entity, "target_temp_low": 20, "target_temp_high": 24}))

    async def test_storage_failure_restores_owned_fields_preserves_live_override(self):
        self.data["zones"][self.entity]["schedule"] = self.scalar_week()
        correction = {"destinations": [{"source": "default", "entity_id": self.entity, "schedule": self.range_week()}]}
        async def fail():
            self.data["zones"][self.entity]["override"] = {"type": "pause", "action": "none"}
            raise OSError("disk failure")
        self.scheduler._async_save_data = fail
        with self.assertRaises(OSError):
            await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, correction)
        self.assertNotIn("target_range_modes", self.data["zones"][self.entity])
        self.assertEqual(self.data["zones"][self.entity]["schedule"], self.scalar_week())
        self.assertEqual(self.data["zones"][self.entity]["override"]["type"], "pause")
        self.assertEqual(self.data["configuration_revision"], 0)

    def test_first_policy_change_checks_boost_and_restoration(self):
        self.data["zones"][self.entity]["override"] = {"type": "boost", "hvac_mode": "heat", "temperature": 23,
            "previous_state": {"hvac_mode": "heat", "temperature": 22}}
        review = self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0)
        self.assertFalse(review["can_apply"])
        self.assertEqual({blocker["type"] for blocker in review["temporary_blockers"]}, {"boost", "previous_state"})

    def test_compatible_override_does_not_block(self):
        self.data["zones"][self.entity]["override"] = {"type": "boost", "hvac_mode": "cool", "temperature": 23}
        self.assertTrue(self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0)["can_apply"])

    def test_observed_snapshot_uses_observed_attributes_and_configured_mode(self):
        self.data["zones"][self.entity]["target_range_modes"] = ["heat"]
        observed = deepcopy(self.state)
        self.state.state = "cool"
        self.state.attributes["supported_features"] = 1
        snapshot = self.manager.climate_state_snapshot_from_state(self.entity, observed)
        self.assertEqual(snapshot["target_temp_low"], 20)
        self.assertNotIn("temperature", snapshot)
        observed.attributes.pop("target_temp_high")
        self.assertNotIn("temperature", self.manager.climate_state_snapshot_from_state(self.entity, observed))

    async def test_reject_stale_revision_invalid_modes_and_exclusive_climate(self):
        for modes, revision in ((["heat", "heat"], 0), (["dry"], 0), (["heat"], 4)):
            with self.subTest(modes=modes, revision=revision), self.assertRaises(ValueError):
                await self.scheduler.async_apply_target_range_policy(self.entity, modes, revision)
        self.state.attributes["supported_features"] = 2
        with self.assertRaises(ValueError):
            self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0)

    def test_portable_20_and_optional_empty_policy_survive_normalization(self):
        self.assertEqual(EXPORT_MODEL_VERSION, 22)
        self.data["zones"][self.entity]["target_range_modes"] = []
        exported = _export_zones(self.data["zones"])
        self.assertEqual(exported[self.entity]["target_range_modes"], [])
        restored = normalize_schedule_data({"zones": exported}, [self.entity])
        self.assertEqual(restored["zones"][self.entity]["target_range_modes"], [])

    def test_scalar_policy_does_not_restore_residual_pair(self):
        self.data["zones"][self.entity]["target_range_modes"] = []
        self.state.state = "heat_cool"
        self.state.attributes.pop("temperature")
        snapshot = self.manager.climate_state_snapshot(self.entity)
        self.assertNotIn("target_temp_low", snapshot)
        self.assertNotIn("temperature", snapshot)

    def test_manual_preserved_observation_blocks_incompatible_policy(self):
        self.data["zones"][self.entity]["override"] = {"type": "pause", "action": "none"}
        review = self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0)
        self.assertEqual(review["temporary_blockers"][0]["type"], "preserved_state")
        self.assertFalse(review["can_apply"])

    async def test_live_blockers_are_rechecked_after_waiting_for_zone_lock(self):
        lock = self.scheduler._zone_override_lock(self.entity)
        await lock.acquire()
        try:
            task = asyncio.create_task(self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0))
            for _ in range(5):
                await asyncio.sleep(0)
            self.data["zones"][self.entity]["override"] = {"type": "boost", "hvac_mode": "heat", "temperature": 23}
        finally:
            lock.release()
        with self.assertRaisesRegex(ValueError, "active temporary"):
            await task
        self.assertNotIn("target_range_modes", self.data["zones"][self.entity])
        self.assertFalse(self.saves)

    def shared_template(self):
        other = "climate.other"
        self.hass.states[other] = deepcopy(self.state)
        self.data["zones"][other] = deepcopy(self.data["zones"][self.entity])
        self.data["templates"] = [{"key": "daily", "name": "Daily", "blocks": [
            {"slot_id": "morning", "start": "00:00", "action": "set_temperature", "hvac_mode": "heat", "temperature": 22}]}]
        for entity in (self.entity, other):
            self.data["zones"][entity]["template_links"] = {self.weekday: {"template_key": "daily", "mode": "full"}}
        return other

    async def test_shared_resource_fields_are_rejected_even_when_empty(self):
        self.shared_template()
        before = deepcopy(self.data)
        for field in ("templates", "block_presets"):
            for resources in ([], [{"key": "daily"}]):
                corrections = {field: resources}
                with self.subTest(field=field, resources=resources):
                    with self.assertRaisesRegex(ValueError, "Unsupported target policy corrections"):
                        self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0, corrections)
                    with self.assertRaisesRegex(ValueError, "Unsupported target policy corrections"):
                        await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, corrections)
        self.assertEqual(self.data, before)
        self.assertFalse(self.saves)

    async def test_local_preset_corrections_preserve_resources_other_climates_and_unaffected_references(self):
        other = self.shared_template()
        self.data["templates"] = []
        for zone in self.data["zones"].values():
            zone["template_links"] = {}
        self.data["block_presets"] = [
            {"key": "comfort", "name": "Comfort", "config": {"action": "set_temperature", "hvac_mode": "heat", "temperature": 22}},
            {"key": "cool", "name": "Cool", "config": {"action": "set_temperature", "hvac_mode": "cool", "temperature": 24}},
        ]
        week = empty_week_schedule()
        week[self.weekday] = [{"start": "00:00", "preset_key": "comfort"}, {"start": "12:00", "preset_key": "cool"}]
        week["sunday"] = [{"start": "00:00", "preset_key": "cool"}]
        self.data["zones"][self.entity]["schedule"] = deepcopy(week)
        self.data["zones"][other]["schedule"] = deepcopy(week)
        self.data["profiles"] = [{"key": "work", "name": "Work", "zones": {
            entity: {"behavior": "schedule", "schedule": deepcopy(week)} for entity in (self.entity, other)}}]
        before = deepcopy(self.data)
        corrected = deepcopy(week)
        corrected[self.weekday][0] = self.range_week()[self.weekday][0]
        corrections = {"destinations": [
            {"source": "default", "entity_id": self.entity, "schedule": corrected},
            {"source": "profile", "profile_key": "work", "entity_id": self.entity, "schedule": corrected},
        ]}
        review = self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0, corrections)
        self.assertTrue(review["can_apply"])
        self.assertNotIn("usages", review)
        self.assertEqual(self.data, before)
        await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, corrections)
        self.assertEqual(self.data["block_presets"], before["block_presets"])
        self.assertEqual(self.data["templates"], before["templates"])
        self.assertEqual(self.data["zones"][other], before["zones"][other])
        self.assertEqual(self.data["profiles"][0]["zones"][other], before["profiles"][0]["zones"][other])
        self.assertEqual(self.data["zones"][self.entity]["schedule"], corrected)
        self.assertEqual(self.data["profiles"][0]["zones"][self.entity]["schedule"], corrected)
        self.assertEqual(self.data["configuration_revision"], 1)
        self.assertEqual(len(self.saves), 1)

    async def test_local_full_link_correction_preserves_untouched_links(self):
        await self.assert_local_link_correction("full")

    async def test_local_hours_link_correction_preserves_untouched_links(self):
        await self.assert_local_link_correction("hours")

    async def assert_local_link_correction(self, mode):
        other = self.shared_template()
        self.data["block_presets"] = [{"key": "cool", "name": "Cool", "config": {
            "action": "set_temperature", "hvac_mode": "cool", "temperature": 24}}]
        self.data["templates"].append({"key": "cool_day", "name": "Cool day", "blocks": [
            {"slot_id": "night", "start": "00:00", "preset_key": "cool"}]})
        for entity in (self.entity, other):
            self.data["zones"][entity]["template_links"]["sunday"] = {"template_key": "cool_day", "mode": "full"}
            if mode == "hours":
                self.data["zones"][entity]["template_links"][self.weekday] = {
                    "template_key": "daily", "mode": "hours", "bindings": {"morning": {
                        "action": "set_temperature", "hvac_mode": "heat", "temperature": 22}}}
        before = deepcopy(self.data)
        links = deepcopy(self.data["zones"][self.entity]["template_links"])
        schedule = empty_week_schedule()
        if mode == "full":
            links.pop(self.weekday)
            schedule[self.weekday] = self.range_week()[self.weekday]
        else:
            links[self.weekday]["bindings"]["morning"] = {
                "action": "set_temperature", "hvac_mode": "heat", "target_temp_low": 20, "target_temp_high": 24}
        corrections = {"destinations": [{"source": "default", "entity_id": self.entity,
            "schedule": schedule, "template_links": links}]}
        review = self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0, corrections)
        self.assertTrue(review["can_apply"])
        await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, corrections)
        self.assertEqual(self.data["templates"], before["templates"])
        self.assertEqual(self.data["block_presets"], before["block_presets"])
        self.assertEqual(self.data["zones"][other], before["zones"][other])
        self.assertEqual(self.data["zones"][self.entity]["template_links"]["sunday"],
                         before["zones"][self.entity]["template_links"]["sunday"])
        self.assertEqual(self.data["zones"][self.entity]["template_links"], links)
        self.assertEqual(self.data["configuration_revision"], 1)
        self.assertEqual(len(self.saves), 1)

    async def test_local_detach_preserves_shared_template_and_other_consumer(self):
        other = self.shared_template()
        before = deepcopy(self.data["templates"])
        correction = {"destinations": [{"source": "default", "entity_id": self.entity,
                                       "schedule": self.range_week(), "template_links": {}}]}
        review = self.scheduler.preview_target_range_policy(self.entity, ["heat"], 0, correction)
        self.assertTrue(review["can_apply"])
        self.assertEqual(review["unlinked_days"], [{"source": "default", "entity_id": self.entity, "weekday": self.weekday}])
        await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, correction)
        self.assertEqual(self.data["templates"], before)
        self.assertEqual(self.data["zones"][other]["template_links"][self.weekday]["template_key"], "daily")

    async def test_local_review_rejects_other_climate_and_invalid_destination_collections(self):
        other = self.shared_template()
        before = deepcopy(self.data)
        requests = [[], {"destinations": None}, {"destinations": {}}, {"destinations": [{
            "source": "default", "entity_id": other, "schedule": self.range_week()}]}]
        for corrections in requests:
            with self.subTest(corrections=corrections), self.assertRaises(ValueError):
                await self.scheduler.async_apply_target_range_policy(self.entity, ["heat"], 0, corrections)
        self.assertEqual(self.data, before)
        self.assertFalse(self.saves)

    async def test_portable_export_preview_and_apply_preserves_policy(self):
        from custom_components.velair import api
        self.data["zones"][self.entity]["target_range_modes"] = ["heat"]
        self.data["zones"][self.entity]["schedule"] = self.range_week()
        payload = {"format": api.EXPORT_FORMAT, "model_version": 20,
                   "temperature_unit": "°C", "sections": {"zones": api._export_zones(self.data["zones"])}}
        runtime = {"scheduler": self.scheduler, "storage": SimpleNamespace(data=self.data, effective_temperature_unit="°C")}
        imported = api._build_import_data(runtime, payload, ["zones"])
        self.assertEqual(imported["zones"][self.entity]["target_range_modes"], ["heat"])
        self.data["zones"][self.entity].pop("target_range_modes")
        self.data["zones"][self.entity]["schedule"] = empty_week_schedule()
        await self.scheduler.async_replace_portable_data(**imported)
        self.assertEqual(self.data["zones"][self.entity]["target_range_modes"], ["heat"])

    async def test_websocket_preview_is_pure_and_unmanaged_target_rejected(self):
        from custom_components.velair import api
        runtime = {"scheduler": self.scheduler,
                   "storage": SimpleNamespace(temperature_migration_required=False),
                   "operation_active": None, "operation_recovery": None}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        message = {"id": 1, "type": "velair/preview_target_range_policy", "entity_id": self.entity,
                   "target_range_modes": ["heat"], "expected_revision": 0}
        with patch.object(api, "_get_runtime", return_value=runtime):
            await api.ws_preview_target_range_policy(self.hass, connection, message)
            self.assertTrue(connection.send_result.call_args.args[1]["can_apply"])
            self.assertNotIn("target_range_modes", self.data["zones"][self.entity])
            message["entity_id"] = "climate.unmanaged"
            await api.ws_preview_target_range_policy(self.hass, connection, message)
        connection.send_error.assert_called_once()
        self.assertFalse(self.saves)

    async def test_websocket_apply_returns_backend_state_and_revision_conflict(self):
        from custom_components.velair import api
        runtime = {"scheduler": self.scheduler,
                   "storage": SimpleNamespace(temperature_migration_required=False),
                   "operation_active": None, "operation_recovery": None}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        message = {"id": 1, "type": "velair/apply_target_range_policy", "entity_id": self.entity,
                   "target_range_modes": ["heat"], "expected_revision": 0}
        with patch.object(api, "_get_runtime", return_value=runtime), patch.object(api, "_build_schedule_response", return_value={"saved": True}):
            await api.ws_apply_target_range_policy(self.hass, connection, message)
            connection.send_result.assert_called_once_with(1, {"saved": True})
            await api.ws_apply_target_range_policy(self.hass, connection, message)
        self.assertEqual(connection.send_error.call_args.args[1], "revision_conflict")

    async def test_capability_change_refreshes_policy_without_saving_settings(self):
        self.data["zones"][self.entity]["last_reported_target_temp_step"] = .5
        with patch.object(self.scheduler, "_async_write_state") as notify:
            await self.scheduler.async_capture_reported_target_temp_steps(self.entity)
            notify.reset_mock()
            self.state.attributes["hvac_modes"].remove("cool")
            await self.scheduler.async_capture_reported_target_temp_steps(self.entity)
            notify.assert_called_once()
            self.assertFalse(self.saves)

    async def test_mapped_mixed_modes_deliver_pair_and_reject_wrong_format_before_call(self):
        self.data["zones"][self.entity]["target_range_modes"] = ["heat", "cool", "auto", "heat_cool"]
        calls = []
        async def call(domain, service, data, **kwargs):
            calls.append((service, dict(data)))
        self.hass.services.async_call = call
        for mode in ("heat", "cool", "auto"):
            with self.subTest(mode=mode):
                calls.clear()
                await self.manager.async_set_temperature_range(self.entity, target_temp_low=20,
                    target_temp_high=24, hvac_mode=mode)
                target = next(data for service, data in calls if service == "set_temperature")
                self.assertEqual(target, {"entity_id": self.entity, "target_temp_low": 20, "target_temp_high": 24})
                calls.clear()
                with self.assertRaises(ValueError):
                    await self.manager.async_set_temperature(self.entity, temperature=22, hvac_mode=mode)
                self.assertFalse(calls)

    async def test_temperature_only_off_uses_configured_pair_without_activation(self):
        self.data["zones"][self.entity]["target_range_modes"] = ["heat"]
        self.state.state = "off"
        calls = []
        async def call(domain, service, data, **kwargs):
            calls.append((service, dict(data)))
        self.hass.services.async_call = call
        await self.manager.async_set_temperature_range(self.entity, target_temp_low=20,
            target_temp_high=24, temperature_only=True)
        self.assertEqual(calls, [("set_temperature", {"entity_id": self.entity, "target_temp_low": 20, "target_temp_high": 24})])

    def test_mapped_mixed_range_suppresses_residual_scalar_in_runtime_and_assist(self):
        self.data["zones"][self.entity]["target_range_modes"] = ["heat"]
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity]
        self.assertIsNone(runtime["target_temperature"])
        self.assertIsNone(runtime["applied_temperature"])
        self.assertEqual((runtime["target_temp_low"], runtime["target_temp_high"]), (20, 24))
        assist = self.scheduler.get_room_sensor_assist_status(self.entity)
        self.assertIsNone(assist["climate_target_temperature"])

    def test_incomplete_mapped_range_does_not_fall_back_to_residual_scalar(self):
        self.data["zones"][self.entity]["target_range_modes"] = ["heat"]
        self.state.attributes.pop("target_temp_high")
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity]
        self.assertIsNone(runtime["target_temperature"])
        self.assertIsNone(runtime["applied_temperature"])
        self.assertNotIn("target_temp_low", runtime)
        self.assertIsNone(self.scheduler._climate_target_range(self.entity))
        self.assertIsNone(self.scheduler.get_room_sensor_assist_status(self.entity)["climate_target_temperature"])

    def test_unmapped_mixed_mode_keeps_scalar_and_ignores_residual_pair(self):
        self.data["zones"][self.entity]["target_range_modes"] = ["cool"]
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity]
        self.assertEqual(runtime["target_temperature"], 22)
        self.assertEqual(runtime["applied_temperature"], 22)
        self.assertNotIn("target_temp_low", runtime)
        self.assertEqual(self.scheduler.get_room_sensor_assist_status(self.entity)["climate_target_temperature"], 22)
