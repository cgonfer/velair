import { expect } from "@playwright/test";
import { launchBrowser } from "./browser.mjs";
import { parseArgs } from "node:util";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { connect, delay, login, openPanel, outputDir, readState, writeJson } from "./helpers.mjs";
import { draftUpdateWaitBudget, summarizeMetric, validateScenario } from "./measurements.mjs";

export function scenarioPlan(suite, scale = 1) {
  const phases = { warmup_seconds: 20 * scale, measurement_seconds: 60 * scale, recovery_seconds: 20 * scale };
  const plan = [
    { id: "idle", rate: 0, relevant: false, ...phases },
    { id: "unrelated_activity", rate: 5, relevant: false, ...phases },
    { id: "combined_activity", rate: 6, relevant: true, interactions: true, ...phases },
  ];
  if (["extended", "release"].includes(suite)) plan.push({ id: "burst_recovery", rate: 20, relevant: true, ...phases, measurement_seconds: 30 * scale });
  if (suite === "extended") plan.push({ id: "soak", rate: 6, relevant: true, interactions: true, ...phases, measurement_seconds: 1800 * scale });
  return plan;
}

async function instrument(page) {
  await page.evaluate(() => {
    window.__velairQuality = { updates: 0, long_tasks: [], errors: [] };
    for (const tag of ["velair-panel-card", "velair-profiles-view"]) {
      const constructor = customElements.get(tag);
      if (!constructor) continue;
      const original = constructor.prototype.updated;
      constructor.prototype.updated = function (...args) {
        window.__velairQuality.updates++;
        return original?.apply(this, args);
      };
    }
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__velairQuality.long_tasks.push({ start: entry.startTime, duration: entry.duration });
      });
      observer.observe({ type: "longtask" });
    }
    addEventListener("error", (event) => window.__velairQuality.errors.push(String(event.message).slice(0, 300)));
  });
}

function actionFor(state, definition, index, sequence) {
  const groups = state.fixture_entities;
  const unrelated = [...(groups.light || []), ...(groups.switch || []), ...(groups.cover || [])];
  const relevant = definition.relevant && index % 6 === 5;
  const entities = relevant ? state.climate_entities : unrelated;
  if (!entities.length) throw new Error("Fixture did not create entities needed by the load scenario");
  const entity = entities[Math.floor(index / (relevant ? 6 : 1)) % entities.length];
  const turn = (sequence.get(entity) || 0) + 1;
  sequence.set(entity, turn);
  const domain = entity.split(".")[0];
  if (domain === "climate") return { domain: "velair_test", service: "control", data: { entity_id: entity, current_temperature: turn % 2 ? 19.1 : 20.2 }, expected: { field: "current_temperature", value: turn % 2 ? 19.1 : 20.2 } };
  if (domain === "light") return { domain, service: "turn_on", data: { entity_id: entity, brightness: turn % 2 ? 80 : 180 }, expected: { field: "brightness", value: turn % 2 ? 80 : 180 } };
  if (domain === "switch") return { domain, service: turn % 2 ? "turn_on" : "turn_off", data: { entity_id: entity }, expected: { field: "state", value: turn % 2 ? "on" : "off" } };
  return { domain: "cover", service: "set_cover_position", data: { entity_id: entity, position: turn % 2 ? 20 : 80 }, expected: { field: "current_position", value: turn % 2 ? 20 : 80 } };
}

export async function runScenario({ state, api, page, definition, requestCounts }) {
  await api.service("velair_test", "reset");
  await openPanel(page);
  await instrument(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const result = {
    id: definition.id,
    status: "running",
    phases: definition,
    samples: { service_roundtrip_ms: [], interaction_ms: [], save_persist_ms: [], ha_event_loop_lag_ms: [], browser_heap_bytes: [], browser_task_ms: [] },
    load: { planned: Math.floor(definition.measurement_seconds * definition.rate), requested: 0, completed: 0, failed: 0, observed: 0, expected_observed: 0 },
    functional_errors: [],
  };
  const tracked = new Set(Object.values(state.fixture_entities).flat());
  const expectedChanges = new Map();
  let editedClimateUpdates = 0;
  let editedClimateTemperature;
  let phase = "warmup";
  const unsubscribe = await api.subscribe("state_changed", (event) => {
    if (phase !== "measurement") return;
    const data = event.data || {};
    if (data.entity_id === "sensor.quality_event_loop_lag") {
      const value = Number(data.new_state?.state);
      if (Number.isFinite(value)) result.samples.ha_event_loop_lag_ms.push(value);
    } else if (tracked.has(data.entity_id)) {
      // Match the requested field/value, not unrelated events caused by HA or
      // the scheduler. Extra events must not hide a missing generated action.
      const expected = expectedChanges.get(data.entity_id) || [];
      const index = expected.findIndex(({ field, value }) => (field === "state" ? data.new_state?.state : data.new_state?.attributes?.[field]) === value);
      if (index >= 0) {
        expected.splice(index, 1); result.load.observed++;
        if (data.entity_id === state.climate_entities[0] && data.new_state?.attributes?.current_temperature !== undefined) {
          editedClimateUpdates++;
          editedClimateTemperature = data.new_state.attributes.current_temperature;
        }
      }
    }
  });
  const sequence = new Map();
  const originalMonday = definition.interactions
    ? (await api.call({ type: "velair/get_schedule" })).zones[state.climate_entities[0]].schedule.monday
    : undefined;
  let stopSampling = false;
  let taskDuration;
  const sampling = (async () => {
    while (!stopSampling) {
      const metrics = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(({ name, value }) => [name, value]));
      if (phase === "measurement") {
        if (Number.isFinite(metrics.JSHeapUsedSize)) result.samples.browser_heap_bytes.push(metrics.JSHeapUsedSize);
        if (taskDuration !== undefined && Number.isFinite(metrics.TaskDuration)) result.samples.browser_task_ms.push((metrics.TaskDuration - taskDuration) * 1000);
      }
      taskDuration = metrics.TaskDuration;
      await delay(1000);
    }
  })().catch(() => result.functional_errors.push("Browser resource sampling failed"));
  const generate = async (seconds, measured) => {
    if (!definition.rate) { await delay(seconds * 1000); return; }
    const started = performance.now();
    const total = Math.floor(seconds * definition.rate);
    const pending = new Set();
    for (let index = 0; index < total; index++) {
      await delay(Math.max(0, started + index * 1000 / definition.rate - performance.now()));
      if (pending.size >= 20) {
        if (measured) { result.load.requested++; result.load.failed++; }
        continue;
      }
      const action = actionFor(state, definition, index, sequence);
      if (measured) {
        result.load.requested++;
        result.load.expected_observed++;
        const expected = expectedChanges.get(action.data.entity_id) || [];
        expected.push(action.expected);
        expectedChanges.set(action.data.entity_id, expected);
      }
      const requestStart = performance.now();
      const work = api.service(action.domain, action.service, action.data).then(() => {
        if (measured) { result.load.completed++; result.samples.service_roundtrip_ms.push(performance.now() - requestStart); }
      }).catch(() => { if (measured) result.load.failed++; }).finally(() => pending.delete(work));
      pending.add(work);
    }
    await Promise.all(pending);
    await delay(Math.max(0, seconds * 1000 - (performance.now() - started)));
  };
  const requestsBefore = requestCounts.velair;
  let interactionStep;
  try {
    await generate(definition.warmup_seconds, false);
    phase = "measurement";
    const interactions = definition.interactions ? (async () => {
      const started = performance.now();
      let toggle = false;
      let heldDraftChecked = false;
      while (performance.now() - started < definition.measurement_seconds * 1000) {
        const begin = performance.now();
        interactionStep = "activity.navigate";
        const tab = page.locator(`velair-sidebar-panel ha-tab-group-tab[panel="${toggle ? "overview" : "schedules"}"]`);
        await tab.click();
        const expected = toggle ? ".overview-summary" : ".schedule";
        await page.locator(`velair-panel-card ${expected}`).first().waitFor({ state: "visible", timeout: 15_000 });
        result.samples.interaction_ms.push(performance.now() - begin);
        if (!toggle) {
          interactionStep = "activity.edit-save";
          const card = page.locator("velair-panel-card");
          await card.locator('.day-tab[data-weekday="monday"]').click();
          const input = card.locator(".editable-block input.temperature-input").first();
          if (!heldDraftChecked) {
            interactionStep = "activity.keep-draft";
            const heldValue = await input.inputValue() === "23" ? "22.5" : "23";
            await input.click();
            await input.fill(heldValue);
            await input.press("Tab");
            await expect(input).toHaveValue(heldValue);
            await expect(card.locator(".schedule-save-footer button")).toBeEnabled();
            const observedBefore = editedClimateUpdates;
            const budget = draftUpdateWaitBudget(state.climate_entities.length, definition.rate,
              definition.measurement_seconds * 1000 - (performance.now() - started));
            if (!budget.canObserveCycle || !budget.stateTimeoutMs) {
              throw new Error("The measurement window has no room for a post-draft update and save");
            }
            await expect.poll(() => editedClimateUpdates, { timeout: budget.eventTimeoutMs,
              message: "A generated climate update must arrive while the schedule draft is unsaved" }).toBeGreaterThan(observedBefore);
            await expect.poll(async () => {
              const browserTemperature = await card.evaluate((element, entity) => element.hass?.states?.[entity]?.attributes?.current_temperature,
                state.climate_entities[0]);
              return browserTemperature === editedClimateTemperature;
            }, { timeout: budget.stateTimeoutMs,
              message: "The editor must receive the live Home Assistant climate state" }).toBe(true);
            await expect(input).toHaveValue(heldValue);
            expect((await api.call({ type: "velair/get_schedule" })).zones[state.climate_entities[0]].schedule.monday).toEqual(originalMonday);
            result.editingEvidence = "draft-preserved-during-updates";
            heldDraftChecked = true;
          }
          interactionStep = "activity.edit-save";
          const target = result.samples.save_persist_ms.length % 2 ? 21.5 : 22;
          const saveStart = performance.now();
          await input.fill(String(target));
          await input.press("Tab");
          await card.locator(".schedule-save-footer button").click();
          await expect.poll(async () => (await api.call({ type: "velair/get_schedule" })).zones[state.climate_entities[0]].schedule.monday[0].temperature,
            { timeout: 15_000, message: "Saved schedule must persist under generated load" }).toBe(target);
          result.samples.save_persist_ms.push(performance.now() - saveStart);
        }
        toggle = !toggle;
        await delay(3000);
      }
    })().catch(() => {
      result.functional_errors.push("Navigation failed during generated load");
      if (interactionStep) result.failureStep = interactionStep;
    }) : Promise.resolve();
    await Promise.all([generate(definition.measurement_seconds, true), interactions]);
    // Drain state events from completed service calls before closing the measured window.
    await delay(250);
    phase = "recovery";
    const atLoadEnd = await page.evaluate(() => ({ ...window.__velairQuality, heap: performance.memory?.usedJSHeapSize ?? null }));
    await delay(definition.recovery_seconds * 1000);
    result.browser = {
      updates: atLoadEnd.updates,
      long_tasks: atLoadEnd.long_tasks.length,
      long_task_duration_ms: atLoadEnd.long_tasks.reduce((total, entry) => total + entry.duration, 0),
      heap_after_load_bytes: atLoadEnd.heap,
      heap_after_recovery_bytes: await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null),
      velair_requests: requestCounts.velair - requestsBefore,
    };
    result.functional_errors.push(...atLoadEnd.errors);
    Object.assign(result, validateScenario(result));
    result.statistics = Object.fromEntries(Object.entries(result.samples)
      .map(([name, values]) => [name, summarizeMetric(name, values)])
      .filter(([, statistics]) => statistics !== undefined));
  } finally {
    phase = "finished";
    stopSampling = true;
    await sampling;
    await unsubscribe();
    await cdp.detach();
    await api.service("velair_test", "reset");
    if (originalMonday) await api.call({ type: "velair/set_daily_schedule", entity_id: state.climate_entities[0], weekday: "monday", blocks: originalMonday });
  }
  return result;
}

export async function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({ args: argv, options: { state: { type: "string" }, output: { type: "string" }, suite: { type: "string", default: "smoke" }, "duration-scale": { type: "string", default: "1" } } });
  const suite = values.suite;
  if (!["smoke", "extended", "release"].includes(suite)) throw new Error("Load suite must be smoke, extended or release");
  const scale = Number(values["duration-scale"]);
  if (!Number.isFinite(scale) || scale <= 0 || scale > 1) throw new Error("Duration scale must be greater than zero and at most one");
  const state = readState(values.state);
  const output = outputDir(values.output || process.env.VELAIR_QUALITY_OUTPUT);
  const report = { schema_version: 1, status: "running", suite, duration_scale: scale, scenarios: [], limitations: [
    "Container CPU and memory describe the complete Home Assistant instance, not Velair alone.",
    "Latency and memory measurements are informational until calibrated; no capacity guarantee is inferred.",
    "Browser update counts cover selected Velair components and are not a count of all HA rendering.",
  ] };
  let browser;
  let api;
  try {
    api = await connect(state);
    browser = await launchBrowser();
    const page = await browser.newPage({ baseURL: state.base_url, viewport: { width: 1440, height: 900 }, locale: "en-US", timezoneId: "Europe/Madrid" });
    const requestCounts = { velair: 0 };
    page.on("websocket", (socket) => socket.on("framesent", ({ payload }) => {
      try { if (JSON.parse(String(payload)).type?.startsWith("velair/")) requestCounts.velair++; } catch { /* Never persist authentication frames. */ }
    }));
    await login(page, state);
    for (const definition of scenarioPlan(suite, scale)) {
      report.scenarios.push(await runScenario({ state, api, page, definition, requestCounts }));
      writeJson(join(output, "metrics.json"), report);
    }
    report.status = report.scenarios.every((scenario) => scenario.status === "passed") ? "passed" : "failed";
    if (scale !== 1) report.limitations.push("Shortened diagnostic execution; not comparable with the standard benchmark duration.");
  } catch (error) {
    report.status = "failed";
    report.error = String(error.message).slice(0, 500);
  } finally {
    api?.close();
    await browser?.close();
    writeJson(join(output, "metrics.json"), report);
  }
  return report.status === "passed" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code; }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
