import type { BlockConfiguration, DraftScheduleBlock, ResourceDestination, TemplateUpdatePreview, TemplateAssignment } from "../types";
import { draftBlocksFromScheduleBlocks, draftBlockUsesRange, normalizeDraftBlocks } from "../domain/draft-blocks";
import type { VelairViewHost } from "../host-types";

export type TemplateImpact = {
  preview: TemplateUpdatePreview; name: string;
  assignments: Array<{ destination: TemplateAssignment; drafts: DraftScheduleBlock[] }>;
  manual?: Set<string>;
};

export function destinationKey(destination: ResourceDestination): string {
  return JSON.stringify([destination.entity_id, destination.source, destination.profile_key ?? "", destination.weekday]);
}

export function assignmentKey(destination: ResourceDestination, slotId: string): string {
  return `${destinationKey(destination)}:${slotId}`;
}

export function createTemplateImpact(preview: TemplateUpdatePreview, name: string, previous?: TemplateImpact): TemplateImpact {
  const slots = preview.template.blocks.filter((block) => preview.added_slot_ids.includes(block.slot_id ?? ""));
  const manual = new Set<string>();
  const assignments = (preview.usages ?? []).filter((usage) => usage.mode !== "full").map((usage) => {
    const destination = { source: usage.source, entity_id: usage.entity_id, weekday: usage.weekday, ...(usage.profile_key ? { profile_key: usage.profile_key } : {}), bindings: {} };
    const before = previous?.assignments.find((item) => destinationKey(item.destination) === destinationKey(usage));
    const drafts = slots.map((slot) => {
      const key = assignmentKey(usage, slot.slot_id!);
      const retained = before?.drafts.find((draft) => draft.slot_id === slot.slot_id);
      if (retained && previous?.manual?.has(key)) { manual.add(key); return { ...retained, start: slot.start }; }
      const proposal = preview.proposals?.find((item) => item.slot_id === slot.slot_id && destinationKey(item.destination) === destinationKey(usage));
      return proposal ? draftBlocksFromScheduleBlocks([{ ...proposal.binding, start: slot.start, slot_id: slot.slot_id }])[0]
        : { start: slot.start, slot_id: slot.slot_id, action: "set_temperature" as const, hvac_mode: "", temperature: "" };
    });
    return { destination, drafts };
  });
  return { preview, name, assignments, manual };
}

export function normalizeTemplateBlocks(host: Pick<VelairViewHost, "_t">, drafts: DraftScheduleBlock[]) {
  return normalizeDraftBlocks(drafts, {
    duplicateStartError: (start) => host._t("duplicateStart", { start }),
    invalidStartError: (start) => host._t("invalidStart", { start }),
    invalidTemperatureError: (_start, error) => error,
    invalidClimateOptionsError: (start) => host._t("climateOptionsRequiredAt", { start }),
    temperatureError: (block) => {
      const values = draftBlockUsesRange(block) ? [block.target_temp_low, block.target_temp_high] : [block.temperature];
      return values.some((value) => String(value ?? "").trim() === "" || !Number.isFinite(Number(value)))
        || (draftBlockUsesRange(block) && Number(block.target_temp_low) > Number(block.target_temp_high))
        ? host._t("invalidTemperatureRange") : undefined;
    },
  });
}

function normalizedBinding(host: Pick<VelairViewHost, "_t">, draft: DraftScheduleBlock): BlockConfiguration | undefined {
  const normalized = normalizeTemplateBlocks(host, [draft]);
  if (!normalized.ok) return undefined;
  const { start: _start, slot_id: _slot, ...binding } = normalized.blocks[0];
  return binding;
}

/** Only manual edits are sent to preview; accepted backend proposals are sent at Save. */
export function templateImpactAssignments(host: Pick<VelairViewHost, "_t">, impact: TemplateImpact, manualOnly = false): TemplateAssignment[] | undefined {
  const result: TemplateAssignment[] = [];
  for (const item of impact.assignments) {
    const bindings: Record<string, BlockConfiguration> = {};
    for (const draft of item.drafts) {
      if (manualOnly && !impact.manual?.has(assignmentKey(item.destination, draft.slot_id!))) continue;
      const binding = normalizedBinding(host, draft);
      if (!binding) { if (manualOnly) continue; return undefined; }
      bindings[draft.slot_id!] = binding;
    }
    if (Object.keys(bindings).length) result.push({ ...item.destination, bindings });
  }
  return result;
}

export function updateImpactBlock(impact: TemplateImpact, destination: number, index: number, block: DraftScheduleBlock): TemplateImpact {
  const manual = new Set(impact.manual);
  manual.add(assignmentKey(impact.assignments[destination].destination, block.slot_id!));
  return { ...impact, manual, assignments: impact.assignments.map((item, i) => i === destination
    ? { ...item, drafts: item.drafts.map((previous, j) => j === index ? block : previous) } : item) };
}
