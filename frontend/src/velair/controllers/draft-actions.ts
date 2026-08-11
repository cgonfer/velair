import { WEEKDAYS } from "../constants";
import { nextStartTime } from "../schedule-time";
import {
  addDraftBlock,
  removeDraftBlock as removeDraftBlockDomain,
  updateDraftBlock as updateDraftBlockDomain,
} from "../domain/draft-blocks";
import { toggleSetValue } from "../domain/settings";
import { climateSupportsRangeTarget, climateSupportsSingleTarget } from "../domain/climate";
import { draftBlockUsesRange } from "../domain/draft-blocks";
import { sortDraftBlocksByStart } from "../domain/timeline";
import type { BlockDraftSource, DraftScheduleBlock, ScheduleResponse } from "../types";

type DraftActionsHost = {
  readonly hass?: import("../types").HomeAssistant;
  _copyTargets: Set<string>;
  _data?: ScheduleResponse;
  _dirty: boolean;
  _dirtyEntityId?: string;
  _saveMessage?: string;
  _selectedEntity?: string;
  _selectedWeekday: string;
  _zoneTargets: Set<string>;
  _blocksForSource(source: BlockDraftSource): DraftScheduleBlock[];
  _markBlocksDirty(source: BlockDraftSource): void;
  _setBlocksForSource(source: BlockDraftSource, blocks: DraftScheduleBlock[]): void;
  _temperatureUnit(entityId?: string): string;
};

export function asDraftActionsHost(host: unknown): DraftActionsHost {
  return host as DraftActionsHost;
}

export function addBlock(host: DraftActionsHost, source: BlockDraftSource = "schedule"): void {
  const blocks = host._blocksForSource(source);
  const unit = host._temperatureUnit(source === "schedule" ? host._selectedEntity : undefined);
  let updated = addDraftBlock(blocks, nextStartTime(blocks.at(-1)?.start), unit);
  const state = source === "schedule" && host._selectedEntity
    ? host.hass?.states?.[host._selectedEntity]
    : undefined;
  if (!blocks.length && climateSupportsRangeTarget(state) && !climateSupportsSingleTarget(state)) {
    updated = updated.map((block, index) => index === updated.length - 1 ? {
      ...block,
      temperature: undefined,
      target_temp_low: state?.attributes?.target_temp_low ?? "",
      target_temp_high: state?.attributes?.target_temp_high ?? "",
    } : block);
  }
  host._setBlocksForSource(source, updated);
  host._markBlocksDirty(source);
  host._saveMessage = undefined;
}

export function removeBlock(host: DraftActionsHost, index: number, source: BlockDraftSource = "schedule"): void {
  host._setBlocksForSource(source, removeDraftBlockDomain(host._blocksForSource(source), index));
  host._markBlocksDirty(source);
  host._saveMessage = undefined;
}

export function updateDraftBlock(
  host: DraftActionsHost,
  index: number,
  field: keyof DraftScheduleBlock,
  value: string,
  source: BlockDraftSource = "schedule",
): void {
  const blocks = host._blocksForSource(source);
  if (!blocks[index]) {
    return;
  }

  let updated = updateDraftBlockDomain(blocks, index, field, value);
  if (field === "hvac_mode") {
    const previous = blocks[index];
    const state = source === "schedule" && host._selectedEntity
      ? host.hass?.states?.[host._selectedEntity]
      : undefined;
    const supportsRange = source === "template" || climateSupportsRangeTarget(state);
    if (value === "heat_cool" && previous.hvac_mode !== "heat_cool" && supportsRange && !draftBlockUsesRange(previous)) {
      updated = updated.map((block, blockIndex) => blockIndex === index ? {
        ...block,
        temperature: undefined,
        target_temp_low: state?.attributes?.target_temp_low ?? "",
        target_temp_high: state?.attributes?.target_temp_high ?? "",
      } : block);
    } else if (
      value !== ""
      && value !== "heat_cool"
      && draftBlockUsesRange(previous)
    ) {
      updated = updated.map((block, blockIndex) => blockIndex === index ? {
        ...block,
        target_temp_low: undefined,
        target_temp_high: undefined,
        temperature: state?.attributes?.temperature ?? "",
      } : block);
    }
  }
  host._setBlocksForSource(source, updated);
  host._markBlocksDirty(source);
  host._saveMessage = undefined;
}

export function markDirty(host: DraftActionsHost): void {
  host._dirty = true;
  host._dirtyEntityId = host._selectedEntity;
}

export function setDraftBlockStart(
  host: DraftActionsHost,
  index: number,
  start: string,
  options: { sort?: boolean } = {},
  source: BlockDraftSource = "schedule",
): void {
  const blocks = host._blocksForSource(source);
  if (!blocks[index]) {
    return;
  }

  host._setBlocksForSource(source, blocks.map((block: DraftScheduleBlock, blockIndex: number) =>
    blockIndex === index ? { ...block, start } : block,
  ));
  if (options.sort) {
    host._setBlocksForSource(source, sortDraftBlocksByStart(host._blocksForSource(source)));
  }
  host._markBlocksDirty(source);
  host._saveMessage = undefined;
}

export function toggleCopyTarget(host: DraftActionsHost, weekday: string, checked: boolean): void {
  if (!WEEKDAYS.includes(weekday) || weekday === host._selectedWeekday) {
    return;
  }

  host._copyTargets = toggleSetValue(host._copyTargets, weekday, checked);
  host._saveMessage = undefined;
}

export function toggleZoneTarget(host: DraftActionsHost, entityId: string, checked: boolean): void {
  const configuredEntities = host._data?.configured_entities ?? [];
  if (!configuredEntities.includes(entityId) || entityId === host._selectedEntity) {
    return;
  }

  host._zoneTargets = toggleSetValue(host._zoneTargets, entityId, checked);
  host._saveMessage = undefined;
}
