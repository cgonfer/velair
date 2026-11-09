"""Render permanent release evidence into the existing static GitHub Pages site."""
from __future__ import annotations

import argparse
import html
import json
import math
import os
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import report as quality
import actions as action_evidence

REPOSITORY = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
TAG = re.compile(r"^v\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$")
PUBLIC = Path(__file__).resolve().parents[2] / "website/public"


def download(url, token=None, limit=quality.MAX_REPORT_BYTES):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "velair-quality"}
    if token:
        if not url.startswith("https://api.github.com/"):
            raise ValueError("Refusing to send credentials to asset hosting")
        headers["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Release evidence exceeds size limit")
    return json.loads(data, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))


def released_reports(repository, fetch=download):
    if not REPOSITORY.fullmatch(repository):
        raise ValueError("Invalid repository")
    reports = []
    token = os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN")
    for page in range(1, 11):
        releases = fetch(f"https://api.github.com/repos/{repository}/releases?per_page=100&page={page}", token=token)
        if not isinstance(releases, list):
            raise ValueError("Invalid release listing")
        for release in releases:
            tag = release.get("tag_name", "")
            if release.get("draft") or not TAG.fullmatch(tag):
                continue
            assets = [a for a in release.get("assets", []) if a.get("name") == "quality-report.json"]
            report = None
            if assets:
                if len(assets) != 1:
                    raise ValueError("Duplicate release evidence")
                url = assets[0].get("browser_download_url", "")
                expected = f"https://github.com/{repository}/releases/download/{tag}/quality-report.json"
                if url != expected:
                    raise ValueError("Unexpected release evidence URL")
                # Download public release data without a token; redirect hosts never receive credentials.
                report = quality.validate(fetch(url))
                if report.get("releaseVersion") != tag[1:]:
                    raise ValueError("Release evidence version mismatch")
            reports.append({"tag": tag, "prerelease": bool(release.get("prerelease")), "report": report})
        if len(releases) < 100:
            break
    return reports


def shared_shell():
    """The homepage remains the source of truth for the site's chrome."""
    home = (PUBLIC / "index.html").read_text(encoding="utf-8")
    header = re.search(r'<header class="site-header">.*?</header>', home, re.S)
    footer = re.search(r'<footer>.*?</footer>', home, re.S)
    if not header or not footer:
        raise ValueError("Website header or footer is missing")

    def relative_attributes(markup):
        def rewrite(match):
            attribute, value = match.groups()
            if value.startswith("assets/"):
                value = "../" + value
            elif attribute == "href" and value.startswith("#"):
                value = "../index.html" + value
            elif attribute == "href" and value == "quality/":
                return 'href="index.html" aria-current="page"'
            return f'{attribute}="{value}"'
        return re.sub(r'(href|src)="([^"]+)"', rewrite, markup)

    return relative_attributes(header[0]), relative_attributes(footer[0])


def page(title, body, *, report=False):
    e = html.escape
    header, footer = shared_shell()
    return f'''<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0f1418">
<title>{e(title)} · Velair</title><meta name="description" content="Reproducible test evidence and limitations for published Velair versions.">
<script src="../theme-init.js"></script>
<link rel="icon" href="../assets/velair-icon.png"><link rel="stylesheet" href="../styles.css"><link rel="stylesheet" href="quality.css">
<script src="../app.js" defer></script></head>
<body class="quality-page{' quality-report-page' if report else ''}"><a class="skip-link" href="#main">Skip to content</a>
{header}
<main id="main" class="quality-main">{body}</main>{footer}</body></html>
'''


WORKLOADS = {
    "idle": "At rest", "unrelated_activity": "Household activity",
    "combined_activity": "Combined activity", "burst_recovery": "Burst and recovery", "soak": "Sustained activity",
}
ROLES = {"release-package": "Release package", "committed-integration": "HACS installation"}
STATES = {"pass": "Passed", "fail": "Failed", "partial": "Incomplete", "infrastructure-error": "Could not complete", "not-run": "Not run", "unreviewed": "Unreviewed"}


def number(value):
    if value >= 1_000_000:
        return f"{value:.3g}"
    if 0 < value < .01:
        return "<0.01"
    return f"{value:,.2f}".rstrip("0").rstrip(".")


def finite(value):
    try:
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0
    except OverflowError:
        return False


def mapped(mapping, value, default):
    return mapping.get(value, default) if isinstance(value, str) else default


def summary(row, metric):
    """Only successful scenarios contribute to descriptive performance charts."""
    values = row.get("samples", {}).get(metric, [])
    if row.get("status") != "pass" or not values:
        return None
    result = quality.metric_summary(row.get("id", ""), metric, values)
    return result if result and all(value is None or finite(value) for value in result.values()) else None


def execution_groups(report):
    executions = report.get("executions")
    if not isinstance(executions, list) or not executions or not any(re.match(r"execution-\d+/", row["id"]) for row in report["scenarios"]):
        return [(report, report["scenarios"])]
    groups = []
    assigned = set()
    for index, execution in enumerate(executions):
        if not isinstance(execution, dict):
            continue
        prefix = f"execution-{index + 1}/"
        rows = [{**row, "id": row["id"][len(prefix):]} for row in report["scenarios"] if row["id"].startswith(prefix)]
        assigned.update(row["id"] for row in report["scenarios"] if row["id"].startswith(prefix))
        if rows:
            groups.append((execution, rows))
    remaining = [row for row in report["scenarios"] if row["id"] not in assigned]
    if remaining:
        groups.append(({"suite": "Unassigned execution", "outcome": "not-run"}, remaining))
    return groups


def visual_label(execution):
    repetitions = execution.get("executions")
    states = [item.get("visualStatus") if isinstance(item, dict) else None for item in repetitions] if isinstance(repetitions, list) and repetitions else [execution.get("visualStatus")]
    if all(state == "compared" for state in states):
        return "Compared with references"
    if all(isinstance(state, str) and state in ("compared", "capture-unreviewed") for state in states):
        return "Captures awaiting review"
    if all(state == "off" for state in states):
        return "Visual checks disabled"
    return "Visual evidence incomplete"


def bar_chart(title, description, rows, unit, *, divisor=1, quantiles=True, readings=False):
    """Zero-based bars with their values in ordinary accessible HTML."""
    e = html.escape
    maximum = max((item[1]["median"] / divisor for item in rows if item[1]), default=0)
    body = f'<figure class="quality-chart"><figcaption><h3>{e(title)}</h3><p>{e(description)}</p></figcaption><ul class="quality-bars">'
    for label, stats, state in rows:
        body += f'<li><div class="quality-bar-label"><span>{e(label)}</span>'
        if stats is None:
            body += f'<strong class="quality-muted">{e(state)}</strong></div></li>'
            continue
        value = stats["median"] / divisor
        width = value / maximum * 100 if maximum else 0
        body += f'<strong>{e(number(value))} <small>{e(unit)}</small></strong></div><div class="quality-track" aria-hidden="true"><span style="width:{width:.3f}%"></span></div>'
        tail = f'{stats["count"]:,} {"readings" if readings else "samples"}'
        if stats["count"] == 1:
            tail += ' · single observed value'
        if quantiles and stats.get("p95") is not None:
            tail += f' · 95% within {number(stats["p95"] / divisor)} {unit}'
        body += f'<p class="quality-sample-note">{e(tail)}</p></li>'
    body += '</ul>'
    if any(item[1] for item in rows):
        counts = [stats["count"] for _, stats, _ in rows if stats]
        estimate = "Observed value" if all(count == 1 for count in counts) else "Median; single samples shown as observed values" if 1 in counts else "Median"
        body += f'<p class="quality-chart-scale">{estimate} · scale starts at 0 {e(unit)}; longest bar {e(number(maximum))} {e(unit)}.</p>'
    else:
        body += '<p class="quality-chart-scale">No successful measurements are available for this chart.</p>'
    return body + '</figure>'


def histogram(samples, bins=6):
    if not samples:
        return []
    low, high = min(samples), max(samples)
    if low == high:
        return [(low, high, len(samples))]
    counts = [0] * bins
    for value in samples:
        index = min(bins - 1, int((value - low) / (high - low) * bins))
        counts[index] += 1
    return [(low + (high - low) * (index / bins), low + (high - low) * ((index + 1) / bins), count) for index, count in enumerate(counts)]


def distribution_chart(row):
    e = html.escape
    values = row["samples"]["service_roundtrip_ms"]
    bins = histogram(values)
    peak = max(count for _, _, count in bins)
    label = WORKLOADS.get(row["id"].removeprefix("load/"), row["id"])
    body = f'<figure class="quality-chart quality-distribution"><figcaption><h3>Response time distribution</h3><p>{e(label)} · {len(values):,} service calls. Taller bars mean more calls in that time range.</p></figcaption><div class="quality-histogram">'
    for low, high, count in bins:
        interval = number(low) if low == high else f'{number(low)}–{number(high)}'
        body += f'<div class="quality-bin"><span class="quality-bin-count">{count:,}</span><div class="quality-bin-track" aria-hidden="true"><span style="height:{count / peak * 100:.3f}%"></span></div><span class="quality-bin-label">{e(interval)} ms</span></div>'
    return body + '</div><p class="quality-chart-scale">Response-time ranges, not a timeline. Displayed range boundaries are rounded.</p></figure>'


def workload_rows(rows, metric):
    result = []
    for row in rows:
        if not row["id"].startswith("load/"):
            continue
        label = WORKLOADS.get(row["id"][5:], row["id"][5:].replace("_", " "))
        state = "Not measured" if row["status"] == "pass" else STATES.get(row["status"], "Not available")
        result.append((label, summary(row, metric), state))
    return result


def comparison_charts(execution, report):
    comparison = execution.get("comparison")
    if not isinstance(comparison, dict):
        return '<p class="quality-empty">No comparable paired measurement was recorded.</p>'
    if comparison.get("status") != "comparable" or execution.get("outcome") != "pass" or comparison.get("candidateCommit") != report["commit"]:
        reason = comparison.get("reason", "A successful matched-environment comparison is required.")
        return f'<p class="quality-empty">No comparable measurement. {html.escape(str(reason)[:500])}</p>'
    definitions = {name: (definition["label"], definition["unit"], definition["divisor"]) for name, definition in quality.METRICS.items() if definition["kind"] in ("latency", "series")}
    charts = []
    metrics = comparison.get("metrics")
    for metric in metrics[:100] if isinstance(metrics, list) else []:
        if not isinstance(metric, dict) or not isinstance(metric.get("metric"), str) or metric["metric"] not in definitions:
            continue
        baseline, candidate = metric.get("baseline"), metric.get("candidate")
        if not all(isinstance(item, dict) and finite(item.get("median")) and isinstance(item.get("count"), int) and not isinstance(item["count"], bool) and 0 < item["count"] <= 100_000 for item in (baseline, candidate)):
            continue
        name, unit, divisor = definitions[metric["metric"]]
        scenario = str(metric.get("scenario", ""))
        if quality.metric_definition(scenario, metric["metric"]) is None:
            continue
        if scenario.startswith("load/"):
            context = WORKLOADS.get(scenario[5:], scenario[5:].replace("_", " "))
        elif scenario == "resources/home-assistant":
            context = "Whole Home Assistant instance"
        else:
            continue
        delta = ((candidate["median"] - baseline["median"]) / baseline["median"] * 100) if baseline["median"] else None
        change = f'{delta:+.1f}% median change.' if delta is not None and math.isfinite(delta) else 'Percentage unavailable for a zero or unsupported baseline.'
        # Ignore unvalidated optional quantiles in nested comparison summaries.
        values = [("Reference", {**baseline, "p95": None}, ""), ("This version", {**candidate, "p95": None}, "")]
        charts.append(bar_chart(f'{name} · {context}', change, values, unit, divisor=divisor, quantiles=False))
    if not charts:
        return '<p class="quality-empty">No supported comparable measurements are available.</p>'
    return '<details class="quality-reference"><summary>Reference comparison</summary><p class="quality-muted">Reference and current measurements use the same recorded environment. Changes are descriptive, with no performance pass/fail threshold.</p><div class="quality-chart-grid">' + ''.join(charts) + '</div></details>'


def action_overview(models):
    """One conservative state per named action, across every recorded execution."""
    counts = dict.fromkeys(("pass", "fail", "partial", "not-run"), 0)
    for action_id in {item["id"] for model in models for item in model["actions"]}:
        states = [next((item["status"] for item in model["actions"] if item["id"] == action_id), "not-run") for model in models]
        state = "fail" if "fail" in states else "pass" if all(value == "pass" for value in states) else "not-run" if all(value == "not-run" for value in states) else "partial"
        counts[state] += 1
    total = sum(counts.values())
    segments, offset = [], 0
    for state, count in counts.items():
        end = offset + (count / total * 100 if total else 0)
        segments.append(f'var(--quality-{state}) {offset:.3f}% {end:.3f}%')
        offset = end
    gradient = 'conic-gradient(' + ','.join(segments) + ')' if total else 'var(--line)'
    body = '<figure class="quality-results-overview"><figcaption><h2>Action results</h2><p>Every recorded execution must pass for an action to appear green.</p></figcaption>'
    body += f'<div class="quality-results-content"><div class="quality-result-ring" style="background:{gradient}" aria-hidden="true"><span><strong>{counts["pass"]}</strong><small>of {total} passed</small></span></div><ul class="quality-result-legend">'
    for state, count in counts.items():
        body += f'<li data-status="{state}"><span class="quality-legend-dot" aria-hidden="true"></span><span>{STATES[state]}</span><strong>{count}</strong></li>'
    body += '</ul></div>'
    if not total:
        body += '<p class="quality-muted">No named action evidence recorded.</p>'
    return body + '</figure>'


def timing_overview(model, role):
    activity = next((item for item in model["actions"] if item["id"] == "household.use-velair"), None)
    metrics = activity["metrics"] if activity else []
    multiple = len({item["variant"] for item in metrics}) > 1
    rows = [(item["label"] + (f' · {item["variant"]}' if multiple else ''), {"median": item["median"], "count": item["count"]}, "") for item in metrics]
    chart = bar_chart("Time to use Velair", f"{role} · during household activity. Shorter bars mean less waiting.", rows, "ms", quantiles=False)
    return '<div class="quality-timing-overview">' + chart + '<p class="quality-performance-note">Observed timings · no calibrated performance verdict.</p></div>'


def action_cards(model):
    e = html.escape
    body = '<div class="quality-action-grid">'
    for action in model["actions"]:
        failed = [item for item in action["failures"] if item["result"] == "Failed"]
        visible_issue = failed[:1] or (action["failures"][:1] if action["status"] == "partial" else [])
        issue = ''
        if visible_issue:
            failure = visible_issue[0]
            detail = failure["step"] if failure["result"] == "Failed" else failure["result"]
            issue = f'<span class="quality-action-issue">{e(failure["variant"])} · {e(failure["device"])}: {e(detail)}' + (f' (+{len(failed) - 1} more)' if len(failed) > 1 else '') + '</span>'
        icon = {"pass": "✓", "fail": "×", "partial": "!", "not-run": "–"}.get(action["status"], "?")
        body += f'<details class="quality-action" data-action="{e(action["id"])}" data-status="{e(action["status"])}"><summary><span class="quality-action-title">{e(action["name"])}{issue}</span><strong class="quality-action-result"><span aria-hidden="true">{icon}</span> {e(STATES.get(action["status"], "Not recorded"))}</strong></summary><div class="quality-action-body"><p class="quality-action-count">{e(action["result"])}</p><p class="quality-action-checks">{e(action["checks"])}</p><p class="quality-sample-note">{e(action.get("coverageLabel", "Screens"))}: {e(action["coverage"])}</p>'
        for failure in failed[1:]:
            body += f'<p class="quality-action-failure">{e(failure["variant"])} · {e(failure["device"])}: {e(failure["step"])}</p>'
        if len(action["variants"]) > 1 or action["status"] in ("partial", "not-run"):
            body += '<div class="quality-case-details"><h4>Coverage by case</h4><ul>'
            for variant in action["variants"]:
                body += f'<li><strong>{e(variant["name"])}</strong>: {e(variant["result"])} · {e(variant["coverage"])}</li>'
            body += '</ul></div>'
        body += '</div></details>'
    if model["unclassified"]:
        body += f'<p class="quality-muted">{model["unclassified"]} technical result(s) are not linked to a named action. Their scope is not inferred; see the full results.</p>'
    return body + '</div>'


def execution_dashboard(execution, rows, report, index):
    e = html.escape
    model = action_evidence.describe({**execution, "scenarios": rows})
    role = mapped(ROLES, execution.get("artifactRole"), f"Test execution {index}")
    body = f'<section class="quality-execution" aria-labelledby="execution-{index}"><div class="quality-section-heading"><h2 id="execution-{index}">{e(role)}</h2><span class="quality-status">{e(mapped(STATES, execution.get("outcome"), "Not recorded"))}</span></div>'
    body += action_cards(model)
    loads = [row for row in rows if row["id"].startswith("load/")]
    activity = next((item for item in model["actions"] if item["id"] == "household.use-velair"), None)
    valid_variants = {item["id"] for item in activity["variants"] if item["status"] == "pass"} if activity else set()
    activity_definition = next(item for item in action_evidence.catalogue()["actions"] if item["id"] == "household.use-velair")
    measured_ids = {item["scenario"] for item in activity_definition["variants"] if item["id"] in valid_variants}
    measured = [row for row in loads if row["id"] in measured_ids]
    timing_charts = []
    for metric, definition in action_evidence.measurements().items():
        chart_rows = workload_rows(measured, metric)
        if any(item[1] for item in chart_rows):
            timing_charts.append(bar_chart(definition["name"], definition["checks"] + " Measured during simulated household activity.", chart_rows, "ms"))
    if timing_charts:
        body += '<details class="quality-timing-details"><summary>Action timing details</summary><p class="quality-muted">Observed during household activity. Performance is informational, with no calibrated pass/fail limits.</p><div class="quality-chart-grid">' + ''.join(timing_charts) + '</div></details>'
    attention = [item for item in model["conditions"] + model["visuals"] if item["status"] in ("fail", "partial", "not-run")]
    for item in attention:
        body += f'<p class="quality-context-attention">{e(item["name"])}: {e(item["result"])}</p>'
    body += '<details class="quality-context"><summary>Test conditions and visual review</summary>'
    if model["conditions"]:
        body += '<h3 class="quality-actions-heading">Test conditions</h3><p class="quality-muted">Background device activity is checked separately from actions performed on Velair.</p><div class="quality-condition-list">'
        for condition in model["conditions"]:
            body += f'<article><h4>{e(condition["name"])}</h4><p>{e(condition["checks"])}</p><strong>{e(condition["result"])}</strong></article>'
        body += '</div>'
    for visual in model["visuals"]:
        body += f'<div class="quality-visual-review"><h3>{e(visual["name"])}</h3><p>{e(visual["checks"])}</p><strong>{e(visual["result"])}</strong><p class="quality-sample-note">Screens: {e(visual["coverage"])}</p></div>'
    body += '<details class="quality-diagnostics"><summary>Device activity and resource measurements</summary><p class="quality-muted">Device service calls and whole-instance resource use are diagnostic context. They are not timings for clicking or saving in Velair.</p>'
    if loads:
        body += '<div class="quality-workloads">'
        for row in loads:
            label = WORKLOADS.get(row["id"][5:], row["id"][5:].replace("_", " "))
            body += f'<article><h3>{e(label)}</h3><p class="quality-status">{e(STATES.get(row["status"], "Not available"))}</p>'
            load = row.get("load")
            if load:
                body += f'<p><strong>{load["completed"]:,}/{load["requested"]:,}</strong> actions completed<br><strong>{load["observed"]:,}/{load["expected_observed"]:,}</strong> expected changes observed</p>'
            else:
                body += '<p>Action counters not recorded.</p>'
            body += '</article>'
        body += '</div><div class="quality-chart-grid">'
        body += bar_chart("Service response", "Time for a device action to return. Shorter bars mean less waiting.", workload_rows(rows, "service_roundtrip_ms"), "ms")
        body += bar_chart("Page memory (JavaScript)", "JavaScript heap used by the page, excluding the rest of the browser process.", workload_rows(rows, "browser_heap_bytes"), "MiB", divisor=1024 ** 2, quantiles=False, readings=True)
        body += '</div>'
        distributions = [row for row in loads if summary(row, "service_roundtrip_ms")]
        if distributions:
            selected = next((row for row in distributions if row["id"] == "load/combined_activity"), distributions[0])
            body += distribution_chart(selected)
    else:
        body += '<p class="quality-empty">No household activity measurements were recorded for this execution.</p>'
    resource = next((row for row in rows if row["id"] == "resources/home-assistant"), {})
    body += '<div class="quality-resource-summary"><h3>Whole Home Assistant instance</h3><p class="quality-muted">Resources cover the complete instance during the browser and load checks, including other integrations.</p><dl>'
    for metric, label, unit, divisor in (("container_cpu_percent", "CPU", "%", 1), ("container_memory_bytes", "Memory", "MiB", 1024 ** 2)):
        stats = summary(resource, metric)
        value = f'{number(stats["median"] / divisor)} {unit} {"median" if stats["count"] > 1 else "observed"} · {stats["count"]:,} readings' if stats else 'Not measured successfully'
        body += f'<div><dt>{label}</dt><dd>{e(value)}</dd></div>'
    body += '</dl></div></details></details>' + comparison_charts(execution, report)
    return body + '</section>'


def render_release(entry, repository):
    e = html.escape
    tag, report = entry["tag"], entry["report"]
    title = f"Velair {tag[1:]}"
    body = f'<a class="quality-back" href="index.html">← All release reports</a><p class="eyebrow">Published release evidence</p><h1>{e(title)}</h1>'
    if report is None:
        return page(title, body + "<p>No quality report was recorded for this version. This does not establish a test result.</p>", report=True)
    quality.validate(report)
    groups = execution_groups(report)
    models = [action_evidence.describe({**execution, "scenarios": rows}) for execution, rows in groups]
    body += f'<p class="quality-report-lead">{e(STATES.get(report["outcome"], "Not recorded"))} · Recorded {e(str(report.get("generatedAt", "date unavailable"))[:100])}</p>'
    visual_states = {visual_label(execution) for execution, _ in groups}
    visual = {"Compared with references": "References compared", "Captures awaiting review": "Captures awaiting review", "Visual checks disabled": "Disabled", "Visual evidence incomplete": "Incomplete"}.get(next(iter(visual_states)), "Not recorded") if len(visual_states) == 1 else "Mixed visual evidence"
    primary_role = mapped(ROLES, groups[0][0].get("artifactRole"), "First recorded execution")
    body += '<div class="quality-overview">' + action_overview(models) + timing_overview(models[0], primary_role) + '</div>'
    visual_results = [item["status"] for model in models for item in model["visuals"]]
    visual_state = "fail" if "fail" in visual_results else "pass" if visual_results and all(state == "pass" for state in visual_results) else "unreviewed"
    body += f'<div class="quality-evidence-strip"><span class="quality-visual-state" data-status="{visual_state}"><strong>Visual review:</strong> {e(visual)}</span><span>{len(groups)} recorded execution(s)</span></div>'
    body += '<p class="quality-overview-note">Open an action to see what was checked, its cases and screens.</p>'
    provenance = report.get("provenance", {})
    if provenance.get("repository") == repository and re.fullmatch(r"[0-9]+", str(provenance.get("runId", ""))):
        body += f'<p><a href="https://github.com/{repository}/actions/runs/{provenance["runId"]}">Original validation run</a></p>'
    for index, (execution, rows) in enumerate(groups, 1):
        dashboard = execution_dashboard(execution, rows, report, index)
        if index == 1:
            body += dashboard
        else:
            role = mapped(ROLES, execution.get("artifactRole"), f"Test execution {index}")
            model = models[index - 1]
            complete = sum(item["status"] == "pass" for item in model["actions"])
            attention = sum(item["status"] in ("fail", "partial", "not-run") for item in model["conditions"] + model["visuals"])
            state = mapped(STATES, execution.get("outcome"), "Not recorded")
            note = f' · {attention} check(s) need attention' if attention else ''
            body += f'<details class="quality-additional-execution"><summary>{e(role)} · {e(state)} · {complete}/{len(model["actions"])} actions fully checked{note}</summary>{dashboard}</details>'
    body += '<details class="quality-details"><summary>Technical details and full results</summary>'
    body += f'<p>Tested commit: <code>{e(report["commit"])}</code>. Rollout: {e(str(report.get("rollout", "observe"))[:100])}.</p><h2>Test environment</h2>'
    executions = [group[0] for group in groups]
    body += '<ul>'
    for execution in executions:
        environment = execution.get("environment")
        environment = environment if isinstance(environment, dict) else {}
        role = str(execution.get("artifactRole") or execution.get("suite") or "execution")[:200]
        body += f'<li>{e(role)}: HA <code>{e(str(environment.get("homeAssistantImage", "not recorded"))[:300])}</code>; Playwright {e(str(environment.get("playwrightVersion", "not recorded"))[:100])}; {e(str(environment.get("size", "not recorded"))[:100])} scenario.</li>'
    body += '</ul><h2>Scenarios</h2><div class="quality-table"><table><thead><tr><th>Scenario</th><th>Result</th></tr></thead><tbody>'
    for row in report["scenarios"]:
        body += f'<tr><td>{e(row["id"])}</td><td>{e(row["status"])}</td></tr>'
    body += '</tbody></table></div>'
    metrics = quality.measurement_rows(report)
    for group, heading in quality.MEASUREMENT_GROUPS:
        selected = [row for row in metrics if row["group"] == group]
        if not selected:
            continue
        body += f'<h3>{heading}</h3><div class="quality-table"><table><thead><tr><th>Scenario / measurement</th><th>Recorded</th><th>Result</th></tr></thead><tbody>'
        for row in selected:
            body += f'<tr><td>{e(row["scenario"])} / {e(row["label"])}<p class="quality-sample-note">{e(row["context"])}</p></td><td>{e(row["recorded"])}</td><td>{e(row["value"])}</td></tr>'
        body += '</tbody></table></div>'
    body += '</details><details class="quality-limitations"><summary>Scope and limits of these results</summary><ul>'
    for limitation in report.get("limitations", []):
        body += f'<li>{e(limitation)}</li>'
    body += '<li>Synthetic devices do not cover every physical integration.</li><li>Container resources describe all of Home Assistant. Measurements are informational and depend on the recorded environment.</li></ul></details>'
    prefix = f"https://github.com/{repository}/releases/download/{tag}"
    body += f'<p><a href="{prefix}/quality-report.json">Measurement data (JSON)</a> · <a href="{prefix}/quality-report.md">Full summary (Markdown)</a></p>'
    return page(title, body, report=True)


def build(entries, output, repository):
    if not REPOSITORY.fullmatch(repository):
        raise ValueError("Invalid repository")
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    body = f'''<section class="quality-intro" aria-labelledby="quality-title">
<p class="eyebrow">Evidence you can inspect</p><h1 id="quality-title">How Velair is tested</h1>
<p class="hero-lead">Checks, results and known limits for each published version. A clear record of what was tested, with the details available to inspect.</p>
<div class="hero-actions"><a class="button secondary" href="https://github.com/{repository}/releases">View releases <span aria-hidden="true">↗</span></a><a class="text-link" href="https://github.com/{repository}/actions">Development checks <span aria-hidden="true">→</span></a></div>
</section>
<section class="quality-section" aria-labelledby="coverage-title"><h2 id="coverage-title">What the checks cover</h2>
<div class="quality-coverage">
<article><span class="feature-number">01 / Runtime</span><h3>Real Home Assistant</h3><p>Installation, saved configuration and recovery after a restart, using a temporary instance with simulated devices.</p></article>
<article><span class="feature-number">02 / Interface</span><h3>Everyday controls</h3><p>Schedules, profiles and climate controls across mobile, tablet and desktop, with selected visual checks.</p></article>
<article><span class="feature-number">03 / Activity</span><h3>A busy household</h3><p>Lights, switches, covers and climate updates running alongside Velair, with measurements and checks under load.</p></article>
</div></section>
<section class="quality-section" aria-labelledby="reports-title"><h2 id="reports-title">Release reports</h2>
<p class="quality-lead">Published evidence stays with its version. Stable and beta releases are listed separately.</p>'''
    if not entries:
        body += '<div class="quality-notice"><span class="quality-dot" aria-hidden="true"></span><div><h3>No release quality reports yet</h3><p>Reports will appear here when a published version includes test evidence. Earlier versions are not assigned a result.</p></div></div>'
    for prerelease, heading in ((False, "Stable releases"), (True, "Beta releases")):
        selected = [entry for entry in entries if entry["prerelease"] == prerelease]
        if not selected:
            continue
        body += f'<h3 class="quality-list-title">{heading}</h3><ul class="quality-releases">'
        for entry in selected:
            tag = entry["tag"]
            if not TAG.fullmatch(tag):
                raise ValueError("Invalid release tag")
            report = entry["report"]
            if report is not None:
                quality.validate(report)
            filename = f"{tag}.html"
            (output / filename).write_text(render_release(entry, repository), encoding="utf-8")
            state = report["outcome"] if report else "no report"
            body += f'<li><a href="{filename}">{html.escape(tag)}</a><span>{html.escape(state)}</span></li>'
        body += '</ul>'
    body += '''</section><aside class="quality-boundaries" aria-labelledby="reading-title"><h2 id="reading-title">Reading the results</h2>
<p>Visual captures without approved references are marked <strong>unreviewed</strong>. Performance measurements are informational while calibration is in progress. Missing, failed and non-comparable results remain explicit.</p>
<p>These checks use simulated devices. The recorded scenarios define the evidence available; they do not establish compatibility with every installation.</p></aside>'''
    (output / "index.html").write_text(page("Quality", body), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--repository", default="cgonfer/velair")
    parser.add_argument("--empty", action="store_true", help="Build the initial page without inventing release results")
    args = parser.parse_args()
    build([] if args.empty else released_reports(args.repository), args.output, args.repository)


if __name__ == "__main__":
    main()
