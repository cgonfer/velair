"""Real documentation setup uses public services and native backend decisions."""

import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/screenshots"))
import documentation_scenario as docs

SPEC = importlib.util.spec_from_file_location("screenshot_transport", ROOT / "scripts/screenshots/fixtures/ha_components/ramses_cc/transport.py")
transport = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(transport)


class DocumentationSetupTest(unittest.TestCase):
    def test_unknown_phase_or_unowned_instance_is_rejected_before_api_calls(self):
        with patch.object(docs.ha, "request") as request:
            with self.assertRaises(ValueError):
                docs.prepare_documentation_phase({}, {}, "invented")
            request.assert_not_called()
        with patch.object(docs.ha, "validate_owned_directory", side_effect=docs.ha.HarnessError("unowned")), \
             patch.object(docs.ha, "request") as request:
            with self.assertRaises(docs.ha.HarnessError):
                docs.prepare_documentation_phase({}, {}, "household")
            request.assert_not_called()

    def test_holding_uses_all_day_profile_exception_without_altering_varied_schedules(self):
        bedroom = docs.ROOMS[2][0]
        schedule = {"profiles": [{"key": "home", "zones": {bedroom: {"schedule": {"monday": [{"start": "06:00"}]}}}}]}
        original = deepcopy(schedule)
        rich = {"scenario": "Example", "card_entity": docs.GARDEN_ENTITY,
                "card_configuration": docs.rich_configuration(datetime.now(timezone.utc))["card"]}
        with patch.object(docs.ha, "validate_owned_directory"), patch.object(docs, "_schedule", return_value=schedule), \
             patch.object(docs, "_prepare_rich_household", return_value=rich), \
             patch.object(docs, "activate_household_runtime") as activate, \
             patch.object(docs, "_mutate") as mutate, patch.object(docs.ha, "request"), \
             patch.object(docs.ha, "websocket") as websocket, patch.object(docs.ha, "wait_for"):
            activate.side_effect = lambda _state: self.assertEqual(
                websocket.call_args.args[1][0]["type"], "lovelace/config/save")
            metadata = docs.prepare_documentation_phase({}, {"scenario": "Example"}, "household")
        self.assertEqual(schedule, original)
        profile = mutate.call_args_list[0].args[1]["profile"]
        self.assertEqual([call.args[1]["type"] for call in mutate.call_args_list], ["velair/set_profile"],
                         "A native heat_cool fixture must not receive fixed heat/cool boundary references")
        self.assertEqual(set(profile["zones"][bedroom]["schedule"]), set(docs.ha.WEEKDAYS))
        for blocks in profile["zones"][bedroom]["schedule"].values():
            self.assertEqual(blocks, [{"start": "00:00", "action": "set_temperature", "hvac_mode": "heat_cool",
                                       "target_temp_low": 20, "target_temp_high": 24}])
        self.assertEqual(metadata["holding_name"], "Main Bedroom")
        self.assertEqual(metadata["profile_key"], "workday")
        self.assertEqual(metadata["dashboard_path"], "/velair-screenshots/climate")
        messages = [call.args[1][0] for call in websocket.call_args_list][-2:]
        self.assertEqual([row["type"] for row in messages], ["lovelace/dashboards/create", "lovelace/config/save"])
        card = messages[1]["config"]["views"][0]["cards"][0]
        self.assertEqual(card["type"], "custom:velair-card")
        self.assertEqual(card["selected_entity"], metadata["card_entity"])
        self.assertEqual(messages[1]["config"]["views"][0]["type"], "panel")
        activate.assert_called_once_with({})

    def test_rich_comfort_and_card_resolve_real_fixture_measurements(self):
        config = docs.rich_configuration(datetime(2026, 11, 9, 12, tzinfo=timezone.utc))
        sensors = {row["entity_id"]: row for row in docs.SHOWCASE_ENTITIES["sensor"]}
        comfort, card = config["comfort"], config["card"]
        self.assertEqual(comfort["comfort_model"], "guided")
        self.assertEqual(sensors[comfort["temperature_entity_id"]]["value"], 23.4)
        self.assertEqual(sensors[comfort["humidity_entity_id"]]["value"], 48)
        self.assertEqual(sensors[comfort["co2_entity_id"]]["value"], 642)
        self.assertEqual(sensors[card["climate_outdoor_temperature_entity"]]["value"], 29.1)
        self.assertEqual(set(comfort["derived_metrics"]), {"humidex", "dew_point", "absolute_humidity"})
        self.assertTrue(all(row["enabled"] and row["source"] == "velair" for row in comfort["derived_metrics"].values()))
        windows = {row["entity_id"]: row for row in docs.SHOWCASE_ENTITIES["binary_sensor"]}
        self.assertEqual({windows[key]["value"] for key in card["climate_window_entities"]}, {False, True})
        self.assertFalse(card["climate_current_state_default_collapsed"])
        self.assertTrue(card["climate_show_comfort_humidex"])

    def test_cooling_transition_is_future_and_current_target_stays_constant_across_midnight(self):
        for weekday in range(7):
            for hour in range(24):
                for minute in (0, 1, 58):
                    now = datetime(2026, 11, 9 + weekday, hour, minute, 47, tzinfo=timezone.utc)
                    with self.subTest(now=now):
                        config = docs.rich_configuration(now)
                        events = []
                        for offset in range(-1, 2):
                            day = now.replace(hour=0, minute=0, second=0) + timedelta(days=offset)
                            for block in config["schedule"][day.strftime("%A").lower()]:
                                h, m = map(int, block["start"].split(":"))
                                events.append((day.replace(hour=h, minute=m), block))
                        current = max((row for row in events if row[0] <= now), key=lambda row: row[0])[1]
                        self.assertEqual(current.get("temperature"), 23)
                        future = min((row for row in events if row[0] > now), key=lambda row: row[0])
                        self.assertEqual(future[1].get("temperature"), 22)
                        self.assertGreater((future[0] - now).total_seconds(), 114 * 60)
                        self.assertLessEqual((future[0] - now).total_seconds(), 120 * 60)
                        following = min((row for row in events if row[0] > future[0]), key=lambda row: row[0])
                        self.assertEqual(following[0] - future[0], timedelta(minutes=90))
                        self.assertEqual(following[1].get("temperature"), 23)
                        blocks = [block for day in config["schedule"].values() for block in day]
                        self.assertTrue(any(block["action"] == "turn_off" for block in blocks))
                        self.assertEqual({block["temperature"] for block in blocks if "temperature" in block}, {22, 23, 25})
                        self.assertTrue(all(len(day) >= 4 for day in config["schedule"].values()))
                        samples = config["learning"]["cool"]["observations"]
                        self.assertEqual(len(samples), 8)
                        self.assertTrue(all(row["reached"] and row["mode"] == "cool" and row["temperature_source"] == "room_sensor" for row in samples))

    def test_native_fixture_is_documentation_only_and_rejects_existing_devices(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "configuration.yaml").write_text("default_config:\n", encoding="utf-8")
            with patch.object(docs, "prepare_fixture") as base:
                docs.prepare_documentation_fixture(root)
                base.assert_called_once_with(root.resolve())
                self.assertTrue((root / "custom_components/velair_showcase/climate.py").is_file())
                for filename in ("manifest.json", "climate.py", "sensor.py", "binary_sensor.py", "entities.json"):
                    self.assertEqual((root / "custom_components/velair_showcase" / filename).read_bytes(),
                                     (docs.SHOWCASE / filename).read_bytes())
                self.assertEqual((root / "configuration.yaml").read_text(encoding="utf-8"), "default_config:\n\nvelair_showcase: {}\n")
                with self.assertRaisesRegex(docs.ha.HarnessError, "Refusing to replace"):
                    docs.prepare_documentation_fixture(root)

    def test_rich_setup_preserves_other_rooms_and_imported_heating_learning(self):
        existing = {"existing_heat": {"heat": {"observations": [{"target_temp": 21}]}}}
        exported = {"sections": {"preconditioning_learning": deepcopy(existing)}}
        profiles = [{"key": key, "zones": {"existing_heat": {"schedule": {}}}}
                    for key in docs.PROFILE_DESCRIPTIONS]
        original = deepcopy(profiles)
        def commands(_state, messages):
            return [exported] if messages[0]["type"] == "velair/export_data" else [None]
        with patch.object(docs, "_configure_selected_entities") as select, \
             patch.object(docs, "_schedule", return_value={"profiles": profiles}), \
             patch.object(docs, "_commands", side_effect=commands) as api, \
             patch.object(docs, "_mutation") as mutate, patch.object(docs.ha, "wait_for"), \
             patch.object(docs.ha, "request", return_value={"now": "2026-11-09T23:50:00+00:00"}) as request:
            result = docs._prepare_rich_household({}, {"climate_entities": ["existing_heat"]})
        select.assert_called_once_with({}, ["existing_heat", docs.GARDEN_ENTITY])
        self.assertEqual(profiles, original)
        self.assertEqual(exported["sections"]["preconditioning_learning"]["existing_heat"], existing["existing_heat"])
        self.assertIn(docs.GARDEN_ENTITY, exported["sections"]["preconditioning_learning"])
        self.assertEqual(len(mutate.call_args_list), 4)
        for call in mutate.call_args_list:
            profile = call.args[1]["profile"]
            self.assertTrue(profile["description"])
            self.assertEqual(profile["zones"]["existing_heat"], {"schedule": {}})
        self.assertIn("velair/import_data", [call.args[1][0]["type"] for call in api.call_args_list])
        self.assertEqual(result["comfort_name"], result["card_name"])
        self.assertFalse(any(call.args[1] == "POST" and call.args[2].startswith("/api/states/") for call in request.call_args_list))

    def test_command_failure_names_only_the_failed_public_step(self):
        with patch.object(docs.ha, "websocket", side_effect=docs.ha.HarnessError("sensitive payload")):
            with self.assertRaisesRegex(docs.ha.HarnessError, "Documentation command velair/update_zone_preconditioning failed") as raised:
                docs._commands({}, [{"type": "velair/update_zone_preconditioning", "private": "do not print"}])
        self.assertNotIn("sensitive", str(raised.exception))
        self.assertNotIn("private", str(raised.exception))

    def test_external_status_is_read_from_actual_adapter_publication(self):
        payload = {"external_execution": {"zones": {docs.EXTERNAL_ENTITY: {"publication": {"state": "publishing"}}}}}
        with patch.object(docs, "_schedule", return_value=payload):
            self.assertEqual(docs._publication({}), "publishing")

    def test_publishing_uses_async_public_command_without_serializing_thread_or_fake_status(self):
        class CompletedThread:
            def __init__(self, *, target, **_kwargs):
                self.target = target

            def start(self):
                self.target()

            def join(self, **_kwargs):
                pass

            def is_alive(self):
                return False

        state = {"run_id": "test"}
        with patch.dict(docs._PUBLICATIONS, {}, clear=True), patch.object(docs.ha, "validate_owned_directory"), \
             patch.object(docs, "_transport") as control, patch.object(docs, "Thread", CompletedThread), \
             patch.object(docs.ha, "websocket") as websocket, patch.object(docs.ha, "wait_for"):
            result = docs.prepare_documentation_phase(state, {"scenario": "Example"}, "external-publishing")
            self.assertEqual(result, {"scenario": "Example", "documentation_phase": "external-publishing"})
            self.assertIn("test", docs._PUBLICATIONS)
            websocket.assert_called_once_with(state, [{"type": "velair/set_zone_execution",
                                                       "entity_id": docs.EXTERNAL_ENTITY, "provider": "ramses_cc"}])
            control.assert_called_once_with(state, hold=True, fail=False)
            docs.cleanup_documentation(state)
            self.assertNotIn("test", docs._PUBLICATIONS)

    def test_failed_publication_releases_real_transport_before_waiting_for_adapter(self):
        with patch.object(docs.ha, "validate_owned_directory"), patch.object(docs, "_transport") as control, \
             patch.object(docs, "_join_publication") as join, patch.object(docs.ha, "wait_for") as wait:
            result = docs.prepare_documentation_phase({"run_id": "test"}, {"scenario": "Example"}, "external-error")
        control.assert_called_once_with({"run_id": "test"}, hold=False, fail=True)
        join.assert_called_once()
        self.assertEqual(wait.call_args.args[1], "real rejected controller publication")
        self.assertEqual(result, {"scenario": "Example", "documentation_phase": "external-error"})

    def test_diagnostics_uses_real_entity_availability_and_native_unit_issues(self):
        kitchen = docs.ROOMS[7][0]
        status = {"units": {kitchen: {"issues": [{"code": "entity_unavailable"}]}}}
        with patch.object(docs.ha, "validate_owned_directory"), \
             patch.object(docs.ha, "request", return_value={"state": "unavailable"}) as request, \
             patch.object(docs.ha, "websocket", return_value=[status]), \
             patch.object(docs.ha, "wait_for", side_effect=lambda operation, *_: operation()):
            docs.prepare_documentation_phase({}, {}, "diagnostics-errors")
        self.assertEqual(request.call_args_list[0].args[2:], (
            "/api/services/velair_test/control", {"entity_id": kitchen, "available": False},
        ))

    def test_cleanup_releases_pending_transport_without_replacing_runtime_state(self):
        with patch.dict(docs._PUBLICATIONS, {"test": (None, {})}), \
             patch.object(docs.ha, "validate_owned_directory"), \
             patch.object(docs, "_transport") as control, patch.object(docs, "_join_publication") as join:
            docs.cleanup_documentation({"run_id": "test"})
        control.assert_called_once_with({"run_id": "test"}, hold=False, fail=False)
        join.assert_called_once_with({"run_id": "test"})

    def test_final_return_restores_prior_error_fixtures_before_starting_real_arrival(self):
        state = {"run_id": "test"}
        metadata = {"scenario": "Example", "profile_name": "Workday"}
        events = []

        def request(_state, method, path, *args):
            if method == "POST":
                events.append(("restore", path, args[0]))
                return None
            events.append(("available", path))
            return {"state": "cool"}

        def arrival(_state, original):
            self.assertIs(original, metadata)
            self.assertEqual([event[0] for event in events], ["restore", "available", "release", "join"])
            return {**original, "arrival_at": "2026-11-09T20:00:00+01:00", "planned_return_destination": "Home"}

        with patch.object(docs.ha, "validate_owned_directory"), patch.object(docs.ha, "request", side_effect=request), \
             patch.object(docs.ha, "wait_for", side_effect=lambda check, *_: self.assertTrue(check())), \
             patch.object(docs, "_transport", side_effect=lambda *_args, **_kwargs: events.append(("release",))) as transport_control, \
             patch.object(docs, "_join_publication", side_effect=lambda _state: events.append(("join",))), \
             patch.object(docs, "prepare_planned_return", side_effect=arrival) as prepare:
            result = docs.prepare_documentation_phase(state, metadata, "return")

        self.assertEqual(events[0], ("restore", "/api/services/velair_test/control",
                                    {"entity_id": docs.ROOMS[7][0], "available": True}))
        transport_control.assert_called_once_with(state, hold=False, fail=False)
        prepare.assert_called_once_with(state, metadata)
        self.assertEqual(result["documentation_phase"], "return")
        self.assertEqual(result["planned_return_destination"], "Home")
        self.assertEqual(metadata, {"scenario": "Example", "profile_name": "Workday"})


class TransportTest(unittest.IsolatedAsyncioTestCase):
    async def test_default_transport_keeps_existing_website_acceptance_immediate(self):
        await transport.PublicationTransport().deliver()

    async def test_hold_and_release_control_service_completion_not_velair_status(self):
        connection = transport.PublicationTransport()
        connection.configure(hold=True)
        task = asyncio.create_task(connection.deliver())
        await asyncio.sleep(0)
        self.assertFalse(task.done())
        connection.configure(hold=False)
        await asyncio.wait_for(task, 1)

    async def test_rejection_is_a_real_transport_failure_after_release(self):
        connection = transport.PublicationTransport()
        connection.configure(hold=True)
        task = asyncio.create_task(connection.deliver())
        await asyncio.sleep(0)
        connection.configure(hold=False, fail=True)
        with self.assertRaisesRegex(RuntimeError, "rejected"):
            await asyncio.wait_for(task, 1)


if __name__ == "__main__":
    unittest.main()
