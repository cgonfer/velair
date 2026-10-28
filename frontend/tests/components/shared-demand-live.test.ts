// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VelairSharedDemandLive } from "../../src/velair/components/shared-demand-live-element";
import "../../src/velair/components/shared-demand-settings-element";
import type { VelairSharedDemandSettings } from "../../src/velair/components/shared-demand-settings-element";
import type { HomeAssistant, ScheduleResponse, SharedDemandStatus, SharedSupply } from "../../src/velair/types";
import type { VelairViewHost } from "../../src/velair/host-types";
import { en } from "../../src/velair/translations/en";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event("close")); };
});
afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });
const saved = (): SharedSupply => ({ id: "boiler", name: "Boiler", enabled: true, switch_entity_id: "switch.boiler", direction: "heat", hysteresis: .3, minimum_off_seconds: 0, off_delay_seconds: 0, zones: { "climate.room": {} }, suspended: false });
const status = (cool = false): SharedDemandStatus => ({ status: "demand", output_state: "on", demand: true, zones: { "climate.room": { demand: true, source: "room_assist", temperature: cool ? 25 : 20.5, target: cool ? 24 : 21, start_temperature: cool ? 24.3 : 20.7, stop_temperature: cool ? 24 : 21, temperature_unit: "°C", sensor_entity_id: "sensor.room" } } });
async function setup(pending?: Promise<() => void>) {
  let receive!: (message: { loaded: boolean; shared_demand?: Record<string, SharedDemandStatus> }) => void;
  const unsubscribe = vi.fn();
  const listeners = new Map<string, () => void>();
  const subscribe = vi.fn((callback) => { receive = callback; return pending ?? Promise.resolve(unsubscribe); });
  const hass = { language: "en", connection: { subscribeMessage: subscribe, addEventListener: (name: string, callback: () => void) => listeners.set(name, callback), removeEventListener: (name: string) => listeners.delete(name) } } as unknown as HomeAssistant;
  const host = { hass, _friendlyEntityName: (id: string) => id === "climate.room" ? "Living room" : id, _t: (key: keyof typeof en, values?: Record<string, string | number>) => Object.entries(values ?? {}).reduce((copy, [name, value]) => copy.replace(`{${name}}`, String(value)), en[key]) } as unknown as VelairViewHost;
  const element = document.createElement("velair-shared-demand-live") as VelairSharedDemandLive;
  element.host = host; element.hass = hass; element.supply = saved();
  document.body.append(element); await element.updateComplete;
  const trigger = element.shadowRoot!.querySelector<HTMLButtonElement>("[data-live-trigger]")!;
  trigger.click(); await element.updateComplete;
  return { element, host, hass, trigger, subscribe, unsubscribe, listeners, receive: (value: SharedDemandStatus) => receive({ loaded: true, shared_demand: { boiler: value } }), unavailable: () => receive({ loaded: false }) };
}

describe("live dialog alignment", () => {
  it("centres on the tab container, stays inside the viewport and stops tracking after close", async () => {
    const { element } = await setup();
    const dialog = element.shadowRoot!.querySelector<HTMLDialogElement>("dialog")!;
    dialog.close(); await element.updateComplete;
    const tab = document.createElement("section");
    const root = tab.attachShadow({ mode: "open" });
    document.body.append(tab); root.append(element);
    const bounds = vi.spyOn(tab, "getBoundingClientRect").mockReturnValue(new DOMRect(300, 0, 1000, 800));
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 400, 500));
    element.shadowRoot!.querySelector<HTMLButtonElement>("[data-live-trigger]")!.click();
    await element.updateComplete;
    expect(dialog.style.getPropertyValue("--live-dialog-center")).toBe("800px");
    bounds.mockReturnValue(new DOMRect(200, 0, 800, 800));
    window.dispatchEvent(new Event("resize"));
    expect(dialog.style.getPropertyValue("--live-dialog-center")).toBe("600px");
    bounds.mockReturnValue(new DOMRect(900, 0, 500, 800));
    window.dispatchEvent(new Event("resize"));
    expect(dialog.style.getPropertyValue("--live-dialog-center")).toBe(`${window.innerWidth - 216}px`);
    dialog.close(); await element.updateComplete;
    bounds.mockReturnValue(new DOMRect(0, 0, 800, 800));
    window.dispatchEvent(new Event("resize"));
    expect(dialog.style.getPropertyValue("--live-dialog-center")).toBe(`${window.innerWidth - 216}px`);
  });
});

describe("supply live status", () => {
  it.each(["climate.room", "group.room"])("omits a reference duplicating the displayed control unit %s", async id => {
    const { element, receive } = await setup();
    element.supply = { ...saved(), zones: { [id]: {} } };
    receive({ ...status(), zones: { [id]: { ...status().zones["climate.room"], source: "estimated", sensor_entity_id: id } } });
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-room")).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".live-reference")).toBeNull();
  });
  it("keeps a group member reference when it differs from the displayed group", async () => {
    const { element, receive } = await setup();
    element.supply = { ...saved(), zones: { "group.room": {} } };
    receive({ ...status(), zones: { "group.room": { ...status().zones["climate.room"], source: "estimated", sensor_entity_id: "climate.room" } } });
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-reference")?.textContent).toContain("Reference: Living room");
  });
  it.each([
    ["on_delay", "Demand detected · Switch-on in 3 s"],
    ["minimum_off", "Minimum time off · Restart possible in 3 s"],
    ["off_delay", "No demand · Switch-off in 3 s"],
  ])("counts down the backend %s deadline without polling or claiming completion", async (waitStatus, label) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-25T10:00:00Z"));
    const { element, receive, subscribe } = await setup();
    receive({ ...status(), status: waitStatus, pending_until: "2026-10-25T10:00:03Z" });
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-countdown")!.textContent).toBe(label);
    await vi.advanceTimersByTimeAsync(1000); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-countdown")!.textContent).toContain("2 s");
    await vi.advanceTimersByTimeAsync(2000); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-countdown")!.textContent).toBe("Waiting for the next control update");
    expect(vi.getTimerCount()).toBe(0);
    expect(subscribe).toHaveBeenCalledOnce();
    receive(status()); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-countdown")).toBeNull();
  });
  it.each(["close", "disconnect", "remove", "cancel"])("disposes the display countdown on %s", async action => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-25T10:00:00Z"));
    const { element, receive, listeners } = await setup();
    receive({ ...status(), status: "on_delay", pending_until: "2026-10-25T10:00:30Z" });
    await element.updateComplete; expect(vi.getTimerCount()).toBe(1);
    if (action === "close") element.shadowRoot!.querySelector<HTMLDialogElement>("dialog")!.close();
    else if (action === "disconnect") listeners.get("disconnected")!();
    else if (action === "remove") element.remove();
    else receive({ ...status(), status: "idle", demand: false });
    await element.updateComplete;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("shows the external-off pause without inventing active room demand", async () => {
    const { element, receive } = await setup();
    const value = status(); value.status = "suspended"; value.suspension_reason = "external_off"; value.output_state = "off";
    Object.assign(value.zones!["climate.room"], { demand: null, reason: "suspended" });
    receive(value); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-control")!.textContent).toContain("switched off outside Velair");
    expect(element.shadowRoot!.querySelectorAll(".live-summary dd")[1].textContent).toBe("Unknown");
    expect(element.shadowRoot!.querySelector(".live-marker")).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".live-demand")).toBeNull();
  });
  it.each([undefined, "imported" as const])("does not attribute a %s suspension to an external switch-off", async suspension_reason => {
    const { element, receive } = await setup();
    receive({ ...status(), status: "suspended", suspension_reason }); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-control")!.textContent).toContain("Automatic supply control is paused.");
    expect(element.shadowRoot!.querySelector(".live-control")!.textContent).not.toContain("switched off outside");
  });
  it.each([false, true])("shows canonical backend readings and thresholds for cooling=%s", async cool => {
    const { element, receive, subscribe } = await setup();
    element.supply = { ...saved(), direction: cool ? "cool" : "heat" };
    receive(status(cool)); await element.updateComplete;
    expect(subscribe.mock.calls[0][1]).toEqual({ type: "velair/subscribe_shared_demand" });
    const text = element.shadowRoot!.querySelector("dialog")!.textContent!;
    expect(text).toContain(cool ? "25 °C" : "20.5 °C");
    expect(text).toContain(cool ? "24.3 °C" : "20.7 °C");
    expect(text).toContain("Room Assist");
    expect(text).toContain("Reference: sensor.room");
    expect(element.shadowRoot!.querySelector(".live-reason")).toBeNull();
    expect(element.shadowRoot!.querySelector(".live-marker")).not.toBeNull();
  });
  it.each([
    { cool: false, current: 19, start: 20, stop: 22, labels: ["Lower limit", "Stops at"] },
    { cool: false, current: 21, start: 20, stop: 22, labels: ["Restarts at", "Stops at"] },
    { cool: true, current: 25, start: 24, stop: 22, labels: ["Stops at", "Upper limit"] },
    { cool: true, current: 23, start: 24, stop: 22, labels: ["Stops at", "Restarts at"] },
  ])("draws only the committed active request and contextual limits: $cool / $current", async ({ cool, current, start, stop, labels }) => {
    const { element, receive } = await setup();
    element.supply = { ...saved(), direction: cool ? "cool" : "heat" };
    const value = status(cool);
    Object.assign(value.zones!["climate.room"], { temperature: current, start_temperature: start, stop_temperature: stop });
    receive(value); await element.updateComplete;
    const root = element.shadowRoot!;
    const arrow = root.querySelector<HTMLElement>(".live-track > .live-demand")!;
    expect(arrow).not.toBeNull();
    expect(parseFloat(arrow.style.width)).toBeGreaterThan(0);
    const point = parseFloat(root.querySelector<HTMLElement>(".live-marker")!.style.left);
    const activeLimit = root.querySelector<HTMLElement>(".live-boundary.limit-primary")!;
    const endpoint = parseFloat(activeLimit.style.left);
    expect(parseFloat(arrow.style.left)).toBeCloseTo(Math.min(point, endpoint));
    expect(parseFloat(arrow.style.width)).toBeCloseTo(Math.abs(point - endpoint));
    expect([...root.querySelectorAll(".live-threshold:not(.live-reading) > small")].map(node => node.textContent)).toEqual(labels);
    expect(root.querySelector(".live-threshold.limit-primary > small")!.textContent).toBe("Stops at");
    expect(root.querySelector(`.live-room.${cool ? "cool" : "heat"}.is-requesting`)).not.toBeNull();
    expect(root.querySelector(".legend-band")).not.toBeNull();
    expect(root.querySelector(".legend-demand")!.parentElement!.textContent).toBe("Active request");
  });
  it.each([false, true])("keeps idle or unknown demand neutral for cooling=%s", async cool => {
    const { element, receive } = await setup();
    element.supply = { ...saved(), direction: cool ? "cool" : "heat" };
    const value = status(cool);
    value.zones!["climate.room"].demand = false;
    receive(value); await element.updateComplete;
    const root = element.shadowRoot!;
    expect(root.querySelector(".live-track > .live-demand")).toBeNull();
    expect(root.querySelector(".is-requesting")).toBeNull();
    expect(root.querySelector(".live-threshold.limit-primary > small")!.textContent).toBe("Starts at");
    expect(root.querySelector(".live-band")).not.toBeNull();
    value.zones!["climate.room"].demand = null;
    receive({ ...value }); await element.updateComplete;
    expect(root.querySelector(".live-track > .live-demand")).toBeNull();
    expect(root.querySelector(".limit-primary")).toBeNull();
    expect([...root.querySelectorAll(".live-threshold:not(.live-reading) > small")].map(node => node.textContent)).toEqual(["Lower limit", "Upper limit"]);
  });
  it.each([false, true])("does not reverse a committed request beyond Stop for cooling=%s", async cool => {
    const { element, receive } = await setup();
    element.supply = { ...saved(), direction: cool ? "cool" : "heat" };
    const value = status(cool);
    value.zones!["climate.room"].temperature = cool ? 23 : 22;
    receive(value); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-track > .live-demand")).toBeNull();
    expect(element.shadowRoot!.querySelector(".live-room.is-requesting")).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".live-threshold.limit-primary > small")!.textContent).toBe("Stops at");
  });
  it.each([true, false, null])("collapses coincident limits without fabricating a retained band: %s", async demand => {
    const { element, receive } = await setup();
    const value = status(); Object.assign(value.zones!["climate.room"], { start_temperature: 21, stop_temperature: 21, demand });
    receive(value); await element.updateComplete;
    const limits = element.shadowRoot!.querySelectorAll(".live-threshold:not(.live-reading)");
    expect(limits).toHaveLength(1);
    expect(limits[0].querySelector("small")!.textContent).toBe(demand === true ? "Stops at" : demand === false ? "Starts at" : "Switching threshold");
    expect(element.shadowRoot!.querySelector<HTMLElement>(".live-band")!.style.width).toBe("0%");
  });
  it("uses a neutral switching threshold for unknown cooling demand", async () => {
    const { element, receive } = await setup();
    element.supply = { ...saved(), direction: "cool" };
    const value = status(true);
    Object.assign(value.zones!["climate.room"], { start_temperature: 24.5, stop_temperature: 24.5, demand: null });
    receive(value); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-threshold:not(.live-reading) small")!.textContent).toBe("Switching threshold");
    expect(element.shadowRoot!.querySelector(".limit-primary")).toBeNull();
    expect(element.shadowRoot!.querySelector(".live-demand")).toBeNull();
  });
  it("retains collision slots for tiny gaps and confines the request to the normal track", async () => {
    const { element, receive } = await setup();
    const value = status(); Object.assign(value.zones!["climate.room"], { temperature: 20.999, start_temperature: 20.998, stop_temperature: 21, target: 21 });
    receive(value); await element.updateComplete;
    const root = element.shadowRoot!;
    expect(root.querySelector(".live-axis.staggered.limits-tight.readings-tight")).not.toBeNull();
    expect(root.querySelector(".live-threshold.lower")).not.toBeNull();
    const arrow = root.querySelector<HTMLElement>(".live-track > .live-demand")!;
    expect(parseFloat(arrow.style.width)).toBeGreaterThan(0);
    expect(parseFloat(arrow.style.width)).toBeLessThan(1);
    const css = VelairSharedDemandLive.styles.map(style => style.toString()).join(" ");
    expect(css).toContain("repeating-linear-gradient");
    expect(css).toContain("width: min(6px, 100%)");
    expect(css).toContain("top: 5px; height: 2px");
  });
  it("unsubscribes after close even when subscription resolves late and ignores late data", async () => {
    let resolve!: (unsubscribe: () => void) => void;
    const pending = new Promise<() => void>(done => { resolve = done; });
    const { element, receive, trigger } = await setup(pending);
    element.shadowRoot!.querySelector<HTMLDialogElement>("dialog")!.close(); await element.updateComplete;
    const unsubscribe = vi.fn(); resolve(unsubscribe); await pending; await Promise.resolve();
    receive(status()); await element.updateComplete;
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(element.shadowRoot!.querySelector(".live-room")).toBeNull();
    expect(element.shadowRoot!.activeElement).toBe(trigger);
  });
  it("disposes and reconnects without displaying stale readings as live", async () => {
    const { element, receive, listeners, subscribe, unsubscribe } = await setup();
    receive(status()); await element.updateComplete;
    listeners.get("disconnected")!(); await element.updateComplete; await Promise.resolve();
    expect(element.shadowRoot!.querySelector("dialog")!.textContent).toContain("Disconnected.");
    expect(element.shadowRoot!.querySelector(".live-room")).toBeNull();
    expect(unsubscribe).toHaveBeenCalledOnce();
    listeners.get("ready")!(); await element.updateComplete;
    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(element.shadowRoot!.querySelector("dialog")!.textContent).toContain("Connecting");
    element.remove(); await Promise.resolve();
    expect(listeners.size).toBe(0);
  });
  it("shows unavailable snapshots and missing thresholds without a fabricated graph", async () => {
    const { element, receive, unavailable } = await setup();
    receive({ status: "disabled", zones: {} }); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-marker")).toBeNull();
    expect(element.shadowRoot!.querySelector("dialog")!.textContent).toContain("Automatic supply control is disabled;");
    unavailable(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector("dialog")!.textContent).toContain("Live data is unavailable.");
    expect(element.shadowRoot!.querySelector("dialog")!.textContent).not.toContain("Live updates");
  });
  it("shows coincident Room Assist range thresholds truthfully", async () => {
    const { element, receive } = await setup();
    const value = status(); value.zones!["climate.room"].start_temperature = 21;
    receive(value); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-help")!.textContent).toContain("one switching boundary");
    expect(element.shadowRoot!.querySelector(".live-band")!.getAttribute("style")).toContain("width:0%");
    expect(element.shadowRoot!.querySelectorAll(".live-threshold:not(.live-reading)")).toHaveLength(1);
    expect(element.shadowRoot!.querySelectorAll(".live-boundary")).toHaveLength(1);
    expect(element.shadowRoot!.querySelector(".live-target")).toBeNull();
  });
  it("places only useful threshold temperatures on the axis when Room Assist has a distant target", async () => {
    const { element, receive } = await setup();
    const value = status();
    Object.assign(value.zones!["climate.room"], { temperature: 19.4, target: 28, start_temperature: 27, stop_temperature: 29 });
    receive(value); await element.updateComplete;
    const labels = [...element.shadowRoot!.querySelectorAll<HTMLElement>(".live-threshold:not(.live-reading)")];
    expect(labels.map(label => label.querySelector("strong")!.textContent)).toEqual(["27 °C", "29 °C"]);
    expect(parseFloat(labels[0].style.left)).toBeLessThan(parseFloat(labels[1].style.left));
    expect(labels[1].classList.contains("lower")).toBe(true);
    expect(element.shadowRoot!.querySelector(".live-connectors")).toBeNull();
    expect(element.shadowRoot!.querySelectorAll(".live-target")).toHaveLength(1);
    expect(element.shadowRoot!.querySelector(".live-reading.current")!.textContent).toContain("19.4 °C");
  });
  it("orders cooling stop/start labels and combines target ticks that coincide with a threshold", async () => {
    const { element, receive } = await setup();
    element.supply = { ...saved(), direction: "cool" };
    receive(status(true)); await element.updateComplete;
    expect([...element.shadowRoot!.querySelectorAll(".live-threshold:not(.live-reading) > small")].map(label => label.textContent)).toEqual(["Stops at", "Upper limit"]);
    expect([...element.shadowRoot!.querySelectorAll(".live-threshold:not(.live-reading) > strong")].map(label => label.textContent)).toEqual(["24 °C", "24.3 °C"]);
    expect(element.shadowRoot!.querySelector(".live-target")).toBeNull();
  });
  it("presents switch state and confirmed requesting rooms as separate summary facts", async () => {
    const { element, receive } = await setup();
    element.supply = { ...saved(), zones: { "climate.room": {}, "climate.other": {} } };
    const value = status();
    value.zones!["climate.other"] = { demand: null, reason: "unavailable" };
    receive(value); await element.updateComplete;
    expect(element.shadowRoot!.querySelector("h2")!.textContent).toBe("Live status");
    expect(element.shadowRoot!.querySelector(".live-subtitle")!.textContent).toContain("Boiler");
    expect([...element.shadowRoot!.querySelectorAll(".live-summary dd")].map(fact => fact.textContent)).toEqual(["On", "1 of 2 · 1 unknown"]);
    expect(element.shadowRoot!.querySelector(".live-meta.is-live .live-dot")).not.toBeNull();
    receive({ ...value, status: "minimum_off", output_state: "off" }); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-control")!.textContent).toContain("Waiting to restart");
    expect(element.shadowRoot!.querySelector(".live-summary dd")!.textContent).toBe("Off");
  });
  it("centres Current and Target on their own markers and keeps idle hysteresis neutral", async () => {
    const { element, receive } = await setup();
    const value = status();
    Object.assign(value.zones!["climate.room"], { temperature: 19.4, target: 17, start_temperature: 16, stop_temperature: 18, demand: false });
    receive(value); await element.updateComplete;
    const root = element.shadowRoot!;
    expect((root.querySelector(".live-reading.current") as HTMLElement).style.left).toBe((root.querySelector(".live-marker") as HTMLElement).style.left);
    expect((root.querySelector(".live-reading.target") as HTMLElement).style.left).toBe((root.querySelector(".live-target") as HTMLElement).style.left);
    expect(root.querySelector(".live-demand")).toBeNull();
    const band = root.querySelector(".live-band") as HTMLElement;
    expect(parseFloat(band.style.left)).toBeGreaterThan(0);
    expect(parseFloat(band.style.width)).toBeGreaterThan(0);
    expect([...root.querySelectorAll(".live-distance")].map(node => node.getAttribute("aria-label"))).toEqual(["1 °C below target", "1 °C above target"]);
    expect([...root.querySelectorAll(".live-distance")].map(node => node.textContent)).toEqual(["Target -1 °C", "Target +1 °C"]);
  });
  it("explains why Room Assist limits differ from inactive supply hysteresis", async () => {
    const { element, receive } = await setup();
    element.supply = { ...saved(), hysteresis: .2 };
    element.supplyTemperatureUnit = "°C";
    const value = status();
    Object.assign(value.zones!["climate.room"], { temperature: 19.4, target: 17, start_temperature: 16, stop_temperature: 18 });
    receive(value); await element.updateComplete;
    const help = element.shadowRoot!.querySelector<HTMLDetailsElement>(".live-help")!;
    expect(help.open).toBe(false);
    expect(help.querySelector("summary")!.textContent).toContain("Why isn't my 0.2 °C hysteresis used?");
    help.querySelector("summary")!.click();
    expect(help.open).toBe(true);
    const text = help.textContent!;
    expect(text).toContain("Supply control hysteresis is not applied");
    expect(text).toContain("Inactive supply settings: start 0.2 °C; stop 0 °C");
    expect(element.shadowRoot!.querySelector(".live-limits")).toBeNull();
    expect(element.shadowRoot!.querySelector(".live-reason")).toBeNull();
  });
  it("shows ordinary supply offsets without describing saved settings as inactive", async () => {
    const { element, receive } = await setup();
    const value = status();
    Object.assign(value.zones!["climate.room"], { source: "estimated", start_temperature: 20.8 });
    receive(value); await element.updateComplete;
    expect([...element.shadowRoot!.querySelectorAll(".live-distance")].map(node => node.getAttribute("aria-label"))).toEqual(["0.2 °C below target", "At target (0 °C)"]);
    expect(element.shadowRoot!.querySelector(".live-help")).toBeNull();
  });
  it("keeps native range offsets visible when the retained band has zero width", async () => {
    const { element, receive } = await setup();
    const value = status();
    Object.assign(value.zones!["climate.room"], { target: 20, start_temperature: 19.7, stop_temperature: 19.7 });
    receive(value); await element.updateComplete;
    const distances = [...element.shadowRoot!.querySelectorAll(".live-distance")].map(node => node.getAttribute("aria-label"));
    expect(distances).toEqual(["0.3 °C below target"]);
    expect(element.shadowRoot!.querySelector(".live-band")!.getAttribute("style")).toContain("width:0%");
  });
  it("uses the reported climate unit for offsets and the explicit settings unit for inactive values", async () => {
    const { element, receive } = await setup();
    element.supply = { ...saved(), hysteresis: .2 };
    element.supplyTemperatureUnit = "°C";
    const value = status();
    Object.assign(value.zones!["climate.room"], { temperature: 70, target: 71.6, start_temperature: 69.8, stop_temperature: 73.4, temperature_unit: "°F" });
    receive(value); await element.updateComplete;
    expect([...element.shadowRoot!.querySelectorAll(".live-distance")].map(node => node.getAttribute("aria-label"))).toEqual(["1.8 °F below target", "1.8 °F above target"]);
    expect(element.shadowRoot!.querySelector(".live-help")!.textContent).toContain("start 0.2 °C");
  });
  it("keeps an intentional help expansion during live updates and removes it when Room Assist releases control", async () => {
    const { element, receive } = await setup();
    receive(status()); await element.updateComplete;
    const help = element.shadowRoot!.querySelector<HTMLDetailsElement>(".live-help")!;
    help.querySelector("summary")!.click(); expect(help.open).toBe(true);
    const value = status(); value.zones!["climate.room"].temperature = 20.6;
    receive(value); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-help")).toBe(help);
    expect(help.open).toBe(true);
    help.querySelector("summary")!.click(); expect(help.open).toBe(false);
    receive({ ...value, zones: { ...value.zones, "climate.room": { ...value.zones!["climate.room"], source: "estimated" } } }); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-help")).toBeNull();
  });
  it("separates coincident Current and Target labels without moving either reading", async () => {
    const { element, receive } = await setup();
    const value = status(); value.zones!["climate.room"].temperature = 21;
    receive(value); await element.updateComplete;
    const root = element.shadowRoot!;
    expect((root.querySelector(".live-reading.current") as HTMLElement).style.left).toBe((root.querySelector(".live-reading.target") as HTMLElement).style.left);
    expect(root.querySelector(".live-axis.readings-staggered")).not.toBeNull();
    expect(root.querySelector(".live-reading.target.upper")).not.toBeNull();
  });
  it("releases the subscription when its saved supply is removed", async () => {
    const { element, unsubscribe, receive } = await setup();
    element.supply = undefined;
    await element.updateComplete; await Promise.resolve();
    receive(status()); await element.updateComplete;
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(element.shadowRoot!.querySelector("dialog")).toBeNull();
  });
  it("does not subscribe until opened and ignores previous subscription events after reopening", async () => {
    const { element, hass, host, subscribe, receive } = await setup();
    element.shadowRoot!.querySelector<HTMLDialogElement>("dialog")!.close(); await element.updateComplete;
    const idle = document.createElement("velair-shared-demand-live") as VelairSharedDemandLive;
    idle.host = host; idle.hass = hass; idle.supply = saved();
    document.body.append(idle); await idle.updateComplete;
    expect(subscribe).toHaveBeenCalledTimes(1);
    const oldReceive = subscribe.mock.calls[0][0];
    element.shadowRoot!.querySelector<HTMLButtonElement>("[data-live-trigger]")!.click(); await element.updateComplete;
    oldReceive({ loaded: true, shared_demand: { boiler: status() } }); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-room")).toBeNull();
    receive(status()); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".live-room")).not.toBeNull();
  });
  it("keeps the saved supply when the settings editor has an unsaved draft", async () => {
    const { host } = await setup();
    const element = document.createElement("velair-shared-demand-settings") as VelairSharedDemandSettings;
    element.host = host;
    element.data = { settings: { shared_demand_groups: [saved()] }, configured_entities: ["climate.room"], configuration_revision: 1, temperature_unit: "°C" } as unknown as ScheduleResponse;
    element.draft = { supplies: [{ ...saved(), name: "Draft", direction: "cool", zones: { "climate.other": {} } }], snapshot: JSON.stringify([saved()]), revision: 1, newSupplyIds: [], selectedSupplyId: "boiler" };
    document.body.append(element); await element.updateComplete;
    const live = element.shadowRoot!.querySelector("velair-shared-demand-live") as VelairSharedDemandLive;
    await live.updateComplete;
    expect(live.supply).toEqual(saved());
    expect(live.unsaved).toBe(true);
    expect(live.closest("fieldset")).toBeNull();
  });
  it("uses a one-column mobile layout and separate threshold labels", () => {
    const css = VelairSharedDemandLive.styles.map(style => style.toString()).join(" ");
    expect(css).toContain("@media (max-width: 560px)");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(css).toContain(".live-threshold");
  });
});
