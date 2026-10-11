// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { DraftScheduleBlock, ScheduleBlock, ScheduleResponse } from "../../src/velair/types";
import type { ClimateProfileDraft } from "../../src/velair/domain/climate-profiles";
import { PresetPreviewCache } from "../../src/velair/domain/preset-preview";

const tag = "test-preset-settings-preview-card";
if (!customElements.get(tag)) customElements.define(tag, VelairCard);
const block = { start: "07:00", preset_key: "comfort", action: "", hvac_mode: "" };
const data = () => ({ configuration_revision: 1, configured_entities: ["climate.office"], zones: {}, profiles: [], templates: [], block_presets: [{ key: "comfort", name: "Comfort", config: { action: "set_temperature", temperature: 25 } }] }) as unknown as ScheduleResponse;

function harness(source: "default" | "profile", send: ReturnType<typeof vi.fn>) {
  const hass = { language: "en", connection: { sendMessagePromise: send }, states: { "climate.office": { state: "heat", attributes: {} } } };
  if (source === "default") {
    const element = document.createElement(tag) as VelairCard;
    element.hass = hass as never;
    const state = element as unknown as { _data: ScheduleResponse; _draftBlocks: DraftScheduleBlock[]; _selectedEntity: string; _selectedWeekday: string; _scheduleSource: string; _refreshPresetPreviews(): void; _error?: string } & VelairViewHost;
    state._data = data(); state._draftBlocks = [structuredClone(block), { start: "23:00", action: "set_temperature", hvac_mode: "", temperature: "" }];
    state._selectedEntity = "climate.office"; state._selectedWeekday = "monday"; state._scheduleSource = "default";
    return {
      refresh: () => state._refreshPresetPreviews(), get: () => state._effectivePresetBlock?.(state._draftBlocks[0], 0, "schedule"),
      status: () => state._presetSettingsStatus?.(state._draftBlocks[0], 0, "schedule"), error: () => state._error,
      revision: () => { state._data = { ...state._data, configuration_revision: 2 }; },
      navigate: () => { state._selectedWeekday = "tuesday"; },
      retry: () => state._retryPresetSettings?.(state._draftBlocks[0], 0, "schedule"), raw: () => state._draftBlocks[0],
      unlink: () => state._unlinkPresetBlock?.(0, "schedule"), other: () => state._draftBlocks[1],
      initialTuesday: () => { state._selectedWeekday = "tuesday"; }, setSaveError: () => { state._error = "Existing save failure"; },
      seedResolved: (slot = false) => {
        if (slot) state._draftBlocks[0].slot_id = "slotA";
        state._data = { ...state._data, resolved_default_schedules: { "climate.office": { monday: [{ start: "07:00", action: "set_temperature", temperature: 20.5 }] } }, resolved_block_metadata: { default: { "climate.office": { monday: [{ start: "07:00", preset_key: "comfort", ...(slot ? { slot_id: "slotA" } : {}) }] } }, profiles: {} } };
      },
    };
  }
  const element = new VelairProfilesView();
  element.hass = hass as never; element.data = data();
  const state = element as unknown as { _selectedKey: string; _selectedEntity: string; _selectedDays: Record<string, string>; _draft: ClimateProfileDraft; _refreshPresetPreviews(): void; _blockEditorHost(id: string, day: string): VelairViewHost; _blocks(id: string, day: string): DraftScheduleBlock[]; _error?: string };
  state._selectedKey = "winter"; state._selectedEntity = "climate.office"; state._selectedDays = { "climate.office": "monday" };
  state._draft = { key: "winter", name: "Winter", zones: { "climate.office": { behavior: "schedule", schedule: { monday: [structuredClone(block), { start: "23:00", action: "set_temperature", hvac_mode: "", temperature: "" }] } } } } as ClimateProfileDraft;
  const day = () => state._selectedDays["climate.office"] ?? (element.initialWeekday || "monday");
  const host = () => state._blockEditorHost("climate.office", day());
  return {
    refresh: () => state._refreshPresetPreviews(), get: () => host()._effectivePresetBlock?.(state._blocks("climate.office", day())[0] ?? block, 0, "template"),
    status: () => host()._presetSettingsStatus?.(state._blocks("climate.office", day())[0] ?? block, 0, "template"), error: () => state._error,
    revision: () => { element.data = { ...element.data, configuration_revision: 2 } as ScheduleResponse; },
    navigate: () => { state._selectedDays["climate.office"] = "tuesday"; },
    retry: () => host()._retryPresetSettings?.(block, 0, "template"), raw: () => state._blocks("climate.office", day())[0],
    unlink: () => host()._unlinkPresetBlock?.(0, "template"), other: () => state._blocks("climate.office", day())[1],
    initialTuesday: () => {
      state._selectedDays = {}; element.initialWeekday = "tuesday";
      const zone = state._draft.zones["climate.office"];
      if (zone.behavior === "schedule") zone.schedule.tuesday = zone.schedule.monday;
    }, setSaveError: () => { state._error = "Existing save failure"; },
    seedResolved: (slot = false) => {
      if (slot) state._blocks("climate.office", day())[0].slot_id = "slotA";
      element.data = { ...element.data, resolved_profile_schedules: { winter: { "climate.office": { monday: [{ start: "07:00", action: "set_temperature", temperature: 20.5 }] } } }, resolved_block_metadata: { default: {}, profiles: { winter: { "climate.office": { monday: [{ start: "07:00", preset_key: "comfort", ...(slot ? { slot_id: "slotA" } : {}) }] } } } } } as ScheduleResponse;
    },
  };
}

async function settle() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }

describe.each(["default", "profile"] as const)("%s preset settings previews", (source) => {
  it.each([false, true])("retains saved backend values on the first time change (slot: %s)", async (slot) => {
    const send = vi.fn(); const state = harness(source, send);
    state.seedResolved(slot); state.refresh();
    expect(state.get()?.temperature).toBe(20.5);
    state.raw().start = "08:00"; state.refresh();
    expect(state.get()).toMatchObject({ start: "08:00", temperature: 20.5 });
    expect(state.status()).toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    await state.unlink();
    expect(state.raw()).toMatchObject({ start: "08:00", temperature: 20.5 });
    expect(state.raw().preset_key).toBeUndefined();
  });

  it("keeps effective settings visible while changing only the block time", async () => {
    const send = vi.fn().mockResolvedValue({ blocks: [{ start: "07:00", action: "set_temperature", hvac_mode: "heat", temperature: 20.5 }] });
    const state = harness(source, send);
    state.refresh(); await settle();
    for (const start of ["07:15", "07:30", "08:00"]) {
      state.raw().start = start; state.refresh();
      expect(state.get()).toMatchObject({ start, temperature: 20.5, hvac_mode: "heat" });
      expect(state.status()).toBeUndefined();
    }
    expect(send).toHaveBeenCalledTimes(1);
    await state.unlink();
    expect(state.raw()).toMatchObject({ start: "08:00", temperature: 20.5 });
  });

  it("accepts a pending preset preview after a time-only drag without another request", async () => {
    let finish!: (value: { blocks: ScheduleBlock[] }) => void;
    const send = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const state = harness(source, send);
    state.refresh(); state.raw().start = "08:00"; state.refresh();
    finish({ blocks: [{ start: "07:00", action: "set_temperature", temperature: 21 }] });
    await settle();
    expect(state.get()).toMatchObject({ start: "08:00", temperature: 21 });
    expect(state.status()).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not restore an old time when an unlink response arrives after moving the block", async () => {
    let finish!: (value: { blocks: ScheduleBlock[] }) => void;
    const send = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const state = harness(source, send);
    const unlink = state.unlink();
    state.raw().start = "08:00";
    finish({ blocks: [{ start: "07:00", action: "set_temperature", temperature: 21 }] });
    await unlink;
    expect(state.raw()).toMatchObject({ start: "08:00", preset_key: "comfort" });
  });

  it("shows the backend-adapted configuration even with another incomplete block, preserving references", async () => {
    const send = vi.fn().mockResolvedValue({ blocks: [{ start: "07:00", action: "set_temperature", temperature: 20.5, fan_mode: "quiet" }] });
    const state = harness(source, send);
    expect(state.get()).toBeUndefined();
    state.refresh();
    expect(state.status()).toBe("loading");
    await settle();
    expect(state.get()).toMatchObject({ temperature: 20.5, fan_mode: "quiet" });
    expect(state.status()).toBeUndefined();
    expect(send).toHaveBeenCalledWith({ type: "velair/preview_daily_schedule", entity_id: "climate.office", weekday: "monday", blocks: [{ start: "07:00", preset_key: "comfort" }] });
    expect(state.raw()).toMatchObject({ preset_key: "comfort", action: "", hvac_mode: "" });
    expect(state.raw().temperature).toBeUndefined();
    state.refresh();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("discards old results when the library revision changes and refreshes the new configuration", async () => {
    let finish!: (value: { blocks: ScheduleBlock[] }) => void;
    const send = vi.fn().mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ blocks: [{ start: "07:00", action: "set_temperature", temperature: 22 }] });
    const state = harness(source, send);
    state.refresh(); state.revision(); state.refresh();
    finish({ blocks: [{ start: "07:00", action: "set_temperature", temperature: 19 }] });
    await settle();
    expect(state.get()?.temperature).toBe(22);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("ignores errors after navigating to another day", async () => {
    let fail!: (error: Error) => void;
    const send = vi.fn().mockReturnValue(new Promise((_resolve, reject) => { fail = reject; }));
    const state = harness(source, send);
    state.refresh(); state.navigate(); fail(new Error("old request failure"));
    await settle();
    expect(state.get()).toBeUndefined();
    expect(state.error()).toBeUndefined();
  });

  it("shows a current preview error and supports explicit retry", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("Device settings incompatible")).mockResolvedValue({ blocks: [{ start: "07:00", action: "turn_off" }] });
    const state = harness(source, send);
    state.refresh(); await settle();
    expect(state.status()).toBe("unavailable");
    expect(state.error()).toBeUndefined();
    state.refresh(); expect(send).toHaveBeenCalledTimes(1);
    state.retry(); await settle();
    expect(state.get()?.action).toBe("turn_off");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("unlinks one preset while retaining another incomplete draft block", async () => {
    const send = vi.fn().mockResolvedValue({ blocks: [{ start: "07:00", action: "set_temperature", temperature: 20.5 }] });
    const state = harness(source, send);
    const other = structuredClone(state.other());
    await state.unlink();
    expect(state.raw()).toMatchObject({ start: "07:00", temperature: 20.5 });
    expect(state.raw().preset_key).toBeUndefined();
    expect(state.other()).toEqual(other);
    expect(send.mock.calls[0][0].blocks).toEqual([{ start: "07:00", preset_key: "comfort" }]);
  });

  it("does not overwrite unrelated save errors when a preview fails or retries", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("preview failed")).mockResolvedValue({ blocks: [{ start: "07:00", action: "turn_off" }] });
    const state = harness(source, send);
    state.setSaveError(); state.refresh(); await settle();
    expect(state.error()).toBe("Existing save failure");
    state.retry(); await settle();
    expect(state.status()).toBeUndefined();
    expect(state.error()).toBe("Existing save failure");
  });
});

it("previews the same initial Tuesday selected by the Profile schedule renderer", async () => {
  const send = vi.fn().mockResolvedValue({ blocks: [{ start: "07:00", action: "turn_off" }] });
  const state = harness("profile", send);
  state.initialTuesday(); state.refresh(); await settle();
  expect(send.mock.calls[0][0].weekday).toBe("tuesday");
  expect(state.get()?.action).toBe("turn_off");
});

it("retains more than 64 active previews without repeated eviction requests", async () => {
  const cache = new PresetPreviewCache();
  const keys = new Set(Array.from({ length: 70 }, (_, index) => String(index)));
  const load = vi.fn().mockResolvedValue({ start: "07:00", action: "turn_off" });
  const changed = vi.fn();
  cache.retain(keys);
  for (const key of keys) cache.request(key, load, () => true, changed, vi.fn());
  await settle();
  for (const key of keys) {
    expect(cache.get(key)?.block?.action).toBe("turn_off");
    cache.request(key, load, () => true, changed, vi.fn());
  }
  expect(load).toHaveBeenCalledTimes(70);
  cache.retain(new Set());
  expect(cache.get("0")).toBeUndefined();
});


it("previews an unpublished Profile carry-over preset using its source day", async () => {
  const send = vi.fn().mockResolvedValue({ blocks: [{ start: "23:00", action: "turn_off" }] });
  const element = new VelairProfilesView();
  element.data = data();
  element.hass = { connection: { sendMessagePromise: send }, states: {} } as never;
  const state = element as unknown as {
    _selectedKey: string; _selectedEntity: string; _selectedDays: Record<string, string>;
    _draft: ClimateProfileDraft; _refreshPresetPreviews(): void;
    _blockEditorHost(id: string, day: string): VelairViewHost;
  };
  state._selectedKey = "winter"; state._selectedEntity = "climate.office";
  state._selectedDays = { "climate.office": "tuesday" };
  state._draft = { key: "winter", name: "Winter", zones: { "climate.office": { behavior: "schedule", schedule: {
    monday: [{ start: "07:00", action: "turn_off", hvac_mode: "" }, { ...block, start: "23:00" }], tuesday: [{ start: "07:00", action: "set_temperature", hvac_mode: "heat", temperature: 21 }],
  } } } } as ClimateProfileDraft;
  state._refreshPresetPreviews(); await settle();
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0][0]).toMatchObject({ weekday: "monday", blocks: [{ start: "23:00", preset_key: "comfort" }] });
  const editor = state._blockEditorHost("climate.office", "tuesday");
  expect(editor._effectivePresetBlockForDay?.({ ...block, start: "23:00" }, 0, "monday")?.action).toBe("turn_off");
  const zone = state._draft.zones["climate.office"];
  if (zone.behavior === "schedule") zone.schedule.monday[1].start = "22:00";
  expect(editor._effectivePresetBlockForDay?.({ ...block, start: "22:00" }, 0, "monday")?.action).toBe("turn_off");
  state._refreshPresetPreviews(); await settle();
  expect(send).toHaveBeenCalledTimes(1);
});


it("retains the Default last preset preview when moving its time", async () => {
  const send = vi.fn().mockImplementation((request) => Promise.resolve({ blocks: [{ start: request.blocks[0].start, action: "set_temperature", temperature: request.blocks[0].preset_key === "night" ? 18 : 21 }] }));
  const element = document.createElement(tag) as VelairCard;
  element.hass = { connection: { sendMessagePromise: send }, states: {} } as never;
  const state = element as unknown as VelairViewHost & { _refreshPresetPreviews(): void; _scheduleSource: string };
  state._data = data(); state._selectedEntity = "climate.office"; state._selectedWeekday = "monday"; state._scheduleSource = "default";
  state._draftBlocks = [structuredClone(block), { ...block, start: "23:00", preset_key: "night" }];
  state._refreshPresetPreviews(); await settle();
  expect(send).toHaveBeenCalledTimes(2);
  state._draftBlocks[1].start = "22:00";
  expect(state._effectivePresetBlockForDay?.(state._draftBlocks[1], 1, "monday")?.temperature).toBe(18);
  state._refreshPresetPreviews(); await settle();
  expect(send).toHaveBeenCalledTimes(2);
});
