import { afterEach, describe, expect, it, vi } from "vitest";

import { ACTION_SET_CLIMATE_OPTIONS, ACTION_SET_HVAC_MODE, ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import {
  applySelectedTemplate,
  applyTemplateToTargets,
  asTemplateActionsHost,
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
    previewDailySchedule: vi.fn(async (entity: string, _day: string, input: { blocks: ScheduleBlock[] }) => {
      if (entity === "climate.bedroom" && input.blocks.some((block) => block.hvac_mode === "heat")) throw new Error("unsupported heat");
      return { materialized_blocks: input.blocks };
    }),
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
  it("commits valid shared template changes directly with the backend revision", async () => {
    const { api, state } = host();
    const blocks = [{ start: "09:00", slot_id: "existing", action: "turn_off" }];
    const preview = vi.fn().mockResolvedValue({ template: { key: "comfort", name: "Updated", blocks }, usages: [{ source: "default", entity_id: "climate.office", weekday: "monday" }], added_slot_ids: [], removed_slot_ids: [], configuration_revision: 7, proposals: [], pending: [], destination_errors: [] });
    Object.assign(api, { previewScheduleTemplateUpdate: preview });
    Object.assign(state, { _data: { ...state._data, configuration_revision: 7 }, _normalizeDraftBlocks: () => ({ ok: true, blocks }) });
    vi.stubGlobal("window", { prompt: () => "Updated" });
    await saveTemplate(asTemplateActionsHost(state), false);
    expect(preview).toHaveBeenCalledWith("comfort", "Updated", blocks, 7);
    expect(api.setScheduleTemplate).toHaveBeenCalledTimes(1);
    expect(api.setScheduleTemplate).toHaveBeenCalledWith("comfort", "Updated", blocks, { expected_revision: 7, assignments: [] });
    expect(state._applyScheduleData).toHaveBeenCalled();
  });
  it("loads a selected schedule template and marks the schedule dirty", async () => {
    const { state } = host();

    await selectScheduleTemplate(state, "comfort");

    expect(state._draftBlocks).toEqual(template.blocks);
    expect(state._markDirty).toHaveBeenCalled();
    expect(state._saveMessage).toBeUndefined();
    expect(state._selectedTemplateKey).toBe("");
  });

  it("confirms before replacing existing draft blocks", async () => {
    const { state } = host();
    state._draftBlocks = [{ action: ACTION_SET_TEMPERATURE, start: "10:00", temperature: 18, hvac_mode: "heat" }];
    vi.stubGlobal("window", { confirm: vi.fn().mockReturnValue(false) });

    const applied = await applySelectedTemplate(state);

    expect(applied).toBe(false);
    expect(state._draftBlocks).toEqual([{ action: ACTION_SET_TEMPERATURE, start: "10:00", temperature: 18, hvac_mode: "heat" }]);
  });

  it("applies a mode-only template with an auxiliary target to a climate without target support", async () => {
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

    expect(await applySelectedTemplate(state)).toBe(true);
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




  it("copies only backend materialized manual values and retains preset references", async () => {
    const { api, state } = host();
    const shared = { ...template, blocks: [{ start: "08:00", temperature: 18.3, action: ACTION_SET_TEMPERATURE }, { start: "12:00", preset_key: "comfort" }] };
    state._scheduleTemplates = () => [shared];
    const materialized = [{ start: "08:00", temperature: 18.5, action: ACTION_SET_TEMPERATURE }, { start: "12:00", preset_key: "comfort" }];
    api.previewDailySchedule.mockResolvedValue({ materialized_blocks: materialized });
    expect(await applySelectedTemplate(state)).toBe(true);
    expect(api.previewDailySchedule).toHaveBeenCalledWith("climate.office", "monday", { blocks: shared.blocks });
    expect(state._draftBlocks[0].temperature).toBe(18.5);
    expect(state._draftBlocks[1].preset_key).toBe("comfort");
    expect(shared.blocks[0].temperature).toBe(18.3);
    expect(api.setDailySchedule).not.toHaveBeenCalled();
  });

  it("discards a delayed template copy when the destination day changes", async () => {
    const { api, state } = host();
    let finish!: (value: { materialized_blocks: ScheduleBlock[] }) => void;
    api.previewDailySchedule.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const copying = applySelectedTemplate(state);
    state._selectedWeekday = "tuesday";
    finish({ materialized_blocks: template.blocks });
    expect(await copying).toBe(false);
    expect(state._draftBlocks).toEqual([]);
    expect(state._markDirty).not.toHaveBeenCalled();
  });


  it("saves a full linked day as a template using materialized manual values and presets", async () => {
    const { api, state } = host();
    Object.assign(state, { _draftTemplateLink: { mode: "full", template_key: "comfort" }, _data: { ...state._data, configuration_revision: 4 } });
    state._draftBlocks = [{ start: "08:00", action: ACTION_SET_TEMPERATURE, temperature: 18.3 }, { start: "12:00", preset_key: "comfort" }];
    const materialized = [{ start: "08:00", action: ACTION_SET_TEMPERATURE, temperature: 18.5 }, { start: "12:00", preset_key: "comfort" }];
    api.previewDailySchedule.mockResolvedValue({ materialized_blocks: materialized });
    vi.stubGlobal("window", { prompt: () => "Copied full" });
    await saveTemplate(asTemplateActionsHost(state), true);
    expect(state._normalizeDraftBlocks).not.toHaveBeenCalled();
    expect(api.previewDailySchedule).toHaveBeenCalledWith("climate.office", "monday", { template_link: { mode: "full", template_key: "comfort" } });
    expect(api.setScheduleTemplate).toHaveBeenCalledWith("custom_key", "Copied full", materialized, { expected_revision: 4 });
    expect(state._draftBlocks[0].temperature).toBe(18.3);
  });


});
