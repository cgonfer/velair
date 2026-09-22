import type { HassState, ZoneRuntimeStatus } from "../types";
import {
  climateRequiresRangeTarget,
  climateSupportedModes,
  climateSupportsSingleTarget,
} from "./climate";

export type ClimateCardTargetField = "temperature" | "target_temp_low" | "target_temp_high";

export const MANUAL_ADJUSTMENT_PAUSE_ID = "velair.manual_adjustment";

type ClimateCardControlOwner = "automatic" | "manual" | "external";
type ClimateCardControlRuntime = Pick<ZoneRuntimeStatus, "state" | "pause_count" | "pause_ids">;

export type ClimateCardTarget =
  | { kind: "single"; temperature: number }
  | { kind: "range"; low: number; high: number };

export function climateCardTarget(state?: HassState): ClimateCardTarget | undefined {
  const attributes = state?.attributes;
  if (!attributes) return undefined;
  const low = finiteNumber(attributes.target_temp_low);
  const high = finiteNumber(attributes.target_temp_high);
  if (climateRequiresRangeTarget(state)) {
    return low !== undefined && high !== undefined && low <= high
      ? { kind: "range", low, high }
      : undefined;
  }
  if (!climateSupportsSingleTarget(state)) return undefined;
  const temperature = finiteNumber(attributes.temperature);
  return temperature === undefined ? undefined : { kind: "single", temperature };
}

export function climateCardPublishedTemperatureGrid(
  state?: HassState,
  temperatureUnit?: string,
  fallbackStep?: number,
): { minimum: number; maximum: number; step: number } | undefined {
  const minimum = finiteNumber(state?.attributes?.min_temp);
  const maximum = finiteNumber(state?.attributes?.max_temp);
  const step = finiteNumber(fallbackStep)
    ?? finiteNumber(state?.attributes?.target_temp_step)
    ?? homeAssistantDefaultTargetStep(temperatureUnit);
  return minimum !== undefined && maximum !== undefined && step !== undefined
    && minimum < maximum && step > 0
    ? { minimum, maximum, step }
    : undefined;
}

export function climateCardTargetPayload(
  state: HassState | undefined,
  field: ClimateCardTargetField,
  direction: -1 | 1,
  temperatureUnit?: string,
  fallbackStep?: number,
): Record<string, number> | undefined {
  const target = climateCardTarget(state);
  const grid = climateCardPublishedTemperatureGrid(state, temperatureUnit, fallbackStep);
  if (!target || !grid) return undefined;
  if (target.kind === "single") {
    if (field !== "temperature") return undefined;
    const temperature = nextGridValue(target.temperature, direction, grid);
    return temperature === undefined ? undefined : { temperature };
  }
  if (field === "temperature") return undefined;
  if (field === "target_temp_low") {
    const low = nextGridValue(target.low, direction, grid);
    if (low === undefined || low > target.high) return undefined;
    return { target_temp_low: low, target_temp_high: target.high };
  }
  const high = nextGridValue(target.high, direction, grid);
  if (high === undefined || high < target.low) return undefined;
  return { target_temp_low: target.low, target_temp_high: high };
}

export function climateCardPublishedHvacModes(state?: HassState): string[] {
  return [...new Set(climateSupportedModes(state))];
}

export function climateCardRuntimeBlocksThermostat(
  owner: ClimateCardControlOwner,
  runtime?: ClimateCardControlRuntime,
): boolean {
  if (!runtime) return false;
  if (runtime.state === "boost" || runtime.state === "stopped") return true;
  if (runtime.state !== "paused") return false;
  return !(owner === "manual"
    && runtime.pause_count === 1
    && runtime.pause_ids?.length === 1
    && runtime.pause_ids[0] === MANUAL_ADJUSTMENT_PAUSE_ID);
}

function nextGridValue(
  value: number,
  direction: -1 | 1,
  grid: { minimum: number; maximum: number; step: number },
): number | undefined {
  const position = (value - grid.minimum) / grid.step;
  const epsilon = 1e-7;
  const index = direction > 0
    ? Math.floor(position + epsilon) + 1
    : Math.ceil(position - epsilon) - 1;
  const next = roundTemperature(grid.minimum + index * grid.step);
  if (next < grid.minimum - epsilon || next > grid.maximum + epsilon) return undefined;
  return Math.min(grid.maximum, Math.max(grid.minimum, next));
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function homeAssistantDefaultTargetStep(temperatureUnit?: string): number | undefined {
  if (!temperatureUnit) return undefined;
  return temperatureUnit.toUpperCase().includes("F") ? 1 : 0.5;
}

function roundTemperature(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
