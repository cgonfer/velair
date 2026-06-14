import { describe, expect, it } from "vitest";

import { ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import { addBlock, setDraftBlockStart, toggleCopyTarget, toggleZoneTarget } from "../../src/velair/controllers/draft-actions";
import type { BlockDraftSource, DraftScheduleBlock } from "../../src/velair/types";

function host() {
  const state = {
    _copyTargets: new Set<string>(),
    _data: { configured_entities: ["climate.office", "climate.bedroom"] },
    _dirty: false,
    _draftBlocks: [{ action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 20 }],
    _saveMessage: "saved",
    _selectedEntity: "climate.office",
    _selectedWeekday: "monday",
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
});
