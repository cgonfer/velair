import { describe, expect, it, vi } from "vitest";

import { ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import { applySelectedDayToZones, saveSelectedDay } from "../../src/velair/controllers/schedule-actions";
import type { ScheduleBlock, ScheduleResponse } from "../../src/velair/types";

const response = { configured_entities: [], zones: {}, settings: { first_weekday: "monday", zone_order: [] } } as unknown as ScheduleResponse;

function host(normalizedBlocks: ScheduleBlock[] = [{ action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 21, hvac_mode: "heat" }]) {
  const api = {
    copyDaySchedule: vi.fn(),
    setDailySchedule: vi.fn().mockResolvedValue(response),
  };
  const state = {
    _applyingZones: false,
    _copying: false,
    _copyTargets: new Set<string>(),
    _dirty: true,
    _draftBlocks: [],
    _error: undefined as string | undefined,
    _saveMessage: "saved",
    _saving: false,
    _selectedEntity: "climate.office",
    _selectedWeekday: "monday",
    _shownSuccess: [] as string[],
    _zoneTargets: new Set<string>(),
    _api: () => api,
    _applyScheduleData: vi.fn(),
    _blocksForSource: () => [],
    _clampBlocksForEntity(blocks: ScheduleBlock[], entityId: string) {
      if (entityId === "climate.bedroom") {
        return blocks.map((block) => ({ ...block, temperature: Math.min(19, Number(block.temperature)) }));
      }
      return blocks;
    },
    _climateSupportedModes(entityId: string) {
      return entityId === "climate.cool_only" ? ["cool", "off"] : ["heat", "off"];
    },
    _entityTemperatureLimits: () => [10, 30] as [number, number],
    _friendlyEntityName: (entityId: string) => entityId,
    _modeLabel: (mode: string) => mode,
    _normalizeDraftBlocks: () => ({ ok: true as const, blocks: normalizedBlocks }),
    _showSuccess(message: string) {
      this._shownSuccess.push(message);
    },
    _t: (key: string, replacements?: Record<string, string | number>) => replacements ? `${key}:${JSON.stringify(replacements)}` : key,
    _temperatureError: () => undefined,
    _unsupportedModeError(blocks: Array<Pick<ScheduleBlock, "action" | "hvac_mode" | "start">>, entityId: string) {
      const unsupported = blocks.find((block) => block.hvac_mode && !this._climateSupportedModes(entityId).includes(block.hvac_mode));
      return unsupported ? `unsupported ${unsupported.hvac_mode} for ${entityId}` : undefined;
    },
  };
  return { api, state };
}

describe("schedule actions controller", () => {
  it("saves the selected day through the API and clears dirty state", async () => {
    const { api, state } = host();

    await saveSelectedDay(state);

    expect(api.setDailySchedule).toHaveBeenCalledWith("climate.office", "monday", [
      { action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 21, hvac_mode: "heat" },
    ]);
    expect(state._dirty).toBe(false);
    expect(state._shownSuccess).toEqual(["saved"]);
    expect(state._saving).toBe(false);
  });

  it("rejects unsupported modes before calling the backend", async () => {
    const { api, state } = host([{ action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 21, hvac_mode: "cool" }]);

    await saveSelectedDay(state);

    expect(api.setDailySchedule).not.toHaveBeenCalled();
    expect(state._error).toBe("unsupported cool for climate.office");
  });

  it("applies a selected day to target zones with per-entity clamping", async () => {
    const { api, state } = host();
    state._zoneTargets = new Set(["climate.bedroom"]);

    await applySelectedDayToZones(state);

    expect(api.setDailySchedule).toHaveBeenNthCalledWith(1, "climate.office", "monday", [
      { action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 21, hvac_mode: "heat" },
    ]);
    expect(api.setDailySchedule).toHaveBeenNthCalledWith(2, "climate.bedroom", "monday", [
      { action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 19, hvac_mode: "heat" },
    ]);
    expect(state._zoneTargets.size).toBe(0);
  });
});
