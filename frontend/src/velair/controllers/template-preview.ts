import type { TemplateActionsHost } from "./template-actions";
import { assignmentKey, createTemplateImpact, normalizeTemplateBlocks, templateImpactAssignments, type TemplateImpact } from "./template-impact";
import { backendErrorMessage } from "../domain/backend-errors";

const requests = new WeakMap<object, { sequence: number; timer?: ReturnType<typeof setTimeout> }>();
function requestState(host: object) {
  let state = requests.get(host);
  if (!state) { state = { sequence: 0 }; requests.set(host, state); }
  return state;
}
export function templateDraftFingerprint(host: TemplateActionsHost, includeRevision = true): string {
  return JSON.stringify([host._selectedTemplateKey, host._templateNameDraft, host._templateDraftBlocks,
    host._templateImpact?.assignments, [...host._templateImpact?.manual ?? []], includeRevision ? host._data?.configuration_revision : undefined]);
}

export function cancelTemplatePreview(host: TemplateActionsHost): void {
  const state = requestState(host);
  state.sequence++;
  if (state.timer) clearTimeout(state.timer);
  state.timer = undefined;
  host._templatePreviewPending = false;
}

export function queueTemplatePreview(host: TemplateActionsHost): void {
  cancelTemplatePreview(host);
  if (!host._selectedTemplateKey || !host._templateDirty) return;
  host._templatePreviewPending = true;
  requestState(host).timer = setTimeout(() => { void refreshTemplatePreview(host); }, 250);
}

export async function refreshTemplatePreview(host: TemplateActionsHost): Promise<TemplateImpact | undefined> {
  cancelTemplatePreview(host);
  const api = host._api();
  const template = host._scheduleTemplates().find((item) => item.key === host._selectedTemplateKey);
  if (!api || !template) return undefined;
  const normalized = normalizeTemplateBlocks(host, host._templateDraftBlocks);
  if (!normalized.ok) { host._templatePreviewError = normalized.error; return undefined; }
  const name = host._templateNameInputValue(template).trim();
  if (!name) { host._templatePreviewError = host._t("templateNameRequired"); return undefined; }
  const state = requestState(host);
  const sequence = state.sequence;
  const snapshot = templateDraftFingerprint(host);
  const current = () => sequence === state.sequence && snapshot === templateDraftFingerprint(host);
  host._templatePreviewPending = true;
  host._templatePreviewError = undefined;
  try {
    const assignments = host._templateImpact ? templateImpactAssignments(host, host._templateImpact, true) : [];
    const preview = await api.previewScheduleTemplateUpdate(template.key, name, normalized.blocks,
      host._templateConfigurationRevision ?? host._data?.configuration_revision, assignments ?? []);
    if (!current()) return undefined;
    const impact = createTemplateImpact(preview, name, host._templateImpact);
    const localPending = impact.assignments.flatMap((item) => item.drafts.filter((draft) =>
      impact.manual?.has(assignmentKey(item.destination, draft.slot_id!))
      && !normalizeTemplateBlocks(host, [draft]).ok).map((draft) => ({
        destination: item.destination, slot_id: draft.slot_id!, reason: "manual_incomplete", message: host._t("templateAssignmentPending"),
      })));
    impact.preview = { ...preview, pending: [...(preview.pending ?? []), ...localPending] };
    host._templateImpact = impact;
    // The backend allocates identities. Adopt them once; subsequent edits retain them.
    host._templateDraftBlocks = host._templateDraftBlocks.map((draft) => ({ ...draft,
      slot_id: preview.template.blocks.find((block) => block.start === draft.start)?.slot_id ?? draft.slot_id,
    }));
    return impact;
  } catch (error) {
    if (current()) host._templatePreviewError = backendErrorMessage(error, host._t("unableSaveTemplate"));
    return undefined;
  } finally {
    if (sequence === state.sequence) host._templatePreviewPending = false;
  }
}
