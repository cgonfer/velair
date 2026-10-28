import { activeOverrideEntityIds } from "../../src/velair/controllers/overview-data";
import { portableSectionsWithDependencies, unmatchedPreconditioningLearningEntities } from "../../src/velair/domain/portable";
import { describe, expect, it } from "vitest";
import { controlUnitId, controlUnitIds, controlUnitState, expandedControlUnitIds, orderedControlUnitIds, filteredPhysicalClimateIds } from "../../src/velair/domain/control-units";
import { effectiveClimateSchedule, effectiveZoneProfileId } from "../../src/velair/domain/climate-profiles";
import { climateCardOwner } from "../../src/velair/domain/climate-card";
import { orderedZoneIdsForHost, visibleZoneIdsForHost, preconditioningInputsChanged } from "../../src/velair/controllers/card-context";
import type { ScheduleResponse, HomeAssistant } from "../../src/velair/types";

const data = () => ({
  configured_entities: ["climate.a", "climate.middle", "climate.b"], control_units: ["group.room", "climate.middle"],
  member_to_unit: { "climate.a": "group.room", "climate.b": "group.room" },
  room_groups: { "group.room": { id: "group.room", name: "Room", members: ["climate.b", "climate.a"], temperature_entity_id: "sensor.room", delivery_mode: "all" } },
  settings: { zone_order: ["climate.a", "climate.middle", "climate.b"], unit_order: ["climate.middle", "group.room"] },
  zones: { "group.room": { schedule: { monday: [{ start: "08:00", temperature: 21 }] } } },
  effective_zone_profiles: { "group.room": "work" }, zone_runtime: { "group.room": { state: "idle", control_mode: "manual" } },
  control_unit_states: { "group.room": { state: "heat", attributes: { hvac_modes: ["heat", "off"], current_temperature: 20 } } },
}) as unknown as ScheduleResponse;

describe("control-unit identities", () => {
  it("filters physical Comfort climates without widening an explicit member to its entire group", () => {
    const value = data();
    expect(filteredPhysicalClimateIds(value)).toEqual(["climate.middle", "climate.b", "climate.a"]);
    expect(filteredPhysicalClimateIds(value, ["group.room"])).toEqual(["climate.b", "climate.a"]);
    expect(filteredPhysicalClimateIds(value, ["climate.a"])).toEqual(["climate.a"]);
    expect(filteredPhysicalClimateIds(value, ["climate.middle", "climate.b"])).toEqual(["climate.middle", "climate.b"]);
    expect(filteredPhysicalClimateIds({ configured_entities: ["climate.a"] } as ScheduleResponse)).toEqual(["climate.a"]);
  });
  it("keeps physical inventory distinct, orders logical units, and expands contiguous individual Overview members", () => {
    const value = data();
    expect(controlUnitIds(value)).toEqual(["group.room", "climate.middle"]);
    expect(orderedControlUnitIds(value)).toEqual(["climate.middle", "group.room"]);
    expect(expandedControlUnitIds(value)).toEqual(["climate.middle", "climate.b", "climate.a"]);
    expect(value.configured_entities).toEqual(["climate.a", "climate.middle", "climate.b"]);
  });
  it("resolves one policy, Profile and manual session from any physical member", () => {
    const value = data();
    expect(controlUnitId(value, "climate.b")).toBe("group.room");
    expect(effectiveClimateSchedule(value, "climate.a")).toBe(value.zones["group.room"].schedule);
    expect(effectiveZoneProfileId(value, "climate.b")).toBe("work");
    expect(climateCardOwner(value, "climate.a")).toBe("manual");
  });
  it("reads backend group capabilities without registering or replacing Home Assistant states", () => {
    const value = data(); const hass = { states: { "climate.a": { state: "off" } } } as HomeAssistant;
    expect(controlUnitState(value, hass, "group.room")).toBe(value.control_unit_states!["group.room"]);
    expect(controlUnitState(value, hass, "climate.a")?.state).toBe("off");
    expect(hass.states).not.toHaveProperty("group.room");
  });
  it("uses group selectors for schedules while a physical Lovelace climate card keeps its configured member", () => {
    const value = data(); const host = { _data: value, _config: { entities: ["climate.a"] } };
    expect(visibleZoneIdsForHost(host, value.configured_entities)).toEqual(["group.room"]);
    expect(visibleZoneIdsForHost({ ...host, _config: { ...host._config, view: "climate" } }, value.configured_entities)).toEqual(["climate.a"]);
    expect(orderedZoneIdsForHost({ _config: {} }, ["climate.a"])).toEqual(["climate.a"]);
  });
  it("preserves singleton behavior for older backend responses", () => {
    const value = { configured_entities: ["climate.a"], settings: { zone_order: ["climate.a"] } } as ScheduleResponse;
    expect(controlUnitIds(value)).toEqual(["climate.a"]);
    expect(expandedControlUnitIds(value)).toEqual(["climate.a"]);
    expect(controlUnitId(value, "climate.a")).toBe("climate.a");
  });
  it("lists a grouped boost once using the same logical identities as Overview filters", () => {
    const value = data();
    value.active_overrides = { "group.room": { type: "boost", until: new Date(Date.now() + 60000).toISOString(), temperature: 22 } };
    const host = { _data: value, _orderedZoneIds: (ids: string[]) => ids } as Parameters<typeof activeOverrideEntityIds>[0];
    expect(activeOverrideEntityIds(host)).toEqual(["group.room"]);
  });
  it("shows room graph dependencies before importing grouped consumers", () => {
    const value = data();
    expect([...portableSectionsWithDependencies(["preconditioning_learning"], value)]).toEqual(["preconditioning_learning", "room_groups", "zones", "profiles"]);
    expect(unmatchedPreconditioningLearningEntities({ sections: { preconditioning_learning: { "group.room": {} } } } as never, controlUnitIds(value))).toEqual([]);
  });

  it("preserves explicit Lovelace ordering when the backend publishes an empty group map", () => {
    const value = { configured_entities: ["climate.a", "climate.b"], room_groups: {}, settings: { unit_order: ["climate.a", "climate.b"] } } as ScheduleResponse;
    const host = { _data: value, _config: { zone_order: ["climate.b", "climate.a"] }, _hasExternalConfig: true };
    expect(orderedZoneIdsForHost(host, value.configured_entities)).toEqual(["climate.b", "climate.a"]);
  });
  it("refreshes group preconditioning when its sensor or outdoor reference changes", () => {
    const value = data();
    value.zones["group.room"].preconditioning = { enabled: true, use_outdoor_temperature: true, outdoor_temperature_entity_id: "sensor.outdoor" } as never;
    const host = { _data: value, _config: {} };
    const before = { states: { "sensor.room": { state: "20" }, "sensor.outdoor": { state: "10" } } } as HomeAssistant;
    const changed = { states: { ...before.states, "sensor.room": { state: "21" } } } as HomeAssistant;
    expect(preconditioningInputsChanged(host, changed, before)).toBe(true);
    expect(preconditioningInputsChanged(host, before, before)).toBe(false);
  });

});
