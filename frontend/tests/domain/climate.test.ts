import { describe, expect, it } from "vitest";

import {
  climateTargetCompatibleForConfiguration,
  climateTargetCompatibleForEnsureOn,
  effectiveClimateHvacModeForEnsureOn,
  climateRequiresRangeTarget,
  climateSupportsRangeTarget,
} from "../../src/velair/domain/climate";

describe("climate target capabilities", () => {
  it("requires both finite range attributes when legacy feature flags are absent", () => {
    expect(climateSupportsRangeTarget({
      attributes: { target_temp_low: 19 },
    } as any)).toBe(false);
    expect(climateSupportsRangeTarget({
      attributes: { target_temp_low: 19, target_temp_high: Number.NaN },
    } as any)).toBe(false);
    expect(climateSupportsRangeTarget({
      attributes: { target_temp_low: 19, target_temp_high: 24 },
    } as any)).toBe(true);
  });

  it("treats a declared feature mask as authoritative", () => {
    expect(climateSupportsRangeTarget({
      attributes: {
        supported_features: 1,
        target_temp_low: 19,
        target_temp_high: 24,
      },
    } as any)).toBe(false);
  });

  it("requires a native range for range-capable heat/cool mode", () => {
    const state = {
      state: "heat_cool",
      attributes: { supported_features: 3 },
    } as any;

    expect(climateRequiresRangeTarget(state)).toBe(true);
    expect(climateRequiresRangeTarget(state, "")).toBe(true);
    expect(climateRequiresRangeTarget(state, "heat_cool")).toBe(true);
    expect(climateRequiresRangeTarget(state, "heat")).toBe(false);
    expect(climateRequiresRangeTarget({ ...state, state: "auto" })).toBe(false);
    expect(climateRequiresRangeTarget({
      ...state,
      attributes: { supported_features: 1, temperature: 20 },
    })).toBe(false);
  });

  it("uses advertised modes while an off climate hides its scalar target feature", () => {
    const off = {
      state: "off",
      attributes: {
        supported_features: 392,
        hvac_modes: ["off", "heat", "cool", "heat_cool"],
      },
    } as any;

    expect(climateTargetCompatibleForConfiguration(off, "scalar", "heat")).toBe(true);
    expect(climateTargetCompatibleForConfiguration(off, "scalar")).toBe(true);
    expect(effectiveClimateHvacModeForEnsureOn(off, "", "scalar")).toBe("heat");
    expect(climateTargetCompatibleForConfiguration(off, "scalar", "heat_cool")).toBe(false);
    expect(climateTargetCompatibleForConfiguration(off, "range", "heat")).toBe(false);
  });

  it("resolves Keep like ensure_on for on and off climates", () => {
    const off = { state: "off", attributes: { hvac_modes: ["off", "cool", "heat_cool"] } } as any;
    expect(effectiveClimateHvacModeForEnsureOn(off)).toBe("cool");
    expect(effectiveClimateHvacModeForEnsureOn(off, "", "range")).toBe("heat_cool");
    expect(effectiveClimateHvacModeForEnsureOn({ ...off, state: "heat_cool" })).toBe("heat_cool");
    expect(effectiveClimateHvacModeForEnsureOn(off, "heat")).toBe("heat");
  });

  it.each([
    ["range explicit heat_cool on mixed", "heat", 3, "heat_cool", "range", true],
    ["range explicit heat rejected", "heat", 3, "heat", "range", false],
    ["range explicit cool rejected", "cool", 3, "cool", "range", false],
    ["range explicit auto rejected", "auto", 3, "auto", "range", false],
    ["range Keep on heat_cool", "heat_cool", 3, "", "range", true],
    ["range Keep on heat rejected", "heat", 3, "", "range", false],
    ["range Keep off first heat_cool", "off", 3, "", "range", true],
    ["range Keep off first heat", "off", 3, "", "range", true],
    ["scalar explicit heat on mixed", "heat_cool", 3, "heat", "scalar", true],
    ["scalar explicit heat_cool rejected", "heat", 3, "heat_cool", "scalar", false],
    ["scalar Keep on heat_cool rejected", "heat_cool", 3, "", "scalar", false],
    ["scalar Keep on heat", "heat", 3, "", "scalar", true],
    ["scalar Keep off first heat_cool skips to heat", "off", 3, "", "scalar", true],
    ["scalar Keep off first heat", "off", 3, "", "scalar", true],
    ["range-only rejects scalar", "heat", 2, "heat", "scalar", false],
    ["range-only accepts range heat_cool", "heat_cool", 2, "heat_cool", "range", true],
  ] as const)("validates %s", (_label, stateMode, features, requested, target, expected) => {
    const firstMode = _label.includes("first heat_cool") ? "heat_cool" : "heat";
    const state = {
      state: stateMode,
      attributes: {
        supported_features: features,
        hvac_modes: ["off", firstMode, firstMode === "heat" ? "heat_cool" : "heat"],
      },
    } as any;
    expect(climateTargetCompatibleForEnsureOn(state, target, requested)).toBe(expected);
  });

  it("rejects off targets when no compatible non-off mode exists", () => {
    const rangeWithoutHeatCool = {
      state: "off",
      attributes: { supported_features: 3, hvac_modes: ["off", "heat", "cool"] },
    } as any;
    const scalarWithoutScalarMode = {
      state: "off",
      attributes: { supported_features: 3, hvac_modes: ["off", "heat_cool"] },
    } as any;
    expect(climateTargetCompatibleForEnsureOn(rangeWithoutHeatCool, "range")).toBe(false);
    expect(climateTargetCompatibleForEnsureOn(scalarWithoutScalarMode, "scalar")).toBe(false);
    expect(climateTargetCompatibleForEnsureOn({
      state: "off",
      attributes: { supported_features: 1, hvac_modes: ["off", "heat_cool"] },
    } as any, "range")).toBe(false);
  });

  it("keeps scalar heat/cool targets valid on scalar-only entities", () => {
    const state = {
      state: "heat_cool",
      attributes: {
        supported_features: 1,
        temperature: 20,
        hvac_modes: ["off", "heat_cool"],
      },
    } as any;

    expect(climateTargetCompatibleForEnsureOn(state, "scalar")).toBe(true);
    expect(climateTargetCompatibleForConfiguration(state, "scalar", "heat_cool")).toBe(true);
  });

  it.each([
    ["scalar Keep ignores active heat_cool", "heat_cool", 3, "", "scalar", true],
    ["range Keep ignores active heat", "heat", 3, "", "range", true],
    ["scalar explicit heat", "heat_cool", 3, "heat", "scalar", true],
    ["scalar explicit heat_cool", "heat", 3, "heat_cool", "scalar", false],
    ["range explicit heat_cool", "heat", 3, "heat_cool", "range", true],
    ["range explicit cool", "heat_cool", 3, "cool", "range", false],
  ] as const)("validates stored targets: %s", (_label, activeMode, features, requested, target, expected) => {
    const state = {
      state: activeMode,
      attributes: {
        supported_features: features,
        hvac_modes: ["off", "heat", "cool", "heat_cool"],
      },
    } as any;
    expect(climateTargetCompatibleForConfiguration(state, target, requested)).toBe(expected);
  });
});
