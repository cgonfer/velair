// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import * as profileDomain from "../../src/velair/domain/climate-profiles";
import { createClimateProfileDraft } from "../../src/velair/domain/climate-profiles";
import type { ClimateProfileDraft } from "../../src/velair/domain/climate-profiles";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { DraftScheduleBlock, ScheduleBlock, ScheduleResponse, TemplateLink } from "../../src/velair/types";

const tag = "test-preview-work-sharing-card";
if (!customElements.get(tag)) customElements.define(tag, VelairCard);

const blocks: ScheduleBlock[] = [
  { start: "07:00", slot_id: "morning", action: "set_temperature", hvac_mode: "heat", temperature: 21 },
  { start: "12:00", slot_id: "noon", action: "set_temperature", hvac_mode: "heat", temperature: 20 },
  { start: "23:00", slot_id: "night", action: "set_temperature", hvac_mode: "heat", temperature: 18 },
];
const data = () => ({
  configuration_revision: 1, temperature_unit: "°C", configured_entities: ["climate.office"],
  settings: { first_weekday: "monday" }, zones: {}, profiles: [],
  templates: ["day-a", "day-b"].map((key) => ({ key, name: key, blocks: structuredClone(blocks) })),
}) as unknown as ScheduleResponse;

type CardState = {
  _data: ScheduleResponse; _draftBlocks: DraftScheduleBlock[]; _selectedEntity: string;
  _selectedWeekday: string; _scheduleSource: string; _draftTemplateLink?: TemplateLink;
  _refreshPresetPreviews(): void; _effectivePresetBlock(block: DraftScheduleBlock, index: number, source: "schedule"): ScheduleBlock | undefined;
  _presetSettingsStatus(block: DraftScheduleBlock, index: number, source: "schedule"): string | undefined;
  _retryPresetSettings(block: DraftScheduleBlock, index: number, source: "schedule"): void;
};

function card(send: ReturnType<typeof vi.fn>) {
  const element = document.createElement(tag) as VelairCard;
  element.hass = { connection: { sendMessagePromise: send }, states: {} } as never;
  const state = element as unknown as CardState;
  state._data = data(); state._selectedEntity = "climate.office";
  state._selectedWeekday = "monday"; state._scheduleSource = "default";
  state._draftTemplateLink = { template_key: "day-a", mode: "full" };
  state._draftBlocks = [];
  return { element, state, refresh: () => state._refreshPresetPreviews(),
    get: (index: number) => state._effectivePresetBlock(state._draftBlocks[index], index, "schedule"),
    status: (index: number) => state._presetSettingsStatus(state._draftBlocks[index], index, "schedule"),
    retry: (index: number) => state._retryPresetSettings(state._draftBlocks[index], index, "schedule") };
}

type ProfileState = {
  _draft: ClimateProfileDraft; _selectedKey: string; _selectedEntity: string;
  _selectedDays: Record<string, string>; _expandedZones: Set<string>;
  _groupCandidates: Map<string, { draft: ClimateProfileDraft; selectedDay?: string }>;
  _refreshPresetPreviews(): void;
  _blocks(entityId: string, weekday: string, draft?: ClimateProfileDraft): DraftScheduleBlock[];
  _effectivePresetBlock(entityId: string, weekday: string, block: DraftScheduleBlock, index: number, draft?: ClimateProfileDraft): ScheduleBlock | undefined;
  _blockEditorHost(entityId: string, weekday: string): VelairViewHost;
};

function profile(send: ReturnType<typeof vi.fn>) {
  const element = new VelairProfilesView();
  element.hass = { connection: { sendMessagePromise: send }, states: {} } as never;
  element.data = data(); element.scheduleWorkspace = true;
  const state = element as unknown as ProfileState;
  state._draft = createClimateProfileDraft({ key: "winter", name: "Winter", zones: {
    "climate.office": { behavior: "schedule", schedule: { monday: blocks }, template_links: { monday: { template_key: "day-a", mode: "full" } } },
    "climate.bedroom": { behavior: "schedule", schedule: { monday: [{ start: "00:00", action: "turn_off" }] } },
  } } as never);
  state._selectedKey = "winter"; state._selectedEntity = "climate.office";
  state._selectedDays = { "climate.office": "monday", "climate.bedroom": "monday" };
  return { element, state, refresh: () => state._refreshPresetPreviews(),
    get: (index: number, draft = state._draft) => state._effectivePresetBlock("climate.office", "monday", state._blocks("climate.office", "monday", draft)[index], index, draft) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, resolve };
}

async function settle() { for (let index = 0; index < 6; index++) await Promise.resolve(); }

afterEach(() => vi.restoreAllMocks());

describe("full-day preview request sharing", () => {
  it("requests one backend-adapted day for all full-link blocks and reuses it until revision changes", async () => {
    const adapted = blocks.map((block) => ({ ...block, temperature: block.temperature! - 0.5 }));
    const send = vi.fn().mockResolvedValue({ blocks: adapted });
    const h = card(send);
    h.refresh(); await settle();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ type: "velair/preview_daily_schedule", entity_id: "climate.office", weekday: "monday", template_link: { template_key: "day-a", mode: "full" } });
    for (let index = 0; index < 3; index++) expect(h.get(index)).toEqual(adapted[index]);
    h.refresh(); await settle(); expect(send).toHaveBeenCalledTimes(1);
    h.state._data = { ...h.state._data, configuration_revision: 2 };
    h.refresh(); await settle(); expect(send).toHaveBeenCalledTimes(2);
  });

  it.each(["revision", "link", "entity", "weekday", "unit"] as const)("rejects a pending full-day reply after changing %s", async (change) => {
    const first = deferred<{ blocks: ScheduleBlock[] }>();
    const newest = blocks.map((block) => ({ ...block, temperature: 17 }));
    const send = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue({ blocks: newest });
    const h = card(send);
    h.refresh();
    if (change === "revision") h.state._data = { ...h.state._data, configuration_revision: 2 };
    if (change === "link") h.state._draftTemplateLink = { template_key: "day-b", mode: "full" };
    if (change === "entity") h.state._selectedEntity = "climate.bedroom";
    if (change === "weekday") h.state._selectedWeekday = "tuesday";
    if (change === "unit") h.state._data = { ...h.state._data, temperature_unit: "°F" };
    expect(h.get(0)).toBeUndefined();
    h.refresh(); await settle();
    expect(send).toHaveBeenCalledTimes(2);
    first.resolve({ blocks: blocks.map((block) => ({ ...block, temperature: 30 })) });
    await settle();
    for (let index = 0; index < 3; index++) expect(h.get(index)?.temperature).toBe(17);
    expect(send.mock.calls[0][0].template_link).toEqual({ template_key: "day-a", mode: "full" });
    if (change === "link") expect(send.mock.calls[1][0].template_link).toEqual({ template_key: "day-b", mode: "full" });
    h.refresh(); expect(send).toHaveBeenCalledTimes(2);
  });

  it("drops a pending reply after leaving Default and makes a fresh request on return", async () => {
    const first = deferred<{ blocks: ScheduleBlock[] }>();
    const send = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue({ blocks });
    const h = card(send); h.refresh();
    h.state._scheduleSource = "winter"; h.refresh();
    first.resolve({ blocks }); await settle();
    expect(h.get(0)).toBeUndefined();
    h.state._scheduleSource = "default"; h.refresh(); await settle();
    expect(send).toHaveBeenCalledTimes(2);
    expect(h.get(0)).toEqual(blocks[0]);
  });

  it("keeps a failed day unavailable without a request loop and retries the chosen block once", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("temporary preview failure")).mockResolvedValue({ blocks });
    const h = card(send); h.refresh(); await settle();
    expect(send).toHaveBeenCalledTimes(1);
    for (let index = 0; index < 3; index++) expect(h.status(index)).toBe("unavailable");
    h.refresh(); expect(send).toHaveBeenCalledTimes(1);
    h.retry(0); await settle();
    expect(send).toHaveBeenCalledTimes(2);
    expect(h.get(0)).toEqual(blocks[0]);
    // Preserve the existing per-block retry contract for other failed entries.
    expect(h.status(1)).toBe("unavailable");
    h.state._data = { ...h.state._data, configuration_revision: 2 };
    h.refresh(); await settle();
    expect(send).toHaveBeenCalledTimes(3);
    for (let index = 0; index < 3; index++) expect(h.get(index)).toEqual(blocks[index]);
  });
});

describe("Profile preview input sharing", () => {
  it("materializes a full Profile only once per unchanged cached refresh", async () => {
    const send = vi.fn().mockResolvedValue({ configuration_revision: 1, resolved_schedules: { "climate.office": { monday: blocks } } });
    const h = profile(send); h.refresh(); await settle();
    expect(send).toHaveBeenCalledTimes(1);
    const input = vi.spyOn(profileDomain, "climateProfileInput");
    h.refresh();
    expect(input).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("shares cold Profile materialization and one request across visible zones", async () => {
    const send = vi.fn().mockResolvedValue({ configuration_revision: 1, resolved_schedules: { "climate.office": { monday: blocks }, "climate.bedroom": { monday: blocks } } });
    const h = profile(send);
    h.element.scheduleWorkspace = false; h.state._expandedZones.add("climate.bedroom");
    h.state._draft.zones["climate.bedroom"] = structuredClone(h.state._draft.zones["climate.office"]);
    const input = vi.spyOn(profileDomain, "climateProfileInput");
    h.refresh();
    expect(input).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    await settle();
    for (let index = 0; index < 3; index++) expect(h.get(index)).toEqual(blocks[index]);
    input.mockClear(); h.refresh();
    expect(input).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("rebuilds a changed sibling zone in the same draft object and rejects the previous reply", async () => {
    const first = deferred<{ configuration_revision: number; resolved_schedules: Record<string, Record<string, ScheduleBlock[]>> }>();
    const newest = blocks.map((block) => ({ ...block, temperature: 19 }));
    const send = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue({ configuration_revision: 1, resolved_schedules: { "climate.office": { monday: newest } } });
    const h = profile(send); h.refresh();
    const zone = h.state._draft.zones["climate.bedroom"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule fixture");
    zone.schedule.monday[0] = { start: "00:00", action: "set_temperature", hvac_mode: "cool", temperature: 23 };
    const input = vi.spyOn(profileDomain, "climateProfileInput");
    h.refresh(); expect(input).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].profile.zones["climate.bedroom"].schedule.monday).toEqual([{ start: "00:00", action: "set_temperature", hvac_mode: "cool", temperature: 23 }]);
    await settle();
    first.resolve({ configuration_revision: 1, resolved_schedules: { "climate.office": { monday: blocks } } });
    await settle();
    for (let index = 0; index < 3; index++) expect(h.get(index)?.temperature).toBe(19);
  });

  it("keeps candidate and original drafts separate within one refresh", async () => {
    const send = vi.fn().mockImplementation((request) => Promise.resolve({ configuration_revision: 1,
      resolved_schedules: { "climate.office": { monday: blocks.map((block) => ({ ...block, temperature: request.profile.zones["climate.bedroom"].behavior === "pause" ? 16 : 22 })) } } }));
    const h = profile(send);
    const candidate = structuredClone(h.state._draft);
    candidate.zones["climate.bedroom"] = { behavior: "pause", action: "turn_off" };
    h.state._groupCandidates.set("climate.office:monday", { draft: candidate, selectedDay: "monday" });
    const input = vi.spyOn(profileDomain, "climateProfileInput");
    h.refresh();
    expect(input).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(2);
    await settle();
    expect(h.get(0, candidate)?.temperature).toBe(16);
    expect(h.get(0)?.temperature).toBe(22);
  });

  it("preserves Profile revision validation and explicit retry after a rejected shared response", async () => {
    const send = vi.fn().mockResolvedValueOnce({ configuration_revision: 2, resolved_schedules: { "climate.office": { monday: blocks } } })
      .mockResolvedValue({ configuration_revision: 1, resolved_schedules: { "climate.office": { monday: blocks } } });
    const h = profile(send); h.refresh(); await settle();
    const host = h.state._blockEditorHost("climate.office", "monday");
    expect(host._presetSettingsStatus?.(h.state._blocks("climate.office", "monday")[0], 0, "template")).toBe("unavailable");
    h.refresh(); expect(send).toHaveBeenCalledTimes(1);
    host._retryPresetSettings?.(h.state._blocks("climate.office", "monday")[0], 0, "template");
    await settle();
    expect(send).toHaveBeenCalledTimes(2);
    expect(h.get(0)).toEqual(blocks[0]);
  });
});
