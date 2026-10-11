import type { PlannedReturnStatus } from "../types";

/** Only confirmed active episodes have an elapsed-time timeline. */
export function plannedReturnTimeline(status?: PlannedReturnStatus, now = Date.now()) {
  if (!status || status.episode_active === false || !["away", "preparing"].includes(status.state) || status.dismissed
    || !status.departure_at || !status.return_at
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(status.departure_at)
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(status.return_at)) return undefined;
  const departure = Date.parse(status.departure_at);
  const arrival = Date.parse(status.return_at);
  if (!Number.isFinite(departure) || !Number.isFinite(arrival) || arrival <= departure
    || !Number.isFinite(now)) return undefined;
  return { departure, arrival, progress: Math.min(1, Math.max(0, (now - departure) / (arrival - departure))) };
}

/** Show endpoint dates when their Home Assistant calendar dates differ. */
export function plannedReturnTimelineLabels(departure: number, arrival: number, timeZone: string, language: string, hour12?: boolean) {
  const calendar = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const differentDates = calendar.format(new Date(departure)) !== calendar.format(new Date(arrival));
  const formatter = new Intl.DateTimeFormat(language, {
    timeZone, hour: "2-digit", minute: "2-digit", hour12,
    ...(differentDates ? { day: "numeric", month: "short", year: "numeric" } as const : {}),
  });
  return { departure: formatter.format(new Date(departure)), arrival: formatter.format(new Date(arrival)), differentDates };
}

export function plannedReturnDelay(minutes: number): string {
  return minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`;
}

/** Eligible per-room estimates from the backend's current saved-arrival preview. */
export function plannedReturnPreparationEstimates(status: PlannedReturnStatus) {
  const preview = status.preparation;
  const arrival = status.return_at && /(?:Z|[+-]\d{2}:\d{2})$/.test(status.return_at) ? Date.parse(status.return_at) : NaN;
  if (!Number.isFinite(arrival) || preview?.context !== "arrival" || !preview.return_at
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(preview.return_at) || Date.parse(preview.return_at) !== arrival) return [];
  return preview.zones.flatMap((zone) => {
    if (zone.preparation !== "adaptive" || !["pending", "preparing"].includes(zone.state)
      || !zone.start_at || !/(?:Z|[+-]\d{2}:\d{2})$/.test(zone.start_at)) return [];
    const start = Date.parse(zone.start_at);
    return Number.isFinite(start) && start < arrival ? [{ entity_id: zone.entity_id, start }] : [];
  }).sort((a, b) => a.start - b.start || a.entity_id.localeCompare(b.entity_id));
}

/** Advisory first-zone estimate; its position is clamped but its time is preserved. */
export function plannedReturnPreparationMarker(status: PlannedReturnStatus, departure: number, arrival: number) {
  if (!Number.isFinite(departure) || !Number.isFinite(arrival) || arrival <= departure
    || !status.return_at || Date.parse(status.return_at) !== arrival) return undefined;
  const first = plannedReturnPreparationEstimates(status)[0];
  if (!first) return undefined;
  return { start: first.start, progress: Math.min(1, Math.max(0, (first.start - departure) / (arrival - departure))) };
}

/** Describe only a current saved-arrival preview; mixed or missing data is inconclusive. */
export function plannedReturnPreparationSummary(status: PlannedReturnStatus): "none" | "arrival_only" | "reached" | "suspended" | "unknown" {
  const preview = status.preparation;
  if (preview?.context !== "arrival" || !preview.return_at || !status.return_at
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(preview.return_at)
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(status.return_at)
    || !Number.isFinite(Date.parse(preview.return_at))
    || Date.parse(preview.return_at) !== Date.parse(status.return_at) || !preview.zones.length) return "unknown";
  if (preview.zones.every((zone) => zone.preparation !== "none" && zone.state === "suspended")) return "suspended";
  if (preview.zones.every((zone) => zone.preparation !== "none" && zone.state === "reached")) return "reached";
  if (preview.zones.every((zone) => zone.preparation === "none")) return "none";
  if (preview.zones.every((zone) => zone.preparation === "arrival_only")) return "arrival_only";
  return "unknown";
}
