// @vitest-environment jsdom
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import { bindingsFromBlocks, linkedDraftBlocks } from "../../src/velair/domain/linked-schedules";
import { scheduleTemplatesFromStored } from "../../src/velair/domain/templates";
import { renderEditableBlock, renderLinkedHoursControl } from "../../src/velair/views/schedule-view";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { ScheduleResponse, StoredScheduleTemplate } from "../../src/velair/types";

const tag = "test-full-template-card";
if (!customElements.get(tag)) customElements.define(tag, VelairCard);
const template: StoredScheduleTemplate = { key: "work", name: "Work", blocks: [
  { start: "07:00", slot_id: "morning", preset_key: "comfort" },
  { start: "23:00", slot_id: "night", action: "set_temperature", temperature: 18.3, hvac_mode: "heat" },
] };
function harness(source: "default" | "profile") {
  const effective = [
    { start: "07:00", slot_id: "morning", action: "set_temperature", temperature: 22, hvac_mode: "heat" },
    { start: "23:00", slot_id: "night", action: "set_temperature", temperature: 18.5, hvac_mode: "heat" },
  ];
  const materialized = [{ start: "07:00", preset_key: "comfort" }, { start: "23:00", action: "set_temperature", temperature: 18.5, hvac_mode: "heat" }];
  const send = vi.fn().mockResolvedValue({ blocks: effective, configuration_revision: 1, materialized_blocks: materialized, resolved_schedules: { "climate.room": { monday: effective } }, materialized_schedules: { "climate.room": { monday: materialized } } });
  const data = { configuration_revision: 1, configured_entities: ["climate.room"], zones: {}, settings: {}, profiles: [], templates: [template], block_presets: [{ key: "comfort", name: "Comfort", config: { temperature: 23 } }] } as unknown as ScheduleResponse;
  const hass = { language: "en", states: { "climate.room": { state: "heat", attributes: { hvac_modes: ["heat", "off"], min_temp: 7, max_temp: 35 } } }, connection: { sendMessagePromise: send } };
  if (source === "default") {
    const element = document.createElement(tag) as VelairCard;
    const state = element as any;
    state.hass = hass; state._data = data; state._selectedEntity = "climate.room"; state._selectedWeekday = "monday"; state._scheduleSource = "default";
    state._draftTemplateLink = { template_key: "work", bindings: { morning: { action: "turn_off" }, night: { preset_key: "comfort" } } };
    state._draftBlocks = linkedDraftBlocks(state._draftTemplateLink, [template]);
    return { send, data, state, host: () => state as VelairViewHost, scope: (mode: string) => state._setDayTemplateScope(mode), unlink: () => state._unlinkDayTemplate(), blocks: () => state._draftBlocks, refresh: () => state._refreshPresetPreviews(), link: () => state._draftTemplateLink };
  }
  const element = new VelairProfilesView();
  const state = element as any;
  element.hass = hass as never; element.data = data;
  state._selectedKey = "winter"; state._selectedEntity = "climate.room"; state._selectedDays = { "climate.room": "monday" };
  state._draft = { key: "winter", name: "Winter", zones: { "climate.room": { behavior: "schedule", schedule: { monday: [], tuesday: [{ start: "12:00", action: "turn_off", hvac_mode: "" }] }, template_links: { monday: { template_key: "work", bindings: { morning: { action: "turn_off" }, night: { preset_key: "comfort" } } } } } } };
  return { send, data, state, host: () => state._blockEditorHost("climate.room", "monday") as VelairViewHost, scope: (mode: string) => state._setHoursScope("climate.room", "monday", mode), unlink: () => state._unlinkHours("climate.room", "monday"), blocks: () => state._blocks("climate.room", "monday"), refresh: () => state._refreshPresetPreviews(), link: () => state._draft.zones["climate.room"].template_links.monday };
}
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
describe.each(["default", "profile"] as const)("full template links in %s", (source) => {
  it("confirms replacing settings, cancels intact and materializes raw preset references on returning to hours", async () => {
    const h = harness(source); const before = structuredClone(h.link());
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const container = document.createElement("div"); render(renderLinkedHoursControl(h.host()), container);
    const select = container.querySelector<HTMLSelectElement>(".template-link-scope select")!;
    select.value = "full"; select.dispatchEvent(new Event("change")); await Promise.resolve();
    expect(h.link()).toEqual(before); expect(select.value).toBe("hours");
    confirm.mockReturnValue(true); select.value = "full"; select.dispatchEvent(new Event("change")); await Promise.resolve();
    expect(h.link()).toEqual({ mode: "full", template_key: "work" });
    expect(h.blocks()[0].preset_key).toBe("comfort");
    await h.scope("hours"); expect(h.link().bindings.morning).toEqual({ preset_key: "comfort" });
    expect(h.link().bindings.night.temperature).toBe(18.5);
    expect(h.send).not.toHaveBeenCalledWith(expect.objectContaining({ type: "velair/set_daily_schedule" }));
  });
  it("preserves mixed range/options/preset materialization without frontend rounding or reference expansion", async () => {
    const h = harness(source); vi.spyOn(window, "confirm").mockReturnValue(true); await h.scope("full");
    const blocks = [{ start: "07:00", preset_key: "comfort" }, { start: "23:00", action: "set_temperature", hvac_mode: "heat_cool", target_temp_low: 18.5, target_temp_high: 24.5, humidity: 50, fan_mode: "auto" }];
    h.send.mockResolvedValueOnce({ configuration_revision: 1, materialized_blocks: blocks, materialized_schedules: { "climate.room": { monday: blocks } } });
    expect(await h.scope("hours")).toBe(true);
    expect(h.link().bindings.morning).toEqual({ preset_key: "comfort" });
    expect(h.link().bindings.night).toEqual({ action: "set_temperature", hvac_mode: "heat_cool", target_temp_low: 18.5, target_temp_high: 24.5, humidity: 50, fan_mode: "auto" });
    const request = h.send.mock.calls[0][0];
    expect(request.type).toBe(source === "default" ? "velair/preview_daily_schedule" : "velair/preview_profile");
    if (source === "profile") expect(request.profile.zones["climate.room"].schedule.tuesday).toEqual([{ start: "12:00", action: "turn_off" }]);
  });
  it("leaves the full draft intact on failure, newer backend revisions and stale replies", async () => {
    const h = harness(source); vi.spyOn(window, "confirm").mockReturnValue(true); await h.scope("full");
    const before = structuredClone(h.link());
    h.send.mockRejectedValueOnce(new Error("Unavailable"));
    expect(await h.scope("hours")).toBe(false); expect(h.link()).toEqual(before);
    h.send.mockResolvedValueOnce({ configuration_revision: 2, materialized_blocks: [], materialized_schedules: { "climate.room": { monday: [] } } });
    expect(await h.scope("hours")).toBe(false); expect(h.link()).toEqual(before);
    let resolve!: (value: unknown) => void;
    h.send.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const pending = h.scope("hours");
    expect(h.host()._materializingTemplate).toBe(true);
    expect(await h.scope("hours")).toBe(false);
    h.data.configuration_revision = 3;
    resolve({ configuration_revision: 1, materialized_blocks: [], materialized_schedules: { "climate.room": { monday: [] } } });
    expect(await pending).toBe(false); expect(h.link()).toEqual(before);
    expect(h.host()._materializingTemplate).toBe(false);
  });
  it("shows backend-adapted full targets with all configuration controls readonly and unlinks retaining references", async () => {
    const h = harness(source); vi.spyOn(window, "confirm").mockReturnValue(true); h.scope("full"); h.refresh();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    const host = h.host(); const container = document.createElement("div");
    render(renderEditableBlock(host, h.blocks()[1], 1, source === "default" ? "schedule" : "template"), container);
    expect(container.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe("18.5");
    for (const input of container.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")) expect(input.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>("button.danger")?.disabled).toBe(true);
    expect(bindingsFromBlocks(h.link(), [])).toEqual({ mode: "full", template_key: "work" });
    await h.unlink(); expect(h.link()).toBeUndefined(); expect(h.blocks()[0].preset_key).toBe("comfort");
    expect(h.blocks().every((block: any) => !block.slot_id)).toBe(true);
  });
});
it("keeps template preset drafts exclusive and never invents a temperature", () => {
  const draft = scheduleTemplatesFromStored([template])[0].blocks[0];
  expect(draft.preset_key).toBe("comfort"); expect(draft.temperature).toBeUndefined();
  expect(linkedDraftBlocks({ mode: "full", template_key: "work" }, [template])[0]).toEqual(draft);
});
