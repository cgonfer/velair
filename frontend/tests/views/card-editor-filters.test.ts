// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { VelairCardEditor } from "../../src/velair/views/card-editor";
import { render } from "lit";

customElements.define("test-physical-card-editor", VelairCardEditor);

function editor(view: string, entities?: string[]) {
  const element = document.createElement("test-physical-card-editor") as any;
  element.setConfig({ view, entities, zone_order: ["climate.a", "climate.single", "climate.b"] });
  element._entities = ["climate.a", "climate.single", "climate.b"];
  element._scheduleData = {
    configured_entities: element._entities,
    control_units: ["group.room", "climate.single"],
    room_groups: { "group.room": { members: ["climate.b", "climate.a"] } },
    member_to_unit: { "climate.a": "group.room", "climate.b": "group.room" },
  };
  return element;
}

describe("physical card editor selections", () => {
  it("defaults group visibility on and persists the editor switch independently of the name", () => {
    const element = editor("climate");
    const container = document.createElement("div");
    render(element._renderClimateToggle("climateCardShowGroup", "climate_show_group"), container);
    const checkbox = container.querySelector<HTMLInputElement>("input")!;
    expect(checkbox.checked).toBe(true);
    const changes: any[] = [];
    element.addEventListener("config-changed", (event: CustomEvent) => changes.push(event.detail.config));
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    expect(changes.at(-1).climate_show_group).toBe(false);
    expect(changes.at(-1).climate_show_name).toBeUndefined();
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    expect(changes.at(-1).climate_show_group).not.toBe(false);
  });
  it.each(["overview", "overview-zones", "overview-timeline", "overview-events", "comfort"])("offers individual climates and preserves selection in %s", view => {
    const element = editor(view, ["climate.a"]);
    expect(element._orderedEntities()).toEqual(["climate.a", "climate.single", "climate.b"]);
    expect(element._selectedEntities()).toEqual(["climate.a"]);
    element._toggleEntityVisibility("climate.b", true);
    expect(element._config.entities).toEqual(["climate.a", "climate.b"]);
    element.setConfig({ view, entities: ["group.room"] });
    expect(element._selectedEntities()).toEqual(["climate.b", "climate.a"]);
  });

  it("retains unit selectors for shared configuration and physical selection without groups", () => {
    const shared = editor("schedules", ["climate.a"]);
    expect(shared._selectedEntities()).toEqual(["group.room"]);
    const single = editor("overview-zones", ["climate.a"]);
    delete single._scheduleData.room_groups;
    delete single._scheduleData.member_to_unit;
    delete single._scheduleData.control_units;
    expect(single._orderedEntities()).toEqual(["climate.a", "climate.single", "climate.b"]);
    expect(single._selectedEntities()).toEqual(["climate.a"]);
  });
});
