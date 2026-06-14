import { describe, expect, it } from "vitest";

import { ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../../src/velair/constants";
import {
  addDraftBlock,
  clampBlocksToTemperatureLimits,
  draftBlockTemperatureError,
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
});
