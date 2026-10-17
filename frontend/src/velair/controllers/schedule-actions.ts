import { selectedDayGroup, schedulesEqual } from "../domain/day-layouts";
import { backendErrorMessage } from "../domain/backend-errors";
import {
  clampBlocksToTemperatureLimits,
  filterBlocksForClimateOptions,
  firstUnsupportedModeBlock,
  normalizeDraftBlocks as normalizeDraftBlocksDomain,
  UnsupportedClimateOptionsError,
} from "../domain/draft-blocks";
import {
  climateTargetCompatibleForConfiguration,
} from "../domain/climate";
import { ACTION_SET_TEMPERATURE } from "../constants";
import { bindingsFromBlocks } from "../domain/linked-schedules";
import type { VelairApiClient } from "../api/client";
import type {
  BlockDraftSource,
  DraftScheduleBlock,
  NormalizedBlocks,
  ScheduleBlock,
  ScheduleResponse,
  HomeAssistant,
} from "../types";

type ScheduleActionsHost = {
  _draftSavedDayLayoutKey?: string;
  _draftDayLayoutKey?: string;
  _layoutOnlyDirty?: boolean;
  _dayLayoutConflict?: boolean;
  _groupBaseChosen?: boolean;
  _draftTemplateLink?: import("../types").TemplateLink;
  _draftConfigurationRevision?: number;
  hass?: HomeAssistant;
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
  _isScheduleResponseCurrent?(data: ScheduleResponse): boolean;
  _blocksForSource(source: BlockDraftSource): DraftScheduleBlock[];
  _clampBlocksForEntity(blocks: ScheduleBlock[], entityId: string): ScheduleBlock[];
  _climateSupportedModes(entityId: string): string[];
  _entityFanModeOptions(entityId: string): string[];
  _entityHumidityLimits(entityId: string): [number, number] | undefined;
  _entityPresetModeOptions(entityId: string): string[];
  _entitySwingHorizontalModeOptions(entityId: string): string[];
  _entitySwingModeOptions(entityId: string): string[];
  _entityTemperatureLimits(entityId?: string): [number, number];
  _friendlyEntityName(entityId: string): string;
  _modeLabel(mode: string): string;
  _normalizeDraftBlocks(source?: BlockDraftSource): NormalizedBlocks;
  _showSuccess(message: string): void;
  _t(key: string, replacements?: Record<string, string | number>): string;
  _temperatureError(block: DraftScheduleBlock, source?: BlockDraftSource): string | undefined;
  _unsupportedModeError(blocks: Array<ScheduleBlock | DraftScheduleBlock>, entityId: string): string | undefined;
};

export function asScheduleActionsHost(host: unknown): ScheduleActionsHost {
  return host as ScheduleActionsHost;
}

function confirmGroupedSave(host: ScheduleActionsHost): boolean {
  if (host._dayLayoutConflict) { host._error = host._t("dayLayoutConflict"); return false; }
  const days = selectedDayGroup(host._draftDayLayoutKey, host._selectedWeekday);
  const zone = host._data?.zones[host._selectedEntity ?? ""];
  const mixed = Boolean(zone && !schedulesEqual(zone, days));
  return !mixed || Boolean(host._groupBaseChosen);
}

async function saveDraftDay(host: ScheduleActionsHost, api: VelairApiClient, blocks: ScheduleBlock[]): Promise<ScheduleResponse> {
  if (host._draftDayLayoutKey !== undefined && host._data?.configuration_revision !== undefined
    && (host._layoutOnlyDirty || selectedDayGroup(host._draftDayLayoutKey, host._selectedWeekday).length > 1
      || host._draftDayLayoutKey !== (host._data.zones[host._selectedEntity!]?.day_layout_key ?? "individual"))) {
    const days = selectedDayGroup(host._draftDayLayoutKey, host._selectedWeekday);
    return api.setScheduleDays(host._selectedEntity!, {
      expected_revision: host._draftConfigurationRevision ?? host._data.configuration_revision,
      day_layout_key: host._draftDayLayoutKey,
      ...(!host._layoutOnlyDirty ? { weekdays: days,
        ...(host._draftTemplateLink ? { template_link: bindingsFromBlocks(host._draftTemplateLink, blocks) } : {
          blocks: blocks.map(({ slot_id: _slot, ...block }) => block),
          unlink_template: days.some((day) => Boolean(host._data?.zones[host._selectedEntity!]?.template_links?.[day])),
        }),
      } : {}),
    });
  }
  if (host._data?.configuration_revision === undefined && !host._draftTemplateLink) return api.setDailySchedule(host._selectedEntity!, host._selectedWeekday, blocks);
  return api.setDailySchedule(host._selectedEntity!, host._selectedWeekday, blocks.map(({ slot_id: _slot, ...block }) => block), {
    expected_revision: host._draftConfigurationRevision,
    ...(host._draftTemplateLink ? { template_link: bindingsFromBlocks(host._draftTemplateLink, blocks) } : { unlink_template: Boolean(host._data?.zones[host._selectedEntity!]?.template_links?.[host._selectedWeekday]) }),
  });
}

export async function saveSelectedDay(host: ScheduleActionsHost): Promise<void> {
  const api = host._api();
  if (!api || !host._selectedEntity || host._saving) {
    return;
  }

  if (!confirmGroupedSave(host)) return;
  const normalized = host._layoutOnlyDirty || host._draftTemplateLink?.mode === "full" ? { ok: true as const, blocks: [] } : host._normalizeDraftBlocks();
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
    // The atomic mutation validates references and capabilities against its revision.
    // Save does not consume preview data, so avoid an extra round trip per day.
    const data = await saveDraftDay(host, api, normalized.blocks);
    if (host._isScheduleResponseCurrent?.(data) === false) return;
    host._dirty = false;
    host._dirtyEntityId = undefined;
    host._applyScheduleData(data, { forceDraft: true });
    host._showSuccess(host._t("saved"));
  } catch (error) {
    host._error = backendErrorMessage(error, host._t("unableSave"));
  } finally {
    host._saving = false;
  }
}

export async function copySelectedDay(host: ScheduleActionsHost): Promise<void> {
  const api = host._api();
  if (!api || !host._selectedEntity || host._copying || host._copyTargets.size === 0) {
    return;
  }

  const normalized = host._draftTemplateLink?.mode === "full" ? { ok: true as const, blocks: [] } : host._normalizeDraftBlocks();
  if (!normalized.ok) {
    host._error = normalized.error;
    return;
  }
  const unsupportedModeError = host._unsupportedModeError(normalized.blocks, host._selectedEntity);
  if (unsupportedModeError) {
    host._error = unsupportedModeError;
    return;
  }

  if (host._dirty && !confirmGroupedSave(host)) return;
  const targetWeekdays = [...host._copyTargets];
  const sourceEntity = host._selectedEntity;
  const sourceDay = host._selectedWeekday;
  const context = () => JSON.stringify([host._selectedEntity, host._selectedWeekday,
    host._draftTemplateLink, host._draftBlocks, [...host._copyTargets]]);
  const originalContext = context();
  host._copying = true;
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    let revision = host._draftConfigurationRevision ?? host._data?.configuration_revision;
    if (host._dirty) {
      const saved = await saveDraftDay(host, api, normalized.blocks);
      if (host._isScheduleResponseCurrent?.(saved) === false) return;
      revision = saved.configuration_revision;
      if (context() !== originalContext) return;
      host._draftConfigurationRevision = revision;
    }

    if (context() !== originalContext) return;
    const data = await api.copyDaySchedule(sourceEntity, sourceDay, targetWeekdays,
      ...(revision !== undefined ? [{ expected_revision: revision }] : []));
    if (host._isScheduleResponseCurrent?.(data) === false) return;
    if (context() !== originalContext) return;
    host._dirty = false;
    host._dirtyEntityId = undefined;
    host._copyTargets = new Set();
    host._applyScheduleData(data, { forceDraft: true });
    host._showSuccess(host._t("appliedDays", {
      count: targetWeekdays.length,
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

  const normalized = host._draftTemplateLink?.mode === "full" ? { ok: true as const, blocks: [] } : host._normalizeDraftBlocks();
  if (!normalized.ok) {
    host._error = normalized.error;
    return;
  }
  if (host._dirty && !confirmGroupedSave(host)) return;
  const targetEntities = [...host._zoneTargets];
  const sourceEntity = host._selectedEntity;
  const sourceDay = host._selectedWeekday;
  const context = () => JSON.stringify([host._selectedEntity, host._selectedWeekday,
    host._draftTemplateLink, host._draftBlocks, [...host._zoneTargets]]);
  const originalContext = context();
  host._applyingZones = true;
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    let revision = host._draftConfigurationRevision ?? host._data?.configuration_revision;
    if (host._dirty) {
      const saved = await saveDraftDay(host, api, normalized.blocks);
      if (host._isScheduleResponseCurrent?.(saved) === false) return;
      revision = saved.configuration_revision;
      if (context() !== originalContext) return;
      host._draftConfigurationRevision = revision;
    }
    if (context() !== originalContext) return;
    const data = await api.copyDaySchedule(sourceEntity, sourceDay, selectedDayGroup(host._draftDayLayoutKey, sourceDay), {
      target_entity_ids: targetEntities,
      ...(revision !== undefined ? { expected_revision: revision } : {}),
    });
    if (host._isScheduleResponseCurrent?.(data) === false) return;
    if (context() !== originalContext) return;
    host._dirty = false;
    host._dirtyEntityId = undefined;
    host._zoneTargets = new Set();
    host._applyScheduleData(data, { forceDraft: true });
    host._showSuccess(host._t("appliedThermostats", { count: targetEntities.length }));
  } catch (error) {
    host._error = backendErrorMessage(error, host._t("unableApplyThermostats"));
  } finally {
    host._applyingZones = false;
  }
}

export function normalizeDraftBlocks(host: ScheduleActionsHost, source: BlockDraftSource = "schedule"): NormalizedBlocks {
  return normalizeDraftBlocksDomain(host._blocksForSource(source), {
    duplicateStartError: (start) => host._t("duplicateStart", { start }),
    invalidStartError: (start) => host._t("invalidStart", { start }),
    invalidTemperatureError: (start, error) => `${host._t("invalidTemperature", { start })}: ${error}`,
    invalidClimateOptionsError: (start, reason) => host._t(
      reason === "required" ? "climateOptionsRequiredAt" : "climateOptionsHumidityInvalidAt",
      { start },
    ),
    temperatureError: (block) => host._temperatureError(block, source),
  });
}

export function clampBlocksForEntity(
  host: ScheduleActionsHost,
  blocks: ScheduleBlock[],
  entityId: string,
): ScheduleBlock[] {
  const [minTemperature, maxTemperature] = host._entityTemperatureLimits(entityId);
  const clampedBlocks = clampBlocksToTemperatureLimits(blocks, minTemperature, maxTemperature);
  return filterBlocksForClimateOptions(clampedBlocks, {
    fanModes: host._entityFanModeOptions(entityId),
    humidityLimits: host._entityHumidityLimits(entityId),
    presetModes: host._entityPresetModeOptions(entityId),
    swingHorizontalModes: host._entitySwingHorizontalModeOptions(entityId),
    swingModes: host._entitySwingModeOptions(entityId),
  });
}

export function unsupportedModeError(
  host: ScheduleActionsHost,
  blocks: Array<ScheduleBlock | DraftScheduleBlock>,
  entityId: string,
): string | undefined {
  const execution = host._data?.zones?.[entityId]?.execution;
  if (execution?.type === "external" && blocks.some((block) => block.temperature_only)) {
    const capabilities = host._data?.external_execution?.systems.find((system) => system.provider === execution.provider)?.capabilities;
    if (!capabilities?.supports_temperature_only) return host._t("profileExternalUnsupportedBlock", { climate: host._friendlyEntityName(entityId) });
  }
  const state = host.hass?.states?.[entityId];
  const unsupportedRangeMode = blocks.find((block) =>
    block.action === ACTION_SET_TEMPERATURE
    && (block.target_temp_low !== undefined || block.target_temp_high !== undefined)
    && block.hvac_mode !== undefined
    && block.hvac_mode !== "heat_cool");
  if (unsupportedRangeMode?.hvac_mode) {
    return host._t("unsupportedModeForClimate", {
      entity: host._friendlyEntityName(entityId),
      mode: host._modeLabel(unsupportedRangeMode.hvac_mode),
      start: unsupportedRangeMode.start,
    });
  }
  const unsupportedRange = blocks.find((block) =>
    block.action === ACTION_SET_TEMPERATURE
    && (block.target_temp_low !== undefined || block.target_temp_high !== undefined)
    && !climateTargetCompatibleForConfiguration(state, "range", block.hvac_mode));
  if (unsupportedRange) {
    return host._t("unsupportedRangeTargetForClimate", {
      entity: host._friendlyEntityName(entityId),
      start: unsupportedRange.start,
    });
  }
  const unsupportedBlock = firstUnsupportedModeBlock(blocks, host._climateSupportedModes(entityId));
  if (unsupportedBlock?.hvac_mode) {
    return host._t("unsupportedModeForClimate", {
      entity: host._friendlyEntityName(entityId),
      mode: host._modeLabel(unsupportedBlock.hvac_mode),
      start: unsupportedBlock.start,
    });
  }
  const unsupportedScalar = blocks.find((block) =>
    block.action === ACTION_SET_TEMPERATURE
    && block.temperature !== undefined
    && !climateTargetCompatibleForConfiguration(state, "scalar", block.hvac_mode));
  return unsupportedScalar
    ? host._t("unsupportedSingleTargetForClimate", {
      entity: host._friendlyEntityName(entityId),
      start: unsupportedScalar.start,
    })
    : undefined;
}
