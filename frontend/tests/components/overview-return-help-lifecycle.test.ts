// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/velair-card";
import type { VelairCard } from "../../src/velair/components/velair-card-element";
import type { OverviewPreparationTimeline } from "../../src/velair/components/overview-preparation-timeline-element";
import { plannedReturnDraft } from "../../src/velair/domain/planned-return";
import type { HomeAssistant, ScheduleResponse, ScheduleUpdateMessage, VelairCardView } from "../../src/velair/types";

afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });

function snapshot(): ScheduleResponse {
  return {
    configured_entities: ["climate.first", "climate.second"], zones: {},
    settings: { first_weekday: "monday", zone_order: [] },
    temperature_migration: { required: false }, temperature_unit: "°C",
    active_overrides: {}, templates: [], modes: [], profiles: [], next_events: [],
    global: { mode: "auto" }, operational_status: "running",
    planned_return: plannedReturnDraft(),
    planned_return_status: {
      state: "away", episode_active: true, can_start: true, can_cancel: true, occupancy: "away", sources: [],
      departure_at: "2026-10-13T11:00:00Z", return_at: "2026-10-13T14:00:00Z", destination_mode_id: "default",
      preparation: { context: "arrival", mode_id: "default", return_at: "2026-10-13T14:00:00Z", zones: [
        { entity_id: "climate.first", profile_id: null, schedule_source: "default", preparation: "adaptive", state: "pending", reason: null, start_at: "2026-10-13T13:00:00Z" },
        { entity_id: "climate.second", profile_id: null, schedule_source: "default", preparation: "adaptive", state: "pending", reason: null, start_at: "2026-10-13T13:30:00Z" },
      ] },
    },
  } as unknown as ScheduleResponse;
}

async function mount(view: VelairCardView) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-13T12:00:00Z"));
  let current = snapshot();
  let onUpdate!: (message: ScheduleUpdateMessage) => void;
  const card = document.createElement("velair-card") as VelairCard;
  card.setConfig({ type: "custom:velair-card", view });
  card.hass = {
    connection: {
      sendMessagePromise: vi.fn(async () => current),
      subscribeMessage: vi.fn(async (callback: typeof onUpdate) => {
        onUpdate = callback;
        callback({ loaded: true, schedule: current });
        return () => undefined;
      }),
    },
    states: {}, config: { time_zone: "UTC" },
  } as unknown as HomeAssistant;
  document.body.append(card);
  await new Promise(resolve => setTimeout(resolve, 0));
  await card.updateComplete;
  return {
    card, data: current,
    async push(data: ScheduleResponse) {
      current = data;
      onUpdate({ loaded: true, schedule: data });
      await card.updateComplete;
    },
  };
}

function openHelp(card: VelairCard, selector: string) {
  const button = card.shadowRoot!.querySelector<HTMLButtonElement>(selector)!;
  expect(button).not.toBeNull();
  button.click();
  expect(button.getAttribute("aria-expanded")).toBe("true");
  return button;
}

function expectDismissed(button: HTMLButtonElement) {
  expect(button.getAttribute("aria-expanded")).toBe("false");
  const escape = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
  document.dispatchEvent(escape);
  expect(escape.defaultPrevented).toBe(false);
}

const surfaces: Array<[string, VelairCardView, string]> = [
  ["preparation count", "overview-status", '[data-room-count="waiting"] button'],
  ["zone forecast", "overview-zones", '.overview-zone-return button'],
  ["departure endpoint", "overview-status", '#overview-return-departure-trigger'],
  ["arrival endpoint", "overview-status", '#overview-return-arrival-trigger'],
  ["destination endpoint", "overview-status", '#overview-return-destination-mode-trigger'],
];

describe("Overview planned return help lifecycle", () => {
  it.each(surfaces)("dismisses %s help when the card is removed", async (_name, view, selector) => {
    const { card } = await mount(view);
    const button = openHelp(card, selector);
    card.remove();
    expectDismissed(button);
  });

  it.each(surfaces)("dismisses %s help when switching away from its Overview view", async (_name, view, selector) => {
    const { card } = await mount(view);
    const button = openHelp(card, selector);
    card.setConfig({ type: "custom:velair-card", view: "overview-events" });
    await card.updateComplete;
    expect(button.isConnected).toBe(false);
    expectDismissed(button);
  });

  it("dismisses an open waiting counter when a backend update removes that count", async () => {
    const { card, data, push } = await mount("overview-status");
    const button = openHelp(card, '[data-room-count="waiting"] button');
    const status = data.planned_return_status!;
    await push({ ...data, planned_return_status: { ...status, preparation: {
      ...status.preparation!, zones: status.preparation!.zones.map(zone => ({ ...zone, state: "preparing" })),
    } } });
    expect(card.shadowRoot!.querySelector('[data-room-count="waiting"]')).toBeNull();
    expect(card.shadowRoot!.querySelector('[data-room-count="preparing"]')).not.toBeNull();
    expectDismissed(button);
  });

  it.each(surfaces)("dismisses %s help when the backend fulfills the episode", async (_name, view, selector) => {
    const { card, data, push } = await mount(view);
    const button = openHelp(card, selector);
    await push({ ...data, planned_return_status: { ...data.planned_return_status!, state: "fulfilled", episode_active: false } });
    expect(button.isConnected).toBe(false);
    expectDismissed(button);
  });
});

describe("Overview preparation legend episode identity", () => {
  it("preserves an expanded legend on a backend refresh of the same episode", async () => {
    const { card, data, push } = await mount("overview-status");
    const timeline = card.shadowRoot!.querySelector<OverviewPreparationTimeline>("velair-overview-preparation-timeline")!;
    await timeline.updateComplete;
    timeline.visibleCount = 1;
    await timeline.updateComplete;
    timeline.shadowRoot!.querySelector<HTMLButtonElement>("button.more")!.click();
    await timeline.updateComplete;
    expect(timeline.expanded).toBe(true);
    await push({ ...data, planned_return_status: { ...data.planned_return_status! } });
    await timeline.updateComplete;
    expect(card.shadowRoot!.querySelector("velair-overview-preparation-timeline")).toBe(timeline);
    expect(timeline.points).toHaveLength(2);
    expect(timeline.expanded).toBe(true);
    expect(timeline.shadowRoot!.querySelector("button.more")?.getAttribute("aria-expanded")).toBe("true");
  });

  it.each(["arrival", "destination"] as const)("collapses the expanded legend after an accepted %s change with fresh preparation points", async field => {
    const { card, data, push } = await mount("overview-status");
    const timeline = card.shadowRoot!.querySelector<OverviewPreparationTimeline>("velair-overview-preparation-timeline")!;
    await timeline.updateComplete;
    timeline.visibleCount = 1;
    await timeline.updateComplete;
    timeline.shadowRoot!.querySelector<HTMLButtonElement>("button.more")!.click();
    await timeline.updateComplete;
    expect(timeline.expanded).toBe(true);
    expect(timeline.shadowRoot!.querySelectorAll(".legend .entry")).toHaveLength(2);

    const status = data.planned_return_status!;
    const returnAt = field === "arrival" ? "2026-10-13T15:00:00Z" : status.return_at;
    const destination = field === "destination" ? "evening" : status.destination_mode_id;
    await push({ ...data, planned_return_status: { ...status, return_at: returnAt, destination_mode_id: destination,
      preparation: { ...status.preparation!, return_at: returnAt!, mode_id: destination! },
    } });
    await timeline.updateComplete;
    await timeline.updateComplete;
    expect(card.shadowRoot!.querySelector("velair-overview-preparation-timeline")).toBe(timeline);
    expect(timeline.points).toHaveLength(2);
    expect(timeline.expanded).toBe(false);
    expect(timeline.shadowRoot!.querySelector(".legend")?.classList.contains("expanded")).toBe(false);
    expect(timeline.shadowRoot!.querySelector("button.more")?.getAttribute("aria-expanded")).toBe("false");
  });
});
