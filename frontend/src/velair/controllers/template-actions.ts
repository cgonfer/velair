import { backendErrorMessage } from "../domain/backend-errors";
import { ACTION_SET_CLIMATE_OPTIONS, ACTION_SET_TEMPERATURE, WEEKDAYS } from "../constants";
import { createTemplateImpact, normalizeTemplateBlocks, templateImpactAssignments } from "./template-impact";
import { cancelTemplatePreview, refreshTemplatePreview, templateDraftFingerprint } from "./template-preview";
import {
  newTemplateKey,
  templateApplyTargetKey,
  templateApplyTargetsFromKeys,
  toggleTemplateApplyTarget,
  uniqueTemplateName,
} from "../domain/templates";
import type { VelairApiClient } from "../api/client";
import type { DraftScheduleBlock, NormalizedBlocks, ScheduleBlock, ScheduleResponse, ScheduleTemplate } from "../types";

export type TemplateActionsHost = {
  _templatePreviewPending?: boolean;
  _templatePreviewError?: string;
  _templateLinkedDaysOpen?: boolean;
  _draftTemplateLink?: import("../types").TemplateLink;
  _templateImpact?: import("./template-impact").TemplateImpact;
  _templateConfigurationRevision?: number;
  readonly renderRoot: Element | ShadowRoot;
  _applyingTemplateTargets: boolean;
  _data?: ScheduleResponse;
  _draftBlocks: DraftScheduleBlock[];
  _error?: string;
  _saveMessage?: string;
  _selectedEntity?: string;
  _selectedTemplateKey: string;
  _selectedWeekday: string;
  _templateAction?: "save" | "delete";
  _templateApplyOpen: boolean;
  _templateApplyTargets: Set<string>;
  _templateDirty: boolean;
  _templateDraftBlocks: DraftScheduleBlock[];
  _templateDraftKey: string;
  _templateListCanScrollDown: boolean;
  _templateListCanScrollUp: boolean;
  _templateNameDraft: string;
  _templateNameDraftKey: string;
  _api(): VelairApiClient | undefined;
  _applyScheduleData(data: ScheduleResponse, options?: { forceDraft?: boolean }): void;
  _isScheduleResponseCurrent?(data: ScheduleResponse): boolean;
  _applySelectedTemplate(): Promise<boolean>;
  _clampBlocksForEntity(blocks: ScheduleBlock[], entityId: string): ScheduleBlock[];
  _markDirty(): void;
  _newTemplateKey(): string;
  _normalizeDraftBlocks(source?: "schedule" | "template"): NormalizedBlocks;
  _resetTemplateDraft(template?: ScheduleTemplate): void;
  _scheduleTemplates(): ScheduleTemplate[];
  _setTemplateListScrollIndicators(canScrollUp: boolean, canScrollDown: boolean): void;
  _showSuccess(message: string): void;
  _t(key: string, replacements?: Record<string, string | number>): string;
  _templateLabel(template: ScheduleTemplate): string;
  _templateNameInputValue(template: ScheduleTemplate): string;
  _uniqueTemplateName(baseName: string): string;
  _unsupportedModeError(blocks: Array<ScheduleBlock | DraftScheduleBlock>, entityId: string): string | undefined;
  _weekdayName(weekday: string): string;
};

export function asTemplateActionsHost(host: unknown): TemplateActionsHost {
  return host as TemplateActionsHost;
}

export function selectTemplate(host: TemplateActionsHost, key: string): void {
  host._selectedTemplateKey = key;
  const template = host._scheduleTemplates().find((item: ScheduleTemplate) => item.key === key);
  if (host._templateDraftKey !== key) {
    host._resetTemplateDraft(template);
    host._templateApplyOpen = false;
    host._templateApplyTargets = new Set();
  }
  if (host._templateNameDraftKey === key) {
    host._saveMessage = undefined;
    return;
  }

  host._templateNameDraftKey = key;
  host._templateNameDraft = template ? host._templateLabel(template) : "";
  host._saveMessage = undefined;
}

export async function selectScheduleTemplate(host: TemplateActionsHost, key: string): Promise<void> {
  const previousKey = host._selectedTemplateKey;
  host._selectedTemplateKey = key;
  host._saveMessage = undefined;
  if (!key) {
    return;
  }

  if (!await host._applySelectedTemplate()) {
    if (host._selectedTemplateKey === key) host._selectedTemplateKey = previousKey;
    return;
  }

  if (host._selectedTemplateKey === key) host._selectedTemplateKey = "";
}

export function resetTemplateDraft(host: TemplateActionsHost, template?: ScheduleTemplate): void {
  cancelTemplatePreview(host);
  host._templateImpact = undefined;
  host._templatePreviewError = undefined;
  host._templateLinkedDaysOpen = false;
  host._templateConfigurationRevision = host._data?.configuration_revision;
  host._templateDraftKey = template?.key ?? "";
  host._templateDraftBlocks = template ? normalizeTemplateDraftBlocks(template.blocks) : [];
  host._templateDirty = false;
}

export function templateListClass(host: TemplateActionsHost, templateCount: number): string {
  const classes = ["template-list-wrap"];
  if (templateCount > 5) {
    classes.push("scrollable");
  }
  if (host._templateListCanScrollUp) {
    classes.push("can-scroll-up");
  }
  if (host._templateListCanScrollDown) {
    classes.push("can-scroll-down");
  }
  return classes.join(" ");
}

export function syncTemplateListScrollIndicators(host: TemplateActionsHost): void {
  const list = host.renderRoot.querySelector(".template-list");
  if (!(list instanceof HTMLElement)) {
    host._setTemplateListScrollIndicators(false, false);
    return;
  }

  const canScroll = list.scrollHeight > list.clientHeight + 1;
  const canScrollUp = canScroll && list.scrollTop > 1;
  const canScrollDown = canScroll && list.scrollTop + list.clientHeight < list.scrollHeight - 1;
  host._setTemplateListScrollIndicators(canScrollUp, canScrollDown);
}

export function setTemplateListScrollIndicators(
  host: TemplateActionsHost,
  canScrollUp: boolean,
  canScrollDown: boolean,
): void {
  if (host._templateListCanScrollUp !== canScrollUp) {
    host._templateListCanScrollUp = canScrollUp;
  }
  if (host._templateListCanScrollDown !== canScrollDown) {
    host._templateListCanScrollDown = canScrollDown;
  }
}

export function templateNameInputValue(host: TemplateActionsHost, template: ScheduleTemplate): string {
  return host._templateNameDraftKey === template.key
    ? host._templateNameDraft
    : host._templateLabel(template);
}

export function updateTemplateNameDraft(host: TemplateActionsHost, key: string, value: string): void {
  host._templateNameDraftKey = key;
  host._templateNameDraft = value;
  host._templateDirty = true;
  host._saveMessage = undefined;
}

export async function createTemplate(host: TemplateActionsHost): Promise<void> {
  const api = host._api();
  if (!api || host._templateAction) {
    return;
  }

  const key = host._newTemplateKey();
  const name = host._uniqueTemplateName(host._t("newTemplate"));

  host._templateAction = "save";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const data = await api.setScheduleTemplate(key, name, []);
    if (host._isScheduleResponseCurrent?.(data) === false) return;
    host._applyScheduleData(data);
    host._selectedTemplateKey = key;
    host._templateNameDraftKey = key;
    host._templateNameDraft = name;
    host._resetTemplateDraft(host._scheduleTemplates().find((template: ScheduleTemplate) => template.key === key));
    host._showSuccess(host._t("templateSaved"));
  } catch (error) {
    host._error = backendErrorMessage(error, host._t("unableSaveTemplate"));
  } finally {
    host._templateAction = undefined;
  }
}

export async function saveSelectedTemplateFromLibrary(
  host: TemplateActionsHost,
  template: ScheduleTemplate,
): Promise<void> {
  const api = host._api();
  if (!api || host._templateAction) {
    return;
  }

  const name = host._templateNameInputValue(template).trim();
  if (!name) {
    host._error = host._t("templateNameRequired");
    return;
  }
  const normalized = normalizeTemplateBlocks(host, host._templateDraftBlocks);
  if (!normalized.ok) {
    host._error = normalized.error;
    return;
  }

  host._templateAction = "save";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const impact = await refreshTemplatePreview(host);
    if (!impact) { host._templateLinkedDaysOpen = true; host._error = host._templatePreviewError; return; }
    const assignments = templateImpactAssignments(host, impact);
    if (!assignments || impact.preview.pending?.length || impact.preview.destination_errors?.length) {
      host._templateLinkedDaysOpen = true;
      return;
    }
    const snapshot = templateDraftFingerprint(host, false);
    const data = await api.setScheduleTemplate(template.key, name, impact.preview.template.blocks, {
      expected_revision: impact.preview.configuration_revision, assignments,
    });
    if (host._isScheduleResponseCurrent?.(data) === false) return;
    const unchanged = snapshot === templateDraftFingerprint(host, false);
    host._applyScheduleData(data);
    if (!unchanged) return;
    host._selectedTemplateKey = template.key;
    host._templateNameDraftKey = template.key;
    host._templateNameDraft = name;
    host._resetTemplateDraft(host._scheduleTemplates().find((item: ScheduleTemplate) => item.key === template.key));
    host._showSuccess(host._t("templateSaved"));
  } catch (error) {
    host._error = backendErrorMessage(error, host._t("unableSaveTemplate"));
  } finally {
    host._templateAction = undefined;
  }
}

export function uniqueTemplateNameForHost(host: TemplateActionsHost, baseName: string): string {
  return uniqueTemplateName(baseName, host._scheduleTemplates());
}

export function toggleTemplateApplyPanel(host: TemplateActionsHost): void {
  host._templateApplyOpen = !host._templateApplyOpen;
  host._saveMessage = undefined;
}

export function templateTargetKey(entityId: string, weekday: string): string {
  return templateApplyTargetKey(entityId, weekday);
}

export function toggleTemplateApplyTargetForHost(
  host: TemplateActionsHost,
  entityId: string,
  weekday: string,
  checked: boolean,
): void {
  if (!WEEKDAYS.includes(weekday) || !(host._data?.configured_entities ?? []).includes(entityId)) {
    return;
  }

  host._templateApplyTargets = toggleTemplateApplyTarget(host._templateApplyTargets, entityId, weekday, checked);
  host._saveMessage = undefined;
}

export async function applyTemplateToTargets(host: TemplateActionsHost, template: ScheduleTemplate): Promise<void> {
  const api = host._api();
  if (!api || host._applyingTemplateTargets || host._templateApplyTargets.size === 0) {
    return;
  }

  const normalized = normalizeTemplateBlocks(host, host._templateDraftBlocks);
  if (!normalized.ok) { host._error = normalized.error; return; }
  const targets = templateApplyTargetsFromKeys(host._templateApplyTargets, host._data?.configured_entities ?? []);
  if (!targets.length) return;
  const blocks = normalized.blocks.map(({ slot_id: _slot, ...block }) => block);
  const fingerprint = () => JSON.stringify([host._templateDraftKey, host._templateDraftBlocks, [...host._templateApplyTargets].sort(), host._scheduleTemplates().find((item) => item.key === template.key), host._data?.block_presets]);
  const snapshot = fingerprint();
  const acceptedRevisions = new Set([host._data?.configuration_revision]);
  const isCurrent = () => fingerprint() === snapshot && acceptedRevisions.has(host._data?.configuration_revision);
  host._applyingTemplateTargets = true;
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const targetBlocks = new Map<string, ScheduleBlock[]>();
    for (const target of targets) {
      const preview = await api.previewDailySchedule(target.entityId, target.weekday, { blocks });
      if (!isCurrent()) return;
      if (!Array.isArray(preview.materialized_blocks)) throw new Error(host._t("unableCopy"));
      targetBlocks.set(templateApplyTargetKey(target.entityId, target.weekday), preview.materialized_blocks);
    }
    let data: ScheduleResponse | undefined;
    for (const target of targets) {
      if (!isCurrent()) return;
      data = await api.setDailySchedule(
        target.entityId, target.weekday,
        targetBlocks.get(templateApplyTargetKey(target.entityId, target.weekday))!,
        ...(host._data?.configuration_revision !== undefined ? [{ expected_revision: data?.configuration_revision ?? host._data.configuration_revision, unlink_template: Boolean(host._data?.zones[target.entityId]?.template_links?.[target.weekday]) }] : []),
      );
      if (host._isScheduleResponseCurrent?.(data) === false) return;
      acceptedRevisions.add(data.configuration_revision);
    }
    if (!isCurrent()) return;
    if (data) {
      host._applyScheduleData(data, { forceDraft: true });
    }
    host._selectedTemplateKey = template.key;
    host._templateApplyTargets = new Set();
    host._templateApplyOpen = false;
    host._showSuccess(host._t("appliedTemplateTargets", { count: targets.length }));
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableCopy");
  } finally {
    host._applyingTemplateTargets = false;
  }
}

export async function applySelectedTemplate(host: TemplateActionsHost): Promise<boolean> {
  const api = host._api();
  const template = host._scheduleTemplates().find((item) => item.key === host._selectedTemplateKey);
  if (!api || !template || !host._selectedEntity) return false;
  if (host._draftBlocks.length && !window.confirm(host._t("confirmTemplate", { template: host._templateLabel(template), weekday: host._weekdayName(host._selectedWeekday) }))) return false;
  const entity = host._selectedEntity;
  const day = host._selectedWeekday;
  const fingerprint = () => JSON.stringify([host._selectedEntity, host._selectedWeekday, host._selectedTemplateKey, host._data?.configuration_revision, host._draftBlocks, host._draftTemplateLink, host._scheduleTemplates().find((item) => item.key === template.key)]);
  const snapshot = fingerprint();
  try {
    const normalized = normalizeTemplateBlocks(host, template.blocks);
    if (!normalized.ok) { host._error = normalized.error; return false; }
    const raw = normalized.blocks.map(({ slot_id: _slot, ...block }) => block);
    const preview = await api.previewDailySchedule(entity, day, { blocks: raw });
    if (fingerprint() !== snapshot) return false;
    if (!Array.isArray(preview.materialized_blocks)) throw new Error(host._t("unableCopy"));
    host._draftBlocks = normalizeTemplateDraftBlocks(preview.materialized_blocks).map(({ slot_id: _slot, ...block }) => block);
    host._draftTemplateLink = undefined;
    host._markDirty();
    host._saveMessage = undefined;
    return true;
  } catch (error) {
    if (fingerprint() === snapshot) host._error = backendErrorMessage(error, host._t("unableCopy"));
    return false;
  }
}

function normalizeTemplateDraftBlocks(blocks: Array<DraftScheduleBlock | ScheduleBlock>): DraftScheduleBlock[] {
  return blocks.map((block) => {
    if (block.preset_key) return { start: block.start, slot_id: block.slot_id, preset_key: block.preset_key, action: "" as const, hvac_mode: "" };
    const draft: DraftScheduleBlock = {
      action: block.action ?? ACTION_SET_TEMPERATURE,
      hvac_mode: block.hvac_mode ?? "",
      start: block.start,
      ...(block.slot_id ? { slot_id: block.slot_id } : {}),
    };
    if (block.target_temp_low !== undefined || block.target_temp_high !== undefined) {
      draft.target_temp_low = block.target_temp_low;
      draft.target_temp_high = block.target_temp_high;
    } else if (block.action !== ACTION_SET_CLIMATE_OPTIONS) {
      draft.temperature = block.temperature;
    }
    if (block.fan_mode) {
      draft.fan_mode = block.fan_mode;
    }
    if (block.preset_mode) {
      draft.preset_mode = block.preset_mode;
    }
    if (block.swing_mode) {
      draft.swing_mode = block.swing_mode;
    }
    if (block.swing_horizontal_mode) {
      draft.swing_horizontal_mode = block.swing_horizontal_mode;
    }
    if (String(block.humidity ?? "").trim()) {
      draft.humidity = block.humidity;
    }
    return draft;
  });
}

export async function saveTemplate(host: TemplateActionsHost, saveAsNew: boolean): Promise<void> {
  const api = host._api();
  if (!api || host._templateAction) {
    return;
  }

  const selectedTemplate = host._scheduleTemplates().find((item: ScheduleTemplate) => item.key === host._selectedTemplateKey);
  if (!saveAsNew && !selectedTemplate) {
    return;
  }
  const templateName = window.prompt(
    host._t("customTemplateName"),
    !saveAsNew && selectedTemplate ? host._templateLabel(selectedTemplate) : "",
  )?.trim();
  if (!templateName) {
    return;
  }

  host._templateAction = "save";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const fingerprint = () => JSON.stringify([host._selectedEntity, host._selectedWeekday, host._selectedTemplateKey, host._data?.configuration_revision, host._draftTemplateLink, host._draftBlocks]);
    const snapshot = fingerprint();
    const normalized = host._draftTemplateLink?.mode === "full" && host._selectedEntity
      ? { ok: true as const, blocks: (await api.previewDailySchedule(host._selectedEntity, host._selectedWeekday, { template_link: host._draftTemplateLink })).materialized_blocks }
      : host._normalizeDraftBlocks();
    if (fingerprint() !== snapshot) return;
    if (!normalized.ok) { host._error = normalized.error; return; }
    if (!Array.isArray(normalized.blocks)) throw new Error(host._t("unableCopy"));
    const normalizedBlocks = normalized.blocks;

    const templateKey = saveAsNew ? host._newTemplateKey() : selectedTemplate?.key ?? host._newTemplateKey();
    if (!host._selectedEntity) return;
    const source = normalizedBlocks.map(({ slot_id: _slot, ...block }) => block);
    let blocks = source;
    if (!saveAsNew && selectedTemplate) {
      // A schedule saved over an existing template retains only identities explicitly
      // carried by its source. New slots are assigned by the backend preview.
      blocks = blocks.map((block) => ({ ...block, ...(normalizedBlocks.find((sourceBlock) => sourceBlock.start === block.start)?.slot_id ? { slot_id: normalizedBlocks.find((sourceBlock) => sourceBlock.start === block.start)!.slot_id } : {}) }));
      const preview = await api.previewScheduleTemplateUpdate(templateKey, templateName, blocks, host._data?.configuration_revision);

      const impact = createTemplateImpact(preview, templateName);
      const assignments = templateImpactAssignments(host, impact);
      if (!assignments || preview.pending?.length || preview.destination_errors?.length) {
        host._templateImpact = impact;
        host._selectedTemplateKey = templateKey;
        host._templateDraftKey = templateKey;
        host._templateDraftBlocks = normalizeTemplateDraftBlocks(preview.template.blocks);
        host._templateNameDraftKey = templateKey;
        host._templateNameDraft = templateName;
        host._templateDirty = true;
        host._templateConfigurationRevision = preview.configuration_revision;
        host._templateLinkedDaysOpen = true;
        return;
      }
      const data = await api.setScheduleTemplate(templateKey, templateName, preview.template.blocks, {
        expected_revision: preview.configuration_revision, assignments,
      });
      if (host._isScheduleResponseCurrent?.(data) === false) return;
      host._applyScheduleData(data);
      host._selectedTemplateKey = templateKey;
      host._showSuccess(host._t("templateSaved"));
      return;
    }
    const data = host._data?.configuration_revision === undefined
      ? await api.setScheduleTemplate(templateKey, templateName, blocks)
      : await api.setScheduleTemplate(templateKey, templateName, blocks, { expected_revision: host._data.configuration_revision });
    if (host._isScheduleResponseCurrent?.(data) === false) return;
    host._applyScheduleData(data);
    host._selectedTemplateKey = templateKey;
    host._showSuccess(host._t("templateSaved"));
  } catch (error) {
    host._error = backendErrorMessage(error, host._t("unableSaveTemplate"));
  } finally {
    host._templateAction = undefined;
  }
}

export function createTemplateKey(): string {
  return newTemplateKey();
}

export async function deleteSelectedTemplate(host: TemplateActionsHost): Promise<void> {
  const api = host._api();
  if (!api || host._templateAction) {
    return;
  }

  const template = host._scheduleTemplates().find((item: ScheduleTemplate) => item.key === host._selectedTemplateKey);
  if (!template) {
    return;
  }

  const confirmed = window.confirm(
    host._t("confirmDeleteTemplate", {
      template: host._templateLabel(template),
    }),
  );
  if (!confirmed) {
    return;
  }

  host._templateAction = "delete";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const data = await api.deleteScheduleTemplate(template.key);
    if (host._isScheduleResponseCurrent?.(data) === false) return;
    host._applyScheduleData(data);
    host._selectedTemplateKey = "";
    host._showSuccess(host._t("templateDeleted"));
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableDeleteTemplate");
  } finally {
    host._templateAction = undefined;
  }
}
