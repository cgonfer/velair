/** Shared real-HA lifecycle and native browser framing for public captures. */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, expect } from "./playwright.mjs";
import { browserConnectOptions } from "../../../frontend/e2e/browser.mjs";
import { captureRectangle, positionCaptureTarget } from "./capture-framing.mjs";
import { login, outputDir, readState, theme } from "../../../frontend/e2e/helpers.mjs";

export async function capturePublic(prepare) {
  const state = readState();
  const output = outputDir();
  const plan = JSON.parse(readFileSync(process.env.VELAIR_CAPTURE_PLAN, "utf8"));
  const scenario = JSON.parse(readFileSync(process.env.VELAIR_CAPTURE_SCENARIO, "utf8"));
  const version = JSON.parse(readFileSync(resolve("custom_components/velair/manifest.json"), "utf8")).version;
  const options = browserConnectOptions();
  if (!options) throw new Error("Public captures require the pinned Docker browser");
  const browser = await chromium.connect(options.wsEndpoint, options);
  const collection = process.env.VELAIR_CAPTURE_COLLECTION ?? "website";
  const phase = process.env.VELAIR_CAPTURE_PHASE ?? "household";
  const captures = process.env.VELAIR_CAPTURE_APPEND === "1"
    ? JSON.parse(readFileSync(join(output, "capture-manifest.json"), "utf8")).captures : [];


  try {
    // Use one authenticated HA profile, then fresh rendering contexts per image.
    const authContext = await browser.newContext({ baseURL: state.base_url, locale: "en-US", timezoneId: "Europe/Madrid" });
    let auth;
    try { await login(await authContext.newPage(), state); auth = await authContext.storageState(); }
    finally { await authContext.close(); }
    for (const item of plan.captures.filter(item => (item.phase ?? "household") === phase)) {
      for (const color of plan.themes) {
        const context = await browser.newContext({ baseURL: state.base_url, storageState: auth,
          locale: "en-US", timezoneId: "Europe/Madrid", colorScheme: color, reducedMotion: "reduce",
          viewport: { width: item.width, height: item.height }, deviceScaleFactor: item.scale });
        try {
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", error => errors.push(error.message));
          const { target, end, framing } = await prepare(page, item, { scenario, version });
          await expect.poll(() => page.evaluate(() => window.velairFrontendVersion)).toBe(version);
          await expect.poll(() => page.evaluate(() => document.querySelector("home-assistant")?.hass?.language)).toBe("en");
          await theme(page, color === "dark");
          await expect.poll(() => page.evaluate(() => document.querySelector("home-assistant")?.hass?.themes?.darkMode)).toBe(color === "dark");
          await page.evaluate(() => document.fonts.ready);
          // Scroll like a user, then leave clearance for HA/Velair's sticky header.
          // Centering an overview taller than the viewport would hide its first rows.
          const panelHeader = page.locator("velair-sidebar-panel .header");
          const header = await panelHeader.count() ? await panelHeader.boundingBox() : null;
          await target.evaluate(positionCaptureTarget, (header?.height ?? 104) + 12);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const bounds = await target.boundingBox();
          const ends = end ? await Promise.all((Array.isArray(end) ? end : [end]).map(locator => locator.boundingBox())) : [];
          let clip;
          try { clip = captureRectangle(bounds, ends, item); }
          catch (error) { throw new Error(`${item.name}: ${error.message}; bounds=${JSON.stringify(bounds)}; ends=${JSON.stringify(ends)}`, { cause: error }); }
          const file = collection === "documentation" ? item.name : `${color}/${item.name}`;
          mkdirSync(join(output, color), { recursive: true });
          await page.screenshot({ path: join(output, file), animations: "disabled", caret: "hide",
            clip });
          if (errors.length) throw new Error(`Frontend errors during ${item.name}: ${errors.join("; ")}`);
          const bytes = readFileSync(join(output, file));
          captures.push({ file, view: item.view, phase, framing, viewport: { width: item.width, height: item.height },
            width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20),
            sha256: createHash("sha256").update(bytes).digest("hex") });
          console.log(`Captured ${file} from real Home Assistant`);
        } finally { await context.close(); }
      }
    }
  } finally { await browser.close(); }

  writeFileSync(join(output, "capture-manifest.json"), JSON.stringify({ schemaVersion: 1, collection, version, language: "en", capturedAt: new Date().toISOString(), captures }, null, 2) + "\n");
  const figures = captures.map(row => `<figure><img src="${row.file}" alt="${row.file}" loading="lazy"><figcaption>${row.file}</figcaption></figure>`).join("\n");
  writeFileSync(join(output, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Velair public capture review</title><style>body{font:16px system-ui;margin:24px;background:#ddd}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}figure{margin:0;background:white;padding:12px}img{max-width:100%;height:auto}figcaption{margin:12px 0}</style><h1>Velair public captures</h1><p>Real Home Assistant; fictional English household and virtual devices. No API response overrides.</p><main>${figures}</main></html>`);

}
