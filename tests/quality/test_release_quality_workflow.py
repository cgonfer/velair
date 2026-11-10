"""Run the reusable workflow's actual Python with bounded Git/API responses."""
import ast
import io
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import textwrap
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
PRODUCT, WORKFLOW, BASE = "a" * 40, "b" * 40, "c" * 40


class ReleaseQualityWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.workflow = (ROOT / ".github/workflows/quality-run.yml").read_text(encoding="utf-8")
        self.script = textwrap.dedent(self.workflow.split("python - <<'PY'\n", 1)[1].split("\n          PY", 1)[0])

    def test_comparison_checkout_really_fetches_full_history(self):
        expression = re.search(r"fetch-depth: \$\{\{ inputs.compare-release && (.*?) \|\| (.*?) \}\}", self.workflow)
        self.assertIsNotNone(expression)
        full, shallow = (ast.literal_eval(part) for part in expression.groups())
        # GitHub &&/|| uses operand truthiness: numeric zero used to select 1.
        self.assertEqual(str((True and full) or shallow), "0")
        self.assertEqual(str((False and full) or shallow), "1")

    def run_workflow(self, *, revision_available, compare=True):
        calls = []
        release = {"tag_name": "v0.9.0", "draft": False, "prerelease": False,
                   "published_at": "2026-01-01T00:00:00Z", "assets": []}

        def run(args, **kwargs):
            self.assertEqual(args[:4], ["git", "rev-parse", "--verify", "--end-of-options"])
            return subprocess.CompletedProcess(args, 0 if revision_available else 128,
                                               stdout=BASE if revision_available else "", stderr="missing tag")

        def call(args):
            calls.append(args)
            return 0

        def urlopen(request, **kwargs):
            self.assertTrue(compare, "No comparison must not request GitHub releases")
            return io.BytesIO(json.dumps([release]).encode())

        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "quality-input"
            source.mkdir()
            archive = source / "velair-custom-component-1.9.0.zip"
            archive.write_bytes(b"fixture; runner execution is independently covered")
            env = {"RUNNER_TEMP": temporary, "QUALITY_SUITE": "release", "QUALITY_SIZE": "small",
                   "QUALITY_VISUAL": "policy", "QUALITY_ARCHIVE": "true", "QUALITY_IMAGE": "",
                   "QUALITY_COMPARE_RELEASE": str(compare).lower(), "GITHUB_REPOSITORY": "example/velair",
                   "GH_TOKEN": "test", "GITHUB_SHA": WORKFLOW, "QUALITY_TESTED_SHA": PRODUCT,
                   "QUALITY_BASE_SHA": "", "QUALITY_COMPARISON_UNAVAILABLE": ""}
            with patch.dict(os.environ, env), patch("subprocess.run", side_effect=run), \
                    patch("subprocess.call", side_effect=call), patch("urllib.request.urlopen", side_effect=urlopen):
                with self.assertRaises(SystemExit) as exit:
                    exec(compile(self.script, ".github/workflows/quality-run.yml:test", "exec"), {})
                self.assertEqual(exit.exception.code, 0)
                limitation = os.environ.get("QUALITY_COMPARISON_UNAVAILABLE", "")
                baseline = os.environ.get("QUALITY_BASE_SHA", "")
            functional = [args for args in calls if "scripts/quality/run.py" in args]
            self.assertEqual(len(functional), 1, "Optional baseline failure must not prevent product checks")
            self.assertIn("--archive", functional[0])
            self.assertEqual(functional[0][functional[0].index("--archive") + 1], str(archive))
            self.assertNotIn("--baseline-component", functional[0])
            return calls, limitation, baseline

    def test_missing_previous_tag_still_runs_all_product_checks_with_explicit_limit(self):
        calls, limitation, baseline = self.run_workflow(revision_available=False)
        self.assertIn("No compatible previous published package", limitation)
        self.assertEqual(baseline, "")
        self.assertFalse(any(args[0] == "git" for args in calls))

    def test_baseline_ancestry_uses_product_sha_instead_of_workflow_sha(self):
        calls, limitation, baseline = self.run_workflow(revision_available=True)
        self.assertIn(["git", "merge-base", "--is-ancestor", BASE, PRODUCT], calls)
        self.assertEqual(baseline, BASE)
        self.assertIn("No compatible previous published package", limitation)

    def test_no_comparison_keeps_normal_journeys_without_external_lookup(self):
        calls, limitation, baseline = self.run_workflow(revision_available=False, compare=False)
        self.assertEqual(limitation, "")
        self.assertEqual(baseline, "")
        self.assertFalse(any(args[0] == "git" for args in calls))
