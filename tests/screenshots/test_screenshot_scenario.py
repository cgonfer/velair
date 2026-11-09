"""Household setup contracts independent from a Docker/HA installation."""

from copy import deepcopy
from datetime import UTC, datetime
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("website_screenshot_scenario", ROOT / "scripts/screenshots/scenario.py")
scenario = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(scenario)


def exported_payload():
    entities = [entity for entity, *_ in scenario.ROOMS if entity not in (scenario.ROOMS[0][0], scenario.ROOMS[3][0])]
    return {"format": "velair_portable_data", "model_version": 26, "temperature_unit": "°C", "sections": {
        "zones": {entity: {"enabled": True, "schedule": {}, "comfort": {"temperature_entity_id": None}, "preconditioning": {"fallback_minutes_per_degree": 15}}
                  for entity in [scenario.GROUP_ID, *entities, scenario.EXTERNAL_ENTITY]},
        "profiles": [], "modes": [], "templates": [], "block_presets": [], "preconditioning_learning": {},
    }}


class HouseholdPayloadTest(unittest.TestCase):
    def test_uses_real_export_schema_without_mutating_it_or_replacing_existing_defaults(self):
        original = exported_payload()
        baseline = deepcopy(original)
        populated = scenario.populate_payload(original, datetime(2026, 11, 9, 10, tzinfo=UTC))
        self.assertEqual(original, baseline)
        self.assertEqual(populated["model_version"], original["model_version"])
        self.assertEqual(populated["format"], original["format"])
        for zone in populated["sections"]["zones"].values():
            self.assertEqual(zone["comfort"], {"temperature_entity_id": None})
            self.assertEqual(zone["preconditioning"]["fallback_minutes_per_degree"], 15)

    def test_day_shapes_cover_heating_cooling_and_valid_native_ranges(self):
        for mode in ("heat", "cool", "heat_cool"):
            with self.subTest(mode=mode):
                blocks = scenario.schedule_blocks(mode)
                self.assertEqual([block["start"] for block in blocks], list(scenario.STARTS))
                self.assertEqual(len(blocks), 6)
                self.assertGreater(len({str(block) for block in blocks}), 1)
                for block in blocks:
                    self.assertEqual(block["hvac_mode"], mode)
                    if mode == "heat_cool":
                        self.assertNotIn("temperature", block)
                        self.assertLessEqual(block["target_temp_low"], block["target_temp_high"])
                    else:
                        self.assertNotIn("target_temp_low", block)
                        self.assertIsInstance(block["temperature"], (int, float))

    def test_presets_templates_profiles_and_group_are_real_portable_dependencies(self):
        sections = scenario.populate_payload(exported_payload())["sections"]
        presets = {item["key"] for item in sections["block_presets"]}
        group = sections["zones"][scenario.GROUP_ID]
        self.assertEqual(group["schedule"]["monday"][4]["preset_key"], "evening_comfort")
        for template in sections["templates"]:
            self.assertTrue(all(block["preset_key"] in presets for block in template["blocks"]))
        self.assertEqual({item["key"] for item in sections["profiles"]}, {"workday", "weekend", "away", "home"})
        self.assertEqual({tuple(item["profile_ids"]) for item in sections["modes"]}, {("workday",), ("weekend",), ("away",), ("home",)})
        self.assertEqual(len({item["icon"] for item in sections["profiles"]}), 4)
        for profile in sections["profiles"]:
            self.assertEqual(set(profile["zones"]), set(sections["zones"]))

    def test_learning_is_past_complete_consistent_and_bound_to_the_selected_climate(self):
        now = datetime(2026, 11, 9, 10, tzinfo=UTC)
        learning = scenario.learning_observations("climate.nursery", now)
        self.assertEqual(learning["cool"]["observations"], [])
        samples = learning["heat"]["observations"]
        self.assertEqual(len(samples), 8)
        self.assertEqual([sample["created_at"] for sample in samples], sorted(sample["created_at"] for sample in samples))
        for sample in samples:
            self.assertEqual(sample["entity_id"], "climate.nursery")
            self.assertEqual(sample["temperature_source_entity_id"], "climate.nursery")
            self.assertEqual(sample["quality"], "complete")
            self.assertTrue(sample["reached"])
            self.assertAlmostEqual(sample["target_temp"] - sample["initial_temp"], sample["delta_t"])
            scheduled, started = (datetime.fromisoformat(sample[key]) for key in ("scheduled_time", "start_time"))
            self.assertLess(scheduled, now)
            self.assertEqual((scheduled - started).total_seconds() / 60, sample["minutes_to_reach"])

    def test_nursery_upcoming_transition_is_real_in_default_and_active_profile(self):
        for hour, minute, expected in ((10, 30, "12:00"), (21, 30, "22:00"), (23, 30, "00:00")):
            with self.subTest(hour=hour):
                now = datetime(2026, 11, 9, hour, minute, tzinfo=UTC)
                sections = scenario.populate_payload(exported_payload(), now)["sections"]
                entity = scenario.ROOMS[6][0]
                default = sections["zones"][entity]
                profile = sections["profiles"][0]["zones"][entity]
                self.assertFalse(default["preconditioning"]["use_outdoor_temperature"])
                self.assertEqual(default["schedule"], profile["schedule"])
                comfort = [block for block in default["schedule"]["monday"] if block["temperature"] == 21.5]
                self.assertEqual([block["start"] for block in comfort], [expected])

    def test_office_readings_track_each_active_cooling_period_including_midday(self):
        periods = ((0, 0, 26), (5, 59, 26), (6, 0, 24), (8, 29, 24), (8, 30, 27),
                   (11, 59, 27), (12, 0, 25), (16, 59, 25), (17, 0, 23.5),
                   (21, 59, 23.5), (22, 0, 26), (23, 59, 26))
        for hour, minute, target in periods:
            with self.subTest(hour=hour, minute=minute):
                readings = scenario.office_readings(datetime(2026, 11, 9, hour, minute, tzinfo=UTC))
                self.assertEqual(readings["scheduled_target"], target)
                self.assertEqual(readings["climate_temperature"], target + 2.0)
                self.assertEqual(readings["room_temperature"], target + 3.5)
                self.assertGreater(readings["room_temperature"] - readings["climate_temperature"], 0.3)
                self.assertGreater(readings["room_temperature"] - readings["scheduled_target"], 0.3)

    def test_mixed_bedroom_day_uses_only_range_device_capabilities(self):
        sections = scenario.populate_payload(exported_payload())["sections"]
        blocks = sections["zones"][scenario.ROOMS[2][0]]["schedule"]["monday"]
        self.assertEqual(blocks, sections["profiles"][0]["zones"][scenario.ROOMS[2][0]]["schedule"]["monday"])
        self.assertTrue(any(block.get("action") == "turn_off" for block in blocks))
        temperature_only = next(block for block in blocks if block.get("temperature_only"))
        self.assertNotIn("hvac_mode", temperature_only)
        self.assertNotIn("temperature", temperature_only)
        self.assertLess(temperature_only["target_temp_low"], temperature_only["target_temp_high"])
        self.assertTrue(any(block.get("preset_key") == "bedroom_comfort" for block in blocks))
        presets = {preset["key"]: preset["config"] for preset in sections["block_presets"]}
        self.assertEqual(presets["rest"]["action"], "turn_off")
        self.assertTrue(presets["temperature_only"]["temperature_only"])
        self.assertEqual(presets["summer_cooling"]["hvac_mode"], "cool")

    def test_comfort_configuration_and_long_pause_have_real_inputs(self):
        office = scenario.comfort_configuration(scenario.ROOMS[1][0])
        self.assertTrue(office["enabled"])
        self.assertEqual(office["temperature_entity_id"], "sensor.quality_temperature_02")
        self.assertTrue(office["humidity_enabled"])
        self.assertEqual(office["humidity_entity_id"], "sensor.quality_humidity_01")
        self.assertLess(office["temperature_min"], office["temperature_max"])
        self.assertLess(office["humidity_min"], office["humidity_max"])
        self.assertIsNone(scenario.comfort_configuration(scenario.ROOMS[0][0])["temperature_entity_id"])
        self.assertGreaterEqual(scenario.PAUSE_MINUTES, 240)

    def test_return_routine_references_existing_away_and_home_modes(self):
        sections = scenario.populate_payload(exported_payload())["sections"]
        config = scenario.planned_return_configuration()
        self.assertTrue(config["enabled"])
        self.assertEqual(config["occupancy_entity_ids"], ["binary_sensor.quality_occupancy"])
        modes = {mode["key"] for mode in sections["modes"]}
        self.assertIn(config["away_mode_id"], modes)
        self.assertIn(config["destination_mode_id"], modes)
        self.assertEqual(config["away_mode_id"], "away")
        self.assertEqual(config["destination_mode_id"], "home")
        self.assertEqual(set(config["weekly"]), set(scenario.ha.WEEKDAYS))
        home = next(profile for profile in sections["profiles"] if profile["key"] == "home")
        nursery = scenario.ROOMS[6][0]
        for blocks in home["zones"][nursery]["schedule"].values():
            self.assertEqual(blocks[0]["temperature"], 21.5)


class HouseholdBoundaryTest(unittest.TestCase):
    def test_runtime_activation_restores_overrides_and_waits_for_fresh_publication(self):
        states = iter((None, "publishing", "published"))
        readiness = []

        def websocket(_state, messages):
            if messages[0]["type"] != "velair/get_schedule":
                return [{}]
            status = next(states)
            return [{"external_execution": {"zones": {scenario.EXTERNAL_ENTITY: {
                "publication": {"state": status} if status else None,
            }}}}]

        def wait(predicate, *_args):
            for _ in range(3):
                readiness.append(predicate())

        with patch.object(scenario.ha, "validate_owned_directory"), \
             patch.object(scenario.ha, "request") as request, \
             patch.object(scenario.ha, "websocket", side_effect=websocket) as api, \
             patch.object(scenario.ha, "wait_for", side_effect=wait):
            scenario.activate_household_runtime({})
        self.assertEqual(readiness, [False, False, True])
        self.assertEqual([call.args[2] for call in request.call_args_list], [
            "/api/services/velair/resume", "/api/services/velair/boost", "/api/services/velair/pause_zone",
        ])
        self.assertEqual(request.call_args_list[1].args[3], {
            "entity_id": scenario.ROOMS[5][0], "duration_minutes": 90,
            "target_temp_low": 20.0, "target_temp_high": 24.0, "hvac_mode": "heat_cool",
        })
        self.assertEqual(request.call_args_list[2].args[3]["duration_minutes"], scenario.PAUSE_MINUTES)
        self.assertEqual([call.args[1][0] for call in api.call_args_list[:2]], [
            {"type": "velair/set_zone_profile", "entity_id": scenario.ROOMS[5][0], "profile_id": "weekend"},
            {"type": "velair/set_zone_execution", "entity_id": scenario.EXTERNAL_ENTITY, "provider": "ramses_cc"},
        ])

    def test_fixture_installation_requires_owned_configuration_and_never_overwrites_integration(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-") as temporary:
            directory = Path(temporary)
            with self.assertRaises(scenario.ha.HarnessError):
                scenario.prepare_fixture(directory)
            (directory / scenario.ha.MARKER).write_text('{"run_id": "0123456789abcdef0123456789abcdef"}', encoding="utf8")
            scenario.prepare_fixture(directory)
            manifest = directory / "custom_components/ramses_cc/manifest.json"
            self.assertTrue(manifest.is_file())
            for filename in ("manifest.json", "climate.py", "config_flow.py", "transport.py"):
                self.assertEqual((manifest.parent / filename).read_bytes(),
                                 (ROOT / "scripts/screenshots/fixtures/ha_components/ramses_cc" / filename).read_bytes())
            self.assertNotIn("custom_components/velair", str(manifest))
            with self.assertRaises(scenario.ha.HarnessError):
                scenario.prepare_fixture(directory)

    def test_seed_rejects_unowned_or_wrong_size_environment_before_any_requests(self):
        with patch.object(scenario.ha, "validate_owned_directory", side_effect=scenario.ha.HarnessError("not owned")), \
             patch.object(scenario.ha, "request") as request:
            with self.assertRaises(scenario.ha.HarnessError):
                scenario.seed({})
            request.assert_not_called()
        with patch.object(scenario.ha, "validate_owned_directory"), patch.object(scenario.ha, "request") as request:
            with self.assertRaises(scenario.ha.HarnessError):
                scenario.seed({"size": "small", "climate_entities": []})
            request.assert_not_called()

    def test_mutation_reads_current_revision_before_revision_sensitive_public_api(self):
        with patch.object(scenario.ha, "websocket", return_value=[{"configuration_revision": 8}, {"configuration_revision": 9}]) as websocket:
            self.assertEqual(scenario._mutate({}, {"type": "velair/set_room_group", "group": {}}), {"configuration_revision": 9})
        self.assertEqual(websocket.call_args.args[1], [
            {"type": "velair/get_schedule"}, {"type": "velair/set_room_group", "group": {}, "_revision": True},
        ])

    def test_return_phase_uses_public_services_and_commands_without_fabricating_status(self):
        clock = {"now": "2026-11-09T19:12:45+01:00"}
        with patch.object(scenario.ha, "validate_owned_directory"), \
             patch.object(scenario.ha, "request", side_effect=[{}, clock]) as request, \
             patch.object(scenario.ha, "websocket", return_value=[{}]) as websocket, \
             patch.object(scenario.ha, "wait_for") as wait_for:
            result = scenario.prepare_planned_return({}, {"scenario": "Example"})
        self.assertEqual(result["scenario"], "Example")
        self.assertEqual(result["arrival_at"], "2026-11-09T19:42:00+01:00")
        self.assertEqual(request.call_args_list[0].args[2], "/api/services/velair_test/control")
        self.assertEqual(request.call_args_list[0].args[3]["state"], "off")
        messages = websocket.call_args.args[1]
        self.assertEqual([message["type"] for message in messages], [
            "velair/set_zone_execution", "velair/update_planned_return", "velair/start_planned_return",
        ])
        self.assertEqual(messages[0], {"type": "velair/set_zone_execution", "entity_id": scenario.EXTERNAL_ENTITY, "provider": None})
        self.assertEqual(result["planned_return_local_execution_entities"], [scenario.EXTERNAL_ENTITY])
        self.assertEqual(messages[-1]["return_at"], result["arrival_at"])
        self.assertTrue(messages[-1]["apply_away_now"])
        self.assertEqual(wait_for.call_args.args[1], "real planned-return preparation")


if __name__ == "__main__":
    unittest.main()
