import type { DraftScheduleBlock } from "../types";

/** Keep the original text in editing drafts; parse only complete decimal values. */
export function parseTemperatureInput(value: unknown): number {
  const text = String(value ?? "").trim().replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
}

export function normalizedTemperatureDraft(block: DraftScheduleBlock): DraftScheduleBlock {
  const result = { ...block };
  for (const field of ["temperature", "target_temp_low", "target_temp_high"] as const) {
    if (typeof result[field] === "string") result[field] = result[field].replace(",", ".");
  }
  return result;
}

/** Keyboard stepping follows the device grid, anchored at its minimum. */
export function stepTemperatureInput(
  text: string,
  direction: -1 | 1,
  minimum?: number,
  maximum?: number,
  step?: number,
): string | undefined {
  const value = parseTemperatureInput(text);
  if (!Number.isFinite(value)) return undefined;
  const hasStep = step !== undefined && Number.isFinite(step) && step > 0;
  const increment = hasStep ? step : 1;
  // Native step="any" keyboard arrows add one without snapping away fractions.
  const anchor = hasStep ? minimum ?? 0 : value;
  const position = (value - anchor) / increment;
  const index = direction > 0 ? Math.floor(position + 1e-7) + 1 : Math.ceil(position - 1e-7) - 1;
  let nextIndex = minimum === undefined ? index : Math.max(0, index);
  if (maximum !== undefined) nextIndex = Math.min(nextIndex, Math.floor((maximum - anchor) / increment + 1e-7));
  let next = anchor + nextIndex * increment;
  if (!hasStep) next = Math.min(maximum ?? Infinity, Math.max(minimum ?? -Infinity, value + direction));
  next = Number(next.toFixed(12));
  if (!Number.isFinite(next) || direction * (next - value) <= 0) return undefined;
  return text.includes(",") ? String(next).replace(".", ",") : String(next);
}
