import { ACTION_SET_CLIMATE_OPTIONS, ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../constants";
import { minutesFromTime } from "../schedule-time";
import type { DraftScheduleBlock, HassState } from "../types";
import { climateRequiresRangeTarget } from "./climate";
import { draftBlockUsesRange } from "./draft-blocks";

export type KeepTargetMismatch = {
  mode: string;
  source: "schedule" | "current";
  target: "scalar" | "range";
};

/**
 * A Keep block preserves the mode found at delivery time. A preceding explicit
 * schedule mode is a stronger hint than the climate's live mode, but neither
 * guarantees the mode that will be active when the block runs.
 */
export function keepTargetMismatch(
  block: DraftScheduleBlock,
  dayBlocks: DraftScheduleBlock[],
  state?: HassState,
): KeepTargetMismatch | undefined {
  if ((block.action || ACTION_SET_TEMPERATURE) !== ACTION_SET_TEMPERATURE || block.hvac_mode) {
    return undefined;
  }

  const minute = minutesFromTime(block.start);
  if (minute === undefined) {
    return undefined;
  }

  const earlier = dayBlocks
    .map((candidate) => ({ candidate, minute: minutesFromTime(candidate.start) }))
    .filter((entry): entry is { candidate: DraftScheduleBlock; minute: number } =>
      entry.minute !== undefined && entry.minute < minute)
    .sort((left, right) => right.minute - left.minute);

  let mode = state?.state;
  let source: KeepTargetMismatch["source"] = "current";
  for (const { candidate } of earlier) {
    if (candidate.action === ACTION_TURN_OFF || candidate.hvac_mode === "off") {
      // The following target will select a non-off mode at delivery time.
      return undefined;
    }
    if (candidate.action === ACTION_SET_CLIMATE_OPTIONS || !candidate.hvac_mode) {
      continue;
    }
    mode = candidate.hvac_mode;
    source = "schedule";
    break;
  }

  if (!mode || mode === "off") {
    return undefined;
  }

  const target = draftBlockUsesRange(block) ? "range" : "scalar";
  const incompatible = target === "range"
    ? mode !== "heat_cool"
    : state
      ? climateRequiresRangeTarget(state, mode)
      : mode === "heat_cool" && earlier.some(({ candidate }) =>
        (candidate.action || ACTION_SET_TEMPERATURE) === ACTION_SET_TEMPERATURE
        && draftBlockUsesRange(candidate));
  return incompatible ? { mode, source, target } : undefined;
}
