import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { connect, frontendRoot, openPanel, readState } from "./helpers.mjs";

test("saved schedule survives a Home Assistant restart", { annotation: [
  { type: "velair-action", description: "schedule.restart" }, { type: "velair-variant", description: "default" },
] }, async ({ page }) => {
  test.setTimeout(180_000);
  const state = readState();
  const api = await connect(state);
  const before = await api.call({ type: "velair/get_schedule" });
  api.close();
  await test.step("restart.home-assistant", () => promisify(execFile)(process.env.PYTHON || "python", [resolve(frontendRoot, "../scripts/quality/ha.py"), "restart", "--state-file", process.env.VELAIR_HA_STATE], { timeout: 140_000 }));
  const afterApi = await connect(readState());
  try {
    await test.step("restart.verify-schedule", async () => {
      const after = await afterApi.call({ type: "velair/get_schedule" });
      expect(after.zones[state.climate_entities[0]].schedule).toEqual(before.zones[state.climate_entities[0]].schedule);
      await openPanel(page);
    });
  } finally { afterApi.close(); }
});
