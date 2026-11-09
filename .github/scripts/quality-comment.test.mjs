import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { MARKER, publish, reportFromZip, renderComment, validateReport, validateRun } from "./quality-comment.mjs";

const repository = "example/velair";
const sha = "a".repeat(40);
const run = { id: 31, workflow_id: 3, run_attempt: 2, repository: { full_name: repository }, head_repository: { id: 4 },
  name: "CI", path: ".github/workflows/ci.yml", event: "pull_request", status: "completed", head_sha: sha,
  conclusion: "failure", pull_requests: [{ number: 7 }] };
const report = { schemaVersion: 1, status: "unreviewed", outcome: "pass", visualStatus: "capture-unreviewed", scenarios: [{ id: "editor", status: "pass" }], limitations: [],
  provenance: { repository, headSha: sha, runId: "31", runAttempt: "2", event: "pull_request" } };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
const measuredReport = () => ({ ...report, rollout: "observe", scenarios: [
  { id: "browser/desktop/editor", status: "pass" },
  { id: "browser/mobile/editor", status: "pass" },
  { id: "load/unrelated_activity", status: "pass", load: { planned: 300, requested: 300, completed: 300, observed: 300, expected_observed: 300, failed: 0 } },
  { id: "load/combined_activity", status: "pass", load: { planned: 360, requested: 360, completed: 360, observed: 360, expected_observed: 360, failed: 0 },
    samples: { interaction_ms: [10, 30, 20, 40], save_persist_ms: [200, 300, 400] } },
] });
const catalogue = JSON.parse(readFileSync(new URL("../../scripts/quality/actions.json", import.meta.url), "utf8"));
const actionReport = () => ({ ...report, actionEvidenceVersion: 2, suite: "smoke", rollout: "observe", scenarios: [
  ...catalogue.actions.filter((action) => action.source === "browser").flatMap((action) => action.variants.filter((variant) => (variant.minEvidenceVersion ?? 1) <= 2 && (variant.maxEvidenceVersion ?? 2) >= 2).flatMap((variant) => variant.projects.map((project) => ({ id: `browser/${project}/${variant.title}`, status: "pass" })))),
  { id: "load/idle", status: "pass", load: { planned: 0, requested: 0, completed: 0, observed: 0, expected_observed: 0, failed: 0 } },
  ...measuredReport().scenarios.filter((row) => row.id.startsWith("load/")).map((row) => row.id === 'load/combined_activity' ? {...row, editingEvidence: 'draft-preserved-during-updates'} : row),
] });

test("a single operation reading is an observation rather than a representative median", () => {
  const measured = measuredReport();
  measured.scenarios.at(-1).samples = { interaction_ms: [0], save_persist_ms: [100] };
  const body = renderComment(run, measured, [], repository);
  assert.match(body, /0.00 ms observed · 1 sample/);
  assert.match(body, /100.00 ms observed · 1 sample/);
  assert.doesNotMatch(body, /100.00 ms median/);
});

test("PR actions use the shared catalogue names and explanations with actual screen and variant coverage", () => {
  const body = renderComment(run, actionReport(), [], repository);
  assert.match(body, /\| Action \| What is checked \| Result \|/);
  for (const action of catalogue.actions.filter((item) => item.kind === "action")) {
    assert.ok(body.includes(action.name), action.name);
    assert.ok(body.includes(action.checks), action.checks);
  }
  const scheduleLine = body.split("\n").find((line) => line.startsWith("| Edit and save a schedule |"));
  assert.match(scheduleLine, /9\/9/);
  for (const label of ["Heating", "Cooling", "Temperature range", "Desktop", "Mobile", "Tablet"]) assert.ok(scheduleLine.toLowerCase().includes(label.toLowerCase()), label);
  const restartLine = body.split("\n").find((line) => line.startsWith("| Keep a saved schedule after an HA restart |"));
  assert.match(restartLine, /1\/1/);
  assert.match(restartLine, /Desktop/i);
  assert.doesNotMatch(restartLine, /Mobile|Tablet/i);
  assert.ok(body.indexOf("### Measurement details") > body.indexOf("| Edit and save a schedule |"));
});

test("partial action coverage does not imply that all screens or climate variants passed", () => {
  const partial = actionReport();
  partial.scenarios = partial.scenarios.filter((row) => row.id !== "browser/mobile/cool schedule controls remain usable and saved fields persist");
  const line = renderComment(run, partial, [], repository).split("\n").find((item) => item.startsWith("| Edit and save a schedule |"));
  assert.match(line, /8\/9/);
  assert.doesNotMatch(line, /Passed · 9\/9/);
  assert.match(line, /Cooling:.*2\/3/);
});

test("the default PR view is brief while complete checks and measurements share one disclosure", () => {
  const complete = renderComment(run, actionReport(), [], repository);
  const visible = complete.split("<details>")[0], details = complete.indexOf("<details>");
  assert.match(visible, /Functional actions \(reported\): \*\*11\/11 passed\*\*/);
  assert.match(visible, /Visual review: captures awaiting review/);
  assert.match(visible, /Observation mode · performance is informational/);
  assert.ok(visible.split("\n").filter(Boolean).length <= 9);
  assert.doesNotMatch(visible, /What is checked|Heating:|Reported scenarios:|Reported browser\/load rollout:|test_duration_ms|Edit and save a schedule/);
  assert.equal((complete.match(/<details>/g) ?? []).length, 1);
  assert.equal((complete.match(/<\/details>/g) ?? []).length, 1);
  assert.equal((complete.match(/\[Run, reports and installable artifacts\]/g) ?? []).length, 1);
  for (const label of ["| Action | What is checked | Result |", "Reported scenarios:", "Reported browser/load rollout:", "Reported outcome:", "Visual evidence:", "### Measurement details", "### Household conditions and visual evidence"]) assert.ok(complete.indexOf(label) > details, label);
  assert.match(complete.slice(details), /Reported observation mode: new browser\/load results are not yet blocking PR checks/);
  const missing = renderComment(run, { ...report, scenarios: [] }, [], repository);
  const notRun = missing.split("\n").find((line) => line.startsWith("| Edit and save a schedule |"));
  assert.match(notRun, /Not run · 0\/9 checks/);
  assert.doesNotMatch(notRun, /Not checked successfully/);
  const partial = actionReport();
  partial.scenarios = partial.scenarios.filter((row) => !row.id.startsWith("browser/mobile/") && !row.id.startsWith("browser/tablet/"));
  const line = renderComment(run, partial, [], repository).split("\n").find((item) => item.startsWith("| Edit and save a schedule |"));
  assert.ok((line.match(/Not checked successfully/g) ?? []).length <= 1);
});

test("failures and partial missing coverage are actionable outside details and bounded", () => {
  const measured = actionReport();
  measured.scenarios = measured.scenarios.filter((row) => row.id !== "browser/mobile/cool schedule controls remain usable and saved fields persist");
  const partial = renderComment(run, measured, [], repository).split("<details>")[0];
  assert.match(partial, /10\/11 passed · 1 partial/);
  assert.match(partial, /- Edit and save a schedule: Partial coverage.*Missing coverage · Cooling · Mobile/);
  const failures = actionReport();
  for (const row of failures.scenarios.filter((item) => item.id.startsWith("browser/"))) row.status = "fail";
  const visible = renderComment(run, failures, [], repository).split("<details>")[0];
  assert.equal((visible.match(/^- /gm) ?? []).length, 3);
  assert.match(visible, /more action\(s\) need attention; see details/);
  assert.doesNotMatch(visible, /What is checked/);
});

test("missing background conditions stay visible even when every functional action passed", () => {
  for (const mode of ["omitted", "not-run", "missing-counters"]) {
    const measured = actionReport();
    const idle = measured.scenarios.find((row) => row.id === "load/idle");
    if (mode === "omitted") measured.scenarios = measured.scenarios.filter((row) => row !== idle);
    else if (mode === "not-run") idle.status = "not-run";
    else delete idle.load;
    const visible = renderComment(run, measured, [], repository).split("<details>")[0];
    assert.match(visible, /11\/11 passed/);
    assert.match(visible, /- Velair open at rest: Not run · 0\/1 checks/);
    assert.ok((visible.match(/^- /gm) ?? []).length <= 3);
  }
  for (const measured of [undefined, { ...report, suite: "smoke", status: "not-run", outcome: "not-run", scenarios: [] }]) {
    const visible = renderComment(run, measured, [], repository).split("<details>")[0];
    assert.doesNotMatch(visible, /^- /m);
  }
});

test("GitHub success cannot hide a failed reported execution or approve captured images", () => {
  for (const outcome of ["fail", "infrastructure-error"]) {
    const measured = { ...actionReport(), status: outcome, outcome };
    const visible = renderComment({ ...run, conclusion: "success" }, measured, [], repository).split("<details>")[0];
    assert.match(visible, /Actions result: \*\*success\*\*/);
    assert.match(visible, /11\/11 passed/);
    assert.ok(visible.includes(`Reported execution: **${outcome}**.`));
    assert.match(visible, /Visual review: captures awaiting review/);
    assert.doesNotMatch(visible, /Visual review: (passed|compared)/);
  }
  const missing = renderComment(run, undefined, [], repository).split("<details>")[0];
  assert.match(missing, /Action overview unavailable/);
  assert.match(missing, /Visual review: unavailable/);
  assert.doesNotMatch(missing, /0\/0 passed/);
  const notRun = renderComment(run, { ...report, status: "not-run", outcome: "not-run", suite: "smoke", scenarios: [] }, [], repository).split("<details>")[0];
  assert.match(notRun, /0\/8 passed · 8 not run/);
  assert.match(notRun, /Reported execution: \*\*not-run\*\*/);
  assert.match(notRun, /Visual review: not established/);
});

test("cooling failures name the actual screen and trusted action stage without exposing raw failure text", () => {
  const measured = actionReport();
  measured.outcome = measured.status = "fail";
  const cooling = measured.scenarios.find((row) => row.id === "browser/mobile/cool schedule controls remain usable and saved fields persist");
  Object.assign(cooling, { status: "fail", actionId: "schedule.edit-save", actionVariant: "cooling-usable", project: "mobile", failureStep: "schedule.save", error: "<script>private raw log</script>" });
  assert.doesNotThrow(() => validateReport(measured, run, repository));
  const line = renderComment(run, measured, [], repository).split("\n").find((item) => item.startsWith("| Edit and save a schedule |"));
  assert.match(line, /Failed · 8\/9 checks/);
  assert.match(line, /Cooling · Mobile · Failed · Saving and confirming the stored value/);
  assert.doesNotMatch(line, /private raw log|<script>/);
  cooling.failureStep = "forged.stage | Passed @somebody";
  const unknownStage = renderComment(run, measured, [], repository);
  assert.match(unknownStage, /Failed during this action; step not recorded/);
  assert.doesNotMatch(unknownStage, /forged.stage|@somebody/);
});

test("actual failures take priority over earlier missing variants in the action result", () => {
  const measured = { ...report, outcome: "fail", status: "fail", scenarios: [{
    id: "browser/tablet/range schedule edits persist after a real save and reload", status: "fail",
    actionId: "schedule.edit-save", actionVariant: "range", project: "tablet", failureStep: "schedule.change-temperature",
  }] };
  const line = renderComment(run, measured, [], repository).split("\n").find((item) => item.startsWith("| Edit and save a schedule |"));
  assert.match(line, /Temperature range · Tablet · Failed · Changing one temperature/);
  assert.doesNotMatch(line, /Not checked successfully/);
});

test("unknown explicit action metadata never falls back to an apparently valid historical title", () => {
  const measured = actionReport();
  const cooling = measured.scenarios.find((row) => row.id === "browser/mobile/cool schedule controls remain usable and saved fields persist");
  Object.assign(cooling, { actionId: "unknown-action", actionVariant: "cooling-usable", project: "mobile" });
  const body = renderComment(run, measured, [], repository);
  const line = body.split("\n").find((item) => item.startsWith("| Edit and save a schedule |"));
  assert.match(line, /8\/9/);
  assert.match(body, /1 check\(s\) could not be matched/);
  assert.doesNotMatch(line, /Passed · 9\/9/);
});

test("missing action evidence and old unknown scenario names stay unavailable or unclassified", () => {
  const missing = renderComment(run, undefined, [], repository);
  assert.match(missing, /Action overview unavailable/);
  const unknown = renderComment(run, { ...report, scenarios: [{ id: "browser/desktop/not-a-catalogue-action", status: "pass" }] }, [], repository);
  assert.match(unknown, /1 check\(s\) could not be matched/);
  assert.doesNotMatch(unknown, /\| not-a-catalogue-action/);
  const oversized = renderComment(run, { ...report, unexpectedMetadata: "x".repeat(2_000_000) }, [], repository);
  assert.match(oversized, /Action overview unavailable/);
});

test("the action normalizer resolves from the trusted module path rather than the working directory", () => {
  const cwd = process.cwd();
  try {
    process.chdir(fileURLToPath(new URL("../", import.meta.url)));
    const body = renderComment(run, actionReport(), [], repository);
    assert.match(body, /\| Edit and save a schedule \|/);
    assert.doesNotMatch(body, /Action overview unavailable/);
  } finally { process.chdir(cwd); }
});

test("PR summary presents a compact table with load evidence, units and sample counts", () => {
  const measured = measuredReport();
  assert.equal(validateReport(measured, run, repository), measured);
  const body = renderComment(run, measured, [], repository);
  assert.match(body, /\| Journey checks \| 2\/2 passed \|/);
  assert.match(body, /\| Household actions \| 660\/660 completed · 660\/660 observed \|/);
  assert.match(body, /\| Interaction under combined activity \| 25\.00 ms median · 4 sample\(s\) \|/);
  assert.match(body, /\| Saving under combined activity \| 300\.00 ms median · 3 sample\(s\) \|/);
  assert.match(body, /performance figures are informational/);
  assert.match(body, /Visual evidence: capture-unreviewed/);
  assert.doesNotMatch(body, /✅|improvement|% faster/);
});

test("missing and intentionally omitted evidence never becomes a successful empty result", () => {
  for (const missing of [undefined, { ...report, outcome: "not-run", status: "not-run", scenarios: [], limitations: ["No runtime changes."] }]) {
    const body = renderComment(run, missing, [], repository);
    assert.match(body, /\| Journey checks \| Not run \|/);
    assert.match(body, /\| Household actions \| Not run \|/);
    assert.match(body, /\| Saving under combined activity \| Not measured \|/);
    assert.doesNotMatch(body, /0\/0 passed/);
  }
});

test("failed or skipped checks and incomplete activity stay explicit without publishing latency as valid", () => {
  const measured = measuredReport();
  measured.outcome = measured.status = "fail";
  measured.scenarios[1].status = "not-run";
  const combined = measured.scenarios.at(-1);
  combined.status = "fail";
  combined.load.completed = 359;
  combined.load.observed = 358;
  combined.load.failed = 1;
  assert.doesNotThrow(() => validateReport(measured, run, repository));
  const body = renderComment(run, measured, [{ conclusion: "failure" }], repository);
  assert.match(body, /1\/2 passed · 1 not run/);
  assert.match(body, /659\/660 completed · 658\/660 observed · 1 scenario\(s\) not passed/);
  assert.match(body, /Saving under combined activity \| Unavailable: scenario did not pass/);
  assert.doesNotMatch(body, /300\.00 ms median/);
});

test("untrusted metrics and counters are bounded and cannot forge statistics", () => {
  const invalid = [];
  for (const value of [true, "10", -1, Infinity, NaN, "0 | forged result"]) {
    const measured = measuredReport();
    measured.scenarios.at(-1).samples.interaction_ms = [value];
    invalid.push(measured);
  }
  for (const value of [true, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, "360"]) {
    const measured = measuredReport();
    measured.scenarios.at(-1).load.requested = value;
    invalid.push(measured);
  }
  for (const patch of [{ completed: 359 }, { observed: 359 }, { planned: 361 }, { failed: 1 }]) {
    const measured = measuredReport();
    Object.assign(measured.scenarios.at(-1).load, patch);
    invalid.push(measured);
  }
  const oversized = measuredReport();
  oversized.scenarios.at(-1).samples.interaction_ms = Array(100_001).fill(1);
  invalid.push(oversized);
  const duplicate = measuredReport();
  duplicate.scenarios.push(duplicate.scenarios.at(-1));
  invalid.push(duplicate);
  for (const [field, value] of [["actionId", null], ["actionVariant", ["cooling-usable"]], ["project", "mobile\nforged"], ["failureStep", "x".repeat(201)]]) {
    const measured = measuredReport();
    measured.scenarios[0][field] = value;
    invalid.push(measured);
  }
  invalid.push({ ...report, scenarios: [null] });
  for (const measured of invalid) {
    assert.throws(() => validateReport(measured, run, repository));
    const body = renderComment(run, measured, [], repository);
    assert.match(body, /Statistics are unavailable/);
    assert.doesNotMatch(body, /forged result|ms median|660\/660/);
  }
});

test("run provenance rejects unexpected repository, workflow, event and malformed SHA", () => {
  assert.doesNotThrow(() => validateRun(run, repository));
  for (const patch of [{ repository: { full_name: "other/velair" } }, { name: "Not CI" }, { path: "evil.yml" }, { event: "push" }, { head_sha: "bad" }, { id: "31" }]) {
    assert.throws(() => validateRun({ ...run, ...patch }, repository));
  }
});

test("report provenance cannot substitute another SHA, attempt, run or repository", () => {
  assert.equal(validateReport(report, run, repository), report);
  for (const patch of [{ headSha: "b".repeat(40) }, { runAttempt: "1" }, { runId: "30" }, { repository: "other/velair" }, { event: "push" }]) {
    assert.throws(() => validateReport({ ...report, provenance: { ...report.provenance, ...patch } }, run, repository));
  }
  assert.throws(() => validateReport({ ...report, outcome: "unreviewed" }, run, repository));
});

test("bounded ZIP reader rejects oversized archives, traversal and multiple files", () => {
  assert.throws(() => reportFromZip(Buffer.alloc(3_000_001)), /size limit/);
  const zip = (names) => {
    const python = spawnSync("python", ["-c", "import io,json,sys,zipfile\nb=io.BytesIO()\nwith zipfile.ZipFile(b,'w') as z:\n for n in json.loads(sys.argv[1]): z.writestr(n,'{\"schemaVersion\":1}')\nsys.stdout.buffer.write(b.getvalue())", JSON.stringify(names)]);
    assert.equal(python.status, 0);
    return python.stdout;
  };
  assert.deepEqual(reportFromZip(zip(["quality-report.json"])), { schemaVersion: 1 });
  assert.throws(() => reportFromZip(zip(["../quality-report.json"])));
  assert.throws(() => reportFromZip(zip(["quality-report.json", "extra.py"])));
});

test("comments escape artifact text and use GitHub failure as authoritative result", () => {
  const body = renderComment(run, { ...report, limitations: ["<script>bad()</script>\n# Forged [link](https://invalid) @someone"] }, [{ conclusion: "failure" }], repository);
  assert.ok(body.startsWith(MARKER));
  assert.match(body, /Actions result: \*\*failure\*\*/);
  assert.match(body, /Reported outcome: pass/);
  assert.doesNotMatch(body, /<script>|\n# Forged|\[link\]|@someone/);
  assert.match(body, /Visual evidence: capture-unreviewed/);
});

test("publisher ignores stale attempts without making writes", async () => {
  const calls = [];
  const result = await publish({ event: { repository: { full_name: repository }, workflow_run: { id: 31, run_attempt: 1 } }, repository, token: "test",
    request: async (url, options) => { calls.push(options.method ?? "GET"); return json(run); } });
  assert.equal(result, "stale-attempt");
  assert.deepEqual(calls, ["GET"]);
});

test("publisher refuses a newer run and checks actual PR head", async () => {
  const pr = { number: 7, state: "open", base: { repo: { full_name: repository } }, head: { sha, repo: { id: 4 } } };
  const routes = new Map([
    ["/actions/runs/31", run], ["/pulls/7", pr],
    [`/actions/workflows/3/runs?event=pull_request&head_sha=${sha}&per_page=100`, { workflow_runs: [{ id: 32, run_attempt: 1 }] }],
  ]);
  const calls = [];
  const result = await publish({ event: { repository: { full_name: repository }, workflow_run: { id: 31, run_attempt: 2 } }, repository, token: "test",
    request: async (url, options) => {
      calls.push(options.method ?? "GET");
      const path = url.replace(`https://api.github.com/repos/${repository}`, "");
      assert.ok(routes.has(path), path);
      return json(routes.get(path));
    } });
  assert.equal(result, "stale-run");
  assert.ok(calls.every((method) => method === "GET"));
});

test("publisher updates the existing bot comment with current-run statistics", async () => {
  const measured = actionReport();
  const archive = spawnSync("python", ["-c", "import io,sys,zipfile\nb=io.BytesIO()\nwith zipfile.ZipFile(b,'w') as z: z.writestr('quality-report.json',sys.stdin.buffer.read())\nsys.stdout.buffer.write(b.getvalue())"], { input: JSON.stringify(measured) });
  assert.equal(archive.status, 0);
  const pr = { number: 7, state: "open", base: { repo: { full_name: repository } }, head: { sha, repo: { id: 4 } } };
  const routes = new Map([
    ["/actions/runs/31", run], ["/pulls/7", pr],
    [`/actions/workflows/3/runs?event=pull_request&head_sha=${sha}&per_page=100`, { workflow_runs: [{ id: 31, run_attempt: 2 }] }],
    ["/actions/runs/31/jobs?filter=latest&per_page=100&page=1", { jobs: [{ conclusion: "failure" }] }],
    ["/actions/runs/31/artifacts?per_page=100", { artifacts: [{ id: 71, name: "quality-summary", size_in_bytes: archive.stdout.length, expired: false }] }],
    ["/issues/7/comments?per_page=100&page=1", [{ id: 99, user: { login: "github-actions[bot]", type: "Bot" }, body: MARKER }]],
  ]);
  const writes = [];
  const result = await publish({ event: { repository: { full_name: repository }, workflow_run: { id: 31, run_attempt: 2 } }, repository, token: "test",
    request: async (url, options) => {
      const path = url.replace(`https://api.github.com/repos/${repository}`, "");
      if (options.method) { writes.push({ path, method: options.method, body: JSON.parse(options.body).body }); return json({}); }
      if (path === "/actions/artifacts/71/zip") return new Response(archive.stdout);
      assert.ok(routes.has(path), path);
      return json(routes.get(path));
    } });
  assert.equal(result, "updated");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, "/issues/comments/99");
  assert.equal(writes[0].method, "PATCH");
  assert.match(writes[0].body, /660\/660 completed · 660\/660 observed/);
  assert.match(writes[0].body, /\| Action \| What is checked \| Result \|/);
  assert.match(writes[0].body, /\| Edit and save a schedule \|.*Passed · 9\/9 checks/);
  assert.match(writes[0].body, /Actions result: \*\*failure\*\*/);
});
