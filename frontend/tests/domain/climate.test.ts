import { describe, expect, it } from "vitest";

import {
  climateTargetCompatibleForConfiguration,
  effectiveClimateHvacModeForEnsureOn,
  climateRequiresRangeTarget,
  climateSupportsRangeTarget,
  entityTemperatureStep,
} from "../../src/velair/domain/climate";
import type { TargetFormatPolicy } from "../../src/velair/types";

describe("climate target capabilities", () => {
  it("resolves Off fallback from the mapped target policy and prefers mixed Heat/Cool", () => {
    const state = { state: "off", attributes: { supported_features: 3, hvac_modes: ["off", "heat", "cool", "heat_cool"] } } as any;
    const policy = { kind: "mixed", formats_by_mode: { heat: "range", cool: "single", heat_cool: "single" } } as TargetFormatPolicy;
    expect(effectiveClimateHvacModeForEnsureOn(state, undefined, "range", policy)).toBe("heat");
    const both = { ...policy, formats_by_mode: { ...policy.formats_by_mode, heat_cool: "range" as const } };
    expect(effectiveClimateHvacModeForEnsureOn(state, undefined, "range", both)).toBe("heat_cool");
    expect(effectiveClimateHvacModeForEnsureOn(state, "heat", "range", both)).toBe("heat");
    expect(effectiveClimateHvacModeForEnsureOn({ ...state, state: "cool" }, undefined, "range", both)).toBe("cool");
    expect(effectiveClimateHvacModeForEnsureOn(state, undefined, "range", { ...both, kind: "range" })).toBe("heat");
  });
  it("converts a published step when the entity still reports the other temperature unit", () => {
    expect(entityTemperatureStep({
      attributes: {
        min_temp: 5,
        max_temp: 35,
        target_temp_step: 0.5,
        unit_of_measurement: "°C",
      },
    } as any, "°F")).toBeCloseTo(0.9);
    expect(entityTemperatureStep({
      attributes: {
        min_temp: 41,
        max_temp: 95,
        target_temp_step: 1,
        unit_of_measurement: "°F",
      },
    } as any, "°C")).toBeCloseTo(5 / 9);
  });

  it("infers a stale temperature grid unit but preserves normal published steps", () => {
    expect(entityTemperatureStep({
      attributes: { min_temp: 5, max_temp: 35, target_temp_step: 0.5 },
    } as any, "°F")).toBeCloseTo(0.9);
    expect(entityTemperatureStep({
      attributes: { min_temp: 41, max_temp: 95, target_temp_step: 1 },
    } as any, "°F")).toBe(1);
    expect(entityTemperatureStep({
      attributes: { min_temp: 41, max_temp: 95, target_temp_step: 1 },
    } as any, "°C")).toBeCloseTo(5 / 9);
    expect(entityTemperatureStep({
      attributes: { min_temp: 5, max_temp: 35, target_temp_step: 0.5 },
    } as any, "°C")).toBe(0.5);
  });

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
        hvac_modes: ["off", "heat_cool", "heat", "cool"],
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
    expect(effectiveClimateHvacModeForEnsureOn(off, "", "range")).toBeUndefined();
    expect(effectiveClimateHvacModeForEnsureOn({ ...off, state: "heat_cool" })).toBe("heat_cool");
    expect(effectiveClimateHvacModeForEnsureOn(off, "heat")).toBe("heat");
  });

  it("returns no range fallback when no compatible non-off mode exists", () => {
    const rangeWithoutHeatCool = {
      state: "off",
      attributes: { supported_features: 3, hvac_modes: ["off", "heat", "cool"] },
    } as any;
    const scalarWithoutScalarMode = {
      state: "off",
      attributes: { supported_features: 3, hvac_modes: ["off", "heat_cool"] },
    } as any;
    expect(effectiveClimateHvacModeForEnsureOn(rangeWithoutHeatCool, undefined, "range")).toBeUndefined();
    expect(climateTargetCompatibleForConfiguration(scalarWithoutScalarMode, "scalar")).toBe(false);
    expect(climateTargetCompatibleForConfiguration({
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


describe("range-only climate compatibility (#51)", () => {
  const attributes = { supported_features: 394, hvac_modes: ["off", "dry", "cool", "heat", "auto", "fan_only"],
    min_temp: 16, max_temp: 30, target_temp_step: 0.5, temperature: 22 };
  it.each(["heat", "cool", "auto"])("accepts both limits in %s and rejects a scalar", (mode) => {
    const state = { state: mode, attributes } as any;
    expect(climateTargetCompatibleForConfiguration(state, "range", mode)).toBe(true);
    expect(climateTargetCompatibleForConfiguration(state, "scalar", mode)).toBe(false);
    expect(climateRequiresRangeTarget(state)).toBe(true);
  });
  it("selects the first compatible mode from Off and rejects known range-only scalars", () => {
    const off = { state: "off", attributes } as any;
    expect(effectiveClimateHvacModeForEnsureOn(off, "", "range")).toBe("cool");
    expect(climateTargetCompatibleForConfiguration(off, "scalar", "heat")).toBe(false);
    for (const mode of ["dry", "fan_only", "heat_cool"]) {
      expect(climateTargetCompatibleForConfiguration(off, "range", mode)).toBe(false);
    }
  });
  it("does not extend the hidden-Off scalar exception to heat_cool", () => {
    const state = { state: "off", attributes: { supported_features: 392, hvac_modes: ["heat_cool"] } } as any;
    expect(climateTargetCompatibleForConfiguration(state, "scalar", "heat_cool")).toBe(false);
  });
});
