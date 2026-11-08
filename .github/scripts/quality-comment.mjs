/** Privileged publisher: this file must always run from the default branch. */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MARKER = "<!-- velair-quality-report -->";
const MAX_ARCHIVE = 3_000_000;
const MAX_REPORT = 2_000_000;
const SHA = /^[a-f0-9]{40}$/;
const OUTCOMES = new Set(["pass", "fail", "infrastructure-error", "not-run", "unreviewed"]);
const ACTION_NORMALIZER = fileURLToPath(new URL("../../scripts/quality/actions.py", import.meta.url));
const counter = (value) => Number.isSafeInteger(value) && value >= 0;
const sample = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

function validateStatistics(report) {
  const ids = new Set();
  for (const scenario of report.scenarios) {
    if (!scenario || typeof scenario.id !== "string" || scenario.id.length > 200
        || /[\x00-\x1f]/.test(scenario.id) || ids.has(scenario.id) || !OUTCOMES.has(scenario.status)) {
      throw new Error("Invalid quality scenario");
    }
    ids.add(scenario.id);
    for (const key of ["actionId", "actionVariant", "project", "failureStep"]) {
      if (scenario[key] !== undefined && (typeof scenario[key] !== "string" || scenario[key].length > 200 || /[\x00-\x1f]/.test(scenario[key]))) {
        throw new Error("Invalid action metadata");
      }
    }
    if (scenario.samples !== undefined) {
      if (!scenario.samples || typeof scenario.samples !== "object" || Array.isArray(scenario.samples)) throw new Error("Invalid metric samples");
      for (const values of Object.values(scenario.samples)) {
        if (!Array.isArray(values) || values.length > 100_000 || !values.every(sample)) throw new Error("Invalid metric samples");
      }
    }
    const load = scenario.load;
    if (load !== undefined && load !== null) {
      if (typeof load !== "object" || Array.isArray(load)
          || !["requested", "completed", "observed", "expected_observed"].every((key) => counter(load[key]))
          || ["planned", "failed"].some((key) => key in load && !counter(load[key]))
          || load.completed > load.requested || load.expected_observed > load.requested
          || load.observed > load.requested
          || scenario.status === "pass" && (load.completed !== load.requested || load.observed < load.expected_observed
            || load.failed > 0 || load.planned !== undefined && load.requested !== load.planned)) {
        throw new Error("Invalid or incomplete load statistics");
      }
    }
  }
}

export function validateRun(run, repository) {
  if (run.repository?.full_name !== repository || run.name !== "CI"
      || run.path?.split("@")[0] !== ".github/workflows/ci.yml"
      || run.event !== "pull_request" || run.status !== "completed"
      || !SHA.test(run.head_sha ?? "") || !Number.isSafeInteger(run.id)
      || !Number.isSafeInteger(run.workflow_id) || !Number.isSafeInteger(run.run_attempt)) {
    throw new Error("Unexpected quality workflow provenance");
  }
}

export function validateReport(report, run, repository) {
  if (report?.schemaVersion !== 1 || !OUTCOMES.has(report.status)
      || !["pass", "fail", "infrastructure-error", "not-run"].includes(report.outcome) || report.provenance?.repository !== repository
      || report.provenance?.headSha !== run.head_sha
      || String(report.provenance?.runId) !== String(run.id)
      || String(report.provenance?.runAttempt) !== String(run.run_attempt)
      || report.provenance?.event !== "pull_request"
      || !Array.isArray(report.scenarios) || report.scenarios.length > 500
      || !Array.isArray(report.limitations) || report.limitations.length > 100) {
    throw new Error("Invalid or mismatched quality report");
  }
  validateStatistics(report);
  return report;
}

export function reportFromZip(bytes) {
  if (bytes.length > MAX_ARCHIVE) throw new Error("Quality archive exceeds size limit");
  // Read one exact regular member into memory. Never extract files or execute artifact code.
  const program = `import io,json,sys,zipfile,stat
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z:
 entries=z.infolist()
 if len(entries)!=1: raise ValueError('Expected one summary member')
 e=entries[0]
 if e.filename!='quality-report.json' or e.file_size>${MAX_REPORT} or e.is_dir() or stat.S_ISLNK(e.external_attr>>16): raise ValueError('Invalid summary member')
 data=z.read(e)
 json.loads(data)
 sys.stdout.buffer.write(data)
`;
  const result = spawnSync("python", ["-c", program], { input: bytes, maxBuffer: MAX_REPORT, timeout: 10_000 });
  if (result.status !== 0 || result.error) throw new Error("Cannot read bounded quality summary");
  return JSON.parse(result.stdout.toString("utf8"));
}

function plain(value, limit = 180) {
  return String(value ?? "").slice(0, limit).replace(/[\r\n]/g, " ").replace(/[&<>`*_[\]\\|]/g, "").replace(/@/g, "&#64;");
}

function actionOverview(report) {
  if (!report) return null;
  let input;
  try { validateStatistics(report); input = JSON.stringify(report); } catch { return null; }
  if (Buffer.byteLength(input) > MAX_REPORT) return null;
  // Only this checked-out normalizer is executable. Artifact input stays on stdin.
  const normalized = spawnSync("python", [ACTION_NORMALIZER], {
    input, encoding: "utf8", shell: false, timeout: 10_000, maxBuffer: 128_000,
    env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONDONTWRITEBYTECODE: "1" },
  });
  if (normalized.status !== 0 || normalized.error) return null;
  try {
    const overview = JSON.parse(normalized.stdout);
    if (overview?.schemaVersion !== 1) return null;
    for (const key of ["actions", "conditions", "visuals"]) {
      if (!Array.isArray(overview[key]) || overview[key].length > 30) return null;
      for (const action of overview[key]) {
        if (!action || !["name", "checks", "result"].every((field) => typeof action[field] === "string" && action[field].length <= 1000)
            || !["pass", "fail", "partial", "not-run", "unreviewed"].includes(action.status)
            || action.coverage !== undefined && (typeof action.coverage !== "string" || action.coverage.length > 500)
            || action.variants !== undefined && (!Array.isArray(action.variants) || action.variants.length > 20)
            || action.failures !== undefined && (!Array.isArray(action.failures) || action.failures.length > 100)) return null;
      }
    }
    if (!counter(overview.unclassified)) return null;
    return overview;
  } catch { return null; }
}

function conciseOverview(overview) {
  if (!overview) return ["Action overview unavailable. See the run for missing evidence or report preparation failures.", "Visual review: unavailable."];
  const counts = new Map();
  for (const action of overview.actions) counts.set(action.status, (counts.get(action.status) ?? 0) + 1);
  const summary = overview.actions.length
    ? [`${counts.get("pass") ?? 0}/${overview.actions.length} passed`, ...[["fail", "failed"], ["partial", "partial"], ["not-run", "not run"], ["unreviewed", "unreviewed"]].filter(([status]) => counts.get(status)).map(([status, label]) => `${counts.get(status)} ${label}`)].join(" · ")
    : "not available";
  const visuals = overview.visuals.map((item) => item.status);
  const visual = visuals.includes("fail") ? "failed"
    : visuals.includes("partial") ? "incomplete coverage"
    : visuals.includes("unreviewed") ? "captures awaiting review"
    : visuals.length && visuals.every((status) => status === "pass") ? "compared with reference images" : "not established";
  const hasExecution = [...overview.actions, ...overview.conditions].some((item) => item.status !== "not-run");
  const missingConditions = hasExecution ? overview.conditions.filter((item) => item.status === "not-run") : [];
  const affected = [...overview.actions, ...overview.conditions, ...overview.visuals]
    .filter((item) => ["fail", "partial"].includes(item.status))
    .concat(missingConditions)
    .sort((a, b) => Number(b.status === "fail") - Number(a.status === "fail"));
  const alerts = affected.slice(0, 3).map((item) => {
    const failure = item.failures?.find((entry) => entry.result === "Failed");
    const missing = item.failures?.find((entry) => entry.result === "Not run");
    const context = failure ? [failure.variant, failure.device, failure.step]
      : missing ? ["Missing coverage", missing.variant, missing.device] : [];
    const detail = context.filter((value) => typeof value === "string").map((value) => plain(value, 140)).join(" · ");
    return `- ${plain(item.name, 160)}: ${plain(item.result, 160)}${detail ? ` — ${detail}` : ""}.`;
  });
  return [
    `Functional actions (reported): **${summary}**.`, `Visual review: ${visual}.`,
    ...alerts,
    ...(affected.length > 3 ? [`${affected.length - 3} more action(s) need attention; see details.`] : []),
    ...(overview.unclassified ? [`${overview.unclassified} check(s) could not be matched to a named action; inspect the full report.`] : []),
  ];
}

function actionTable(items) {
  return ["| Action | What is checked | Result |", "| --- | --- | --- |",
    ...items.map((action) => {
      const variants = action.variants ?? [];
      const scope = variants.length > 1
        ? variants.map((variant) => `${plain(variant?.name, 80)}: ${plain(variant?.result, 140)} (${plain(variant?.coverage, 160)})`).join("; ")
        : plain(action.coverage, 500);
      const failed = (action.failures ?? []).filter((failure) => failure?.result === "Failed");
      const selected = failed.length ? failed.slice(0, 4)
        : action.status === "partial" ? (action.failures ?? []).slice(0, 1) : [];
      const failures = selected.map((failure) => [failure?.variant, failure?.device, failure?.result, failure?.step].filter((value) => typeof value === "string").map((value) => plain(value, 140)).join(" · ")).filter(Boolean);
      if (failed.length > selected.length) failures.push(`${failed.length - selected.length} more failed check(s); see the full report`);
      const result = [plain(action.result, 500), scope, ...failures].filter(Boolean).join("; ");
      return `| ${plain(action.name, 160)} | ${plain(action.checks, 600)} | ${result} |`;
    }),
  ];
}

function statisticsTable(report) {
  let browser = "Not run", actions = "Not run", interaction = "Not measured", saving = "Not measured";
  if (report) {
    try { validateStatistics(report); } catch { return ["Statistics are unavailable because the reported measurements are invalid."]; }
    const checks = report.scenarios.filter((row) => row.id.startsWith("browser/"));
    if (checks.length) {
      const passed = checks.filter((row) => row.status === "pass").length;
      browser = `${passed}/${checks.length} passed`;
      const failed = checks.filter((row) => ["fail", "infrastructure-error"].includes(row.status)).length;
      if (failed) browser += ` · ${failed} failed`;
      for (const [status, label] of [["not-run", "not run"], ["unreviewed", "unreviewed"]]) {
        const count = checks.filter((row) => row.status === status).length;
        if (count) browser += ` · ${count} ${label}`;
      }
    }
    const loadChecks = report.scenarios.filter((row) => row.id.startsWith("load/"));
    const load = loadChecks.filter((row) => row.load);
    if (loadChecks.length) actions = "Not available";
    if (load.length) {
      const totals = Object.fromEntries(["requested", "completed", "observed", "expected_observed"].map((key) => [key, load.reduce((total, row) => total + row.load[key], 0)]));
      if (!Object.values(totals).every(counter)) return ["Statistics are unavailable because the reported counters exceed the supported range."];
      actions = `${totals.completed}/${totals.requested} completed · ${totals.observed}/${totals.expected_observed} observed`;
      const incomplete = loadChecks.filter((row) => row.status !== "pass" || !row.load).length;
      if (incomplete) actions += ` · ${incomplete} scenario(s) not passed`;
    }
    const combined = report.scenarios.find((row) => row.id === "load/combined_activity");
    const timing = (metric) => {
      if (!combined || combined.status === "not-run") return "Not measured";
      if (combined.status !== "pass") return "Unavailable: scenario did not pass";
      const values = combined.samples?.[metric];
      if (!values?.length) return "Not measured";
      const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[middle] : sorted[middle - 1] / 2 + sorted[middle] / 2;
      return `${median.toFixed(2)} ms ${values.length === 1 ? "observed" : "median"} · ${values.length} sample(s)`;
    };
    interaction = timing("interaction_ms");
    saving = timing("save_persist_ms");
  }
  return [
    "| Check | Reported result |", "| --- | --- |",
    `| Journey checks | ${browser} |`,
    `| Household actions | ${actions} |`,
    `| Interaction under combined activity | ${interaction} |`,
    `| Saving under combined activity | ${saving} |`,
  ];
}

export function renderComment(run, report, jobs, repository) {
  const url = `https://github.com/${repository}/actions/runs/${run.id}`;
  const failedJobs = jobs.filter((job) => !["success", "skipped", "neutral"].includes(job.conclusion));
  const counts = new Map();
  for (const scenario of report?.scenarios ?? []) {
    const status = OUTCOMES.has(scenario?.status) ? scenario.status : "not-run";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  const overview = actionOverview(report);
  return [
    MARKER, "## Quality evidence", "",
    `Commit: \`${run.head_sha}\` · Attempt: ${run.run_attempt}`,
    `Actions result: **${plain(run.conclusion)}**. ${failedJobs.length ? `${failedJobs.length} job(s) did not succeed.` : ""}`,
    "", ...conciseOverview(overview),
    ...(report && report.outcome !== "pass" ? [`Reported execution: **${plain(report.outcome)}**.`] : []),
    ...(report?.rollout === "observe" ? ["Observation mode · performance is informational."] : []),
    "", `[Run, reports and installable artifacts](${url})`, "",
    "<details>", "<summary>All checks and measurements</summary>", "",
    ...(overview ? ["### Actions checked in Velair", "", ...actionTable(overview.actions), "", "### Household conditions and visual evidence", "", ...actionTable([...overview.conditions, ...overview.visuals]), ""] : []),
    "### Measurement details", "",
    report ? `Reported scenarios: ${[...counts].map(([key, count]) => `${key}: ${count}`).join(" · ") || "none"}.`
      : "No valid quality summary was produced. See the run for startup or build failures.",
    `Reported browser/load rollout: **${plain(report?.rollout ?? "not recorded")}**.`,
    report ? `Reported outcome: ${plain(report.outcome)}. Visual evidence: ${plain(report.visualStatus ?? "not available")}.` : "",
    "", ...statisticsTable(report), "",
    ...(report?.rollout === "observe" ? ["Reported observation mode: new browser/load results are not yet blocking PR checks.", ""] : []),
    "Required-check conclusions come from GitHub; performance figures are informational.",
    "", ...(report?.limitations ?? []).slice(0, 5).map((item) => `- ${plain(item)}`), "",
    "The Actions result above comes from GitHub, not from report contents. Synthetic scenarios do not establish compatibility with every device.",
    "", "</details>",
  ].filter((line) => line !== undefined).join("\n");
}

export async function publish({ event, repository, token, request = fetch }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? "")) throw new Error("Invalid repository");
  const api = async (path, options = {}) => {
    const response = await request(`https://api.github.com/repos/${repository}${path}`, {
      ...options, headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...options.headers },
    });
    if (!response.ok) throw new Error(`GitHub request failed (${response.status})`);
    return response;
  };
  const triggered = event.workflow_run;
  if (!triggered?.id || event.repository?.full_name !== repository) throw new Error("Missing workflow event");
  const run = await (await api(`/actions/runs/${triggered.id}`)).json();
  validateRun(run, repository);
  if (run.run_attempt !== triggered.run_attempt) return "stale-attempt";
  const associated = run.pull_requests?.length ? run.pull_requests
    : await (await api(`/commits/${run.head_sha}/pulls?per_page=100`)).json();
  let pr;
  for (const candidate of associated) {
    if (!Number.isSafeInteger(candidate.number)) continue;
    const item = await (await api(`/pulls/${candidate.number}`)).json();
    if (item.state === "open" && item.base?.repo?.full_name === repository
        && item.head?.sha === run.head_sha && item.head?.repo?.id === run.head_repository?.id) {
      if (pr) throw new Error("Ambiguous PR association");
      pr = item;
    }
  }
  if (!pr) return "stale-or-unassociated";
  const isLatest = async () => {
    const recent = await (await api(`/actions/workflows/${run.workflow_id}/runs?event=pull_request&head_sha=${run.head_sha}&per_page=100`)).json();
    return !recent.workflow_runs?.some((item) => item.id > run.id || item.id === run.id && item.run_attempt > run.run_attempt);
  };
  if (!await isLatest()) return "stale-run";
  const jobs = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await (await api(`/actions/runs/${run.id}/jobs?filter=latest&per_page=100&page=${page}`)).json();
    jobs.push(...batch.jobs);
    if (batch.jobs.length < 100) break;
  }
  const artifacts = await (await api(`/actions/runs/${run.id}/artifacts?per_page=100`)).json();
  const summaries = artifacts.artifacts.filter((item) => item.name === "quality-summary" && !item.expired);
  let report;
  if (summaries.length > 1) throw new Error("Ambiguous quality summary");
  if (summaries.length === 1) {
    const artifact = summaries[0];
    if (artifact.size_in_bytes > MAX_ARCHIVE) throw new Error("Quality artifact exceeds size limit");
    const response = await api(`/actions/artifacts/${artifact.id}/zip`);
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_ARCHIVE) throw new Error("Quality archive exceeds size limit");
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > MAX_ARCHIVE) throw new Error("Quality archive exceeds size limit");
      chunks.push(chunk);
    }
    report = validateReport(reportFromZip(Buffer.concat(chunks)), run, repository);
  }
  const comments = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await (await api(`/issues/${pr.number}/comments?per_page=100&page=${page}`)).json();
    comments.push(...batch);
    if (batch.length < 100) break;
  }
  const existing = comments.find((item) => item.user?.login === "github-actions[bot]"
    && item.user?.type === "Bot" && item.body?.startsWith(MARKER));
  const fresh = await (await api(`/pulls/${pr.number}`)).json();
  if (fresh.state !== "open" || fresh.head.sha !== run.head_sha || !await isLatest()) return "stale-before-write";
  const body = renderComment(run, report, jobs, repository);
  await api(existing ? `/issues/comments/${existing.id}` : `/issues/${pr.number}/comments`, {
    method: existing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }),
  });
  return existing ? "updated" : "created";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  publish({ event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")), repository: process.env.GITHUB_REPOSITORY, token: process.env.GH_TOKEN })
    .then((result) => console.log(`Quality comment: ${result}`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
