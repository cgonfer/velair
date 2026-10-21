import { describe, expect, it } from "vitest";

import { preconditioningMasterCandidates, preconditioningSettings } from "../../src/velair/domain/preconditioning";
import type { ScheduleResponse } from "../../src/velair/types";

describe("preconditioning settings", () => {
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
