import type { PlannedReturnPreparationZone, PlannedReturnStatus } from "../types";
import { plannedReturnEpisodeActive } from "./planned-return";

export type PreparationState = "waiting" | "preparing" | "reached" | "suspended" | "arrivalOnly" | "unavailable";
export type ArrivalPreparationZone = {
  entityId: string;
  source: PlannedReturnPreparationZone;
  state: PreparationState;
  start?: number;
};
export type ArrivalPreparationSummary = {
  arrival: number;
  zones: ArrivalPreparationZone[];
  counts: Record<PreparationState, number>;
  state: PreparationState | "mixed";
  nextStart?: number;
};

function timestamp(value?: string | null): number | undefined {
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

/** Describe only the backend's current arrival projection, never infer device activity. */
export function currentArrivalPreparation(status?: PlannedReturnStatus | null, now = Date.now()): ArrivalPreparationSummary | undefined {
  if (!status || !Number.isFinite(now) || status.dismissed || !plannedReturnEpisodeActive(status)
    || !["armed", "confirming_absence", "away", "preparing"].includes(status.state)) return undefined;
  const arrival = timestamp(status.return_at);
  const preview = status.preparation;
  if (arrival === undefined || arrival <= now || preview?.context !== "arrival"
    || timestamp(preview.return_at) !== arrival
    || (status.destination_mode_id != null && preview.mode_id !== status.destination_mode_id)) return undefined;
  const counts: ArrivalPreparationSummary["counts"] = { waiting: 0, preparing: 0, reached: 0, suspended: 0, arrivalOnly: 0, unavailable: 0 };
  const zones = preview.zones.map((source): ArrivalPreparationZone => {
    const state: PreparationState = source.state === "suspended" ? "suspended"
      : source.state === "unavailable" || source.preparation === "none" ? "unavailable"
      : source.state === "reached" ? "reached"
      : source.state === "preparing" ? "preparing"
      : source.preparation === "arrival_only" && source.state === "pending" ? "arrivalOnly"
      : source.preparation === "adaptive" && source.state === "pending" ? "waiting" : "unavailable";
    const estimate = timestamp(source.start_at);
    const start = source.preparation === "adaptive" && ["waiting", "preparing"].includes(state)
      && estimate !== undefined && estimate < arrival ? estimate : undefined;
    counts[state]++;
    return { entityId: source.entity_id, source, state, start };
  });
  const upcoming = zones.filter(zone => zone.state === "waiting" && zone.start !== undefined)
    .map(zone => zone.start!);
  const state = counts.preparing ? "preparing" : counts.waiting ? "waiting"
    : zones.length && counts.reached === zones.length ? "reached"
    : zones.length && counts.suspended === zones.length ? "suspended"
    : zones.length && counts.arrivalOnly === zones.length ? "arrivalOnly"
    : !zones.length || counts.unavailable === zones.length ? "unavailable" : "mixed";
  return { arrival, zones, counts, state, nextStart: upcoming.length ? Math.min(...upcoming) : undefined };
}

export function preparationRoom(summary: ArrivalPreparationSummary | undefined, entityId: string): ArrivalPreparationZone | undefined {
  return summary?.zones.find(zone => zone.entityId === entityId);
}
