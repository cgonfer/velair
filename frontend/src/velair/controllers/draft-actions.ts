import { WEEKDAYS } from "../constants";
import { nextStartTime } from "../schedule-time";
import {
  addDraftBlock,
  removeDraftBlock as removeDraftBlockDomain,
  updateDraftBlock as updateDraftBlockDomain,
} from "../domain/draft-blocks";
import { toggleSetValue } from "../domain/settings";
import { sortDraftBlocksByStart } from "../domain/timeline";
import type { BlockDraftSource, DraftScheduleBlock, ScheduleResponse } from "../types";

type DraftActionsHost = {
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
};

export function asDraftActionsHost(host: unknown): DraftActionsHost {
  return host as DraftActionsHost;
}

export function addBlock(host: DraftActionsHost, source: BlockDraftSource = "schedule"): void {
  const blocks = host._blocksForSource(source);
  host._setBlocksForSource(source, addDraftBlock(blocks, nextStartTime(blocks.at(-1)?.start)));
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

  host._setBlocksForSource(source, updateDraftBlockDomain(blocks, index, field, value));
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
