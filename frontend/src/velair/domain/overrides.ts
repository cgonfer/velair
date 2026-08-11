import { dateMs } from "./schedule-events";

export function isActiveBoostOverride(
  override: Record<string, unknown> | null | undefined,
  nowMs = Date.now(),
): override is Record<string, unknown> {
  if (!override || override.type !== "boost") {
    return false;
  }

  const temperature = Number(override.temperature);
  const low = Number(override.target_temp_low);
  const high = Number(override.target_temp_high);
  const untilMs = dateMs(override.until);
  const hasTarget = Number.isFinite(temperature)
    || (Number.isFinite(low) && Number.isFinite(high) && low <= high);
  return hasTarget && Boolean(untilMs && untilMs > nowMs);
}

export function isActivePauseOverride(
  override: Record<string, unknown> | null | undefined,
  nowMs = Date.now(),
): override is Record<string, unknown> {
  if (!override || override.type !== "pause") {
    return false;
  }

  const untilMs = dateMs(override.until);
  if (Object.prototype.hasOwnProperty.call(override, "until") && untilMs === undefined) {
    return false;
  }
  return untilMs === undefined || untilMs > nowMs;
}
