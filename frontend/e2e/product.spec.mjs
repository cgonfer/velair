import { test, expect } from "@playwright/test";
import {
  assertFitsViewport, connect, openPanel, openSchedule,
  readState,
} from "./helpers.mjs";
import { setDay, setWeek } from "./control-helpers.mjs";

const state = readState();
const action = (id, variant = "default") => ({ annotation: [
  { type: "velair-action", description: id }, { type: "velair-variant", description: variant },
] });
const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

async function useControl(locator, testInfo) {
  await locator.scrollIntoViewIfNeeded();
  if (testInfo.project.use.hasTouch) await locator.tap();
  else await locator.click();
}

async function restoreAll(operations, message) {
  const errors = [];
  for (const operation of operations) {
    try { await operation(); } catch (error) { errors.push(error); }
  }
  if (errors.length) throw new AggregateError(errors, message);
}

async function restoreSelection(api, selection) {
  const base = selection.base_mode_id
    ? { type: "velair/select_mode", selection: { kind: "custom", key: selection.base_mode_id } }
    : { type: "velair/activate_profiles", profile_ids: selection.base_profile_ids || [] };
  await restoreAll([
    () => api.call(base),
    ...Object.entries(selection.zone_profile_overrides || {}).map(([entity_id, profile_id]) =>
      () => api.call({ type: "velair/set_zone_profile", entity_id, profile_id })),
  ], "Could not fully restore the previous profile selection");
}

test("panel navigation and critical surfaces fit the viewport", action("panel.navigate"), async ({ page }) => {
  await test.step("panel.open-pages", async () => {
    for (const route of ["", "/schedules/default", "/modes", "/settings"]) {
      const card = await openPanel(page, route);
      await assertFitsViewport(card, page);
      await expect(card.locator(".notice.error")).toHaveCount(0);
    }
  });
});

for (const [index, kind] of ["heat", "cool", "range"].entries()) {
  test(`${kind} schedule controls remain usable and saved fields persist`, action("schedule.edit-save", { heat: "heating-usable", cool: "cooling-usable", range: "range-usable" }[kind]), async ({ page }, testInfo) => {
    const api = await connect(state);
    const entity = state.climate_entities[index];
    const before = await api.call({ type: "velair/get_schedule" });
    const original = before.zones[entity].schedule.monday || [];
    const originalLink = before.zones[entity].template_links?.monday;
    const block = kind === "range"
      ? { start: "00:00", action: "set_temperature", hvac_mode: "heat_cool", target_temp_low: 19, target_temp_high: 25 }
      : { start: "00:00", action: "set_temperature", hvac_mode: kind, temperature: 21 };
    try {
      await setDay(api, entity, "monday", [block, { ...block, start: "23:59" }]);
      const expected = structuredClone((await api.call({ type: "velair/get_schedule" })).zones[entity].schedule.monday);
      expected[0][kind === "range" ? "target_temp_low" : "temperature"] = kind === "range" ? 19.5 : 21.5;
      const card = await test.step("schedule.open", () => openSchedule(page, entity));
      const target = card.locator(".editable-block input.temperature-input").first();
      await test.step("schedule.change-temperature", async () => {
        await useControl(target, testInfo);
        await assertFitsViewport(target, page, { vertical: true });
        await target.fill(kind === "range" ? "19.5" : "21.5");
        await target.press("Tab");
      });
      await test.step("schedule.help-return", async () => {
        await useControl(card.locator(".documentation-help-button").first(), testInfo);
        const dialog = card.locator("dialog.documentation-dialog[open]");
        await expect(dialog).toBeVisible();
        await assertFitsViewport(dialog, page, { vertical: true });
        await useControl(dialog.getByRole("button", { name: "Close", exact: true }), testInfo);
        await expect(dialog).toHaveCount(0);
        await useControl(target, testInfo);
        await expect(target).toBeFocused();
        await expect(target).toHaveValue(kind === "range" ? "19.5" : "21.5");
      });
      await test.step("schedule.save", async () => {
        const save = card.locator(".schedule-save-footer button");
        await expect(save).toBeEnabled();
        await save.scrollIntoViewIfNeeded();
        await assertFitsViewport(save, page, { vertical: true });
        await useControl(save, testInfo);
        await expect.poll(async () => {
          const result = await api.call({ type: "velair/get_schedule" });
          return result.zones[entity].schedule.monday;
        }).toEqual(expected);
      });
      await test.step("schedule.reload", async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
        // Re-select persisted Monday; the panel consumes transient query parameters.
        await openSchedule(page, entity);
        await expect(page.locator(".editable-block input.temperature-input").first()).toHaveValue(kind === "range" ? "19.5" : "21.5");
        expect((await api.call({ type: "velair/get_schedule" })).zones[entity].schedule.monday).toEqual(expected);
        if (kind === "range") {
          await expect(page.locator(".editable-block").first().locator("input.temperature-input").nth(1)).toHaveValue("25");
        }
      });
    } finally {
      try { await setDay(api, entity, "monday", original, originalLink); }
      finally { api.close(); }
    }
  });
}

test("a profile schedule applies to a climate and returns to the base schedule", action("profile.create-activate", "effective"), async ({ page }, testInfo) => {
  const api = await connect(state);
  const before = await api.call({ type: "velair/get_schedule" });
  const entity = state.climate_entities[0];
  const previousSelection = structuredClone(before.profile_selection || { base_profile_ids: [] });
  const originalWeek = structuredClone(before.zones[entity].schedule);
  const originalLinks = structuredClone(before.zones[entity].template_links || {});
  const config = await api.call({ type: "get_config" });
  const entityName = (await api.call({ type: "get_states" })).find(item => item.entity_id === entity).attributes.friendly_name;
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: config.time_zone, weekday: "long" }).format(new Date()).toLowerCase();
  const baseline = { start: "00:00", action: "set_temperature", hvac_mode: "heat", temperature: 19 };
  const profileTarget = 23;
  let created;
  try {
    await test.step("profile.prepare", async () => {
      await api.call({ type: "velair/activate_profiles", profile_ids: [] });
      await setWeek(api, entity, [baseline]);
      await api.call({ type: "velair/resume_automatic_control", entity_id: entity });
      await api.service("velair", "apply_schedule", { entity_id: entity });
      await expect.poll(async () => (await api.call({ type: "get_states" })).find(item => item.entity_id === entity)?.attributes.temperature).toBe(19);
    });
    const profiles = await test.step("profile.create", async () => {
      const card = await openPanel(page, "/schedules/profiles");
      const profiles = card.locator("velair-profiles-view");
      await profiles.locator('button[title="New profile"]').click();
      const previousKeys = new Set(before.profiles.map(profile => profile.key));
      await expect.poll(async () => {
        created = (await api.call({ type: "velair/get_schedule" })).profiles.find(profile => !previousKeys.has(profile.key));
        return Boolean(created);
      }).toBe(true);
      const name = profiles.getByRole("textbox", { name: "Profile name", exact: true });
      await expect(name).toHaveValue(created.name);
      await name.fill("Quality browser profile");
      await useControl(profiles.locator('.profile-group-save-actions button[title="Save"]'), testInfo);
      await expect.poll(async () => {
        const response = await api.call({ type: "velair/get_schedule" });
        return response.profiles.find(profile => profile.key === created.key)?.name;
      }).toBe("Quality browser profile");
      return profiles;
    });
    await test.step("profile.edit-schedule", async () => {
      await useControl(profiles.locator(".profile-workspace-zone-option").filter({ hasText: entityName }), testInfo);
      await expect(profiles.locator(".profile-workspace-zone .profile-zone-identity")).toContainText(entity);
      await profiles.locator(".profile-workspace-zone .profile-zone-actions select").selectOption("schedule");
      await useControl(profiles.locator(`.day-tab[data-weekday="${weekday}"]`), testInfo);
      await useControl(profiles.locator(".profile-block-list .draft-add-button"), testInfo);
      const block = profiles.locator(".editable-block").first();
      await block.locator('input[type="time"]').fill("00:00");
      await block.locator("select").first().selectOption("heat");
      const input = block.locator("input.temperature-input").first();
      await useControl(input, testInfo);
      await input.fill(String(profileTarget));
      await input.press("Tab");
      await useControl(profiles.locator(".profile-workspace-save button"), testInfo);
      await expect.poll(async () => (await api.call({ type: "velair/get_schedule" })).profiles.find(profile => profile.key === created.key)?.zones[entity]?.schedule[weekday]?.[0]?.temperature).toBe(profileTarget);
    });
    await test.step("profile.activate", async () => {
      await useControl(profiles.getByRole("button", { name: "Set as base: Quality browser profile", exact: true }), testInfo);
      await expect.poll(async () => (await api.call({ type: "velair/get_schedule" })).profile_selection?.base_profile_ids).toContain(created.key);
      await expect.poll(async () => (await api.call({ type: "velair/get_schedule" })).effective_zone_profiles[entity]).toBe(created.key);
      await expect.poll(async () => {
        const climate = (await api.call({ type: "get_states" })).find(item => item.entity_id === entity);
        return { mode: climate?.state, temperature: climate?.attributes.temperature };
      }).toEqual({ mode: "heat", temperature: profileTarget });
    });
    await test.step("profile.reopen", async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      const reopened = page.locator("velair-profiles-view");
      await useControl(reopened.locator(".profile-item-main").filter({ hasText: "Quality browser profile" }), testInfo);
      await useControl(reopened.locator(".profile-workspace-zone-option").filter({ hasText: entityName }), testInfo);
      await useControl(reopened.locator(`.day-tab[data-weekday="${weekday}"]`), testInfo);
      await expect(reopened.locator(".editable-block input.temperature-input").first()).toHaveValue(String(profileTarget));
      const saved = await api.call({ type: "velair/get_schedule" });
      expect(saved.profile_selection.base_profile_ids).toContain(created.key);
      expect(saved.effective_zone_profiles[entity]).toBe(created.key);
    });
    await test.step("profile.restore-base", async () => {
      // The Profiles workspace edits definitions; the public Modes page owns
      // the active-setup selector and its Default action.
      const modes = (await openPanel(page, "/modes")).locator("velair-profiles-view");
      await useControl(modes.locator(".active-setup-menu > summary"), testInfo);
      await useControl(modes.locator('[data-mode-selection="default"]'), testInfo);
      await expect.poll(async () => (await api.call({ type: "velair/get_schedule" })).profile_selection.base_profile_ids).toEqual([]);
      await expect.poll(async () => {
        const climate = (await api.call({ type: "get_states" })).find(item => item.entity_id === entity);
        return { mode: climate?.state, temperature: climate?.attributes.temperature };
      }).toEqual({ mode: "heat", temperature: 19 });
    });
  } finally {
    try {
      await restoreAll([
        ...weekdays.map(day => () => setDay(api, entity, day, originalWeek[day] || [], originalLinks[day])),
        () => restoreSelection(api, previousSelection),
        ...(created ? [() => api.call({ type: "velair/delete_profile", key: created.key })] : []),
      ], "Could not fully restore the profile journey's original state");
    } finally { api.close(); }
  }
});

test("documentation dialog opens, fits and can be dismissed", action("help.open-close"), async ({ page }) => {
  const card = await openPanel(page, "/schedules/default");
  const dialog = await test.step("help.open", async () => {
    await card.locator(".documentation-help-button").first().click();
    const dialog = card.locator("dialog.documentation-dialog[open]");
    await expect(dialog).toBeVisible();
    await assertFitsViewport(dialog, page, { vertical: true });
    return dialog;
  });
  await test.step("help.close", async () => {
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
});

test("committed frontend registers and controls a real Lovelace climate card", action("card.manual-temperature"), async ({ page }) => {
  const api = await connect(state);
  let dashboard;
  try {
    // A restart intentionally restores the virtual device off. Establish this
    // scenario's state rather than depending on earlier tests.
    await api.service("velair_test", "control", { entity_id: state.climate_entities[0], available: true, hvac_mode: "heat", temperature: 21 });
    dashboard = await api.call({ type: "lovelace/dashboards/create", url_path: "quality-dashboard", title: "Velair quality", mode: "storage", show_in_sidebar: false, require_admin: true });
    await api.call({ type: "lovelace/config/save", url_path: "quality-dashboard", config: { views: [{ title: "Velair quality", path: "quality", cards: [{
      type: "custom:velair-card", title: "Quality climate", view: "climate", selected_entity: state.climate_entities[0],
      entities: [state.climate_entities[0]], climate_show_controls: true,
    }] }] } });
    const card = await test.step("card.open", async () => {
      await page.goto("/quality-dashboard/quality", { waitUntil: "domcontentloaded" });
      const card = page.locator("velair-card");
      await expect(card).toBeVisible({ timeout: 45_000 });
      await expect(card.locator(".climate-card-view")).toBeVisible();
      await assertFitsViewport(card, page);
      return card;
    });
    await test.step("card.manual", () => card.getByRole("button", { name: "Manual", exact: true }).click());
    await test.step("card.change-temperature", async () => {
      const increase = card.getByRole("button", { name: "Increase target temperature", exact: true });
      await expect(increase).toBeEnabled();
      const states = await api.call({ type: "get_states" });
      const previousTarget = states.find((item) => item.entity_id === state.climate_entities[0]).attributes.temperature;
      await increase.click();
      await expect.poll(async () => (await api.call({ type: "get_states" })).find((item) => item.entity_id === state.climate_entities[0]).attributes.temperature).toBeGreaterThan(previousTarget);
      await expect(card.locator(".notice.error")).toHaveCount(0);
    });
  } finally {
    await api.call({ type: "velair/resume_automatic_control", entity_id: state.climate_entities[0] });
    if (dashboard) await api.call({ type: "lovelace/dashboards/delete", dashboard_id: dashboard.id });
    api.close();
  }
});

test("an unavailable climate does not prevent editing another zone", action("schedule.other-zone-unavailable"), async ({ page }) => {
  const api = await connect(state);
  const entity = state.climate_entities[0];
  const original = (await api.call({ type: "velair/get_schedule" })).zones[entity].schedule.monday;
  try {
    await test.step("offline.prepare", () => api.service("velair_test", "control", { entity_id: state.climate_entities[1], available: false }));
    await test.step("offline.edit-save", async () => {
      const card = await openSchedule(page, entity);
      const input = card.locator(".editable-block input.temperature-input").first();
      await expect(input).toBeEnabled();
      await input.fill("21.5");
      await input.press("Tab");
      await card.locator(".schedule-save-footer button").click();
      await expect.poll(async () => (await api.call({ type: "velair/get_schedule" })).zones[entity].schedule.monday[0].temperature).toBe(21.5);
    });
  } finally {
    await api.service("velair_test", "control", { entity_id: state.climate_entities[1], available: true });
    await expect.poll(async () => (await api.call({ type: "get_states" })).find((item) => item.entity_id === state.climate_entities[1]).state).not.toBe("unavailable");
    await api.call({ type: "velair/set_daily_schedule", entity_id: entity, weekday: "monday", blocks: original });
    api.close();
  }
});
