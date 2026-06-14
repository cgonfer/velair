import { WEEKDAYS } from "../constants";
import {
  newTemplateKey,
  templateApplyTargetKey,
  templateApplyTargetsFromKeys,
  toggleTemplateApplyTarget,
  uniqueTemplateName,
} from "../domain/templates";
import type { VelairApiClient } from "../api/client";
import type { DraftScheduleBlock, NormalizedBlocks, ScheduleBlock, ScheduleResponse, ScheduleTemplate } from "../types";

type TemplateActionsHost = {
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
  _applySelectedTemplate(): boolean;
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
  _unsupportedModeError(blocks: Array<Pick<ScheduleBlock, "action" | "hvac_mode" | "start">>, entityId: string): string | undefined;
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

export function selectScheduleTemplate(host: TemplateActionsHost, key: string): void {
  const previousKey = host._selectedTemplateKey;
  host._selectedTemplateKey = key;
  host._saveMessage = undefined;
  if (!key) {
    return;
  }

  if (!host._applySelectedTemplate()) {
    host._selectedTemplateKey = previousKey;
  }
}

export function resetTemplateDraft(host: TemplateActionsHost, template?: ScheduleTemplate): void {
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
    host._applyScheduleData(data);
    host._selectedTemplateKey = key;
    host._templateNameDraftKey = key;
    host._templateNameDraft = name;
    host._resetTemplateDraft(host._scheduleTemplates().find((template: ScheduleTemplate) => template.key === key));
    host._showSuccess(host._t("templateSaved"));
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableSaveTemplate");
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
  const normalized = host._normalizeDraftBlocks("template");
  if (!normalized.ok) {
    host._error = normalized.error;
    return;
  }

  host._templateAction = "save";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const data = await api.setScheduleTemplate(template.key, name, normalized.blocks);
    host._applyScheduleData(data);
    host._selectedTemplateKey = template.key;
    host._templateNameDraftKey = template.key;
    host._templateNameDraft = name;
    host._resetTemplateDraft(host._scheduleTemplates().find((item: ScheduleTemplate) => item.key === template.key));
    host._showSuccess(host._t("templateSaved"));
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableSaveTemplate");
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

  const normalized = host._normalizeDraftBlocks("template");
  if (!normalized.ok) {
    host._error = normalized.error;
    return;
  }

  const targets = templateApplyTargetsFromKeys(host._templateApplyTargets, host._data?.configured_entities ?? []);

  if (!targets.length) {
    return;
  }

  for (const target of targets) {
    const unsupportedModeError = host._unsupportedModeError(normalized.blocks, target.entityId);
    if (unsupportedModeError) {
      host._error = unsupportedModeError;
      return;
    }
  }

  host._applyingTemplateTargets = true;
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    let data;
    for (const target of targets) {
      data = await api.setDailySchedule(
        target.entityId,
        target.weekday,
        host._clampBlocksForEntity(normalized.blocks, target.entityId),
      );
    }

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

export function applySelectedTemplate(host: TemplateActionsHost): boolean {
  const template = host._scheduleTemplates().find((item: ScheduleTemplate) => item.key === host._selectedTemplateKey);
  if (!template) {
    return false;
  }

  if (host._selectedEntity) {
    const unsupportedModeError = host._unsupportedModeError(template.blocks, host._selectedEntity);
    if (unsupportedModeError) {
      host._error = unsupportedModeError;
      host._saveMessage = undefined;
      return false;
    }
  }

  if (host._draftBlocks.length) {
    const confirmed = window.confirm(
      host._t("confirmTemplate", {
        template: host._templateLabel(template),
        weekday: host._weekdayName(host._selectedWeekday),
      }),
    );
    if (!confirmed) {
      return false;
    }
  }

  host._draftBlocks = normalizeTemplateDraftBlocks(template.blocks);
  host._markDirty();
  host._saveMessage = undefined;
  return true;
}

function normalizeTemplateDraftBlocks(blocks: DraftScheduleBlock[]): DraftScheduleBlock[] {
  return blocks.map((block) => ({
    action: block.action,
    hvac_mode: block.hvac_mode ?? "",
    start: block.start,
    temperature: block.temperature,
  }));
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

  const normalized = host._normalizeDraftBlocks();
  if (!normalized.ok) {
    host._error = normalized.error;
    return;
  }

  host._templateAction = "save";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const templateKey = saveAsNew ? host._newTemplateKey() : selectedTemplate?.key ?? host._newTemplateKey();
    const data = await api.setScheduleTemplate(templateKey, templateName, normalized.blocks);
    host._applyScheduleData(data);
    host._selectedTemplateKey = templateKey;
    host._showSuccess(host._t("templateSaved"));
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableSaveTemplate");
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
    host._applyScheduleData(data);
    host._selectedTemplateKey = "";
    host._showSuccess(host._t("templateDeleted"));
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableDeleteTemplate");
  } finally {
    host._templateAction = undefined;
  }
}
