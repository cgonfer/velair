from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from tests.quality.test_reports import example

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/quality"))
spec = importlib.util.spec_from_file_location("quality_calibrate", ROOT / "scripts/quality/calibrate.py")
calibrate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(calibrate)


class CalibrationBatchTests(unittest.TestCase):
    def test_boolean_policy_cannot_reduce_the_required_ten_runs_to_one(self):
        with patch.object(calibrate.quality, "read_json", return_value={"rollout": {"requiredStableRuns": True}}):
            with self.assertRaises(ValueError):
                calibrate.execute_batch(SimpleNamespace())

    def batch(self, patch=None):
        calls = []
        def execute(args, component, output):
            index = len(calls)
            calls.append(output)
            report = example()
            report.update(suite="calibration", visualStatus="compared", invocationId=str(index), componentSha256="e" * 64,
                          generatedAt=f"2026-11-07T12:00:{index:02}+00:00")
            if patch:
                patch(index, report)
            return report
        with tempfile.TemporaryDirectory(prefix="velair-calibration-test-") as directory:
            args = SimpleNamespace(component=ROOT / "custom_components/velair", output=Path(directory))
            outcome = calibrate.execute_batch(args, execute)
            report = calibrate.quality.read_json(args.output / "quality-report.json")
        return calls, outcome, report

    def test_ten_real_invocations_required_without_automatic_gate_activation(self):
        calls, code, report = self.batch()
        self.assertEqual(len(calls), 10)
        self.assertEqual(code, 0)
        self.assertTrue(report["calibration"]["eligibleForReview"])
        self.assertFalse(report["calibration"]["automaticActivation"])

    def test_failure_stops_batch_instead_of_retrying_into_green(self):
        def patch(index, report):
            if index == 2:
                report["outcome"] = report["status"] = "fail"
        calls, code, report = self.batch(patch)
        self.assertEqual(len(calls), 3)
        self.assertEqual(code, 1)
        self.assertFalse(report["calibration"]["eligibleForReview"])

    def test_captures_do_not_count_as_approved_visual_comparisons(self):
        calls, code, _ = self.batch(lambda _i, report: report.update(visualStatus="capture-unreviewed"))
        self.assertEqual(len(calls), 1)
        self.assertEqual(code, 1)

    def test_changed_environment_or_component_interrupts_consecutive_evidence(self):
        for field in ("environment", "componentSha256"):
            def patch(index, report):
                if index == 1:
                    report[field] = {"fingerprint": "other"} if field == "environment" else "f" * 64
            calls, code, _ = self.batch(patch)
            self.assertEqual(len(calls), 2)
            self.assertEqual(code, 1)
