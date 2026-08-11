import { describe, expect, it } from "vitest";

import {
  appliedAssistOffset,
  appliedAssistRange,
  hasRoomAssistScheduledTarget,
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
