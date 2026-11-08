from __future__ import annotations

import importlib.util
import copy
from pathlib import Path
import tempfile
import unittest
from tests.quality.test_reports import example

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("quality_site", ROOT / "scripts/quality/site.py")
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


def dashboard_report():
    """Deterministic presentation data, never an execution or calibration result."""
    report = example()
    report.update(actionEvidenceVersion=2, artifactRole="release-package", rollout="observe", generatedAt="2026-11-07T12:00:00+00:00")
    report["environment"].update(homeAssistantImage="ghcr.io/home-assistant/home-assistant:2026.11.0@sha256:" + "a" * 64, playwrightVersion="1.62.1", size="small")
    report["scenarios"] = []
    for definition in site.action_evidence.catalogue()["actions"]:
        if definition["source"] != "browser":
            continue
        for variant in definition["variants"]:
            if not variant.get("minEvidenceVersion", 1) <= 2 <= variant.get("maxEvidenceVersion", 2):
                continue
            for project in variant["projects"]:
                report["scenarios"].append({"id": f'browser/{project}/{variant["title"]}', "actionId": definition["id"], "actionVariant": variant["id"], "project": project, "status": "pass", "samples": {"test_duration_ms": [1250]}})
    for scenario, count, response in (("idle", 0, 0), ("unrelated_activity", 300, 3), ("combined_activity", 360, 4)):
        samples = {"service_roundtrip_ms": [response + (index % 20) / 10 for index in range(count)], "browser_heap_bytes": [20 * 1024 ** 2, 22 * 1024 ** 2, 24 * 1024 ** 2]}
        if scenario == "combined_activity":
            samples.update(interaction_ms=[50, 60, 70], save_persist_ms=[250, 270, 290])
        report["scenarios"].append({"id": "load/" + scenario, "status": "pass", "samples": samples, "load": {"requested": count, "completed": count, "observed": count, "expected_observed": count}, **({"editingEvidence": "draft-preserved-during-updates"} if scenario == "combined_activity" else {})})
    report["scenarios"].append({"id": "resources/home-assistant", "status": "pass", "samples": {"container_cpu_percent": [1, 2, 3], "container_memory_bytes": [500 * 1024 ** 2] * 3}})
    return report


class QualitySiteTests(unittest.TestCase):
    def render(self, report):
        return site.render_release({"tag": "v1.9.0-beta.11", "report": report}, "cgonfer/velair")

    def test_charts_show_units_sample_counts_and_keep_raw_details_collapsed(self):
        rendered = self.render(dashboard_report())
        self.assertIn("Service response", rendered)
        self.assertIn("Edit and save a schedule", rendered)
        self.assertIn("Use the temperature control", rendered)
        self.assertIn("Page memory (JavaScript)", rendered)
        self.assertIn("Response time distribution", rendered)
        self.assertIn("360 samples", rendered)
        self.assertIn("95% within", rendered)
        self.assertIn("22 <small>MiB</small>", rendered)
        self.assertIn("270 <small>ms</small>", rendered)
        self.assertIn("500 MiB", rendered)
        self.assertIn("Whole Home Assistant instance", rendered)
        self.assertIn('<details class="quality-details"><summary>', rendered)
        self.assertNotIn('<details class="quality-details" open', rendered)
        self.assertNotIn("chart.js", rendered)

    def test_histogram_preserves_samples_zeros_identical_and_extreme_values(self):
        for values in ([0] * 100, [4.5] * 7, list(range(101)), [0, 1e307, 1e308]):
            bins = site.histogram(values)
            self.assertEqual(sum(item[2] for item in bins), len(values))
            self.assertEqual(bins[0][0], min(values))
            self.assertEqual(bins[-1][1], max(values))
            self.assertTrue(all(site.finite(value) for item in bins for value in item))

    def test_missing_failed_and_zero_samples_are_distinguished(self):
        report = dashboard_report()
        report["outcome"] = report["status"] = "fail"
        loads = [row for row in report["scenarios"] if row["id"].startswith("load/")]
        loads[0]["samples"]["service_roundtrip_ms"] = []
        loads[1]["status"] = "fail"
        loads[1]["samples"]["service_roundtrip_ms"] = [9876] * 100
        loads[2]["samples"]["service_roundtrip_ms"] = [0] * 99
        rendered = self.render(report).split('<details class="quality-details">')[0]
        self.assertIn('0 <small>ms</small>', rendered)
        self.assertNotIn("p95 needs 100 samples", rendered)
        self.assertIn("Failed", rendered)
        self.assertIn("Not measured", rendered)
        self.assertNotIn("9,876", rendered)
        self.assertNotIn("95% within", rendered)

    def test_measurement_details_follow_metric_meaning_without_generic_p95_columns(self):
        report = dashboard_report()
        load = next(row for row in report['scenarios'] if row['id'] == 'load/combined_activity')
        load['samples'].update(browser_updates=[0], browser_heap_after_recovery_bytes=[1048576], unknown_ms=[12345])
        rendered = self.render(report)
        details = rendered.split('<details class="quality-details">')[1]
        self.assertNotIn('test_duration_ms', details)
        self.assertNotIn('unknown_ms', details)
        self.assertNotIn('<th>p95</th>', details)
        self.assertNotIn('insufficient samples', rendered)
        self.assertIn('0 updates', details)
        self.assertIn('1 snapshot', details)
        self.assertIn('1 MiB', details)
        self.assertIn('Per-execution observations', details)
        self.assertIn('warm-up and activity', details)
        # Memory is a gauge, never a latency percentile even after 100 readings.
        load['samples']['browser_heap_bytes'] = [1048576] * 100
        rows = self.render(report).split('Page memory (JavaScript)')
        for section in rows[1:]:
            self.assertNotIn('95% within', section.split('</figure>')[0])

    def test_package_and_hacs_measurements_are_not_pooled_and_comparison_is_not_duplicated(self):
        package = dashboard_report()
        reference = copy.deepcopy(package)
        reference["commit"] = "b" * 40
        package["comparison"] = site.quality.compare(reference, package)
        hacs = dashboard_report()
        hacs["artifactRole"] = "committed-integration"
        next(row for row in hacs["scenarios"] if row["id"] == "load/combined_activity")["samples"]["service_roundtrip_ms"] = [100] * 360
        aggregate = site.quality.aggregate([package, hacs], "1.9.0-beta.11")
        rendered = self.render(aggregate)
        self.assertIn("Release package", rendered)
        self.assertIn("HACS installation", rendered)
        self.assertIn('<span>Passed</span><strong>11</strong>', rendered)
        self.assertIn('<details class="quality-additional-execution"><summary>HACS installation', rendered)
        self.assertIn('100 <small>ms</small>', rendered)
        self.assertEqual(rendered.count("Device service response · Combined activity"), 1)
        self.assertEqual(rendered.count("Reference and current measurements"), 1)
        self.assertIn("No comparable paired measurement", rendered)
        comparison_html = site.comparison_charts(package, package)
        self.assertNotIn("p95 needs", comparison_html)

    def test_noncomparable_and_invalid_comparisons_never_create_bars(self):
        for comparison in ({"status": "not-comparable", "reason": "<script>unsafe</script>", "metrics": []}, {"status": "comparable", "candidateCommit": "b" * 40}, {"status": "comparable", "candidateCommit": "a" * 40, "metrics": [{"metric": "interaction_ms", "scenario": "load/combined_activity", "baseline": {"median": True, "count": 1}, "candidate": {"median": 20, "count": 1}}]}):
            report = dashboard_report()
            report["comparison"] = comparison
            rendered = self.render(report)
            self.assertNotIn("Reference and current measurements", rendered)
            self.assertNotIn("<script>", rendered)

    def test_unprefixed_paired_repetitions_keep_their_comparison(self):
        report = dashboard_report()
        report["executions"] = [{"artifactRole": "release-package", "outcome": "pass"}] * 3
        self.assertEqual(site.execution_groups(report), [(report, report["scenarios"])])

    def test_malformed_optional_metadata_falls_back_without_inventing_comparisons(self):
        report = dashboard_report()
        report.update(artifactRole=[], rollout={}, generatedAt=[])
        report["environment"] = []
        report["comparison"] = {"status": "comparable", "candidateCommit": report["commit"], "metrics": [{"metric": [], "baseline": {}, "candidate": {}}]}
        rendered = self.render(report)
        self.assertIn("Test execution 1", rendered)
        self.assertIn("No supported comparable measurements", rendered)
        self.assertNotIn("Reference and current measurements", rendered)

    def test_p95_appears_only_at_one_hundred_samples(self):
        for count in (99, 100):
            report = dashboard_report()
            report["scenarios"] = [{"id": "load/combined_activity", "status": "pass", "samples": {"service_roundtrip_ms": [0] * count}}]
            rendered = self.render(report).split('<details class="quality-details">')[0]
            self.assertEqual("95% within 0 ms" in rendered, count == 100)

    def test_pooled_visual_status_accounts_for_every_repetition(self):
        report = dashboard_report()
        report["visualStatus"] = "compared"
        report["executions"] = [{"visualStatus": "compared"}, {"visualStatus": "missing-reference-or-failure"}]
        rendered = self.render(report)
        self.assertNotIn("References compared", rendered)
        self.assertIn("Visual comparison not established", rendered)
        report["executions"][1]["visualStatus"] = "compared"
        self.assertIn("References compared", self.render(report))
        report.pop("executions")
        report["visualStatus"] = "off"
        self.assertIn('<strong>Visual review:</strong> Disabled', self.render(report))

    def test_action_timing_charts_require_established_action_evidence(self):
        report = dashboard_report()
        next(row for row in report["scenarios"] if row["id"] == "load/combined_activity")["samples"]["save_persist_ms"] = []
        visible_actions = self.render(report).split('<details class="quality-diagnostics">')[0]
        self.assertNotIn("How long did those actions take?", visible_actions)
        self.assertNotIn('class="quality-bars"><li>', visible_actions)
        self.assertIn('No successful measurements', visible_actions)
        self.assertIn("Use and save schedules during household activity", visible_actions)

    def test_overview_counts_unique_actions_conservatively_across_executions(self):
        models = [{"actions": [{"id": "a", "status": "pass"}, {"id": "b", "status": "pass"}, {"id": "c", "status": "not-run"}]},
                  {"actions": [{"id": "a", "status": "fail"}, {"id": "c", "status": "not-run"}]}]
        rendered = site.action_overview(models)
        self.assertIn('<span>Passed</span><strong>0</strong>', rendered)
        for label in ("Failed", "Incomplete", "Not run"):
            self.assertIn(f'<span>{label}</span><strong>1</strong>', rendered)
        self.assertIn('of 3 passed', rendered)
        self.assertIn('No named action evidence', site.action_overview([]))

    def test_overview_timings_use_primary_execution_and_preserve_zero(self):
        package, hacs = dashboard_report(), dashboard_report()
        row = next(row for row in package['scenarios'] if row['id'] == 'load/combined_activity')
        row['samples'].update(interaction_ms=[0], save_persist_ms=[100])
        next(row for row in hacs['scenarios'] if row['id'] == 'load/combined_activity')['samples'].update(interaction_ms=[999], save_persist_ms=[999])
        rendered = self.render(site.quality.aggregate([package, hacs], '1.9.0-beta.11'))
        overview = rendered.split('<div class="quality-overview">')[1].split('<div class="quality-evidence-strip">')[0]
        self.assertIn('Release package · during household activity', overview)
        self.assertIn('0 <small>ms</small>', overview)
        self.assertIn('width:0.000%', overview)
        self.assertNotIn('999', overview)

    def test_timing_overview_identifies_different_activity_variants(self):
        model = {'actions': [{'id': 'household.use-velair', 'metrics': [
            {'label': 'Navigate', 'median': 10, 'count': 3, 'variant': 'Steady'},
            {'label': 'Navigate', 'median': 20, 'count': 3, 'variant': 'Sustained'}]}]}
        rendered = site.timing_overview(model, 'Release package')
        self.assertIn('Navigate · Steady', rendered)
        self.assertIn('Navigate · Sustained', rendered)

    def test_collapsed_action_status_excludes_counts(self):
        import re
        model = site.action_evidence.describe(dashboard_report())
        rendered = site.action_cards(model)
        self.assertIn('Passed · 9/9 checks', rendered)
        for summary in re.findall(r'<summary>(.*?)</summary>', rendered):
            self.assertNotIn('checks', summary)
            self.assertNotIn('/9', summary)

    def test_compact_secondary_execution_exposes_its_non_action_failures(self):
        package, hacs = dashboard_report(), dashboard_report()
        hacs.update(artifactRole="committed-integration", status="fail", outcome="fail")
        next(row for row in hacs["scenarios"] if row["id"] == "load/unrelated_activity")["status"] = "fail"
        rendered = self.render(site.quality.aggregate([package, hacs], "1.9.0-beta.11"))
        self.assertIn('<summary>HACS installation · Failed · 11/11 actions fully checked · 1 check(s) need attention</summary>', rendered)

    def test_quality_and_release_pages_keep_the_homepage_theme_and_navigation(self):
        header, footer = site.shared_shell()
        for rendered in (site.page("Quality", "<h1>Quality</h1>"), site.render_release({"tag": "v1.8.0", "report": None}, "cgonfer/velair")):
            self.assertIn(header, rendered)
            self.assertIn(footer, rendered)
            self.assertIn('src="../theme-init.js"', rendered)
            self.assertIn('src="../app.js" defer', rendered)
            self.assertIn('class="theme-toggle"', rendered)
            self.assertIn('aria-controls="site-navigation"', rendered)
            self.assertIn('href="../index.html#schedules"', rendered)
            self.assertIn('href="index.html" aria-current="page"', rendered)
            self.assertLess(rendered.index('src="../theme-init.js"'), rendered.index('<body'))

    def test_site_owned_copy_does_not_imply_a_team(self):
        import re
        with tempfile.TemporaryDirectory(prefix="velair-quality-test-") as directory:
            site.build([], directory, "cgonfer/velair")
            rendered = (Path(directory) / "index.html").read_text(encoding="utf-8")
            self.assertIsNone(re.search(r"\b(?:we|our|us)\b", rendered, re.I))

    def test_missing_reports_do_not_claim_success(self):
        with tempfile.TemporaryDirectory(prefix="velair-quality-test-") as directory:
            site.build([], directory, "cgonfer/velair")
            rendered = (Path(directory) / "index.html").read_text(encoding="utf-8")
            self.assertIn("No release quality reports", rendered)
            self.assertNotIn("100%", rendered)

    def test_release_input_is_escaped_and_betas_separated(self):
        report = example()
        report["limitations"] = ["<script>alert(1)</script>"]
        entries = [{"tag": "v1.9.0-beta.11", "prerelease": True, "report": report},
                   {"tag": "v1.8.0", "prerelease": False, "report": None}]
        with tempfile.TemporaryDirectory(prefix="velair-quality-test-") as directory:
            site.build(entries, directory, "cgonfer/velair")
            index = (Path(directory) / "index.html").read_text(encoding="utf-8")
            detail = (Path(directory) / "v1.9.0-beta.11.html").read_text(encoding="utf-8")
            self.assertIn("Beta releases", index)
            self.assertIn("Stable releases", index)
            self.assertIn("no report", index)
            self.assertNotIn("<script>", detail)
            self.assertIn("&lt;script&gt;", detail)

    def test_asset_downloads_never_receive_api_token(self):
        calls = []
        report = example()
        report["releaseVersion"] = "1.9.0-beta.11"
        def fetch(url, token=None):
            calls.append((url, token))
            if url.startswith("https://api.github.com/"):
                return [{"tag_name": "v1.9.0-beta.11", "prerelease": True, "assets": [{"name": "quality-report.json", "browser_download_url": "https://github.com/cgonfer/velair/releases/download/v1.9.0-beta.11/quality-report.json"}]}]
            return report
        entries = site.released_reports("cgonfer/velair", fetch)
        self.assertEqual(len(entries), 1)
        self.assertIsNone(calls[1][1])

    def test_foreign_assets_are_rejected(self):
        def fetch(*_args, **_kwargs):
            return [{"tag_name": "v1.8.0", "assets": [{"name": "quality-report.json", "browser_download_url": "https://evil.test/file"}]}]
        with self.assertRaisesRegex(ValueError, "Unexpected"):
            site.released_reports("cgonfer/velair", fetch)
