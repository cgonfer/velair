import { draftBlockTemperatureError } from "./draft-blocks";
import { parseTemperatureInput } from "./temperature-input";

export type ClimateCardBoostDraft = {
  entityId: string;
  durationMinutes: number;
  targetKind: "single" | "range";
  target?: number | string;
  low?: number | string;
  high?: number | string;
  hvacMode?: string;
  fanMode?: string;
  presetMode?: string;
  swingMode?: string;
  swingHorizontalMode?: string;
  humidity?: number;
};

/** Use the schedule validator and its device-minimum grid for Boost targets. */
export function climateCardBoostTemperatureError(
  draft: ClimateCardBoostDraft,
  minimum: number,
  maximum: number,
  step: number | undefined,
  errors = { rangeError: "invalid", stepError: "invalid", rangeOrderError: "invalid" },
): string | undefined {
  const block = { action: "set_temperature", start: "00:00", hvac_mode: "",
    ...(draft.targetKind === "range"
      ? { target_temp_low: draft.low ?? "", target_temp_high: draft.high ?? "" }
      : { temperature: draft.target ?? "" }) };
  return draftBlockTemperatureError(block, {
    minTemperature: minimum, maxTemperature: maximum, temperatureStep: step, ...errors,
  });
}

export function climateCardBoostTargetPayload(draft: ClimateCardBoostDraft): Record<string, number> {
  return draft.targetKind === "range"
    ? { target_temp_low: parseTemperatureInput(draft.low), target_temp_high: parseTemperatureInput(draft.high) }
    : { temperature: parseTemperatureInput(draft.target) };
}
