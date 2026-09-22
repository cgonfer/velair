import { describe, expect, it } from "vitest";
import {
  climateCardPublishedHvacModes,
  climateCardPublishedTemperatureGrid,
  climateCardRuntimeBlocksThermostat,
  climateCardTarget,
  climateCardTargetPayload,
} from "../../src/velair/domain/climate-card-controls";
import type { HassState } from "../../src/velair/types";

function state(attributes: Record<string, unknown>, mode = "heat"): HassState {
  return { state: mode, attributes } as HassState;
}

describe("climate card thermostat controls", () => {
  it("uses only a fully published target grid and aligns scalar adjustments to it", () => {
    const climate = state({ temperature: 20.3, min_temp: 7, max_temp: 35, target_temp_step: 0.5 });
    expect(climateCardPublishedTemperatureGrid(climate)).toEqual({ minimum: 7, maximum: 35, step: 0.5 });
    expect(climateCardTargetPayload(climate, "temperature", 1)).toEqual({ temperature: 20.5 });
    expect(climateCardTargetPayload(climate, "temperature", -1)).toEqual({ temperature: 20 });
    expect(climateCardTargetPayload(state({ temperature: 21, min_temp: 7, max_temp: 35 }), "temperature", 1)).toBeUndefined();
  });

  it("matches Home Assistant's target-step fallback when the entity omits it", () => {
    const climate = state({ temperature: 20, min_temp: 7, max_temp: 35 });
    expect(climateCardPublishedTemperatureGrid(climate, "°C")).toEqual({ minimum: 7, maximum: 35, step: 0.5 });
    expect(climateCardTargetPayload(climate, "temperature", 1, "°C")).toEqual({ temperature: 20.5 });
    expect(climateCardPublishedTemperatureGrid(climate, "°F")).toEqual({ minimum: 7, maximum: 35, step: 1 });
    expect(climateCardTargetPayload(climate, "temperature", -1, "°F")).toEqual({ temperature: 19 });
  });

  it("uses a configured fallback before the native unit fallback", () => {
    const climate = state({ temperature: 20, min_temp: 7, max_temp: 35 });
    expect(climateCardPublishedTemperatureGrid(climate, "°C", 1)).toEqual({
      minimum: 7,
      maximum: 35,
      step: 1,
    });
    expect(climateCardTargetPayload(climate, "temperature", 1, "°C", 1)).toEqual({
      temperature: 21,
    });
  });

  it("uses a native Fahrenheit configured step without converting it again", () => {
    const climate = state({ temperature: 68, min_temp: 41, max_temp: 95 });
    expect(climateCardPublishedTemperatureGrid(climate, "°F", 0.9)).toEqual({
      minimum: 41,
      maximum: 95,
      step: 0.9,
    });
    expect(climateCardTargetPayload(climate, "temperature", 1, "°F", 0.9)).toEqual({
      temperature: 68.9,
    });
  });

  it("uses the effective converted step for card adjustments instead of a stale published step", () => {
    const climate = state({
      temperature: 68,
      min_temp: 41,
      max_temp: 95,
      target_temp_step: 0.5,
      unit_of_measurement: "°C",
    });
    expect(climateCardPublishedTemperatureGrid(climate, "°F", 0.9)).toEqual({
      minimum: 41,
      maximum: 95,
      step: 0.9,
    });
    expect(climateCardTargetPayload(climate, "temperature", 1, "°F", 0.9)).toEqual({
      temperature: 68.9,
    });
    expect(climateCardTargetPayload(climate, "temperature", -1, "°F", 0.9)).toEqual({
      temperature: 67.1,
    });
  });

  it("respects exact decimal steps and target limits", () => {
    const climate = state({ temperature: 20.2, min_temp: 5, max_temp: 20.4, target_temp_step: 0.2 });
    expect(climateCardTargetPayload(climate, "temperature", 1)).toEqual({ temperature: 20.4 });
    expect(climateCardTargetPayload({ ...climate, attributes: { ...climate.attributes, temperature: 20.4 } }, "temperature", 1)).toBeUndefined();
  });

  it("keeps both boundaries in every native heat_cool range update", () => {
    const climate = state({
      target_temp_low: 18,
      target_temp_high: 24,
      min_temp: 7,
      max_temp: 35,
      target_temp_step: 1,
      supported_features: 2,
    }, "heat_cool");
    expect(climateCardTarget(climate)).toEqual({ kind: "range", low: 18, high: 24 });
    expect(climateCardTargetPayload(climate, "target_temp_low", 1)).toEqual({ target_temp_low: 19, target_temp_high: 24 });
    expect(climateCardTargetPayload(climate, "target_temp_high", -1)).toEqual({ target_temp_low: 18, target_temp_high: 23 });
  });

  it("does not allow range boundaries to cross", () => {
    const climate = state({
      target_temp_low: 20,
      target_temp_high: 20,
      min_temp: 7,
      max_temp: 35,
      target_temp_step: 1,
      supported_features: 2,
    }, "heat_cool");
    expect(climateCardTargetPayload(climate, "target_temp_low", 1)).toBeUndefined();
    expect(climateCardTargetPayload(climate, "target_temp_high", -1)).toBeUndefined();
  });

  it("never degrades an incomplete heat_cool range to a scalar target", () => {
    const climate = state({
      temperature: 21,
      target_temp_low: 18,
      min_temp: 7,
      max_temp: 35,
      target_temp_step: 0.5,
      supported_features: 3,
    }, "heat_cool");
    expect(climateCardTarget(climate)).toBeUndefined();
    expect(climateCardTargetPayload(climate, "temperature", 1)).toBeUndefined();
  });

  it("does not expose a scalar target when the entity only advertises ranges", () => {
    const climate = state({
      temperature: 21,
      target_temp_low: 18,
      target_temp_high: 24,
      min_temp: 7,
      max_temp: 35,
      target_temp_step: 0.5,
      supported_features: 2,
    }, "heat");
    expect(climateCardTarget(climate)).toBeUndefined();
    expect(climateCardTargetPayload(climate, "temperature", 1)).toBeUndefined();
  });

  it("returns only distinct HVAC modes published by the entity", () => {
    expect(climateCardPublishedHvacModes(state({ hvac_modes: ["heat", "cool", "heat", 42] })))
      .toEqual(["heat", "cool"]);
  });

  it("allows only the exclusive Manual-adjustment pause to use thermostat controls", () => {
    const manualAdjustment = {
      state: "paused" as const,
      pause_count: 1,
      pause_ids: ["velair.manual_adjustment"],
    };
    expect(climateCardRuntimeBlocksThermostat("manual", manualAdjustment)).toBe(false);
    expect(climateCardRuntimeBlocksThermostat("automatic", manualAdjustment)).toBe(true);
    expect(climateCardRuntimeBlocksThermostat("manual", {
      state: "paused", pause_count: 1, pause_ids: ["window.open"],
    })).toBe(true);
    expect(climateCardRuntimeBlocksThermostat("manual", {
      state: "paused", pause_count: 2, pause_ids: ["velair.manual_adjustment", "window.open"],
    })).toBe(true);
  });

  it("fails closed for incomplete pause metadata and blocks boost and stopped states", () => {
    expect(climateCardRuntimeBlocksThermostat("manual", { state: "paused" })).toBe(true);
    expect(climateCardRuntimeBlocksThermostat("manual", { state: "boost" })).toBe(true);
    expect(climateCardRuntimeBlocksThermostat("manual", { state: "stopped" })).toBe(true);
    expect(climateCardRuntimeBlocksThermostat("manual", { state: "scheduled" })).toBe(false);
  });
});
