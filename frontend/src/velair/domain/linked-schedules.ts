import { draftBlocksFromScheduleBlocks, draftBlockUsesRange } from "./draft-blocks";
import { ACTION_SET_CLIMATE_OPTIONS, ACTION_SET_HVAC_MODE, ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../constants";
import { availableScheduleTemplates } from "./templates";
import type { BlockConfiguration, DraftScheduleBlock, ScheduleBlock, StoredScheduleTemplate, TemplateLink } from "../types";

/** Assemble editable references and hours only. Climate resolution belongs to the backend. */
export function linkedDayBlocks(link: TemplateLink, templates: StoredScheduleTemplate[]): ScheduleBlock[] {
  const template = availableScheduleTemplates(templates).find((item) => item.key === link.template_key);
  if (link.mode === "full") return (template?.blocks ?? []).map((slot) => ({ ...slot }));
  if (!link.bindings || typeof link.bindings !== "object" || Array.isArray(link.bindings)) return [];
  return (template?.blocks ?? []).map((slot) => ({ start: slot.start, slot_id: slot.slot_id, ...link.bindings[slot.slot_id ?? ""] }));
}

export function linkDay(template: StoredScheduleTemplate, current: ScheduleBlock[]): TemplateLink {
  const bindings: Record<string, BlockConfiguration> = {};
  for (const slot of template.blocks) {
    const match = current.find((block) => block.start === slot.start);
    if (!slot.slot_id || !match) continue;
    const { start: _start, slot_id: _id, ...config } = match;
    bindings[slot.slot_id] = config;
  }
  return { mode: "hours", template_key: template.key, bindings };
}

/** Preserve incomplete editor values; the normal save path validates configurations. */
export function linkDraftDay(template: StoredScheduleTemplate, current: DraftScheduleBlock[]): TemplateLink {
  const editable = current.map((block) => {
    const base = { start: block.start };
    if (block.preset_key) return { ...base, preset_key: block.preset_key };
    const action = block.action || ACTION_SET_TEMPERATURE;
    if (action === ACTION_TURN_OFF) return { ...base, action };
    if (action === ACTION_SET_HVAC_MODE) return { ...base, action, ...(block.hvac_mode ? { hvac_mode: block.hvac_mode } : {}) };
    const humidityInput = String(block.humidity ?? "").trim();
    const humidity = humidityInput && Number.isFinite(Number(humidityInput))
      ? Number(humidityInput) : block.humidity;
    // Keep legitimate incomplete targets without converting empty input to zero.
    return {
      ...base, action,
      ...(action === ACTION_SET_CLIMATE_OPTIONS ? {} : draftBlockUsesRange(block)
        ? { target_temp_low: block.target_temp_low ?? "", target_temp_high: block.target_temp_high ?? "" }
        : { temperature: block.temperature ?? "" }),
      ...(action !== ACTION_SET_CLIMATE_OPTIONS && block.hvac_mode ? { hvac_mode: block.hvac_mode } : {}),
      ...(block.fan_mode ? { fan_mode: block.fan_mode } : {}),
      ...(block.preset_mode ? { preset_mode: block.preset_mode } : {}),
      ...(block.swing_mode ? { swing_mode: block.swing_mode } : {}),
      ...(block.swing_horizontal_mode ? { swing_horizontal_mode: block.swing_horizontal_mode } : {}),
      ...(humidityInput ? { humidity } : {}),
    };
  });
  return linkDay(template, editable as unknown as ScheduleBlock[]);
}

export function bindingsFromBlocks(link: TemplateLink, blocks: ScheduleBlock[]): TemplateLink {
  if (link.mode === "full") return link;
  return { ...link, bindings: Object.fromEntries(blocks.filter((block) => block.slot_id).map(({ start: _start, slot_id, ...config }) => [slot_id!, config])) };
}

export function linkedDraftBlocks(link: TemplateLink, templates: StoredScheduleTemplate[], unit?: string): DraftScheduleBlock[] {
  return draftBlocksFromScheduleBlocks(linkedDayBlocks(link, templates), unit).map((block) => {
    if (link.mode === "full") return block;
    const binding = link.bindings[block.slot_id ?? ""];
    if (!binding) return { ...block, temperature: "" };
    // A linked day draft may contain unvalidated input, including an empty target.
    const temperature: unknown = binding.temperature;
    return typeof temperature === "string" ? { ...block, temperature } : block;
  });
}

export function preserveSlotIds(blocks: ScheduleBlock[], drafts: DraftScheduleBlock[]): ScheduleBlock[] {
  return blocks.map((block) => ({ ...block, ...(drafts.find((draft) => draft.start === block.start)?.slot_id ? { slot_id: drafts.find((draft) => draft.start === block.start)!.slot_id } : {}) }));
}
