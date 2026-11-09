/** Native scroll limits must not cut a complete public screenshot section. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "../../scripts/screenshots/browser/playwright.mjs";
import { captureRectangle, positionCaptureTarget } from "../../scripts/screenshots/browser/capture-framing.mjs";

test("header clearance preserves both first-aligned and bottom-aligned complete sections", async () => {
  const browser = await chromium.launch();
  try {
    for (const trailingSpace of [0, 1000]) {
      const page = await browser.newPage({ viewport: { width: 800, height: 1000 } });
      try {
        await page.setContent(`<style>body{margin:0}main{height:1000px;overflow:auto}#before{height:1800px}section{height:700px;width:700px}#after{height:${trailingSpace}px}</style><main><div id="before"></div><section>Complete native section</section><div id="after"></div></main>`);
        const target = page.locator("section");
        await target.evaluate(positionCaptureTarget, 116);
        const bounds = await target.boundingBox();
        assert.ok(bounds.y >= 116, "section clears the sticky header");
        assert.ok(bounds.y + bounds.height <= 1000, "last section remains entirely inside the viewport");
        assert.equal(captureRectangle(bounds, null, { width: 800, height: 1000, maxHeight: 900, complete: true }).height, 700);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
