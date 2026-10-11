import type { ScheduleBlock, ScheduleResponse, ResourceUsage } from "../types";

export function availableBlockPresets(data?: ScheduleResponse) {
  return Array.isArray(data?.block_presets) ? data.block_presets.filter((preset) => preset && typeof preset.key === "string" && typeof preset.name === "string" && preset.config && typeof preset.config === "object" && !Array.isArray(preset.config)) : [];
}

/** Read backend-resolved values only when metadata matches the reference being edited. */
export function resolvedResourceBlock(data: ScheduleResponse | undefined, usage: ResourceUsage, presetKey?: string): { block: ScheduleBlock; adaptations: string[] } | undefined {
  const metadata = usage.source === "default" ? data?.resolved_block_metadata?.default?.[usage.entity_id]?.[usage.weekday] : data?.resolved_block_metadata?.profiles?.[usage.profile_key ?? ""]?.[usage.entity_id]?.[usage.weekday];
  const match = metadata?.find((item) => item.preset_key === presetKey && (usage.slot_id ? item.slot_id === usage.slot_id : item.start === usage.start));
  const week = usage.source === "default" ? data?.resolved_default_schedules?.[usage.entity_id] : data?.resolved_profile_schedules?.[usage.profile_key ?? ""]?.[usage.entity_id];
  const block = week?.[usage.weekday]?.find((item) => item.start === match?.start);
  if (!match || !block) return undefined;
  return { block, adaptations: Object.values(match.adaptations ?? {}).map((change) => `${change.requested} → ${change.effective}`) };
}
