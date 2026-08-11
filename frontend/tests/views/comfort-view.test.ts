// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import {
  comfortCo2Position,
  comfortRangePosition,
} from "../../src/velair/domain/comfort";
import type { VelairViewHost } from "../../src/velair/host-types";
import type {
  ComfortSettings,
  ComfortAssessment,
  HomeAssistant,
} from "../../src/velair/types";
import { defaultComfortSettings } from "../../src/velair/domain/comfort";
import { comfortStyles } from "../../src/velair/styles/comfort-styles";
import { renderComfortView } from "../../src/velair/views/comfort-view";

function host(
  options: {
    comfort?: Partial<ComfortSettings>;
    expanded?: boolean;
    enabled?: boolean;
    hassStates?: HomeAssistant["states"];
    missingHumidity?: boolean;
    assessment?: ComfortAssessment;
  } = {},
) {
  const saveZoneComfort = vi.fn(async () => {});
  const viewHost = {
    _data: {
      configured_entities: ["climate.first"],
      comfort: {
        "climate.first": options.assessment ?? (options.missingHumidity
          ? {
              enabled: true,
              condition: "temperature_comfortable",
              air_quality: "not_monitored",
              data_quality: "partial",
              data_issues: ["humidity_missing"],
              temperature: {
                availability: "current",
                condition: "comfortable",
                entity_id: "climate.first",
                max: 24,
                metric: "temperature",
                min: 20,
                source: "climate",
                value: 22,
              },
              humidity: {
                availability: "missing",
                condition: null,
                entity_id: "sensor.first_humidity",
                metric: "humidity",
                source: "sensor",
                value: null,
              },
            }
          : undefined),
      },
      zones: {
        "climate.first": {
          enabled: true,
          comfort: {
            enabled: options.enabled ?? false,
            temperature_entity_id: "sensor.first_temperature",
            humidity_entity_id: "sensor.first_humidity",
            co2_entity_id: "sensor.first_co2",
            ...options.comfort,
          },
          preconditioning: {},
          schedule: {},
        },
      },
    },
    hass: {
      config: {
        unit_system: {
          temperature: "C",
        },
      },
      states: options.hassStates ?? {},
    },
    _expandedComfortZones: new Set(options.expanded ? ["climate.first"] : []),
    _entityExists: () => true,
    _formatTemperature: (value: number) => `${value} C`,
    _friendlyEntityName: () => "First",
    _orderedZoneIds: (entityIds: string[]) => entityIds,
    _saveZoneComfort: saveZoneComfort,
    _settingsSaving: false,
    _t: (key: string, replacements?: Record<string, string | number>) =>
      replacements
        ? `${key}:${Object.values(replacements).join(":")}`
        : key,
    _temperatureUnit: () => "C",
    _toggleComfortZone: vi.fn(),
  } as unknown as VelairViewHost;

  return { saveZoneComfort, viewHost };
}

describe("comfort view", () => {
  it("keeps configuration help tooltips inside the mobile label width", () => {
    const styles = comfortStyles.cssText;

    expect(styles).toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*\.comfort-config-label\s*\{[^}]*position:\s*relative;[^}]*width:\s*100%;/,
    );
    expect(styles).toMatch(
      /\.comfort-config-label \.comfort-help\s*\{[^}]*position:\s*static;/,
    );
    expect(styles).toMatch(
      /\.comfort-config-label \.comfort-help-tooltip\s*\{[^}]*left:\s*0;[^}]*max-width:\s*100%;[^}]*right:\s*0;[^}]*width:\s*auto;/,
    );
  });

  it("uses the physically equivalent Fahrenheit comfort range", () => {
    const defaults = defaultComfortSettings("°F");
    expect(defaults.temperature_min).toBe(68);
    expect(defaults.temperature_max).toBe(75);
  });
  it("toggles comfort without resending default sensor values", () => {
    const { saveZoneComfort, viewHost } = host();
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const toggle = container.querySelector("ha-switch") as HTMLElement & {
      checked: boolean;
    };
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));

    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", { enabled: true });
  });

  it("marks the comfort assessment as partial when a configured reading is unavailable", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      missingHumidity: true,
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const warning = container.querySelector(".comfort-zone-heading .comfort-data-warning");
    expect(warning).not.toBeNull();
    expect(warning?.getAttribute("aria-label")).toBe("comfortDataPartial");
    expect(warning?.getAttribute("title")).toContain("comfortDataIssueHumidityMissing");
    expect(container.querySelector(".comfort-assessment-heading .comfort-data-warning")).toBeNull();
  });

  it("renders a temperature and humidity map with a separate CO2 scale", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "hot_and_humid",
        air_quality: "elevated",
        data_quality: "complete",
        data_issues: [],
        temperature: {
          availability: "current",
          condition: "hot",
          entity_id: "sensor.first_temperature",
          max: 24,
          metric: "temperature",
          min: 20,
          source: "sensor",
          value: 26,
        },
        humidity: {
          availability: "current",
          condition: "humid",
          entity_id: "sensor.first_humidity",
          max: 60,
          metric: "humidity",
          min: 40,
          source: "sensor",
          value: 68,
        },
        co2: {
          attention: 1000,
          availability: "current",
          condition: "elevated",
          entity_id: "sensor.first_co2",
          max: 1500,
          metric: "co2",
          source: "sensor",
          value: 1200,
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.textContent).toContain("comfortConditionHotAndHumid");
    expect(container.textContent).toContain("comfortAirQualityElevated");
    expect(container.querySelector(".comfort-map-plot")).not.toBeNull();
    expect(container.querySelectorAll(".comfort-map-regions > span")).toHaveLength(9);
    expect(container.querySelector(".comfort-map-marker-dot")).not.toBeNull();
    expect(container.querySelector(".comfort-map-marker-label")).not.toBeNull();
    expect(container.querySelector(".comfort-map-zone")?.textContent).toBe("");
    expect(container.querySelector(".comfort-legend-zone")).not.toBeNull();
    expect(container.querySelector(".comfort-legend-current")).not.toBeNull();
    expect(container.textContent).toContain("comfortTargetZone");
    expect(container.textContent).toContain("comfortCurrentReadings");
    expect(container.querySelector(".comfort-co2-scale")).not.toBeNull();
  });

  it("lets Lovelace options hide configuration and individual comfort graphs", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "hot_and_humid",
        air_quality: "elevated",
        data_quality: "complete",
        data_issues: [],
        temperature: {
          availability: "current",
          condition: "hot",
          entity_id: "sensor.first_temperature",
          max: 24,
          metric: "temperature",
          min: 20,
          source: "sensor",
          value: 26,
        },
        humidity: {
          availability: "current",
          condition: "humid",
          entity_id: "sensor.first_humidity",
          max: 60,
          metric: "humidity",
          min: 40,
          source: "sensor",
          value: 68,
        },
        co2: {
          attention: 1000,
          availability: "current",
          condition: "elevated",
          entity_id: "sensor.first_co2",
          max: 1500,
          metric: "co2",
          source: "sensor",
          value: 1200,
        },
      },
    });
    const container = document.createElement("div");

    render(
      renderComfortView(viewHost, ["climate.first"], {
        showCo2: false,
        showConfiguration: false,
        showHumidity: false,
        showTemperature: true,
      }),
      container,
    );

    expect(container.querySelector(".comfort-config-section")).toBeNull();
    expect(container.querySelector(".comfort-map-plot")).toBeNull();
    expect(container.querySelector(".comfort-range-scale.metric-temperature")).not.toBeNull();
    expect(container.querySelector(".comfort-range-scale.metric-humidity")).toBeNull();
    expect(container.querySelector(".comfort-co2-scale")).toBeNull();
  });

  it("uses a single metric scale when humidity is unavailable", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      missingHumidity: true,
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.querySelector(".comfort-map-plot")).toBeNull();
    expect(container.querySelector(".comfort-range-scale")).not.toBeNull();
    expect(container.querySelectorAll(".comfort-range-limits span")).toHaveLength(2);
  });

  it("can disable humidity monitoring without losing the configured sensor", () => {
    const { saveZoneComfort, viewHost } = host({
      comfort: {
        humidity_enabled: false,
        humidity_entity_id: "sensor.first_humidity",
      },
      expanded: true,
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const disabledOption = container.querySelector(
      'option[value="__humidity_not_monitored__"]',
    ) as HTMLOptionElement;
    expect(disabledOption.selected).toBe(true);
    expect(container.textContent).not.toContain("comfortHumidityRange");

    const humiditySelect = disabledOption.closest("select") as HTMLSelectElement;
    humiditySelect.value = "";
    humiditySelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", {
      humidity_enabled: true,
      humidity_entity_id: null,
    });
  });

  it("hides metric thresholds when no source is available", () => {
    const { viewHost } = host({
      comfort: {
        temperature_entity_id: null,
        humidity_entity_id: null,
        co2_entity_id: null,
      },
      expanded: true,
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.textContent).toContain("comfortDataFreshness");
    expect(container.textContent).toContain("comfortTemperatureRange");
    expect(container.textContent).not.toContain("comfortHumidityRange");
    expect(container.textContent).not.toContain("comfortCo2Limits");
  });

  it("shows thresholds for metrics with an automatic or selected source", () => {
    const { viewHost } = host({
      comfort: {
        temperature_entity_id: null,
        humidity_entity_id: null,
        co2_entity_id: "sensor.first_co2",
      },
      expanded: true,
      hassStates: {
        "climate.first": {
          attributes: {
            humidity: 45,
          },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.textContent).toContain("comfortTemperatureRange");
    expect(container.textContent).toContain("comfortHumidityRange");
    expect(container.textContent).toContain("comfortCo2Limits");
  });
});

describe("comfort visual positions", () => {
  it("keeps current values inside the visible plotting area", () => {
    expect(comfortRangePosition(-100, 20, 24)).toBe(4);
    expect(comfortRangePosition(100, 20, 24)).toBe(96);
    expect(comfortRangePosition(22, 20, 24)).toBe(50);
  });

  it("keeps CO2 markers inside the visible plotting area", () => {
    expect(comfortCo2Position(0, 1000, 1500)).toBe(4);
    expect(comfortCo2Position(10000, 1000, 1500)).toBe(96);
  });
});
