/** Website-specific native UI preparation; runtime is shared with documentation. */
import { expect } from "./playwright.mjs";
import { openPanel, openSchedule } from "../../../frontend/e2e/helpers.mjs";
import { capturePublic } from "./capture-public.mjs";

async function prepare(page, item, { scenario, version }) {
  const card = item.view === "schedules"
    ? await openSchedule(page, scenario.schedule_entity, scenario.weekday ?? "monday")
    : await openPanel(page, item.view === "overview" || item.view === "external" ? "" : item.view === "presets" ? "/templates/presets" : `/${item.view}`);
  await expect.poll(() => page.evaluate(() => window.velairFrontendVersion)).toBe(version);
  await expect.poll(() => page.evaluate(() => document.querySelector("home-assistant")?.hass?.language)).toBe("en");
  let target = page.locator("velair-sidebar-panel .panel-content");
  let end;
  let framing = "complete-panel";
  if (item.view === "overview") {
    await expect(card.locator(".overview-zone-card").first()).toContainText("Comfort");
    framing = "full-overview";
    if (item.name === "overview-desktop.png") {
      target = card.locator(".overview-timeline-panel");
      end = [card.locator(".overview-zone-card").first(), card.locator(".overview-zone-card").nth(1)];
      framing = "timeline-and-comfort";
    }
  }
  if (item.view === "schedules") {
    target = card.locator(".schedule .timeline-panel");
    end = card.locator(".schedule .draft-list");
    framing = "timeline-and-blocks";
  }
  if (item.view === "modes") {
    await card.locator("velair-profiles-view .mode-item.custom .mode-item-main").filter({ hasText: scenario.mode_name ?? "Home" }).click();
    target = card.locator("velair-profiles-view .mode-library");
    await expect(target.locator(".mode-name-field input")).toHaveValue(scenario.mode_name ?? "Home");
  }
  if (["sensors", "preconditioning"].includes(item.view)) {
    const assist = item.view === "sensors";
    target = card.locator(assist ? ".sensor-zone" : ".preconditioning-zone").filter({ hasText: assist ? scenario.assist_name : scenario.preconditioning_name });
    const toggle = target.locator(assist ? ".sensor-zone-toggle" : ".preconditioning-zone-toggle");
    if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    if (assist) {
      await expect(target.locator(".sensor-status-card")).toBeVisible();
      await expect(target.locator(".sensor-status-pill")).toContainText("Assisting");
      target = target.locator(".sensor-runtime-section");
      framing = "live-assistance";
    } else {
      await expect(target.locator(".preconditioning-learning")).toContainText("Learning ready");
      await expect(target.locator(".preconditioning-prediction:not(.empty)")).toBeVisible();
      target = target.locator(".preconditioning-learning .preconditioning-direction.heat");
      framing = "learning-and-prediction";
    }
  }
  if (item.view === "external") {
    target = card.locator(".overview-zone-card").filter({ hasText: scenario.external_name });
    await expect(target.getByRole("region", { name: /External.*Accepted/ })).toBeVisible();
  }
  if (item.view === "room-groups") {
    const groups = card.locator("velair-room-groups-settings");
    await groups.locator(`[data-select-group="${scenario.room_group}"]`).click();
    const members = groups.locator('details[data-section="members"]');
    if (await members.getAttribute("open") === null) await members.locator("summary").click();
    target = groups.locator(".template-library-layout");
    await expect(target).toContainText(scenario.group_name);
    await expect(target.locator("[data-member]")).toHaveCount(2);
  }
  if (item.view === "presets") {
    const library = card.locator("velair-preset-library");
    await library.locator(".template-item-main").filter({ hasText: scenario.preset_name }).click();
    target = library.locator(".preset-library");
    await expect(target.locator(".template-name-field input")).toHaveValue(scenario.preset_name);
    const usages = target.locator("details.preset-section").first();
    if (await usages.getAttribute("open") === null) await usages.locator("summary").click();
  }
  if (item.view === "supply-control") {
    const settings = card.locator("velair-shared-demand-settings");
    await settings.locator(`[data-select-supply="${scenario.supply_id}"]`).click();
    const live = settings.locator("velair-shared-demand-live");
    await live.locator("[data-live-trigger]").click();
    target = live.locator("dialog.live-dialog[open]");
    await expect(target).toContainText(scenario.supply_name);
    await expect(target.locator("[data-live-zone]").first()).toBeVisible();
  }
  if (item.view === "planned-return") {
    target = card.locator("velair-planned-return .planned-return-status");
    framing = "arrival-status";
    await expect(target.locator(".return-timeline")).toBeVisible();
    await expect(target).toContainText("Return");
  }
  await expect(target).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return { target, end, framing };
}

await capturePublic(prepare);
