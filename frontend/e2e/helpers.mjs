import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "@playwright/test";
import { visualReferenceAction, viewportContains } from "./measurements.mjs";

export const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export function outputDir(path = process.env.VELAIR_QUALITY_OUTPUT) {
  if (!path || !isAbsolute(path)) throw new Error("VELAIR_QUALITY_OUTPUT or --output must name an absolute task-specific output directory");
  return resolve(path);
}
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function readState(path = process.env.VELAIR_HA_STATE) {
  if (!path) throw new Error("VELAIR_HA_STATE must name the private state produced by scripts/quality/ha.py start");
  const state = JSON.parse(readFileSync(path, "utf8"));
  const url = new URL(state.base_url);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.protocol !== "http:") {
    throw new Error("Quality tests only connect to their loopback Home Assistant instance");
  }
  for (const field of ["username", "password", "access_token"]) {
    if (typeof state[field] !== "string" || !state[field]) throw new Error(`Missing private HA state field: ${field}`);
  }
  return state;
}

export class HaConnection {
  constructor(state) {
    this.state = state;
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
  }

  async connect() {
    const url = new URL("/api/websocket", this.state.base_url);
    url.protocol = "ws:";
    this.socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.socket.close(); reject(new Error("HA WebSocket authentication timed out")); }, 20_000);
      this.socket.addEventListener("message", (event) => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === "auth_required") this.socket.send(JSON.stringify({ type: "auth", access_token: this.state.access_token }));
        else if (message.type === "auth_ok") { clearTimeout(timeout); resolve(); }
        else if (message.type === "auth_invalid") { clearTimeout(timeout); reject(new Error("HA WebSocket authentication failed")); }
        else if (message.type === "result") {
          const pending = this.pending.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pending.delete(message.id);
            if (message.success) pending.resolve(message.result);
            else pending.reject(new Error(`HA command failed: ${message.error?.code || "unknown"}`));
          }
        } else if (message.type === "event") this.events.get(message.id)?.(message.event);
      });
      this.socket.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("HA WebSocket connection failed")); });
      this.socket.addEventListener("close", () => {
        for (const pending of this.pending.values()) {
          clearTimeout(pending.timeout);
          pending.reject(new Error("HA WebSocket disconnected"));
        }
        this.pending.clear();
      });
    });
    return this;
  }

  call(message, timeoutMs = 30_000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`HA command timed out: ${message.type}`)); }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      this.socket.send(JSON.stringify({ ...message, id }));
    });
  }

  async subscribe(eventType, callback) {
    const id = this.nextId;
    this.events.set(id, callback);
    try { await this.call({ type: "subscribe_events", event_type: eventType }); }
    catch (error) { this.events.delete(id); throw error; }
    return async () => { this.events.delete(id); await this.call({ type: "unsubscribe_events", subscription: id }); };
  }

  service(domain, service, service_data = {}) {
    return this.call({ type: "call_service", domain, service, service_data });
  }

  close() { this.socket?.close(); }
}

export async function connect(state = readState()) { return new HaConnection(state).connect(); }

export async function login(page, state = readState()) {
  await page.goto(`${state.base_url}/velair`, { waitUntil: "domcontentloaded" });
  const panel = page.locator("velair-sidebar-panel");
  const username = page.locator('input[name="username"], input[autocomplete="username"]');
  await expect(panel.or(username)).toBeVisible({ timeout: 60_000 });
  if (await username.isVisible()) {
    await username.fill(state.username);
    await page.locator('input[name="password"], input[type="password"]').fill(state.password);
    await page.getByRole("button", { name: /log in|sign in|next/i }).click();
  }
  await expect(panel).toBeVisible({ timeout: 60_000 });
  await expect(panel.locator("velair-panel-card")).toBeVisible();
}

export async function openPanel(page, route = "") {
  await page.goto(`/velair${route}`, { waitUntil: "domcontentloaded" });
  const card = page.locator("velair-sidebar-panel velair-panel-card");
  await expect(card).toBeVisible({ timeout: 45_000 });
  await expect(card.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  return card;
}

export async function openSchedule(page, entityId, weekday = "monday") {
  const card = await openPanel(page, `/schedules/default?entity_id=${encodeURIComponent(entityId)}&weekday=${weekday}`);
  await expect(card.locator(".schedule .editable-block").first()).toBeVisible();
  await expect(card.locator(`.day-tab[data-weekday="${weekday}"]`)).toHaveAttribute("aria-pressed", "true");
  return card;
}

export async function assertFitsViewport(locator, page, { vertical = false } = {}) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, "critical surface has a layout box").not.toBeNull();
  expect(box.x, "surface stays inside the left viewport edge").toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width, "surface stays inside the right viewport edge").toBeLessThanOrEqual(viewport.width + 1);
  if (vertical) expect(viewportContains(box, viewport), "dialog stays inside the complete viewport").toBe(true);
}

export async function screenshot(page, testInfo, name, locator = page.locator("velair-sidebar-panel")) {
  const mode = process.env.VELAIR_QUALITY_VISUAL || "capture";
  if (!["capture", "compare", "off"].includes(mode)) throw new Error("Invalid VELAIR_QUALITY_VISUAL mode");
  if (mode === "off") return;
  await page.evaluate(async () => { await document.fonts.ready; });
  const options = {
    animations: "disabled",
    caret: "hide",
    // The visual case supplies a fixed browser clock. Keep the complete
    // timeline visible; capture and comparison use the same options.
  };
  const record = (status) => {
    const path = join(outputDir(), "visual-results.json");
    const results = JSON.parse(readFileSync(path, "utf8"));
    results[status]++;
    results.executions.push({ project: testInfo.project.name, name, status });
    writeJson(path, results);
  };
  try {
    if (mode === "compare") {
      const action = visualReferenceAction(existsSync(testInfo.snapshotPath(`${name}.png`)), testInfo.config.updateSnapshots);
      const exact = process.env.VELAIR_VISUAL_REPEATABILITY === "true";
      await expect(locator).toHaveScreenshot(`${name}.png`, { ...options, maxDiffPixelRatio: exact ? 0 : 0.001, threshold: exact ? 0 : 0.2 });
      record(action);
    } else {
      const destination = testInfo.outputPath(`${name}.png`);
      await locator.screenshot({ ...options, path: destination });
      await testInfo.attach(`${name} (unreviewed visual capture)`, { path: destination, contentType: "image/png" });
      testInfo.annotations.push({ type: "visual", description: "Capture only; no approved reference comparison" });
      record("captured");
    }
  } catch (error) { record("failed"); throw error; }
}

export async function theme(page, dark) {
  // Use HA's real frontend service rather than replacing Velair CSS.
  await page.evaluate((dark) => {
    const ha = document.querySelector("home-assistant");
    return ha?.hass?.callService("frontend", "set_theme", { name: "default", mode: dark ? "dark" : "light" });
  }, dark);
  await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function waitUntil(predicate, timeoutMs = 30_000) {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error("Condition did not become ready before the deadline");
}
