// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { VelairCardEditor } from "../../src/velair/views/card-editor";
import { renderOverviewTimelineName, renderOverviewZones } from "../../src/velair/views/overview-view";
import { renderZones, renderZoneTargets } from "../../src/velair/views/schedule-view";
import { renderTemplateApplication } from "../../src/velair/views/template-application-view";
import { renderClimateCard } from "../../src/velair/views/climate-card-view";
import { controlUnitName } from "../../src/velair/domain/control-units";
import type { EntityNameDisplay } from "../../src/velair/types";

customElements.define("test-native-entity-names-card", VelairCard);
customElements.define("test-native-entity-names-editor", VelairCardEditor);
const ids = ["climate.bad_nede_varmekabel", "climate.bad_oppe_varmekabel"];
const areas = ["Bad nede", "Bad oppe"];

function fixture(mode?: EntityNameDisplay) {
  const hass: any = {
    connection: {}, config: { time_zone: "UTC", unit_system: { temperature: "°C" } },
    states: Object.fromEntries(ids.map(entity_id => [entity_id, {
      entity_id, state: "heat", attributes: { friendly_name: "Varmekabel", hvac_modes: ["heat", "off"],
        current_temperature: 20, temperature: 21, supported_features: 1 },
    }])),
    entities: Object.fromEntries(ids.map((id, index) => [id, { entity_id: id, device_id: `device_${index}`, next_name_part: "device" }])),
    devices: Object.fromEntries(ids.map((_, index) => [`device_${index}`, { name: "Varmekabel", area_id: `area_${index}`, next_name_part: "area" }])),
    areas: Object.fromEntries(areas.map((name, index) => [`area_${index}`, { name }])),
  };
  // HA 20261028.5 defaults omit areas; a main entity uses its device name.
  hass.formatEntityName = (state: { entity_id: string }, item?: { type: string }) => {
    const entry = hass.entities[state.entity_id];
    const device = hass.devices[entry.device_id];
    if (item?.type === "entity") return entry.name || device.name;
    if (item?.type === "area") return hass.areas[entry.area_id || device.area_id]?.name ?? "";
    return [entry.next_name_part === "device" || !entry.name ? device.name : "", entry.name].filter(Boolean).join(" ");
  };
  const card = document.createElement("test-native-entity-names-card") as any;
  card.setConfig({ view: "overview-zones" }); card.hass = hass;
  card._data = {
    configured_entities: ids, global: { mode: "auto" },
    settings: { first_weekday: "monday", zone_order: [], ...(mode ? { entity_name_display: mode } : {}) },
    zones: Object.fromEntries(ids.map(id => [id, { enabled: true, schedule: {} }])),
    active_overrides: {}, next_events: [], next_event: null, operational_status: "running",
    templates: [], profiles: [], block_presets: [],
  };
  return card;
}

describe("climate name display preferences in Velair views", () => {
  it("preserves current names and hides context by default, including legacy HA", () => {
    const card = fixture(); const container = document.createElement("div");
    for (const formatter of [card.hass.formatEntityName, undefined]) {
      card.hass = { ...card.hass, formatEntityName: formatter };
      render(renderOverviewZones(card, ids), container);
      expect([...container.querySelectorAll(".overview-zone-card-name strong")].map(node => node.textContent)).toEqual(["Varmekabel", "Varmekabel"]);
      expect(container.querySelector(".entity-name-context")).toBeNull();
    }
  });
  it("adds separate area context in zone cards and timeline rows only after opting in", () => {
    const card = fixture("legacy_area"); const container = document.createElement("div");
    render(renderOverviewZones(card, ids), container);
    expect([...container.querySelectorAll(".overview-zone-card-name strong")].map(node => node.textContent)).toEqual(["Varmekabel", "Varmekabel"]);
    expect([...container.querySelectorAll(".entity-name-context")].map(node => node.textContent)).toEqual(areas);
    for (const [index, id] of ids.entries()) {
      render(renderOverviewTimelineName(card, id), container);
      expect(container.querySelector(".overview-climate-name")?.textContent).toBe("Varmekabel");
      expect(container.querySelector(".entity-name-context")?.textContent).toBe(areas[index]);
    }
  });
  it("keeps schedule clicks tied to IDs when context is displayed", () => {
    const card = fixture("legacy_area"); card._selectEntity = vi.fn();
    const container = document.createElement("div"); render(renderZones(card, ids, ids[0]), container);
    const buttons = [...container.querySelectorAll<HTMLButtonElement>("button.zone")];
    expect(buttons[0].querySelector(".entity-name-context")?.textContent).toBe("Bad nede");
    buttons[1].click(); expect(card._selectEntity).toHaveBeenCalledWith(ids[1]);
    expect(buttons[0].classList.contains("active")).toBe(true);
  });
  it("uses entity names in the optional format and preserves explicit card/group names", () => {
    const card = fixture("entity_context");
    for (const id of ids) card.hass.entities[id].name = "Test 2";
    card.setConfig({ view: "climate", selected_entity: ids[0] });
    const container = document.createElement("div"); render(renderClimateCard(card, ids[0]), container);
    expect(container.querySelector(".climate-card-title h2")?.textContent).toContain("Test 2");
    expect(container.querySelector(".entity-name-context")?.textContent).toBe("Bad nede ▸ Varmekabel");
    card.setConfig({ view: "climate", selected_entity: ids[0], climate_name: "My dashboard name" });
    render(renderClimateCard(card, ids[0]), container);
    expect(container.querySelector(".climate-card-title h2")?.textContent).toBe("My dashboard name");
    expect(container.querySelector(".entity-name-context")).toBeNull();
    card._data.room_groups = { "group.room": { name: "My group name" } };
    expect(controlUnitName(card._data, card.hass, "group.room")).toBe("My group name");
  });
  it("includes context in editor options without changing selected IDs or custom-name defaults", () => {
    const card = fixture("legacy_area");
    const editor = document.createElement("test-native-entity-names-editor") as any;
    editor.hass = card.hass; editor._entities = ids; editor._scheduleData = card._data;
    editor.setConfig({ view: "climate", selected_entity: ids[1] });
    const container = document.createElement("div"); render(editor._renderClimateCardOptions(), container);
    const options = [...container.querySelectorAll<HTMLOptionElement>("option")].filter(node => ids.includes(node.value));
    expect(options.map(node => node.textContent)).toEqual(areas.map(area => `Varmekabel · ${area}`));
    expect(options.find(node => node.selected)?.value).toBe(ids[1]);
    expect(container.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe("Varmekabel");
  });

  it("distinguishes mutation destinations in clone controls and template checkbox labels", () => {
    const card = fixture("legacy_area");
    card._selectedEntity = "climate.unrelated";
    card._hasDraftValidationError = () => false;
    card._toggleZoneTarget = vi.fn();
    const container = document.createElement("div");
    render(renderZoneTargets(card), container);
    const choices = [...container.querySelectorAll<HTMLLabelElement>(".check-target")];
    expect(choices.map(node => node.textContent?.trim())).toEqual(areas.map(area => `Varmekabel · ${area}`));
    const input = choices[1].querySelector("input")!;
    input.checked = true; input.dispatchEvent(new Event("change"));
    expect(card._toggleZoneTarget).toHaveBeenCalledWith(ids[1], true);
    card._templateApplyOpen = true;
    const template = { key: "test", name: "Test template", blocks: [] };
    card._data.templates = [template];
    render(renderTemplateApplication(card, template), container);
    const labels = [...container.querySelectorAll<HTMLInputElement>(".template-application-target input")].map(node => node.getAttribute("aria-label"));
    expect(labels.some(label => label?.includes("Varmekabel · Bad nede"))).toBe(true);
    expect(labels.some(label => label?.includes("Varmekabel · Bad oppe"))).toBe(true);
  });
});
