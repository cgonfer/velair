"""Measured-humidity backups and backend-owned fallback eligibility."""

from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from . import test_comfort_observation_grouping as fixtures
from .helpers import NOW, scheduler_module
from custom_components.velair.models import normalize_comfort_data, normalize_schedule_data, serialize_schedule_data
from custom_components.velair.room_groups import build_group_candidate

E, B = fixtures.ENTITIES
S, T = fixtures.SOURCES
H = "sensor.comfort_humidity"


class ComfortHumidityFallbackTest(unittest.IsolatedAsyncioTestCase):
    make = fixtures.ComfortObservationGroupingTest.make

    def setUp(self):
        self.clock = [NOW]
        clock = patch.object(scheduler_module.dt_util, "now", lambda: self.clock[0])
        clock.start()
        self.addCleanup(clock.stop)

    def fixture(self):
        f = self.make(scheduler_module)
        f.hass.states[H] = SimpleNamespace(
            state="45", attributes={"unit_of_measurement": "%"}, last_reported=NOW)
        for entity in fixtures.ENTITIES:
            f.data["zones"][entity]["comfort"].update(
                humidity_enabled=True, humidity_entity_id=H)
        return f

    def humidity(self, f, entity=E):
        return f.s.get_comfort_assessment(entity)["humidity"]

    async def test_opt_in_recovery_and_disable_preserve_preferred_selection(self):
        f = self.fixture()
        self.assertFalse(f.s.get_comfort_settings()[E]["humidity_fallback_enabled"])
        self.assertEqual(self.humidity(f)["fallback_entity_id"], E)
        f.hass.states[H].state = "unavailable"
        self.assertEqual(self.humidity(f)["availability"], "missing")
        result = await f.s.async_update_zone_comfort(E, {"humidity_fallback_enabled": True})
        self.assertTrue(result["humidity_fallback_enabled"])
        metric = self.humidity(f)
        self.assertEqual(metric["value"], 50)
        self.assertEqual(metric["entity_id"], E)
        self.assertEqual(metric["freshness"], "unverified")
        self.assertTrue(metric["using_fallback"])
        self.assertEqual(result["humidity_entity_id"], H)
        f.hass.states[H].state = "45"
        self.assertEqual(self.humidity(f)["entity_id"], H)
        self.assertFalse(self.humidity(f)["using_fallback"])
        f.hass.states[H].state = "unavailable"
        await f.s.async_update_zone_comfort(E, {"humidity_fallback_enabled": False})
        self.assertEqual(self.humidity(f)["availability"], "missing")

    async def test_missing_invalid_and_out_of_range_preferred_for_heat_and_cool(self):
        f = self.fixture()
        original = f.hass.states[H]
        for entity in fixtures.ENTITIES:
            f.data["zones"][entity]["comfort"]["humidity_fallback_enabled"] = True
            for value in ("unavailable", "unknown", "invalid", "-1", "101", "nan", "inf", None):
                with self.subTest(mode=f.hass.states[entity].state, value=value):
                    f.hass.states[H] = original
                    if value is None:
                        f.hass.states.pop(H)
                    else:
                        original.state = value
                    metric = self.humidity(f, entity)
                    self.assertEqual(metric["availability"], "current")
                    self.assertEqual(metric["value"], 50)
                    self.assertTrue(metric["using_fallback"])

    async def test_backup_rejects_unavailable_attributes_and_target_humidity(self):
        f = self.fixture()
        f.data["zones"][E]["comfort"]["humidity_fallback_enabled"] = True
        f.hass.states[H].state = "unavailable"
        climate = f.hass.states[E]
        climate.attributes["humidity"] = 55
        for state, value in (("unavailable", 50), ("unknown", 50), ("heat", None),
                             ("heat", -1), ("heat", 101), ("heat", True), ("heat", float("nan"))):
            with self.subTest(state=state, value=value):
                climate.state = state
                climate.attributes["current_humidity"] = value
                metric = self.humidity(f)
                self.assertEqual(metric["availability"], "missing")
                self.assertFalse(metric["using_fallback"])
        climate.state = "off"
        climate.attributes["current_humidity"] = 0
        self.assertEqual(self.humidity(f)["value"], 0)
        self.assertTrue(self.humidity(f)["using_fallback"])

    async def test_measured_humidity_capability_controls_metadata_and_projection(self):
        f = self.fixture()
        f.data["zones"][E]["comfort"]["humidity_fallback_enabled"] = True
        f.hass.states[H].state = "unavailable"
        attrs = f.hass.states[E].attributes
        attrs.pop("current_humidity")
        attrs["humidity"] = 55  # A target does not identify a measured source.
        self.assertIsNone(self.humidity(f)["fallback_entity_id"])
        self.assertFalse(self.humidity(f)["using_fallback"])
        attrs["current_humidity"] = None
        self.assertEqual(self.humidity(f)["fallback_entity_id"], E)
        self.assertFalse(self.humidity(f)["using_fallback"])
        attrs["current_humidity"] = 53
        self.assertEqual(self.humidity(f)["value"], 53)
        self.assertTrue(self.humidity(f)["using_fallback"])
        attrs.pop("current_humidity")
        self.assertIsNone(self.humidity(f)["fallback_entity_id"])
        self.assertTrue(f.s.get_comfort_settings()[E]["humidity_fallback_enabled"])
        self.assertTrue(f.data["zones"][E]["comfort"]["humidity_fallback_enabled"])
        f.s._async_save_data.assert_not_awaited()

    async def test_stale_preferred_never_uses_backup(self):
        f = self.fixture()
        f.data["zones"][E]["comfort"]["humidity_fallback_enabled"] = True
        self.clock[0] += timedelta(minutes=6)
        metric = self.humidity(f)
        self.assertEqual(metric["availability"], "stale")
        self.assertEqual(metric["entity_id"], H)
        self.assertFalse(metric["using_fallback"])

    async def test_default_source_and_monitoring_changes_clear_persisted_flag(self):
        f = self.fixture()
        for selection in (None, E):
            await f.s.async_update_zone_comfort(E, {
                "humidity_entity_id": H, "humidity_fallback_enabled": True})
            result = await f.s.async_update_zone_comfort(E, {"humidity_entity_id": selection})
            self.assertFalse(result["humidity_fallback_enabled"])
            self.assertFalse(f.data["zones"][E]["comfort"]["humidity_fallback_enabled"])
            self.assertIsNone(self.humidity(f)["fallback_entity_id"])
            result = await f.s.async_update_zone_comfort(E, {"humidity_fallback_enabled": True})
            self.assertFalse(result["humidity_fallback_enabled"])
        await f.s.async_update_zone_comfort(E, {
            "humidity_entity_id": H, "humidity_fallback_enabled": True})
        result = await f.s.async_update_zone_comfort(E, {"humidity_enabled": False})
        self.assertEqual(result["humidity_entity_id"], H)
        self.assertFalse(result["humidity_fallback_enabled"])
        self.assertEqual(self.humidity(f)["availability"], "not_monitored")
        self.assertIsNone(self.humidity(f)["fallback_entity_id"])
        await f.s.async_update_zone_comfort(E, {"humidity_enabled": True})
        self.assertFalse(f.s.get_comfort_settings()[E]["humidity_fallback_enabled"])

    async def test_temperature_and_humidity_opt_ins_are_independent(self):
        f = self.fixture()
        await f.s.async_update_zone_comfort(E, {
            "temperature_fallback_enabled": True, "humidity_fallback_enabled": True})
        result = await f.s.async_update_zone_comfort(E, {"temperature_entity_id": None})
        self.assertFalse(result["temperature_fallback_enabled"])
        self.assertTrue(result["humidity_fallback_enabled"])
        result = await f.s.async_update_zone_comfort(E, {"temperature_entity_id": S})
        self.assertFalse(result["temperature_fallback_enabled"])
        self.assertTrue(result["humidity_fallback_enabled"])
        result = await f.s.async_update_zone_comfort(E, {"temperature_fallback_enabled": True})
        self.assertTrue(result["temperature_fallback_enabled"])
        result = await f.s.async_update_zone_comfort(E, {"humidity_entity_id": None})
        self.assertTrue(result["temperature_fallback_enabled"])
        self.assertFalse(result["humidity_fallback_enabled"])

    async def test_default_temperature_selection_clears_saved_flag(self):
        f = self.fixture()
        for selection in (None, E):
            await f.s.async_update_zone_comfort(E, {
                "temperature_entity_id": S, "temperature_fallback_enabled": True})
            result = await f.s.async_update_zone_comfort(E, {"temperature_entity_id": selection})
            self.assertFalse(result["temperature_fallback_enabled"])
            self.assertFalse(f.data["zones"][E]["comfort"]["temperature_fallback_enabled"])
            self.assertIsNone(f.s.get_comfort_assessment(E)["temperature"]["fallback_entity_id"])

    async def test_derived_metrics_use_backup_and_receive_live_source_updates(self):
        f = self.fixture()
        await f.s.async_update_zone_comfort(E, {
            "humidity_fallback_enabled": True,
            "derived_metrics": {name: {"enabled": True} for name in (
                "dew_point", "absolute_humidity", "humidex")},
        })
        f.hass.states[H].state = "unavailable"
        f.s._handle_comfort_state_change(SimpleNamespace(data={"entity_id": H}))
        assessment = f.s.get_comfort_assessment(E)
        for metric in assessment["derived_metrics"].values():
            self.assertEqual(metric["availability"], "current")
            self.assertEqual(metric["freshness"], "unverified")
        before = f.s._comfort_assessment_snapshots[E]
        f.hass.states[E].attributes["current_humidity"] = 55
        f.s._handle_comfort_state_change(SimpleNamespace(data={"entity_id": E}))
        self.assertNotEqual(f.s._comfort_assessment_snapshots[E], before)
        self.assertEqual(self.humidity(f)["value"], 55)
        f.hass.states[H].state = "55"
        f.s._handle_comfort_state_change(SimpleNamespace(data={"entity_id": H}))
        self.assertEqual(self.humidity(f)["entity_id"], H)
        self.assertFalse(self.humidity(f)["using_fallback"])

    async def test_backup_raw_humidity_does_not_invent_a_missing_temperature_range(self):
        f = self.fixture()
        f.data["zones"][E]["comfort"]["humidity_fallback_enabled"] = True
        f.data["zones"][E]["comfort"]["comfort_model"] = "temperature_aware"
        f.hass.states[S].state = "unavailable"
        f.hass.states[H].state = "unavailable"
        metric = self.humidity(f)
        self.assertTrue(metric["using_fallback"])
        self.assertEqual(metric["availability"], "current")
        self.assertIsNone(metric["condition"])
        self.assertFalse(metric["effective_range_available"])

    async def test_save_failure_rolls_back_flags_and_invalid_values_are_rejected(self):
        f = self.fixture()
        before = deepcopy(f.data)
        f.s._async_save_data.side_effect = RuntimeError("storage unavailable")
        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await f.s.async_update_zone_comfort(E, {"humidity_fallback_enabled": True})
        self.assertEqual(f.data, before)
        for value in (1, "true", None):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "boolean"):
                await f.s.async_update_zone_comfort(E, {"humidity_fallback_enabled": value})

    async def test_grouped_members_use_own_humidity_and_persist_independent_flags(self):
        f = self.fixture()
        f.hass.states[B].attributes["current_humidity"] = 61
        candidate, _ = build_group_candidate(f.data, list(fixtures.ENTITIES), {
            "id": "group.humidity", "name": "Humidity", "members": list(fixtures.ENTITIES),
            "temperature_entity_id": E, "delivery_mode": "all"}, E)
        f.data.clear()
        f.data.update(candidate)
        await f.s.async_stop()
        f.s = scheduler_module.VelairScheduler(f.hass, f.data, f.manager, f.s._async_save_data)
        self.addAsyncCleanup(f.s.async_stop)
        await f.s.async_update_zone_comfort(B, {"humidity_fallback_enabled": True})
        f.hass.states[H].state = "unavailable"
        self.assertEqual(self.humidity(f, B)["value"], 61)
        self.assertEqual(self.humidity(f, B)["entity_id"], B)
        self.assertFalse(f.s.get_comfort_settings()[E]["humidity_fallback_enabled"])
        loaded = normalize_schedule_data(serialize_schedule_data(f.data), list(fixtures.ENTITIES))
        self.assertTrue(loaded["member_comfort"][B]["humidity_fallback_enabled"])


class ComfortFallbackNormalizationTest(unittest.TestCase):
    def test_flags_default_false_and_require_explicit_distinct_sources(self):
        self.assertFalse(normalize_comfort_data(None)["humidity_fallback_enabled"])
        for field in ("temperature", "humidity"):
            source_key, flag = f"{field}_entity_id", f"{field}_fallback_enabled"
            for value in (None, 1, "true", "false"):
                self.assertFalse(normalize_comfort_data({source_key: H, flag: value})[flag])
            self.assertFalse(normalize_comfort_data({flag: True})[flag])
            self.assertTrue(normalize_comfort_data({source_key: H, flag: True})[flag])

    def test_load_and_round_trip_clear_defaults_and_preserve_external_flags(self):
        raw = {"zones": {E: {"comfort": {
            "temperature_entity_id": S, "temperature_fallback_enabled": True,
            "humidity_entity_id": H, "humidity_fallback_enabled": True,
        }, "preconditioning": {"room_temperature_entity_id": S}}}}
        loaded = normalize_schedule_data(raw, [E])
        self.assertFalse(loaded["zones"][E]["comfort"]["temperature_fallback_enabled"])
        self.assertTrue(loaded["zones"][E]["comfort"]["humidity_fallback_enabled"])
        loaded["zones"][E]["comfort"].update(humidity_entity_id=E)
        reloaded = normalize_schedule_data(serialize_schedule_data(loaded), [E])
        self.assertFalse(reloaded["zones"][E]["comfort"]["humidity_fallback_enabled"])

    def test_portable_humidity_flags_validate_round_trip_and_default_selection(self):
        from . import test_api as api_fixtures
        api = api_fixtures.api_module
        runtime = api_fixtures.PortableTemperatureContractTest()._runtime(api.CELSIUS)
        runtime["entry"] = SimpleNamespace(options={})
        runtime["storage"].data["zones"]["climate.salon"]["comfort"].update(
            humidity_entity_id=H, humidity_fallback_enabled=True)
        payload = api._build_export_payload(runtime, ["zones"])
        imported = api._build_import_data(runtime, payload, ["zones"])
        self.assertTrue(imported["zones"]["climate.salon"]["comfort"]["humidity_fallback_enabled"])
        portable_comfort = payload["sections"]["zones"]["climate.salon"]["comfort"]
        for value in (1, "false", None):
            portable_comfort["humidity_fallback_enabled"] = value
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "boolean"):
                api._build_import_data(runtime, payload, ["zones"])
        portable_comfort.update(humidity_entity_id=None, humidity_fallback_enabled=True)
        imported = api._build_import_data(runtime, payload, ["zones"])
        self.assertFalse(imported["zones"]["climate.salon"]["comfort"]["humidity_fallback_enabled"])
