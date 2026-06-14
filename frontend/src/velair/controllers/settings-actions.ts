import { WEEKDAYS } from "../constants";
import type { VelairApiClient } from "../api/client";
import type { PanelSettings, ScheduleResponse, VelairCardConfig } from "../types";

type SettingsActionsHost = {
  _config: VelairCardConfig;
  _copyTargets: Set<string>;
  _data?: ScheduleResponse;
  _draggedSettingsEntity?: string;
  _error?: string;
  _hasExternalConfig: boolean;
  _saveMessage?: string;
  _selectedWeekday: string;
  _settingsSaving: boolean;
  _zoneTargets: Set<string>;
  _api(): VelairApiClient | undefined;
  _applyScheduleData(data: ScheduleResponse): void;
  _orderedZoneIds(entityIds: string[]): string[];
  _resetDraftBlocks(): void;
  _saveSettings(settings: Partial<PanelSettings>): Promise<void>;
  _t(key: string): string;
  _updateSettingsZoneOrder(entityIds: string[]): void;
};

export function asSettingsActionsHost(host: unknown): SettingsActionsHost {
  return host as SettingsActionsHost;
}

export async function updateSettingsFirstWeekday(host: SettingsActionsHost, value: string): Promise<void> {
  const firstWeekday = WEEKDAYS.includes(value) ? value : "monday";
  host._selectedWeekday = firstWeekday;
  host._copyTargets = new Set();
  host._zoneTargets = new Set();
  await host._saveSettings({ first_weekday: firstWeekday });
  host._resetDraftBlocks();
}

export async function saveSettings(host: SettingsActionsHost, settings: Partial<PanelSettings>): Promise<void> {
  const api = host._api();
  const nextConfig: VelairCardConfig = {
    ...host._config,
    first_weekday: settings.first_weekday ?? host._config.first_weekday,
    zone_order: settings.zone_order ?? host._config.zone_order,
  };
  delete nextConfig.selected_entity;
  host._config = nextConfig;

  if (!api || host._hasExternalConfig) {
    return;
  }

  host._settingsSaving = true;
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const data = await api.updateSettings(settings);
    host._applyScheduleData(data);
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableReset");
  } finally {
    host._settingsSaving = false;
  }
}

export function moveSettingsZone(host: SettingsActionsHost, entityId: string, direction: -1 | 1): void {
  const entities = host._orderedZoneIds(host._data?.configured_entities ?? []);
  const currentIndex = entities.indexOf(entityId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= entities.length) {
    return;
  }

  const nextEntities = [...entities];
  [nextEntities[currentIndex], nextEntities[nextIndex]] = [nextEntities[nextIndex], nextEntities[currentIndex]];
  host._updateSettingsZoneOrder(nextEntities);
}

export function handleSettingsZoneDragStart(host: SettingsActionsHost, entityId: string, event: DragEvent): void {
  host._draggedSettingsEntity = entityId;
  event.dataTransfer?.setData("text/plain", entityId);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

export function handleSettingsZoneDragOver(event: DragEvent): void {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

export function handleSettingsZoneDrop(
  host: SettingsActionsHost,
  targetEntityId: string,
  event: DragEvent,
): void {
  event.preventDefault();
  const draggedEntityId = event.dataTransfer?.getData("text/plain") || host._draggedSettingsEntity;
  host._draggedSettingsEntity = undefined;
  if (!draggedEntityId || draggedEntityId === targetEntityId) {
    return;
  }

  const entities = host._orderedZoneIds(host._data?.configured_entities ?? []).filter(
    (entityId: string) => entityId !== draggedEntityId,
  );
  const targetIndex = entities.indexOf(targetEntityId);
  if (targetIndex < 0) {
    return;
  }

  entities.splice(targetIndex, 0, draggedEntityId);
  host._updateSettingsZoneOrder(entities);
}

export function handleSettingsZoneDragEnd(host: SettingsActionsHost): void {
  host._draggedSettingsEntity = undefined;
}

export function updateSettingsZoneOrder(host: SettingsActionsHost, entityIds: string[]): void {
  const knownEntities = new Set(host._data?.configured_entities ?? []);
  const zoneOrder = entityIds.filter((entityId) => knownEntities.has(entityId));
  void host._saveSettings({ zone_order: zoneOrder });
}
