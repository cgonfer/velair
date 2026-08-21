import { describe, expect, it } from "vitest";

import { preconditioningSettings } from "../../src/velair/domain/preconditioning";

describe("preconditioning settings", () => {
  it("uses native Room Assist deadband defaults", () => {
    expect(preconditioningSettings(undefined, "°C").room_sensor_assist_deadband)
      .toBe(0.3);
    expect(preconditioningSettings(undefined, "°F").room_sensor_assist_deadband)
      .toBe(1);
  });

  it("falls back to the legacy minimum delta only when deadband is absent", () => {
    expect(preconditioningSettings(
      { minimum_delta_temperature: 0.7 },
      "°C",
    ).room_sensor_assist_deadband).toBe(0.7);
    expect(preconditioningSettings(
      {
        minimum_delta_temperature: 0.7,
        room_sensor_assist_deadband: 0,
      },
      "°C",
    ).room_sensor_assist_deadband).toBe(0);
  });
});
