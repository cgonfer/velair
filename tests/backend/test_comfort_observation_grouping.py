"""Synchronous Comfort sharing preserves outward callbacks and live observations."""

from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeClimateManager, FakeHass, NOW, scheduler_module
from custom_components.velair.models import normalize_schedule_data


ENTITIES = ("climate.observation_a", "climate.observation_b")
SOURCES = ("sensor.observation_a", "sensor.observation_b")
ALTERNATE = "sensor.observation_alternate"


class ComfortObservationGroupingTest(unittest.IsolatedAsyncioTestCase):

    def make(self, module):
        hass, manager = FakeHass(), FakeClimateManager()
        units = {entity: "°C" for entity in ENTITIES}
        manager.temperature_unit = lambda entity: units[entity]
        data = normalize_schedule_data(None, list(ENTITIES))
        for entity, source, mode in zip(ENTITIES, SOURCES, ("heat", "cool")):
            hass.states[entity] = SimpleNamespace(state=mode, attributes={
                "current_temperature": 22, "current_humidity": 50,
                "temperature": 21, "hvac_modes": ["off", "heat", "cool"]},
                last_reported=NOW)
            hass.states[source] = SimpleNamespace(state="22", attributes={
                "unit_of_measurement": "°C"}, last_reported=NOW)
            data["zones"][entity]["comfort"].update(
                enabled=True, humidity_enabled=False, temperature_entity_id=source,
                temperature_min=20, temperature_max=24, stale_after_minutes=5)
        hass.states[ALTERNATE] = SimpleNamespace(state="77", attributes={
            "unit_of_measurement": "°F"}, last_reported=NOW)
        scheduler = module.VelairScheduler(hass, data, manager, AsyncMock())
        self.addAsyncCleanup(scheduler.async_stop)
        return SimpleNamespace(s=scheduler, module=module, data=data, hass=hass,
                               manager=manager, units=units)

    def trace(self, module, *, action="changed", event_action=None, fail_builder=False):
        current = [NOW]
        timers, log = [], []
        def track(_hass, callback, when):
            timer = SimpleNamespace(callback=callback, when=when, active=True)
            timers.append(timer)
            def cancel():
                timer.active = False
            return cancel
        with patch.object(module.dt_util, "now", side_effect=lambda: current[0]), \
             patch.object(module, "async_track_point_in_time", side_effect=track):
            f = self.make(module)
            if action == "humidity":
                f.data["zones"][ENTITIES[0]]["comfort"]["humidity_enabled"] = True
            f.s._refresh_comfort_listener()
            fired = False
            def fire(event_type, payload):
                nonlocal fired
                log.append(("event", event_type, deepcopy(payload)))
                if event_action is not None and not fired and payload.get("entity_id") == ENTITIES[0]:
                    fired = True
                    # The event bus listener runs before the pending HA/config listeners.
                    f.s.get_comfort_settings()
                    event_action(f)
                    log.append(("listener_reads", deepcopy(f.s.get_comfort_assessments()),
                                deepcopy(f.s.get_comfort_settings())))
            def publish(_hass, _signal, entities):
                # Distinct synchronous readers see the same complete public payload.
                first = f.s.get_comfort_assessments()
                second = f.s.get_comfort_assessments()
                log.append(("publication", deepcopy(first), deepcopy(second)))
                self.assertEqual(first, second)
            f.hass.bus.async_fire = fire
            with patch.object(module, "async_dispatcher_send", side_effect=publish), \
                 patch.object(f.s, "_prepare_runtime_projection",
                              wraps=f.s._prepare_runtime_projection) as prepare:
                if action == "changed":
                    f.hass.states[SOURCES[0]].state = "27"
                    callback = lambda: f.s._handle_comfort_state_change(
                        SimpleNamespace(data={"entity_id": SOURCES[0]}))
                elif action == "humidity":
                    f.hass.states[ENTITIES[0]].attributes["current_humidity"] = 77
                    callback = lambda: f.s._handle_comfort_state_change(
                        SimpleNamespace(data={"entity_id": ENTITIES[0]}))
                elif action == "reported":
                    current[0] += timedelta(minutes=2)
                    f.hass.states[SOURCES[0]].last_reported = current[0]
                    callback = lambda: f.s._handle_comfort_state_reported(
                        SimpleNamespace(data={"entity_id": SOURCES[0]}))
                elif action == "expiry":
                    current[0] += timedelta(minutes=5)
                    for timer in timers:
                        if timer.active and timer.when <= current[0]:
                            timer.active = False
                    callback = lambda: f.s._handle_comfort_expiry(current[0])
                elif action == "recovery":
                    current[0] += timedelta(minutes=5)
                    for timer in timers:
                        if timer.active and timer.when <= current[0]:
                            timer.active = False
                    f.s._handle_comfort_expiry(current[0])
                    f.hass.states[SOURCES[0]].last_reported = current[0]
                    callback = lambda: f.s._handle_comfort_state_reported(
                        SimpleNamespace(data={"entity_id": SOURCES[0]}))
                elif action == "standalone":
                    f.hass.states[SOURCES[0]].state = "27"
                    callback = lambda: f.s._async_update_comfort_snapshots(fire_events=True)
                else:
                    raise AssertionError(action)
                if fail_builder:
                    f.hass.states[SOURCES[1]].state = "27"
                    builder = ("_build_comfort_assessment"
                               if hasattr(f.s, "_build_comfort_assessment")
                               else "_comfort_assessment")
                    original = getattr(f.s, builder)
                    def broken(entity):
                        if entity == ENTITIES[1]:
                            raise RuntimeError("observer failed")
                        return original(entity)
                    with patch.object(f.s, builder, side_effect=broken):
                        with self.assertRaisesRegex(RuntimeError, "observer failed"):
                            callback()
                    self.assertIsNone(f.s._observation_values)
                    self.assertIsNone(f.s._observation_at)
                    f.hass.states[SOURCES[1]].state = "28"
                callback()
                preparations = prepare.call_count
                final = deepcopy(f.s.get_comfort_assessments())
                result = {"log": log, "final": final, "preparations": preparations,
                          "settings": deepcopy(f.s.get_comfort_settings()),
                          "snapshots": deepcopy(f.s._comfort_assessment_snapshots),
                          "commands": deepcopy(f.manager.calls),
                          "deadlines": sorted(timer.when for timer in timers if timer.active)}
                self.assertIsNone(f.s._observation_values)
                self.assertIsNone(f.s._observation_at)
                return result

    def assert_callback_trace(self, **kwargs):
        actual = self.trace(scheduler_module, **kwargs)
        self.assertEqual(actual["commands"], [])
        return actual

    async def test_changed_callback_preserves_event_order_and_complete_publications(self):
        result = self.assert_callback_trace()
        self.assertEqual([entry[0] for entry in result["log"]], ["event", "publication"])
        self.assertEqual(result["final"][ENTITIES[0]]["temperature"]["value"], 27)
        self.assertEqual(result["final"][ENTITIES[1]]["temperature"]["value"], 22)

    async def test_identical_report_rearms_deadline_without_publication(self):
        result = self.assert_callback_trace(action="reported")
        self.assertEqual(result["preparations"], 0)
        self.assertEqual(result["log"], [])
        self.assertEqual(result["deadlines"], [NOW + timedelta(minutes=5)])
        self.assertEqual(result["final"][ENTITIES[0]]["temperature"]["freshness"], "reported")

    async def test_expiry_preserves_both_stale_events_and_single_publication(self):
        result = self.assert_callback_trace(action="expiry")
        self.assertEqual(result["preparations"], 0)
        self.assertEqual([entry[0] for entry in result["log"]], ["event", "event", "publication"])
        for entity in ENTITIES:
            self.assertEqual(result["final"][entity]["temperature"]["availability"], "stale")

    async def test_identical_report_recovers_stale_and_rearms_only_live_source(self):
        result = self.assert_callback_trace(action="recovery")
        self.assertEqual(result["preparations"], 0)
        self.assertEqual([entry[0] for entry in result["log"]],
                         ["event", "event", "publication", "event", "publication"])
        self.assertEqual(result["final"][ENTITIES[0]]["temperature"]["value"], 22)
        self.assertEqual(result["final"][ENTITIES[0]]["temperature"]["availability"], "current")
        self.assertEqual(result["final"][ENTITIES[1]]["temperature"]["availability"], "stale")
        self.assertEqual(result["deadlines"], [NOW + timedelta(minutes=10)])

    async def test_standalone_update_keeps_events_without_adding_publications(self):
        result = self.assert_callback_trace(action="standalone")
        self.assertEqual(result["preparations"], 0)
        self.assertEqual([entry[0] for entry in result["log"]], ["event"])
        self.assertEqual(result["final"][ENTITIES[0]]["temperature"]["value"], 27)

    async def test_outward_listener_sees_pending_source_unit_and_temperature_changes(self):
        def mutate(f):
            f.units[ENTITIES[1]] = "°F"
            f.data["zones"][ENTITIES[1]]["comfort"].update(
                temperature_entity_id=ALTERNATE, temperature_min=68, temperature_max=75)
            f.hass.states[SOURCES[0]].state = "28"
        result = self.assert_callback_trace(event_action=mutate)
        reads = next(entry for entry in result["log"] if entry[0] == "listener_reads")
        self.assertEqual(reads[1][ENTITIES[0]]["temperature"]["value"], 28)
        self.assertEqual(reads[1][ENTITIES[1]]["temperature"]["value"], 77)
        self.assertEqual(reads[2][ENTITIES[1]]["temperature_entity_id"], ALTERNATE)

    async def test_reentrant_update_in_outward_listener_keeps_event_sequence(self):
        def reenter(f):
            f.hass.states[SOURCES[1]].state = "28"
            f.s._async_update_comfort_snapshots(fire_events=True)
        result = self.assert_callback_trace(event_action=reenter)
        self.assertEqual([entry[0] for entry in result["log"]],
                         ["event", "event", "listener_reads", "publication"])
        self.assertEqual(result["final"][ENTITIES[1]]["temperature"]["value"], 28)

    async def test_builder_exception_discards_scope_and_next_callback_recovers(self):
        result = self.assert_callback_trace(fail_builder=True)
        self.assertEqual(result["preparations"], 0)
        self.assertEqual(result["final"][ENTITIES[1]]["temperature"]["value"], 28)
        self.assertEqual([entry[0] for entry in result["log"]], ["event", "event", "publication"])

    async def test_event_disabling_another_zone_preserves_initial_iteration_flags(self):
        def disable(f):
            f.data["zones"][ENTITIES[1]]["comfort"]["enabled"] = False
        result = self.assert_callback_trace(event_action=disable)
        self.assertFalse(result["final"][ENTITIES[1]]["enabled"])
        self.assertEqual([entry[0] for entry in result["log"]],
                         ["event", "listener_reads", "event", "publication"])

    async def test_humidity_change_prepares_scheduling_only_once_for_publication(self):
        result = self.assert_callback_trace(action="humidity")
        self.assertEqual(result["preparations"], 0)
        self.assertEqual(result["final"][ENTITIES[0]]["humidity"]["value"], 77)
        self.assertEqual(result["final"][ENTITIES[0]]["temperature"]["value"], 22)
        self.assertEqual([entry[0] for entry in result["log"]], ["event", "publication"])

    async def test_publication_prepares_current_thermal_inputs_after_outward_listener(self):
        with patch.object(scheduler_module.dt_util, "now", return_value=NOW):
            f = self.make(scheduler_module)
            for entity, source, mode, target in zip(ENTITIES, SOURCES, ("heat", "cool"), (25, 19)):
                f.data["zones"][entity]["schedule"]["tuesday"] = [{
                    "start": "19:00", "action": "set_temperature",
                    "temperature": target, "hvac_mode": mode}]
                f.data["zones"][entity]["preconditioning"].update(
                    enabled=True, room_sensor_assist_enabled=True,
                    room_temperature_entity_id=source)
            f.s._prepare_runtime_projection(configuration=True)
            f.s._refresh_comfort_listener()
            baseline = {event.entity_id: event for event in f.s._schedule_projection.future(NOW)}
            published = []
            def mutate(_event, payload):
                if payload.get("entity_id") == ENTITIES[0]:
                    f.hass.states[SOURCES[0]].state = "18"
                    f.hass.states[SOURCES[1]].state = "28"
            def publish(_hass, _signal, entities):
                # Read already prepared forecasts: this observer must not repair them.
                published.append({event.entity_id: event
                                  for event in f.s._schedule_projection.future(NOW)})
            f.hass.bus.async_fire = mutate
            f.hass.states[SOURCES[0]].state = "27"
            with patch.object(scheduler_module, "async_dispatcher_send", side_effect=publish), \
                 patch.object(f.s, "_prepare_runtime_projection",
                              wraps=f.s._prepare_runtime_projection) as prepare:
                f.s._handle_comfort_state_change(SimpleNamespace(data={"entity_id": SOURCES[0]}))
            self.assertEqual(prepare.call_count, 0)
            self.assertEqual(len(published), 1)
            self.assertEqual(published[0], baseline)
            self.assertEqual(f.s.get_comfort_assessment(ENTITIES[0])["temperature"]["value"], 18)
            self.assertEqual(f.s.get_comfort_assessment(ENTITIES[1])["temperature"]["value"], 28)
            self.assertEqual(f.manager.calls, [])
