/** Real preset rendering must stay independent from schedule-row mobile tracks. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "../../scripts/screenshots/browser/playwright.mjs";

const bundle = fileURLToPath(new URL("../../custom_components/velair/frontend/velair-card.js", import.meta.url));
const configurations = {
  heating: { action: "set_temperature", temperature: 21, hvac_mode: "heat" },
  cooling: { action: "set_temperature", temperature: 24, hvac_mode: "cool" },
  range: { action: "set_temperature", target_temp_low: 20, target_temp_high: 24, hvac_mode: "heat_cool" },
  off: { action: "turn_off" },
  options: { action: "set_climate_options", fan_mode: "auto" },
  "mode-only": { action: "set_hvac_mode", hvac_mode: "cool" },
  "temperature-only": { action: "set_temperature", temperature: 22, temperature_only: true },
};

test("preset Action and Mode retain readable full-width controls across viewport and container breakpoints", async () => {
  const server = createServer(async (request, response) => {
    if (request.url === "/velair-card.js") {
      response.writeHead(200, { "content-type": "text/javascript" }).end(await readFile(bundle));
    } else {
      response.writeHead(200, { "content-type": "text/html" }).end(`<!doctype html><html lang="en"><style>body{margin:16px;font:14px system-ui;--primary-text-color:#222;--secondary-text-color:#555;--card-background-color:#fff;--secondary-background-color:#eee;--divider-color:#bbb;--primary-color:#009ac7}main{container-type:inline-size;max-width:1100px}velair-preset-library{display:block}</style><main></main><script type="module" src="/velair-card.js"></script></html>`);
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch();
    // The panel container can be narrower than its viewport because of HA's sidebar.
    for (const [width, available] of [[390, 358], [820, 520], [1440, 1100]]) {
      const page = await browser.newPage({ viewport: { width, height: 1800 } });
      try {
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.waitForFunction(() => customElements.get("velair-preset-library") && customElements.get("velair-card"));
        for (const [name, config] of Object.entries(configurations)) {
          await page.evaluate(async ({ config, available }) => {
            const main = document.querySelector("main");
            main.style.width = `${available}px`;
            main.replaceChildren();
            const data = { configured_entities: ["climate.example"], temperature_unit: "°C", configuration_revision: 1,
              block_presets: [{ key: "example", name: "Example preset", config }] };
            const host = document.createElement("velair-card");
            host._data = data;
            host.hass = { language: "en", states: { "climate.example": { state: "heat", attributes: {
              friendly_name: "Example room", hvac_modes: ["off", "heat", "cool", "heat_cool"],
              fan_modes: ["auto"], min_temp: 5, max_temp: 35 } } } };
            const library = document.createElement("velair-preset-library");
            Object.assign(library, { host, data, hass: host.hass });
            main.append(library);
            library.editPreset("example");
            await library.updateComplete;
          }, { config, available });
          const fields = page.locator("velair-preset-library .editable-block.preset-fields");
          const action = fields.locator(":scope > label.full-width select").first();
          await expect(action).toHaveValue(config.action);
          const boxes = await fields.evaluate(element => {
            const rect = value => { const b = value.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
            return { fields: rect(element), labels: [...element.querySelectorAll(":scope > label")].map(rect),
              controls: [...element.querySelectorAll(":scope > label select, :scope > label input")].map(rect),
              full: [...element.querySelectorAll(":scope > label.full-width")].map(rect),
              scroll: document.documentElement.scrollWidth };
          });
          const context = `${name} at viewport ${width}, panel ${available}`;
          assert.ok(boxes.scroll <= width, `${context}: no horizontal page overflow`);
          for (const box of boxes.full) assert.ok(box.width >= boxes.fields.width - 1, `${context}: Action/Mode spans the preset grid`);
          for (const [index, box] of boxes.controls.entries()) {
            assert.ok(box.width >= (index < boxes.full.length ? 160 : 90), `${context}: readable control width`);
            assert.ok(box.x >= boxes.fields.x - 1 && box.right <= boxes.fields.right + 1, `${context}: control stays in its form`);
          }
          for (let index = 0; index < boxes.labels.length; index++) {
            for (const other of boxes.labels.slice(index + 1)) {
              const box = boxes.labels[index];
              assert.ok(box.right <= other.x + 1 || other.right <= box.x + 1 || box.bottom <= other.y + 1 || other.bottom <= box.y + 1,
                `${context}: field labels never overlap`);
            }
          }
        }
        assert.deepEqual(errors, [], "actual preset component renders without browser errors");
      } finally { await page.close(); }
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
