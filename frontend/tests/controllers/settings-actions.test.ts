// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetZonePreconditioningLearning,
  resetZonePreconditioningSettings,
  saveSettings,
  saveZoneDelivery,
  saveZonePreconditioning,
} from "../../src/velair/controllers/settings-actions";
import type { ScheduleResponse } from "../../src/velair/types";

const scheduleResponse = (): ScheduleResponse => ({
  active_overrides: {},
  configured_entities: ["climate.office"],
  global: { mode: "auto" },
  next_event: null,
  next_events: [],
  operational_status: "running",
  settings: { first_weekday: "monday", zone_order: [] },
  templates: [],
  zones: {
    "climate.office": { enabled: true, schedule: {} as any },
  },
});

function host(externalConfig = false) {
  const api = {
    resetZonePreconditioningLearning: vi.fn(async () => scheduleResponse()),
    resetZonePreconditioningSettings: vi.fn(async () => scheduleResponse()),
    updateSettings: vi.fn(async () => scheduleResponse()),
    updateZoneDelivery: vi.fn(async () => scheduleResponse()),
    updateZonePreconditioning: vi.fn(async () => scheduleResponse()),
  };
  const state = {
    _api: () => api,
    _applyScheduleData: vi.fn(),
    _config: {},
    _copyTargets: new Set<string>(),
    _error: undefined,
    _hasExternalConfig: externalConfig,
    _resetDraftBlocks: vi.fn(),
    _saveMessage: undefined,
    _saveSettings: vi.fn(),
    _selectedWeekday: "monday",
    _settingsSaving: false,
    _showSuccess: vi.fn(),
    _t: (key: string) => key,
    _updateSettingsZoneOrder: vi.fn(),
    _zoneTargets: new Set<string>(),
  } as any;
  return { api, state };
}

describe("settings actions", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("does not persist global settings from externally configured Lovelace cards", async () => {
    const { api, state } = host(true);

    await saveSettings(state, { first_weekday: "sunday" });

    expect(api.updateSettings).not.toHaveBeenCalled();
  });

  it("persists zone preconditioning from externally configured Lovelace cards", async () => {
    const { api, state } = host(true);

    await saveZonePreconditioning(state, "climate.office", {
      room_temperature_entity_id: "sensor.office_temperature",
    });

    expect(api.updateZonePreconditioning).toHaveBeenCalledWith("climate.office", {
      room_temperature_entity_id: "sensor.office_temperature",
    });
    expect(state._applyScheduleData).toHaveBeenCalledWith(expect.objectContaining({
      configured_entities: ["climate.office"],
    }));
  });

  it("persists zone delivery confirmation settings and confirms the save", async () => {
    const { api, state } = host(true);

    await saveZoneDelivery(state, "climate.office", { confirm: true, confirm_attempts: 2 });

    expect(api.updateZoneDelivery).toHaveBeenCalledWith("climate.office", { confirm: true, confirm_attempts: 2 });
    expect(state._applyScheduleData).toHaveBeenCalledWith(expect.objectContaining({
      configured_entities: ["climate.office"],
    }));
    expect(state._showSuccess).toHaveBeenCalledWith("deliverySettingsSaved");
    expect(state._settingsSaving).toBe(false);
  });

  it("surfaces zone delivery save failures without leaving the saving flag set", async () => {
    const { api, state } = host();
    api.updateZoneDelivery.mockRejectedValueOnce(new Error("rejected"));

    await saveZoneDelivery(state, "climate.office", { confirm: false });

    expect(state._error).toBe("rejected");
    expect(state._settingsSaving).toBe(false);
  });

  it("persists preconditioning resets from externally configured Lovelace cards", async () => {
    const { api, state } = host(true);

    await resetZonePreconditioningLearning(state, "climate.office", "heat", "Heat");
    await resetZonePreconditioningSettings(state, "climate.office");

    expect(api.resetZonePreconditioningLearning).toHaveBeenCalledWith("climate.office", "heat");
    expect(api.resetZonePreconditioningSettings).toHaveBeenCalledWith("climate.office");
  });
});
