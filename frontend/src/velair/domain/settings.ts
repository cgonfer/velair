import { WEEKDAYS } from "../constants";
import type { VelairCardConfig } from "../types";

export function firstWeekdayFromConfig(config: Pick<VelairCardConfig, "first_weekday" | "selected_weekday">): string {
  const configuredWeekday = config.first_weekday ?? config.selected_weekday ?? "monday";
  return WEEKDAYS.includes(configuredWeekday) ? configuredWeekday : "monday";
}

export function orderedWeekdays(firstWeekday: string): string[] {
  const startIndex = WEEKDAYS.indexOf(firstWeekday);
  if (startIndex <= 0) {
    return [...WEEKDAYS];
  }
  return [...WEEKDAYS.slice(startIndex), ...WEEKDAYS.slice(0, startIndex)];
}

export function orderedZoneIds(entityIds: string[], zoneOrder: string[] = []): string[] {
  const knownEntities = new Set(entityIds);
  const orderedEntities = zoneOrder.filter((entityId) => knownEntities.has(entityId));
  const unorderedEntities = entityIds.filter((entityId) => !orderedEntities.includes(entityId));
  return [...orderedEntities, ...unorderedEntities];
}

export function visibleZoneIds(entityIds: string[], config: Pick<VelairCardConfig, "entities" | "zone_order">): string[] {
  const orderedEntities = orderedZoneIds(entityIds, config.zone_order);
  const visibleEntities = config.entities?.filter(Boolean) ?? [];
  if (!visibleEntities.length) {
    return orderedEntities;
  }

  const visibleEntitySet = new Set(visibleEntities);
  return orderedEntities.filter((entityId) => visibleEntitySet.has(entityId));
}

export function combinedTemperatureLimits(limits: Array<[number, number]>): [number, number] {
  if (!limits.length) {
    return [5, 35];
  }

  return [
    Math.min(...limits.map(([minTemperature]) => minTemperature)),
    Math.max(...limits.map(([, maxTemperature]) => maxTemperature)),
  ];
}

export function lowestTemperatureStep(steps: number[]): number {
  const validSteps = steps.filter((step) => Number.isFinite(step) && step > 0);
  return validSteps.length ? Math.min(...validSteps) : 0.5;
}

export function formatTemperatureLimit(value: number): string {
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

export function toggleSetValue(values: Set<string>, value: string, checked: boolean): Set<string> {
  const nextValues = new Set(values);
  if (checked) {
    nextValues.add(value);
  } else {
    nextValues.delete(value);
  }
  return nextValues;
}
