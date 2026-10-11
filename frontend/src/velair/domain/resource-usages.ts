import type { ResourceUsage, ScheduleResponse } from "../types";

export type ResourceUsageGroup = {
  entity_id: string;
  count: number;
  sources: { source: ResourceUsage["source"]; profile_key?: string; entries: { weekday: string; start: string; mode?: "hours" | "full" }[] }[];
};

/** Groups backend usages for display; schedules remain resolved by the backend. */
export function groupResourceUsages(data: ScheduleResponse | undefined, usages: ResourceUsage[], weekdays: string[], startForUsage: (usage: ResourceUsage) => string = () => ""): ResourceUsageGroup[] {
  const groups = new Map<string, ResourceUsageGroup>();
  for (const usage of usages) {
    let group = groups.get(usage.entity_id);
    if (!group) {
      group = { entity_id: usage.entity_id, count: 0, sources: [] };
      groups.set(usage.entity_id, group);
    }
    ++group.count;
    let source = group.sources.find((item) => item.source === usage.source && (usage.source === "default" || item.profile_key === usage.profile_key));
    if (!source) {
      source = { source: usage.source, ...(usage.source === "profile" ? { profile_key: usage.profile_key } : {}), entries: [] };
      group.sources.push(source);
    }
    source.entries.push({ weekday: usage.weekday, start: startForUsage(usage), ...(usage.mode ? { mode: usage.mode } : {}) });
  }
  const dayOrder = (day: string) => weekdays.includes(day) ? weekdays.indexOf(day) : weekdays.length;
  const profileOrder = (key: string | undefined) => data?.profiles?.findIndex((profile) => profile.key === key) ?? -1;
  for (const group of groups.values()) {
    group.sources.sort((left, right) => {
      if (left.source !== right.source) return left.source === "default" ? -1 : 1;
      const leftIndex = profileOrder(left.profile_key), rightIndex = profileOrder(right.profile_key);
      if (leftIndex !== rightIndex) return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
      return (left.profile_key ?? "").localeCompare(right.profile_key ?? "");
    });
    for (const source of group.sources) source.entries.sort((left, right) => dayOrder(left.weekday) - dayOrder(right.weekday) || left.weekday.localeCompare(right.weekday) || left.start.localeCompare(right.start));
  }
  return [...groups.values()];
}
