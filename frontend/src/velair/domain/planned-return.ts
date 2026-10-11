import { WEEKDAYS } from "../constants";
import type { PlannedReturnConfig, PlannedReturnStatus } from "../types";

type LegacyPlannedReturnConfig = Omit<PlannedReturnConfig, "occupancy_entity_ids"> & { occupancy_entity_id: string | null };
export function plannedReturnDraft(config?: PlannedReturnConfig | LegacyPlannedReturnConfig): PlannedReturnConfig {
  return {
    enabled: config?.enabled ?? false,
    occupancy_entity_ids: config && "occupancy_entity_ids" in config
      ? [...config.occupancy_entity_ids]
      : config?.occupancy_entity_id ? [config.occupancy_entity_id] : [],
    away_mode_id: config?.away_mode_id ?? "default",
    destination_mode_id: config?.destination_mode_id ?? "default",
    absence_delay_minutes: config?.absence_delay_minutes ?? 10,
    weekly: Object.fromEntries(WEEKDAYS.map((day) => [day, config?.weekly[day] ?? null])),
  };
}

/** HTML datetime-local values describe the HA wall clock, never the browser clock. */
export function returnWallTime(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function returnWallTimeToIso(wallTime: string, timeZone: string, after?: number): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wallTime)) return undefined;
  const nominal = Date.parse(`${wallTime}Z`);
  if (!Number.isFinite(nominal)) return undefined;
  // Read the offset near the requested date, then verify candidates across DST changes.
  const represented = Date.parse(`${returnWallTime(new Date(nominal).toISOString(), timeZone)}Z`);
  const candidate = nominal - (represented - nominal);
  for (let offset = -180; offset <= 180; offset += 15) {
    const iso = new Date(candidate + offset * 60_000).toISOString();
    if (returnWallTime(iso, timeZone) === wallTime && (after === undefined || Date.parse(iso) > after)) return iso;
  }
  return undefined;
}

/** Backend authority wins; fallback only supports older test/preview fixtures. */
export function plannedReturnEpisodeActive(status: PlannedReturnStatus): boolean {
  return status.episode_active ?? (!status.dismissed && ["armed", "confirming_absence", "away", "preparing"].includes(status.state));
}
