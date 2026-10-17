import { describe, expect, it, vi, afterEach } from "vitest";
import { applicationState, applicationRequest, applicationPreviewCurrent, newTemplateApplication, reviewApplication, updateApplication, chooseApplicationBase, updateApplicationBlock, commitApplication, applicationDraftsValid, type ApplicationHost } from "../../src/velair/controllers/template-application";
import { toggleTemplateApplyPanel, selectTemplate, asTemplateActionsHost } from "../../src/velair/controllers/template-actions";

function fixture() {
  const group = { entity_id: "climate.room", weekdays: ["monday"], requires_base: false, alternatives: [], proposals: [{ slot_id: "a", start: "08:00", binding: { action: "set_temperature", temperature: 20 }, origin: "exact", donor_start: "08:00" }], pending: [], errors: [], replacements: [] };
  const preview = { configuration_revision: 4, can_apply: true, groups: [group], warnings: [], errors: [] };
  const api = { previewTemplateApplication: vi.fn().mockResolvedValue(preview), applyTemplateApplication: vi.fn().mockResolvedValue({ configuration_revision: 5 }) };
  const host = { _templateApplication: newTemplateApplication(), _data: { configured_entities: ["climate.room"], configuration_revision: 4 }, _templateDirty: false,
    _templateDraftBlocks: [], _selectedTemplateKey: "work", _templateApplyTargets: new Set(["climate.room::monday"]), _applyingTemplateTargets: false, _templateApplyOpen: true,
    _scheduleTemplates: () => [{ key: "work", name: "Work", blocks: [] }], _t: (key: string) => key, _api: () => api,
    _applyScheduleData: vi.fn(), _showSuccess: vi.fn(), _error: undefined } as unknown as ApplicationHost;
  return { host, api, preview, group };
}
afterEach(() => vi.unstubAllGlobals());
describe("template batch application", () => {
 it("starts with independent default individual selection", () => {
   expect(newTemplateApplication()).toMatchObject({ source: "default", mode: "copy", layout: "individual" });
 });
 it("builds complete selected weekday groups only for managed entities", () => {
   const { host } = fixture(); host._templateApplication!.layout = "weekdays_weekend";
   host._templateApplyTargets.add("climate.unmanaged::monday");
   expect(applicationRequest(host).groups).toEqual([{ entity_id: "climate.room", weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"] }]);
 });
 it("clears targets for a changed layout or destination and preserves them for mode", () => {
   const { host } = fixture(); updateApplication(host, { mode: "hours" }); expect(host._templateApplyTargets.size).toBe(1);
   updateApplication(host, { layout: "all" }, true); expect(host._templateApplyTargets.size).toBe(0);
 });
 it("requires a successful current preview before one atomic apply", async () => {
   const { host, api } = fixture(); await commitApplication(host); expect(api.applyTemplateApplication).not.toHaveBeenCalled();
   await reviewApplication(host); expect(applicationPreviewCurrent(host)).toBe(true); await commitApplication(host);
   expect(api.applyTemplateApplication).toHaveBeenCalledTimes(1); expect(api.applyTemplateApplication.mock.calls[0][0]).toMatchObject({ expected_revision: 4, template_key: "work" });
   expect(host._applyScheduleData).toHaveBeenCalledWith({ configuration_revision: 5 }, { forceDraft: true }); expect(host._templateApplyOpen).toBe(false);
 });
 it("rejects saved-template dirty state and config revision changes", async () => {
   const { host, api } = fixture(); host._templateDirty = true; await reviewApplication(host); expect(api.previewTemplateApplication).not.toHaveBeenCalled();
   host._templateDirty = false; await reviewApplication(host); host._data!.configuration_revision = 5;
   expect(applicationPreviewCurrent(host)).toBe(false); await commitApplication(host); expect(api.applyTemplateApplication).not.toHaveBeenCalled();
 });
 it("suppresses delayed previews after another revision", async () => {
   const { host, api, preview } = fixture(); let finish!: (value: unknown) => void;
   api.previewTemplateApplication.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
   const pending = reviewApplication(host); host._data!.configuration_revision = 5; finish(preview); await pending;
   expect(applicationState(host).preview).toBeUndefined(); expect(host._applyingTemplateTargets).toBe(false);
 });
 it("suppresses previews after the application lifecycle was replaced", async () => {
   const { host, api, preview } = fixture(); let finish!: (value: unknown) => void;
   api.previewTemplateApplication.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
   const pending = reviewApplication(host); host._templateApplication = newTemplateApplication(); finish(preview); await pending;
   expect(applicationState(host).preview).toBeUndefined();
 });
 it("keeps failures local and requires review after an apply error", async () => {
   const { host, api } = fixture(); await reviewApplication(host); api.applyTemplateApplication.mockRejectedValue(new Error("storage failed"));
   await commitApplication(host); expect(host._applyScheduleData).not.toHaveBeenCalled(); expect(host._error).toBe("storage failed"); expect(applicationPreviewCurrent(host)).toBe(false);
 });
 it("normalizes manual numeric bindings and only sends edited slots", () => {
   const { host, group } = fixture(); updateApplicationBlock(host, group as never, "a", { start: "08:00", slot_id: "a", action: "set_temperature", hvac_mode: "cool", temperature: "23.5" });
   expect(applicationRequest(host).groups[0].bindings).toEqual({ a: { action: "set_temperature", temperature: 23.5, hvac_mode: "cool" } });
 });
 it("serializes preset bindings without empty local fields", () => {
   const { host, group } = fixture(); updateApplicationBlock(host, group as never, "a", { start: "08:00", slot_id: "a", action: "", hvac_mode: "", preset_key: "eco" });
   expect(applicationRequest(host).groups[0].bindings).toEqual({ a: { preset_key: "eco" } });
 });
 it("retains blank drafts and prevents applying them as zero", async () => {
   const { host, group, api } = fixture(); updateApplicationBlock(host, group as never, "a", { start: "08:00", slot_id: "a", action: "set_temperature", hvac_mode: "", temperature: "" });
   expect(applicationDraftsValid(host)).toBe(false); expect(applicationRequest(host).groups[0].bindings).toEqual({});
   await reviewApplication(host); await commitApplication(host); expect(api.applyTemplateApplication).not.toHaveBeenCalled();
 });
 it("clears only the changed base group and preserves other group choices", async () => {
   const { host } = fixture(); host._templateApplication!.drafts["climate.other|monday|a"] = { start: "08:00", action: "turn_off", hvac_mode: "" };
   await chooseApplicationBase(host, "climate.room|monday", "monday"); expect(Object.keys(applicationState(host).drafts)).toEqual(["climate.other|monday|a"]);
 });
 it("guards discarding review edits on controls, close and template change", () => {
   const { host } = fixture(); host._templateApplication!.dirty = true; vi.stubGlobal("window", { confirm: vi.fn(() => false) });
   updateApplication(host, { mode: "full" }); expect(applicationState(host).mode).toBe("copy");
   toggleTemplateApplyPanel(asTemplateActionsHost(host)); expect(host._templateApplyOpen).toBe(true);
   selectTemplate(asTemplateActionsHost(host), "another"); expect(host._selectedTemplateKey).toBe("work");
 });
 it("does not start duplicate requests while busy", async () => {
   const { host, api } = fixture(); host._applyingTemplateTargets = true; await reviewApplication(host); await commitApplication(host);
   expect(api.previewTemplateApplication).not.toHaveBeenCalled(); expect(api.applyTemplateApplication).not.toHaveBeenCalled();
 });
});
