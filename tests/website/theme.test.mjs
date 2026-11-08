/** Regression coverage for the shared public site, without a Home Assistant. */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "../../frontend/node_modules/@playwright/test/index.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const publicDir = resolve(root, "website/public");
let browser, server, base;
const python = process.env.PYTHON || "python";
const releaseHtml = execFileSync(python, ["-c", `
from copy import deepcopy
from tests.quality.test_site import dashboard_report, site
report = dashboard_report()
reference = deepcopy(report)
reference['commit'] = 'b' * 40
report['comparison'] = site.quality.compare(reference, report)
hacs = dashboard_report()
hacs['artifactRole'] = 'committed-integration'
report = site.quality.aggregate([report, hacs], '0.0.0-beta.1')
print(site.render_release({'tag': 'v0.0.0-beta.1', 'report': report}, 'cgonfer/velair'))
`],
  { cwd: root, encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
const failedReleaseHtml = execFileSync(python, ["-c", `
from tests.quality.test_site import dashboard_report, site
report = dashboard_report()
row = next(row for row in report['scenarios'] if row.get('actionId') == 'schedule.edit-save' and row.get('actionVariant') == 'cooling-usable' and row.get('project') == 'mobile')
row.update(status='fail', failureStep='schedule.save')
report.update(status='fail', outcome='fail')
print(site.render_release({'tag':'v0.0.0-beta.1','report':report}, 'cgonfer/velair'))
`], { cwd: root, encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });

before(async () => {
  server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (!pathname.startsWith("/velair/")) { response.writeHead(404).end(); return; }
    if (pathname === "/velair/quality/test-release.html") { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(releaseHtml); return; }
    if (pathname === "/velair/quality/failed-release.html") { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(failedReleaseHtml); return; }
    let path = resolve(publicDir, "." + pathname.slice("/velair".length));
    if (path !== publicDir && !path.startsWith(publicDir + sep)) { response.writeHead(403).end(); return; }
    try {
      if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
      const type = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" }[extname(path)] || "application/octet-stream";
      response.writeHead(200, { "content-type": type + (type.startsWith("text/") ? "; charset=utf-8" : "") }).end(await readFile(path));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  base = `http://127.0.0.1:${server.address().port}/velair`;
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((done) => server.close(done));
});

test("theme persists through home, Quality, a release and browser history", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
  try {
    const page = await context.newPage();
    await page.goto(`${base}/index.html`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("navigation").getByRole("link", { name: "Quality", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".theme-toggle")).toHaveAttribute("aria-label", "Switch to light theme");
    await page.goto(`${base}/quality/test-release.html`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator("header .brand").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.goBack();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.goBack();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  } finally { await context.close(); }
});

test("system preference works when storage is empty or blocked", async () => {
  for (const blocked of [false, true]) {
    const context = await browser.newContext({ colorScheme: "dark" });
    try {
      if (blocked) await context.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } }));
      const page = await context.newPage();
      await page.goto(`${base}/quality/`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await page.locator(".theme-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    } finally { await context.close(); }
  }
});

test("theme preference stays synchronized between tabs", async () => {
  const context = await browser.newContext({ colorScheme: "light" });
  try {
    const home = await context.newPage(), quality = await context.newPage();
    await home.goto(`${base}/index.html`);
    await quality.goto(`${base}/quality/`);
    await quality.locator(".theme-toggle").click();
    await expect(home.locator("html")).toHaveAttribute("data-theme", "dark");
    await home.locator(".theme-toggle").click();
    await expect(quality.locator("html")).toHaveAttribute("data-theme", "light");
  } finally { await context.close(); }
});

test("mobile menu and theme controls retain the shared keyboard behavior", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(`${base}/quality/`);
    await expect(page.locator(".theme-toggle")).toBeVisible();
    await page.locator(".nav-toggle").click();
    await expect(page.locator("#site-navigation")).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Quality", exact: true })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    await expect(page.locator(".nav-toggle")).toBeFocused();
    await expect(page.locator(".nav-toggle")).toHaveAttribute("aria-expanded", "false");
    await page.locator(".nav-toggle").click();
    await page.getByRole("navigation").getByRole("link", { name: "Schedules", exact: true }).click();
    await expect(page).toHaveURL(/index\.html#schedules$/);
  } finally { await context.close(); }
});

test("release charts work without JavaScript and technical results open with the keyboard", async () => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(`${base}/quality/test-release.html`);
    await expect(page.getByRole("heading", { name: "Release package", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "HACS installation", exact: true })).toHaveCount(0);
    await page.locator(".quality-additional-execution > summary").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "HACS installation", exact: true })).toBeVisible();
    assert.ok(await page.locator("figure.quality-chart").count() >= 6);
    await expect(page.getByRole("heading", { name: "Switch between Overview and Schedules", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Response time distribution", exact: true })).toHaveCount(0);
    const firstExecution = page.locator(".quality-execution").first();
    const schedule = firstExecution.locator('[data-action="schedule.edit-save"]');
    await expect(schedule.locator(':scope > summary')).toContainText("Passed");
    await expect(schedule.locator(':scope > summary')).not.toContainText("9/9");
    await expect(schedule.locator('.quality-action-count')).not.toBeVisible();
    await expect(schedule.locator('.quality-action-checks')).not.toBeVisible();
    await schedule.locator(":scope > summary").focus();
    await page.keyboard.press("Enter");
    await expect(schedule.locator('.quality-action-checks')).toBeVisible();
    await expect(schedule.locator('.quality-action-count')).toContainText('Passed · 9/9 checks');
    await expect(schedule.getByText('Temperature range', { exact: true })).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await firstExecution.locator('.quality-timing-details > summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Switch between Overview and Schedules', exact: true })).toHaveCount(1);
    await firstExecution.locator('.quality-context > summary').focus();
    await page.keyboard.press('Enter');
    const diagnostic = firstExecution.locator(".quality-diagnostics");
    await diagnostic.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(diagnostic).toHaveAttribute("open", "");
    await expect(page.getByRole("heading", { name: "Response time distribution", exact: true })).toHaveCount(1);
    await page.keyboard.press("Space");
    await page.locator(".quality-reference summary").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".quality-reference")).toHaveAttribute("open", "");
    await page.keyboard.press("Space");
    await expect(page.locator(".quality-reference")).not.toHaveAttribute("open");
    await expect(page.locator(".quality-details")).not.toHaveAttribute("open");
    await page.locator(".quality-details summary").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".quality-details")).toHaveAttribute("open", "");
    await expect(page.getByRole("columnheader", { name: "Scenario", exact: true })).toBeVisible();
    await expect(page.locator('.quality-details').getByRole('heading', { name: 'Operation timings', exact: true })).toBeVisible();
    await expect(page.locator('.quality-details').getByRole('heading', { name: 'Resource and responsiveness readings', exact: true })).toBeVisible();
    await expect(page.locator('.quality-details')).not.toContainText('test_duration_ms');
    await expect(page.locator('.quality-details')).not.toContainText('insufficient samples');
    await expect(page.getByRole('columnheader', { name: 'p95', exact: true })).toHaveCount(0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.keyboard.press("Space");
    await expect(page.locator(".quality-details")).not.toHaveAttribute("open");
  } finally { await context.close(); }
});

test("report overview fits desktop and keeps failures visible with all action details closed", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto(`${base}/quality/test-release.html`);
    const execution = page.locator('.quality-execution').first();
    assert.equal(await execution.locator('.quality-action[open]').count(), 0);
    await expect(execution.locator('.quality-action > summary').last()).toBeInViewport();
    await expect(page.locator('.quality-result-ring')).toBeInViewport();
    await expect(page.locator('.quality-timing-overview .quality-track').last()).toBeInViewport();
    await expect(page.locator('.quality-result-legend')).toContainText('Passed11');
    assert.equal(await page.locator('.quality-overview details').count(), 0);
    await page.goto(`${base}/quality/failed-release.html`);
    const failed = page.locator('[data-action="schedule.edit-save"]');
    await expect(failed).not.toHaveAttribute('open');
    await expect(failed.locator('.quality-action-issue')).toBeVisible();
    await expect(failed.locator('.quality-action-issue')).toContainText('Cooling · Mobile: Saving and confirming the stored value');
    await expect(failed.locator(':scope > summary')).toContainText('Failed');
    await expect(failed.locator(':scope > summary')).not.toContainText('8/9');
    await expect(page.locator('.quality-result-legend')).toContainText('Failed1');
    assert.notEqual(await failed.evaluate(el => getComputedStyle(el).borderLeftColor), await page.locator('[data-action="panel.navigate"]').evaluate(el => getComputedStyle(el).borderLeftColor));
  } finally { await context.close(); }
});

test("both themes fit mobile, tablet and desktop without overlapping header controls", async () => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const failedAssets = [], scriptErrors = [];
    page.on("response", (response) => { if (response.url().startsWith(base) && response.status() >= 400) failedAssets.push(response.url()); });
    page.on("pageerror", (error) => scriptErrors.push(error.message));
    for (const width of [390, 768, 980, 1024, 1100, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/index.html", "/quality/", "/quality/test-release.html"]) {
        await page.goto(base + path);
        for (const theme of ["dark", "light"]) {
          if (await page.locator("html").getAttribute("data-theme") !== theme) await page.locator(".theme-toggle").click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} overflows at ${width} in ${theme}`);
          const brand = await page.locator("header .brand").boundingBox();
          const toggle = await page.locator(".theme-toggle").boundingBox();
          assert.ok(brand.x + brand.width <= toggle.x && toggle.x + toggle.width <= width, `Header controls overlap at ${width}`);
          if (width > 980) {
            const navigation = await page.locator("#site-navigation").boundingBox();
            assert.ok(brand.x + brand.width <= navigation.x && navigation.x + navigation.width <= toggle.x, `Navigation overlaps header controls at ${width}`);
          }
        }
      }
    }
    assert.deepEqual(failedAssets, []);
    assert.deepEqual(scriptErrors, []);
  } finally { await context.close(); }
});
