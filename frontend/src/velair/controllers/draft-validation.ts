import { draftBlockTemperatureError } from "../domain/draft-blocks";
import type { BlockDraftSource, DraftScheduleBlock } from "../types";

type DraftValidationHost = {
  _blocksForSource(source: BlockDraftSource): DraftScheduleBlock[];
  _formatTemperatureLimit(value: number): string;
  _t(key: string, replacements?: Record<string, string | number>): string;
  _temperatureLimits(source?: BlockDraftSource): [number, number];
  _temperatureStep(source?: BlockDraftSource): number;
};

export function asDraftValidationHost(host: unknown): DraftValidationHost {
  return host as DraftValidationHost;
}

export function hasDraftValidationError(
  host: DraftValidationHost,
  source: BlockDraftSource = "schedule",
): boolean {
  return host._blocksForSource(source).some((block) => Boolean(temperatureError(host, block, source)));
}

export function temperatureError(
  host: DraftValidationHost,
  block: DraftScheduleBlock,
  source: BlockDraftSource = "schedule",
): string | undefined {
  const [minTemperature, maxTemperature] = host._temperatureLimits(source);
  return draftBlockTemperatureError(block, {
    maxTemperature,
    minTemperature,
    rangeError: host._t("invalidTemperatureRange", {
      min: host._formatTemperatureLimit(minTemperature),
      max: host._formatTemperatureLimit(maxTemperature),
    }),
    stepError: host._t("invalidTemperatureStep"),
    temperatureStep: host._temperatureStep(source),
  });
}
