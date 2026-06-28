import { describe, expect, it } from "vitest";

import { preconditioningInputsChanged } from "../../src/velair/controllers/card-context";
import type { HomeAssistant, ScheduleResponse } from "../../src/velair/types";

function data(): ScheduleResponse {
  return {
    active_overrides: {},
    configured_entities: ["climate.office", "climate.bedroom"],
    global: { mode: "auto" },
    next_event: null,
    next_events: [],
    operational_status: "running",
    preconditioning_learning: {},
    settings: { first_weekday: "monday", zone_order: [] },
    templates: [],
    versions: { export_format: "1", integration: "test", model: 1, portable_model: 1, storage: 1 },
    zones: {
      "climate.office": {
        enabled: true,
        preconditioning: {
          adaptive_percentile_enabled: true,
          comfort_percentile: 80,
          enabled: true,
          fallback_minutes_per_degree: 25,
          learning_history_size: 120,
          max_lead_minutes: 1440,
          min_start_minutes: 5,
          minimum_delta_temperature: 0.3,
          outdoor_temperature_entity_id: "sensor.outdoor",
          partial_expiry_days: 30,
          recency_decay_days: 30,
          similar_sample_count: 25,
          use_outdoor_temperature: true,
        },
        schedule: {},
      },
      "climate.bedroom": {
        enabled: true,
        preconditioning: {
          adaptive_percentile_enabled: true,
          comfort_percentile: 80,
          enabled: true,
          fallback_minutes_per_degree: 25,
          learning_history_size: 120,
          max_lead_minutes: 1440,
          min_start_minutes: 5,
          minimum_delta_temperature: 0.3,
          outdoor_temperature_entity_id: null,
          partial_expiry_days: 30,
          recency_decay_days: 30,
          similar_sample_count: 25,
          use_outdoor_temperature: false,
        },
        schedule: {},
      },
    },
  };
}

function hass(currentTemperature: number, outdoorTemperature = "10"): HomeAssistant {
  return {
    connection: {} as HomeAssistant["connection"],
    states: {
      "climate.office": {
        state: "heat",
        attributes: { current_temperature: currentTemperature },
      },
      "climate.bedroom": {
        state: "heat",
        attributes: { current_temperature: 20 },
      },
      "sensor.outdoor": { state: outdoorTemperature },
    },
  };
}

describe("preconditioning input changes", () => {
  it("detects managed climate temperature changes", () => {
    expect(preconditioningInputsChanged({ _data: data(), _config: {} }, hass(19), hass(18))).toBe(true);
  });

  it("detects configured outdoor temperature changes", () => {
    expect(preconditioningInputsChanged({ _data: data(), _config: {} }, hass(18, "12"), hass(18, "10"))).toBe(true);
  });

  it("ignores inputs when preconditioning is disabled", () => {
    const schedule = data();
    schedule.zones["climate.office"].preconditioning!.enabled = false;
    expect(preconditioningInputsChanged({ _data: schedule, _config: {} }, hass(19), hass(18))).toBe(false);
  });

  it("ignores preconditioning changes from thermostats hidden in this Lovelace card", () => {
    const oldHass = hass(18);
    const nextHass = hass(18);
    nextHass.states!["climate.bedroom"].attributes!.current_temperature = 21;

    expect(
      preconditioningInputsChanged(
        { _data: data(), _config: { entities: ["climate.office"] } },
        nextHass,
        oldHass,
      ),
    ).toBe(false);
  });
});
