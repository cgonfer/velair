import { describe, expect, it, vi } from "vitest";

import { ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import {
  activeOverrideEntityIds,
  activeOverrideForEntity,
  activePauseOverrideForEntity,
  boostDetailText,
  climateMode,
  currentTemperature,
  overviewNextEvents,
  pauseDetailText,
} from "../../src/velair/controllers/overview-data";
import type { ScheduleResponse } from "../../src/velair/types";

function host(data?: ScheduleResponse) {
  return {
    hass: {
      states: {
        "climate.office": {
          attributes: { current_temperature: 20.5, hvac_action: "heating", temperature: 21 },
          state: "heat",
        },
      },
    },
    _data: data,
    _formatDateTime: (value: string) => `date:${value}`,
    _formatRemaining: (valueMs: number) => `${Math.ceil(valueMs / 60_000)} min`,
    _formatTemperature: (value: number) => `${value} °C`,
    _hvacActionLabel: (action: string) => action,
    _modeLabel: (mode: string) => mode,
    _orderedZoneIds: (entityIds: string[]) => entityIds,
    _t: (key: string) => key,
  };
}

const baseData = (until: string): ScheduleResponse => ({
  active_overrides: {},
  configured_entities: ["climate.office", "climate.bedroom"],
  global: { mode: "auto" },
  next_event: null,
  next_events: [],
  operational_status: "running",
  settings: { first_weekday: "monday", zone_order: [] },
  zones: {
    "climate.office": {
      enabled: true,
      override: { hvac_mode: "heat", temperature: 23, type: "boost", until },
      schedule: {
        monday: [{ action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 21 }],
        tuesday: [{ action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "09:00", temperature: 19 }],
      } as any,
    },
    "climate.bedroom": {
      enabled: true,
      override: { type: "pause" },
      schedule: { monday: [], tuesday: [] } as any,
    },
  },
});

describe("overview data controller", () => {
  it("finds active boost and pause entities separately", () => {
    const state = host(baseData(new Date(Date.now() + 3_600_000).toISOString()));

    expect(activeOverrideForEntity(state, "climate.office", state._data?.zones["climate.office"])).toMatchObject({ type: "boost" });
    expect(activePauseOverrideForEntity(state, "climate.bedroom", state._data?.zones["climate.bedroom"])).toMatchObject({ type: "pause" });
    expect(activeOverrideEntityIds(state)).toEqual(["climate.office"]);
  });

  it("describes boost and pause details with formatted values", () => {
    vi.setSystemTime(new Date(2026, 5, 8, 10, 0));
    const until = new Date(2026, 5, 8, 11, 30).toISOString();
    const state = host();

    expect(boostDetailText(state, "climate.office", { hvac_mode: "heat", temperature: 23, type: "boost", until })).toBe(
      "23 °C - heat - boostUntil: 90 min",
    );
    expect(pauseDetailText(state, {
      started_at: new Date(2026, 5, 8, 9, 0).toISOString(),
      type: "pause",
      until,
    })).toContain("pauseRemaining: 90 min");
    expect(pauseDetailText(state, { type: "pause" })).toBe("pauseIndefinite");
    vi.useRealTimers();
  });

  it("calculates next events after boost resume and formats current climate state", () => {
    vi.setSystemTime(new Date(2026, 5, 8, 10, 0));
    const until = new Date(2026, 5, 8, 14, 0).toISOString();
    const state = host(baseData(until));

    expect(overviewNextEvents(state)[0]).toMatchObject({
      entity_id: "climate.office",
      start: "08:00",
      temperature: 21,
    });
    expect(currentTemperature(state, "climate.office")).toBe("20.5 °C");
    expect(climateMode(state, "climate.office")).toBe("heat - heating");
    vi.useRealTimers();
  });

  it("uses backend next events when the schedule response provides them", () => {
    const data = baseData(new Date(Date.now() + 3_600_000).toISOString());
    data.next_events = [
      {
        action: ACTION_SET_TEMPERATURE,
        entity_id: "climate.bedroom",
        hvac_mode: "heat",
        start: "22:00",
        temperature: 19,
        weekday: "monday",
        when: "2026-06-15T22:00:00+00:00",
      },
    ];
    const state = host(data);

    expect(overviewNextEvents(state)).toEqual(data.next_events);
  });
});
