import { afterEach, describe, expect, it, vi } from "vitest";

import { ACTION_SET_HVAC_MODE, ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import {
  applySelectedTemplate,
  applyTemplateToTargets,
  saveTemplate,
  selectScheduleTemplate,
  toggleTemplateApplyTargetForHost,
  updateTemplateNameDraft,
} from "../../src/velair/controllers/template-actions";
import { unsupportedModeError } from "../../src/velair/controllers/schedule-actions";
import type { ScheduleBlock, ScheduleTemplate } from "../../src/velair/types";

const template: ScheduleTemplate = {
  blocks: [{ action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 22, hvac_mode: "heat" }],
  key: "comfort",
  name: "Comfort",
};

function host() {
  const api = {
    setDailySchedule: vi.fn().mockResolvedValue({ ok: true }),
    setScheduleTemplate: vi.fn().mockResolvedValue({ ok: true }),
  };
  const state = {
    renderRoot: { querySelector: () => undefined },
    _applyingTemplateTargets: false,
    _data: { configured_entities: ["climate.office", "climate.bedroom"] },
    _draftBlocks: [] as ScheduleBlock[],
    _error: undefined as string | undefined,
    _saveMessage: "saved",
    _selectedEntity: "climate.office",
    _selectedTemplateKey: "comfort",
    _selectedWeekday: "monday",
    _templateApplyOpen: false,
    _templateApplyTargets: new Set<string>(),
    _templateDirty: false,
    _templateDraftBlocks: template.blocks.map((block) => ({ ...block })),
    _templateDraftKey: "comfort",
    _templateNameDraft: "Comfort",
    _templateNameDraftKey: "comfort",
    _api: () => api,
    _applyScheduleData: vi.fn(),
    _applySelectedTemplate() {
      return applySelectedTemplate(this);
    },
    _clampBlocksForEntity(blocks: ScheduleBlock[], entityId: string) {
      if (entityId === "climate.bedroom") {
        return blocks.map((block) => ({ ...block, temperature: 20 }));
      }
      return blocks;
    },
    _markDirty: vi.fn(),
    _newTemplateKey: () => "custom_key",
    _normalizeDraftBlocks: vi.fn(() => ({ ok: true as const, blocks: state._templateDraftBlocks })),
    _resetTemplateDraft: vi.fn(),
    _scheduleTemplates: () => [template],
    _setTemplateListScrollIndicators: vi.fn(),
    _showSuccess: vi.fn(),
    _t: (key: string, replacements?: Record<string, string | number>) => replacements ? `${key}:${JSON.stringify(replacements)}` : key,
    _templateLabel: (item: ScheduleTemplate) => item.name ?? item.key,
    _templateNameInputValue: () => state._templateNameDraft,
    _uniqueTemplateName: (baseName: string) => baseName,
    _unsupportedModeError: (blocks: Array<Pick<ScheduleBlock, "action" | "hvac_mode">>, entityId: string) =>
      entityId === "climate.bedroom" && blocks.some((block) => block.hvac_mode === "heat") ? "unsupported heat" : undefined,
    _weekdayName: (weekday: string) => weekday,
  };
  return { api, state };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("template actions controller", () => {
  it("loads a selected schedule template and marks the schedule dirty", () => {
    const { state } = host();

    selectScheduleTemplate(state, "comfort");

    expect(state._draftBlocks).toEqual(template.blocks);
    expect(state._markDirty).toHaveBeenCalled();
    expect(state._saveMessage).toBeUndefined();
    expect(state._selectedTemplateKey).toBe("");
  });

  it("confirms before replacing existing draft blocks", () => {
    const { state } = host();
    state._draftBlocks = [{ action: ACTION_SET_TEMPERATURE, start: "10:00", temperature: 18, hvac_mode: "heat" }];
    vi.stubGlobal("window", { confirm: vi.fn().mockReturnValue(false) });

    const applied = applySelectedTemplate(state);

    expect(applied).toBe(false);
    expect(state._draftBlocks).toEqual([{ action: ACTION_SET_TEMPERATURE, start: "10:00", temperature: 18, hvac_mode: "heat" }]);
  });

  it("applies a mode-only template with an auxiliary target to a climate without target support", () => {
    const { state } = host();
    const modeOnlyTemplate: ScheduleTemplate = {
      blocks: [{
        action: ACTION_SET_HVAC_MODE,
        start: "08:00",
        hvac_mode: "auto",
        temperature: 21,
      }],
      key: "device-controlled",
      name: "Device controlled",
    };
    Object.assign(state, {
      hass: {
        states: {
          "climate.office": {
            state: "auto",
            attributes: { hvac_modes: ["off", "auto"], supported_features: 0 },
          },
        },
      },
      _climateSupportedModes: () => ["off", "auto"],
      _friendlyEntityName: (entityId: string) => entityId,
      _modeLabel: (mode: string) => mode,
      _scheduleTemplates: () => [modeOnlyTemplate],
      _selectedTemplateKey: modeOnlyTemplate.key,
    });
    state._unsupportedModeError = (blocks, entityId) =>
      unsupportedModeError(state as never, blocks as ScheduleBlock[], entityId);

    expect(applySelectedTemplate(state)).toBe(true);
    expect(state._draftBlocks[0]).toMatchObject({
      action: ACTION_SET_HVAC_MODE,
      hvac_mode: "auto",
      start: "08:00",
    });
  });

  it("updates editable template names as dirty state", () => {
    const { state } = host();

    updateTemplateNameDraft(state, "comfort", "New name");

    expect(state._templateNameDraftKey).toBe("comfort");
    expect(state._templateNameDraft).toBe("New name");
    expect(state._templateDirty).toBe(true);
  });

  it("saves schedule drafts as templates with optional climate settings intact", async () => {
    const { api, state } = host();
    const scheduleBlocks = [
      {
        action: ACTION_SET_TEMPERATURE,
        fan_mode: "quiet",
        humidity: "45",
        hvac_mode: "cool",
        preset_mode: "eco",
        start: "22:00",
        swing_horizontal_mode: "left",
        swing_mode: "vertical",
        temperature: 24,
      },
    ];
    state._normalizeDraftBlocks.mockReturnValue({ ok: true as const, blocks: scheduleBlocks });
    vi.stubGlobal("window", { prompt: vi.fn().mockReturnValue("Night AC") });

    await saveTemplate(state, true);

    expect(state._normalizeDraftBlocks).toHaveBeenCalledWith();
    expect(api.setScheduleTemplate).toHaveBeenCalledWith("custom_key", "Night AC", [
      {
        action: ACTION_SET_TEMPERATURE,
        fan_mode: "quiet",
        humidity: "45",
        hvac_mode: "cool",
        preset_mode: "eco",
        start: "22:00",
        swing_horizontal_mode: "left",
        swing_mode: "vertical",
        temperature: 24,
      },
    ]);
  });

  it("applies templates only to valid checked targets and validates modes first", async () => {
    const { api, state } = host();
    toggleTemplateApplyTargetForHost(state, "climate.office", "tuesday", true);
    toggleTemplateApplyTargetForHost(state, "climate.unknown", "tuesday", true);

    await applyTemplateToTargets(state, template);

    expect(api.setDailySchedule).toHaveBeenCalledWith("climate.office", "tuesday", [
      { action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 22, hvac_mode: "heat" },
    ]);
    expect(state._templateApplyTargets.size).toBe(0);
  });

  it("stops template application when a target climate does not support a mode", async () => {
    const { api, state } = host();
    toggleTemplateApplyTargetForHost(state, "climate.bedroom", "tuesday", true);

    await applyTemplateToTargets(state, template);

    expect(api.setDailySchedule).not.toHaveBeenCalled();
    expect(state._error).toBe("unsupported heat");
  });
});
