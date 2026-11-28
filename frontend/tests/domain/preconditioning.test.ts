import { describe, expect, it } from "vitest";

import { preconditioningMasterCandidates, preconditioningSettings, preconditioningOffsetBounds } from "../../src/velair/domain/preconditioning";
import type { ScheduleResponse } from "../../src/velair/types";

describe("preconditioning settings", () => {
  it("defaults minimum control margin to zero and retains saved native values", () => {
    expect(preconditioningSettings().room_sensor_assist_minimum_margin).toBe(0);
    expect(preconditioningSettings(undefined, "°F").room_sensor_assist_minimum_margin).toBe(0);
    expect(preconditioningSettings({ room_sensor_assist_minimum_margin: 18 }, "°F").room_sensor_assist_minimum_margin).toBe(18);
  });
  it("defaults missing braking to the existing regulation and retains saved levels", () => {
    expect(preconditioningSettings().room_sensor_assist_braking_level).toBe("default");
    expect(preconditioningSettings({ room_sensor_assist_braking_level: "high" }).room_sensor_assist_braking_level).toBe("high");
  });
  it("preserves optional saved relations and excludes self, dependent and external masters", () => {
    expect(preconditioningSettings().master_entity_id).toBeNull();
    expect(preconditioningSettings({ master_entity_id: "climate.missing" }).master_entity_id).toBe("climate.missing");
    const data = { configured_entities: ["climate.room", "climate.root", "climate.child", "climate.external"], zones: {
      "climate.room": {}, "climate.root": {},
      "climate.child": { preconditioning: { master_entity_id: "climate.root" } },
      "climate.external": { execution: { type: "external" } },
    } } as unknown as ScheduleResponse;
    expect(preconditioningMasterCandidates(data, "climate.room")).toEqual(["climate.root"]);
    expect(preconditioningMasterCandidates(data, "climate.root")).toEqual([]);
  });
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

describe("preconditioning offset grid", () => {
  it("defaults independently to zero and retains stored requests when a device step changes", () => {
    expect(preconditioningSettings().heating_setpoint_offset).toBe(0);
    expect(preconditioningSettings().cooling_setpoint_offset).toBe(0);
    expect(preconditioningSettings({ heating_setpoint_offset: 0.3 }).heating_setpoint_offset).toBe(0.3);
  });
  it("floors the maximum to the device delta grid without an absolute temperature anchor", () => {
    expect(preconditioningOffsetBounds(0.3, 5)).toEqual({ step: 0.3, maximum: 4.8 });
    expect(preconditioningOffsetBounds(2, 9)).toEqual({ step: 2, maximum: 8 });
    expect(preconditioningOffsetBounds(10, 5)).toEqual({ step: 10, maximum: 0 });
  });
});
