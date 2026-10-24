// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { renderPreconditioningView } from "../../src/velair/views/preconditioning-view";
import type {
  PreconditioningDiagnostics,
  PreconditioningLearningSummary,
  ScheduleEvent,
} from "../../src/velair/types";

function diagnostics(
  direction: "heat" | "cool",
  boundaryTemperature: number,
): PreconditioningDiagnostics {
  return {
    direction,
    boundary_temperature: boundaryTemperature,
    target_boundary: direction === "heat" ? "low" : "high",
    delta_temperature: 2,
    complete_sample_count: 0,
    partial_sample_count: 0,
    invalid_sample_count: 0,
    similar_sample_count: 0,
    comfort_percentile: 80,
    complete_estimate_minutes: 60,
    partial_floor_minutes: 0,
    combined_estimate_minutes: 60,
    rounded_estimate_minutes: 60,
    final_lead_minutes: 60,
    limited_by_min_start: false,
    limited_by_max_lead: false,
    source: "initial_model",
    used_outdoor_temperature: false,
    initial_model_lead_minutes: 60,
  };
}

function learningBothDirections(): PreconditioningLearningSummary {
  return {
    status: "learning",
    required_samples: 5,
    total_samples: 0,
    heat: {
      status: "learning",
      sample_count: 0,
      total_samples: 0,
      required_samples: 5,
      complete_sample_count: 0,
      partial_sample_count: 0,
      invalid_sample_count: 0,
      model_source: "initial_model",
    },
    cool: {
      status: "learning",
      sample_count: 0,
      total_samples: 0,
      required_samples: 5,
      complete_sample_count: 0,
      partial_sample_count: 0,
      invalid_sample_count: 0,
      model_source: "initial_model",
    },
  };
}

function host(options: {
  entityExists?: boolean;
  expandedZoneIds?: string[];
  useOutdoorTemperature?: boolean;
} = {}) {
  const saveZonePreconditioning = vi.fn(async () => {});
  const resetZonePreconditioningSettings = vi.fn(async () => {});
  const resetZonePreconditioningLearning = vi.fn(async () => {});
  const togglePreconditioningZone = vi.fn();
  const viewHost = {
    _data: {
      configured_entities: ["climate.first", "climate.second"],
      zones: {
        "climate.first": {
          enabled: true,
          preconditioning: {
            enabled: false,
            use_outdoor_temperature: options.useOutdoorTemperature ?? true,
            outdoor_temperature_entity_id: "sensor.outdoor",
          },
          schedule: {},
        },
        "climate.second": {
          enabled: true,
          preconditioning: { enabled: true },
          schedule: {},
        },
      },
      next_events: [],
      preconditioning_learning: {},
    },
    hass: {
      config: {
        unit_system: {
          temperature: "C",
        },
      },
      states: {
        "sensor.bedroom_temperature": {
          state: "20.4",
          attributes: {
            device_class: "temperature",
            friendly_name: "Bedroom temperature",
            unit_of_measurement: "C",
          },
        },
      },
    },
    _expandedPreconditioningZones: new Set(options.expandedZoneIds ?? []),
    _entityExists: () => options.entityExists ?? true,
    _friendlyEntityName: (entityId: string) =>
      entityId === "climate.first" ? "First" : "Second",
    _formatDateTime: (value: string) => `date:${value}`,
    _formatEventAction: (event: ScheduleEvent) =>
      typeof event.temperature === "number"
        ? `${event.temperature} C`
        : `${event.target_temp_low}–${event.target_temp_high} C`,
    _formatEventMode: (event: ScheduleEvent) => String(event.hvac_mode),
    _formatTemperature: (value: number) => `${value} C`,
    _orderedZoneIds: (entityIds: string[]) => entityIds,
    _resetZonePreconditioningLearning: resetZonePreconditioningLearning,
    _resetZonePreconditioningSettings: resetZonePreconditioningSettings,
    _saveZonePreconditioning: saveZonePreconditioning,
    _settingsSaving: false,
    _t: (key: string, replacements?: Record<string, string | number>) =>
      replacements
        ? `${key}:${Object.values(replacements).join(":")}`
        : key,
    _togglePreconditioningZone: togglePreconditioningZone,
  } as unknown as VelairViewHost;

  return {
    resetZonePreconditioningLearning,
    resetZonePreconditioningSettings,
    saveZonePreconditioning,
    togglePreconditioningZone,
    viewHost,
  };
}

describe("preconditioning view", () => {
  it("saves and removes a master using the existing autosave path", () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.first"] });
    const container = document.createElement("div");
    render(renderPreconditioningView(viewHost, ["climate.first"]), container);
    const selector = container.querySelector<HTMLSelectElement>(".preconditioning-master-row select")!;
    const section = selector.closest(".preconditioning-config-section")!;
    expect(section.tagName).toBe("DETAILS");
    expect((section as HTMLDetailsElement).open).toBe(false);
    expect(section.querySelector(".preconditioning-master-label")?.textContent).toBe("preconditioningMaster");
    expect(section.querySelector(".preconditioning-master-current-value")?.textContent).toBe("preconditioningIndependent");
    expect(selector.closest(".select-wrap")).not.toBeNull();
    expect(section.classList.contains("preconditioning-master-section")).toBe(true);
    const guidance = section.querySelector(".preconditioning-master-guidance")!;
    expect(guidance.textContent).toContain("preconditioningMasterGuidanceTitle");
    expect(guidance.textContent).toContain("preconditioningMasterGuidance");
    expect(selector.getAttribute("aria-describedby")?.split(" ")).toEqual([
      guidance.id, section.querySelector(".preconditioning-master-help")!.id,
    ]);
    const visibleSection = section.cloneNode(true) as HTMLElement;
    visibleSection.querySelectorAll("dialog").forEach(dialog => dialog.remove());
    expect(visibleSection.textContent?.match(/preconditioningMaster\b/g)).toHaveLength(1);
    expect(guidance.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:information-outline");
    expect(section.querySelector(".documentation-help-button")?.getAttribute("aria-haspopup")).toBe("dialog");
    expect(section.querySelectorAll(".documentation-help-button")).toHaveLength(1);
    expect(section.querySelector("summary .preconditioning-master-heading .documentation-help-button")).not.toBeNull();
    expect(section.querySelector<HTMLAnchorElement>(".documentation-guide")?.href)
      .toMatch(/\/adaptive-preconditioning\.md#preconditioning-master$/);
    expect(selector.getAttribute("aria-label")).toBe("preconditioningMaster");
    expect(selector.value).toBe("");
    selector.value = "climate.second";
    selector.dispatchEvent(new Event("change"));
    expect(saveZonePreconditioning).toHaveBeenLastCalledWith("climate.first", { master_entity_id: "climate.second" });
    selector.value = "";
    selector.dispatchEvent(new Event("change"));
    expect(saveZonePreconditioning).toHaveBeenLastCalledWith("climate.first", { master_entity_id: null });
  });

  it("retains an invalid saved master and explains the blocked relation", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    viewHost._data!.zones["climate.second"].preconditioning!.master_entity_id = "climate.missing";
    const container = document.createElement("div");
    render(renderPreconditioningView(viewHost, ["climate.second"]), container);
    expect(container.querySelector<HTMLSelectElement>(".preconditioning-master-row select")!.value).toBe("climate.missing");
    expect(container.querySelector(".preconditioning-master-current-value")?.textContent).toBe(viewHost._friendlyEntityName("climate.missing"));
    expect(container.querySelector(".preconditioning-master-help")?.textContent).toBe("preconditioningMasterNotManaged");
    expect(container.querySelector(".preconditioning-master-guidance")).not.toBeNull();
    expect(container.querySelector(".preconditioning-zone-heading")!.textContent).not.toContain("preconditioningDependencyAssociation");
    viewHost._expandedPreconditioningZones.clear();
    render(renderPreconditioningView(viewHost, ["climate.second"]), container);
    expect(container.querySelector(".preconditioning-zone-heading")!.textContent).toContain("preconditioningDependencyAssociation");
  });

  it.each([
    { state: "heat", enabled: true, preconditioning: true, expected: "preconditioningMasterHelp" },
    { state: "off", enabled: true, preconditioning: true, expected: "preconditioningMasterHelp" },
    { state: "heat", enabled: true, preconditioning: false, expected: "preconditioningMasterPreconditioningDisabled" },
    { state: "heat", enabled: false, preconditioning: true, expected: "preconditioningMasterSchedulingDisabled" },
    { state: "unavailable", enabled: true, preconditioning: true, expected: "preconditioningMasterUnavailable" },
    { state: "unknown", enabled: true, preconditioning: true, expected: "preconditioningMasterStateUnknown" },
  ])("explains the actual master condition: $expected ($state)", ({ state, enabled, preconditioning, expected }) => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"] });
    const source = viewHost._data!.zones["climate.second"];
    source.enabled = enabled;
    source.preconditioning!.enabled = preconditioning;
    viewHost._data!.zones["climate.first"].preconditioning!.master_entity_id = "climate.second";
    viewHost.hass!.states["climate.second"] = { state, attributes: {} };
    const container = document.createElement("div");
    render(renderPreconditioningView(viewHost, ["climate.first"]), container);
    expect(container.querySelector(".preconditioning-master-help")?.textContent).toBe(expected);
    expect(container.querySelector<HTMLSelectElement>(".preconditioning-master-row select")!.value).toBe("climate.second");
  });

  it("distinguishes a missing HA entity from an ineligible saved relation", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"] });
    viewHost._data!.zones["climate.first"].preconditioning!.master_entity_id = "climate.second";
    viewHost._entityExists = entityId => entityId === "climate.first";
    const container = document.createElement("div");
    render(renderPreconditioningView(viewHost, ["climate.first"]), container);
    expect(container.querySelector(".preconditioning-master-help")?.textContent).toBe("preconditioningMasterEntityMissing");
    viewHost._data!.zones["climate.second"].preconditioning!.master_entity_id = "climate.first";
    render(renderPreconditioningView(viewHost, ["climate.first"]), container);
    expect(container.querySelector(".preconditioning-master-help")?.textContent).toBe("preconditioningMasterIneligible");
  });

  it.each(["heat", "cool"] as const)("keeps dependency evidence on nominal blocked %s events", (direction) => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    viewHost._data!.preconditioning_learning = { "climate.second": learningBothDirections() };
    viewHost._data!.next_events = [{ entity_id: "climate.second", when: "2026-10-19T18:00:00Z", weekday: "mon", start: "18:00", hvac_mode: direction, temperature: 21,
      preconditioning_dependency: { master_entity_id: "climate.first", independent_start: "2026-10-19T17:00:00Z", reason: "master_no_preconditioning" } }];
    const container = document.createElement("div");
    render(renderPreconditioningView(viewHost, ["climate.second"]), container);
    expect(container.querySelector(".preconditioning-calculation-details")!.textContent).toContain("preconditioningDependencyNoStart");
    expect(container.textContent).toContain("date:2026-10-19T17:00:00Z");
  });
  it("uses matching backend evidence in master setup and ignores evidence for a different saved master", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"] });
    viewHost._data!.zones["climate.first"].preconditioning!.master_entity_id = "climate.second";
    viewHost._data!.next_events = [{ entity_id: "climate.first", when: "2026-10-19T18:00:00Z", weekday: "mon", start: "18:00", hvac_mode: "heat", temperature: 21,
      preconditioning_dependency: { master_entity_id: "climate.second", reason: "planned", reason_detail: "master_override_active" } }];
    const container = document.createElement("div");
    render(renderPreconditioningView(viewHost, ["climate.first"]), container);
    expect(container.querySelector(".preconditioning-master-help")?.textContent).toBe("preconditioningMasterOverrideActive");
    viewHost._data!.next_events[0].preconditioning_dependency!.master_entity_id = "climate.old";
    render(renderPreconditioningView(viewHost, ["climate.first"]), container);
    expect(container.querySelector(".preconditioning-master-help")?.textContent).toBe("preconditioningMasterHelp");
  });
  it("shows a dated skipped reason directly from a schedule response without Diagnostics", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const learning = learningBothDirections();
    learning.heat.activity = { state: "waiting" };
    learning.heat.last_transition = { at: "2026-10-19T08:00:00Z", status: "skipped", reason: "delta_too_small" };
    viewHost._data!.preconditioning_learning = { "climate.second": learning };
    const container = document.createElement("div");
    expect(viewHost._data!.diagnostics).toBeUndefined();
    render(renderPreconditioningView(viewHost, ["climate.second"]), container);
    const line = () => container.querySelector(".heat .preconditioning-learning-activity")!.textContent;
    expect(line()).toContain("learningLastSkippedTransition:date:2026-10-19T08:00:00Z:learningReasonDeltaTooSmall");
    delete learning.heat.last_transition;
    render(renderPreconditioningView(viewHost, ["climate.second"]), container);
    expect(line()).toContain("learningActivityWaiting");
    expect(line()).not.toContain("learningLastSkippedTransition");
  });

  it("shows one current activity per direction and opens room diagnostics without repeating past results", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const learning = learningBothDirections();
    learning.heat.activity = { state: "observing", at: "2026-10-19T08:00:00Z" };
    learning.cool.activity = { state: "unavailable", reason: "temperature_unavailable" };
    viewHost._data!.preconditioning_learning = { "climate.second": learning };
    viewHost._openLearningDiagnostics = vi.fn();
    const container = document.createElement("div");
    render(renderPreconditioningView(viewHost, ["climate.second"]), container);
    expect(container.querySelectorAll(".preconditioning-learning-activity")).toHaveLength(2);
    expect(container.querySelector(".heat .preconditioning-learning-activity")?.textContent).toContain("learningActivityObserving");
    expect(container.querySelector(".cool .preconditioning-learning-activity")?.textContent).toContain("learningReasonTemperatureUnavailable");
    expect(container.querySelector(".preconditioning-learning-activity")?.textContent).not.toContain("learningLastTransition");
    expect(container.querySelectorAll('.learning-diagnostics-link > ha-icon[icon="mdi:stethoscope"][aria-hidden="true"]')).toHaveLength(2);
    expect(container.querySelectorAll(".learning-diagnostics-link > span")).toHaveLength(2);
    container.querySelector<HTMLButtonElement>(".learning-diagnostics-link")!.click();
    expect(viewHost._openLearningDiagnostics).toHaveBeenCalledWith("climate.second");
  });

  it("omits activity for old backend responses and avoids a repeated disabled state", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const learning = learningBothDirections();
    viewHost._data!.preconditioning_learning = { "climate.second": learning };
    const container = document.createElement("div");
    render(renderPreconditioningView(viewHost, ["climate.second"]), container);
    expect(container.querySelector(".preconditioning-learning-activity")).toBeNull();
    learning.heat.activity = { state: "disabled" };
    learning.cool.activity = { state: "waiting" };
    render(renderPreconditioningView(viewHost, ["climate.second"]), container);
    expect(container.querySelectorAll(".preconditioning-learning-activity")).toHaveLength(1);
    expect(container.querySelector(".cool .preconditioning-learning-activity")?.textContent).toContain("learningActivityWaiting");
  });

  it("renders climates in the provided user order", () => {
    const { viewHost } = host();
    const container = document.createElement("div");

    render(
      renderPreconditioningView(
        viewHost,
        ["climate.second", "climate.first"],
      ),
      container,
    );

    expect(container.querySelector(".preconditioning-intro")?.textContent).toContain(
      "preconditioningIntroTitle",
    );
    expect(container.querySelector(".preconditioning-intro")?.textContent).toContain(
      "preconditioningIntroDetail",
    );
    expect(
      [...container.querySelectorAll(".preconditioning-zone-identity strong")]
        .map((element) => element.textContent?.trim()),
    ).toEqual(["Second", "First"]);
  });

  it("renders climates collapsed by default and requests expansion from the heading", () => {
    const { togglePreconditioningZone, viewHost } = host();
    const container = document.createElement("div");

    render(renderPreconditioningView(viewHost, ["climate.first"]), container);

    const zone = container.querySelector(".preconditioning-zone");
    const toggle = container.querySelector<HTMLButtonElement>(".preconditioning-zone-toggle");
    expect(zone?.classList).toContain("collapsed");
    expect(container.querySelector(".preconditioning-zone-content")).toBeNull();
    expect(container.querySelector(".preconditioning-climate-icon")).toBeNull();
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(toggle?.getAttribute("aria-label")).toBe("preconditioningExpandClimate:First");
    expect(toggle?.querySelector(".preconditioning-expand-icon")?.getAttribute("icon")).toBe(
      "mdi:chevron-right",
    );

    toggle?.click();
    expect(togglePreconditioningZone).toHaveBeenCalledWith("climate.first");
  });

  it("lets the whole preconditioning heading toggle the collapsed row", () => {
    const { togglePreconditioningZone, viewHost } = host();
    const container = document.createElement("div");

    render(renderPreconditioningView(viewHost, ["climate.first"]), container);

    container.querySelector<HTMLElement>(".preconditioning-zone-heading")?.click();

    expect(togglePreconditioningZone).toHaveBeenCalledWith("climate.first");
  });

  it("renders expanded climate controls with a matching accessible relationship", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"] });
    const container = document.createElement("div");

    render(renderPreconditioningView(viewHost, ["climate.first"]), container);

    const zone = container.querySelector(".preconditioning-zone");
    const toggle = container.querySelector(".preconditioning-zone-toggle");
    const content = container.querySelector(".preconditioning-zone-content");
    expect(zone?.classList).toContain("expanded");
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(toggle?.getAttribute("aria-controls")).toBe(content?.id);
    expect(toggle?.getAttribute("aria-label")).toBe("preconditioningCollapseClimate:First");
    expect(toggle?.querySelector(".preconditioning-expand-icon")?.getAttribute("icon")).toBe(
      "mdi:chevron-down",
    );
  });

  it("groups tuning controls in a stable logical order", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"] });
    const container = document.createElement("div");

    render(renderPreconditioningView(viewHost, ["climate.first"]), container);

    expect(
      [...container.querySelectorAll(".preconditioning-config-section h3, .preconditioning-master-label")]
        .map((element) => element.textContent?.trim()),
    ).toEqual([
      "preconditioningMaster",
      "preconditioningTiming",
      "preconditioningModel",
      "preconditioningHistory",
      "preconditioningOutdoorContext",
    ]);

    const sections = [...container.querySelectorAll(".preconditioning-config-section")];
    expect(sections).toHaveLength(5);
    expect(
      sections.every(
        (section) =>
          section.querySelector(":scope > h3, :scope > summary") !== null &&
          section.querySelector(":scope > .preconditioning-config-rows") !== null,
      ),
    ).toBe(true);
  });

  it("puts thermal units in labels instead of input suffixes", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"] });
    (viewHost as any)._temperatureUnit = () => "°F";
    const container = document.createElement("div");

    render(renderPreconditioningView(viewHost, ["climate.first"]), container);

    const rows = [...container.querySelectorAll(".preconditioning-config-row")];
    expect(rows.some((row) => row.textContent?.includes("preconditioningMinimumDelta (°F)"))).toBe(true);
    expect(rows.some((row) => row.textContent?.includes("preconditioningFallbackMinutesPerDegree (minutesShort/°F)"))).toBe(true);
    expect(container.querySelectorAll(".preconditioning-number-input > span")).toHaveLength(0);
  });

  it("provides concise focusable help for every tuning control", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"] });
    const container = document.createElement("div");

    render(renderPreconditioningView(viewHost, ["climate.first"]), container);

    const helpItems = [...container.querySelectorAll(".inline-help")];
    expect(helpItems).toHaveLength(12);
    expect(helpItems.every((item) => item.tagName === "BUTTON")).toBe(true);
    expect(helpItems[0]?.getAttribute("aria-label")).toBe(
      "preconditioningMinStartHelp",
    );
    const described = helpItems[0]?.getAttribute("aria-describedby");
    expect(container.querySelector(`#${described}`)?.textContent).toContain(
      "preconditioningMinStartHelp",
    );
  });

  it("keeps help IDs unique across climates and live heat/cool directions", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.first", "climate.second"],
    });
    const data = (viewHost as unknown as { _data: any })._data;
    data.zones["climate.first"].preconditioning.enabled = true;
    data.preconditioning_learning = {
      "climate.first": learningBothDirections(),
      "climate.second": learningBothDirections(),
    };
    const container = document.createElement("div");
    render(renderPreconditioningView(viewHost, ["climate.first", "climate.second"]), container);

    const tooltips = [...container.querySelectorAll<HTMLElement>(".inline-help-tooltip")];
    const ids = tooltips.map((tooltip) => tooltip.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const button of container.querySelectorAll<HTMLElement>(".inline-help")) {
      const describedBy = button.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(container.querySelectorAll(`#${describedBy}`)).toHaveLength(1);
    }
    expect(ids).toContain("preconditioning-climate-first-heat-live-prediction-help");
    expect(ids).toContain("preconditioning-climate-first-cool-live-prediction-help");
    expect(ids).toContain("preconditioning-climate-second-heat-live-prediction-help");
    expect(ids).toContain("preconditioning-climate-second-cool-live-prediction-help");
    expect(container.querySelectorAll(".preconditioning-live-help .inline-help-overlay")).toHaveLength(4);
    expect(container.querySelectorAll('.preconditioning-live-label > ha-icon[icon="mdi:information-outline"][aria-hidden="true"]')).toHaveLength(4);
    expect(container.querySelector(".preconditioning-live-label .inline-help")).toBeNull();
  });

  it("persists enable changes for the selected climate", () => {
    const { saveZonePreconditioning, viewHost } = host();
    const container = document.createElement("div");

    render(
      renderPreconditioningView(viewHost, ["climate.first"]),
      container,
    );
    const toggle = container.querySelector("ha-switch") as HTMLElement & {
      checked: boolean;
    };
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));

    expect(saveZonePreconditioning).toHaveBeenCalledWith(
      "climate.first",
      { enabled: true },
    );
  });

  it("explains why an unavailable climate cannot be enabled", () => {
    const { viewHost } = host({ entityExists: false });
    const container = document.createElement("div");

    render(renderPreconditioningView(viewHost, ["climate.first"]), container);

    const control = container.querySelector(".preconditioning-enable-control");
    const toggle = control?.querySelector("ha-switch");
    const collapseToggle = container.querySelector<HTMLButtonElement>(".preconditioning-zone-toggle");
    const unavailableMessage = container.querySelector(".preconditioning-unavailable-message");
    expect(control?.getAttribute("title")).toBe("preconditioningUnavailable");
    expect(control?.textContent).not.toContain("preconditioningUnavailable");
    expect(unavailableMessage?.textContent).toContain("preconditioningUnavailable");
    expect(toggle?.hasAttribute("disabled")).toBe(true);
    expect(collapseToggle?.disabled).toBe(true);
    expect(collapseToggle?.getAttribute("aria-label")).toBe("preconditioningUnavailable");
  });

  it("disables and labels the outdoor sensor when outdoor context is off", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.first"],
      useOutdoorTemperature: false,
    });
    const container = document.createElement("div");

    render(renderPreconditioningView(viewHost, ["climate.first"]), container);

    const select = container.querySelector(".preconditioning-sensor-row select") as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.value).toBe("");
    expect(select.selectedOptions[0]?.textContent?.trim()).toBe(
      "preconditioningOutdoorDisabled",
    );
  });

  it("requests a settings reset for one climate", () => {
    const { resetZonePreconditioningSettings, viewHost } = host();
    const container = document.createElement("div");

    render(renderPreconditioningView(viewHost, ["climate.first"]), container);
    (container.querySelector(".preconditioning-settings-reset") as HTMLButtonElement).click();

    expect(resetZonePreconditioningSettings).toHaveBeenCalledWith("climate.first");
  });

  it("summarizes each supported learning direction with indicators and sample chips", () => {
    const { resetZonePreconditioningLearning, viewHost } = host({
      expandedZoneIds: ["climate.second"],
    });
    const container = document.createElement("div");
    if (viewHost._data) {
      viewHost._data.preconditioning_learning = {
        "climate.second": {
          status: "ready",
          required_samples: 5,
          total_samples: 11,
          heat: {
            status: "ready",
            sample_count: 6,
            total_samples: 8,
            required_samples: 5,
            complete_sample_count: 6,
            partial_sample_count: 1,
            invalid_sample_count: 1,
            model_source: "history",
          },
          cool: {
            status: "learning",
            sample_count: 2,
            total_samples: 3,
            required_samples: 5,
            complete_sample_count: 2,
            partial_sample_count: 1,
            invalid_sample_count: 0,
            model_source: "initial_model",
          },
        },
      };
    }

    render(renderPreconditioningView(viewHost, ["climate.second"]), container);

    expect(container.querySelectorAll(".preconditioning-direction")).toHaveLength(2);
    expect(container.querySelector(".preconditioning-direction.heat")).not.toBeNull();
    expect(container.querySelector(".preconditioning-direction.cool")).not.toBeNull();
    expect(container.querySelectorAll(".preconditioning-learning-indicator")).toHaveLength(4);
    expect(container.querySelectorAll(".preconditioning-learning-status-card")).toHaveLength(2);
    expect(container.querySelectorAll(".preconditioning-sample-card")).toHaveLength(2);
    expect(container.querySelectorAll(".preconditioning-sample-chip")).toHaveLength(6);
    expect(
      container.querySelectorAll(".preconditioning-sample-card > .preconditioning-sample-chips .preconditioning-sample-chip"),
    ).toHaveLength(6);
    expect(container.querySelector(".preconditioning-learning-indicator .preconditioning-sample-chip")).toBeNull();
    expect(container.querySelectorAll(".preconditioning-prediction")).toHaveLength(2);
    expect(container.querySelector(".preconditioning-sample-chip ha-icon")).toBeNull();
    expect(container.querySelector(".preconditioning-learning-table")).toBeNull();

    const heat = container.querySelector(".preconditioning-direction");
    expect(heat?.textContent).toContain("preconditioningLearningReady");
    expect(heat?.textContent).toContain("preconditioningModelHistory");
    expect(heat?.textContent).toContain("preconditioningReachedEvents");
    expect(heat?.textContent).not.toContain("preconditioningSimilarSamples");
    expect(heat?.textContent).not.toContain("preconditioningLastSample");

    const resetButtons = container.querySelectorAll<HTMLButtonElement>(
      ".preconditioning-learning-reset",
    );
    expect(resetButtons).toHaveLength(2);
    expect(resetButtons[0]?.querySelector("ha-icon")?.getAttribute("icon")).toBe(
      "mdi:restore",
    );
    resetButtons[0]?.click();
    expect(resetZonePreconditioningLearning).toHaveBeenCalledWith(
      "climate.second",
      "heat",
      "preconditioningHeat",
    );
  });

  it("shows the next preconditioning start and target time for a direction", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.second"],
    });
    const container = document.createElement("div");
    if (viewHost._data) {
      viewHost._data.next_events = [
        {
          entity_id: "climate.second",
          when: "2026-06-22T06:40:00+02:00",
          target_when: "2026-06-22T09:30:00+02:00",
          weekday: "monday",
          start: "09:30",
          temperature: 23,
          hvac_mode: "heat",
        },
      ];
      viewHost._data.preconditioning_learning = {
        "climate.second": {
          status: "ready",
          required_samples: 5,
          total_samples: 5,
          heat: {
            status: "ready",
            sample_count: 5,
            total_samples: 5,
            required_samples: 5,
            complete_sample_count: 5,
            partial_sample_count: 0,
            invalid_sample_count: 0,
            model_source: "history",
          },
          cool: {
            status: "unsupported",
            sample_count: 0,
            total_samples: 0,
            required_samples: 5,
          },
        },
      };
    }

    render(renderPreconditioningView(viewHost, ["climate.second"]), container);

    const prediction = container.querySelector(".preconditioning-prediction");
    expect(prediction?.classList).toContain("early");
    expect(prediction?.querySelector(".preconditioning-block-preview")?.classList).toContain(
      "with-prestart",
    );
    expect(prediction?.querySelector(".preconditioning-prestart")).not.toBeNull();
    expect(prediction?.querySelector(".preconditioning-preview-block")?.classList).toContain(
      "mode-heat",
    );
    expect(prediction?.textContent).toContain("preconditioningNextBlock");
    expect(prediction?.textContent).toContain("preconditioningLivePrediction");
    expect(prediction?.textContent).toContain("date:2026-06-22T06:40:00+02:00");
    expect(prediction?.textContent).toContain("date:2026-06-22T09:30:00+02:00");
    expect(prediction?.textContent).toContain("preconditioningLeadTime");
    expect(prediction?.textContent).toContain("170");
    expect(prediction?.textContent).toContain("23 C");
    expect(prediction?.textContent).toContain("heat");
    expect(prediction?.textContent).not.toContain("preconditioningModelHistory");
  });

  it("shows heat_cool preconditioning under the effective diagnostic direction", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.second"],
    });
    const container = document.createElement("div");
    if (viewHost._data) {
      viewHost._data.next_events = [
        {
          entity_id: "climate.second",
          when: "2026-06-22T06:40:00+02:00",
          target_when: "2026-06-22T09:30:00+02:00",
          weekday: "monday",
          start: "09:30",
          temperature: 23,
          hvac_mode: "heat_cool",
          preconditioning_diagnostics: {
            direction: "cool",
            delta_temperature: 3,
            complete_sample_count: 0,
            partial_sample_count: 0,
            invalid_sample_count: 0,
            similar_sample_count: 0,
            comfort_percentile: 80,
            complete_rate_minutes_per_degree: null,
            complete_estimate_minutes: 90,
            partial_floor_minutes: 0,
            combined_estimate_minutes: 90,
            rounded_estimate_minutes: 90,
            final_lead_minutes: 90,
            limited_by_min_start: false,
            limited_by_max_lead: false,
            source: "initial_model",
            used_outdoor_temperature: false,
            initial_model_lead_minutes: 90,
          },
        },
      ];
      viewHost._data.preconditioning_learning = {
        "climate.second": {
          status: "learning",
          required_samples: 5,
          total_samples: 0,
          heat: {
            status: "learning",
            sample_count: 0,
            total_samples: 0,
            required_samples: 5,
            complete_sample_count: 0,
            partial_sample_count: 0,
            invalid_sample_count: 0,
            model_source: "initial_model",
          },
          cool: {
            status: "learning",
            sample_count: 0,
            total_samples: 0,
            required_samples: 5,
            complete_sample_count: 0,
            partial_sample_count: 0,
            invalid_sample_count: 0,
            model_source: "initial_model",
          },
        },
      };
    }

    render(renderPreconditioningView(viewHost, ["climate.second"]), container);

    const heatPrediction = container.querySelector(
      ".preconditioning-direction.heat .preconditioning-prediction",
    );
    const coolPrediction = container.querySelector(
      ".preconditioning-direction.cool .preconditioning-prediction",
    );
    expect(heatPrediction?.classList).toContain("empty");
    expect(coolPrediction?.classList).toContain("early");
    expect(coolPrediction?.querySelector(".preconditioning-preview-block")?.classList)
      .toContain("mode-cool");
    expect(coolPrediction?.textContent).toContain("heat_cool");
    expect(coolPrediction?.textContent).toContain("date:2026-06-22T06:40:00+02:00");
  });

  it("shows native heat_cool ranges for heat and cool using their prediction boundaries", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const container = document.createElement("div");
    if (viewHost._data) {
      viewHost._data.next_events = [
        {
          entity_id: "climate.second",
          when: "2026-06-22T06:30:00+02:00",
          target_when: "2026-06-22T08:00:00+02:00",
          weekday: "monday",
          start: "08:00",
          target_temp_low: 19,
          target_temp_high: 23,
          hvac_mode: "heat_cool",
          preconditioning_diagnostics: diagnostics("heat", 19),
        },
        {
          entity_id: "climate.second",
          when: "2026-06-22T18:00:00+02:00",
          target_when: "2026-06-22T18:00:00+02:00",
          weekday: "monday",
          start: "18:00",
          target_temp_low: 20,
          target_temp_high: 24,
          hvac_mode: "heat_cool",
          preconditioning_diagnostics: diagnostics("cool", 24),
        },
      ];
      viewHost._data.preconditioning_learning = {
        "climate.second": learningBothDirections(),
      };
    }

    render(renderPreconditioningView(viewHost, ["climate.second"]), container);

    const heatPrediction = container.querySelector(
      ".preconditioning-direction.heat .preconditioning-prediction",
    );
    const coolPrediction = container.querySelector(
      ".preconditioning-direction.cool .preconditioning-prediction",
    );
    expect(heatPrediction?.classList).toContain("early");
    expect(heatPrediction?.textContent).toContain("19–23 C");
    expect(heatPrediction?.querySelector(".preconditioning-range-boundary")?.textContent)
      .toContain("preconditioningPredictionLowerBoundary:19 C");
    expect(coolPrediction?.classList).toContain("normal");
    expect(coolPrediction?.querySelector(".preconditioning-prestart")).toBeNull();
    expect(coolPrediction?.textContent).toContain("20–24 C");
    expect(coolPrediction?.querySelector(".preconditioning-range-boundary")?.textContent)
      .toContain("preconditioningPredictionUpperBoundary:24 C");

    const boundaryLabels = [
      ...container.querySelectorAll(".preconditioning-range-boundary"),
    ];
    expect(boundaryLabels).toHaveLength(2);
    expect(boundaryLabels.every((label) =>
      label.parentElement?.classList.contains("preconditioning-preview-block"),
    )).toBe(true);
    expect(container.querySelector(".preconditioning-range-notice")).toBeNull();
    expect(container.textContent).not.toContain("preconditioningRangeUnsupported");
  });

  it("does not select an incomplete temperature range as a prediction candidate", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const container = document.createElement("div");
    if (viewHost._data) {
      viewHost._data.next_events = [
        {
          entity_id: "climate.second",
          when: "2026-06-22T06:30:00+02:00",
          target_when: "2026-06-22T08:00:00+02:00",
          weekday: "monday",
          start: "08:00",
          target_temp_low: 19,
          hvac_mode: "heat_cool",
          preconditioning_diagnostics: diagnostics("heat", 19),
        },
      ];
      viewHost._data.preconditioning_learning = {
        "climate.second": learningBothDirections(),
      };
    }

    render(renderPreconditioningView(viewHost, ["climate.second"]), container);

    expect(container.querySelectorAll(".preconditioning-prediction.empty")).toHaveLength(2);
    expect(container.querySelector(".preconditioning-range-boundary")).toBeNull();
  });

  it("keeps preconditioning calculation details collapsed behind a user action", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.second"],
    });
    const container = document.createElement("div");
    if (viewHost._data) {
      viewHost._data.next_events = [
        {
          entity_id: "climate.second",
          when: "2026-06-22T06:40:00+02:00",
          target_when: "2026-06-22T09:30:00+02:00",
          weekday: "monday",
          start: "09:30",
          temperature: 23,
          hvac_mode: "heat",
          preconditioning_diagnostics: {
            delta_temperature: 2,
            complete_sample_count: 5,
            partial_sample_count: 1,
            invalid_sample_count: 0,
            similar_sample_count: 6,
            comfort_percentile: 80,
            complete_rate_minutes_per_degree: 35,
            complete_estimate_minutes: 70,
            partial_floor_minutes: 96,
            combined_estimate_minutes: 96,
            rounded_estimate_minutes: 100,
            final_lead_minutes: 100,
            limited_by_min_start: false,
            limited_by_max_lead: false,
            source: "history",
            used_outdoor_temperature: true,
            initial_model_lead_minutes: 80,
          },
        },
      ];
      viewHost._data.preconditioning_learning = {
        "climate.second": {
          status: "ready",
          required_samples: 5,
          total_samples: 6,
          heat: {
            status: "ready",
            sample_count: 6,
            total_samples: 6,
            required_samples: 5,
            complete_sample_count: 5,
            partial_sample_count: 1,
            invalid_sample_count: 0,
            model_source: "history",
          },
          cool: {
            status: "unsupported",
            sample_count: 0,
            total_samples: 0,
            required_samples: 5,
          },
        },
      };
    }

    render(renderPreconditioningView(viewHost, ["climate.second"]), container);

    const details = container.querySelector<HTMLDetailsElement>(
      ".preconditioning-calculation-details",
    );
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(details?.querySelector("summary")?.textContent).toContain(
      "preconditioningCalculationDetails",
    );
    expect(details?.textContent).toContain("preconditioningCalculationSamples");
    expect(details?.textContent).toContain("preconditioningCalculationSampleCounts:5:1:0");
    expect(details?.textContent).toContain("preconditioningCalculationReachedEstimate");
    expect(details?.textContent).toContain("preconditioningCalculationPartialFloor");
    expect(details?.textContent).toContain("preconditioningCalculationCombined");
    expect(details?.textContent).toContain("preconditioningCalculationFinalLead");
    expect(details?.textContent).toContain("preconditioningCalculationRounded");
    expect(details?.textContent).not.toContain("preconditioningModelHistory");
    const compactLabel = details?.querySelector<HTMLElement>(
      ".preconditioning-calculation-item.compact .preconditioning-calculation-label",
    );
    expect(compactLabel?.getAttribute("tabindex")).toBe("0");
    expect(compactLabel?.getAttribute("title")).toBe("preconditioningSimilarSamples");
    expect(compactLabel?.querySelector(".preconditioning-calculation-tooltip")?.textContent)
      .toBe("preconditioningSimilarSamples");
  });

  it("explains when a supported direction has no upcoming matching block", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.second"],
    });
    const container = document.createElement("div");
    if (viewHost._data) {
      viewHost._data.preconditioning_learning = {
        "climate.second": {
          status: "learning",
          required_samples: 5,
          total_samples: 1,
          heat: {
            status: "learning",
            sample_count: 1,
            total_samples: 1,
            required_samples: 5,
            complete_sample_count: 1,
            partial_sample_count: 0,
            invalid_sample_count: 0,
            model_source: "initial_model",
          },
          cool: {
            status: "unsupported",
            sample_count: 0,
            total_samples: 0,
            required_samples: 5,
          },
        },
      };
    }

    render(renderPreconditioningView(viewHost, ["climate.second"]), container);

    const prediction = container.querySelector(".preconditioning-prediction.empty");
    expect(prediction?.textContent).toContain("preconditioningNextBlock");
    expect(prediction?.textContent).toContain(
      "preconditioningNoUpcomingDirectionEvent",
    );
    expect(prediction?.textContent).toContain("preconditioningHeat");
    expect(prediction?.textContent).not.toContain("preconditioningModelInitial");
  });
});

it("explains that range-only Heat, Cool and Auto targets cannot prepare early", () => {
  const { viewHost } = host();
  viewHost._data!.next_events = [{ entity_id: "climate.first", hvac_mode: "auto",
    action: "set_temperature", target_temp_low: 19, target_temp_high: 24, when: "2026-10-22T18:00:00Z" }] as ScheduleEvent[];
  const container = document.createElement("div");
  render(renderPreconditioningView(viewHost, ["climate.first"]), container);
  expect(container.textContent).toContain("unsupportedRangeThermalMode");
});

it.each([
  { rangeModes: ["heat"], requested: undefined, stateMode: "off", thermal: false },
  { rangeModes: ["heat_cool"], requested: undefined, stateMode: "off", thermal: true },
  { rangeModes: ["heat", "heat_cool"], requested: undefined, stateMode: "off", thermal: true },
  { rangeModes: ["heat", "heat_cool"], requested: "heat", stateMode: "off", thermal: false },
  { rangeModes: ["heat", "heat_cool"], requested: "heat_cool", stateMode: "off", thermal: true },
  { rangeModes: ["heat", "heat_cool"], requested: undefined, stateMode: "heat", thermal: false },
])("renders range preparation according to the effective mapped mode: %j", ({ rangeModes, requested, stateMode, thermal }) => {
  const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
  const entityId = "climate.second";
  viewHost.hass!.states[entityId] = { state: stateMode, attributes: { supported_features: 3, hvac_modes: ["off", "heat", "cool", "heat_cool"] } } as any;
  viewHost._data!.zones[entityId].target_format_policy = {
    entity_id: entityId, kind: "mixed", configured_modes: rangeModes, range_modes: rangeModes,
    formats_by_mode: Object.fromEntries(["heat", "cool", "heat_cool"].map((mode) => [mode, rangeModes.includes(mode) ? "range" : "single"])),
    invalid_modes: [], uncertain: false,
  };
  viewHost._data!.preconditioning_learning = { [entityId]: learningBothDirections() };
  viewHost._data!.next_events = [{ entity_id: entityId, when: "2026-10-22T18:00:00Z", action: "set_temperature", target_temp_low: 19, target_temp_high: 24, hvac_mode: requested, preconditioning_diagnostics: diagnostics("heat", 19) }] as ScheduleEvent[];
  const container = document.createElement("div");
  render(renderPreconditioningView(viewHost, [entityId]), container);
  expect(container.textContent!.includes("unsupportedRangeThermalMode")).toBe(!thermal);
  expect(Boolean(container.querySelector(".preconditioning-range-boundary"))).toBe(thermal);
});
