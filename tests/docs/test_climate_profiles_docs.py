"""Climate Profiles documentation contract tests."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
GUIDE = ROOT / "docs" / "user" / "climate-profiles.md"
DOCS_INDEX = ROOT / "docs" / "README.md"
USAGE = ROOT / "docs" / "user" / "usage.md"
SERVICES = ROOT / "custom_components" / "velair" / "services.yaml"


class ClimateProfilesDocumentationTest(unittest.TestCase):
    """Keep the public guide aligned with the supported V1 contract."""

    def test_guide_is_linked_and_covers_runtime_contract(self) -> None:
        self.assertTrue(GUIDE.is_file())
        guide = GUIDE.read_text(encoding="utf-8")
        docs_index = DOCS_INDEX.read_text(encoding="utf-8")
        usage = USAGE.read_text(encoding="utf-8")

        self.assertIn("Climate Profiles](user/climate-profiles.md)", docs_index)
        self.assertIn("Climate Profiles](climate-profiles.md)", usage)
        for required in (
            "Normal",
            "velair.activate_profile",
            "Boosts in affected zones are cancelled",
            "Global and per-zone pauses take priority",
            "Apply active schedule after startup",
            "Portable exports",
            "one active profile at a time",
            "automatic binding to a helper",
        ):
            self.assertIn(required, guide)

    def test_service_metadata_uses_the_public_profile_id_term(self) -> None:
        services = SERVICES.read_text(encoding="utf-8")
        profile_service = services.split("activate_profile:", 1)[1].split(
            "\nboost:", 1
        )[0]

        self.assertIn("profile_id:", profile_service)
        self.assertIn("Profile ID", profile_service)
        self.assertNotIn("profile key", profile_service.lower())


if __name__ == "__main__":
    unittest.main()
