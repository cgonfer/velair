import { describe, expect, it, vi } from "vitest";
import { PanelScheduleSession } from "../../src/velair/controllers/panel-schedule-session";
import type { HomeAssistant, ScheduleResponse, ScheduleUpdateMessage } from "../../src/velair/types";

const data = (revision: number, marker = "") => ({ configured_entities: [], zones: {}, configuration_revision: revision, marker }) as unknown as ScheduleResponse;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function connection() {
  const requests: ReturnType<typeof deferred<ScheduleResponse>>[] = [];
  const streams: ((message: ScheduleUpdateMessage) => void)[] = [];
  const events = new Map<string, () => void>();
  const unsubscribe = vi.fn();
  const hass = {
    callService: vi.fn(),
    connection: {
      sendMessagePromise: vi.fn(() => { const pending = deferred<ScheduleResponse>(); requests.push(pending); return pending.promise; }),
      subscribeMessage: vi.fn((callback: (message: ScheduleUpdateMessage) => void) => { streams.push(callback); return Promise.resolve(unsubscribe); }),
      addEventListener: vi.fn((type: string, listener: () => void) => events.set(type, listener)),
      removeEventListener: vi.fn((type: string) => events.delete(type)),
    },
  } as unknown as HomeAssistant;
  return { hass, requests, streams, events, unsubscribe };
}

describe("panel schedule session", () => {
  it("captures synchronous transport errors and permits a subsequent retry", async () => {
    const mock = connection(); vi.mocked(mock.hass.connection.sendMessagePromise).mockImplementationOnce(() => { throw new Error("transport unavailable"); });
    const session = new PanelScheduleSession(); session.connect(mock.hass); await flush();
    expect(session.state.error).toBe("transport unavailable"); expect(session.state.loading).toBe(false);
    const retry = session.refresh(); mock.requests[0].resolve(data(1)); await retry;
    expect(session.state.error).toBeUndefined(); expect(session.state.data?.configuration_revision).toBe(1); session.disconnect();
  });
  it("replays the latest snapshot synchronously without fetching for another editor", async () => {
    const mock = connection(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    const current = data(1); mock.streams[0]({ loaded: true, schedule: current });
    const listener = vi.fn(); const detach = session.attach(listener);
    expect(listener).toHaveBeenLastCalledWith({ data: current, loading: false, error: undefined });
    detach(); session.attach(vi.fn());
    expect(mock.requests).toHaveLength(1); expect(mock.streams).toHaveLength(1);
    session.disconnect(); await flush(); expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("does not let the initial fetch overwrite a newer stream snapshot", async () => {
    const mock = connection(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    const current = data(2); mock.streams[0]({ loaded: true, schedule: current });
    mock.requests[0].resolve(data(1)); await flush();
    expect(session.state.data).toBe(current); session.disconnect();
  });
  it("accepts runtime updates at the same revision and resets at a lower revision", () => {
    const mock = connection(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    mock.streams[0]({ loaded: true, schedule: data(8, "old") });
    const runtime = data(8, "runtime"); mock.streams[0]({ loaded: true, schedule: runtime });
    expect(session.state.data).toBe(runtime);
    const reset = data(0); mock.streams[0]({ loaded: true, schedule: reset });
    expect(session.state.data).toBe(reset); session.disconnect();
  });
  it("tracks nested editor mutations and suppresses responses overtaken by the stream", async () => {
    const mock = connection(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    mock.requests[0].resolve(data(1)); await flush();
    const wrapped = session.hassFor(mock.hass)!;
    const mutation = wrapped.connection.sendMessagePromise<ScheduleResponse>({ type: "velair/update_settings" });
    const current = data(2); mock.requests[1].resolve(current); await mutation;
    expect(session.state.data).toBe(current);
    const lateMutation = wrapped.connection.sendMessagePromise<ScheduleResponse>({ type: "velair/reset_data" });
    const latest = data(0, "reset-runtime"); mock.streams[0]({ loaded: true, schedule: latest });
    const stale = data(0, "reset-response"); mock.requests[2].resolve(stale); await lateMutation;
    expect(session.publish(stale)).toBe(latest);
    expect(session.hassFor({ ...mock.hass })!.connection).toBe(wrapped.connection);
    session.disconnect();
  });
  it("ignores old callbacks, fetches and mutation responses after connection replacement", async () => {
    const first = connection(); const second = connection(); const session = new PanelScheduleSession(); session.connect(first.hass);
    const pending = session.hassFor(first.hass)!.connection.sendMessagePromise<ScheduleResponse>({ type: "velair/update_settings" });
    session.setHass(second.hass);
    const latest = data(1, "replacement"); second.streams[0]({ loaded: true, schedule: latest });
    first.streams[0]({ loaded: true, schedule: data(99) }); first.requests[0].resolve(data(99));
    const stale = data(100); first.requests[1].resolve(stale); await pending; await flush();
    expect(session.publish(stale)).toBeUndefined(); expect(first.unsubscribe).toHaveBeenCalledTimes(1);
    session.disconnect();
  });
  it("disposes a late subscription acknowledgement and ignores the old stream even on reentry", async () => {
    const mock = connection(); const ack = deferred<() => void>();
    vi.mocked(mock.hass.connection.subscribeMessage).mockImplementationOnce((callback) => { mock.streams.push(callback as (message: ScheduleUpdateMessage) => void); return ack.promise; });
    const session = new PanelScheduleSession(); session.connect(mock.hass); session.disconnect(); session.connect(mock.hass);
    const current = data(1); mock.streams[1]({ loaded: true, schedule: current });
    mock.streams[0]({ loaded: true, schedule: data(99) }); ack.resolve(mock.unsubscribe); await flush();
    expect(session.state.data).toBe(current); expect(mock.unsubscribe).toHaveBeenCalledTimes(1); session.disconnect();
  });
  it("resynchronizes on same-connection ready without creating another subscription", async () => {
    const mock = connection(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    mock.requests[0].resolve(data(1)); await flush();
    mock.events.get("disconnected")!(); mock.events.get("ready")!();
    const current = data(1, "reconnected"); mock.requests[1].resolve(current); await flush();
    expect(session.state.data).toBe(current); expect(mock.streams).toHaveLength(1);
    session.disconnect(); expect(mock.events.size).toBe(0);
  });
  it("retries a failed subscription on ready and keeps load errors scoped to current generation", async () => {
    const mock = connection(); vi.mocked(mock.hass.connection.subscribeMessage).mockRejectedValueOnce(new Error("subscription unavailable"));
    const session = new PanelScheduleSession(); session.connect(mock.hass); await flush();
    expect(session.state.error).toBe("subscription unavailable");
    mock.requests[0].reject(new Error("load unavailable")); await flush();
    expect(session.state.error).toBe("load unavailable");
    mock.events.get("ready")!(); await flush(); expect(mock.streams).toHaveLength(1);
    mock.requests[1].resolve(data(2)); await flush(); expect(session.state.error).toBeUndefined(); session.disconnect();
  });
  it("coalesces ordinary refresh callers without issuing a trailing request", async () => {
    const mock = connection(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    void session.refresh(); void session.refresh();
    mock.requests[0].resolve(data(1)); await flush(); expect(mock.requests).toHaveLength(1);
    expect(session.state.data?.configuration_revision).toBe(1); session.disconnect();
  });
  it("queues one trailing refresh for changed inputs and deduplicates the same input", async () => {
    const mock = connection(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    const changed = {}; void session.refresh(changed); void session.refresh(changed);
    mock.requests[0].resolve(data(1)); await flush(); expect(mock.requests).toHaveLength(2);
    mock.requests[1].resolve(data(2)); await flush(); expect(session.state.data?.configuration_revision).toBe(2);
    session.disconnect();
  });
  it("forwards HA connection properties and additional methods with their original receiver", () => {
    const mock = connection(); const real = mock.hass.connection as typeof mock.hass.connection & { connected: boolean; subscribeEvents(): boolean };
    real.connected = true; real.subscribeEvents = function () { return this === real; };
    const session = new PanelScheduleSession(); session.connect(mock.hass);
    const wrapped = session.hassFor(mock.hass)!.connection as typeof real;
    expect(wrapped.connected).toBe(true); expect(wrapped.subscribeEvents()).toBe(true); session.disconnect();
  });
  it("refreshes after an overtaken mutation reply so confirmed changes are not lost", async () => {
    const mock = connection(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    mock.requests[0].resolve(data(1)); await flush();
    const pending = session.hassFor(mock.hass)!.connection.sendMessagePromise({ type: "velair/update_settings" });
    mock.streams[0]({ loaded: true, schedule: data(1, "runtime") });
    mock.requests[1].resolve(data(2, "mutation")); await pending; await flush();
    expect(mock.requests).toHaveLength(3);
    const latest = data(2, "confirmed"); mock.requests[2].resolve(latest); await flush();
    expect(session.state.data).toBe(latest); session.disconnect();
  });
});
