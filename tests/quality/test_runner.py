from __future__ import annotations

import importlib.util
from pathlib import Path
import stat
import contextlib
import io
import shutil
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import zipfile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("quality_runner", ROOT / "scripts/quality/run.py")
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class QualityArchiveTests(unittest.TestCase):
    def test_approved_visual_comparison_is_independent_of_pr_blocking(self):
        for rollout in ('observe', 'enforce'):
            lock = {'rollout': {'mode': rollout}, 'visual': {'mode': 'compare'}}
            self.assertEqual(runner.resolve_visual_policy('policy', lock), 'compare')
            self.assertEqual(runner.resolve_visual_policy('capture', lock), 'capture')
            self.assertEqual(runner.resolve_visual_policy('off', lock), 'off')
        self.assertEqual(runner.resolve_visual_policy('policy', {}), 'capture')
        for value, lock in [('unknown', {}), ('policy', {'visual': {'mode': 'unknown'}})]:
            with self.subTest(value=value, lock=lock), self.assertRaises(ValueError):
                runner.resolve_visual_policy(value, lock)

    def test_failed_teardown_preserves_private_recovery_state(self):
        with contextlib.redirect_stderr(io.StringIO()) as errors:
            with runner.private_runtime() as private:
                state = private / "ha-state.json"
                state.write_text('{"container":"owned-test"}', encoding="utf-8")
        try:
            self.assertTrue(state.is_file())
            self.assertIn(str(state), errors.getvalue())
            self.assertNotIn("owned-test", errors.getvalue())
        finally:
            shutil.rmtree(private)

    def test_zip_traversal_and_links_are_rejected_before_extraction(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-test-") as directory:
            target = Path(directory)
            for name in ("../outside", "/absolute", "velair/../outside", "velair\\outside", "velair/a:b"):
                archive = target / "bad.zip"
                with zipfile.ZipFile(archive, "w") as package:
                    package.writestr(name, "bad")
                with self.assertRaises(ValueError):
                    runner.extract_component(archive, target / "output")
            with zipfile.ZipFile(archive, "w") as package:
                member = zipfile.ZipInfo("velair/symlink")
                member.external_attr = (stat.S_IFLNK | 0o777) << 16
                package.writestr(member, "../../outside")
            with self.assertRaises(ValueError):
                runner.extract_component(archive, target / "output")

    def test_archive_requires_frontend_and_manifest(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-test-") as directory:
            root = Path(directory)
            archive = root / "component.zip"
            with zipfile.ZipFile(archive, "w") as package:
                package.writestr("velair/manifest.json", "{}")
                package.writestr("velair/frontend/velair-card.js", "export {}")
            result = runner.extract_component(archive, root / "unpack")
            self.assertEqual(result.name, "velair")
            self.assertTrue((result / "manifest.json").is_file())

    def test_failed_first_attempt_is_not_hidden_by_retry(self):
        raw = {"suites": [{"specs": [{"title": "save", "tests": [{"projectName": "mobile", "expectedStatus": "passed", "results": [
            {"status": "failed", "duration": 100}, {"status": "passed", "duration": 10}]}]}]}]}
        self.assertEqual(runner.browser_scenarios(raw)[0]["status"], "fail")

    def test_functional_checks_do_not_collect_performance_samples(self):
        raw = {"suites": [{"specs": [{"title": "save", "tests": [{"projectName": "mobile", "expectedStatus": "passed", "results": [{"status": "passed", "duration": 1234}]}]}]}]}
        scenario = runner.browser_scenarios(raw)[0]
        self.assertEqual(scenario['status'], 'pass')
        self.assertEqual(scenario['samples'], {})

    def test_metric_semantics_changes_invalidate_measurement_comparisons(self):
        args = SimpleNamespace(image=None, size='small', suite='smoke')
        lock = runner.quality.read_json(runner.LOCK)
        original = runner.measurement_environment(lock, args)
        digest = runner.quality.digest
        with patch.object(runner.quality, 'digest', side_effect=lambda path: 'b' * 64 if Path(path).name == 'metrics.json' else digest(path)):
            changed = runner.measurement_environment(lock, args)
        self.assertIn(str(Path('scripts/quality/metrics.json')), original['definitions'])
        self.assertNotEqual(original['fingerprint'], changed['fingerprint'])

    def test_browser_action_annotations_and_safe_failed_steps_survive_collection(self):
        raw = {"suites": [{"specs": [{"title": "a renamed test title", "tests": [{
            "projectName": "mobile", "expectedStatus": "passed", "annotations": [
                {"type": "velair-action", "description": "schedule.edit-save"},
                {"type": "velair-variant", "description": "cooling"}],
            "results": [{"status": "failed", "duration": 50, "steps": [{"title": "schedule.save", "error": {"message": "secret-token"}, "steps": [{"title": "unsafe secret-token", "error": {"message": "secret-token"}}]}]}]
        }]}]}]}
        result = runner.browser_scenarios(raw)[0]
        self.assertEqual(result["actionId"], "schedule.edit-save")
        self.assertEqual(result["actionVariant"], "cooling")
        self.assertEqual(result["project"], "mobile")
        self.assertEqual(result["failureStep"], "schedule.save")
        self.assertEqual(result["status"], "fail")
        self.assertNotIn("secret-token", str(result))
        test = raw["suites"][0]["specs"][0]["tests"][0]
        test["results"] = [{"status": "skipped", "duration": 0}]
        skipped = runner.browser_scenarios(raw)[0]
        self.assertEqual(skipped["status"], "not-run")
        self.assertEqual(skipped["actionId"], "schedule.edit-save")
        self.assertNotIn("failureStep", skipped)

    def test_expected_failure_is_not_a_working_product_action(self):
        raw = {"suites": [{"specs": [{"title": "expected failure", "tests": [{"projectName": "desktop", "expectedStatus": "failed", "results": [{"status": "failed", "duration": 10}]}]}]}]}
        self.assertEqual(runner.browser_scenarios(raw)[0]["status"], "fail")
        raw["suites"][0]["specs"][0]["tests"][0]["results"][0]["status"] = "passed"
        self.assertEqual(runner.browser_scenarios(raw)[0]["status"], "fail")

    def test_unknown_annotations_and_unapproved_failed_steps_are_not_exported(self):
        test = {"projectName": "desktop", "expectedStatus": "passed", "annotations": [
            {"type": "velair-action", "description": "unknown-secret"}, {"type": "velair-variant", "description": "default"}],
            "results": [{"status": "failed", "duration": 10, "steps": [{"title": "secret-step", "error": {"message": "secret-token"}}]}]}
        raw = {"suites": [{"specs": [{"title": "unknown", "tests": [test]}]}]}
        result = runner.browser_scenarios(raw)[0]
        self.assertEqual(result["actionId"], "unclassified")
        self.assertNotIn("failureStep", result)
        test["annotations"][0]["description"] = "schedule.restart"
        result = runner.browser_scenarios(raw)[0]
        self.assertEqual(result["actionId"], "schedule.restart")
        self.assertNotIn("failureStep", result)
        test["annotations"].append({"type": "velair-action", "description": "help.open-close"})
        result = runner.browser_scenarios(raw)[0]
        self.assertEqual(result["actionId"], "unclassified")

    def test_failed_load_keeps_only_its_catalogue_approved_failure_step(self):
        source = {"id": "combined_activity", "status": "failed", "samples": {}, "failureStep": "activity.edit-save"}
        result = runner.load_scenario(source)
        self.assertEqual(result["actionId"], "household.use-velair")
        self.assertEqual(result["actionVariant"], "steady")
        self.assertEqual(result["project"], "desktop")
        self.assertEqual(result["failureStep"], "activity.edit-save")
        source["failureStep"] = "secret-token"
        self.assertNotIn("failureStep", runner.load_scenario(source))

    def test_container_memory_units_are_explicit(self):
        self.assertEqual(runner.human_bytes("2 MiB"), 2 * 1024**2)
        self.assertEqual(runner.human_bytes("2 MB"), 2_000_000)
        with self.assertRaises(ValueError):
            runner.human_bytes("2 bananas")

    def test_load_report_keeps_browser_work_and_recovery_metrics(self):
        scenario = runner.load_scenario({"id": "noise", "status": "passed", "samples": {},
                                        "browser": {"updates": 2, "velair_requests": 1, "heap_after_recovery_bytes": 1024}})
        self.assertEqual(scenario["samples"]["browser_updates"], [2])
        self.assertEqual(scenario["samples"]["browser_velair_requests"], [1])
        self.assertEqual(scenario["samples"]["browser_heap_after_recovery_bytes"], [1024])

    def test_compare_flag_alone_does_not_claim_visual_coverage(self):
        self.assertEqual(runner.visual_status({}, "compare", 0), "missing-reference-or-failure")
        proof = {"mode": "compare", "failed": 0, "compared": 0, "executions": []}
        self.assertEqual(runner.visual_status(proof, "compare", 0), "incomplete-visual-evidence")
        proof["executions"] = [{"project": project, "name": f"{surface}-{theme}", "status": "compared"}
                               for project in ("desktop", "mobile", "tablet") for surface in ("overview", "editor", "dialog") for theme in ("light", "dark")]
        proof["compared"] = len(proof["executions"])
        self.assertEqual(runner.visual_status(proof, "compare", 0), "compared")
        self.assertNotEqual(runner.visual_status(proof, "compare", 1), "compared")

    def test_failure_call_logs_do_not_publish_ephemeral_password_or_tokens(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-test-") as directory:
            output = Path(directory)
            path = output / "playwright.json"
            path.write_text('{"error":"fill(secret-password), token=secret-token"}', encoding="utf-8")
            runner.sanitize_browser_outputs(output, {"password": "secret-password", "access_token": "secret-token"})
            self.assertNotIn("secret-password", path.read_text(encoding="utf-8"))
            self.assertNotIn("secret-token", path.read_text(encoding="utf-8"))

    def test_visual_matrix_rejects_duplicates_mixed_statuses_and_recorded_repeats(self):
        rows = [{"project": project, "name": f"{surface}-{theme}", "status": "recorded"}
                for project in ("desktop", "mobile", "tablet") for surface in ("overview", "editor", "dialog") for theme in ("light", "dark")]
        proof = {"mode": "compare", "failed": 0, "recorded": 18, "executions": rows}
        self.assertTrue(runner.complete_visual_matrix(proof, "compare", "recorded"))
        self.assertFalse(runner.complete_visual_matrix(proof, "compare", "compared"))
        for changes in ({"executions": rows[:-1] + [rows[0]]}, {"executions": rows + [rows[0]]},
                        {"captured": 1}, {"recorded": True}, {"failed": 1}):
            with self.subTest(changes=changes):
                self.assertFalse(runner.complete_visual_matrix({**proof, **changes}, "compare", "recorded"))
