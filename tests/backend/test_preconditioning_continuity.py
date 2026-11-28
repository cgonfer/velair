"""A verified early arrival retains nominal authority without restarting learning."""
import asyncio
from copy import deepcopy
from datetime import timedelta
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch

from . import test_preconditioning_offset_runtime as fixture
from .helpers import NOW, scheduler_module
from . import test_fixed_range_reference as range_fixture
from . import test_planned_return_delivery as return_fixture


class CompletedPreconditioningContinuityTest(IsolatedAsyncioTestCase):
    setUp = fixture.PreconditioningOffsetRuntimeTest.setUp
    configure = fixture.PreconditioningOffsetRuntimeTest.configure
    _async_save = fixture.PreconditioningOffsetRuntimeTest._async_save
    preparation = fixture.PreconditioningOffsetRuntimeTest.preparation

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    def prepare(self, mode="heat", offset=0, assist=False):
        event = self.preparation(mode, assist)
        config = self.data["zones"][self.entity_id]["preconditioning"]
        config.update(heating_setpoint_offset=offset, cooling_setpoint_offset=offset)
        self.data["zones"][self.entity_id]["schedule"]["tuesday"].insert(0, {
            "start": "17:00", "action": "set_temperature", "temperature": 20 if mode == "heat" else 22,
            "hvac_mode": mode})
        self.scheduler._prepare_runtime_projection(NOW, configuration=True)
        return self.scheduler.calculate_next_event(NOW)

    async def complete(self, mode="heat", offset=0, assist=False):
        event = self.prepare(mode, offset, assist)
        await self.scheduler._async_apply_event(event, source="test")
        arrival = 20.9 if mode == "heat" else 21.1
        when = NOW + timedelta(minutes=5)
        self.hass.states["sensor.room"].state = str(arrival)
        self.hass.states[self.entity_id].attributes["current_temperature"] = arrival
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            await self.scheduler._async_observe_preconditioning_temperature(self.entity_id, when, arrival)
        return event, when

    def restart(self, data):
        self.scheduler = scheduler_module.VelairScheduler(self.hass, data, self.climate, self._async_save)
        self.data = data

    async def test_arrival_without_offset_or_assist_retains_future_nominal_after_learning_closes(self):
        event, when = await self.complete()
        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            self.assertEqual(self.scheduler.get_active_target_event(self.entity_id).temperature, 21)
            self.assertEqual(self.scheduler.get_zone_runtime_status(self.entity_id)["target_temperature"], 21)
        marker = next(iter(self.scheduler._applied_preconditioning_targets.values()))
        self.assertTrue(marker.retired)
        self.assertIsNone(marker.offset)
        self.assertEqual(marker.completed_at, when)
        anchor = next(iter(self.data["preconditioning_accepted_anchors"].values()))
        self.assertEqual(anchor["completed_at"], when.isoformat())
        self.assertEqual(anchor["target_when"], event.target_when.isoformat())

    async def test_room_assist_completion_recovers_nominal_but_not_preparation_extra(self):
        for mode in ("heat", "cool"):
            with self.subTest(mode=mode):
                await self.scheduler.async_stop()
                self.setUp()
                _, when = await self.complete(mode, 2, True)
                saved = deepcopy(self.data)
                await self.scheduler.async_stop()
                with patch.object(scheduler_module.dt_util, "now", return_value=when):
                    self.restart(saved)
                    await self.scheduler.async_start(apply_current_schedule=True)
                    state = self.scheduler._room_sensor_assist_states[self.entity_id]
                    self.assertEqual(state.target_temperature, 21)
                    self.assertIsNone(state.preconditioning_offset)
                    self.assertFalse(self.scheduler._preconditioning_sessions)

    async def test_pending_capabilities_defer_startup_without_consuming_permission_or_old_block_fallback(self):
        _, when = await self.complete()
        saved = deepcopy(self.data)
        await self.scheduler.async_stop()
        self.hass.states[self.entity_id].state = "unavailable"
        self.climate.calls.clear()
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            self.restart(saved)
            await self.scheduler.async_start(apply_current_schedule=True)
            self.assertIn(self.entity_id, self.scheduler._startup_pending)
            self.assertIsNone(self.scheduler.get_zone_runtime_status(self.entity_id)["target_temperature"])
            self.assertFalse(self.climate.calls)
            self.hass.states[self.entity_id].state = "heat"
            self.scheduler._prepare_runtime_projection(when, configuration=True, hydrate_completed=True)
            await self.scheduler._async_apply_pending_startup()
            self.assertNotIn(self.entity_id, self.scheduler._startup_pending)
            self.assertEqual(self.climate.calls[-1][2], 21)

    async def test_enabled_but_never_accepted_does_not_promote_reported_device_target(self):
        self.prepare()
        self.hass.states[self.entity_id].attributes.update(current_temperature=20.9, temperature=21)
        self.scheduler._prepare_runtime_projection(NOW, configuration=True, hydrate_completed=True)
        self.assertEqual(self.scheduler.get_active_target_event(self.entity_id).temperature, 20)
        self.assertFalse(self.data.get("preconditioning_accepted_anchors"))

    async def test_opposite_offset_edit_preserves_completed_rule_but_same_direction_edit_revokes_it(self):
        _, when = await self.complete()
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            await self.scheduler.async_update_zone_preconditioning(self.entity_id, {"cooling_setpoint_offset": 2})
            self.assertIsNotNone(self.scheduler._completed_preconditioning_event(self.entity_id, when))
            await self.scheduler.async_update_zone_preconditioning(self.entity_id, {"heating_setpoint_offset": 2})
            self.assertIsNone(self.scheduler._completed_preconditioning_event(self.entity_id, when))

    async def test_learning_only_reset_preserves_completed_control_checkpoint(self):
        _, when = await self.complete()
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            await self.scheduler.async_reset_zone_preconditioning_learning(self.entity_id, "heat")
            self.assertIsNotNone(self.scheduler._completed_preconditioning_event(self.entity_id, when))

    async def test_restart_both_directions_offset_and_startup_choices_never_restore_extra_or_learning(self):
        for mode in ("heat", "cool"):
            for offset in (0, 2):
                for startup in (False, True):
                    with self.subTest(mode=mode, offset=offset, startup=startup):
                        await self.scheduler.async_stop()
                        self.setUp()
                        _, when = await self.complete(mode, offset)
                        saved = deepcopy(self.data)
                        await self.scheduler.async_stop()
                        # Device and room drift while HA is offline. Hydration
                        # proves the earlier arrival, not a new preparation.
                        room = 18 if mode == "heat" else 24
                        self.hass.states["sensor.room"].state = str(room)
                        self.hass.states[self.entity_id].attributes.update(current_temperature=room, temperature=19)
                        self.climate.calls.clear()
                        with patch.object(scheduler_module.dt_util, "now", return_value=when):
                            self.restart(saved)
                            self.assertEqual(self.scheduler.get_active_target_event(self.entity_id).temperature, 21)
                            self.assertFalse(self.scheduler._preconditioning_sessions)
                            await self.scheduler.async_start(apply_current_schedule=startup)
                            if startup:
                                self.assertEqual(self.climate.calls[-1][2], 21)
                            else:
                                self.assertEqual(self.climate.calls, [])
                            self.assertFalse(self.scheduler._preconditioning_sessions)
                            self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity_id))

    async def test_legacy_source_receipt_never_implies_completed_own_target(self):
        _, when = await self.complete()
        saved = deepcopy(self.data)
        for anchor in saved["preconditioning_accepted_anchors"].values():
            for field in ("completed_at", "weekday", "start", "completion_context"):
                anchor.pop(field)
        await self.scheduler.async_stop()
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            self.restart(saved)
            self.assertEqual(self.scheduler.get_active_target_event(self.entity_id).temperature, 20)

    async def test_failed_checkpoint_still_withdraws_extra_and_does_not_retry_on_reads_or_samples(self):
        event = self.prepare(offset=2)
        await self.scheduler._async_apply_event(event, source="test")
        self.scheduler._discard_preconditioning_session(self.entity_id, report=False)
        save = AsyncMock(side_effect=RuntimeError("storage unavailable"))
        self.scheduler._async_save_data = save
        when = NOW + timedelta(minutes=1)
        self.hass.states[self.entity_id].attributes["current_temperature"] = 20.9
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            with self.assertLogs(scheduler_module.__name__, level="WARNING"):
                await self.scheduler._async_observe_preconditioning_temperature(self.entity_id, when, 20.9)
            self.assertEqual(self.climate.calls[-1][2], 21)
            for _ in range(3):
                self.assertEqual(self.scheduler.get_active_target_event(self.entity_id).temperature, 21)
                await self.scheduler._async_observe_preconditioning_temperature(self.entity_id, when, 20.9)
        self.assertEqual(save.await_count, 1)

    async def test_completed_reads_do_not_compute_context_resolve_schedule_or_persist(self):
        _, when = await self.complete()
        self.scheduler._async_save_data = AsyncMock()
        with patch.object(scheduler_module.dt_util, "now", return_value=when), \
                patch.object(self.scheduler, "_compute_dependency_context", side_effect=AssertionError("read computed context")), \
                patch.object(self.scheduler, "_compute_completion_context", side_effect=AssertionError("read computed context")), \
                patch.object(self.scheduler, "_hydrate_completed_preconditioning", side_effect=AssertionError("read hydrated")), \
                patch.object(self.scheduler, "_resolve_effective_schedule", side_effect=AssertionError("read resolved week")):
            calls = list(self.climate.calls)
            for _ in range(5):
                self.assertEqual(self.scheduler.get_active_target_event(self.entity_id).temperature, 21)
                self.scheduler.get_zone_runtime_status(self.entity_id)
            self.assertEqual(self.climate.calls, calls)
            self.scheduler._async_save_data.assert_not_awaited()

    async def test_source_expiry_does_not_prune_live_completion_and_own_expiry_does_not_extend_source(self):
        _, when = await self.complete()
        key, anchor = next(iter(self.data["preconditioning_accepted_anchors"].items()))
        anchor["expires_at"] = (when - timedelta(minutes=1)).isoformat()
        self.scheduler._bound_preconditioning_anchors(when)
        self.assertIn(key, self.data["preconditioning_accepted_anchors"])
        self.assertNotIn(key, self.scheduler._accepted_dependency_anchors(when))
        anchor["expires_at"] = (when + timedelta(hours=3)).isoformat()
        self.scheduler._bound_preconditioning_anchors(when + timedelta(hours=2))
        self.assertIn(key, self.data["preconditioning_accepted_anchors"])
        self.assertIn(key, self.scheduler._accepted_dependency_anchors(when + timedelta(hours=2)))

    async def test_pause_revokes_completion_durably_and_resume_does_not_revive_it(self):
        _, when = await self.complete()
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            await self.scheduler.async_set_mode("paused")
            self.assertNotIn("completed_at", next(iter(self.data["preconditioning_accepted_anchors"].values())))
            await self.scheduler.async_set_mode("auto")
            self.assertIsNone(self.scheduler._completed_preconditioning_event(self.entity_id, when))

    async def test_failed_authority_save_restores_only_its_completion_fields(self):
        _, when = await self.complete()
        key, anchor = next(iter(self.data["preconditioning_accepted_anchors"].items()))
        self.scheduler._prepare_runtime_projection(when, configuration=True)
        self.data["zones"][self.entity_id]["override"] = {"type": "manual"}
        other = {"entity_id": "climate.other", "completed_at": when.isoformat()}
        with self.assertRaises(RuntimeError):
            with self.scheduler._projection_save_scope({self.entity_id}):
                self.assertNotIn("completed_at", self.data["preconditioning_accepted_anchors"][key])
                self.data["preconditioning_accepted_anchors"]["unrelated"] = other
                raise RuntimeError("failed proposed save")
        self.assertEqual(self.data["preconditioning_accepted_anchors"][key]["completed_at"], when.isoformat())
        self.assertIs(self.data["preconditioning_accepted_anchors"]["unrelated"], other)

    async def test_manual_interruption_is_durable_and_not_revived_by_restart(self):
        _, when = await self.complete()
        self.climate.snapshots[self.entity_id] = {"state": "heat", "hvac_mode": "heat", "temperature": 21}
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            await self.scheduler.async_enter_manual_adjustment(self.entity_id)
            self.assertNotIn("completed_at", next(iter(self.data["preconditioning_accepted_anchors"].values())))
            saved = deepcopy(self.data)
            await self.scheduler.async_stop()
            self.restart(saved)
            self.assertIsNone(self.scheduler._completed_preconditioning_event(self.entity_id, when))

    async def test_whole_control_import_revokes_but_learning_only_import_preserves(self):
        _, when = await self.complete()
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            await self.scheduler.async_replace_portable_data(preconditioning_learning={})
            self.assertIsNotNone(self.scheduler._completed_preconditioning_event(self.entity_id, when))
            await self.scheduler.async_replace_portable_data(zones=deepcopy(self.data["zones"]))
            self.assertIsNone(self.scheduler._completed_preconditioning_event(self.entity_id, when))
            self.assertNotIn("completed_at", next(iter(self.data["preconditioning_accepted_anchors"].values())))

    async def test_unrelated_arrival_survives_failed_pause_save_overlap(self):
        _, when = await self.complete()
        other = "climate.other"
        self.data["zones"][other] = deepcopy(self.data["zones"][self.entity_id])
        self.data["zones"][other]["preconditioning"]["room_temperature_entity_id"] = "sensor.other"
        self.hass.states[other] = deepcopy(self.hass.states[self.entity_id])
        self.hass.states[other].attributes["current_temperature"] = 18
        self.hass.states["sensor.other"] = deepcopy(self.hass.states["sensor.room"])
        self.hass.states["sensor.other"].state = "18"
        self.scheduler._prepare_runtime_projection(when, configuration=True)
        event = next(item for item in self.scheduler._iter_future_events(when) if item.entity_id == other)
        await self.scheduler._async_apply_event(event, source="test")
        started, release = asyncio.Event(), asyncio.Event()
        calls = 0
        async def save():
            nonlocal calls
            calls += 1
            if calls == 1:
                started.set()
                await release.wait()
                raise RuntimeError("pause save failed")
        self.scheduler._async_save_data = save
        when += timedelta(minutes=5)
        with patch.object(scheduler_module.dt_util, "now", return_value=when):
            pause = asyncio.create_task(self.scheduler.async_pause_zone(self.entity_id))
            await started.wait()
            self.hass.states[other].attributes["current_temperature"] = 20.9
            self.hass.states["sensor.other"].state = "20.9"
            await self.scheduler._async_observe_preconditioning_temperature(other, when, 20.9)
            release.set()
            with self.assertRaisesRegex(RuntimeError, "pause save failed"):
                await pause
            self.assertIsNotNone(self.scheduler._completed_preconditioning_event(self.entity_id, when))
            self.assertIsNotNone(self.scheduler._completed_preconditioning_event(other, when))
            self.assertEqual(sum("completed_at" in anchor for anchor in self.data["preconditioning_accepted_anchors"].values()), 2)


class CompletedRangeContinuityTest(IsolatedAsyncioTestCase):
    setUp = range_fixture.FixedRangeReferenceTest.setUp
    save = range_fixture.FixedRangeReferenceTest.save
    block = range_fixture.FixedRangeReferenceTest.block
    configure = range_fixture.FixedRangeReferenceTest.configure

    async def asyncTearDown(self):
        self.clock.stop()
        await self.scheduler.async_stop()

    async def test_native_and_fixed_selected_boundaries_checkpoint_and_recover_exact_pair(self):
        for mode, reference, room, arrival in (
            ("heat_cool", "low", 18, 20.9), ("heat_cool", "high", 28, 25.1),
            ("heat", "low", 18, 20.9), ("heat", "high", 22, 24.9),
            ("cool", "low", 24, 21.1), ("cool", "high", 28, 25.1),
        ):
            with self.subTest(mode=mode, reference=reference):
                self.configure(mode, reference, room)
                self.block()["start"] = "19:00"
                self.state.attributes["hvac_modes"].append("heat_cool")
                config = self.data["zones"][self.entity]["preconditioning"]
                config.update(heating_setpoint_offset=2, cooling_setpoint_offset=2,
                              minimum_delta_temperature=.1)
                self.scheduler._applied_preconditioning_targets.clear()
                self.scheduler._room_sensor_assist_states.clear()
                self.data["preconditioning_accepted_anchors"] = {}
                self.scheduler._prepare_runtime_projection(NOW, configuration=True)
                event = self.scheduler.calculate_next_event(NOW)
                self.assertIsNotNone(event.target_when)
                await self.scheduler._async_apply_event(event, source="test")
                self.hass.states["sensor.room"].state = str(arrival)
                when = NOW + timedelta(minutes=5)
                with patch.object(scheduler_module.dt_util, "now", return_value=when):
                    await self.scheduler._async_observe_preconditioning_temperature(self.entity, when, arrival)
                    saved = deepcopy(self.data)
                    await self.scheduler.async_stop()
                    self.scheduler = scheduler_module.VelairScheduler(self.hass, saved, self.manager, self.save)
                    self.data = saved
                    target = self.scheduler.get_active_target_event(self.entity)
                    self.assertEqual((target.target_temp_low, target.target_temp_high), (21, 25))
                    self.assertFalse(self.scheduler._preconditioning_sessions)
                    self.assertIsNone(self.scheduler._accepted_preconditioning_offset(self.entity))


class CompletedReturnContinuityTest(IsolatedAsyncioTestCase):
    asyncSetUp = return_fixture.PlannedReturnDeliveryTest.asyncSetUp
    track_timer = return_fixture.PlannedReturnDeliveryTest.track_timer
    track_listener = return_fixture.PlannedReturnDeliveryTest.track_listener
    settle = return_fixture.PlannedReturnDeliveryTest.settle
    tick = return_fixture.PlannedReturnDeliveryTest.tick

    async def test_return_completion_recovers_same_episode_without_early_delivery_latch(self):
        await self.tick()
        self.assertTrue(self.scheduler._applied_preconditioning_targets)
        self.clock[0] += timedelta(minutes=5)
        self.hass.states[self.entity].attributes["current_temperature"] = 17.9
        await self.scheduler._async_observe_preconditioning_temperature(self.entity, self.clock[0], 17.9)
        self.assertIsNotNone(self.scheduler._completed_preconditioning_event(self.entity, self.clock[0]))
        saved = deepcopy(self.data)
        await self.scheduler.async_stop()
        self.hass.states[self.entity].attributes["current_temperature"] = 10
        self.climate.calls.clear()
        restored = scheduler_module.VelairScheduler(self.hass, saved, self.climate, self.save)
        self.addAsyncCleanup(restored.async_stop)
        self.assertIsNotNone(restored._completed_preconditioning_event(self.entity, self.clock[0]))
        await restored.async_start(apply_current_schedule=False)
        await restored._planned_return._tick(self.clock[0], restored._planned_return._generation)
        self.assertEqual(self.climate.calls, [])
        self.assertFalse(restored._preconditioning_sessions)
