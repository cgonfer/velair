import { describe, expect, it, vi } from "vitest";

import { ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import { applySelectedDayToZones, clampBlocksForEntity, saveSelectedDay, unsupportedModeError } from "../../src/velair/controllers/schedule-actions";
import type { DraftScheduleBlock, ScheduleBlock, ScheduleResponse } from "../../src/velair/types";

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

  it("drops unsupported optional climate settings when applying to another zone", async () => {
    const { api, state } = host([
      {
        action: ACTION_SET_TEMPERATURE,
        fan_mode: "quiet",
        humidity: 45,
        hvac_mode: "heat",
        preset_mode: "eco",
        start: "08:00",
        swing_horizontal_mode: "left",
        swing_mode: "vertical",
        temperature: 21,
      },
    ]);
    state._zoneTargets = new Set(["climate.bedroom"]);

    await applySelectedDayToZones(state);

    expect(api.setDailySchedule).toHaveBeenNthCalledWith(1, "climate.office", "monday", [
      {
        action: ACTION_SET_TEMPERATURE,
        fan_mode: "quiet",
        humidity: 45,
        hvac_mode: "heat",
        preset_mode: "eco",
        start: "08:00",
        swing_horizontal_mode: "left",
        swing_mode: "vertical",
        temperature: 21,
      },
    ]);
    expect(api.setDailySchedule).toHaveBeenNthCalledWith(2, "climate.bedroom", "monday", [
      {
        action: ACTION_SET_TEMPERATURE,
        fan_mode: "quiet",
        hvac_mode: "heat",
        start: "08:00",
        temperature: 19,
      },
    ]);
  });
});
