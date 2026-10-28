"""Independent physical Comfort across shared room control ownership."""
from copy import deepcopy
from datetime import timedelta
import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeHass, NOW, normalize_schedule_data, VelairScheduler
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.models import serialize_schedule_data
from custom_components.velair.room_groups import build_group_candidate, remove_group_candidate
from custom_components.velair.storage import _convert_scheduler_temperatures

PHYSICAL = ["climate.a", "climate.b", "climate.c"]
GROUP = {"id": "group.room", "name": "Room", "members": PHYSICAL[:2],
         "temperature_entity_id": PHYSICAL[0], "delivery_mode": "all"}


class IndependentComfortStorageTest(unittest.TestCase):
    def setUp(self):
        self.base = normalize_schedule_data(None, PHYSICAL)
        for index, member in enumerate(PHYSICAL):
            self.base["zones"][member]["comfort"].update(
                enabled=index != 1, temperature_min=18 + index,
                humidity_min=35 + index, temperature_entity_id=f"sensor.t{index}")

    def test_create_reload_edit_and_dissolve_preserve_each_config(self):
        candidate, review = build_group_candidate(self.base, PHYSICAL, GROUP, PHYSICAL[0])
        self.assertEqual(review["conflicts"], [])
        candidate["member_comfort"]["climate.unmanaged"] = {}
        candidate["member_comfort"][PHYSICAL[2]] = {}
        loaded = normalize_schedule_data(serialize_schedule_data(candidate), PHYSICAL)
        self.assertEqual(set(loaded["member_comfort"]), set(GROUP["members"]))
        for member in GROUP["members"]:
            self.assertEqual(loaded["member_comfort"][member], self.base["zones"][member]["comfort"])
        expanded, _ = build_group_candidate(loaded, PHYSICAL, {**GROUP, "members": PHYSICAL})
        trimmed, _ = build_group_candidate(expanded, PHYSICAL, {**GROUP, "members": [PHYSICAL[0], PHYSICAL[2]]})
        self.assertEqual(trimmed["zones"][PHYSICAL[1]]["comfort"], self.base["zones"][PHYSICAL[1]]["comfort"])
        dissolved = remove_group_candidate(trimmed, GROUP["id"])
        self.assertEqual(dissolved["member_comfort"], {})
        for member in PHYSICAL:
            self.assertEqual(dissolved["zones"][member]["comfort"], self.base["zones"][member]["comfort"])

    def test_portability_preserves_distinct_configs_and_ownership_dependencies(self):
        from custom_components.velair import api
        candidate, _ = build_group_candidate(self.base, PHYSICAL, {**GROUP, "members": PHYSICAL}, PHYSICAL[0])
        entry = SimpleNamespace(options={}, data={})
        runtime = {"entry": entry, "storage": SimpleNamespace(data=candidate, _climate_entities=PHYSICAL)}
        payload = api._build_export_payload(runtime, ["zones"])
        self.assertTrue({"member_comfort", "room_groups", "zones", "profiles"}.issubset(payload["sections"]))
        imported = api._build_import_data(runtime, payload, ["member_comfort"])
        self.assertEqual(imported["member_comfort"], candidate["member_comfort"])
        runtime["storage"].effective_temperature_unit = "\u00b0F"
        converted = api._build_import_data(runtime, payload, ["zones"])
        self.assertEqual(converted["member_comfort"][PHYSICAL[1]]["temperature_min"], 66.2)
        legacy = deepcopy(payload)
        legacy["sections"].pop("member_comfort")
        imported_legacy = api._build_import_data(runtime, legacy, ["zones"])
        for member in PHYSICAL:
            self.assertEqual(imported_legacy["member_comfort"][member], imported_legacy["zones"][GROUP["id"]]["comfort"])

    def test_malformed_and_unmanaged_portable_comfort_are_rejected(self):
        from custom_components.velair import api
        candidate, _ = build_group_candidate(self.base, PHYSICAL, GROUP, PHYSICAL[0])
        runtime = {"entry": SimpleNamespace(options={}, data={}),
                   "storage": SimpleNamespace(data=candidate, _climate_entities=PHYSICAL)}
        payload = api._build_export_payload(runtime, ["zones"])
        for invalid in ([], {"climate.unmanaged": {}}, {PHYSICAL[0]: None},
                        {PHYSICAL[0]: {"derived_metrics": []}}):
            broken = deepcopy(payload)
            broken["sections"]["member_comfort"] = invalid
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                api._build_import_data(runtime, broken, ["zones"])

    def test_legacy_group_seeds_independent_deep_copies(self):
        candidate, _ = build_group_candidate(self.base, PHYSICAL, GROUP, PHYSICAL[0])
        candidate.pop("member_comfort")
        loaded = normalize_schedule_data(serialize_schedule_data(candidate), PHYSICAL)
        expected = deepcopy(loaded["zones"][GROUP["id"]]["comfort"])
        self.assertEqual(loaded["member_comfort"][PHYSICAL[1]], expected)
        loaded["member_comfort"][PHYSICAL[0]]["temperature_min"] = 10
        self.assertEqual(loaded["member_comfort"][PHYSICAL[1]], expected)
        self.assertEqual(loaded["zones"][GROUP["id"]]["comfort"], expected)

    def test_temperature_conversion_keeps_distinct_thresholds(self):
        candidate, _ = build_group_candidate(self.base, PHYSICAL, GROUP, PHYSICAL[0])
        before = deepcopy(candidate)
        _convert_scheduler_temperatures(candidate, "°C", "°F")
        self.assertEqual(candidate["member_comfort"][PHYSICAL[0]]["temperature_min"], 64.4)
        self.assertEqual(candidate["member_comfort"][PHYSICAL[1]]["temperature_min"], 66.2)
        _convert_scheduler_temperatures(candidate, "°F", "°C")
        self.assertEqual(candidate["member_comfort"], before["member_comfort"])


class IndependentComfortRuntimeTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.hass = FakeHass()
        self.hass.config.units = SimpleNamespace(temperature_unit="°C")
        self.base = normalize_schedule_data(None, PHYSICAL)
        for index, member in enumerate(PHYSICAL):
            self.hass.states[member] = SimpleNamespace(state="heat", attributes={
                "current_temperature": 19 + index, "current_humidity": 40 + index,
                "hvac_modes": ["off", "heat", "cool"], "supported_features": 1,
                "min_temp": 5, "max_temp": 35, "target_temp_step": 0.5})
            self.base["zones"][member]["comfort"]["enabled"] = True
        self.data, _ = build_group_candidate(self.base, PHYSICAL, GROUP, PHYSICAL[0])
        self.data["zones"][GROUP["id"]]["preconditioning"].update(
            room_temperature_entity_id="sensor.room_assist", room_sensor_assist_enabled=True)
        self.save = AsyncMock()
        self.scheduler = VelairScheduler(self.hass, self.data, ClimateManager(self.hass), self.save)

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    async def test_assessments_read_each_physical_temperature_and_humidity(self):
        assessments = self.scheduler.get_comfort_assessments()
        self.assertEqual(set(assessments), set(PHYSICAL))
        for index, member in enumerate(PHYSICAL):
            self.assertEqual(assessments[member]["temperature"]["value"], 19 + index)
            self.assertEqual(assessments[member]["humidity"]["value"], 40 + index)
        self.assertFalse(self.scheduler.get_comfort_assessment(GROUP["id"])["enabled"])
        self.assertNotIn("sensor.room_assist", self.scheduler._comfort_candidate_entities())
        self.assertTrue(set(PHYSICAL).issubset(self.scheduler._comfort_candidate_entities()))

    async def test_write_is_independent_and_rejects_logical_or_unmanaged_targets(self):
        before = deepcopy(self.scheduler.get_comfort_settings())
        await self.scheduler.async_update_zone_comfort(PHYSICAL[1], {"humidity_min": 42, "humidity_max": 70, "enabled": False})
        after = self.scheduler.get_comfort_settings()
        self.assertEqual(after[PHYSICAL[0]], before[PHYSICAL[0]])
        self.assertEqual(after[PHYSICAL[2]], before[PHYSICAL[2]])
        self.assertEqual(after[PHYSICAL[1]]["humidity_min"], 42)
        for target in (GROUP["id"], "climate.unmanaged"):
            with self.assertRaisesRegex(ValueError, "physical climate"):
                await self.scheduler.async_update_zone_comfort(target, {})

    async def test_failed_save_rolls_back_member_and_singleton(self):
        self.save.side_effect = RuntimeError("storage unavailable")
        before = deepcopy(self.data)
        for member in (PHYSICAL[0], PHYSICAL[2]):
            with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
                await self.scheduler.async_update_zone_comfort(member, {"enabled": False})
            self.assertEqual(self.data, before)

    async def test_write_waits_for_ownership_lock_and_resolves_current_owner(self):
        async with self.scheduler._profile_mutation_lock:
            task = asyncio.create_task(self.scheduler.async_update_zone_comfort(PHYSICAL[0], {"humidity_min": 39}))
            await asyncio.sleep(0)
            self.assertFalse(task.done())
            dissolved = remove_group_candidate(self.data, GROUP["id"])
            self.data.clear()
            self.data.update(dissolved)
        await task
        self.assertEqual(self.data["zones"][PHYSICAL[0]]["comfort"]["humidity_min"], 39)
        self.assertEqual(self.data["member_comfort"], {})

    async def test_listeners_and_change_events_use_physical_ids(self):
        self.data["member_comfort"][PHYSICAL[0]]["temperature_entity_id"] = "sensor.a"
        self.data["member_comfort"][PHYSICAL[1]]["temperature_entity_id"] = "sensor.b"
        self.assertIn("sensor.a", self.scheduler._comfort_candidate_entities())
        self.assertIn("sensor.b", self.scheduler._comfort_candidate_entities())
        self.assertEqual(set(self.scheduler._comfort_report_sources()), {("sensor.a", 120), ("sensor.b", 120)})
        self.scheduler._async_update_comfort_snapshots(fire_events=False)
        self.hass.states[PHYSICAL[1]].attributes["current_humidity"] = 95
        self.scheduler._async_update_comfort_snapshots(fire_events=True)
        events = [payload for _, payload in self.hass.bus.events if payload.get("event") == "comfort_assessment_changed"]
        self.assertTrue(events)
        self.assertTrue(all(payload["entity_id"] == PHYSICAL[1] for payload in events))


    async def test_external_sensor_expiry_and_same_value_reports_are_independent(self):
        for member, sensor, minutes in ((PHYSICAL[0], "sensor.a", 10), (PHYSICAL[1], "sensor.b", 30)):
            self.data["member_comfort"][member].update(temperature_entity_id=sensor, stale_after_minutes=minutes)
            self.hass.states[sensor] = SimpleNamespace(
                state="21", attributes={"unit_of_measurement": "\u00b0C"}, last_reported=NOW)
        from custom_components.velair import scheduler as module
        self.scheduler._stopped = False
        with patch.object(module.dt_util, "now", return_value=NOW), patch.object(
                module, "async_track_point_in_time", return_value=lambda: None) as timer:
            self.scheduler._refresh_comfort_listener()
            self.assertEqual(self.scheduler._comfort_report_entities, {"sensor.a", "sensor.b"})
            self.assertEqual(timer.call_args.args[2], NOW + timedelta(minutes=10))
        later = NOW + timedelta(minutes=11)
        with patch.object(module.dt_util, "now", return_value=later), patch.object(
                module, "async_track_point_in_time", return_value=lambda: None) as timer:
            self.hass.bus.events.clear()
            self.scheduler._handle_comfort_expiry(later)
            assessments = self.scheduler.get_comfort_assessments()
            self.assertEqual(assessments[PHYSICAL[0]]["temperature"]["availability"], "stale")
            self.assertEqual(assessments[PHYSICAL[1]]["temperature"]["freshness"], "reported")
            events = [payload for _, payload in self.hass.bus.events if payload.get("event") == "comfort_assessment_changed"]
            self.assertTrue(events)
            self.assertEqual({payload["entity_id"] for payload in events}, {PHYSICAL[0]})
            self.assertEqual(timer.call_args.args[2], NOW + timedelta(minutes=30))
            self.hass.bus.events.clear()
            self.hass.states["sensor.a"].last_reported = later
            self.scheduler._handle_comfort_state_reported(SimpleNamespace(data={"entity_id": "sensor.a"}))
            self.assertEqual(self.scheduler.get_comfort_assessment(PHYSICAL[0])["temperature"]["freshness"], "reported")
            self.assertEqual(timer.call_args.args[2], later + timedelta(minutes=10))
            events = [payload for _, payload in self.hass.bus.events if payload.get("event") == "comfort_assessment_changed"]
            self.assertTrue(events)
            self.assertEqual({payload["entity_id"] for payload in events}, {PHYSICAL[0]})
