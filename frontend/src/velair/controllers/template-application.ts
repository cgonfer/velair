import { templateApplyTargetKey } from "../domain/templates";
import { normalizeTemplateBlocks } from "./template-impact";
import type { VelairViewHost } from "../host-types";
import type { TemplateActionsHost } from "./template-actions";
import type { BlockConfiguration, DraftScheduleBlock, TemplateApplicationPreview, TemplateApplicationRequest } from "../types";
import { dayGroups } from "../domain/day-layouts";
import { backendErrorMessage } from "../domain/backend-errors";

export type TemplateApplicationState = {
  source: "default" | "profile"; profileKey?: string; layout: string; mode: "copy" | "hours" | "full";
  preview?: TemplateApplicationPreview; fingerprint?: string; dirty?: boolean;
  drafts: Record<string, DraftScheduleBlock>; bases: Record<string, string>; bindings: Record<string, Record<string, BlockConfiguration>>;
};
export type ApplicationHost = Pick<TemplateActionsHost, "_api" | "_data" | "_error" | "_templateDirty" | "_templateDraftBlocks" | "_selectedTemplateKey" | "_templateApplyTargets" | "_applyingTemplateTargets" | "_templateApplyOpen" | "_scheduleTemplates" | "_t" | "_applyScheduleData" | "_isScheduleResponseCurrent" | "_showSuccess"> & { _templateApplication?: TemplateApplicationState };
export const newTemplateApplication = (): TemplateApplicationState => ({ source: "default", layout: "individual", mode: "copy", drafts: {}, bases: {}, bindings: {} });
export const applicationGroupKey = (entity: string, days: string[]) => `${entity}|${days.join(",")}`;
export function applicationState(host: ApplicationHost): TemplateApplicationState { return host._templateApplication ?? newTemplateApplication(); }
export function applicationFingerprint(host: ApplicationHost): string {
  return JSON.stringify([host._selectedTemplateKey, host._data?.configuration_revision, host._templateDraftBlocks, host._templateDirty,
    host._scheduleTemplates().find(item => item.key === host._selectedTemplateKey), [...host._templateApplyTargets].sort(),
    applicationState(host).source, applicationState(host).profileKey, applicationState(host).layout, applicationState(host).mode,
    applicationState(host).bases, applicationState(host).bindings, applicationState(host).drafts]);
}
export function applicationDraftsValid(host: ApplicationHost): boolean {
  return Object.values(applicationState(host).drafts).every(block => normalizeTemplateBlocks(host as Pick<VelairViewHost, "_t">, [block]).ok);
}
export function applicationPreviewCurrent(host: ApplicationHost): boolean {
  return Boolean(host._templateApplication?.preview && host._templateApplication.fingerprint === applicationFingerprint(host));
}
export function updateApplication(host: ApplicationHost, changes: Partial<TemplateApplicationState>, clearTargets = false): void {
  if (host._applyingTemplateTargets) return;
  if (applicationState(host).dirty && !window.confirm(host._t("discardUnsavedChanges"))) return;
  host._templateApplication = { ...applicationState(host), ...changes, preview: undefined, fingerprint: undefined, dirty: false, drafts: {}, bases: {}, bindings: {} };
  if (clearTargets) host._templateApplyTargets = new Set();
}
export function applicationRequest(host: ApplicationHost): TemplateApplicationRequest {
  const state = applicationState(host);
  const groups = (host._data?.configured_entities ?? []).flatMap(entity_id => dayGroups(state.layout)
    .filter(days => host._templateApplyTargets.has(templateApplyTargetKey(entity_id, days[0]))).map(weekdays => {
      const key = applicationGroupKey(entity_id, weekdays);
      return { entity_id, weekdays, ...(state.bases[key] ? { base_weekday: state.bases[key] } : {}), ...(state.bindings[key] ? { bindings: state.bindings[key] } : {}) };
    }));
  return { template_key: host._selectedTemplateKey, source: state.source, ...(state.source === "profile" ? { profile_key: state.profileKey } : {}),
    day_layout_key: state.layout, mode: state.mode, groups, expected_revision: host._data?.configuration_revision };
}
export async function reviewApplication(host: ApplicationHost): Promise<void> {
  const api = host._api();
  if (!api || host._applyingTemplateTargets || host._templateDirty || !applicationRequest(host).groups.length) return;
  host._templateApplication ??= newTemplateApplication();
  const lifecycle = host._templateApplication;
  const fingerprint = applicationFingerprint(host);
  host._applyingTemplateTargets = true; host._error = undefined;
  try {
    const preview = await api.previewTemplateApplication(applicationRequest(host));
    if (lifecycle !== host._templateApplication || fingerprint !== applicationFingerprint(host)) return;
    host._templateApplication = { ...applicationState(host), preview, fingerprint };
  } catch (error) { if (lifecycle === host._templateApplication && fingerprint === applicationFingerprint(host)) host._error = backendErrorMessage(error, host._t("unableCopy")); }
  finally { host._applyingTemplateTargets = false; }
}
export async function chooseApplicationBase(host: ApplicationHost, key: string, day: string): Promise<void> {
  const state = applicationState(host);
  if (host._applyingTemplateTargets) return;
  if ((Object.keys(state.bindings[key] ?? {}).length || Object.keys(state.drafts).some(slot => slot.startsWith(`${key}|`))) && !window.confirm(host._t("discardUnsavedChanges"))) return;
  const drafts = Object.fromEntries(Object.entries(state.drafts).filter(([slot]) => !slot.startsWith(`${key}|`)));
  host._templateApplication = { ...state, drafts, bases: { ...state.bases, [key]: day }, bindings: { ...state.bindings, [key]: {} }, dirty: true };
  // An empty bindings object is omitted while the backend proposes from the chosen base.
  delete host._templateApplication.bindings[key];
  await reviewApplication(host);
}
export function updateApplicationBlock(host: ApplicationHost, group: TemplateApplicationPreview["groups"][number], slot: string, block: DraftScheduleBlock): void {
  const state = applicationState(host), key = applicationGroupKey(group.entity_id, group.weekdays);
  const bindings = { ...state.bindings[key] };
  const normalized = normalizeTemplateBlocks(host as Pick<VelairViewHost, "_t">, [block]);
  if (normalized.ok) {
    const { start: _time, slot_id: _slot, ...binding } = normalized.blocks[0];
    bindings[slot] = binding;
  } else delete bindings[slot];
  host._templateApplication = { ...state, bindings: { ...state.bindings, [key]: bindings }, drafts: { ...state.drafts, [`${key}|${slot}`]: block }, dirty: true, fingerprint: undefined };
}
export async function commitApplication(host: ApplicationHost): Promise<void> {
  const api = host._api();
  if (!api || host._applyingTemplateTargets || host._templateDirty || !applicationPreviewCurrent(host) || !applicationState(host).preview?.can_apply || !applicationDraftsValid(host)) return;
  host._applyingTemplateTargets = true; host._error = undefined;
  try {
    const request = applicationRequest(host);
    const data = await api.applyTemplateApplication(request);
    if (host._isScheduleResponseCurrent?.(data) === false) return;
    host._applyScheduleData(data, { forceDraft: true });
    host._templateApplication = undefined; host._templateApplyTargets = new Set(); host._templateApplyOpen = false;
    host._showSuccess(host._t("appliedTemplateTargets", { count: request.groups.reduce((sum, group) => sum + group.weekdays.length, 0) }));
  } catch (error) {
    host._error = backendErrorMessage(error, host._t("unableCopy"));
    host._templateApplication = { ...applicationState(host), fingerprint: undefined };
  } finally { host._applyingTemplateTargets = false; }
}
