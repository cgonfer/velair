"""Documentation coverage for climate feature user-facing behavior."""

from __future__ import annotations

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
DOCS_INDEX = ROOT / "docs" / "README.md"
ADAPTIVE_PRECONDITIONING_DOC = ROOT / "docs" / "user" / "adaptive-preconditioning.md"
DEVELOPER_PRECONDITIONING_DOC = ROOT / "docs" / "developer" / "adaptive-preconditioning.md"
DEVELOPER_ROOM_ASSIST_DOC = ROOT / "docs" / "developer" / "room-assist.md"
ROOM_ASSIST_DOC = ROOT / "docs" / "user" / "room-assist.md"
USAGE_DOC = ROOT / "docs" / "user" / "usage.md"


class ClimateFeatureDocsTest(unittest.TestCase):
    """Keep public climate feature documentation discoverable and practical."""

    def test_user_guides_are_linked_from_user_docs(self) -> None:
        index = DOCS_INDEX.read_text(encoding="utf-8")
        usage = USAGE_DOC.read_text(encoding="utf-8")

        self.assertIn("user/adaptive-preconditioning.md", index)
        self.assertIn("user/room-assist.md", index)
        self.assertIn("developer/adaptive-preconditioning.md", index)
        self.assertIn("developer/room-assist.md", index)
        self.assertIn("[Adaptive Preconditioning](adaptive-preconditioning.md)", usage)
        self.assertIn("[Room Assist](room-assist.md)", usage)
        self.assertIn("Adaptive preconditioning internals", usage)

    def test_room_assist_guide_covers_examples_events_and_services(self) -> None:
        guide = ROOM_ASSIST_DOC.read_text(encoding="utf-8")

        for heading in (
            "## Fixed Heating Hysteresis Example",
            "## Heating With A Capped Delta",
            "## Fixed Cooling Hysteresis Example",
            "## When Velair Does Nothing",
            "## Adaptive Preconditioning",
            "## Automation Events",
            "## Lovelace",
        ):
            self.assertIn(heading, guide)

        for expected in (
            "room_sensor_assist_state_changed",
            "room_sensor_assist_updated",
            "room_sensor_assist_restored",
            "velair.enable_room_sensor_assist",
            "velair.disable_room_sensor_assist",
            "view: sensors",
            "../developer/room-assist.md",
            "hysteresis_phase: towards_upper",
            "deadband_low: 20.7",
            "deadband_high: 21.3",
            "Why Climate target can differ from the calculation",
            "calculation, published step, and applied value",
        ):
            self.assertIn(expected, guide)

    def test_room_assist_developer_guide_covers_internals_without_being_user_guide(
        self,
    ) -> None:
        guide = DEVELOPER_ROOM_ASSIST_DOC.read_text(encoding="utf-8")

        for heading in (
            "## Stored Configuration",
            "## Effective Temperature Source",
            "## Runtime Status",
            "## Assistance Lifecycle",
            "## Target Calculation",
            "## Clearing And Restoring",
            "## Automation Events",
            "## API Summary",
            "## Limitations",
        ):
            self.assertIn(heading, guide)

        for expected in (
            "../user/room-assist.md",
            "room_sensor_assist_updated",
            "room_sensor_assist_restored",
            "room_sensor_assist_debounce_seconds",
            "target_temp_step",
            "velair.enable_room_sensor_assist",
            "velair.disable_room_sensor_assist",
            "towards_lower",
            "towards_upper",
            "hysteresis_target",
            "pre_step_temperature",
            "target_temp_step",
            "runtime-only and is never stored",
        ):
            self.assertIn(expected, guide)

    def test_adaptive_preconditioning_guide_covers_user_examples(self) -> None:
        guide = ADAPTIVE_PRECONDITIONING_DOC.read_text(encoding="utf-8")
        developer_guide = DEVELOPER_PRECONDITIONING_DOC.read_text(encoding="utf-8")

        for heading in (
            "## Initial Model Example",
            "## Heating With Learned History",
            "## Cooling Example",
            "## Partial And Invalid Observations",
            "## Outdoor Temperature Sensor",
            "## Room Assist Interaction",
            "## Automation Events",
            "## When Velair Does Nothing",
            "## Lovelace",
        ):
            self.assertIn(heading, guide)

        for expected in (
            "preconditioning_plan_updated",
            "preconditioning_plan_cancelled",
            "preconditioning_observation_recorded",
            "view: preconditioning",
            "Room Assist](room-assist.md)",
            "../developer/adaptive-preconditioning.md",
        ):
            self.assertIn(expected, guide)

        self.assertIn("../user/adaptive-preconditioning.md", developer_guide)
        self.assertIn("Room Assist internals](room-assist.md)", developer_guide)
        self.assertNotIn("## Room Sensor Assist", developer_guide)


if __name__ == "__main__":
    unittest.main()
