import type { DraftScheduleBlock, ScheduleResponse, TargetRangePolicyDestination } from "../types";

export type TargetRangeReviewDay = {
  destination: TargetRangePolicyDestination;
  weekday: string;
  blocks: DraftScheduleBlock[];
};

export function targetReviewDayKey(day: Pick<TargetRangeReviewDay, "destination" | "weekday">): string {
  return JSON.stringify([day.destination.source, day.destination.profile_key ?? "", day.destination.entity_id, day.weekday]);
}

export function targetReviewGroupKey(day: TargetRangeReviewDay): string {
  return JSON.stringify([day.destination.source, day.destination.profile_key ?? "", day.destination.entity_id]);
}

export function targetReviewAffectedIndices(day: TargetRangeReviewDay): number[] {
  return [...new Set(day.destination.errors?.filter((error) => error.weekday === day.weekday).map((error) => error.block_index) ?? [])];
}

export function targetReviewGroups(days: TargetRangeReviewDay[]) {
  const groups = new Map<string, { key: string; destination: TargetRangePolicyDestination; days: Array<{ day: TargetRangeReviewDay; index: number; key: string }> }>();
  days.forEach((day, index) => {
    const key = targetReviewGroupKey(day);
    const group = groups.get(key) ?? { key, destination: day.destination, days: [] };
    group.days.push({ day, index, key: targetReviewDayKey(day) });
    groups.set(key, group);
  });
  return [...groups.values()];
}

export function targetReviewZone(data: ScheduleResponse | undefined, day: TargetRangeReviewDay) {
  const destination = day.destination;
  const zone = destination.source === "default" ? data?.zones[destination.entity_id]
    : data?.profiles?.find((profile) => profile.key === destination.profile_key)?.zones[destination.entity_id];
  return zone && "schedule" in zone ? zone : undefined;
}

/** Identify the original reference before any local draft is materialized. */
export function targetReviewUsesPreset(data: ScheduleResponse | undefined, day: TargetRangeReviewDay, blockIndex: number): boolean {
  const { weekday } = day;
  const zone = targetReviewZone(data, day);
  const raw = zone && "schedule" in zone ? zone.schedule[weekday]?.[blockIndex] : undefined;
  const link = zone?.template_links?.[weekday];
  const template = link ? data?.templates?.find((item) => item.key === link.template_key) : undefined;
  const block = day.blocks[blockIndex];
  const slot = template?.blocks.find((item) => item.slot_id && item.slot_id === block?.slot_id || item.start === block?.start);
  const presetKey = link ? link.mode === "full" ? slot?.preset_key : slot?.slot_id ? link.bindings?.[slot.slot_id]?.preset_key : undefined : raw?.preset_key;
  return Boolean(presetKey);
}
