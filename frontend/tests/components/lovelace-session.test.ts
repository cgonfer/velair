// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { acquireLovelaceScheduleSession } from "../../src/velair/controllers/lovelace-schedule-sessions";
import { asScheduleActionsHost, saveSelectedDay } from "../../src/velair/controllers/schedule-actions";
import type { HomeAssistant, ScheduleResponse, ScheduleUpdateMessage } from "../../src/velair/types";

class SharedCard extends VelairCard {}
customElements.define("lovelace-session-test-card", SharedCard);
const snapshot = (revision = 1) => ({
  configured_entities: [], zones: {}, active_overrides: {}, configuration_revision: revision,
  global: { mode: "auto" }, next_event: null, next_events: [], operational_status: "running",
  settings: { first_weekday: "monday", zone_order: [] }, temperature_unit: "°C",
  home_assistant_temperature_unit: "°C", temperature_migration: { required: false },
}) as unknown as ScheduleResponse;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
};
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
function backend() {
  let current = snapshot(); const streams: ((message: ScheduleUpdateMessage) => void)[] = [];
  const events = new Map<string, () => void>(); const unsubscribe = vi.fn();
  const send = vi.fn(async () => current);
  const subscribe = vi.fn(async (callback: (message: ScheduleUpdateMessage) => void) => {
    streams.push(callback); callback({ loaded: true, schedule: current }); return unsubscribe;
  });
  const hass = { callService: vi.fn(), states: {}, connection: {
    sendMessagePromise: send, subscribeMessage: subscribe,
    addEventListener: (type: string, listener: () => void) => events.set(type, listener),
    removeEventListener: (type: string) => events.delete(type),
  }, config: { unit_system: { temperature: "°C" } } } as unknown as HomeAssistant;
  return { hass, send, subscribe, unsubscribe, events, streams,
    push(data: ScheduleResponse) { current = data; streams.forEach((stream) => stream({ loaded: true, schedule: data })); },
  };
}
type Internals = {
  _data?: ScheduleResponse; _dirty: boolean; _draftBlocks: unknown[]; _error?: string;
  _loadSchedule(invalidate?: boolean): Promise<void>;
  _schedulePreconditioningRefresh(): void;
  _applyScheduleData(data: ScheduleResponse, options?: { forceDraft?: boolean }): void;
};
const state = (card: VelairCard) => card as unknown as Internals;
async function mount(mock: ReturnType<typeof backend>, view = "climate") {
  const card = document.createElement("lovelace-session-test-card") as VelairCard;
  card.setConfig({ type: "custom:velair-card", view: view as "climate" });
  card.hass = mock.hass; document.body.append(card); await card.updateComplete; await flush(); return card;
}
afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Lovelace cards sharing backend data", () => {
  it.each([1, 2, 6])("loads once and subscribes once for %i mounted cards", async (count) => {
    const mock = backend(); const cards = [];
    for (let i = 0; i < count; i++) cards.push(await mount(mock, i % 2 ? "planned-return" : "climate"));
    expect(mock.send).toHaveBeenCalledTimes(1); expect(mock.subscribe).toHaveBeenCalledTimes(1);
    expect(cards.every((card) => state(card)._data?.configuration_revision === 1)).toBe(true);
    for (const card of cards.slice(0, -1)) card.remove(); await flush();
    expect(mock.unsubscribe).not.toHaveBeenCalled();
    cards.at(-1)!.remove(); await flush(); expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("makes repeated owner acquisition and release idempotent", async () => {
    const mock = backend(); const owner = {}; const other = {};
    const first = acquireLovelaceScheduleSession(mock.hass, owner);
    expect(acquireLovelaceScheduleSession(mock.hass, owner)).toBe(first);
    const second = acquireLovelaceScheduleSession(mock.hass, other);
    first.release(); first.release(); await flush(); expect(mock.unsubscribe).not.toHaveBeenCalled();
    second.release(); second.release(); await flush(); expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("normalizes public HA facades to the original connection for acquisition and card reassignment", async () => {
    const mock = backend(); const first = await mount(mock);
    const publicHass = first.hass!;
    const owner = {}; const lease = acquireLovelaceScheduleSession(publicHass, owner);
    expect(lease.session).toBe(first.scheduleSession);
    const second = document.createElement("lovelace-session-test-card") as VelairCard;
    second.hass = publicHass; document.body.append(second); await second.updateComplete; await flush();
    const diagnosticsGeneration = (first as unknown as { _diagnosticsSubscriptionGeneration: number })._diagnosticsSubscriptionGeneration;
    first.hass = { ...first.hass! }; await first.updateComplete; await flush();
    expect((first as unknown as { _diagnosticsSubscriptionGeneration: number })._diagnosticsSubscriptionGeneration).toBe(diagnosticsGeneration);
    expect(mock.send).toHaveBeenCalledTimes(1); expect(mock.subscribe).toHaveBeenCalledTimes(1);
    expect(second.scheduleSession).toBe(first.scheduleSession);
    lease.release(); first.remove(); await flush(); expect(mock.unsubscribe).not.toHaveBeenCalled();
    second.remove(); await flush(); expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("retains hidden mounted cards and reuses their current data for later arrivals", async () => {
    const mock = backend(); const first = await mount(mock); first.hidden = true;
    mock.push(snapshot(3)); const next = await mount(mock);
    expect(state(first)._data?.configuration_revision).toBe(3);
    expect(state(next)._data?.configuration_revision).toBe(3);
    expect(mock.send).toHaveBeenCalledTimes(1); expect(mock.unsubscribe).not.toHaveBeenCalled();
  });
  it("keeps drafts, filters and local errors independent during shared pushes", async () => {
    const mock = backend(); const first = await mount(mock); const second = await mount(mock);
    first.setConfig({ type: "custom:velair-card", view: "climate", entities: ["climate.first"] });
    second.setConfig({ type: "custom:velair-card", view: "climate", entities: ["climate.second"] });
    const draft = [{ id: "local" }]; state(second)._draftBlocks = draft; state(second)._dirty = true;
    state(second)._error = "save conflict";
    state(first)._applyScheduleData(snapshot(2), { forceDraft: true }); await second.updateComplete;
    expect(state(second)._data?.configuration_revision).toBe(2); expect(state(second)._dirty).toBe(true);
    expect(state(second)._draftBlocks).toBe(draft); expect(state(second)._error).toBe("save conflict");
    expect((first as unknown as { _config: { entities: string[] } })._config.entities).toEqual(["climate.first"]);
    expect((second as unknown as { _config: { entities: string[] } })._config.entities).toEqual(["climate.second"]);
  });
  it("publishes a nested save after its card unmounts while another owner remains", async () => {
    const mock = backend(); const first = await mount(mock); const second = await mount(mock);
    const pending = deferred<ScheduleResponse>(); mock.send.mockImplementationOnce(() => pending.promise);
    const save = first.hass!.connection.sendMessagePromise({ type: "velair/set_profile" });
    first.remove(); pending.resolve(snapshot(5)); await save; await flush();
    expect(state(second)._data?.configuration_revision).toBe(5); expect(mock.unsubscribe).not.toHaveBeenCalled();
  });
  it("isolates connections and rejects a migrated card's old save while publishing to remaining old owners", async () => {
    const first = backend(); const second = backend(); const moving = await mount(first); const staying = await mount(first);
    const pending = deferred<ScheduleResponse>(); first.send.mockImplementationOnce(() => pending.promise);
    const save = moving.hass!.connection.sendMessagePromise<ScheduleResponse>({ type: "velair/set_daily_schedule" });
    moving.hass = second.hass; await moving.updateComplete; await flush();
    const draft = [{ id: "new connection draft" }]; state(moving)._draftBlocks = draft; state(moving)._dirty = true;
    pending.resolve(snapshot(8)); const reply = await save;
    state(moving)._applyScheduleData(reply, { forceDraft: true }); await moving.updateComplete;
    expect(state(staying)._data?.configuration_revision).toBe(8);
    expect(state(moving)._data?.configuration_revision).toBe(1);
    expect(state(moving)._dirty).toBe(true); expect(state(moving)._draftBlocks).toBe(draft);
    expect(first.unsubscribe).not.toHaveBeenCalled(); expect(second.send).toHaveBeenCalledTimes(1);
    staying.remove(); await flush(); expect(first.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("releases a missing connection and rejects late callbacks after final removal and reentry", async () => {
    const mock = backend(); const first = await mount(mock); const oldCallback = mock.streams[0];
    first.hass = undefined; await flush(); expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
    first.hass = mock.hass; await first.updateComplete; await flush();
    oldCallback({ loaded: true, schedule: snapshot(99) });
    expect(state(first)._data?.configuration_revision).toBe(1); expect(mock.subscribe).toHaveBeenCalledTimes(2);
  });
  it("disposes a pending subscription acknowledgement once the last card is gone", async () => {
    const mock = backend(); const ack = deferred<() => void>(); mock.subscribe.mockImplementationOnce(() => ack.promise);
    const card = await mount(mock); card.remove(); ack.resolve(mock.unsubscribe); await flush();
    expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("recovers load/subscription failures with one shared retry and keeps local errors", async () => {
    const mock = backend(); mock.send.mockRejectedValueOnce(new Error("load unavailable"));
    mock.subscribe.mockRejectedValueOnce(new Error("stream unavailable"));
    const first = await mount(mock); const second = await mount(mock);
    expect(state(first)._error).toBe("load unavailable");
    state(second)._error = "local validation";
    mock.events.get("ready")!(); await flush();
    expect(state(first)._error).toBeUndefined(); expect(state(second)._error).toBe("local validation");
    expect(mock.send).toHaveBeenCalledTimes(2); expect(mock.subscribe).toHaveBeenCalledTimes(2);
  });
  it("resynchronizes a shared connection once after reconnect", async () => {
    const mock = backend(); const first = await mount(mock); const second = await mount(mock);
    mock.events.get("disconnected")!(); mock.events.get("ready")!(); await flush();
    expect(mock.send).toHaveBeenCalledTimes(2); expect(mock.subscribe).toHaveBeenCalledTimes(1);
    first.remove(); second.remove(); await flush(); expect(mock.events.size).toBe(0);
  });
  it("coalesces simultaneous explicit refreshes and debounces preconditioning across all cards", async () => {
    const mock = backend(); const cards = [];
    for (let i = 0; i < 6; i++) cards.push(await mount(mock));
    await Promise.all(cards.map((card) => state(card)._loadSchedule())); expect(mock.send).toHaveBeenCalledTimes(2);
    vi.useFakeTimers(); cards.forEach((card) => state(card)._schedulePreconditioningRefresh());
    await vi.advanceTimersByTimeAsync(1200); expect(mock.send).toHaveBeenCalledTimes(3);
    cards.forEach((card) => state(card)._schedulePreconditioningRefresh()); cards.forEach((card) => card.remove());
    await vi.advanceTimersByTimeAsync(1200); expect(mock.send).toHaveBeenCalledTimes(3);
  });
  it("queues and awaits a fresh response when input changes during an older load", async () => {
    const mock = backend(); const card = await mount(mock);
    const old = deferred<ScheduleResponse>(); const latest = deferred<ScheduleResponse>();
    mock.send.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => latest.promise);
    const loading = state(card)._loadSchedule(); let settled = false;
    const invalidated = state(card)._loadSchedule(true).then(() => { settled = true; });
    old.resolve(snapshot(2)); await flush(); expect(mock.send).toHaveBeenCalledTimes(3);
    expect(settled).toBe(false); expect(state(card)._data?.configuration_revision).toBe(1);
    latest.resolve(snapshot(3)); await Promise.all([loading, invalidated]);
    expect(state(card)._data?.configuration_revision).toBe(3);
  });
  it("preserves a new connection's actual schedule draft when a previous save completes", async () => {
    const first = backend(); const second = backend(); const moving = await mount(first); const staying = await mount(first);
    const host = asScheduleActionsHost(moving);
    host._selectedEntity = "climate.office"; host._selectedWeekday = "monday";
    host._dirty = true; host._draftBlocks = [{ id: "old draft" }] as never;
    vi.spyOn(host, "_normalizeDraftBlocks").mockReturnValue({ ok: true, blocks: [] });
    vi.spyOn(host, "_unsupportedModeError").mockReturnValue(undefined);
    const pending = deferred<ScheduleResponse>(); first.send.mockImplementationOnce(() => pending.promise);
    const saving = saveSelectedDay(host);
    moving.hass = second.hass; await moving.updateComplete; await flush();
    const draft = [{ id: "new connection draft" }]; state(moving)._dirty = true; state(moving)._draftBlocks = draft;
    host._dirtyEntityId = "climate.other";
    pending.resolve(snapshot(9)); await saving;
    expect(state(staying)._data?.configuration_revision).toBe(9);
    expect(state(moving)._data?.configuration_revision).toBe(1);
    expect(state(moving)._dirty).toBe(true); expect(state(moving)._draftBlocks).toBe(draft);
    expect(host._dirtyEntityId).toBe("climate.other"); expect(host._saveMessage).toBeUndefined();
  });
  it("acknowledges an overtaken same-session save only in its source editor", async () => {
    const mock = backend(); const source = await mount(mock); const other = await mount(mock);
    const host = asScheduleActionsHost(source); host._selectedEntity = "climate.office";
    host._selectedWeekday = "monday"; host._dirty = true;
    vi.spyOn(host, "_normalizeDraftBlocks").mockReturnValue({ ok: true, blocks: [] });
    vi.spyOn(host, "_unsupportedModeError").mockReturnValue(undefined);
    const otherDraft = [{ id: "other draft" }]; state(other)._draftBlocks = otherDraft; state(other)._dirty = true;
    const pending = deferred<ScheduleResponse>(); mock.send.mockImplementationOnce(() => pending.promise);
    const saving = saveSelectedDay(host); mock.push(snapshot(2)); pending.resolve(snapshot(3)); await saving; await flush();
    expect(host._dirty).toBe(false); expect(host._saveMessage).toBeTruthy();
    expect(state(other)._dirty).toBe(true); expect(state(other)._draftBlocks).toBe(otherDraft);
    expect(mock.send).toHaveBeenCalledTimes(3);
  });
});
