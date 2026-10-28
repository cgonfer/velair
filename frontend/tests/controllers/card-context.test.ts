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

function groupedData(): ScheduleResponse {
  const schedule = data();
  schedule.control_units = ["group.room"];
  schedule.member_to_unit = { "climate.office": "group.room", "climate.bedroom": "group.room" };
  schedule.room_groups = { "group.room": {
    id: "group.room", name: "Room", members: ["climate.bedroom", "climate.office"],
    temperature_entity_id: "climate.bedroom", delivery_mode: "all",
  } };
  schedule.zones = { "group.room": schedule.zones["climate.office"] };
  const preconditioning = schedule.zones["group.room"].preconditioning!;
  preconditioning.room_sensor_assist_enabled = true;
  preconditioning.room_temperature_entity_id = "sensor.room";
  return schedule;
}

describe("group-filtered Home Assistant updates", () => {
  it.each(["overview", "overview-zones", "overview-timeline", "overview-events", "comfort"])("refreshes %s for a physical group member, without requiring a HA group entity", view => {
    const host = { _data: groupedData(), _config: { view, entities: ["group.room"] } } as any;
    const previous = hass(18);
    expect(shouldUpdateForHass(host, hass(19), previous)).toBe(true);
    expect(shouldUpdateForHass(host, previous, previous)).toBe(false);
    expect(previous.states).not.toHaveProperty("group.room");
  });

  it("keeps an exact physical filter for native member changes", () => {
    const schedule = groupedData();
    schedule.zones["group.room"].preconditioning = undefined;
    const previous = hass(18);
    expect(shouldUpdateForHass({ _data: schedule, _config: { entities: ["climate.bedroom"] } }, hass(19), previous)).toBe(false);
  });

  it.each(["group.room", "climate.office"])("observes shared inputs selected through %s", entityId => {
    const schedule = groupedData();
    const host = { _data: schedule, _config: { entities: [entityId] } };
    const previous = hass(18);
    previous.states!["sensor.room"] = { state: "20" };
    for (const change of [
      (next: HomeAssistant) => { next.states!["climate.bedroom"].attributes!.current_temperature = 21; },
      (next: HomeAssistant) => { next.states!["climate.office"].attributes!.temperature = 22; },
      (next: HomeAssistant) => { next.states!["sensor.room"].state = "21"; },
      (next: HomeAssistant) => { next.states!["sensor.outdoor"].state = "12"; },
    ]) {
      const next = structuredClone(previous);
      change(next);
      expect(preconditioningInputsChanged(host, next, previous)).toBe(true);
      expect(shouldUpdateForHass(host, next, previous)).toBe(true);
    }
    expect(preconditioningInputsChanged(host, previous, previous)).toBe(false);
  });

  it("uses a climate card's selected member to resolve the shared Room Assist sensors", () => {
    const previous = hass(18);
    const next = hass(18, "12");
    expect(preconditioningInputsChanged({ _data: groupedData(), _config: { view: "climate", selected_entity: "climate.office" } }, next, previous)).toBe(true);
  });

  it("preserves ungrouped selection and ignores disabled or unrelated inputs", () => {
    const schedule = data();
    const host = { _data: schedule, _config: { entities: ["climate.bedroom"] } };
    expect(shouldUpdateForHass(host, hass(19, "12"), hass(18))).toBe(false);
    expect(shouldUpdateForHass({ ...host, _config: {} }, hass(19), hass(18))).toBe(true);
  });
});

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
  it("updates enabled household controls for occupancy, other room metadata and HA locale changes", () => {
    const original = hass(18, "10"); original.states!["binary_sensor.home"] = { state: "off", attributes: { friendly_name: "Home" } };
    const value = { _data: { ...data(), planned_return: { occupancy_entity_ids: ["binary_sensor.home"] } }, _config: { view: "climate", selected_entity: "climate.office", climate_actions: [{ type: "planned-return", enabled: true }] } } as any;
    for (const change of [(next: HomeAssistant) => { next.states!["binary_sensor.home"].state = "on"; }, (next: HomeAssistant) => { next.states!["climate.bedroom"].attributes.friendly_name = "Bedroom renamed"; }, (next: HomeAssistant) => { next.language = "es"; },
      (next: HomeAssistant) => { next.connection = {} as never; },
      (next: HomeAssistant) => { next.locale = { ...next.locale, time_format: "24" } as never; },
      (next: HomeAssistant) => { next.states!["climate.bedroom"].attributes.icon = "mdi:bed"; }, (next: HomeAssistant) => { next.config = { ...next.config, time_zone: "Europe/Madrid" } as never; }]) {
      const next = structuredClone(original); change(next); expect(shouldUpdateForHass(value, next, original)).toBe(true);
    }
    value._config.climate_actions[0].enabled = false;
    const next = structuredClone(original); next.states!["binary_sensor.home"].state = "on";
    expect(shouldUpdateForHass(value, next, original)).toBe(false);
  });

});
