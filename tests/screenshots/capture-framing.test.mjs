import { test } from "node:test";
import assert from "node:assert/strict";
import { captureRectangle } from "../../scripts/screenshots/browser/capture-framing.mjs";

const viewport = { width: 1440, height: 1800, maxHeight: 1500, complete: true };
const first = { x: 200, y: 120, width: 1100, height: 200 };

test("native union includes timeline, intervening content and every final block", () => {
  const last = { x: 220, y: 700, width: 1080, height: 400 };
  assert.deepEqual(captureRectangle(first, last, viewport), { x: 200, y: 120, width: 1100, height: 980 });
});

test("required scenes reject truncation by the viewport or capture limit", () => {
  for (const limits of [{ height: 900 }, { maxHeight: 500 }]) {
    assert.throws(() => captureRectangle(first, { ...first, y: 900 }, { ...viewport, ...limits }), /would be cut/);
  }
});

test("overview includes the taller room card even when the last card is shorter", () => {
  const rooms = [{ ...first, y: 400, height: 800 }, { ...first, x: 800, width: 500, y: 400, height: 400 }];
  assert.equal(captureRectangle(first, rooms, viewport).height, 1080);
});

test("full mobile context can retain its intentionally bounded tall preview", () => {
  assert.equal(captureRectangle({ ...first, height: 5000 }, null, { ...viewport, complete: false }).height, 1500);
});

test("invalid or horizontally clipped targets are rejected", () => {
  for (const box of [null, { ...first, x: -1 }, { ...first, width: 1440 }, { ...first, height: NaN }]) {
    assert.throws(() => captureRectangle(box, null, viewport));
  }
});
