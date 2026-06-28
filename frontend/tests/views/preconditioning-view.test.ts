// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { renderPreconditioningView } from "../../src/velair/views/preconditioning-view";

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
      preconditioning_learning: {},
    },
    _expandedPreconditioningZones: new Set(options.expandedZoneIds ?? []),
    _entityExists: () => options.entityExists ?? true,
    _friendlyEntityName: (entityId: string) =>
      entityId === "climate.first" ? "First" : "Second",
    _resetZonePreconditioningLearning: resetZonePreconditioningLearning,
    _resetZonePreconditioningSettings: resetZonePreconditioningSettings,
    _saveZonePreconditioning: saveZonePreconditioning,
    _settingsSaving: false,
    _t: (key: string, replacements?: Record<string, string | number>) =>
      replacements?.climate ? `${key}:${replacements.climate}` : key,
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
      [...container.querySelectorAll(".preconditioning-config-section h3")]
        .map((element) => element.textContent?.trim()),
    ).toEqual([
      "preconditioningTiming",
      "preconditioningModel",
      "preconditioningHistory",
      "preconditioningOutdoorContext",
    ]);

    const sections = [...container.querySelectorAll(".preconditioning-config-section")];
    expect(sections).toHaveLength(4);
    expect(
      sections.every(
        (section) =>
          section.querySelector(":scope > h3") !== null &&
          section.querySelector(":scope > .preconditioning-config-rows") !== null,
      ),
    ).toBe(true);
  });

  it("provides concise focusable help for every tuning control", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"] });
    const container = document.createElement("div");

    render(renderPreconditioningView(viewHost, ["climate.first"]), container);

    const helpItems = [...container.querySelectorAll(".preconditioning-help")];
    expect(helpItems).toHaveLength(12);
    expect(helpItems.every((item) => item.getAttribute("tabindex") === "0")).toBe(true);
    expect(helpItems[0]?.getAttribute("aria-label")).toBe(
      "preconditioningMinStartHelp",
    );
    expect(helpItems[0]?.querySelector('[role="tooltip"]')?.textContent).toContain(
      "preconditioningMinStartHelp",
    );
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
    expect(container.querySelectorAll(".preconditioning-learning-indicator")).toHaveLength(4);
    expect(container.querySelectorAll(".preconditioning-sample-chip")).toHaveLength(6);
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
    resetButtons[0]?.click();
    expect(resetZonePreconditioningLearning).toHaveBeenCalledWith(
      "climate.second",
      "heat",
      "preconditioningHeat",
    );
  });
});
