"""Bounded public quality reports. No HA credentials or arbitrary log payloads."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from datetime import UTC, datetime
from pathlib import Path

MAX_REPORT_BYTES = 2_000_000
STATUSES = {"pass", "fail", "infrastructure-error", "not-run", "unreviewed"}
OUTCOMES = STATUSES - {"unreviewed"}
SHA = re.compile(r"^[a-f0-9]{40,64}$")
ACTION_KEY = re.compile(r"^[a-z][a-z0-9.-]{0,79}$")
METRICS = json.loads((Path(__file__).with_name("metrics.json")).read_text(encoding="utf-8"))
MEASUREMENT_GROUPS = (("latency", "Operation timings"), ("series", "Resource and responsiveness readings"), ("observations", "Per-execution observations"))


def read_json(path: Path, limit: int = MAX_REPORT_BYTES):
    if path.stat().st_size > limit:
        raise ValueError("Quality input exceeds size limit")
    return json.loads(path.read_text(encoding="utf-8"), parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))


def text(value, limit=240):
    if not isinstance(value, str) or len(value) > limit or any(ord(c) < 32 for c in value):
        raise ValueError("Invalid quality report text")
    return value


def validate(report):
    if not isinstance(report, dict) or report.get("schemaVersion") != 1:
        raise ValueError("Unsupported quality report")
    if type(report.get("actionEvidenceVersion", 1)) is not int or report.get("actionEvidenceVersion", 1) not in (1, 2):
        raise ValueError("Unsupported action evidence version")
    if report.get("status") not in STATUSES or report.get("outcome") not in OUTCOMES:
        raise ValueError("Invalid quality outcome")
    if not SHA.fullmatch(report.get("commit", "")):
        raise ValueError("Invalid tested commit")
    text(report.get("suite", ""), 50)
    provenance = report.get("provenance", {})
    for name in ("headSha", "baseSha"):
        if provenance.get(name) and not SHA.fullmatch(provenance[name]):
            raise ValueError("Invalid source revision")
    for key in ("repository", "runId", "runAttempt", "event"):
        if key in provenance:
            text(provenance[key])
    scenarios = report.get("scenarios", [])
    if not isinstance(scenarios, list) or len(scenarios) > 500:
        raise ValueError("Invalid scenario list")
    for scenario in scenarios:
        text(scenario.get("id", ""), 200)
        if scenario.get("status") not in STATUSES:
            raise ValueError("Invalid scenario outcome")
        if "editingEvidence" in scenario and scenario["editingEvidence"] != "draft-preserved-during-updates":
            raise ValueError("Invalid editing evidence")
        for key in ("actionId", "actionVariant", "failureStep", "project"):
            if key in scenario and (not isinstance(scenario[key], str) or not ACTION_KEY.fullmatch(scenario[key])):
                raise ValueError("Invalid action metadata")
        if "actionVariant" in scenario and "actionId" not in scenario or "failureStep" in scenario and ("actionId" not in scenario or scenario["status"] not in ("fail", "infrastructure-error")):
            raise ValueError("Inconsistent action metadata")
        for key, values in scenario.get("samples", {}).items():
            text(key, 80)
            if not isinstance(values, list) or len(values) > 100_000:
                raise ValueError("Invalid metric samples")
            if any(isinstance(v, bool) or not isinstance(v, (float, int)) or not math.isfinite(v) or v < 0 for v in values):
                raise ValueError("Non-finite or negative sample")
        load = scenario.get("load")
        if load:
            for key in ("requested", "completed", "observed", "expected_observed"):
                if not isinstance(load.get(key), int) or isinstance(load[key], bool) or load[key] < 0:
                    raise ValueError("Invalid load counters")
            if scenario["status"] == "pass" and (load["completed"] != load["requested"] or load["observed"] < load["expected_observed"]):
                raise ValueError("Incomplete load cannot pass")
    limits = report.get("limitations", [])
    if not isinstance(limits, list) or len(limits) > 100:
        raise ValueError("Invalid limitations")
    for value in limits:
        text(value, 500)
    artifacts = report.get("artifacts", [])
    if not isinstance(artifacts, list) or len(artifacts) > 20:
        raise ValueError("Invalid artifacts")
    for artifact in artifacts:
        name = text(artifact.get("name", ""), 150)
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", name) or not re.fullmatch(r"[a-f0-9]{64}", artifact.get("sha256", "")):
            raise ValueError("Invalid artifact identity")
    if report.get("releaseVersion") and not re.fullmatch(r"\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?", report["releaseVersion"]):
        raise ValueError("Invalid release version")
    return report


def digest(path):
    hasher = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(block)
    return hasher.hexdigest()


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def summarize(samples):
    if not samples:
        return {"count": 0, "median": None, "p95": None, "min": None, "max": None}
    ordered = sorted(samples)
    middle = len(ordered) // 2
    median = ordered[middle] if len(ordered) % 2 else ordered[middle - 1] + (ordered[middle] - ordered[middle - 1]) / 2
    return {"count": len(samples), "median": median,
            "p95": ordered[math.ceil(0.95 * len(samples)) - 1] if len(samples) >= 100 else None,
            "min": ordered[0], "max": ordered[-1]}


def metric_definition(scenario, name):
    """Known meaning in a valid scope; historical unknowns remain raw JSON only."""
    if not isinstance(scenario, str) or not isinstance(name, str):
        return None
    definition = METRICS.get(name)
    identifier = re.sub(r"^(?:execution-\d+/)+", "", scenario)
    if not definition or not (definition["scope"] == "load" and identifier.startswith("load/") or definition["scope"] == "resources" and identifier == "resources/home-assistant"):
        return None
    if name in ("interaction_ms", "save_persist_ms") and identifier not in ("load/combined_activity", "load/soak"):
        return None
    if name == "service_roundtrip_ms" and identifier == "load/idle":
        return None
    return definition


def metric_summary(scenario, name, values):
    definition = metric_definition(scenario, name)
    if not definition or definition["kind"] not in ("latency", "series") or not values:
        return None
    result = summarize(values)
    if definition["kind"] != "latency" or result["p95"] is None:
        result.pop("p95")
    return result


def measurement_number(value):
    if value and value < .01:
        return "<0.01"
    return f"{value:,.2f}".rstrip("0").rstrip(".")


def measurement_rows(report):
    """Shared HTML/Markdown presentation, without percentiles on counters or gauges."""
    rows = []
    for scenario in report.get("scenarios", []):
        for name, values in scenario.get("samples", {}).items():
            definition = metric_definition(scenario["id"], name)
            if not definition:
                continue
            kind = definition["kind"]
            row = {"scenario": scenario["id"], "name": name, "label": definition["label"], "context": definition["context"],
                   "group": kind if kind in ("latency", "series") else "observations"}
            if scenario["status"] != "pass":
                rows.append({**row, "recorded": "—", "value": f'Unavailable: scenario {scenario["status"]}.'})
                continue
            if not values:
                rows.append({**row, "recorded": "0", "value": "Not recorded."})
                continue
            fmt = lambda value: f'{measurement_number(value / definition["divisor"])} {definition["unit"]}'
            count = len(values)
            if kind in ("counter", "snapshot"):
                record = "execution total" if kind == "counter" else "snapshot"
                # Repetitions remain one reading per execution, never a distribution of events.
                value = fmt(values[0]) if count == 1 else 'Per execution: ' + ', '.join(fmt(value) for value in values[:20]) + (f' (+{count - 20} more in JSON)' if count > 20 else '')
                row.update(recorded=f'{count} {record}{"s" if count != 1 else ""}', value=value)
            else:
                stats = metric_summary(scenario["id"], name, values)
                value = fmt(stats["median"]) + (' observed' if count == 1 else f' median · observed range {fmt(stats["min"])}–{fmt(stats["max"])}')
                if "p95" in stats:
                    value += f' · p95 {fmt(stats["p95"])}'
                record = "operation" if kind == "latency" else "reading"
                row.update(recorded=f'{count} {record}{"s" if count != 1 else ""}', value=value)
            rows.append(row)
    return rows


def compare(baseline, candidate):
    """Same measurement inputs; never compare absolute readings across runners."""
    if baseline.get("outcome") != "pass" or candidate.get("outcome") != "pass":
        return {"status": "not-comparable", "reason": "Both executions must complete successfully."}
    if not baseline.get("environment", {}).get("fingerprint") or baseline["environment"]["fingerprint"] != candidate.get("environment", {}).get("fingerprint"):
        return {"status": "not-comparable", "reason": "Measurement environment or scenario definitions differ."}
    old = {row["id"]: row for row in baseline["scenarios"]}
    if set(old) != {row["id"] for row in candidate["scenarios"]}:
        return {"status": "not-comparable", "reason": "Scenario sets differ."}
    rows = []
    for current in candidate["scenarios"]:
        previous = old[current["id"]]
        if current["status"] != "pass" or previous["status"] != "pass":
            return {"status": "not-comparable", "reason": "All compared scenarios must pass."}
        for metric, values in current.get("samples", {}).items():
            a = metric_summary(current["id"], metric, previous.get("samples", {}).get(metric, []))
            b = metric_summary(current["id"], metric, values)
            if a is not None and b is not None:
                delta = ((b["median"] / a["median"]) - 1) * 100 if a["median"] else None
                if delta is not None and not math.isfinite(delta):
                    delta = None
                rows.append({"scenario": current["id"], "metric": metric, "baseline": a, "candidate": b, "changePercent": delta})
                rows[-1]["baselineRunMedians"] = previous.get("runMedians", {}).get(metric, [])
                rows[-1]["candidateRunMedians"] = current.get("runMedians", {}).get(metric, [])
    return {"status": "comparable" if rows else "not-comparable", "baselineCommit": baseline["commit"],
            "candidateCommit": candidate["commit"], "metrics": rows,
            "reason": "Descriptive measurements; performance is not a blocking threshold." if rows else "No shared samples."}


def escape(value):
    return str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("|", "&#124;").replace("`", "&#96;").replace("\n", " ")


def markdown(report):
    validate(report)
    lines = ["# Velair quality report", "", f"- Tested commit: `{report['commit']}`",
             f"- Suite: {escape(report['suite'])}", f"- Execution: **{report['outcome']}**",
             f"- Visual evidence: {escape(report.get('visualStatus', 'not-run'))}",
             f"- Rollout: {escape(report.get('rollout', 'observe'))}; performance is informational.", "",
             "| Scenario | Result |", "| --- | --- |"]
    if report.get("componentSha256"):
        lines[3:3] = [f"- Tested component SHA-256: `{report['componentSha256']}`"]
    if report.get("calibration"):
        evidence = report["calibration"]
        lines[3:3] = [f"- Consecutive calibration runs: {evidence['stableRuns']}/{evidence['required']}; eligible for independent review: {evidence['eligibleForReview']}."]
    for row in report.get("scenarios", []):
        lines.append(f"| {escape(row['id'])} | {row['status']} |")
    metrics = measurement_rows(report)
    for group, heading in MEASUREMENT_GROUPS:
        selected = [row for row in metrics if row["group"] == group]
        if selected:
            lines += ["", f"## {heading}", "", "| Scenario / measurement | Recorded | Result |", "| --- | --- | --- |"]
            for row in selected:
                lines.append(f'| {escape(row["scenario"])} / {escape(row["label"])}. {escape(row["context"])} | {escape(row["recorded"])} | {escape(row["value"])} |')
    comparisons = [item for item in [report.get("comparison"), *[r.get("comparison") for r in report.get("executions", [])]] if item]
    seen = set()
    for comparison in comparisons:
        key = json.dumps(comparison, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        lines += ["", f"Comparison: **{escape(comparison['status'])}**. {escape(comparison.get('reason', ''))}"]
        for metric in comparison.get("metrics", []):
            definition = metric_definition(metric.get("scenario", ""), metric.get("metric"))
            if not definition or definition["kind"] not in ("latency", "series"):
                continue
            change = metric.get("changePercent")
            lines.append(f"- {escape(metric['scenario'])} / {escape(definition['label'])}: " + (f"{change:+.1f}% median change." if change is not None else "percentage unavailable for zero baseline or unsupported numeric range."))
            for side in ("baseline", "candidate"):
                medians = metric.get(side + "RunMedians", [])
                if medians:
                    lines.append(f"  {side.capitalize()} run medians: " + ", ".join(f"{measurement_number(value / definition['divisor'])} {definition['unit']}" for value in medians) + ".")
    if report.get("artifacts"):
        lines += ["", "Validated assets:"]
        lines += [f"- `{escape(item['name'])}` SHA-256 `{item['sha256']}`" for item in report["artifacts"]]
    lines += ["", "Limitations:"] + [f"- {escape(item)}" for item in report.get("limitations", [])]
    lines += ["- Synthetic entities do not establish compatibility with every physical device.",
              "- Container CPU and memory cover Home Assistant as a whole, not Velair alone.", ""]
    return "\n".join(lines)


def write(report, output):
    validate(report)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(report, indent=2, allow_nan=False) + "\n"
    if len(encoded.encode()) > MAX_REPORT_BYTES:
        raise ValueError("Generated report exceeds public size limit")
    (output / "quality-report.json").write_text(encoded, encoding="utf-8")
    (output / "quality-report.md").write_text(markdown(report), encoding="utf-8")


def aggregate(reports, release_version=None):
    if not reports:
        raise ValueError("Missing quality evidence")
    for report in reports:
        validate(report)
    commits = {item["commit"] for item in reports}
    if len(commits) != 1:
        raise ValueError("Cannot aggregate different tested commits")
    result = dict(reports[0])
    outcome = next((s for s in ("infrastructure-error", "fail", "not-run") if any(r["outcome"] == s for r in reports)), "pass")
    result.update(suite="release" if release_version else "aggregate", outcome=outcome,
                  status=outcome if outcome != "pass" else ("unreviewed" if any(r["status"] == "unreviewed" for r in reports) else "pass"),
                  scenarios=[], artifacts=[], limitations=[], executions=[])
    for index, report in enumerate(reports):
        result["scenarios"].extend({**row, "id": f"execution-{index + 1}/{row['id']}"} for row in report["scenarios"])
        result["limitations"].extend(report.get("limitations", []))
        result["executions"].append({key: report.get(key, 1) if key == "actionEvidenceVersion" else report.get(key) for key in ("suite", "outcome", "visualStatus", "environment", "comparison", "artifactRole", "componentSha256", "componentBundleSha256", "actionEvidenceVersion")})
        for artifact in report.get("artifacts", []):
            if artifact not in result["artifacts"]:
                if any(item["name"] == artifact["name"] for item in result["artifacts"]):
                    raise ValueError("Conflicting artifact digests")
                result["artifacts"].append(artifact)
    result["limitations"] = list(dict.fromkeys(result["limitations"]))
    roles = {report.get("artifactRole") for report in reports}
    if len(roles) == 1 and None not in roles:
        result["artifactRole"] = roles.pop()
    if release_version:
        result["releaseVersion"] = release_version
    return result


def calibration(reports, required=10):
    """Evidence only; never automatically change repository branch settings."""
    passed = []
    identity = None
    for report in sorted(reports, key=lambda item: item.get("generatedAt", "")):
        validate(report)
        key = (report["commit"], report.get("environment", {}).get("fingerprint"), report.get("componentSha256"))
        if report["outcome"] != "pass" or report.get("visualStatus") != "compared" or not key[1]:
            passed, identity = [], None
            continue
        if identity != key:
            passed, identity = [], key
        invocation = report.get("invocationId")
        if invocation and invocation not in passed:
            passed.append(invocation)
    return {"stableRuns": len(passed), "required": required, "eligibleForReview": len(passed) >= required,
            "automaticActivation": False}


def combine_repetitions(reports):
    """One estimate per scenario, with run medians retained for variability."""
    severity = {"pass": 0, "unreviewed": 1, "not-run": 2, "fail": 3, "infrastructure-error": 4}
    result = aggregate(reports)
    if len({r.get("environment", {}).get("fingerprint") for r in reports}) != 1 or len({r.get("actionEvidenceVersion", 1) for r in reports}) != 1:
        result["environment"] = {**result.get("environment", {}), "fingerprint": None}
        result["limitations"].append("Repeated executions had different environments or action scopes; their samples were not pooled.")
        return result
    grouped = {}
    measurements = {}
    identities = {}
    for report in reports:
        for scenario in report["scenarios"]:
            measurements.setdefault(scenario["id"], []).append(scenario.get("measurement"))
            identities.setdefault(scenario["id"], []).append(scenario)
            row = grouped.setdefault(scenario["id"], {"id": scenario["id"], "status": "pass", "samples": {}, "runMedians": {}})
            if severity[scenario["status"]] > severity[row["status"]]:
                row["status"] = scenario["status"]
            for name, values in scenario.get("samples", {}).items():
                row["samples"].setdefault(name, []).extend(values)
                if values and metric_summary(scenario["id"], name, values) is not None:
                    row["runMedians"].setdefault(name, []).append(summarize(values)["median"])
            if scenario.get("load"):
                load = row.setdefault("load", {key: 0 for key in ("requested", "completed", "observed", "expected_observed")})
                for key in ("planned", "failed"):
                    if key in scenario["load"]:
                        load.setdefault(key, 0)
                for key in load:
                    load[key] += scenario["load"].get(key, 0)
    for identifier, row in grouped.items():
        phases = measurements[identifier]
        if len(phases) == len(reports) and phases[0] is not None and all(value == phases[0] for value in phases):
            row["measurement"] = phases[0]
        sources = identities[identifier]
        editing = [source.get("editingEvidence") for source in sources]
        if len(editing) == len(reports) and all(value == "draft-preserved-during-updates" for value in editing):
            row["editingEvidence"] = editing[0]
        if len(sources) != len(reports) and severity[row["status"]] < severity["not-run"]:
            row["status"] = "not-run"
        for key in ("actionId", "actionVariant", "project"):
            values = [source.get(key) for source in sources]
            if len(values) == len(reports) and values[0] is not None and all(value == values[0] for value in values):
                row[key] = values[0]
        if any("actionId" in source for source in sources) and "actionId" not in row:
            row["actionId"] = "unclassified"
            row.pop("actionVariant", None)
        if "actionId" not in row:
            row.pop("actionVariant", None)
        failures = [source for source in sources if source["status"] != "pass"]
        stages = [source.get("failureStep") for source in failures]
        if row.get("actionId") not in (None, "unclassified") and stages and stages[0] is not None and all(stage == stages[0] for stage in stages):
            row["failureStep"] = stages[0]
    result["scenarios"] = list(grouped.values())
    return validate(result)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs", nargs="+", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--release-version")
    parser.add_argument("--calibration", action="store_true")
    args = parser.parse_args()
    paths = sorted({p for item in args.inputs for p in ([item] if item.is_file() else item.rglob("quality-report.json"))})
    reports = [validate(read_json(path)) for path in paths]
    if args.calibration:
        if not reports:
            raise ValueError("Missing calibration evidence")
        result = dict(max(reports, key=lambda item: item.get("generatedAt", "")))
        result["calibration"] = calibration(reports)
        result["limitations"] = [*result.get("limitations", []), "Calibration eligibility requires independent review; it does not activate required checks."]
    else:
        result = aggregate(reports, args.release_version)
    write(result, args.output)
    return 0 if result["outcome"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
