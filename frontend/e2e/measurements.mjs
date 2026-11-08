/** Pure quality measurement rules shared by the runner and calibration tests. */
import { readFileSync } from "node:fs";

const metrics = JSON.parse(readFileSync(new URL("../../scripts/quality/metrics.json", import.meta.url), "utf8"));

export function summarize(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const count = sorted.length;
  if (!count) return { count: 0, median: null, p95: null, min: null, max: null };
  const middle = Math.floor(count / 2);
  return {
    count,
    median: count % 2 ? sorted[middle] : sorted[middle - 1] + (sorted[middle] - sorted[middle - 1]) / 2,
    p95: count >= 100 ? sorted[Math.ceil(count * 0.95) - 1] : null,
    min: sorted[0],
    max: sorted[count - 1],
  };
}

/** Derive only statistics that match the recorded measurement's meaning. */
export function summarizeMetric(name, values) {
  const definition = Object.hasOwn(metrics, name) ? metrics[name] : undefined;
  if (!["latency", "series"].includes(definition?.kind) || !Array.isArray(values) || !values.length
    || !values.every((value) => Number.isFinite(value) && value >= 0)) return undefined;
  const { p95, ...summary } = summarize(values);
  if (definition.kind === "latency" && p95 !== null) summary.p95 = p95;
  return summary;
}

/** Budget a post-draft update from the existing one-climate-per-six-actions workload. */
export function draftUpdateWaitBudget(climateCount, rate, remainingMs) {
  if (!Number.isInteger(climateCount) || climateCount < 1 || !Number.isFinite(rate) || rate <= 0
    || !Number.isFinite(remainingMs)) throw new Error("Invalid draft-update workload budget");
  const remaining = Math.max(0, remainingMs);
  const saveReserveMs = Math.min(15_000, remaining);
  const available = remaining - saveReserveMs;
  const stateTimeoutMs = Math.min(5_000, available);
  const climateCycleMs = climateCount * 6 / rate * 1000;
  // A large fixture takes longer to revisit the edited climate. Allow one cycle
  // plus delivery tolerance, while keeping browser receipt and saving in-window.
  const eventTimeoutMs = Math.max(0, Math.min(climateCycleMs + 5_000, available - stateTimeoutMs));
  return { eventTimeoutMs, stateTimeoutMs, saveReserveMs, canObserveCycle: eventTimeoutMs >= climateCycleMs };
}

export function loadIsComplete(load) {
  return load.requested === load.planned
    && load.completed === load.requested
    && load.failed === 0
    && load.observed >= load.expected_observed;
}

export function validateScenario(scenario) {
  const errors = [];
  if (!loadIsComplete(scenario.load)) errors.push("incomplete_load");
  if (scenario.functional_errors?.length) errors.push("functional_error");
  return { status: errors.length ? "failed" : "passed", errors };
}

export function viewportContains(box, viewport) {
  return Boolean(box && box.x >= -1 && box.y >= -1
    && box.x + box.width <= viewport.width + 1
    && box.y + box.height <= viewport.height + 1);
}

export function duplicateRequestCount(requests) {
  const counts = new Map();
  for (const request of requests) counts.set(request, (counts.get(request) || 0) + 1);
  return [...counts.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);
}

export function visualReferenceAction(referenceExists, updateSnapshots = "none") {
  if (updateSnapshots === "all") return "recorded";
  if (updateSnapshots !== "none") throw new Error("Use explicit --update-snapshots=all to record visual references");
  if (!referenceExists) throw new Error("Missing approved visual reference; generate explicitly with --update-snapshots=all and review the image diff");
  return "compared";
}
