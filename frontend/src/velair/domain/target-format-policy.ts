import { controlUnitId } from "./control-units";
import type { DraftScheduleBlock, HassState, ScheduleResponse, TargetFormat, TargetFormatPolicy } from "../types";
import { climateIsRangeOnly, climateSupportedModes, climateSupportsRangeTarget, configurationTargetFormatPolicy } from "./climate";

export type TargetFormatChoice = { formats: TargetFormat[]; uncertain: boolean; preferred: TargetFormat };

/** Backend policies are authoritative. The fallback supports older snapshots only. */
export function targetFormatsForEntity(data: ScheduleResponse | undefined, entityId: string, state?: HassState, mode?: string): TargetFormatChoice {
  entityId = controlUnitId(data, entityId);
  state = data?.control_unit_states?.[entityId] ?? state;
  const policy = data?.zones?.[entityId]?.target_format_policy;
  if (policy) return targetFormatsForPolicy(configurationTargetFormatPolicy(state, policy), mode);
  if (climateIsRangeOnly(state)) return { formats: ["range"], uncertain: false, preferred: "range" };
  const modes = mode ? [mode] : climateSupportedModes(state).filter((item) => item !== "off");
  const formats: TargetFormat[] = [...new Set(modes.map((item): TargetFormat => climateIsRangeOnly(state)
    || (item === "heat_cool" && climateSupportsRangeTarget(state)) ? "range" : "single"))];
  if (!formats.length) formats.push(...(climateIsRangeOnly(state) ? ["range" as const] : ["single" as const]));
  const features = Number(state?.attributes?.supported_features ?? 0);
  const reportedTarget = Number.isFinite(features) && features > 0
    || typeof state?.attributes?.temperature === "number" || climateSupportsRangeTarget(state);
  return { formats, uncertain: !state || !climateSupportedModes(state).length || !reportedTarget, preferred: formats.includes("single") ? "single" : "range" };
}

export function targetFormatsForPolicy(policy: TargetFormatPolicy, mode?: string): TargetFormatChoice {
  if (policy.kind === "single" || policy.kind === "range") {
    return { formats: [policy.kind], uncertain: false, preferred: policy.kind };
  }
  const values = mode ? [policy.formats_by_mode[mode] ?? "unknown"] : Object.values(policy.formats_by_mode);
  const formats = [...new Set(values.filter((value): value is TargetFormat => value === "single" || value === "range"))];
  const uncertain = policy.uncertain || values.includes("unknown") || !formats.length;
  if (!formats.length) formats.push("single", "range");
  return { formats, uncertain, preferred: formats.includes("single") ? "single" : "range" };
}

/** Only climates offering the requested mode participate in generic unanimity. */
export function targetFormatsForResource(data: ScheduleResponse | undefined, states: Record<string, HassState> | undefined, mode?: string): TargetFormatChoice {
  const choices = (data?.configured_entities ?? Object.keys(data?.zones ?? {})).flatMap((entityId) => {
    const policy = data?.zones?.[entityId]?.target_format_policy;
    const state = data?.control_unit_states?.[entityId] ?? states?.[entityId];
    const modes = policy ? Object.keys(policy.formats_by_mode) : climateSupportedModes(state);
    if (mode && modes.length && !modes.includes(mode)) return [];
    if (!modes.length) return [{ formats: ["single", "range"] as TargetFormat[], uncertain: true, preferred: "single" as const }];
    return [targetFormatsForEntity(data, entityId, state, mode)];
  });
  const formats = [...new Set(choices.flatMap((choice) => choice.formats))];
  const uncertain = !choices.length || choices.some((choice) => choice.uncertain);
  if (uncertain) {
    if (!formats.includes("single")) formats.push("single");
    if (!formats.includes("range")) formats.push("range");
  }
  return { formats, uncertain, preferred: mode === "heat_cool" && formats.includes("range") ? "range" : formats.includes("single") ? "single" : "range" };
}

export function editorTargetFormats(data: ScheduleResponse | undefined, states: Record<string, HassState> | undefined, entityId: string | undefined, mode?: string): TargetFormatChoice {
  return entityId ? targetFormatsForEntity(data, entityId, states?.[entityId], mode)
    : targetFormatsForResource(data, states, mode);
}

type TargetDraft = Pick<DraftScheduleBlock, "temperature" | "target_temp_low" | "target_temp_high">;
const targetDraftCache = Symbol("target-format-drafts");
type CachedDraft = DraftScheduleBlock & { [targetDraftCache]?: Partial<Record<TargetFormat, TargetDraft>> };

/** Alternate targets are editor-only and never enter a serialized schedule. */
export function changeDraftTargetFormat(block: DraftScheduleBlock, format: TargetFormat): DraftScheduleBlock {
  const current: TargetFormat = block.target_temp_low !== undefined || block.target_temp_high !== undefined ? "range" : "single";
  if (current === format) return block;
  const cache = { ...(block as CachedDraft)[targetDraftCache], [current]: current === "range"
    ? { target_temp_low: block.target_temp_low, target_temp_high: block.target_temp_high }
    : { temperature: block.temperature } };
  const { temperature: _single, target_temp_low: _low, target_temp_high: _high, ...rest } = block;
  const target = cache[format] ?? (format === "range" ? { target_temp_low: "", target_temp_high: "" } : { temperature: "" });
  const result = { ...rest, ...target };
  (result as CachedDraft)[targetDraftCache] = cache;
  return result;
}

export function carryTargetDraft(previous: DraftScheduleBlock, next: DraftScheduleBlock): DraftScheduleBlock {
  const cache = (previous as CachedDraft)[targetDraftCache];
  if (cache) (next as CachedDraft)[targetDraftCache] = cache;
  return next;
}

/** Profile group copies must retain editor caches that structuredClone omits. */
export function cloneWithTargetDrafts<T>(value: T): T {
  const result = structuredClone(value);
  const restore = (source: unknown, target: unknown): void => {
    if (!source || !target || typeof source !== "object" || typeof target !== "object") return;
    carryTargetDraft(source as DraftScheduleBlock, target as DraftScheduleBlock);
    for (const key of Object.keys(source)) restore((source as Record<string, unknown>)[key], (target as Record<string, unknown>)[key]);
  };
  restore(value, result);
  return result;
}

export function reconcileDraftTargetFormat(previous: DraftScheduleBlock, next: DraftScheduleBlock, choice: TargetFormatChoice): DraftScheduleBlock {
  carryTargetDraft(previous, next);
  return choice.formats.length === 1 && !choice.uncertain ? changeDraftTargetFormat(next, choice.formats[0]) : next;
}

/** Reuse actual observed limits only for a new, exclusive-range climate draft. */
export function initializeDraftTargetFormat(block: DraftScheduleBlock, choice: TargetFormatChoice, state?: HassState): DraftScheduleBlock {
  if (choice.uncertain || choice.formats.length !== 1) return block;
  const formatted = changeDraftTargetFormat(block, choice.formats[0]);
  const low = state?.attributes?.target_temp_low;
  const high = state?.attributes?.target_temp_high;
  return formatted !== block && choice.formats[0] === "range" && climateIsRangeOnly(state)
    && typeof low === "number" && Number.isFinite(low) && typeof high === "number" && Number.isFinite(high) && low <= high
    ? { ...formatted, target_temp_low: low, target_temp_high: high }
    : formatted;
}
