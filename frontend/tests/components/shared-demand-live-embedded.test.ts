// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairSharedDemandLive } from "../../src/velair/components/shared-demand-live-element";
import { en } from "../../src/velair/translations/en";
import type { HomeAssistant, SharedDemandStatus, SharedSupply } from "../../src/velair/types";
import type { VelairViewHost } from "../../src/velair/host-types";

afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });
const supply = (id = "boiler"): SharedSupply => ({ id, name: id, enabled: true, direction: "heat", switch_entity_id: "switch.boiler", hysteresis: .3, minimum_off_seconds: 0, off_delay_seconds: 0, suspended: false, zones: { "climate.room": {} } });
const status = (cool = false): SharedDemandStatus => ({ status: "demand", output_state: "on", demand: true, zones: { "climate.room": { source: "estimated", demand: true, temperature_unit: "°C", temperature: cool ? 25 : 20, target: 21, start_temperature: cool ? 21.3 : 20.7, stop_temperature: 21 } } });
const hidden = { header: false, connection: false, switchState: false, roomCount: false, legend: false, demandDescription: false };
async function mount(pending?: Promise<() => void>) {
  const callbacks: Array<(value: unknown) => void> = [];
  const listeners = new Map<string, () => void>();
  const unsubscribe = vi.fn();
  const subscribe = vi.fn(callback => { callbacks.push(callback); return pending ?? Promise.resolve(unsubscribe); });
  const hass = { language: "en", connection: { subscribeMessage: subscribe, addEventListener: (name: string, callback: () => void) => listeners.set(name, callback), removeEventListener: (name: string) => listeners.delete(name) } } as unknown as HomeAssistant;
  const host = { _friendlyEntityName: (id: string) => id, _t: (key: keyof typeof en, values?: Record<string, string | number>) => Object.entries(values ?? {}).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), en[key]) } as unknown as VelairViewHost;
  const element = document.createElement("velair-shared-demand-live") as VelairSharedDemandLive;
  expect(element).toBeInstanceOf(VelairSharedDemandLive);
  element.host = host; element.hass = hass; element.supply = supply(); element.embedded = true;
  document.body.append(element); await element.updateComplete;
  const receive = (snapshot: SharedDemandStatus, id = "boiler", index = callbacks.length - 1) => callbacks[index]({ loaded: true, shared_demand: { [id]: snapshot } });
  return { element, hass, subscribe, unsubscribe, callbacks, listeners, receive };
}

describe("embedded supply monitor", () => {
  it.each([false, true])("subscribes without opening a dialog and preserves the graph for cooling=%s", async cool => {
    const { element, receive, subscribe } = await mount();
    element.supply = { ...supply(), direction: cool ? "cool" : "heat" };
    receive(status(cool)); await element.updateComplete;
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(element.shadowRoot!.querySelector("dialog")).toBeNull();
    expect(element.shadowRoot!.querySelector("[data-live-trigger]")).toBeNull();
    expect(element.shadowRoot!.querySelector(".documentation-close")).toBeNull();
    expect(element.shadowRoot!.querySelector(".live-axis")).not.toBeNull();
    expect(element.shadowRoot!.querySelectorAll(".live-summary-fact")).toHaveLength(2);
    expect(element.shadowRoot!.querySelector(".live-legend")).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".live-meta.is-live")).not.toBeNull();
  });
  it("can hide every routine element without hiding rooms, and applies a custom title", async () => {
    const { element, receive } = await mount();
    element.heading = "Heating"; receive(status()); await element.updateComplete;
    expect(element.shadowRoot!.querySelector("h2")?.textContent).toBe("Heating");
    element.visibility = hidden; await element.updateComplete;
    for (const selector of ["h2", ".live-subtitle", ".live-meta", ".live-summary", ".live-legend", ".live-control"]) expect(element.shadowRoot!.querySelector(selector), selector).toBeNull();
    expect(element.shadowRoot!.querySelector(".live-room")).not.toBeNull();
  });
  it.each(["header", "connection", "switchState", "roomCount", "legend", "demandDescription"] as const)("hides only the requested %s element", async key => {
    const { element, receive } = await mount(); receive(status()); element.visibility = { [key]: false }; await element.updateComplete;
    const selectors = { header: "h2", connection: ".live-meta", legend: ".live-legend", demandDescription: ".live-control" };
    if (key === "switchState" || key === "roomCount") {
      expect(element.shadowRoot!.querySelectorAll(".live-summary-fact")).toHaveLength(1);
      expect(element.shadowRoot!.querySelector(".live-summary.one-fact")).not.toBeNull();
    } else expect(element.shadowRoot!.querySelector(selectors[key])).toBeNull();
    expect(element.shadowRoot!.querySelector(".live-room")).not.toBeNull();
  });
  it.each(["suspended", "disabled", "delivery_failed", "on_delay", "minimum_off", "off_delay", "invalid_output", "unavailable", "future_state"])("retains %s when descriptions and all normal elements are hidden", async state => {
    const { element, receive } = await mount(); element.visibility = hidden;
    receive({ ...status(), status: state as SharedDemandStatus["status"] }); await element.updateComplete;
    const control = element.shadowRoot!.querySelector(".live-control");
    expect(control).not.toBeNull();
    expect(control!.textContent!.trim().length).toBeGreaterThan(0);
  });
  it("retains unknown output and room readings without the summary", async () => {
    const { element, receive } = await mount(); element.visibility = hidden;
    receive({ ...status(), output_state: "unavailable", zones: { "climate.room": { demand: null, source: "estimated", reason: "unavailable" } } }); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-control")?.textContent).toContain("unavailable");
    expect(element.shadowRoot!.querySelector(".live-control")?.textContent).toContain("unknown");
  });
  it("keeps the countdown, stops it on detach, and restarts subscriptions on reattach", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-28T12:00:00Z"));
    const { element, receive, subscribe, unsubscribe } = await mount(); element.visibility = hidden;
    receive({ ...status(), status: "on_delay", pending_until: "2026-10-28T12:00:03Z" }); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-countdown")?.textContent).toContain("3 s");
    await vi.advanceTimersByTimeAsync(1000); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-countdown")?.textContent).toContain("2 s");
    element.remove(); await Promise.resolve(); expect(unsubscribe).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
    document.body.append(element); await element.updateComplete; expect(subscribe).toHaveBeenCalledTimes(2);
  });
  it("retains disconnect/error/retry messages with connection and header hidden", async () => {
    const { element, receive, listeners, subscribe } = await mount(); element.visibility = hidden; receive(status()); await element.updateComplete;
    listeners.get("disconnected")!(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-meta")?.textContent).toContain(en.sharedDemandLiveDisconnected);
    subscribe.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    listeners.get("ready")!(); await element.updateComplete; await Promise.resolve(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-error")).not.toBeNull();
    element.shadowRoot!.querySelector<HTMLButtonElement>(".live-meta button")!.click(); await element.updateComplete;
    expect(subscribe).toHaveBeenCalledTimes(3);
    receive(status()); await element.updateComplete; expect(element.shadowRoot!.querySelector(".live-meta")).toBeNull();
  });
  it("ignores old callbacks when switching supply and removes monitoring when disabled", async () => {
    const { element, receive, subscribe, unsubscribe } = await mount(); receive(status()); await element.updateComplete;
    element.supply = supply("other"); await element.updateComplete; expect(subscribe).toHaveBeenCalledTimes(2);
    receive(status(), "boiler", 0); await element.updateComplete; expect(element.shadowRoot!.querySelector(".live-room")).toBeNull();
    receive(status(), "other"); await element.updateComplete; expect(element.shadowRoot!.querySelector(".live-room")).not.toBeNull();
    element.embedded = false; await element.updateComplete; await Promise.resolve(); expect(unsubscribe).toHaveBeenCalledTimes(2);
    expect(element.shadowRoot!.querySelector("[data-live-trigger]")).not.toBeNull();
    receive(status(), "other"); await element.updateComplete; expect(element.shadowRoot!.querySelector(".live-room")).toBeNull();
  });
  it("invalidates a pending subscription after removing the selected supply", async () => {
    let resolve!: (unsubscribe: () => void) => void;
    const pending = new Promise<() => void>(r => { resolve = r; });
    const { element, receive } = await mount(pending); element.supply = undefined; await element.updateComplete;
    receive(status()); await element.updateComplete; expect(element.shadowRoot!.querySelector(".live-room")).toBeNull();
    const unsubscribe = vi.fn(); resolve(unsubscribe); await Promise.resolve(); await Promise.resolve(); expect(unsubscribe).toHaveBeenCalledTimes(1);
    element.supply = supply(); await element.updateComplete; expect(element.shadowRoot!.querySelector(".live-room")).toBeNull();
  });
});
