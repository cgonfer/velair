import { test, expect } from "@playwright/test";
import { connect, openSchedule, readState } from "./helpers.mjs";
import { setDay } from "./control-helpers.mjs";

test("a rejected stale schedule save keeps its draft and can be recovered", {
  annotation: [
    { type: "velair-action", description: "schedule.save-recovery" },
    { type: "velair-variant", description: "default" },
  ],
}, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Revision-conflict behavior is independent of viewport size");
  const state = readState();
  const entity = state.climate_entities[0];
  // This API socket is independent of the page's connection, as with another editor.
  const api = await connect(state);
  let original;
  const changedDays = new Set();
  const baseline = [{ start: "00:00", action: "set_temperature", hvac_mode: "heat", temperature: 21 }];
  const draftValue = "22.5";
  try {
    original = (await api.call({ type: "velair/get_schedule" })).zones[entity];
    changedDays.add("monday");
    await setDay(api, entity, "monday", baseline);
    const card = await openSchedule(page, entity);
    const input = card.locator(".editable-block input.temperature-input").first();
    const save = card.locator(".schedule-save-footer button");
    await test.step("save-recovery.prepare-draft", async () => {
      await input.click();
      await input.fill(draftValue);
      await input.press("Tab");
      await expect(save).toBeEnabled();
    });
    const beforeConflict = await api.call({ type: "velair/get_schedule" });
    let concurrent;
    await test.step("save-recovery.concurrent-change", async () => {
      changedDays.add("tuesday");
      await setDay(api, entity, "tuesday", [
        { start: "00:00", action: "set_temperature", hvac_mode: "heat", temperature: 24 },
      ]);
      concurrent = await api.call({ type: "velair/get_schedule" });
      expect(concurrent.configuration_revision).toBeGreaterThan(beforeConflict.configuration_revision);
      await expect(input).toHaveValue(draftValue);
    });
    await test.step("save-recovery.reject-without-data-loss", async () => {
      await save.click();
      const error = card.locator(".notice.error");
      await expect(error).toBeVisible();
      await expect(error).toContainText("Configuration changed");
      await expect(card.locator(".notice.success")).toHaveCount(0);
      await expect(input).toHaveValue(draftValue);
      await expect(save).toBeEnabled();
      const after = await api.call({ type: "velair/get_schedule" });
      expect(after.configuration_revision).toBe(concurrent.configuration_revision);
      expect(after.zones[entity].schedule).toEqual(concurrent.zones[entity].schedule);
    });
    await test.step("save-recovery.reopen-and-save", async () => {
      // Explicitly accept discarding the stale edit, then edit against current data.
      page.once("dialog", (dialog) => dialog.accept());
      await card.locator('.day-tab[data-weekday="tuesday"]').click();
      await expect(card.locator('.day-tab[data-weekday="tuesday"]')).toHaveAttribute("aria-pressed", "true");
      await card.locator('.day-tab[data-weekday="monday"]').click();
      await expect(input).toHaveValue("21");
      await input.click();
      await input.fill(draftValue);
      await input.press("Tab");
      await save.click();
      await expect(card.locator(".notice.success")).toBeVisible();
      await expect(card.locator(".notice.error")).toHaveCount(0);
      await expect(save).toBeDisabled();
      await expect.poll(async () => (await api.call({ type: "velair/get_schedule" })).zones[entity].schedule.monday[0].temperature).toBe(22.5);
      await openSchedule(page, entity);
      await expect(input).toHaveValue(draftValue);
      const after = await api.call({ type: "velair/get_schedule" });
      expect(after.zones[entity].schedule.tuesday).toEqual(concurrent.zones[entity].schedule.tuesday);
    });
  } finally {
    const errors = [];
    try {
      for (const weekday of changedDays) {
        try {
          await setDay(api, entity, weekday, original.schedule[weekday] ?? [], original.template_links?.[weekday]);
        } catch (error) {
          errors.push(error);
        }
      }
    } finally {
      api.close();
    }
    if (errors.length) throw new AggregateError(errors, "Save recovery test could not restore its changed days");
  }
});
