import { describe, expect, it } from "vitest";

import {
  absoluteTemperatureBounds,
  convertAbsoluteTemperature,
  convertTemperatureDelta,
  defaultMinimumDelta,
  defaultMinutesPerDegree,
  defaultRoomAssistDelta,
  defaultTargetTemperature,
  minutesPerDegreeBounds,
  temperatureDeltaMaximum,
  temperatureDeltaMinimum,
} from "../../src/velair/domain/temperature-units";

describe("temperature unit defaults", () => {
  it("provides physically equivalent Fahrenheit defaults", () => {
    expect(defaultTargetTemperature("°F")).toBe(70);
    expect(defaultMinimumDelta("°F")).toBe(1);
    expect(defaultRoomAssistDelta("°F")).toBe(4);
    expect(defaultMinutesPerDegree("°F")).toBe(14);
    expect(temperatureDeltaMaximum("°F", 5)).toBe(9);
    expect(temperatureDeltaMinimum("°F", 0.1)).toBeCloseTo(0.18);
    expect(minutesPerDegreeBounds("°F")).toEqual([0.6, 66.7]);
    expect((defaultMinutesPerDegree("°F") - 0.6) / 0.1).toBeCloseTo(134);
    expect(absoluteTemperatureBounds("°F")).toEqual([-58, 212]);
  });

  it("converts absolute sensor readings in both directions without treating deltas as absolutes", () => {
    expect(convertAbsoluteTemperature(10, "°C", "°F")).toBe(50);
    expect(convertAbsoluteTemperature(68, "F", "C")).toBe(20);
    expect(convertAbsoluteTemperature(12.5, "°C", "C")).toBe(12.5);
    expect(convertAbsoluteTemperature(12.5, undefined, "°F")).toBe(12.5);
  });

  it("converts temperature deltas without applying an absolute-temperature offset", () => {
    expect(convertTemperatureDelta(0.5, "°C", "°F")).toBeCloseTo(0.9);
    expect(convertTemperatureDelta(1, "°F", "°C")).toBeCloseTo(5 / 9);
    expect(convertTemperatureDelta(0.5, "°C", "C")).toBe(0.5);
    expect(convertTemperatureDelta(0.5, undefined, "°F")).toBe(0.5);
  });
});
