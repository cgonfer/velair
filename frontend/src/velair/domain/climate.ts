import { HVAC_MODES } from "../constants";
import { convertTemperatureDelta } from "./temperature-units";
import type { HassState, TargetFormatPolicy } from "../types";

export type ClimateCapabilityKey =
  | "currentTemperature"
  | "targetTemperature"
  | "currentHumidity"
  | "supportedPresetModes"
  | "supportedFanModes"
  | "supportedSwingModes"
  | "supportedHorizontalSwingModes"
  | "temperatureRange";

export type ClimateCapability = {
  icon: string;
  labelKey: ClimateCapabilityKey;
};

export function climateStateSignature(state?: HassState): string {
  const attributes = state?.attributes;
  return JSON.stringify([
    state?.state ?? "",
    attributes?.current_temperature ?? null,
    attributes?.temperature ?? null,
    attributes?.target_temp_low ?? null,
    attributes?.target_temp_high ?? null,
    attributes?.supported_features ?? null,
    attributes?.hvac_action ?? "",
    attributes?.friendly_name ?? "",
    attributes?.unit_of_measurement ?? "",
    attributes?.hvac_modes ?? [],
    attributes?.min_temp ?? null,
    attributes?.max_temp ?? null,
    attributes?.target_temp_step ?? null,
    attributes?.fan_mode ?? null,
    attributes?.current_humidity ?? null,
    attributes?.humidity ?? null,
    attributes?.min_humidity ?? null,
    attributes?.max_humidity ?? null,
    attributes?.preset_mode ?? null,
    attributes?.preset_modes ?? [],
    attributes?.fan_modes ?? [],
    attributes?.swing_mode ?? null,
    attributes?.swing_modes ?? [],
    attributes?.swing_horizontal_mode ?? null,
    attributes?.swing_horizontal_modes ?? [],
  ]);
}

export function climateModeIcon(mode?: string): string | undefined {
  switch (mode) {
    case "auto":
      return "mdi:autorenew";
    case "cool":
      return "mdi:snowflake";
    case "dry":
      return "mdi:water-percent";
    case "fan_only":
      return "mdi:fan";
    case "heat":
      return "mdi:fire";
    case "heat_cool":
      return "mdi:sun-snowflake";
    case "off":
      return "mdi:power";
    default:
      return undefined;
  }
}

export function modeClassName(mode: string): string {
  return mode.replaceAll("_", "-");
}

export function entityTemperatureLimits(state?: HassState, unit?: string): [number, number] {
  const fallback: [number, number] = isFahrenheit(unit) ? [41, 95] : [5, 35];
  const minTemperature = coerceNumber(state?.attributes?.min_temp, fallback[0]);
  const maxTemperature = coerceNumber(state?.attributes?.max_temp, fallback[1]);
  if (
    minTemperature >= maxTemperature
    || gridLooksStaleForUnit(minTemperature, maxTemperature, unit)
  ) {
    return fallback;
  }
  return [minTemperature, maxTemperature];
}

export function entityTemperatureStep(
  state?: HassState,
  targetUnit?: string,
): number | undefined {
  const step = coerceNumber(state?.attributes?.target_temp_step, Number.NaN);
  if (!Number.isFinite(step) || step <= 0) return undefined;
  const sourceUnit = reportedTemperatureGridUnit(state, targetUnit);
  return convertTemperatureDelta(step, sourceUnit, targetUnit);
}

export function firstTemperatureStepAtOrAbove(minimum: number, _step?: number): number {
  return minimum;
}

export function temperatureMatchesStep(
  temperature: number,
  minimum: number,
  step?: number,
  tolerance = 0.0001,
): boolean {
  if (step === undefined || !Number.isFinite(step) || step <= 0) return true;
  const position = (temperature - minimum) / step;
  return Math.abs(position - Math.round(position)) <= tolerance;
}

export function climateSupportedModes(state?: HassState): string[] {
  const modes = state?.attributes?.hvac_modes;
  if (!Array.isArray(modes)) {
    return [];
  }

  return modes.filter((mode): mode is string => typeof mode === "string");
}

export function climateSupportsSingleTarget(state?: HassState): boolean {
  const attributes = state?.attributes;
  if (!attributes) {
    return true;
  }
  const supportedFeatures = Number(attributes.supported_features ?? 0);
  if (Number.isFinite(supportedFeatures) && supportedFeatures > 0) {
    return (supportedFeatures & 1) !== 0;
  }
  return typeof attributes.temperature === "number"
    || !("target_temp_low" in attributes && "target_temp_high" in attributes);
}

export function climateSupportsRangeTarget(state?: HassState): boolean {
  const attributes = state?.attributes;
  if (!attributes) {
    return false;
  }
  const supportedFeatures = Number(attributes.supported_features ?? 0);
  if (Number.isFinite(supportedFeatures) && supportedFeatures > 0) {
    return (supportedFeatures & 2) !== 0;
  }
  return typeof attributes.target_temp_low === "number"
    && Number.isFinite(attributes.target_temp_low)
    && typeof attributes.target_temp_high === "number"
    && Number.isFinite(attributes.target_temp_high);
}

/** Whether the entity accepts only a pair of setpoints, regardless of HVAC mode. */
export function climateIsRangeOnly(state?: HassState): boolean {
  return climateSupportsRangeTarget(state) && !climateSupportsSingleTarget(state);
}

export function climateRangeModeCompatible(state: HassState | undefined, mode?: string, policy?: TargetFormatPolicy): boolean {
  if (policy && mode) return policy.formats_by_mode[mode] === "range";
  return climateSupportsRangeTarget(state) && Boolean(mode)
    && (mode === "heat_cool" || (climateIsRangeOnly(state) && ["heat", "cool", "auto"].includes(mode!)));
}

export function climateRequiresRangeTarget(state?: HassState, requestedMode?: string, policy?: TargetFormatPolicy): boolean {
  if (policy) return policy.formats_by_mode[requestedMode || state?.state || ""] === "range";
  return climateSupportsRangeTarget(state)
    && (climateIsRangeOnly(state) || (requestedMode || state?.state) === "heat_cool");
}

export function effectiveClimateHvacModeForEnsureOn(
  state?: HassState,
  requestedMode?: string,
  target: "scalar" | "range" = "scalar",
  policy?: TargetFormatPolicy,
): string | undefined {
  if (requestedMode) return requestedMode;
  if (!state) return undefined;
  if (state.state !== "off") return state.state;
  const modes = climateSupportedModes(state).filter((mode) => mode !== "off");
  if (policy) {
    const format = target === "scalar" ? "single" : "range";
    if (target === "range" && policy.kind === "mixed" && modes.includes("heat_cool")
      && policy.formats_by_mode.heat_cool === "range") return "heat_cool";
    return modes.find((mode) => policy.formats_by_mode[mode] === format)
      ?? (target === "scalar" ? modes[0] : undefined);
  }
  if (target === "range" && !climateIsRangeOnly(state) && modes.includes("heat_cool")
    && climateRangeModeCompatible(state, "heat_cool")) return "heat_cool";
  return modes.find((mode) => target === "range"
    ? climateRangeModeCompatible(state, mode)
    : !climateRequiresRangeTarget(state, mode)
      && (mode !== "heat_cool" || climateSupportsSingleTarget(state)));
}

/** Configuration is independent of the transient live mode; delivery validates it again. */
export function configurationTargetFormatPolicy(state: HassState | undefined, policy: TargetFormatPolicy): TargetFormatPolicy {
  if (policy.kind !== "unknown" || !state) return policy;
  const attributes = state.attributes ?? {};
  const features = Number(attributes.supported_features ?? 0);
  const single = features ? (features & 1) !== 0 : "temperature" in attributes;
  const range = features ? (features & 2) !== 0 : "target_temp_low" in attributes && "target_temp_high" in attributes;
  const modes = climateSupportedModes(state).filter((mode) => mode !== "off");
  const kind = single && range ? "mixed" : single ? "single" : range ? "range" : "unknown";
  const selected = policy.configured_modes ?? (modes.includes("heat_cool") ? ["heat_cool"] : []);
  const formats: TargetFormatPolicy["formats_by_mode"] = Object.fromEntries(modes.map((mode) => [mode,
    kind === "mixed" ? selected.includes(mode) ? "range" : "single"
      : kind === "range" ? ["heat", "cool", "auto", "heat_cool"].includes(mode) ? "range" : "unknown"
        : kind === "single" ? "single" : "unknown",
  ]));
  const invalidModes = selected.filter((mode) => !modes.includes(mode));
  return { ...policy, kind, formats_by_mode: formats, range_modes: modes.filter((mode) => formats[mode] === "range"),
    invalid_modes: invalidModes, uncertain: kind === "unknown" || !modes.length || !!invalidModes.length };
}

export function climateTargetCompatibleForConfiguration(
  state: HassState | undefined,
  target: "scalar" | "range",
  requestedMode?: string,
  policy?: TargetFormatPolicy,
): boolean {
  if (policy) {
    policy = configurationTargetFormatPolicy(state, policy);
    // Some integrations expose their scalar feature only after being turned on.
    if (policy.kind === "unknown" && state?.state === "off" && target === "scalar") {
      const modes = climateSupportedModes(state);
      return requestedMode ? modes.includes(requestedMode) && !["off", "heat_cool"].includes(requestedMode)
        : modes.some((mode) => !["off", "heat_cool"].includes(mode));
    }
    const format = target === "scalar" ? "single" : "range";
    return requestedMode ? policy.formats_by_mode[requestedMode] === format
      : Object.values(policy.formats_by_mode).includes(format);
  }
  const modes = climateSupportedModes(state);
  const compatible = (mode: string): boolean => target === "range"
    ? climateRangeModeCompatible(state, mode)
    : mode !== "off" && !climateRequiresRangeTarget(state, mode)
      && (climateSupportsSingleTarget(state) || (state?.state === "off" && mode !== "heat_cool"));
  return requestedMode
    ? modes.includes(requestedMode) && compatible(requestedMode)
    : modes.some(compatible);
}

export function climateFanModeOptions(state?: HassState): string[] {
  return stringArrayAttribute(state, "fan_modes");
}

export function climatePresetModeOptions(state?: HassState): string[] {
  return stringArrayAttribute(state, "preset_modes");
}

export function climateSwingModeOptions(state?: HassState): string[] {
  return stringArrayAttribute(state, "swing_modes");
}

export function climateSwingHorizontalModeOptions(state?: HassState): string[] {
  return stringArrayAttribute(state, "swing_horizontal_modes");
}

export function climateHumidityLimits(state?: HassState): [number, number] | undefined {
  const minHumidity = coerceNumber(state?.attributes?.min_humidity, Number.NaN);
  const maxHumidity = coerceNumber(state?.attributes?.max_humidity, Number.NaN);
  if (
    !Number.isFinite(minHumidity) &&
    !Number.isFinite(maxHumidity) &&
    typeof state?.attributes?.humidity !== "number"
  ) {
    return undefined;
  }
  const minimum = Number.isFinite(minHumidity) ? minHumidity : 0;
  const maximum = Number.isFinite(maxHumidity) ? maxHumidity : 100;
  return minimum < maximum ? [minimum, maximum] : undefined;
}

export function uniqueKnownHvacModes(modes: string[]): string[] {
  const supportedModes = new Set(modes);
  return HVAC_MODES.filter((mode) => supportedModes.has(mode));
}

export function climateCapabilities(state?: HassState): ClimateCapability[] {
  const attributes = state?.attributes ?? {};
  const items: ClimateCapability[] = [];

  if (typeof attributes.current_temperature === "number") {
    items.push({ icon: "mdi:thermometer", labelKey: "currentTemperature" });
  }
  if (typeof attributes.temperature === "number") {
    items.push({ icon: "mdi:thermostat", labelKey: "targetTemperature" });
  }
  if (typeof attributes.current_humidity === "number" || typeof attributes.humidity === "number") {
    items.push({ icon: "mdi:water-percent", labelKey: "currentHumidity" });
  }
  if (Array.isArray(attributes.preset_modes) && attributes.preset_modes.length) {
    items.push({ icon: "mdi:tune-variant", labelKey: "supportedPresetModes" });
  }
  if (Array.isArray(attributes.fan_modes) && attributes.fan_modes.length) {
    items.push({ icon: "mdi:fan", labelKey: "supportedFanModes" });
  }
  if (Array.isArray(attributes.swing_modes) && attributes.swing_modes.length) {
    items.push({ icon: "mdi:swap-vertical", labelKey: "supportedSwingModes" });
  }
  if (Array.isArray(attributes.swing_horizontal_modes) && attributes.swing_horizontal_modes.length) {
    items.push({ icon: "mdi:swap-horizontal", labelKey: "supportedHorizontalSwingModes" });
  }
  if (typeof attributes.target_temp_low === "number" || typeof attributes.target_temp_high === "number") {
    items.push({ icon: "mdi:thermometer-lines", labelKey: "temperatureRange" });
  }

  return items;
}

function coerceNumber(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function isFahrenheit(unit?: string): boolean {
  return String(unit ?? "").toUpperCase().includes("F");
}

function gridLooksStaleForUnit(minimum: number, maximum: number, unit?: string): boolean {
  return isFahrenheit(unit)
    ? maximum <= 60 && minimum < 40
    : Boolean(unit) && (maximum > 60 || minimum > 40);
}

function reportedTemperatureGridUnit(
  state: HassState | undefined,
  targetUnit: string | undefined,
): string | undefined {
  const reportedUnit = state?.attributes?.unit_of_measurement;
  if (/^[°]?[cf]$/i.test(String(reportedUnit ?? "").trim())) {
    return String(reportedUnit);
  }
  const minimum = coerceNumber(state?.attributes?.min_temp, Number.NaN);
  const maximum = coerceNumber(state?.attributes?.max_temp, Number.NaN);
  if (
    !targetUnit
    || !Number.isFinite(minimum)
    || !Number.isFinite(maximum)
    || !gridLooksStaleForUnit(minimum, maximum, targetUnit)
  ) {
    return targetUnit;
  }
  return isFahrenheit(targetUnit) ? "°C" : "°F";
}

function stringArrayAttribute(state: HassState | undefined, attribute: string): string[] {
  const value = state?.attributes?.[attribute as keyof NonNullable<HassState["attributes"]>];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
