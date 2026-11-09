"""Run the same disposable HA/browser harness locally and in GitHub Actions."""
from __future__ import annotations

import argparse
import math
from contextlib import contextmanager
import json
import os
import platform
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import threading
import time
import uuid
import zipfile
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

sys.path.insert(0, str(Path(__file__).resolve().parent))
import report as quality
import browser as quality_browser

ROOT = Path(__file__).resolve().parents[2]
LOCK = ROOT / "scripts/quality/environment.json"
ACTION_CATALOG = ROOT / "scripts/quality/actions.json"


def resolve_visual_policy(value, lock):
    """Reviewed image comparison is independent of whether PR failures block."""
    mode = lock.get("visual", {}).get("mode", "capture") if value == "policy" else value
    if mode not in ("capture", "compare", "off"):
        raise ValueError("Invalid reviewed visual policy")
    return mode


@contextmanager
def private_runtime():
    """Keep the recovery handle if a container cannot be safely torn down."""
    directory = Path(tempfile.mkdtemp(prefix="velair-quality-runtime-"))
    try:
        yield directory
    finally:
        retained = [directory / name for name in ("ha-state.json", "browser-state.json") if (directory / name).exists()]
        if retained:
            for state in retained:
                print(f"Cleanup recovery state retained outside public output: {state}", file=sys.stderr)
        else:
            shutil.rmtree(directory)


def redacted(value, state):
    for key in ("password", "access_token", "oauth_access_token", "refresh_token"):
        secret = state.get(key)
        if isinstance(secret, str) and secret:
            value = value.replace(secret, "[redacted]")
    return value


def sanitize_browser_outputs(output, state):
    # HTML reports and auth files are never uploaded. These are the selected
    # machine files which can include Playwright call logs after a failure.
    for name in ("playwright.json", "metrics.json"):
        path = output / name
        if path.exists():
            path.write_text(redacted(path.read_text(encoding="utf-8"), state), encoding="utf-8")


def checked(command, *, cwd=ROOT, env=None, timeout=180):
    private_state = (env or {}).get("VELAIR_HA_STATE")
    result = subprocess.run([str(value) for value in command], cwd=cwd, env=env, timeout=timeout, check=False,
                            capture_output=bool(private_state), text=bool(private_state))
    if private_state:
        state = quality.read_json(Path(private_state))
        print(redacted(result.stdout or "", state), end="")
        print(redacted(result.stderr or "", state), end="", file=sys.stderr)
    return result.returncode


def revision(component):
    result = subprocess.run(["git", "-C", str(component), "rev-parse", "HEAD"], capture_output=True, text=True, check=False)
    if result.returncode:
        result = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "HEAD"], capture_output=True, text=True, check=True)
    return result.stdout.strip()


def workspace_dirty():
    return bool(subprocess.check_output(["git", "-C", str(ROOT), "status", "--porcelain"], text=True).strip())


def extract_component(archive: Path, destination: Path):
    """Extract only an integration archive; no links, traversal or zip bombs."""
    with zipfile.ZipFile(archive) as source:
        entries = source.infolist()
        if not entries or len(entries) > 10_000 or sum(item.file_size for item in entries) > 100_000_000:
            raise ValueError("Invalid integration archive size")
        for item in entries:
            path = PurePosixPath(item.filename)
            if path.is_absolute() or ".." in path.parts or "\\" in item.filename or not path.parts or path.parts[0] != "velair" or ":" in item.filename:
                raise ValueError("Unsafe integration archive path")
            mode = item.external_attr >> 16
            if stat.S_ISLNK(mode) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR)):
                raise ValueError("Integration archive contains a special file")
        source.extractall(destination)
    component = destination / "velair"
    if not (component / "manifest.json").is_file() or not (component / "frontend/velair-card.js").is_file():
        raise ValueError("Integration archive is incomplete")
    return component


def human_bytes(value):
    match = re.fullmatch(r"([0-9.]+)\s*(B|kB|KB|MB|GB|TB|KiB|MiB|GiB|TiB)", value.strip())
    if not match:
        raise ValueError("Unrecognized Docker memory unit")
    units = {"B": 1, "kB": 1000, "KB": 1000, "MB": 1000**2, "GB": 1000**3, "TB": 1000**4,
             "KiB": 1024, "MiB": 1024**2, "GiB": 1024**3, "TiB": 1024**4}
    return float(match[1]) * units[match[2]]


class Resources:
    def __init__(self, container):
        self.container = container
        self.samples = {"container_cpu_percent": [], "container_memory_bytes": []}
        self.errors = 0
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self.collect, daemon=True)

    def collect(self):
        while not self.stop_event.is_set():
            try:
                result = subprocess.run(["docker", "stats", "--no-stream", "--format", "{{json .}}", self.container],
                                        capture_output=True, text=True, check=True, timeout=12)
                row = json.loads(result.stdout)
                self.samples["container_cpu_percent"].append(float(row["CPUPerc"].rstrip("%")))
                self.samples["container_memory_bytes"].append(human_bytes(row["MemUsage"].split("/")[0]))
            except (OSError, ValueError, KeyError, subprocess.SubprocessError):
                self.errors += 1
            self.stop_event.wait(5)

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *_args):
        self.stop_event.set()
        self.thread.join(timeout=15)


def browser_scenarios(raw):
    catalog = {item["id"]: item for item in quality.read_json(ACTION_CATALOG)["actions"]}
    projects = {project for item in catalog.values() for variant in item["variants"] for project in variant.get("projects", [])}
    rows = []

    def annotation(test, name):
        values = {item.get("description") for item in test.get("annotations", []) if isinstance(item, dict) and item.get("type") == name and isinstance(item.get("description"), str)}
        return next(iter(values)) if len(values) == 1 else None

    def failed_step(steps, allowed):
        for step in steps:
            nested = failed_step(step.get("steps", []), allowed)
            if nested:
                return nested
            if step.get("error") is not None and step.get("title") in allowed:
                return step["title"]
        return None

    def visit(suites):
        for suite in suites:
            visit(suite.get("suites", []))
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    results = test.get("results", [])
                    expected = test.get("expectedStatus", "passed")
                    passed = expected == "passed" and bool(results) and all(item.get("status") == "passed" for item in results)
                    skipped = bool(results) and all(item.get("status") == "skipped" for item in results)
                    row = {"id": (f"browser/{test.get('projectName', 'chromium')}/{spec['title']}")[:200],
                           "status": "not-run" if skipped else "pass" if passed else "fail",
                           "samples": {}}
                    project = test.get("projectName")
                    if project in projects:
                        row["project"] = project
                    action_id, variant_id = annotation(test, "velair-action"), annotation(test, "velair-variant")
                    action = catalog.get(action_id)
                    variant = next((item for item in action["variants"] if item["id"] == variant_id), None) if action else None
                    if action and action["source"] == "browser" and variant and project in variant.get("projects", []):
                        row.update(actionId=action_id, actionVariant=variant_id)
                        failures = [result for result in results if result.get("status") not in ("passed", "skipped")]
                        stages = [failed_step(result.get("steps", []), action["steps"]) for result in failures]
                        if stages and stages[0] is not None and all(stage == stages[0] for stage in stages):
                            row["failureStep"] = stages[0]
                    elif any(isinstance(item, dict) and item.get("type") in ("velair-action", "velair-variant") for item in test.get("annotations", [])):
                        # A controlled marker prevents malformed explicit identity
                        # from being mistaken for a legacy title-only report.
                        row["actionId"] = "unclassified"
                    rows.append(row)
    visit(raw.get("suites", []))
    return rows


def load_scenario(row, duration_scale=1):
    mapped = {"passed": "pass", "failed": "fail", "skipped": "not-run"}.get(row.get("status"), row.get("status"))
    samples = dict(row.get("samples", {}))
    for name in ("updates", "long_tasks", "long_task_duration_ms", "heap_after_load_bytes", "heap_after_recovery_bytes", "velair_requests"):
        value = row.get("browser", {}).get(name)
        if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0:
            samples["browser_" + name] = [value]
    result = {"id": "load/" + row["id"], "status": mapped, "samples": samples,
              **({"measurement": {"seconds": row["phases"]["measurement_seconds"], "durationScale": duration_scale}} if "measurement_seconds" in row.get("phases", {}) else {}),
              **({"load": row["load"]} if row.get("load") else {})}
    if row.get("editingEvidence") == "draft-preserved-during-updates":
        result["editingEvidence"] = row["editingEvidence"]
    for action in quality.read_json(ACTION_CATALOG)["actions"]:
        variant = next((item for item in action["variants"] if item.get("scenario") == result["id"]), None)
        if action["source"] == "load" and variant:
            result.update(actionId=action["id"], actionVariant=variant["id"], project="desktop")
            if mapped == "fail" and row.get("failureStep") in action["steps"]:
                result["failureStep"] = row["failureStep"]
            break
    return result


def complete_visual_matrix(proof, mode, status):
    expected = {(project, f"{surface}-{theme}") for project in ("desktop", "mobile", "tablet")
                for surface in ("overview", "editor", "dialog") for theme in ("light", "dark")}
    rows = proof.get("executions", [])
    if not isinstance(rows, list) or len(rows) != len(expected) or any(
        not isinstance(row, dict) or row.get('status') != status
        or not isinstance(row.get('project'), str) or not isinstance(row.get('name'), str) for row in rows
    ):
        return False
    actual = {(item.get("project"), item.get("name")) for item in rows}
    return (proof.get("mode") == mode and proof.get("failed") == 0 and actual == expected
            and type(proof.get(status)) is int and proof[status] == len(expected)
            and all(proof.get(other, 0) == 0 for other in ("compared", "captured", "recorded") if other != status))


def visual_status(proof, mode, browser_exit):
    if mode == "off":
        return "off"
    status = "compared" if mode == "compare" else "captured"
    if browser_exit or proof.get("mode") != mode or proof.get("failed") != 0:
        return "missing-reference-or-failure"
    if not complete_visual_matrix(proof, mode, status):
        return "incomplete-visual-evidence"
    return "compared" if mode == "compare" else "capture-unreviewed"


def measurement_environment(lock, args):
    paths = [ROOT / "scripts/quality/run.py", ROOT / "scripts/quality/ha.py", ROOT / "scripts/quality/browser.py", ROOT / "scripts/quality/metrics.json", ROOT / "frontend/playwright.config.ts"]
    for folder in (ROOT / "frontend/e2e", ROOT / "tests/quality/ha_components"):
        paths += sorted(p for p in folder.rglob("*") if p.is_file() and p.suffix in (".py", ".ts", ".mjs", ".json", ".css", ".png"))
    definitions = {str(p.relative_to(ROOT)): quality.digest(p) for p in paths if p.is_file()}
    data = {"homeAssistantImage": args.image or lock["homeAssistant"]["image"], "playwrightVersion": lock["browser"]["packageVersion"],
            "browserImage": lock["browser"]["image"], "browserPlatform": "linux/amd64",
            "platform": platform.system(), "architecture": platform.machine(), "runnerImage": os.getenv("ImageOS", "local") + ":" + os.getenv("ImageVersion", "unknown"),
            "size": args.size, "suite": args.suite, "measurement": lock["measurement"], "definitions": definitions}
    data["fingerprint"] = quality.fingerprint(data)
    return data


def execute(args, component, output, label="candidate"):
    output.mkdir(parents=True, exist_ok=True)
    lock = quality.read_json(LOCK)
    result = {"schemaVersion": 1, "actionEvidenceVersion": 2, "invocationId": uuid.uuid4().hex,
              "generatedAt": datetime.now(UTC).isoformat(), "commit": os.getenv("QUALITY_TESTED_SHA" if label == "candidate" else "QUALITY_BASE_SHA") or revision(component),
              "suite": args.suite, "rollout": lock["rollout"]["mode"], "status": "infrastructure-error", "outcome": "infrastructure-error",
              "visualStatus": "not-run", "environment": measurement_environment(lock, args), "scenarios": [], "artifacts": [],
              "provenance": {"repository": os.getenv("GITHUB_REPOSITORY", "local"),
                             "headSha": os.getenv("QUALITY_HEAD_SHA", ""), "baseSha": os.getenv("QUALITY_BASE_SHA", ""),
                             "runId": os.getenv("GITHUB_RUN_ID", "local"), "runAttempt": os.getenv("GITHUB_RUN_ATTEMPT", "1"),
                             "event": os.getenv("GITHUB_EVENT_NAME", "local"), "workspaceDirty": workspace_dirty()}, "limitations": []}
    if result["provenance"]["workspaceDirty"]:
        result["limitations"].append("The measurement workspace has uncommitted changes; this local execution is not release evidence.")
    if args.archive and label == "candidate":
        result["artifacts"].append({"name": args.archive.name, "sha256": quality.digest(args.archive)})
        result["artifactRole"] = "release-package"
    else:
        result["artifactRole"] = "committed-integration" if args.suite == "release" else "ci-integration"
    bundle = component / "frontend/velair-card.js"
    result["componentBundleSha256"] = quality.digest(bundle) if bundle.exists() else None
    if os.getenv("QUALITY_COMPARISON_UNAVAILABLE"):
        result["limitations"].append(quality.text(os.environ["QUALITY_COMPARISON_UNAVAILABLE"], 500))
    # Auth and HA storage are siblings of the public output, never its children.
    with private_runtime() as private:
        state = Path(private) / "ha-state.json"
        env = dict(os.environ, VELAIR_HA_STATE=str(state), VELAIR_QUALITY_OUTPUT=str(output.resolve()),
                   VELAIR_QUALITY_SUITE=args.suite, VELAIR_QUALITY_VISUAL=args.visual)
        ha = [sys.executable, ROOT / "scripts/quality/ha.py"]
        try:
            started = checked([*ha, "start", "--component", component, "--state-file", state,
                               "--output", output, "--size", args.size, "--image", result["environment"]["homeAssistantImage"], "--port", args.port], timeout=360)
            if started:
                raise RuntimeError("Home Assistant preparation failed")
            runtime = quality.read_json(state)
            result["componentSha256"] = runtime["component_sha256"]
            result["environment"]["homeAssistantImageId"] = runtime["image_id"]
            result["environment"].pop("fingerprint", None)
            result["environment"]["fingerprint"] = quality.fingerprint(result["environment"])
            with quality_browser.server(lock, private) as renderer, Resources(runtime["container"]) as resources:
                env["VELAIR_BROWSER_WS"] = renderer["endpoint"]
                result["environment"]["browserImageId"] = renderer["imageId"]
                result["environment"].pop("fingerprint", None)
                result["environment"]["fingerprint"] = quality.fingerprint(result["environment"])
                npm = "npm.cmd" if os.name == "nt" else "npm"
                browser_exit = checked([npm, "run", "test:e2e"], cwd=ROOT / "frontend", env=env, timeout=720)
                load_exit = 0
                if args.suite != "calibration" and not args.skip_load:
                    load_exit = checked(["node", ROOT / "frontend/e2e/load.mjs", "--state", state, "--output", output,
                                         "--suite", args.suite], env=env, timeout=2700 if args.suite == "extended" else 600)
            raw_path = output / "playwright.json"
            sanitize_browser_outputs(output, runtime)
            if raw_path.exists():
                raw = quality.read_json(raw_path, 8_000_000)
                result["scenarios"] += browser_scenarios(raw)
            else:
                raise RuntimeError("Browser runner did not produce its report")
            metrics_path = output / "metrics.json"
            if metrics_path.exists():
                metrics = quality.read_json(metrics_path)
                for row in metrics.get("scenarios", []):
                    result["scenarios"].append(load_scenario(row, metrics.get("duration_scale")))
                result["limitations"] += metrics.get("limitations", [])
            elif not args.skip_load and args.suite != "calibration":
                raise RuntimeError("Load runner did not produce its report")
            proof_path = output / "visual-results.json"
            proof = quality.read_json(proof_path) if proof_path.exists() else {}
            result["visualStatus"] = visual_status(proof, args.visual, browser_exit)
            if args.visual != "off":
                result["limitations"].append("Selected visual screens use deterministic rendering inputs; separate functional journeys exercise real Home Assistant responses and scheduler time.")
            result["visualEvidence"] = {name: proof.get(name, 0) for name in ("compared", "captured", "failed")}
            result["scenarios"].append({"id": "resources/home-assistant", "status": "pass" if any(resources.samples.values()) else "not-run", "samples": resources.samples})
            if resources.errors:
                result["limitations"].append("Some container resource samples were unavailable.")
            functional = [row for row in result["scenarios"] if row["id"].startswith("browser/")]
            result["outcome"] = "pass" if not browser_exit and not load_exit and functional and all(row["status"] == "pass" for row in functional) and all(row["status"] != "fail" for row in result["scenarios"]) else "fail"
            if result["visualStatus"] not in ("compared", "capture-unreviewed", "off"):
                result["outcome"] = "fail"
            result["status"] = "unreviewed" if result["outcome"] == "pass" and result["visualStatus"] != "compared" else result["outcome"]
            if args.visual != "compare":
                result["limitations"].append("Visual references are not approved; captures are evidence, not a passed regression comparison.")
            if args.skip_load:
                result["limitations"].append("Load measurement was explicitly omitted for this diagnostic execution.")
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
            # Exception messages from subprocess/network libraries can contain credentials.
            result["limitations"].append(f"Infrastructure preparation or report collection failed ({type(error).__name__}).")
        finally:
            if state.exists():
                try:
                    sanitize_browser_outputs(output, quality.read_json(state))
                except (OSError, ValueError):
                    result["outcome"] = result["status"] = "infrastructure-error"
                    result["limitations"].append("Selected browser outputs could not be sanitized; do not publish raw execution files.")
                try:
                    if checked([*ha, "stop", "--state-file", state, "--output", output], timeout=300):
                        result["outcome"] = result["status"] = "infrastructure-error"
                        result["limitations"].append("Disposable Home Assistant teardown failed; operator cleanup required.")
                except (OSError, subprocess.SubprocessError):
                    result["outcome"] = result["status"] = "infrastructure-error"
                    result["limitations"].append("Disposable Home Assistant teardown could not complete.")
    quality.write(result, output)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--component", type=Path)
    source.add_argument("--archive", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--suite", choices=("smoke", "extended", "release", "calibration"), default="smoke")
    parser.add_argument("--size", choices=("small", "large"), default="small")
    parser.add_argument("--image")
    parser.add_argument("--port", type=int, default=8123)
    parser.add_argument("--visual", choices=("policy", "capture", "compare", "off"), default="policy")
    parser.add_argument("--skip-load", action="store_true")
    parser.add_argument("--reference", type=Path, help="Historical report; only matching measurement fingerprints compare")
    parser.add_argument("--baseline-component", type=Path, help="Paired sequential runs with the current harness")
    args = parser.parse_args()
    args.visual = resolve_visual_policy(args.visual, quality.read_json(LOCK))
    args.output = args.output.resolve()
    with tempfile.TemporaryDirectory(prefix="velair-quality-package-") as unpack:
        component = extract_component(args.archive.resolve(), Path(unpack)) if args.archive else args.component.resolve()
        if args.baseline_component:
            baseline_runs, candidate_runs = [], []
            for repetition in range(3):
                order = ("baseline", "candidate") if repetition % 2 == 0 else ("candidate", "baseline")
                for label in order:
                    target = args.baseline_component.resolve() if label == "baseline" else component
                    report = execute(args, target, args.output / f"{label}-{repetition + 1}", label)
                    (baseline_runs if label == "baseline" else candidate_runs).append(report)
            previous = quality.combine_repetitions(baseline_runs)
            result = quality.combine_repetitions(candidate_runs)
            result["comparison"] = quality.compare(previous, result)
        else:
            result = execute(args, component, args.output)
            if args.reference:
                result["comparison"] = quality.compare(quality.validate(quality.read_json(args.reference)), result)
        quality.write(result, args.output)
    return 0 if result["outcome"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
