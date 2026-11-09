"""The public capture pipeline follows homepage demand and preserves user assets."""
import importlib.util
import base64
from hashlib import sha256
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("website_capture", ROOT / "scripts/screenshots/generate.py")
capture = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(capture)


class CaptureContractTest(unittest.TestCase):
    def setUp(self):
        self.plan = json.loads(capture.PLAN_PATH.read_text(encoding="utf-8"))
        self.html = (capture.WEBSITE / "index.html").read_text(encoding="utf-8")

    def test_plan_contains_exactly_the_homepage_images_in_both_themes(self):
        expected = capture.capture_contract(self.plan, self.html)
        self.assertEqual(len(expected), 22)
        self.assertEqual({name.split("/", 1)[1] for name in expected if name.startswith("light/")},
                         {name.split("/", 1)[1] for name in expected if name.startswith("dark/")})

    def test_new_homepage_image_or_unused_plan_entry_requires_an_explicit_decision(self):
        for changed in (self.html + '<img src="assets/screenshots/light/new-feature.png">',
                        self.html.replace("assets/screenshots/dark/modes-desktop.png", "removed.png")):
            with self.subTest(html=changed[-70:]), self.assertRaisesRegex(ValueError, "contract differs"):
                capture.capture_contract(self.plan, changed)

    def test_rejects_escaping_names_and_one_theme_only(self):
        for changes in ({"themes": ["dark"]}, {"language": "es"},
                        {"captures": [{"name": "../private.png"}]}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                capture.capture_contract({**self.plan, **changes}, self.html)

    def test_planned_return_is_isolated_after_household_captures(self):
        self.assertEqual(capture.capture_phases(self.plan), ["household", "return"])
        for captures in ([{"view": "planned-return"}],
                         [{"view": "overview"}, {"view": "planned-return", "phase": "household"}],
                         [{"view": "planned-return", "phase": "return"}, {"view": "overview"}]):
            with self.subTest(captures=captures), self.assertRaises(ValueError):
                capture.capture_phases({"captures": captures})

    def test_supply_requires_its_identifier_before_browser_capture(self):
        plan = {"captures": [{"view": "supply-control"}]}
        with self.assertRaisesRegex(ValueError, "supply_id"):
            capture.validate_scenario({"supply_name": "Downstairs heating"}, plan)
        capture.validate_scenario({"supply_id": "downstairs_supply", "supply_name": "Downstairs heating"}, plan)


class CandidateInstallTest(unittest.TestCase):
    def prepare(self, root):
        output = root / "candidates"
        public = root / "website"
        output.mkdir()
        public.mkdir()
        rows = []
        for name in ("light/overview.png", "dark/overview.png"):
            image = output / name
            image.parent.mkdir()
            image.write_bytes(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6xkAAAAASUVORK5CYII="))
            rows.append({"file": name, "width": 1, "height": 1, "sha256": sha256(image.read_bytes()).hexdigest()})
        (output / "capture-manifest.json").write_text(json.dumps({"captures": rows}))
        return output, public, {row["file"] for row in rows}

    def test_incomplete_or_changed_pairs_are_rejected_before_replacing_any_image(self):
        for failure in ("missing", "changed"):
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as temporary:
                output, public, expected = self.prepare(Path(temporary))
                target = public / "assets/screenshots/light/overview.png"
                target.parent.mkdir(parents=True)
                target.write_bytes(b"existing user screenshot")
                if failure == "missing":
                    (output / "dark/overview.png").unlink()
                else:
                    (output / "dark/overview.png").write_bytes(b"changed")
                with patch.object(capture, "WEBSITE", public), self.assertRaises(ValueError):
                    capture.update_website(output, expected)
                self.assertEqual(target.read_bytes(), b"existing user screenshot")

    def test_installs_validated_pairs_and_provenance_without_removing_unrelated_assets(self):
        with tempfile.TemporaryDirectory() as temporary:
            output, public, expected = self.prepare(Path(temporary))
            sentinel = public / "assets/screenshots/other.png"
            sentinel.parent.mkdir(parents=True)
            sentinel.write_bytes(b"unrelated user asset")
            with patch.object(capture, "WEBSITE", public):
                capture.update_website(output, expected)
            self.assertEqual(sentinel.read_bytes(), b"unrelated user asset")
            for name in expected:
                self.assertEqual((public / "assets/screenshots" / name).read_bytes(), (output / name).read_bytes())
            self.assertTrue((public / "assets/screenshots/capture-manifest.json").is_file())

    def test_reviewed_install_rejects_stale_bundle_or_response_overrides_before_copy(self):
        version = json.loads((ROOT / "custom_components/velair/manifest.json").read_text())["version"]
        bundle_hash = sha256((ROOT / "custom_components/velair/frontend/velair-card.js").read_bytes()).hexdigest()
        valid = {"version": version, "language": "en", "responseOverrides": False, "bundleSha256": bundle_hash}
        for change in ({"version": "old"}, {"language": "es"}, {"responseOverrides": True}, {"bundleSha256": "stale"}):
            with self.subTest(change=change), tempfile.TemporaryDirectory() as temporary:
                output = Path(temporary)
                (output / "capture-manifest.json").write_text(json.dumps({**valid, **change}))
                with patch.object(capture, "update_website") as copy, self.assertRaisesRegex(ValueError, "current English"):
                    capture.install_candidates(output)
                copy.assert_not_called()

    def test_manifest_dimensions_must_match_actual_browser_png_pixels(self):
        with tempfile.TemporaryDirectory() as temporary:
            output, public, expected = self.prepare(Path(temporary))
            path = output / "capture-manifest.json"
            manifest = json.loads(path.read_text())
            manifest["captures"][0]["height"] += 1
            path.write_text(json.dumps(manifest))
            with patch.object(capture, "WEBSITE", public), self.assertRaisesRegex(ValueError, "dimensions"):
                capture.update_website(output, expected)
            self.assertFalse((public / "assets").exists())


if __name__ == "__main__":
    unittest.main()
