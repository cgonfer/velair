import { WEEKDAYS } from "../constants";
import type { ScheduleBlock, TemplateLink } from "../types";

export const BUILTIN_DAY_LAYOUTS: Array<{ key: string; name: string; groups: string[][] }> = [
  { key: "individual", name: "individualDays", groups: WEEKDAYS.map((day) => [day]) },
  { key: "weekdays_weekend", name: "weekdaysWeekend", groups: [WEEKDAYS.slice(0, 5), WEEKDAYS.slice(5)] },
  { key: "all", name: "allDays", groups: [[...WEEKDAYS]] },
];
export function resolveDayLayout(key: string | undefined): { layout: typeof BUILTIN_DAY_LAYOUTS[number]; invalid: boolean } {
  const layout = BUILTIN_DAY_LAYOUTS.find((item) => item.key === (key ?? "individual"));
  return { layout: layout ?? BUILTIN_DAY_LAYOUTS[0], invalid: !layout };
}
export function dayGroups(key: string | undefined): string[][] { return resolveDayLayout(key).layout.groups; }
export function selectedDayGroup(key: string | undefined, day: string): string[] {
  return dayGroups(key).find((group) => group.includes(day)) ?? [day];
}
export function configurationFingerprint(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(configurationFingerprint).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${configurationFingerprint(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export function schedulesEqual(zone: { schedule: Record<string, ScheduleBlock[]>; template_links?: Record<string, TemplateLink> }, days: string[]): boolean {
  const signatures = days.map((day) => dayConfigurationFingerprint(zone, day));
  return signatures.every((signature) => signature === signatures[0]);
}

/** Group only identical stored configurations, preserving the configured display order. */
export function groupScheduleCandidates(days: string[], fingerprint: (day: string) => string): Array<{ sourceDay: string; days: string[] }> {
  const candidates = new Map<string, { sourceDay: string; days: string[] }>();
  for (const day of days) {
    const signature = fingerprint(day);
    const existing = candidates.get(signature);
    if (existing) existing.days.push(day);
    else candidates.set(signature, { sourceDay: day, days: [day] });
  }
  return [...candidates.values()];
}
export function dayConfigurationFingerprint(zone: { schedule: Record<string, ScheduleBlock[]>; template_links?: Record<string, TemplateLink> }, day: string): string {
  return configurationFingerprint({ blocks: zone.schedule[day] ?? [], link: zone.template_links?.[day] });
}

/** Effective presentation only; this never replaces raw dependency equality. */
export function schedulePresentationFingerprint(blocks: ScheduleBlock[] | undefined): string | undefined {
  if (!blocks) return undefined;
  return configurationFingerprint(blocks.map(({ preset_key: _preset, slot_id: _slot, ...block }) => ({ ...block, action: block.action ?? "set_temperature" }))
    .sort((a, b) => a.start.localeCompare(b.start)));
}

export function dayGroupLabel(days: string[], weekdayName: (day: string) => string, allDays: string): string {
  if (days.length === WEEKDAYS.length && WEEKDAYS.every(day => days.includes(day))) return allDays;
  const ordered = WEEKDAYS.filter(day => days.includes(day));
  const contiguous = ordered.length > 1 && WEEKDAYS.indexOf(ordered.at(-1)!) - WEEKDAYS.indexOf(ordered[0]) === ordered.length - 1;
  return contiguous ? `${weekdayName(ordered[0])}–${weekdayName(ordered.at(-1)!)}` : ordered.map(weekdayName).join(", ");
}
