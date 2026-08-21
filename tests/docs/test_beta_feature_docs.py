"""Documentation contracts for beta diagnostics, Manual control, and Room Assist."""

from __future__ import annotations

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
API_DOC = ROOT / "docs" / "developer" / "api.md"
API_SOURCE = ROOT / "custom_components" / "velair" / "api.py"
ARCHITECTURE = ROOT / "docs" / "developer" / "architecture.md"
AUTOMATION_EVENTS = ROOT / "docs" / "user" / "automation-events.md"
ROOM_ASSIST = ROOT / "docs" / "user" / "room-assist.md"
USAGE = ROOT / "docs" / "user" / "usage.md"
MANUAL_TESTING = ROOT / "docs" / "developer" / "manual-testing.md"
TRANSLATIONS = ROOT / "frontend" / "src" / "velair" / "translations"

NEW_WEBSOCKET_COMMANDS = (
    "get_diagnostics",
    "export_diagnostics",
    "subscribe_diagnostics",
    "update_diagnostics_history",
    "clear_diagnostics_history",
    "update_external_change_policy",
    "enter_manual_adjustment",
    "resume_automatic_control",
)


class BetaFeatureDocsTest(unittest.TestCase):
    """Prevent the beta's public contracts from drifting out of the guides."""

    def test_every_new_registered_websocket_command_is_documented(self) -> None:
        api_source = API_SOURCE.read_text(encoding="utf-8")
        api_doc = API_DOC.read_text(encoding="utf-8")

        for command in NEW_WEBSOCKET_COMMANDS:
            self.assertIn(f"ws_{command}", api_source)
            self.assertIn(f'f"{{DOMAIN}}/{command}"', api_source)
            self.assertIn(f'type: "velair/{command}"', api_doc)

        for term in (
            "DiagnosticsSnapshot",
            "enabled_categories",
            "redact_entity_ids",
            "not_loaded",
            "invalid_external_change_policy",
            "manual_adjustment_not_allowed",
            "invalid_entity",
            "full schedule response",
        ):
            self.assertIn(term, api_doc)

    def test_diagnostics_transience_and_persistence_are_unambiguous(self) -> None:
        events = " ".join(AUTOMATION_EVENTS.read_text(encoding="utf-8").split())
        architecture = " ".join(ARCHITECTURE.read_text(encoding="utf-8").split())

        for phrase in (
            "raw, transient Home Assistant events",
            "bounded in-memory history of at most 100 entries",
            "cleared whenever Velair or Home Assistant restarts",
            "does not change or extend the lifetime",
        ):
            self.assertIn(phrase, events)

        for phrase in (
            "Only the per-category retention policy is stored",
            "history is a sanitized `deque` capped at 100 entries",
            "event-bus notifications remain transient",
            "operational Profile, Mode, and pause identifiers",
        ):
            self.assertIn(phrase, architecture)

    def test_room_assist_deadband_migration_is_documented(self) -> None:
        room_assist = " ".join(ROOM_ASSIST.read_text(encoding="utf-8").split())
        architecture = " ".join(ARCHITECTURE.read_text(encoding="utf-8").split())

        for phrase in (
            "copies the existing value into the new Room Assist deadband once",
            "historical value that is not on the newer 0.1-degree input step",
            "After migration the two settings are independent",
            "newly configured or reset zone uses the unit-aware default",
        ):
            self.assertIn(phrase, room_assist)

        self.assertIn("Portable model v8 separates", architecture)
        self.assertIn("before any Celsius/Fahrenheit conversion", architecture)

    def test_reset_inventory_includes_manual_control_data(self) -> None:
        usage = " ".join(USAGE.read_text(encoding="utf-8").split())
        self.assertIn("external-adjustment policies and active Manual adjustments", usage)

        for name in ("en", "es", "de", "fr", "nl", "ru"):
            source = (TRANSLATIONS / f"{name}.ts").read_text(encoding="utf-8")
            self.assertIn('"resetVelairDescription":', source)

    def test_manual_beta_matrix_covers_visual_and_runtime_risks(self) -> None:
        guide = " ".join(MANUAL_TESTING.read_text(encoding="utf-8").split())
        for phrase in (
            "## Diagnostics Smoke Test",
            "Trigger two validation errors in quick succession",
            "Automatic scheduling",
            "through `743`, `742`, and `741` pixels",
            "moving Boost highlight is clipped",
            "Room Assist deadband appears immediately before Maximum assist delta",
            "Repeat in Fahrenheit",
        ):
            self.assertIn(phrase, guide)

    def test_public_navigation_points_to_the_diagnostics_workspace(self) -> None:
        readme = " ".join(README.read_text(encoding="utf-8").split())
        manual_testing = " ".join(MANUAL_TESTING.read_text(encoding="utf-8").split())

        self.assertIn("Dedicated Diagnostics tab", readme)
        self.assertIn("[Diagnostics](docs/user/diagnostics.md)", readme)
        self.assertIn("`diagnostics`: runtime health", readme)
        self.assertNotIn("thermostat diagnostics", readme)
        self.assertIn(
            "Preconditioning, Diagnostics, and Settings tabs render in that order",
            manual_testing,
        )
        self.assertNotIn("Settings diagnostics", manual_testing)


if __name__ == "__main__":
    unittest.main()
