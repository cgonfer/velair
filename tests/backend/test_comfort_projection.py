"""Maintained Comfort results validate every consumed dependency before reuse."""
import asyncio
import json
from copy import deepcopy
from datetime import timedelta
import unittest
from unittest.mock import patch
from types import SimpleNamespace

from . import test_comfort_observation_grouping as fixtures
from .helpers import NOW, scheduler_module
from custom_components.velair.room_groups import build_group_candidate

E, B = fixtures.ENTITIES
S, T = fixtures.SOURCES


class ComfortProjectionTest(unittest.IsolatedAsyncioTestCase):

    make = fixtures.ComfortObservationGroupingTest.make

    def setUp(self):
        self.clock = [NOW]
        clock = patch.object(scheduler_module.dt_util, "now", lambda: self.clock[0])
        clock.start()
        self.addCleanup(clock.stop)

    def fresh_value(self, fixture, entity=E):
        """Compare cached reads with a new scheduler's first assessment."""
        reference = scheduler_module.VelairScheduler(
            fixture.hass, deepcopy(fixture.data), fixture.manager, fixture.s._async_save_data)
        self.addAsyncCleanup(reference.async_stop)
        return reference.get_comfort_assessment(entity)

    def assert_fresh(self, fixture, entity=E):
        actual = fixture.s.get_comfort_assessment(entity)
        self.assertEqual(actual, self.fresh_value(fixture, entity))
        return actual

    async def test_hit_then_pending_inplace_source_change_inside_observation(self):
        f = self.make(scheduler_module)
        with f.s.observation_snapshot():
            before = f.s.get_comfort_assessment(E)
            with patch.object(f.s, "_build_comfort_assessment", wraps=f.s._build_comfort_assessment) as build:
                for _ in range(4):
                    self.assertEqual(f.s.get_comfort_assessment(E), before)
                self.assertEqual(build.call_count, 0)
                f.hass.states[S].state = "27"
                self.assertEqual(self.assert_fresh(f)["temperature"]["value"], 27)
                self.assertEqual(build.call_count, 1)

    async def test_pending_configuration_unit_and_source_changes(self):
        f = self.make(scheduler_module)
        self.assert_fresh(f)
        with f.s.observation_snapshot():
            f.data["zones"][E]["comfort"]["temperature_min"] = 18
            self.assertEqual(self.assert_fresh(f)["comfort_zone"]["temperature_min"], 18)
            f.units[E] = "°F"
            self.assertEqual(self.assert_fresh(f)["temperature"]["value"], 71.6)
            f.data["zones"][E]["comfort"]["temperature_entity_id"] = fixtures.ALTERNATE
            self.assertEqual(self.assert_fresh(f)["temperature"]["value"], 77)

    async def test_missing_source_appearance_and_disappearance_without_listener(self):
        f = self.make(scheduler_module)
        state = f.hass.states.pop(S)
        self.assertEqual(self.assert_fresh(f)["temperature"]["availability"], "missing")
        f.hass.states[S] = state
        self.assertEqual(self.assert_fresh(f)["temperature"]["availability"], "current")
        f.hass.states.pop(S)
        self.assertEqual(self.assert_fresh(f)["temperature"]["availability"], "missing")

    async def test_humidity_boolean_numeric_and_presence_have_distinct_inputs(self):
        f = self.make(scheduler_module)
        f.data["zones"][E]["comfort"].update(temperature_entity_id=None, humidity_enabled=True)
        attrs = f.hass.states[E].attributes
        attrs["current_humidity"] = True
        self.assert_fresh(f)
        attrs["current_humidity"] = 1
        self.assertEqual(self.assert_fresh(f)["humidity"]["value"], 1)
        attrs.pop("current_humidity")
        self.assert_fresh(f)
        attrs["current_humidity"] = None
        self.assert_fresh(f)
        attrs["current_humidity"] = 50
        self.assertEqual(self.assert_fresh(f)["humidity"]["value"], 50)

    async def test_identical_reports_reuse_until_freshness_changes_and_clock_rewinds(self):
        f = self.make(scheduler_module)
        before = self.assert_fresh(f)
        with patch.object(f.s, "_build_comfort_assessment", wraps=f.s._build_comfort_assessment) as build:
            self.clock[0] = NOW + timedelta(minutes=1)
            f.hass.states[S].last_reported = self.clock[0]
            self.assertEqual(f.s.get_comfort_assessment(E), before)
            self.assertEqual(build.call_count, 0)
            self.clock[0] = NOW + timedelta(minutes=6)
            self.assertEqual(self.assert_fresh(f)["temperature"]["availability"], "stale")
            self.clock[0] = NOW + timedelta(minutes=2)
            self.assertEqual(self.assert_fresh(f)["temperature"]["availability"], "current")
            self.assertEqual(build.call_count, 2)

    async def test_physical_fallback_changes_even_when_room_assist_is_off(self):
        f = self.make(scheduler_module)
        f.data["zones"][E]["comfort"]["temperature_entity_id"] = None
        self.assertEqual(self.assert_fresh(f)["temperature"]["value"], 22)
        f.data["zones"][E]["preconditioning"].update(
            room_temperature_entity_id=fixtures.ALTERNATE, room_sensor_assist_enabled=False)
        self.assertEqual(self.assert_fresh(f)["temperature"]["value"], 25)

    async def test_output_and_event_payload_mutation_cannot_change_prepared_results(self):
        f = self.make(scheduler_module)
        expected = self.assert_fresh(f)
        result = f.s.get_comfort_assessment(E)
        result["comfort_zone"]["points"][0]["humidity_min"] = -999
        result["temperature"]["value"] = -999
        config = f.s.get_comfort_settings()
        config[E]["temperature_min"] = -999
        self.assertEqual(f.s.get_comfort_assessment(E), expected)
        def mutate(_event, data):
            data["comfort_zone"]["points"][0]["humidity_min"] = -999
        with patch.object(f.hass.bus, "async_fire", side_effect=mutate):
            f.s._async_fire_comfort_assessment_changed(
                E, f.s.get_comfort_assessment(E), previous_range_summary=None)
        self.assertEqual(f.s.get_comfort_assessment(E), expected)

    async def test_changed_readset_or_epoch_during_build_retries_before_returning(self):
        for mode in ("state", "epoch"):
            with self.subTest(change=mode):
                f = self.make(scheduler_module)
                self.assert_fresh(f)
                f.hass.states[S].state = "23"
                original = f.s._build_comfort_assessment
                calls = []
                def build(entity):
                    result = original(entity)
                    calls.append(entity)
                    if len(calls) == 1:
                        if mode == "state":
                            f.hass.states[S].state = "27"
                        else:
                            f.s._observation_epoch += 1
                    return result
                with patch.object(f.s, "_build_comfort_assessment", side_effect=build):
                    value = f.s.get_comfort_assessment(E)
                self.assertEqual(len(calls), 2)
                self.assertEqual(value["temperature"]["value"], 27 if mode == "state" else 23)
                self.assertEqual(value, self.fresh_value(f))

    async def test_failed_build_releases_capture_and_next_read_reconciles(self):
        f = self.make(scheduler_module)
        self.assert_fresh(f)
        f.hass.states[S].state = "27"
        with patch.object(f.s, "_build_comfort_assessment", side_effect=RuntimeError("broken source")):
            with self.assertRaisesRegex(RuntimeError, "broken source"):
                f.s.get_comfort_assessment(E)
        self.assertEqual(f.s._comfort_projection._captures, [])
        self.assertEqual(self.assert_fresh(f)["temperature"]["value"], 27)

    async def test_pending_save_does_not_install_candidate_and_rollback_is_fresh(self):
        for fail in (False, True):
            with self.subTest(storage_fails=fail):
                f = self.make(scheduler_module)
                before = self.assert_fresh(f)
                entry = f.s._comfort_projection._entries[E]
                entered, release = asyncio.Event(), asyncio.Event()
                async def save():
                    entered.set()
                    await release.wait()
                    if fail:
                        raise RuntimeError("storage unavailable")
                f.s._async_save_data = save
                task = asyncio.create_task(f.s.async_update_zone_comfort(E, {"temperature_min": 19}))
                try:
                    await asyncio.wait_for(entered.wait(), 2)
                    self.assertEqual(f.s.get_comfort_assessment(E)["comfort_zone"]["temperature_min"], 19)
                    self.assertIs(f.s._comfort_projection._entries[E], entry)
                    release.set()
                    if fail:
                        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
                            await asyncio.wait_for(task, 2)
                        self.assertEqual(f.s.get_comfort_assessment(E), before)
                        self.assertIs(f.s._comfort_projection._entries[E], entry)
                    else:
                        await asyncio.wait_for(task, 2)
                        self.assertEqual(f.s.get_comfort_assessment(E)["comfort_zone"]["temperature_min"], 19)
                    self.assert_fresh(f)
                finally:
                    release.set()
                    await asyncio.gather(task, return_exceptions=True)

    async def test_group_members_keep_physical_configuration_and_fallback(self):
        f = self.make(scheduler_module)
        self.assert_fresh(f)
        candidate, _ = build_group_candidate(f.data, list(fixtures.ENTITIES), {
            "id": "group.projection", "name": "Projection", "members": list(fixtures.ENTITIES),
            "temperature_entity_id": E, "delivery_mode": "all"}, E)
        f.data.clear()
        f.data.update(candidate)
        f.data["member_comfort"][B]["temperature_min"] = 21
        self.assertEqual(self.assert_fresh(f, B)["comfort_zone"]["temperature_min"], 21)
        f.data["member_comfort"].pop(B)
        self.assertEqual(self.assert_fresh(f, B)["comfort_zone"]["temperature_min"], 20)
        f.data["zones"]["group.projection"]["comfort"]["temperature_entity_id"] = None
        f.data["zones"]["group.projection"]["preconditioning"]["room_temperature_entity_id"] = fixtures.ALTERNATE
        self.assertEqual(self.assert_fresh(f, B)["temperature"]["value"], 22)

    async def test_unconsumed_target_and_label_changes_do_not_rebuild(self):
        f = self.make(scheduler_module)
        expected = self.assert_fresh(f)
        with patch.object(f.s, "_build_comfort_assessment", wraps=f.s._build_comfort_assessment) as build:
            f.hass.states[E].attributes.update(temperature=27, fan_mode="high")
            f.hass.states[S].attributes["friendly_name"] = "Changed label"
            self.assertEqual(f.s.get_comfort_assessment(E), expected)
            self.assertEqual(build.call_count, 0)

    async def test_borrowed_update_result_is_detached_before_outward_event(self):
        f = self.make(scheduler_module)
        f.s._async_update_comfort_snapshots(fire_events=False)
        f.hass.states[S].state = "27"
        def mutate(_event, data):
            data["comfort_zone"]["points"][0]["humidity_min"] = -999
            data["temperature"]["value"] = -999
        with patch.object(f.hass.bus, "async_fire", side_effect=mutate):
            self.assertTrue(f.s._async_update_comfort_snapshots(fire_events=True))
        self.assertEqual(self.assert_fresh(f)["temperature"]["value"], 27)

    async def test_nested_other_zone_builder_does_not_replace_outer_read_capture(self):
        f = self.make(scheduler_module)
        original = f.s._build_comfort_assessment
        changed = [False]
        def build(entity):
            result = original(entity)
            if entity == E and not changed[0]:
                changed[0] = True
                f.hass.states[S].state = "27"
                f.s.get_comfort_assessment(B)
            return result
        with patch.object(f.s, "_build_comfort_assessment", side_effect=build):
            self.assertEqual(f.s.get_comfort_assessment(E)["temperature"]["value"], 27)
        self.assertEqual(f.s._comfort_projection._captures, [])
        f.hass.states[T].state = "26"
        with patch.object(f.s, "_build_comfort_assessment", wraps=original) as assess:
            self.assertEqual(f.s.get_comfort_assessment(E)["temperature"]["value"], 27)
            self.assertEqual(assess.call_count, 0)

    async def test_pending_topology_does_not_prune_committed_entries(self):
        f = self.make(scheduler_module)
        self.assert_fresh(f, B)
        previous = f.s._comfort_projection._entries[B]
        with f.s._projection_save_scope(entities=[]):
            zone = f.data["zones"].pop(B)
            try:
                f.s.get_comfort_assessment(E)
                self.assertIs(f.s._comfort_projection._entries[B], previous)
            finally:
                f.data["zones"][B] = zone
        self.assert_fresh(f, B)
        self.assertIs(f.s._comfort_projection._entries[B], previous)

    async def test_signed_zero_changes_preserve_exact_public_numeric_payloads(self):
        f = self.make(scheduler_module)
        config = f.data["zones"][E]["comfort"]
        config.update(temperature_entity_id=None, temperature_min=-0.0)
        attrs = f.hass.states[E].attributes
        attrs["current_temperature"] = -0.0
        f.s.get_comfort_assessment(E)
        for temperature, minimum in ((0.0, -0.0), (0.0, 0.0), (-0.0, 0.0)):
            attrs["current_temperature"] = temperature
            config["temperature_min"] = minimum
            self.assertEqual(json.dumps(f.s.get_comfort_assessment(E), sort_keys=True),
                             json.dumps(self.fresh_value(f), sort_keys=True))
