from __future__ import annotations

import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("quality_schedule", ROOT / "scripts/quality/schedule.py")
schedule = importlib.util.module_from_spec(spec)
spec.loader.exec_module(schedule)

KEY, SOURCE = "a" * 64, "b" * 64
IMAGE = "ghcr.io/home-assistant/home-assistant@sha256:" + "e" * 64


def attempt(number, result="pass", key=KEY, **patch):
    run = {"id": number, "run_attempt": 1, "head_sha": "c" * 40, "display_title": "Quality fixed", "event": "schedule", "status": "completed", "conclusion": "success"}
    run.update(patch)
    receipt = {"schemaVersion": 1, "key": key, "repository": "owner/repo", "kind": "fixed", "suite": "extended",
               "sourceFingerprint": SOURCE, "commit": run["head_sha"], "runId": str(number), "runAttempt": "1", "result": result,
               "measurementVerified": result == "pass",
               "configuration": {"suite": "extended", "size": "large", "visual": "capture", "image": IMAGE}}
    return run, receipt


def decision(pairs):
    receipts = {run["id"]: receipt for run, receipt in pairs}
    return schedule.decide(KEY, SOURCE, [run for run, _ in pairs], lambda run: receipts[run["id"]], "owner/repo", "fixed", lambda _rev: SOURCE, "99")


class ScheduledQualityTests(unittest.TestCase):
    def test_manual_execution_bypasses_history_even_when_reuse_would_be_possible(self):
        with tempfile.TemporaryDirectory(prefix="velair-schedule-test-") as directory:
            path = Path(directory) / "receipt.json"
            environment = {"GITHUB_EVENT_NAME": "workflow_dispatch", "GITHUB_SHA": "c" * 40,
                           "GITHUB_OUTPUT": str(Path(directory) / "outputs"), "GITHUB_STEP_SUMMARY": str(Path(directory) / "summary")}
            with patch.dict(os.environ, environment), patch.object(schedule, "source_fingerprint", return_value=SOURCE), \
                    patch.object(schedule, "History", side_effect=AssertionError("Manual dispatch must not query reuse")), \
                    patch.object(schedule.sys, "argv", ["schedule.py", "--receipt", str(path)]):
                schedule.main()
            receipt = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(receipt["action"], "run")
            self.assertEqual(receipt["result"], "pending")

    def test_identical_successful_measurement_is_reused(self):
        result = decision([attempt(1)])
        self.assertFalse(result["run"])
        self.assertEqual(result["verifiedRunId"], "1")

    def test_newer_failure_cancellation_and_pending_receipt_require_retry(self):
        for result, conclusion in (("fail", "failure"), ("pending", "cancelled"), ("pass", "timed_out")):
            with self.subTest(result=result, conclusion=conclusion):
                self.assertTrue(decision([attempt(1), attempt(2, result, conclusion=conclusion)])["run"])

    def test_a_green_omission_does_not_become_measurement_evidence(self):
        self.assertFalse(decision([attempt(1), attempt(2, "skipped")])["run"])
        self.assertTrue(decision([attempt(2, "skipped")])["run"])
        self.assertTrue(decision([attempt(1), attempt(2, "fail", conclusion="failure"), attempt(3, "skipped")])["run"])

    def test_missing_or_mismatched_evidence_does_not_hide_newer_failure(self):
        run, _receipt = attempt(2, "fail", conclusion="failure")
        self.assertTrue(decision([attempt(1), (run, None)])["run"])
        run, receipt = attempt(2)
        receipt["runAttempt"] = "wrong"
        self.assertTrue(decision([attempt(1), (run, receipt)])["run"])

    def test_malformed_retained_receipts_cause_measurement_not_admission_failure(self):
        for name in ("key", "sourceFingerprint"):
            for value in (None, [], {}, 10, "invalid"):
                run, receipt = attempt(2)
                receipt[name] = value
                self.assertTrue(decision([attempt(1), (run, receipt)])["run"])
        for value in (None, [], {"suite": "smoke"}):
            run, receipt = attempt(2)
            receipt["configuration"] = value
            self.assertTrue(decision([attempt(1), (run, receipt)])["run"])

    def test_different_environment_failure_does_not_invalidate_valid_input(self):
        self.assertFalse(decision([attempt(1), attempt(2, "fail", "d" * 64, conclusion="failure")])["run"])

    def test_calibration_cannot_satisfy_nightly_or_become_a_baseline(self):
        run, receipt = attempt(1)
        run["display_title"] = "Quality calibration"
        receipt["kind"] = "calibration"
        self.assertTrue(decision([(run, receipt)])["run"])

    def test_baseline_is_selected_only_from_actual_successful_measurement(self):
        old, old_receipt = attempt(1, key="d" * 64)
        old_receipt["sourceFingerprint"] = "f" * 64
        skipped, skip_receipt = attempt(2, "skipped", key="d" * 64)
        skip_receipt["sourceFingerprint"] = "f" * 64
        result = decision([(old, old_receipt), (skipped, skip_receipt)])
        self.assertTrue(result["run"])
        self.assertEqual(result["baseline"], old["head_sha"])

    def test_mutable_image_is_rejected_but_tag_aliases_share_digest(self):
        with self.assertRaises(ValueError):
            schedule.immutable_image("ghcr.io/home-assistant/home-assistant:stable")
        self.assertEqual(schedule.immutable_image(IMAGE.replace("@", ":stable@")), IMAGE)

    def test_receipt_zip_is_bounded_and_never_extracts_paths(self):
        for names in (("../schedule-receipt.json",), ("schedule-receipt.json", "extra.py")):
            buffer = io.BytesIO()
            with zipfile.ZipFile(buffer, "w") as archive:
                for name in names:
                    archive.writestr(name, "{}")
            with self.assertRaises(ValueError):
                schedule.receipt_from_zip(buffer.getvalue())

    def test_signed_asset_redirect_does_not_receive_api_credentials(self):
        request = urllib.request.Request("https://api.github.com/artifact", headers={"Authorization": "Bearer secret"})
        redirected = schedule.SafeRedirect().redirect_request(request, None, 302, "", {}, "https://assets.example.test/file")
        self.assertIsNone(redirected.get_header("Authorization"))
        with self.assertRaises(ValueError):
            schedule.SafeRedirect().redirect_request(request, None, 302, "", {}, "http://assets.example.test/file")

    def test_documentation_and_generated_build_ids_do_not_remeasure_source(self):
        with tempfile.TemporaryDirectory(prefix="velair-schedule-test-") as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "--quiet", root], check=True)
            def put(path, value):
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(value, encoding="utf-8")
            def tree():
                subprocess.run(["git", "-C", root, "add", "."], check=True)
                return subprocess.check_output(["git", "-C", root, "write-tree"], text=True).strip()
            put("frontend/src/app.ts", "source")
            put("frontend/package-lock.json", "dependencies")
            put("custom_components/velair/frontend/velair-card.js", "build timestamp 1")
            put("docs/guide.md", "documentation")
            catalogue = {"documents": {"docs/guide.md": {"translations": {"es": {"path": "docs/guide.es.md", "sourceHash": "old"}}}}}
            put("docs/translations.json", json.dumps(catalogue))
            first = schedule.source_fingerprint(root, tree())
            put("docs/guide.md", "updated documentation")
            put("custom_components/velair/frontend/velair-card.js", "build timestamp 2")
            catalogue["documents"]["docs/guide.md"]["translations"]["es"]["sourceHash"] = "new"
            catalogue["documents"]["docs/new-guide.md"] = {"translations": {}}
            put("docs/translations.json", json.dumps(catalogue))
            self.assertEqual(first, schedule.source_fingerprint(root, tree()))
            catalogue["documents"]["docs/guide.md"]["translations"]["fr"] = {"path": "docs/guide.fr.md"}
            put("docs/translations.json", json.dumps(catalogue))
            self.assertNotEqual(first, schedule.source_fingerprint(root, tree()))
            put("frontend/package-lock.json", "new dependencies")
            self.assertNotEqual(first, schedule.source_fingerprint(root, tree()))

    def test_finalize_requires_a_real_full_suite_report(self):
        from tests.quality.test_reports import example
        with tempfile.TemporaryDirectory(prefix="velair-schedule-test-") as directory:
            root = Path(directory)
            receipt = attempt(1)[1]
            receipt.update(action="run", configuration={"size": "large", "image": IMAGE}, result="pending")
            receipt_path = root / "schedule-receipt.json"
            report = example()
            report.update(commit=receipt["commit"], suite="extended", environment={"size": "large", "homeAssistantImage": IMAGE})
            report["scenarios"] = [{"id": "load/" + name, "status": "pass", "samples": {},
                                    "measurement": {"seconds": seconds, "durationScale": 1},
                                    "load": {"requested": count, "planned": count, "completed": count, "failed": 0, "observed": count, "expected_observed": count}}
                                   for name, seconds, count in (("idle", 60, 0), ("unrelated_activity", 60, 300), ("combined_activity", 60, 360), ("burst_recovery", 30, 600), ("soak", 1800, 10800))]
            schedule.quality.write(report, root)
            for step_outcome, expected in (("failure", "fail"), ("success", "pass")):
                receipt_path.write_text(json.dumps(receipt), encoding="utf-8")
                schedule.finalize(receipt_path, root, step_outcome)
                self.assertEqual(json.loads(receipt_path.read_text())["result"], expected)
            report["suite"] = "smoke"
            schedule.quality.write(report, root)
            schedule.finalize(receipt_path, root, "success")
            self.assertEqual(json.loads(receipt_path.read_text())["result"], "fail")

    def test_omitted_shortened_or_partial_load_cannot_satisfy_a_long_validation(self):
        from tests.quality.test_reports import example
        report = example()
        report["suite"] = "extended"
        self.assertFalse(schedule.measurement_complete(report, "extended"))
        report["scenarios"] = [{"id": "load/" + name, "status": "pass", "samples": {},
                                "measurement": {"seconds": 1800, "durationScale": 0.01},
                                "load": {"requested": 10, "planned": 10, "completed": 10, "failed": 0, "observed": 10, "expected_observed": 10}}
                               for name in ("idle", "unrelated_activity", "combined_activity", "burst_recovery", "soak")]
        self.assertFalse(schedule.measurement_complete(report, "extended"))
