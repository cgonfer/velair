// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { VelairViewHost } from "../../src/velair/host-types";
import { climateCardStyles } from "../../src/velair/styles/climate-card-styles";
import { renderClimateCard } from "../../src/velair/views/climate-card-view";

function host(external = false): VelairViewHost {
  const entityId = "climate.office";
  return {
    hass: { config: { time_zone: "UTC" }, states: { [entityId]: { state: "heat", attributes: { friendly_name: "Office", current_temperature: 20, current_humidity: 45, hvac_action: "heating", temperature: 21, min_temp: 7, max_temp: 35, target_temp_step: 0.5, hvac_modes: ["off", "heat", "cool"] } } } },
    _config: { view: "climate", selected_entity: entityId },
    _data: {
      configured_entities: [entityId], temperature_unit: "°C", home_assistant_temperature_unit: "°C", temperature_migration: { required: false }, global: { mode: "auto" }, settings: { first_weekday: "monday", zone_order: [] },
      zones: { [entityId]: { enabled: true, schedule: { monday: [{ start: "08:00", temperature: 21, hvac_mode: "heat" }] }, ...(external ? { execution: { type: "external", provider: "demo" } as const } : {}) } },
      external_execution: external ? { systems: [{ provider: "demo", name: "Demo controller", entities: [entityId], capabilities: { can_publish: true, can_import: false, supports_profile_schedules: true, supported_actions: [], supported_hvac_modes: [], supported_target_types: [], supported_option_fields: [], max_switchpoints_per_day: 10, time_step_minutes: 15, implicit_midnight_change_counts_toward_limit: false } }], zones: { [entityId]: { type: "external", provider: "demo", available: true, publication: { state: "published" } } } } : undefined,
      operational_status: "running", next_event: null, next_events: [], active_overrides: {}, zone_runtime: { [entityId]: { state: external ? "externally_managed" : "scheduled", control_mode: "automatic", manual_adjustment_allowed: !external } },
    },
    _currentTimelineNow: () => new Date("2026-09-07T10:00:00Z"),
    _entityTemperatureLimits: () => [7, 35], _entityTemperatureStep: () => 0.5,
    _entityFanModeOptions: () => [], _entityPresetModeOptions: () => [], _entitySwingModeOptions: () => [],
    _entitySwingHorizontalModeOptions: () => [], _entityHumidityLimits: () => undefined, _climateSupportedModes: () => ["heat"],
    _temperatureUnit: () => "°C",
    _formatTemperature: (value: number) => `${value} °C`, _friendlyEntityName: () => "Office",
    _formatDateTime: (value: string) => value,
    _formatEventAction: () => "21 °C", _formatEventMode: () => "heat", _formatScheduleTime: (value: string) => value,
    _shortWeekdayName: (value: string) => value.slice(0, 3), _showOverviewTimelineDetail: vi.fn(), _clearOverviewTimelineDetail: vi.fn(),
    _hvacActionLabel: (value: string) => value, _modeLabel: (value: string) => value,
    _navigateToVelair: vi.fn(), _openClimateCardBoost: vi.fn(), _openClimateCardPause: vi.fn(), _resumeAutomaticControl: vi.fn(), _runClimateCardService: vi.fn(),
    _openClimateEntity: vi.fn(), _openEntityHistory: vi.fn(), _adjustClimateCardTarget: vi.fn(), _setClimateCardHvacMode: vi.fn(), _enterManualAdjustment: vi.fn(),
    _manualControlActions: {},
    _climateCardActionsMenuOpen: false, _climateCardActionsHasOverflow: false, _climateCardActionsCanScrollLeft: false, _climateCardActionsCanScrollRight: false,
    _climateCardCurrentStateCollapsed: false, _toggleClimateCardCurrentState: vi.fn(),
    _climateCardRoomAssistCollapsed: false, _toggleClimateCardRoomAssist: vi.fn(),
    _climateCardPreconditioningCollapsed: false, _toggleClimateCardPreconditioning: vi.fn(),
    _openClimateCardActionsMenu: vi.fn(), _closeClimateCardActionsMenu: vi.fn(), _runClimateCardScriptAction: vi.fn(),
    _handleClimateCardActionsScroll: vi.fn(), _scrollClimateCardActions: vi.fn(),
    _t: (key: string, replacements?: Record<string, string | number>) => `${key} ${Object.values(replacements ?? {}).join(" ")}`.trim(),
  } as unknown as VelairViewHost;
}

describe("climate card view", () => {
  it("shows compact read-only controls in Automatic and enables them only in Manual adjustment", () => {
    const automaticContainer = document.createElement("div");
    const automatic = host();
    render(renderClimateCard(automatic, "climate.office"), automaticContainer);
    expect(automaticContainer.querySelector(".climate-card-thermostat-controls")).not.toBeNull();
    expect(automaticContainer.querySelectorAll(".climate-card-target-control button:disabled")).toHaveLength(2);
    expect(automaticContainer.querySelector(".climate-card-mode-control")?.hasAttribute("data-disabled")).toBe(true);
    expect(automaticContainer.querySelector(".climate-card-mode-control summary")?.getAttribute("aria-label")).toBe("mode");
    expect(automaticContainer.querySelector(".climate-card-mode-control summary > ha-icon")?.getAttribute("icon")).toBe("mdi:fire");
    expect(automaticContainer.querySelector(".climate-card-target-stepper")).not.toBeNull();
    expect(automaticContainer.querySelector(".climate-card-control-toolbar")).not.toBeNull();
    expect(automaticContainer.querySelector(".climate-card-control-owner-label")).toBeNull();
    expect(automaticContainer.textContent).toContain("overviewControlAutomatic");
    expect(automaticContainer.textContent).toContain("overviewControlManual");

    const manualContainer = document.createElement("div");
    const manual = host();
    manual._data!.zone_runtime!["climate.office"] = { state: "scheduled", control_mode: "manual" };
    render(renderClimateCard(manual, "climate.office"), manualContainer);
    expect(manualContainer.querySelectorAll(".climate-card-target-control button:not(:disabled)")).toHaveLength(2);
    expect(manualContainer.querySelector(".climate-card-mode-control")?.hasAttribute("data-disabled")).toBe(false);
    expect(manualContainer.querySelectorAll(".climate-card-mode-options button[data-mode] ha-icon:first-child")).toHaveLength(3);
    expect(manualContainer.querySelector(".climate-card-mode-options button[data-mode='off'] ha-icon")?.getAttribute("icon")).toBe("mdi:power");
    expect(manualContainer.querySelector(".climate-card-mode-options button[data-mode='cool'] ha-icon")?.getAttribute("icon")).toBe("mdi:snowflake");
    expect(manualContainer.querySelector(".climate-card-target-value small")?.textContent).toContain("climateCardTargetTemperature");
    manualContainer.querySelectorAll<HTMLButtonElement>(".climate-card-mode-options button[data-mode]")[2].click();
    expect(manual._setClimateCardHvacMode).toHaveBeenCalledWith("climate.office", "cool");
    expect(manualContainer.querySelector('.climate-card-manual-segmented button[aria-pressed="true"]')?.textContent)
      .toContain("overviewControlManual");
  });

  it("keeps controls enabled for the exclusive pause that represents Manual adjustment", () => {
    const container = document.createElement("div");
    const cardHost = host();
    delete cardHost.hass!.states["climate.office"].attributes.target_temp_step;
    cardHost._data!.zone_runtime!["climate.office"] = {
      state: "paused",
      control_mode: "manual",
      pause_count: 1,
      pause_ids: ["velair.manual_adjustment"],
    };
    render(renderClimateCard(cardHost, "climate.office"), container);

    expect(container.querySelectorAll(".climate-card-target-control button:not(:disabled)")).toHaveLength(2);
    expect(container.querySelector(".climate-card-mode-control")?.hasAttribute("data-disabled")).toBe(false);
    expect(container.querySelector('.climate-card-manual-segmented button[aria-pressed="true"]')?.textContent)
      .toContain("overviewControlManual");
    expect(container.textContent).not.toContain("climateCardControlsBlockedPause");
  });

  it("keeps the thermostat surface visually stable while a target request is pending", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._data!.zone_runtime!["climate.office"] = {
      state: "paused",
      control_mode: "manual",
      pause_count: 1,
      pause_ids: ["velair.manual_adjustment"],
    };
    cardHost._climateCardThermostatAction = "temperature";
    render(renderClimateCard(cardHost, "climate.office"), container);

    const surface = container.querySelector(".climate-card-control-surface");
    const mode = container.querySelector(".climate-card-mode-control");
    const targetButtons = container.querySelectorAll<HTMLButtonElement>(".climate-card-target-control button");
    expect(surface?.getAttribute("aria-busy")).toBe("true");
    expect(mode?.hasAttribute("data-disabled")).toBe(false);
    expect(mode?.hasAttribute("data-pending")).toBe(true);
    expect(mode?.querySelector("summary")?.getAttribute("aria-disabled")).toBe("true");
    expect(targetButtons).toHaveLength(2);
    expect([...targetButtons].every((button) => !button.disabled && button.getAttribute("aria-disabled") === "true")).toBe(true);
    targetButtons[0].click();
    mode?.querySelector<HTMLElement>("summary")?.click();
    expect(cardHost._adjustClimateCardTarget).not.toHaveBeenCalled();
    expect((mode as HTMLDetailsElement | null)?.open).toBe(false);
  });

  it("switches between Automatic and Manual through the compact selector", () => {
    const automaticContainer = document.createElement("div");
    const automaticHost = host();
    render(renderClimateCard(automaticHost, "climate.office"), automaticContainer);
    const automaticButtons = automaticContainer.querySelectorAll<HTMLButtonElement>(".climate-card-manual-segmented button");
    automaticButtons[1].click();
    expect(automaticHost._enterManualAdjustment).toHaveBeenCalledWith("climate.office");

    const manualContainer = document.createElement("div");
    const manualHost = host();
    manualHost._data!.zone_runtime!["climate.office"] = {
      state: "paused", control_mode: "manual", pause_count: 1,
      pause_ids: ["velair.manual_adjustment"],
    };
    render(renderClimateCard(manualHost, "climate.office"), manualContainer);
    const manualButtons = manualContainer.querySelectorAll<HTMLButtonElement>(".climate-card-manual-segmented button");
    manualButtons[0].click();
    expect(manualHost._resumeAutomaticControl).toHaveBeenCalledWith("climate.office");
  });

  it("positions the HVAC menu away from the viewport edge and closes it with Escape", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._data!.zone_runtime!["climate.office"] = { state: "scheduled", control_mode: "manual" };
    render(renderClimateCard(cardHost, "climate.office"), container);
    const details = container.querySelector<HTMLDetailsElement>(".climate-card-mode-control")!;
    vi.spyOn(details, "getBoundingClientRect").mockReturnValue({
      top: 700, bottom: 744, left: 20, right: 200, width: 180, height: 44, x: 20, y: 700,
      toJSON: () => ({}),
    });
    details.querySelector<HTMLElement>("summary")!.click();
    expect(details.dataset.placement).toBe("up");
    details.open = true;
    details.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(details.open).toBe(false);
  });

  it("blocks controls when another pause is active during Manual adjustment", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._data!.zone_runtime!["climate.office"] = {
      state: "paused",
      control_mode: "manual",
      pause_count: 2,
      pause_ids: ["velair.manual_adjustment", "window.open"],
    };
    render(renderClimateCard(cardHost, "climate.office"), container);

    expect(container.querySelectorAll(".climate-card-target-control button:disabled")).toHaveLength(2);
    expect(container.querySelector(".climate-card-mode-control")?.hasAttribute("data-disabled")).toBe(true);
    expect(container.textContent).toContain("climateCardControlsBlockedPause");
  });

  it("associates an unavailable Manual option with its visible explanation", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._data!.zone_runtime!["climate.office"] = {
      state: "paused", control_mode: "automatic", pause_count: 1,
      pause_ids: ["window.open"], manual_adjustment_allowed: false,
      manual_adjustment_unavailable_reason: "zone_paused",
    };
    render(renderClimateCard(cardHost, "climate.office"), container);

    const manual = container.querySelectorAll(".climate-card-manual-segmented button")[1];
    const reasonId = manual.getAttribute("aria-describedby");
    expect(manual.getAttribute("aria-disabled")).toBe("true");
    expect(reasonId).toBeTruthy();
    expect(container.querySelector(`#${reasonId}`)?.textContent).toContain("climateCardControlsBlockedPause");
  });

  it("shows both heat_cool target boundaries and limits external ownership to the native link", () => {
    const rangeContainer = document.createElement("div");
    const range = host();
    range.hass!.states["climate.office"] = { state: "heat_cool", attributes: {
      target_temp_low: 18, target_temp_high: 24, min_temp: 7, max_temp: 35,
      target_temp_step: 1, supported_features: 2, hvac_modes: ["heat_cool"],
    } };
    range._data!.zone_runtime!["climate.office"] = { state: "scheduled", control_mode: "manual" };
    render(renderClimateCard(range, "climate.office"), rangeContainer);
    expect(rangeContainer.querySelectorAll(".climate-card-target-control")).toHaveLength(2);
    expect(rangeContainer.textContent).toContain("climateCardLowerTarget");
    expect(rangeContainer.textContent).toContain("climateCardUpperTarget");

    const externalContainer = document.createElement("div");
    render(renderClimateCard(host(true), "climate.office"), externalContainer);
    expect(externalContainer.querySelector(".climate-card-native-link")).not.toBeNull();
    expect(externalContainer.querySelector(".climate-card-target-control")).toBeNull();
    expect(externalContainer.querySelector(".climate-card-mode-control")).toBeNull();
    expect(externalContainer.querySelector(".climate-card-manual-control")).toBeNull();
    expect(externalContainer.querySelector(".climate-card-native-link ha-icon")?.getAttribute("icon")).toBe("mdi:home-assistant");
    expect(externalContainer.querySelectorAll(".climate-card-native-link ha-icon")).toHaveLength(1);
  });

  it("keeps the control section structural while allowing every internal control to be hidden", () => {
    const hidden = document.createElement("div");
    const hiddenHost = host();
    Object.assign(hiddenHost._config, {
      climate_show_actions: false,
      climate_show_control_mode: false,
      climate_show_target_control: false,
      climate_show_hvac_mode_control: false,
      climate_show_native_climate_link: false,
    });
    render(renderClimateCard(hiddenHost, "climate.office"), hidden);
    expect(hidden.querySelector(".climate-card-thermostat-controls")).toBeNull();

    const actionsOnly = document.createElement("div");
    const actionsOnlyHost = host();
    Object.assign(actionsOnlyHost._config, {
      climate_show_control_mode: false,
      climate_show_target_control: false,
      climate_show_hvac_mode_control: false,
      climate_show_native_climate_link: false,
    });
    render(renderClimateCard(actionsOnlyHost, "climate.office"), actionsOnly);
    expect(actionsOnly.querySelector(".climate-card-control-toolbar .climate-card-actions")).not.toBeNull();
    expect(actionsOnly.querySelector(".climate-card-control-surface")).toBeNull();
    expect(actionsOnly.querySelector(".climate-card-thermostat-controls")?.classList.contains("has-pane")).toBe(false);

    const linkOnly = document.createElement("div");
    const linkOnlyHost = host();
    linkOnlyHost._config.climate_show_target_control = false;
    linkOnlyHost._config.climate_show_hvac_mode_control = false;
    render(renderClimateCard(linkOnlyHost, "climate.office"), linkOnly);
    expect(linkOnly.querySelector(".climate-card-native-link")).not.toBeNull();
    expect(linkOnly.querySelector(".climate-card-manual-control")).not.toBeNull();

    const manual = document.createElement("div");
    const manualHost = host();
    manualHost._data!.zone_runtime!["climate.office"] = { state: "scheduled", control_mode: "manual" };
    Object.assign(manualHost._config, {
      climate_show_target_control: false,
      climate_show_hvac_mode_control: false,
      climate_show_native_climate_link: false,
    });
    render(renderClimateCard(manualHost, "climate.office"), manual);
    expect(manual.querySelector(".climate-card-thermostat-controls")).not.toBeNull();
    expect(manual.querySelector('.climate-card-manual-segmented button[aria-pressed="true"]')?.textContent)
      .toContain("overviewControlManual");

    const withoutOwner = document.createElement("div");
    const withoutOwnerHost = host();
    withoutOwnerHost._config.climate_show_control_mode = false;
    render(renderClimateCard(withoutOwnerHost, "climate.office"), withoutOwner);
    expect(withoutOwner.querySelector(".climate-card-manual-control")).toBeNull();
    expect(withoutOwner.querySelector(".climate-card-control-surface")).not.toBeNull();
  });

  it("keeps mode and Home Assistant access but hides target controls while the climate is off", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost.hass!.states["climate.office"].state = "off";
    cardHost._data!.zone_runtime!["climate.office"] = {
      state: "paused", control_mode: "manual", pause_count: 1,
      pause_ids: ["velair.manual_adjustment"],
    };
    render(renderClimateCard(cardHost, "climate.office"), container);

    expect(container.querySelector(".climate-card-mode-control")).not.toBeNull();
    expect(container.querySelector(".climate-card-target-control")).toBeNull();
    expect(container.querySelector(".climate-card-native-link ha-icon")?.getAttribute("icon")).toBe("mdi:home-assistant");
  });

  it("renders live climate state, the established timeline and safe local actions", () => {
    const container = document.createElement("div");
    render(renderClimateCard(host(), "climate.office"), container);
    expect(container.querySelector(".climate-action-heating")).not.toBeNull();
    expect(container.textContent).toContain("20 °C");
    expect(container.querySelector(".overview-timeline-track")).not.toBeNull();
    expect(container.querySelector(".overview-timeline-name")).toBeNull();
    expect(container.textContent).toContain("todayTimeline");
    expect(container.querySelector(".climate-card-features")).toBeNull();
    expect(container.querySelectorAll(".climate-card-actions-row > button")).toHaveLength(2);
    const reservedActionArrows = container.querySelectorAll<HTMLButtonElement>(".climate-card-actions-scroll-button");
    expect(reservedActionArrows).toHaveLength(2);
    expect([...reservedActionArrows].every((button) => button.disabled && button.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(container.querySelector(".climate-card-actions-scroll")?.classList.contains("has-overflow")).toBe(false);
    expect(container.querySelector(".climate-card-actions .boost ha-icon")?.getAttribute("icon")).toBe("mdi:lightning-bolt");
    expect(container.querySelector(".climate-card-actions .pause ha-icon")?.getAttribute("icon")).toBe("mdi:pause-circle");
    const header = container.querySelector(".climate-card-header");
    const actions = container.querySelector(".climate-card-actions");
    const controls = container.querySelector(".climate-card-thermostat-controls");
    expect(header?.nextElementSibling).toBe(controls);
    expect(controls?.querySelector(".climate-card-control-toolbar .climate-card-actions")).toBe(actions);
    expect(controls?.querySelector(".climate-card-control-toolbar")?.nextElementSibling?.classList.contains("climate-card-control-surface")).toBe(true);
  });

  it("groups current readings and optional context into one compact surface", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_outdoor_temperature_entity = "sensor.outdoor";
    cardHost._config.climate_window_entities = ["binary_sensor.window"];
    cardHost.hass!.states["sensor.outdoor"] = { state: "17", attributes: { friendly_name: "AEMET temperature feeling" } };
    cardHost.hass!.states["binary_sensor.window"] = { state: "on", attributes: { friendly_name: "Office window" } };
    cardHost._data.comfort = { "climate.office": { enabled: true, condition: "comfortable", air_quality: "good", data_quality: "complete", data_issues: [] } };
    render(renderClimateCard(cardHost, "climate.office"), container);

    const current = container.querySelector(".climate-card-current-grid");
    const metrics = current?.querySelectorAll<HTMLElement>(".climate-card-current-readings .climate-card-metric");
    expect(metrics).toHaveLength(2);
    expect(metrics?.[0].hasAttribute("role")).toBe(false);
    metrics?.[0].click();
    expect(cardHost._openEntityHistory).not.toHaveBeenCalled();
    const historyButtons = current?.querySelectorAll<HTMLButtonElement>(".climate-card-metric-history");
    expect(historyButtons).toHaveLength(3);
    historyButtons?.[0].click();
    historyButtons?.[1].click();
    expect(cardHost._openEntityHistory).toHaveBeenNthCalledWith(1, "climate.office");
    expect(cardHost._openEntityHistory).toHaveBeenNthCalledWith(2, "climate.office");
    expect(current?.querySelectorAll(".climate-card-current-context .climate-card-context-item")).toHaveLength(2);
    current?.querySelector<HTMLElement>(".climate-card-context-item.outdoor")?.click();
    expect(cardHost._openEntityHistory).toHaveBeenCalledTimes(2);
    historyButtons?.[2].click();
    expect(cardHost._openEntityHistory).toHaveBeenNthCalledWith(3, "sensor.outdoor");
    expect(current?.querySelector(".climate-card-context-item.outdoor small")?.getAttribute("title")).toBe("AEMET temperature feeling");
    expect(current?.querySelector(".climate-card-context-item.outdoor.with-history")).not.toBeNull();
    expect(current?.querySelector(":scope > .climate-card-comfort")).not.toBeNull();
  });

  it("uses the first contextual Comfort insight without repeating the condition", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._data!.comfort = { "climate.office": {
      enabled: true,
      condition: "comfortable",
      air_quality: "good",
      data_quality: "complete",
      data_issues: [],
      temperature: { availability: "current", condition: "comfortable", metric: "temperature", source: "climate", value: 20 },
      derived_metrics: { humidex: { availability: "current", condition: null, metric: "humidex", source: "velair", value: 25.7 } },
      insights: [
        { code: "future_unknown", kind: "context", tone: "neutral", metrics: [] },
        { code: "humidex_feels_warmer", kind: "context", tone: "warm", metrics: ["temperature", "humidex"] },
        { code: "co2_elevated", kind: "context", tone: "attention", metrics: ["co2"] },
      ],
    } };

    render(renderClimateCard(cardHost, "climate.office"), container);

    const comfort = container.querySelector(".climate-card-comfort");
    expect(comfort?.textContent).toContain("comfortConditionComfortable");
    expect(comfort?.textContent?.match(/comfortConditionComfortable/g)).toHaveLength(1);
    expect(comfort?.textContent).toMatch(/comfortInsightHumidexWarmer 5[,.]7 °C/);
    expect(comfort?.textContent).not.toContain("comfortInsightCo2Elevated");
    expect(comfort?.textContent).not.toContain("comfortInsightCurrentCondition");
    expect(comfort?.textContent).not.toContain("comfortInsightUnavailable");
    expect(comfort?.querySelectorAll('ha-icon[icon="mdi:sofa-outline"]')).toHaveLength(1);
  });

  it("keeps the Comfort condition separate from the Humidex range in the card", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._data!.comfort = { "climate.office": {
      enabled: true,
      condition: "humid",
      air_quality: "good",
      data_quality: "complete",
      data_issues: [],
      range_summary: {
        status: "mixed",
        thermal_relation: "mixed",
        positions: { temperature: "within", humidity: "above", humidex: "above" },
      },
    } };

    render(renderClimateCard(cardHost, "climate.office"), container);

    const comfort = container.querySelector(".climate-card-comfort");
    expect(comfort?.textContent).toContain("comfortConditionHumid");
    expect(comfort?.textContent).toContain("comfortHumidex");
    expect(comfort?.textContent).toContain("comfortHumidexRangeAbove");
    expect(comfort?.textContent).not.toContain("comfortRangeMixed");
    expect(comfort?.getAttribute("style")).toContain("--comfort-primary-accent:var(--info-color, #3aa7c9)");
    expect(comfort?.getAttribute("style")).toContain("--comfort-secondary-accent:var(--warning-color, #e69b35)");
  });
  it("orders multiple derived Comfort readings consistently", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost.hass!.locale = { language: "es-ES" };
    cardHost._data!.comfort = { "climate.office": {
      enabled: true,
      condition: "comfortable",
      air_quality: "good",
      data_quality: "complete",
      data_issues: [],
      derived_metrics: {
        dew_point: { availability: "current", condition: null, metric: "dew_point", source: "velair", value: 12.4 },
        absolute_humidity: { availability: "current", condition: null, metric: "absolute_humidity", source: "velair", value: 12.16 },
        humidex: { availability: "current", condition: null, metric: "humidex", source: "velair", value: 25.7 },
      },
    } };

    render(renderClimateCard(cardHost, "climate.office"), container);

    const summary = container.querySelector(".climate-card-comfort-metrics")?.textContent ?? "";
    expect(summary.indexOf("comfortHumidex")).toBeLessThan(
      summary.indexOf("comfortDewPoint"),
    );
    expect(summary.indexOf("comfortDewPoint")).toBeLessThan(
      summary.indexOf("comfortAbsoluteHumidity"),
    );
    expect(summary).toContain("12,16 g/m³");
  });

  it("shows the exact Fahrenheit Humidex delta without adding 32", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._temperatureUnit = () => "°F";
    cardHost._data!.temperature_unit = "°F";
    cardHost._data!.comfort = { "climate.office": {
      enabled: true,
      condition: "comfortable",
      air_quality: "good",
      data_quality: "complete",
      data_issues: [],
      temperature: { availability: "current", condition: "comfortable", metric: "temperature", source: "climate", value: 68 },
      derived_metrics: { humidex: { availability: "current", condition: null, metric: "humidex", source: "velair", value: 25.7 } },
      insights: [{ code: "humidex_feels_warmer", kind: "context", tone: "warm", metrics: ["temperature", "humidex"] }],
    } };

    render(renderClimateCard(cardHost, "climate.office"), container);

    expect(container.querySelector(".climate-card-comfort")?.textContent)
      .toMatch(/comfortInsightHumidexWarmer 10[,.]3 °F/);
  });

  it("uses the first prioritized outdoor Comfort insight in the compact card", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._data!.comfort = { "climate.office": {
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
    } };

    render(renderClimateCard(cardHost, "climate.office"), container);

    expect(container.querySelector(".climate-card-comfort")?.textContent)
      .toContain("comfortInsightVentilationCool comfortInsightVentilationTemperatureOnly");
  });

  it("converts an outdoor Celsius sensor before comparing it with a Fahrenheit climate", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_outdoor_temperature_entity = "sensor.outdoor";
    cardHost._data!.temperature_unit = "°F";
    cardHost.hass!.states["climate.office"].attributes.current_temperature = 68;
    cardHost.hass!.states["sensor.outdoor"] = {
      state: "10",
      attributes: {
        friendly_name: "Outdoor temperature",
        unit_of_measurement: "°C",
      },
    };
    cardHost._temperatureUnit = () => "°F";
    cardHost._formatTemperature = (value: number) => `${Number(value.toFixed(1))} °F`;

    render(renderClimateCard(cardHost, "climate.office"), container);

    const outdoor = container.querySelector(".climate-card-context-item.outdoor");
    expect(outdoor?.querySelector("strong")?.textContent).toBe("50 °F");
    expect(outdoor?.textContent).toContain("climateCardOutdoorColder 18 °F");
  });

  it("converts an outdoor Fahrenheit sensor before comparing it with a Celsius climate", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_outdoor_temperature_entity = "sensor.outdoor";
    cardHost.hass!.states["climate.office"].attributes.current_temperature = 20;
    cardHost.hass!.states["sensor.outdoor"] = {
      state: "50",
      attributes: {
        friendly_name: "Outdoor temperature",
        unit_of_measurement: "°F",
      },
    };
    cardHost._temperatureUnit = () => "°C";
    cardHost._formatTemperature = (value: number) => `${Number(value.toFixed(1))} °C`;

    render(renderClimateCard(cardHost, "climate.office"), container);

    const outdoor = container.querySelector(".climate-card-context-item.outdoor");
    expect(outdoor?.querySelector("strong")?.textContent).toBe("10 °C");
    expect(outdoor?.textContent).toContain("climateCardOutdoorColder 10 °C");
  });

  it("uses an explicitly configured humidity sensor for both its value and history", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_humidity_entity = "sensor.office_humidity";
    cardHost.hass!.states["sensor.office_humidity"] = {
      state: "52.5",
      attributes: { friendly_name: "Office humidity", device_class: "humidity", unit_of_measurement: "%" },
    };
    render(renderClimateCard(cardHost, "climate.office"), container);

    const humidity = container.querySelector<HTMLElement>(".climate-card-metric.humidity");
    expect(humidity?.querySelector("strong")?.textContent).toBe("52.5%");
    expect(humidity?.hasAttribute("role")).toBe(false);
    humidity?.click();
    expect(cardHost._openEntityHistory).not.toHaveBeenCalled();
    humidity?.querySelector<HTMLButtonElement>(".climate-card-metric-history")?.click();
    expect(cardHost._openEntityHistory).toHaveBeenCalledWith("sensor.office_humidity");
  });

  it("renders the active Profile and Mode as split semantic chips", () => {
    const container = document.createElement("div");
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._data.global.active_profile_ids = ["away"];
    cardHost._data.profiles = [{
      key: "away",
      name: "Away",
      icon: "mdi:briefcase-outline",
      color: "#123456",
      zones: { "climate.office": { behavior: "schedule", schedule: cardHost._data.zones["climate.office"].schedule } },
    }];
    cardHost._data.modes = [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }];
    cardHost._data.active_mode_id = "vacation";
    render(renderClimateCard(cardHost, "climate.office"), container);

    const profile = container.querySelector<HTMLElement>(".climate-card-context-chip.is-profile");
    const mode = container.querySelector<HTMLElement>(".climate-card-context-chip.is-mode");
    expect(profile?.textContent).toContain("profileOverviewLabel");
    expect(profile?.textContent).toContain("Away");
    expect(profile?.getAttribute("style")).toContain("#123456");
    expect(profile?.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:briefcase-outline");
    expect(mode?.textContent).toContain("Vacation");
  });

  it("can hide the timeline title, Profile, and Mode without hiding its track", () => {
    const container = document.createElement("div");
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._data.global.active_profile_ids = ["away"];
    cardHost._data.profiles = [{ key: "away", name: "Away", zones: { "climate.office": { behavior: "pause" } } }];
    cardHost._data.modes = [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }];
    cardHost._data.active_mode_id = "vacation";
    Object.assign(cardHost._config, {
      climate_show_timeline_title: false,
      climate_show_timeline_profile: false,
      climate_show_timeline_mode: false,
    });
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".climate-card-section-heading")).toBeNull();
    expect(container.querySelector(".overview-timeline-track")).not.toBeNull();
  });

  it("does not render windows when their section is disabled", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_window_entities = ["binary_sensor.window"];
    cardHost._config.climate_show_windows = false;
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".climate-card-context-item.windows")).toBeNull();
  });

  it("supports a custom name while keeping the Velair shortcut in the header", () => {
    const named = document.createElement("div");
    const namedHost = host();
    namedHost._config.climate_name = "Living room";
    render(renderClimateCard(namedHost, "climate.office"), named);
    expect(named.querySelector(".climate-card-title")?.textContent).toContain("Living room");

    const empty = document.createElement("div");
    namedHost._config.climate_name = "";
    render(renderClimateCard(namedHost, "climate.office"), empty);
    expect(empty.querySelector(".climate-card-title h2")?.textContent).toBe("");

    const hidden = document.createElement("div");
    const hiddenHost = host();
    Object.assign(hiddenHost._config, {
      climate_show_state_bar: false,
      climate_show_velair_link: false,
      climate_show_name: false,
      climate_show_operation: false,
    });
    render(renderClimateCard(hiddenHost, "climate.office"), hidden);
    expect(hidden.querySelector(".climate-card-state-line")).toBeNull();
    expect(hidden.querySelector(".climate-card-header")).not.toBeNull();
    expect(hidden.querySelector(".climate-card-brand")).not.toBeNull();
  });

  it("uses the operation as the leading header signal and keeps a compact Velair shortcut", () => {
    const container = document.createElement("div");
    render(renderClimateCard(host(), "climate.office"), container);

    const header = container.querySelector(".climate-card-header");
    expect(header?.firstElementChild?.classList.contains("climate-card-operation-icon")).toBe(true);
    expect(header?.querySelector(".climate-card-operation-icon")?.getAttribute("icon")).toBe("mdi:fire");
    expect(header?.querySelector(".climate-card-operation-icon")?.getAttribute("aria-hidden")).toBe("true");
    expect(header?.querySelector(".climate-card-title")?.textContent).toContain("Office");
    expect(header?.querySelector(".climate-card-title ha-icon")?.getAttribute("aria-label")).toBe("climateCardAvailable");
    expect(header?.querySelector(".climate-card-operation strong")?.textContent).toContain("heating");
    expect(header?.querySelector(".climate-card-operation small")?.textContent).toContain("scheduled");
    expect(header?.querySelector(".climate-card-operation small")?.textContent).toContain("heat");
    expect(header?.querySelector(".climate-card-brand-copy strong")?.textContent).toBe("Velair");
    expect(header?.querySelector(".climate-card-brand-copy small")?.textContent).toBe("by cgonfer");
    expect(header?.querySelector<HTMLImageElement>(".climate-card-brand img")?.width).toBe(20);
    expect(header?.querySelector(".climate-card-brand")?.getAttribute("aria-label")).toBe("climateCardOpenVelair");
  });

  it("keeps header controls independent without reserving hidden slots", () => {
    const nameOnly = document.createElement("div");
    const nameOnlyHost = host();
    nameOnlyHost._config.climate_show_operation = false;
    render(renderClimateCard(nameOnlyHost, "climate.office"), nameOnly);
    expect(nameOnly.querySelector(".climate-card-title")).not.toBeNull();
    expect(nameOnly.querySelector(".climate-card-operation-icon")).toBeNull();
    expect(nameOnly.querySelector(".climate-card-brand")).not.toBeNull();

    const brandOnly = document.createElement("div");
    const brandOnlyHost = host();
    brandOnlyHost._config.climate_show_name = false;
    brandOnlyHost._config.climate_show_operation = false;
    render(renderClimateCard(brandOnlyHost, "climate.office"), brandOnly);
    expect(brandOnly.querySelector(".climate-card-header-content")).toBeNull();
    expect(brandOnly.querySelector(".climate-card-brand")).not.toBeNull();
  });

  it("presents external ownership and unavailable state safely in the header", () => {
    const external = document.createElement("div");
    render(renderClimateCard(host(true), "climate.office"), external);
    expect(external.querySelector(".climate-card-operation small")?.textContent).toContain("climateCardExternalControl");

    const unavailable = document.createElement("div");
    const unavailableHost = host() as VelairViewHost & { hass: { states: Record<string, { state: string; attributes: Record<string, unknown> }> } };
    unavailableHost.hass.states["climate.office"].state = "unavailable";
    render(renderClimateCard(unavailableHost, "climate.office"), unavailable);
    expect(unavailable.querySelector(".climate-card-operation-icon")?.getAttribute("icon")).toBe("mdi:alert-circle-outline");
    expect(unavailable.querySelector(".climate-card-operation strong")?.textContent).toContain("climateCardUnavailable");
    expect(unavailable.querySelector(".climate-card-operation small")).toBeNull();
  });

  it("uses the HVAC mode once when the climate does not report an action", () => {
    const container = document.createElement("div");
    const cardHost = host();
    delete cardHost.hass!.states["climate.office"].attributes.hvac_action;
    render(renderClimateCard(cardHost, "climate.office"), container);

    expect(container.querySelector(".climate-card-operation-icon")?.getAttribute("icon")).toBe("mdi:fire");
    expect(container.querySelector(".climate-card-operation strong")?.textContent).toBe("heat");
    expect(container.querySelector(".climate-card-operation small")?.textContent).toBe("scheduled");
    expect(container.querySelector(".climate-card-operation")?.textContent).not.toContain("heat scheduled heat");
  });

  it("keeps cooling action and mode distinct in the header", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost.hass!.states["climate.office"].state = "cool";
    cardHost.hass!.states["climate.office"].attributes.hvac_action = "cooling";
    render(renderClimateCard(cardHost, "climate.office"), container);

    expect(container.querySelector(".climate-card-operation-icon")?.getAttribute("icon")).toBe("mdi:snowflake");
    expect(container.querySelector(".climate-card-operation strong")?.textContent).toBe("cooling");
    expect(container.querySelector(".climate-card-operation small")?.textContent).toBe("scheduled · cool");
  });

  it("shows an off climate as Off with a power icon and no duplicate mode", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost.hass!.states["climate.office"].state = "off";
    cardHost.hass!.states["climate.office"].attributes.hvac_action = "idle";
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".climate-action-off.climate-mode-off")).not.toBeNull();
    expect(container.querySelector(".climate-card-operation-icon")?.getAttribute("icon")).toBe("mdi:power");
    expect(container.querySelector(".climate-card-operation strong")?.textContent).toBe("off");
    expect(container.querySelector(".climate-card-operation small")?.textContent).toBe("scheduled");
  });

  it("uses a thermostat icon for idle while retaining the active mode", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost.hass!.states["climate.office"].attributes.hvac_action = "idle";
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".climate-card-operation-icon")?.getAttribute("icon")).toBe("mdi:thermostat");
    expect(container.querySelector(".climate-card-operation small")?.textContent).toBe("scheduled · heat");
  });

  it("shows three ordered actions directly and sends overflow to an icon-only More button", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_actions = [
      { type: "script", name: "One", script: "script.one" },
      { type: "boost" },
      { type: "script", name: "Two", script: "script.two" },
      { type: "pause" },
      { type: "script", name: "Three", script: "script.three" },
    ];
    for (const id of ["one", "two", "three"]) cardHost.hass!.states[`script.${id}`] = { state: "off", attributes: {} };
    cardHost._climateCardActionsMenuOpen = true;
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect([...container.querySelectorAll(".climate-card-actions-row > button")].map((button) => button.classList[0]))
      .toEqual(["custom", "boost", "custom", "more"]);
    expect(container.querySelector(".climate-card-actions")?.classList.contains("controls-4")).toBe(true);
    expect(container.querySelector(".climate-card-actions .more > span:not(.climate-card-action-icon-stack)")).toBeNull();
    expect(container.querySelector(".climate-card-actions .more")?.getAttribute("aria-label")).toBe("more");
    expect(container.querySelectorAll(".climate-card-actions-menu > button")).toHaveLength(3);
    expect(container.querySelector(".climate-card-actions-menu")?.textContent).toContain("Three");
    expect(container.querySelector<HTMLImageElement>(".climate-card-actions-menu-brand")?.getAttribute("src"))
      .toBe("/velair_frontend/velair-icon.png");
    expect(container.querySelector(".climate-card-actions-menu")?.getAttribute("role")).toBe("dialog");
    expect(container.querySelector(".climate-card-actions-menu")?.getAttribute("aria-label")).toBe("climateCardActions");
    expect(container.querySelector(".climate-card-actions-menu [role='menuitem']")).toBeNull();
    expect(container.querySelector(".climate-card-actions-menu-trigger")?.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("shows only the action scroll directions that remain available", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._climateCardActionsHasOverflow = true;
    cardHost._climateCardActionsCanScrollLeft = true;
    cardHost._climateCardActionsCanScrollRight = true;
    render(renderClimateCard(cardHost, "climate.office"), container);

    const previous = container.querySelector<HTMLButtonElement>(".climate-card-actions-scroll-button.scroll-previous");
    const next = container.querySelector<HTMLButtonElement>(".climate-card-actions-scroll-button.scroll-next");
    expect(previous?.disabled).toBe(false);
    expect(next?.disabled).toBe(false);
    expect(previous?.nextElementSibling?.classList.contains("climate-card-actions-row")).toBe(true);
    expect(next?.previousElementSibling?.classList.contains("climate-card-actions-row")).toBe(true);
    previous?.click();
    next?.click();
    expect(cardHost._scrollClimateCardActions).toHaveBeenNthCalledWith(1, -1);
    expect(cardHost._scrollClimateCardActions).toHaveBeenNthCalledWith(2, 1);
    expect(container.querySelector(".climate-card-actions-row")?.getAttribute("style")).toBeNull();
  });

  it("hides Boost and Pause independently without rendering an empty More", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_show_boost_action = false;
    cardHost._config.climate_show_pause_action = false;
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".climate-card-actions .boost")).toBeNull();
    expect(container.querySelector(".climate-card-actions .pause")).toBeNull();
    expect(container.querySelector(".climate-card-actions")).toBeNull();
  });

  it("shows More for an explicitly delegated action without requiring overflow", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_actions = [
      { type: "boost" },
      { type: "script", name: "Ventilate", script: "script.ventilate", placement: "more" },
      { type: "pause" },
    ];
    cardHost.hass!.states["script.ventilate"] = { state: "off", attributes: {} };
    cardHost._climateCardActionsMenuOpen = true;
    render(renderClimateCard(cardHost, "climate.office"), container);

    expect([...container.querySelectorAll(".climate-card-actions-row > button")].map((button) => button.classList[0]))
      .toEqual(["boost", "pause", "more"]);
    expect(container.querySelector(".climate-card-actions-menu")?.textContent).toContain("Ventilate");
    expect(container.querySelectorAll(".climate-card-actions-menu > button")).toHaveLength(2);
  });

  it("renders only More when every eligible action is delegated", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_actions = [
      { type: "boost", placement: "more" },
      { type: "pause", placement: "more" },
      { type: "script", name: "Ventilate", script: "script.ventilate", placement: "more" },
    ];
    cardHost.hass!.states["script.ventilate"] = { state: "off", attributes: {} };
    render(renderClimateCard(cardHost, "climate.office"), container);

    const buttons = [...container.querySelectorAll(".climate-card-actions-row > button")];
    expect(buttons).toHaveLength(1);
    expect(buttons[0].classList.contains("more")).toBe(true);
    expect(container.querySelector(".climate-card-actions")?.classList.contains("controls-1")).toBe(true);
  });

  it("renders configured scripts directly with safe visual values when they fit", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_custom_actions = [{
      name: "Ventilate",
      script: "script.ventilate",
      icon: "mdi:window-open-variant",
      color: "#03a9f4",
    }];
    cardHost.hass!.states["script.ventilate"] = { state: "off", attributes: { friendly_name: "Ventilate" } };
    render(renderClimateCard(cardHost, "climate.office"), container);
    const action = container.querySelector<HTMLButtonElement>(".climate-card-actions .custom");
    expect(action?.textContent).toContain("Ventilate");
    expect(action?.getAttribute("style")).toContain("#03a9f4");
    expect(action?.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:window-open-variant");
    expect(container.querySelector(".climate-card-actions .more")).toBeNull();
  });

  it("renders transient success and error feedback on custom actions", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_actions = [{ type: "script", name: "Ventilate", script: "script.ventilate" }];
    cardHost.hass!.states["script.ventilate"] = { state: "off", attributes: {} };
    cardHost._climateCardScriptFeedback = { key: "0:script.ventilate", status: "success", message: "Ventilate started" };
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".custom.feedback-success .action-result-success")?.getAttribute("icon")).toBe("mdi:check");
    expect(container.querySelector(".custom.feedback-success .action-result-default")?.getAttribute("icon")).toBe("mdi:script-text-outline");
    expect(container.querySelector(".climate-card-action-feedback-label")?.textContent).toBe("Ventilate started");

    cardHost._climateCardScriptFeedback = { key: "0:script.ventilate", status: "error", message: "Failed" };
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".custom.feedback-error .action-result-error")?.getAttribute("icon")).toBe("mdi:alert-outline");
  });

  it("adds an explicit close affordance to the open Boost and Pause action", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._climateCardBoost = { entityId: "climate.office", targetKind: "single", durationMinutes: 60, target: 21 };
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".boost.panel-open .panel-close")?.getAttribute("icon")).toBe("mdi:close");

    cardHost._climateCardBoost = undefined;
    cardHost._climateCardPause = { entityId: "climate.office", indefinite: false, durationMinutes: 60, action: "none" };
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".pause.panel-open .panel-close")?.getAttribute("icon")).toBe("mdi:close");

    cardHost._climateCardPause = undefined;
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".boost:not(.panel-open) .panel-close")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("compacts direct actions without removing their accessible or menu labels", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_actions = [
      { type: "boost", hide_name: true },
      { type: "pause", hide_name: true },
      { type: "script", name: "Ventilate", script: "script.ventilate", hide_name: true, placement: "more" },
    ];
    cardHost.hass!.states["script.ventilate"] = { state: "off", attributes: {} };
    cardHost._climateCardActionsMenuOpen = true;
    render(renderClimateCard(cardHost, "climate.office"), container);

    const compact = [...container.querySelectorAll<HTMLButtonElement>(".climate-card-actions-row > button.icon-only:not(.more)")];
    expect(compact).toHaveLength(2);
    expect(compact.every((button) => button.querySelector(":scope > span:not(.climate-card-action-icon-stack)") === null)).toBe(true);
    expect(compact.every((button) => Boolean(button.title && button.getAttribute("aria-label")))).toBe(true);
    expect(container.querySelector(".climate-card-actions-menu .custom > span:not(.climate-card-action-icon-stack)")?.textContent).toBe("Ventilate");
  });

  it("keeps custom scripts available for externally executed climates", () => {
    const container = document.createElement("div");
    const cardHost = host(true);
    cardHost._config.climate_custom_actions = [{ name: "Scene", script: "script.scene" }];
    cardHost.hass!.states["script.scene"] = { state: "off", attributes: {} };
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".climate-card-actions .custom")).not.toBeNull();
    expect(container.querySelector(".climate-card-actions .more")).toBeNull();
    expect(container.querySelector(".climate-card-actions .boost")).toBeNull();
    expect(container.querySelector(".climate-card-actions .pause")).toBeNull();
  });

  it("removes the Current state panel when every current-state component is disabled", () => {
    const container = document.createElement("div");
    const cardHost = host();
    Object.assign(cardHost._config, {
      climate_show_current_temperature: false,
      climate_show_current_humidity: false,
      climate_show_outdoor_temperature: false,
      climate_show_windows: false,
      climate_show_comfort: false,
    });
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".climate-card-current")).toBeNull();
  });

  it("collapses Current state into a compact summary of the visible content", () => {
    const expanded = document.createElement("div");
    const expandedHost = host();
    render(renderClimateCard(expandedHost, "climate.office"), expanded);
    const toggle = expanded.querySelector<HTMLButtonElement>(".climate-card-current-toggle")!;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(expanded.querySelector(".climate-card-current-summary-wrap")?.getAttribute("aria-hidden")).toBe("true");
    expanded.querySelector<HTMLElement>(".climate-card-current-heading")!.click();
    expect(expandedHost._toggleClimateCardCurrentState).toHaveBeenCalledOnce();
    vi.mocked(expandedHost._toggleClimateCardCurrentState).mockClear();
    toggle.click();
    expect(expandedHost._toggleClimateCardCurrentState).toHaveBeenCalledOnce();

    const collapsed = document.createElement("div");
    const collapsedHost = host();
    collapsedHost._climateCardCurrentStateCollapsed = true;
    collapsedHost._config.climate_show_outdoor_temperature = true;
    collapsedHost._config.climate_outdoor_temperature_entity = "sensor.outdoor";
    collapsedHost._config.climate_show_windows = true;
    collapsedHost._config.climate_window_entities = ["binary_sensor.window"];
    collapsedHost.hass!.states["sensor.outdoor"] = { state: "12", attributes: { friendly_name: "Terrace" } };
    collapsedHost.hass!.states["binary_sensor.window"] = { state: "on", attributes: { friendly_name: "Office window" } };
    render(renderClimateCard(collapsedHost, "climate.office"), collapsed);

    expect(collapsed.querySelector(".climate-card-current")?.classList.contains("collapsed")).toBe(true);
    expect(collapsed.querySelector(".climate-card-current-body")?.getAttribute("aria-hidden")).toBe("true");
    expect(collapsed.querySelector(".climate-card-current-body")?.hasAttribute("inert")).toBe(true);
    expect(collapsed.querySelectorAll(".climate-card-current-summary-item")).toHaveLength(4);
    const collapsedTemperature = collapsed.querySelector<HTMLElement>(".climate-card-current-summary-item.temperature");
    const collapsedOutdoor = collapsed.querySelector<HTMLElement>(".climate-card-current-summary-item.outdoor");
    expect(collapsedTemperature?.getAttribute("role")).toBe("button");
    collapsedTemperature?.click();
    collapsedOutdoor?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(collapsedHost._openEntityHistory).toHaveBeenNthCalledWith(1, "climate.office");
    expect(collapsedHost._openEntityHistory).toHaveBeenNthCalledWith(2, "sensor.outdoor");
    expect(collapsed.querySelector(".climate-card-current-summary-item.windows")?.textContent).toContain("climateCardWindowsOpen 1");
    const collapsedToggle = collapsed.querySelector(".climate-card-current-toggle");
    expect(collapsedToggle?.getAttribute("aria-expanded")).toBe("false");
    const summaryWrap = collapsedToggle?.previousElementSibling;
    expect(summaryWrap?.classList.contains("climate-card-current-summary-wrap")).toBe(true);
    expect(summaryWrap?.getAttribute("aria-hidden")).toBe("false");
    expect(summaryWrap?.querySelector(".climate-card-current-summary")).not.toBeNull();
    expect(collapsed.querySelector(".climate-card-current-scroll-button")).toBeNull();
  });

  it("anchors a wrapped collapsed summary title to the first chip row", () => {
    expect(climateCardStyles.cssText).toContain(
      ".climate-card-current.collapsed .climate-card-current-heading { align-items: start; display: flex; flex-wrap: wrap; gap: 6px 8px; padding-inline-end: 34px; position: relative; }",
    );
    expect(climateCardStyles.cssText).toContain(
      ".climate-card-current.collapsed .climate-card-current-heading h3 { align-self: start; flex: 0 0 auto; min-height: 30px; }",
    );
    expect(climateCardStyles.cssText).toContain(
      ".climate-card-current.collapsed .climate-card-current-summary-wrap { align-self: start; display: contents; }",
    );
    expect(climateCardStyles.cssText).toContain(".climate-card-current.collapsed .climate-card-current-summary { display: contents; }");
    expect(climateCardStyles.cssText).toContain(".climate-card-current.collapsed .climate-card-current-toggle { inset-block-start: 0; inset-inline-end: 0; position: absolute; }");
    expect(climateCardStyles.cssText).toContain(
      ".climate-card-current:not(.collapsed) .climate-card-current-heading:hover .climate-card-current-toggle { color: var(--primary-color); }",
    );
    expect(climateCardStyles.cssText).toContain(".climate-card-current-toggle { align-items: center;");
  });

  it("shows an available Comfort assessment as its own collapsed Current state row", () => {
    const container = document.createElement("div");
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._climateCardCurrentStateCollapsed = true;
    cardHost._data.comfort = { "climate.office": {
      enabled: true, condition: "comfortable", air_quality: "good", data_quality: "complete", data_issues: [],
    } };
    render(renderClimateCard(cardHost, "climate.office"), container);

    const summary = container.querySelector(".climate-card-current-summary");
    const collapsedComfort = container.querySelector(".climate-card-current-collapsed-comfort-row");
    expect(summary?.querySelector(".comfort")).toBeNull();
    expect(collapsedComfort?.textContent).toContain("comfort");
    expect(collapsedComfort?.textContent).toContain("comfortConditionComfortable");
    expect(collapsedComfort?.textContent).not.toContain("comfortAirQualityGood");
    expect(collapsedComfort?.classList.contains("good")).toBe(true);
    expect(collapsedComfort?.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:sofa-outline");
    expect(collapsedComfort?.querySelectorAll('ha-icon[icon="mdi:sofa-outline"]')).toHaveLength(1);
    expect(collapsedComfort?.getAttribute("style")).toContain("--comfort-primary-accent:var(--success-color, #65a56f)");
    expect(collapsedComfort?.getAttribute("style")).toContain("--comfort-secondary-accent:var(--success-color, #65a56f)");
  });

  it("shows additional Comfort readings while collapsed only when configured", () => {
    const assessment = {
      enabled: true,
      condition: "comfortable",
      air_quality: "good",
      data_quality: "complete",
      data_issues: [],
      derived_metrics: {
        humidex: { availability: "current", condition: null, metric: "humidex", source: "velair", value: 25.7 },
        dew_point: { availability: "current", condition: null, metric: "dew_point", source: "velair", value: 12.4 },
        absolute_humidity: { availability: "current", condition: null, metric: "absolute_humidity", source: "velair", value: 12.16 },
      },
    };

    const defaultContainer = document.createElement("div");
    const defaultHost = host() as VelairViewHost & { _data: any };
    defaultHost._climateCardCurrentStateCollapsed = true;
    defaultHost._data.comfort = { "climate.office": assessment };
    render(renderClimateCard(defaultHost, "climate.office"), defaultContainer);
    const defaultCollapsed = defaultContainer.querySelector(".climate-card-current-collapsed-comfort-row");
    expect(defaultCollapsed?.textContent).toContain("comfortConditionComfortable");
    expect(defaultCollapsed?.textContent).not.toContain("comfortHumidex");
    expect(defaultCollapsed?.textContent).not.toContain("comfortDewPoint");
    expect(defaultCollapsed?.textContent).not.toContain("comfortAbsoluteHumidity");

    const configuredContainer = document.createElement("div");
    const configuredHost = host() as VelairViewHost & { _data: any };
    configuredHost._climateCardCurrentStateCollapsed = true;
    configuredHost._config.climate_show_comfort_collapsed_readings = true;
    configuredHost._data.comfort = { "climate.office": assessment };
    render(renderClimateCard(configuredHost, "climate.office"), configuredContainer);
    const configuredCollapsed = configuredContainer.querySelector(".climate-card-current-collapsed-comfort-row");
    expect(configuredCollapsed?.textContent).toContain("comfortHumidex");
    expect(configuredCollapsed?.textContent).toContain("comfortDewPoint");
    expect(configuredCollapsed?.textContent).toContain("comfortAbsoluteHumidity");
  });
  it("omits unavailable Comfort from the collapsed Current state summary", () => {
    const container = document.createElement("div");
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._climateCardCurrentStateCollapsed = true;
    cardHost._data.comfort = { "climate.office": {
      enabled: true, condition: "unknown", air_quality: "unavailable", data_quality: "unavailable", data_issues: [],
    } };
    render(renderClimateCard(cardHost, "climate.office"), container);

    expect(container.querySelector(".climate-card-current-collapsed-comfort")).toBeNull();
  });

  it("keeps each history shortcut coupled to its current reading visibility", () => {
    const temperatureHidden = document.createElement("div");
    const temperatureHost = host();
    temperatureHost._config.climate_show_current_temperature = false;
    render(renderClimateCard(temperatureHost, "climate.office"), temperatureHidden);
    expect(temperatureHidden.querySelector(".climate-card-metric.temperature")).toBeNull();
    expect(temperatureHidden.querySelectorAll(".climate-card-metric-history")).toHaveLength(1);

    const humidityHidden = document.createElement("div");
    const humidityHost = host();
    humidityHost._config.climate_show_current_humidity = false;
    render(renderClimateCard(humidityHost, "climate.office"), humidityHidden);
    expect(humidityHidden.querySelector(".climate-card-metric.humidity")).toBeNull();
    expect(humidityHidden.querySelectorAll(".climate-card-metric-history")).toHaveLength(1);
  });

  it("reuses the Velair Room Assist temperature scale without its surrounding panel", () => {
    const container = document.createElement("div");
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._data.zones["climate.office"].preconditioning = {
      room_temperature_entity_id: "sensor.office",
      room_sensor_assist_enabled: true,
      room_sensor_assist_deadband: 0.3,
      room_sensor_assist_max_delta: 3,
      room_sensor_assist_debounce_seconds: 20,
    };
    cardHost._data.room_sensor_assist = { "climate.office": {
      status: "assisting", configured: true, enabled: true, start: "08:00",
      room_temperature_entity_id: "sensor.office", target_temperature: 21,
      room_temperature: 20, applied_temperature: 22, climate_target_temperature: 22,
      climate_temperature: 19.5, hvac_mode: "heat", weekday: "monday",
    } };
    render(renderClimateCard(cardHost, "climate.office"), container);
    expect(container.querySelector(".sensor-temperature-scale")).not.toBeNull();
    expect(container.querySelector(".climate-card-feature-description")).not.toBeNull();
    expect(container.querySelector(".climate-card-feature-status")?.textContent).toContain("climateCardRoomAssistAssisting");
    expect(container.querySelector(".climate-card-feature-chip")).toBeNull();
    expect(container.querySelector(".sensor-runtime-section")).toBeNull();
    expect(container.querySelector(".climate-card-assist-chart")).toBeNull();
    expect(container.querySelector(".climate-card-feature-panel.room-assist")).not.toBeNull();
    expect(container.querySelector(".climate-card-feature-title")?.textContent).toContain("roomSensorAssistBadge");
  });

  it("keeps the Room Assist status visible and hides text in chart-only mode", () => {
    const container = document.createElement("div");
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._climateCardRoomAssistCollapsed = true;
    cardHost._config.climate_room_assist_display = "chart";
    cardHost._data.zones["climate.office"].preconditioning = {
      room_temperature_entity_id: "sensor.office",
      room_sensor_assist_enabled: true,
    };
    cardHost._data.room_sensor_assist = { "climate.office": {
      status: "assisting", configured: true, enabled: true, start: "08:00",
      target_temperature: 21, room_temperature: 20, applied_temperature: 22,
      climate_target_temperature: 22, climate_temperature: 19.5, hvac_mode: "heat",
    } };

    render(renderClimateCard(cardHost, "climate.office"), container);

    const panel = container.querySelector(".climate-card-feature-panel.room-assist");
    expect(panel?.classList.contains("collapsed")).toBe(true);
    expect(panel?.querySelector(".climate-card-feature-status")?.textContent)
      .toContain("climateCardRoomAssistAssisting");
    expect(panel?.querySelector(".climate-card-feature-description")).toBeNull();
    expect(panel?.querySelector(".climate-card-feature-body")?.getAttribute("aria-hidden")).toBe("true");
    expect(panel?.querySelector(".climate-card-feature-body")?.hasAttribute("inert")).toBe(true);
    expect(panel?.querySelector(".sensor-temperature-scale")).not.toBeNull();
    const heading = panel?.querySelector<HTMLButtonElement>(".climate-card-feature-heading");
    expect(heading?.getAttribute("aria-labelledby")).toBe("climate-card-room-assist-climate-office-title climate-card-room-assist-climate-office-status");
    expect(heading?.hasAttribute("aria-describedby")).toBe(false);
    expect(heading?.title).toContain("climateCardExpandSection roomSensorAssistBadge");
    document.body.append(container);
    heading?.focus();
    expect(document.activeElement).toBe(heading);
    heading?.click();
    expect(document.activeElement).toBe(heading);
    expect(cardHost._toggleClimateCardRoomAssist).toHaveBeenCalledOnce();
    container.remove();
  });

  it("supports Room Assist text, chart, and combined display modes", () => {
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._data.zones["climate.office"].preconditioning = {
      room_temperature_entity_id: "sensor.office",
      room_sensor_assist_enabled: true,
    };
    cardHost._data.room_sensor_assist = { "climate.office": {
      status: "assisting", configured: true, enabled: true, start: "08:00",
      target_temperature: 21, room_temperature: 20, applied_temperature: 22,
      climate_target_temperature: 22, climate_temperature: 19.5, hvac_mode: "heat",
    } };

    const textContainer = document.createElement("div");
    cardHost._config.climate_room_assist_display = "text";
    render(renderClimateCard(cardHost, "climate.office"), textContainer);
    expect(textContainer.querySelector(".climate-card-feature-chip")).toBeNull();
    expect(textContainer.querySelector(".climate-card-feature-description")?.textContent).toContain("climateCardRoomAssistSummaryAssistingAdjusted");
    expect(textContainer.querySelector(".climate-card-feature-description")?.textContent).toContain("21 °C");
    expect(textContainer.querySelector(".climate-card-feature-description")?.textContent).toContain("22 °C");
    expect(textContainer.querySelector(".climate-card-feature-heading.static")).not.toBeNull();
    expect(textContainer.querySelector(".climate-card-feature-heading button")).toBeNull();
    expect(textContainer.querySelector(".climate-card-feature-chevron")).toBeNull();
    expect(textContainer.querySelector(".climate-card-room-assist-metrics")).toBeNull();
    expect(textContainer.querySelector(".sensor-temperature-scale")).toBeNull();

    const unchangedContainer = document.createElement("div");
    cardHost._data.room_sensor_assist["climate.office"].applied_temperature = 21;
    render(renderClimateCard(cardHost, "climate.office"), unchangedContainer);
    expect(unchangedContainer.querySelector(".climate-card-feature-description")?.textContent).toContain("climateCardRoomAssistSummaryAssisting");
    expect(unchangedContainer.querySelector(".climate-card-feature-description")?.textContent).not.toContain("21 °C");

    const chartContainer = document.createElement("div");
    cardHost._config.climate_room_assist_display = "chart";
    render(renderClimateCard(cardHost, "climate.office"), chartContainer);
    expect(chartContainer.querySelector(".climate-card-feature-chip")).toBeNull();
    expect(chartContainer.querySelector(".climate-card-feature-description")).toBeNull();
    expect(chartContainer.querySelector(".climate-card-feature-status")?.textContent).toContain("climateCardRoomAssistAssisting");
    expect(chartContainer.querySelector(".sensor-temperature-scale")).not.toBeNull();

    const bothContainer = document.createElement("div");
    cardHost._config.climate_room_assist_display = "both";
    render(renderClimateCard(cardHost, "climate.office"), bothContainer);
    expect(bothContainer.querySelector(".climate-card-feature-description")).not.toBeNull();
    expect(bothContainer.querySelector(".sensor-temperature-scale")).not.toBeNull();
    expect(bothContainer.querySelector(".climate-card-feature-heading")?.getAttribute("aria-describedby"))
      .toBe("climate-card-room-assist-climate-office-description");
  });

  it("keeps the Room Assist state visible in chart-only mode while no graph is available", () => {
    const container = document.createElement("div");
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._config.climate_room_assist_display = "chart";
    cardHost._data.room_sensor_assist = { "climate.office": {
      status: "idle",
      configured: true,
      enabled: true,
    } };

    render(renderClimateCard(cardHost, "climate.office"), container);

    expect(container.querySelector(".climate-card-feature-panel.room-assist")).not.toBeNull();
    expect(container.querySelector(".climate-card-feature-status")?.textContent).toContain("climateCardRoomAssistIdle");
    expect(container.querySelector(".climate-card-feature-heading.static")).not.toBeNull();
    expect(container.querySelector(".climate-card-feature-description")).toBeNull();
    expect(container.querySelector(".sensor-temperature-scale")).toBeNull();
  });

  it("shows only the compact next actual preconditioning window", () => {
    const container = document.createElement("div");
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._data.next_events = [{
      entity_id: "climate.office",
      when: "2026-09-07T12:00:00Z",
      target_when: "2026-09-07T13:00:00Z",
      weekday: "monday",
      start: "13:00",
      temperature: 21,
      hvac_mode: "heat",
    }];
    render(renderClimateCard(cardHost, "climate.office"), container);
    const preview = container.querySelector(".climate-card-preconditioning-preview");
    expect(preview?.textContent).toContain("preconditioningStarts");
    expect(preview?.textContent).toContain("preconditioningTargetBy");
    expect(preview?.textContent).toContain("60");
    expect(container.querySelector(".preconditioning-prediction")).toBeNull();
  });

  it("collapses preconditioning into the target and calculated start times", () => {
    const container = document.createElement("div");
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._climateCardPreconditioningCollapsed = true;
    cardHost._data.next_events = [{
      entity_id: "climate.office",
      when: "2026-09-07T12:00:00Z",
      target_when: "2026-09-07T13:00:00Z",
      weekday: "monday",
      start: "13:00",
      temperature: 21,
      hvac_mode: "heat",
    }];

    render(renderClimateCard(cardHost, "climate.office"), container);

    const panel = container.querySelector(".climate-card-feature-panel.preconditioning");
    const compact = panel?.querySelector(".climate-card-feature-description");
    expect(panel?.classList.contains("collapsed")).toBe(true);
    expect(panel?.querySelector(".climate-card-feature-heading-content")?.children).toHaveLength(2);
    expect(compact?.textContent).toContain("2026-09-07T13:00:00Z");
    expect(compact?.textContent).toContain("2026-09-07T12:00:00Z");
    expect(compact?.textContent).toContain("21 °C");
    expect(compact?.textContent).toContain("heat");
    const summaryParts = [...(compact?.querySelectorAll(":scope > span:not(.separator)") ?? [])];
    expect(summaryParts[0]?.textContent).toContain("preconditioningStarts");
    expect(summaryParts[1]?.textContent).toContain("preconditioningTargetBy");
    expect(summaryParts[2]?.textContent).toContain("21 °C");
    expect(panel?.querySelector(".climate-card-feature-status")?.textContent).toContain("scheduled");
    expect(panel?.querySelector(".climate-card-feature-body")?.hasAttribute("inert")).toBe(true);
    const heading = panel?.querySelector<HTMLButtonElement>(".climate-card-feature-heading");
    expect(heading?.getAttribute("aria-labelledby")).toBe("climate-card-preconditioning-climate-office-title climate-card-preconditioning-climate-office-status");
    expect(heading?.getAttribute("aria-describedby")).toBe("climate-card-preconditioning-climate-office-description");
    expect(heading?.title).toContain("climateCardExpandSection preconditioning");
    heading?.click();
    expect(cardHost._toggleClimateCardPreconditioning).toHaveBeenCalledOnce();
  });

  it("makes Preconditioning static for text-only display and keeps chart-only compact", () => {
    const cardHost = host() as VelairViewHost & { _data: any };
    cardHost._data.next_events = [{
      entity_id: "climate.office",
      when: "2026-09-07T12:00:00Z",
      target_when: "2026-09-07T13:00:00Z",
      weekday: "monday",
      start: "13:00",
      temperature: 21,
      hvac_mode: "heat",
    }];

    const textContainer = document.createElement("div");
    cardHost._config.climate_preconditioning_display = "text";
    render(renderClimateCard(cardHost, "climate.office"), textContainer);
    expect(textContainer.querySelector(".climate-card-feature-heading.static")).not.toBeNull();
    expect(textContainer.querySelector(".climate-card-feature-description")).not.toBeNull();
    expect(textContainer.querySelector(".climate-card-preconditioning-preview")).toBeNull();
    expect(textContainer.querySelector(".climate-card-feature-chevron")).toBeNull();

    const chartContainer = document.createElement("div");
    cardHost._config.climate_preconditioning_display = "chart";
    render(renderClimateCard(cardHost, "climate.office"), chartContainer);
    expect(chartContainer.querySelector(".climate-card-feature-description")).toBeNull();
    expect(chartContainer.querySelector(".climate-card-feature-status")?.textContent).toContain("scheduled");
    expect(chartContainer.querySelector(".climate-card-preconditioning-preview")).not.toBeNull();
  });

  it("renders grouped window states with matching typography hooks", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_window_entities = ["binary_sensor.open", "binary_sensor.closed"];
    cardHost.hass!.states["binary_sensor.open"] = { state: "on", attributes: { friendly_name: "Open" } };
    cardHost.hass!.states["binary_sensor.closed"] = { state: "off", attributes: { friendly_name: "Closed" } };
    render(renderClimateCard(cardHost, "climate.office"), container);
    const summary = container.querySelector(".climate-card-window-summary");
    expect(summary?.querySelector(".open")).not.toBeNull();
    expect(summary?.querySelector(".separator")).not.toBeNull();
    expect(summary?.querySelector(".closed")).not.toBeNull();
  });

  it("omits empty grouped window state counts", () => {
    const container = document.createElement("div");
    const cardHost = host();
    cardHost._config.climate_window_entities = ["binary_sensor.open"];
    cardHost.hass!.states["binary_sensor.open"] = { state: "on", attributes: { friendly_name: "Open" } };
    render(renderClimateCard(cardHost, "climate.office"), container);

    const windows = container.querySelector(".climate-card-context-item.windows");
    expect(windows?.querySelector(".open")).not.toBeNull();
    expect(windows?.querySelector(".closed")).toBeNull();
    expect(windows?.querySelector(".separator")).toBeNull();
    expect(windows?.textContent).not.toContain("climateCardWindowsUnavailable");
  });

  it("keeps device readings but removes local-only features and actions for external execution", () => {
    const container = document.createElement("div");
    render(renderClimateCard(host(true), "climate.office"), container);
    expect(container.textContent).toContain("Demo controller");
    expect(container.querySelector(".climate-card-actions")).toBeNull();
    expect(container.querySelector(".climate-card-current")).not.toBeNull();
    expect(container.querySelector(".climate-card-features")).toBeNull();
  });

  it("does not expose climate actions while the entity is unavailable", () => {
    const container = document.createElement("div");
    const unavailable = host() as VelairViewHost & { hass: { states: Record<string, { state: string }> } };
    unavailable.hass.states["climate.office"].state = "unavailable";
    render(renderClimateCard(unavailable, "climate.office"), container);
    expect(container.querySelector(".climate-card-actions")).toBeNull();
    expect(container.querySelector("ha-icon.unavailable")).not.toBeNull();
  });

  it("accepts the default 60-minute duration in Pause and Boost forms", () => {
    const pauseContainer = document.createElement("div");
    const pauseHost = host();
    pauseHost._climateCardPause = {
      entityId: "climate.office",
      indefinite: false,
      durationMinutes: 60,
      action: "none",
    };
    render(renderClimateCard(pauseHost, "climate.office"), pauseContainer);
    const pauseDuration = pauseContainer.querySelector<HTMLInputElement>(".climate-card-pause-form input[max='10080']");
    expect(pauseDuration?.step).toBe("1");
    expect(pauseDuration?.value).toBe("60");
    expect(pauseDuration?.checkValidity()).toBe(true);
    expect(pauseContainer.querySelector(".climate-card-control-surface")).toBeNull();
    expect(pauseContainer.querySelector(".climate-card-actions .pause")?.getAttribute("aria-pressed")).toBe("true");

    const boostContainer = document.createElement("div");
    const boostHost = host();
    boostHost._climateCardBoost = {
      entityId: "climate.office",
      durationMinutes: 60,
      targetKind: "single",
      target: 21,
    };
    render(renderClimateCard(boostHost, "climate.office"), boostContainer);
    const boostDuration = boostContainer.querySelector<HTMLInputElement>(".climate-card-boost-form input[max='10080']");
    expect(boostDuration?.step).toBe("1");
    expect(boostDuration?.value).toBe("60");
    expect(boostDuration?.checkValidity()).toBe(true);
    expect(boostContainer.querySelector(".climate-card-control-surface")).toBeNull();
    expect(boostContainer.querySelector(".climate-card-actions .boost")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("uses Home Assistant theme variables and respects reduced motion", () => {
    expect(climateCardStyles.cssText).toContain("var(--card-background-color)");
    expect(climateCardStyles.cssText).toContain("var(--primary-text-color)");
    expect(climateCardStyles.cssText).toContain("var(--secondary-text-color)");
    expect(climateCardStyles.cssText).toContain(".overview-timeline-scroll.climate-card-timeline-scroll { align-self: center; border: 0; border-radius: 0; margin: 0; min-width: 0; padding: 0; scrollbar-gutter: auto; }");
    expect(climateCardStyles.cssText).toContain(".climate-card-timeline-grid { align-items: center; display: grid; gap: 7px 12px");
    expect(climateCardStyles.cssText).toContain(".climate-card-timeline-meta { align-content: center; display: grid; gap: 6px");
    expect(climateCardStyles.cssText).toContain(".climate-card-timeline .climate-card-context-chip");
    expect(climateCardStyles.cssText).toContain(".overview-timeline-layout.climate-card-timeline-layout { --overview-timeline-name-column: 0px; --overview-timeline-sticky-left: 12px; grid-template-columns: minmax(0, 1fr)");
    expect(climateCardStyles.cssText).toContain(".overview-timeline-layout.climate-card-timeline-layout { --overview-timeline-name-column: 0px; --overview-timeline-sticky-left: 12px; grid-template-columns: minmax(640px, 1fr)");
    expect(climateCardStyles.cssText).toContain("color-mix(in srgb");
    expect(climateCardStyles.cssText).toContain("--comfort-primary-accent");
    expect(climateCardStyles.cssText).toContain("--comfort-secondary-accent");
    expect(climateCardStyles.cssText).toContain("linear-gradient(135deg, color-mix(in srgb, var(--comfort-primary-accent)");
    expect(climateCardStyles.cssText).toContain(".climate-card-comfort::before { background: linear-gradient(to bottom, var(--comfort-primary-accent), var(--comfort-secondary-accent))");
    expect(climateCardStyles.cssText).toContain(".climate-card-current-collapsed-comfort-row::before { background: linear-gradient(to bottom, var(--comfort-primary-accent), var(--comfort-secondary-accent))");
    expect(climateCardStyles.cssText).not.toContain("border-left: 4px solid var(--comfort-primary-accent)");
    expect(climateCardStyles.cssText).toContain("container: climate-card / inline-size");
    expect(climateCardStyles.cssText).toContain("@container climate-card (max-width: 380px)");
    expect(climateCardStyles.cssText).toContain("grid-template-rows: repeat(2, auto)");
    expect(climateCardStyles.cssText).not.toContain(".climate-card-brand-copy strong { display: none; }");
    expect(climateCardStyles.cssText).toContain(".climate-card-mode-control:not([data-disabled]) summary { background: color-mix");
    expect(climateCardStyles.cssText).toContain(".climate-card-mode-control:not([data-disabled]) summary:hover");
    expect(climateCardStyles.cssText).toContain(".climate-card-mode-control[open]:not([data-disabled]) summary");
    expect(climateCardStyles.cssText).toContain("min-height: 44px; min-width: 44px");
    expect(climateCardStyles.cssText).toContain("prefers-reduced-motion: reduce");
    expect(climateCardStyles.cssText).toContain("climate-action-unavailable .climate-card-state-line");
    expect(climateCardStyles.cssText).toContain("repeating-linear-gradient");
    expect(climateCardStyles.cssText).toContain("climate-action-idle.climate-mode-heat");
    expect(climateCardStyles.cssText).toContain(".climate-card-actions-row");
    expect(climateCardStyles.cssText).toContain("grid-template-columns: max-content minmax(0, 1fr)");
    expect(climateCardStyles.cssText).toContain("grid-column: 2; justify-self: end");
    expect(climateCardStyles.cssText).toContain("not(.has-authority) .climate-card-actions { grid-column: 1");
    expect(climateCardStyles.cssText).toContain("flex-wrap: nowrap");
    expect(climateCardStyles.cssText).toContain("overflow-x: auto");
    expect(climateCardStyles.cssText).toContain("touch-action: pan-x");
    expect(climateCardStyles.cssText).toContain("scrollbar-width: none");
    expect(climateCardStyles.cssText).toContain(".climate-card-actions-scroll-button.scroll-previous");
    expect(climateCardStyles.cssText).toContain(".climate-card-actions-scroll-button.scroll-next");
    expect(climateCardStyles.cssText).toContain(".climate-card-actions-scroll { align-items: center; display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; overflow: hidden; position: relative; }");
    expect(climateCardStyles.cssText).toContain(".climate-card-actions-scroll:not(.has-overflow) .climate-card-actions-scroll-button { display: none");
    expect(climateCardStyles.cssText).toContain(".climate-card-actions .climate-card-actions-scroll-button:disabled { opacity: 0; pointer-events: none; transform: translateY(-50%) scale(.78) !important; visibility: hidden");
    expect(climateCardStyles.cssText).not.toContain(".climate-card-actions-scroll-button.next");
    expect(climateCardStyles.cssText).toContain("--climate-card-toolbar-island-height: 46px");
    expect(climateCardStyles.cssText).toContain("align-content: center; align-self: stretch");
    expect(climateCardStyles.cssText).toContain("button.panel-open .panel-close");
    expect(climateCardStyles.cssText).toContain("flex-basis 160ms ease");
    expect(climateCardStyles.cssText).toContain(".climate-card-action-icon-stack ha-icon");
    expect(climateCardStyles.cssText).toContain("transition: opacity 140ms ease, transform 180ms ease");
    expect(climateCardStyles.cssText).toContain("linear-gradient(to top, var(--divider-color)");
    expect(climateCardStyles.cssText).toContain(".climate-card-actions-row > button { flex: 0 0 auto; min-width: max-content");
    expect(climateCardStyles.cssText).toContain("button.icon-only");
    expect(climateCardStyles.cssText).toContain(".climate-card-actions-row > button > span:not(.climate-card-action-icon-stack) { white-space: nowrap");
    expect(climateCardStyles.cssText).not.toContain(".climate-card-actions-row > button { flex: 0 0 auto; max-width:");
    expect(climateCardStyles.cssText).toContain(".climate-card-actions-menu::backdrop");
    expect(climateCardStyles.cssText).toContain("backdrop-filter: blur(1.5px) saturate(.72)");
    expect(climateCardStyles.cssText).toContain("var(--primary-background-color) 24%, transparent");
    expect(climateCardStyles.cssText).toContain(".climate-card-mode-options button");
    expect(climateCardStyles.cssText).toContain("grid-template-columns: minmax(88px, 1fr) auto 56px");
    expect(climateCardStyles.cssText).toContain(".climate-card-target-stepper");
    expect(climateCardStyles.cssText).toContain(".climate-card-manual-segmented");
    expect(climateCardStyles.cssText).toContain('.climate-card-manual-segmented[aria-busy="true"] button[aria-disabled="true"] { cursor: wait; opacity: 1');
    expect(climateCardStyles.cssText).toContain(".climate-card-current-summary-item");
    expect(climateCardStyles.cssText).toContain("box-sizing: border-box; color: var(--primary-text-color); display: inline-flex; flex: 0 0 auto; gap: 6px");
    expect(climateCardStyles.cssText).toContain(".climate-card-context-item.with-history { grid-template-columns: 31px minmax(0, 1fr) 30px; }");
    expect(climateCardStyles.cssText).toContain("grid-template-columns: max-content minmax(0, 1fr) 30px");
    expect(climateCardStyles.cssText).toContain(".climate-card-current-summary { align-items: center; display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-start; min-height: 30px");
    expect(climateCardStyles.cssText).toContain(".climate-card-current-summary-wrap { display: grid; grid-column: 2; grid-row: 1");
    expect(climateCardStyles.cssText).toContain(".climate-card-current-heading h3 { grid-column: 1; grid-row: 1");
    expect(climateCardStyles.cssText).toContain(".climate-card-view { box-sizing: border-box; padding: 4px");
    expect(climateCardStyles.cssText).toContain(".climate-card-manual-control { align-items: center; align-self: stretch;");
    expect(climateCardStyles.cssText).toContain("min-width: 0; padding: 7px; }");
    expect(climateCardStyles.cssText).not.toContain(".climate-card-current-scroll-button");
    expect(climateCardStyles.cssText).toContain("grid-template-rows: 0fr; opacity: 0");
    expect(climateCardStyles.cssText).toContain(".climate-card-feature-heading-content { display: grid; gap: 4px");
    expect(climateCardStyles.cssText).toContain(".climate-card-feature-title-row { align-items: center; display: flex");
    expect(climateCardStyles.cssText).toContain(".climate-card-feature-heading.static { cursor: default");
    expect(climateCardStyles.cssText).toContain(".climate-card-timeline .climate-card-context-chip");
    expect(climateCardStyles.cssText).toContain("height: 22px");
    expect(climateCardStyles.cssText).toContain("flex: 0 0 16px; height: 16px; justify-content: center; line-height: 1; width: 16px");
    expect(climateCardStyles.cssText).toContain("gap: 4px; line-height: 16px; min-width: 0");
    expect(climateCardStyles.cssText).toContain("grid-column: 1; grid-row: 1");
    expect(climateCardStyles.cssText).not.toContain(".climate-card-control-bridge");
    expect(climateCardStyles.cssText).toContain(".climate-card-control-toolbar");
    expect(climateCardStyles.cssText).toContain("border-radius: 11px 11px 0 0");
    expect(climateCardStyles.cssText).toContain("font-size: 10px");
    expect(climateCardStyles.cssText).toContain("border-radius: 0 11px 11px 0");
  });
});
