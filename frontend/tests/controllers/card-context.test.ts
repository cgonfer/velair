import { describe, expect, it } from "vitest";

import { effectiveView, preconditioningInputsChanged, shouldUpdateForHass } from "../../src/velair/controllers/card-context";
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
        attributes: { current_temperature: currentTemperature, temperature: 21 },
      },
      "climate.bedroom": {
        state: "heat",
        attributes: { current_temperature: 20, temperature: 21 },
      },
      "sensor.outdoor": { state: outdoorTemperature },
    },
  };
}

describe("preconditioning input changes", () => {
  it("normalizes the legacy Profiles view to Modes", () => {
    expect(effectiveView("profiles", "overview-status")).toBe("modes");
    expect(effectiveView(null, "overview-status", "profiles")).toBe("modes");
  });

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

  it("detects climate target changes while Room Sensor Assist is enabled", () => {
    const schedule = data();
    schedule.zones["climate.office"].preconditioning!.enabled = false;
    schedule.zones["climate.office"].preconditioning!.room_sensor_assist_enabled = true;
    schedule.zones["climate.office"].preconditioning!.room_temperature_entity_id =
      "sensor.office_room";
    const oldHass = hass(18);
    const nextHass = hass(18);
    nextHass.states!["climate.office"].attributes!.temperature = 22;

    expect(
      preconditioningInputsChanged(
        { _data: schedule, _config: {} },
        nextHass,
        oldHass,
      ),
    ).toBe(true);
  });
});

describe("climate card Home Assistant updates", () => {
  it("updates for optional outdoor and window sensors but ignores unrelated entities", () => {
    const oldHass = hass(18, "10");
    oldHass.states!["binary_sensor.window"] = { state: "off" };
    oldHass.states!["sensor.unrelated"] = { state: "1" };
    const nextHass = structuredClone(oldHass);
    nextHass.states!["binary_sensor.window"].state = "on";
    expect(shouldUpdateForHass({
      _data: data(),
      _config: { view: "climate", selected_entity: "climate.office", climate_window_entities: ["binary_sensor.window"] },
    }, nextHass, oldHass)).toBe(true);

    nextHass.states!["binary_sensor.window"].state = "off";
    nextHass.states!["sensor.unrelated"].state = "2";
    expect(shouldUpdateForHass({
      _data: data(),
      _config: { view: "climate", selected_entity: "climate.office", climate_window_entities: ["binary_sensor.window"] },
    }, nextHass, oldHass)).toBe(false);
  });

  it.each([
    ["current", { climate_actions: [{ type: "script", name: "Ventilate", script: "script.ventilate" }] }],
    ["legacy", { climate_custom_actions: [{ name: "Ventilate", script: "script.ventilate" }] }],
  ])("updates when a %s configured script becomes unavailable or available", (_label, actionConfig) => {
    const available = hass(18, "10");
    available.states!["script.ventilate"] = { state: "off", attributes: { friendly_name: "Ventilate" } };
    const unavailable = structuredClone(available);
    unavailable.states!["script.ventilate"].state = "unavailable";
    const host = {
      _data: data(),
      _config: {
        view: "climate",
        selected_entity: "climate.office",
        ...actionConfig,
      },
    } as any;

    expect(shouldUpdateForHass(host, unavailable, available)).toBe(true);
    expect(shouldUpdateForHass(host, available, unavailable)).toBe(true);

    const missing = structuredClone(available);
    delete missing.states!["script.ventilate"];
    expect(shouldUpdateForHass(host, available, missing)).toBe(true);

    const running = structuredClone(available);
    running.states!["script.ventilate"].state = "on";
    expect(shouldUpdateForHass(host, running, available)).toBe(false);
  });
});
