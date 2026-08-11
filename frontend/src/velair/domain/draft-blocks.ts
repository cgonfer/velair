import { ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../constants";
import type { DraftScheduleBlock, NormalizedBlocks, ScheduleBlock } from "../types";
import { defaultTargetTemperature } from "./temperature-units";

type TemperatureErrorOptions = {
  maxTemperature: number;
  minTemperature: number;
  rangeError: string;
  rangeOrderError?: string;
  stepError: string;
  temperatureStep?: number;
};

type NormalizeDraftBlockOptions = {
  duplicateStartError: (start: string) => string;
  invalidStartError: (start: string) => string;
  invalidTemperatureError: (start: string, error: string) => string;
  temperatureError: (block: DraftScheduleBlock) => string | undefined;
};

export function draftBlocksFromScheduleBlocks(blocks: ScheduleBlock[], unit?: string): DraftScheduleBlock[] {
  return blocks.map((block) => {
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
  });
}

export function addDraftBlock(blocks: DraftScheduleBlock[], nextStart: string, unit?: string): DraftScheduleBlock[] {
  const lastBlock = blocks[blocks.length - 1];
  const target = draftBlockUsesRange(lastBlock)
    ? {
        target_temp_low: lastBlock?.target_temp_low ?? "",
        target_temp_high: lastBlock?.target_temp_high ?? "",
      }
    : { temperature: Number(lastBlock?.temperature || defaultTargetTemperature(unit)) };
  return [
    ...blocks,
    {
      action: ACTION_SET_TEMPERATURE,
      start: nextStart,
      ...target,
      hvac_mode: "",
    },
  ];
}

export function removeDraftBlock(blocks: DraftScheduleBlock[], index: number): DraftScheduleBlock[] {
  return blocks.filter((_, blockIndex) => blockIndex !== index);
}

export function updateDraftBlock(
  blocks: DraftScheduleBlock[],
  index: number,
  field: keyof DraftScheduleBlock,
  value: string,
): DraftScheduleBlock[] {
  if (!blocks[index]) {
    return blocks;
  }

  return blocks.map((block, blockIndex) => {
    if (blockIndex !== index) {
      return block;
    }

    if (field === "hvac_mode") {
      return {
        ...block,
        action: value === "off" ? ACTION_TURN_OFF : ACTION_SET_TEMPERATURE,
        hvac_mode: value === "off" ? "" : value,
      };
    }

    return {
      ...block,
      [field]: value,
    };
  });
}

export function draftBlockTemperatureError(
  block: DraftScheduleBlock,
  options: TemperatureErrorOptions,
): string | undefined {
  if ((block.action || ACTION_SET_TEMPERATURE) === ACTION_TURN_OFF) {
    return undefined;
  }

  const values = draftBlockUsesRange(block)
    ? [block.target_temp_low, block.target_temp_high]
    : [block.temperature];
  const parsed: number[] = [];
  for (const value of values) {
    const rawValue = String(value ?? "").trim();
    if (!rawValue || !/^-?\d+(\.\d+)?$/.test(rawValue)) {
      return options.rangeError;
    }
    const temperature = Number(rawValue);
    if (
      !Number.isFinite(temperature)
      || temperature < options.minTemperature
      || temperature > options.maxTemperature
    ) {
      return options.rangeError;
    }
    if (
      options.temperatureStep !== undefined
      && Math.abs(temperature / options.temperatureStep - Math.round(temperature / options.temperatureStep)) > 0.0001
    ) {
      return options.stepError;
    }
    parsed.push(temperature);
  }
  if (parsed.length === 2 && parsed[0] > parsed[1]) {
    return options.rangeOrderError ?? options.rangeError;
  }

  return undefined;
}

export function normalizeDraftBlocks(
  draftBlocks: DraftScheduleBlock[],
  options: NormalizeDraftBlockOptions,
): NormalizedBlocks {
  const seen = new Set<string>();
  const blocks: ScheduleBlock[] = [];

  for (const block of draftBlocks) {
    const start = String(block.start || "").trim();
    if (!/^\d{2}:\d{2}$/.test(start)) {
      return { ok: false, error: options.invalidStartError(start || "empty") };
    }

    const [hour, minute] = start.split(":").map((part) => Number(part));
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return { ok: false, error: options.invalidStartError(start) };
    }

    if (seen.has(start)) {
      return { ok: false, error: options.duplicateStartError(start) };
    }

    const action = block.action || ACTION_SET_TEMPERATURE;
    if (action === ACTION_TURN_OFF) {
      blocks.push({ start, action: ACTION_TURN_OFF });
      seen.add(start);
      continue;
    }

    const temperatureError = options.temperatureError(block);
    if (temperatureError) {
      return { ok: false, error: options.invalidTemperatureError(start, temperatureError) };
    }

    const normalizedBlock: ScheduleBlock = {
      action: ACTION_SET_TEMPERATURE,
      start,
    };
    if (draftBlockUsesRange(block)) {
      normalizedBlock.target_temp_low = Number(block.target_temp_low);
      normalizedBlock.target_temp_high = Number(block.target_temp_high);
    } else {
      normalizedBlock.temperature = Number(block.temperature);
    }

    if (block.hvac_mode) {
      normalizedBlock.hvac_mode = block.hvac_mode;
    }
    if (block.fan_mode) {
      normalizedBlock.fan_mode = block.fan_mode;
    }
    if (block.preset_mode) {
      normalizedBlock.preset_mode = block.preset_mode;
    }
    if (block.swing_mode) {
      normalizedBlock.swing_mode = block.swing_mode;
    }
    if (block.swing_horizontal_mode) {
      normalizedBlock.swing_horizontal_mode = block.swing_horizontal_mode;
    }
    if (String(block.humidity ?? "").trim()) {
      const humidity = Number(block.humidity);
      if (Number.isFinite(humidity)) {
        normalizedBlock.humidity = humidity;
      }
    }

    blocks.push(normalizedBlock);
    seen.add(start);
  }

  return {
    ok: true,
    blocks: blocks.sort((left, right) => left.start.localeCompare(right.start)),
  };
}

export function clampBlocksToTemperatureLimits(
  blocks: ScheduleBlock[],
  minTemperature: number,
  maxTemperature: number,
): ScheduleBlock[] {
  return blocks.map((block) => {
    if ((block.action || ACTION_SET_TEMPERATURE) === ACTION_TURN_OFF) {
      return { ...block };
    }
    const clamped = { ...block };
    if (block.temperature != null) {
      clamped.temperature = Math.min(maxTemperature, Math.max(minTemperature, Number(block.temperature)));
    }
    if (block.target_temp_low != null) {
      clamped.target_temp_low = Math.min(maxTemperature, Math.max(minTemperature, Number(block.target_temp_low)));
    }
    if (block.target_temp_high != null) {
      clamped.target_temp_high = Math.min(maxTemperature, Math.max(minTemperature, Number(block.target_temp_high)));
    }
    return clamped;
  });
}

export function draftBlockUsesRange(block?: Pick<DraftScheduleBlock, "target_temp_low" | "target_temp_high">): boolean {
  return Boolean(block && (block.target_temp_low !== undefined || block.target_temp_high !== undefined));
}

export function firstUnsupportedModeBlock(
  blocks: Array<Pick<ScheduleBlock, "action" | "hvac_mode" | "start">>,
  supportedModes: string[],
): Pick<ScheduleBlock, "action" | "hvac_mode" | "start"> | undefined {
  const supported = new Set(supportedModes);
  return blocks.find((block) =>
    (block.action || ACTION_SET_TEMPERATURE) !== ACTION_TURN_OFF &&
    Boolean(block.hvac_mode) &&
    !supported.has(block.hvac_mode ?? "")
  );
}

export type ClimateOptionSupport = {
  fanModes: string[];
  humidityLimits?: [number, number];
  presetModes: string[];
  swingHorizontalModes: string[];
  swingModes: string[];
};

export function filterBlocksForClimateOptions(
  blocks: ScheduleBlock[],
  support: ClimateOptionSupport,
): ScheduleBlock[] {
  return blocks.map((block) => {
    if ((block.action || ACTION_SET_TEMPERATURE) === ACTION_TURN_OFF) {
      return { start: block.start, action: ACTION_TURN_OFF };
    }

    const filtered: ScheduleBlock = { ...block };
    if (!support.fanModes.includes(filtered.fan_mode ?? "")) {
      delete filtered.fan_mode;
    }
    if (!support.presetModes.includes(filtered.preset_mode ?? "")) {
      delete filtered.preset_mode;
    }
    if (!support.swingModes.includes(filtered.swing_mode ?? "")) {
      delete filtered.swing_mode;
    }
    if (!support.swingHorizontalModes.includes(filtered.swing_horizontal_mode ?? "")) {
      delete filtered.swing_horizontal_mode;
    }
    if (
      filtered.humidity == null ||
      !support.humidityLimits ||
      filtered.humidity < support.humidityLimits[0] ||
      filtered.humidity > support.humidityLimits[1]
    ) {
      delete filtered.humidity;
    }
    return filtered;
  });
}
