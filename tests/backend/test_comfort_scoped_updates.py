"""Comfort signals and sensor reads stay scoped without stale public data."""

from copy import deepcopy
import asyncio
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .helpers import NOW, scheduler_module
from . import test_comfort_observation_grouping as fixtures

ENTITIES, SOURCES = fixtures.ENTITIES, fixtures.SOURCES
from .test_sensor_entities import sensor_module
from custom_components.velair.const import SIGNAL_COMFORT_UPDATED, SIGNAL_SCHEDULER_UPDATED
from custom_components.velair import comfort_projection


class ComfortScopedUpdatesTest(unittest.IsolatedAsyncioTestCase):
    make = fixtures.ComfortObservationGroupingTest.make

    def setUp(self):
        self.clock = [NOW]
        clock = patch.object(scheduler_module.dt_util, "now", lambda: self.clock[0])
        clock.start()
        self.addCleanup(clock.stop)

    def prepare(self):
        f = self.make(scheduler_module)
        f.data["zones"][ENTITIES[0]]["comfort"]["humidity_enabled"] = True
        f.s._refresh_comfort_listener()
        return f

    async def test_humidity_report_evaluates_only_affected_zone_without_global_work(self):
        f = self.prepare()
        f.hass.states[ENTITIES[0]].attributes["current_humidity"] = 51
        with patch.object(f.s._comfort_projection, "current", wraps=f.s._comfort_projection.current) as assess, \
             patch.object(f.s, "_prepare_runtime_projection", side_effect=AssertionError("Comfort planned scheduling")), \
             patch.object(f.s, "get_comfort_settings", side_effect=AssertionError("report rebuilt all settings")), \
             patch.object(scheduler_module, "async_dispatcher_send") as dispatch:
            f.s._handle_comfort_state_change(SimpleNamespace(data={"entity_id": ENTITIES[0]}))
        self.assertEqual([call.args[0] for call in assess.call_args_list], [ENTITIES[0]])
        dispatch.assert_called_once_with(f.hass, SIGNAL_COMFORT_UPDATED, frozenset({ENTITIES[0]}))
        self.assertEqual(f.manager.calls, [])

    async def test_shared_source_updates_each_dependent_and_does_not_publish_global_signal(self):
        f = self.prepare()
        f.data["zones"][ENTITIES[1]]["comfort"]["temperature_entity_id"] = SOURCES[0]
        f.s._refresh_comfort_listener()
        f.hass.states[SOURCES[0]].state = "23"
        with patch.object(scheduler_module, "async_dispatcher_send") as dispatch:
            f.s._handle_comfort_state_change(SimpleNamespace(data={"entity_id": SOURCES[0]}))
        self.assertEqual(dispatch.call_args.args[1:], (SIGNAL_COMFORT_UPDATED, frozenset(ENTITIES)))
        for entity in ENTITIES:
            self.assertEqual(f.s.get_comfort_assessment(entity)["temperature"]["value"], 23)

    async def test_expiry_scopes_crossed_deadline_and_identical_report_recovers(self):
        f = self.prepare()
        f.data["zones"][ENTITIES[1]]["comfort"]["stale_after_minutes"] = 7
        f.s._refresh_comfort_listener()
        self.clock[0] += timedelta(minutes=5)
        with patch.object(scheduler_module, "async_dispatcher_send") as dispatch:
            f.s._handle_comfort_expiry(self.clock[0])
        dispatch.assert_called_once_with(f.hass, SIGNAL_COMFORT_UPDATED, frozenset({ENTITIES[0]}))
        self.assertEqual(f.s.get_comfort_assessment(ENTITIES[0])["temperature"]["availability"], "stale")
        self.assertEqual(f.s.get_comfort_assessment(ENTITIES[1])["temperature"]["availability"], "current")
        f.hass.states[SOURCES[0]].last_reported = self.clock[0]
        with patch.object(scheduler_module, "async_dispatcher_send") as dispatch:
            f.s._handle_comfort_state_reported(SimpleNamespace(data={"entity_id": SOURCES[0]}))
        dispatch.assert_called_once_with(f.hass, SIGNAL_COMFORT_UPDATED, frozenset({ENTITIES[0]}))
        self.assertEqual(f.s.get_comfort_assessment(ENTITIES[0])["temperature"]["availability"], "current")

    async def test_missing_preferred_source_recovers_even_when_backup_was_selected(self):
        f = self.prepare()
        preferred = "sensor.missing_preferred"
        config = f.data["zones"][ENTITIES[0]]["comfort"]
        config.update(temperature_entity_id=preferred, temperature_fallback_enabled=True)
        f.s._refresh_comfort_listener()
        self.assertIn(ENTITIES[0], f.s._comfort_source_zones[preferred])
        f.hass.states[preferred] = SimpleNamespace(state="23", attributes={"unit_of_measurement": "\u00b0C"}, last_reported=NOW)
        with patch.object(scheduler_module, "async_dispatcher_send") as dispatch:
            f.s._handle_comfort_state_change(SimpleNamespace(data={"entity_id": preferred}))
        self.assertEqual(f.s.get_comfort_assessment(ENTITIES[0])["temperature"]["entity_id"], preferred)
        self.assertIn(ENTITIES[0], dispatch.call_args.args[2])

    async def test_pending_save_defers_comfort_push_until_commit_or_rollback(self):
        for fail, saved_entity in ((False, ENTITIES[0]), (True, ENTITIES[0]),
                                   (False, ENTITIES[1]), (True, ENTITIES[1])):
            with self.subTest(save_fails=fail, saved_entity=saved_entity):
                f = self.prepare()
                entered, release = asyncio.Event(), asyncio.Event()
                sent = []
                events = []
                f.hass.bus.async_fire = lambda _event, payload: events.append(deepcopy(payload))
                async def save():
                    entered.set()
                    await release.wait()
                    if fail:
                        raise RuntimeError("storage unavailable")
                f.s._async_save_data = save
                with patch.object(scheduler_module, "async_dispatcher_send",
                                  side_effect=lambda _hass, signal, *args: sent.append(signal)):
                    task = asyncio.create_task(f.s.async_update_zone_comfort(
                        saved_entity, {"temperature_min": 19}))
                    try:
                        await asyncio.wait_for(entered.wait(), 2)
                        f.hass.states[SOURCES[0]].state = "28"
                        f.s._handle_comfort_state_change(SimpleNamespace(data={"entity_id": SOURCES[0]}))
                        self.assertEqual(sent, [])
                        self.assertTrue(any(event.get("entity_id") == ENTITIES[0]
                                            and event.get("condition") == "hot" for event in events))
                        self.assertEqual(f.s.get_comfort_assessment(saved_entity)["comfort_zone"]["temperature_min"], 19)
                        ready = f.s._projection_ready_publication_task
                        release.set()
                        if fail:
                            with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
                                await asyncio.wait_for(task, 2)
                        else:
                            await asyncio.wait_for(task, 2)
                        if ready is not None:
                            await asyncio.wait_for(ready, 2)
                    finally:
                        release.set()
                        await asyncio.gather(task, return_exceptions=True)
                self.assertNotIn(SIGNAL_COMFORT_UPDATED, sent)
                self.assertIn(SIGNAL_SCHEDULER_UPDATED, sent)
                self.assertIsNotNone(f.s._unsub_comfort_expiry_timer)
                self.assertEqual(f.s._comfort_expiry_deadlines[ENTITIES[0]], NOW + timedelta(minutes=5))
                self.assertEqual(f.s.get_comfort_assessment(saved_entity)["comfort_zone"]["temperature_min"],
                                 20 if fail else 19)

    async def test_comfort_sensor_writes_filter_signal_and_never_copy_full_assessment(self):
        f = self.prepare()
        entry = SimpleNamespace(entry_id="entry", runtime_data=SimpleNamespace(scheduler=f.s))
        sensors = [kind(entry, entity) for entity in ENTITIES for kind in (
            sensor_module.ZoneEnvironmentalConditionSensor,
            sensor_module.ZoneVentilationOpportunitySensor,
            sensor_module.ZoneAirQualitySensor)]
        callbacks = {}
        writes = []
        def connect(_hass, signal, handler):
            callbacks.setdefault(signal, []).append(handler)
            return lambda: callbacks[signal].remove(handler)
        async def base_added(sensor):
            connect(f.hass, SIGNAL_SCHEDULER_UPDATED, sensor._handle_scheduler_update)
        for sensor in sensors:
            sensor.hass = f.hass
            sensor.async_on_remove = lambda unsubscribe: None
            sensor.async_write_ha_state = lambda sensor=sensor: writes.append((
                sensor._climate_entity_id, sensor.native_value, sensor.extra_state_attributes))
        with patch.object(sensor_module._ZoneSensor, "async_added_to_hass", base_added, create=True), \
             patch.object(sensor_module, "async_dispatcher_connect", side_effect=connect):
            for sensor in sensors:
                await sensor.async_added_to_hass()
        assessments = [f.s._comfort_projection.current(entity, detached=False) for entity in ENTITIES]
        original_copy = comfort_projection.deepcopy
        def copy(value):
            self.assertFalse(any(value is assessment for assessment in assessments), "copied full Comfort assessment")
            return original_copy(value)
        with patch.object(comfort_projection, "deepcopy", side_effect=copy), \
             patch.object(f.s, "_configured_physical_entities", side_effect=AssertionError("sensor rebuilt global topology")), \
             patch.object(f.s._comfort_projection, "current", wraps=f.s._comfort_projection.current) as read:
            for callback in callbacks[SIGNAL_COMFORT_UPDATED]:
                callback(frozenset({ENTITIES[0]}))
            self.assertEqual(read.call_count, 3)
        self.assertEqual([entity for entity, _, _ in writes], [ENTITIES[0]] * 3)
        attrs = writes[0][2]
        attrs["comfort_zone"]["points"][0]["humidity_min"] = -999
        self.assertNotEqual(f.s.get_comfort_assessment(ENTITIES[0])["comfort_zone"]["points"][0]["humidity_min"], -999)
        f.hass.states[SOURCES[0]].state = "28"
        self.assertEqual(sensors[0].native_value, "hot")
        self.assertIsNone(sensors[0]._comfort_write_assessment)
