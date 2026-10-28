"""Physical observations and logical demand share one room control policy."""
from __future__ import annotations

from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeHass, NOW
from .test_shared_demand import group, state
from . import test_runtime_diagnostics as diagnostics_tests
from custom_components.velair import shared_demand as module
from custom_components.velair.shared_demand import SharedDemandController
from custom_components.velair.shared_demand_config import normalize_groups
from custom_components.velair.models import normalize_schedule_data, serialize_schedule_data
from custom_components.velair.room_groups import build_group_candidate
from custom_components.velair.storage import _convert_scheduler_temperatures


class RoomGroupSupplyTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.hass = FakeHass()
        self.hass.config = SimpleNamespace(units=SimpleNamespace(temperature_unit="°C"))
        self.hass.states["climate.one"] = state(temperature=26)
        self.hass.states["climate.two"] = state(temperature=25)
        self.hass.states["sensor.room"] = SimpleNamespace(state="19", attributes={})
        self.hass.states["switch.boiler"] = state("off")
        self.logical_state = state(temperature=19, target=21)
        supply = group()
        supply["zones"] = {"group.room": {}}
        self.data = {
            "zones": {"group.room": {"enabled": True}},
            "room_groups": {"group.room": {
                "members": ["climate.one", "climate.two"],
                "temperature_entity_id": "sensor.room",
            }},
            "settings": {"shared_demand_groups": [supply]},
        }
        self.scheduler = SimpleNamespace(
            _data=self.data,
            climate_state=lambda entity: self.logical_state if entity == "group.room" else self.hass.states.get(entity),
            physical_members=lambda entity: ["climate.one", "climate.two"],
            get_shared_demand_room_assist=lambda entity: {"active": False},
        )
        self.controller = SharedDemandController(self.hass, self.data, AsyncMock(), self.scheduler)

    def test_logical_room_demand_uses_shared_reference_once(self):
        supply = normalize_groups(self.data["settings"]["shared_demand_groups"], self.data["zones"])[0]
        result = self.controller._zone_demand(supply, "group.room", {})
        self.assertTrue(result["demand"])
        self.assertEqual(len(self.controller._phases), 1)
        observation = self.controller._zone_observation("group.room")
        self.assertEqual(observation["temperature"], 19)
        self.assertEqual(observation["sensor_entity_id"], "sensor.room")
        self.logical_state = state(temperature=22, target=21)
        self.assertFalse(self.controller._zone_demand(supply, "group.room", {})["demand"])

    def test_unavailable_reference_drops_stale_shared_demand(self):
        supply = normalize_groups(self.data["settings"]["shared_demand_groups"], self.data["zones"])[0]
        self.assertTrue(self.controller._zone_demand(supply, "group.room", {})["demand"])
        self.logical_state = state("unavailable")
        self.assertIsNone(self.controller._zone_demand(supply, "group.room", {})["demand"])
        self.assertEqual(self.controller._phases, {})

    def test_listener_tracks_members_and_reference_instead_of_logical_id(self):
        self.controller._started = True
        with patch.object(module, "async_track_state_change_event", return_value=lambda: None) as listen, \
                patch.object(self.controller, "_queue"):
            self.controller.reconfigure()
        watched = set(listen.call_args.args[1])
        self.assertEqual(watched, {"climate.one", "climate.two", "sensor.room", "switch.boiler"})
        self.assertNotIn("group.room", watched)
        self.assertEqual(self.controller._entity_groups["sensor.room"], {"boiler"})

    def test_listener_keeps_enabled_room_assist_sensor_alongside_native_member(self):
        self.data["room_groups"]["group.room"]["temperature_entity_id"] = "climate.two"
        self.data["zones"]["group.room"]["preconditioning"] = {
            "room_sensor_assist_enabled": True, "room_temperature_entity_id": "sensor.room"}
        self.controller._started = True
        with patch.object(module, "async_track_state_change_event", return_value=lambda: None) as listen, \
                patch.object(self.controller, "_queue"):
            self.controller.reconfigure()
        self.assertEqual(set(listen.call_args.args[1]), {"climate.one", "climate.two", "sensor.room", "switch.boiler"})
        self.assertEqual(self.controller._entity_groups["sensor.room"], {"boiler"})

    def test_unknown_room_remains_rejected(self):
        with self.assertRaises(ValueError):
            normalize_groups(self.data["settings"]["shared_demand_groups"], ["climate.one"])


class RoomGroupDiagnosticsTests(unittest.TestCase):
    def setUp(self):
        fixture = diagnostics_tests.RuntimeDiagnosticsTest()
        fixture.setUp()
        self.manager, self.runtime = fixture.manager, fixture.runtime
        self.physical_id = "climate.living_room"
        data = self.runtime["storage"].data
        data["zones"]["group.room"] = data["zones"].pop(self.physical_id)
        data["room_groups"] = {"group.room": {"name": "Living room", "members": [self.physical_id]}}
        scheduler = self.runtime["scheduler"]
        scheduler.owner_for_entity = lambda entity: "group.room" if entity == self.physical_id else entity
        scheduler.get_zone_runtime_statuses = lambda: {"group.room": {"state": "scheduled", "hvac_mode": "heat_cool"}}
        scheduler.get_room_sensor_assist_statuses = lambda: {"group.room": {"status": "ready"}}
        scheduler.group_delivery_status = lambda entity: self.member_delivery
        self.member_delivery = {self.physical_id: {"status": "success"}}
        self.manager._runtime = self.runtime
        self.manager._delivery["group.room"] = {"status": "retrying", "retry_count": 1}

    def test_individual_diagnostics_keep_common_intent_and_physical_delivery(self):
        snapshot = self.manager.snapshot(self.runtime)
        self.assertEqual(set(snapshot["units"]), {self.physical_id})
        unit = snapshot["units"][self.physical_id]
        self.assertEqual(unit["control_unit_id"], "group.room")
        self.assertEqual(unit["group_name"], "Living room")
        self.assertEqual(unit["intent"]["hvac_mode"], "heat_cool")
        self.assertEqual(unit["delivery"]["status"], "success")
        self.assertFalse(any(issue["code"] == "entity_missing" for issue in unit["issues"]))

    def test_physical_comfort_config_and_assessments_remain_in_diagnostics(self):
        data = self.runtime["storage"].data
        data["member_comfort"] = {self.physical_id: {
            "enabled": True, "temperature_entity_id": "sensor.member_temperature",
            "humidity_enabled": True, "humidity_entity_id": "sensor.member_humidity"}}
        data["zones"]["group.room"]["comfort"] = {
            "enabled": True, "temperature_entity_id": "sensor.legacy_group"}
        expected = {"temperature": {"value": 22}, "humidity": {"value": 55}}
        self.runtime["scheduler"].get_comfort_assessments = lambda: {self.physical_id: expected}
        snapshot = self.manager.snapshot(self.runtime)["units"][self.physical_id]
        self.assertEqual(snapshot["comfort"], expected)
        sensor_ids = {item["entity_id"] for item in snapshot["sensors"]}
        self.assertIn("sensor.member_temperature", sensor_ids)
        self.assertIn("sensor.member_humidity", sensor_ids)
        self.assertNotIn("sensor.legacy_group", sensor_ids)
        watched = self.manager._active_associated_sensor_ids()
        self.assertIn("sensor.member_temperature", watched)
        self.assertIn("sensor.member_humidity", watched)
        self.assertNotIn("sensor.legacy_group", watched)

    def test_uncommanded_member_is_not_reported_as_direct_delivery_success(self):
        self.member_delivery = {}
        self.manager._delivery["group.room"] = {"status": "success", "retry_count": 0}
        self.manager._last_applied["group.room"] = {"at": NOW.isoformat(), "temperature": 21}
        status = self.manager.zone_delivery_diagnostics(self.physical_id)
        self.assertEqual(status["status"], "idle")
        self.assertNotIn("last_accepted_temperature", status)
        self.assertIsNone(self.manager.snapshot(self.runtime)["units"][self.physical_id]["last_application"])


class RoomGroupSnapshotTests(unittest.TestCase):
    def test_boost_restore_snapshots_survive_storage_reload_and_unit_conversion(self):
        physical = ["climate.one", "climate.two"]
        data = normalize_schedule_data(None, physical)
        data, _ = build_group_candidate(data, physical, {
            "id": "group.room", "name": "Room", "members": physical,
            "temperature_entity_id": "climate.one", "delivery_mode": "all",
        }, "climate.one")
        data["zones"]["group.room"]["override"] = {
            "type": "boost", "until": "2027-01-01T00:00:00+00:00", "temperature": 22,
            "previous_state": {"group_members": {
                "climate.one": {"hvac_mode": "heat", "temperature": 19},
                "climate.two": {"hvac_mode": "off", "temperature": 20},
            }},
        }
        loaded = normalize_schedule_data(serialize_schedule_data(data), physical)
        previous = loaded["zones"]["group.room"]["override"]["previous_state"]
        self.assertEqual(previous["group_members"]["climate.one"]["temperature"], 19)
        _convert_scheduler_temperatures(loaded, "°C", "°F")
        self.assertAlmostEqual(previous["group_members"]["climate.one"]["temperature"], 66.2)
        self.assertEqual(previous["group_members"]["climate.two"]["hvac_mode"], "off")
