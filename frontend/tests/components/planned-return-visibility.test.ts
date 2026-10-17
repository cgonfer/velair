// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/velair-card";
import { PlannedReturnElement } from "../../src/velair/components/planned-return-element";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { plannedReturnDraft } from "../../src/velair/domain/planned-return";
import { en } from "../../src/velair/translations/en";
import type { ScheduleResponse } from "../../src/velair/types";
import type { OverviewPreparationTimeline } from "../../src/velair/components/overview-preparation-timeline-element";

afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });

describe("shared preparation on sidebar and compact return controls", () => {
  it.each([false, true])("uses per-climate points while preserving edit and cancel controls, embedded=%s", async embedded => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
    const element = new PlannedReturnElement(); element.compact = embedded; element.embedded = embedded; element.settings = !embedded;
    element.entityId = "climate.first";
    element.hass = { locale: { time_format: "24" }, config: { time_zone: "UTC" }, states: { "climate.first": { attributes: { friendly_name: "First room" } } } } as never;
    element.t = (key, values) => Object.entries(values ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), String(en[key]));
    const zone = { profile_id: null, schedule_source: "default", preparation: "adaptive", state: "pending", reason: null };
    const status = { state: "away", episode_active: true, can_start: true, can_cancel: true, occupancy: "away", sources: [], departure_at: "2026-10-12T11:00:00Z", return_at: "2026-10-12T14:00:00Z", destination_mode_id: "default", preparation: { context: "arrival", return_at: "2026-10-12T14:00:00Z", mode_id: "default", zones: [
      { ...zone, entity_id: "climate.first", start_at: "2026-10-12T13:00:00Z" },
      { ...zone, entity_id: "climate.second", start_at: "2026-10-12T13:30:00Z" },
      { ...zone, entity_id: "climate.suspended", state: "suspended", start_at: "2026-10-12T13:00:00Z" },
      { ...zone, entity_id: "climate.arrival", preparation: "arrival_only", start_at: null },
    ] } };
    element.data = { configured_entities: ["climate.first", "climate.second"], planned_return: { ...plannedReturnDraft(), occupancy_entity_ids: ["binary_sensor.home"] }, planned_return_status: { ...status, sources: [{ entity_id: "binary_sensor.home", state: "away" }] }, modes: [], profiles: [] } as unknown as ScheduleResponse;
    document.body.append(element); await element.updateComplete;
    const root = element.shadowRoot!;
    const timeline = root.querySelector<OverviewPreparationTimeline>("velair-overview-preparation-timeline")!;
    await timeline.updateComplete;
    expect(timeline.points.map(point => point.entityId)).toEqual(embedded ? ["climate.first"] : ["climate.first", "climate.second"]);
    expect(timeline.names["climate.first"]).toBe("First room");
    timeline.visibleCount = timeline.points.length; await timeline.updateComplete;
    expect(timeline.showLegend).toBe(true);
    expect(timeline.shadowRoot!.querySelector('.legend time')?.textContent).toBe('13:00');
    expect(root.querySelector(".return-preparation-status,.preparation-estimate")).toBeNull();
    if (embedded) {
      expect(root.querySelectorAll(".return-preparation-badge")).toHaveLength(0);
      expect(root.querySelector(".compact-return-indicators")).not.toBeNull();
      expect(root.querySelector(".routine-status,.occupancy-panel,form")).toBeNull();
      expect(timeline.showLegend).toBe(true);
      expect(timeline.shadowRoot!.querySelector(".legend")).not.toBeNull();
    } else expect(root.querySelector(".return-preparation-badges")).toBeNull();
    expect(root.querySelector(".panel-arrival-input ha-icon")).toBeNull();
    expect(timeline.expanded).toBe(false);
    if (!embedded) timeline.expanded = true; await timeline.updateComplete;
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await element.updateComplete;
    expect(root.querySelector(".arrival-editor")).not.toBeNull();
    expect(root.querySelector(".cancel-return")).toBeNull();
    root.querySelector<HTMLButtonElement>(".arrival-editor-close")!.click(); await element.updateComplete;
    expect(timeline.expanded).toBe(!embedded); expect(root.querySelector(".cancel-return")).not.toBeNull();
    element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, return_at: "2026-10-12T15:00:00Z" } };
    await element.updateComplete; await timeline.updateComplete;
    if (embedded) {
      expect(root.querySelector("velair-overview-preparation-timeline")).toBeNull();
      expect(root.querySelector(".climate-return-message")?.textContent).toBe(en.plannedReturnClimateNoEstimate);
    } else { expect(timeline.points).toEqual([]); expect(timeline.expanded).toBe(false); }
  });
  it.each([
    ["pending", "adaptive", null, "plannedReturnClimateNoEstimate"],
    ["preparing", "adaptive", null, "plannedReturnClimateNoEstimate"],
    ["reached", "adaptive", null, "plannedReturnVisibilityReachedHelp"],
    ["pending", "arrival_only", null, "plannedReturnVisibilityArrivalOnlyHelp"],
    ["suspended", "adaptive", "boost", "plannedReturnPreparationReasonBoost"],
    ["unavailable", "none", "missing_target", "plannedReturnPreparationReasonTarget"],
  ] as const)("replaces the selected climate's %s/%s timeline with a truthful message", async (state, preparation, reason, key) => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
    const element = new PlannedReturnElement(); element.compact = true; element.embedded = true; element.entityId = "climate.selected";
    element.hass = { config: { time_zone: "UTC" }, states: {} } as never;
    element.t = (key, values) => Object.entries(values ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), String(en[key]));
    element.data = { configured_entities: ["climate.selected", "climate.other"], planned_return: plannedReturnDraft(), modes: [], profiles: [], planned_return_status: {
      state: "away", episode_active: true, can_start: true, can_cancel: true, occupancy: "away", sources: [], departure_at: "2026-10-12T11:00:00Z", return_at: "2026-10-12T14:00:00Z", destination_mode_id: "default",
      preparation: { context: "arrival", mode_id: "default", return_at: "2026-10-12T14:00:00Z", zones: [
        { entity_id: "climate.selected", profile_id: null, schedule_source: "default", state, preparation, reason, start_at: null },
        { entity_id: "climate.other", profile_id: null, schedule_source: "default", state: "pending", preparation: "adaptive", reason: null, start_at: "2026-10-12T13:00:00Z" },
      ] },
    } } as unknown as ScheduleResponse;
    document.body.append(element); await element.updateComplete;
    const root = element.shadowRoot!;
    expect(root.querySelector(".return-timeline,velair-overview-preparation-timeline,.return-preparation-badges")).toBeNull();
    expect(root.querySelector(".climate-return-message")?.textContent).toBe(en[key]);
    expect(root.querySelector(".cancel-return")).not.toBeNull();
    root.querySelector<HTMLButtonElement>(".saved-return-arrival .arrival-edit-trigger")!.click(); await element.updateComplete;
    expect(root.querySelector("#episode-return-time")).not.toBeNull();
  });
  it("ticks an armed return without a departure and hides its expired preparation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
    const element = new PlannedReturnElement();
    element.compact = true;
    element.hass = { config: { time_zone: "UTC" }, states: {} } as never;
    element.t = (key, values) => Object.entries(values ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), String(en[key]));
    element.data = { planned_return: plannedReturnDraft(), modes: [], profiles: [], planned_return_status: {
      state: "armed", episode_active: true, can_start: false, can_cancel: true, occupancy: "home", sources: [], return_at: "2026-10-12T12:02:00Z", departure_at: null,
      preparation: { context: "arrival", return_at: "2026-10-12T12:02:00Z", mode_id: "default", zones: [] },
    } } as unknown as ScheduleResponse;
    document.body.append(element); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".return-timeline")).toBeNull();
    expect(element.shadowRoot!.textContent).toContain("Arrival in 2 min");
    vi.advanceTimersByTime(60_000); await element.updateComplete;
    expect(element.shadowRoot!.textContent).toContain("Arrival in 1 min");
    vi.advanceTimersByTime(60_000); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".return-preparation-badges")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("refreshes the existing preconditioning clock so an arrival preview expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
    const card = new VelairCard();
    card.setConfig({ type: "custom:velair-card", view: "preconditioning" });
    const state = card as unknown as { _data: ScheduleResponse; _syncTimelineNowTick(): void; _currentTimelineNow(): Date; _stopTimelineNowTick(): void };
    state._data = { configured_entities: [], zones: {} } as unknown as ScheduleResponse;
    state._syncTimelineNowTick();
    vi.advanceTimersByTime(60_100);
    expect(state._currentTimelineNow().getTime()).toBeGreaterThan(Date.parse("2026-10-12T12:01:00Z"));
    state._stopTimelineNowTick();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([false, true])("shows mixed room states and removes stale previews, compact=%s", async compact => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
    const element = new PlannedReturnElement();
    element.compact = compact;
    element.hass = { config: { time_zone: "UTC" }, states: {} } as never;
    element.t = (key, values) => Object.entries(values ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), String(en[key]));
    const status = { state: "away", episode_active: true, can_start: false, can_cancel: true, occupancy: "away", sources: [], return_at: "2026-10-12T14:00:00Z", departure_at: "2026-10-12T11:00:00Z",
      preparation: { context: "arrival", return_at: "2026-10-12T14:00:00Z", mode_id: "default", zones: [
        { entity_id: "climate.waiting", schedule_source: "default", profile_id: null, preparation: "adaptive", state: "pending", reason: null, start_at: "2026-10-12T13:00:00Z" },
        { entity_id: "climate.manual", schedule_source: "default", profile_id: null, preparation: "adaptive", state: "suspended", reason: "manual_control", start_at: null },
      ] },
    };
    element.data = { planned_return: plannedReturnDraft(), planned_return_status: status, modes: [], profiles: [], temperature_unit: "°C" } as unknown as ScheduleResponse;
    document.body.append(element); await element.updateComplete;
    const summary = element.shadowRoot!.querySelector(".return-preparation-badges");
    if (compact) {
      expect(summary!.querySelector('[data-room-count="waiting"]')?.textContent.toLowerCase()).toContain("1 waiting");
      expect(summary!.querySelector('[data-room-count="suspended"]')?.textContent.toLowerCase()).toContain("1 suspended");
      expect(summary!.textContent).toContain("Starts in 60 min");
      expect(summary!.querySelector("progress, input")).toBeNull();
      expect(summary!.querySelectorAll("button")).toHaveLength(2);
    } else {
      expect(summary).toBeNull();
      expect(element.shadowRoot!.querySelector(".return-preparation-badges")).toBeNull();
    }
    element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, state: "cancelled", episode_active: false } };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".return-preparation-status, .return-preparation-badges")).toBeNull();
  });
});
