import { describe, expect, it, vi } from "vitest";
import { entityLabel, entityName, entityNameContext } from "../../src/velair/domain/entity-name";
import type { EntityNameDisplay, HassEntityNameItem, HassState, HomeAssistant, ScheduleResponse } from "../../src/velair/types";

const ids = ["climate.down", "climate.up"];
const data = (mode?: EntityNameDisplay) => ({ configured_entities: [...ids], settings: { entity_name_display: mode } }) as ScheduleResponse;

function fixture(ownName?: string): HomeAssistant {
  const hass: HomeAssistant = {
    connection: {} as HomeAssistant["connection"], callService: vi.fn(),
    states: Object.fromEntries(ids.map(entity_id => [entity_id, { entity_id, state: "heat", attributes: { friendly_name: ownName ? `Test ${ownName}` : "Varmekabel" } }])),
    entities: { [ids[0]]: { name: ownName, device_id: "down", next_name_part: "device" }, [ids[1]]: { name: ownName, device_id: "up", next_name_part: "device" } },
    devices: { down: { name: ownName ? "Test" : "Varmekabel", area_id: "down", next_name_part: "area" }, up: { name: ownName ? "Test" : "Varmekabel", area_id: "up", next_name_part: "area" } },
    areas: { down: { name: "Bad nede" }, up: { name: "Bad oppe" } },
  };
  // Actual HA semantics: defaults omit area; an explicit entity item falls
  // back to its device for a main entity with no own name.
  hass.formatEntityName = vi.fn(function (this: HomeAssistant, state: HassState, name?: string | HassEntityNameItem | HassEntityNameItem[], options?: { separator?: string }) {
    expect(this).toBe(hass);
    expect(state).toBe(hass.states![state.entity_id!]);
    if (typeof name === "string") return name;
    const entry = this.entities![state.entity_id!];
    if (!entry) return state.attributes?.friendly_name ?? state.entity_id!;
    const device = this.devices?.[entry.device_id!];
    const parent = this.devices?.[device?.parent_device_id!];
    const own = entry.name ?? entry.original_name;
    const deviceName = device?.name_by_user || device?.name || "";
    const areaId = entry.area_id || device?.area_id || parent?.area_id;
    const parts = { entity: own || deviceName, device: deviceName, parent_device: parent?.name_by_user || parent?.name || "", area: this.areas?.[areaId!]?.name || "", floor: "" };
    if (!name) return [entry.next_name_part === "device" ? deviceName : !own ? deviceName : "", own].filter(Boolean).join(" ");
    return (Array.isArray(name) ? name : [name]).map(item => item.type === "text" ? item.text : parts[item.type]).filter(Boolean).join(options?.separator ?? " ");
  });
  return hass;
}

describe("backward-compatible names", () => {
  it("keeps old combined names by default even when native default naming differs", () => {
    const hass = fixture("Test 2");
    hass.entities![ids[0]].area_id = "down";
    hass.entities![ids[0]].next_name_part = "area";
    expect(hass.formatEntityName!(hass.states![ids[0]])).toBe("Test 2");
    expect(entityName(hass, ids[0], undefined, data())).toBe("Test Test 2");
    expect(entityNameContext(hass, ids[0], data())).toBeUndefined();
  });
  it("retains current labels for an unknown preference from a newer backend", () => {
    const hass = fixture("Test 2");
    const schedule = data("future-format" as EntityNameDisplay);
    expect(entityName(hass, ids[0], undefined, schedule)).toBe("Test Test 2");
    expect(entityNameContext(hass, ids[0], schedule)).toBeUndefined();
  });
  it.each(["", "   ", "Exact custom name"])("preserves the exact friendly string %j", friendly_name => {
    const hass = fixture(); hass.states![ids[0]].attributes!.friendly_name = friendly_name;
    expect(entityName(hass, ids[0])).toBe(friendly_name);
    expect(hass.formatEntityName).not.toHaveBeenCalled();
  });
  it("uses supplied fallback before native formatting and formats genuinely absent names", () => {
    const hass = fixture(); delete hass.states![ids[0]].attributes!.friendly_name;
    expect(entityName(hass, ids[0], "Configured label")).toBe("Configured label");
    expect(hass.formatEntityName).not.toHaveBeenCalled();
    expect(entityName(hass, ids[0])).toBe("Varmekabel");
    hass.states![ids[0]].state = "unavailable";
    expect(entityName(hass, ids[0])).toBe("Varmekabel");
  });
  it("retains IDs for missing states and formatter initialization failures", () => {
    const hass = fixture(); delete hass.states![ids[0]].attributes!.friendly_name;
    hass.formatEntityName = () => { throw new Error("Loading registries"); };
    expect(entityName(hass, ids[0])).toBe(ids[0]);
    expect(entityName(hass, "climate.missing")).toBe("climate.missing");
    expect(entityName(undefined, "climate.missing", "Missing climate")).toBe("Missing climate");
  });
  it.each(["", "   ", null, undefined, 123])("ignores invalid native fallback %j", value => {
    const hass = fixture(); delete hass.states![ids[0]].attributes!.friendly_name;
    hass.formatEntityName = (() => value) as HomeAssistant["formatEntityName"];
    expect(entityName(hass, ids[0])).toBe(ids[0]);
  });
});

describe("opt-in climate context", () => {
  it("reproduces duplicate native names without inventing area-prefixed native defaults", () => {
    const hass = fixture(); const schedule = data("legacy_area");
    expect(ids.map(id => hass.formatEntityName!(hass.states![id]))).toEqual(["Varmekabel", "Varmekabel"]);
    expect(ids.map(id => entityName(hass, id, undefined, schedule))).toEqual(["Varmekabel", "Varmekabel"]);
    expect(ids.map(id => entityNameContext(hass, id, schedule))).toEqual(["Bad nede", "Bad oppe"]);
    expect(entityLabel(hass, ids[0], undefined, schedule)).toBe("Varmekabel · Bad nede");
  });
  it("retains combined user names in current format with area", () => {
    const hass = fixture("Test 2"); const schedule = data("legacy_area");
    expect(entityName(hass, ids[0], undefined, schedule)).toBe("Test Test 2");
    expect(entityNameContext(hass, ids[0], schedule)).toBe("Bad nede");
  });
  it("uses selector-style own names with separate area/device context", () => {
    const hass = fixture("Test 2"); const schedule = data("entity_context");
    expect(entityName(hass, ids[0], undefined, schedule)).toBe("Test 2");
    expect(entityNameContext(hass, ids[0], schedule)).toBe("Bad nede ▸ Test");
    expect(entityNameContext(hass, ids[1], schedule)).toBe("Bad oppe ▸ Test");
  });
  it("uses the device name for main entities without repeating it in context", () => {
    const hass = fixture(); const schedule = data("entity_context");
    expect(entityName(hass, ids[0], undefined, schedule)).toBe("Varmekabel");
    expect(entityNameContext(hass, ids[0], schedule)).toBe("Bad nede");
  });
  it("keeps unique names clear of unnecessary context", () => {
    const hass = fixture("Test 2"); hass.entities![ids[0]].name = "Salón local";
    const schedule = data("entity_context");
    expect(entityName(hass, ids[0], undefined, schedule)).toBe("Salón local");
    expect(entityNameContext(hass, ids[0], schedule)).toBeUndefined();
    expect(entityNameContext(hass, ids[1], schedule)).toBeUndefined();
  });
  it("uses entity area before device area and stops the owner naming chain", () => {
    const hass = fixture("Test 2");
    hass.entities![ids[0]] = { ...hass.entities![ids[0]], area_id: "own", next_name_part: "area" };
    hass.areas!.own = { name: "Own entity area" };
    expect(entityNameContext(hass, ids[0], data("entity_context"))).toBe("Own entity area");
  });
  it("inherits a child device area and observes the parent-device naming link", () => {
    const hass = fixture("Test 2");
    hass.devices!.down = { name: "Child", parent_device_id: "parent", next_name_part: "parent_device" };
    hass.devices!.parent = { name: "Parent", area_id: "down" };
    expect(entityNameContext(hass, ids[0], data("entity_context"))).toBe("Bad nede ▸ Parent ▸ Child");
  });
  it.each(["legacy_area", "entity_context"] as const)("uses identifiers when %s context is missing or equal", mode => {
    const hass = fixture(); const schedule = data(mode); hass.devices!.up.area_id = "down";
    expect(entityNameContext(hass, ids[0], schedule)).toBe(`Bad nede ▸ ${ids[0]}`);
    expect(entityNameContext(hass, ids[1], schedule)).toBe(`Bad nede ▸ ${ids[1]}`);
    const next = { ...hass, devices: { down: { name: "Varmekabel" }, up: { name: "Varmekabel" } } };
    expect(entityNameContext(next, ids[0], schedule)).toBe(ids[0]);
  });
  it("falls back to old primary names without the registry or native formatter", () => {
    const hass = fixture("Test 2"); const schedule = data("entity_context"); delete hass.formatEntityName;
    expect(entityName(hass, ids[0], undefined, schedule)).toBe("Test Test 2");
    expect(entityNameContext(hass, ids[0], schedule)).toBe("Bad nede");
    hass.entities = undefined;
    expect(entityName(hass, ids[0], undefined, schedule)).toBe("Test Test 2");
    expect(entityNameContext(hass, ids[0], schedule)).toBe(ids[0]);
  });
  it("does not apply preferences to sensors or unmanaged climates", () => {
    const hass = fixture("Test 2"); const schedule = data("entity_context");
    hass.states!["sensor.room"] = { attributes: { friendly_name: "Room sensor" } };
    hass.states!["climate.other"] = { attributes: { friendly_name: "Unmanaged climate" } };
    expect(entityName(hass, "sensor.room", undefined, schedule)).toBe("Room sensor");
    expect(entityName(hass, "climate.other", undefined, schedule)).toBe("Unmanaged climate");
    expect(entityNameContext(hass, "sensor.room", schedule)).toBeUndefined();
  });
  it("does not mutate states, registries or IDs", () => {
    const hass = fixture("Test 2"); const before = structuredClone({ states: hass.states, entities: hass.entities, devices: hass.devices });
    entityLabel(hass, ids[0], undefined, data("entity_context"));
    expect({ states: hass.states, entities: hass.entities, devices: hass.devices }).toEqual(before);
  });
  it("shares one linear snapshot between labels and refreshes it after metadata/settings changes", () => {
    const hass = fixture("Test 2"); const schedule = data("entity_context");
    entityName(hass, ids[0], undefined, schedule);
    entityNameContext(hass, ids[0], schedule);
    entityLabel({ ...hass }, ids[1], undefined, schedule);
    expect(hass.formatEntityName).toHaveBeenCalledTimes(2);
    const next = { ...hass, areas: { ...hass.areas, down: { name: "Renamed area" } }, formatEntityName: (state: HassState, name?: string | HassEntityNameItem | HassEntityNameItem[]) => hass.formatEntityName!(state, name) };
    expect(entityNameContext(next, ids[0], schedule)).toBe("Renamed area ▸ Test");
    schedule.settings.entity_name_display = "legacy_area";
    expect(entityName(hass, ids[0], undefined, schedule)).toBe("Test Test 2");
  });
});
