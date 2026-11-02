import { describe, expect, it } from "vitest";
import { normalizeTemplateBlocks } from "../../src/velair/controllers/template-impact";

const host = { _t: (key: string) => key };
describe("template assignment decimal input", () => {
  it.each(["19.5", "19,5"])("converts a complete %s assignment to a number", (temperature) => {
    expect(normalizeTemplateBlocks(host, [{ start: "08:00", action: "set_temperature", hvac_mode: "heat", temperature }]))
      .toMatchObject({ ok: true, blocks: [{ temperature: 19.5 }] });
  });
  it.each(["19.", "19,", "1e2", "19,5.2", ""])("rejects incomplete or malformed assignment %s", (temperature) => {
    expect(normalizeTemplateBlocks(host, [{ start: "08:00", action: "set_temperature", hvac_mode: "heat", temperature }]).ok).toBe(false);
  });
  it("normalizes range assignments and preserves their ordering validation", () => {
    const block = { start: "08:00", action: "set_temperature" as const, hvac_mode: "heat_cool", target_temp_low: "19,5", target_temp_high: "24,5" };
    expect(normalizeTemplateBlocks(host, [block])).toMatchObject({ ok: true, blocks: [{ target_temp_low: 19.5, target_temp_high: 24.5 }] });
    expect(normalizeTemplateBlocks(host, [{ ...block, target_temp_high: "19," }]).ok).toBe(false);
    expect(normalizeTemplateBlocks(host, [{ ...block, target_temp_low: "25,5" }]).ok).toBe(false);
  });
});
