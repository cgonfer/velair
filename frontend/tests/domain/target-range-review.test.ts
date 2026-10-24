import { describe, expect, it } from "vitest";
import { targetReviewUsesPreset } from "../../src/velair/domain/target-range-review";

describe("target review original resource identity", () => {
  it.each(["full", "hours"])("uses the saved %s link before raw or candidate references", (mode) => {
    const link = mode === "full" ? { mode: "full", template_key: "t" } : { template_key: "t", bindings: { afternoon: { preset_key: "right" } } };
    const data = { zones: { "climate.room": { schedule: { monday: [{ start: "12:00", preset_key: "wrong" }] }, template_links: { monday: link } } }, templates: [{ key: "t", name: "Template", blocks: [{ start: "08:00", preset_key: "wrong" }, { start: "12:00", slot_id: "afternoon", preset_key: "right" }] }], block_presets: [{ key: "right", name: "Correct preset" }] };
    const day = { destination: { source: "default", entity_id: "climate.room", template_links: {} }, weekday: "monday", blocks: [{ start: "12:00" }] };
    expect(targetReviewUsesPreset(data as any, day as any, 0)).toBe(true);
    if (mode === "full") data.templates[0].blocks[1] = { start: "12:00", slot_id: "afternoon" } as any;
    else (data.zones["climate.room"].template_links.monday as any).bindings.afternoon = { action: "set_temperature", temperature: 21 };
    expect(targetReviewUsesPreset(data as any, day as any, 0)).toBe(false);
  });
});
