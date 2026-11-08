import test from "node:test";
import assert from "node:assert/strict";
import { browserConnectOptions } from "./browser.mjs";

test("remote renderer exposes only the host loopback network", () => {
  assert.deepEqual(browserConnectOptions("ws://127.0.0.1:40123/"), {
    wsEndpoint: "ws://127.0.0.1:40123/", exposeNetwork: "<loopback>",
  });
  for (const url of ["wss://127.0.0.1:3000/", "ws://example.com:3000/", "ws://user:secret@127.0.0.1:3000/", "ws://127.0.0.1:3000/?key=x", "ws://127.0.0.1:3000/unexpected"]) {
    assert.throws(() => browserConnectOptions(url), /owned browser endpoint/);
  }
  assert.equal(browserConnectOptions(""), undefined);
});
