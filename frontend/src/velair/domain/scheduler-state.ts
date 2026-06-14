import type { ScheduleResponse } from "../types";
import { dateMs } from "./schedule-events";

type SchedulerGlobalState = Pick<ScheduleResponse["global"], "paused_started_at" | "paused_until"> | undefined;

export function pauseExpirationMs(global: SchedulerGlobalState): number | undefined {
  return dateMs(global?.paused_until);
}

export function pauseStartedAtMs(global: SchedulerGlobalState): number | undefined {
  return dateMs(global?.paused_started_at);
}

export function pauseProgressPercent(startedAt: number | undefined, expiresAt: number, now = Date.now()): number {
  if (!startedAt || startedAt >= expiresAt) {
    return 100;
  }

  const total = Math.max(1, expiresAt - startedAt);
  const remaining = Math.max(0, expiresAt - now);
  return Math.min(100, Math.max(0, (remaining / total) * 100));
}

export function countdownTickDelay(expiresAt: number, now = Date.now()): number {
  return expiresAt - now <= 90_000 ? 500 : 10_000;
}

export function nextCountdownExpirationMs(
  global: SchedulerGlobalState,
  activeOverrides: ScheduleResponse["active_overrides"] | undefined,
  now = Date.now(),
): number | undefined {
  const timestamps = [
    pauseExpirationMs(global),
    ...Object.values(activeOverrides ?? {}).map((override) => dateMs(override.until)),
  ].filter((value): value is number => typeof value === "number" && value > now);

  return timestamps.length ? Math.min(...timestamps) : undefined;
}
