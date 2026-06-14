import { ACTION_SET_TEMPERATURE, WEEKDAYS } from "../constants";
import type { ScheduleTemplate, StoredScheduleTemplate } from "../types";

export function scheduleTemplatesFromStored(templates: StoredScheduleTemplate[] | undefined): ScheduleTemplate[] {
  return (templates ?? []).map((template) => ({
    key: template.key,
    name: template.name,
    blocks: template.blocks.map((block) => ({
      action: block.action ?? ACTION_SET_TEMPERATURE,
      start: block.start,
      temperature: Number(block.temperature ?? 21),
      hvac_mode: block.hvac_mode ?? "",
    })),
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
