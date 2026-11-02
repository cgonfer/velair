"""Return components reconcile live inputs without global projection work."""
from copy import deepcopy
from datetime import timedelta
from unittest import TestCase
from unittest.mock import patch
from . import test_prepared_return_projection as fixtures
from .helpers import NOW, VelairScheduler


class LookupOnly(dict):
    def _traversal(self, *args, **kwargs):
        raise AssertionError("local Return guard traversed an unrelated container")
    __iter__ = items = values = keys = _traversal


class ReturnComponentProjectionTest(TestCase):
    def setUp(self):
        fixture = fixtures.PreparedReturnProjectionTest()
        fixture.setUp()
        self.hass, self.owner, self.runtime = fixture.hass, fixture.scheduler, fixture.runtime
        self.data, self.manager = fixture.data, fixture.climate
        self.room, self.other, self.third = fixture.entity, "climate.other", "climate.third"
        for entity in (self.other, self.third):
            self.data["zones"][entity] = deepcopy(self.data["zones"][self.room])
            self.hass.states[entity] = deepcopy(self.hass.states[self.room])
            self.manager.snapshots[entity] = deepcopy(self.manager.snapshots[self.room])
        self.owner._prepare_runtime_projection(NOW, configuration=True)
        self.runtime.prepare(NOW)

    def assert_local_reads(self, allowed):
        original = self.owner.climate_state
        def read(entity):
            self.assertIn(entity, allowed, f"unrelated live HA read: {entity}")
            return original(entity)
        return patch.object(self.owner, "climate_state", side_effect=read)

    def test_local_guard_has_no_global_scan_calendar_or_publication(self):
        public = self.runtime.status()
        generation = self.runtime.generation
        self.hass.states[self.room].attributes["current_temperature"] = 20
        zones = self.data["zones"]
        learning = self.data.get("preconditioning_learning", {})
        anchors = self.data.get("preconditioning_accepted_anchors", {})
        self.data["zones"] = LookupOnly(zones)
        self.data["preconditioning_learning"] = LookupOnly(learning)
        self.data["preconditioning_accepted_anchors"] = LookupOnly(anchors)
        try:
            with self.assert_local_reads({self.room}), \
                 patch.object(self.runtime, "sources", side_effect=AssertionError("household sources")), \
                 patch.object(self.runtime, "can_start", side_effect=AssertionError("household validation")), \
                 patch.object(self.runtime, "_build_prepared_status", side_effect=AssertionError("publication")), \
                 patch.object(self.owner, "_effective_schedule_from_profiles", side_effect=AssertionError("week")), \
                 patch.object(self.owner, "_current_schedule_event_for_schedule", side_effect=AssertionError("calendar")):
                changed = self.runtime.prepare(NOW, entities={self.room}, publish=False)
                self.assertEqual(changed, frozenset({self.room}))
                self.assertIsNone(self.runtime.target(self.room, NOW))
        finally:
            self.data["zones"], self.data["preconditioning_learning"] = zones, learning
            self.data["preconditioning_accepted_anchors"] = anchors
        self.assertEqual(self.runtime.status(), public)
        self.assertEqual(self.runtime.generation, generation)

    def test_publication_reconciles_other_input_and_reuses_unchanged_rows(self):
        public = self.runtime.status()
        row = self.runtime._zone_rows[self.other]
        self.hass.states[self.room].attributes["current_temperature"] = 20
        self.hass.states[self.third].attributes["current_temperature"] = 21
        self.runtime.prepare(NOW, entities={self.room}, publish=False)
        self.assertEqual(self.runtime.status(), public)
        with patch.object(self.owner, "_preconditioned_event_details", wraps=self.owner._preconditioned_event_details) as predict:
            self.runtime.prepare(NOW)
            self.assertCountEqual([call.args[0] for call in predict.call_args_list], [self.room, self.other, self.third])
            predict.reset_mock()
            self.hass.states[self.room].attributes["current_temperature"] = 19
            self.runtime.prepare(NOW)
            self.assertEqual([call.args[0] for call in predict.call_args_list], [self.room])
        rows = {value["entity_id"]: value for value in self.runtime.status()["preparation"]["zones"]}
        self.assertEqual(rows[self.third]["state"], "reached")
        self.assertIs(self.runtime._zone_rows[self.other], row)

    def test_fixed_clock_learning_edit_repredicts_only_selected_zone(self):
        sample = {"mode": "heat", "quality": "invalid", "reached": False,
                  "created_at": NOW.isoformat(), "minutes_observed": 5}
        self.data.setdefault("preconditioning_learning", {})[self.room] = {"heat": {"observations": [sample]}}
        self.runtime.prepare(NOW)
        with self.assert_local_reads({self.room}), \
             patch.object(self.owner, "_preconditioned_event_details", wraps=self.owner._preconditioned_event_details) as predict:
            self.runtime.prepare(NOW, entities={self.room}, publish=False)
            predict.reset_mock()
            sample["minutes_observed"] = 6
            self.runtime.prepare(NOW, entities={self.room}, publish=False)
            self.assertEqual([call.args[0] for call in predict.call_args_list], [self.room])

    def test_retime_pending_context_fails_closed_without_calendar(self):
        self.data["planned_return_episode"]["return_at"] = (NOW + timedelta(hours=3)).isoformat()
        with patch.object(self.owner, "_effective_schedule_from_profiles", side_effect=AssertionError("week")), \
             patch.object(self.owner, "_current_schedule_event_for_schedule", side_effect=AssertionError("calendar")):
            self.runtime.prepare(NOW, entities={self.room}, publish=False)
            self.assertFalse(self.runtime.control_ready(self.room, NOW))
            self.assertIsNone(self.runtime.target(self.room, NOW))
        self.runtime.prepare(NOW)
        self.assertTrue(self.runtime.control_ready(self.room, NOW))

    def test_dependent_guard_reads_master_but_never_sibling_temperature(self):
        for entity in (self.room, self.third):
            self.data["zones"][entity]["preconditioning"]["master_entity_id"] = self.other
        self.owner._prepare_runtime_projection(NOW, configuration=True)
        self.runtime.prepare(NOW)
        self.assertIsNone(self.runtime.target(self.room, NOW))
        self.hass.states[self.other].attributes["current_temperature"] = 20
        with self.assert_local_reads({self.room, self.other}), \
             patch.object(self.owner, "_preconditioned_event_details", wraps=self.owner._preconditioned_event_details) as predict:
            self.runtime.prepare(NOW, entities={self.room}, publish=False)
            self.assertCountEqual([call.args[0] for call in predict.call_args_list], [self.room, self.other])
            predict.reset_mock()
            self.hass.states[self.other].attributes["current_temperature"] = 19
            self.runtime.prepare(NOW, entities={self.room}, publish=False)
            self.assertEqual([call.args[0] for call in predict.call_args_list], [self.other])
        self.assertIsNone(self.runtime.target(self.room, NOW))

    def test_equal_reports_and_unused_attributes_do_not_repredict(self):
        self.runtime.prepare(NOW, entities={self.room}, publish=False)
        with patch.object(self.owner, "_preconditioned_event_details", wraps=self.owner._preconditioned_event_details) as predict:
            self.runtime.prepare(NOW, entities={self.room}, publish=False)
            predict.reset_mock()
            self.hass.states[self.room].attributes["unrelated_attribute"] = {"large": ["ignored"]}
            self.runtime.prepare(NOW + timedelta(seconds=1), entities={self.room}, publish=False)
            self.assertEqual(predict.call_count, 0)

    def test_unrelated_pending_save_does_not_freeze_local_control(self):
        self.hass.states[self.room].attributes["current_temperature"] = 20
        previous_depth = self.owner._projection_save_depth
        previous_pending = self.owner._projection_pending_entities
        self.owner._projection_save_depth = 1
        self.owner._projection_pending_entities = {self.other: 1}
        try:
            with self.assert_local_reads({self.room}):
                changed = self.runtime.prepare(NOW, entities={self.room}, publish=False)
                self.assertEqual(changed, frozenset({self.room}))
                self.assertTrue(self.runtime.control_ready(self.room, NOW))
                self.assertIsNone(self.runtime.target(self.room, NOW))
        finally:
            self.owner._projection_save_depth = previous_depth
            self.owner._projection_pending_entities = previous_pending

    def test_armed_to_away_reuses_prediction_and_activates_return_authority(self):
        data = deepcopy(self.data)
        data["planned_return_episode"]["state"] = "armed"
        owner = VelairScheduler(self.hass, data, self.manager, self.owner._async_save_data)
        runtime = owner._planned_return
        runtime.prepare(NOW)
        prediction = runtime._prepared_predictions[self.room]
        self.assertIsNone(runtime.target(self.room, NOW))
        data["planned_return_episode"]["state"] = "away"
        runtime.prepare(NOW, entities={self.room}, publish=False)
        self.assertTrue(runtime.control_ready(self.room, NOW))
        self.assertEqual(runtime.target(self.room, NOW).temperature, 21)
        owner._prepare_runtime_projection(NOW, configuration=True)
        self.assertEqual(runtime._prepared_predictions[self.room], prediction)
        self.assertEqual(runtime.target(self.room, NOW).temperature, 21)
