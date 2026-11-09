"""Exercise the actual workflow's scope decision, including unavailable history."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import textwrap
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


class QualityScopeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        workflow = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")
        cls.script = textwrap.dedent(
            workflow.split("python - <<'PY'\n", 1)[1].split("\n          PY", 1)[0]
        )
        cls.head = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip()

    def scope(self, base, *, changed=None, error=False):
        original_run = subprocess.run

        def run_git(*args, **kwargs):
            if changed is not None or error:
                return subprocess.CompletedProcess(
                    args[0], 128 if error else 0,
                    stdout="\n".join(changed or []), stderr="missing object" if error else "",
                )
            return original_run(*args, cwd=ROOT, **kwargs)

        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            environment = {
                "BASE_SHA": base, "HEAD_SHA": self.head, "QUALITY_HEAD_SHA": self.head,
                "GITHUB_OUTPUT": str(directory / "output"),
                "GITHUB_STEP_SUMMARY": str(directory / "summary"),
                "RUNNER_TEMP": str(directory), "GITHUB_REPOSITORY": "cgonfer/velair",
                "GITHUB_RUN_ID": "123", "GITHUB_RUN_ATTEMPT": "1", "GITHUB_EVENT_NAME": "push",
            }
            with patch.dict(os.environ, environment), patch("subprocess.run", side_effect=run_git):
                exec(compile(self.script, ".github/workflows/ci.yml:scope", "exec"), {})
            outputs = dict(line.split("=", 1) for line in (directory / "output").read_text().splitlines())
            summary = (directory / "summary").read_text()
            report_path = directory / "quality-report.json"
            report = json.loads(report_path.read_text()) if report_path.exists() else None
            return outputs, summary, report

    def assert_full_scope(self, result):
        outputs, summary, report = result
        self.assertEqual(outputs, {"runtime": "true", "website": "true"})
        self.assertIn("comparison unavailable", summary)
        self.assertIn("all runtime and website checks", summary)
        self.assertIsNone(report, "Unknown history must not produce an omission report")

    def test_missing_previous_commit_runs_all_checks(self):
        # A real Git failure reproduces an unreachable pre-amend push SHA.
        self.assert_full_scope(self.scope("f" * 40))

    def test_absent_and_zero_baselines_run_all_checks(self):
        for base in ("", "0" * 40):
            with self.subTest(base=base):
                self.assert_full_scope(self.scope(base))

    def test_failed_diff_never_omits_checks(self):
        self.assert_full_scope(self.scope(self.head, error=True))

    def test_actual_empty_diff_records_a_truthful_omission(self):
        outputs, summary, report = self.scope(self.head)
        self.assertEqual(outputs, {"runtime": "false", "website": "false"})
        self.assertIn("omitted", summary)
        self.assertNotIn("comparison unavailable", summary)
        self.assertEqual(report["outcome"], "not-run")
        self.assertEqual(report["provenance"]["baseSha"], self.head)
        self.assertEqual(report["provenance"]["headSha"], self.head)

    def test_known_changes_preserve_existing_scope_rules(self):
        cases = [
            (["README.md", ".github/release-notes/v1.9.0.md"], "false", "false"),
            (["tests/website/theme.test.mjs"], "false", "true"),
            (["website/public/app.js"], "false", "true"),
            (["scripts/quality/site.py"], "false", "true"),
            (["custom_components/velair/scheduler.py"], "true", "false"),
            (["frontend/package-lock.json"], "true", "false"),
            (["tests/screenshots/test_screenshot_capture.py"], "true", "false"),
            ([".github/workflows/ci.yml"], "true", "false"),
            (["frontend/src/velair-card.ts", "website/public/app.js"], "true", "true"),
        ]
        for paths, runtime, website in cases:
            with self.subTest(paths=paths):
                outputs, summary, report = self.scope(self.head, changed=paths)
                self.assertEqual(outputs, {"runtime": runtime, "website": website})
                self.assertNotIn("comparison unavailable", summary)
                self.assertEqual(report is None, runtime == "true")
