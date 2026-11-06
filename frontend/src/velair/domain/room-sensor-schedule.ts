import { WEEKDAYS } from "../constants";
import type { RoomSensorSchedule } from "../types";

export type RoomSensorScheduleError = "roomSensorScheduleInvalidPeriod" | "roomSensorScheduleOverlap";

export function roomSensorScheduleDraft(value: RoomSensorSchedule | undefined, fixedSource: string | null): RoomSensorSchedule {
  return value ? structuredClone(value) : { enabled: false, default_source: fixedSource, periods: [] };
}

export function roomSensorSchedulesEqual(left: RoomSensorSchedule, right: RoomSensorSchedule): boolean {
  const canonical = (value: RoomSensorSchedule) => JSON.stringify({
    enabled: value.enabled, default_source: value.default_source,
    periods: value.periods.map(period => JSON.stringify({
      weekdays: [...period.weekdays].sort(), start: period.start, end: period.end, source: period.source,
    })).sort(),
  });
  return canonical(left) === canonical(right);
}

/** Validate local weekly intervals; an overnight period belongs to its start day. */
export function roomSensorScheduleError(schedule: RoomSensorSchedule): RoomSensorScheduleError | undefined {
  const sourceValid = (source: string | null) => source === null || /^sensor\.[a-z0-9_]+$/.test(source);
  if (!sourceValid(schedule.default_source)) return "roomSensorScheduleInvalidPeriod";
  const intervals: Array<[number, number]> = [];
  for (const period of schedule.periods) {
    if (!sourceValid(period.source) || !period.weekdays.length
      || new Set(period.weekdays).size !== period.weekdays.length
      || period.weekdays.some(day => !WEEKDAYS.includes(day))
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(period.start)
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(period.end)
      || period.start === period.end) return "roomSensorScheduleInvalidPeriod";
    const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    const start = minutes(period.start);
    const end = minutes(period.end);
    const duration = (end - start + 1440) % 1440;
    for (const day of period.weekdays) {
      const from = WEEKDAYS.indexOf(day) * 1440 + start;
      const to = from + duration;
      intervals.push([from, Math.min(to, 10080)]);
      if (to > 10080) intervals.push([0, to - 10080]);
    }
  }
  intervals.sort((left, right) => left[0] - right[0]);
  return intervals.some((interval, index) => index > 0 && interval[0] < intervals[index - 1][1])
    ? "roomSensorScheduleOverlap" : undefined;
}
