import type { RoomSensorAssistStatus } from "../types";

export type RoomAssistTemperatureRange = {
  low: number;
  high: number;
};

export function signedAssistDelta(delta: number, direction?: RoomSensorAssistStatus["direction"]): number {
  return direction === "cool" ? -Math.abs(delta) : Math.abs(delta);
}

export function appliedAssistOffset(status: RoomSensorAssistStatus): number | undefined {
  if (typeof status.applied_offset === "number" && Number.isFinite(status.applied_offset)) {
    return status.applied_offset;
  }
  if (typeof status.assist_delta === "number" && Number.isFinite(status.assist_delta)) {
    return signedAssistDelta(status.assist_delta, status.direction);
  }
  return undefined;
}

export function scheduledAssistRange(status: RoomSensorAssistStatus): RoomAssistTemperatureRange | undefined {
  return completeRange(status.target_temp_low, status.target_temp_high);
}

export function appliedAssistRange(status: RoomSensorAssistStatus): RoomAssistTemperatureRange | undefined {
  const applied = completeRange(status.applied_target_temp_low, status.applied_target_temp_high);
  const reported = completeRange(status.climate_target_temp_low, status.climate_target_temp_high);
  return status.status === "assisting" || status.status === "holding"
    ? applied ?? reported
    : reported ?? applied;
}

export function roomAssistRangeShift(status: RoomSensorAssistStatus): number | undefined {
  return finiteNumber(status.range_shift);
}

export function hasRoomAssistScheduledTarget(status: RoomSensorAssistStatus): boolean {
  return finiteNumber(status.target_temperature) !== undefined
    || scheduledAssistRange(status) !== undefined;
}

function completeRange(low: unknown, high: unknown): RoomAssistTemperatureRange | undefined {
  const numericLow = finiteNumber(low);
  const numericHigh = finiteNumber(high);
  return numericLow !== undefined && numericHigh !== undefined
    ? { low: numericLow, high: numericHigh }
    : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
