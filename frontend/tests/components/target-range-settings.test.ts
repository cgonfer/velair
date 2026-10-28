// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairTargetRangeSettings } from "../../src/velair/components/target-range-settings-element";
import { VelairApiClient } from "../../src/velair/api/client";
import type { ScheduleResponse, TargetFormatPolicy } from "../../src/velair/types";
import { renderSettingsView, renderSettingsZoneOrderRow } from "../../src/velair/views/settings-view";
import { render } from "lit";
import { entityTemperatureStepForHost } from "../../src/velair/controllers/climate-display";

const single = { start: "08:00", action: "set_temperature", hvac_mode: "heat", temperature: 21 };
const mapped: TargetFormatPolicy = { entity_id: "climate.room", kind: "mixed", configured_modes: ["heat"], range_modes: ["heat"], formats_by_mode: { heat: "range", cool: "single" }, invalid_modes: [], uncertain: false };
function element() {
  const view = new VelairTargetRangeSettings() as any;
  view.data = { configuration_revision: 7, configured_entities: ["climate.room"], zones: { "climate.room": { schedule: { monday: [single], tuesday: [{ start: "10:00", preset_key: "p" }] }, template_links: { tuesday: { mode: "full", template_key: "t" } }, target_format_policy: { ...mapped, configured_modes: null, range_modes: [], formats_by_mode: { heat: "single", cool: "single" } } } }, block_presets: [{ key: "p", name: "Preset", config: { action: "set_temperature", hvac_mode: "cool", temperature: 23 } }] } as unknown as ScheduleResponse;
  view.host = { hass: { states: {} }, _t: (key: string) => key, _friendlyEntityName: (id: string) => id, _entityTemperatureLimits: () => [16, 30], _entityTemperatureStep: () => 0.5, _formatTemperatureLimit: (value: number) => String(value), _modeLabel: (mode: string) => mode, _weekdayName: (day: string) => day, _applyScheduleData: vi.fn() };
  document.body.append(view);
  return view;
}
afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });

function integrated(view: any) {
  Object.assign(view.host, {
    _data: view.data, _settingsSaving: false,
    _entityTemperatureLimits: () => [16, 30], _temperatureUnit: () => "°C",
    _handleSettingsZoneDragOver: vi.fn(), _handleSettingsZoneDrop: vi.fn(),
    _handleSettingsZoneDragStart: vi.fn(), _handleSettingsZoneDragEnd: vi.fn(),
    _moveSettingsZone: vi.fn(), _saveExternalChangePolicy: vi.fn(), _saveZoneTargetTempStep: vi.fn(),
  });
  view.renderRow = (entityId: string, index: number, total: number, control: unknown, review: unknown, busy: boolean) => renderSettingsZoneOrderRow(view.host, entityId, index, total, { control, review, busy });
  return view;
}

async function reviewFixture(profileCount = 0, presetReferences = false, open = true) {
  const view = element(); view._selectMode("climate.room", "heat", true);
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const blocks = ["08:00", "12:00", "18:00"].map((start) => ({ ...single, start }));
  const schedule = Object.fromEntries(weekdays.map((day) => [day, presetReferences ? blocks.map(({ start }) => ({ start, preset_key: "p" })) : blocks]));
  view.data.zones["climate.room"].schedule = schedule;
  view.data.zones["climate.room"].template_links = {};
  view.data.profiles = Array.from({ length: profileCount }, (_, index) => ({ key: `profile${index}`, name: `Profile ${index}`, zones: { "climate.room": { schedule, template_links: {} } } }));
  const destinations = [undefined, ...view.data.profiles.map((profile: any) => profile.key)].map((profile_key) => ({
    source: profile_key ? "profile" : "default", profile_key, entity_id: "climate.room",
    schedule: Object.fromEntries(weekdays.map((day) => [day, blocks])), template_links: {},
    errors: weekdays.flatMap((weekday) => blocks.map((block, block_index) => ({ weekday, block_index, block, expected_formats: ["range"], message: "Use a pair" }))),
  }));
  const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: destinations, temporary_blockers: [], can_apply: false } as any);
  await view._check(); await view.updateComplete;
  if (open) await view._nextPending(true);
  return { view, preview, destinations };
}

async function flowFixture() {
  const view = element(); view._selectMode("climate.room", "heat", true);
  view.data.zones["climate.room"].schedule = { monday: [single] };
  view.data.zones["climate.room"].template_links = {};
  const destination = { source: "default", entity_id: "climate.room", schedule: { monday: [single] }, errors: [{ weekday: "monday", block_index: 0, block: single, expected_formats: ["range"], message: "pair" }] };
  const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [destination], temporary_blockers: [], can_apply: false } as any);
  await view._check(); await view.updateComplete;
  return { view, preview, destination };
}

describe("target format Settings review", () => {
  it.each([
    { configured: null, effective: ["heat_cool"], changed: "heat", selected: true },
    { configured: [], effective: [], changed: "heat", selected: true },
    { configured: ["heat"], effective: ["heat"], changed: "heat", selected: false },
    { configured: ["heat", "cool"], effective: ["heat", "cool"], changed: "heat", selected: false },
  ])("removes the unsaved review when the original selection is restored: $configured", async ({ configured, effective, changed, selected }) => {
    const view = element();
    view.data.zones["climate.room"].target_format_policy = { ...mapped, configured_modes: configured, range_modes: effective };
    const original = structuredClone(view.data);
    const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy");
    const apply = vi.spyOn(VelairApiClient.prototype, "applyTargetRangePolicy");
    view._selectMode("climate.room", changed, selected); await view.updateComplete;
    expect(view.shadowRoot.querySelector('.target-range-review')).not.toBeNull();
    view._selectMode("climate.room", changed, !selected); await view.updateComplete;
    expect(view.shadowRoot.querySelector('.target-range-review')).toBeNull();
    expect(view._modes).toBeUndefined();
    await view._check(); await view._apply();
    expect(preview).not.toHaveBeenCalled(); expect(apply).not.toHaveBeenCalled();
    expect(view.data).toEqual(original);
  });
  it("hides a reverted review but restores entered drafts if the change is selected again", async () => {
    const { view, preview } = await flowFixture();
    view._update(0, 0, "target_temp_low", "19.0");
    view._error = "Previous error";
    view._selectMode("climate.room", "heat", false); await view.updateComplete;
    expect(view.shadowRoot.querySelector('.target-range-review')).toBeNull();
    expect(view._preview).toBeUndefined(); expect(view._days).toEqual([]); expect(view._error).toBe("");
    expect(preview).toHaveBeenCalledTimes(1);
    view._selectMode("climate.room", "heat", true); await view.updateComplete;
    expect(view.shadowRoot.querySelector('.target-review-check')).not.toBeNull();
    expect(view.shadowRoot.querySelector('.target-review-apply')).toBeNull();
    await view._check();
    expect(view._days[0].blocks[0]).toMatchObject({ target_temp_low: "19.0", target_temp_high: "" });
  });
  it("keeps stale revision protection when the restored selection differs from the refreshed configuration", async () => {
    const view = element(); view._selectMode("climate.room", "heat", true);
    view.data = { ...view.data, configuration_revision: 8 };
    view.data.zones["climate.room"].target_format_policy = { ...mapped, configured_modes: ["cool"], range_modes: ["cool"] };
    view._selectMode("climate.room", "heat", false); await view.updateComplete;
    expect(view._revision).toBe(7); expect(view._modes).toEqual([]);
    expect(view.shadowRoot.querySelector('.target-range-review')).not.toBeNull();
    const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy");
    await view._check(); expect(preview).not.toHaveBeenCalled();
    expect(view._error).toBe("targetRangeStale");
  });
  it("closes an unchanged review after a refresh without carrying stale correction drafts into a new edit", async () => {
    const { view, preview } = await flowFixture();
    view._update(0, 0, "target_temp_low", "19.0");
    view.data = { ...view.data, configuration_revision: 8 };
    view._selectMode("climate.room", "heat", false); await view.updateComplete;
    expect(view.shadowRoot.querySelector('.target-range-review')).toBeNull();
    expect(view._draftDays.size).toBe(0); expect(preview).toHaveBeenCalledTimes(1);
    view._selectMode("climate.room", "heat", true);
    expect(view._revision).toBe(8);
  });
  it("discards archived values if configuration refreshes after the unchanged review closes", async () => {
    const { view, preview, destination } = await flowFixture();
    view._update(0, 0, "target_temp_low", "19.0");
    view._selectMode("climate.room", "heat", false);
    view.data = { ...view.data, configuration_revision: 8 };
    view._selectMode("climate.room", "heat", true);
    const refreshed = { ...single, temperature: 22 };
    preview.mockResolvedValue({ configuration_revision: 8, policy: mapped, affected_destinations: [{ ...destination,
      schedule: { monday: [refreshed] }, errors: [{ ...destination.errors[0], block: refreshed }],
    }], temporary_blockers: [], can_apply: false } as any);
    await view._check();
    expect(view._days[0].blocks[0]).toMatchObject({ target_temp_low: "", target_temp_high: "" });
    view._update(0, 0, "hvac_mode", "cool");
    expect(view._days[0].blocks[0].temperature).toBe(22);
  });
  it("saves edited values with a fresh preview and the exact same apply request in one click", async () => {
    const { view, preview } = await flowFixture();
    view._update(0, 0, "target_temp_low", "19.0"); view._update(0, 0, "target_temp_high", "24");
    const apply = vi.spyOn(VelairApiClient.prototype, "applyTargetRangePolicy").mockResolvedValue(view.data);
    preview.mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [], can_apply: true } as any);
    await view.updateComplete;
    expect(view.shadowRoot.querySelector('.target-review-check')).toBeNull();
    expect(view.shadowRoot.querySelector('.target-review-apply').disabled).toBe(false);
    await view._apply();
    expect(preview).toHaveBeenCalledTimes(2);
    expect(preview.mock.calls[0][0]).not.toHaveProperty("corrections");
    expect(apply.mock.calls[0][0]).toBe(preview.mock.calls[1][0]);
    expect(apply.mock.calls[0][0].corrections.destinations[0].schedule.monday[0]).toMatchObject({ target_temp_low: 19, target_temp_high: 24 });
  });
  it.each(["preview network", "apply storage", "backend validation", "revision"])("keeps Save and every raw draft after a %s failure", async (failure) => {
    const { view, preview, destination } = await flowFixture();
    view._update(0, 0, "target_temp_low", "19.0"); view._update(0, 0, "target_temp_high", "24");
    const original = JSON.stringify(view._days[0].blocks[0]);
    const apply = vi.spyOn(VelairApiClient.prototype, "applyTargetRangePolicy").mockRejectedValue(new Error("Storage failed"));
    const success = { configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [], automatic_actions: [{ entity_id: "climate.room", type: "stop_room_assist" }], can_apply: true };
    if (failure === "preview network") preview.mockRejectedValue(new Error("Connection failed"));
    else if (failure === "backend validation") preview.mockResolvedValue({ ...success, affected_destinations: [destination], can_apply: false } as any);
    else if (failure === "revision") preview.mockImplementation(async () => { view.data = { ...view.data, configuration_revision: 8 }; return success as any; });
    else preview.mockResolvedValue(success as any);
    await view._apply(); await view.updateComplete;
    expect(JSON.stringify(view._days[0].blocks[0])).toBe(original);
    expect(view.shadowRoot.querySelector('.target-review-check')).toBeNull();
    expect(view.shadowRoot.querySelector('.target-review-apply')).not.toBeNull();
    expect(apply).toHaveBeenCalledTimes(failure === "apply storage" ? 1 : 0);
    if (["backend validation", "apply storage"].includes(failure)) expect(view.shadowRoot.querySelector('.target-review-automatic-action')).not.toBeNull();
    // The alternate scalar buffer also survives the failed save.
    view._update(0, 0, "hvac_mode", "cool");
    expect(view._days[0].blocks[0].temperature).toBe(21);
    view._update(0, 0, "hvac_mode", "heat");
    expect(view._days[0].blocks[0].target_temp_low).toBe("19.0");
  });
  it("refreshes ended runtime blockers through Save and guards concurrent edits and duplicate saves", async () => {
    const { view, preview } = await flowFixture();
    view._update(0, 0, "target_temp_low", "19"); view._update(0, 0, "target_temp_high", "24");
    preview.mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [{ entity_id: "climate.room", type: "boost" }], can_apply: false } as any);
    const apply = vi.spyOn(VelairApiClient.prototype, "applyTargetRangePolicy").mockResolvedValue(view.data);
    await view._apply(); await view.updateComplete;
    expect(apply).not.toHaveBeenCalled();
    expect(view.shadowRoot.querySelector('.target-review-apply').disabled).toBe(false);
    let finish!: (value: any) => void;
    preview.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const pending = view._apply(); await view.updateComplete;
    view._selectMode("climate.room", "cool", true); view._update(0, 0, "target_temp_low", "22"); await view._apply();
    expect(view._modes).toEqual(["heat"]); expect(view._days[0].blocks[0].target_temp_low).toBe("19");
    expect(view.shadowRoot.querySelector('.target-review-cancel').disabled).toBe(true);
    finish({ configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [], can_apply: true });
    await pending; expect(apply).toHaveBeenCalledTimes(1);
  });
  it("keeps Check after discovery failure and safely replaces affected ownership after mode changes", async () => {
    const view = element(); view._selectMode("climate.room", "heat", true);
    view.data.zones["climate.room"].schedule = { monday: [{ start: "08:00", preset_key: "heat" }, { start: "12:00", preset_key: "cool" }] };
    view.data.zones["climate.room"].template_links = {};
    const blocks = [single, { ...single, start: "12:00", hvac_mode: "cool", temperature: 23 }];
    const response = (indices: number[], modes: string[]) => ({ configuration_revision: 7, policy: { ...mapped, range_modes: modes, formats_by_mode: { heat: modes.includes("heat") ? "range" : "single", cool: modes.includes("cool") ? "range" : "single" } }, affected_destinations: [{ source: "default", entity_id: "climate.room", schedule: { monday: blocks }, errors: indices.map((block_index) => ({ weekday: "monday", block_index, block: blocks[block_index], message: "pair", expected_formats: ["range"] })) }], temporary_blockers: [], can_apply: false });
    const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockRejectedValueOnce(new Error("Network failed"));
    await view._check(); await view.updateComplete;
    expect(view.shadowRoot.querySelector('.target-review-check')).not.toBeNull();
    expect(view.shadowRoot.querySelector('.target-review-apply')).toBeNull();
    preview.mockResolvedValue(response([0], ["heat"]) as any); await view._check();
    view._update(0, 0, "target_temp_low", "19.0");
    view._selectMode("climate.room", "heat", false); view._selectMode("climate.room", "cool", true); await view.updateComplete;
    expect(view.shadowRoot.querySelector('.target-review-apply')).toBeNull();
    preview.mockResolvedValue(response([1], ["cool"]) as any); await view._check();
    expect(preview.mock.calls.at(-1)[0]).not.toHaveProperty("corrections");
    expect(view._days[0].blocks[0].temperature).toBe(21);
    view._update(0, 1, "target_temp_low", "20"); view._update(0, 1, "target_temp_high", "25");
    expect(view._corrections().destinations[0].schedule.monday[0]).toEqual({ start: "08:00", preset_key: "heat" });
    view._selectMode("climate.room", "heat", true);
    preview.mockResolvedValue(response([0, 1], ["heat", "cool"]) as any); await view._check();
    expect(view._days[0].blocks[0]).toMatchObject({ target_temp_low: "19.0", target_temp_high: "" });
    expect(view._days[0].blocks[1]).toMatchObject({ target_temp_low: "20", target_temp_high: "25" });
  });
  it("shows Room Assist stop as preview information and leaves the action to the backend on Save", async () => {
    const view = element(); view._selectMode("climate.room", "heat", true);
    view.host._friendlyEntityName = () => "Living room";
    view.host.hass.callService = vi.fn();
    const original = structuredClone(view.data);
    const action = { entity_id: "climate.room", type: "stop_room_assist" };
    const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [], automatic_actions: [action, action], can_apply: true } as any);
    const apply = vi.spyOn(VelairApiClient.prototype, "applyTargetRangePolicy").mockResolvedValue(view.data);
    await view._check(); await view.updateComplete;
    const notes = view.shadowRoot.querySelectorAll('.target-review-automatic-action');
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toContain("Living room");
    expect(notes[0].textContent).toContain("targetRangeStopRoomAssist");
    expect(notes[0].classList.contains("warning")).toBe(false);
    expect(view.shadowRoot.querySelector('.target-review-apply').disabled).toBe(false);
    expect(view.data).toEqual(original);
    expect(view.host.hass.callService).not.toHaveBeenCalled();
    await view._apply();
    const request = { entity_id: "climate.room", target_range_modes: ["heat"], expected_revision: 7, corrections: { destinations: [] } };
    expect(preview).toHaveBeenCalledWith(request);
    expect(apply).toHaveBeenCalledWith(request);
    expect(view.host.hass.callService).not.toHaveBeenCalled();
    expect(view.data).toEqual(original);
  });
  it("keeps concurrent temporary blockers blocking Save alongside Room Assist information", async () => {
    const view = element(); view._selectMode("climate.room", "heat", true);
    vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [], automatic_actions: [{ entity_id: "climate.room", type: "stop_room_assist" }], temporary_blockers: [{ entity_id: "climate.room", type: "boost" }], can_apply: false } as any);
    const apply = vi.spyOn(VelairApiClient.prototype, "applyTargetRangePolicy");
    await view._check(); await view.updateComplete;
    expect(view.shadowRoot.querySelector('.target-review-automatic-action')).not.toBeNull();
    expect(view.shadowRoot.querySelector('.target-review-guidance.warning').textContent).toContain("boost");
    expect(view.shadowRoot.querySelector('.target-review-apply').disabled).toBe(false);
    await view._apply(); expect(apply).not.toHaveBeenCalled();
  });
  it.each(["default", "profile"].flatMap((source) => ["direct", "full", "hours"].map((kind) => [source, kind])))("corrects only the %s destination from a %s reference without changing resources or other climates", async (source, kind) => {
    const view = element(); view._selectMode("climate.room", "heat", true);
    const presetBlocks = [{ start: "08:00", preset_key: "p" }, { start: "12:00", preset_key: "p" }];
    const slots = presetBlocks.map((block, index) => ({ ...block, slot_id: `slot${index}` }));
    view.data.templates = [{ key: "t", name: "Original", blocks: slots }];
    const link = kind === "full" ? { mode: "full", template_key: "t" } : { template_key: "t", bindings: { slot0: { preset_key: "p" }, slot1: { preset_key: "p" } } };
    const zone = { schedule: { monday: kind === "direct" ? presetBlocks : [], tuesday: [] }, template_links: { ...(kind === "direct" ? {} : { monday: link }), tuesday: link } };
    if (source === "default") Object.assign(view.data.zones["climate.room"], zone);
    else view.data.profiles = [{ key: "work", name: "Work", zones: { "climate.room": zone } }];
    view.data.zones["climate.other"] = structuredClone(zone);
    const original = structuredClone(view.data);
    const blocks = [{ ...single, temperature: undefined, target_temp_low: 19, target_temp_high: 24, slot_id: "slot0" }, { ...single, hvac_mode: "cool", start: "12:00", slot_id: "slot1" }];
    view._days = [{ destination: { source, profile_key: source === "profile" ? "work" : undefined, entity_id: "climate.room", errors: [{ weekday: "monday", block_index: 0, block: single }] }, weekday: "monday", blocks }];
    await view._openReviewDay(view._days[0]);
    expect(view.shadowRoot.querySelector('.target-review-scope')).toBeNull();
    expect(view.shadowRoot.querySelector('option[value="local"], option[value="shared"]')).toBeNull();
    expect(view.shadowRoot.textContent).toContain(kind === "direct" ? "targetRangeUnlinkPresets" : "targetRangeUnlinkDay");
    const corrections = view._corrections();
    expect(Object.keys(corrections)).toEqual(["destinations"]);
    expect(corrections.destinations).toHaveLength(1);
    const destination = corrections.destinations[0];
    expect(destination.schedule.monday).toEqual([{ start: "08:00", action: "set_temperature", hvac_mode: "heat", target_temp_low: 19, target_temp_high: 24 }, { start: "12:00", preset_key: "p" }]);
    expect(destination.template_links.monday).toBeUndefined();
    expect(destination.template_links.tuesday).toEqual(link);
    expect(view.data).toEqual(original);
    const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [], can_apply: true } as any);
    const apply = vi.spyOn(VelairApiClient.prototype, "applyTargetRangePolicy").mockResolvedValue(view.data);
    view._preview = { policy: mapped, can_apply: false }; await view._apply();
    expect(preview.mock.calls[0][0].corrections).toEqual(corrections);
    expect(apply.mock.calls[0][0].corrections).toEqual(corrections);
  });
  it("retains independent local values for repeated presets and blocks incomplete occurrences", async () => {
    const { view, preview } = await reviewFixture(1, true);
    view._update(0, 0, "target_temp_low", "19"); view._update(0, 0, "target_temp_high", "24");
    expect(view._days[1].blocks[0].target_temp_low).toBe("");
    await view._apply(); expect(preview).toHaveBeenCalledTimes(1);
    for (let day = 0; day < view._days.length; day++) for (let block = 0; block < 3; block++) {
      view._update(day, block, "target_temp_low", day ? "20" : "19"); view._update(day, block, "target_temp_high", "24");
    }
    const corrections = view._corrections();
    expect(Object.keys(corrections)).toEqual(["destinations"]);
    expect(corrections.destinations).toHaveLength(2);
    expect(corrections.destinations[0].schedule.monday[0].target_temp_low).toBe(19);
    expect(corrections.destinations[1].schedule.monday[0].target_temp_low).toBe(20);
    expect(view.data.block_presets[0].config).toEqual({ action: "set_temperature", hvac_mode: "cool", temperature: 23 });
  });
  it("strips technical slot ids from untouched raw and fallback materialized blocks", () => {
    const view = element();
    view.data.zones["climate.room"].schedule.monday = [{ ...single }, { start: "12:00", preset_key: "p", slot_id: "raw" }];
    const blocks = [{ ...single, target_temp_low: 19, target_temp_high: 24, temperature: undefined }, { ...single, start: "12:00", slot_id: "preview" }, { ...single, start: "18:00", slot_id: "fallback" }];
    view._days = [{ destination: { source: "default", entity_id: "climate.room", errors: [{ weekday: "monday", block_index: 0, block: single }] }, weekday: "monday", blocks }];
    const result = view._corrections().destinations[0].schedule.monday;
    expect(result.every((block: any) => block.slot_id === undefined)).toBe(true);
    expect(result[1]).toEqual({ start: "12:00", preset_key: "p" });
    expect(result[2]).toEqual({ ...single, start: "18:00" });
  });
  it("shows unrelated climate validation blockers without editable rows or resource correction actions", async () => {
    const view = element(); view._selectMode("climate.room", "heat", true);
    view.host._friendlyEntityName = () => "Other room";
    const destination = { source: "default", entity_id: "climate.other", schedule: { monday: [single] }, errors: [{ weekday: "monday", block_index: 0, block: single, message: "Technical integration details" }] };
    vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [destination, destination], temporary_blockers: [], can_apply: false } as any);
    await view._check(); await view.updateComplete;
    expect(view._days).toEqual([]);
    expect(view.shadowRoot.querySelector('.target-review-other-climates').textContent).toContain("targetRangeOtherClimatesHelp");
    expect(view.shadowRoot.querySelectorAll('.target-review-other-climates li')).toHaveLength(1);
    expect(view.shadowRoot.querySelector('.target-review-other-climates li').textContent).toBe("Other room");
    expect(view.shadowRoot.textContent).not.toContain("Technical integration details");
    expect(view.shadowRoot.querySelector('.target-review-apply').disabled).toBe(false);
    expect(view._corrections()).toEqual({ destinations: [] });
  });
  it("omits pagination for a single page and retains it for multiple pages", async () => {
    const { view } = await reviewFixture(2, false, false);
    expect(view.shadowRoot.querySelector('.target-review-navigation > span')).toBeNull();
    expect(view.shadowRoot.querySelector('.target-review-pagination')).toBeNull();
    expect(view.shadowRoot.querySelector('.target-review-next-pending').disabled).toBe(false);
    const heading = view.shadowRoot.querySelector('.target-review-heading');
    expect([...heading.children].map((child: Element) => child.tagName)).toEqual(['HA-ICON', 'H3', 'SPAN', 'P']);
    const { view: multi } = await reviewFixture(5, false, false);
    expect(multi.shadowRoot.querySelector('.target-review-navigation > span').textContent).toContain('targetRangeReviewPage');
    expect(multi.shadowRoot.querySelector('.target-review-pagination')).not.toBeNull();
  });
  it("explains missing targets separately from bounds and keeps unresolved backend conflicts visible", async () => {
    const { view, preview, destinations } = await reviewFixture();
    const translate = vi.spyOn(view.host, '_t');
    expect(view._targetError({ start: '08:00', action: 'set_temperature', temperature: '' }, 'climate.room')).toBe('targetRangeMissingSingle · invalidTemperatureStep');
    expect(translate).toHaveBeenCalledWith('targetRangeMissingSingle', { min: '16', max: '30' });
    expect(translate).toHaveBeenLastCalledWith('invalidTemperatureStep', { step: '0.5' });
    expect(view._targetError({ start: '08:00', action: 'set_temperature', target_temp_low: 19, target_temp_high: '' }, 'climate.room')).toBe('targetRangeMissingPair · invalidTemperatureStep');
    expect(translate).toHaveBeenCalledWith('targetRangeMissingPair', { min: '16', max: '30' });
    expect(translate).toHaveBeenLastCalledWith('invalidTemperatureStep', { step: '0.5' });
    for (let day = 0; day < view._days.length; day++) for (let block = 0; block < 3; block++) {
      view._update(day, block, 'target_temp_low', '19'); view._update(day, block, 'target_temp_high', '24');
    }
    const technical = 'climate.room has no compatible non-off mode for a single temperature target';
    preview.mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: destinations.map((destination: any) => ({ ...destination, errors: destination.errors.map((error: any) => ({ ...error, message: technical })) })), temporary_blockers: [], can_apply: false } as any);
    await view._apply(); await view._openReviewDay(view._days[0]);
    expect(view.shadowRoot.textContent).not.toContain(technical);
    expect(view.shadowRoot.querySelector('.target-review-block .target-review-value-error').textContent).toContain('targetRangeBlockNeedsReview');
    expect(view._reviewState(view._days[0]).status).toBe('targetRangeReviewNeedsReview');
    expect(view.shadowRoot.querySelector('.target-review-apply').disabled).toBe(false);
    view._update(0, 0, 'target_temp_high', '25'); await view.updateComplete;
    expect(view.shadowRoot.querySelector('[data-review-block="0"] .target-review-value-error')).toBeNull();
  });
  it("shows a collapsed overview after checking and preserves drafts when rechecking", async () => {
    const { view } = await reviewFixture(2, false, false);
    expect(view.shadowRoot.querySelectorAll('.target-review-group')).toHaveLength(3);
    expect(view.shadowRoot.querySelectorAll('.target-review-group[open], .target-review-day-editor')).toHaveLength(0);
    expect(view.shadowRoot.querySelector('.target-review-counts').textContent).toContain('targetRangeReviewPending');
    await view._nextPending(true);
    expect(view.shadowRoot.querySelectorAll('.target-review-day-editor')).toHaveLength(1);
    for (let day = 0; day < view._days.length; day++) for (let block = 0; block < 3; block++) {
      view._update(day, block, 'target_temp_low', '19'); view._update(day, block, 'target_temp_high', '24');
    }
    const before = view._days.map((day: any) => day.blocks);
    await view._check(); await view.updateComplete;
    expect(view.shadowRoot.querySelectorAll('.target-review-group[open], .target-review-day-editor')).toHaveLength(0);
    expect(view._days.map((day: any) => day.blocks)).toEqual(before);
    const summary = view.shadowRoot.querySelector('.target-review-group > summary');
    summary.click(); await view.updateComplete;
    expect(view.shadowRoot.querySelector('.target-review-group').open).toBe(true);
    expect(view.shadowRoot.querySelectorAll('.target-review-day-editor')).toHaveLength(0);
  });
  it("shows only Cancel and Check before discovery, then Cancel and Save", async () => {
    const view = element(); view._selectMode("climate.room", "heat", true); await view.updateComplete;
    const buttons = () => [...view.shadowRoot.querySelectorAll('.target-review-actions > button')];
    expect(buttons().map((button: any) => button.textContent.trim())).toEqual(["cancel", "targetRangePreview"]);
    expect(buttons()[0].classList.contains("secondary")).toBe(true);
    expect(buttons()[1].classList.contains("success")).toBe(true);
    vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [], can_apply: true } as any);
    await view._check(); await view.updateComplete;
    expect(buttons().map((button: any) => button.textContent.trim())).toEqual(["cancel", "save"]);
    expect(buttons()[1].classList.contains("primary")).toBe(true);
  });
  it.each([11, 1234123, 1e9, 19.25])("blocks an invalid target %s even in a hidden day without mutating the draft", async (value) => {
    const { view, preview } = await reviewFixture();
    for (let day = 0; day < 7; day++) for (let block = 0; block < 3; block++) {
      view._update(day, block, "target_temp_low", "19"); view._update(day, block, "target_temp_high", "24");
    }
    view._update(6, 2, "target_temp_low", String(value));
    expect(view._reviewState(view._days[6]).status).toBe("targetRangeReviewNeedsValues");
    expect(() => view._corrections()).toThrow();
    await view._apply(); await view.updateComplete;
    expect(preview).toHaveBeenCalledTimes(1);
    expect(view._activeReviewDay).toContain("sunday");
    expect(view._days[6].blocks[2].target_temp_low).toBe(String(value));
    expect(view.shadowRoot.querySelector('.target-review-value-error').textContent).toContain(value === 19.25 ? "invalidTemperatureStep" : "invalidTemperatureRange");
    expect(view.shadowRoot.activeElement.closest('[data-review-block]').dataset.reviewBlock).toBe("2");
  });
  it("uses inclusive limits and device steps for scalar and equal-pair targets", () => {
    const view = element();
    for (const value of [16, 16.5, 30]) {
      expect(view._normalize([{ ...single, temperature: value }], "climate.room").ok).toBe(true);
      expect(view._normalize([{ ...single, temperature: undefined, target_temp_low: value, target_temp_high: value }], "climate.room").ok).toBe(true);
    }
    expect(view._normalize([{ ...single, temperature: 30.5 }], "climate.room").ok).toBe(false);
    expect(view._normalize([{ ...single, temperature: 16.25 }], "climate.room").error).toBe("invalidTemperatureStep");
    expect(view._normalize([{ ...single, temperature: undefined, target_temp_low: 24, target_temp_high: 19 }], "climate.room").error).toBe("invalidTargetRangeOrder");
  });
  it("publishes known limits and fallback steps in fields and validates Fahrenheit values", async () => {
    const { view } = await reviewFixture();
    view.host._entityTemperatureLimits = () => [48, 90];
    view.host._temperatureUnit = () => "°F"; view.host._data = view.data;
    view.data.zones["climate.room"].target_temp_step_override = 1;
    view.host._entityTemperatureStep = (entityId: string) => entityTemperatureStepForHost(view.host, entityId);
    view.requestUpdate(); await view.updateComplete;
    const input = view.shadowRoot.querySelector('.target-review-block input');
    expect([input.min, input.max, input.step]).toEqual(["48", "90", "1"]);
    expect(view._normalize([{ ...single, temperature: 70 }], "climate.room").ok).toBe(true);
    expect(view._normalize([{ ...single, temperature: 70.5 }], "climate.room").error).toBe("invalidTemperatureStep");
    expect(view._normalize([{ ...single, temperature: 91 }], "climate.room").error).toBe("invalidTemperatureRange");
  });
  it.each(["minimum", "step"])("refreshes the actual Settings child on HA-only %s changes with stable host and data", async (constraint) => {
    const initial = integrated(element()); const host = initial.host; initial.remove();
    Object.assign(host, { _firstWeekday: () => "monday", _exportSections: new Set(), _importSections: new Set(), _importAvailableSections: () => [], _portableExportSummaryItems: () => [], _portableImportSummaryItems: () => [], _portableSectionLabel: (key: string) => key });
    host.hass = { states: { "climate.room": { attributes: { min_temp: 16, max_temp: 30, target_temp_step: 0.5 } } } };
    host._entityTemperatureLimits = () => { const attributes = host.hass.states["climate.room"].attributes; return [attributes.min_temp, attributes.max_temp]; };
    host._entityTemperatureStep = () => host.hass.states["climate.room"].attributes.target_temp_step;
    const container = document.createElement("div"); document.body.append(container);
    render(renderSettingsView(host, ["climate.room"]), container);
    const coordinator = container.querySelector("velair-target-range-settings") as any; await coordinator.updateComplete;
    coordinator._selectMode("climate.room", "heat", true);
    const destination = { source: "default", entity_id: "climate.room", schedule: { monday: [single] }, errors: [{ weekday: "monday", block_index: 0, block: single, expected_formats: ["range"], message: "pair" }] };
    const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [destination], temporary_blockers: [], can_apply: false } as any);
    await coordinator._check(); coordinator._update(0, 0, "target_temp_low", "19"); coordinator._update(0, 0, "target_temp_high", "24");
    preview.mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [], can_apply: true } as any);
    await coordinator.updateComplete;
    await coordinator._openReviewDay(coordinator._days[0]);
    expect(coordinator.shadowRoot.querySelector('.target-review-apply').disabled).toBe(false);
    const stableData = host._data;
    host.hass = { ...host.hass, states: { "climate.room": { attributes: { min_temp: constraint === "minimum" ? 20 : 16, max_temp: 30, target_temp_step: constraint === "step" ? 2 : 0.5 } } } };
    render(renderSettingsView(host, ["climate.room"]), container); await coordinator.updateComplete;
    expect(container.querySelector("velair-target-range-settings")).toBe(coordinator);
    expect(coordinator.data).toBe(stableData);
    expect(coordinator.shadowRoot.querySelector('.target-review-apply').disabled).toBe(true);
    expect(coordinator.shadowRoot.querySelector('.target-review-value-error').textContent).toContain(constraint === "minimum" ? "invalidTemperatureRange" : "invalidTemperatureStep");
    expect(coordinator._days[0].blocks[0].target_temp_low).toBe("19");
  });
  it("bounds editors for 1071 blocks, navigates original indices and preserves closed drafts", async () => {
    const { view } = await reviewFixture(50);
    expect(view._days).toHaveLength(357);
    expect(view.shadowRoot.querySelectorAll('.target-review-group')).toHaveLength(5);
    expect(view.shadowRoot.querySelectorAll('.target-review-day')).toHaveLength(7);
    expect(view.shadowRoot.querySelectorAll('.target-review-day-editor')).toHaveLength(1);
    expect(view.shadowRoot.querySelectorAll('.target-review-block')).toHaveLength(3);
    view._update(0, 0, "target_temp_low", "20");
    await view._nextPending();
    expect(view._activeReviewDay).toContain("tuesday");
    view._activeReviewGroup = ""; await view.updateComplete;
    expect(view.shadowRoot.querySelectorAll('.target-review-day-editor')).toHaveLength(0);
    await view._nextPending(true);
    expect(view.shadowRoot.querySelector('input[aria-invalid="true"]').value).toBe("");
    expect(view.shadowRoot.activeElement).toBe(view.shadowRoot.querySelectorAll('.target-review-block input')[1]);
    expect(view._days[0].blocks[0].target_temp_low).toBe("20");
    view._activeReviewDay = JSON.stringify(["profile", "profile49", "climate.room", "saturday"]);
    await view._nextPending();
    expect(view._reviewPage).toBe(10);
    expect(view._activeReviewDay).toContain("sunday");
    expect(view.shadowRoot.querySelectorAll('.target-review-day-editor')).toHaveLength(1);
  });
  it("deduplicates guidance and only certifies corrections after a fresh backend check", async () => {
    const { view, preview } = await reviewFixture();
    expect(view.shadowRoot.querySelectorAll('.target-review-day-editor > .target-review-guidance')).toHaveLength(1);
    expect(view.shadowRoot.querySelector('.target-review-error-details')).toBeNull();
    expect(view.shadowRoot.textContent).not.toContain('Use a pair');
    expect(view.shadowRoot.querySelector('.target-review-value-error').textContent).toContain('targetRangeMissingPair');
    for (let day = 0; day < 7; day++) for (let block = 0; block < 3; block++) {
      view._update(day, block, "target_temp_low", "19"); view._update(day, block, "target_temp_high", "24");
    }
    await view.updateComplete;
    expect(view._reviewValidated()).toBe(false);
    expect(view.shadowRoot.querySelector('.target-review-apply').disabled).toBe(false);
    expect(view._reviewState(view._days[0]).status).toBe("targetRangeReviewReadySave");
    preview.mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [], can_apply: true } as any);
    vi.spyOn(VelairApiClient.prototype, "applyTargetRangePolicy").mockRejectedValue(new Error("Storage failed"));
    await view._apply(); await view.updateComplete;
    expect(view._reviewValidated()).toBe(true);
    expect(view._reviewState(view._days[0]).pending).toEqual([]);
    view.data = { ...view.data, configuration_revision: 8 }; await view.updateComplete;
    expect(view._reviewValidated()).toBe(false);
    expect(view.shadowRoot.querySelector('.target-review-apply').disabled).toBe(true);
  });
  it("integrates the compact dropdown and review into one managed-climate row", async () => {
    const view = integrated(element()); await view.updateComplete;
    expect(view.shadowRoot.querySelectorAll(".settings-zone-row")).toHaveLength(1);
    expect(view.shadowRoot.querySelector(".settings-zone-header > .settings-row-actions")).not.toBeNull();
    const trigger = view.shadowRoot.querySelector(".target-range-trigger") as HTMLElement;
    expect(trigger.textContent).toContain("targetRangeModesNone");
    trigger.click(); await view.updateComplete;
    const inputs = [...view.shadowRoot.querySelectorAll('.target-range-options input')] as HTMLInputElement[];
    inputs[0].click(); await view.updateComplete;
    expect(trigger.textContent).toContain("heat");
    expect(trigger.getAttribute("aria-label")).toContain("heat");
    expect(view.shadowRoot.querySelector(".settings-zone-row > .target-range-review")).not.toBeNull();
    expect(view.shadowRoot.querySelector(".target-range-settings")).toBeNull();
  });
  it("summarizes several selections while exposing all names accessibly", async () => {
    const view = integrated(element());
    view.host._t = (key: string, values?: any) => key === "targetRangeModesSeveral" ? `${values.mode} +${values.count}` : key;
    view._selectMode("climate.room", "heat", true); view._selectMode("climate.room", "cool", true);
    await view.updateComplete;
    const trigger = view.shadowRoot.querySelector(".target-range-trigger");
    expect(trigger.textContent).toContain("heat +1");
    expect(trigger.getAttribute("aria-label")).toContain("heat, cool");
    expect(trigger.title).toBe("heat, cool");
  });
  it("shows full selections only when the measured field has enough space", async () => {
    const view = integrated(element());
    view.host._t = (key: string, values?: any) => key === "targetRangeModesSeveral" ? `${values.mode} +${values.count}` : key;
    view._selectMode("climate.room", "heat", true); view._selectMode("climate.room", "cool", true); await view.updateComplete;
    const trigger = view.shadowRoot.querySelector('.target-range-trigger');
    const measure = view.shadowRoot.querySelector('.target-range-measure > span');
    let width = 200;
    Object.defineProperty(trigger, "clientWidth", { get: () => width });
    vi.spyOn(measure, "getBoundingClientRect").mockReturnValue({ width: 100 } as DOMRect);
    view._fitSummaries(); await view.updateComplete;
    expect(trigger.textContent).toContain("heat, cool");
    width = 90; view._fitSummaries(); await view.updateComplete;
    expect(trigger.textContent).toContain("heat +1");
  });
  it("supports arrow navigation, Escape focus return and outside dismissal without losing drafts", async () => {
    const view = integrated(element()); await view.updateComplete;
    const trigger = view.shadowRoot.querySelector(".target-range-trigger") as HTMLElement;
    trigger.focus(); trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })); await view.updateComplete; await Promise.resolve();
    const inputs = [...view.shadowRoot.querySelectorAll('.target-range-options input')] as HTMLInputElement[];
    expect(view.shadowRoot.activeElement).toBe(inputs.at(-1));
    inputs[0].click(); await view.updateComplete;
    inputs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await view.updateComplete;
    expect(view.shadowRoot.activeElement).toBe(trigger);
    expect(view._openEntity).toBe("");
    trigger.click(); await view.updateComplete;
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })); await view.updateComplete;
    expect(view._openEntity).toBe(""); expect(view._modes).toEqual(["heat"]);
  });
  it("keeps the active review and keyed row when climates reorder or disappear", async () => {
    const view = integrated(element());
    view.data.zones["climate.other"] = { target_format_policy: { ...mapped, entity_id: "climate.other", kind: "single" } };
    view.zoneIds = ["climate.room", "climate.other"]; await view.updateComplete;
    view._selectMode("climate.room", "heat", true); await view.updateComplete;
    const row = view.shadowRoot.querySelector('[data-entity-id="climate.room"]');
    view.zoneIds = ["climate.other", "climate.room"]; await view.updateComplete;
    expect(view.shadowRoot.querySelector('[data-entity-id="climate.room"]')).toBe(row);
    expect(row.querySelector(".target-range-review")).not.toBeNull();
    expect(view._revision).toBe(7);
    view.zoneIds = []; await view.updateComplete;
    expect(view.shadowRoot.querySelector(".target-range-orphan-review .target-range-review")).not.toBeNull();
  });
  it("keeps the coordinator mounted in the actual Settings view when the final climate disappears", async () => {
    const initial = integrated(element()); const host = initial.host; initial.remove();
    Object.assign(host, { _firstWeekday: () => "monday", _exportSections: new Set(), _importSections: new Set(), _importAvailableSections: () => [], _portableExportSummaryItems: () => [], _portableImportSummaryItems: () => [], _portableSectionLabel: (key: string) => key });
    const container = document.createElement("div"); document.body.append(container);
    render(renderSettingsView(host, ["climate.room"]), container);
    const coordinator = container.querySelector("velair-target-range-settings") as any; await coordinator.updateComplete;
    coordinator._selectMode("climate.room", "heat", true); await coordinator.updateComplete;
    host._data = { ...host._data, configuration_revision: 8, zones: {}, configured_entities: [] };
    render(renderSettingsView(host, []), container); await coordinator.updateComplete;
    expect(container.querySelector("velair-target-range-settings")).toBe(coordinator);
    expect(coordinator.shadowRoot.querySelector(".target-range-orphan-review .target-range-review")).not.toBeNull();
    expect(coordinator._revision).toBe(7);
  });
  it("hides exclusive-format controls and preserves unavailable settings informationally", async () => {
    const view = integrated(element());
    view.data.zones["climate.room"].target_format_policy = { ...mapped, kind: "range", configured_modes: ["gone"], invalid_modes: ["gone"] };
    await view.updateComplete;
    expect(view.shadowRoot.querySelector(".target-range-trigger")).toBeNull();
    expect(view.shadowRoot.textContent).not.toContain("targetRangeRangeOnly");
    expect(view.shadowRoot.querySelector('.target-range-diagnostic button')).toBeNull();
    expect(view.shadowRoot.textContent).toContain("targetRangePolicyUnavailable");
    expect(view.data.zones["climate.room"].target_format_policy.configured_modes).toEqual(["gone"]);
  });
  it("uses the real host for external-policy and step saves", async () => {
    const view = integrated(element());
    view.host._saveExternalChangePolicy = function () { this.policySaved = true; };
    view.host._saveZoneTargetTempStep = function () { this.stepSaved = true; };
    await view.updateComplete;
    const select = view.shadowRoot.querySelector('.settings-external-policy select') as HTMLSelectElement;
    select.value = "for_duration"; select.dispatchEvent(new Event("change"));
    expect(view.host.policySaved).toBe(true);
    const step = view.shadowRoot.querySelector('.settings-target-temp-step input') as HTMLInputElement;
    step.value = ".5"; step.dispatchEvent(new Event("change")); expect(view.host.stepSaved).toBe(true);
  });
  it("removes stale selected modes through the review when the climate is still mixed", async () => {
    const view = integrated(element());
    view.data.zones["climate.room"].target_format_policy = { ...mapped, configured_modes: ["gone"], invalid_modes: ["gone"] };
    await view.updateComplete;
    view.shadowRoot.querySelector('.target-range-diagnostic button').click(); await view.updateComplete;
    expect(view._modes).toEqual([]);
    expect(view.shadowRoot.querySelector('.target-range-trigger').textContent).toContain("targetRangeModesNone");
  });
  it("selects the persisted external duration action on the first managed-row render", async () => {
    const view = integrated(element());
    view.data.zones["climate.room"].external_change_policy = { action: "for_duration", duration_minutes: 10080 };
    await view.updateComplete;
    expect(view.shadowRoot.querySelector('.settings-external-policy select').value).toBe("for_duration");
    expect(view.shadowRoot.querySelector('.settings-policy-duration input').value).toBe("10080");
    const configuration = view.shadowRoot.querySelector('.settings-zone-configuration');
    expect([...configuration.children].filter((child: any) => child.tagName === "DIV")).toHaveLength(3);
    expect(configuration.querySelector('.settings-external-policy .settings-policy-controls .settings-policy-duration')).not.toBeNull();
    const dropdown = configuration.querySelector('.target-range-dropdown');
    expect(dropdown.classList.contains('select-wrap')).toBe(true);
    expect(dropdown.querySelector('.target-range-trigger ha-icon')).toBeNull();
    dropdown.querySelector('summary').click(); await view.updateComplete;
    expect(dropdown.open).toBe(true);
  });
  it("previews and applies an explicit empty selection with the captured revision", async () => {
    const view = integrated(element());
    view.data.zones["climate.room"].target_format_policy = mapped;
    view._selectMode("climate.room", "heat", false);
    const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [], can_apply: true });
    const apply = vi.spyOn(VelairApiClient.prototype, "applyTargetRangePolicy").mockResolvedValue(view.data);
    await view._check(); await view._apply();
    const request = { entity_id: "climate.room", target_range_modes: [], expected_revision: 7, corrections: { destinations: [] } };
    expect(preview).toHaveBeenCalledWith(request); expect(apply).toHaveBeenCalledWith(request);
    expect(view.host._applyScheduleData).toHaveBeenCalledWith(view.data);
  });
  it("blocks edits and reorder controls while a preview is pending", async () => {
    const view = integrated(element()); view._selectMode("climate.room", "heat", true);
    let finish!: (value: any) => void;
    vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const pending = view._check(); await view.updateComplete;
    expect(view.shadowRoot.querySelector('.settings-drag-handle').disabled).toBe(true);
    expect([...view.shadowRoot.querySelectorAll('.target-range-options input')].every((input: any) => input.disabled)).toBe(true);
    view._selectMode("climate.room", "cool", true); expect(view._modes).toEqual(["heat"]);
    view.shadowRoot.querySelector('.target-range-trigger').dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(view._openEntity).toBe("");
    finish({ configuration_revision: 7, policy: mapped, affected_destinations: [], temporary_blockers: [], can_apply: true }); await pending;
  });
  it("shows only announced modes and keeps drafts out of live configuration", async () => {
    const view = element(); await view.updateComplete;
    const labels = [...view.shadowRoot.querySelectorAll("label")].map((label: any) => label.textContent);
    expect(labels.join(" ")).toContain("heat"); expect(labels.join(" ")).not.toContain("heat_cool");
    view._selectMode("climate.room", "heat", true);
    expect(view.data.zones["climate.room"].target_format_policy.range_modes).toEqual([]);
    expect(view.host._applyScheduleData).not.toHaveBeenCalled();
  });
  it("reviews only affected days and preserves untouched presets and template links", async () => {
    const view = element(); view._selectMode("climate.room", "heat", true);
    const destination = { source: "default", entity_id: "climate.room", schedule: { monday: [single], tuesday: [{ start: "10:00", action: "set_temperature", hvac_mode: "cool", temperature: 23 }] }, template_links: view.data.zones["climate.room"].template_links, errors: [{ weekday: "monday", block_index: 0, block: single, expected_formats: ["range"], message: "Use a pair" }] };
    const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: mapped, affected_destinations: [destination], temporary_blockers: [], can_apply: false } as any);
    await view._check();
    await view.updateComplete;
    await view._nextPending(true);
    expect(view.shadowRoot.querySelector('.target-range-review .target-review-block-fields select').value).toBe("heat");
    expect(view._days).toHaveLength(1);
    expect(view._days[0].blocks[0]).toMatchObject({ target_temp_low: "", target_temp_high: "" });
    view._update(0, 0, "target_temp_low", "19"); view._update(0, 0, "target_temp_high", "24");
    const corrections = view._corrections();
    expect(corrections.destinations[0].schedule.tuesday).toEqual([{ start: "10:00", preset_key: "p" }]);
    expect(corrections.destinations[0].template_links.tuesday).toEqual({ mode: "full", template_key: "t" });
    expect(preview.mock.calls[0][0]).toMatchObject({ expected_revision: 7, target_range_modes: ["heat"] });
  });
  it("reconciles Keep and Temperature only when candidate has one possible format", async () => {
    for (const temperatureOnly of [false, true]) {
      const view = element(); view._selectMode("climate.room", "heat", true);
      const block = { ...single, hvac_mode: undefined, ...(temperatureOnly ? { temperature_only: true } : {}) };
      vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy").mockResolvedValue({ configuration_revision: 7, policy: { ...mapped, formats_by_mode: { heat: "range" } }, affected_destinations: [{ source: "default", entity_id: "climate.room", schedule: { monday: [block] }, errors: [{ weekday: "monday", block_index: 0, block, expected_formats: ["range"], message: "pair" }] }], temporary_blockers: [], can_apply: false } as any);
      await view._check(); expect(view._days[0].blocks[0].target_temp_low).toBe("");
      expect(view._days[0].blocks[0].temperature_only).toBe(temperatureOnly ? true : undefined);
      view.remove(); vi.restoreAllMocks();
    }
  });
  it("changes format when reviewing a different explicit mode", () => {
    const view = element(); view._entityId = "climate.room"; view._preview = { policy: mapped };
    view._days = [{ destination: { source: "default", entity_id: "climate.room" }, weekday: "monday", blocks: [{ ...single, temperature: undefined, target_temp_low: 19, target_temp_high: 24 }] }];
    view._update(0, 0, "hvac_mode", "cool");
    expect(view._days[0].blocks[0].temperature).toBe("");
    expect(view._days[0].blocks[0].target_temp_low).toBeUndefined();
  });
  it("rejects Save when the configuration revision is stale", async () => {
    const view = element(); view._entityId = "climate.room"; view._modes = ["heat"]; view._revision = 6; view._preview = { can_apply: true };
    const apply = vi.spyOn(VelairApiClient.prototype, "applyTargetRangePolicy");
    await view._apply(); expect(apply).not.toHaveBeenCalled(); expect(view._error).toBe("targetRangeStale");
  });
  it("does not rebase pending corrections when another checkbox changes after a config refresh", async () => {
    const view = element(); view._selectMode("climate.room", "heat", true);
    view.data = { ...view.data, configuration_revision: 8 };
    view._selectMode("climate.room", "cool", true);
    const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy");
    await view._check();
    expect(preview).not.toHaveBeenCalled();
    expect(view._error).toBe("targetRangeStale");
    expect(view._revision).toBe(7);
  });
  it.each(["hours", "full"])("preserves unaffected preset references when detaching a %s linked day", (mode) => {
    const view = element();
    const slots = [{ start: "08:00", slot_id: "morning", ...single }, { start: "12:00", slot_id: "noon", preset_key: "p" }];
    view.data.templates = [{ key: "t", name: "Times", blocks: slots }];
    const link = mode === "full" ? { template_key: "t", mode: "full" } : { template_key: "t", bindings: { morning: single, noon: { preset_key: "p" } } };
    view.data.zones["climate.room"].schedule.monday = [];
    view.data.zones["climate.room"].template_links = { monday: link };
    const blocks = [{ start: "08:00", action: "set_temperature", hvac_mode: "heat", target_temp_low: 19, target_temp_high: 24 }, { start: "12:00", action: "set_temperature", hvac_mode: "cool", temperature: 23 }];
    view._days = [{ destination: { source: "default", entity_id: "climate.room", template_links: { monday: link }, errors: [{ weekday: "monday", block_index: 0, block: blocks[0] }] }, weekday: "monday", blocks }];
    const correction = view._corrections().destinations[0];
    expect(correction.schedule.monday[1]).toEqual({ start: "12:00", preset_key: "p" });
    expect(correction.schedule.monday[1].temperature).toBeUndefined();
    expect(correction.template_links.monday).toBeUndefined();
  });
  it("retains first repair ownership when a later preview only reports the second error", async () => {
    const view = element(); view._selectMode("climate.room", "heat", true);
    const originals = [single, { ...single, start: "12:00" }];
    view.data.zones["climate.room"].schedule.monday = originals;
    const destination = { source: "default", entity_id: "climate.room", schedule: { monday: originals }, errors: originals.map((block, block_index) => ({ weekday: "monday", block_index, block, message: "pair", expected_formats: ["range"] })) };
    const preview = vi.spyOn(VelairApiClient.prototype, "previewTargetRangePolicy");
    preview.mockResolvedValueOnce({ configuration_revision: 7, policy: mapped, affected_destinations: [destination], temporary_blockers: [], can_apply: false } as any);
    await view._check();
    view._update(0, 0, "target_temp_low", "19"); view._update(0, 0, "target_temp_high", "24");
    view._update(0, 1, "target_temp_low", "20"); view._update(0, 1, "target_temp_high", "25");
    preview.mockResolvedValueOnce({ configuration_revision: 7, policy: mapped, affected_destinations: [{ ...destination, errors: [destination.errors[1]] }], temporary_blockers: [], can_apply: false } as any);
    await view._apply();
    const repaired = view._corrections().destinations[0].schedule.monday;
    expect(repaired[0]).toMatchObject({ target_temp_low: 19, target_temp_high: 24 });
    expect(repaired[1]).toMatchObject({ target_temp_low: 20, target_temp_high: 25 });
  });
});


describe("shared range reference settings", () => {
  it.each(["range", "mixed"])("offers fixed-mode references for %s entities only where ranges apply", async (kind) => {
    const view = element();
    view.data.zones["climate.room"].target_format_policy = { ...mapped, kind,
      formats_by_mode: { heat: "range", cool: "single", auto: "range", heat_cool: "range" } };
    view.requestUpdate(); await view.updateComplete;
    const inputs = [...view.shadowRoot.querySelectorAll("select[data-range-reference-mode]")] as HTMLSelectElement[];
    expect(inputs.map((input) => input.dataset.rangeReferenceMode)).toEqual(["heat"]);
    expect(inputs[0].getAttribute("aria-label")).toContain("heat");
    expect([...inputs[0].options].map((option) => option.value)).toEqual(["", "low", "high"]);
  });

  it("saves through the backend with a revision and preserves the other mode", async () => {
    const view = element();
    view.data.zones["climate.room"].target_range_reference = { heat: "low", cool: "high" };
    const saved = structuredClone(view.data);
    saved.configuration_revision = 8;
    saved.zones["climate.room"].target_range_reference.heat = "high";
    const update = vi.spyOn(VelairApiClient.prototype, "updateZoneRangeReference").mockResolvedValue(saved);
    await view._saveReference("climate.room", "heat", "high");
    expect(update).toHaveBeenCalledWith({ entity_id: "climate.room", target_range_reference: { heat: "high", cool: "high" }, expected_revision: 7 });
    expect(view.host._applyScheduleData).toHaveBeenCalledWith(saved);
    expect(view.data).toBe(saved);
    update.mockResolvedValue(saved);
    await view._saveReference("climate.room", "heat", "");
    expect(update).toHaveBeenLastCalledWith({ entity_id: "climate.room", target_range_reference: { cool: "high" }, expected_revision: 8 });
  });

  it("retains the saved selection after a failed save and prevents concurrent writes", async () => {
    const view = element();
    view.data.zones["climate.room"].target_format_policy = mapped;
    view.data.zones["climate.room"].target_range_reference = { heat: "low" };
    let reject!: (error: Error) => void;
    const update = vi.spyOn(VelairApiClient.prototype, "updateZoneRangeReference").mockReturnValue(new Promise((_resolve, rejectSave) => { reject = rejectSave; }));
    const save = view._saveReference("climate.room", "heat", "high");
    await view.updateComplete;
    expect(view.shadowRoot.querySelector("select[data-range-reference-mode]").disabled).toBe(true);
    await view._saveReference("climate.room", "cool", "low");
    expect(update).toHaveBeenCalledTimes(1);
    reject(new Error("Configuration changed")); await save; await view.updateComplete;
    expect(view.shadowRoot.querySelector("select[data-range-reference-mode]").value).toBe("low");
    expect(view.shadowRoot.querySelector('[role="alert"]').textContent).toContain("Configuration changed");
    expect(view.host._applyScheduleData).not.toHaveBeenCalled();
    expect(view.data.zones["climate.room"].target_range_reference).toEqual({ heat: "low" });
  });

  it("preserves hidden selections and blocks reference saves during a format review", async () => {
    const view = element();
    view.data.zones["climate.room"].target_range_reference = { heat: "high" };
    await view.updateComplete;
    expect(view.shadowRoot.querySelector("select[data-range-reference-mode]")).toBeNull();
    const update = vi.spyOn(VelairApiClient.prototype, "updateZoneRangeReference");
    view._selectMode("climate.room", "heat", true);
    await view._saveReference("climate.room", "heat", "low");
    expect(update).not.toHaveBeenCalled();
    expect(view.data.zones["climate.room"].target_range_reference).toEqual({ heat: "high" });
  });
});
