import { ACTION_SET_TEMPERATURE, WEEKDAYS } from "../constants";
import type { DraftScheduleBlock, ScheduleTemplate, StoredScheduleTemplate } from "../types";
import { defaultTargetTemperature } from "./temperature-units";

export function scheduleTemplatesFromStored(templates: StoredScheduleTemplate[] | undefined, unit?: string): ScheduleTemplate[] {
  return (templates ?? []).map((template) => ({
    key: template.key,
    name: template.name,
    blocks: template.blocks.map((block) => {
      const draft: DraftScheduleBlock = {
        action: block.action ?? ACTION_SET_TEMPERATURE,
        start: block.start,
        hvac_mode: block.hvac_mode ?? "",
      };
      if (block.target_temp_low != null || block.target_temp_high != null) {
        draft.target_temp_low = block.target_temp_low ?? "";
        draft.target_temp_high = block.target_temp_high ?? "";
      } else {
        draft.temperature = Number(block.temperature ?? defaultTargetTemperature(unit));
      }
      if (block.fan_mode) {
        draft.fan_mode = block.fan_mode;
      }
      if (block.preset_mode) {
        draft.preset_mode = block.preset_mode;
      }
      if (block.swing_mode) {
        draft.swing_mode = block.swing_mode;
      }
      if (block.swing_horizontal_mode) {
        draft.swing_horizontal_mode = block.swing_horizontal_mode;
      }
      if (block.humidity != null) {
        draft.humidity = block.humidity;
      }
      return draft;
    }),
  }));
}

export function templateLabel(template: Pick<ScheduleTemplate, "key" | "name">): string {
  return template.name ?? template.key;
}

export function uniqueTemplateName(baseName: string, templates: ScheduleTemplate[]): string {
  const existingNames = new Set(templates.map((template) => templateLabel(template)));
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let suffix = 2;
  while (existingNames.has(`${baseName} ${suffix}`)) {
    suffix += 1;
  }
  return `${baseName} ${suffix}`;
}

export function newTemplateKey(now = Date.now(), random = Math.random()): string {
  return `custom_${now.toString(36)}_${random.toString(36).slice(2, 8)}`;
}

export function templateApplyTargetKey(entityId: string, weekday: string): string {
  return `${entityId}::${weekday}`;
}

export function toggleTemplateApplyTarget(
  targets: Set<string>,
  entityId: string,
  weekday: string,
  checked: boolean,
): Set<string> {
  const targetKey = templateApplyTargetKey(entityId, weekday);
  const nextTargets = new Set(targets);
  if (checked) {
    nextTargets.add(targetKey);
  } else {
    nextTargets.delete(targetKey);
  }
  return nextTargets;
}

export function templateApplyTargetsFromKeys(
  targetKeys: Iterable<string>,
  configuredEntities: string[],
): Array<{ entityId: string; weekday: string }> {
  return [...targetKeys]
    .map((target) => {
      const [entityId, weekday] = target.split("::");
      return { entityId, weekday };
    })
    .filter(
      (target) =>
        Boolean(target.entityId) &&
        WEEKDAYS.includes(target.weekday) &&
        configuredEntities.includes(target.entityId),
    );
}
