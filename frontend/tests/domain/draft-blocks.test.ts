import { describe, expect, it } from "vitest";

import { ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../../src/velair/constants";
import {
  addDraftBlock,
  clampBlocksToTemperatureLimits,
  draftBlockTemperatureError,
  filterBlocksForClimateOptions,
  firstUnsupportedModeBlock,
  normalizeDraftBlocks,
  updateDraftBlock,
} from "../../src/velair/domain/draft-blocks";
import type { DraftScheduleBlock } from "../../src/velair/types";

const temperatureError = (block: DraftScheduleBlock) =>
  draftBlockTemperatureError(block, {
    maxTemperature: 25,
    minTemperature: 10,
    rangeError: "range",
    rangeOrderError: "order",
    stepError: "step",
    temperatureStep: 0.5,
  });

const normalize = (blocks: DraftScheduleBlock[]) =>
  normalizeDraftBlocks(blocks, {
    duplicateStartError: (start) => `duplicate:${start}`,
    invalidStartError: (start) => `invalid-start:${start}`,
    invalidTemperatureError: (start, error) => `invalid-temperature:${start}:${error}`,
    temperatureError,
  });

describe("draft block domain", () => {
  it("adds a block using the previous temperature and provided start", () => {
    expect(addDraftBlock([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 19.5 },
    ], "09:00")).toEqual([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 19.5 },
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "", start: "09:00", temperature: 19.5 },
    ]);
  });

  it("keeps action and mode consistent when mode changes to or from off", () => {
    const blocks = [{ action: ACTION_SET_TEMPERATURE, hvac_mode: "", start: "08:00", temperature: 21 }];

    expect(updateDraftBlock(blocks, 0, "hvac_mode", "off")[0]).toMatchObject({
      action: ACTION_TURN_OFF,
      hvac_mode: "",
    });
    expect(updateDraftBlock(blocks, 0, "hvac_mode", "cool")[0]).toMatchObject({
      action: ACTION_SET_TEMPERATURE,
      hvac_mode: "cool",
    });
  });

  it("normalizes sorted blocks and rejects invalid user input", () => {
    expect(normalize([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "18:00", temperature: 20 },
      { action: ACTION_TURN_OFF, hvac_mode: "", start: "08:00", temperature: "" },
    ])).toEqual({
      ok: true,
      blocks: [
        { action: ACTION_TURN_OFF, start: "08:00" },
        { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "18:00", temperature: 20 },
      ],
    });

    expect(normalize([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "25:00", temperature: 20 },
    ])).toEqual({ ok: false, error: "invalid-start:25:00" });
    expect(normalize([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 20 },
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 21 },
    ])).toEqual({ ok: false, error: "duplicate:08:00" });
    expect(normalize([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 20.25 },
    ])).toEqual({ ok: false, error: "invalid-temperature:08:00:step" });
  });

  it("normalizes temperature ranges without sending a scalar target", () => {
    expect(normalize([{
      action: ACTION_SET_TEMPERATURE,
      hvac_mode: "heat_cool",
      start: "08:00",
      target_temp_low: "19",
      target_temp_high: "24",
    }])).toEqual({
      ok: true,
      blocks: [{
        action: ACTION_SET_TEMPERATURE,
        hvac_mode: "heat_cool",
        start: "08:00",
        target_temp_low: 19,
        target_temp_high: 24,
      }],
    });
    expect(temperatureError({
      action: ACTION_SET_TEMPERATURE,
      hvac_mode: "heat_cool",
      start: "08:00",
      target_temp_low: 24,
      target_temp_high: 19,
    })).toBe("order");
  });

  it("copies and clamps both limits of a temperature range", () => {
    const range = {
      action: ACTION_SET_TEMPERATURE,
      hvac_mode: "heat_cool",
      start: "08:00",
      target_temp_low: 5,
      target_temp_high: 35,
    };
    expect(addDraftBlock([range], "12:00")[1]).toMatchObject({
      target_temp_low: 5,
      target_temp_high: 35,
    });
    expect(clampBlocksToTemperatureLimits([range], 10, 30)[0]).toMatchObject({
      target_temp_low: 10,
      target_temp_high: 30,
    });
  });

  it("validates temperature steps against the zero-anchored grid", () => {
    const options = {
      maxTemperature: 95,
      minTemperature: 41.3,
      rangeError: "range",
      stepError: "step",
      temperatureStep: 1,
    };

    expect(draftBlockTemperatureError(
      { action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 42 },
      options,
    )).toBeUndefined();
    expect(draftBlockTemperatureError(
      { action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 42.2 },
      options,
    )).toBe("step");
  });

  it("skips step validation when Home Assistant publishes no valid step", () => {
    expect(draftBlockTemperatureError(
      { action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 42.17 },
      {
        maxTemperature: 95,
        minTemperature: 41,
        rangeError: "range",
        stepError: "step",
      },
    )).toBeUndefined();
  });

  it("normalizes optional climate settings for temperature blocks only", () => {
    expect(normalize([
      {
        action: ACTION_SET_TEMPERATURE,
        fan_mode: "low",
        humidity: "45",
        hvac_mode: "cool",
        preset_mode: "eco",
        start: "22:00",
        swing_horizontal_mode: "left",
        swing_mode: "vertical",
        temperature: 24,
      },
      {
        action: ACTION_TURN_OFF,
        fan_mode: "high",
        humidity: "55",
        preset_mode: "boost",
        start: "23:00",
        temperature: "",
      },
    ])).toEqual({
      ok: true,
      blocks: [
        {
          action: ACTION_SET_TEMPERATURE,
          fan_mode: "low",
          humidity: 45,
          hvac_mode: "cool",
          preset_mode: "eco",
          start: "22:00",
          swing_horizontal_mode: "left",
          swing_mode: "vertical",
          temperature: 24,
        },
        { action: ACTION_TURN_OFF, start: "23:00" },
      ],
    });
  });

  it("clamps template blocks to entity limits and detects unsupported modes", () => {
    expect(clampBlocksToTemperatureLimits([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 5 },
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "cool", start: "12:00", temperature: 40 },
      { action: ACTION_TURN_OFF, start: "22:00" },
    ], 10, 30)).toEqual([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 10 },
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "cool", start: "12:00", temperature: 30 },
      { action: ACTION_TURN_OFF, start: "22:00" },
    ]);

    expect(firstUnsupportedModeBlock([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00" },
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "cool", start: "12:00" },
    ], ["heat"])).toMatchObject({ hvac_mode: "cool", start: "12:00" });
  });

  it("filters optional climate settings using the target climate capabilities", () => {
    expect(filterBlocksForClimateOptions([
      {
        action: ACTION_SET_TEMPERATURE,
        fan_mode: "quiet",
        humidity: 45,
        hvac_mode: "cool",
        preset_mode: "eco",
        start: "08:00",
        swing_horizontal_mode: "left",
        swing_mode: "vertical",
        temperature: 24,
      },
      {
        action: ACTION_SET_TEMPERATURE,
        fan_mode: "turbo",
        humidity: 90,
        hvac_mode: "cool",
        preset_mode: "boost",
        start: "12:00",
        swing_horizontal_mode: "right",
        swing_mode: "horizontal",
        temperature: 23,
      },
      {
        action: ACTION_TURN_OFF,
        fan_mode: "quiet",
        humidity: 45,
        start: "23:00",
      },
    ], {
      fanModes: ["quiet"],
      humidityLimits: [30, 60],
      presetModes: ["eco"],
      swingHorizontalModes: ["left"],
      swingModes: ["vertical"],
    })).toEqual([
      {
        action: ACTION_SET_TEMPERATURE,
        fan_mode: "quiet",
        humidity: 45,
        hvac_mode: "cool",
        preset_mode: "eco",
        start: "08:00",
        swing_horizontal_mode: "left",
        swing_mode: "vertical",
        temperature: 24,
      },
      {
        action: ACTION_SET_TEMPERATURE,
        hvac_mode: "cool",
        start: "12:00",
        temperature: 23,
      },
      { action: ACTION_TURN_OFF, start: "23:00" },
    ]);
  });
});
