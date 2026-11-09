/** Capture tools use one pinned dependency regardless of the invoking directory. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

test("browser tooling resolves the frontend's pinned Playwright from an unrelated cwd", () => {
  const directory = mkdtempSync(join(tmpdir(), "velair-capture-dependencies-"));
  const bridge = new URL("../../scripts/screenshots/browser/playwright.mjs", import.meta.url).href;
  const frontendPackage = new URL("../../frontend/package.json", import.meta.url).href;
  try {
    const result = execFileSync(process.execPath, ["--input-type=module", "-e", `
      import assert from "node:assert/strict";
      import { createRequire } from "node:module";
      const require = createRequire(new URL(${JSON.stringify(frontendPackage)}));
      const pinned = require("@playwright/test");
      const actual = await import(${JSON.stringify(bridge)});
      assert.equal(actual.chromium, pinned.chromium);
      assert.equal(actual.expect, pinned.expect);
      assert.equal(actual.chromium.name(), "chromium");
      console.log("pinned frontend Playwright");
    `], { cwd: directory, encoding: "utf8" });
    assert.equal(result.trim(), "pinned frontend Playwright");
  } finally {
    const target = realpathSync(directory);
    assert.equal(dirname(target).toLowerCase(), realpathSync(tmpdir()).toLowerCase());
    rmSync(target, { recursive: true, force: true });
  }
});
