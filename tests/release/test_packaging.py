"""Packaging owns its outputs, not unrelated release/recovery directories."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("release_packaging", ROOT / ".github/scripts/package_release.py")
packaging = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(packaging)


class ReleasePackagingTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.release = self.root / ".release"
        self.component = self.root / "custom_components/velair"
        (self.component / "frontend").mkdir(parents=True)
        (self.component / "manifest.json").write_text(json.dumps({"domain": "velair", "version": "1.9.0"}))
        (self.component / "__init__.py").write_bytes(b"# Integration\n")
        (self.component / "frontend/velair-card.js").write_bytes(b"export const version = '1.9.0';\n")
        (self.component / "frontend/velair-card.js.map").write_bytes(b'{"version":3}\n')
        (self.component / "__pycache__").mkdir()
        (self.component / "__pycache__/ignored.pyc").write_bytes(b"cache")
        self.outputs = {"PACKAGE_DIR": self.release / "package", "ARTIFACT_DIR": self.release / "artifacts",
                        "LOVELACE_DIR": self.release / "lovelace"}
        self.patcher = patch.multiple(packaging, ROOT_DIR=self.root, RELEASE_DIR=self.release, **self.outputs)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        for directory in self.outputs.values():
            directory.mkdir(parents=True)
            (directory / "stale.txt").write_text("old generated output")

    def assert_old_outputs_preserved(self):
        for directory in self.outputs.values():
            self.assertEqual((directory / "stale.txt").read_text(), "old generated output")

    def test_packages_refresh_owned_outputs_and_preserve_unrelated_recovery(self):
        recovery = self.release / "quality-recovery/state.json"
        recovery.parent.mkdir()
        recovery.write_text("unrelated recovery handle")
        sentinel = self.release / "maintainer.txt"
        sentinel.write_text("keep")
        packaging.main()
        self.assertEqual(recovery.read_text(), "unrelated recovery handle")
        self.assertEqual(sentinel.read_text(), "keep")
        for directory in self.outputs.values():
            self.assertFalse((directory / "stale.txt").exists())
        with zipfile.ZipFile(self.outputs["ARTIFACT_DIR"] / "velair-custom-component-1.9.0.zip") as archive:
            expected = {"velair/__init__.py", "velair/manifest.json", "velair/frontend/velair-card.js",
                        "velair/frontend/velair-card.js.map"}
            self.assertEqual(set(archive.namelist()), expected)
            for name in expected:
                self.assertEqual(archive.read(name), (self.component.parent / name).read_bytes())
        with zipfile.ZipFile(self.outputs["ARTIFACT_DIR"] / "velair-lovelace-resource-1.9.0.zip") as archive:
            self.assertEqual(set(archive.namelist()), {"velair-card.js", "velair-card.js.map"})
            for name in archive.namelist():
                self.assertEqual(archive.read(name), (self.component / "frontend" / name).read_bytes())

    def test_escaping_output_is_rejected_before_any_cleanup(self):
        outside = self.root / "unrelated"
        outside.mkdir()
        (outside / "keep.txt").write_text("keep")
        with patch.object(packaging, "LOVELACE_DIR", outside), self.assertRaises(ValueError):
            packaging.main()
        self.assert_old_outputs_preserved()
        self.assertEqual((outside / "keep.txt").read_text(), "keep")

    def test_file_collision_is_rejected_before_any_cleanup(self):
        target = self.outputs["LOVELACE_DIR"]
        (target / "stale.txt").unlink()
        target.rmdir()
        target.write_text("unrelated file")
        with self.assertRaises(ValueError):
            packaging.main()
        self.assertEqual(target.read_text(), "unrelated file")
        for name in ("PACKAGE_DIR", "ARTIFACT_DIR"):
            self.assertTrue((self.outputs[name] / "stale.txt").exists())

    def test_symbolic_root_or_output_is_rejected_before_any_cleanup(self):
        # Covers broken links too, without requiring Windows symlink privileges.
        for kind in ("is_symlink", "is_junction"):
            for redirect in (self.release, self.outputs["LOVELACE_DIR"]):
                with self.subTest(kind=kind, redirect=redirect), \
                     patch.object(Path, kind, lambda path: path == redirect, create=True), \
                     self.assertRaises(ValueError):
                    packaging.main()
                self.assert_old_outputs_preserved()


if __name__ == "__main__":
    unittest.main()
