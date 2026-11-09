import { describe, expect, it, vi } from "vitest";
import { VelairApiClient } from "../../src/velair/api/client";
import { PanelScheduleSession } from "../../src/velair/controllers/panel-schedule-session";
import { applyScheduleData, loadSchedule, receiveScheduleUpdate } from "../../src/velair/controllers/schedule-state";
import { isRuntimeScheduleSnapshot, ScheduleRuntimeUpdates } from "../../src/velair/controllers/schedule-runtime-updates";
import type { ComfortAssessment, HomeAssistant, OperationStatus, ScheduleResponse, ScheduleUpdateMessage } from "../../src/velair/types";

const condition = (value: string) => ({ condition: value }) as ComfortAssessment;
const operation = (id = "operation", started_at = "2026-05-19T18:00:00Z") => ({
  id, kind: "mode_change", state: "running", completed: 0, total: 2, started_at,
}) as OperationStatus;
const snapshot = (revision = 1) => ({
  configured_entities: ["climate.a", "climate.b"], zones: {}, configuration_revision: revision,
  comfort: { "climate.a": condition("comfortable"), "climate.b": condition("cold") },
  operation_status: operation(),
}) as unknown as ScheduleResponse;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
};
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function backend() {
  const requests: ReturnType<typeof deferred<ScheduleResponse>>[] = [];
  const streams: ((message: ScheduleUpdateMessage) => void)[] = [];
  const events = new Map<string, () => void>();
  const unsubscribe = vi.fn();
  const hass = { connection: {
    sendMessagePromise: vi.fn(() => { const request = deferred<ScheduleResponse>(); requests.push(request); return request.promise; }),
    subscribeMessage: vi.fn((callback: (message: ScheduleUpdateMessage) => void) => { streams.push(callback); return Promise.resolve(unsubscribe); }),
    addEventListener: vi.fn((name: string, callback: () => void) => events.set(name, callback)),
    removeEventListener: vi.fn((name: string) => events.delete(name)),
  } } as unknown as HomeAssistant;
  return { hass, requests, streams, events, unsubscribe };
}

describe("partial runtime schedule updates", () => {
  it("opts API readers into partial messages explicitly", async () => {
    const mock = backend();
    const callback = vi.fn();
    await new VelairApiClient(mock.hass).subscribeUpdates(callback);
    expect(mock.hass.connection.subscribeMessage).toHaveBeenCalledWith(callback, {
      type: "velair/subscribe_updates", partial_updates: true,
    });
  });

  it("merges only supplied runtime fields, retains unrelated entities and honors explicit null", () => {
    const updates = new ScheduleRuntimeUpdates();
    const original = snapshot();
    expect(updates.accept({ loaded: true })).toBe(false);
    expect(updates.accept({ loaded: true, operation_status: undefined })).toBe(false);
    expect(updates.accept({ loaded: true, comfort: {} })).toBe(true);
    expect(updates.merge(original)).toBe(original);
    updates.accept({ loaded: true, comfort: { "climate.a": condition("humid") } });
    const merged = updates.merge(original, 0, true);
    expect(merged.comfort?.["climate.a"].condition).toBe("humid");
    expect(merged.comfort?.["climate.b"]).toBe(original.comfort?.["climate.b"]);
    expect(merged.zones).toBe(original.zones);
    expect(merged.operation_status).toBe(original.operation_status);
    expect(original.comfort?.["climate.a"].condition).toBe("comfortable");
    expect(isRuntimeScheduleSnapshot(merged)).toBe(true);
    updates.accept({ loaded: true, operation_status: null });
    expect(updates.merge(merged, 0, true).operation_status).toBeNull();
  });

  it("does not overlay an older operation push onto a newer full operation", () => {
    const updates = new ScheduleRuntimeUpdates();
    updates.accept({ loaded: true, operation_status: operation("old") });
    const latest = { ...snapshot(), operation_status: operation("new", "2026-05-19T19:00:00Z") };
    expect(updates.merge(latest)).toBe(latest);
    const equalTime = { ...snapshot(), operation_status: operation("new") };
    expect(updates.merge(equalTime, 0, false, "request-operation")).toBe(equalTime);
    const rewound = { ...snapshot(), operation_status: operation("new", "2026-05-19T17:00:00Z") };
    expect(updates.merge(rewound, 0, false, "request-operation")).toBe(rewound);
    const originalReply = { ...snapshot(), operation_status: operation("request-operation") };
    expect(updates.merge(originalReply, 0, false, "request-operation").operation_status?.id).toBe("old");
  });

  it("keeps terminal or more advanced full operation status over a queued running push", () => {
    const updates = new ScheduleRuntimeUpdates();
    updates.accept({ loaded: true, operation_status: { ...operation(), completed: 1 } });
    for (const state of ["completed", "completed_with_errors", "failed"] as const) {
      const terminal = { ...snapshot(), operation_status: { ...operation(), state, completed: 2 } };
      expect(updates.merge(terminal).operation_status).toBe(terminal.operation_status);
      expect(updates.merge(terminal, 0, true).operation_status).toBe(terminal.operation_status);
    }
    const ahead = { ...snapshot(), operation_status: { ...operation(), completed: 2 } };
    expect(updates.merge(ahead)).toBe(ahead);
  });

  it("applies live session patches without requesting a full schedule", async () => {
    const mock = backend(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    const original = snapshot(); mock.streams[0]({ loaded: true, schedule: original });
    mock.streams[0]({ loaded: true, comfort: { "climate.a": condition("humid") } });
    mock.streams[0]({ loaded: true, operation_status: { ...operation(), completed: 1 } });
    expect(session.state.data?.comfort?.["climate.a"].condition).toBe("humid");
    expect(session.state.data?.operation_status?.completed).toBe(1);
    expect(session.state.data?.zones).toBe(original.zones);
    expect(isRuntimeScheduleSnapshot(session.state.data!)).toBe(true);
    expect(mock.requests).toHaveLength(1);
    expect(mock.hass.connection.subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
      type: "velair/subscribe_updates", partial_updates: true,
    });
    mock.requests[0].resolve({ ...snapshot(), operation_status: null }); await flush();
    expect(session.state.data?.comfort?.["climate.a"].condition).toBe("humid");
    session.disconnect();
  });

  it("buffers patches before the first full response without creating another fetch", async () => {
    const mock = backend(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    mock.streams[0]({ loaded: true, comfort: { "climate.a": condition("humid") } });
    mock.streams[0]({ loaded: true, operation_status: { ...operation(), completed: 1 } });
    expect(session.state.data).toBeUndefined(); expect(mock.requests).toHaveLength(1);
    mock.requests[0].resolve({ ...snapshot(), operation_status: null }); await flush();
    expect(session.state.data?.comfort?.["climate.a"].condition).toBe("humid");
    expect(session.state.data?.operation_status?.completed).toBe(1);
    expect(mock.requests).toHaveLength(1); session.disconnect();
  });

  it("keeps a newer full stream authoritative over buffered earlier patches", async () => {
    const mock = backend(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    mock.streams[0]({ loaded: true, comfort: { "climate.a": condition("humid") } });
    const latest = snapshot(2); mock.streams[0]({ loaded: true, schedule: latest });
    mock.requests[0].resolve(snapshot()); await flush();
    expect(session.state.data).toBe(latest); session.disconnect();
  });

  it("retains new patches when an outstanding refresh returns changed configuration", async () => {
    const mock = backend(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    mock.requests[0].resolve(snapshot()); await flush();
    const pending = session.refresh();
    mock.streams[0]({ loaded: true, comfort: { "climate.a": condition("humid") } });
    const latest = snapshot(2); mock.requests[1].resolve(latest); await pending;
    expect(session.state.data?.configuration_revision).toBe(2);
    expect(session.state.data?.comfort?.["climate.a"].condition).toBe("humid");
    expect(mock.requests).toHaveLength(2); session.disconnect();
  });

  it("merges patches into pending save replies without discarding confirmed settings or refetching", async () => {
    const mock = backend(); const session = new PanelScheduleSession(); session.connect(mock.hass);
    mock.requests[0].resolve(snapshot()); await flush();
    const pending = session.hassFor(mock.hass)!.connection.sendMessagePromise<ScheduleResponse>({ type: "velair/update_settings" });
    mock.streams[0]({ loaded: true, operation_status: { ...operation(), completed: 1 } });
    mock.requests[1].resolve(snapshot(2)); const response = await pending; await flush();
    expect(response.configuration_revision).toBe(2);
    expect(response.operation_status?.completed).toBe(1);
    expect(session.state.data).toBe(response);
    expect(mock.requests).toHaveLength(2); session.disconnect();
  });

  it("drops buffered patches on unload and rejects callbacks from a replaced connection", async () => {
    const first = backend(); const second = backend(); const session = new PanelScheduleSession(); session.connect(first.hass);
    first.streams[0]({ loaded: true, comfort: { "climate.a": condition("humid") } });
    session.setHass(second.hass);
    first.streams[0]({ loaded: true, operation_status: null });
    second.requests[0].resolve(snapshot()); await flush();
    expect(session.state.data?.comfort?.["climate.a"].condition).toBe("comfortable");
    second.streams[0]({ loaded: true, comfort: { "climate.a": condition("humid") } });
    second.streams[0]({ loaded: false });
    second.requests[1].resolve(snapshot(2)); await flush();
    expect(session.state.data?.comfort?.["climate.a"].condition).toBe("comfortable");
    session.disconnect();
  });

  it("preserves direct-controller drafts and merges a push racing its initial read", async () => {
    const request = deferred<ScheduleResponse>();
    const reset = vi.fn(); const drafts = [{ start: "08:00" }];
    const host = {
      _scheduleSubscriptionGeneration: 1, _loading: false, _data: snapshot(),
      _dirty: true, _draftBlocks: drafts, _templateDirty: true,
      _resetDraftBlocks: reset, _resetTemplateDraft: reset,
      _api: () => ({ getSchedule: () => request.promise }), _t: (key: string) => key,
      _applyScheduleData(data: ScheduleResponse) { applyScheduleData(this as never, data); },
      _loadSchedule: vi.fn(),
    };
    receiveScheduleUpdate(host as never, { loaded: true, comfort: { "climate.a": condition("humid") } });
    expect(host._data.comfort?.["climate.a"].condition).toBe("humid");
    expect(host._draftBlocks).toBe(drafts); expect(reset).not.toHaveBeenCalled();
    // Capture a full pending read without needing a complete editor fixture.
    host._applyScheduleData = (data) => { host._data = data; };
    const loading = loadSchedule(host as never);
    receiveScheduleUpdate(host as never, { loaded: true, operation_status: null });
    request.resolve(snapshot(2)); await loading;
    expect(host._data.configuration_revision).toBe(2);
    expect(host._data.operation_status).toBeNull();
    expect(host._loadSchedule).not.toHaveBeenCalled();
  });
});
