"""Trusted product-action descriptions and conservative execution-local results."""
from __future__ import annotations

import json
import math
from pathlib import Path
import re
import statistics
import sys

CATALOG_PATH = Path(__file__).with_name("actions.json")
CATALOG = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
DEVICES = {"desktop": "Desktop", "mobile": "Mobile", "tablet": "Tablet"}
STATUSES = {"pass", "fail", "infrastructure-error", "not-run", "unreviewed"}
MAX_BYTES = 2_000_000


def catalogue():
    return CATALOG


def measurements():
    return {item["metric"]: item for action in CATALOG["actions"] for item in action.get("measurements", [])}


def _validate(report):
    if not isinstance(report, dict) or not isinstance(report.get("scenarios"), list) or len(report["scenarios"]) > 500:
        raise ValueError("Invalid action evidence")
    if type(report.get("actionEvidenceVersion", 1)) is not int or report.get("actionEvidenceVersion", 1) not in (1, 2):
        raise ValueError("Unsupported action evidence version")
    for row in report["scenarios"]:
        if not isinstance(row, dict) or not isinstance(row.get("id"), str) or len(row["id"]) > 200 or not isinstance(row.get("status"), str) or row["status"] not in STATUSES:
            raise ValueError("Invalid action result")
        samples = row.get("samples", {})
        if not isinstance(samples, dict):
            raise ValueError("Invalid action measurements")
        for values in samples.values():
            if not isinstance(values, list) or len(values) > 100_000 or any(isinstance(value, bool) or not isinstance(value, (float, int)) or value < 0 or not math.isfinite(value) for value in values):
                raise ValueError("Invalid action measurements")


def _match(row, version):
    """Use annotations first; historical titles must match exactly."""
    browser = re.fullmatch(r"browser/(desktop|mobile|tablet)/(.+)", row["id"])
    for definition in CATALOG["actions"]:
        if version < definition.get("sinceEvidenceVersion", 1):
            continue
        for variant in definition["variants"]:
            if not variant.get("minEvidenceVersion", 1) <= version <= variant.get("maxEvidenceVersion", 2):
                continue
            if row.get("actionId") is not None:
                if row["actionId"] != definition["id"] or row.get("actionVariant") != variant["id"]:
                    continue
                if definition["source"] == "browser":
                    project = row.get("project")
                    if not browser or project != browser[1] or project not in variant["projects"]:
                        continue
                else:
                    project = "desktop"
                    if row["id"] != variant["scenario"] or row.get("project", project) != project:
                        continue
                return definition, variant, project
            if definition["source"] == "browser" and browser and browser[2] == variant["title"] and browser[1] in variant["projects"]:
                return definition, variant, browser[1]
            if definition["source"] == "load" and row["id"] == variant["scenario"]:
                return definition, variant, "desktop"
    return None


def _load_evidence(row, definition, version):
    if row["status"] != "pass":
        return row
    load = row.get("load")
    keys = ("requested", "completed", "observed", "expected_observed")
    if not isinstance(load, dict) or any(not isinstance(load.get(key), int) or isinstance(load[key], bool) or not 0 <= load[key] <= 2 ** 53 - 1 for key in keys):
        return {**row, "status": "not-run"}
    if any(key in load and (not isinstance(load[key], int) or isinstance(load[key], bool) or not 0 <= load[key] <= 2 ** 53 - 1) for key in ("planned", "failed")):
        return {**row, "status": "not-run"}
    if load["observed"] > load["requested"] or load["expected_observed"] > load["requested"] or (definition["id"] != "household.idle" and (load["requested"] == 0 or load["expected_observed"] == 0)):
        return {**row, "status": "not-run"}
    if load["completed"] != load["requested"] or load["observed"] < load["expected_observed"] or load.get("failed", 0) != 0 or ("planned" in load and load["planned"] != load["requested"]):
        return {**row, "status": "fail"}
    if definition["kind"] == "action" and any(not row.get("samples", {}).get(item["metric"]) for item in definition.get("measurements", [])):
        return {**row, "status": "not-run"}
    if definition["id"] == "household.use-velair" and version >= 2 and row.get("editingEvidence") != "draft-preserved-during-updates":
        return {**row, "status": "not-run"}
    return row


def _state(cases):
    if any(row["status"] in ("fail", "infrastructure-error") for case in cases for row in case):
        return "fail"
    if cases and all(case and all(row["status"] == "pass" for row in case) for case in cases):
        return "pass"
    return "partial" if any(row["status"] in ("pass", "unreviewed") for case in cases for row in case) else "not-run"


def _visual_states(report):
    executions = report.get("executions")
    return [item.get("visualStatus") if isinstance(item, dict) else None for item in executions] if isinstance(executions, list) and executions else [report.get("visualStatus")]


def describe(report):
    """Normalize one execution, never combine package and HACS measurements."""
    _validate(report)
    version = report.get("actionEvidenceVersion", 1)
    matched = {}
    unclassified = 0
    for row in report["scenarios"]:
        match = _match(row, version)
        if match:
            definition, variant, device = match
            matched.setdefault((definition["id"], variant["id"], device), []).append(_load_evidence(row, definition, version) if definition["source"] == "load" else row)
        elif row["id"] != "resources/home-assistant":
            unclassified += 1
    output = {"schemaVersion": 1, "actions": [], "conditions": [], "visuals": [], "unclassified": unclassified}
    for definition in CATALOG["actions"]:
        if version < definition.get("sinceEvidenceVersion", 1):
            continue
        variants, all_cases, failures, metrics = [], [], [], []
        observed_devices = set()
        for variant in definition["variants"]:
            if not variant.get("minEvidenceVersion", 1) <= version <= variant.get("maxEvidenceVersion", 2):
                continue
            if definition["source"] == "load":
                suite = report.get("suite")
                present = (definition["id"], variant["id"], "desktop") in matched
                if suite not in variant["suites"] and not present:
                    continue
            devices = variant.get("projects", ["desktop"])
            cases = [matched.get((definition["id"], variant["id"], device), []) for device in devices]
            all_cases.extend(cases)
            state = _state(cases)
            passed = sum(bool(case) and all(row["status"] == "pass" for row in case) for case in cases)
            coverage = ["Home Assistant runtime (API)" if definition.get("runtimeOnly") else DEVICES[device] for device, case in zip(devices, cases) if any(row["status"] != "not-run" for row in case)]
            observed_devices.update(coverage)
            variants.append({"id": variant["id"], "name": variant["name"], "status": state, "passed": passed, "expected": len(devices), "result": f'{passed}/{len(devices)} checks passed', "coverage": ", ".join(coverage) or "Not recorded"})
            for device, case in zip(devices, cases):
                if not case or any(row["status"] != "pass" for row in case):
                    failed = [row for row in case if row["status"] in ("fail", "infrastructure-error")]
                    step_ids = {row.get("failureStep") for row in failed if isinstance(row.get("failureStep"), str)}
                    step = definition["steps"].get(next(iter(step_ids))) if len(step_ids) == 1 and len(failed) == len(case) else None
                    if step is None and failed:
                        step = "Failed during this action; step not recorded"
                    failures.append({"variant": variant["name"], "device": "HA runtime" if definition.get("runtimeOnly") else DEVICES[device], "step": step or "Not checked successfully", "result": "Failed" if failed else "Not run" if not case or all(row["status"] == "not-run" for row in case) else "Incomplete"})
            if definition["id"] == "household.use-velair" and state == "pass":
                for measurement in definition.get("measurements", []):
                    key, label = measurement["metric"], measurement["name"]
                    values = [value for case in cases for row in case for value in row.get("samples", {}).get(key, [])]
                    if values:
                        median = statistics.median(values)
                        if math.isfinite(median):
                            metrics.append({"label": label, "median": median, "count": len(values), "unit": "ms", "variant": variant["name"]})
        if not variants:
            continue
        state = _state(all_cases)
        passed = sum(variant["passed"] for variant in variants)
        expected = sum(variant["expected"] for variant in variants)
        label = {"pass": "Passed", "fail": "Failed", "partial": "Partial coverage", "not-run": "Not run"}[state]
        if definition["kind"] == "visual":
            visual_states = _visual_states(report)
            if state == "pass" and all(value == "compared" for value in visual_states):
                label = "Compared with reference images"
            elif state == "pass" and all(isinstance(value, str) and value in ("compared", "capture-unreviewed") for value in visual_states):
                state, label = "unreviewed", "Captures awaiting review"
            elif state == "pass":
                state, label = "not-run", "Visual comparison not established"
        progress = f'{passed}/{expected} checks' + (' passed' if state in ("fail", "partial") else '')
        checks = definition.get("legacyChecks", definition["checks"]) if version == 1 else definition["checks"]
        coverage = ("Home Assistant runtime (API)" if observed_devices else "Not recorded") if definition.get("runtimeOnly") else ", ".join(name for name in DEVICES.values() if name in observed_devices) or "Not recorded"
        item = {"id": definition["id"], "name": definition["name"], "checks": checks, "kind": definition["kind"], "status": state, "result": f'{label} · {progress}', "coverage": coverage, "coverageLabel": "Scope" if definition.get("runtimeOnly") else "Screens", "variants": variants, "failures": failures, "metrics": metrics}
        output[{"action": "actions", "condition": "conditions", "visual": "visuals"}[definition["kind"]]].append(item)
    return output


def main():
    raw = sys.stdin.buffer.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("Action evidence exceeds size limit")
    report = json.loads(raw, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
    encoded = json.dumps(describe(report), allow_nan=False)
    if len(encoded.encode()) > 128_000:
        raise ValueError("Action overview exceeds size limit")
    print(encoded)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, TypeError, OverflowError, KeyError):
        print("Action overview unavailable: invalid evidence", file=sys.stderr)
        raise SystemExit(1)
