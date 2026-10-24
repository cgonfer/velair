// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { renderTemplatesView } from "../../src/velair/views/templates-view";
import { createTemplateImpact } from "../../src/velair/controllers/template-impact";

function host(options: { templates?: Array<{ key: string; name: string; blocks: unknown[] }> } = {}) {
  return {
    _orderedWeekdays: () => ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    _weekdayName: (day: string) => day,
    _friendlyEntityName: (entity: string) => entity,
    _createTemplate: vi.fn(),
    _deleteSelectedTemplate: vi.fn(),
    _handleTemplateListScroll: vi.fn(),
    _hasDraftValidationError: () => false,
    _scheduleTemplates: () => options.templates ?? [],
    _selectTemplate: vi.fn(),
    _selectedTemplateKey: "",
    _t: (key: string) => key,
    _templateAction: null,
    _templateApplyOpen: false,
    _templateDirty: false,
    _templateDraftBlocks: [],
    _templateLabel: (template: { name?: string; key: string }) => template.name ?? template.key,
    _templateListClass: () => "template-list-wrap",
    _templateNameInputValue: () => "",
  } as unknown as VelairViewHost;
}

describe("templates view", () => {
  it("offers Temperature only in the global template editor even when the selected climate uses an unsupported external provider", () => {
    const container = document.createElement("div");
    const block = { start: "08:00", action: "set_temperature", temperature: 20, hvac_mode: "" };
    const state = host({ templates: [{ key: "daily", name: "Daily", blocks: [block] }] });
    Object.assign(state, {
      _selectedTemplateKey: "daily", _selectedEntity: "climate.external", _templateDraftBlocks: [block],
      _supportsTemperatureOnly: false,
      _data: { zones: { "climate.external": { execution: { type: "external", provider: "test" } } }, external_execution: { systems: [{ provider: "test", capabilities: { supports_temperature_only: false } }] } },
      _currentTimelineNow: () => new Date(), _timelineBlocks: () => [],
      _temperatureError: () => undefined, _temperatureLimits: () => [7, 35], _temperatureStep: () => undefined,
      _temperatureUnit: () => "C", _hvacModeOptions: () => ["heat", "off"], _fanModeOptions: () => [],
      _presetModeOptions: () => [], _swingModeOptions: () => [], _swingHorizontalModeOptions: () => [], _humidityLimits: () => undefined,
      _modeLabel: (value: string) => value, _formatTemperature: (value: number) => `${value} C`,
    });
    render(renderTemplatesView(state), container);
    const option = container.querySelector<HTMLOptionElement>('.template-editor option[value="temperature_only"]');
    expect(option).not.toBeNull();
    expect(option!.disabled).toBe(false);
  });
  it("gives each template assignment destination unique time IDs without an unlink help overlay", () => {
    const container = document.createElement("div");
    const state = host({ templates: [{ key: "daily", name: "Daily", blocks: [] }] });
    Object.assign(state, {
      renderRoot: container, _selectedTemplateKey: "daily", _selectedWeekday: "parent-day", _resourceProfileKey: "parent-profile", _unlinkDayTemplate: vi.fn(),
      _currentTimelineNow: () => new Date(), _timelineBlocks: () => [],
      _temperatureError: () => undefined, _temperatureLimits: () => [7, 35], _temperatureStep: () => undefined,
      _temperatureUnit: () => "°C", _hvacModeOptions: () => ["heat", "off"], _fanModeOptions: () => [],
      _presetModeOptions: () => [], _swingModeOptions: () => [], _swingHorizontalModeOptions: () => [], _humidityLimits: () => undefined,
      _modeLabel: (value: string) => value, _formatTemperature: (value: number) => `${value} °C`,
    });
    state._templateImpact = createTemplateImpact({
      template: { key: "daily", name: "Daily", blocks: [{ start: "07:00", slot_id: "new", action: "turn_off" }] },
      configuration_revision: 1, added_slot_ids: ["new"], removed_slot_ids: [], usages: [
        { source: "default", entity_id: "climate.office", weekday: "monday" },
        { source: "default", entity_id: "climate.office", weekday: "tuesday" },
        { source: "profile", profile_key: "default", entity_id: "climate.office", weekday: "monday" },
      ],
    }, "Daily");
    for (const item of state._templateImpact.assignments) item.drafts[0] = { start: "07:00", slot_id: "new", action: "turn_off", hvac_mode: "off" };
    render(renderTemplatesView(state), container);
    const inputs = [...container.querySelectorAll<HTMLInputElement>('.template-usage-section input[type="time"]')];
    expect(inputs).toHaveLength(3);
    expect(new Set(inputs.map((input) => input.id)).size).toBe(3);
    expect(inputs.every((input) => input.disabled)).toBe(true);
    expect(container.querySelector(".inline-help-overlay")).toBeNull();
  });
  it("explains each library in its selector without a duplicate content intro", () => {
    const container = document.createElement("div");
    render(renderTemplatesView(host()), container);
    expect(container.querySelectorAll(".schedule-source-option > button ha-icon")).toHaveLength(2);
    expect(container.querySelectorAll(".schedule-source-option > button small")).toHaveLength(2);
    expect(container.querySelector(".schedule-source-selector")?.textContent).toContain("templatesPanelIntro");
    expect(container.querySelector(".schedule-source-selector")?.textContent).toContain("presetLibraryHelp");
    expect(container.querySelector(".template-intro")).toBeNull();
  });
  it("keeps the shared preset library in Templates and preserves its draft when switching libraries", () => {
    const container = document.createElement("div");
    const state = host();
    state._templateLibrarySource = "presets";
    state._selectTemplateLibrarySource = vi.fn();
    state._presetLibraryDraft = { key: "comfort", name: "Comfort", reference: "", block: { start: "00:00", action: "turn_off" }, revision: 3 } as never;
    render(renderTemplatesView(state), container);
    const library = container.querySelector("velair-preset-library") as HTMLElement & { draft: unknown };
    expect(library.draft).toBe(state._presetLibraryDraft);
    (container.querySelector(".schedule-source-selector button") as HTMLButtonElement).click();
    expect(state._selectTemplateLibrarySource).toHaveBeenCalledWith("templates");
    state._templateLibrarySource = "templates";
    render(renderTemplatesView(state), container);
    expect(container.querySelector("velair-preset-library")).toBeNull();
    state._templateLibrarySource = "presets";
    render(renderTemplatesView(state), container);
    expect((container.querySelector("velair-preset-library") as unknown as { draft: unknown }).draft).toBe(state._presetLibraryDraft);
  });
  it("shows a compact empty state when there are no templates", () => {
    const container = document.createElement("div");

    render(renderTemplatesView(host()), container);

    expect(container.querySelector(".schedule-source-selector")?.textContent)
      .toContain("templatesPanelIntro");
    const placeholder = container.querySelector(".template-placeholder.compact");
    expect(placeholder?.textContent).toContain("noTemplates");
    expect(
      [...(placeholder?.children ?? [])].some((child) => child.tagName === "HA-ICON"),
    ).toBe(false);
    expect(placeholder?.querySelector("h2")).toBeNull();
  });

  it("shows a compact detail placeholder until a template is selected", () => {
    const container = document.createElement("div");

    render(
      renderTemplatesView(
        host({ templates: [{ key: "comfort", name: "Comfort", blocks: [] }] }),
      ),
      container,
    );

    const placeholder = container.querySelector(".template-detail .template-placeholder.compact");
    expect(container.querySelectorAll(".template-intro")).toHaveLength(0);
    expect(placeholder?.textContent).toContain("selectTemplateToBegin");
    expect(placeholder?.querySelector("ha-icon")).toBeNull();
    expect(placeholder?.querySelector("h2")).toBeNull();
  });

  it("keeps block explanations inside the options panel without an extra heading", () => {
    const container = document.createElement("div");
    const viewHost = {
      ...host({ templates: [{ key: "comfort", name: "Comfort", blocks: [] }] }),
      _selectedTemplateKey: "comfort",
      _timelineBlocks: () => [],
      _currentTimelineNow: () => new Date(2026, 8, 27, 12, 0),
    } as VelairViewHost;

    render(renderTemplatesView(viewHost), container);

    expect(container.querySelector(".template-block-heading")).toBeNull();
    expect(container.querySelector(".template-block-list")).not.toBeNull();
  });
  it("groups read-only day links without counting template slots or merging profile identities", () => {
    const container = document.createElement("div");
    const state = {
      ...host({ templates: [{ key: "comfort", name: "Comfort", blocks: [{ start: "07:00" }, { start: "23:00" }] }] }),
      _selectedTemplateKey: "comfort",
      _timelineBlocks: () => [],
      _currentTimelineNow: () => new Date(2026, 8, 27, 12),
      _t: (key: string, params?: { count?: number }) => key === "templateLinkedDays" ? `Linked days: ${params?.count}` : key,
      _data: {
        profiles: [{ key: "a", name: "Office" }, { key: "b", name: "Office" }, { key: "default", name: "Profile Default" }],
        resource_usages: { templates: { comfort: [
          { source: "profile", profile_key: "b", entity_id: "climate.heat", weekday: "thu" },
          { source: "default", entity_id: "climate.heat", weekday: "wed" },
          { source: "profile", profile_key: "a", entity_id: "climate.heat", weekday: "fri" },
          { source: "default", entity_id: "climate.heat", weekday: "mon" },
          { source: "profile", profile_key: "default", entity_id: "climate.heat", weekday: "sun" },
          { source: "profile", profile_key: "missing", entity_id: "climate.cool", weekday: "tue" },
        ] } },
      },
    } as unknown as VelairViewHost;
    render(renderTemplatesView(state), container);
    const groups = container.querySelectorAll(".template-usage-group");
    expect(groups).toHaveLength(2);
    expect(groups[0].querySelector("header .pill")?.textContent).toBe("Linked days: 5");
    expect(groups[1].querySelector("header .pill")?.textContent).toBe("Linked days: 1");
    const rows = groups[0].querySelectorAll(".template-usage-item");
    expect(rows).toHaveLength(4);
    expect(rows[0].querySelector("strong")?.textContent).toBe("modeDefault");
    expect(rows[0].querySelector("span")?.textContent).toBe("mon · templateLinkHours, wed · templateLinkHours");
    expect(rows[1].querySelector("strong")?.textContent).toBe("Office");
    expect(rows[2].querySelector("strong")?.textContent).toBe("Office");
    expect(rows[3].querySelector("strong")?.textContent).toBe("Profile Default");
    expect(groups[1].textContent).toContain("missing");
    expect(container.querySelector(".template-usages")?.textContent).not.toMatch(/07:00|23:00|undefined/);
    expect(container.querySelector(".template-usages button, .template-usages a")).toBeNull();
    expect(container.querySelector(".resource-item-footer .resource-use-count")?.textContent?.trim()).toBe("Linked days: 6");
    const details = container.querySelector(".template-usage-section") as HTMLDetailsElement;
    expect(details.querySelector("summary > ha-icon")?.getAttribute("icon")).toBe("mdi:link-variant");
    expect(details.querySelector(".resource-section-chevron")?.getAttribute("icon")).toBe("mdi:chevron-down");
    details.querySelector("summary")!.click();
    expect(details.open).toBe(true);
    render(renderTemplatesView(state), container);
    expect(details.open).toBe(true);
    const trash = container.querySelector(".template-item-delete") as HTMLButtonElement;
    expect(trash.disabled).toBe(true);
    expect(trash.parentElement?.title).toBe("templateDeleteInUse");
    trash.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(state._selectTemplate).not.toHaveBeenCalled();
    expect(state._deleteSelectedTemplate).not.toHaveBeenCalled();
  });

  it("preserves deleting an unused template", () => {
    const container = document.createElement("div");
    const state = host({ templates: [{ key: "unused", name: "Unused", blocks: [] }] });
    state._selectTemplate = vi.fn((key: string) => { state._selectedTemplateKey = key; });
    render(renderTemplatesView(state), container);
    const trash = container.querySelector(".template-item-delete") as HTMLButtonElement;
    expect(trash.disabled).toBe(false);
    trash.click();
    expect(state._selectTemplate).toHaveBeenCalledWith("unused");
    expect(state._deleteSelectedTemplate).toHaveBeenCalledOnce();
  });

  it("integrates assignments into linked days and supports destination scalar/range transitions", () => {
    const container = document.createElement("div");
    const state = host({ templates: [{ key: "daily", name: "Daily", blocks: [] }] });
    Object.assign(state, {
      _selectedTemplateKey: "daily", _selectedWeekday: "monday", renderRoot: container,
      _inputValue: (event: Event) => (event.target as HTMLInputElement).value,
      _currentTimelineNow: () => new Date(), _timelineBlocks: () => [],
      _temperatureError: () => undefined, _temperatureLimits: () => [7, 35], _temperatureStep: () => .5,
      _temperatureUnit: () => "C", _hvacModeOptions: () => ["heat_cool", "cool", "off"],
      _fanModeOptions: () => [], _presetModeOptions: () => [], _swingModeOptions: () => [],
      _swingHorizontalModeOptions: () => [], _humidityLimits: () => undefined,
      _modeLabel: (value: string) => value, _formatTemperature: (value: number) => `${value} C`,
      hass: { states: { "climate.office": { state: "cool", attributes: { supported_features: 3, hvac_modes: ["cool", "heat_cool"], temperature: 22, target_temp_low: 19, target_temp_high: 25 } } } },
    });
    state._setTemplateImpact = (impact) => { state._templateImpact = impact; };
    state._templateImpact = createTemplateImpact({
      template: { key: "daily", name: "Daily", blocks: [{ start: "09:00", slot_id: "new", action: "set_temperature", temperature: 21 }] },
      configuration_revision: 1, added_slot_ids: ["new"], removed_slot_ids: [],
      usages: [{ source: "default", entity_id: "climate.office", weekday: "monday" }],
      proposals: [{ destination: { source: "default", entity_id: "climate.office", weekday: "monday" }, slot_id: "new", origin: "template", binding: { action: "set_temperature", temperature: 21, hvac_mode: "cool" } }],
    }, "Daily");
    render(renderTemplatesView(state), container);
    expect(container.querySelector(".template-usage-section .template-assignment-slot")).not.toBeNull();
    const assignmentGrid = container.querySelector(".template-assignment-slot > .draft-list")!;
    expect(assignmentGrid).not.toBeNull();
    expect(assignmentGrid.querySelector(".draft-list-header")).not.toBeNull();
    expect(assignmentGrid.querySelector(".editable-block")).not.toBeNull();
    expect(assignmentGrid.parentElement?.querySelector(":scope > .template-assignment-status")).not.toBeNull();
    expect(container.querySelector(".template-apply-panel")).toBeNull();
    expect(container.querySelectorAll('button[title="save"]')).toHaveLength(1);
    let mode = container.querySelector<HTMLSelectElement>(".template-assignment-slot select")!;
    mode.value = "heat_cool"; mode.dispatchEvent(new Event("change"));
    expect(state._templateImpact.assignments[0].drafts[0]).toMatchObject({ hvac_mode: "heat_cool", target_temp_low: "", target_temp_high: "" });
    render(renderTemplatesView(state), container);
    expect(container.querySelectorAll(".template-assignment-slot .range-temperature-field")).toHaveLength(2);
    mode = container.querySelector<HTMLSelectElement>(".template-assignment-slot select")!;
    mode.value = "cool"; mode.dispatchEvent(new Event("change"));
    expect(state._templateImpact.assignments[0].drafts[0]).toMatchObject({ hvac_mode: "cool", temperature: 21 });
    expect(state._templateImpact.assignments[0].drafts[0].target_temp_low).toBeUndefined();
    render(renderTemplatesView(state), container);
    expect(container.querySelector('.template-assignment-slot .target-format-action')).toBeNull();
  });

  it("does not present template temperatures as invalid for the selected reference climate", () => {
    const container = document.createElement("div");
    const state = host({ templates: [{ key: "daily", name: "Daily", blocks: [] }] });
    Object.assign(state, {
      _selectedTemplateKey: "daily", _templateDraftBlocks: [{ start: "09:00", action: "set_temperature", temperature: "99", hvac_mode: "heat" }],
      _currentTimelineNow: () => new Date(), _timelineBlocks: () => [],
      _temperatureError: () => "Use 7 to 35", _temperatureLimits: () => [7, 35], _temperatureStep: () => .5,
      _temperatureUnit: () => "C", _hvacModeOptions: () => ["heat", "off"], _fanModeOptions: () => [],
      _presetModeOptions: () => [], _swingModeOptions: () => [], _swingHorizontalModeOptions: () => [], _humidityLimits: () => undefined,
      _modeLabel: (value: string) => value, _formatTemperature: (value: number) => `${value} C`,
    });
    render(renderTemplatesView(state), container);
    const input = container.querySelector<HTMLInputElement>('.template-editor input[type="number"]')!;
    expect(input.value).toBe("99");
    expect(input.classList.contains("invalid")).toBe(false);
    expect(input.hasAttribute("min")).toBe(false);
    expect(input.hasAttribute("max")).toBe(false);
    expect(input.step).toBe("any");
  });

  it("keeps saved resource diagnostics distinct from candidate destination errors", () => {
    const container = document.createElement("div");
    const state = host({ templates: [{ key: "daily", name: "Daily", blocks: [] }] });
    const destination = { source: "default" as const, entity_id: "climate.office", weekday: "monday" };
    Object.assign(state, { _selectedTemplateKey: "daily", _currentTimelineNow: () => new Date(), _timelineBlocks: () => [],
      _data: { resource_usages: { templates: { daily: [destination] } }, resource_diagnostics: [
        { source: "default", entity_id: "climate.office", code: "saved_invalid", message: "Existing schedule needs repair" },
      ] },
    });
    render(renderTemplatesView(state), container);
    expect(container.querySelector(".template-saved-diagnostics")?.textContent).toContain("templateSavedDiagnostics");
    expect(container.querySelector(".template-saved-diagnostics")?.textContent).toContain("Existing schedule needs repair");
    expect(container.querySelector(".template-draft-diagnostics")).toBeNull();
    state._templateImpact = createTemplateImpact({ template: { key: "daily", name: "Daily", blocks: [] },
      usages: [destination], added_slot_ids: [], removed_slot_ids: [], configuration_revision: 1,
      destination_errors: [{ destination, code: "candidate_invalid", message: "Candidate schedule needs correction" }],
    }, "Daily");
    render(renderTemplatesView(state), container);
    expect(container.querySelector(".template-saved-diagnostics")?.textContent).toContain("Existing schedule needs repair");
    expect(container.querySelector(".template-saved-diagnostics")?.textContent).not.toContain("Candidate schedule");
    expect(container.querySelector(".template-draft-diagnostics")?.textContent).toContain("templateAssignmentErrors");
    expect(container.querySelector(".template-draft-diagnostics")?.textContent).toContain("Candidate schedule needs correction");
  });

  it("shows backend-adapted preset settings without a failure warning or retry", () => {
    const container = document.createElement("div");
    const state = host({ templates: [{ key: "daily", name: "Daily", blocks: [] }] });
    const destination = { source: "default" as const, entity_id: "climate.office", weekday: "monday" };
    Object.assign(state, {
      _selectedTemplateKey: "daily", _currentTimelineNow: () => new Date(), _timelineBlocks: () => [],
      _temperatureError: () => undefined, _temperatureLimits: () => [7, 35], _temperatureStep: () => .5,
      _temperatureUnit: () => "C", _hvacModeOptions: () => ["heat", "off"], _fanModeOptions: () => [],
      _presetModeOptions: () => [], _swingModeOptions: () => [], _swingHorizontalModeOptions: () => [], _humidityLimits: () => undefined,
      _modeLabel: (value: string) => value, _formatTemperature: (value: number) => `${value} C`,
      _data: { block_presets: [{ key: "comfort", name: "Comfort", config: { action: "set_temperature", temperature: 23, hvac_mode: "heat" } }] },
    });
    state._templateImpact = createTemplateImpact({ template: { key: "daily", name: "Daily", blocks: [{ start: "09:00", slot_id: "new", action: "turn_off" }] },
      usages: [destination], added_slot_ids: ["new"], removed_slot_ids: [], configuration_revision: 1,
      proposals: [{ destination, slot_id: "new", origin: "saved_previous", donor_start: "07:00", binding: { preset_key: "comfort" },
        effective_config: { action: "set_temperature", temperature: 22, hvac_mode: "heat" } }],
    }, "Daily");
    render(renderTemplatesView(state), container);
    const slot = container.querySelector(".template-assignment-slot")!;
    expect(slot.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe("22");
    expect(slot.querySelector<HTMLInputElement>('input[type="number"]')?.readOnly).toBe(false);
    expect(slot.textContent).not.toContain("sharedPresetUnavailable");
    expect(slot.querySelector(".preset-preview-retry")).toBeNull();
  });

});
