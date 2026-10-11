// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { addBlock, asDraftActionsHost, removeBlock, setDraftBlockStart } from "../../src/velair/controllers/draft-actions";
import { asTemplateActionsHost, saveSelectedTemplateFromLibrary } from "../../src/velair/controllers/template-actions";
import { cancelTemplatePreview, queueTemplatePreview, refreshTemplatePreview } from "../../src/velair/controllers/template-preview";
import { createTemplateImpact, templateImpactAssignments, updateImpactBlock } from "../../src/velair/controllers/template-impact";
import type { TemplateUpdatePreview } from "../../src/velair/types";

const destination = { source: "default" as const, entity_id: "climate.room", weekday: "monday" };
const template = { key: "work", name: "Work", blocks: [{ start: "07:00", slot_id: "old", action: "turn_off", hvac_mode: "" }] };
function preview(): TemplateUpdatePreview {
  return { template: { key: "work", name: "Work", blocks: [...template.blocks, { start: "09:00", slot_id: "new", action: "set_temperature", temperature: 99 }] },
    usages: [destination], added_slot_ids: ["new"], removed_slot_ids: [], configuration_revision: 1,
    proposals: [{ destination, slot_id: "new", origin: "saved_previous", donor_slot_id: "old", donor_start: "07:00", binding: { action: "turn_off" }, effective_config: { action: "turn_off" } }],
    pending: [], destination_errors: [], changes: [{ destination, slot_id: "new", kind: "added", start: "09:00" }],
  };
}
function harness() {
  const api = { previewScheduleTemplateUpdate: vi.fn().mockResolvedValue(preview()), setScheduleTemplate: vi.fn().mockResolvedValue({ configuration_revision: 2 }) };
  const state = asTemplateActionsHost({
    _selectedTemplateKey: "work", _templateDraftKey: "work", _templateConfigurationRevision: 1,
    _templateNameDraft: "Work", _templateNameDraftKey: "work", _templateDirty: true,
    _templateDraftBlocks: [...template.blocks, { start: "09:00", action: "set_temperature", temperature: "99", hvac_mode: "heat" }],
    _data: { configuration_revision: 1 }, _api: () => api, _scheduleTemplates: () => [template],
    _templateNameInputValue: () => state._templateNameDraft, _t: (key: string) => key,
    _normalizeDraftBlocks: vi.fn(() => { throw new Error("Device-specific normalization must not run"); }),
    _applyScheduleData: vi.fn(), _resetTemplateDraft: vi.fn(), _showSuccess: vi.fn(),
  });
  return { state, api };
}
async function settle() { for (let index = 0; index < 5; ++index) await Promise.resolve(); }
afterEach(() => vi.useRealTimers());

describe("template preview coordination", () => {
  it("debounces edits for 250ms and sends a structural candidate regardless of device limits", async () => {
    vi.useFakeTimers();
    const { state, api } = harness();
    queueTemplatePreview(state);
    state._templateNameDraft = "Work revised";
    queueTemplatePreview(state);
    await vi.advanceTimersByTimeAsync(249);
    expect(api.previewScheduleTemplateUpdate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(api.previewScheduleTemplateUpdate).toHaveBeenCalledTimes(1);
    expect(api.previewScheduleTemplateUpdate.mock.calls[0][2][1].temperature).toBe(99);
    expect(state._templatePreviewPending).toBe(false);
    expect(state._templateDraftBlocks[1].slot_id).toBe("new");
  });

  it("retains backend IDs in later requests and preserves a manual correction", async () => {
    const { state, api } = harness();
    await refreshTemplatePreview(state);
    state._templateImpact = updateImpactBlock(state._templateImpact!, 0, 0, { start: "09:00", slot_id: "new", action: "set_temperature", temperature: "21", hvac_mode: "cool" });
    state._templateDraftBlocks[1].start = "10:00";
    const next = preview(); next.template.blocks[1].start = "10:00";
    api.previewScheduleTemplateUpdate.mockResolvedValue(next);
    await refreshTemplatePreview(state);
    expect(api.previewScheduleTemplateUpdate.mock.calls[1][2][1]).toMatchObject({ start: "10:00", slot_id: "new" });
    expect(api.previewScheduleTemplateUpdate.mock.calls[1][4][0].bindings.new).toEqual({ action: "set_temperature", temperature: 21, hvac_mode: "cool" });
    expect(state._templateImpact?.assignments[0].drafts[0]).toMatchObject({ start: "10:00", temperature: "21", hvac_mode: "cool" });
  });

  it("ignores stale replies and retains manual edits made during an in-flight preview", async () => {
    vi.useFakeTimers();
    const { state, api } = harness();
    await refreshTemplatePreview(state);
    let resolve!: (value: TemplateUpdatePreview) => void;
    api.previewScheduleTemplateUpdate.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const inFlight = refreshTemplatePreview(state);
    state._templateImpact = updateImpactBlock(state._templateImpact!, 0, 0, { start: "09:00", slot_id: "new", action: "turn_off", hvac_mode: "" });
    queueTemplatePreview(state);
    resolve({ ...preview(), configuration_revision: 999 }); await inFlight;
    expect(state._templateImpact?.preview.configuration_revision).toBe(1);
    await vi.advanceTimersByTimeAsync(250);
    expect(state._templateImpact?.manual?.size).toBe(1);
    expect(state._templateImpact?.assignments[0].drafts[0].action).toBe("turn_off");
  });

  it("keeps cleared manual targets pending even if the backend proposes a valid fallback", async () => {
    const { state, api } = harness();
    await refreshTemplatePreview(state);
    state._templateImpact = updateImpactBlock(state._templateImpact!, 0, 0, { start: "09:00", slot_id: "new", action: "set_temperature", temperature: "", hvac_mode: "" });
    await refreshTemplatePreview(state);
    expect(state._templateImpact?.preview.pending).toEqual([expect.objectContaining({ reason: "manual_incomplete", slot_id: "new" })]);
    expect(templateImpactAssignments(state, state._templateImpact!)).toBeUndefined();
    await saveSelectedTemplateFromLibrary(state, template);
    expect(api.setScheduleTemplate).not.toHaveBeenCalled();
    expect(state._templateLinkedDaysOpen).toBe(true);
    expect(state._templateImpact?.assignments[0].drafts[0].temperature).toBe("");
  });

  it("commits all accepted backend assignments once through header Save", async () => {
    const { state, api } = harness();
    await saveSelectedTemplateFromLibrary(state, template);
    expect(api.setScheduleTemplate).toHaveBeenCalledTimes(1);
    expect(api.setScheduleTemplate).toHaveBeenCalledWith("work", "Work", preview().template.blocks, {
      expected_revision: 1, assignments: [{ ...destination, bindings: { new: { action: "turn_off" } } }],
    });
    expect(state._resetTemplateDraft).toHaveBeenCalledTimes(1);
  });

  it("reveals pending assignments and destination diagnostics without saving", async () => {
    const { state, api } = harness();
    api.previewScheduleTemplateUpdate.mockResolvedValue({ ...preview(), destination_errors: [{ destination, code: "incompatible", message: "Saved schedule needs repair" }] });
    await saveSelectedTemplateFromLibrary(state, template);
    expect(api.setScheduleTemplate).not.toHaveBeenCalled();
    expect(state._templateLinkedDaysOpen).toBe(true);
    expect(state._templateDraftBlocks[1].temperature).toBe("99");
  });

  it("does not reset a different or edited draft when the save response arrives", async () => {
    const { state, api } = harness();
    let resolve!: (value: unknown) => void;
    api.setScheduleTemplate.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const saving = saveSelectedTemplateFromLibrary(state, template); await settle();
    state._selectedTemplateKey = "other"; state._templateNameDraft = "Other unsaved";
    resolve({ configuration_revision: 2 }); await saving;
    expect(state._resetTemplateDraft).not.toHaveBeenCalled();
    expect(state._selectedTemplateKey).toBe("other");
    expect(state._templateNameDraft).toBe("Other unsaved");
  });

  it("preserves the revision and draft on a preview conflict", async () => {
    const { state, api } = harness();
    const blocks = structuredClone(state._templateDraftBlocks);
    api.previewScheduleTemplateUpdate.mockRejectedValue(new Error("configuration_revision_conflict"));
    await saveSelectedTemplateFromLibrary(state, template);
    expect(api.setScheduleTemplate).not.toHaveBeenCalled();
    expect(state._templateConfigurationRevision).toBe(1);
    expect(state._templateDraftBlocks).toEqual(blocks);
    expect(state._error).toContain("configuration_revision_conflict");
  });

  it("cancels scheduled previews when a draft is left", async () => {
    vi.useFakeTimers();
    const { state, api } = harness();
    queueTemplatePreview(state); cancelTemplatePreview(state);
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.previewScheduleTemplateUpdate).not.toHaveBeenCalled();
  });
  it("resets the saved draft when its own subscription updates the revision before the response", async () => {
    const { state, api } = harness();
    let resolve!: (value: unknown) => void;
    api.setScheduleTemplate.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const saving = saveSelectedTemplateFromLibrary(state, template); await settle();
    state._data = { ...state._data, configuration_revision: 2 } as never;
    resolve({ configuration_revision: 2 }); await saving;
    expect(state._resetTemplateDraft).toHaveBeenCalledTimes(1);
    expect(state._showSuccess).toHaveBeenCalledWith("templateSaved");
  });

  it("gives a new template slot its own identity when replacing the same time before debounce", async () => {
    vi.useFakeTimers();
    const { state, api } = harness();
    state._templateDraftBlocks = [{ ...template.blocks[0] }];
    Object.assign(state, {
      _blocksForSource: () => state._templateDraftBlocks,
      _setBlocksForSource: (_source: string, blocks: typeof state._templateDraftBlocks) => { state._templateDraftBlocks = blocks; },
      _markBlocksDirty: () => { state._templateDirty = true; queueTemplatePreview(state); },
      _temperatureUnit: () => "C",
    });
    const draftHost = asDraftActionsHost(state);
    removeBlock(draftHost, 0, "template");
    addBlock(draftHost, "template");
    setDraftBlockStart(draftHost, 0, "07:00", {}, "template");
    const freshId = state._templateDraftBlocks[0].slot_id!;
    expect(freshId).toBeTruthy();
    expect(freshId).not.toBe("old");
    api.previewScheduleTemplateUpdate.mockImplementation((_key, _name, blocks) => Promise.resolve({
      ...preview(), template: { ...template, blocks }, added_slot_ids: [freshId], removed_slot_ids: ["old"],
      proposals: [{ destination, slot_id: freshId, origin: "saved_match", donor_slot_id: "old", donor_start: "07:00", binding: { action: "turn_off" } }],
    }));
    await vi.advanceTimersByTimeAsync(250);
    expect(api.previewScheduleTemplateUpdate).toHaveBeenCalledTimes(1);
    expect(api.previewScheduleTemplateUpdate.mock.calls[0][2]).toEqual([expect.objectContaining({ start: "07:00", slot_id: freshId })]);
    expect(state._templateDraftBlocks[0].slot_id).toBe(freshId);
    expect(state._templateImpact?.assignments[0].drafts[0]).toMatchObject({ slot_id: freshId, action: "turn_off" });
  });

});
