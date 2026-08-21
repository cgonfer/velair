"""Runtime diagnostics tests."""
from __future__ import annotations
import importlib
import asyncio
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
from . import helpers  # noqa: F401

sys.modules["homeassistant.core"].Event = object
diagnostics_module = importlib.import_module("custom_components.velair.runtime_diagnostics")
api_module = importlib.import_module("custom_components.velair.api")


class _PolicyStore:
    def __init__(self, loaded=None, *, load_error=False, save_error=False) -> None:
        self.loaded = loaded
        self.load_error = load_error
        self.save_error = save_error
        self.saved = None

    async def async_load(self):
        if self.load_error:
            raise RuntimeError("corrupt")
        return self.loaded

    async def async_save(self, value):
        if self.save_error:
            raise RuntimeError("write failed")
        self.saved = value


class RuntimeDiagnosticsTest(unittest.TestCase):
    def setUp(self) -> None:
        climate = SimpleNamespace(
            state="heat_cool",
            attributes={
                "hvac_modes": ["heat", "cool", "heat_cool", "off"],
                "min_temp": 7.0,
                "max_temp": 35.0,
                "target_temp_step": 0.5,
            },
        )
        room = SimpleNamespace(state="21.5", attributes={})
        self.hass = SimpleNamespace(
            states={"climate.living_room": climate, "sensor.private_room": room},
            loop=SimpleNamespace(call_soon=lambda callback: callback()),
            bus=SimpleNamespace(
                async_fire=Mock(),
                async_listen=lambda *_args: (lambda: None),
            ),
        )
        self.manager = diagnostics_module.RuntimeDiagnosticsManager(
            self.hass, ["climate.living_room"]
        )
        scheduler = SimpleNamespace(
            temperature_migration_blocked=False,
            mode="auto",
            get_operational_status=lambda: "scheduled",
            get_room_sensor_assist_statuses=lambda: {
                "climate.living_room": {"status": "ready"}
            },
            get_comfort_assessments=lambda: {
                "climate.living_room": {"condition": "comfortable"}
            },
            get_zone_runtime_statuses=lambda: {
                "climate.living_room": {
                    "state": "scheduled",
                    "hvac_mode": "heat_cool",
                }
            },
        )
        data = {
            "global_": {
                "mode": "auto",
                "active_mode_id": "home",
                "active_profile_ids": ["weekday"],
            },
            "profiles": [
                {
                    "key": "weekday",
                    "name": "Weekday",
                    "zones": {
                        "climate.living_room": {
                            "behavior": "schedule",
                            "schedule": {},
                        }
                    },
                }
            ],
            "modes": [
                {
                    "key": "home",
                    "name": "Home",
                    "profile_ids": ["weekday"],
                }
            ],
            "zones": {
                "climate.living_room": {
                    "enabled": True,
                    "schedule": {},
                    "preconditioning": {
                        "room_temperature_entity_id": "sensor.private_room"
                    },
                    "comfort": {},
                    "pauses": [
                        {
                            "pause_id": "private-pause",
                            "started_at": "2026-08-17T22:10:12.345678+00:00",
                        }
                    ],
                }
            },
        }
        self.runtime = {
            "scheduler": scheduler,
            "storage": SimpleNamespace(
                data=data,
                temperature_migration_required=False,
            ),
            "operation_recovery": None,
        }

    def test_snapshot_includes_heat_cool_runtime_evidence(self) -> None:
        unit = self.manager.snapshot(self.runtime)["units"]["climate.living_room"]
        self.assertIn("heat_cool", unit["capabilities"]["hvac_modes"])
        self.assertEqual("heat_cool", unit["intent"]["hvac_mode"])
        self.assertEqual("sensor.private_room", unit["sensors"][0]["entity_id"])
        self.assertEqual("weekday", unit["effective_setup"]["profile_owner_id"])
        self.assertEqual("profile", unit["effective_setup"]["schedule_source"])

    def test_active_issues_centralizes_global_and_unit_evidence(self) -> None:
        self.runtime["operation_recovery"] = {"operation": "import"}
        self.hass.states["climate.living_room"].state = "unavailable"

        issues = self.manager.active_issues(self.runtime)

        self.assertIn(
            {"severity": "error", "code": "operation_recovery_required"},
            issues,
        )
        self.assertIn(
            {
                "entity_id": "climate.living_room",
                "severity": "warning",
                "code": "entity_unavailable",
            },
            issues,
        )

    def test_automation_summary_is_compact_and_contains_no_raw_errors(self) -> None:
        self.manager.async_start(self.runtime)
        self.manager.async_finish_startup()
        self.manager.observe_delivery(
            "climate.living_room",
            "exhausted",
            {"message": "secret device failure"},
        )

        summary = self.manager.automation_summary()

        self.assertEqual("error", summary["status"])
        self.assertEqual("auto", summary["scheduler_mode"])
        self.assertEqual("scheduled", summary["scheduler_status"])
        self.assertEqual(1, summary["unit_counts"]["error"])
        self.assertEqual(["delivery_exhausted"], summary["issue_codes"])
        self.assertNotIn("secret device failure", str(summary))

    def test_issue_events_use_startup_baseline_dedupe_and_resolution(self) -> None:
        self.hass.states["climate.living_room"].state = "unavailable"
        self.manager.async_start(self.runtime)
        self.manager.async_finish_startup()
        self.hass.bus.async_fire.assert_not_called()

        self.hass.states["climate.living_room"].state = "heat_cool"
        self.manager._handle_climate_state_change(
            SimpleNamespace(
                data={
                    "entity_id": "climate.living_room",
                    "old_state": SimpleNamespace(state="unavailable"),
                    "new_state": SimpleNamespace(state="heat_cool"),
                }
            )
        )
        self.manager.observe_delivery(
            "climate.living_room", "exhausted", {"message": "private"}
        )
        self.manager.observe_delivery(
            "climate.living_room", "exhausted", {"message": "private again"}
        )
        self.manager.observe_delivery("climate.living_room", "success")

        payloads = [call.args[1] for call in self.hass.bus.async_fire.call_args_list]
        self.assertEqual(
            ["resolved", "detected", "resolved"],
            [payload["change"] for payload in payloads],
        )
        self.assertEqual("entity_unavailable", payloads[0]["code"])
        self.assertEqual("delivery_exhausted", payloads[1]["code"])
        self.assertEqual("error", payloads[1]["severity"])
        self.assertEqual("climate.living_room", payloads[1]["entity_id"])
        self.assertNotIn("message", payloads[1])
        self.assertNotIn("private", str(payloads))

    def test_second_issue_is_detected_while_overall_remains_error(self) -> None:
        self.manager.async_start(self.runtime)
        self.manager.async_finish_startup()
        self.manager.observe_delivery("climate.living_room", "exhausted")
        self.assertEqual("error", self.manager.automation_summary()["status"])

        old_state = self.hass.states.pop("climate.living_room")
        self.manager._handle_climate_state_change(
            SimpleNamespace(
                data={
                    "entity_id": "climate.living_room",
                    "old_state": old_state,
                    "new_state": None,
                }
            )
        )

        payloads = [call.args[1] for call in self.hass.bus.async_fire.call_args_list]
        self.assertEqual("error", self.manager.automation_summary()["status"])
        self.assertEqual(
            ["delivery_exhausted", "entity_missing"],
            [payload["code"] for payload in payloads],
        )
        self.assertTrue(all(payload["change"] == "detected" for payload in payloads))

    def test_operation_recovery_reaches_diagnostic_issue_event(self) -> None:
        self.runtime["diagnostics"] = self.manager
        self.runtime["scheduler"].set_temperature_migration_blocked = Mock()
        self.runtime["operation_active"] = "data_reset"
        self.manager.async_start(self.runtime)
        self.manager.async_finish_startup()

        api_module._mark_operation_recovery(
            self.runtime,
            "data_reset",
            RuntimeError("private recovery details"),
        )

        payload = self.hass.bus.async_fire.call_args.args[1]
        self.assertEqual("diagnostic_issue_changed", payload["event"])
        self.assertEqual("detected", payload["change"])
        self.assertEqual("error", payload["severity"])
        self.assertEqual("operation_recovery_required", payload["code"])
        self.assertNotIn("private recovery details", str(payload))

    def test_diagnostic_issue_event_does_not_echo_into_history(self) -> None:
        before = list(self.manager.snapshot(self.runtime)["history"])
        self.manager._handle_event(
            SimpleNamespace(
                data={
                    "domain": "velair",
                    "event": "diagnostic_issue_changed",
                    "change": "detected",
                    "severity": "warning",
                    "code": "entity_unavailable",
                    "entity_id": "climate.living_room",
                }
            )
        )
        self.assertEqual(before, self.manager.snapshot(self.runtime)["history"])

    def test_associated_sensor_issue_event_keeps_purpose_not_sensor_id(self) -> None:
        self.manager.async_start(self.runtime)
        self.manager.async_finish_startup()
        preconditioning = self.runtime["storage"].data["zones"][
            "climate.living_room"
        ]["preconditioning"]
        preconditioning["enabled"] = True
        self.hass.states["sensor.private_room"].state = "unavailable"

        self.manager._handle_scheduler_update()

        payload = self.hass.bus.async_fire.call_args.args[1]
        self.assertEqual("diagnostic_issue_changed", payload["event"])
        self.assertEqual("associated_sensor_unavailable", payload["code"])
        self.assertEqual("room_temperature", payload["purpose"])
        self.assertEqual("climate.living_room", payload["entity_id"])
        self.assertNotIn("sensor.private_room", str(payload))

    def test_direct_active_sensor_changes_emit_detected_and_resolved(self) -> None:
        zone = self.runtime["storage"].data["zones"]["climate.living_room"]
        zone["preconditioning"].update(
            {
                "enabled": True,
                "use_outdoor_temperature": True,
                "outdoor_temperature_entity_id": "sensor.outdoor",
            }
        )
        zone["comfort"] = {
            "enabled": True,
            "temperature_entity_id": "sensor.comfort_temperature",
            "humidity_enabled": True,
            "humidity_entity_id": "sensor.comfort_humidity",
            "co2_entity_id": "sensor.comfort_co2",
        }
        expected = {
            "sensor.private_room": "room_temperature",
            "sensor.outdoor": "outdoor_temperature",
            "sensor.comfort_temperature": "comfort_temperature",
            "sensor.comfort_humidity": "comfort_humidity",
            "sensor.comfort_co2": "comfort_co2",
        }
        for entity_id in expected:
            self.hass.states[entity_id] = SimpleNamespace(state="20", attributes={})
        self.manager.async_start(self.runtime)
        self.manager.async_finish_startup()

        for entity_id, purpose in expected.items():
            with self.subTest(entity_id=entity_id):
                self.hass.states[entity_id].state = "unavailable"
                self.manager._handle_associated_sensor_state_change(
                    SimpleNamespace(data={"entity_id": entity_id})
                )
                detected = self.hass.bus.async_fire.call_args.args[1]
                self.assertEqual("detected", detected["change"])
                self.assertEqual("associated_sensor_unavailable", detected["code"])
                self.assertEqual(purpose, detected["purpose"])

                self.hass.states[entity_id].state = "20"
                self.manager._handle_associated_sensor_state_change(
                    SimpleNamespace(data={"entity_id": entity_id})
                )
                resolved = self.hass.bus.async_fire.call_args.args[1]
                self.assertEqual("resolved", resolved["change"])
                self.assertEqual(purpose, resolved["purpose"])

    def test_inactive_associated_sensors_are_not_watched_or_reported(self) -> None:
        zone = self.runtime["storage"].data["zones"]["climate.living_room"]
        zone["preconditioning"].update(
            {
                "enabled": False,
                "room_sensor_assist_enabled": False,
                "use_outdoor_temperature": True,
                "outdoor_temperature_entity_id": "sensor.inactive_outdoor",
            }
        )
        zone["comfort"] = {
            "enabled": False,
            "temperature_entity_id": "sensor.inactive_comfort",
        }
        self.hass.states["sensor.inactive_outdoor"] = SimpleNamespace(
            state="unavailable", attributes={}
        )
        self.hass.states["sensor.inactive_comfort"] = SimpleNamespace(
            state="unavailable", attributes={}
        )

        self.manager.async_start(self.runtime)
        self.manager.async_finish_startup()

        self.assertEqual((), self.manager._associated_sensor_ids)
        self.assertEqual([], self.manager.active_issues(self.runtime))
        self.manager._handle_associated_sensor_state_change(SimpleNamespace(data={}))
        self.hass.bus.async_fire.assert_not_called()

    def test_associated_sensor_listener_refreshes_and_unloads_safely(self) -> None:
        zone = self.runtime["storage"].data["zones"]["climate.living_room"]
        zone["preconditioning"].update(
            {
                "enabled": True,
                "use_outdoor_temperature": True,
                "outdoor_temperature_entity_id": "sensor.outdoor",
            }
        )
        climate_unsub = Mock()
        sensor_unsub = Mock()
        replacement_unsub = Mock()
        with patch.object(
            diagnostics_module,
            "async_track_state_change_event",
            side_effect=[climate_unsub, sensor_unsub, replacement_unsub],
        ) as track:
            self.manager.async_start(self.runtime)
            self.assertEqual(
                ("sensor.outdoor", "sensor.private_room"),
                self.manager._associated_sensor_ids,
            )
            self.assertEqual(2, track.call_count)

            zone["preconditioning"]["room_temperature_entity_id"] = None
            self.manager._handle_scheduler_update()
            sensor_unsub.assert_called_once_with()
            self.assertEqual(("sensor.outdoor",), self.manager._associated_sensor_ids)
            self.assertEqual(3, track.call_count)

            self.manager.async_stop()

        climate_unsub.assert_called_once_with()
        replacement_unsub.assert_called_once_with()
        self.assertEqual((), self.manager._associated_sensor_ids)

    def test_history_is_explicitly_bounded(self) -> None:
        for index in range(diagnostics_module.DIAGNOSTIC_HISTORY_LIMIT + 10):
            self.manager.observe_delivery(
                "climate.living_room",
                "failed",
                {"message": f"failure {index}"},
            )
        snapshot = self.manager.snapshot(self.runtime)
        self.assertEqual(
            diagnostics_module.DIAGNOSTIC_HISTORY_LIMIT,
            len(snapshot["history"]),
        )
        self.assertNotIn("history", snapshot["units"]["climate.living_room"])

    def test_export_replaces_climate_and_sensor_ids(self) -> None:
        report = self.manager.export_snapshot(self.runtime)
        serialized = str(report)
        self.assertNotIn("climate.living_room", serialized)
        self.assertNotIn("sensor.private_room", serialized)
        self.assertIn("climate_unit_1", serialized)
        self.assertNotIn("private-pause", serialized)
        self.assertIn("2026-08-17T22:10:12.345678+00:00", serialized)
        self.assertNotIn("Weekday", serialized)
        self.assertNotIn("Home", serialized)
        self.assertTrue(report["privacy"]["entity_ids_redacted"])
        self.assertTrue(report["privacy"]["operational_identifiers_redacted"])
        self.assertTrue(report["privacy"]["review_before_sharing"])

    def test_export_can_keep_entity_ids_but_still_redacts_operational_ids(self) -> None:
        report = self.manager.export_snapshot(
            self.runtime,
            redact_entity_ids=False,
        )
        serialized = str(report)

        self.assertFalse(report["privacy"]["entity_ids_redacted"])
        self.assertTrue(report["privacy"]["operational_identifiers_redacted"])
        self.assertTrue(report["privacy"]["review_before_sharing"])
        self.assertIn("climate.living_room", serialized)
        self.assertIn("sensor.private_room", serialized)
        self.assertNotIn("private-pause", serialized)
        self.assertNotIn("Weekday", serialized)
        self.assertNotIn("Home", serialized)

    def test_home_assistant_standard_diagnostics_always_uses_safe_default(self) -> None:
        with patch.object(
            sys.modules["custom_components.velair"],
            "VelairConfigEntry",
            object,
            create=True,
        ):
            ha_diagnostics = importlib.import_module(
                "custom_components.velair.diagnostics"
            )
        manager = Mock()
        manager.export_snapshot.return_value = {
            "privacy": {"entity_ids_redacted": True},
        }
        runtime = {"diagnostics": manager}
        entry = SimpleNamespace(
            domain="velair",
            entry_id="entry",
            runtime_data=SimpleNamespace(diagnostics=manager),
            version=1,
        )
        hass = SimpleNamespace(data={"velair": {"entry": runtime}})

        result = asyncio.run(
            ha_diagnostics.async_get_config_entry_diagnostics(hass, entry)
        )

        manager.export_snapshot.assert_called_once_with(runtime)
        self.assertTrue(result["privacy"]["entity_ids_redacted"])

    def test_export_redacts_runtime_pause_and_profile_identifiers(self) -> None:
        self.runtime["scheduler"].get_zone_runtime_statuses = lambda: {
            "climate.living_room": {
                "state": "paused",
                "pause_ids": ["private-window", "private-manual"],
                "profile_id": "private-profile",
            }
        }
        serialized = str(self.manager.export_snapshot(self.runtime))
        self.assertNotIn("private-window", serialized)
        self.assertNotIn("private-manual", serialized)
        self.assertNotIn("private-profile", serialized)

    def test_export_redacts_entity_ids_embedded_in_free_text(self) -> None:
        self.manager.observe_delivery(
            "climate.living_room", "failed", {"message": "example.com"}
        )
        self.manager.observe_delivery(
            "climate.living_room", "failed", {"message": "homeassistant.core"}
        )
        self.manager.observe_delivery(
            "climate.living_room", "failed", {"message": "sensor.exact_only"}
        )
        self.manager.observe_delivery(
            "climate.living_room",
            "failed",
            {
                "message": (
                    "climate.living_room failed while reading sensor.embedded_only "
                    "and sensor.private_room; "
                    "retry climate.living_room; keep homeassistant.core and example.com"
                )
            },
        )

        serialized = str(self.manager.export_snapshot(self.runtime))

        self.assertNotIn("climate.living_room", serialized)
        self.assertNotIn("sensor.embedded_only", serialized)
        self.assertNotIn("sensor.exact_only", serialized)
        self.assertNotIn("sensor.private_room", serialized)
        self.assertIn("associated_entity_2", serialized)
        self.assertIn(
            "climate_unit_1 failed while reading associated_entity_1 "
            "and associated_entity_3; "
            "retry climate_unit_1; keep homeassistant.core and example.com",
            serialized,
        )
        self.assertIn("homeassistant.core", serialized)
        self.assertIn("example.com", serialized)

    def test_delivery_issue_clears_after_success(self) -> None:
        self.manager.observe_delivery("climate.living_room", "exhausted", {"message": "limit"})
        failed = self.manager.snapshot(self.runtime)["units"]["climate.living_room"]
        self.assertEqual("error", failed["status"])
        self.assertIn("delivery_exhausted", {item["code"] for item in failed["issues"]})
        self.manager.observe_delivery("climate.living_room", "success")
        recovered = self.manager.snapshot(self.runtime)["units"]["climate.living_room"]
        self.assertEqual("ok", recovered["status"])
        self.assertEqual("exhausted", recovered["delivery"]["last_error"]["code"])
        self.assertNotIn(
            "delivery_exhausted",
            {item["code"] for item in recovered["issues"]},
        )

    def test_delivery_error_is_not_downgraded_by_capability_warning(self) -> None:
        climate = self.hass.states["climate.living_room"]
        climate.attributes.pop("min_temp")
        climate.attributes.pop("max_temp")
        self.manager.observe_delivery("climate.living_room", "exhausted")
        unit = self.manager.snapshot(self.runtime)["units"]["climate.living_room"]
        self.assertEqual("error", unit["status"])

    def test_associated_sensor_problem_is_visible(self) -> None:
        self.runtime["storage"].data["zones"]["climate.living_room"][
            "preconditioning"
        ]["enabled"] = True
        self.hass.states["sensor.private_room"].state = "unavailable"
        unit = self.manager.snapshot(self.runtime)["units"]["climate.living_room"]
        self.assertEqual("warning", unit["status"])
        self.assertIn(
            "associated_sensor_unavailable",
            {item["code"] for item in unit["issues"]},
        )

    def test_inactive_configured_sensor_is_listed_without_issue(self) -> None:
        self.hass.states["sensor.private_room"].state = "unavailable"
        unit = self.manager.snapshot(self.runtime)["units"]["climate.living_room"]
        self.assertFalse(unit["sensors"][0]["active"])
        self.assertNotIn(
            "associated_sensor_unavailable",
            {item["code"] for item in unit["issues"]},
        )

    def test_notifications_are_deferred_and_coalesced(self) -> None:
        callbacks = []
        self.hass.loop.call_soon = callbacks.append
        self.manager.observe_delivery("climate.living_room", "failed")
        self.manager.observe_delivery("climate.living_room", "retrying", {"retry_count": 1})
        self.assertEqual(1, len(callbacks))
        callbacks.pop()()
        self.manager.observe_delivery(
            "climate.living_room", "retrying", {"retry_count": 2}
        )
        self.assertEqual(1, len(callbacks))

    def test_disabled_history_category_is_filtered_before_insertion(self) -> None:
        asyncio.run(
            self.manager.async_update_history_categories(
                [
                    category
                    for category in diagnostics_module.DIAGNOSTIC_HISTORY_CATEGORIES
                    if category != "delivery"
                ]
            )
        )
        self.manager.observe_delivery(
            "climate.living_room", "failed", {"message": "temporary"}
        )
        snapshot = self.manager.snapshot(self.runtime)
        self.assertEqual([], snapshot["history"])
        self.assertEqual("failed", snapshot["units"]["climate.living_room"]["delivery"]["status"])
        self.assertIn(
            "delivery_failed",
            {item["code"] for item in snapshot["units"]["climate.living_room"]["issues"]},
        )

    def test_disabling_category_removes_retained_entries(self) -> None:
        self.manager.observe_delivery("climate.living_room", "failed")
        self.assertEqual(1, len(self.manager.snapshot(self.runtime)["history"]))
        asyncio.run(
            self.manager.async_update_history_categories(
                [
                    category
                    for category in diagnostics_module.DIAGNOSTIC_HISTORY_CATEGORIES
                    if category != "delivery"
                ]
            )
        )
        snapshot = self.manager.snapshot(self.runtime)
        self.assertEqual([], snapshot["history"])
        self.assertFalse(snapshot["history_policy"]["categories"]["delivery"])

    def test_unknown_events_default_to_control_history(self) -> None:
        event = SimpleNamespace(
            data={
                "domain": "velair",
                "event": "future_control_event",
                "entity_id": "climate.living_room",
            },
            time_fired=None,
        )
        self.manager._handle_event(event)
        item = self.manager.snapshot(self.runtime)["history"][0]
        self.assertEqual("control", item["category"])

    def test_manual_control_events_keep_only_safe_diagnostic_evidence(self) -> None:
        self.manager._handle_event(
            SimpleNamespace(
                data={
                    "domain": "velair",
                    "event": "external_climate_change_detected",
                    "entity_id": "climate.living_room",
                    "changed_fields": ["hvac_mode", "temperature", "entity_id", 42],
                    "control_mode": "manual",
                    "previous_control_mode": "automatic",
                    "policy": "for_duration",
                    "duration_minutes": 45,
                    "started_at": "2026-08-20T10:00:00+00:00",
                    "until": "2026-08-20T10:45:00+00:00",
                    "previous": {
                        "hvac_mode": "heat",
                        "temperature": 20.0,
                        "target_temp_low": float("nan"),
                        "context_id": "private-context",
                    },
                    "current": {
                        "hvac_mode": "cool",
                        "temperature": 22.0,
                        "target_temp_high": float("inf"),
                        "user_id": "private-user",
                    },
                    "context": {"id": "private-context"},
                },
                time_fired=None,
            )
        )
        item = self.manager.snapshot(self.runtime)["history"][0]
        self.assertEqual("control", item["category"])
        self.assertEqual(["hvac_mode", "temperature"], item["data"]["changed_fields"])
        self.assertEqual(
            {"hvac_mode": "heat", "temperature": 20.0},
            item["data"]["previous"],
        )
        self.assertEqual(
            {"hvac_mode": "cool", "temperature": 22.0},
            item["data"]["current"],
        )
        self.assertEqual("for_duration", item["data"]["policy"])
        self.assertEqual(45, item["data"]["duration_minutes"])
        self.assertEqual("manual", item["data"]["control_mode"])
        self.assertEqual("automatic", item["data"]["previous_control_mode"])
        self.assertEqual("2026-08-20T10:00:00+00:00", item["data"]["started_at"])
        self.assertEqual("2026-08-20T10:45:00+00:00", item["data"]["until"])
        self.assertNotIn("context", item["data"])
        self.assertNotIn("private", str(item["data"]))

    def test_zone_control_changed_remains_in_control_category(self) -> None:
        self.manager._handle_event(
            SimpleNamespace(
                data={
                    "domain": "velair",
                    "event": "zone_control_changed",
                    "entity_id": "climate.living_room",
                    "control_mode": "automatic",
                    "previous_control_mode": "manual",
                    "reason": "resumed",
                },
                time_fired=None,
            )
        )
        item = self.manager.snapshot(self.runtime)["history"][0]
        self.assertEqual("control", item["category"])
        self.assertEqual("automatic", item["data"]["control_mode"])
        self.assertEqual("manual", item["data"]["previous_control_mode"])

    def test_all_history_categories_keep_useful_safe_evidence(self) -> None:
        events = (
            ("future_control_event", {"temperature": 20, "unsafe": "secret"}),
            (
                "room_sensor_assist_updated",
                {
                    "applied_temperature": 19.5,
                    "room_temperature": 21.0,
                    "climate_temperature": 20.0,
                    "direction": "heat",
                },
            ),
            (
                "preconditioning_plan_updated",
                {"lead_minutes": 35, "direction": "cool", "model_source": "history"},
            ),
            (
                "comfort_assessment_changed",
                {
                    "condition": "comfortable",
                    "air_quality": "good",
                    "data_quality": "complete",
                },
            ),
        )
        for event_name, data in events:
            self.manager._handle_event(
                SimpleNamespace(
                    data={
                        "domain": "velair",
                        "event": event_name,
                        "entity_id": "climate.living_room",
                        **data,
                    },
                    time_fired=None,
                )
            )
        self.manager.observe_delivery(
            "climate.living_room", "failed", {"message": "temporary"}
        )
        self.manager._handle_climate_state_change(
            SimpleNamespace(
                data={
                    "entity_id": "climate.living_room",
                    "old_state": SimpleNamespace(state="heat"),
                    "new_state": SimpleNamespace(state="unavailable"),
                }
            )
        )
        snapshot = self.manager.snapshot(self.runtime)
        by_category = {item["category"]: item for item in snapshot["history"]}
        self.assertEqual(set(diagnostics_module.DIAGNOSTIC_HISTORY_CATEGORIES), set(by_category))
        self.assertEqual(19.5, by_category["room_assist"]["data"]["applied_temperature"])
        self.assertEqual("good", by_category["comfort"]["data"]["air_quality"])
        self.assertEqual(35, by_category["preconditioning"]["data"]["lead_minutes"])
        self.assertNotIn("unsafe", by_category["control"]["data"])

    def test_clear_history_keeps_current_delivery_evidence(self) -> None:
        self.manager.observe_delivery("climate.living_room", "failed")
        self.manager.async_clear_history()
        snapshot = self.manager.snapshot(self.runtime)
        self.assertEqual([], snapshot["history"])
        self.assertEqual("failed", snapshot["units"]["climate.living_room"]["delivery"]["status"])

    def test_policy_load_failure_keeps_defaults(self) -> None:
        self.manager._policy_store = _PolicyStore(load_error=True)
        with self.assertLogs(diagnostics_module._LOGGER, level="ERROR"):
            asyncio.run(self.manager.async_load_policy())
        self.assertTrue(
            all(self.manager.snapshot(self.runtime)["history_policy"]["categories"].values())
        )

    def test_policy_load_success_applies_stored_categories(self) -> None:
        self.manager._policy_store = _PolicyStore(
            loaded={"categories": {"delivery": False}}
        )
        asyncio.run(self.manager.async_load_policy())
        policy = self.manager.snapshot(self.runtime)["history_policy"]["categories"]
        self.assertFalse(policy["delivery"])
        self.assertTrue(policy["control"])

    def test_policy_store_key_is_isolated_per_entry(self) -> None:
        captured = []

        class CapturingStore:
            def __init__(self, _hass, version, key) -> None:
                captured.append((version, key))

        with patch.object(diagnostics_module, "Store", CapturingStore):
            diagnostics_module.RuntimeDiagnosticsManager(
                self.hass, ["climate.living_room"], "entry-a"
            )
            diagnostics_module.RuntimeDiagnosticsManager(
                self.hass, ["climate.living_room"], "entry-b"
            )
        self.assertEqual(
            [(1, "velair.entry-a.diagnostics"), (1, "velair.entry-b.diagnostics")],
            captured,
        )

    def test_cached_snapshot_is_shared_until_one_coalesced_revision(self) -> None:
        callbacks = []
        self.hass.loop.call_soon = callbacks.append
        with patch.object(
            self.manager,
            "snapshot",
            wraps=self.manager.snapshot,
        ) as snapshot:
            self.manager.observe_delivery("climate.living_room", "failed")
            self.manager.observe_delivery(
                "climate.living_room", "retrying", {"retry_count": 1}
            )
            first = self.manager.cached_snapshot(self.runtime)
            second = self.manager.cached_snapshot(self.runtime)
            self.assertIs(first, second)
            self.assertEqual(1, snapshot.call_count)
            self.assertEqual(1, len(callbacks))
            callbacks.pop()()
            self.manager.observe_delivery(
                "climate.living_room", "retrying", {"retry_count": 2}
            )
            third = self.manager.cached_snapshot(self.runtime)
            self.assertIsNot(first, third)
            self.assertEqual(2, snapshot.call_count)

    def test_scheduler_update_invalidates_cached_snapshot(self) -> None:
        first = self.manager.cached_snapshot(self.runtime)
        self.runtime["scheduler"].mode = "manual"

        self.manager._handle_scheduler_update()

        second = self.manager.cached_snapshot(self.runtime)
        self.assertIsNot(first, second)
        self.assertEqual("manual", second["overall"]["scheduler_mode"])

    def test_climate_state_change_invalidates_cached_snapshot(self) -> None:
        first = self.manager.cached_snapshot(self.runtime)
        old_state = self.hass.states["climate.living_room"]
        new_state = SimpleNamespace(
            state="heat_cool",
            attributes={**old_state.attributes, "min_temp": 8.0},
        )
        self.hass.states["climate.living_room"] = new_state

        self.manager._handle_climate_state_change(
            SimpleNamespace(
                data={
                    "entity_id": "climate.living_room",
                    "old_state": old_state,
                    "new_state": new_state,
                }
            )
        )

        second = self.manager.cached_snapshot(self.runtime)
        self.assertIsNot(first, second)
        self.assertEqual(
            8.0,
            second["units"]["climate.living_room"]["capabilities"][
                "min_temperature"
            ],
        )

    def test_policy_save_failure_does_not_change_runtime_or_purge_history(self) -> None:
        self.manager.observe_delivery("climate.living_room", "failed")
        self.manager._policy_store = _PolicyStore(save_error=True)
        with self.assertRaises(RuntimeError):
            asyncio.run(
                self.manager.async_update_history_categories(
                    [
                        category
                        for category in diagnostics_module.DIAGNOSTIC_HISTORY_CATEGORIES
                        if category != "delivery"
                    ]
                )
            )
        snapshot = self.manager.snapshot(self.runtime)
        self.assertTrue(snapshot["history_policy"]["categories"]["delivery"])
        self.assertEqual(1, len(snapshot["history"]))


if __name__ == "__main__":
    unittest.main()
