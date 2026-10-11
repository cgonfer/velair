import { describe, expect, it } from "vitest";
import { bindingsFromBlocks, linkedDayBlocks, linkedDraftBlocks, linkDay } from "../../src/velair/domain/linked-schedules";
import { draftBlocksFromScheduleBlocks, normalizeDraftBlocks } from "../../src/velair/domain/draft-blocks";
import { createClimateProfileDraft, climateProfileInput } from "../../src/velair/domain/climate-profiles";
import { createTemplateImpact, templateImpactAssignments } from "../../src/velair/controllers/template-impact";
import { resolvedResourceBlock } from "../../src/velair/domain/resource-display";
import type { ClimateProfile, ScheduleResponse, StoredScheduleTemplate } from "../../src/velair/types";

const template: StoredScheduleTemplate = { key: "workday", name: "Workday", blocks: [{ start: "07:00", slot_id: "a", action: "turn_off" }, { start: "23:00", slot_id: "b", action: "turn_off" }] };
const options = { duplicateStartError: () => "duplicate", invalidStartError: () => "start", invalidTemperatureError: (_: string, message: string) => message, invalidClimateOptionsError: () => "options", temperatureError: () => undefined };

describe("linked schedule references", () => {
  it("keeps damaged resources unchanged while safely rendering diagnostic-only days", () => {
    const link = { template_key: "bad", bindings: {} };
    const damaged = { key: "bad", name: "Bad", blocks: [null] } as unknown as StoredScheduleTemplate;
    expect(linkedDayBlocks(link, [damaged])).toEqual([]);
    expect(linkedDraftBlocks({ ...link, bindings: null } as unknown as import("../../src/velair/types").TemplateLink, [template])).toEqual([]);
    expect(damaged.blocks).toEqual([null]);
  });
  it("keeps reference-only payloads exclusive, even when the draft has stale inline values", () => {
    const draft = draftBlocksFromScheduleBlocks([{ start: "07:00", preset_key: "comfort" }])[0];
    expect(draft.temperature).toBeUndefined();
    expect(normalizeDraftBlocks([{ ...draft, temperature: 30, hvac_mode: "cool" }], options)).toEqual({ ok: true, blocks: [{ start: "07:00", preset_key: "comfort" }] });
  });
  it("shares hours by stable IDs and never inherits template climate configuration", () => {
    const link = { template_key: "workday", bindings: { a: { preset_key: "heat" }, b: { action: "turn_off" } } };
    const moved = { ...template, blocks: [...template.blocks].reverse().map((slot) => slot.slot_id === "a" ? { ...slot, start: "08:00", temperature: 99 } : slot) };
    expect(linkedDayBlocks(link, [moved])).toEqual([{ start: "23:00", slot_id: "b", action: "turn_off" }, { start: "08:00", slot_id: "a", preset_key: "heat" }]);
  });
  it("does not invent assignments when linking a new slot", () => {
    const link = linkDay(template, [{ start: "07:00", preset_key: "heat" }]);
    expect(link.bindings).toEqual({ a: { preset_key: "heat" } });
    expect(linkedDraftBlocks(link, [template])[1].temperature).toBe("");
  });
  it("strips hours and slot identity from assignment configurations", () => {
    expect(bindingsFromBlocks({ template_key: "workday", bindings: {} }, [{ start: "07:00", slot_id: "a", preset_key: "heat" }])).toEqual({ template_key: "workday", bindings: { a: { preset_key: "heat" } } });
  });
  it("round trips Profile references without saving backend resolved copies", () => {
    const profile: ClimateProfile = { key: "winter", name: "Winter", zones: { "climate.room": { behavior: "schedule", schedule: { monday: [] }, template_links: { monday: { template_key: "workday", bindings: { a: { preset_key: "heat" }, b: { action: "turn_off" } } } } } } };
    expect(climateProfileInput(createClimateProfileDraft(profile)).zones).toEqual({ "climate.room": { behavior: "schedule", schedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }, template_links: profile.zones["climate.room"].behavior === "schedule" ? profile.zones["climate.room"].template_links : {} } });
  });
  it("requires assignments for Default and inactive Profile destinations together", () => {
    const impact = createTemplateImpact({ template, configuration_revision: 3, added_slot_ids: ["a"], removed_slot_ids: [], usages: [{ source: "default", entity_id: "climate.room", weekday: "monday" }, { source: "profile", profile_key: "inactive", entity_id: "climate.room", weekday: "monday" }] }, "Workday");
    const host = { _t: (key: string) => key, _temperatureError: (block: { temperature?: unknown }) => block.temperature === "" ? "required" : undefined } as never;
    expect(templateImpactAssignments(host, impact)).toBeUndefined();
    impact.assignments[0].drafts[0] = { start: "07:00", slot_id: "a", action: "", hvac_mode: "", preset_key: "heat" };
    expect(templateImpactAssignments(host, impact)).toBeUndefined();
    impact.assignments[1].drafts[0] = { start: "07:00", slot_id: "a", action: "turn_off", hvac_mode: "" };
    expect(templateImpactAssignments(host, impact)).toEqual([{ source: "default", entity_id: "climate.room", weekday: "monday", bindings: { a: { preset_key: "heat" } } }, { source: "profile", profile_key: "inactive", entity_id: "climate.room", weekday: "monday", bindings: { a: { action: "turn_off" } } }]);
  });
  it("reads backend adapted values only for matching references", () => {
    const data = { resolved_default_schedules: { "climate.room": { monday: [{ start: "07:00", temperature: 20.5 }] } }, resolved_block_metadata: { default: { "climate.room": { monday: [{ start: "07:00", preset_key: "heat", adaptations: { temperature: { requested: 20.3, effective: 20.5 } } }] } }, profiles: {} } } as unknown as ScheduleResponse;
    const usage = { source: "default" as const, entity_id: "climate.room", weekday: "monday", start: "07:00" };
    expect(resolvedResourceBlock(data, usage, "heat")?.block.temperature).toBe(20.5);
    expect(resolvedResourceBlock(data, usage, "heat")?.adaptations).toEqual(["20.3 → 20.5"]);
    expect(resolvedResourceBlock(data, usage, "other")).toBeUndefined();
  });
});
