// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairPanel } from "../../src/velair/views/panel";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import type { DiagnosticsSnapshot, HomeAssistant, ScheduleResponse, ScheduleUpdateMessage } from "../../src/velair/types";

class TestPanel extends VelairPanel {}
class PanelCard extends VelairCard {}
class StandaloneCard extends VelairCard {}
if (!customElements.get("session-test-panel")) customElements.define("session-test-panel", TestPanel);
if (!customElements.get("velair-panel-card")) customElements.define("velair-panel-card", PanelCard);
if (!customElements.get("session-test-card")) customElements.define("session-test-card", StandaloneCard);
const schedule = (revision = 1) => ({
  active_overrides: {}, configured_entities: [], configuration_revision: revision,
  global: { mode: "auto" }, next_event: null, next_events: [],
  operational_status: "running", settings: { first_weekday: "monday", zone_order: [] },
  temperature_unit: "°C", home_assistant_temperature_unit: "°C",
  temperature_migration: { required: false }, zones: {},
}) as unknown as ScheduleResponse;
type CardInternals = {
  _data?: ScheduleResponse; _dirty: boolean; _draftBlocks: unknown[]; _error?: string;
  _applyScheduleData(data: ScheduleResponse, options?: { forceDraft?: boolean }): void;
  _applyDiagnosticsSnapshot(data?: DiagnosticsSnapshot): void;
};
const internals = (card: VelairCard) => card as unknown as CardInternals;
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function backend() {
  let current = schedule(); const streams: ((message: ScheduleUpdateMessage) => void)[] = [];
  const unsubscribe = vi.fn();
  const send = vi.fn(async () => current);
  const subscribe = vi.fn(async (callback: (message: ScheduleUpdateMessage) => void, message: { type: string }) => {
    if (message.type === "velair/subscribe_updates") { streams.push(callback); callback({ loaded: true, schedule: current }); }
    return unsubscribe;
  });
  const hass = { callService: vi.fn(), connection: { sendMessagePromise: send, subscribeMessage: subscribe }, config: { unit_system: { temperature: "°C" } } } as unknown as HomeAssistant;
  return { hass, send, subscribe, unsubscribe, push(data: ScheduleResponse) { current = data; for (const stream of streams) stream({ loaded: true, schedule: data }); } };
}
async function panel(mock: ReturnType<typeof backend>, path = "/velair") {
  window.history.replaceState(null, "", path);
  const element = document.createElement("session-test-panel") as VelairPanel;
  element.hass = mock.hass; document.body.append(element); await element.updateComplete; await flush();
  await activeCard(element).updateComplete; return element;
}
const activeCard = (panel: VelairPanel) => panel.shadowRoot!.querySelector("velair-panel-card") as VelairCard;
async function navigate(panel: VelairPanel, view: string, subsection?: string) {
  (panel as unknown as { _selectView(view: string, source?: Event, subsection?: string): void })._selectView(view, undefined, subsection);
  await panel.updateComplete; await activeCard(panel).updateComplete; await flush();
}
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); window.history.replaceState(null, "", "/"); });

describe("panel-only shared schedule lifecycle", () => {
  it("retains return settings when child dirty events trigger rejected tab navigation", async () => {
    const element = await panel(backend(), "/velair/planned-return");
    const card = activeCard(element);
    const controls = card.shadowRoot!.querySelector("velair-planned-return")!;
    controls.dispatchEvent(new CustomEvent("velair-dirty-changed", { detail: { dirty: true }, bubbles: true, composed: true }));
    await card.updateComplete; await element.updateComplete;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await navigate(element, "preconditioning");
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(activeCard(element)).toBe(card);
    expect(card.shadowRoot!.querySelector("velair-planned-return")).toBe(controls);
    expect(window.location.pathname).toBe("/velair/planned-return");
    confirm.mockReturnValue(true);
    await navigate(element, "preconditioning");
    expect(window.location.pathname).toBe("/velair/preconditioning");
  });
  it("blocks tab navigation while the return component reports a backend operation", async () => {
    const element = await panel(backend(), "/velair/planned-return");
    const card = activeCard(element);
    const controls = card.shadowRoot!.querySelector("velair-planned-return")!;
    controls.dispatchEvent(new CustomEvent("planned-return-busy", { detail: true, bubbles: true, composed: true }));
    await navigate(element, "preconditioning");
    expect(activeCard(element)).toBe(card);
    expect(window.location.pathname).toBe("/velair/planned-return");
    controls.dispatchEvent(new CustomEvent("planned-return-busy", { detail: false, bubbles: true, composed: true }));
    await navigate(element, "preconditioning");
    expect(window.location.pathname).toBe("/velair/preconditioning");
  });
  it("shares one load and stream across top tabs and renders cached data on the new editor", async () => {
    const mock = backend(); const element = await panel(mock); const first = activeCard(element);
    for (const view of ["schedules", "modes", "templates", "sensors", "comfort", "preconditioning", "planned-return", "settings", "overview"]) {
      await navigate(element, view);
      expect(internals(activeCard(element))._data?.configuration_revision).toBe(1);
      expect(activeCard(element).shadowRoot!.querySelector(".initial-loading")).toBeNull();
    }
    expect(activeCard(element)).not.toBe(first);
    expect(mock.send).toHaveBeenCalledTimes(1);
    expect(mock.subscribe.mock.calls.filter(([, message]) => message.type === "velair/subscribe_updates")).toHaveLength(1);
    expect(mock.unsubscribe).not.toHaveBeenCalled(); element.remove(); await flush(); expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("retains subsection editor and preserves dirty drafts during push and cancelled navigation", async () => {
    const mock = backend(); const element = await panel(mock, "/velair/schedules/default"); const card = activeCard(element);
    const draft = [{ id: "local draft" }]; internals(card)._draftBlocks = draft; internals(card)._dirty = true;
    mock.push(schedule(2)); await card.updateComplete;
    expect(internals(card)._draftBlocks).toBe(draft);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await navigate(element, "settings"); expect(activeCard(element)).toBe(card);
    expect(window.location.pathname).toBe("/velair/schedules/default"); expect(internals(card)._draftBlocks).toBe(draft);
    confirm.mockReturnValue(true); await navigate(element, "schedules", "profiles"); expect(activeCard(element)).toBe(card);
  });
  it("keeps diagnostics overlays local and forceDraft confined to the originating editor", async () => {
    const mock = backend(); const element = await panel(mock, "/velair/schedules/default"); const oldCard = activeCard(element);
    const diagnostics = { generated_at: "local" } as DiagnosticsSnapshot;
    internals(oldCard)._applyDiagnosticsSnapshot(diagnostics);
    await navigate(element, "templates"); const card = activeCard(element);
    expect(internals(card)._data?.diagnostics).toBeUndefined();
    const draft = [{ id: "keep" }]; internals(card)._draftBlocks = draft; internals(card)._dirty = true;
    internals(oldCard)._applyScheduleData(schedule(3), { forceDraft: true }); await card.updateComplete;
    expect(internals(card)._data?.configuration_revision).toBe(3); expect(internals(card)._draftBlocks).toBe(draft);
  });
  it("publishes a nested save completing after its editor unmounts", async () => {
    const mock = backend(); const element = await panel(mock); const oldCard = activeCard(element);
    let resolve!: (data: ScheduleResponse) => void;
    mock.send.mockImplementationOnce(() => new Promise((yes) => { resolve = yes; }));
    const pending = oldCard.hass!.connection.sendMessagePromise({ type: "velair/set_profile" });
    await navigate(element, "settings"); const card = activeCard(element);
    resolve(schedule(4)); await pending; await card.updateComplete;
    expect(internals(card)._data?.configuration_revision).toBe(4);
  });
  it("preserves local save errors through normal runtime pushes", async () => {
    const mock = backend(); const element = await panel(mock); const card = activeCard(element);
    internals(card)._error = "save conflict"; mock.push(schedule(2)); await card.updateComplete;
    expect(internals(card)._error).toBe("save conflict");
  });
  it("clears a session-owned load error when a deliberate refresh succeeds", async () => {
    const mock = backend(); mock.send.mockRejectedValueOnce(new Error("load unavailable"));
    mock.subscribe.mockImplementationOnce(async () => mock.unsubscribe);
    const element = await panel(mock); const card = activeCard(element);
    expect(internals(card)._error).toBe("load unavailable");
    await (card as unknown as { _loadSchedule(): Promise<void> })._loadSchedule(); await card.updateComplete;
    expect(internals(card)._error).toBeUndefined(); expect(internals(card)._data?.configuration_revision).toBe(1);
  });
  it("replaces diagnostics subscription along with the panel connection and rejects old diagnostics", async () => {
    const first = backend(); const second = backend();
    const diagnostics = (marker: string) => ({ generated_at: marker, overall: { status: "ok", scheduler_mode: "auto", scheduler_status: "scheduled", unit_counts: { ok: 0, warning: 0, error: 0 }, issues: [] }, units: {}, history: [], history_policy: { categories: {}, runtime_only: true, cleared_on_restart: true } }) as unknown as DiagnosticsSnapshot;
    let oldCallback!: (message: { loaded: boolean; diagnostics?: DiagnosticsSnapshot }) => void;
    first.hass.connection.sendMessagePromise = vi.fn(async (message) => (message.type === "velair/get_diagnostics" ? diagnostics("old") : schedule())) as HomeAssistant["connection"]["sendMessagePromise"];
    first.hass.connection.subscribeMessage = vi.fn(async (callback, message) => {
      if (message.type === "velair/subscribe_diagnostics") oldCallback = callback as typeof oldCallback;
      return first.unsubscribe;
    });
    second.hass.connection.sendMessagePromise = vi.fn(async (message) => (message.type === "velair/get_diagnostics" ? diagnostics("new") : schedule(2))) as HomeAssistant["connection"]["sendMessagePromise"];
    second.hass.connection.subscribeMessage = vi.fn(async () => second.unsubscribe);
    const element = await panel(first, "/velair/diagnostics"); const card = activeCard(element); await flush();
    expect(internals(card)._data?.diagnostics?.generated_at).toBe("old");
    element.hass = second.hass; await element.updateComplete; await card.updateComplete; await flush();
    oldCallback({ loaded: true, diagnostics: diagnostics("late-old") }); await card.updateComplete;
    expect(internals(card)._data?.diagnostics?.generated_at).toBe("new");
    expect(first.unsubscribe).toHaveBeenCalledTimes(2);
    expect(vi.mocked(second.hass.connection.subscribeMessage).mock.calls.filter(([, message]) => message.type === "velair/subscribe_diagnostics")).toHaveLength(1);
  });
  it("does not let an old pending diagnostics request clear the new connection's busy flag", async () => {
    const first = backend(); const second = backend();
    let finishOld!: (data: DiagnosticsSnapshot) => void; let finishNew!: (data: DiagnosticsSnapshot) => void;
    const oldDiagnostics = new Promise<DiagnosticsSnapshot>((resolve) => { finishOld = resolve; });
    const newDiagnostics = new Promise<DiagnosticsSnapshot>((resolve) => { finishNew = resolve; });
    first.hass.connection.sendMessagePromise = vi.fn(async (message) => message.type === "velair/get_diagnostics" ? oldDiagnostics : schedule()) as HomeAssistant["connection"]["sendMessagePromise"];
    second.hass.connection.sendMessagePromise = vi.fn(async (message) => message.type === "velair/get_diagnostics" ? newDiagnostics : schedule(2)) as HomeAssistant["connection"]["sendMessagePromise"];
    const element = await panel(first, "/velair/diagnostics"); const card = activeCard(element);
    element.hass = second.hass; await element.updateComplete; await card.updateComplete; await flush();
    const snapshot = { generated_at: "new", overall: { status: "ok", scheduler_mode: "auto", scheduler_status: "scheduled", unit_counts: { ok: 0, warning: 0, error: 0 }, issues: [] }, units: {}, history: [], history_policy: { categories: {} } } as unknown as DiagnosticsSnapshot;
    finishOld(snapshot); await flush();
    expect(vi.mocked(second.hass.connection.sendMessagePromise).mock.calls.filter(([message]) => message.type === "velair/get_diagnostics")).toHaveLength(1);
    expect((card as unknown as { _subscribingDiagnostics: boolean })._subscribingDiagnostics).toBe(true);
    finishNew(snapshot); await flush(); await card.updateComplete;
    expect(vi.mocked(second.hass.connection.subscribeMessage).mock.calls.filter(([, message]) => message.type === "velair/subscribe_diagnostics")).toHaveLength(1);
  });
  it("leaves independently mounted Lovelace cards with their own load and subscription", async () => {
    const mock = backend(); const element = await panel(mock);
    const card = document.createElement("session-test-card") as VelairCard; card.hass = mock.hass; document.body.append(card);
    await card.updateComplete; await flush(); expect(mock.send).toHaveBeenCalledTimes(2);
    expect(mock.subscribe.mock.calls.filter(([, message]) => message.type === "velair/subscribe_updates")).toHaveLength(2);
    element.remove(); await flush(); expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
    mock.push(schedule(5)); await card.updateComplete; expect(internals(card)._data?.configuration_revision).toBe(5);
    card.remove(); await flush(); expect(mock.unsubscribe).toHaveBeenCalledTimes(2);
  });
});
