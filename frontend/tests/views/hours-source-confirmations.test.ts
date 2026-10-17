// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import { climateProfileInput, type ClimateProfileDraft } from "../../src/velair/domain/climate-profiles";
import { saveSelectedDay } from "../../src/velair/controllers/schedule-actions";
import { linkDraftDay, linkedDraftBlocks } from "../../src/velair/domain/linked-schedules";
import { normalizeDraftBlocks } from "../../src/velair/domain/draft-blocks";
import type { StoredScheduleTemplate } from "../../src/velair/types";
import type { DraftScheduleBlock, ScheduleResponse, TemplateLink } from "../../src/velair/types";

const tag = "test-hours-source-confirmations-card";
if (!customElements.get(tag)) customElements.define(tag, VelairCard);
const template = { key: "workday", name: "Workday", blocks: [
  { slot_id: "morning", start: "07:00", action: "set_temperature", temperature: 20 },
  { slot_id: "night", start: "23:00", action: "turn_off" },
] };
const savedLink: TemplateLink = { template_key: "workday", bindings: {
  morning: { preset_key: "comfort" }, night: { action: "turn_off" },
} };
const incomplete = [{ start: "07:00", action: "set_temperature", temperature: "", hvac_mode: "heat" }];

function harness(source: "default" | "profile", linked = false, fresh = false) {
  const baseline = {
    behavior: "schedule", schedule: { monday: linked ? [] : [{ start: "09:00", action: "set_temperature", temperature: 19 }], tuesday: [{ start: "10:00", action: "set_temperature", temperature: 17 }] },
    ...(linked ? { template_links: { monday: structuredClone(savedLink) } } : {}),
  };
  const response = { configured_entities: ["climate.office"], templates: [template], zones: { "climate.office": baseline }, profiles: fresh ? [] : [{ key: "winter", name: "Winter", zones: { "climate.office": baseline } }] } as unknown as ScheduleResponse;
  if (source === "default") {
    const element = document.createElement(tag) as VelairCard;
    const internal = element as unknown as {
      _data: ScheduleResponse; _selectedEntity: string; _selectedWeekday: string;
      _draftTemplateLink?: TemplateLink; _draftBlocks: DraftScheduleBlock[];
      _setDayTemplateLink(key: string): boolean; _restoreOwnDaySchedule(): boolean;
      _unlinkDayTemplate(): void; _normalizeDraftBlocks: ReturnType<typeof vi.fn>;
      _markBlocksDirty: ReturnType<typeof vi.fn>;
    };
    internal._data = response;
    internal._selectedEntity = "climate.office";
    internal._selectedWeekday = "monday";
    internal._draftBlocks = structuredClone(incomplete);
    internal._normalizeDraftBlocks = vi.fn(() => ({ ok: false }));
    internal._markBlocksDirty = vi.fn();
    return {
      select: (key: string) => internal._setDayTemplateLink(key), restore: () => internal._restoreOwnDaySchedule(),
      unlink: () => internal._unlinkDayTemplate(), link: () => internal._draftTemplateLink,
      blocks: () => internal._draftBlocks, otherDay: () => internal._data.zones["climate.office"].schedule.tuesday,
      setIncomplete: () => { internal._draftBlocks = structuredClone(incomplete); },
      setEmpty: () => { internal._draftBlocks = []; },
      setName: (_name: string) => undefined, name: () => "",
      original: response, normalizer: internal._normalizeDraftBlocks,
    };
  }
  const element = new VelairProfilesView();
  element.data = response;
  const internal = element as unknown as {
    _selectedKey: string; _draft: ClimateProfileDraft;
    _linkHours(id: string, day: string, key: string): boolean;
    _restoreOwnHours(id: string, day: string): boolean; _unlinkHours(id: string, day: string): void;
    _blocks(id: string, day: string): DraftScheduleBlock[];
  };
  internal._selectedKey = "winter";
  internal._draft = { key: "winter", name: "Winter", color: "#123456", description: "", zones: { "climate.office": { behavior: "schedule", schedule: { monday: structuredClone(incomplete), tuesday: [{ start: "18:00", action: "set_temperature", temperature: 26, hvac_mode: "cool" }] } } } } as ClimateProfileDraft;
  const zone = () => {
    const result = internal._draft.zones["climate.office"];
    if (result.behavior !== "schedule") throw new Error("Expected scheduled zone");
    return result;
  };
  return {
    select: (key: string) => internal._linkHours("climate.office", "monday", key),
    restore: () => internal._restoreOwnHours("climate.office", "monday"), unlink: () => internal._unlinkHours("climate.office", "monday"),
    link: () => zone().template_links?.monday, blocks: () => internal._blocks("climate.office", "monday"),
    otherDay: () => zone().schedule.tuesday, setIncomplete: () => { zone().schedule.monday = structuredClone(incomplete); },
    setEmpty: () => { zone().schedule.monday = []; },
    setName: (name: string) => { internal._draft.name = name; }, name: () => internal._draft.name,
    original: response, normalizer: vi.fn(),
  };
}

afterEach(() => vi.restoreAllMocks());

describe.each(["default", "profile"] as const)("%s Hours source confirmations", (source) => {
  it("links a template without a replacement warning when the timeline has no blocks", () => {
    const state = harness(source);
    state.setEmpty();
    const other = structuredClone(state.otherDay());
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(state.select("workday")).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    expect(state.link()?.template_key).toBe("workday");
    expect(state.blocks()).toHaveLength(2);
    expect(state.otherDay()).toEqual(other);
  });

  it("restores own scheduling without a replacement warning when the timeline has no blocks", async () => {
    const state = harness(source);
    state.setEmpty();
    const other = structuredClone(state.otherDay());
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(await state.restore()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    expect(state.link()).toBeUndefined();
    expect(state.blocks()).toMatchObject([{ start: "09:00", temperature: 19 }]);
    expect(state.otherDay()).toEqual(other);
  });

  it("can link an invalid draft, retaining exact-hour assignments and leaving other slots incomplete", async () => {
    const state = harness(source);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    expect(state.select("workday")).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(state.blocks()).toMatchObject([{ start: "07:00", temperature: "", hvac_mode: "heat" }, { start: "23:00", temperature: "" }]);
    expect(state.link()?.bindings.morning).toMatchObject({ temperature: "", hvac_mode: "heat" });
    expect(state.link()?.bindings.night).toBeUndefined();
    expect(state.normalizer).not.toHaveBeenCalled();
    expect(state.select("workday")).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("cancels changing or restoring Hours without changing the draft", async () => {
    const state = harness(source);
    const before = structuredClone(state.blocks());
    vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(state.select("workday")).toBe(false);
    expect(await state.restore()).toBe(false);
    expect(state.blocks()).toEqual(before);
    expect(state.link()).toBeUndefined();
  });

  it("restores only the selected day's saved configuration", async () => {
    const state = harness(source);
    const other = structuredClone(state.otherDay());
    if (source === "profile") state.setName("Renamed winter");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    state.select("workday");
    expect(await state.restore()).toBe(true);
    expect(state.link()).toBeUndefined();
    expect(state.blocks()).toMatchObject([{ start: "09:00", temperature: 19 }]);
    expect(state.otherDay()).toEqual(other);
    if (source === "profile") expect(state.name()).toBe("Renamed winter");
  });

  it("materializes saved linked hours and preserves preset references when restoring Own schedule", async () => {
    const state = harness(source, true);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    expect(await state.restore()).toBe(true);
    expect(state.link()).toBeUndefined();
    expect(state.blocks()).toMatchObject([{ start: "07:00", preset_key: "comfort" }, { start: "23:00", action: "turn_off" }]);
    expect(state.blocks().every((block) => block.slot_id === undefined)).toBe(true);
    expect(state.original.profiles?.[0].zones["climate.office"]).toMatchObject({ template_links: { monday: savedLink } });
  });

  it("Unlink preserves the current draft instead of restoring the saved day", async () => {
    const state = harness(source);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    state.select("workday");
    state.unlink();
    expect(state.link()).toBeUndefined();
    expect(state.blocks()).toMatchObject([{ start: "07:00", temperature: "" }, { start: "23:00", temperature: "" }]);
  });
});

it("restores an empty Own schedule for a Profile with no persisted source", async () => {
  const state = harness("profile", false, true);
  const other = structuredClone(state.otherDay());
  vi.spyOn(window, "confirm").mockReturnValue(true);
  expect(await state.restore()).toBe(true);
  expect(state.blocks()).toEqual([]);
  expect(state.otherDay()).toEqual(other);
});

it("preserves blank range targets when linking an incomplete editor configuration", async () => {
  const range = { start: "07:00", action: "set_temperature", hvac_mode: "heat_cool", target_temp_low: "", target_temp_high: "", humidity: "" };
  const link = linkDraftDay(template as StoredScheduleTemplate, [range]);
  const result = linkedDraftBlocks(link, [template as StoredScheduleTemplate]);
  expect(result[0]).toMatchObject({ target_temp_low: "", target_temp_high: "" });
  expect(result[0].humidity).toBeUndefined();
});

it("serializes linked preset bindings without draft scaffolding in both Default and Profiles", async () => {
  const link = linkDraftDay(template as StoredScheduleTemplate, [{ start: "07:00", preset_key: "comfort", action: "", hvac_mode: "", temperature: 99 }]);
  expect(link.bindings.morning).toEqual({ preset_key: "comfort" });
  const profile = { key: "winter", name: "Winter", zones: { "climate.office": { behavior: "schedule", schedule: { monday: [] }, template_links: { monday: link } } } } as ClimateProfileDraft;
  const input = climateProfileInput(profile);
  const zone = input.zones["climate.office"];
  if (zone.behavior !== "schedule") throw new Error("Expected scheduled zone");
  expect(zone.template_links?.monday.bindings.morning).toEqual({ preset_key: "comfort" });
});

it.each([
  [{ action: "turn_off", hvac_mode: "off", temperature: 20, fan_mode: "quiet" }, { action: "turn_off" }],
  [{ action: "set_hvac_mode", hvac_mode: "heat", temperature: 20, fan_mode: "quiet" }, { action: "set_hvac_mode", hvac_mode: "heat" }],
  [{ action: "set_climate_options", hvac_mode: "cool", temperature: 20, fan_mode: "quiet" }, { action: "set_climate_options", fan_mode: "quiet" }],
  [{ action: "set_temperature", hvac_mode: "", temperature: "", fan_mode: "", humidity: "" }, { action: "set_temperature", temperature: "" }],
  [{ action: "set_temperature", hvac_mode: "heat_cool", temperature: 99, target_temp_low: "", target_temp_high: 24 }, { action: "set_temperature", hvac_mode: "heat_cool", target_temp_low: "", target_temp_high: 24 }],
])("serializes a linked manual action without stale editor fields: %j", (fields, expected) => {
  const link = linkDraftDay(template as StoredScheduleTemplate, [{ start: "07:00", hvac_mode: "", ...fields }]);
  expect(link.bindings.morning).toEqual(expected);
  const profile = { key: "winter", name: "Winter", zones: { "climate.office": { behavior: "schedule", schedule: { monday: [] }, template_links: { monday: link } } } } as ClimateProfileDraft;
  const zone = climateProfileInput(profile).zones["climate.office"];
  if (zone.behavior !== "schedule") throw new Error("Expected scheduled zone");
  expect(zone.template_links?.monday.bindings.morning).toEqual(expected);
});

it.each(["set_temperature", "set_climate_options"])("normalizes valid humidity without converting blank %s input to zero", (action) => {
  const block = { start: "07:00", action, hvac_mode: "", temperature: 20, humidity: "50" };
  const link = linkDraftDay(template as StoredScheduleTemplate, [block]);
  expect(link.bindings.morning.humidity).toBe(50);
  const profile = { key: "winter", name: "Winter", zones: { "climate.office": { behavior: "schedule", schedule: { monday: [] }, template_links: { monday: link } } } } as ClimateProfileDraft;
  const zone = climateProfileInput(profile).zones["climate.office"];
  if (zone.behavior !== "schedule") throw new Error("Expected scheduled zone");
  expect(zone.template_links?.monday.bindings.morning.humidity).toBe(50);
  const empty = linkDraftDay(template as StoredScheduleTemplate, [{ ...block, humidity: "" }]);
  expect(empty.bindings.morning.humidity).toBeUndefined();
  const invalid = linkDraftDay(template as StoredScheduleTemplate, [{ ...block, humidity: "invalid" }]);
  expect(invalid.bindings.morning.humidity).toBe("invalid");
});

it("saves restored linked Default as explicit unlink with the expected revision", async () => {
  const state = harness("default", true);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  state.restore();
  const normalized = normalizeDraftBlocks(state.blocks(), {
    duplicateStartError: () => "duplicate", invalidStartError: () => "start",
    invalidTemperatureError: () => "target", invalidClimateOptionsError: () => "options", temperatureError: () => undefined,
  });
  const api = { previewDailySchedule: vi.fn().mockResolvedValue({}), setDailySchedule: vi.fn().mockResolvedValue(state.original) };
  const host = {
    _api: () => api, _selectedEntity: "climate.office", _selectedWeekday: "monday", _saving: false, _dirty: true,
    _data: { ...state.original, configuration_revision: 7 }, _draftConfigurationRevision: 7,
    _normalizeDraftBlocks: () => normalized, _unsupportedModeError: () => undefined,
    _applyScheduleData: vi.fn(), _showSuccess: vi.fn(), _t: (key: string) => key,
  } as unknown as Parameters<typeof saveSelectedDay>[0];
  await saveSelectedDay(host);
  expect(api.setDailySchedule).toHaveBeenCalledWith("climate.office", "monday", [
    { start: "07:00", preset_key: "comfort" }, { start: "23:00", action: "turn_off" },
  ], { expected_revision: 7, unlink_template: true });
});
