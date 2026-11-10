"""Recovery binds a new workflow to an existing immutable product identity."""
import base64
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("release_identity", ROOT / ".github/scripts/release-identity.py")
identity = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(identity)
PRODUCT = "a" * 40
WORKFLOW = "b" * 40
TAG = "v1.9.0"


class ReleaseIdentityTest(unittest.TestCase):
    def setUp(self):
        self.env = {"GITHUB_SHA": WORKFLOW, "GITHUB_REF": "refs/heads/main", "GITHUB_REF_NAME": "main",
                    "GITHUB_EVENT_NAME": "workflow_dispatch", "GITHUB_REPOSITORY": "example/velair",
                    "RECOVERY_TAG": TAG, "RECOVERY_COMMIT": PRODUCT, "VALIDATION_RUN_ID": "123"}
        self.run = {"head_sha": PRODUCT, "head_branch": TAG, "event": "push", "status": "completed",
                    "conclusion": "failure", "path": ".github/workflows/release.yml", "run_attempt": 2,
                    "repository": {"full_name": "example/velair"}}
        self.release = {"id": 17, "tag_name": TAG, "draft": True, "immutable": False}
        self.jobs = [{"name": name, "status": "completed", "conclusion": "success"}
                     for name in ("Release HACS validation", "Release Hassfest validation")]
        self.manifest_version = "1.9.0"
        self.tag_object = {"sha": PRODUCT, "type": "commit"}
        self.calls = []

    def api(self, path):
        self.calls.append(path)
        if path == f"/git/ref/tags/{TAG}":
            return {"object": deepcopy(self.tag_object)}
        if path == f"/git/tags/{'c' * 40}":
            return {"object": {"sha": PRODUCT, "type": "commit"}}
        if path == f"/releases/tags/{TAG}":
            return deepcopy(self.release)
        if path == "/actions/runs/123":
            return deepcopy(self.run)
        if path.startswith("/actions/runs/123/attempts/2/jobs?per_page=100&page="):
            page = int(path.rsplit("=", 1)[1])
            return {"jobs": deepcopy(self.jobs[(page - 1) * 100:page * 100])}
        if path == f"/contents/custom_components/velair/manifest.json?ref={PRODUCT}":
            return {"content": base64.b64encode(json.dumps({"version": self.manifest_version}).encode()).decode()}
        raise AssertionError(f"Unexpected API request: {path}")

    def test_recovery_keeps_product_sha_distinct_from_workflow_and_failed_run_is_valid(self):
        result = identity.resolve_identity(self.env, self.api)
        self.assertEqual(result["commit"], PRODUCT)
        self.assertNotEqual(result["commit"], self.env["GITHUB_SHA"])
        self.assertEqual(result["publish"], "true")
        self.assertEqual(result["release_id"], "17")
        self.assertEqual(result["validation_attempt"], "2")
        self.assertTrue(result["validation_url"].endswith("/runs/123/attempts/2"))
        self.assertIn(f"/contents/custom_components/velair/manifest.json?ref={PRODUCT}", self.calls)

    def test_empty_dispatch_remains_test_only_on_main_or_tag(self):
        for ref in ("refs/heads/main", "refs/tags/v1.9.0"):
            env = {**self.env, "GITHUB_REF": ref, "RECOVERY_TAG": "", "RECOVERY_COMMIT": "", "VALIDATION_RUN_ID": ""}
            result = identity.resolve_identity(env, self.api)
            self.assertEqual(result["publish"], "false")
            self.assertEqual(result["commit"], WORKFLOW)
        self.assertEqual(self.calls, [])

    def test_regular_tag_push_still_resolves_and_validates_product(self):
        env = {**self.env, "GITHUB_EVENT_NAME": "push", "GITHUB_REF": f"refs/tags/{TAG}", "GITHUB_REF_NAME": TAG,
               "GITHUB_SHA": PRODUCT, "RECOVERY_TAG": "", "RECOVERY_COMMIT": "", "VALIDATION_RUN_ID": ""}
        result = identity.resolve_identity(env, self.api)
        self.assertEqual(result["publish"], "true")
        self.assertEqual(result["recovery"], "false")

    def test_partial_inputs_and_untrusted_dispatch_refs_are_rejected(self):
        for changes in ({"RECOVERY_TAG": ""}, {"RECOVERY_COMMIT": ""}, {"VALIDATION_RUN_ID": ""},
                        {"GITHUB_EVENT_NAME": "push"}, {"GITHUB_REF": "refs/heads/feature"},
                        {"RECOVERY_TAG": "v1.9.0\nattack"}, {"RECOVERY_COMMIT": "HEAD"}, {"VALIDATION_RUN_ID": "../123"}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                identity.resolve_identity({**self.env, **changes}, self.api)

    def test_public_immutable_or_unidentified_release_is_rejected(self):
        original = deepcopy(self.release)
        for changes in ({"draft": False}, {"immutable": True}, {"immutable": None}, {"id": 0}, {"tag_name": "v1.8.0"}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.release = {**original, **changes}
                identity.resolve_identity(self.env, self.api)

    def test_original_validation_run_must_match_every_identity_field(self):
        original = deepcopy(self.run)
        for key, value in (("head_sha", WORKFLOW), ("head_branch", "main"), ("event", "pull_request"),
                           ("status", "in_progress"), ("path", ".github/workflows/ci.yml"),
                           ("repository", {"full_name": "other/velair"}), ("run_attempt", 0)):
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.run = {**original, key: value}
                identity.resolve_identity(self.env, self.api)

    def test_proof_is_paginated_and_duplicate_or_failed_jobs_are_rejected(self):
        required = deepcopy(self.jobs)
        self.jobs = [{"name": f"Other {i}"} for i in range(100)] + required
        identity.resolve_identity(self.env, self.api)
        self.assertIn("/actions/runs/123/attempts/2/jobs?per_page=100&page=2", self.calls)
        for jobs in (required[:1], required + required[:1], [required[0], {**required[1], "conclusion": "failure"}]):
            with self.subTest(jobs=jobs), self.assertRaises(ValueError):
                self.jobs = jobs
                identity.resolve_identity(self.env, self.api)

    def test_changed_remote_tag_and_manifest_mismatch_are_rejected(self):
        self.tag_object["sha"] = WORKFLOW
        with self.assertRaisesRegex(ValueError, "Remote tag"):
            identity.resolve_identity(self.env, self.api)
        self.tag_object["sha"] = PRODUCT
        self.manifest_version = "1.9.1"
        with self.assertRaisesRegex(ValueError, "manifest"):
            identity.resolve_identity(self.env, self.api)

    def test_annotated_tags_are_peeled(self):
        self.tag_object = {"sha": "c" * 40, "type": "tag"}
        self.assertEqual(identity.resolve_identity(self.env, self.api)["commit"], PRODUCT)
