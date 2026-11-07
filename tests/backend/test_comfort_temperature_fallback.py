"""Opt-in temperature backup preserves preferred sources and control behavior."""

from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from . import test_comfort_observation_grouping as fixtures
from .helpers import NOW, scheduler_module
from custom_components.velair.models import (
    normalize_comfort_data, normalize_schedule_data, serialize_schedule_data,
)
from custom_components.velair.room_groups import build_group_candidate

E, B = fixtures.ENTITIES
S, T = fixtures.SOURCES
ROOM = fixtures.ALTERNATE


class ComfortTemperatureFallbackTest(unittest.IsolatedAsyncioTestCase):
    make = fixtures.ComfortObservationGroupingTest.make

    def setUp(self):
        self.clock = [NOW]
        clock = patch.object(scheduler_module.dt_util, "now", lambda: self.clock[0])
        clock.start()
        self.addCleanup(clock.stop)

    def temperature(self, f, entity=E):
        return f.s.get_comfort_assessment(entity)["temperature"]

    async def test_disabled_by_default_and_recovery_preserves_selection(self):
        f = self.make(scheduler_module)
        self.assertFalse(f.s.get_comfort_settings()[E]["temperature_fallback_enabled"])
        f.hass.states[S].state = "unavailable"
        self.assertEqual(self.temperature(f)["availability"], "missing")
        self.assertFalse(self.temperature(f)["using_fallback"])
        await f.s.async_update_zone_comfort(E, {"temperature_fallback_enabled": True})
        self.assertEqual(self.temperature(f)["entity_id"], E)
        self.assertTrue(self.temperature(f)["using_fallback"])
        self.assertEqual(f.s.get_comfort_settings()[E]["temperature_entity_id"], S)
        f.hass.states[S].state = "23"
        self.assertEqual(self.temperature(f)["entity_id"], S)
        self.assertFalse(self.temperature(f)["using_fallback"])
        f.hass.states[S].state = "unavailable"
        await f.s.async_update_zone_comfort(E, {"temperature_fallback_enabled": False})
        self.assertEqual(self.temperature(f)["availability"], "missing")

    async def test_unusable_preferred_uses_climate_for_heating_and_cooling(self):
        f = self.make(scheduler_module)
        for entity, sensor in zip(fixtures.ENTITIES, fixtures.SOURCES):
            f.data["zones"][entity]["comfort"]["temperature_fallback_enabled"] = True
            original = f.hass.states[sensor]
            for state in ("unavailable", "unknown", "invalid", "nan", "inf", None):
                with self.subTest(mode=f.hass.states[entity].state, state=state):
                    f.hass.states[sensor] = original
                    if state is None:
                        f.hass.states.pop(sensor)
                    else:
                        original.state = state
                    metric = self.temperature(f, entity)
                    self.assertEqual(metric["entity_id"], entity)
                    self.assertEqual(metric["value"], 22)
                    self.assertTrue(metric["using_fallback"])
                    self.assertEqual(metric["freshness"], "unverified")

    async def test_one_default_candidate_matches_exposed_id_without_hidden_chain(self):
        f = self.make(scheduler_module)
        config = f.data["zones"][E]
        config["comfort"]["temperature_fallback_enabled"] = True
        config["preconditioning"]["room_temperature_entity_id"] = ROOM
        metric = self.temperature(f)
        self.assertEqual(metric["entity_id"], S)
        self.assertEqual(metric["fallback_entity_id"], ROOM)
        self.assertEqual(metric["fallback_source"], "room_sensor")
        f.hass.states[S].state = "unavailable"
        metric = self.temperature(f)
        self.assertTrue(metric["using_fallback"])
        self.assertEqual(metric["entity_id"], ROOM)
        self.assertEqual(metric["value"], 25)  # The default sensor reports Fahrenheit.
        f.hass.states[ROOM].state = "unavailable"
        self.assertEqual(self.temperature(f)["availability"], "missing")
        self.assertFalse(self.temperature(f)["using_fallback"])

    async def test_automatic_and_explicit_room_source_can_use_native_backup(self):
        for preferred in (None, ROOM):
            with self.subTest(preferred=preferred):
                f = self.make(scheduler_module)
                config = f.data["zones"][E]
                config["preconditioning"]["room_temperature_entity_id"] = ROOM
                config["comfort"]["temperature_entity_id"] = preferred
                metric = self.temperature(f)
                self.assertEqual(metric["fallback_entity_id"], E)
                self.assertEqual(metric["fallback_source"], "climate")
                self.assertEqual(metric["entity_id"], ROOM)
                self.assertFalse(metric["using_fallback"])
                f.hass.states[ROOM].state = "unavailable"
                self.assertEqual(self.temperature(f)["availability"], "missing")
                await f.s.async_update_zone_comfort(E, {"temperature_fallback_enabled": True})
                metric = self.temperature(f)
                self.assertEqual(metric["entity_id"], E)
                self.assertEqual(metric["value"], 22)
                self.assertTrue(metric["using_fallback"])
                self.assertTrue(f.data["zones"][E]["comfort"]["temperature_fallback_enabled"])
                self.assertEqual(f.data["zones"][E]["comfort"]["temperature_entity_id"], preferred)
                f.hass.states[ROOM].state = "77"
                self.assertEqual(self.temperature(f)["entity_id"], ROOM)
                self.assertEqual(self.temperature(f)["value"], 25)
                self.assertFalse(self.temperature(f)["using_fallback"])

                loaded = normalize_schedule_data(serialize_schedule_data(f.data), list(fixtures.ENTITIES))
                await f.s.async_stop()
                f.data.clear()
                f.data.update(loaded)
                f.s = scheduler_module.VelairScheduler(
                    f.hass, f.data, f.manager, f.s._async_save_data)
                self.addAsyncCleanup(f.s.async_stop)
                self.assertTrue(f.s.get_comfort_settings()[E]["temperature_fallback_enabled"])
                f.hass.states[ROOM].state = "unavailable"
                self.assertTrue(self.temperature(f)["using_fallback"])

    async def test_native_selection_clears_backup_even_with_room_source(self):
        f = self.make(scheduler_module)
        f.data["zones"][E]["preconditioning"]["room_temperature_entity_id"] = ROOM
        await f.s.async_update_zone_comfort(E, {
            "temperature_entity_id": None, "temperature_fallback_enabled": True,
        })
        self.assertTrue(f.s.get_comfort_settings()[E]["temperature_fallback_enabled"])
        await f.s.async_update_zone_comfort(E, {"temperature_entity_id": E})
        self.assertFalse(f.data["zones"][E]["comfort"]["temperature_fallback_enabled"])
        self.assertIsNone(self.temperature(f)["fallback_entity_id"])
        self.assertEqual(self.temperature(f)["entity_id"], E)

    async def test_native_attribute_outage_hides_candidate_without_clearing_opt_in(self):
        f = self.make(scheduler_module)
        f.data["zones"][E]["preconditioning"]["room_temperature_entity_id"] = ROOM
        await f.s.async_update_zone_comfort(E, {
            "temperature_entity_id": None, "temperature_fallback_enabled": True,
        })
        del f.hass.states[E].attributes["current_temperature"]
        self.assertIsNone(self.temperature(f)["fallback_entity_id"])
        self.assertTrue(f.s.get_comfort_settings()[E]["temperature_fallback_enabled"])
        f.hass.states[ROOM].state = "unavailable"
        f.hass.states[E].attributes["current_temperature"] = 21
        self.assertEqual(self.temperature(f)["fallback_entity_id"], E)
        self.assertTrue(self.temperature(f)["using_fallback"])
        self.assertEqual(self.temperature(f)["value"], 21)

    async def test_fixed_source_change_to_native_persists_clear_without_resurrection(self):
        f = self.make(scheduler_module)
        await f.s.async_update_zone_preconditioning(E, {"room_temperature_entity_id": ROOM})
        await f.s.async_update_zone_comfort(E, {
            "temperature_entity_id": None, "temperature_fallback_enabled": True,
        })
        saved = []
        f.s._async_save_data.side_effect = lambda: saved.append(deepcopy(f.data))
        await f.s.async_update_zone_preconditioning(E, {"room_temperature_entity_id": None})
        self.assertFalse(f.data["zones"][E]["comfort"]["temperature_fallback_enabled"])
        self.assertTrue(saved)
        self.assertTrue(all(not data["zones"][E]["comfort"]["temperature_fallback_enabled"]
                            for data in saved))
        await f.s.async_update_zone_preconditioning(E, {"room_temperature_entity_id": ROOM})
        self.assertFalse(f.s.get_comfort_settings()[E]["temperature_fallback_enabled"])
        self.assertEqual(self.temperature(f)["fallback_entity_id"], E)

    async def test_fixed_source_change_save_failure_restores_opt_in_and_source(self):
        f = self.make(scheduler_module)
        await f.s.async_update_zone_preconditioning(E, {"room_temperature_entity_id": ROOM})
        await f.s.async_update_zone_comfort(E, {
            "temperature_entity_id": None, "temperature_fallback_enabled": True,
        })
        before = deepcopy(f.data)
        f.s._async_save_data.side_effect = RuntimeError("storage unavailable")
        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await f.s.async_update_zone_preconditioning(E, {"room_temperature_entity_id": None})
        self.assertEqual(f.data, before)
        self.assertTrue(f.s.get_comfort_settings()[E]["temperature_fallback_enabled"])
        self.assertEqual(self.temperature(f)["fallback_entity_id"], E)

    async def test_explicit_external_selection_survives_room_assist_source_removal(self):
        f = self.make(scheduler_module)
        await f.s.async_update_zone_preconditioning(E, {"room_temperature_entity_id": ROOM})
        await f.s.async_update_zone_comfort(E, {
            "temperature_entity_id": ROOM, "temperature_fallback_enabled": True,
        })
        await f.s.async_update_zone_preconditioning(E, {"room_temperature_entity_id": None})
        self.assertTrue(f.data["zones"][E]["comfort"]["temperature_fallback_enabled"])
        self.assertEqual(self.temperature(f)["fallback_entity_id"], E)
        f.hass.states[ROOM].state = "unavailable"
        self.assertTrue(self.temperature(f)["using_fallback"])

    async def test_automatic_climate_has_no_duplicate_backup(self):
        f = self.make(scheduler_module)
        f.data["zones"][E]["comfort"].update(
            temperature_entity_id=None, temperature_fallback_enabled=True)
        metric = self.temperature(f)
        self.assertIsNone(metric["fallback_entity_id"])
        self.assertIsNone(metric["fallback_source"])
        self.assertFalse(metric["using_fallback"])
        self.assertFalse(f.s.get_comfort_settings()[E]["temperature_fallback_enabled"])

    async def test_stale_preferred_does_not_trigger_backup(self):
        f = self.make(scheduler_module)
        f.data["zones"][E]["comfort"]["temperature_fallback_enabled"] = True
        f.hass.states[S].last_reported = NOW - timedelta(minutes=6)
        self.assertEqual(self.temperature(f)["availability"], "stale")
        self.assertEqual(self.temperature(f)["entity_id"], S)
        self.assertFalse(self.temperature(f)["using_fallback"])

    async def test_stale_backup_is_rejected_and_new_report_restores_it(self):
        f = self.make(scheduler_module)
        f.data["zones"][E]["preconditioning"]["room_temperature_entity_id"] = ROOM
        f.data["zones"][E]["comfort"]["temperature_fallback_enabled"] = True
        f.hass.states[S].state = "unavailable"
        f.s._refresh_comfort_listener()
        self.assertIn((ROOM, 5), f.s._comfort_report_sources())
        self.assertIn(ROOM, f.s._comfort_report_entities)
        self.assertTrue(self.temperature(f)["using_fallback"])
        self.clock[0] += timedelta(minutes=6)
        f.s._handle_comfort_expiry(self.clock[0])
        self.assertEqual(self.temperature(f)["availability"], "missing")
        self.assertFalse(self.temperature(f)["using_fallback"])
        f.hass.states[ROOM].last_reported = self.clock[0]
        f.s._handle_comfort_state_reported(SimpleNamespace(data={"entity_id": ROOM}))
        self.assertTrue(self.temperature(f)["using_fallback"])

    async def test_unusable_climate_backup_is_never_reported_as_active(self):
        f = self.make(scheduler_module)
        f.data["zones"][E]["comfort"]["temperature_fallback_enabled"] = True
        f.hass.states[S].state = "unavailable"
        climate = f.hass.states[E]
        for state, value in (("unavailable", 22), ("unknown", 22), ("heat", None),
                             ("heat", "invalid"), ("heat", float("nan"))):
            with self.subTest(state=state, value=value):
                climate.state = state
                climate.attributes["current_temperature"] = value
                metric = self.temperature(f)
                self.assertEqual(metric["availability"], "missing")
                self.assertEqual(metric["entity_id"], S)
                self.assertFalse(metric["using_fallback"])

    async def test_live_climate_updates_and_preferred_recovery_refresh_snapshots(self):
        f = self.make(scheduler_module)
        f.data["zones"][E]["comfort"]["temperature_fallback_enabled"] = True
        f.hass.states[S].state = "unavailable"
        f.s._refresh_comfort_listener()
        self.assertIn(E, f.s._comfort_entities)
        before = f.s._comfort_assessment_snapshots[E]
        f.hass.states[E].attributes["current_temperature"] = 21
        f.s._handle_comfort_state_change(SimpleNamespace(data={"entity_id": E}))
        self.assertNotEqual(f.s._comfort_assessment_snapshots[E], before)
        self.assertEqual(self.temperature(f)["value"], 21)
        # The same value can still switch the visible source on recovery.
        f.hass.states[S].state = "21"
        f.s._handle_comfort_state_change(SimpleNamespace(data={"entity_id": S}))
        self.assertEqual(self.temperature(f)["entity_id"], S)
        self.assertFalse(self.temperature(f)["using_fallback"])

    async def test_group_member_backup_does_not_inherit_group_sensor(self):
        f = self.make(scheduler_module)
        candidate, _ = build_group_candidate(f.data, list(fixtures.ENTITIES), {
            "id": "group.fallback", "name": "Fallback", "members": list(fixtures.ENTITIES),
            "temperature_entity_id": E, "delivery_mode": "all"}, E)
        f.data.clear()
        f.data.update(candidate)
        await f.s.async_stop()
        f.s = scheduler_module.VelairScheduler(
            f.hass, f.data, f.manager, f.s._async_save_data)
        self.addAsyncCleanup(f.s.async_stop)
        f.data["zones"]["group.fallback"]["preconditioning"]["room_temperature_entity_id"] = ROOM
        await f.s.async_update_zone_comfort(B, {"temperature_fallback_enabled": True})
        f.hass.states[T].state = "unavailable"
        self.assertEqual(self.temperature(f, B)["entity_id"], B)
        self.assertEqual(self.temperature(f, B)["fallback_entity_id"], B)
        self.assertFalse(f.s.get_comfort_settings()[E]["temperature_fallback_enabled"])
        loaded = normalize_schedule_data(serialize_schedule_data(f.data), list(fixtures.ENTITIES))
        self.assertTrue(loaded["member_comfort"][B]["temperature_fallback_enabled"])
        await f.s.async_update_zone_comfort(B, {
            "temperature_entity_id": None, "temperature_fallback_enabled": True,
        })
        self.assertFalse(f.s.get_comfort_settings()[B]["temperature_fallback_enabled"])
        self.assertIsNone(self.temperature(f, B)["fallback_entity_id"])

    async def test_save_failure_rolls_back_and_invalid_values_are_rejected(self):
        f = self.make(scheduler_module)
        before = deepcopy(f.data)
        f.s._async_save_data.side_effect = RuntimeError("storage unavailable")
        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await f.s.async_update_zone_comfort(E, {"temperature_fallback_enabled": True})
        self.assertEqual(f.data, before)
        self.assertFalse(f.s.get_comfort_settings()[E]["temperature_fallback_enabled"])
        for value in ("false", 1, None):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "boolean"):
                await f.s.async_update_zone_comfort(E, {"temperature_fallback_enabled": value})

    async def test_fallback_only_observes_and_does_not_change_control_reference(self):
        f = self.make(scheduler_module)
        f.data["zones"][E]["preconditioning"].update(
            room_temperature_entity_id=ROOM, room_sensor_assist_enabled=True)
        f.data["zones"][E]["comfort"]["temperature_fallback_enabled"] = True
        f.hass.states[S].state = "unavailable"
        await f.s.async_stop()
        f.s = scheduler_module.VelairScheduler(
            f.hass, f.data, f.manager, f.s._async_save_data)
        self.addAsyncCleanup(f.s.async_stop)
        self.assertTrue(self.temperature(f)["using_fallback"])
        self.assertEqual(f.s._current_temperature(E), 25)
        await f.s.async_update_zone_comfort(E, {"temperature_fallback_enabled": False})
        self.assertEqual(f.s._current_temperature(E), 25)


class ComfortTemperatureFallbackPersistenceTest(unittest.TestCase):
    def test_contextual_normalization_preserves_only_external_preferred_backups(self):
        for preferred in (None, ROOM, S, E):
            with self.subTest(preferred=preferred):
                normalized = normalize_comfort_data({
                    "temperature_entity_id": preferred, "temperature_fallback_enabled": True,
                }, temperature_default_entity_id=ROOM, temperature_native_entity_id=E)
                self.assertEqual(normalized["temperature_fallback_enabled"], preferred != E)
        self.assertFalse(normalize_comfort_data({
            "temperature_fallback_enabled": True,
        })["temperature_fallback_enabled"])

    def test_legacy_defaults_and_true_round_trip_without_truthy_opt_in(self):
        for value in (None, "true", "false", 1, 0):
            self.assertFalse(normalize_comfort_data({
                "temperature_fallback_enabled": value})["temperature_fallback_enabled"])
        data = normalize_schedule_data(None, [E])
        self.assertFalse(data["zones"][E]["comfort"]["temperature_fallback_enabled"])
        data["zones"][E]["comfort"]["temperature_fallback_enabled"] = True
        data["zones"][E]["comfort"]["temperature_entity_id"] = S
        loaded = normalize_schedule_data(serialize_schedule_data(data), [E])
        self.assertTrue(loaded["zones"][E]["comfort"]["temperature_fallback_enabled"])

    def test_portability_round_trip_and_invalid_import_rejection(self):
        from . import test_api as api_fixtures
        api = api_fixtures.api_module
        runtime = api_fixtures.PortableTemperatureContractTest()._runtime(api.CELSIUS)
        runtime["entry"] = SimpleNamespace(options={})
        runtime["storage"].data["zones"]["climate.salon"]["comfort"]["temperature_fallback_enabled"] = True
        runtime["storage"].data["zones"]["climate.salon"]["comfort"]["temperature_entity_id"] = S
        payload = api._build_export_payload(runtime, ["zones"])
        imported = api._build_import_data(runtime, payload, ["zones"])
        self.assertTrue(imported["zones"]["climate.salon"]["comfort"]["temperature_fallback_enabled"])
        for value in ("false", 1, None):
            payload["sections"]["zones"]["climate.salon"]["comfort"]["temperature_fallback_enabled"] = value
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "boolean"):
                api._build_import_data(runtime, payload, ["zones"])

    def test_automatic_room_source_backup_survives_portable_round_trip(self):
        from . import test_api as api_fixtures
        api = api_fixtures.api_module
        runtime = api_fixtures.PortableTemperatureContractTest()._runtime(api.CELSIUS)
        runtime["entry"] = SimpleNamespace(options={})
        zone = runtime["storage"].data["zones"]["climate.salon"]
        zone["preconditioning"]["room_temperature_entity_id"] = ROOM
        zone["comfort"].update(temperature_entity_id=None, temperature_fallback_enabled=True)
        payload = api._build_export_payload(runtime, ["zones"])
        imported = api._build_import_data(runtime, payload, ["zones"])
        self.assertIsNone(imported["zones"]["climate.salon"]["comfort"]["temperature_entity_id"])
        self.assertTrue(imported["zones"]["climate.salon"]["comfort"]["temperature_fallback_enabled"])
