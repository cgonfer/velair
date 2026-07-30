"""Keep release-facing version metadata synchronized."""

from __future__ import annotations

import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "custom_components" / "velair" / "manifest.json"
FRONTEND_PACKAGE = ROOT / "frontend" / "package.json"
FRONTEND_LOCK = ROOT / "frontend" / "package-lock.json"
README = ROOT / "README.md"
API_GUIDE = ROOT / "docs" / "developer" / "api.md"
RELEASE_NOTES_DIR = ROOT / ".github" / "release-notes"
RELEASE_WORKFLOW = ROOT / ".github" / "workflows" / "release.yml"


class ReleaseMetadataTest(unittest.TestCase):
    """Prevent a release from publishing mismatched version labels."""

    def test_release_version_is_valid_and_synchronized(self) -> None:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        package = json.loads(FRONTEND_PACKAGE.read_text(encoding="utf-8"))
        lock = json.loads(FRONTEND_LOCK.read_text(encoding="utf-8"))
        version = manifest["version"]

        self.assertRegex(version, r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$")
        self.assertEqual(package["version"], version)
        self.assertEqual(lock["version"], version)
        self.assertEqual(lock["packages"][""]["version"], version)

    def test_public_version_examples_match_the_manifest(self) -> None:
        version = json.loads(MANIFEST.read_text(encoding="utf-8"))["version"]
        readme = README.read_text(encoding="utf-8")
        api_guide = API_GUIDE.read_text(encoding="utf-8")

        badge_version = version.replace("-", "--")
        self.assertIn(f"version-{badge_version}-blue", readme)
        self.assertIn(f'"integration": "{version}"', api_guide)
        self.assertIn(version, readme.replace("--", "-"))

    def test_release_workflow_publishes_the_versioned_notes(self) -> None:
        version = json.loads(MANIFEST.read_text(encoding="utf-8"))["version"]
        release_notes_path = RELEASE_NOTES_DIR / f"v{version}.md"
        release_notes = release_notes_path.read_text(encoding="utf-8")
        workflow = RELEASE_WORKFLOW.read_text(encoding="utf-8")

        self.assertFalse((ROOT / "RELEASE_NOTES.md").exists())
        self.assertTrue(release_notes_path.is_file())
        self.assertTrue(release_notes.startswith(f"# Velair {version}\n"))
        allowed_headings = {
            "## ✨ Added",
            "## 🔄 Changed",
            "## 🚀 Improved",
            "## 🛠️ Fixed",
            "## 🧭 Notes",
        }
        headings = re.findall(r"^## .+$", release_notes, flags=re.MULTILINE)
        self.assertIn("## ✨ Added", headings)
        self.assertIn("## 🧭 Notes", headings)
        self.assertEqual(len(headings), len(set(headings)))
        self.assertTrue(set(headings).issubset(allowed_headings))
        for index, heading in enumerate(headings):
            section_start = release_notes.index(heading) + len(heading)
            section_end = (
                release_notes.index(headings[index + 1])
                if index + 1 < len(headings)
                else len(release_notes)
            )
            self.assertRegex(
                release_notes[section_start:section_end],
                r"(?m)^- ",
                f"{heading} must contain user-facing release information",
            )
        self.assertIn(
            'RELEASE_NOTES=".github/release-notes/v${RELEASE_VERSION}.md"',
            workflow,
        )
        self.assertIn('if [ ! -f "$RELEASE_NOTES" ]', workflow)
        self.assertIn('--notes-file "$RELEASE_NOTES"', workflow)

    def test_release_workflow_marks_hyphenated_versions_as_prereleases(
        self,
    ) -> None:
        workflow = RELEASE_WORKFLOW.read_text(encoding="utf-8")

        self.assertIn('*-*) PRERELEASE="true"', workflow)
        self.assertIn('*) PRERELEASE="false"', workflow)
        self.assertIn(
            "RELEASE_PRERELEASE: ${{ steps.version.outputs.prerelease }}",
            workflow,
        )
        self.assertIn('if [ "$RELEASE_PRERELEASE" = "true" ]; then', workflow)
        self.assertIn("CREATE_ARGS+=(--prerelease)", workflow)
        self.assertIn('gh release create "${CREATE_ARGS[@]}"', workflow)


if __name__ == "__main__":
    unittest.main()
