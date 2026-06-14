import { WEEKDAYS } from "../constants";
import type { VelairApiClient } from "../api/client";
import { draftBlocksFromScheduleBlocks } from "../domain/draft-blocks";
import type {
  BlockDraftSource,
  DraftScheduleBlock,
  ScheduleResponse,
  ScheduleTemplate,
  VelairCardConfig,
} from "../types";

type ScheduleStateHost = {
  _config: VelairCardConfig;
  _copyTargets: Set<string>;
  _data?: ScheduleResponse;
  _dirty: boolean;
  _dirtyEntityId?: string;
  _draftBlocks: DraftScheduleBlock[];
  _error?: string;
  _hasExternalConfig: boolean;
  _loading: boolean;
  _saveMessage?: string;
  _selectedEntity?: string;
  _selectedTemplateKey: string;
  _selectedWeekday: string;
  _subscribing: boolean;
  _templateDirty: boolean;
  _templateDraftBlocks: DraftScheduleBlock[];
  _templateDraftKey: string;
  _unsubscribeUpdates?: () => Promise<void> | void;
  _zoneTargets: Set<string>;
  _api(): VelairApiClient | undefined;
  _applyScheduleData(data: ScheduleResponse, options?: { forceDraft?: boolean }): void;
  _loadSchedule(): Promise<void>;
  _markDirty(): void;
  _orderedZoneIds(entityIds: string[]): string[];
  _resetDraftBlocks(): void;
  _resetTemplateDraft(template?: ScheduleTemplate): void;
  _scheduleTemplates(): ScheduleTemplate[];
  _syncPauseTick(): void;
  _t(key: string): string;
};

export function asScheduleStateHost(host: unknown): ScheduleStateHost {
  return host as ScheduleStateHost;
}

export async function loadSchedule(host: ScheduleStateHost): Promise<void> {
  const api = host._api();
  if (!api || host._loading) {
    return;
  }

  host._loading = true;
  host._error = undefined;
  try {
    const data = await api.getSchedule();
    host._applyScheduleData(data);
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableLoad");
  } finally {
    host._loading = false;
  }
}

export async function subscribeUpdates(host: ScheduleStateHost): Promise<void> {
  const api = host._api();
  if (!api || host._unsubscribeUpdates || host._subscribing) {
    return;
  }

  host._subscribing = true;
  try {
    host._unsubscribeUpdates = await api.subscribeUpdates((message: { loaded?: boolean; schedule?: ScheduleResponse }) => {
      if (!message.loaded || !message.schedule) {
        void host._loadSchedule();
        return;
      }

      host._applyScheduleData(message.schedule);
    });
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableSubscribe");
  } finally {
    host._subscribing = false;
  }
}

export function applyScheduleData(
  host: ScheduleStateHost,
  data: ScheduleResponse,
  options: { forceDraft?: boolean } = {},
): void {
  const isInitialDataLoad = !host._data;
  host._data = data;
  if (!host._hasExternalConfig) {
    host._config = {
      first_weekday: data.settings.first_weekday,
      zone_order: data.settings.zone_order,
    };
  }
  if (isInitialDataLoad) {
    host._selectedWeekday = data.settings.first_weekday;
  }
  const zoneIds = host._orderedZoneIds(data.configured_entities);
  if (!host._selectedEntity || !data.configured_entities.includes(host._selectedEntity)) {
    host._selectedEntity = zoneIds[0];
  }
  if (host._selectedTemplateKey && !host._scheduleTemplates().some((template: { key: string }) => template.key === host._selectedTemplateKey)) {
    host._selectedTemplateKey = "";
  }
  const selectedTemplate = host._scheduleTemplates().find((template: { key: string }) => template.key === host._selectedTemplateKey);
  if (!selectedTemplate) {
    host._resetTemplateDraft();
  } else if (!host._templateDirty || host._templateDraftKey !== selectedTemplate.key) {
    host._resetTemplateDraft(selectedTemplate);
  }

  host._syncPauseTick();

  if (options.forceDraft || !host._dirty) {
    host._resetDraftBlocks();
  }
}

export function resetDraftBlocks(host: ScheduleStateHost): void {
  const zone = host._selectedEntity ? host._data?.zones[host._selectedEntity] : undefined;
  const blocks = zone?.schedule?.[host._selectedWeekday] ?? [];
  host._draftBlocks = draftBlocksFromScheduleBlocks(blocks);
  host._dirty = false;
  host._dirtyEntityId = undefined;
}

export function selectEntity(host: ScheduleStateHost, entityId: string): void {
  host._selectedEntity = entityId;
  host._saveMessage = undefined;
  host._copyTargets = new Set();
  host._zoneTargets = new Set();
  host._resetDraftBlocks();
}

export function selectWeekday(host: ScheduleStateHost, weekday: string): void {
  if (!WEEKDAYS.includes(weekday)) {
    return;
  }

  host._selectedWeekday = weekday;
  host._saveMessage = undefined;
  host._copyTargets = new Set();
  host._zoneTargets = new Set();
  host._resetDraftBlocks();
}

export function blocksForSource(host: ScheduleStateHost, source: BlockDraftSource): DraftScheduleBlock[] {
  return source === "template" ? host._templateDraftBlocks : host._draftBlocks;
}

export function setBlocksForSource(
  host: ScheduleStateHost,
  source: BlockDraftSource,
  blocks: DraftScheduleBlock[],
): void {
  if (source === "template") {
    host._templateDraftBlocks = blocks;
    return;
  }

  host._draftBlocks = blocks;
}

export function markBlocksDirty(host: ScheduleStateHost, source: BlockDraftSource): void {
  if (source === "template") {
    host._templateDirty = true;
    return;
  }

  host._markDirty();
}
