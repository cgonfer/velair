"""Documentation coverage for public automation events."""

from __future__ import annotations

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
EVENTS_GUIDE = ROOT / "docs" / "user" / "automation-events.md"
DOCS_INDEX = ROOT / "docs" / "README.md"
USAGE_DOC = ROOT / "docs" / "user" / "usage.md"
CONSTANTS = ROOT / "custom_components" / "velair" / "const.py"

PUBLIC_EVENTS = (
    "profile_changed",
    "scheduler_mode_changed",
    "climate_target_applied",
    "preconditioning_plan_updated",
    "preconditioning_plan_cancelled",
    "preconditioning_observation_recorded",
    "comfort_assessment_changed",
    "room_sensor_assist_state_changed",
    "room_sensor_assist_updated",
    "room_sensor_assist_restored",
    "boost_started",
    "boost_ended",
    "zone_paused",
    "zone_resumed",
)


class AutomationEventsDocsTest(unittest.TestCase):
    """Keep every public runtime event documented with a payload example."""

    def test_event_guide_is_discoverable(self) -> None:
        index = DOCS_INDEX.read_text(encoding="utf-8")
        usage = USAGE_DOC.read_text(encoding="utf-8")

        self.assertIn("user/automation-events.md", index)
        self.assertIn("[Automation Events](automation-events.md)", usage)

    def test_every_public_event_has_one_payload_example(self) -> None:
        guide = EVENTS_GUIDE.read_text(encoding="utf-8")

        for event_name in PUBLIC_EVENTS:
            self.assertEqual(
                len(
                    re.findall(
                        rf"^event: {re.escape(event_name)}$",
                        guide,
                        flags=re.MULTILINE,
                    )
                ),
                1,
                f"{event_name} needs exactly one complete payload example",
            )

    def test_documented_events_match_backend_constants(self) -> None:
        constants = CONSTANTS.read_text(encoding="utf-8")
        backend_events = set(
            re.findall(
                r'EVENT_TYPE_[A-Z_]+\s*=\s*(?:\(\s*)?"([^"]+)"',
                constants,
            )
        )

        self.assertEqual(backend_events, set(PUBLIC_EVENTS))

    def test_guide_covers_deduplication_and_non_event_operations(self) -> None:
        guide = EVENTS_GUIDE.read_text(encoding="utf-8")
        normalized_guide = " ".join(guide.split())

        for expected in (
            "recalculations are deduplicated",
            "Repeating the same state does not emit it",
            "does not flood the event bus",
            "Operations Without Runtime Events",
        ):
            self.assertIn(expected, normalized_guide)


if __name__ == "__main__":
    unittest.main()
