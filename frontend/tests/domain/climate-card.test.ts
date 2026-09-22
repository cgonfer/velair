import { describe, expect, it } from "vitest";
import {
  climateCardAction,
  climateCardEntityIds,
  climateCardOwner,
  climateCardWindows,
  comfortAccent,
  numericEntityState,
} from "../../src/velair/domain/climate-card";
import type { ScheduleResponse } from "../../src/velair/types";

function schedule(overrides: Partial<ScheduleResponse> = {}): ScheduleResponse {
  return {
    configured_entities: ["climate.office"],
    temperature_unit: "°C",
    home_assistant_temperature_unit: "°C",
    temperature_migration: { required: false },
    global: { mode: "auto" },
    settings: { first_weekday: "monday", zone_order: [] },
    zones: { "climate.office": { enabled: true, schedule: {} } },
    operational_status: "running",
    next_event: null,
    next_events: [],
    active_overrides: {},
    ...overrides,
  };
}

describe("climate card domain", () => {
  it("derives ownership from Velair data without relying on a sensor entity ID", () => {
    expect(climateCardOwner(schedule(), "climate.office")).toBe("automatic");
    expect(climateCardOwner(schedule({ zone_runtime: { "climate.office": { state: "scheduled", control_mode: "manual" } } }), "climate.office")).toBe("manual");
    expect(climateCardOwner(schedule({ zones: { "climate.office": { enabled: true, schedule: {}, execution: { type: "external", provider: "demo" } } } }), "climate.office")).toBe("external");
  });

  it("watches the selected climate and optional dashboard-only entities", () => {
    expect(climateCardEntityIds({
      view: "climate",
      selected_entity: "climate.office",
      climate_humidity_entity: "sensor.indoor_humidity",
      climate_outdoor_temperature_entity: "sensor.outdoor",
      climate_window_entities: ["binary_sensor.window"],
    }, ["climate.office"]))
      .toEqual(["climate.office", "sensor.indoor_humidity", "sensor.outdoor", "binary_sensor.window"]);

    expect(climateCardEntityIds({
      view: "climate",
      selected_entity: "climate.office",
      climate_humidity_entity: "sensor.indoor_humidity",
      climate_outdoor_temperature_entity: "sensor.outdoor",
      climate_window_entities: ["binary_sensor.window"],
      climate_show_outdoor_temperature: false,
      climate_show_current_humidity: false,
      climate_show_windows: false,
    }, ["climate.office"]))
      .toEqual(["climate.office"]);
  });

  it("watches configured script actions in both current and legacy card configs", () => {
    expect(climateCardEntityIds({
      view: "climate",
      selected_entity: "climate.office",
      climate_actions: [
        { type: "boost" },
        { type: "script", name: "Ventilate", script: "script.ventilate" },
      ],
    }, ["climate.office"])).toEqual(["climate.office", "script.ventilate"]);

    expect(climateCardEntityIds({
      view: "climate",
      selected_entity: "climate.office",
      climate_custom_actions: [
        { name: "Scene", script: "script.scene" },
      ],
    }, ["climate.office"])).toEqual(["climate.office", "script.scene"]);
  });

  it("maps binary sensor states without claiming unavailable windows are closed", () => {
    const hass = { states: {
      "binary_sensor.open": { state: "on", attributes: { friendly_name: "Kitchen" } },
      "binary_sensor.closed": { state: "off" },
      "binary_sensor.unknown": { state: "unknown" },
      "sensor.outdoor": { state: "18.5" },
    } } as never;
    expect(climateCardWindows(hass, ["binary_sensor.open", "binary_sensor.closed", "binary_sensor.unknown"]).map((window) => window.state))
      .toEqual(["open", "closed", "unavailable"]);
    expect(numericEntityState(hass, "sensor.outdoor")).toBe(18.5);
  });

  it("keeps unavailable climate and comfort states explicit", () => {
    expect(climateCardAction({ state: "unavailable" })).toBe("unavailable");
    expect(comfortAccent({ enabled: true, condition: "comfortable", air_quality: "good", data_quality: "complete", data_issues: [] })).toBe("good");
    expect(comfortAccent({ enabled: true, condition: "hot", air_quality: "good", data_quality: "partial", data_issues: [] })).toBe("bad");
    expect(comfortAccent({
      enabled: true,
      condition: "comfortable",
      air_quality: "good",
      data_quality: "complete",
      data_issues: [],
      range_summary: {
        status: "mixed",
        thermal_relation: "mixed",
        positions: { temperature: "within", humidity: "within", humidex: "above" },
      },
    })).toBe("info");
    expect(comfortAccent({
      enabled: true,
      condition: "hot",
      air_quality: "good",
      data_quality: "complete",
      data_issues: [],
      range_summary: {
        status: "outside_range",
        thermal_relation: "aligned",
        positions: { temperature: "above", humidity: "within", humidex: "above" },
      },
    })).toBe("warning");
  });

  it("prioritizes unavailable and off over stale or invalid HVAC actions", () => {
    expect(climateCardAction({ state: "unknown", attributes: { hvac_action: "heating" } })).toBe("unavailable");
    expect(climateCardAction({ state: "off", attributes: { hvac_action: "idle" } })).toBe("off");
    expect(climateCardAction({ state: "cool", attributes: { hvac_action: "invalid" } })).toBe("cool");
    expect(climateCardAction({ state: "heat", attributes: { hvac_action: "idle" } })).toBe("idle");
  });
});
