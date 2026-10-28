import { controlUnitState } from "../domain/control-units";
import { controlUnitIds } from "../domain/control-units";
import { WEEKDAYS } from "../constants";
import { newTemplateKey } from "../domain/templates";
import { nextStartTime } from "../schedule-time";
import {
  addDraftBlock,
  removeDraftBlock as removeDraftBlockDomain,
  updateDraftBlock as updateDraftBlockDomain,
} from "../domain/draft-blocks";
import { toggleSetValue } from "../domain/settings";
import { changeDraftTargetFormat, editorTargetFormats, initializeDraftTargetFormat, reconcileDraftTargetFormat } from "../domain/target-format-policy";
import { sortDraftBlocksByStart } from "../domain/timeline";
import { cloneDayPresetTargets, type CloneDayPreset } from "../domain/schedule-editor";
import type { BlockDraftSource, DraftScheduleBlock, ScheduleResponse } from "../types";

type DraftActionsHost = {
  _draftTemplateLink?: import("../types").TemplateLink;
  _targetFormatEntityId?: string;
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
  if (source === "schedule" && host._draftTemplateLink) return;
  const blocks = host._blocksForSource(source);
  const unit = host._temperatureUnit(source === "schedule" ? host._selectedEntity : undefined);
  let updated = addDraftBlock(blocks, nextStartTime(blocks.at(-1)?.start), unit);
  if (source === "template") {
    updated = updated.map((block, index) => index === updated.length - 1
      ? { ...block, slot_id: `slot_${newTemplateKey()}` } : block);
  }
  const added = updated.at(-1);
  if (added) {
    const entityId = host._targetFormatEntityId ?? (source === "schedule" ? host._selectedEntity : undefined);
    const choice = editorTargetFormats(host._data, host.hass?.states, entityId);
    updated[updated.length - 1] = initializeDraftTargetFormat(added, choice, entityId ? controlUnitState(host._data, host.hass, entityId) : undefined);
  }
  host._setBlocksForSource(source, updated);
  host._markBlocksDirty(source);
  host._saveMessage = undefined;
}

export function removeBlock(host: DraftActionsHost, index: number, source: BlockDraftSource = "schedule"): void {
  if (source === "schedule" && host._draftTemplateLink) return;
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
  if (source === "schedule" && host._draftTemplateLink && (field === "start" || host._draftTemplateLink.mode === "full")) return;
  const blocks = host._blocksForSource(source);
  if (!blocks[index]) {
    return;
  }

  let updated = updateDraftBlockDomain(blocks, index, field, value);
  updated = updated.map((block, blockIndex) => {
    if (blockIndex !== index) return block;
    const previous = blocks[index];
    if (field !== "hvac_mode") return block;
    const entityId = host._targetFormatEntityId ?? (source === "schedule" ? host._selectedEntity : undefined);
    const choice = editorTargetFormats(host._data, host.hass?.states, entityId, block.hvac_mode || undefined);
    return !entityId && block.hvac_mode === "heat_cool" && block.hvac_mode !== previous.hvac_mode
      ? changeDraftTargetFormat(block, choice.preferred)
      : reconcileDraftTargetFormat(previous, block, choice);
  });
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

export function setCopyTargetPreset(host: DraftActionsHost, preset: CloneDayPreset): void {
  host._copyTargets = cloneDayPresetTargets(preset, host._selectedWeekday);
  host._saveMessage = undefined;
}

export function toggleZoneTarget(host: DraftActionsHost, entityId: string, checked: boolean): void {
  const configuredEntities = controlUnitIds(host._data);
  if (!configuredEntities.includes(entityId) || entityId === host._selectedEntity) {
    return;
  }

  host._zoneTargets = toggleSetValue(host._zoneTargets, entityId, checked);
  host._saveMessage = undefined;
}
