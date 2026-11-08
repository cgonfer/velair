import { defineConfig } from "@playwright/test";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { browserConnectOptions } from "./e2e/browser.mjs";

const root = dirname(fileURLToPath(import.meta.url));
if (!process.env.VELAIR_QUALITY_OUTPUT || !isAbsolute(process.env.VELAIR_QUALITY_OUTPUT)) {
  throw new Error("VELAIR_QUALITY_OUTPUT must name an absolute task-specific output directory");
}
const output = resolve(process.env.VELAIR_QUALITY_OUTPUT);
const statePath = process.env.VELAIR_HA_STATE;
const state = statePath ? JSON.parse(readFileSync(statePath, "utf8")) : undefined;
const references = process.env.VELAIR_VISUAL_REFERENCES;
if (references && (!isAbsolute(references) || !process.env.VELAIR_BROWSER_WS)) {
  throw new Error("Candidate references require an absolute directory and the pinned Linux renderer");
}

export default defineConfig({
  testDir: resolve(root, "e2e"),
  testMatch: process.env.VELAIR_QUALITY_SUITE === "calibration" ? ["**/calibration.spec.mjs", "**/visual.spec.mjs"] : "**/*.spec.mjs",
  testIgnore: process.env.VELAIR_QUALITY_SUITE === "calibration" ? [] : ["**/calibration.spec.mjs"],
  globalSetup: resolve(root, "e2e/setup.mjs"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  updateSnapshots: "none",
  // Snapshot names describe the renderer, not the Windows/Linux host driver.
  snapshotPathTemplate: process.env.VELAIR_BROWSER_WS
    ? `${references ? resolve(references).replaceAll("\\", "/") : "{testDir}"}/{testFilePath}-snapshots/{arg}-{projectName}-linux{ext}`
    : undefined,
  timeout: 120_000,
  globalTimeout: 12 * 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  outputDir: resolve(output, "browser"),
  reporter: [
    ["line"],
    ["json", { outputFile: resolve(output, "playwright.json") }],
    ["html", { outputFolder: resolve(output, "html"), open: "never" }],
  ],
  use: {
    baseURL: state?.base_url || "http://127.0.0.1:8123",
    storageState: statePath ? resolve(dirname(statePath), "browser-auth.json") : undefined,
    browserName: "chromium",
    connectOptions: browserConnectOptions(),
    locale: "en-US",
    timezoneId: "Europe/Madrid",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    screenshot: "only-on-failure",
    // HA authentication travels over HTTP/WebSocket. Raw traces can contain tokens;
    // publish screenshots, error locations and bounded measurements instead.
    trace: "off",
    video: "off",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", testIgnore: ["**/restart.spec.mjs", "**/calibration.spec.mjs", "**/control.spec.mjs", "**/editing.spec.mjs"], use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "tablet", testIgnore: ["**/restart.spec.mjs", "**/calibration.spec.mjs", "**/control.spec.mjs", "**/editing.spec.mjs"], use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
  ],
});
