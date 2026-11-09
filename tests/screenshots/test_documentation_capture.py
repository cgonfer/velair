"""Documentation candidates share lifecycle and validation without touching the site."""
from hashlib import sha256
import base64
from contextlib import ExitStack, nullcontext
import importlib.util
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("documentation_capture", ROOT / "scripts/screenshots/generate.py")
capture = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(capture)
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6xkAAAAASUVORK5CYII=")


class DocumentationContractTest(unittest.TestCase):
    def setUp(self):
        self.gallery = capture.DOCUMENTATION_GALLERY.read_text(encoding="utf-8")
        self.names = set(re.findall(r"\.\./\.\./screenshots/([a-z0-9-]+\.png)", self.gallery))
        self.plan = {"schemaVersion": 1, "language": "en", "themes": ["dark"],
                     "captures": [{"name": name, "view": "overview"} for name in sorted(self.names)]}

    def test_keeps_the_exact_flat_gallery_paths_and_three_viewports(self):
        self.assertEqual(len(self.names), 66)
        self.assertEqual(capture.capture_contract(self.plan, self.gallery, "documentation"), self.names)
        for viewport in ("desktop", "tablet", "mobile"):
            self.assertEqual(sum(viewport in name for name in self.names), 22)

    def test_maintained_plan_matches_the_gallery_and_real_phase_order(self):
        plan = json.loads((ROOT / "scripts/screenshots/documentation-plan.json").read_text(encoding="utf-8"))
        self.assertEqual(capture.capture_contract(plan, self.gallery, "documentation"), self.names)
        self.assertEqual(capture.capture_phases(plan, "documentation"),
                         ["household", "external-publishing", "external-error", "diagnostics-errors", "return"])

    def test_new_features_have_three_complete_native_views_and_related_gallery_positions(self):
        plan = json.loads(capture.DOCUMENTATION_PLAN_PATH.read_text(encoding="utf-8"))
        for feature in ("room-groups", "presets", "supply-control", "planned-return"):
            rows = [row for row in plan["captures"] if row["view"] == feature]
            self.assertEqual({row["name"] for row in rows},
                             {f"{feature}-{size}.png" for size in ("desktop", "tablet", "mobile")})
            self.assertEqual({row["width"] for row in rows}, {1440, 820, 390})
            self.assertTrue(all(row["complete"] for row in rows))
            self.assertEqual({row["phase"] for row in rows},
                             {"return" if feature == "planned-return" else "household"})
        # Protect the reading sequence, not just whether the new images exist.
        for before, after in (("room-groups-desktop.png", "schedules-desktop.png"),
                              ("profiles-desktop.png", "presets-desktop.png"),
                              ("presets-desktop.png", "templates-desktop.png"),
                              ("preconditioning-desktop.png", "planned-return-desktop.png"),
                              ("supply-control-desktop.png", "external-settings-desktop.png")):
            with self.subTest(before=before, after=after):
                self.assertLess(self.gallery.index(before), self.gallery.index(after))

    def test_missing_extra_unsafe_and_mismatched_theme_assets_are_rejected(self):
        for changed in ({**self.plan, "themes": ["light", "dark"]},
                        {**self.plan, "captures": self.plan["captures"][:-1]},
                        {**self.plan, "captures": self.plan["captures"] + [{"name": "unused.png"}]},
                        {**self.plan, "captures": [{"name": "../private.png"}]},
                        {**self.plan, "captures": [{"name": "dark/overview-desktop.png"}]}):
            with self.subTest(changes=changed), self.assertRaises(ValueError):
                capture.capture_contract(changed, self.gallery, "documentation")

    def test_stateful_phases_cannot_reorder_or_capture_return_before_other_views(self):
        plan = {"captures": [{"view": "overview"}, {"view": "external", "phase": "external-publishing"},
                             {"view": "external", "phase": "external-error"},
                             {"view": "diagnostics", "phase": "diagnostics-errors"},
                             {"view": "planned-return", "phase": "return"}]}
        self.assertEqual(capture.capture_phases(plan, "documentation"),
                         ["household", "external-publishing", "external-error", "diagnostics-errors", "return"])
        for phases in (("household", "return"), ("external-publishing",),
                       ("household", "diagnostics-errors", "external-error"),
                       ("household", "external-error", "household")):
            with self.subTest(phases=phases), self.assertRaises(ValueError):
                capture.capture_phases({"captures": [{"view": "overview", "phase": phase} for phase in phases]}, "documentation")
        for collection in ("website", "documentation"):
            for captures in ([{"view": "overview"}, {"view": "planned-return"}],
                             [{"view": "overview"}, {"view": "planned-return", "phase": "return"}, {"view": "overview"}]):
                with self.subTest(collection=collection, captures=captures), self.assertRaises(ValueError):
                    capture.capture_phases({"captures": captures}, collection)

    def test_new_native_views_require_their_real_household_metadata(self):
        for view, keys in (("profiles", ("profile_key", "profile_name", "schedule_entity")),
                           ("climate-card", ("dashboard_path",)),
                           ("sensors-holding", ("holding_name", "holding_entity")),
                           ("comfort", ("comfort_name",)),
                           ("room-groups", ("room_group", "group_name")),
                           ("presets", ("preset_name",)),
                           ("supply-control", ("supply_id", "supply_name")),
                           ("planned-return", ("arrival_at", "planned_return_destination"))):
            plan = {"captures": [{"view": view}]}
            values = {key: "Example" for key in keys}
            capture.validate_scenario(values, plan)
            for key in keys:
                with self.subTest(view=view, missing=key), self.assertRaisesRegex(ValueError, key):
                    capture.validate_scenario({name: value for name, value in values.items() if name != key}, plan)


class DocumentationInstallTest(unittest.TestCase):
    def prepare(self, root):
        output, docs, web = root / "candidates", root / "screenshots", root / "website"
        for directory in (output, docs, web):
            directory.mkdir()
        names = {"overview-desktop.png", "overview-mobile.png"}
        rows = []
        for name in names:
            (output / name).write_bytes(PNG)
            rows.append({"file": name, "width": 1, "height": 1, "sha256": sha256(PNG).hexdigest()})
        version = json.loads((ROOT / "custom_components/velair/manifest.json").read_text())["version"]
        bundle = sha256((ROOT / "custom_components/velair/frontend/velair-card.js").read_bytes()).hexdigest()
        manifest = {"collection": "documentation", "version": version, "language": "en",
                    "bundleSha256": bundle, "responseOverrides": False, "captures": rows}
        (output / "capture-manifest.json").write_text(json.dumps(manifest))
        return output, docs, web, names, manifest

    def test_reviewed_docs_install_preserves_website_and_unrelated_user_images(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output, docs, web, names, _ = self.prepare(root)
            sentinel = web / "assets/screenshots/dark/overview-desktop.png"
            sentinel.parent.mkdir(parents=True)
            sentinel.write_bytes(b"existing website screenshot")
            (docs / "unrelated.png").write_bytes(b"unrelated user screenshot")
            plan = root / "documentation-plan.json"
            plan.write_text(json.dumps({"schemaVersion": 1, "language": "en", "themes": ["dark"],
                                        "captures": [{"name": name} for name in names]}))
            gallery = root / "screenshots.md"
            gallery.write_text("\n".join(f"![Screenshot](../../screenshots/{name})" for name in names))
            with patch.object(capture, "DOCUMENTATION_PLAN_PATH", plan), \
                 patch.object(capture, "DOCUMENTATION_GALLERY", gallery), \
                 patch.object(capture, "DOCUMENTATION_SCREENSHOTS", docs), patch.object(capture, "WEBSITE", web):
                capture.install_candidates(output, "documentation")
            self.assertEqual(sentinel.read_bytes(), b"existing website screenshot")
            self.assertEqual((docs / "unrelated.png").read_bytes(), b"unrelated user screenshot")
            for name in names:
                self.assertEqual((docs / name).read_bytes(), PNG)
            self.assertEqual((docs / "capture-manifest.json").read_bytes(), (output / "capture-manifest.json").read_bytes())

    def test_missing_modified_or_wrong_size_docs_are_rejected_before_any_copy(self):
        for problem in ("missing", "changed", "dimensions"):
            with self.subTest(problem=problem), tempfile.TemporaryDirectory() as temporary:
                output, docs, _, names, manifest = self.prepare(Path(temporary))
                first = sorted(names)[0]
                (docs / first).write_bytes(b"existing user screenshot")
                if problem == "missing":
                    (output / first).unlink()
                elif problem == "changed":
                    (output / first).write_bytes(b"changed")
                else:
                    manifest["captures"][0]["height"] += 1
                    (output / "capture-manifest.json").write_text(json.dumps(manifest))
                with patch.object(capture, "DOCUMENTATION_SCREENSHOTS", docs), self.assertRaises(ValueError):
                    capture.update_collection(output, names, "documentation")
                self.assertEqual((docs / first).read_bytes(), b"existing user screenshot")
                self.assertFalse((docs / "capture-manifest.json").exists())

    def test_docs_and_website_manifests_cannot_cross_collections(self):
        for recorded in (None, "website"):
            with self.subTest(collection=recorded), tempfile.TemporaryDirectory() as temporary:
                output, docs, _, names, manifest = self.prepare(Path(temporary))
                manifest.pop("collection")
                if recorded:
                    manifest["collection"] = recorded
                (output / "capture-manifest.json").write_text(json.dumps(manifest))
                with patch.object(capture, "DOCUMENTATION_SCREENSHOTS", docs), self.assertRaisesRegex(ValueError, "collection differs"):
                    capture.update_collection(output, names, "documentation")
                self.assertFalse(any(docs.iterdir()))

    def test_unknown_collections_and_escaping_install_paths_are_rejected(self):
        with self.assertRaises(ValueError):
            capture.collection_sources("demo")
        for name in ("../user.png", "/absolute.png", "dark/overview.png"):
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, "Unsafe"):
                capture.update_collection(Path("unused"), {name}, "documentation")


class DocumentationLifecycleTest(unittest.TestCase):
    def test_documentation_uses_the_shared_owned_lifecycle_and_prepares_each_phase(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            private = root / "private"
            private.mkdir()
            output = root / "candidates"
            plan_path = root / "plan.json"
            plan_path.write_text(json.dumps({"schemaVersion": 1, "language": "en", "themes": ["dark"],
                "captures": [{"name": "overview-desktop.png", "view": "overview"},
                             {"name": "external-error-desktop.png", "view": "external", "phase": "external-error"},
                             {"name": "planned-return-desktop.png", "view": "planned-return", "phase": "return"}]}))
            gallery = root / "gallery.md"
            gallery.write_text("![Overview](../../screenshots/overview-desktop.png)\n![Error](../../screenshots/external-error-desktop.png)\n![Return](../../screenshots/planned-return-desktop.png)")
            state = {"image": "pinned-ha", "component_sha256": "component"}
            browser = {"endpoint": "ws://127.0.0.1:8124/renderer", "image": "pinned-browser"}
            scenario = {"external_name": "Guest Room", "provenance": {"devices": "Virtual HA entities"}}
            phase_calls, browser_calls, cleanup_calls = [], [], []

            def start(args, **kwargs):
                from documentation_scenario import prepare_documentation_fixture
                capture.ha.write_private(args.state_file, state)
                self.assertIs(kwargs["prepare_config"], prepare_documentation_fixture)

            def prepare(_state, metadata, phase):
                phase_calls.append(phase)
                return {**metadata, "prepared_phase": phase, "arrival_at": "2026-11-09T20:00:00+01:00",
                        "planned_return_destination": "Home"}

            def render(command, **kwargs):
                self.assertEqual(Path(command[1]), ROOT / "scripts/screenshots/browser/capture-documentation.mjs")
                self.assertTrue(Path(command[1]).is_file())
                self.assertEqual(kwargs["cwd"], ROOT)
                env = kwargs["env"]
                browser_calls.append((Path(command[1]).name, env["VELAIR_CAPTURE_PHASE"], env["VELAIR_CAPTURE_APPEND"], env["VELAIR_CAPTURE_COLLECTION"]))
                (output / "capture-manifest.json").write_text(json.dumps({"captures": []}))
                return type("Result", (), {"returncode": 0})()

            with ExitStack() as patches:
                for name, value in (("DOCUMENTATION_PLAN_PATH", plan_path), ("DOCUMENTATION_GALLERY", gallery),
                                    ("private_runtime", lambda: nullcontext(str(private))), ("seed", lambda _state: scenario)):
                    patches.enter_context(patch.object(capture, name, value))
                patches.enter_context(patch.object(capture.ha, "start", start))
                patches.enter_context(patch.object(capture.ha, "read_state", return_value=state))
                stop = patches.enter_context(patch.object(capture.ha, "stop", side_effect=lambda _state: cleanup_calls.append("stop")))
                patches.enter_context(patch.object(capture.quality_browser, "server", return_value=nullcontext(browser)))
                patches.enter_context(patch.object(capture.subprocess, "run", side_effect=render))
                patches.enter_context(patch.object(sys.modules["scenario"], "prepare_documentation_phase", prepare, create=True))
                patches.enter_context(patch.object(sys.modules["scenario"], "cleanup_documentation", side_effect=lambda _state: cleanup_calls.append("transport"), create=True))
                capture.generate(output, collection="documentation")

            self.assertEqual(phase_calls, ["household", "external-error", "return"])
            self.assertEqual(browser_calls, [("capture-documentation.mjs", "household", "0", "documentation"),
                                             ("capture-documentation.mjs", "external-error", "1", "documentation"),
                                             ("capture-documentation.mjs", "return", "1", "documentation")])
            stop.assert_called_once_with(state)
            self.assertEqual(cleanup_calls, ["transport", "stop"])
            self.assertFalse((private / "ha-state.json").exists())
            manifest = json.loads((output / "capture-manifest.json").read_text())
            self.assertEqual(manifest["collection"], "documentation")
            self.assertEqual(manifest["browserImage"], "pinned-browser")
            self.assertIs(manifest["responseOverrides"], False)


if __name__ == "__main__":
    unittest.main()
