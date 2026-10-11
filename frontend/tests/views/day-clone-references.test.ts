// @vitest-environment jsdom
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairApiClient } from "../../src/velair/api/client";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import { applySelectedDayToZones, copySelectedDay } from "../../src/velair/controllers/schedule-actions";
import { climateProfileInput, createClimateProfileDraft, withProfileZoneBehavior } from "../../src/velair/domain/climate-profiles";
import { renderCopyTargets, renderZoneTargets } from "../../src/velair/views/schedule-view";
import type { ClimateProfileDraft } from "../../src/velair/domain/climate-profiles";
import type { ScheduleResponse, TemplateLink } from "../../src/velair/types";

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
const hours: TemplateLink = { mode: "hours", template_key: "work", bindings: { a: { preset_key: "comfort" } } };
const full: TemplateLink = { mode: "full", template_key: "work" };
const own = [{ start: "08:00", preset_key: "comfort" }];
const config = (link?: TemplateLink): ScheduleResponse => ({
  configuration_revision: 4, temperature_unit: "°C", configured_entities: ["climate.source", "climate.target"],
  settings: { first_weekday: "monday", zone_order: ["climate.source", "climate.target"] },
  global: { mode: "running", active_profile_ids: [] },
  block_presets: [{ key: "comfort", name: "Comfort", config: { action: "set_temperature", temperature: 21, hvac_mode: "heat" } }],
  templates: [{ key: "work", name: "Workday", blocks: [{ start: "08:00", slot_id: "a", preset_key: "comfort" }] }],
  zones: {}, profiles: [{ key: "winter", name: "Winter", zones: {
    "climate.source": { behavior: "schedule", schedule: { monday: link ? [] : own }, template_links: link ? { monday: link } : {} },
    "climate.target": { behavior: "schedule", schedule: {}, template_links: { monday: full, friday: hours } },
  } }],
} as unknown as ScheduleResponse);

async function profileFixture(link?: TemplateLink) {
  const data = config(link);
  const send = vi.fn(async (message: any) => message.type === "velair/set_profile" ? data : {
    configuration_revision: 4, profile: message.profile, resolved_schedules: {}, blocks: [{ start: "08:00", action: "set_temperature", temperature: 21, hvac_mode: "heat" }],
  });
  const view = new VelairProfilesView();
  view.hass = { language: "en", connection: { sendMessagePromise: send }, states: Object.fromEntries(data.configured_entities.map((entity) => [entity, {
    state: "heat", attributes: { friendly_name: entity, hvac_modes: ["heat", "off"], supported_features: 1, min_temp: 7, max_temp: 35, target_temp_step: 0.5 },
  }])) } as never;
  view.data = data; document.body.append(view); await view.updateComplete;
  view.shadowRoot!.querySelector<HTMLButtonElement>(".profile-item-main")!.click(); await view.updateComplete;
  view.shadowRoot!.querySelector<HTMLButtonElement>(".profile-zone-toggle")!.click(); await view.updateComplete;
  const monday = [...view.shadowRoot!.querySelectorAll<HTMLButtonElement>(".day-tab")].find((button) => button.getAttribute("aria-label")?.startsWith("Monday"))!;
  monday.click(); await view.updateComplete;
  return { view, send, data, internal: view as unknown as { _draft: ClimateProfileDraft; _busy?: string; _dirty: boolean } };
}

function check(input: HTMLInputElement) { input.checked = true; input.dispatchEvent(new Event("change")); }

describe("public day clone controls preserve references", () => {
  it.each([hours, full])("clones $mode Profile links to days and saves references rather than resolved blocks", async (link) => {
    const { view, send, internal } = await profileFixture(link);
    check(view.shadowRoot!.querySelector<HTMLInputElement>(".profile-day-copy input")!); await view.updateComplete;
    view.shadowRoot!.querySelector<HTMLButtonElement>(".profile-day-copy .command-button")!.click();
    await vi.waitFor(() => expect(internal._draft.zones["climate.source"].behavior === "schedule" && internal._draft.zones["climate.source"].template_links?.tuesday).toEqual(link));
    const input = climateProfileInput(internal._draft); const zone = input.zones["climate.source"];
    if (zone.behavior !== "schedule") throw Error("Expected schedule");
    expect(zone.schedule.tuesday).toEqual([]);
    expect(zone.template_links?.tuesday).not.toBe(zone.template_links?.monday);
    view.shadowRoot!.querySelector<HTMLButtonElement>(".template-detail-heading .template-detail-actions button")!.click();
    await vi.waitFor(() => expect(send.mock.calls.some(([message]) => message.type === "velair/set_profile")).toBe(true));
    const saved = send.mock.calls.find(([message]) => message.type === "velair/set_profile")![0];
    expect(saved.profile.zones["climate.source"].template_links.tuesday).toEqual(link);
    expect(saved.profile.zones["climate.source"].schedule.tuesday).toEqual([]);
  });
  it.each([hours, full, undefined])("clones Profile source $mode across climates preserving unrelated target links", async (link) => {
    const { view, send, internal } = await profileFixture(link);
    check(view.shadowRoot!.querySelector<HTMLInputElement>(".profile-climate-copy input")!); await view.updateComplete;
    view.shadowRoot!.querySelector<HTMLButtonElement>(".profile-climate-copy .command-button")!.click(); await view.updateComplete;
    view.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-climate-clone-dialog .profile-dialog-actions button")[1].click();
    await vi.waitFor(() => expect(view.shadowRoot!.querySelector(".profile-climate-clone-dialog")).toBeNull());
    const target = climateProfileInput(internal._draft).zones["climate.target"];
    if (target.behavior !== "schedule") throw Error("Expected schedule");
    expect(target.template_links?.friday).toEqual(hours);
    expect(target.template_links?.monday).toEqual(link);
    expect(target.schedule.monday).toEqual(link ? [] : own);
    const candidate = send.mock.calls.filter(([message]) => message.type === "velair/preview_profile").at(-1)![0];
    expect(candidate.profile.zones["climate.target"].template_links.friday).toEqual(hours);
    expect(candidate.profile.zones["climate.target"].template_links.monday).toEqual(link);
  });
  it("retains a Profile clone draft and selections after backend rejection", async () => {
    const { view, send, internal } = await profileFixture(hours);
    const before = structuredClone(internal._draft);
    send.mockRejectedValueOnce(new Error("Target is incompatible"));
    check(view.shadowRoot!.querySelector<HTMLInputElement>(".profile-climate-copy input")!); await view.updateComplete;
    view.shadowRoot!.querySelector<HTMLButtonElement>(".profile-climate-copy .command-button")!.click(); await view.updateComplete;
    view.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-climate-clone-dialog .profile-dialog-actions button")[1].click();
    await vi.waitFor(() => expect(view.shadowRoot!.querySelector(".profile-dialog-error")?.textContent).toContain("Target is incompatible"));
    expect(internal._draft).toEqual(before);
    expect(view.shadowRoot!.querySelector<HTMLInputElement>(".profile-climate-copy input")!.checked).toBe(true);
  });
  it("discards stale Profile clone responses without replacing a newer draft", async () => {
    const { view, send, internal } = await profileFixture(full);
    let settle!: (value: any) => void;
    send.mockImplementationOnce(() => new Promise((resolve) => { settle = resolve; }));
    check(view.shadowRoot!.querySelector<HTMLInputElement>(".profile-day-copy input")!); await view.updateComplete;
    view.shadowRoot!.querySelector<HTMLButtonElement>(".profile-day-copy .command-button")!.click();
    await vi.waitFor(() => expect(settle).toBeDefined());
    internal._draft = { ...internal._draft, name: "Newer draft" };
    settle({ configuration_revision: 4 });
    await vi.waitFor(() => expect(internal._busy).toBeUndefined());
    expect(internal._draft.name).toBe("Newer draft");
    expect(climateProfileInput(internal._draft).zones["climate.source"]).not.toHaveProperty("template_links.tuesday");
    expect(view.shadowRoot!.querySelector<HTMLInputElement>(".profile-day-copy input")!.checked).toBe(true);
  });
  it("remembers linked days through pause and Default behavior changes", () => {
    let draft = createClimateProfileDraft(config(hours).profiles![0]);
    draft = withProfileZoneBehavior(draft, "climate.target", "pause");
    draft = withProfileZoneBehavior(draft, "climate.target", "normal");
    draft = withProfileZoneBehavior(draft, "climate.target", "schedule");
    const target = climateProfileInput(draft).zones["climate.target"];
    expect(target).toHaveProperty("template_links", { monday: full, friday: hours });
    expect(climateProfileInput(draft)).not.toHaveProperty("rememberedTemplateLinks");
  });

  it.each([hours, full])("Default $mode public clone controls send raw reference copy requests with source-save revision", async (link) => {
    const send = vi.fn(async (message: any) => ({ ...config(link), configuration_revision: message.type === "velair/set_daily_schedule" ? 5 : 6 }));
    const api = new VelairApiClient({ connection: { sendMessagePromise: send } } as never);
    const state: any = { _selectedEntity: "climate.source", _selectedWeekday: "monday", _draftTemplateLink: link,
      _data: { ...config(link), zones: {} }, _draftConfigurationRevision: 4, _draftBlocks: [], _dirty: true,
      _copyTargets: new Set(), _zoneTargets: new Set(), _api: () => api, _applyScheduleData: vi.fn(),
      _normalizeDraftBlocks: () => ({ ok: true, blocks: [{ start: "08:00", slot_id: "a", preset_key: "comfort" }] }),
      _unsupportedModeError: () => undefined, _t: (key: string) => key, _hasDraftValidationError: () => false,
      _orderedWeekdays: () => ["monday", "tuesday"], _weekdayName: (day: string) => day, _shortWeekdayName: (day: string) => day,
      _visibleZoneIds: (ids: string[]) => ids, _friendlyEntityName: (id: string) => id, _showSuccess: vi.fn(),
      _toggleCopyTarget: (day: string) => state._copyTargets.add(day), _toggleZoneTarget: (entity: string) => state._zoneTargets.add(entity),
      _copySelectedDay: () => copySelectedDay(state), _applySelectedDayToZones: () => applySelectedDayToZones(state),
    };
    const container = document.createElement("div"); document.body.append(container);
    render(renderCopyTargets(state), container); check(container.querySelector<HTMLInputElement>("input")!);
    render(renderCopyTargets(state), container); container.querySelector<HTMLButtonElement>(".command-button")!.click();
    await vi.waitFor(() => expect(send.mock.calls.some(([message]) => message.type === "velair/copy_day_schedule")).toBe(true));
    expect(send.mock.calls[0][0]).toMatchObject({ type: "velair/set_daily_schedule", template_link: link, expected_revision: 4 });
    expect(send.mock.calls[1][0]).toMatchObject({ type: "velair/copy_day_schedule", target_weekdays: ["tuesday"], expected_revision: 5 });
    await vi.waitFor(() => expect(state._copying).toBe(false));
    state._dirty = false; state._draftConfigurationRevision = 6;
    render(renderZoneTargets(state), container); check(container.querySelector<HTMLInputElement>("input")!);
    render(renderZoneTargets(state), container); container.querySelector<HTMLButtonElement>(".command-button")!.click();
    await vi.waitFor(() => expect(send.mock.calls).toHaveLength(3));
    expect(send.mock.calls[2][0]).toMatchObject({ type: "velair/copy_day_schedule", target_entity_ids: ["climate.target"], target_weekdays: ["monday"], expected_revision: 6 });
  });
});
