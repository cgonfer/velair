// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/velair/components/room-sensor-schedule-element";
import type { VelairRoomSensorSchedule } from "../../src/velair/components/room-sensor-schedule-element";
import { preconditioningSettings } from "../../src/velair/domain/preconditioning";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { RoomSensorSchedule, RoomSensorScheduleDetail } from "../../src/velair/types";

function summary(value: RoomSensorSchedule) {
  return { enabled: value.enabled, default_source: value.default_source, period_count: value.periods.length };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function flush(element: VelairRoomSensorSchedule) {
  for (let count = 0; count < 5; count++) { await Promise.resolve(); await element.updateComplete; }
}

async function setup(schedule?: RoomSensorSchedule, fixedSource: string | null = "sensor.office") {
  let persisted = schedule ? structuredClone(schedule) : null;
  const settings = preconditioningSettings({ room_temperature_entity_id: fixedSource,
    room_sensor_assist_enabled: true, ...(schedule ? { room_sensor_schedule: summary(schedule) } : {}) });
  const read = vi.fn(async (request: { entity_id: string }): Promise<RoomSensorScheduleDetail> => ({
    entity_id: request.entity_id, room_sensor_schedule: persisted ? structuredClone(persisted) : null,
  }));
  const save = vi.fn(async (_entity: string, update: Partial<typeof settings>) => {
    if (update.room_sensor_schedule && "periods" in update.room_sensor_schedule) {
      persisted = structuredClone(update.room_sensor_schedule);
      settings.room_sensor_schedule = summary(persisted);
    }
    if ("room_temperature_entity_id" in update) settings.room_temperature_entity_id = update.room_temperature_entity_id ?? null;
    if ("room_sensor_assist_enabled" in update) settings.room_sensor_assist_enabled = Boolean(update.room_sensor_assist_enabled);
  });
  const host = {
    _data: { zones: { "climate.room": { preconditioning: settings } } },
    hass: { connection: { sendMessagePromise: read }, states: { "sensor.office": { state: "20", attributes: { device_class: "temperature", friendly_name: "Office", unit_of_measurement: "°C" } } } },
    _t: (key: string, values?: Record<string, string | number>) => `${key}${values ? JSON.stringify(values) : ""}`,
    _weekdayName: (day: string) => day,
    _friendlyEntityName: (id: string) => id === "sensor.office" ? "Office" : id,
    _formatDateTime: (time: string) => time,
    _saveZonePreconditioning: save,
  } as unknown as VelairViewHost;
  const element = document.createElement("velair-room-sensor-schedule") as VelairRoomSensorSchedule;
  element.host = host; element.entityId = "climate.room"; element.settings = settings;
  document.body.append(element); await flush(element);
  const click = async (action: string) => {
    element.shadowRoot!.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();
    await flush(element);
  };
  const enabled = async (value = true) => click(value ? "mode-schedule" : "mode-fixed");
  const fixed = async (value: string) => {
    const select = element.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="fixed-source"]')!;
    select.value = value; select.dispatchEvent(new Event("change")); await flush(element);
  };
  return { element, settings, host, save, read, click, enabled, fixed, setDetail: (value: RoomSensorSchedule | null) => { persisted = value ? structuredClone(value) : null; } };
}

afterEach(() => { document.body.replaceChildren(); });

describe("Room Assist reference mode editor", () => {
  const calendar = (enabled = true): RoomSensorSchedule => ({ enabled, default_source: null,
    periods: [{ weekdays: ["monday"], start: "08:00", end: "17:00", source: "sensor.office" }] });

  it("shows only the fixed source without loading a calendar or adding switches", async () => {
    const { element, read, save } = await setup();
    expect(element.shadowRoot!.querySelector("ha-switch")).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-field="fixed-source"]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".schedule-fields")).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-action="mode-fixed"]')!.getAttribute("aria-pressed")).toBe("true");
    expect(element.shadowRoot!.querySelector('[data-action="save-schedule"]')).toBeNull();
    expect(read).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
  });
  it("keeps ordinary fixed selection and clearing immediate", async () => {
    const { fixed, save, read } = await setup();
    await fixed("");
    expect(save).toHaveBeenLastCalledWith("climate.room", { room_temperature_entity_id: null, room_sensor_assist_enabled: false });
    await fixed("sensor.office");
    expect(save).toHaveBeenLastCalledWith("climate.room", { room_temperature_entity_id: "sensor.office" });
    expect(read).not.toHaveBeenCalled();
  });
  it("loads the saved active calendar and displays only its fields even with the master off", async () => {
    const { element, settings, read } = await setup(calendar());
    settings.room_sensor_assist_enabled = false; element.requestUpdate(); await flush(element);
    expect(read).toHaveBeenCalledOnce();
    expect(element.shadowRoot!.querySelector(".schedule-fields")).not.toBeNull();
    expect(element.shadowRoot!.querySelector('[data-field="fixed-source"]')).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-action="mode-schedule"]')!.getAttribute("aria-pressed")).toBe("true");
  });
  it("preserves both detached configurations while switching modes and cancels without saving", async () => {
    const { element, settings, read, save, enabled, fixed, click } = await setup(calendar(false));
    await enabled();
    const start = element.shadowRoot!.querySelector<HTMLInputElement>('input[type="time"]')!;
    start.value = "09:00"; start.dispatchEvent(new Event("input")); await flush(element);
    await enabled(false); await fixed(""); await enabled();
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('input[type="time"]')!.value).toBe("09:00");
    await enabled(false);
    expect(element.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="fixed-source"]')!.value).toBe("");
    expect(read).toHaveBeenCalledOnce(); expect(save).not.toHaveBeenCalled();
    await click("cancel-schedule");
    expect(element.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="fixed-source"]')!.value).toBe("sensor.office");
    expect(settings.room_sensor_schedule?.enabled).toBe(false);
    expect(settings.room_temperature_entity_id).toBe("sensor.office");
  });
  it("saves the selected schedule without changing the fixed source or master", async () => {
    const { element, save, settings, enabled, click } = await setup();
    await enabled(); await click("add-period"); await click("save-schedule");
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][1]).toEqual({ room_sensor_schedule: { enabled: true, default_source: "sensor.office", periods: [{
      weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"], start: "08:00", end: "17:00", source: "sensor.office",
    }] } });
    expect(settings.room_temperature_entity_id).toBe("sensor.office");
    expect(settings.room_sensor_assist_enabled).toBe(true);
    expect(element.shadowRoot!.querySelector(".schedule-fields")).not.toBeNull();
  });
  it("saves a fixed-mode change while preserving valid edited calendar periods", async () => {
    const { element, save, settings, enabled, click } = await setup(calendar());
    const start = element.shadowRoot!.querySelector<HTMLInputElement>('input[type="time"]')!;
    start.value = "09:00"; start.dispatchEvent(new Event("input")); await flush(element);
    await enabled(false); await click("save-schedule");
    expect(save).toHaveBeenCalledWith("climate.room", { room_sensor_schedule: { ...calendar(false), periods: [{ ...calendar().periods[0], start: "09:00" }] } });
    expect(settings.room_temperature_entity_id).toBe("sensor.office");
    expect(element.shadowRoot!.querySelector('[data-field="fixed-source"]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".schedule-fields")).toBeNull();
  });
  it("commits a pending fixed source and disables assistance if it is cleared", async () => {
    const { save, enabled, fixed, click, settings } = await setup(calendar());
    await enabled(false); await fixed("");
    expect(save).not.toHaveBeenCalled();
    await click("save-schedule");
    expect(save).toHaveBeenCalledWith("climate.room", { room_sensor_schedule: calendar(false), room_temperature_entity_id: null, room_sensor_assist_enabled: false });
    expect(settings.room_sensor_assist_enabled).toBe(false);
  });
  it("disables assistance when switching to a saved empty fixed source", async () => {
    const { save, enabled, click } = await setup(calendar(), null);
    await enabled(false); await click("save-schedule");
    expect(save).toHaveBeenCalledWith("climate.room", { room_sensor_schedule: calendar(false), room_sensor_assist_enabled: false });
  });
  it("rejects overlapping periods and recovers after deletion", async () => {
    const { element, enabled, click, save } = await setup();
    await enabled(); await click("add-period"); await click("add-period");
    expect(element.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe("roomSensorScheduleOverlap");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save-schedule"]')!.disabled).toBe(true);
    expect(save).not.toHaveBeenCalled(); await click("remove-period");
    expect(element.shadowRoot!.querySelector('[role="alert"]')).toBeNull();
  });
  it("retains invalid hidden calendar edits for recovery but saves the last valid calendar in fixed mode", async () => {
    const { element, enabled, click, save } = await setup(calendar());
    await click("add-period"); await click("add-period");
    await enabled(false); await enabled();
    expect(element.shadowRoot!.querySelectorAll("[data-period]")).toHaveLength(3);
    expect(element.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull();
    await enabled(false); await click("save-schedule");
    expect(save).toHaveBeenCalledWith("climate.room", { room_sensor_schedule: calendar(false) });
  });
  it("uses shared add/delete actions, visible default guidance and Cancel before Save", async () => {
    const { element, enabled, click } = await setup();
    await enabled(); await click("add-period");
    expect(element.shadowRoot!.querySelector('[data-action="add-period"]')!.classList.contains("draft-add-button")).toBe(true);
    expect(element.shadowRoot!.querySelector('[data-action="remove-period"]')!.querySelector("ha-icon")!.getAttribute("icon")).toBe("mdi:trash-can");
    expect([...element.shadowRoot!.querySelectorAll(".footer button")].map(button => button.getAttribute("data-action"))).toEqual(["cancel-schedule", "save-schedule"]);
    expect(element.shadowRoot!.querySelector("#schedule-default-description")!.textContent).toBe("roomSensorScheduleOutsideHelp");
    expect(element.shadowRoot!.querySelector("#schedule-default-source")!.getAttribute("aria-describedby")).toBe("schedule-default-description");
    expect(element.shadowRoot!.querySelector("#room-sensor-default-help-trigger")).toBeNull();
    await enabled(false);
    expect(element.shadowRoot!.querySelector("#schedule-default-description")).toBeNull();
  });
  it("retains drafts if the host catches a failed write", async () => {
    const { element, save, enabled, click } = await setup();
    save.mockImplementation(async () => {});
    await enabled(); await click("add-period"); await click("save-schedule");
    expect(element.shadowRoot!.querySelector("[data-period]")).not.toBeNull();
    expect(element.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe("roomSensorScheduleVerificationError");
  });
  it("retains drafts when readback fails after a successful write", async () => {
    const { element, read, enabled, click } = await setup();
    await enabled(); await click("add-period"); read.mockRejectedValueOnce(new Error("Offline"));
    await click("save-schedule");
    expect(element.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe("roomSensorScheduleVerificationError");
    expect(element.shadowRoot!.querySelector("[data-period]")).not.toBeNull();
  });
  it("does not erase unknown periods after a failed or incomplete detail load", async () => {
    const { element, read, save, enabled, click } = await setup();
    read.mockRejectedValueOnce(new Error("Offline")); await enabled();
    expect(element.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe("roomSensorScheduleLoadError");
    expect(element.shadowRoot!.querySelector('[data-action="save-schedule"]')).toBeNull();
    read.mockResolvedValueOnce({ entity_id: "climate.room", room_sensor_schedule: { enabled: true, default_source: null, period_count: 80 } } as unknown as RoomSensorScheduleDetail);
    await click("retry-schedule");
    expect(element.shadowRoot!.querySelector('[data-action="save-schedule"]')).toBeNull(); expect(save).not.toHaveBeenCalled();
  });
  it("refreshes same-summary external edits after cancel and reselect", async () => {
    const { element, setDetail, enabled, click } = await setup(calendar(false));
    await enabled(); await click("cancel-schedule");
    setDetail({ ...calendar(false), periods: [{ ...calendar().periods[0], start: "09:00" }] });
    await enabled();
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('input[type="time"]')!.value).toBe("09:00");
  });
  it("retains detached drafts across live summary rerenders", async () => {
    const { element, read, enabled, click } = await setup();
    await enabled(); await click("add-period");
    element.settings = { ...element.settings!, room_sensor_schedule: { enabled: false, default_source: null, period_count: 70 } }; await flush(element);
    expect(element.shadowRoot!.querySelectorAll("[data-period]")).toHaveLength(1); expect(read).toHaveBeenCalledOnce();
  });
  it.each(["cancel", "disconnect", "entity"])("fences a pending detail after %s", async action => {
    const { element, read, enabled, click } = await setup();
    const pending = deferred<RoomSensorScheduleDetail>(); read.mockReturnValueOnce(pending.promise); await enabled();
    if (action === "cancel") await click("cancel-schedule");
    else if (action === "disconnect") element.remove();
    else { element.entityId = "climate.other"; await flush(element); }
    pending.resolve({ entity_id: "climate.room", room_sensor_schedule: calendar() });
    if (action === "disconnect") document.body.append(element);
    await flush(element);
    expect(element.shadowRoot!.querySelector('[data-action="save-schedule"]')).toBeNull();
    expect(element.shadowRoot!.querySelector('[role="alert"]')).toBeNull();
  });
  it("fences pending verification after changing entity", async () => {
    const { element, read, enabled, click } = await setup();
    await enabled(); await click("add-period");
    const pending = deferred<RoomSensorScheduleDetail>(); read.mockReturnValueOnce(pending.promise); await click("save-schedule");
    element.entityId = "climate.other"; await flush(element);
    pending.reject(new Error("Old zone offline")); await flush(element);
    expect(element.shadowRoot!.querySelector('[role="alert"]')).toBeNull();
  });
  it("does not mutate backend detail responses while editing", async () => {
    const { element, read, enabled, click } = await setup();
    const detail = { entity_id: "climate.room", room_sensor_schedule: calendar(false) }; read.mockResolvedValueOnce(detail);
    await enabled(); await click("add-period");
    expect(detail.room_sensor_schedule.periods).toHaveLength(1);
    expect(element.shadowRoot!.querySelectorAll("[data-period]")).toHaveLength(2);
  });
  it("ignores mode and fixed changes when disabled", async () => {
    const { element, enabled, fixed, save, read } = await setup();
    element.disabled = true; await flush(element); await enabled(); await fixed("");
    expect(save).not.toHaveBeenCalled(); expect(read).not.toHaveBeenCalled();
  });
  it("shows native and next references read-only without adding mode controls", async () => {
    const { element } = await setup(); element.showEditor = false;
    element.settings = { ...element.settings!, room_sensor_schedule: { enabled: true, default_source: null, period_count: 0 } };
    element.runtime = { enabled: true, configured: true, status: "idle", reason: "native_reference", room_sensor_schedule: { enabled: true, effective_source: null, next_change: "2026-05-19T08:00:00Z", next_source: "sensor.office" } };
    await flush(element);
    expect(element.shadowRoot!.querySelector(".status")!.textContent).toContain("roomSensorScheduleNative");
    expect(element.shadowRoot!.textContent).toContain("Office"); expect(element.shadowRoot!.querySelector("button")).toBeNull();
  });
  it("explains unavailable scheduled sensors in read-only status", async () => {
    const { element } = await setup(); element.showEditor = false;
    element.settings = { ...element.settings!, room_sensor_schedule: { enabled: true, default_source: "sensor.office", period_count: 0 } };
    element.runtime = { enabled: true, configured: true, status: "unavailable", reason: "room_sensor_unavailable", room_sensor_schedule: { enabled: true, effective_source: "sensor.office", next_change: null, next_source: null } };
    await flush(element);
    expect(element.shadowRoot!.textContent).toContain("roomSensorScheduleUnavailable");
  });
  it("loads a saved active calendar after initially disabled controls become available", async () => {
    const { host, settings, read } = await setup(calendar());
    read.mockClear();
    const element = document.createElement("velair-room-sensor-schedule") as VelairRoomSensorSchedule;
    Object.assign(element, { host, settings, entityId: "climate.room", disabled: true });
    document.body.append(element); await flush(element);
    expect(read).not.toHaveBeenCalled();
    element.disabled = false; await flush(element);
    expect(read).toHaveBeenCalledOnce();
    expect(element.shadowRoot!.querySelector(".schedule-fields")).not.toBeNull();
  });
  it("adopts external saved mode changes while its automatic draft is pristine", async () => {
    const { element } = await setup(calendar());
    element.settings = { ...element.settings!, room_sensor_schedule: summary(calendar(false)) };
    await flush(element);
    expect(element.shadowRoot!.querySelector(".schedule-fields")).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-field="fixed-source"]')).not.toBeNull();
  });
  it("does not disable the master when a cleared fixed draft is saved in scheduled mode", async () => {
    const { enabled, fixed, click, save } = await setup(calendar());
    await enabled(false); await fixed(""); await enabled(); await click("save-schedule");
    expect(save).toHaveBeenCalledWith("climate.room", { room_sensor_schedule: calendar(), room_temperature_entity_id: null });
  });
  it("does not confirm a mode save if its fixed source change is not present in refreshed settings", async () => {
    const { element, enabled, fixed, click, save, settings } = await setup(calendar());
    const originalSave = save.getMockImplementation()!;
    save.mockImplementation(async (...args) => { await originalSave(...args); settings.room_temperature_entity_id = "sensor.office"; });
    await enabled(false); await fixed(""); await click("save-schedule");
    expect(element.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe("roomSensorScheduleVerificationError");
    expect(element.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="fixed-source"]')!.value).toBe("");
  });

  it("restores saved active calendar fields after Cancel without an extra switch", async () => {
    const { element, click, read, save } = await setup(calendar());
    const start = element.shadowRoot!.querySelector<HTMLInputElement>('input[type="time"]')!;
    start.value = "09:00"; start.dispatchEvent(new Event("input")); await flush(element);
    await click("cancel-schedule");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('input[type="time"]')!.value).toBe("08:00");
    expect(element.shadowRoot!.querySelector("ha-switch")).toBeNull();
    expect(read).toHaveBeenCalledTimes(2); expect(save).not.toHaveBeenCalled();
  });

});
