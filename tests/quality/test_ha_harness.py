"""Safety and reproducibility contracts for the disposable HA runner."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

SPEC = importlib.util.spec_from_file_location("quality_ha", Path(__file__).resolve().parents[2] / "scripts/quality/ha.py")
ha = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ha)


class ComponentExtractionTest(unittest.TestCase):
    def test_release_layout_extracts_to_integration_root(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / "component.zip"
            with zipfile.ZipFile(archive, "w") as output:
                output.writestr("velair/manifest.json", '{"domain":"velair"}')
                output.writestr("velair/frontend/velair-card.js", "export {}")
            ha.copy_component(archive, root / "component")
            self.assertTrue((root / "component/frontend/velair-card.js").is_file())
            self.assertFalse((root / "component/velair").exists())

    def test_unsafe_archive_does_not_extract_any_files(self):
        for unsafe in ("velair/../../escape", "/velair/escape", "velair\\..\\escape", "velair/C:/escape", "other/manifest.json"):
            with self.subTest(path=unsafe), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                archive = root / "component.zip"
                with zipfile.ZipFile(archive, "w") as output:
                    output.writestr("velair/manifest.json", "{}")
                    output.writestr(unsafe, "bad")
                with self.assertRaises(ha.HarnessError):
                    ha.copy_component(archive, root / "component")
                self.assertFalse((root / "component").exists())

    def test_symlink_in_archive_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / "component.zip"
            with zipfile.ZipFile(archive, "w") as output:
                item = zipfile.ZipInfo("velair/link")
                item.create_system = 3
                item.external_attr = 0o120777 << 16
                output.writestr(item, "/etc/passwd")
            with self.assertRaises(ha.HarnessError):
                ha.copy_component(archive, root / "component")

    def test_digest_ignores_runtime_bytecode_but_detects_source_change(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "source.py").write_text("value = 1")
            expected = ha.component_digest(root)
            (root / "__pycache__").mkdir()
            (root / "__pycache__/source.pyc").write_bytes(b"runtime")
            self.assertEqual(ha.component_digest(root), expected)
            (root / "source.py").write_text("value = 2")
            self.assertNotEqual(ha.component_digest(root), expected)


class OwnershipTest(unittest.TestCase):
    def test_refuses_unowned_directory(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-") as temporary:
            with self.assertRaises(ha.HarnessError):
                ha.validate_owned_directory({"config_dir": temporary, "run_id": "a" * 32})

    def test_refuses_marker_mismatch(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-") as temporary:
            root = Path(temporary)
            (root / ha.MARKER).write_text(json.dumps({"run_id": "b" * 32}))
            with self.assertRaises(ha.HarnessError):
                ha.validate_owned_directory({"config_dir": temporary, "run_id": "a" * 32})

    def test_accepts_owned_task_directory(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-") as temporary:
            root = Path(temporary)
            state = {"config_dir": temporary, "run_id": "a" * 32}
            (root / ha.MARKER).write_text(json.dumps({"run_id": state["run_id"]}))
            self.assertEqual(ha.validate_owned_directory(state), root.resolve())

    def test_refuses_configuration_nested_outside_temp_root(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-") as temporary:
            root = Path(temporary) / "velair-quality-nested"
            root.mkdir()
            state = {"config_dir": str(root), "run_id": "a" * 32}
            (root / ha.MARKER).write_text(json.dumps({"run_id": state["run_id"]}))
            with self.assertRaises(ha.HarnessError):
                ha.validate_owned_directory(state)

    def test_container_label_must_match_before_stop(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-") as temporary:
            root = Path(temporary)
            state = {"config_dir": str(root), "run_id": "a" * 32, "container": "velair-quality-" + "a" * 32}
            (root / ha.MARKER).write_text(json.dumps({"run_id": state["run_id"]}))
            with patch.object(ha, "docker", side_effect=[state["container"], "another-run"]) as run:
                with self.assertRaises(ha.HarnessError):
                    ha.stop(state)
                self.assertEqual(run.call_count, 2)
                self.assertTrue(root.exists())

    def test_docker_unavailable_does_not_delete_live_configuration(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-") as temporary:
            root = Path(temporary)
            state = {"config_dir": str(root), "run_id": "a" * 32, "container": "velair-quality-" + "a" * 32}
            (root / ha.MARKER).write_text(json.dumps({"run_id": state["run_id"]}))
            with patch.object(ha, "docker", side_effect=ha.HarnessError("unavailable")):
                with self.assertRaises(ha.HarnessError):
                    ha.stop(state)
                self.assertTrue(root.exists())


class ReproducibilityTest(unittest.TestCase):
    def test_public_logs_redact_private_tokens_and_use_logs_subdirectory(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            state = {"container": "fixture", "username": "private-user", "password": "private-password", "access_token": "private-api-token", "oauth_access_token": "private-oauth-token", "refresh_token": "private-refresh-token"}
            with patch.object(ha.subprocess, "run") as run:
                run.return_value.stdout = " ".join(state[key] for key in ("username", "password", "access_token", "oauth_access_token", "refresh_token"))
                run.return_value.stderr = '\nauth_code="unrecorded-secret"'
                ha.sanitized_logs(state, root)
            public = (root / "logs/home-assistant.log").read_text()
            self.assertNotIn("private-", public)
            self.assertNotIn("unrecorded-secret", public)
            self.assertIn("[redacted]", public)

    def test_fixture_sizes_and_stable_capabilities(self):
        small = ha.fixture_entities("small")
        large = ha.fixture_entities("large")
        self.assertEqual(small["climate"], ["climate.quality_heat_01", "climate.quality_cool_02", "climate.quality_range_03"])
        self.assertEqual(len(large["climate"]), 30)
        self.assertEqual([len(small[key]) for key in ("light", "switch", "cover")], [5, 5, 3])
        self.assertEqual([len(large[key]) for key in ("light", "switch", "cover")], [10, 10, 10])
        self.assertEqual(ha.fixture_entities("small"), small)

    def test_six_daily_blocks_respect_each_device_capability(self):
        for entity in ha.fixture_entities("small")["climate"]:
            blocks = ha.schedule_blocks(entity)
            self.assertEqual(len(blocks), 6)
            self.assertEqual(blocks[0]["start"], "00:00")
            if "range" in entity:
                self.assertTrue(all("temperature" not in block and block["target_temp_low"] < block["target_temp_high"] for block in blocks))
            else:
                self.assertTrue(all("temperature" in block and "target_temp_low" not in block for block in blocks))

    def test_private_state_cannot_be_inside_public_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            from types import SimpleNamespace
            root = Path(temporary)
            args = SimpleNamespace(output=root, state_file=root / "state.json")
            with self.assertRaisesRegex(ha.HarnessError, "Private state"):
                ha.start(args)

    def test_failed_preparation_cleans_only_its_owned_config_and_state(self):
        from types import SimpleNamespace
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            component = root / "component"
            component.mkdir()
            (component / "manifest.json").write_text('{"domain":"velair"}')
            args = SimpleNamespace(output=root / "output", state_file=root / "private/state.json", component=component, image="fixture-image", size="small", port=18123)
            created = []
            original = ha.tempfile.mkdtemp

            def make_temp(**kwargs):
                result = original(**kwargs)
                created.append(Path(result))
                return result

            with patch.object(ha, "docker", return_value=""), patch.object(ha, "sanitized_logs"), patch.object(ha, "copy_component", side_effect=ha.HarnessError("invalid component")), patch.object(ha.tempfile, "mkdtemp", side_effect=make_temp):
                with self.assertRaisesRegex(ha.HarnessError, "invalid component"):
                    ha.start(args)
            self.assertEqual(len(created), 1)
            self.assertFalse(created[0].exists())
            self.assertFalse(args.state_file.exists())
            self.assertTrue(component.exists())

    def test_additional_fixture_is_prepared_before_launch_and_failure_is_cleaned(self):
        from types import SimpleNamespace
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            component = root / "component"
            component.mkdir()
            (component / "manifest.json").write_text('{"domain":"velair"}')
            args = SimpleNamespace(output=root / "output", state_file=root / "private/state.json",
                                   component=component, image="fixture-image", size="small", port=18123)
            prepared = []

            def prepare(directory):
                self.assertTrue((directory / "configuration.yaml").is_file())
                self.assertTrue((directory / "custom_components/velair/manifest.json").is_file())
                self.assertTrue((directory / "custom_components/velair_test/manifest.json").is_file())
                prepared.append(directory)
                raise ha.HarnessError("fixture preparation failed")

            with patch.object(ha, "docker", return_value="") as docker, patch.object(ha, "sanitized_logs"):
                with self.assertRaisesRegex(ha.HarnessError, "fixture preparation failed"):
                    ha.start(args, prepare_config=prepare)
            self.assertEqual(len(prepared), 1)
            self.assertFalse(prepared[0].exists())
            self.assertFalse(args.state_file.exists())
            self.assertFalse(any(call.args[0] == "run" for call in docker.call_args_list))


if __name__ == "__main__":
    unittest.main()
