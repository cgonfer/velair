import { describe, expect, it } from "vitest";

import { ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import { applyScheduleData, selectEntity, selectWeekday } from "../../src/velair/controllers/schedule-state";
import type { ScheduleResponse } from "../../src/velair/types";

const scheduleResponse = (): ScheduleResponse => ({
  active_overrides: {},
  configured_entities: ["climate.bedroom", "climate.office"],
  global: { mode: "auto" },
  next_event: null,
  next_events: [],
  operational_status: "running",
  settings: { first_weekday: "saturday", zone_order: ["climate.office"] },
  templates: [{ key: "comfort", name: "Comfort", blocks: [{ action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 21, hvac_mode: "heat" }] }],
  zones: {
    "climate.bedroom": { enabled: true, schedule: { saturday: [], sunday: [] } as any },
    "climate.office": {
      enabled: true,
      schedule: { saturday: [{ action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 20, hvac_mode: "heat" }], sunday: [] } as any,
    },
  },
});

function host() {
  const state = {
    _config: {},
    _copyTargets: new Set<string>(),
    _dirty: false,
    _draftBlocks: [],
    _hasExternalConfig: false,
    _selectedTemplateKey: "comfort",
    _selectedWeekday: "monday",
    _subscribing: false,
    _templateDirty: false,
    _templateDraftBlocks: [],
    _templateDraftKey: "",
    _zoneTargets: new Set<string>(),
    _api: () => undefined,
    _applyScheduleData(data: ScheduleResponse, options?: { forceDraft?: boolean }) {
      applyScheduleData(this, data, options);
    },
    _loadSchedule: async () => undefined,
    _markDirty() {
      this._dirty = true;
    },
    _orderedZoneIds(entityIds: string[]) {
      return ["climate.office", ...entityIds.filter((entityId) => entityId !== "climate.office")];
    },
    _visibleZoneIds(entityIds: string[]) {
      const ordered = this._orderedZoneIds(entityIds);
      const selected = this._config.entities ?? [];
      return selected.length ? ordered.filter((entityId: string) => selected.includes(entityId)) : ordered;
    },
    _resetDraftBlocks() {
      const zone = this._selectedEntity ? this._data?.zones[this._selectedEntity] : undefined;
      this._draftBlocks = (zone?.schedule?.[this._selectedWeekday] ?? []).map((block: any) => ({
        action: block.action,
        hvac_mode: block.hvac_mode ?? "",
        start: block.start,
        temperature: block.temperature ?? 21,
      }));
      this._dirty = false;
    },
    _resetTemplateDraft(template?: any) {
      this._templateDraftKey = template?.key ?? "";
      this._templateDraftBlocks = template ? template.blocks.map((block: any) => ({ ...block })) : [];
      this._templateDirty = false;
    },
    _scheduleTemplates() {
      return this._data?.templates ?? [];
    },
    _syncPauseTick() {},
    _t: (key: string) => key,
  } as any;
  return state;
}

describe("schedule state controller", () => {
  it("initializes selection from backend settings and ordered zones", () => {
    const state = host();

    applyScheduleData(state, scheduleResponse());

    expect(state._config).toEqual({ first_weekday: "saturday", zone_order: ["climate.office"] });
    expect(state._selectedWeekday).toBe("saturday");
    expect(state._selectedEntity).toBe("climate.office");
    expect(state._draftBlocks).toEqual([
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 20 },
    ]);
    expect(state._templateDraftKey).toBe("comfort");
  });

  it("respects explicit user selection while staying on schedules", () => {
    const state = host();
    applyScheduleData(state, scheduleResponse());

    selectWeekday(state, "sunday");
    selectEntity(state, "climate.bedroom");
    applyScheduleData(state, scheduleResponse());

    expect(state._selectedWeekday).toBe("sunday");
    expect(state._selectedEntity).toBe("climate.bedroom");
  });

  it("drops a selected template that no longer exists", () => {
    const state = host();
    const data = scheduleResponse();
    data.templates = [];

    applyScheduleData(state, data);

    expect(state._selectedTemplateKey).toBe("");
    expect(state._templateDraftBlocks).toEqual([]);
  });

  it("moves selection to a visible thermostat when a Lovelace card filters entities", () => {
    const state = host();
    state._config = { entities: ["climate.bedroom"] };
    state._hasExternalConfig = true;
    state._selectedEntity = "climate.office";

    applyScheduleData(state, scheduleResponse());

    expect(state._selectedEntity).toBe("climate.bedroom");
  });
});
