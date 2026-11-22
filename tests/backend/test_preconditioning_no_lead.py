"""A valid prediction without an early start must preserve nominal scheduling."""

from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from . import test_scheduler_application as application
from .helpers import NOW, VelairScheduler, scheduler_module


class PreconditioningNoLeadTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        fixture = application.VelairSchedulerPreconditioningTest()
        fixture.setUp()
        self.entity_id = fixture.entity_id
        self.hass, self.climate, self.data = fixture.hass, fixture.climate, fixture.data
        self.save = fixture._async_save
        self.addAsyncCleanup(fixture.scheduler.async_stop)
        self.enterContext(patch.object(scheduler_module.dt_util, "now", return_value=NOW))

    def configure(self, mode, source, *, range_target=False):
        target, current = (21, 19) if mode == "heat" else (23, 25)
        self.hass.states[self.entity_id] = SimpleNamespace(
            state=mode, attributes={"current_temperature": current}
        )
        self.climate.hvac_modes[self.entity_id] = ["off", "heat", "cool", "heat_cool"]
        self.climate.temperature_range_support[self.entity_id] = True
        block = {"start": "20:00", "action": "set_temperature", "hvac_mode": mode}
        if range_target:
            block.update(hvac_mode="heat_cool", target_temp_low=21, target_temp_high=23)
        else:
            block["temperature"] = target
        zone = self.data["zones"][self.entity_id]
        zone["schedule"]["tuesday"] = [block]
        zone["preconditioning"]["min_start_minutes"] = 120 if source == "initial_model" else 10
        self.data["preconditioning_learning"] = {
            self.entity_id: application._preconditioning_learning([
                application._preconditioning_sample(mode, "complete", 5, delta_t=2)
                for _ in range(5)
            ] if source == "history" else [])
        }
        other = deepcopy(zone)
        other["preconditioning"]["enabled"] = False
        other["schedule"]["tuesday"][0]["start"] = "19:00"
        self.data["zones"]["climate.other"] = other
        self.hass.states["climate.other"] = self.hass.states[self.entity_id]

    def scheduler(self):
        scheduler = VelairScheduler(self.hass, self.data, self.climate, self.save)
        self.addAsyncCleanup(scheduler.async_stop)
        return scheduler

    def next_for_zone(self, scheduler):
        return next(event for event in scheduler._iter_future_events(NOW)
                    if event.entity_id == self.entity_id)

    def assert_nominal(self, scheduler):
        events = scheduler._iter_future_events(NOW)
        event = self.next_for_zone(scheduler)
        self.assertEqual(event.when, NOW + timedelta(hours=2))
        self.assertIsNone(event.target_when)
        self.assertIsNone(event.preconditioning_diagnostics)
        other = next(event for event in events if event.entity_id == "climate.other")
        self.assertEqual(other.when, NOW + timedelta(hours=1))
        self.assertEqual(self.climate.calls, [])

    async def test_startup_keeps_nominal_blocks_when_real_prediction_has_no_lead(self):
        for mode in ("heat", "cool"):
            for source in ("initial_model", "history"):
                for range_target in (False, True):
                    with self.subTest(mode=mode, source=source, range_target=range_target):
                        self.configure(mode, source, range_target=range_target)
                        scheduler = self.scheduler()
                        self.assert_nominal(scheduler)
                        # Exercise the real predictor, rather than a mocked None.
                        zone = self.data["zones"][self.entity_id]
                        block = zone["schedule"]["tuesday"][0]
                        config = scheduler._runtime_preconditioning(self.entity_id, zone)
                        resolved = scheduler._resolve_preconditioning_target(self.entity_id, config, block)
                        prediction = scheduler._adaptive_preconditioning_prediction(
                            self.entity_id, config, block, resolved
                        )
                        self.assertIsNone(prediction["recommended_lead_minutes"])
                        self.assertTrue(prediction["diagnostics"]["limited_by_min_start"])

    async def test_recalculation_can_remove_and_restore_early_start(self):
        for mode in ("heat", "cool"):
            for source in ("initial_model", "history"):
                with self.subTest(mode=mode, source=source):
                    self.configure(mode, "positive")
                    scheduler = self.scheduler()
                    before = self.next_for_zone(scheduler)
                    self.assertEqual(before.target_when, NOW + timedelta(hours=2))
                    self.assertEqual(before.when, before.target_when - timedelta(minutes=70))

                    self.configure(mode, source)
                    scheduler._prepare_runtime_projection(NOW, configuration=True)
                    self.assert_nominal(scheduler)

                    self.configure(mode, "positive")
                    scheduler._prepare_runtime_projection(NOW, configuration=True)
                    self.assertEqual(self.next_for_zone(scheduler), before)

    async def test_missing_or_nonpositive_prediction_keeps_nominal_time(self):
        for mode in ("heat", "cool"):
            self.configure(mode, "positive")
            scheduler = self.scheduler()
            zone = self.data["zones"][self.entity_id]
            block = zone["schedule"]["tuesday"][0]
            nominal = NOW + timedelta(hours=2)
            for lead in (None, 0, -5):
                with self.subTest(mode=mode, lead=lead):
                    prediction = {"recommended_lead_minutes": lead, "diagnostics": {}}
                    with patch.object(scheduler, "_adaptive_preconditioning_prediction", return_value=prediction):
                        self.assertEqual(scheduler._preconditioned_event_details(
                            self.entity_id, zone, block, nominal
                        ), (nominal, None))
            with patch.object(scheduler, "_adaptive_preconditioning_prediction", return_value=None):
                self.assertEqual(scheduler._preconditioned_event_details(
                    self.entity_id, zone, block, nominal
                ), (nominal, None))
