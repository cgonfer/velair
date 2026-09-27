import { describe, expect, it } from "vitest";

import { ACTION_SET_CLIMATE_OPTIONS, ACTION_SET_HVAC_MODE, ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../../src/velair/constants";
import { keepTargetMismatch } from "../../src/velair/domain/block-guidance";
import type { DraftScheduleBlock, HassState } from "../../src/velair/types";

function climate(mode: string, features = 3): HassState {
  return { state: mode, attributes: { supported_features: features } } as HassState;
}

function block(start: string, mode = "", range = false): DraftScheduleBlock {
  return {
    action: ACTION_SET_TEMPERATURE,
    start,
    hvac_mode: mode,
    ...(range ? { target_temp_low: 20, target_temp_high: 24 } : { temperature: 19 }),
  };
}

describe("Keep target mode guidance", () => {
  it("flags the screenshot scenario using the previous scheduled mode", () => {
    const first = block("00:00", "heat_cool", true);
    const later = block("13:45");
    expect(keepTargetMismatch(later, [first, later], climate("heat"))).toEqual({
      mode: "heat_cool", source: "schedule", target: "scalar",
    });
  });

  it("can use a preceding explicit mode even when live state is unavailable", () => {
    const first = block("00:00", "heat_cool", true);
    const scalar = block("13:45");
    expect(keepTargetMismatch(scalar, [first, scalar])).toEqual({
      mode: "heat_cool", source: "schedule", target: "scalar",
    });
    const heating = block("00:00", "heat");
    const range = block("13:45", "", true);
    expect(keepTargetMismatch(range, [heating, range])).toEqual({
      mode: "heat", source: "schedule", target: "range",
    });
  });

  it("ignores remembered ranges in actions that do not send a target", () => {
    const modeOnly = {
      ...block("00:00", "heat_cool", true),
      action: ACTION_SET_HVAC_MODE,
    };
    const optionsOnly = {
      ...block("08:00", "", true),
      action: ACTION_SET_CLIMATE_OPTIONS,
      preset_mode: "boost",
    };
    const scalar = block("13:45");
    expect(keepTargetMismatch(scalar, [modeOnly, optionsOnly, scalar]))
      .toBeUndefined();
  });

  it("uses the live mode when no earlier block selected a mode", () => {
    const later = block("13:45");
    expect(keepTargetMismatch(later, [later], climate("heat_cool"))).toEqual({
      mode: "heat_cool", source: "current", target: "scalar",
    });
  });

  it("warns when a range would preserve heat or cool", () => {
    const later = block("13:45", "", true);
    for (const mode of ["heat", "cool"]) {
      expect(keepTargetMismatch(later, [later], climate(mode))).toEqual({
        mode, source: "current", target: "range",
      });
    }
  });

  it("does not warn for compatible targets or when an earlier block turns off", () => {
    const scalar = block("13:45");
    const range = block("13:45", "", true);
    expect(keepTargetMismatch(scalar, [scalar], climate("heat"))).toBeUndefined();
    expect(keepTargetMismatch(range, [range], climate("heat_cool"))).toBeUndefined();
    expect(keepTargetMismatch(scalar, [scalar], climate("off"))).toBeUndefined();
    expect(keepTargetMismatch(scalar, [
      block("00:00", "heat_cool", true),
      { action: ACTION_TURN_OFF, start: "12:00", hvac_mode: "" },
      scalar,
    ], climate("heat_cool"))).toBeUndefined();
  });

  it("does not warn for options-only or explicit-mode actions", () => {
    const scalar = block("13:45");
    expect(keepTargetMismatch({ ...scalar, action: ACTION_SET_CLIMATE_OPTIONS,
      preset_mode: "boost" }, [scalar], climate("heat_cool"))).toBeUndefined();
    expect(keepTargetMismatch({ ...scalar, hvac_mode: "heat" }, [scalar], climate("heat_cool"))).toBeUndefined();
  });

  it("does not invent a native-range mismatch when the climate lacks range support", () => {
    const scalar = block("13:45");
    expect(keepTargetMismatch(scalar, [scalar], climate("heat_cool", 1))).toBeUndefined();
  });
});
