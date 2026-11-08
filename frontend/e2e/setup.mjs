import { launchBrowser } from "./browser.mjs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { login, outputDir, readState, writeJson } from "./helpers.mjs";

export default async function setup() {
  const state = readState();
  const stateRelative = relative(outputDir(), resolve(process.env.VELAIR_HA_STATE));
  if (!stateRelative.startsWith("..") && !isAbsolute(stateRelative)) {
    throw new Error("Private HA authentication state must be outside the quality output directory");
  }
  writeJson(join(outputDir(), "visual-results.json"), {
    schema_version: 1, mode: process.env.VELAIR_QUALITY_VISUAL || "capture", compared: 0, captured: 0, recorded: 0, failed: 0, executions: [],
  });
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ locale: "en-US", viewport: { width: 1440, height: 900 } });
    // Deliberately outside test tracing: do not export login requests or tokens.
    await login(page, state);
    await page.context().storageState({ path: join(dirname(process.env.VELAIR_HA_STATE), "browser-auth.json") });
  } finally { await browser.close(); }
}
