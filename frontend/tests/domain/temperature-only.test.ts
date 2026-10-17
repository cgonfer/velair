// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render } from "lit";
import { draftBlocksFromScheduleBlocks, normalizeDraftBlocks, updateDraftBlock } from "../../src/velair/domain/draft-blocks";
import { profileDraftBlockInput } from "../../src/velair/domain/climate-profiles";
import { scheduleTemplatesFromStored } from "../../src/velair/domain/templates";
import { linkDraftDay, linkedDraftBlocks } from "../../src/velair/domain/linked-schedules";
import { scheduleEventFromBlock } from "../../src/velair/domain/schedule-events";
import { formatEventMode } from "../../src/velair/domain/formatters";
import { resetTemplateDraft } from "../../src/velair/controllers/template-actions";
import { unsupportedModeError } from "../../src/velair/controllers/schedule-actions";
import { renderEditableBlock, presetConfigurationSummary } from "../../src/velair/views/schedule-view";
import type { DraftScheduleBlock, ScheduleBlock, StoredScheduleTemplate } from "../../src/velair/types";
import type { VelairViewHost } from "../../src/velair/host-types";

const options = { duplicateStartError: () => "duplicate", invalidStartError: () => "start", invalidTemperatureError: (_: string, message: string) => message, invalidClimateOptionsError: () => "options", temperatureError: () => undefined };
const scalar: ScheduleBlock = { start: "08:00", slot_id: "a", action: "set_temperature", temperature: 20, temperature_only: true };
const template: StoredScheduleTemplate = { key: "day", name: "Day", blocks: [scalar] };
function host() {
  return { _selectedEntity: "climate.room", _selectedWeekday: "mon", _t: (key: string) => key,
    _modeLabel: (value: string) => value, _formatTemperature: (value: number) => `${value} °C`,
    _temperatureError: () => undefined, _temperatureLimits: () => [5, 30], _temperatureStep: () => 0.5,
    _hvacModeOptions: () => ["heat", "cool", "off"], _fanModeOptions: () => ["auto"],
    _presetModeOptions: () => ["eco"], _swingModeOptions: () => [], _swingHorizontalModeOptions: () => [],
    _humidityLimits: () => undefined, _updateDraftBlock: vi.fn(), _removeDraftBlock: vi.fn(),
    _inputValue: (event: Event) => (event.target as HTMLSelectElement).value,
  } as unknown as VelairViewHost;
}
describe("temperature-only schedule policy", () => {
  it.each([scalar, { ...scalar, temperature: undefined, target_temp_low: 18, target_temp_high: 24 }])("round trips targets through drafts, templates, profiles and hours bindings", (block) => {
    const draft = draftBlocksFromScheduleBlocks([block])[0];
    const normalized = normalizeDraftBlocks([draft], options);
    expect(normalized).toEqual({ ok: true, blocks: [block] });
    expect(profileDraftBlockInput(draft)).toMatchObject({ temperature_only: true });
    expect(scheduleTemplatesFromStored([{ ...template, blocks: [block] }])[0].blocks[0]).toEqual(draft);
    expect(linkedDraftBlocks(linkDraftDay(template, [draft]), [template])[0]).toEqual(draft);
  });
  it("preserves the policy when loading the template library editor", () => {
    const templateHost = { _templateDraftBlocks: [] } as unknown as Parameters<typeof resetTemplateDraft>[0];
    resetTemplateDraft(templateHost, { ...template, blocks: draftBlocksFromScheduleBlocks([scalar]) });
    expect(templateHost._templateDraftBlocks[0].temperature_only).toBe(true);
  });
  it("clears modes and device options when selected, and restores ordinary mode behavior explicitly", () => {
    const original: DraftScheduleBlock = { start: "08:00", action: "set_hvac_mode", hvac_mode: "heat", temperature: 20, fan_mode: "auto", preset_mode: "eco", swing_mode: "on", swing_horizontal_mode: "on", humidity: 45 };
    const selected = updateDraftBlock([original], 0, "hvac_mode", "temperature_only");
    expect(normalizeDraftBlocks(selected, options)).toEqual({ ok: true, blocks: [{ start: "08:00", action: "set_temperature", temperature: 20, temperature_only: true }] });
    for (const mode of ["", "heat", "cool", "off"]) {
      expect(updateDraftBlock(selected, 0, "hvac_mode", mode)[0].temperature_only).toBeUndefined();
    }
  });
  it.each([{ hvac_mode: "cool" }, { preset_mode: "eco" }, { fan_mode: "auto" }, { humidity: 45 }, { action: "turn_off" }])("rejects contradictory configurations rather than silently discarding them", (extra) => {
    expect(normalizeDraftBlocks([{ ...draftBlocksFromScheduleBlocks([scalar])[0], ...extra }], options).ok).toBe(false);
  });
  it("labels events and presets distinctly from Keep", () => {
    const event = scheduleEventFromBlock("climate.room", scalar, new Date("2026-10-16T08:00:00Z"), "fri");
    expect(event.temperature_only).toBe(true);
    expect(formatEventMode(event, { keepMode: "Keep", temperatureOnly: "Temperature only" }, String)).toBe("Temperature only");
    expect(presetConfigurationSummary(scalar, host())).toContain("temperatureOnly");
  });
  it("renders the synthetic mode, hides device options, and forwards its selection to draft handling", () => {
    const viewHost = host(); const container = document.createElement("div");
    render(renderEditableBlock(viewHost, draftBlocksFromScheduleBlocks([scalar])[0], 0, "schedule"), container);
    const select = container.querySelector("select")!;
    expect(select.value).toBe("temperature_only");
    expect(container.querySelector("details .block-command-preview")?.textContent).toContain("temperatureOnlyHelp");
    expect([...container.querySelectorAll(".climate-options-inline-summary")].some((item) => item.textContent?.includes("temperatureOnlyHelp"))).toBe(false);
    expect(container.querySelector(".device-settings-fields")).toBeNull();
    select.value = "cool"; select.dispatchEvent(new Event("change"));
    expect(viewHost._updateDraftBlock).toHaveBeenCalledWith(0, "hvac_mode", "cool", "schedule");
  });
  it("does not offer the policy for an unsupported external editor", () => {
    const viewHost = host(); viewHost._supportsTemperatureOnly = false;
    const container = document.createElement("div");
    render(renderEditableBlock(viewHost, { action: "set_temperature", start: "08:00", hvac_mode: "", temperature: 20 }, 0, "schedule"), container);
    expect(container.querySelector('option[value="temperature_only"]')).toBeNull();
  });
  it("rejects unsupported external policies before ordinary target checks", () => {
    const viewHost = { _data: { zones: { "climate.room": { execution: { type: "external", provider: "test" } } }, external_execution: { systems: [{ provider: "test", capabilities: {} }] } }, _friendlyEntityName: () => "Room", _t: (key: string) => key };
    expect(unsupportedModeError(viewHost as unknown as Parameters<typeof unsupportedModeError>[0], [scalar], "climate.room")).toBe("profileExternalUnsupportedBlock");
  });
});
