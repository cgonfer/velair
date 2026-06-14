import { dateMs } from "./schedule-events";

export function isActiveBoostOverride(
  override: Record<string, unknown> | null | undefined,
  nowMs = Date.now(),
): override is Record<string, unknown> {
  if (!override || override.type !== "boost") {
    return false;
  }

  const temperature = Number(override.temperature);
  const untilMs = dateMs(override.until);
  return Number.isFinite(temperature) && Boolean(untilMs && untilMs > nowMs);
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
