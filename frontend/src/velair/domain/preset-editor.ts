import { HVAC_MODES } from "../constants";
import type { DraftScheduleBlock, HomeAssistant } from "../types";

/** A reusable preset is not constrained by a reference device. */
export const presetHvacModes = HVAC_MODES.filter((mode) => mode !== "off");

export function presetOptionSuggestions(hass: HomeAssistant | undefined, entities: string[], field: "fan_modes" | "preset_modes" | "swing_modes" | "swing_horizontal_modes"): string[] {
  return [...new Set(entities.flatMap((id) => {
    const values = hass?.states?.[id]?.attributes?.[field];
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
  }))].sort();
}

/** Keep the user's decimal separator while editing; normalize only for validation. */
export function normalizedPresetTemperatureDraft(block: DraftScheduleBlock): DraftScheduleBlock {
  const normalized = { ...block };
  for (const field of ["temperature", "target_temp_low", "target_temp_high"] as const) {
    if (typeof normalized[field] === "string") normalized[field] = normalized[field].replace(",", ".");
  }
  return normalized;
}

export function presetTemperatureError(block: DraftScheduleBlock, invalid: string): string | undefined {
  if (block.action !== "set_temperature") return undefined;
  block = normalizedPresetTemperatureDraft(block);
  const range = block.target_temp_low !== undefined || block.target_temp_high !== undefined;
  const values = range ? [block.target_temp_low, block.target_temp_high] : [block.temperature];
  if (values.some((value) => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(value ?? "").trim()) || !Number.isFinite(Number(value)))) return invalid;
  return range && Number(block.target_temp_low) > Number(block.target_temp_high) ? invalid : undefined;
}
