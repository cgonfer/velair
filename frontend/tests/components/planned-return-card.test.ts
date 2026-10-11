// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/velair-card";
import type { VelairCard } from "../../src/velair/components/velair-card-element";
import type { PlannedReturnElement } from "../../src/velair/components/planned-return-element";
import type { HomeAssistant, ScheduleResponse } from "../../src/velair/types";
import { plannedReturnDraft } from "../../src/velair/domain/planned-return";
import { shouldUpdateForHass } from "../../src/velair/controllers/card-context";

const data = (state = "disabled") => ({
  configured_entities: [], zones: {}, settings: { first_weekday: "monday" },
  temperature_migration: { required: false }, temperature_unit: "°C",
  active_overrides: {}, templates: [], next_events: [], global: { mode: "auto" },
  planned_return: { ...plannedReturnDraft(), occupancy_entity_ids: ["binary_sensor.home"] },
  planned_return_status: { state, occupancy: "home", sources: [{ entity_id: "binary_sensor.home", state: "home" }], zones: [], can_start: true, return_at: null },
}) as unknown as ScheduleResponse;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
async function settle(card: VelairCard) { await new Promise((resolve) => setTimeout(resolve, 0)); await card.updateComplete; }
function connection() {
  const unsubscribe = vi.fn();
  let callback!: (message: unknown) => void;
  const subscribeMessage = vi.fn().mockImplementation((cb) => { callback = cb; return Promise.resolve(unsubscribe); });
  const sendMessagePromise = vi.fn().mockResolvedValue(data());
  return { unsubscribe, subscribeMessage, sendMessagePromise, push: (schedule: ScheduleResponse) => callback({ loaded: true, schedule }) };
}
function hass(conn: ReturnType<typeof connection>): HomeAssistant { return { connection: conn, states: {}, config: { time_zone: "Europe/Madrid" }, callService: vi.fn() }; }
function card(conn: ReturnType<typeof connection>) {
  const element = document.createElement("velair-card") as VelairCard;
  element.setConfig({ type: "custom:velair-card", view: "planned-return", entities: ["climate.hidden"] });
  element.hass = hass(conn); document.body.append(element); return element;
}
afterEach(() => document.body.replaceChildren());
describe("Planned Return dashboard card", () => {
  it("routes the actual card to shared runtime controls without configuration or thermostat filtering", async () => {
    const conn = connection(); const element = card(conn); await settle(element);
    const runtime = element.shadowRoot!.querySelector("velair-planned-return") as PlannedReturnElement;
    expect(runtime).not.toBeNull(); await runtime.updateComplete;
    expect(runtime.settings).toBe(false);
    expect(runtime.compact).toBe(true);
    expect(runtime.shadowRoot!.querySelector(".routine-status,.occupancy-panel,h3")).toBeNull();
    expect(runtime.shadowRoot!.querySelector(".compact-return-indicators")).not.toBeNull();
    expect(runtime.data?.planned_return?.occupancy_entity_ids).toEqual(["binary_sensor.home"]);
    expect(runtime.shadowRoot!.querySelector("form")).toBeNull();
    expect(runtime.shadowRoot!.querySelector(".start-return")).not.toBeNull();
    conn.push(data("armed")); await settle(element); await runtime.updateComplete;
    expect(runtime.data?.planned_return_status?.state).toBe("armed");
    expect(conn.subscribeMessage).toHaveBeenCalledTimes(1);
    element.hass = { ...element.hass! }; await settle(element);
    expect(conn.subscribeMessage).toHaveBeenCalledTimes(1);
    element.remove(); await settle(element); expect(conn.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("cleans up late subscriptions and ignores detached updates before reconnecting", async () => {
    const conn = connection(); const pending = deferred<() => void>();
    conn.subscribeMessage.mockImplementationOnce((cb) => { conn.push = (schedule) => cb({ loaded: true, schedule }); return pending.promise; });
    const element = card(conn); await settle(element); element.remove();
    conn.push(data("away")); pending.resolve(conn.unsubscribe); await Promise.resolve(); await Promise.resolve();
    expect(conn.unsubscribe).toHaveBeenCalledTimes(1);
    document.body.append(element); await settle(element);
    expect(conn.subscribeMessage).toHaveBeenCalledTimes(2);
    expect((element as any)._data.planned_return_status.state).toBe("disabled");
  });
  it("rejects stale loads and pushes from a replaced connection", async () => {
    const old = connection(); const pending = deferred<ScheduleResponse>(); old.sendMessagePromise.mockReturnValue(pending.promise);
    const element = card(old); await settle(element);
    const next = connection(); next.sendMessagePromise.mockResolvedValue(data("preparing"));
    element.hass = hass(next); await settle(element);
    old.push(data("away")); pending.resolve(data("cancelled")); await settle(element);
    expect((element as any)._data.planned_return_status.state).toBe("preparing");
    expect(old.unsubscribe).toHaveBeenCalledTimes(1); expect(next.subscribeMessage).toHaveBeenCalledTimes(1);
  });
  it("does not continue queued unit reloads or apply late load data after detachment", async () => {
    const conn = connection(); const pending = deferred<ScheduleResponse>(); conn.sendMessagePromise.mockReturnValue(pending.promise);
    const element = card(conn); await settle(element);
    (element as any)._temperatureUnitReloadPending = true;
    element.remove(); pending.resolve(data("away")); await settle(element);
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
    expect((element as any)._data).toBeUndefined();
  });
  it("exposes a localized editor option with no household thermostat filter", async () => {
    const editor = document.createElement("velair-card-editor") as any;
    editor.setConfig({ type: "custom:velair-card", view: "planned-return" });
    editor.hass = { ...hass(connection()), language: "es" }; document.body.append(editor); await editor.updateComplete;
    expect(editor.shadowRoot.querySelector('option[value="planned-return"]').textContent.trim()).toBe("Regreso a casa");
    expect(editor.shadowRoot.querySelector(".thermostat-filter-option")).toBeNull();
    expect(editor._showsThermostatOptions()).toBe(false);
  });
  it("updates source and room metadata and HA formatting even with no managed climates", () => {
    const conn = connection(); const old = hass(conn); const host = { _config: { view: "planned-return" as const }, _data: data() };
    expect(shouldUpdateForHass(host, { ...old, language: "es" }, old)).toBe(true);
    expect(shouldUpdateForHass(host, { ...old, config: { time_zone: "UTC" } }, old)).toBe(true);
    expect(shouldUpdateForHass(host, { ...old, states: { "binary_sensor.home": { state: "on", attributes: { friendly_name: "Home" } } } }, old)).toBe(true);
    expect(shouldUpdateForHass(host, { ...old }, old)).toBe(false);
    host._data.configured_entities = ["climate.room"];
    expect(shouldUpdateForHass(host, { ...old, states: { "climate.room": { attributes: { friendly_name: "Bedroom", icon: "mdi:bed" } } } }, old)).toBe(true);
  });
});
