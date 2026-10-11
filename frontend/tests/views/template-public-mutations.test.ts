// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/velair-card";
import type { DraftScheduleBlock, ScheduleResponse } from "../../src/velair/types";

type Host = HTMLElement & {
  view: string; updateComplete: Promise<unknown>;
  _data: ScheduleResponse; _templateDraftBlocks: DraftScheduleBlock[]; _templateDirty: boolean;
  _selectedTemplateKey: string; _templateDraftKey: string; _templateNameDraftKey: string; _templateNameDraft: string;
  _templateConfigurationRevision: number; _api(): unknown;
};
async function mount() {
  const card = document.createElement("velair-panel-card") as Host;
  const preview = vi.fn().mockImplementation((_key, name, blocks) => Promise.resolve({
    template: { key: "work", name, blocks }, configuration_revision: 1, usages: [],
    added_slot_ids: [], removed_slot_ids: ["morning"], proposals: [], pending: [], destination_errors: [],
  }));
  const save = vi.fn();
  card._api = () => ({ previewScheduleTemplateUpdate: preview, setScheduleTemplate: save });
  card.view = "templates";
  card._data = { configured_entities: [], zones: {}, profiles: [], block_presets: [], temperature_unit: "C",
    configuration_revision: 1, settings: {}, temperature_migration: { required: false },
    templates: [{ key: "work", name: "Work", blocks: [
      { start: "07:00", slot_id: "morning", action: "set_temperature", temperature: 21, hvac_mode: "heat" },
      { start: "23:00", slot_id: "night", action: "turn_off" },
    ] }],
  } as never;
  card._selectedTemplateKey = "work"; card._templateDraftKey = "work";
  card._templateNameDraftKey = "work"; card._templateNameDraft = "Work";
  card._templateConfigurationRevision = 1;
  card._templateDraftBlocks = card._data.templates[0].blocks.map((block) => ({ ...block, action: block.action!, hvac_mode: block.hvac_mode ?? "" }));
  document.body.append(card); await card.updateComplete;
  return { card, preview, save };
}
afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });

describe("template mutations through the public component", () => {
  it("deletes actual component rows including the last block and previews without saving", async () => {
    vi.useFakeTimers();
    const { card, preview, save } = await mount();
    const saved = structuredClone(card._data.templates[0].blocks);
    expect(card.shadowRoot!.querySelectorAll(".template-editor .editable-block")).toHaveLength(2);
    card.shadowRoot!.querySelector<HTMLButtonElement>(".template-editor button.danger")!.click();
    await card.updateComplete;
    expect(card._templateDraftBlocks.map((block) => block.slot_id)).toEqual(["night"]);
    expect(card.shadowRoot!.querySelectorAll(".template-editor .editable-block")).toHaveLength(1);
    expect(card._templateDirty).toBe(true);
    await vi.advanceTimersByTimeAsync(250);
    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview.mock.calls[0][2]).toEqual([{ start: "23:00", slot_id: "night", action: "turn_off" }]);
    expect(card._data.templates[0].blocks).toEqual(saved);
    expect(save).not.toHaveBeenCalled();
    card.shadowRoot!.querySelector<HTMLButtonElement>(".template-editor button.danger")!.click();
    await card.updateComplete;
    expect(card._templateDraftBlocks).toEqual([]);
    expect(card.shadowRoot!.querySelectorAll(".template-editor .editable-block")).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(250);
    expect(preview.mock.calls[1][2]).toEqual([]);
    expect(card._data.templates[0].blocks).toEqual(saved);
  });

  it("edits time, mode and target on the real draft while retaining IDs and still adds blocks", async () => {
    vi.useFakeTimers();
    const { card, preview, save } = await mount();
    const time = card.shadowRoot!.querySelector<HTMLInputElement>('.template-editor input[type="time"]')!;
    time.value = "08:00"; time.dispatchEvent(new Event("input")); await card.updateComplete;
    const mode = card.shadowRoot!.querySelector<HTMLSelectElement>(".template-editor select")!;
    mode.value = ""; mode.dispatchEvent(new Event("change")); await card.updateComplete;
    const target = card.shadowRoot!.querySelector<HTMLInputElement>('.template-editor input[type="number"]')!;
    target.value = "24"; target.dispatchEvent(new Event("input")); await card.updateComplete;
    expect(card._templateDraftBlocks[0]).toMatchObject({ slot_id: "morning", start: "08:00", hvac_mode: "", temperature: "24" });
    expect(card._templateDirty).toBe(true);
    const add = card.shadowRoot!.querySelector<HTMLButtonElement>(".template-editor .draft-add-button")!;
    add.click(); await card.updateComplete;
    expect(card._templateDraftBlocks).toHaveLength(3);
    expect(card._templateDraftBlocks[0].slot_id).toBe("morning");
    expect(card._templateDraftBlocks[2].slot_id).toBeTruthy();
    expect(card._templateDraftBlocks[2].slot_id).not.toBe("night");
    const addedTime = [...card.shadowRoot!.querySelectorAll<HTMLInputElement>('.template-editor input[type="time"]')].at(-1)!;
    addedTime.value = "12:00"; addedTime.dispatchEvent(new Event("input")); await card.updateComplete;
    await vi.advanceTimersByTimeAsync(250);
    expect(preview).toHaveBeenCalledTimes(1);
    expect(card._data.templates[0].blocks[0].start).toBe("07:00");
    expect(save).not.toHaveBeenCalled();
  });
});
