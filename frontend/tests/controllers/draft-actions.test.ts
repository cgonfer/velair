import { describe, expect, it } from "vitest";

import { ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import { addBlock, setDraftBlockStart, toggleCopyTarget, toggleZoneTarget, updateDraftBlock } from "../../src/velair/controllers/draft-actions";
import type { BlockDraftSource, DraftScheduleBlock } from "../../src/velair/types";

function host() {
  const state = {
    _copyTargets: new Set<string>(),
    hass: { states: {} as Record<string, any> },
    _data: { configured_entities: ["climate.office", "climate.bedroom"] },
    _dirty: false,
    _draftBlocks: [{ action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 20 }],
    _saveMessage: "saved",
    _selectedEntity: "climate.office",
    _selectedWeekday: "monday",
    _temperatureUnit: () => "°C",
    _templateDraftBlocks: [] as DraftScheduleBlock[],
    _zoneTargets: new Set<string>(),
    _blocksForSource(source: BlockDraftSource) {
      return source === "template" ? this._templateDraftBlocks : this._draftBlocks;
    },
    _markBlocksDirty(source: BlockDraftSource) {
      if (source === "schedule") {
        this._dirty = true;
      }
    },
    _setBlocksForSource(source: BlockDraftSource, blocks: DraftScheduleBlock[]) {
      if (source === "template") {
        this._templateDraftBlocks = blocks;
        return;
      }
      this._draftBlocks = blocks;
    },
  };
  return state;
}

describe("draft actions controller", () => {
  it("adds blocks, marks schedule dirty, and clears save message", () => {
    const state = host();

    addBlock(state);

    expect(state._draftBlocks).toEqual([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 20 },
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "", start: "09:00", temperature: 20 },
    ]);
    expect(state._dirty).toBe(true);
    expect(state._saveMessage).toBeUndefined();
  });

  it("sorts edited start times only when requested", () => {
    const state = host();
    state._draftBlocks.push({ action: ACTION_SET_TEMPERATURE, hvac_mode: "cool", start: "12:00", temperature: 22 });

    setDraftBlockStart(state, 1, "07:00", { sort: true });

    expect(state._draftBlocks.map((block) => block.start)).toEqual(["07:00", "08:00"]);
  });

  it("uses a Fahrenheit default for an empty schedule", () => {
    const state = host();
    state._draftBlocks = [];
    state._temperatureUnit = () => "°F";

    addBlock(state);

    expect(state._draftBlocks[0]?.temperature).toBe(70);
  });

  it("guards copy and zone target toggles against invalid targets", () => {
    const state = host();

    toggleCopyTarget(state, "monday", true);
    toggleCopyTarget(state, "tuesday", true);
    toggleCopyTarget(state, "funday", true);
    toggleZoneTarget(state, "climate.office", true);
    toggleZoneTarget(state, "climate.bedroom", true);
    toggleZoneTarget(state, "climate.unknown", true);

    expect([...state._copyTargets]).toEqual(["tuesday"]);
    expect([...state._zoneTargets]).toEqual(["climate.bedroom"]);
  });

  it("uses the live range for a new block on a range-only climate", () => {
    const state = host();
    state._draftBlocks = [];
    state.hass.states["climate.office"] = {
      attributes: { supported_features: 2, target_temp_low: 19, target_temp_high: 24 },
    };

    addBlock(state);

    expect(state._draftBlocks[0]).toMatchObject({ target_temp_low: 19, target_temp_high: 24 });
    expect(state._draftBlocks[0].temperature).toBeUndefined();
  });

  it("asks for the new range when heat/cool is selected", () => {
    const state = host();
    state.hass.states["climate.office"] = {
      attributes: { supported_features: 3, hvac_modes: ["heat", "heat_cool"], target_temp_low: 19, target_temp_high: 24 },
    };

    updateDraftBlock(state, 0, "hvac_mode", "heat_cool");

    expect(state._draftBlocks[0]).toMatchObject({
      hvac_mode: "heat_cool",
      target_temp_low: "",
      target_temp_high: "",
    });
    expect(state._draftBlocks[0].temperature).toBeUndefined();
  });

  it("does not rewrite an existing scalar heat/cool block", () => {
    const state = host();
    state._draftBlocks[0] = {
      action: ACTION_SET_TEMPERATURE,
      hvac_mode: "heat_cool",
      start: "08:00",
      temperature: 21,
    };
    updateDraftBlock(state, 0, "temperature", "22");
    expect(state._draftBlocks[0]).toMatchObject({ temperature: "22", hvac_mode: "heat_cool" });
    expect(state._draftBlocks[0].target_temp_low).toBeUndefined();
  });

  it("preserves range drafts when an incompatible mode is selected", () => {
    const state = host();
    state.hass.states["climate.office"] = {
      attributes: { supported_features: 3, temperature: 22 },
    };
    state._draftBlocks[0] = {
      action: ACTION_SET_TEMPERATURE,
      hvac_mode: "heat_cool",
      start: "08:00",
      target_temp_low: 19,
      target_temp_high: 24,
    };

    updateDraftBlock(state, 0, "hvac_mode", "dry");

    expect(state._draftBlocks[0]).toMatchObject({ target_temp_low: 19, target_temp_high: 24, hvac_mode: "dry" });
    expect(state._draftBlocks[0].temperature).toBeUndefined();
  });
});


it("keeps range-only setpoints in every supported mode and in subsequent blocks", () => {
  const state = host();
  state._draftBlocks = [];
  state.hass.states["climate.office"] = {
    state: "heat", attributes: { supported_features: 394, hvac_modes: ["off", "heat", "cool", "auto"],
      target_temp_low: 19.5, target_temp_high: 24 },
  };
  addBlock(state);
  for (const mode of ["heat", "cool", "auto", "", "temperature_only"]) {
    updateDraftBlock(state, 0, "hvac_mode", mode);
    expect(state._draftBlocks[0]).toMatchObject({ target_temp_low: 19.5, target_temp_high: 24 });
    expect(state._draftBlocks[0].temperature).toBeUndefined();
  }
  updateDraftBlock(state, 0, "target_temp_low", "20");
  updateDraftBlock(state, 0, "target_temp_high", "23");
  addBlock(state);
  expect(state._draftBlocks.at(-1)).toMatchObject({ target_temp_low: "20", target_temp_high: "23" });
  state._draftBlocks.push({ action: "turn_off", start: "12:00" });
  addBlock(state);
  expect(state._draftBlocks.at(-1)).toMatchObject({ target_temp_low: 19.5, target_temp_high: 24 });
  expect(state._draftBlocks.at(-1)?.temperature).toBeUndefined();
});

it("lets templates select a range explicitly and preserves it when changing mode", () => {
  const state = host();
  addBlock(state, "template");
  updateDraftBlock(state, 0, "action", "target_range", "template");
  updateDraftBlock(state, 0, "target_temp_low", "18.5", "template");
  updateDraftBlock(state, 0, "target_temp_high", "24", "template");
  for (const mode of ["heat", "cool", "auto", "", "temperature_only", "dry"]) {
    updateDraftBlock(state, 0, "hvac_mode", mode, "template");
    expect(state._templateDraftBlocks[0]).toMatchObject({ target_temp_low: "18.5", target_temp_high: "24" });
    expect(state._templateDraftBlocks[0].temperature).toBeUndefined();
  }
});

it("defaults generic Heat/Cool to a pair when climates use different formats", () => {
  const state = host() as any;
  state._data.zones = Object.fromEntries(["office", "bedroom"].map((name, index) => [`climate.${name}`, { target_format_policy: { kind: "mixed", formats_by_mode: { heat_cool: index ? "range" : "single" }, invalid_modes: [], uncertain: false } }]));
  addBlock(state, "template");
  updateDraftBlock(state, 0, "hvac_mode", "heat_cool", "template");
  expect(state._templateDraftBlocks[0]).toMatchObject({ target_temp_low: "", target_temp_high: "" });
  updateDraftBlock(state, 0, "action", "target_scalar", "template");
  expect(state._templateDraftBlocks[0].temperature).toBe(21);
});
