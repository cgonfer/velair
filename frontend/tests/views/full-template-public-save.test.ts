// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/velair-card";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import { createClimateProfileDraft } from "../../src/velair/domain/climate-profiles";
import type { ScheduleResponse } from "../../src/velair/types";

const full = { mode: "full" as const, template_key: "work" };
const template = { key: "work", name: "Workday", blocks: [{ start: "07:00", slot_id: "morning", preset_key: "comfort" }] };
const effective = [{ start: "07:00", action: "set_temperature", temperature: 20.5, hvac_mode: "heat" }];
function data(): ScheduleResponse {
  return {
    configured_entities: ["climate.room"], configuration_revision: 4, temperature_unit: "°C",
    home_assistant_temperature_unit: "°C", operational_status: "running", active_overrides: {}, next_events: [], next_event: null,
    global: { mode: "auto", active_profile_ids: [] }, settings: { first_weekday: "monday", zone_order: [] }, temperature_migration: { required: false },
    templates: [structuredClone(template)], block_presets: [{ key: "comfort", name: "Comfort", config: { action: "set_temperature", temperature: 23, hvac_mode: "heat" } }],
    resolved_template_blocks: { work: [{ ...effective[0], slot_id: "morning" }] },
    zones: { "climate.room": { schedule: { monday: [] }, template_links: { monday: structuredClone(full) } } },
    resolved_default_schedules: { "climate.room": { monday: effective } },
    profiles: [{ key: "winter", name: "Winter", icon: "mdi:calendar", color: "#123456", description: "", zones: { "climate.room": { behavior: "schedule", schedule: { monday: [] }, template_links: { monday: structuredClone(full) } } } }],
    resolved_profile_schedules: { winter: { "climate.room": { monday: effective } } },
  } as unknown as ScheduleResponse;
}
function connection(response: ScheduleResponse) {
  const send = vi.fn(async (message: Record<string, unknown>) => {
    if (message.type === "velair/preview_daily_schedule") return { blocks: effective, configuration_revision: 4 };
    if (message.type === "velair/preview_profile") return { profile: message.profile, resolved_schedules: { "climate.room": { monday: effective } }, configuration_revision: 4 };
    if (message.type === "velair/preview_schedule_template_update") return { template: { ...template, name: message.name, blocks: message.blocks }, resolved_template_blocks: [{ ...effective[0], slot_id: "morning" }], usages: [], added_slot_ids: [], removed_slot_ids: [], proposals: [], pending: [], destination_errors: [], configuration_revision: 4 };
    return response;
  });
  return { send, hass: { language: "en", connection: { sendMessagePromise: send, subscribeMessage: vi.fn(async () => () => {}) }, states: { "climate.room": { state: "heat", attributes: { friendly_name: "Room", supported_features: 1, hvac_modes: ["off", "heat", "cool"], min_temp: 7, max_temp: 35, target_temp_step: 0.5 } } } } };
}
async function settle(element: { updateComplete: Promise<unknown> }) {
  for (let count = 0; count < 8; count++) { await Promise.resolve(); await element.updateComplete; }
}
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("full template saves through public components", () => {
  it("saves Default as a full reference without persisting effective values or bindings", async () => {
    const response = data(); const { send, hass } = connection(response);
    const card = document.createElement("velair-panel-card") as HTMLElement & { updateComplete: Promise<unknown> };
    Object.assign(card, { hass, view: "schedules" });
    document.body.append(card); await settle(card);
    Object.assign(card, { _selectedEntity: "climate.room", _selectedWeekday: "monday", _draftTemplateLink: structuredClone(full), _draftConfigurationRevision: 4, _draftBlocks: [{ ...template.blocks[0], action: "set_temperature", hvac_mode: "" }], _dirty: true });
    await settle(card);
    send.mockClear();
    const save = card.shadowRoot!.querySelectorAll<HTMLButtonElement>(".schedule-save-actions button")[1];
    expect(save).toBeDefined(); expect(save.disabled).toBe(false); save.click(); await settle(card);
    const writes = send.mock.calls.map(([message]) => message).filter((message) => message.type === "velair/set_daily_schedule");
    expect(writes).toEqual([{ type: "velair/set_daily_schedule", entity_id: "climate.room", weekday: "monday", template_link: full, expected_revision: 4 }]);
    expect(send.mock.calls.some(([message]) => message.type === "velair/preview_daily_schedule")).toBe(false);
  });

  it("saves a full Profile reference atomically without destination climate bindings", async () => {
    const response = data(); const { send, hass } = connection(response);
    const view = new VelairProfilesView();
    Object.assign(view, { hass, data: response, workspace: "profiles", scheduleWorkspace: true, _selectedKey: "winter", _draft: createClimateProfileDraft(response.profiles![0]), _configurationRevision: 4 });
    document.body.append(view); await settle(view);
    send.mockClear();
    const save = view.shadowRoot!.querySelector<HTMLButtonElement>('.template-detail-actions button[title="Save"]')!;
    expect(save).not.toBeNull(); expect(save.disabled).toBe(false); save.click(); await settle(view);
    const writes = send.mock.calls.map(([message]) => message).filter((message) => message.type === "velair/set_profile");
    expect(writes).toHaveLength(1);
    const saved = writes[0].profile as { zones: Record<string, { schedule: Record<string, unknown[]>; template_links: Record<string, unknown> }> };
    expect(saved.zones["climate.room"].template_links.monday).toEqual(full);
    expect(saved.zones["climate.room"].schedule.monday).toEqual([]);
    expect(writes[0].expected_revision).toBe(4);
    expect(send.mock.calls.some(([message]) => message.type === "velair/preview_profile")).toBe(false);
  });

  it.each(["template", "preset"])("retains a %s Profile draft when authoritative validation rejects its save", async (source) => {
    const response = data(); const { send, hass } = connection(response);
    if (source === "preset") {
      const zone = response.profiles![0].zones["climate.room"];
      if (zone.behavior !== "schedule") throw new Error("Expected schedule");
      zone.template_links = {};
      zone.schedule.monday = [{ start: "07:00", preset_key: "comfort" }];
    }
    const view = new VelairProfilesView();
    Object.assign(view, { hass, data: response, workspace: "profiles", scheduleWorkspace: true,
      _selectedKey: "winter", _draft: createClimateProfileDraft(response.profiles![0]), _configurationRevision: 4 });
    document.body.append(view); await settle(view);
    Object.assign(view, { _dirty: true });
    const before = structuredClone((view as any)._draft);
    let reject!: (error: Error) => void;
    send.mockClear();
    send.mockImplementation((message) => {
      if (message.type === "velair/set_profile") return new Promise((_resolve, rejectRequest) => { reject = rejectRequest; }) as never;
      throw new Error(`Unexpected request during save: ${message.type}`);
    });
    const pending = (view as unknown as { _save(): Promise<void> })._save();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].type).toBe("velair/set_profile");
    expect(view.scheduleSavePending).toBe(true);
    expect((view as any)._dirty).toBe(true);
    reject(new Error("Referenced resource is no longer available"));
    await pending; await settle(view);
    expect(view.scheduleSavePending).toBe(false);
    expect((view as any)._dirty).toBe(true);
    expect((view as any)._draft).toEqual(before);
    expect((view as any)._configurationRevision).toBe(4);
    expect((view as any)._error).toContain("Referenced resource is no longer available");
  });

  it("shows backend template targets and saves its preset reference after renaming", async () => {
    const response = data(); const { send, hass } = connection(response);
    const card = document.createElement("velair-panel-card") as HTMLElement & { updateComplete: Promise<unknown> };
    Object.assign(card, { hass, view: "templates" });
    document.body.append(card); await settle(card);
    card.shadowRoot!.querySelector<HTMLButtonElement>(".template-item-main")!.click(); await settle(card);
    const target = card.shadowRoot!.querySelector<HTMLInputElement>('.template-editor input[type="number"]')!;
    expect(target.value).toBe("20.5"); expect(target.disabled).toBe(true);
    const name = card.shadowRoot!.querySelector<HTMLInputElement>(".template-name-input-wrap input")!;
    name.value = "Workday updated"; name.dispatchEvent(new Event("input")); await settle(card);
    const save = card.shadowRoot!.querySelector<HTMLButtonElement>('.template-detail-actions button[title="Save"]')!;
    expect(save.disabled).toBe(false); save.click(); await settle(card);
    const writes = send.mock.calls.map(([message]) => message).filter((message) => message.type === "velair/set_schedule_template");
    expect(writes).toHaveLength(1);
    expect(writes[0].blocks).toEqual(template.blocks);
    expect(writes[0].name).toBe("Workday updated");
  });

  it("saves a scheduled preset as a new template without flattening its reference", async () => {
    const response = data(); const { send, hass } = connection(response);
    response.zones["climate.room"].schedule.monday = [{ start: "07:00", preset_key: "comfort" }];
    response.zones["climate.room"].template_links = {};
    vi.spyOn(window, "prompt").mockReturnValue("Copied comfort");
    const card = document.createElement("velair-panel-card") as HTMLElement & { updateComplete: Promise<unknown> };
    Object.assign(card, { hass, view: "schedules" });
    document.body.append(card); await settle(card);
    Object.assign(card, { _selectedEntity: "climate.room", _selectedWeekday: "monday", _draftConfigurationRevision: 4, _draftBlocks: [{ start: "07:00", preset_key: "comfort", action: "set_temperature", hvac_mode: "" }] });
    await settle(card);
    const saveTemplate = card.shadowRoot!.querySelector<HTMLButtonElement>(".schedule-save-actions button")!;
    expect(saveTemplate.disabled).toBe(false); saveTemplate.click(); await settle(card);
    const writes = send.mock.calls.map(([message]) => message).filter((message) => message.type === "velair/set_schedule_template");
    expect(writes).toHaveLength(1);
    expect(writes[0].blocks).toEqual([{ start: "07:00", preset_key: "comfort" }]);
    expect(writes[0].name).toBe("Copied comfort");
  });
});
