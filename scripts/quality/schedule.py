"""Cheap, fail-safe admission checks for scheduled quality measurements."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import platform
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import report as quality

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = "quality-scheduled.yml"
RECEIPT = "quality-schedule-receipt"
MAX_RECEIPT = 64_000


def relevant(path):
    if path.startswith("custom_components/velair/"):
        return path not in {"custom_components/velair/frontend/velair-card.js", "custom_components/velair/frontend/velair-card.js.map"}
    return path.startswith(("frontend/src/", "frontend/e2e/", "tests/quality/ha_components/", "scripts/quality/")) or path in {
        "frontend/package.json", "frontend/package-lock.json", "frontend/vite.config.ts", "frontend/tsconfig.json",
        "frontend/playwright.config.ts", ".github/workflows/quality-scheduled.yml", "scripts/documentation-translations.mjs",
    }


def source_fingerprint(root, revision="HEAD"):
    """Git object identities ignore docs prose, generated timestamps and mtimes."""
    raw = subprocess.check_output(["git", "-C", str(root), "ls-tree", "-rz", "--full-tree", revision])
    entries = {"documentationAvailability": {}}
    catalogue = None
    for entry in raw.split(b"\0"):
        if not entry:
            continue
        metadata, encoded = entry.split(b"\t", 1)
        path = encoded.decode("utf-8")
        mode, kind, digest = metadata.decode("ascii").split()
        if relevant(path):
            entries[path] = [mode, kind, digest]
        if path == "docs/translations.json":
            catalogue = digest
    if catalogue:
        data = json.loads(subprocess.check_output(["git", "-C", str(root), "cat-file", "blob", catalogue]))
        # Documentation availability is compiled into the frontend. Source hashes,
        # review dates and prose do not change that availability.
        entries["documentationAvailability"] = {
            source: {locale: item["path"] for locale, item in value.get("translations", {}).items()}
            for source, value in data.get("documents", {}).items() if value.get("translations")
        }
    return quality.fingerprint(entries)


def immutable_image(image):
    if not re.fullmatch(r"ghcr\.io/home-assistant/home-assistant(?::[A-Za-z0-9_.-]+)?@sha256:[a-f0-9]{64}", image):
        raise ValueError("Quality admission requires an immutable official HA image")
    return "ghcr.io/home-assistant/home-assistant@" + image.split("@", 1)[1]


def candidate_image():
    manifest = json.loads(subprocess.check_output(["docker", "manifest", "inspect", "ghcr.io/home-assistant/home-assistant:stable"], timeout=60))
    arch = {"x86_64": "amd64", "AMD64": "amd64", "aarch64": "arm64"}.get(platform.machine(), platform.machine())
    images = [item for item in manifest.get("manifests", []) if item.get("platform", {}).get("os") == "linux" and item.get("platform", {}).get("architecture") == arch]
    if len(images) != 1 or not re.fullmatch(r"sha256:[a-f0-9]{64}", images[0].get("digest", "")):
        raise ValueError("Cannot resolve the candidate HA image for this architecture")
    return "ghcr.io/home-assistant/home-assistant@" + images[0]["digest"]


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlsplit(newurl).scheme != "https":
            raise ValueError("Refusing an insecure artifact redirect")
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if urllib.parse.urlsplit(req.full_url).hostname != urllib.parse.urlsplit(newurl).hostname:
            redirected.remove_header("Authorization")
        return redirected


def receipt_from_zip(data):
    if len(data) > MAX_RECEIPT * 2:
        raise ValueError("Receipt archive exceeds size limit")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        members = archive.infolist()
        if len(members) != 1 or members[0].filename != "schedule-receipt.json" or members[0].file_size > MAX_RECEIPT:
            raise ValueError("Unexpected receipt archive")
        return json.loads(archive.read(members[0]))


class History:
    def __init__(self, repository, token):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
            raise ValueError("Invalid repository")
        self.repository = repository
        self.token = token
        self.opener = urllib.request.build_opener(SafeRedirect())

    def get(self, path, binary=False):
        url = f"https://api.github.com/repos/{self.repository}{path}"
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "velair-quality"}
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
        with self.opener.open(urllib.request.Request(url, headers=headers), timeout=30) as response:
            limit = MAX_RECEIPT * 2 if binary else 8_000_000
            data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError("Quality history exceeds size limit")
        return data if binary else json.loads(data)

    def runs(self, branch):
        rows = []
        for page in range(1, 4):
            data = self.get(f"/actions/workflows/{WORKFLOW}/runs?branch={urllib.parse.quote(branch, safe='')}&per_page=100&page={page}")
            batch = data["workflow_runs"]
            rows.extend(batch)
            if len(batch) < 100:
                break
        return rows

    def receipt(self, run):
        artifacts = self.get(f"/actions/runs/{run['id']}/artifacts?per_page=100")["artifacts"]
        matched = [row for row in artifacts if row.get("name") == RECEIPT and not row.get("expired")]
        if len(matched) != 1 or matched[0].get("size_in_bytes", MAX_RECEIPT * 3) > MAX_RECEIPT * 2:
            return None
        try:
            return receipt_from_zip(self.get(f"/actions/artifacts/{int(matched[0]['id'])}/zip", binary=True))
        except (ValueError, zipfile.BadZipFile, urllib.error.HTTPError):
            return None


def valid_receipt(receipt, run, repository, kind):
    if not isinstance(receipt, dict) or any(not isinstance(receipt.get(name), str) or not re.fullmatch(r"[a-f0-9]{64}", receipt[name]) for name in ("key", "sourceFingerprint")):
        return False
    configuration = receipt.get("configuration")
    if not isinstance(configuration, dict) or configuration.get("suite") != receipt.get("suite") or configuration.get("size") not in ("small", "large") or configuration.get("visual") not in ("capture", "compare", "off"):
        return False
    if not isinstance(run.get("head_sha"), str) or not re.fullmatch(r"[a-f0-9]{40,64}", run["head_sha"]):
        return False
    try:
        immutable_image(configuration.get("image", ""))
    except (ValueError, TypeError):
        return False
    if receipt.get("result") == "pass" and receipt.get("measurementVerified") is not True:
        return False
    return receipt.get("schemaVersion") == 1 and receipt.get("repository") == repository and receipt.get("kind") == kind \
        and receipt.get("runId") == str(run["id"]) and receipt.get("runAttempt") == str(run.get("run_attempt", 1)) \
        and receipt.get("commit") == run.get("head_sha") and receipt.get("result") in ("pass", "fail", "pending", "skipped")


def decide(key, source, runs, load_receipt, repository, kind, old_source, current_id):
    baseline = ""
    title = "Quality candidate" if kind == "candidate" else "Quality fixed"
    for run in sorted(runs, key=lambda item: (item["id"], item.get("run_attempt", 1)), reverse=True):
        if str(run["id"]) == str(current_id) or run.get("display_title") != title or run.get("event") not in ("schedule", "workflow_dispatch"):
            continue
        receipt = load_receipt(run)
        if valid_receipt(receipt, run, repository, kind):
            if receipt["key"] == key:
                if receipt.get("result") == "skipped":
                    continue
                if receipt.get("result") == "pass" and run.get("status") == "completed" and run.get("conclusion") == "success":
                    return {"run": False, "reason": "This code and environment already have a successful measurement.", "verifiedRunId": str(run["id"]), "baseline": ""}
                return {"run": True, "reason": "The latest matching attempt failed or did not finish; retry required.", "baseline": baseline}
            if not baseline and receipt.get("result") == "pass" and run.get("status") == "completed" and run.get("conclusion") == "success" and receipt.get("suite") == "extended" and receipt.get("sourceFingerprint") != source:
                baseline = run["head_sha"]
        else:
            # A missing receipt cannot conceal a newer failed/cancelled attempt
            # for the same code. Different revisions are checked via git objects.
            if old_source(run["head_sha"]) == source:
                return {"run": True, "reason": "A matching attempt has no usable retained evidence; validation required.", "baseline": baseline}
    return {"run": True, "reason": "Relevant code or environment has not been validated successfully.", "baseline": baseline}


def measurement_complete(report, suite):
    if suite == "calibration":
        return report.get("calibration", {}).get("eligibleForReview") is True
    required = {"idle": 60, "unrelated_activity": 60, "combined_activity": 60}
    if suite in ("release", "extended"):
        required["burst_recovery"] = 30
    if suite == "extended":
        required["soak"] = 1800
    for name, seconds in required.items():
        completed = False
        for scenario in report["scenarios"]:
            if scenario["id"].split("/")[-2:] != ["load", name] or scenario["status"] != "pass":
                continue
            measurement, load = scenario.get("measurement", {}), scenario.get("load", {})
            duration, scale = measurement.get("seconds"), measurement.get("durationScale")
            if type(duration) not in (int, float) or duration < seconds or type(scale) not in (int, float) or scale != 1:
                continue
            if load.get("requested") != load.get("planned") or load.get("completed") != load.get("requested") or load.get("failed") != 0:
                continue
            if load.get("expected_observed") != load.get("requested") or load.get("observed", -1) < load.get("expected_observed", 0):
                continue
            if name != "idle" and not load.get("requested", 0):
                continue
            completed = True
            break
        if not completed:
            return False
    return True


def finalize(path, output, outcome):
    receipt = quality.read_json(path, MAX_RECEIPT)
    if receipt["action"] == "skip":
        return
    receipt["result"] = "fail"
    receipt["measurementVerified"] = False
    report_path = output / "quality-report.json"
    if outcome == "success" and report_path.exists():
        report = quality.validate(quality.read_json(report_path))
        executions = report.get("executions") or [report]
        proof = any(item.get("suite") == receipt["suite"] and item.get("outcome") == "pass" and item.get("environment", {}).get("size") == receipt["configuration"]["size"]
                    and immutable_image(item.get("environment", {}).get("homeAssistantImage", "")) == receipt["configuration"]["image"] for item in executions)
        if report["outcome"] == "pass" and report["commit"] == receipt["commit"] and proof and measurement_complete(report, receipt["suite"]):
            receipt["result"] = "pass"
            receipt["measurementVerified"] = True
    path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--receipt", required=True, type=Path)
    parser.add_argument("--finalize", type=Path, help="Public result directory after execution")
    parser.add_argument("--outcome", default="failure")
    parser.add_argument("--kind", choices=("fixed", "candidate", "calibration"), default="fixed")
    parser.add_argument("--suite", choices=("smoke", "extended", "release", "calibration"), default="extended")
    parser.add_argument("--size", choices=("small", "large"), default="large")
    parser.add_argument("--visual", choices=("capture", "compare", "off"), default="capture")
    args = parser.parse_args()
    if args.finalize:
        finalize(args.receipt, args.finalize, args.outcome)
        return
    image = candidate_image() if args.kind == "candidate" else quality.read_json(ROOT / "scripts/quality/environment.json")["homeAssistant"]["image"]
    configuration = {"suite": args.suite, "size": args.size, "visual": args.visual, "image": immutable_image(image),
                     "runner": [os.getenv("ImageOS", "local"), os.getenv("ImageVersion", "unknown"), platform.machine()],
                     "python": platform.python_version(), "node": subprocess.check_output(["node", "--version"], text=True).strip()}
    source = source_fingerprint(ROOT)
    key = quality.fingerprint({"source": source, "configuration": configuration, "kind": args.kind})
    repository = os.getenv("GITHUB_REPOSITORY", "local")
    decision = {"run": True, "reason": "Manual execution requested; reuse is disabled.", "baseline": ""}
    if os.getenv("GITHUB_EVENT_NAME") == "schedule":
        try:
            history = History(repository, os.getenv("GH_TOKEN", ""))
            decision = decide(key, source, history.runs(os.getenv("GITHUB_REF_NAME", "main")), history.receipt, repository, args.kind,
                              lambda rev: source_fingerprint(ROOT, rev), os.getenv("GITHUB_RUN_ID"))
        except (OSError, ValueError, KeyError, TypeError, AttributeError, subprocess.SubprocessError, zipfile.BadZipFile):
            decision = {"run": True, "reason": "Prior measurement could not be verified; running safely.", "baseline": ""}
    receipt = {"schemaVersion": 1, "key": key, "sourceFingerprint": source, "kind": args.kind, "suite": args.suite,
               "configuration": configuration, "repository": repository, "commit": os.getenv("GITHUB_SHA") or subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
               "runId": os.getenv("GITHUB_RUN_ID", "local"), "runAttempt": os.getenv("GITHUB_RUN_ATTEMPT", "1"),
               "action": "run" if decision["run"] else "skip", "result": "pending" if decision["run"] else "skipped", **decision}
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(decision["reason"])
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as stream:
            stream.write("## Scheduled quality decision\n\n" + decision["reason"] + "\n")
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as stream:
            stream.write(f"run={str(decision['run']).lower()}\nimage={image}\nbaseline={decision['baseline']}\n")


if __name__ == "__main__":
    main()
