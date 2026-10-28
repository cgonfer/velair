"""Group ownership, migration and portability regression coverage."""

from copy import deepcopy
from types import SimpleNamespace
import unittest

from .helpers import normalize_schedule_data
from custom_components.velair.models import serialize_schedule_data
from custom_components.velair.room_groups import (
    build_group_candidate, remove_group_candidate, normalize_room_groups,
    control_unit_ids, delivery_members, resolve_control_unit,
)


class RoomGroupsTest(unittest.TestCase):
    def setUp(self):
        self.physical = ["climate.a", "climate.other", "climate.b"]
        self.data = normalize_schedule_data(None, self.physical)
        self.group = {"id": "group.room", "name": "Room", "members": ["climate.a", "climate.b"],
                      "temperature_entity_id": "climate.a", "delivery_mode": "all"}

    def candidate(self):
        return build_group_candidate(self.data, self.physical, self.group, "climate.a")[0]

    def test_new_group_native_reference_must_be_a_member_climate(self):
        for reference in ("sensor.room", "climate.other", "climate.unmanaged"):
            with self.subTest(reference=reference), self.assertRaises(ValueError):
                build_group_candidate(self.data, self.physical, {**self.group, "temperature_entity_id": reference}, "climate.a")

    def test_grouping_reload_and_dissolving_preserve_independent_room_assist_config(self):
        source = self.data["zones"]["climate.a"]["preconditioning"]
        source.update(room_sensor_assist_enabled=True, room_temperature_entity_id="sensor.optional")
        candidate = self.candidate()
        loaded = normalize_schedule_data(serialize_schedule_data(candidate), self.physical)
        self.assertEqual(loaded["room_groups"]["group.room"]["temperature_entity_id"], "climate.a")
        self.assertEqual(loaded["zones"]["group.room"]["preconditioning"], source)
        detached = remove_group_candidate(loaded, "group.room")
        for member in self.group["members"]:
            self.assertEqual(detached["zones"][member]["preconditioning"], source)

    def test_create_has_single_owner_and_round_trips(self):
        self.data["zones"]["climate.a"]["schedule"]["monday"] = [{"start": "08:00", "action": "set_temperature", "temperature": 21}]
        original = deepcopy(self.data)
        candidate = self.candidate()
        self.assertEqual(self.data, original)
        self.assertEqual(set(candidate["zones"]), {"group.room", "climate.other"})
        loaded = normalize_schedule_data(serialize_schedule_data(candidate), self.physical)
        self.assertEqual(loaded["room_groups"], candidate["room_groups"])
        self.assertEqual(set(loaded["zones"]), set(candidate["zones"]))
        self.assertEqual(loaded["zones"]["group.room"]["schedule"], candidate["zones"]["group.room"]["schedule"])
        self.assertEqual(resolve_control_unit(loaded, "climate.b"), "group.room")
        self.assertEqual(delivery_members(loaded, "climate.b"), ["climate.a", "climate.b"])
        self.assertEqual(control_unit_ids(loaded["room_groups"], self.physical), ["group.room", "climate.other"])

    def test_conflicts_are_reported_and_source_adopted(self):
        self.data["zones"]["climate.b"]["enabled"] = False
        self.data["zones"]["climate.b"]["schedule"]["monday"] = [{"start": "09:00", "temperature": 19}]
        candidate, preview = build_group_candidate(self.data, self.physical, self.group, "climate.a")
        self.assertIn({"entity_id": "climate.b", "fields": ["enabled", "schedule"]}, preview["conflicts"])
        self.assertEqual(candidate["zones"]["group.room"]["schedule"]["monday"], [])
        with self.assertRaisesRegex(ValueError, "Choose"):
            build_group_candidate(self.data, self.physical, self.group)

    def test_duplicate_membership_and_unmanaged_targets_rejected(self):
        for members in (["climate.a", "climate.a"], ["climate.unknown"]):
            with self.subTest(members=members), self.assertRaises(ValueError):
                normalize_room_groups({"group.room": {**self.group, "members": members}}, self.physical)
        other = {**self.group, "id": "group.other", "name": "Other"}
        with self.assertRaisesRegex(ValueError, "only one"):
            normalize_room_groups({"group.room": self.group, "group.other": other}, self.physical)

    def test_explicit_reference_and_selected_destination_required(self):
        for updates in ({"temperature_entity_id": None}, {"temperature_entity_id": "climate.other"},
                        {"delivery_mode": "selected", "delivery_entity_id": "climate.other"}):
            with self.subTest(updates=updates), self.assertRaises(ValueError):
                normalize_room_groups({"group.room": {**self.group, **updates}}, self.physical)
        self.group.update(delivery_mode="selected", delivery_entity_id="climate.b")
        self.assertEqual(delivery_members(self.candidate(), "group.room"), ["climate.b"])

    def test_split_clones_profiles_clears_temporaries_and_history(self):
        self.data["profiles"] = [{"key": "night", "zones": {"climate.a": {"behavior": "pause", "action": "keep"}}}]
        self.data["global_"]["zone_profile_overrides"] = {"climate.a": "night"}
        candidate = self.candidate()
        self.assertEqual(set(candidate["profiles"][0]["zones"]), {"group.room"})
        candidate["zones"]["group.room"]["override"] = {"type": "boost"}
        candidate["preconditioning_learning"]["group.room"] = {"observations": [1]}
        split = remove_group_candidate(candidate, "group.room")
        self.assertEqual(set(split["profiles"][0]["zones"]), {"climate.a", "climate.b"})
        self.assertEqual(split["global_"]["zone_profile_overrides"], {"climate.a": "night", "climate.b": "night"})
        self.assertIsNone(split["zones"]["climate.a"]["override"])
        self.assertNotIn("group.room", split["preconditioning_learning"])
        self.assertEqual(split["settings"]["unit_order"], ["climate.a", "climate.b", "climate.other"])

    def test_shared_supply_conflict_rejected(self):
        self.data["settings"]["shared_demand_groups"] = [{"zones": {"climate.a": {"hysteresis": .2}, "climate.b": {"hysteresis": .3}}}]
        with self.assertRaisesRegex(ValueError, "overrides differ"):
            self.candidate()

    def test_reference_migration_clears_internal_dependency_and_remaps_return(self):
        self.data["zones"]["climate.a"]["preconditioning"]["master_entity_id"] = "climate.b"
        self.data["zones"]["climate.other"]["preconditioning"]["master_entity_id"] = "climate.a"
        self.data["planned_return_episode"] = {"previous_selection": {"zone_profile_overrides": {"climate.a": None}},
                                                "preparing_entities": ["climate.a", "climate.b"]}
        candidate = self.candidate()
        self.assertIsNone(candidate["zones"]["group.room"]["preconditioning"]["master_entity_id"])
        self.assertEqual(candidate["zones"]["climate.other"]["preconditioning"]["master_entity_id"], "group.room")
        self.assertEqual(candidate["planned_return_episode"]["previous_selection"]["zone_profile_overrides"], {"group.room": None})
        self.assertEqual(candidate["planned_return_episode"]["preparing_entities"], ["group.room"])

    def test_rename_retains_learning_membership_change_resets_it(self):
        candidate = self.candidate()
        candidate["preconditioning_learning"]["group.room"] = {"observations": [1]}
        rename, preview = build_group_candidate(candidate, self.physical, {**self.group, "name": "New"})
        self.assertFalse(preview["learning_reset"])
        self.assertIn("group.room", rename["preconditioning_learning"])
        reorder, preview = build_group_candidate(candidate, self.physical, {**self.group, "members": list(reversed(self.group["members"]))})
        self.assertFalse(preview["learning_reset"])
        self.assertIn("group.room", reorder["preconditioning_learning"])
        changed, preview = build_group_candidate(candidate, self.physical, {**self.group, "members": ["climate.a"]})
        self.assertTrue(preview["learning_reset"])
        self.assertNotIn("group.room", changed["preconditioning_learning"])
        self.assertIn("climate.b", changed["zones"])

    def test_portable_group_round_trip_and_unmanaged_import_rejection(self):
        from custom_components.velair import api
        candidate = self.candidate()
        entry = SimpleNamespace(options={}, data={})
        export_runtime = {"storage": SimpleNamespace(data=candidate), "entry": entry}
        payload = api._build_export_payload(export_runtime, ["zones"])
        self.assertEqual(payload["model_version"], 25)
        self.assertIn("room_groups", payload["sections"])
        storage = SimpleNamespace(data=self.data, _climate_entities=self.physical)
        imported = api._build_import_data({"storage": storage, "entry": entry}, payload, ["zones"])
        self.assertEqual(imported["room_groups"], candidate["room_groups"])
        self.assertEqual(set(imported["zones"]), {"group.room", "climate.other"})
        payload["sections"]["zones"]["group.room"]["preconditioning"]["room_temperature_entity_id"] = "sensor.different"
        payload["sections"]["zones"]["group.room"]["preconditioning"]["room_sensor_assist_enabled"] = True
        imported = api._build_import_data({"storage": storage, "entry": entry}, payload, ["zones"])
        self.assertEqual(imported["zones"]["group.room"]["preconditioning"]["room_temperature_entity_id"], "sensor.different")
        self.assertTrue(imported["zones"]["group.room"]["preconditioning"]["room_sensor_assist_enabled"])
        storage._climate_entities = ["climate.a"]
        with self.assertRaisesRegex(ValueError, "configured"):
            api._build_import_data({"storage": storage, "entry": entry}, payload, ["zones"])

    def test_empty_group_export_includes_dependencies_and_round_trips(self):
        from custom_components.velair import api
        runtime = {"storage": SimpleNamespace(data=self.data, _climate_entities=self.physical),
                   "entry": SimpleNamespace(options={}, data={})}
        payload = api._build_export_payload(runtime, ["room_groups"])
        self.assertEqual(payload["sections"]["room_groups"], {})
        self.assertTrue({"zones", "profiles"}.issubset(payload["sections"]))
        imported = api._build_import_data(runtime, payload, ["room_groups"])
        self.assertEqual(imported["room_groups"], {})
        self.assertEqual(set(imported["zones"]), set(self.physical))


class RoomGroupStorageTest(unittest.IsolatedAsyncioTestCase):
    async def test_partial_fahrenheit_group_uses_fahrenheit_defaults(self):
        from .test_temperature import make_storage
        from custom_components.velair.storage import RUNTIME_TEMPERATURE_FORMAT
        group = {"id": "group.room", "name": "Room", "members": ["climate.a", "climate.b"],
                 "temperature_entity_id": "sensor.room", "delivery_mode": "all"}
        storage = make_storage("°F", {"temperature_unit": "°F", "temperature_format": RUNTIME_TEMPERATURE_FORMAT,
                                      "room_groups": {"group.room": group}, "zones": {"group.room": {"schedule": {}}}})
        loaded = await storage.async_load(["climate.a", "climate.b"])
        self.assertEqual(set(loaded["zones"]), {"group.room"})
        self.assertGreater(loaded["zones"]["group.room"]["comfort"]["temperature_min"], 32)
        self.assertIsNone(loaded["zones"]["group.room"]["preconditioning"]["room_temperature_entity_id"])

