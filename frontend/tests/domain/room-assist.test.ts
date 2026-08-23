import { describe, expect, it } from "vitest";

import {
  appliedAssistOffset,
  appliedAssistRange,
  hasRoomAssistScheduledTarget,
  roomAssistDeadbandZone,
  roomAssistRangeShift,
  scheduledAssistRange,
} from "../../src/velair/domain/room-assist";
import type { RoomSensorAssistStatus } from "../../src/velair/types";

function status(values: Partial<RoomSensorAssistStatus>): RoomSensorAssistStatus {
  return {
    status: "assisting",
    enabled: true,
    configured: true,
    ...values,
  };
}

describe("Room Assist applied offset", () => {
  it.each([
    ["positive", 1.5],
    ["zero", 0],
    ["negative", -2],
  ])("preserves a %s backend offset", (_label, appliedOffset) => {
    expect(appliedAssistOffset(status({
      applied_offset: appliedOffset,
      assist_delta: 9,
      direction: "heat",
    }))).toBe(appliedOffset);
  });

  it("falls back to the legacy delta and direction", () => {
    expect(appliedAssistOffset(status({
      assist_delta: 2,
      direction: "cool",
    }))).toBe(-2);
  });
});

describe("Room Assist range contract", () => {
  it("accepts only complete scheduled and applied ranges", () => {
    const complete = status({
      target_temp_low: 20,
      target_temp_high: 24,
      applied_target_temp_low: 21,
      applied_target_temp_high: 25,
    });
    expect(scheduledAssistRange(complete)).toEqual({ low: 20, high: 24 });
    expect(appliedAssistRange(complete)).toEqual({ low: 21, high: 25 });
    expect(hasRoomAssistScheduledTarget(complete)).toBe(true);

    const incomplete = status({ target_temp_low: 20 });
    expect(scheduledAssistRange(incomplete)).toBeUndefined();
    expect(hasRoomAssistScheduledTarget(incomplete)).toBe(false);
  });

  it("uses the reported climate range when the applied pair is incomplete", () => {
    expect(appliedAssistRange(status({
      applied_target_temp_low: 21,
      climate_target_temp_low: 20.5,
      climate_target_temp_high: 24.5,
    }))).toEqual({ low: 20.5, high: 24.5 });
  });

  it("keeps signed range shift separate from scalar applied_offset", () => {
    const rangeStatus = status({ applied_offset: 4, range_shift: -1.5 });
    expect(roomAssistRangeShift(rangeStatus)).toBe(-1.5);
    expect(appliedAssistOffset(rangeStatus)).toBe(4);
  });
});

describe("Room Assist deadband zone", () => {
  it("prefers the backend runtime bounds for an active hysteresis cycle", () => {
    expect(roomAssistDeadbandZone(status({
      target_temperature: 21,
      deadband_low: 20.6,
      deadband_high: 21.4,
    }), 0.3)).toEqual({ low: 20.6, high: 21.4 });
  });

  it("expands equally around a scalar scheduled target", () => {
    expect(roomAssistDeadbandZone(status({ target_temperature: 21 }), 0.3))
      .toEqual({ low: 20.7, high: 21.3 });
  });

  it("expands beyond both boundaries of a native range", () => {
    expect(roomAssistDeadbandZone(status({
      target_temp_low: 20,
      target_temp_high: 24,
    }), 0.5)).toEqual({ low: 19.5, high: 24.5 });
  });

  it("preserves a zero-width zone and rejects unusable values", () => {
    const scalar = status({ target_temperature: 21 });
    expect(roomAssistDeadbandZone(scalar, 0)).toEqual({ low: 21, high: 21 });
    expect(roomAssistDeadbandZone(scalar, -0.1)).toBeUndefined();
    expect(roomAssistDeadbandZone(scalar, Number.NaN)).toBeUndefined();
    expect(roomAssistDeadbandZone(status({}), 0.3)).toBeUndefined();
  });
});
