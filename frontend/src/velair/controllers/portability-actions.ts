import { PORTABLE_SECTIONS } from "../constants";
import {
  portableExportSummaryItems,
  portableImportSummaryItems,
  portableSectionsFromPayload,
  validatePortablePayload,
  type PortableSummaryItem,
} from "../domain/portable";
import type { VelairApiClient } from "../api/client";
import type { PortableSection, ScheduleResponse, ScheduleTemplate, VelairPortablePayload } from "../types";

type PortableSummaryViewItem = { label: string; section: PortableSection; title: string; value: string | number };

type PortabilityHost = {
  _data?: ScheduleResponse;
  _error?: string;
  _exportSections: Set<PortableSection>;
  _importFileName: string;
  _importPayload?: VelairPortablePayload;
  _importSections: Set<PortableSection>;
  _maintenanceAction?: "reset";
  _portabilityAction?: "export" | "import";
  _saveMessage?: string;
  _selectedTemplateKey: string;
  _templateApplyOpen: boolean;
  _templateApplyTargets: Set<string>;
  _api(): VelairApiClient | undefined;
  _applyScheduleData(data: ScheduleResponse, options?: { forceDraft?: boolean }): void;
  _downloadPortablePayload(payload: VelairPortablePayload): void;
  _portableSectionLabel(section: PortableSection): string;
  _portableSummaryItem(item: PortableSummaryItem): PortableSummaryViewItem;
  _scheduleTemplates(): ScheduleTemplate[];
  _showSuccess(message: string): void;
  _t(key: string): string;
};

export function asPortabilityHost(host: unknown): PortabilityHost {
  return host as PortabilityHost;
}

export function togglePortableSection(
  host: PortabilityHost,
  target: "export" | "import",
  section: PortableSection,
  checked: boolean,
): void {
  const nextSections = new Set(target === "export" ? host._exportSections : host._importSections);
  if (checked) {
    nextSections.add(section);
  } else {
    nextSections.delete(section);
  }

  if (target === "export") {
    host._exportSections = nextSections;
  } else {
    host._importSections = nextSections;
  }
}

export async function handlePortableImportFile(host: PortabilityHost, event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  host._importPayload = undefined;
  host._importFileName = "";
  host._importSections = new Set();
  host._error = undefined;
  host._saveMessage = undefined;
  if (!file) {
    return;
  }

  try {
    const payload = JSON.parse(await file.text()) as VelairPortablePayload;
    const validation = validatePortablePayload(payload);
    if (!validation.ok) {
      throw new Error(host._t(validation.errorKey));
    }
    host._importPayload = payload;
    host._importFileName = file.name;
    host._importSections = new Set(validation.sections);
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("invalidImportFile");
    input.value = "";
  }
}

export async function exportPortableData(host: PortabilityHost): Promise<void> {
  const api = host._api();
  if (!api || !host._exportSections.size) {
    return;
  }

  host._portabilityAction = "export";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const payload = await api.exportData([...host._exportSections]);
    host._downloadPortablePayload(payload);
    host._saveMessage = host._t("portableExported");
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableExport");
  } finally {
    host._portabilityAction = undefined;
  }
}

export async function importPortableData(host: PortabilityHost): Promise<void> {
  const api = host._api();
  if (!api || !host._importPayload || !host._importSections.size) {
    return;
  }

  host._portabilityAction = "import";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const data = await api.importData(host._importPayload, [...host._importSections]);
    host._applyScheduleData(data, { forceDraft: true });
    host._saveMessage = host._t("portableImported");
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("invalidImportFile");
  } finally {
    host._portabilityAction = undefined;
  }
}

export async function resetVelairData(host: PortabilityHost): Promise<void> {
  const api = host._api();
  if (!api || host._maintenanceAction) {
    return;
  }

  if (!window.confirm(host._t("confirmReset"))) {
    return;
  }

  host._maintenanceAction = "reset";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const data = await api.resetData();
    host._selectedTemplateKey = "";
    host._templateApplyOpen = false;
    host._templateApplyTargets = new Set();
    host._applyScheduleData(data, { forceDraft: true });
    host._showSuccess(host._t("resetDone"));
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableSaveSettings");
  } finally {
    host._maintenanceAction = undefined;
  }
}

export function importAvailableSections(host: PortabilityHost): PortableSection[] {
  return portableSectionsFromPayload(host._importPayload);
}

export function portableExportItems(host: PortabilityHost): PortableSummaryViewItem[] {
  return portableExportSummaryItems(new Set(PORTABLE_SECTIONS), {
    zones: host._data?.configured_entities.length ?? 0,
    templates: host._scheduleTemplates().length,
  }).map((item) => host._portableSummaryItem(item));
}

export function portableImportItems(host: PortabilityHost): PortableSummaryViewItem[] {
  return portableImportSummaryItems(host._importPayload).map((item) => host._portableSummaryItem(item));
}

export function portableSummaryItem(
  host: PortabilityHost,
  item: PortableSummaryItem,
): PortableSummaryViewItem {
  const label = host._portableSectionLabel(item.section);
  return {
    label,
    section: item.section,
    title: label,
    value: item.value === "included" ? host._t("portabilityIncluded") : item.value,
  };
}

export function portableSectionLabel(host: PortabilityHost, section: PortableSection): string {
  switch (section) {
    case "templates":
      return host._t("portabilityTemplatesSection");
    case "settings":
      return host._t("portabilitySettingsSection");
    case "zones":
    default:
      return host._t("portabilityZonesSection");
  }
}

export function downloadPortablePayload(payload: VelairPortablePayload): void {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `velair-export-${date}.json`;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
