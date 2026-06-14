import {
  clampBlocksToTemperatureLimits,
  firstUnsupportedModeBlock,
  normalizeDraftBlocks as normalizeDraftBlocksDomain,
} from "../domain/draft-blocks";
import type { VelairApiClient } from "../api/client";
import type {
  BlockDraftSource,
  DraftScheduleBlock,
  NormalizedBlocks,
  ScheduleBlock,
  ScheduleResponse,
} from "../types";

type ScheduleActionsHost = {
  _applyingZones: boolean;
  _copying: boolean;
  _copyTargets: Set<string>;
  _data?: ScheduleResponse;
  _dirty: boolean;
  _dirtyEntityId?: string;
  _draftBlocks: DraftScheduleBlock[];
  _error?: string;
  _saveMessage?: string;
  _saving: boolean;
  _selectedEntity?: string;
  _selectedWeekday: string;
  _zoneTargets: Set<string>;
  _api(): VelairApiClient | undefined;
  _applyScheduleData(data: ScheduleResponse, options?: { forceDraft?: boolean }): void;
  _blocksForSource(source: BlockDraftSource): DraftScheduleBlock[];
  _clampBlocksForEntity(blocks: ScheduleBlock[], entityId: string): ScheduleBlock[];
  _climateSupportedModes(entityId: string): string[];
  _entityTemperatureLimits(entityId?: string): [number, number];
  _friendlyEntityName(entityId: string): string;
  _modeLabel(mode: string): string;
  _normalizeDraftBlocks(source?: BlockDraftSource): NormalizedBlocks;
  _showSuccess(message: string): void;
  _t(key: string, replacements?: Record<string, string | number>): string;
  _temperatureError(block: DraftScheduleBlock, source?: BlockDraftSource): string | undefined;
  _unsupportedModeError(blocks: Array<Pick<ScheduleBlock, "action" | "hvac_mode" | "start">>, entityId: string): string | undefined;
};

export function asScheduleActionsHost(host: unknown): ScheduleActionsHost {
  return host as ScheduleActionsHost;
}

export async function saveSelectedDay(host: ScheduleActionsHost): Promise<void> {
  const api = host._api();
  if (!api || !host._selectedEntity || host._saving) {
    return;
  }

  const normalized = host._normalizeDraftBlocks();
  if (!normalized.ok) {
    host._error = normalized.error;
    return;
  }
  const unsupportedModeError = host._unsupportedModeError(normalized.blocks, host._selectedEntity);
  if (unsupportedModeError) {
    host._error = unsupportedModeError;
    return;
  }

  host._saving = true;
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const data = await api.setDailySchedule(host._selectedEntity, host._selectedWeekday, normalized.blocks);
    host._dirty = false;
    host._dirtyEntityId = undefined;
    host._applyScheduleData(data, { forceDraft: true });
    host._showSuccess(host._t("saved"));
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableSave");
  } finally {
    host._saving = false;
  }
}

export async function copySelectedDay(host: ScheduleActionsHost): Promise<void> {
  const api = host._api();
  if (!api || !host._selectedEntity || host._copying || host._copyTargets.size === 0) {
    return;
  }

  const normalized = host._normalizeDraftBlocks();
  if (!normalized.ok) {
    host._error = normalized.error;
    return;
  }
  const unsupportedModeError = host._unsupportedModeError(normalized.blocks, host._selectedEntity);
  if (unsupportedModeError) {
    host._error = unsupportedModeError;
    return;
  }

  const targetWeekdays = [...host._copyTargets];
  host._copying = true;
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    if (host._dirty) {
      await api.setDailySchedule(host._selectedEntity, host._selectedWeekday, normalized.blocks);
    }

    const data = await api.copyDaySchedule(host._selectedEntity, host._selectedWeekday, targetWeekdays);
    host._dirty = false;
    host._dirtyEntityId = undefined;
    host._copyTargets = new Set();
    host._applyScheduleData(data, { forceDraft: true });
    host._showSuccess(host._t("appliedDays", {
      count: targetWeekdays.length,
      suffix: targetWeekdays.length === 1 ? "" : "s",
    }));
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableCopy");
  } finally {
    host._copying = false;
  }
}

export async function applySelectedDayToZones(host: ScheduleActionsHost): Promise<void> {
  const api = host._api();
  if (!api || !host._selectedEntity || host._applyingZones || host._zoneTargets.size === 0) {
    return;
  }

  const normalized = host._normalizeDraftBlocks();
  if (!normalized.ok) {
    host._error = normalized.error;
    return;
  }

  const targetEntities = [...host._zoneTargets];
  for (const entityId of targetEntities) {
    const unsupportedModeError = host._unsupportedModeError(normalized.blocks, entityId);
    if (unsupportedModeError) {
      host._error = unsupportedModeError;
      return;
    }
  }

  host._applyingZones = true;
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    let data: ScheduleResponse | undefined;
    if (host._dirty) {
      data = await api.setDailySchedule(host._selectedEntity, host._selectedWeekday, normalized.blocks);
    }

    for (const entityId of targetEntities) {
      data = await api.setDailySchedule(
        entityId,
        host._selectedWeekday,
        host._clampBlocksForEntity(normalized.blocks, entityId),
      );
    }

    host._dirty = false;
    host._dirtyEntityId = undefined;
    host._zoneTargets = new Set();
    if (data) {
      host._applyScheduleData(data, { forceDraft: true });
    }
    host._showSuccess(host._t("appliedThermostats", {
      count: targetEntities.length,
      suffix: targetEntities.length === 1 ? "" : "s",
    }));
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableApplyThermostats");
  } finally {
    host._applyingZones = false;
  }
}

export function normalizeDraftBlocks(host: ScheduleActionsHost, source: BlockDraftSource = "schedule"): NormalizedBlocks {
  return normalizeDraftBlocksDomain(host._blocksForSource(source), {
    duplicateStartError: (start) => host._t("duplicateStart", { start }),
    invalidStartError: (start) => host._t("invalidStart", { start }),
    invalidTemperatureError: (start, error) => `${host._t("invalidTemperature", { start })}: ${error}`,
    temperatureError: (block) => host._temperatureError(block, source),
  });
}

export function clampBlocksForEntity(
  host: ScheduleActionsHost,
  blocks: ScheduleBlock[],
  entityId: string,
): ScheduleBlock[] {
  const [minTemperature, maxTemperature] = host._entityTemperatureLimits(entityId);
  return clampBlocksToTemperatureLimits(blocks, minTemperature, maxTemperature);
}

export function unsupportedModeError(
  host: ScheduleActionsHost,
  blocks: Array<Pick<ScheduleBlock, "action" | "hvac_mode" | "start">>,
  entityId: string,
): string | undefined {
  const unsupportedBlock = firstUnsupportedModeBlock(blocks, host._climateSupportedModes(entityId));
  if (!unsupportedBlock?.hvac_mode) {
    return undefined;
  }

  return host._t("unsupportedModeForClimate", {
    entity: host._friendlyEntityName(entityId),
    mode: host._modeLabel(unsupportedBlock.hvac_mode),
    start: unsupportedBlock.start,
  });
}
