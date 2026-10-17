// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import type { ClimateProfileDraft } from "../../src/velair/domain/climate-profiles";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { ScheduleResponse } from "../../src/velair/types";
import { renderEditableBlock, renderLinkedHoursControl, renderScheduleEditor, renderSchedulesView } from "../../src/velair/views/schedule-view";

const template = {
  key: "workday", name: "Workday", blocks: [
    { slot_id: "morning", start: "07:00", action: "set_temperature", temperature: 20 },
  ],
};
const link = { template_key: template.key, bindings: { morning: { preset_key: "comfort" } } };

function host(linked = false): VelairViewHost {
  return {
    _data: { configured_entities: [], templates: [template] },
    _draftTemplateLink: linked ? link : undefined,
    _draftBlocks: [],
    _t: (key: string) => key,
    _inputValue: (event: Event) => (event.currentTarget as HTMLSelectElement).value,
    _setDayTemplateLink: vi.fn(), _restoreOwnDaySchedule: vi.fn(), _unlinkDayTemplate: vi.fn(), _saveSelectedDay: vi.fn(),
    _temperatureError: () => undefined, _temperatureLimits: () => [7, 35], _temperatureStep: () => undefined,
    _temperatureUnit: () => "°C", _hvacModeOptions: () => ["heat", "cool", "off"], _fanModeOptions: () => [], _presetModeOptions: () => [],
    _swingModeOptions: () => [], _swingHorizontalModeOptions: () => [], _humidityLimits: () => undefined, _modeLabel: (mode: string) => mode,
    _formatTemperature: (value: number) => `${value} °C`,
    _scheduleSource: "default", _hasExternalConfig: false,
    _hasDraftValidationError: () => false, _orderedWeekdays: () => [],
    _timelineBlocks: () => [], _currentTimelineNow: () => new Date(),
    _scheduleTemplates: () => [template], _selectedTemplateKey: "",
    _selectedEntity: "climate.office", _selectedWeekday: "monday",
    _copyTargets: new Set(), _zoneTargets: new Set(), _visibleZoneIds: () => [],
    _templateLabel: (item: typeof template) => item.name,
  } as unknown as VelairViewHost;
}

describe("linked Hours controls", () => {
  it.each(["schedule", "template"] as const)("keeps a complete, passive off target cell in %s editors", (source) => {
    const container = document.createElement("div");
    const state = host();
    state._updateDraftBlock = vi.fn();
    const off = { start: "09:00", action: "turn_off", hvac_mode: "off", temperature: 21 };
    render(renderEditableBlock(state, off, 0, source), container);
    const cell = container.querySelector(".target-action-field")!;
    const input = cell.querySelector("input")!;
    expect(input.disabled).toBe(true);
    expect(input.value).toBe("blockOffNoTarget");
    expect(cell.querySelector("label")?.htmlFor).toBe(input.id);
    expect(cell.querySelector(".target-action-indicator ha-icon")?.getAttribute("icon")).toBe("mdi:power");
    expect(cell.querySelector("button, [tabindex]")).toBeNull();
    cell.querySelector<HTMLElement>(".target-action-indicator")!.click();
    expect(state._updateDraftBlock).not.toHaveBeenCalled();
    for (const mode of ["heat", "cool"]) {
      render(renderEditableBlock(state, { ...off, action: "set_temperature", hvac_mode: mode }, 0, source), container);
      expect(container.querySelector(".target-action-indicator")).toBeNull();
      expect(container.querySelector<HTMLInputElement>('.target-action-field input')?.value).toBe("21");
      expect(container.querySelector('.target-action-toggle ha-icon')?.getAttribute("icon")).toBe("mdi:thermometer");
    }
  });

  it("uses stable, distinct locked-time help IDs per editor, source, day and slot", async () => {
    const container = document.createElement("div");
    const state = host(true);
    state._updateDraftBlock = vi.fn();
    const block = { start: "07:00", action: "set_temperature", temperature: 21, hvac_mode: "heat", slot_id: "a/b" };
    render(renderEditableBlock(state, block, 0), container);
    const first = container.querySelector<HTMLButtonElement>(".inline-help-overlay")!;
    const firstId = first.id;
    expect(first.closest("label")).toBeNull();
    expect(first.getAttribute("aria-label")).toBe("lockedHoursHelp");
    first.click();
    expect(state._updateDraftBlock).not.toHaveBeenCalled();
    expect(state._unlinkDayTemplate).not.toHaveBeenCalled();
    render(renderEditableBlock(state, block, 2), container);
    expect(container.querySelector(".inline-help-overlay")?.id).toBe(firstId);
    const profile = { ...state, _resourceProfileKey: "default" } as VelairViewHost;
    render(renderEditableBlock(profile, block, 0, "template"), container);
    expect(container.querySelector(".inline-help-overlay")?.id).not.toBe(firstId);
    state._selectedWeekday = "tuesday";
    render(renderEditableBlock(state, block, 0), container);
    expect(container.querySelector(".inline-help-overlay")?.id).not.toBe(firstId);
    state._selectedWeekday = "monday";
    render(renderEditableBlock(state, { ...block, slot_id: "a_b" }, 0), container);
    expect(container.querySelector(".inline-help-overlay")?.id).not.toBe(firstId);
    const secondEditor = host(true);
    render(renderEditableBlock(secondEditor, block, 0), container);
    expect(container.querySelector(".inline-help-overlay")?.id).not.toBe(firstId);
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }));
  });

  it("leaves time help absent when no unlink action is available", async () => {
    const container = document.createElement("div");
    const state = host(true);
    state._unlinkDayTemplate = undefined;
    render(renderEditableBlock(state, { start: "07:00", action: "turn_off", hvac_mode: "off" }, 0), container);
    expect((container.querySelector('input[type="time"]') as HTMLInputElement).disabled).toBe(true);
    expect(container.querySelector(".inline-help-overlay")).toBeNull();
  });
  it("selects or unlinks Hours in the draft without saving or offering inline template editing", async () => {
    const container = document.createElement("div");
    const state = host(true);
    render(renderLinkedHoursControl(state), container);
    const select = container.querySelector(".select-wrap select") as HTMLSelectElement;
    expect(select.getAttribute("aria-label")).toBe("scheduleHoursSource");
    expect(select.value).toBe("workday");
    expect(container.querySelector(".hours-source-help")).toBeNull();
    expect(container.querySelector(".hours-source-label .inline-help")).not.toBeNull();
    expect(container.textContent).not.toContain("editTemplate");
    select.value = "workday";
    select.dispatchEvent(new Event("change"));
    expect(state._setDayTemplateLink).not.toHaveBeenCalled();
    select.value = "";
    select.dispatchEvent(new Event("change"));
    (container.querySelector(".hours-source-actions button") as HTMLButtonElement).click();
    expect(state._restoreOwnDaySchedule).toHaveBeenCalledTimes(1);
    expect(state._unlinkDayTemplate).toHaveBeenCalledTimes(1);
    expect(state._saveSelectedDay).not.toHaveBeenCalled();
    expect(container.querySelector(".hours-source-actions button ha-icon")?.getAttribute("icon")).toBe("mdi:link-off");
  });

  it("groups Default Hours and the copy control, hiding copying while hours are linked", async () => {
    const container = document.createElement("div");
    const zone = { enabled: true, schedule: {} };
    render(renderScheduleEditor(host(), "climate.office", zone), container);
    expect(container.querySelectorAll(".schedule-config-row > .template-panel")).toHaveLength(1);
    expect(container.querySelector(".copy-template-control")).not.toBeNull();
    render(renderScheduleEditor(host(true), "climate.office", zone), container);
    expect(container.querySelectorAll(".schedule-config-row > .template-panel")).toHaveLength(1);
    expect(container.querySelectorAll(".schedule-config-row select")).toHaveLength(2);
    expect(container.querySelector("select[aria-label=templateLinkScope]")).not.toBeNull();
    expect(container.querySelector(".copy-template-control")).toBeNull();
  });

  it.each(["default", "profile"])("keeps shared libraries out of the %s Schedules workspace", (source) => {
    const container = document.createElement("div");
    const state = host();
    state._scheduleSource = source as "default" | "profile";
    render(renderSchedulesView(state, []), container);
    expect(container.querySelector("velair-preset-library")).toBeNull();
    expect(container.querySelector(".templates-view")).toBeNull();
  });

  it("shows linked Profile assignments with locked times and unlinks only its draft", async () => {
    const element = new VelairProfilesView();
    element.data = {
      configured_entities: ["climate.office"], templates: [template],
      block_presets: [{ key: "comfort", name: "Comfort", config: { action: "set_temperature", temperature: 21 } }],
      profiles: [], zones: {}, settings: { first_weekday: "monday" },
    } as unknown as ScheduleResponse;
    const sendMessagePromise = vi.fn();
    element.hass = { language: "en", states: { "climate.office": { state: "heat", attributes: { hvac_modes: ["off", "heat"], supported_features: 1, min_temp: 7, max_temp: 35 } } }, connection: { sendMessagePromise } } as never;
    const internal = element as unknown as {
      _draft: ClimateProfileDraft;
      _selectedKey: string;
      _renderSchedule: (id: string, zone: ClimateProfileDraft["zones"][string]) => ReturnType<typeof renderLinkedHoursControl>;
    };
    internal._selectedKey = "winter";
    internal._draft = { key: "winter", name: "Winter", color: "#123456", description: "", zones: { "climate.office": { behavior: "schedule", schedule: { monday: [] }, template_links: { monday: link } } } } as unknown as ClimateProfileDraft;
    const container = document.createElement("div");
    render(internal._renderSchedule("climate.office", internal._draft.zones["climate.office"]), container);
    expect(container.querySelectorAll(".preset-linked-block")).toHaveLength(1);
    expect((container.querySelector('input[type="time"]') as HTMLInputElement).disabled).toBe(true);
    expect(container.querySelector(".profile-template-select")).toBeNull();
    expect(container.textContent).not.toContain("Edit template");
    (container.querySelector(".hours-source-actions button") as HTMLButtonElement).click();
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule zone");
    expect(zone.template_links?.monday).toBeUndefined();
    expect(zone.schedule.monday[0]).toMatchObject({ start: "07:00", preset_key: "comfort" });
    expect(sendMessagePromise.mock.calls.every(([message]) => message.type.startsWith("velair/preview_"))).toBe(true);
    render(internal._renderSchedule("climate.office", zone), container);
    expect(container.querySelector(".profile-template-select")).not.toBeNull();
  });

  it("selects a preset inside additional settings and preserves the original trash action", async () => {
    const container = document.createElement("div"); const state = host();
    state._data = { ...state._data, block_presets: [{ key: "comfort", name: "Comfort", config: { action: "set_temperature", temperature: 21 } }] } as ScheduleResponse;
    state._setPresetForBlock = vi.fn(); state._unlinkPresetBlock = vi.fn(); state._editPreset = vi.fn();
    state._effectivePresetBlock = () => ({ start: "07:00", action: "set_temperature", temperature: 21 });
    const block = { start: "07:00", preset_key: "comfort", action: "", hvac_mode: "" };
    render(renderEditableBlock(state, block, 0), container);
    expect(container.querySelector(".block-preset-selector")).toBeNull(); expect(container.querySelector(".block-actions-menu")).toBeNull();
    expect(container.querySelector(".preset-link-summary")?.textContent).toContain("Comfort");
    const select = container.querySelector<HTMLSelectElement>(".velair-preset-settings select")!;
    expect(select.value).toBe("comfort"); select.value = ""; select.dispatchEvent(new Event("change")); await Promise.resolve();
    expect(select.value).toBe("comfort");
    expect(state._unlinkPresetBlock).toHaveBeenCalledWith(0, "schedule");
    expect(container.querySelector(".editable-block > .icon-button.danger")).not.toBeNull();
    expect(select.querySelector('option[value=""]')?.textContent).toBe("noVelairPreset");
    expect(container.querySelector(".preset-settings-actions")).toBeNull();
    expect(state._editPreset).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("unlinkPreset");
    expect(container.textContent).not.toContain("editPreset");
  });

  it("keeps an unavailable preset visibly linked without inventing effective values", async () => {
    const container = document.createElement("div"); const state = host(); state._setPresetForBlock = vi.fn();
    render(renderEditableBlock(state, { start: "07:00", preset_key: "missing", action: "", hvac_mode: "" }, 0), container);
    expect(container.querySelector(".preset-link-summary")?.textContent).toContain("missingPreset");
    expect(container.querySelector(".preset-link-summary")?.textContent).toContain("sharedPresetUnavailable");
    expect(container.querySelector<HTMLInputElement>('.single-temperature-field input')!.value).toBe("");
    expect(container.querySelector<HTMLInputElement>('.single-temperature-field input')!.disabled).toBe(true);
    expect(state._setPresetForBlock).not.toHaveBeenCalled();
  });

  it("resets Hours selection after a rejected template replacement or Own restoration", async () => {
    const container = document.createElement("div"); const state = host(true);
    state._setDayTemplateLink = vi.fn().mockReturnValue(false);
    state._restoreOwnDaySchedule = vi.fn().mockReturnValue(false);
    render(renderLinkedHoursControl(state), container);
    const select = container.querySelector<HTMLSelectElement>("select")!;
    select.value = ""; select.dispatchEvent(new Event("change")); await Promise.resolve();
    expect(select.value).toBe("workday");
    select.value = "workday"; select.dispatchEvent(new Event("change"));
    expect(select.value).toBe("workday");
  });

  it("keeps manual rows unchanged and opens preset selection through the existing options panel", async () => {
    const container = document.createElement("div"); const state = host();
    state._data = { ...state._data, block_presets: [{ key: "comfort", name: "Comfort", config: { action: "set_temperature", temperature: 21 } }] } as ScheduleResponse;
    state._setPresetForBlock = vi.fn();
    render(renderEditableBlock(state, { start: "07:00", action: "set_temperature", hvac_mode: "heat", temperature: 21 }, 0), container);
    expect(container.querySelectorAll(".editable-block > label")).toHaveLength(1);
    expect(container.querySelector(".editable-block > .block-time-field")).not.toBeNull();
    expect(container.querySelector(".block-actions-menu")).toBeNull();
    expect(container.querySelector(".editable-block > .icon-button.danger")).not.toBeNull();
    const options = container.querySelector<HTMLDetailsElement>(".advanced-climate-options")!;
    expect(options.open).toBe(false);
    const picker = options.querySelector<HTMLSelectElement>(".velair-preset-settings select")!;
    picker.value = "comfort"; picker.dispatchEvent(new Event("change"));
    expect(state._setPresetForBlock).toHaveBeenCalledWith(0, "comfort", "schedule");
    options.open = true; options.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(options.open).toBe(false);
  });

  it("shows backend-resolved preset targets in the usual locked columns and counts only configured settings", async () => {
    const container = document.createElement("div"); const state = host();
    state._data = { ...state._data, block_presets: [{ key: "comfort", name: "Comfort", config: { action: "set_temperature", temperature: 20 } }] } as ScheduleResponse;
    state._setPresetForBlock = vi.fn(); state._presetModeOptions = () => ["eco"];
    state._effectivePresetBlock = () => ({ start: "07:00", action: "set_temperature", temperature: 21.5, hvac_mode: "cool", preset_mode: "eco" });
    const block = { start: "07:00", preset_key: "comfort", action: "", hvac_mode: "" };
    render(renderEditableBlock(state, block, 0), container);
    const time = container.querySelector<HTMLInputElement>('input[type="time"]')!;
    expect(time.value).toBe("07:00"); expect(time.disabled).toBe(false);
    const mode = container.querySelector<HTMLSelectElement>(".editable-block > label select")!;
    expect(mode.value).toBe("cool"); expect(mode.disabled).toBe(true);
    const target = container.querySelector<HTMLInputElement>(".single-temperature-field input")!;
    expect(target.value).toBe("21.5"); expect(target.disabled).toBe(true);
    expect(container.querySelector(".climate-options-badge")?.textContent).toBe("2");
    expect(container.querySelector<HTMLSelectElement>(".device-settings-fields select")?.matches(":disabled")).toBe(true);
    expect(container.querySelectorAll(".block-command-preview")).toHaveLength(1);
    expect(container.querySelector(".advanced-climate-options-fields > .block-command-preview")).not.toBeNull();
    expect(container.querySelector(".device-settings-fields .block-command-preview")).toBeNull();
    expect(container.querySelector(".velair-preset-settings > strong")).toBeNull();
    expect(container.querySelector(".velair-preset-settings label > .label")?.textContent).toBe("velairPreset");
    expect(container.querySelector(".preset-link-summary")?.textContent).toContain("devicePreset: eco");
    expect(container.querySelector(".editable-block > .icon-button.danger")).not.toBeNull();
    state._effectivePresetBlock = () => ({ start: "07:00", action: "set_temperature", target_temp_low: 20, target_temp_high: 25, hvac_mode: "heat_cool" });
    render(renderEditableBlock(state, block, 0), container);
    const range = [...container.querySelectorAll<HTMLInputElement>(".range-temperature-field input")];
    expect(range.map((input) => input.value)).toEqual(["20", "25"]); expect(range.every((input) => input.disabled)).toBe(true);
    expect(container.querySelector(".climate-options-badge")?.textContent).toBe("1");
  });

  it.each(["set_hvac_mode", "set_climate_options", "turn_off"])("preserves the targetless semantics of linked %s", (action) => {
    const container = document.createElement("div"); const state = host(); state._setPresetForBlock = vi.fn();
    state._data = { ...state._data, block_presets: [{ key: "comfort", name: "Comfort", config: { action } }] } as ScheduleResponse;
    state._effectivePresetBlock = () => ({ start: "07:00", action, ...(action === "set_hvac_mode" ? { hvac_mode: "cool" } : action === "set_climate_options" ? { fan_mode: "quiet" } : {}) });
    render(renderEditableBlock(state, { start: "07:00", preset_key: "comfort", action: "", hvac_mode: "" }, 0), container);
    expect(container.querySelector<HTMLInputElement>(".single-temperature-field input")!.value).toBe(action === "turn_off" ? "blockOffNoTarget" : "");
    const mode = container.querySelector<HTMLSelectElement>(".editable-block > label select")!;
    expect(mode.value).toBe(action === "turn_off" ? "off" : action === "set_hvac_mode" ? "cool" : "");
    expect(mode.disabled).toBe(true);
    expect(container.querySelector(".climate-options-badge")?.textContent).toBe(action === "set_climate_options" ? "2" : "1");
    const preview = container.querySelector(".advanced-climate-options-fields > .block-command-preview")!;
    expect(preview).not.toBeNull(); expect(container.querySelectorAll(".block-command-preview")).toHaveLength(1);
    expect(preview.textContent).not.toContain("NaN"); expect(preview.textContent).not.toContain("blockKeepModeSummary");
    expect(preview.textContent).toContain(action === "turn_off" ? "diagnosticsOverrideTurnOff" : action === "set_hvac_mode" ? "mode: cool" : "blockOptionsOnlySummary");
  });

  it("does not use the library temperature while a current draft preview is pending", async () => {
    const container = document.createElement("div"); const state = host();
    state._data = { ...state._data, block_presets: [{ key: "comfort", name: "Comfort", config: { action: "set_temperature", temperature: 20 } }] } as ScheduleResponse;
    state._setPresetForBlock = vi.fn(); state._effectivePresetBlock = () => undefined; state._presetSettingsStatus = () => "loading";
    render(renderEditableBlock(state, { start: "07:00", preset_key: "comfort", action: "", hvac_mode: "" }, 0), container);
    expect(container.querySelector<HTMLInputElement>(".single-temperature-field input")!.value).toBe("");
    expect(container.querySelector(".preset-link-summary")?.textContent).toContain("presetSettingsLoading");
    expect(container.querySelector<HTMLSelectElement>(".editable-block > label select")!.selectedOptions[0].textContent).toBe("presetSettingsLoading");
    expect(container.querySelector(".device-settings-fields")).toBeNull();
    expect(container.querySelector(".advanced-climate-options-fields > .block-command-preview")?.textContent).toContain("presetSettingsLoading");
    expect(container.querySelector(".block-command-preview")?.textContent).not.toContain("blockSendsTarget");
  });

  it("shows one unavailable command summary with explicit retry", async () => {
    const container = document.createElement("div"); const state = host();
    state._setPresetForBlock = vi.fn(); state._effectivePresetBlock = () => undefined; state._presetSettingsStatus = () => "unavailable"; state._retryPresetSettings = vi.fn();
    const block = { start: "07:00", preset_key: "missing", action: "", hvac_mode: "" };
    render(renderEditableBlock(state, block, 0), container);
    const summary = container.querySelector(".advanced-climate-options-fields > .block-command-preview")!;
    expect(summary.textContent).toContain("sharedPresetUnavailable"); expect(summary.textContent).not.toContain("NaN");
    summary.querySelector<HTMLButtonElement>("button")!.click();
    expect(state._retryPresetSettings).toHaveBeenCalledWith(block, 0, "schedule");
  });

  it("keeps the preset picker and locked target intact when asynchronous unlink fails", async () => {
    const container = document.createElement("div"); const state = host();
    state._data = { ...state._data, block_presets: [{ key: "comfort", name: "Comfort", config: { action: "set_temperature", temperature: 20 } }] } as ScheduleResponse;
    state._setPresetForBlock = vi.fn(); state._effectivePresetBlock = () => ({ start: "07:00", action: "set_temperature", temperature: 21 });
    let finish!: () => void;
    state._unlinkPresetBlock = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const block = { start: "07:00", preset_key: "comfort", action: "", hvac_mode: "" };
    render(renderEditableBlock(state, block, 0), container);
    const picker = container.querySelector<HTMLSelectElement>(".velair-preset-settings select")!;
    picker.value = ""; picker.dispatchEvent(new Event("change"));
    expect(picker.value).toBe("comfort");
    finish(); await Promise.resolve(); render(renderEditableBlock(state, block, 0), container);
    expect(picker.value).toBe("comfort"); expect(block.preset_key).toBe("comfort");
    expect(container.querySelector<HTMLInputElement>(".single-temperature-field input")!.disabled).toBe(true);
  });

  it("shows the preceding linked day's last block across midnight in a Profile draft", async () => {
    const element = new VelairProfilesView();
    const eveningTemplate = { key: "evening", name: "Evening", blocks: [{ slot_id: "night", start: "23:00", action: "turn_off" }] };
    element.data = { configured_entities: ["climate.office"], templates: [eveningTemplate], profiles: [], zones: {}, settings: { first_weekday: "monday" } } as unknown as ScheduleResponse;
    element.hass = { language: "en", states: { "climate.office": { state: "heat", attributes: { hvac_modes: ["off", "heat"], supported_features: 1, min_temp: 7, max_temp: 35 } } } } as never;
    const internal = element as unknown as {
      _draft: ClimateProfileDraft; _selectedKey: string; _selectedDays: Record<string, string>;
      _renderSchedule: (id: string, zone: ClimateProfileDraft["zones"][string]) => ReturnType<typeof renderLinkedHoursControl>;
    };
    internal._selectedKey = "winter";
    internal._selectedDays = { "climate.office": "tuesday" };
    internal._draft = { key: "winter", name: "Winter", color: "#123456", description: "", zones: { "climate.office": {
      behavior: "schedule",
      schedule: { monday: [], tuesday: [{ start: "07:00", action: "set_temperature", temperature: 21, hvac_mode: "heat" }] },
      template_links: { monday: { template_key: "evening", bindings: { night: { action: "turn_off" } } } },
    } } } as unknown as ClimateProfileDraft;
    const container = document.createElement("div");
    render(internal._renderSchedule("climate.office", internal._draft.zones["climate.office"]), container);
    const carryOver = container.querySelector(".timeline-carry-over")!;
    expect(carryOver).not.toBeNull();
    expect(carryOver.classList.contains("off")).toBe(true);
    expect(carryOver.getAttribute("aria-label")).toContain("Mon");
    expect(carryOver.getAttribute("aria-label")).toContain("11:00 PM");
    expect(carryOver.getAttribute("draggable")).toBe("false");
    expect(container.querySelectorAll(".editable-block")).toHaveLength(1);

    element.data = { ...element.data, block_presets: [{ key: "night", name: "Night comfort", config: { action: "set_temperature", temperature: 18 } }] } as ScheduleResponse;
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule zone");
    zone.template_links!.monday.bindings.night = { preset_key: "night" };
    render(internal._renderSchedule("climate.office", zone), container);
    const presetCarryOver = container.querySelector(".timeline-carry-over")!;
    expect(presetCarryOver.textContent).toContain("Loading preset settings");
    expect(presetCarryOver.getAttribute("aria-label")).toContain("Night comfort");
    expect(presetCarryOver.textContent).not.toContain("invalidTemperatureRange");
    expect(presetCarryOver.getAttribute("aria-label")).not.toContain("Mode: Keep");
  });
});
