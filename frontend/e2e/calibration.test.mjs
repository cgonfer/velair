import test from "node:test";
import assert from "node:assert/strict";
import { draftUpdateWaitBudget, duplicateRequestCount, summarize, summarizeMetric, validateScenario, viewportContains, visualReferenceAction } from "./measurements.mjs";

test("incomplete and failed generated load cannot be reported as a valid benchmark", () => {
  const complete = { planned: 10, requested: 10, completed: 10, failed: 0, observed: 10, expected_observed: 10 };
  assert.equal(validateScenario({ load: complete }).status, "passed");
  for (const patch of [{ requested: 9 }, { completed: 9 }, { failed: 1 }, { observed: 9 }]) {
    assert.equal(validateScenario({ load: { ...complete, ...patch } }).status, "failed");
  }
});

test("viewport guard detects a deliberately oversized dialog", () => {
  assert.equal(viewportContains({ x: 10, y: 10, width: 370, height: 400 }, { width: 390, height: 844 }), true);
  assert.equal(viewportContains({ x: 10, y: 10, width: 500, height: 400 }, { width: 390, height: 844 }), false);
});

test("missing references cannot generate approved images or report a comparison", () => {
  assert.throws(() => visualReferenceAction(false), /Missing approved visual reference/);
  assert.throws(() => visualReferenceAction(false, "missing"), /explicit/);
  assert.equal(visualReferenceAction(false, "all"), "recorded");
  assert.equal(visualReferenceAction(true, "all"), "recorded");
  assert.equal(visualReferenceAction(true), "compared");
});

test("duplicate requests are counted and insufficient p95 samples stay unavailable", () => {
  assert.equal(duplicateRequestCount(["get_schedule", "get_schedule", "set_daily_schedule"]), 1);
  assert.equal(summarize([10, 20, 100]).p95, null);
  assert.equal(summarize([10, 20, 100]).median, 20);
  assert.equal(summarize(Array.from({ length: 100 }, (_, index) => index + 1)).p95, 95);
  assert.equal(summarize([]).median, null);
});

test("operation summaries include p95 only when at least one hundred timings exist", () => {
  const ninetyNine = Array.from({ length: 99 }, (_, index) => index);
  assert.deepEqual(summarizeMetric("interaction_ms", ninetyNine), { count: 99, median: 49, min: 0, max: 98 });
  assert.equal(Object.hasOwn(summarizeMetric("save_persist_ms", ninetyNine), "p95"), false);
  assert.equal(summarizeMetric("service_roundtrip_ms", [...ninetyNine, 99]).p95, 94);
  assert.deepEqual(summarizeMetric("interaction_ms", [0]), { count: 1, median: 0, min: 0, max: 0 });
});

test("finite extreme readings keep their even-sample median finite", () => {
  assert.equal(summarizeMetric("interaction_ms", [1e308, 1e308]).median, 1e308);
  assert.equal(summarizeMetric("interaction_ms", [0, 1e308]).median, 5e307);
});

test("resource and polling-interval summaries do not present latency percentiles", () => {
  for (const name of ["container_cpu_percent", "container_memory_bytes", "browser_heap_bytes", "browser_task_ms", "ha_event_loop_lag_ms"]) {
    const summary = summarizeMetric(name, Array.from({ length: 120 }, (_, index) => index));
    assert.deepEqual(summary, { count: 120, median: 59.5, min: 0, max: 119 }, name);
  }
});

test("totals, snapshots, functional durations and unknown readings do not become distributions", () => {
  for (const name of ["browser_updates", "browser_long_tasks", "browser_long_task_duration_ms", "browser_heap_after_load_bytes", "browser_heap_after_recovery_bytes", "browser_velair_requests", "test_duration_ms", "unknown_ms", "toString", "__proto__"]) {
    assert.equal(summarizeMetric(name, [10, 20, 30]), undefined, name);
  }
  for (const values of [[], [NaN], [Infinity], [-1], [true], null]) {
    assert.equal(summarizeMetric("interaction_ms", values), undefined);
  }
});

test("held-draft update waits cover a full edited-climate cycle in small and large fixtures", () => {
  const small = draftUpdateWaitBudget(3, 6, 58_000);
  const large = draftUpdateWaitBudget(30, 6, 58_000);
  assert.ok(small.eventTimeoutMs >= 3_000);
  assert.ok(large.eventTimeoutMs >= 30_000, "a just-missed edited-climate event must not fail at the old 15-second limit");
  assert.ok(large.eventTimeoutMs > small.eventTimeoutMs);
  for (const budget of [small, large]) {
    assert.equal(budget.canObserveCycle, true);
    assert.equal(budget.saveReserveMs, 15_000);
    assert.ok(budget.eventTimeoutMs + budget.stateTimeoutMs + budget.saveReserveMs <= 58_000);
  }
});

test("held-draft update waits remain bounded by the remaining measurement window", () => {
  const budget = draftUpdateWaitBudget(30, 6, 24_000);
  assert.ok(budget.eventTimeoutMs > 0 && budget.eventTimeoutMs < 15_000);
  assert.equal(budget.saveReserveMs, 15_000);
  assert.equal(budget.canObserveCycle, false, "a truncated cycle must fail explicitly before polling");
  assert.ok(budget.eventTimeoutMs + budget.stateTimeoutMs + budget.saveReserveMs <= 24_000);
  for (const remaining of [10_000, 0, -1]) {
    const exhausted = draftUpdateWaitBudget(30, 6, remaining);
    assert.equal(exhausted.eventTimeoutMs, 0, "exhausted windows must not become an unlimited Playwright timeout");
    assert.equal(exhausted.canObserveCycle, false);
    assert.ok(exhausted.eventTimeoutMs + exhausted.stateTimeoutMs + exhausted.saveReserveMs <= Math.max(0, remaining));
  }
});

test("held-draft update budgets reject invalid fixture and rate inputs", () => {
  for (const args of [[0, 6, 60_000], [3.5, 6, 60_000], [3, 0, 60_000], [3, Infinity, 60_000], [3, 6, NaN]]) {
    assert.throws(() => draftUpdateWaitBudget(...args), /Invalid draft-update workload budget/);
  }
});
