import { resolvedResourceBlock } from "./resource-display";
import { groupResourceUsages } from "./resource-usages";
import type { PresetResourceUsage, ResourceUsage, ScheduleResponse, TemplatePresetUsage } from "../types";
export type { ResourceUsageGroup as PresetUsageGroup } from "./resource-usages";

/** Displays effective backend times without resolving configurations locally. */
export function groupPresetUsages(data: ScheduleResponse | undefined, presetKey: string, usages: PresetResourceUsage[], weekdays: string[]) {
  const destinations = usages.filter((usage): usage is ResourceUsage => usage.source !== "template");
  return groupResourceUsages(data, destinations, weekdays, (usage) => resolvedResourceBlock(data, usage, presetKey)?.block.start ?? usage.start ?? "");
}

/** Counts saved references, not the destinations inheriting one template reference. */
export function directPresetUseCount(usages: PresetResourceUsage[]): number {
  return usages.filter((usage) => usage.source === "template" || !usage.indirect).length;
}

export function splitPresetUsages(usages: PresetResourceUsage[]) {
  const templates = new Map<string, TemplatePresetUsage[]>();
  const inherited = new Map<string, ResourceUsage[]>();
  const direct: ResourceUsage[] = [];
  for (const usage of usages) {
    if (usage.source === "template") {
      const entries = templates.get(usage.template_key) ?? [];
      entries.push(usage);
      templates.set(usage.template_key, entries);
    } else if (usage.indirect) {
      const entries = inherited.get(usage.template_key ?? "") ?? [];
      entries.push(usage);
      inherited.set(usage.template_key ?? "", entries);
    } else direct.push(usage);
  }
  return { templates, inherited, direct };
}
