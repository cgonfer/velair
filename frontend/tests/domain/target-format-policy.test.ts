import { describe, expect, it } from "vitest";
import { changeDraftTargetFormat, editorTargetFormats, targetFormatsForPolicy, targetFormatsForResource } from "../../src/velair/domain/target-format-policy";
import type { DraftScheduleBlock, ScheduleResponse, TargetFormatPolicy } from "../../src/velair/types";
import { climateTargetCompatibleForConfiguration } from "../../src/velair/domain/climate";

const policy = (formats: Record<string, "single" | "range" | "unknown">, kind: TargetFormatPolicy["kind"] = "mixed"): TargetFormatPolicy => ({
  entity_id: "climate.room", kind, configured_modes: null, range_modes: Object.keys(formats).filter((mode) => formats[mode] === "range"), formats_by_mode: formats, invalid_modes: [], uncertain: false,
});
const data = (...policies: TargetFormatPolicy[]) => ({ configured_entities: policies.map((_, i) => `climate.room${i}`), zones: Object.fromEntries(policies.map((item, i) => [`climate.room${i}`, { target_format_policy: item }])) }) as ScheduleResponse;

describe("authoritative target format policies", () => {
  it.each([
    [3, null, "heat_cool", "range"], [3, ["heat"], "heat", "range"],
    [2, null, "heat", "range"], [3, null, "heat", "single"], [1, null, "cool", "single"],
  ] as const)("keeps offline advertised formats for features %s, policy %s, mode %s", (features, configured, mode, expected) => {
    const offline = policy({ heat: "unknown", cool: "unknown", heat_cool: "unknown" }, "unknown");
    offline.configured_modes = configured ? [...configured] : null;
    offline.uncertain = true;
    const value = data(offline);
    const state = { state: "unavailable", attributes: { supported_features: features, hvac_modes: ["off", "heat", "cool", "heat_cool"] } } as any;
    expect(editorTargetFormats(value, { "climate.room0": state }, "climate.room0", mode)).toMatchObject({ formats: [expected], uncertain: false });
    expect(climateTargetCompatibleForConfiguration(state, expected === "range" ? "range" : "scalar", mode, offline)).toBe(true);
    expect(climateTargetCompatibleForConfiguration(state, expected === "range" ? "scalar" : "range", mode, offline)).toBe(false);
    expect(offline.kind).toBe("unknown");
  });
  it("keeps genuinely unknown offline capabilities ambiguous and rejects saving either shape", () => {
    const offline = policy({ heat: "unknown" }, "unknown");
    offline.uncertain = true;
    for (const attributes of [{}, { hvac_modes: ["off", "heat"] }, { supported_features: 3 }]) {
      const state = { state: "unavailable", attributes } as any;
      expect(editorTargetFormats(data(offline), { "climate.room0": state }, "climate.room0", "heat").uncertain).toBe(true);
      expect(climateTargetCompatibleForConfiguration(state, "range", "heat", offline)).toBe(false);
      expect(climateTargetCompatibleForConfiguration(state, "scalar", "heat", offline)).toBe(false);
    }
  });
  it("preserves hidden-off scalar compatibility even with an authoritative unknown policy", () => {
    const state = { state: "off", attributes: { supported_features: 392, hvac_modes: ["off", "heat_cool", "heat", "cool"] } } as any;
    const unknown = policy({ heat: "unknown", cool: "unknown", heat_cool: "unknown" }, "unknown");
    expect(climateTargetCompatibleForConfiguration(state, "scalar", "heat", unknown)).toBe(true);
    expect(climateTargetCompatibleForConfiguration(state, "scalar", undefined, unknown)).toBe(true);
    expect(climateTargetCompatibleForConfiguration(state, "scalar", "heat_cool", unknown)).toBe(false);
    expect(climateTargetCompatibleForConfiguration(state, "range", "heat", unknown)).toBe(false);
  });
  it("uses configured Heat ranges rather than guessing from HVAC names", () => {
    const value = data(policy({ heat: "range", cool: "single", heat_cool: "range" }));
    expect(editorTargetFormats(value, undefined, "climate.room0", "heat").formats).toEqual(["range"]);
    expect(editorTargetFormats(value, undefined, "climate.room0", "cool").formats).toEqual(["single"]);
  });
  it("aggregates only climates offering the explicit mode", () => {
    expect(targetFormatsForResource(data(policy({ heat: "range" }), policy({ cool: "single" })), undefined, "heat").formats).toEqual(["range"]);
  });
  it("offers alternation only when destinations disagree", () => {
    const mixed = targetFormatsForResource(data(policy({ heat: "range" }), policy({ heat: "single" })), undefined, "heat");
    expect(mixed.formats).toEqual(["range", "single"]);
    expect(mixed.preferred).toBe("single");
  });
  it("allows scalar Heat/Cool when destinations require it", () => {
    expect(targetFormatsForResource(data(policy({ heat_cool: "single" })), undefined, "heat_cool").formats).toEqual(["single"]);
    expect(targetFormatsForResource(data(policy({ heat_cool: "single" }), policy({ heat_cool: "range" })), undefined, "heat_cool").preferred).toBe("range");
  });
  it("does not claim unanimity without climates or with unknown modes", () => {
    expect(targetFormatsForResource(undefined, undefined, "heat")).toMatchObject({ formats: ["single", "range"], uncertain: true });
    const value = data(policy({ heat: "range" }));
    value.configured_entities.push("climate.unknown");
    expect(targetFormatsForResource(value, undefined, "heat").uncertain).toBe(true);
  });
  it("keeps exclusive formats exclusive for Keep despite unsupported dry entries", () => {
    expect(targetFormatsForPolicy(policy({ heat: "range", dry: "unknown" }, "range"))).toEqual({ formats: ["range"], preferred: "range", uncertain: false });
  });
  it("Keep gathers both possible formats without following transient live mode", () => {
    expect(targetFormatsForPolicy(policy({ heat: "single", heat_cool: "range" })).formats).toEqual(["single", "range"]);
  });
  it("preserves alternate drafts across value, time and mode edits without serializing them", () => {
    const original: DraftScheduleBlock = { start: "08:00", action: "set_temperature", hvac_mode: "heat", temperature: 21 };
    const pair = changeDraftTargetFormat(original, "range");
    expect(pair.target_temp_low).toBe("");
    const edited = { ...pair, target_temp_low: "19", target_temp_high: "24", start: "09:00" };
    const single = changeDraftTargetFormat(edited, "single");
    expect(single.temperature).toBe(21);
    expect(single.start).toBe("09:00");
    expect(changeDraftTargetFormat(single, "range")).toMatchObject({ target_temp_low: "19", target_temp_high: "24" });
    expect(JSON.parse(JSON.stringify(single))).toEqual({ start: "09:00", action: "set_temperature", hvac_mode: "heat", temperature: 21 });
  });
});
