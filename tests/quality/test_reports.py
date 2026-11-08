from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("quality_reports", ROOT / "scripts/quality/report.py")
reports = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reports)


def example():
    return {"schemaVersion": 1, "status": "unreviewed", "outcome": "pass", "commit": "a" * 40,
            "suite": "smoke", "visualStatus": "capture-unreviewed", "environment": {"fingerprint": "fixed"},
            "scenarios": [{"id": "load/combined_activity", "status": "pass", "samples": {"save_persist_ms": [10, 20, 30]},
                           "load": {"requested": 3, "completed": 3, "observed": 3, "expected_observed": 3}}],
            "artifacts": [], "limitations": []}


class QualityReportTests(unittest.TestCase):
    def test_action_scope_and_draft_evidence_survive_only_complete_matching_repeats(self):
        report = example()
        report['actionEvidenceVersion'] = 2
        report['scenarios'][0]['editingEvidence'] = 'draft-preserved-during-updates'
        same = reports.combine_repetitions([report, copy.deepcopy(report)])
        self.assertEqual(same['scenarios'][0]['editingEvidence'], 'draft-preserved-during-updates')
        missing = copy.deepcopy(report)
        missing['scenarios'][0].pop('editingEvidence')
        self.assertNotIn('editingEvidence', reports.combine_repetitions([report, missing])['scenarios'][0])
        old = copy.deepcopy(report)
        old.pop('actionEvidenceVersion')
        mixed = reports.combine_repetitions([report, old])
        self.assertIsNone(mixed['environment']['fingerprint'])
        self.assertEqual([item['actionEvidenceVersion'] for item in mixed['executions']], [2, 1])
        for value in (True, None, 3, '2'):
            report['actionEvidenceVersion'] = value
            with self.assertRaisesRegex(ValueError, 'action evidence version'):
                reports.validate(report)

    def test_incomplete_load_cannot_be_a_pass(self):
        report = example()
        report["scenarios"][0]["load"]["observed"] = 2
        with self.assertRaisesRegex(ValueError, "Incomplete load"):
            reports.validate(report)

    def test_bad_metrics_and_oversized_reports_are_rejected(self):
        for value in (float("nan"), float("inf"), -1, True, "10"):
            report = example()
            report["scenarios"][0]["samples"]["save_persist_ms"] = [value]
            with self.assertRaises(ValueError):
                reports.validate(report)
        with tempfile.TemporaryDirectory(prefix="velair-quality-test-") as directory:
            path = Path(directory) / "input.json"
            path.write_text(" " * 101, encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "size limit"):
                reports.read_json(path, 100)

    def test_unreviewed_visuals_are_explicit_and_markdown_escaped(self):
        report = example()
        report["scenarios"][0]["id"] = "<script>alert('x')</script>|`"
        rendered = reports.markdown(report)
        self.assertNotIn("<script>", rendered)
        self.assertIn("&lt;script&gt;", rendered)
        self.assertIn("capture-unreviewed", rendered)
        self.assertNotIn("insufficient samples", rendered)

    def test_small_samples_do_not_claim_p95(self):
        self.assertIsNone(reports.summarize([1] * 99)["p95"])
        self.assertEqual(reports.summarize(list(range(100)))["p95"], 94)

    def test_finite_extremes_cannot_produce_nonfinite_public_statistics(self):
        import math
        report = example()
        report['scenarios'][0]['samples']['save_persist_ms'] = [1e308, 1e308]
        self.assertEqual(reports.summarize([1e308, 1e308])['median'], 1e308)
        self.assertNotIn('inf ms', reports.markdown(report))
        baseline = example()
        baseline['scenarios'][0]['samples']['save_persist_ms'] = [1e-308]
        comparison = reports.compare(baseline, report)
        self.assertIsNone(comparison['metrics'][0]['changePercent'])
        self.assertTrue(math.isfinite(comparison['metrics'][0]['candidate']['median']))
        json.dumps(comparison, allow_nan=False)

    def test_only_eligible_operation_timings_display_percentiles(self):
        report = example()
        for count in (1, 99, 100):
            report['scenarios'][0]['samples'] = {'save_persist_ms': [10] * count, 'browser_heap_bytes': [1048576] * 100}
            rows = reports.measurement_rows(report)
            latency, memory = rows
            self.assertEqual('p95' in latency['value'], count == 100)
            self.assertNotIn('p95', memory['value'])
            self.assertIn('1 MiB', memory['value'])
            if count == 1:
                self.assertIn('10 ms observed', latency['value'])
                self.assertNotIn('median', latency['value'])
            rendered = reports.markdown(report)
            self.assertNotIn('insufficient samples', rendered)
            self.assertNotIn('| p95 |', rendered)

    def test_counter_and_snapshot_repetitions_remain_per_execution_readings(self):
        report = example()
        report['scenarios'][0]['samples'] = {'browser_velair_requests': [0], 'browser_heap_after_recovery_bytes': [1048576]}
        other = copy.deepcopy(report)
        other['scenarios'][0]['samples'] = {'browser_velair_requests': [10], 'browser_heap_after_recovery_bytes': [2097152]}
        combined = reports.combine_repetitions([report, other])
        rows = reports.measurement_rows(combined)
        self.assertEqual(rows[0]['recorded'], '2 execution totals')
        self.assertEqual(rows[0]['value'], 'Per execution: 0 requests, 10 requests')
        self.assertEqual(rows[1]['value'], 'Per execution: 1 MiB, 2 MiB')
        self.assertEqual(combined['scenarios'][0]['runMedians'], {})
        self.assertEqual(reports.compare(combined, combined)['status'], 'not-comparable')

    def test_legacy_functional_unknown_and_wrong_scope_metrics_remain_raw_only(self):
        report = example()
        report['scenarios'] = [
            {'id': 'browser/desktop/save', 'status': 'pass', 'samples': {'test_duration_ms': [99], 'save_persist_ms': [200]}},
            {'id': 'load/idle', 'status': 'pass', 'samples': {'interaction_ms': [], 'save_persist_ms': [], 'service_roundtrip_ms': [], 'mystery': [123]}}]
        original = copy.deepcopy(report)
        self.assertEqual(reports.measurement_rows(report), [])
        self.assertEqual(reports.compare(report, report)['status'], 'not-comparable')
        self.assertNotIn('test_duration_ms', reports.markdown(report))
        self.assertEqual(report, original)

    def test_empty_failed_and_zero_are_distinct(self):
        report = example()
        report['scenarios'][0]['samples'] = {'save_persist_ms': [], 'browser_updates': [0]}
        missing, zero = reports.measurement_rows(report)
        self.assertEqual(missing['value'], 'Not recorded.')
        self.assertEqual(zero['value'], '0 updates')
        report['scenarios'][0]['status'] = 'fail'
        for row in reports.measurement_rows(report):
            self.assertEqual(row['value'], 'Unavailable: scenario fail.')

    def test_metric_policy_covers_every_current_collected_measurement(self):
        from tests.quality.test_runner import runner
        row = runner.load_scenario({'id': 'combined_activity', 'status': 'passed', 'samples': dict.fromkeys([
            'service_roundtrip_ms', 'interaction_ms', 'save_persist_ms', 'ha_event_loop_lag_ms', 'browser_heap_bytes', 'browser_task_ms'], [1]),
            'browser': dict.fromkeys(['updates', 'long_tasks', 'long_task_duration_ms', 'heap_after_load_bytes', 'heap_after_recovery_bytes', 'velair_requests'], 1)})
        for name in row['samples']:
            self.assertIsNotNone(reports.metric_definition(row['id'], name), name)
        for name in runner.Resources('unused').samples:
            self.assertIsNotNone(reports.metric_definition('resources/home-assistant', name), name)

    def test_comparisons_exclude_counters_unknowns_and_functional_durations(self):
        report = example()
        report['scenarios'][0]['samples'].update(browser_updates=[1], test_duration_ms=[100], unknown_ms=[20], browser_heap_bytes=[1048576] * 100)
        comparison = reports.compare(report, report)
        self.assertEqual({row['metric'] for row in comparison['metrics']}, {'save_persist_ms', 'browser_heap_bytes'})
        for row in comparison['metrics']:
            self.assertNotIn('p95', row['baseline'])
        report['comparison'] = comparison
        rendered = reports.markdown(report)
        self.assertIn('1 MiB', rendered)
        self.assertNotIn('median change.\n- load/combined_activity / test_duration_ms', rendered)

    def test_environment_or_failures_prevent_comparison(self):
        old, current = example(), example()
        self.assertEqual(reports.compare(old, current)["status"], "comparable")
        current["environment"]["fingerprint"] = "different"
        self.assertEqual(reports.compare(old, current)["status"], "not-comparable")
        current = example()
        current["outcome"] = "fail"
        self.assertEqual(reports.compare(old, current)["status"], "not-comparable")

    def test_aggregate_preserves_failure_and_artifact_lineage(self):
        old, current = example(), example()
        old["artifacts"] = [{"name": "component.zip", "sha256": "b" * 64}]
        current["outcome"] = current["status"] = "fail"
        result = reports.aggregate([old, current], "1.9.0-beta.11")
        self.assertEqual(result["outcome"], "fail")
        self.assertEqual(result["artifacts"], old["artifacts"])
        current["artifacts"] = [{"name": "component.zip", "sha256": "c" * 64}]
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            reports.aggregate([old, current])

    def test_calibration_requires_unique_consecutive_same_environment_runs(self):
        batch = []
        for index in range(10):
            report = example()
            report.update(visualStatus="compared", invocationId=str(index))
            batch.append(report)
        self.assertTrue(reports.calibration(batch)["eligibleForReview"])
        self.assertFalse(reports.calibration([batch[0]] * 10)["eligibleForReview"])
        batch[5]["outcome"] = "fail"
        self.assertEqual(reports.calibration(batch)["stableRuns"], 4)
        self.assertFalse(reports.calibration(batch)["automaticActivation"])

    def test_secret_payload_is_not_accepted_as_identity(self):
        report = example()
        report["artifacts"] = [{"name": "../auth.json", "sha256": "b" * 64}]
        with self.assertRaises(ValueError):
            reports.validate(report)

    def test_repetitions_produce_one_comparison_with_visible_dispersion(self):
        baseline = reports.combine_repetitions([example(), example(), example()])
        candidate = reports.combine_repetitions([example(), example(), example()])
        comparison = reports.compare(baseline, candidate)
        self.assertEqual(len(comparison["metrics"]), 1)
        self.assertEqual(comparison["metrics"][0]["baselineRunMedians"], [20, 20, 20])
        self.assertEqual(comparison["metrics"][0]["baseline"]["count"], 9)

    def test_action_identity_is_preserved_only_for_consistent_complete_repetitions(self):
        report = example()
        report["scenarios"][0].update(actionId="schedule.edit-save", actionVariant="heating", project="mobile")
        combined = reports.combine_repetitions([report, copy.deepcopy(report)])
        self.assertEqual(combined["scenarios"][0]["actionId"], "schedule.edit-save")
        self.assertEqual(combined["scenarios"][0]["actionVariant"], "heating")
        self.assertEqual(combined["scenarios"][0]["project"], "mobile")
        changed = copy.deepcopy(report)
        changed["scenarios"][0]["actionId"] = "profile.create-activate"
        combined = reports.combine_repetitions([report, changed])
        self.assertEqual(combined["scenarios"][0]["actionId"], "unclassified")
        self.assertNotIn("actionVariant", combined["scenarios"][0])
        missing = copy.deepcopy(report)
        missing["scenarios"] = []
        combined = reports.combine_repetitions([report, missing])
        self.assertEqual(combined["scenarios"][0]["status"], "not-run")
        self.assertEqual(combined["scenarios"][0]["actionId"], "unclassified")

    def test_failure_stage_is_conservative_across_repeated_executions(self):
        report = example()
        report.update(status="fail", outcome="fail")
        report["scenarios"][0].update(status="fail", actionId="schedule.edit-save", actionVariant="heating", project="mobile", failureStep="schedule.save")
        combined = reports.combine_repetitions([report, copy.deepcopy(report)])
        self.assertEqual(combined["scenarios"][0]["failureStep"], "schedule.save")
        other = copy.deepcopy(report)
        other["scenarios"][0]["failureStep"] = "schedule.reload"
        combined = reports.combine_repetitions([report, other])
        self.assertNotIn("failureStep", combined["scenarios"][0])

    def test_repeated_action_results_keep_the_worst_status_in_either_order(self):
        failure = example()
        failure.update(status="fail", outcome="fail")
        failure["scenarios"][0].update(status="fail", actionId="schedule.edit-save", actionVariant="heating", project="mobile", failureStep="schedule.save")
        omitted = copy.deepcopy(failure)
        omitted.update(status="not-run", outcome="not-run")
        omitted["scenarios"][0].update(status="not-run")
        omitted["scenarios"][0].pop("failureStep")
        for sequence in ([failure, omitted], [omitted, failure]):
            combined = reports.combine_repetitions(sequence)
            row = combined["scenarios"][0]
            self.assertEqual(combined["outcome"], "fail")
            self.assertEqual(row["status"], "fail")
            self.assertEqual(row["actionId"], "schedule.edit-save")
            self.assertNotIn("failureStep", row)
        infrastructure = copy.deepcopy(omitted)
        infrastructure.update(status="infrastructure-error", outcome="infrastructure-error")
        infrastructure["scenarios"][0]["status"] = "infrastructure-error"
        for sequence in ([failure, infrastructure], [infrastructure, failure]):
            self.assertEqual(reports.combine_repetitions(sequence)["scenarios"][0]["status"], "infrastructure-error")

    def test_missing_repetition_cannot_hide_a_failure_or_unreviewed_evidence(self):
        missing = example()
        missing["scenarios"] = []
        for status, expected in (("fail", "fail"), ("unreviewed", "not-run"), ("pass", "not-run")):
            report = example()
            report["scenarios"][0]["status"] = status
            for sequence in ([report, missing], [missing, report]):
                self.assertEqual(reports.combine_repetitions(sequence)["scenarios"][0]["status"], expected)

    def test_optional_action_metadata_is_bounded_and_structurally_consistent(self):
        for metadata in ({"actionId": "secret\ntoken"}, {"actionId": True}, {"actionVariant": "default"}, {"actionId": "schedule.restart", "failureStep": "restart.verify-schedule"}, {"actionId": "x" * 81}, {"project": "http://secret"}):
            report = example()
            report["scenarios"][0].update(metadata)
            with self.assertRaisesRegex(ValueError, "action metadata"):
                reports.validate(report)

    def test_repeated_measurements_keep_verified_duration_and_planned_counts(self):
        report = example()
        report["scenarios"][0]["measurement"] = {"seconds": 60, "durationScale": 1}
        report["scenarios"][0]["load"].update(planned=3, failed=0)
        combined = reports.combine_repetitions([report, report, report])
        self.assertEqual(combined["scenarios"][0]["load"]["planned"], 9)
        self.assertEqual(combined["scenarios"][0]["load"]["failed"], 0)
        self.assertEqual(combined["scenarios"][0]["measurement"], {"seconds": 60, "durationScale": 1})
        report = example()
        report["provenance"] = {"headSha": "$(print-secret)"}
        with self.assertRaises(ValueError):
            reports.validate(report)
