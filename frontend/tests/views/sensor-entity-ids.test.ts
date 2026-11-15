// @vitest-environment jsdom
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VelairViewHost } from "../../src/velair/host-types";
import { VelairApiClient } from "../../src/velair/api/client";
import { renderMaintenanceSettings } from "../../src/velair/views/settings-view";
import { asSensorEntityIdsHost, resetSensorEntityIdsReview, previewSensorEntityIds, applySensorEntityIds, toggleSensorEntityId } from "../../src/velair/controllers/portability-actions";
import { en } from "../../src/velair/translations/en";

const row = (status: "ready" | "unchanged" | "conflict" = "ready") => ({ entity_id: `sensor.old_${status}`, proposed_entity_id: `sensor.velair_office_${status}`, climate_entity_id: "climate.office", sensor_key: status, name: "Office status", status });
function setup() {
  const preview = { preview_id: "p1", rows: [row(), row("unchanged"), row("conflict")] };
  const api = { previewSensorEntityIds: vi.fn().mockResolvedValue(preview), applySensorEntityIds: vi.fn().mockResolvedValue({ status: "applied", renamed: [{ old_entity_id: "sensor.old_ready", new_entity_id: "sensor.velair_office_ready" }], failed: [], preview: { preview_id: "p2", rows: [] } }) };
  const value = { hass: { user: { is_admin: true } }, _data: {}, _sensorIdsSelected: new Set<string>(), _api: () => api, _t: (key: string) => en[key as keyof typeof en] ?? key, _friendlyEntityName: () => "Office" } as unknown as VelairViewHost;
  const host = asSensorEntityIdsHost(value);
  value._previewSensorEntityIds = () => previewSensorEntityIds(host);
  value._applySensorEntityIds = () => applySensorEntityIds(host);
  value._toggleSensorEntityId = (id, checked) => toggleSensorEntityId(host, id, checked);
  const container = document.createElement("div"); document.body.append(container);
  const draw = () => render(renderMaintenanceSettings(value), container);
  draw();
  return { value, host, api, preview, container, draw };
}
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("sensor entity ID review", () => {
  it("uses an on-request native Maintenance dialog, hidden for non-admins", async () => {
    const { value, api, container, draw } = setup();
    expect(api.previewSensorEntityIds).not.toHaveBeenCalled();
    const dialog = container.querySelector("dialog")!;
    const show = vi.fn(() => dialog.setAttribute("open", "")); dialog.showModal = show;
    container.querySelector<HTMLButtonElement>("[data-dialog-trigger]")!.click();
    expect(show).toHaveBeenCalledOnce(); expect(api.previewSensorEntityIds).toHaveBeenCalledOnce();
    await Promise.resolve();
    dialog.dispatchEvent(new Event("close"));
    expect(document.activeElement).toBe(container.querySelector("[data-dialog-trigger]"));
    value.hass!.user!.is_admin = false; draw(); expect(container.querySelector("dialog")).toBeNull();
  });
  it("gives the review a separate contextual card using the community card presentation", () => {
    const { container } = setup();
    const card = container.querySelector(".settings-maintenance > .sensor-ids-maintenance-action")!;
    const trigger = card.querySelector<HTMLButtonElement>("[data-dialog-trigger]")!;
    expect(card.querySelector("strong")?.textContent).toBe(en.sensorIdsReview);
    expect(card.querySelector(`#${trigger.getAttribute("aria-describedby")}`)?.textContent).toBe(en.sensorIdsDescription);
    expect(trigger.getAttribute("aria-label")).toBe(en.sensorIdsReview);
    expect(trigger.classList.contains("help-community-link")).toBe(true);
    expect(card.classList.contains("help-community-link")).toBe(false);
    expect(card.querySelector(".inline-help")).toBeNull();
    expect(card.contains(container.querySelector(".maintenance-grid"))).toBe(false);
  });
  it("starts with no selection, prevents unavailable selection, and applies only explicit ready IDs", async () => {
    const { value, host, api, container, draw } = setup();
    await previewSensorEntityIds(host); draw();
    const boxes = [...container.querySelectorAll<HTMLInputElement>(".sensor-ids-row input")];
    expect(boxes.map(box => box.checked)).toEqual([false, false, false]);
    expect(boxes.map(box => box.disabled)).toEqual([false, true, true]);
    const comparison = container.querySelector(".sensor-ids-map")!;
    expect([...comparison.querySelectorAll("code")].map(code => code.textContent)).toEqual(["sensor.old_ready", "sensor.velair_office_ready"]);
    expect(comparison.querySelector(".sensor-ids-arrow")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent).toContain("automations, dashboards and templates");
    await applySensorEntityIds(host); expect(api.applySensorEntityIds).not.toHaveBeenCalled();
    toggleSensorEntityId(host, "sensor.old_conflict", true); expect(value._sensorIdsSelected.size).toBe(0);
    boxes[0].checked = true; boxes[0].dispatchEvent(new Event("change"));
    await applySensorEntityIds(host);
    expect(api.applySensorEntityIds).toHaveBeenCalledWith({ preview_id: "p1", entity_ids: ["sensor.old_ready"] });
    expect(value._sensorIdsSelected.size).toBe(0); expect(value._sensorIdsPreview?.preview_id).toBe("p2");
  });
  it("resets selection on refresh and rejects stale previews until freshly loaded", async () => {
    const { value, host, api } = setup(); await previewSensorEntityIds(host);
    toggleSensorEntityId(host, "sensor.old_ready", true); await previewSensorEntityIds(host);
    expect(value._sensorIdsSelected.size).toBe(0);
    toggleSensorEntityId(host, "sensor.old_ready", true);
    api.applySensorEntityIds.mockRejectedValue({ code: "sensor_entity_ids_stale", message: "Preview is stale" });
    await applySensorEntityIds(host);
    expect(value._sensorIdsPreview).toBeUndefined(); expect(value._sensorIdsSelected.size).toBe(0);
    expect(value._sensorIdsError).toContain("Preview is stale"); expect(value._sensorIdsError).toContain("Refresh");
    await applySensorEntityIds(host); expect(api.applySensorEntityIds).toHaveBeenCalledOnce();
  });
  it("guards closing, controls and duplicate requests while applying", async () => {
    const { value, host, api, container, draw } = setup(); await previewSensorEntityIds(host);
    toggleSensorEntityId(host, "sensor.old_ready", true);
    let finish!: (value: unknown) => void;
    api.applySensorEntityIds.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = applySensorEntityIds(host); draw();
    const dialog = container.querySelector("dialog")!; const close = vi.fn(); dialog.close = close;
    const event = new Event("cancel", { cancelable: true }); dialog.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    expect([...dialog.querySelectorAll<HTMLButtonElement>("button")].every(button => button.disabled)).toBe(true);
    dialog.dispatchEvent(new MouseEvent("click", { clientX: -10 })); expect(close).not.toHaveBeenCalled();
    await applySensorEntityIds(host); expect(api.applySensorEntityIds).toHaveBeenCalledOnce();
    finish({ status: "applied", renamed: [], failed: [], preview: { preview_id: "p2", rows: [] } }); await pending;
    expect(value._sensorIdsAction).toBeUndefined();
  });
  it.each(["rolled_back", "recovery_required"] as const)("reports %s and actual remaining mappings", async status => {
    const { host, api, container, draw } = setup(); await previewSensorEntityIds(host); toggleSensorEntityId(host, "sensor.old_ready", true);
    api.applySensorEntityIds.mockResolvedValue({ status, renamed: status === "recovery_required" ? [{ old_entity_id: "sensor.old_ready", new_entity_id: "sensor.remaining" }] : [], failed: [{ entity_id: "sensor.failed", message: "Rename failed", code: "rename_failed" }], preview: { preview_id: "p2", rows: [] } });
    await applySensorEntityIds(host); draw(); expect(container.querySelector('[role="alert"]')?.textContent).toContain(status === "rolled_back" ? "rolled back" : "could not be rolled back");
    expect(container.textContent).toContain("Rename failed"); expect(container.textContent?.includes("sensor.remaining")).toBe(status === "recovery_required");
    if (status === "recovery_required") expect(container.querySelector('section[role="alert"] .sensor-ids-map')).not.toBeNull();
    expect(container.textContent).toContain("There are no existing Velair");
  });
  it("ignores a deferred response after disconnect or connection replacement", async () => {
    const { value, host, api } = setup();
    let finish!: (value: unknown) => void;
    api.previewSensorEntityIds.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = previewSensorEntityIds(host);
    resetSensorEntityIdsReview(host);
    value.hass = { user: { is_admin: true }, connection: {} } as never;
    finish({ preview_id: "old", rows: [row()] }); await pending;
    expect(value._sensorIdsPreview).toBeUndefined(); expect(value._sensorIdsAction).toBeUndefined();
    expect(value._sensorIdsSelected.size).toBe(0);
  });
  it("permits idle Escape/backdrop close and includes selected inputs in keyboard trapping", async () => {
    const { host, container, draw } = setup(); await previewSensorEntityIds(host); draw();
    const dialog = container.querySelector("dialog")!;
    const close = vi.fn(); dialog.close = close;
    const cancel = new Event("cancel", { cancelable: true }); dialog.dispatchEvent(cancel); expect(cancel.defaultPrevented).toBe(false);
    dialog.dispatchEvent(new MouseEvent("click", { clientX: -10 })); expect(close).toHaveBeenCalledOnce();
    const buttons = dialog.querySelectorAll<HTMLButtonElement>("button");
    const first = buttons[0]; const last = [...buttons].filter(button => !button.disabled).at(-1)!;
    last.focus(); last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
  });
  it("sends only the agreed preview and apply payloads", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({});
    const client = new VelairApiClient({ connection: { sendMessagePromise } } as never);
    await client.previewSensorEntityIds(); await client.applySensorEntityIds({ preview_id: "p1", entity_ids: ["sensor.old"] });
    expect(sendMessagePromise.mock.calls).toEqual([[{ type: "velair/preview_sensor_entity_ids" }], [{ type: "velair/apply_sensor_entity_ids", preview_id: "p1", entity_ids: ["sensor.old"] }]]);
  });
});
