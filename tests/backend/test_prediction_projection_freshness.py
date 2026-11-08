"""Forecast reuse follows consumed inputs and real learning time boundaries."""

from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeClimateManager, FakeHass, NOW, scheduler_module
from custom_components.velair.models import normalize_schedule_data


HEAT, COOL = "climate.learning_heat", "climate.learning_cool"
SOURCES = {HEAT: "sensor.learning_heat", COOL: "sensor.learning_cool"}


class PredictionProjectionFreshnessTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.clock = [NOW]
        clock = patch.object(scheduler_module.dt_util, "now", lambda: self.clock[0])
        clock.start()
        self.addCleanup(clock.stop)

    def make(self, *, partial=False, future=False):
        hass, manager = FakeHass(), FakeClimateManager()
        data = normalize_schedule_data(None, [HEAT, COOL])
        for entity, mode, target, current in ((HEAT, "heat", 21, 19),
                                               (COOL, "cool", 23, 25)):
            data["zones"][entity]["schedule"]["tuesday"] = [
                {"start": "21:00", "temperature": target, "hvac_mode": mode}]
            data["zones"][entity]["preconditioning"].update(
                enabled=True, max_lead_minutes=180, room_sensor_assist_enabled=True,
                room_temperature_entity_id=SOURCES[entity], adaptive_percentile_enabled=False)
            hass.states[entity] = SimpleNamespace(state=mode, attributes={
                "current_temperature": current, "temperature": target,
                "hvac_modes": ["off", "heat", "cool"]})
            hass.states[SOURCES[entity]] = SimpleNamespace(
                state=str(current), attributes={"unit_of_measurement": "°C"})
            manager.current_hvac_modes[entity] = mode
            observations = [{
                "mode": mode, "quality": "complete", "reached": True,
                "delta_t": 2, "target_temp": target, "startup_minutes": minutes,
                "minutes_to_reach": minutes,
                "created_at": (NOW - timedelta(days=35 + index)).isoformat(),
            } for index, minutes in enumerate((40, 50, 60, 70, 80))]
            if partial:
                observations.append({
                    "mode": mode, "quality": "partial", "reached": False,
                    "delta_t": 2, "target_temp": target, "startup_minutes": 90,
                    "minutes_to_reach": None,
                    "created_at": (NOW - timedelta(days=30)).isoformat(),
                })
            if future:
                observations[-1]["created_at"] = (NOW + timedelta(seconds=10)).isoformat()
            data["preconditioning_learning"][entity][mode]["observations"] = observations
        scheduler = scheduler_module.VelairScheduler(hass, data, manager, AsyncMock())
        self.addAsyncCleanup(scheduler.async_stop)
        return SimpleNamespace(s=scheduler, hass=hass, data=data, manager=manager)

    def forecasts(self, f, *, configuration=False):
        f.s._prepare_runtime_projection(self.clock[0], configuration=configuration)
        return f.s._schedule_projection.future(self.clock[0])

    def assert_fresh(self, f):
        reference = scheduler_module.VelairScheduler(
            f.hass, deepcopy(f.data), f.manager, AsyncMock())
        self.addAsyncCleanup(reference.async_stop)
        self.assertEqual(f.s._schedule_projection.future(self.clock[0]),
                         reference._schedule_projection.future(self.clock[0]))

    async def test_advancing_clock_reuses_learned_heating_and_cooling_predictions(self):
        f = self.make()
        expected = self.forecasts(f)
        self.assertEqual({event.entity_id for event in expected}, {HEAT, COOL})
        self.assertTrue(all(event.target_when for event in expected))
        with patch.object(scheduler_module, "predict_preconditioning_lead",
                          wraps=scheduler_module.predict_preconditioning_lead) as predict:
            for delta in (timedelta(microseconds=1), timedelta(seconds=10),
                          timedelta(minutes=5)):
                self.clock[0] = NOW + delta
                self.assertEqual(self.forecasts(f), expected)
                f.s._async_write_state()
            self.assertEqual(predict.call_count, 0)
        self.assert_fresh(f)

    async def test_pending_sensor_history_configuration_and_source_changes_recompute(self):
        for change in ("sensor", "history", "configuration", "source"):
            with self.subTest(change=change):
                f = self.make()
                self.clock[0] += timedelta(seconds=1)
                for entity, mode in ((HEAT, "heat"), (COOL, "cool")):
                    if change == "sensor":
                        f.hass.states[SOURCES[entity]].state = "18" if mode == "heat" else "26"
                    elif change == "history":
                        for row in f.data["preconditioning_learning"][entity][mode]["observations"]:
                            row["minutes_to_reach"] += 20
                    elif change == "configuration":
                        f.data["zones"][entity]["preconditioning"]["comfort_percentile"] = 95
                    else:
                        source = SOURCES[entity] + "_alternate"
                        f.hass.states[source] = SimpleNamespace(
                            state="18" if mode == "heat" else "26",
                            attributes={"unit_of_measurement": "°C"})
                        f.data["zones"][entity]["preconditioning"]["room_temperature_entity_id"] = source
                with patch.object(scheduler_module, "predict_preconditioning_lead",
                                  wraps=scheduler_module.predict_preconditioning_lead) as predict:
                    self.forecasts(f, configuration=change in ("configuration", "source"))
                    self.assertEqual(predict.call_count, 2)
                self.assert_fresh(f)

    async def test_partial_expiry_preserves_equality_then_recomputes_and_recovers_on_rewind(self):
        self.clock[0] = NOW - timedelta(microseconds=1)
        f = self.make(partial=True)
        active = self.forecasts(f)
        self.assertTrue(all(event.preconditioning_diagnostics["partial_floor_minutes"] == 108
                            for event in active))
        with patch.object(scheduler_module, "predict_preconditioning_lead",
                          wraps=scheduler_module.predict_preconditioning_lead) as predict:
            self.clock[0] = NOW
            self.assertEqual(self.forecasts(f), active)
            self.assertEqual(predict.call_count, 0)
            self.clock[0] += timedelta(microseconds=1)
            expired = self.forecasts(f)
            self.assertEqual(predict.call_count, 2)
            self.assertTrue(all(event.preconditioning_diagnostics["partial_floor_minutes"] == 0
                                for event in expired))
            self.clock[0] += timedelta(seconds=1)
            self.assertEqual(self.forecasts(f), expired)
            self.assertEqual(predict.call_count, 2)
            self.clock[0] = NOW
            self.assertEqual(self.forecasts(f), active)
            self.assertEqual(predict.call_count, 4)
        self.assert_fresh(f)

    async def test_future_complete_samples_remain_time_sensitive_until_their_boundary(self):
        f = self.make(future=True)
        with patch.object(scheduler_module, "predict_preconditioning_lead",
                          wraps=scheduler_module.predict_preconditioning_lead) as predict:
            for seconds, expected_calls in ((1, 2), (2, 4), (10, 6), (11, 6)):
                self.clock[0] = NOW + timedelta(seconds=seconds)
                self.forecasts(f)
                self.assertEqual(predict.call_count, expected_calls)
            self.clock[0] = NOW + timedelta(seconds=1)
            self.forecasts(f)
            self.assertEqual(predict.call_count, 8)
        self.assert_fresh(f)

    async def test_reused_prediction_still_crosses_early_start_and_nominal_boundaries(self):
        f = self.make()
        event = next(event for event in self.forecasts(f) if event.entity_id == HEAT)
        with patch.object(scheduler_module, "predict_preconditioning_lead",
                          wraps=scheduler_module.predict_preconditioning_lead) as predict:
            self.clock[0] = event.when - timedelta(microseconds=1)
            self.forecasts(f)
            self.assertIsNone(f.s._schedule_projection.due(HEAT, self.clock[0]))
            self.clock[0] = event.when
            self.forecasts(f)
            self.assertEqual(f.s._schedule_projection.due(HEAT, self.clock[0]), event)
            self.clock[0] = event.target_when
            remaining = self.forecasts(f)
            self.assertIsNone(f.s._schedule_projection.due(HEAT, self.clock[0]))
            self.assertNotIn(event, remaining)
            self.assertEqual(predict.call_count, 0)
        self.assert_fresh(f)

    async def test_missing_room_source_recovers_current_forecast_without_replaying_commands(self):
        f = self.make()
        expected = self.forecasts(f)
        for source in SOURCES.values():
            f.hass.states[source].state = "unavailable"
        unavailable = self.forecasts(f)
        self.assertTrue(all(event.target_when is None for event in unavailable))
        for entity, current in ((HEAT, 19), (COOL, 25)):
            f.hass.states[SOURCES[entity]].state = str(current)
        self.clock[0] += timedelta(seconds=1)
        with patch.object(scheduler_module, "predict_preconditioning_lead",
                          wraps=scheduler_module.predict_preconditioning_lead) as predict:
            self.assertEqual(self.forecasts(f), expected)
            self.assertEqual(predict.call_count, 2)
        self.assert_fresh(f)
        self.assertEqual(f.manager.calls, [])

    async def test_failed_prediction_does_not_cache_failed_inputs_and_next_refresh_recovers(self):
        f = self.make()
        f.hass.states[SOURCES[HEAT]].state = "18"
        with patch.object(scheduler_module, "predict_preconditioning_lead",
                          side_effect=RuntimeError("prediction failed")):
            with self.assertRaisesRegex(RuntimeError, "prediction failed"):
                self.forecasts(f)
        self.assertFalse(f.s._schedule_projection.preparing)
        with patch.object(scheduler_module, "predict_preconditioning_lead",
                          wraps=scheduler_module.predict_preconditioning_lead) as predict:
            self.forecasts(f)
            self.assertEqual(predict.call_count, 1)
        self.assert_fresh(f)
