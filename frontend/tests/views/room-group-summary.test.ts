// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it } from "vitest";
import { renderRoomGroupSummary, renderRoomGroupScheduleNotice } from "../../src/velair/views/room-group-summary";
import { en } from "../../src/velair/translations/en";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { RoomGroup } from "../../src/velair/types";

describe("group temperature and Room Assist summary", () => {
  const group: RoomGroup = { id: "group.room", name: "Room", members: ["climate.a", "climate.b"], temperature_entity_id: "climate.a", delivery_mode: "all" };
  function summary(enabled: boolean, measured?: number) {
    const host = {
      _data: { zones: { [group.id]: { schedule: {}, preconditioning: { room_sensor_assist_enabled: enabled, room_temperature_entity_id: "sensor.room" } } },
        control_unit_states: { [group.id]: { attributes: { current_temperature: 24 } } },
        room_sensor_assist: { [group.id]: { room_temperature: measured } } },
      _t: (key: keyof typeof en) => en[key], _friendlyEntityName: (id: string) => id,
      _formatTemperature: (value: number) => `${value} °C`,
    } as unknown as VelairViewHost;
    const container = document.createElement("div");
    render(renderRoomGroupSummary(host, group), container);
    const rows = [...container.querySelectorAll(".room-group-details > .resource-usage-item")];
    return { native: rows[0].textContent, assist: rows[1].textContent };
  }
  it("shows the native member reading separately from enabled external assistance", () => {
    const result = summary(true, 20);
    expect(result.native).toContain("climate.a · 24 °C");
    expect(result.assist).toContain("Enabled · sensor.room · 20 °C");
  });
  it("does not imply that a configured but disabled sensor is in use", () => {
    const result = summary(false, 20);
    expect(result.native).toContain("24 °C");
    expect(result.assist).toContain("Off · sensor.room");
    expect(result.assist).not.toContain("20 °C");
  });
  it("keeps a missing external measurement distinct from the available native reading", () => {
    const result = summary(true);
    expect(result.native).toContain("24 °C");
    expect(result.assist).toContain("Enabled · sensor.room · Unavailable");
  });
});


describe("compact scheduling group notice", () => {
  const group: RoomGroup = { id: "group.room", name: "Room", members: ["climate.b", "climate.a"], temperature_entity_id: "climate.a", delivery_mode: "all" };
  const host = {
    _t: (key: keyof typeof en, values?: Record<string, string | number>) => Object.entries(values ?? {}).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), en[key]),
    _friendlyEntityName: (id: string) => id === "climate.a" ? "First climate" : "Second climate",
  } as unknown as VelairViewHost;
  it("shows a short shared-schedule message with ordered members only in shared info help", () => {
    const container = document.createElement("div");
    render(renderRoomGroupScheduleNotice(host, group), container);
    expect(container.querySelector(".room-group-schedule-copy")?.textContent).toBe("This schedule applies to all climates in Room.");
    expect(container.querySelector("details")).toBeNull();
    expect(container.querySelector(".room-group-details")).toBeNull();
    const trigger = container.querySelector<HTMLButtonElement>(".inline-help")!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-label")).toContain("Room");
    const help = container.querySelector('[role="tooltip"]')!;
    expect(help.classList.contains("visible")).toBe(false);
    expect([...help.querySelectorAll('[role="paragraph"]')].map(node => node.textContent)).toEqual(["Second climate (climate.b)", "First climate (climate.a)"]);
  });
  it("omits the notice for a standalone climate and gives Default and Profile distinct help IDs", () => {
    const container = document.createElement("div");
    render(renderRoomGroupScheduleNotice(host), container);
    expect(container.querySelector(".room-group-schedule-note")).toBeNull();
    render([renderRoomGroupScheduleNotice(host, group), renderRoomGroupScheduleNotice(host, group, "profile-night")], container);
    const ids = [...container.querySelectorAll(".inline-help")].map(node => node.getAttribute("aria-controls"));
    expect(new Set(ids).size).toBe(2);
  });
});
