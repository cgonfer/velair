/** Documentation scenes in the actual HA sidebar and Lovelace dashboard. */
import { expect } from "./playwright.mjs";
import { openPanel, openSchedule } from "../../../frontend/e2e/helpers.mjs";
import { capturePublic } from "./capture-public.mjs";

async function expand(section, selector) {
  const toggle = section.locator(selector);
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

async function prepare(page, item, { scenario, version }) {
  if (item.view === "climate-card") {
    await page.goto(scenario.dashboard_path, { waitUntil: "domcontentloaded" });
    const target = page.locator("velair-card .climate-card-view");
    await expect(target).toBeVisible({ timeout: 45000 });
    await expect(target).toContainText(scenario.card_name);
    await expect(target).toHaveClass(/climate-action-cooling/);
    await expect(target.locator(".climate-card-current")).not.toHaveClass(/collapsed/);
    await expect(target.locator(".climate-card-current-readings")).toContainText("48%");
    await expect(target.locator(".climate-card-current-context")).toContainText("29.1");
    await expect(target.locator(".climate-card-comfort-metrics")).toContainText("Humidex");
    await expect(target.locator(".climate-card-window-list > span")).toHaveCount(2);
    await expect(target.locator(".climate-card-feature-panel.room-assist")).toContainText("Assisting");
    await expect(target.locator(".climate-card-feature-panel.preconditioning")).toContainText("Scheduled");
    return { target, framing: "real-lovelace-climate-card" };
  }
  const routes = { profiles: "/schedules/profiles", "active-setup": "/modes",
    "sensors-holding": "/sensors", "external-settings": "/settings",
    presets: "/templates/presets", external: "" };
  const card = item.view === "schedules"
    ? await openSchedule(page, scenario.schedule_entity, scenario.weekday)
    : await openPanel(page, item.view === "overview" ? "" : routes[item.view] ?? `/${item.view}`);
  await expect.poll(() => page.evaluate(() => window.velairFrontendVersion)).toBe(version);
  await expect.poll(() => page.evaluate(() => document.querySelector("home-assistant")?.hass?.language)).toBe("en");
  let target = page.locator("velair-sidebar-panel .panel-content");
  let end;
  if (item.view === "overview") {
    await expect(card.locator(".overview-zone-card").first()).toContainText("Comfort");
    target = card.locator(".overview-summary");
    end = [card.locator(".overview-zone-card").first(), card.locator(".overview-zone-card").nth(1)];
  } else if (item.view === "schedules") {
    target = card.locator(".schedule");
    await expect(target.locator(".editable-block")).toHaveCount(6);
  } else if (item.view === "profiles") {
    const profiles = card.locator("velair-profiles-view");
    await profiles.locator(".profile-item-main").filter({ hasText: scenario.profile_name }).click();
    await profiles.locator(".profile-workspace-zone-option").filter({ hasText: scenario.holding_name }).click();
    const monday = profiles.locator('.day-tab[data-weekday="monday"]');
    await monday.click();
    const editor = profiles.locator(".profile-editor");
    await expect(editor.getByRole("textbox", { name: "Profile name", exact: true })).toHaveValue(scenario.profile_name);
    await expect(editor.locator(".profile-workspace-zone")).toContainText(scenario.holding_name);
    await expect(editor.locator("#profile-description-input")).not.toHaveValue("");
    target = editor.locator(".profile-detail-heading");
    end = editor.locator(".profile-workspace-zone .draft-list");
    if (item.width > 900) {
      target = profiles.locator(".profile-library .template-list-wrap");
      end = [editor.locator(".profile-detail-heading"), end];
      await expect(target.locator(".profile-item-main")).toHaveCount(4);
    }
  } else if (item.view === "modes") {
    const modes = card.locator("velair-profiles-view");
    await modes.locator(".mode-item.custom .mode-item-main").filter({ hasText: scenario.mode_name }).click();
    target = modes.locator(".mode-library");
    await expect(target.locator(".mode-name-field input")).toHaveValue(scenario.mode_name);
  } else if (item.view === "active-setup") {
    const setup = card.locator(".active-setup-card");
    await setup.locator(".active-setup-menu > summary").click();
    target = setup;
    end = setup.locator(".active-setup-popover");
    await expect(end).toBeVisible();
    await expect(end).toContainText("Workday");
  } else if (item.view === "templates") {
    const library = card.locator(".templates-view .template-library");
    await library.locator(".template-item-main").filter({ hasText: "Family evening" }).click();
    target = library.locator(".template-library-layout");
    await expect(target.locator(".template-name-field input")).toHaveValue("Family evening");
    await target.locator(".timeline-scroll").evaluate(element => { element.scrollLeft = element.scrollWidth - element.clientWidth; });
  } else if (item.view === "room-groups") {
    const groups = card.locator("velair-room-groups-settings");
    await groups.locator(`[data-select-group="${scenario.room_group}"]`).click();
    const members = groups.locator('details[data-section="members"]');
    if (await members.getAttribute("open") === null) await members.locator("summary").click();
    target = groups.locator(".template-library-layout");
    await expect(target).toContainText(scenario.group_name);
    await expect(target.locator("[data-member]")).toHaveCount(2);
  } else if (item.view === "presets") {
    const library = card.locator("velair-preset-library");
    await library.locator(".template-item-main").filter({ hasText: scenario.preset_name }).click();
    target = library.locator(".preset-library");
    await expect(target.locator(".template-name-field input")).toHaveValue(scenario.preset_name);
    const usages = target.locator("details.preset-section").first();
    if (await usages.getAttribute("open") === null) await usages.locator("summary").click();
    await expect(usages).toContainText(scenario.profile_name);
    const controls = target.locator(".editable-block.preset-fields > label.full-width select");
    await expect(controls).toHaveCount(2);
    await expect.poll(async () => {
      const [action, mode] = await Promise.all([controls.nth(0).boundingBox(), controls.nth(1).boundingBox()]);
      return action && mode && action.width >= 160 && mode.width >= 160 && mode.y >= action.y + action.height;
    }).toBe(true);
  } else if (item.view === "supply-control") {
    const settings = card.locator("velair-shared-demand-settings");
    await settings.locator(`[data-select-supply="${scenario.supply_id}"]`).click();
    const live = settings.locator("velair-shared-demand-live");
    await live.locator("[data-live-trigger]").click();
    target = live.locator("dialog.live-dialog[open]");
    await expect(target).toContainText(scenario.supply_name);
    await expect(target.locator(".live-meta.is-live")).toBeVisible();
    await expect(target.locator("[data-live-zone]")).toHaveCount(2);
    await expect.poll(() => target.evaluate(dialog => dialog.scrollHeight - dialog.clientHeight)).toBeLessThanOrEqual(1);
  } else if (item.view === "planned-return") {
    target = card.locator("velair-planned-return .planned-return-status");
    await expect(target.locator(".return-timeline")).toBeVisible();
    await expect(target.locator(".departure-mode")).toContainText(scenario.planned_return_away);
    await expect(target.locator(".arrival-mode")).toContainText(scenario.planned_return_destination);
    await expect(target.locator(".return-context-status.state-preparing")).toBeVisible();
  } else if (["sensors", "sensors-holding"].includes(item.view)) {
    const name = item.view === "sensors" ? scenario.assist_name : scenario.holding_name;
    const zone = card.locator(".sensor-zone").filter({ hasText: name });
    await expand(zone, ".sensor-zone-toggle");
    target = zone.locator(".sensor-runtime-section");
    await expect(target.locator(".sensor-status-pill")).toContainText(item.view === "sensors" ? "Assisting" : "Holding");
    await expect(target.locator(".sensor-status-card")).toBeVisible();
  } else if (item.view === "comfort") {
    target = card.locator(".comfort-zone").filter({ hasText: scenario.comfort_name });
    await expand(target, ".comfort-zone-toggle");
    await expect(target.locator(".comfort-zone-content")).toBeVisible();
    await expect(target.locator(".comfort-map-zone.shaped.guided")).toBeVisible();
    await expect(target.locator(".comfort-co2-scale")).toContainText("642");
    await expect(target.locator(".comfort-derived-visual-section")).toContainText("Humidex");
  } else if (item.view === "preconditioning") {
    const zone = card.locator(".preconditioning-zone").filter({ hasText: scenario.preconditioning_name });
    await expand(zone, ".preconditioning-zone-toggle");
    target = zone.locator(".preconditioning-learning .preconditioning-direction.heat");
    await expect(target).toContainText("Learning ready");
    await expect(target.locator(".preconditioning-prediction:not(.empty)")).toBeVisible();
  } else if (item.view === "diagnostics") {
    const diagnostics = card.locator(".diagnostics-view");
    const failed = item.phase === "diagnostics-errors";
    await diagnostics.locator(".diagnostics-unit-option").filter({ hasText: failed ? "Kitchen" : scenario.assist_name }).click();
    target = diagnostics.locator(".diagnostics-summary");
    end = diagnostics.locator(".diagnostics-master-detail");
    await expect(diagnostics.locator(".diagnostics-detail-panel")).toBeVisible();
    if (failed) await expect(end).toContainText(/Unavailable/i);
    else await expect(target).toHaveClass(/status-ok/);
  } else if (item.view === "settings") {
    target = card.locator(".settings-view > :first-child");
    end = card.locator(".settings-zone-order");
  } else if (item.view === "external-settings") {
    target = card.locator(".external-systems-settings");
    await expect(target).toContainText(scenario.external_name);
    await expect(target.locator(".external-system-zone-select select").first()).toBeVisible();
  } else if (item.view === "external") {
    target = card.locator(".overview-zone-card").filter({ hasText: scenario.external_name });
    const status = item.phase === "external-publishing" ? /External.*Publishing/ : item.phase === "external-error" ? /External.*Failed/ : /External.*Accepted/;
    await expect(target.getByRole(item.phase === "external-error" ? "alert" : "region", { name: status })).toBeVisible();
  }
  await expect(target).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return { target, end, framing: `documentation-${item.view}` };
}

await capturePublic(prepare);
