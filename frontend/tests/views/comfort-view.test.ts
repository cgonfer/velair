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
import { comfortSettings, defaultComfortSettings } from "../../src/velair/domain/comfort";
import { comfortStyles } from "../../src/velair/styles/comfort-styles";
import { renderComfortView } from "../../src/velair/views/comfort-view";
import { translate } from "../../src/velair/i18n";
import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";
import { de } from "../../src/velair/translations/de";
import { translationTemplate } from "../../src/velair/translations/template";

function host(
  options: {
    comfort?: Partial<ComfortSettings>;
    expanded?: boolean;
    enabled?: boolean;
    hassStates?: HomeAssistant["states"];
    missingHumidity?: boolean;
    assessment?: ComfortAssessment;
    temperatureUnit?: string;
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
          temperature: options.temperatureUnit ?? "C",
        },
      },
      states: options.hassStates ?? {},
    },
    _expandedComfortZones: new Set(options.expanded ? ["climate.first"] : []),
    _entityExists: () => true,
    _formatTemperature: (value: number) => `${value} ${options.temperatureUnit ?? "C"}`,
    _friendlyEntityName: () => "First",
    _orderedZoneIds: (entityIds: string[]) => entityIds,
    _saveZoneComfort: saveZoneComfort,
    _settingsSaving: false,
    _t: (key: string, replacements?: Record<string, string | number>) =>
      replacements
        ? `${key}:${Object.values(replacements).join(":")}`
        : key,
    _temperatureUnit: () => options.temperatureUnit ?? "C",
    _toggleComfortZone: vi.fn(),
  } as unknown as VelairViewHost;

  return { saveZoneComfort, viewHost };
}

describe("comfort view", () => {
  it("uses the exact Humidex delta placeholder instead of threshold copy", () => {
    expect(en.comfortInsightHumidexWarmer).toContain("{delta}");
    expect(en.comfortInsightHumidexWarmer).not.toContain("at least");
  });

  it("defaults old backend outdoor fields to disabled and hides the visual block", () => {
    const settings = comfortSettings({ enabled: true }, "°C");
    expect(settings.outdoor_comparison_enabled).toBe(false);
    expect(settings.outdoor_temperature_entity_id).toBeNull();
    expect(settings.outdoor_humidity_entity_id).toBeNull();
    expect(settings.ventilation_temperature_threshold).toBe(1);
    expect(settings.ventilation_humidity_threshold).toBe(5);
    expect(settings.ventilation_absolute_humidity_threshold).toBe(1);
    expect(settings.comfort_model).toBe("simple");
    expect(settings.temperature_aware).toEqual({
      at_temperature_min: { minimum: 40, maximum: 60 },
      at_temperature_max: { minimum: 40, maximum: 60 },
    });

    const { viewHost } = host({ enabled: true, expanded: true });
    const container = document.createElement("div");
    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.querySelector(".comfort-outdoor-comparison")).toBeNull();
    const config = container.querySelector(".comfort-outdoor-config-section");
    const outdoorSwitch = config?.querySelector("ha-switch") as HTMLElement & { checked: boolean };
    expect(outdoorSwitch.checked).toBe(false);
    expect(outdoorSwitch.getAttribute("aria-label")).toBe("comfortOutdoorComparison");
    expect(config?.querySelector("select")).toBeNull();
  });
  it("delegates configuration help layout to the shared inline help", () => {
    const styles = comfortStyles.cssText;
    expect(styles).not.toContain(".comfort-help");
    expect(styles).not.toContain(".comfort-help-tooltip");
  });

  it("uses compact responsive grids without reserving empty derived columns", () => {
    const styles = comfortStyles.cssText;

    expect(styles).toMatch(
      /\.comfort-derived-config-list\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 280px\), 1fr\)\);/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*\.comfort-derived-config-list\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/,
    );
    expect(styles).toMatch(
      /\.comfort-derived-visual-list\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 220px\), 1fr\)\);/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*\.comfort-derived-visual-list\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/,
    );
    expect(styles).toMatch(
      /\.comfort-derived-config-list\s*\{[^}]*align-items:\s*start;/,
    );
    expect(styles).toMatch(
      /\.comfort-derived-config\s*\{[^}]*align-self:\s*start;[^}]*height:\s*auto;/,
    );
    expect(styles).toMatch(/\.comfort-derived-title strong\s*\{[^}]*font-size:\s*0\.86rem;/);
    expect(styles).toMatch(/\.comfort-derived-visual > strong,[\s\S]*font-size:\s*1rem;/);
    expect(styles).toContain(".comfort-humidex-delta");
    expect(styles).not.toContain(".comfort-humidex-link");
    expect(styles).toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*\.comfort-zone-actions\s*\{[^}]*display:\s*contents;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*\.comfort-assessment-summary\s*\{[^}]*grid-row:\s*2;[^}]*padding-inline-start:\s*28px;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*\.comfort-air-pill,[\s\S]*max-width:\s*min\(100%, 220px\);/,
    );
  });

  it("places enabled derived readings beside runtime visuals and configuration outside the assessment", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      missingHumidity: true,
      comfort: {
        derived_metrics: {
          dew_point: { enabled: true, source: "velair", entity_id: null },
          absolute_humidity: { enabled: false, source: "velair", entity_id: null },
          humidex: { enabled: false, source: "velair", entity_id: null },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const assessment = container.querySelector(".comfort-assessment-card");
    const visuals = assessment?.querySelector(".comfort-visuals");
    const derived = assessment?.querySelector(".comfort-derived-visual-section");
    expect(visuals?.nextElementSibling).toBe(derived);
    expect(derived?.querySelectorAll("ha-switch")).toHaveLength(0);
    expect(derived?.querySelectorAll("select")).toHaveLength(0);
    expect(assessment?.querySelector(".comfort-configuration")).toBeNull();
    expect(container.querySelector(".comfort-configuration")).not.toBeNull();
  });

  it("keeps disabled Comfort configurable in one panel that is closed by default", () => {
    const { viewHost } = host({ enabled: false, expanded: true });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const disabled = container.querySelector(".comfort-assessment-card.idle");
    const configuration = container.querySelector("details.comfort-configuration") as HTMLDetailsElement;
    expect(disabled?.nextElementSibling).toBe(configuration);
    expect(configuration).not.toBeNull();
    expect(configuration.open).toBe(false);
    expect(configuration.querySelector(".comfort-data-sources-config-section")).not.toBeNull();
    expect(configuration.querySelector(".comfort-model-config-section")).not.toBeNull();
    expect(configuration.querySelector(".comfort-preferences-config-section")).not.toBeNull();
    expect(configuration.querySelector(".comfort-derived-config-section")).not.toBeNull();
    expect(configuration.querySelector(".comfort-freshness-config-section")).not.toBeNull();
    expect(configuration.querySelector(".comfort-configuration-content")?.firstElementChild)
      .toBe(configuration.querySelector(".comfort-freshness-config-section"));
    expect(comfortStyles.cssText).toMatch(
      /\.comfort-configuration > summary\s*\{[^}]*min-height:\s*48px;/,
    );
    expect(comfortStyles.cssText).toMatch(
      /\.comfort-freshness-config-section \.comfort-number-field-single small\s*\{[^}]*display:\s*none;/,
    );
    expect(comfortStyles.cssText).toMatch(
      /@media \(min-width:\s*681px\)[\s\S]*\.comfort-preferences-config-section \.comfort-threshold-row\s*\{[^}]*grid-template-rows:\s*minmax\(32px, auto\) auto;/,
    );
    expect(comfortStyles.cssText).toMatch(
      /\.comfort-config-label\s*\{[^}]*font-size:\s*12px;/,
    );
  });

  it("keeps only metric-specific derived help relationships", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        derived_metrics: {
          humidex: { enabled: true, source: "entity", entity_id: "sensor.humidex" },
          dew_point: { enabled: true, source: "entity", entity_id: "sensor.dew_point" },
          absolute_humidity: { enabled: true, source: "entity", entity_id: "sensor.absolute_humidity" },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const helps = [...container.querySelectorAll<HTMLButtonElement>(
      ".comfort-derived-config-section .inline-help",
    )];
    expect(helps).toHaveLength(3);
    const controls = helps.map((button) => button.getAttribute("aria-controls"));
    const describedBy = helps.map((button) => button.getAttribute("aria-describedby"));
    const tooltipIds = [...container.querySelectorAll<HTMLElement>(
      ".comfort-derived-config-section [role='tooltip']",
    )].map((tooltip) => tooltip.id);
    const expectedIds = [
      "comfort-climate-first-humidex-config-help",
      "comfort-climate-first-dew_point-config-help",
      "comfort-climate-first-absolute_humidity-config-help",
    ];
    expect(controls).toEqual(expectedIds);
    expect(new Set(controls).size).toBe(helps.length);
    expect(describedBy).toEqual(controls);
    expect(tooltipIds).toEqual(expectedIds);
    expect(container.querySelectorAll('[id*="comfortMetricSource"]')).toHaveLength(0);
  });

  it("persists Data freshness through the existing stale-after setting", () => {
    const { saveZoneComfort, viewHost } = host({ enabled: true, expanded: true });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const input = container.querySelector<HTMLInputElement>(
      ".comfort-freshness-config-section input[type='number']",
    )!;
    input.value = "180";
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", {
      stale_after_minutes: 180,
    });
  });

  it("does not bind the native details state during ordinary rerenders", () => {
    const { viewHost } = host({ enabled: true, expanded: true });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);
    const configuration = container.querySelector("details.comfort-configuration") as HTMLDetailsElement;
    configuration.open = true;

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.querySelector("details.comfort-configuration")).toBe(configuration);
    expect(configuration.open).toBe(true);
  });

  it("uses the physically equivalent Fahrenheit comfort range", () => {
    const defaults = defaultComfortSettings("°F");
    expect(defaults.temperature_min).toBe(68);
    expect(defaults.temperature_max).toBe(75);
    expect(defaults.ventilation_temperature_threshold).toBe(1.8);
    expect(defaults.derived_metrics.humidex).toEqual({
      enabled: false,
      source: "velair",
      entity_id: null,
    });
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

  it("does not show assessment chips when monitoring is disabled", () => {
    const { viewHost } = host({
      enabled: false,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "good",
        data_quality: "complete",
        data_issues: [],
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.querySelector(".comfort-assessment-summary")).toBeNull();
    expect(container.querySelector(".comfort-condition-pill")).toBeNull();
    expect(container.querySelector(".comfort-air-pill")).toBeNull();
    expect(container.textContent).toContain("comfortDisabledDetail");
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
    const warningButton = warning?.querySelector(".inline-help");
    expect(warningButton?.getAttribute("aria-label")).toBe("comfortDataPartial");
    expect(warningButton?.getAttribute("aria-expanded")).toBe("false");
    expect(warning?.querySelector('[role="tooltip"]')?.textContent)
      .toContain("comfortDataIssueHumidityMissing");
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

  it.each(["missing", "stale"] as const)(
    "keeps current humidity visible without classifying it when temperature is %s",
    (availability) => {
      const { viewHost } = host({
        enabled: true,
        expanded: true,
        assessment: {
          enabled: true,
          condition: "no_readings",
          air_quality: "not_monitored",
          data_quality: "partial",
          data_issues: [`temperature_${availability}`],
          temperature: {
            availability,
            condition: null,
            metric: "temperature",
            source: "climate",
            value: null,
          },
          humidity: {
            availability: "current",
            condition: null,
            effective_range_available: false,
            metric: "humidity",
            source: "climate",
            value: 47,
          },
          comfort_zone: {
            model: "temperature_aware",
            temperature_min: 20,
            temperature_max: 24,
            points: [
              { temperature: 20, humidity_min: 40, humidity_max: 60 },
              { temperature: 24, humidity_min: 35, humidity_max: 50 },
            ],
            effective_humidity_range: null,
          },
        },
      });
      const container = document.createElement("div");

      render(renderComfortView(viewHost, ["climate.first"]), container);

      const reading = container.querySelector(".comfort-range-scale.metric-humidity.unclassified");
      expect(reading?.textContent).toContain("47%");
      expect(reading?.querySelector(".comfort-scale-track")).toBeNull();
      expect(container.querySelector(".comfort-no-readings")).toBeNull();
    },
  );

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

  it("keeps the condition as the summary and renders only contextual insights", () => {
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
          condition: "comfortable",
          metric: "temperature",
          source: "climate",
          value: 20,
        },
        derived_metrics: {
          humidex: {
            availability: "current",
            condition: null,
            metric: "humidex",
            source: "velair",
            value: 25.7,
          },
        },
        insights: [
          { code: "future_unknown", kind: "context", tone: "neutral", metrics: [] },
          { code: "co2_elevated", kind: "context", tone: "attention", metrics: ["co2"] },
          { code: "humidex_feels_warmer", kind: "context", tone: "warm", metrics: ["temperature", "humidex"] },
        ],
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.querySelector(".comfort-insight-primary")).toBeNull();
    expect(container.textContent).toContain("comfortConditionHotAndHumid");
    expect(container.querySelector(".comfort-insights")?.textContent)
      .not.toContain("comfortConditionHotAndHumid");
    expect(container.querySelectorAll(".comfort-insight-context")).toHaveLength(2);
    expect(comfortStyles.cssText).toMatch(
      /\.comfort-insight-context-list\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/,
    );
    expect(container.textContent).toContain("comfortInsightCo2Elevated");
    expect(container.textContent).toMatch(/comfortInsightHumidexWarmer:5[,.]7 C/);
    expect(container.textContent).not.toContain("comfortInsightUnavailable");
    expect(container.querySelector('[data-insight-code="future_unknown"]')).toBeNull();
  });

  it("omits a Humidex insight when its exact delta cannot be calculated", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "partial",
        data_issues: [],
        insights: [
          { code: "humidex_feels_warmer", kind: "context", tone: "warm", metrics: ["temperature", "humidex"] },
        ],
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.textContent).not.toContain("comfortInsightHumidexWarmer");
    expect(container.querySelector(".comfort-insights")).toBeNull();
  });

  it("configures optional derived metrics without scientific categories", () => {
    const { saveZoneComfort, viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        derived_metrics: {
          dew_point: {
            enabled: true,
            source: "entity",
            entity_id: "sensor.first_dew_point",
          },
          absolute_humidity: {
            enabled: false,
            source: "velair",
            entity_id: null,
          },
          humidex: {
            enabled: false,
            source: "velair",
            entity_id: null,
          },
        },
      },
      hassStates: {
        "sensor.first_dew_point": {
          state: "12",
          attributes: { unit_of_measurement: "°C", friendly_name: "First dew point" },
        },
      },
      assessment: {
        enabled: true,
        condition: "no_readings",
        air_quality: "not_monitored",
        data_quality: "unavailable",
        data_issues: [],
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.textContent).toContain("comfortAdditionalInformation");
    expect(container.textContent).toContain("comfortDewPointDescription");
    expect(container.textContent).not.toContain("Psychrometric");
    const source = container.querySelector(".comfort-derived-source select") as HTMLSelectElement;
    expect(container.querySelectorAll(".comfort-derived-source .comfort-select-control select"))
      .toHaveLength(1);
    const sourceRows = container.querySelectorAll(".comfort-derived-source-row");
    expect(sourceRows).toHaveLength(1);
    sourceRows.forEach((row) => {
      expect(row.firstElementChild?.classList.contains("comfort-config-label")).toBe(true);
      expect(row.children[1]?.classList.contains("comfort-select-wrap")).toBe(true);
    });
    expect(comfortStyles.cssText).toMatch(
      /\.comfort-derived-source-row\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/,
    );
    expect(comfortStyles.cssText).toMatch(
      /\.comfort-derived-source\s*\{[^}]*gap:\s*8px;[^}]*margin:\s*0;[^}]*padding:\s*0 10px 10px;/,
    );
    expect(comfortStyles.cssText).not.toMatch(
      /\.comfort-derived-source\s*\{[^}]*border-top:/,
    );
    expect(comfortStyles.cssText).toMatch(
      /\.comfort-derived-config-section \.comfort-derived-title strong\s*\{[^}]*font-size:\s*0\.9rem;[^}]*line-height:\s*1\.25;/,
    );
    sourceRows.forEach((row) => {
      expect(row.classList.contains("comfort-config-row")).toBe(true);
      expect(row.querySelector(".comfort-config-label")).not.toBeNull();
      expect(row.querySelector(".comfort-select-wrap")).not.toBeNull();
      expect(row.querySelector(".comfort-select-control")).not.toBeNull();
    });
    expect(source.value).toBe("sensor.first_dew_point");
    expect([...source.options].map((option) => option.value)).toContain("__velair__");
    expect(container.textContent).toContain("First dew point · sensor.first_dew_point");
    expect(container.querySelectorAll(".comfort-derived-config")).toHaveLength(3);
    expect(container.querySelectorAll(".comfort-derived-config.disabled .comfort-derived-source"))
      .toHaveLength(0);
    expect(container.querySelectorAll(".comfort-derived-config .comfort-derived-visual"))
      .toHaveLength(0);

    source.value = "__velair__";
    source.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", {
      derived_metrics: {
        dew_point: {
          enabled: true,
          source: "velair",
          entity_id: "sensor.first_dew_point",
        },
      },
    });

    render(
      renderComfortView(viewHost, ["climate.first"], { showConfiguration: false }),
      container,
    );
    expect(container.querySelector(".comfort-configuration")).toBeNull();
    expect(container.querySelectorAll(".comfort-derived-reading")).toHaveLength(1);
    expect(container.querySelector(".comfort-derived-visual")?.textContent)
      .toContain("unavailable");
    expect(container.querySelector(".comfort-derived-detail")).toBeNull();
    expect(container.querySelector(".comfort-derived-visual")?.textContent)
      .not.toContain("comfortCurrentReadings");
    expect(container.querySelectorAll("ha-switch")).toHaveLength(1);
    expect(container.querySelectorAll("select")).toHaveLength(0);
  });

  it("keeps an incomplete external metric as a disabled placeholder without saving", () => {
    const { saveZoneComfort, viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        derived_metrics: {
          dew_point: { enabled: true, source: "entity", entity_id: null },
          absolute_humidity: { enabled: false, source: "velair", entity_id: null },
          humidex: { enabled: false, source: "velair", entity_id: null },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const source = container.querySelector<HTMLSelectElement>(".comfort-derived-source select");
    expect(source?.value).toBe("");
    expect(source?.selectedOptions[0]?.disabled).toBe(true);
    expect(saveZoneComfort).not.toHaveBeenCalled();
  });

  it("renders configured derived readings separately from the comfort condition", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        derived_metrics: {
          dew_point: { enabled: true, source: "velair", entity_id: null },
          absolute_humidity: { enabled: true, source: "velair", entity_id: null },
          humidex: { enabled: true, source: "velair", entity_id: null },
        },
      },
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        range_summary: {
          status: "mixed",
          thermal_relation: "mixed",
          positions: {
            temperature: "within",
            humidity: null,
            humidex: "above",
          },
        },
        temperature: {
          availability: "current",
          condition: "comfortable",
          metric: "temperature",
          source: "climate",
          value: 20,
          min: 18,
          max: 24,
        },
        derived_metrics: {
          dew_point: {
            availability: "current",
            condition: null,
            entity_id: null,
            metric: "dew_point",
            source: "velair",
            value: 12.4,
            unit: "°C",
          },
          absolute_humidity: {
            availability: "current",
            condition: null,
            entity_id: null,
            metric: "absolute_humidity",
            source: "velair",
            value: 9.81,
            unit: "g/m³",
          },
          humidex: {
            availability: "current",
            condition: null,
            entity_id: null,
            metric: "humidex",
            source: "velair",
            value: 25.7,
            unit: null,
            temperature_range_position: "above",
          },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const readings = container.querySelectorAll(".comfort-derived-visual");
    expect(readings).toHaveLength(3);
    expect(container.textContent).toContain("12.4 C");
    expect(container.textContent).toMatch(/9[,.]81 g\/m³/);
    expect(container.textContent).toMatch(/25[,.]7/);
    expect(container.textContent).toContain("comfortDewPointBelowRoom");
    expect(container.textContent).toContain("comfortHumidexWarmerRelation");
    expect(container.textContent).toContain("comfortConditionComfortable");
    expect(container.textContent).toContain("comfortHumidex: comfortHumidexRangeAbove");
    expect(
      container.querySelector(
        ".comfort-assessment-heading .comfort-condition-pill.condition-comfortable",
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        ".comfort-assessment-heading .comfort-humidex-pill.position-above",
      ),
    ).not.toBeNull();
    expect(container.querySelectorAll(".comfort-condition-pill.condition-comfortable"))
      .toHaveLength(2);
    expect(container.querySelectorAll(".comfort-humidex-pill.position-above")).toHaveLength(2);
    expect(container.querySelector(".comfort-derived-visual.humidex.tone-warm")).not.toBeNull();
    expect(container.querySelector(".comfort-humidex-delta")?.textContent).toMatch(/\+5[,.]7 C/);
    expect(container.querySelector(".comfort-humidex-delta ha-icon")?.getAttribute("icon"))
      .toBe("mdi:arrow-up");
    expect(container.querySelector(".comfort-humidex-scale")).not.toBeNull();
    expect(container.querySelector(".comfort-humidex-scale")?.getAttribute("aria-label"))
      .toContain("comfortHumidexRangeAbove");
    expect(container.querySelector(".comfort-humidex-marker.air.condition-comfortable"))
      .not.toBeNull();
    expect(container.querySelector(".comfort-humidex-marker.humidex.position-above"))
      .not.toBeNull();
    expect(container.querySelector(".comfort-humidex-connector")).not.toBeNull();
    expect(container.querySelector(".comfort-humidex-link")).toBeNull();
    expect(container.querySelector(".comfort-derived-visual.humidex")?.getAttribute("aria-label"))
      .toContain("comfortAir: 20 C");
    expect(container.querySelector(".comfort-derived-visual.absolute-humidity")?.textContent)
      .not.toContain("comfortAbsoluteHumidityNeutralDetail");
    const dewPoint = container.querySelector(".comfort-derived-visual.dew-point");
    const absoluteHumidity = container.querySelector(".comfort-derived-visual.absolute-humidity");
    expect(dewPoint?.querySelector(".comfort-derived-summary-row > header")).not.toBeNull();
    expect(dewPoint?.querySelector(".comfort-derived-summary-value")?.textContent)
      .toContain("12.4 C");
    expect(dewPoint?.querySelector(".comfort-derived-detail")?.textContent)
      .toContain("comfortDewPointBelowRoom");
    expect(absoluteHumidity?.querySelector(".comfort-derived-summary-row > header")).not.toBeNull();
    expect(absoluteHumidity?.querySelector(".comfort-derived-summary-value")?.textContent)
      .toMatch(/9[,.]81 g\/m³/);
    expect(absoluteHumidity?.querySelector(".comfort-derived-detail")).toBeNull();
    expect(dewPoint?.textContent).not.toContain("comfortCurrentReadings");
    expect(absoluteHumidity?.textContent).not.toContain("comfortCurrentReadings");
    expect(comfortStyles.cssText).toMatch(
      /\.comfort-derived-summary-row\s*\{[^}]*align-items:\s*center;[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/,
    );
    expect(comfortStyles.cssText).toMatch(
      /\.comfort-derived-summary-value\s*\{[^}]*margin-left:\s*auto;[^}]*text-align:\s*right;/,
    );
    expect(container.querySelectorAll(".comfort-derived-reading[aria-label]")).toHaveLength(3);
    const helps = container.querySelectorAll<HTMLButtonElement>(".comfort-derived-visual-section .comfort-derived-title .inline-help");
    expect(helps).toHaveLength(3);
    expect(container.querySelector(".inline-help.compact")).toBeNull();
    expect(
      Array.from(container.querySelectorAll(".comfort-derived-reading"))
        .map((item) => item.getAttribute("aria-label")),
    ).toEqual(["comfortHumidex", "comfortDewPoint", "comfortAbsoluteHumidity"]);
    expect(helps[0].getAttribute("aria-label")).toBe("comfortHumidex");
    expect(helps[0].parentElement?.querySelector('[role="tooltip"]')?.textContent)
      .toContain("comfortHumidexDescription");

    const assessment = viewHost._data?.comfort?.["climate.first"];
    if (!assessment?.range_summary) throw new Error("Missing Comfort range summary");
    assessment.range_summary.thermal_relation = "aligned";
    assessment.range_summary.positions.humidex = "within";
    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.querySelector(".comfort-humidex-pill")).toBeNull();
    expect(container.querySelectorAll(".comfort-condition-pill.condition-comfortable"))
      .toHaveLength(2);

    render(
      renderComfortView(viewHost, ["climate.first"], { showConfiguration: false }),
      container,
    );
    expect(container.querySelector(".comfort-configuration")).toBeNull();
    expect(container.querySelector(".comfort-derived-visual-section")).not.toBeNull();
    expect(container.querySelectorAll(".comfort-derived-visual")).toHaveLength(3);
    expect(container.querySelectorAll("select")).toHaveLength(0);
  });

  it("shows simple Humidex values and availability without a Current readings row", () => {
    const current = host({
      enabled: true,
      expanded: true,
      comfort: {
        derived_metrics: {
          humidex: { enabled: true, source: "velair", entity_id: null },
          dew_point: { enabled: false, source: "velair", entity_id: null },
          absolute_humidity: { enabled: false, source: "velair", entity_id: null },
        },
      },
      assessment: {
        enabled: true,
        condition: "no_readings",
        air_quality: "not_monitored",
        data_quality: "partial",
        data_issues: [],
        derived_metrics: {
          humidex: {
            availability: "current",
            condition: null,
            entity_id: null,
            metric: "humidex",
            source: "velair",
            value: 25.7,
            unit: null,
            temperature_range_position: null,
          },
        },
      },
    }).viewHost;
    const currentContainer = document.createElement("div");
    render(renderComfortView(current, ["climate.first"]), currentContainer);

    const currentHumidex = currentContainer.querySelector(".comfort-derived-visual.humidex");
    expect(currentHumidex?.textContent).toMatch(/25[,.]7/);
    expect(currentHumidex?.querySelector(":scope > small")).toBeNull();
    expect(currentHumidex?.textContent).not.toContain("comfortCurrentReadings");
    expect(currentHumidex?.getAttribute("aria-label")).toMatch(/comfortHumidex: 25[,.]7/);

    const missing = host({
      enabled: true,
      expanded: true,
      comfort: {
        derived_metrics: {
          humidex: { enabled: true, source: "velair", entity_id: null },
          dew_point: { enabled: false, source: "velair", entity_id: null },
          absolute_humidity: { enabled: false, source: "velair", entity_id: null },
        },
      },
      assessment: {
        enabled: true,
        condition: "no_readings",
        air_quality: "not_monitored",
        data_quality: "unavailable",
        data_issues: [],
        derived_metrics: {
          humidex: {
            availability: "missing",
            condition: null,
            entity_id: null,
            metric: "humidex",
            source: "velair",
            value: null,
            unit: null,
            temperature_range_position: null,
          },
        },
      },
    }).viewHost;
    const missingContainer = document.createElement("div");
    render(renderComfortView(missing, ["climate.first"]), missingContainer);

    const missingHumidex = missingContainer.querySelector(".comfort-derived-visual.humidex");
    expect(missingHumidex?.textContent).toContain("unavailable");
    expect(missingHumidex?.querySelector(":scope > small")).toBeNull();
    expect(missingHumidex?.textContent).not.toContain("comfortCurrentReadings");
    expect(missingHumidex?.getAttribute("aria-label")).toBe("comfortHumidex: unavailable");
  });

  it("renders Fahrenheit scale coordinates while keeping Humidex unitless", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      temperatureUnit: "°F",
      comfort: {
        temperature_min: 68,
        temperature_max: 75.2,
        derived_metrics: {
          humidex: { enabled: true, source: "velair", entity_id: null },
          dew_point: { enabled: false, source: "velair", entity_id: null },
          absolute_humidity: { enabled: false, source: "velair", entity_id: null },
        },
      },
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        temperature: {
          availability: "current",
          condition: "comfortable",
          metric: "temperature",
          source: "climate",
          value: 68,
          min: 68,
          max: 75.2,
        },
        derived_metrics: {
          humidex: {
            availability: "current",
            condition: null,
            metric: "humidex",
            source: "velair",
            value: 25.7,
            unit: null,
            temperature_range_position: "above",
          },
        } as ComfortAssessment["derived_metrics"],
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.querySelector(".comfort-humidex-scale-domain")?.textContent)
      .toContain("59 °F");
    expect(container.querySelector(".comfort-humidex-scale-domain")?.textContent)
      .toContain("84.2 °F");
    expect(container.querySelector(".comfort-humidex-delta")?.textContent)
      .toMatch(/\+10[,.]3 °F/);
    expect(container.querySelector(".comfort-derived-endpoint.humidex")?.textContent)
      .toMatch(/25[,.]7/);
    expect(container.querySelector(".comfort-derived-endpoint.humidex")?.textContent)
      .not.toContain("°F");
  });

  it("omits the derived visual block when no additional metric is enabled", () => {
    const { viewHost } = host({ enabled: true, expanded: true, missingHumidity: true });
    const container = document.createElement("div");

    render(
      renderComfortView(viewHost, ["climate.first"], { showConfiguration: false }),
      container,
    );

    expect(container.querySelector(".comfort-derived-visual-section")).toBeNull();
    expect(container.querySelector(".comfort-configuration")).toBeNull();
  });

  it("renders the backend outdoor comparison without inferring an opportunity", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        temperature: { availability: "current", condition: "comfortable", metric: "temperature", source: "climate", value: 22 },
        outdoor: {
          enabled: true,
          data_quality: "complete",
          data_issues: [],
          temperature: { availability: "current", condition: null, metric: "outdoor_temperature", source: "sensor", value: 17 },
          humidity: { availability: "current", condition: null, metric: "outdoor_humidity", source: "sensor", value: 70 },
          indoor_absolute_humidity: { availability: "current", condition: null, metric: "indoor_absolute_humidity", source: "velair", value: 9 },
          absolute_humidity: { availability: "current", condition: null, metric: "outdoor_absolute_humidity", source: "velair", value: 10 },
          comparison: {
            temperature: { availability: "current", delta: -5, effect: "cooler", potential: null, blocked_by: [] },
            humidity: { availability: "current", absolute_humidity_delta: 1, equivalent_indoor_relative_humidity: 52, equivalent_indoor_relative_humidity_delta: 4, effect: "more_humid", potential: null, blocked_by: [] },
          },
        },
        insights: [],
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const comparison = container.querySelector(".comfort-outdoor-comparison");
    expect(comparison).not.toBeNull();
    expect(comparison?.querySelectorAll(".comfort-outdoor-cell")).toHaveLength(2);
    expect(comparison?.textContent).toMatch(/comfortOutdoorTemperatureDelta:5 C:comfortOutdoorCooler/);
    expect(comparison?.textContent).toContain("9 g/m³");
    expect(comparison?.textContent).toContain("52 %");
    expect(comparison?.querySelector(".comfort-outdoor-message")).toBeNull();
    const dataStacks = comparison?.querySelectorAll(".comfort-outdoor-data") ?? [];
    expect(dataStacks).toHaveLength(2);
    expect(dataStacks[0].querySelectorAll("dl > div")).toHaveLength(2);
    expect(dataStacks[1].querySelectorAll("dl > div")).toHaveLength(3);
    expect(dataStacks[0].querySelector(":scope > p")).not.toBeNull();
    expect(dataStacks[1].querySelector(":scope > p")).not.toBeNull();
    expect(comparison?.querySelector(".comfort-outdoor-cell > dl")).toBeNull();
    expect(comparison?.querySelector(".comfort-outdoor-cell > p")).toBeNull();
    expect(comfortStyles.cssText).toMatch(/\.comfort-outdoor-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/);
    expect(comfortStyles.cssText).toMatch(/\.comfort-outdoor-grid\s*\{[^}]*align-items:\s*start;/);
    expect(comfortStyles.cssText).toMatch(/\.comfort-outdoor-cell\s*\{[^}]*align-content:\s*start;[^}]*gap:\s*7px;[^}]*grid-auto-rows:\s*max-content;/);
    expect(comfortStyles.cssText).toMatch(/\.comfort-outdoor-data\s*\{[^}]*display:\s*grid;[^}]*grid-auto-rows:\s*minmax\(32px, auto\);[^}]*line-height:\s*1\.35;[^}]*row-gap:\s*0;/);
    expect(comfortStyles.cssText).toMatch(/\.comfort-outdoor-cell dl\s*\{[^}]*display:\s*contents;[^}]*margin:\s*0;/);
    expect(comfortStyles.cssText).toMatch(/\.comfort-outdoor-cell dl > div\s*\{[^}]*align-items:\s*center;[^}]*min-height:\s*32px;/);
    expect(comfortStyles.cssText).toMatch(/\.comfort-outdoor-cell p\s*\{[^}]*align-items:\s*center;[^}]*display:\s*flex;[^}]*margin:\s*0;[^}]*min-height:\s*32px;/);
    expect(comfortStyles.cssText).not.toMatch(/\.comfort-outdoor-adjusted-label\s*\{[^}]*margin/);
    expect(comfortStyles.cssText).not.toMatch(/\.comfort-outdoor-cell\.humidity\s*\{[^}]*(?:gap|margin)/);
    expect(comfortStyles.cssText).toMatch(/@media \(max-width:\s*680px\)[\s\S]*\.comfort-outdoor-grid,[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\);/);
  });

  it("formats the same absolute humidity identically in derived and outdoor readings", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        derived_metrics: {
          humidex: { enabled: false, source: "velair", entity_id: null },
          dew_point: { enabled: false, source: "velair", entity_id: null },
          absolute_humidity: { enabled: true, source: "velair", entity_id: null },
        },
      },
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        derived_metrics: {
          absolute_humidity: {
            availability: "current",
            condition: null,
            metric: "absolute_humidity",
            source: "velair",
            value: 12.16,
          },
        },
        outdoor: {
          enabled: true,
          data_quality: "complete",
          data_issues: [],
          indoor_absolute_humidity: {
            availability: "current",
            condition: null,
            metric: "indoor_absolute_humidity",
            source: "velair",
            value: 12.16,
          },
          absolute_humidity: {
            availability: "current",
            condition: null,
            metric: "outdoor_absolute_humidity",
            source: "velair",
            value: 14.6,
          },
          comparison: {},
        },
        insights: [],
      },
    });
    if (!viewHost.hass) throw new Error("Missing Home Assistant fixture");
    viewHost.hass.locale = { language: "es-ES" };
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const derived = container.querySelector(".comfort-derived-visual.absolute-humidity");
    const derivedValue = derived?.querySelector(".comfort-derived-summary-value")?.textContent;
    const outdoorValues = Array.from(
      container.querySelectorAll(".comfort-outdoor-cell.humidity dd"),
      (node) => node.textContent,
    );
    expect(derivedValue).toBe("12,16 g/m³");
    expect(outdoorValues).toContain("12,16 g/m³");
    expect(outdoorValues).toContain("14,6 g/m³");
    expect(derived?.getAttribute("aria-label")).toContain("12,16 g/m³");
  });

  it.each([
    ["drier", 1, "Adjusted outdoor humidity would be 1 percentage point lower than indoors."],
    ["more_humid", -2, "Adjusted outdoor humidity would be 2 percentage points higher than indoors."],
    ["similar", -0.4, "Adjusted outdoor humidity would be similar to indoors (difference: 0.4 percentage points)."],
  ] as const)("describes adjusted outdoor humidity effect %s without abbreviations", (effect, delta, expected) => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        temperature: { availability: "current", condition: "comfortable", metric: "temperature", source: "climate", value: 22 },
        outdoor: {
          enabled: true,
          data_quality: "complete",
          data_issues: [],
          temperature: { availability: "current", condition: null, metric: "outdoor_temperature", source: "sensor", value: 18 },
          humidity: { availability: "current", condition: null, metric: "outdoor_humidity", source: "sensor", value: 60 },
          indoor_absolute_humidity: { availability: "current", condition: null, metric: "indoor_absolute_humidity", source: "velair", value: 9 },
          absolute_humidity: { availability: "current", condition: null, metric: "outdoor_absolute_humidity", source: "velair", value: 8 },
          comparison: {
            temperature: { availability: "current", delta: -4, effect: "cooler", potential: null, blocked_by: [] },
            humidity: {
              availability: "current",
              absolute_humidity_delta: -1,
              equivalent_indoor_relative_humidity: 49,
              equivalent_indoor_relative_humidity_delta: delta,
              effect,
              potential: null,
              blocked_by: [],
            },
          },
        },
        insights: [],
      },
    });
    Object.assign(viewHost, {
      _t: (key: Parameters<typeof translate>[1], replacements?: Record<string, string | number>) =>
        translate("en", key, replacements),
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const localizedExpected = Math.abs(delta) === 0.4
      ? expected.replace("0.4", Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 1 }))
      : expected;
    expect(container.querySelector(".comfort-outdoor-cell.humidity .comfort-outdoor-data > p")?.textContent)
      .toBe(localizedExpected);
    expect(container.textContent).not.toMatch(/\bpp\b/);
  });

  it("explains adjusted outdoor humidity with the shared accessible help", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        outdoor: {
          enabled: true,
          data_quality: "partial",
          data_issues: [],
          comparison: {},
        },
      },
    });
    Object.assign(viewHost, {
      _t: (key: Parameters<typeof translate>[1], replacements?: Record<string, string | number>) =>
        translate("en", key, replacements),
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const label = container.querySelector(".comfort-outdoor-adjusted-label");
    expect(label?.textContent).toContain("Adjusted outdoor humidity");
    expect(label?.querySelector(".inline-help")?.getAttribute("aria-label"))
      .toBe("Adjusted outdoor humidity");
    const tooltip = label?.querySelector('[role="tooltip"]');
    expect(tooltip?.classList).toContain("constrained");
    expect(Array.from(tooltip?.querySelectorAll('[role="paragraph"]') ?? [], (block) => block.textContent))
      .toEqual([
        "Estimated relative humidity of the outdoor air after it reaches the current indoor temperature.",
        "It compares indoor and outdoor moisture without being distorted by their different temperatures.",
      ]);
    expect(de.comfortOutdoorAdjustedHumidityComparisonHelp)
      .toBe(en.comfortOutdoorAdjustedHumidityComparisonHelp);
    expect(translationTemplate).toHaveProperty("comfortOutdoorAdjustedHumidityComparisonHelp");
  });

  it("keeps natural Spanish adjusted-humidity wording", () => {
    expect(es.comfortOutdoorEquivalentHumidity).toBe("Humedad exterior ajustada");
    expect(es.comfortPercentagePoint).toBe("punto porcentual");
    expect(es.comfortPercentagePoints).toBe("puntos porcentuales");
    expect(es.comfortOutdoorHumidityLower).toContain("menor que la interior");
    expect(en.comfortOutdoorHumidityHigher).not.toContain("pp");
  });

  it("does not reconstruct indoor absolute humidity when an old backend omits it", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        outdoor: {
          enabled: true,
          data_quality: "complete",
          data_issues: [],
          absolute_humidity: { availability: "current", condition: null, metric: "outdoor_absolute_humidity", source: "velair", value: 10 },
          comparison: {
            humidity: { availability: "current", absolute_humidity_delta: 1, equivalent_indoor_relative_humidity: 52, equivalent_indoor_relative_humidity_delta: 4, effect: "similar", potential: null, blocked_by: [] },
          },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const indoor = container.querySelector(".comfort-outdoor-cell.humidity dl > div dd");
    expect(indoor?.textContent).toBe("unavailable");
    expect(indoor?.textContent).not.toContain("9");
  });

  it("shows unavailable outdoor readings without false comparisons", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "no_readings",
        air_quality: "not_monitored",
        data_quality: "unavailable",
        data_issues: [],
        outdoor: {
          enabled: true,
          data_quality: "stale",
          data_issues: ["outdoor_temperature_stale"],
          temperature: { availability: "stale", condition: null, metric: "outdoor_temperature", source: "sensor" },
          humidity: { availability: "not_monitored", condition: null, metric: "outdoor_humidity", source: "sensor" },
          absolute_humidity: { availability: "missing", condition: null, metric: "outdoor_absolute_humidity", source: "velair" },
          comparison: {
            temperature: { availability: "stale", effect: null, potential: null, blocked_by: [] },
            humidity: { availability: "missing", effect: null, potential: null, blocked_by: [] },
          },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const comparison = container.querySelector(".comfort-outdoor-comparison");
    expect(comparison?.textContent).toContain("comfortMetricStale");
    expect(comparison?.textContent).toContain("unavailable");
    expect(comparison?.textContent).not.toContain("comfortOutdoorTemperatureDelta");
    expect(comparison?.textContent).not.toContain("comfortOutdoorHumidityDelta");
  });

  it("persists outdoor configuration through the backend and preserves sensor ids when disabled", () => {
    const { saveZoneComfort, viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        outdoor_comparison_enabled: true,
        outdoor_temperature_entity_id: "sensor.outdoor_temperature",
        outdoor_humidity_entity_id: "sensor.outdoor_humidity",
      },
      hassStates: {
        "sensor.outdoor_temperature": { state: "12", attributes: { device_class: "temperature", friendly_name: "Outside temperature" } },
        "sensor.outdoor_humidity": { state: "70", attributes: { device_class: "humidity", friendly_name: "Outside humidity" } },
        "sensor.power": { state: "20", attributes: { device_class: "power", friendly_name: "Power" } },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const section = container.querySelector(".comfort-outdoor-config-section") as HTMLElement;
    const outdoorSwitch = section.querySelector("ha-switch") as HTMLElement & { checked: boolean };
    outdoorSwitch.checked = false;
    outdoorSwitch.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", { outdoor_comparison_enabled: false });
    const selects = section.querySelectorAll("select");
    expect(selects).toHaveLength(2);
    expect(selects[0].value).toBe("sensor.outdoor_temperature");
    expect(selects[1].value).toBe("sensor.outdoor_humidity");
    expect(selects[0].textContent).toContain("Outside temperature · sensor.outdoor_temperature");
    expect(selects[0].textContent).not.toContain("Power");
    expect(selects[1].textContent).toContain("Outside humidity · sensor.outdoor_humidity");
    selects[1].value = "";
    selects[1].dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", { outdoor_humidity_entity_id: null });
  });

  it("renders and persists per-climate ventilation guidance thresholds", () => {
    const { saveZoneComfort, viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        outdoor_comparison_enabled: true,
        outdoor_temperature_entity_id: "sensor.outdoor_temperature",
        outdoor_humidity_entity_id: "sensor.outdoor_humidity",
        ventilation_temperature_threshold: 1.5,
        ventilation_humidity_threshold: 7.5,
        ventilation_absolute_humidity_threshold: 1.8,
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const guidance = container.querySelector(".comfort-ventilation-guidance-config")!;
    const inputs = guidance.querySelectorAll<HTMLInputElement>("input[type='number']");
    expect(inputs).toHaveLength(3);
    expect(Array.from(inputs, (input) => input.value)).toEqual(["1.5", "7.5", "1.8"]);
    const description = container.querySelector(
      ".comfort-outdoor-config-section > .comfort-config-description",
    )?.textContent ?? "";
    expect(guidance.querySelector(".comfort-config-description")).toBeNull();
    expect(description).toContain("comfortVentilationGuidanceDescriptionWithHumidity");
    expect(description).toMatch(/1[.,]5 C/);
    expect(description).toMatch(/7[.,]5 comfortPercentagePoints/);
    expect(description).toMatch(/1[.,]8 g\/m³/);
    inputs[1].value = "8.5";
    inputs[1].dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", {
      ventilation_humidity_threshold: 8.5,
    });
    expect(comfortStyles.cssText).toMatch(
      /\.comfort-ventilation-guidance-rows \.comfort-number-field-single small\s*\{[^}]*display:\s*none;/,
    );
  });

  it("only shows humidity guidance thresholds when an outdoor humidity source is selected", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        outdoor_comparison_enabled: true,
        outdoor_temperature_entity_id: "sensor.outdoor_temperature",
        outdoor_humidity_entity_id: null,
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.querySelectorAll(
      ".comfort-ventilation-guidance-config input[type='number']",
    )).toHaveLength(1);
    const description = container.querySelector(
      ".comfort-outdoor-config-section > .comfort-config-description",
    )?.textContent.trim();
    expect(description).toBe("comfortVentilationGuidanceDescription:1 C");
    expect(translate("en", "comfortVentilationGuidanceDescription", {
      temperature: "1 °C",
    })).toContain("Add outdoor humidity");
  });

  it("hydrates both persisted outdoor selectors on a fresh host and keeps unavailable fallbacks selected", () => {
    const { saveZoneComfort, viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        outdoor_comparison_enabled: true,
        outdoor_temperature_entity_id: "sensor.persisted_outdoor_temperature",
        outdoor_humidity_entity_id: "sensor.persisted_outdoor_humidity",
      },
      hassStates: {
        "sensor.persisted_outdoor_temperature": {
          state: "unavailable",
          attributes: { friendly_name: "Saved outdoor temperature" },
        },
        "sensor.new_outdoor_humidity": {
          state: "58",
          attributes: { device_class: "humidity", friendly_name: "New outdoor humidity" },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    let selects = container.querySelectorAll(".comfort-outdoor-config-section select");
    expect(selects).toHaveLength(2);
    expect(selects[0].value).toBe("sensor.persisted_outdoor_temperature");
    expect(selects[0].selectedOptions[0]?.textContent)
      .toContain("Saved outdoor temperature · sensor.persisted_outdoor_temperature");
    expect(selects[1].value).toBe("sensor.persisted_outdoor_humidity");
    expect(selects[1].selectedOptions[0]?.textContent)
      .toContain("sensor.persisted_outdoor_humidity");
    expect(saveZoneComfort).not.toHaveBeenCalled();

    render(renderComfortView(viewHost, ["climate.first"]), container);
    selects = container.querySelectorAll(".comfort-outdoor-config-section select");
    expect(selects[0].value).toBe("sensor.persisted_outdoor_temperature");
    expect(selects[1].value).toBe("sensor.persisted_outdoor_humidity");
    expect(saveZoneComfort).not.toHaveBeenCalled();

    selects[1].value = "sensor.new_outdoor_humidity";
    selects[1].dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", {
      outdoor_humidity_entity_id: "sensor.new_outdoor_humidity",
    });
  });

  it("retains disabled outdoor sensor ids and restores each climate selection across rerenders", () => {
    const { saveZoneComfort, viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        outdoor_comparison_enabled: false,
        outdoor_temperature_entity_id: "sensor.first_outdoor_temperature",
        outdoor_humidity_entity_id: "sensor.first_outdoor_humidity",
      },
    });
    const firstSettings = comfortSettings(
      viewHost._data?.zones["climate.first"]?.comfort,
      "C",
    );
    expect(firstSettings.outdoor_temperature_entity_id).toBe("sensor.first_outdoor_temperature");
    expect(firstSettings.outdoor_humidity_entity_id).toBe("sensor.first_outdoor_humidity");

    const firstZone = viewHost._data?.zones["climate.first"];
    if (!firstZone) throw new Error("Missing first climate fixture");
    firstZone.comfort = {
      ...firstSettings,
      outdoor_comparison_enabled: true,
    };
    if (!viewHost._data) throw new Error("Missing schedule fixture");
    viewHost._data.zones["climate.second"] = {
      enabled: true,
      schedule: {},
      comfort: comfortSettings({
        enabled: true,
        outdoor_comparison_enabled: true,
        outdoor_temperature_entity_id: "sensor.second_outdoor_temperature",
        outdoor_humidity_entity_id: "sensor.second_outdoor_humidity",
      }, "C"),
    };
    viewHost._expandedComfortZones.add("climate.second");
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);
    let selects = container.querySelectorAll(".comfort-outdoor-config-section select");
    expect(Array.from(selects, (select) => select.value)).toEqual([
      "sensor.first_outdoor_temperature",
      "sensor.first_outdoor_humidity",
    ]);

    render(renderComfortView(viewHost, ["climate.second"]), container);
    selects = container.querySelectorAll(".comfort-outdoor-config-section select");
    expect(Array.from(selects, (select) => select.value)).toEqual([
      "sensor.second_outdoor_temperature",
      "sensor.second_outdoor_humidity",
    ]);

    render(renderComfortView(viewHost, ["climate.first"]), container);
    selects = container.querySelectorAll(".comfort-outdoor-config-section select");
    expect(Array.from(selects, (select) => select.value)).toEqual([
      "sensor.first_outdoor_temperature",
      "sensor.first_outdoor_humidity",
    ]);
    expect(saveZoneComfort).not.toHaveBeenCalled();
  });

  it("shows the backend ventilation insight with limited scope when humidity is unavailable", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "hot",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        outdoor: {
          enabled: true,
          data_quality: "partial",
          data_issues: [],
          humidity: { availability: "not_monitored", condition: null, metric: "outdoor_humidity", source: "sensor" },
        },
        insights: [{ code: "ventilation_may_help_cool", kind: "context", tone: "cool", metrics: ["outdoor"] }],
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.querySelectorAll('[data-insight-code="ventilation_may_help_cool"]')).toHaveLength(1);
    expect(container.querySelector(".comfort-insights")?.textContent)
      .toMatch(/comfortInsightVentilationCool\s+comfortInsightVentilationTemperatureOnly/);
    expect(container.querySelector(".comfort-outdoor-message")).toBeNull();
  });

  it("renders and saves temperature-aware humidity endpoints as nested patches", () => {
    const { saveZoneComfort, viewHost } = host({
      enabled: true,
      expanded: true,
      temperatureUnit: "F",
      comfort: {
        comfort_model: "temperature_aware",
        temperature_min: 68,
        temperature_max: 75,
        temperature_aware: {
          at_temperature_min: { minimum: 40, maximum: 60 },
          at_temperature_max: { minimum: 35, maximum: 50 },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const model = container.querySelector<HTMLSelectElement>(".comfort-model-row select");
    expect(model?.value).toBe("temperature_aware");
    const ranges = container.querySelectorAll(".comfort-temperature-aware-range");
    expect(ranges).toHaveLength(2);
    expect(ranges[0].tagName).toBe("DIV");
    expect(ranges[0].getAttribute("role")).toBe("group");
    expect(ranges[0].querySelector(".comfort-temperature-aware-range-heading")).not.toBeNull();
    expect(ranges[0].querySelector("legend")).toBeNull();
    expect(ranges[0].textContent).toContain("68 F");
    expect(ranges[1].textContent).toContain("75 F");
    const inputs = ranges[1].querySelectorAll<HTMLInputElement>("input");
    expect(Array.from(inputs, (input) => input.value)).toEqual(["35", "50"]);
    expect(inputs[0].max).toBe("49.9");
    expect(inputs[1].min).toBe("35.1");
    inputs[0].value = "36";
    inputs[0].dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", {
      temperature_aware: {
        at_temperature_max: { minimum: 36 },
      },
    });

    if (!model) throw new Error("Missing Comfort model selector");
    model.value = "simple";
    model.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", {
      comfort_model: "simple",
    });
  });

  it("offers a compact guided model when humidity is configured", () => {
    const { saveZoneComfort, viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        comfort_model: "guided",
        temperature_min: 20,
        temperature_max: 24,
        humidity_min: 40,
        humidity_max: 60,
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const model = container.querySelector<HTMLSelectElement>(".comfort-model-row select");
    const guided = model?.querySelector<HTMLOptionElement>('option[value="guided"]');
    expect(model?.value).toBe("guided");
    expect(guided?.disabled).toBe(false);
    expect(container.querySelector(".comfort-guided-reference")?.textContent)
      .toContain("comfortModelGuidedReference:22 C");
    expect(container.querySelector(".comfort-temperature-aware-ranges")).toBeNull();

    if (!model) throw new Error("Missing Comfort model selector");
    model.value = "simple";
    model.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZoneComfort).toHaveBeenCalledWith("climate.first", {
      comfort_model: "simple",
    });
  });

  it("disables guided selection when no humidity source is configured", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: {
        humidity_entity_id: null,
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const guided = container.querySelector<HTMLOptionElement>(
      '.comfort-model-row option[value="guided"]',
    );
    expect(guided?.disabled).toBe(true);
    expect(container.querySelector(".comfort-model-row")?.textContent)
      .toContain("comfortModelSimpleDescription");
    expect(container.querySelector(".comfort-model-requirement")?.textContent)
      .toContain("comfortModelHumidityRequired");
  });

  it("draws a sampled backend guided curve without frontend psychrometric inputs", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      comfort: { comfort_model: "guided" },
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        temperature: {
          availability: "current", condition: "comfortable", metric: "temperature",
          source: "climate", value: 22, min: 20, max: 24,
        },
        humidity: {
          availability: "current", condition: "comfortable", metric: "humidity",
          source: "climate", value: 50, min: 40, max: 60,
        },
        comfort_zone: {
          model: "guided",
          temperature_min: 20,
          temperature_max: 24,
          points: [
            { temperature: 20, humidity_min: 45, humidity_max: 68 },
            { temperature: 22, humidity_min: 40, humidity_max: 60 },
            { temperature: 24, humidity_min: 35, humidity_max: 53 },
          ],
          effective_humidity_range: { temperature: 22, minimum: 40, maximum: 60 },
          reference: { temperature: 22, humidity_min: 40, humidity_max: 60 },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const zone = container.querySelector<HTMLElement>(".comfort-map-zone.guided");
    const polygon = zone?.style.getPropertyValue("--comfort-zone-polygon") ?? "";
    expect(polygon).toContain("polygon(");
    expect(polygon.split(",")).toHaveLength(6);
  });

  it("draws the backend temperature-aware zone and exposes its effective range", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "humid",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        temperature: {
          availability: "current", condition: "comfortable", metric: "temperature",
          source: "climate", value: 22, min: 20, max: 24,
        },
        humidity: {
          availability: "current", condition: "humid", metric: "humidity",
          source: "climate", value: 56, min: 37.5, max: 55,
        },
        comfort_zone: {
          model: "temperature_aware",
          temperature_min: 20,
          temperature_max: 24,
          points: [
            { temperature: 20, humidity_min: 40, humidity_max: 60 },
            { temperature: 24, humidity_min: 35, humidity_max: 50 },
          ],
          effective_humidity_range: { temperature: 22, minimum: 37.5, maximum: 55 },
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    const zone = container.querySelector<HTMLElement>(".comfort-map-zone.temperature-aware");
    expect(zone?.style.getPropertyValue("--comfort-zone-polygon")).toContain("polygon(");
    expect(container.querySelector(".comfort-effective-range")?.textContent?.trim())
      .toMatch(/^comfortEffectiveHumidityRange:22 C:37[.,]5:55$/);
  });

  it("keeps the simple rectangle for old backends without comfort_zone", () => {
    const { viewHost } = host({
      enabled: true,
      expanded: true,
      assessment: {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "complete",
        data_issues: [],
        temperature: {
          availability: "current", condition: "comfortable", metric: "temperature",
          source: "climate", value: 22, min: 20, max: 24,
        },
        humidity: {
          availability: "current", condition: "comfortable", metric: "humidity",
          source: "climate", value: 50, min: 40, max: 60,
        },
      },
    });
    const container = document.createElement("div");

    render(renderComfortView(viewHost, ["climate.first"]), container);

    expect(container.querySelector(".comfort-map-zone.simple")).not.toBeNull();
    expect(container.querySelector(".comfort-effective-range")).toBeNull();
  });

  it("stacks the temperature-aware endpoint cards on mobile", () => {
    expect(comfortStyles.cssText).toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*\.comfort-temperature-aware-ranges\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/,
    );
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
