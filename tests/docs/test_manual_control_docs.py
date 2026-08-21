"""Documentation contracts for external changes and Manual adjustment."""

from __future__ import annotations

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
GUIDE = ROOT / "docs" / "user" / "manual-control.md"
DOCS_INDEX = ROOT / "docs" / "README.md"
ROOT_README = ROOT / "README.md"
USAGE = ROOT / "docs" / "user" / "usage.md"
ROOM_ASSIST = ROOT / "docs" / "user" / "room-assist.md"
AUTOMATION_EVENTS = ROOT / "docs" / "user" / "automation-events.md"
MANUAL_TESTING = ROOT / "docs" / "developer" / "manual-testing.md"
CONSTANTS = ROOT / "custom_components" / "velair" / "const.py"
SERVICES = ROOT / "custom_components" / "velair" / "services.yaml"

POLICIES = (
    "keep_automatic",
    "until_next_block",
    "for_duration",
    "until_resumed",
)


class ManualControlDocsTest(unittest.TestCase):
    """Keep the user guide discoverable and aligned with public contracts."""

    def test_guide_is_discoverable_from_primary_docs(self) -> None:
        for path in (DOCS_INDEX, ROOT_README, USAGE, ROOM_ASSIST, AUTOMATION_EVENTS):
            self.assertIn(
                "manual-control.md",
                path.read_text(encoding="utf-8"),
                f"{path.relative_to(ROOT)} must link the main guide",
            )

    def test_every_backend_policy_is_documented(self) -> None:
        guide = GUIDE.read_text(encoding="utf-8")
        constants = CONSTANTS.read_text(encoding="utf-8")
        backend_policies = tuple(
            re.findall(
                r'^EXTERNAL_CHANGE_(?!POLICY)[A-Z_]+\s*=\s*"([a-z_]+)"',
                constants,
                flags=re.MULTILINE,
            )
        )

        self.assertEqual(POLICIES, backend_policies)
        for policy in backend_policies:
            self.assertIn(f"`{policy}`", guide)

    def test_service_examples_match_services_yaml(self) -> None:
        guide = GUIDE.read_text(encoding="utf-8")
        services = SERVICES.read_text(encoding="utf-8")

        for service in (
            "set_external_change_policy",
            "enter_manual_adjustment",
            "resume_automatic_control",
        ):
            self.assertRegex(services, rf"(?m)^{service}:$")
            self.assertIn(f"action: velair.{service}", guide)

        for field in ("entity_id", "policy", "duration_minutes"):
            self.assertRegex(services, rf"(?m)^    {field}:$")
            self.assertIn(field, guide)

        enter_description = re.search(
            r"(?ms)^enter_manual_adjustment:\n(?:  .+\n)+?(?=^[a-z_]+:|\Z)",
            services,
        )
        self.assertIsNotNone(enter_description)
        enter_contract = enter_description.group(0)
        self.assertIn("    entity_id:", enter_contract)
        self.assertNotIn("    policy:", enter_contract)
        self.assertNotIn("    duration_minutes:", enter_contract)

        resume_description = re.search(
            r"(?ms)^resume_automatic_control:\n(?:  .+\n)+?(?=^[a-z_]+:|\Z)",
            services,
        )
        self.assertIsNotNone(resume_description)
        description = resume_description.group(0)
        self.assertIn("resolve the current Velair intent", description)
        self.assertIn("scheduler state and other overrides allow", description)
        self.assertNotIn("immediately reapply", description)

    def test_required_boundaries_and_real_world_cases_are_explicit(self) -> None:
        normalized = " ".join(GUIDE.read_text(encoding="utf-8").split())
        manual_testing = MANUAL_TESTING.read_text(encoding="utf-8")

        for phrase in (
            "Velair Mode **Manual**",
            "current authoritative intent",
            "Home Assistant climate card",
            "IR remote",
            "External adjustment during a Boost",
            "Room Assist without a control fight",
            "Native `heat_cool` range",
            "Restart and Availability Behavior",
            "Attribution Limits",
            "Profile pause and `turn_off`",
            "Independent zone pause, action `none`",
            "Independent zone pause, action `turn_off`",
            "Resume from `off` when the block says Keep current mode",
            "first compatible supported mode",
            "snapshot is runtime-only and is not persisted",
        ):
            self.assertIn(phrase, normalized)

        self.assertIn("## Manual Adjustment Smoke Test", manual_testing)
        self.assertIn("Apply active schedule after startup", manual_testing)


if __name__ == "__main__":
    unittest.main()
