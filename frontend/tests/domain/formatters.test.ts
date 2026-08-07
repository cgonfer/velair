import { describe, expect, it } from "vitest";

import { ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../../src/velair/constants";
import {
  dateLocale,
  formatDateTime,
  formatEventAction,
  formatEventMode,
  formatRemaining,
  formatScheduleTime,
  formatTemperature,
} from "../../src/velair/domain/formatters";
import type { ScheduleEvent } from "../../src/velair/types";

const baseEvent: ScheduleEvent = {
  action: ACTION_SET_TEMPERATURE,
  entity_id: "climate.living_room",
  hvac_mode: null,
  start: "08:00",
  temperature: 21,
  weekday: "monday",
  when: "2026-06-08T08:00:00.000Z",
};

describe("formatters", () => {
  it("uses the regional locale for every supported language", () => {
    expect(dateLocale("de")).toBe("de-DE");
    expect(dateLocale("en")).toBe("en");
    expect(dateLocale("es")).toBe("es-ES");
    expect(dateLocale("fr")).toBe("fr-FR");
    expect(dateLocale("nl")).toBe("nl-NL");
    expect(dateLocale("unsupported")).toBe("en");
  });

  it("formats remaining durations without exposing seconds once minutes apply", () => {
    expect(formatRemaining(1_000)).toBe("1 s");
    expect(formatRemaining(60_000)).toBe("1 min");
    expect(formatRemaining(3_900_000)).toBe("1 h 5 min");
  });

  it("formats integer and decimal temperatures with the provided unit", () => {
    expect(formatTemperature(21, "°C")).toBe("21 °C");
    expect(formatTemperature(21.5, "°C")).toBe("21.5 °C");
  });

  it("formats date times using the Home Assistant time preference", () => {
    const value = "2026-06-08T14:45:00";

    expect(formatDateTime(value, "en-US", "12")).toContain("2:45 PM");
    expect(formatDateTime(value, "en-US", "24")).toContain("14:45");
  });

  it("formats schedule times using the Home Assistant time preference", () => {
    expect(formatScheduleTime("14:45", "en-US", "12")).toBe("2:45 PM");
    expect(formatScheduleTime("14:45", "en-US", "24")).toBe("14:45");
    expect(formatScheduleTime("25:00", "en-US", "12")).toBe("25:00");
  });

  it("uses off, temperature, and keep labels for schedule event summaries", () => {
    const labels = { off: "Off", setTemperature: "Set temperature" };
    const keepLabels = { keepMode: "Keep mode" };
    const formatEventTemperature = (value: number) => `${value} °C`;
    const modeLabel = (mode: string) => mode.toUpperCase();

    expect(formatEventAction(baseEvent, labels, formatEventTemperature)).toBe("21 °C");
    expect(formatEventAction({ ...baseEvent, action: ACTION_TURN_OFF, temperature: null }, labels, formatEventTemperature)).toBe("Off");
    expect(formatEventMode(baseEvent, keepLabels, modeLabel)).toBe("Keep mode");
    expect(formatEventMode({ ...baseEvent, hvac_mode: "heat" }, keepLabels, modeLabel)).toBe("HEAT");
    expect(formatEventMode({ ...baseEvent, action: ACTION_TURN_OFF, temperature: null }, keepLabels, modeLabel)).toBe("OFF");
  });
});
