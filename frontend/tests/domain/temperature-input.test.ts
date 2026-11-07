import { describe, expect, it } from "vitest";
import { parseTemperatureInput, stepTemperatureInput } from "../../src/velair/domain/temperature-input";

describe("temperature text input", () => {
  it.each(["19.5", "19,5", " 19,5 "])("parses a complete decimal %s", (value) => {
    expect(parseTemperatureInput(value)).toBe(19.5);
  });
  it.each(["", "19.", "19,", "19,5.2", "19,,5", "1e2", "Infinity", "NaN", undefined])(
    "keeps incomplete or malformed values invalid: %s", (value) => {
      expect(Number.isNaN(parseTemperatureInput(value))).toBe(true);
    },
  );
  it("steps on the device grid and keeps the chosen separator", () => {
    expect(stepTemperatureInput("19,5", 1, 7, 35, 0.5)).toBe("20");
    expect(stepTemperatureInput("20", -1, 7, 35, 0.5)).toBe("19.5");
    expect(stepTemperatureInput("19,4", 1, 0, 20, 0.1)).toBe("19,5");
    expect(stepTemperatureInput("19.5", -1, 0, 20, 0.1)).toBe("19.4");
    expect(stepTemperatureInput("42.3", 1, 41.3, 95, 1)).toBe("43.3");
    expect(stepTemperatureInput("19.3", 1, 7, 35, 0.5)).toBe("19.5");
    expect(stepTemperatureInput("19.3", -1, 7, 35, 0.5)).toBe("19");
    expect(stepTemperatureInput("-0,5", -1, -10, 35, 0.5)).toBe("-1");
  });
  it("respects limits, incomplete drafts, and a maximum off the grid", () => {
    expect(stepTemperatureInput("35", 1, 7, 35, 0.5)).toBeUndefined();
    expect(stepTemperatureInput("7", -1, 7, 35, 0.5)).toBeUndefined();
    expect(stepTemperatureInput("34.5", 1, 7, 34.9, 0.5)).toBeUndefined();
    expect(stepTemperatureInput("19,", 1, 7, 35, 0.5)).toBeUndefined();
    expect(stepTemperatureInput("", -1, 7, 35, 0.5)).toBeUndefined();
    expect(stepTemperatureInput("19", 1, undefined, undefined, undefined)).toBe("20");
    expect(stepTemperatureInput("19.5", 1, undefined, undefined, undefined)).toBe("20.5");
    expect(stepTemperatureInput("19,5", -1, 5, 35, undefined)).toBe("18,5");
  });
});
