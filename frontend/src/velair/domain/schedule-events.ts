import { ACTION_SET_TEMPERATURE, WEEKDAYS } from "../constants";
import { minutesFromTime } from "../schedule-time";
import type { ScheduleBlock, ScheduleEvent, ScheduleZone } from "../types";

export function nextEventForZone(
  entityId: string,
  zone: ScheduleZone | undefined,
  override?: Record<string, unknown>,
  after = new Date(),
): ScheduleEvent | undefined {
  if (!zone?.enabled) {
    return undefined;
  }

  if (override) {
    const untilMs = dateMs(override.until);
    if (untilMs) {
      const resumeDate = new Date(untilMs);
      return scheduledEventAt(entityId, zone, resumeDate) ?? nextScheduleEventAfter(entityId, zone, resumeDate);
    }
  }

  return nextScheduleEventAfter(entityId, zone, after);
}

export function nextScheduleEventAfter(
  entityId: string,
  zone: ScheduleZone,
  after: Date,
): ScheduleEvent | undefined {
  let candidate: ScheduleEvent | undefined;
  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const eventDate = new Date(after);
    eventDate.setDate(after.getDate() + dayOffset);
    const weekday = weekdayForDate(eventDate);

    for (const block of zone.schedule?.[weekday] ?? []) {
      const eventWhen = eventDateTime(eventDate, block.start);
      if (!eventWhen || eventWhen <= after) {
        continue;
      }

      const event = scheduleEventFromBlock(entityId, block, eventWhen, weekday);
      if (!candidate || eventWhen < new Date(candidate.when)) {
        candidate = event;
      }
    }
  }

  return candidate;
}

export function scheduledEventAt(entityId: string, zone: ScheduleZone, at: Date): ScheduleEvent | undefined {
  const weekday = weekdayForDate(at);
  const minute = at.getHours() * 60 + at.getMinutes();
  const block = [...(zone.schedule?.[weekday] ?? [])]
    .map((candidate) => ({ block: candidate, minute: minutesFromTime(candidate.start) }))
    .filter((candidate): candidate is { block: ScheduleBlock; minute: number } => candidate.minute !== undefined)
    .sort((first, second) => first.minute - second.minute)
    .filter((candidate) => candidate.minute <= minute)
    .at(-1)?.block;

  return block ? scheduleEventFromBlock(entityId, block, at, weekday) : undefined;
}

export function scheduleEventFromBlock(
  entityId: string,
  block: ScheduleBlock,
  eventWhen: Date,
  weekday: string,
): ScheduleEvent {
  return {
    entity_id: entityId,
    when: eventWhen.toISOString(),
    action: block.action ?? ACTION_SET_TEMPERATURE,
    temperature: block.temperature ?? null,
    hvac_mode: block.hvac_mode ?? null,
    weekday,
    start: block.start,
  };
}

export function eventDateTime(date: Date, start: string): Date | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(start);
  if (!match) {
    return undefined;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return undefined;
  }

  const eventDate = new Date(date);
  eventDate.setHours(hours, minutes, 0, 0);
  return eventDate;
}

export function weekdayForDate(date: Date): string {
  return WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
}

export function dateMs(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}
