import { describe, expect, it, vi } from "vitest";

import { ACTION_SET_CLIMATE_OPTIONS, ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import { applySelectedDayToZones, clampBlocksForEntity, copySelectedDay, saveSelectedDay, unsupportedModeError } from "../../src/velair/controllers/schedule-actions";
import type { DraftScheduleBlock, ScheduleBlock, ScheduleResponse } from "../../src/velair/types";

const response = { configured_entities: [], zones: {}, settings: { first_weekday: "monday", zone_order: [] } } as unknown as ScheduleResponse;

function host(normalizedBlocks: ScheduleBlock[] = [{ action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 21, hvac_mode: "heat" }]) {
  const api = {
    copyDaySchedule: vi.fn().mockResolvedValue(response),
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
      return clampBlocksForEntity(this, blocks, entityId);
    },
    _climateSupportedModes(entityId: string) {
      return entityId === "climate.cool_only" ? ["cool", "off"] : ["heat", "off"];
    },
    _entityFanModeOptions: (entityId: string) => entityId === "climate.bedroom" ? ["quiet"] : ["quiet", "turbo"],
    _entityHumidityLimits: (entityId: string) => entityId === "climate.bedroom" ? undefined : [30, 70] as [number, number],
    _entityPresetModeOptions: (entityId: string) => entityId === "climate.bedroom" ? [] : ["eco"],
    _entitySwingHorizontalModeOptions: (entityId: string) => entityId === "climate.bedroom" ? [] : ["left"],
    _entitySwingModeOptions: (entityId: string) => entityId === "climate.bedroom" ? [] : ["vertical"],
    _entityTemperatureLimits: (entityId?: string) => entityId === "climate.bedroom" ? [10, 19] as [number, number] : [10, 30] as [number, number],
    _friendlyEntityName: (entityId: string) => entityId,
    _modeLabel: (mode: string) => mode,
    _normalizeDraftBlocks: () => ({ ok: true as const, blocks: normalizedBlocks }),
    _showSuccess(message: string) {
      this._shownSuccess.push(message);
    },
    _t: (key: string, replacements?: Record<string, string | number>) => replacements ? `${key}:${JSON.stringify(replacements)}` : key,
    _temperatureError: () => undefined,
    _unsupportedModeError(blocks: Array<ScheduleBlock | DraftScheduleBlock>, entityId: string) {
      const unsupported = blocks.find((block) => block.hvac_mode && !this._climateSupportedModes(entityId).includes(block.hvac_mode));
      return unsupported ? `unsupported ${unsupported.hvac_mode} for ${entityId}` : undefined;
    },
  };
  return { api, state };
}

describe("schedule actions controller", () => {
  it("preserves a newer day draft when navigation occurs during source save", async () => {
    const { state, api } = host();
    state._copyTargets = new Set(["tuesday"]);
    api.setDailySchedule.mockImplementation(async () => {
      state._selectedWeekday = "friday";
      return response;
    });
    await copySelectedDay(state as never);
    expect(api.copyDaySchedule).not.toHaveBeenCalled();
    expect(state._dirty).toBe(true);
    expect(state._applyScheduleData).not.toHaveBeenCalled();
  });

  it("preserves a newer draft when navigation occurs during atomic cross-climate copying", async () => {
    const { state, api } = host();
    state._dirty = false;
    state._zoneTargets = new Set(["climate.bedroom", "climate.office"]);
    api.copyDaySchedule.mockImplementation(async () => {
      state._selectedWeekday = "friday"; state._dirty = true; return response;
    });
    await applySelectedDayToZones(state as never);
    expect(api.copyDaySchedule).toHaveBeenCalledTimes(1);
    expect(api.setDailySchedule).not.toHaveBeenCalled();
    expect(state._dirty).toBe(true);
    expect(state._zoneTargets.size).toBe(2);
    expect(state._applyScheduleData).not.toHaveBeenCalled();
  });
  it("saves a dirty full reference before cloning without validating shared raw target steps locally", async () => {
    const { state, api } = host();
    Object.assign(state, { _draftTemplateLink: { mode: "full", template_key: "work" }, _draftConfigurationRevision: 3,
      _data: { ...response, configuration_revision: 3 }, _copyTargets: new Set(["tuesday"]) });
    state._normalizeDraftBlocks = vi.fn(() => ({ ok: false, error: "wrong local step" })) as never;
    api.setDailySchedule.mockResolvedValue({ ...response, configuration_revision: 4 });
    api.copyDaySchedule.mockResolvedValue(response);
    await copySelectedDay(state as never);
    expect(state._normalizeDraftBlocks).not.toHaveBeenCalled();
    expect(api.setDailySchedule).toHaveBeenCalledWith("climate.office", "monday", [], {
      expected_revision: 3, template_link: { mode: "full", template_key: "work" },
    });
    expect(api.copyDaySchedule).toHaveBeenCalledWith("climate.office", "monday", ["tuesday"], { expected_revision: 4 });
    expect(state._error).toBeUndefined();
  });

  it.each(["hours", "full"])("clones a saved %s link across climates in one backend transaction without materializing", async (mode) => {
    const { state, api } = host();
    Object.assign(state, { _dirty: false, _draftTemplateLink: mode === "full" ? { mode, template_key: "work" } : { mode, template_key: "work", bindings: { a: { preset_key: "night" } } },
      _data: { ...response, configuration_revision: 3 }, _zoneTargets: new Set(["climate.bedroom", "climate.other"]) });
    api.copyDaySchedule.mockResolvedValue({ ...response, configuration_revision: 4 });
    state._clampBlocksForEntity = vi.fn(() => { throw new Error("Do not adapt raw shared refs in frontend"); });
    await applySelectedDayToZones(state as never);
    expect(api.setDailySchedule).not.toHaveBeenCalled();
    expect(api.copyDaySchedule).toHaveBeenCalledWith("climate.office", "monday", ["monday"], {
      target_entity_ids: ["climate.bedroom", "climate.other"], expected_revision: 3,
    });
    expect(state._clampBlocksForEntity).not.toHaveBeenCalled();
    expect(state._error).toBeUndefined();
    expect(state._zoneTargets.size).toBe(0);
  });
  it("retains draft and targets on atomic clone incompatibility", async () => {
    const { state, api } = host();
    Object.assign(state, { _dirty: false, _draftTemplateLink: { mode: "full", template_key: "work" },
      _data: { ...response, configuration_revision: 3 }, _zoneTargets: new Set(["climate.bedroom"]) });
    api.copyDaySchedule.mockRejectedValue({ message: "Incompatible target" });
    await applySelectedDayToZones(state as never);
    expect(api.setDailySchedule).not.toHaveBeenCalled();
    expect((state as any)._draftTemplateLink).toEqual({ mode: "full", template_key: "work" });
    expect(state._zoneTargets.size).toBe(1);
    expect(state._error).toContain("Incompatible target");
    expect(state._applyScheduleData).not.toHaveBeenCalled();
  });
  it("accepts supported range modes and Keep on an active range-only climate", () => {
    const { state } = host();
    (state as any).hass = {
      states: {
        "climate.office": {
          state: "heat_cool",
          attributes: { supported_features: 2 },
        },
      },
    };
    state._climateSupportedModes = () => ["heat", "cool", "heat_cool", "off"];

    expect(unsupportedModeError(state as any, [
      { action: ACTION_SET_TEMPERATURE, start: "08:00", hvac_mode: "heat_cool" },
    ], "climate.office")).toBeUndefined();
    expect(unsupportedModeError(state as any, [
      { action: ACTION_SET_TEMPERATURE, start: "08:00" },
    ], "climate.office")).toBeUndefined();
  });

  it("rejects a target shape not supported by the climate", () => {
    const { state } = host();
    (state as any).hass = {
      states: {
        "climate.office": { attributes: { friendly_name: "Office", supported_features: 2 } },
      },
    };
    state._climateSupportedModes = () => ["heat_cool"];

    expect(unsupportedModeError(state as any, [{
      action: ACTION_SET_TEMPERATURE,
      start: "08:00",
      temperature: 21,
      hvac_mode: "heat_cool",
    }], "climate.office")).toContain("unsupportedSingleTargetForClimate");

    (state as any).hass.states["climate.office"].attributes.supported_features = 1;
    expect(unsupportedModeError(state as any, [{
      action: ACTION_SET_TEMPERATURE,
      start: "08:00",
      target_temp_low: 19,
      target_temp_high: 24,
    }], "climate.office")).toContain("unsupportedRangeTargetForClimate");
  });

  it("rejects a scalar target in range-capable heat/cool mode", () => {
    const { state } = host();
    (state as any).hass = {
      states: {
        "climate.office": {
          state: "heat_cool",
          attributes: { friendly_name: "Office", supported_features: 3 },
        },
      },
    };
    state._climateSupportedModes = () => ["heat", "cool", "heat_cool", "off"];

    expect(unsupportedModeError(state as any, [{
      action: ACTION_SET_TEMPERATURE,
      start: "08:00",
      temperature: 22,
      hvac_mode: "heat_cool",
    }], "climate.office")).toContain("unsupportedSingleTargetForClimate");
  });

  it("accepts an explicit scalar mode while an off climate hides its target feature", () => {
    const { state } = host();
    (state as any).hass = {
      states: {
        "climate.office": {
          state: "off",
          attributes: {
            friendly_name: "Office",
            hvac_modes: ["off", "heat", "cool", "heat_cool"],
            supported_features: 392,
          },
        },
      },
    };
    state._climateSupportedModes = () => ["off", "heat", "cool", "heat_cool"];

    expect(unsupportedModeError(state as any, [{
      action: ACTION_SET_TEMPERATURE,
      start: "00:00",
      temperature: 20,
      hvac_mode: "heat",
    }], "climate.office")).toBeUndefined();
  });

  it("keeps scalar-only heat/cool climates compatible", () => {
    const { state } = host();
    (state as any).hass = {
      states: {
        "climate.office": {
          state: "heat_cool",
          attributes: {
            friendly_name: "Office",
            hvac_modes: ["off", "heat_cool"],
            supported_features: 1,
            temperature: 20,
          },
        },
      },
    };
    state._climateSupportedModes = () => ["off", "heat_cool"];

    expect(unsupportedModeError(state as any, [{
      action: ACTION_SET_TEMPERATURE,
      start: "00:00",
      temperature: 20,
      hvac_mode: "heat_cool",
    }], "climate.office")).toBeUndefined();
  });

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

  it("reports backend-only options incompatibility without locally changing the raw source", async () => {
    const { api, state } = host([{ action: ACTION_SET_CLIMATE_OPTIONS, start: "08:00", preset_mode: "eco" }]);
    state._dirty = false;
    state._zoneTargets = new Set(["climate.bedroom"]);
    api.copyDaySchedule.mockRejectedValue(new Error("Unsupported options"));
    await applySelectedDayToZones(state);
    expect(api.setDailySchedule).not.toHaveBeenCalled();
    expect(state._error).toBe("Unsupported options");
    expect(state._zoneTargets.size).toBe(1);
  });
  it("saves a dirty source before cloning raw configuration to all climates", async () => {
    const { api, state } = host();
    state._zoneTargets = new Set(["climate.bedroom", "climate.other"]);
    Object.assign(state, { _data: { ...response, configuration_revision: 5 }, _draftConfigurationRevision: 5 });
    api.setDailySchedule.mockResolvedValue({ ...response, configuration_revision: 6 });
    await applySelectedDayToZones(state);
    expect(api.setDailySchedule).toHaveBeenCalledTimes(1);
    expect(api.setDailySchedule.mock.calls[0][2]).toEqual([{ action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 21, hvac_mode: "heat" }]);
    expect(api.copyDaySchedule).toHaveBeenCalledWith("climate.office", "monday", ["monday"], {
      target_entity_ids: ["climate.bedroom", "climate.other"], expected_revision: 6,
    });
    expect(state._zoneTargets.size).toBe(0);
  });
});
