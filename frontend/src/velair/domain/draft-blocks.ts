import { ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../constants";
import type { DraftScheduleBlock, NormalizedBlocks, ScheduleBlock } from "../types";

type TemperatureErrorOptions = {
  maxTemperature: number;
  minTemperature: number;
  rangeError: string;
  stepError: string;
  temperatureStep: number;
};

type NormalizeDraftBlockOptions = {
  duplicateStartError: (start: string) => string;
  invalidStartError: (start: string) => string;
  invalidTemperatureError: (start: string, error: string) => string;
  temperatureError: (block: DraftScheduleBlock) => string | undefined;
};

export function draftBlocksFromScheduleBlocks(blocks: ScheduleBlock[]): DraftScheduleBlock[] {
  return blocks.map((block) => ({
    action: block.action ?? ACTION_SET_TEMPERATURE,
    start: block.start,
    temperature: Number(block.temperature ?? 21),
    hvac_mode: block.hvac_mode ?? "",
  }));
}

export function addDraftBlock(blocks: DraftScheduleBlock[], nextStart: string): DraftScheduleBlock[] {
  const lastBlock = blocks[blocks.length - 1];
  return [
    ...blocks,
    {
      action: ACTION_SET_TEMPERATURE,
      start: nextStart,
      temperature: Number(lastBlock?.temperature || 21),
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

  const rawValue = String(block.temperature ?? "").trim();
  if (!rawValue || !/^\d+(\.\d+)?$/.test(rawValue)) {
    return options.rangeError;
  }

  const temperature = Number(rawValue);
  if (
    !Number.isFinite(temperature) ||
    temperature < options.minTemperature ||
    temperature > options.maxTemperature
  ) {
    return options.rangeError;
  }

  if (Math.abs(temperature / options.temperatureStep - Math.round(temperature / options.temperatureStep)) > 0.0001) {
    return options.stepError;
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
      temperature: Number(block.temperature),
    };

    if (block.hvac_mode) {
      normalizedBlock.hvac_mode = block.hvac_mode;
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
    if ((block.action || ACTION_SET_TEMPERATURE) === ACTION_TURN_OFF || block.temperature == null) {
      return { ...block };
    }

    return {
      ...block,
      temperature: Math.min(maxTemperature, Math.max(minTemperature, Number(block.temperature))),
    };
  });
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
