import { test, expect } from "@playwright/test";
import { assertFitsViewport, connect, openPanel, openSchedule, readState, screenshot, theme } from "./helpers.mjs";
import { installVisualFixture, visualFixture, VISUAL_TIME } from "./visual-fixture.mjs";

async function assertHorizontalTimeline(locator) {
  await expect(locator).toHaveAttribute("tabindex", "0");
  await locator.scrollIntoViewIfNeeded();
  await locator.focus();
  // Ignore fractional layout/border overflow on an otherwise complete track.
  const scrollable = await locator.evaluate(element => element.scrollWidth > element.clientWidth + 8);
  if (scrollable) {
    await locator.evaluate(element => { element.scrollLeft = 0; });
    await locator.press("ArrowRight");
    await expect.poll(() => locator.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    // Native horizontal traversal must also expose the end of the day.
    await locator.evaluate(element => { element.scrollLeft = element.scrollWidth; });
    await expect.poll(() => locator.evaluate(element => element.scrollLeft + element.clientWidth >= element.scrollWidth - 1)).toBe(true);
  }
  await locator.evaluate(element => { element.scrollLeft = 0; });
  await locator.blur();
}

async function assertEventDetails(card, page) {
  for (const detail of await card.locator(".effective-event .event-target, .effective-event .event-mode, .effective-event .event-time").all()) {
    await assertFitsViewport(detail, page);
  }
  for (const detail of await card.locator(".overview-zone-activity-detail").all()) {
    expect(await detail.evaluate(element => element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight), "next-event summary is readable without clipping").toBe(true);
  }
}

test("selected screens have explicit visual evidence in both themes", { annotation: [
  { type: "velair-action", description: "appearance.capture" }, { type: "velair-variant", description: "default" },
] }, async ({ page }, testInfo) => {
  const api = await connect();
  let fixture;
  try { fixture = visualFixture(await api.call({ type: "velair/get_schedule" }), readState().climate_entities); }
  finally { api.close(); }
  await installVisualFixture(page, fixture);
  testInfo.annotations.push({ type: "visual-scope", description: "Deterministic rendering fixture v1; functional journeys use real HA runtime responses" });
  for (const dark of [false, true]) {
    const suffix = dark ? "dark" : "light";
    const overview = await openPanel(page);
    await theme(page, dark);
    await expect.poll(() => page.evaluate(() => Date.now())).toBe(Date.parse(VISUAL_TIME));
    await expect(overview.locator(".effective-event")).toHaveCount(3);
    await expect(overview.locator(".overview-zone-card")).toHaveCount(3);
    await expect(overview.locator(".effective-event .event-target").last()).toContainText("20–24");
    await assertEventDetails(overview, page);
    if (!dark && testInfo.project.name === "mobile") {
      const viewport = page.viewportSize();
      await page.setViewportSize({ width: 320, height: viewport.height });
      await assertEventDetails(overview, page);
      await assertFitsViewport(overview, page);
      await page.setViewportSize(viewport);
    }
    await overview.locator(".overview-timeline-scroll").evaluateAll(elements => elements.forEach(element => { element.scrollLeft = 0; }));
    await screenshot(page, testInfo, `overview-${suffix}`);
    // Exercise native scrolling after the reference, so keyboard smooth-scroll
    // frames cannot alter the deliberately fixed screenshot position.
    await assertHorizontalTimeline(overview.locator(".overview-timeline-scroll"));
    const card = await openSchedule(page, readState().climate_entities[0]);
    await expect(card.locator(".editable-block")).toHaveCount(6);
    await expect(card.locator('.editable-block input[type="time"]').first()).toHaveValue("00:00");
    if (page.viewportSize().width <= 600) {
      const input = card.locator('.editable-block input[type="time"]').first();
      expect((await input.boundingBox()).width, "native time input has room for hours, minutes and AM/PM").toBeGreaterThanOrEqual(130);
    }
    await card.locator(".timeline-scroll").evaluateAll(elements => elements.forEach(element => { element.scrollLeft = 0; }));
    await screenshot(page, testInfo, `editor-${suffix}`);
    await assertHorizontalTimeline(card.locator(".timeline-scroll"));
    await card.locator(".documentation-help-button").first().click();
    const dialog = card.locator("dialog.documentation-dialog[open]");
    await expect(dialog).toBeVisible();
    await screenshot(page, testInfo, `dialog-${suffix}`, dialog);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
  }
});
