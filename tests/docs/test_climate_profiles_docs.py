"""Climate Profiles documentation contract tests."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
GUIDE = ROOT / "docs" / "user" / "climate-profiles.md"
DOCS_INDEX = ROOT / "docs" / "README.md"
USAGE = ROOT / "docs" / "user" / "usage.md"
AUTOMATION_EVENTS = ROOT / "docs" / "user" / "automation-events.md"
API = ROOT / "docs" / "developer" / "api.md"
MANUAL_TESTING = ROOT / "docs" / "developer" / "manual-testing.md"
FRONTEND_GUIDE = ROOT / "docs" / "developer" / "frontend.md"
SERVICES = ROOT / "custom_components" / "velair" / "services.yaml"


class ClimateProfilesDocumentationTest(unittest.TestCase):
    """Keep the public guide aligned with the supported profile contract."""

    def test_guide_is_linked_and_covers_runtime_contract(self) -> None:
        self.assertTrue(GUIDE.is_file())
        guide = GUIDE.read_text(encoding="utf-8")
        docs_index = DOCS_INDEX.read_text(encoding="utf-8")
        usage = USAGE.read_text(encoding="utf-8")

        self.assertIn("Climate Profiles](user/climate-profiles.md)", docs_index)
        self.assertIn("Climate Profiles](climate-profiles.md)", usage)
        for required in (
            "Default",
            "velair.activate_profile",
            "velair.deactivate_profile",
            "Boosts in affected zones are cancelled",
            "Global and per-zone pauses take priority",
            "Apply active schedule after startup",
            "Portable V5 exports",
            "configured zones must not overlap",
            "Modes",
            "select.velair_mode",
            "default schedules",
            "Manual",
        ):
            self.assertIn(required, guide)
        self.assertNotIn("Only one profile is active at a time", usage)

    def test_guide_contains_a_complete_mode_automation_example(self) -> None:
        guide = GUIDE.read_text(encoding="utf-8")

        for required in (
            "## Worked Example: An Away Mode",
            "Away · Living areas",
            "Away · Bedrooms",
            "person.resident",
            "option: Away",
            "option: Default",
            "different zones",
        ):
            self.assertIn(required, guide)

    def test_usage_documents_both_writable_control_entities(self) -> None:
        usage = USAGE.read_text(encoding="utf-8")

        self.assertIn(
            "**Automatic scheduling** and **Mode** are Velair's writable control entities",
            usage,
        )
        self.assertNotIn("Automatic scheduling** is the only writable entity", usage)
        self.assertIn("Deactivate all active Profiles", usage)

    def test_related_guides_cover_profile_controls_and_events(self) -> None:
        readme = README.read_text(encoding="utf-8")
        events = AUTOMATION_EVENTS.read_text(encoding="utf-8")
        manual_testing = MANUAL_TESTING.read_text(encoding="utf-8")

        self.assertIn("[Automation Events](docs/user/automation-events.md)", readme)
        self.assertIn("Profile changes, scheduler mode changes", readme)
        self.assertIn("event: profile_changed", events)
        self.assertIn("'away' in trigger.event.data.profile_ids", events)
        self.assertIn("trigger.event.data.profile_ids == []", events)
        self.assertIn("one Mode select entity", manual_testing)
        self.assertIn("`velair.deactivate_profile`", manual_testing)
        self.assertNotIn("no scheduler mode selector", manual_testing)

    def test_lovelace_active_setup_controls_and_replacement_are_documented(
        self,
    ) -> None:
        guide = GUIDE.read_text(encoding="utf-8")
        readme = README.read_text(encoding="utf-8")
        usage = USAGE.read_text(encoding="utf-8")
        frontend = FRONTEND_GUIDE.read_text(encoding="utf-8")

        for document in (readme, usage, frontend):
            self.assertIn("active_setup_controls", document)
            self.assertIn("view: active-setup", document)
            for value in ("`modes`", "`profiles`", "`both`"):
                self.assertIn(value, document)
        self.assertIn("independently from the scheduler status card", usage)
        self.assertIn(
            "Direct activation never adds a Profile to the existing set",
            guide,
        )
        self.assertIn(
            "Create a Mode that maps",
            guide,
        )

    def test_api_example_keeps_selected_mode_and_active_profiles_consistent(
        self,
    ) -> None:
        api = API.read_text(encoding="utf-8")
        schedule_example = api.split("```json", 1)[1].split("```", 1)[0]

        self.assertIn('"active_profile_ids": ["away"]', schedule_example)
        self.assertIn('"profile_ids": ["away"]', schedule_example)
        self.assertIn('"active_mode_id": "away-mode"', schedule_example)
        self.assertNotIn('"active_profile_ids": ["away", "bedrooms"]', schedule_example)

    def test_service_metadata_uses_the_public_profile_id_term(self) -> None:
        services = SERVICES.read_text(encoding="utf-8")
        profile_service = services.split("activate_profile:", 1)[1].split(
            "\nboost:", 1
        )[0]

        self.assertIn("profile_id:", profile_service)
        self.assertIn("Profile ID", profile_service)
        self.assertNotIn("profile key", profile_service.lower())
        self.assertIn("deactivate_profile:", services)


if __name__ == "__main__":
    unittest.main()
