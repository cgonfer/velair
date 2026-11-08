import { test, expect } from "@playwright/test";
import { assertFitsViewport, connect, openSchedule, readState } from "./helpers.mjs";
import { duplicateRequestCount } from "./measurements.mjs";

test("interaction guard rejects a deliberate overlay over a real editor control", async ({ page }) => {
  const card = await openSchedule(page, readState().climate_entities[0]);
  const target = card.locator(".editable-block input.temperature-input").first();
  await target.scrollIntoViewIfNeeded();
  const bounds = await target.boundingBox();
  await page.evaluate((box) => {
    const overlay = document.createElement("div");
    overlay.id = "quality-calibration-overlay";
    Object.assign(overlay.style, { position: "fixed", zIndex: "2147483647", inset: "0", pointerEvents: "auto", background: "red" });
    document.body.append(overlay);
  }, bounds);
  try {
    await expect(target.click({ trial: true, timeout: 1500 })).rejects.toThrow(/intercepts pointer events|Timeout/);
  } finally { await page.locator("#quality-calibration-overlay").evaluate((element) => element.remove()); }
  await target.click();
  await expect(target).toBeFocused();
});

test("dialog guard rejects deliberate real dialog overflow", async ({ page }) => {
  const card = await openSchedule(page, readState().climate_entities[0]);
  await card.locator(".documentation-help-button").first().click();
  const dialog = card.locator("dialog.documentation-dialog[open]");
  await assertFitsViewport(dialog, page, { vertical: true });
  await dialog.evaluate((element) => {
    element.style.setProperty("width", "200vw", "important");
    element.style.setProperty("max-width", "none", "important");
  });
  await expect(assertFitsViewport(dialog, page, { vertical: true })).rejects.toThrow();
  await dialog.evaluate((element) => { element.style.removeProperty("width"); element.style.removeProperty("max-width"); });
  await assertFitsViewport(dialog, page, { vertical: true });
});

test("readback guard rejects a deliberately lost real schedule save", async ({ page }) => {
  const state = readState();
  const api = await connect(state);
  const entity = state.climate_entities[0];
  const original = (await api.call({ type: "velair/get_schedule" })).zones[entity].schedule.monday;
  try {
    const card = await openSchedule(page, entity);
    const input = card.locator(".editable-block input.temperature-input").first();
    await input.fill("22.5");
    await input.press("Tab");
    await card.locator(".schedule-save-footer button").click();
    await expect.poll(async () => (await api.call({ type: "velair/get_schedule" })).zones[entity].schedule.monday[0].temperature).toBe(22.5);
    await api.call({ type: "velair/set_daily_schedule", entity_id: entity, weekday: "monday", blocks: original });
    await openSchedule(page, entity);
    await expect(expect(page.locator(".editable-block input.temperature-input").first()).toHaveValue("22.5", { timeout: 500 })).rejects.toThrow();
  } finally {
    await api.call({ type: "velair/set_daily_schedule", entity_id: entity, weekday: "monday", blocks: original });
    api.close();
  }
});

test("request counter observes deliberate duplicate real WebSocket requests", async ({ page }) => {
  const requests = [];
  page.on("websocket", (socket) => socket.on("framesent", ({ payload }) => {
    try { if (JSON.parse(String(payload)).type === "velair/get_schedule") requests.push("velair/get_schedule"); } catch { /* Ignore other frames, including auth. */ }
  }));
  await openSchedule(page, readState().climate_entities[0]);
  requests.length = 0;
  await page.evaluate(async () => {
    const hass = document.querySelector("home-assistant").hass;
    await Promise.all([1, 2].map(() => hass.connection.sendMessagePromise({ type: "velair/get_schedule" })));
  });
  await expect.poll(() => duplicateRequestCount(requests)).toBeGreaterThanOrEqual(1);
});

test("roundtrip measurements observe deliberately delayed climate delivery", async () => {
  const state = readState();
  const api = await connect(state);
  const entity = state.climate_entities[0];
  try {
    await api.service("velair_test", "control", { entity_id: entity, delay_ms: 400 });
    const started = performance.now();
    await api.service("climate", "set_temperature", { entity_id: entity, temperature: 21.5 });
    expect(performance.now() - started).toBeGreaterThanOrEqual(350);
  } finally {
    await api.service("velair_test", "control", { entity_id: entity, delay_ms: 0 });
    api.close();
  }
});
