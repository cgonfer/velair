import { ACTION_SET_TEMPERATURE, ACTION_TURN_OFF, WEEKDAYS } from "../constants";
import { minutesFromTime, timeFromMinutes } from "../schedule-time";
import type { DraftScheduleBlock, ScheduleBlock } from "../types";
import { isActiveBoostOverride, isActivePauseOverride } from "./overrides";

export type TimelineBlock = {
  index: number;
  nextIndex?: number;
  startMinute: number;
  endMinute: number;
  left: number;
  width: number;
  draft: DraftScheduleBlock;
};

export type TimelineNowMarker = {
  label: string;
  left: number;
  minute: number;
};

export type ReadonlyTimelineBlock = {
  block: ScheduleBlock;
  endMinute: number;
  index: number;
  left: number;
  startMinute: number;
  width: number;
};

export type TimelineCarryOverBlock<T extends { start: string } = ScheduleBlock> = {
  block: T;
  endMinute: number;
  left: 0;
  sourceWeekday: string;
  startMinute: 0;
  width: number;
};

export type TimelineBoostBlock = {
  block: ScheduleBlock;
  endMinute: number;
  left: number;
  startMinute: number;
  width: number;
};

export type TimelinePauseBlock = {
  endMinute: number;
  indefinite: boolean;
  left: number;
  startMinute: number;
  width: number;
};

type TimelineModeBlock = {
  action?: string;
  hvac_mode?: string;
};

export function timelineMinuteFromDate(value: Date, timeZone?: string): number {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
        timeZone,
      }).formatToParts(value);
      const hour = Number(parts.find((part) => part.type === "hour")?.value);
      const minute = Number(parts.find((part) => part.type === "minute")?.value);
      if (Number.isInteger(hour) && Number.isInteger(minute)) {
        return hour * 60 + minute;
      }
    } catch {
      // Fall back to the browser-local clock when Home Assistant reports an invalid zone.
    }
  }
  return value.getHours() * 60 + value.getMinutes();
}

export function timelineNowMarker(value: Date, timeZone?: string): TimelineNowMarker {
  const minute = timelineMinuteFromDate(value, timeZone);
  return {
    label: timeFromMinutes(minute),
    left: (minute / 1440) * 100,
    minute,
  };
}

export function overviewTimelineInitialScrollLeft(
  currentPercent: number,
  scrollWidth: number,
  clientWidth: number,
  stickyWidth: number,
): number {
  const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
  if (maxScrollLeft <= 1) {
    return 0;
  }

  const boundedPercent = Math.max(0, Math.min(100, currentPercent));
  const timelineWidth = Math.max(0, scrollWidth - stickyWidth);
  const visibleTimelineWidth = Math.max(0, clientWidth - stickyWidth);
  const currentPosition = stickyWidth + timelineWidth * (boundedPercent / 100);
  const preferredPosition = stickyWidth + visibleTimelineWidth * 0.35;
  return Math.max(0, Math.min(maxScrollLeft, currentPosition - preferredPosition));
}

export function timelineBlocksFromDrafts(drafts: DraftScheduleBlock[]): TimelineBlock[] {
  const blocks = drafts
    .map((draft, index) => ({
      draft,
      index,
      startMinute: minutesFromTime(draft.start),
    }))
    .filter((block): block is { draft: DraftScheduleBlock; index: number; startMinute: number } => block.startMinute !== undefined)
    .sort((left, right) => left.startMinute - right.startMinute);

  return blocks.map((block, blockIndex) => {
    const startMinute = block.startMinute;
    const nextBlock = blocks[blockIndex + 1];
    const nextStartMinute = nextBlock?.startMinute;
    const endMinute = typeof nextStartMinute === "number" && nextStartMinute > startMinute ? nextStartMinute : 1440;
    const left = (startMinute / 1440) * 100;
    const width = Math.max(((endMinute - startMinute) / 1440) * 100, 3.5);
    return {
      draft: block.draft,
      endMinute,
      index: block.index,
      left,
      nextIndex: nextBlock?.index,
      startMinute,
      width: Math.min(width, 100 - left),
    };
  });
}

export function timelineBlocksFromScheduleBlocks(blocks: ScheduleBlock[]): ReadonlyTimelineBlock[] {
  const timelineBlocks = blocks
    .map((block, index) => ({
      block,
      index,
      startMinute: minutesFromTime(block.start),
    }))
    .filter((block): block is { block: ScheduleBlock; index: number; startMinute: number } =>
      block.startMinute !== undefined)
    .sort((left, right) => left.startMinute - right.startMinute);

  return timelineBlocks.map((block, blockIndex) => {
    const nextBlock = timelineBlocks[blockIndex + 1];
    const nextStartMinute = nextBlock?.startMinute;
    const endMinute = typeof nextStartMinute === "number" && nextStartMinute > block.startMinute
      ? nextStartMinute
      : 1440;
    const left = (block.startMinute / 1440) * 100;
    const width = ((endMinute - block.startMinute) / 1440) * 100;
    return {
      block: block.block,
      endMinute,
      index: block.index,
      left,
      startMinute: block.startMinute,
      width: Math.max(Math.min(width, 100 - left), 0.5),
    };
  });
}

export function timelineCarryOverFromWeeklySchedule<T extends { start: string }>(
  schedule: Partial<Record<string, readonly T[]>>,
  weekday: string,
): TimelineCarryOverBlock<T> | undefined {
  const weekdayIndex = WEEKDAYS.indexOf(weekday);
  if (weekdayIndex < 0) {
    return undefined;
  }

  const firstCurrentStart = validTimelineBlocks(schedule[weekday] ?? [])[0]?.startMinute ?? 1440;
  if (firstCurrentStart <= 0) {
    return undefined;
  }

  for (let distance = 1; distance <= WEEKDAYS.length; distance += 1) {
    const sourceWeekday = WEEKDAYS[
      (weekdayIndex - distance + WEEKDAYS.length) % WEEKDAYS.length
    ];
    const sourceBlocks = validTimelineBlocks(schedule[sourceWeekday] ?? []);
    const previous = sourceBlocks[sourceBlocks.length - 1];
    if (!previous) {
      continue;
    }
    return {
      block: previous.block,
      endMinute: firstCurrentStart,
      left: 0,
      sourceWeekday,
      startMinute: 0,
      width: (firstCurrentStart / 1440) * 100,
    };
  }

  return undefined;
}

function validTimelineBlocks<T extends { start: string }>(blocks: readonly T[]) {
  return blocks
    .map((block) => ({ block, startMinute: minutesFromTime(block.start) }))
    .filter((item): item is { block: T; startMinute: number } => item.startMinute !== undefined)
    .sort((left, right) => left.startMinute - right.startMinute);
}

export function timelineBoostBlockFromOverride(
  override: Record<string, unknown>,
  now = new Date(),
): TimelineBoostBlock | undefined {
  if (!isActiveBoostOverride(override, now.getTime())) {
    return undefined;
  }

  const untilMs = dateValueMs(override.until);
  if (!untilMs) {
    return undefined;
  }

  const startedMs = dateValueMs(override.started_at) ?? now.getTime();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  const visibleStartMs = Math.max(startedMs, dayStart.getTime());
  const visibleEndMs = Math.min(untilMs, dayEnd.getTime());
  if (visibleEndMs <= visibleStartMs || visibleStartMs >= dayEnd.getTime() || visibleEndMs <= dayStart.getTime()) {
    return undefined;
  }

  const startMinute = Math.max(0, Math.min(1440, Math.round((visibleStartMs - dayStart.getTime()) / 60_000)));
  const endMinute = Math.max(startMinute + 1, Math.min(1440, Math.round((visibleEndMs - dayStart.getTime()) / 60_000)));
  const left = (startMinute / 1440) * 100;
  const width = ((endMinute - startMinute) / 1440) * 100;
  const temperature = Number(override.temperature);
  const low = Number(override.target_temp_low);
  const high = Number(override.target_temp_high);
  const hvacMode = typeof override.hvac_mode === "string" ? override.hvac_mode : undefined;

  return {
    block: {
      action: ACTION_SET_TEMPERATURE,
      start: timeFromMinutes(startMinute),
      ...(Number.isFinite(temperature) ? { temperature } : {}),
      ...(Number.isFinite(low) && Number.isFinite(high)
        ? { target_temp_low: low, target_temp_high: high }
        : {}),
      ...(hvacMode ? { hvac_mode: hvacMode } : {}),
    },
    endMinute,
    left,
    startMinute,
    width: Math.max(Math.min(width, 100 - left), 0.5),
  };
}

export function timelinePauseBlockFromOverride(
  override: Record<string, unknown>,
  now = new Date(),
): TimelinePauseBlock | undefined {
  if (!isActivePauseOverride(override, now.getTime())) {
    return undefined;
  }

  const untilMs = dateValueMs(override.until);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  if (!untilMs) {
    return {
      endMinute: 1440,
      indefinite: true,
      left: 0,
      startMinute: 0,
      width: 100,
    };
  }

  const startedMs = dateValueMs(override.started_at) ?? now.getTime();
  const visibleStartMs = Math.max(startedMs, dayStart.getTime());
  const visibleEndMs = Math.min(untilMs, dayEnd.getTime());
  if (visibleEndMs <= visibleStartMs || visibleStartMs >= dayEnd.getTime() || visibleEndMs <= dayStart.getTime()) {
    return undefined;
  }

  const startMinute = Math.max(0, Math.min(1440, Math.round((visibleStartMs - dayStart.getTime()) / 60_000)));
  const endMinute = Math.max(startMinute + 1, Math.min(1440, Math.round((visibleEndMs - dayStart.getTime()) / 60_000)));
  const left = (startMinute / 1440) * 100;
  const width = ((endMinute - startMinute) / 1440) * 100;

  return {
    endMinute,
    indefinite: false,
    left,
    startMinute,
    width: Math.max(Math.min(width, 100 - left), 0.5),
  };
}

export function sortDraftBlocksByStart(drafts: DraftScheduleBlock[]): DraftScheduleBlock[] {
  return drafts
    .map((block, index) => ({ block, index, startMinute: minutesFromTime(block.start) }))
    .sort((left, right) => {
      if (left.startMinute === undefined && right.startMinute === undefined) {
        return left.index - right.index;
      }
      if (left.startMinute === undefined) {
        return 1;
      }
      if (right.startMinute === undefined) {
        return -1;
      }
      return left.startMinute - right.startMinute || left.index - right.index;
    })
    .map((item) => item.block);
}

function dateValueMs(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

export function minuteFromTimelinePosition(clientX: number, trackLeft: number, trackWidth: number): number {
  const ratio = trackWidth > 0 ? (clientX - trackLeft) / trackWidth : 0;
  const minutes = Math.round((Math.min(Math.max(ratio, 0), 1) * 1440) / 15) * 15;
  return Math.min(minutes, 1425);
}

export function timelineModeClass(block: TimelineModeBlock): string {
  if (block.action === ACTION_TURN_OFF) {
    return "off";
  }

  switch (block.hvac_mode) {
    case "heat":
      return "heat";
    case "cool":
      return "cool";
    case "heat_cool":
      return "heat-cool";
    case "dry":
      return "dry";
    case "fan_only":
      return "fan";
    case "auto":
      return "auto";
    case "off":
      return "off";
    default:
      return "keep";
  }
}
