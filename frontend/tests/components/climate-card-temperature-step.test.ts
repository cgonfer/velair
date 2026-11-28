// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import type { VelairViewHost } from "../../src/velair/host-types";
import { renderClimateCard } from "../../src/velair/views/climate-card-view";

customElements.define("velair-temperature-step-test", class extends VelairCard {});

const entityId = "climate.kitchen";
const groupId = "group.family";

function fixture(grouped: boolean, mode: string, range = false) {
  const callService = vi.fn().mockResolvedValue(undefined);
  const card = document.createElement("velair-temperature-step-test") as VelairCard & Record<string, any>;
  card.setConfig({ view: "climate", selected_entity: entityId });
  const state = { state: mode, attributes: {
    min_temp: 5, max_temp: 30, temperature: 24, current_temperature: 23,
    target_temp_low: 20, target_temp_high: 24,
    supported_features: range ? 2 : 1, hvac_modes: ["off", mode],
  } };
  card.hass = { callService, states: { [entityId]: state },
    config: { unit_system: { temperature: "°C" }, time_zone: "UTC" },
  } as never;
  const owner = grouped ? groupId : entityId;
  card["_data"] = {
    configured_entities: [entityId], temperature_unit: "°C", global: { mode: "auto" },
    settings: { first_weekday: "monday", zone_order: [] },
    zones: { [owner]: { enabled: true, schedule: {}, target_temp_step_override: 0.5 } },
    zone_runtime: { [owner]: { state: "scheduled", control_mode: "manual", manual_adjustment_allowed: true } },
    operational_status: "running", next_event: null, next_events: [], active_overrides: {},
    ...(grouped ? {
      member_to_unit: { [entityId]: groupId },
      room_groups: { [groupId]: { id: groupId, name: "Family Zone", members: [entityId] } },
      control_unit_states: { [groupId]: state },
    } : {}),
  };
  card["_loadSchedule"] = vi.fn().mockResolvedValue(undefined);
  card["_showSuccess"] = vi.fn();
  return { card, callService };
}

describe.each([true, false])("climate card temperature fallback, grouped=%s", grouped => {
  it.each(["heat", "cool"])("accepts decimal Boost input and sends it in %s", async mode => {
    const { card, callService } = fixture(grouped, mode);
    card["_data"].zone_runtime[grouped ? groupId : entityId].control_mode = "automatic";
    card["_openClimateCardBoost"](entityId);
    card["_updateClimateCardBoost"]("target", "24.5");
    const container = document.createElement("div");
    render(renderClimateCard(card as unknown as VelairViewHost, entityId), container);
    const form = container.querySelector<HTMLFormElement>(".climate-card-boost-form")!;
    expect(form).not.toBeNull();
    expect(form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
    expect(form.reportValidity()).toBe(true);
    await card["_runClimateCardService"]("boost", entityId);
    expect(callService).toHaveBeenCalledWith("velair", "boost", expect.objectContaining({
      entity_id: entityId, temperature: 24.5,
    }));
  });

  it.each(["heat", "cool"])("increments and decrements Manual targets by half a degree in %s", async mode => {
    const { card, callService } = fixture(grouped, mode);
    await card["_adjustClimateCardTarget"](entityId, "temperature", 1);
    await card["_adjustClimateCardTarget"](entityId, "temperature", -1);
    expect(callService).toHaveBeenNthCalledWith(1, grouped ? "velair" : "climate", "set_temperature", {
      entity_id: entityId, temperature: 24.5,
    });
    expect(callService).toHaveBeenNthCalledWith(2, grouped ? "velair" : "climate", "set_temperature", {
      entity_id: entityId, temperature: 23.5,
    });
  });

  it("accepts decimal Boost range limits and preserves both Manual range limits", async () => {
    const { card, callService } = fixture(grouped, "heat_cool", true);
    card["_data"].zone_runtime[grouped ? groupId : entityId].control_mode = "automatic";
    card["_openClimateCardBoost"](entityId);
    card["_updateClimateCardBoost"]("low", "20,5");
    card["_updateClimateCardBoost"]("high", "24.5");
    await card["_runClimateCardService"]("boost", entityId);
    expect(callService).toHaveBeenNthCalledWith(1, "velair", "boost", expect.objectContaining({
      entity_id: entityId, target_temp_low: 20.5, target_temp_high: 24.5,
    }));
    card["_data"].zone_runtime[grouped ? groupId : entityId].control_mode = "manual";
    await card["_adjustClimateCardTarget"](entityId, "target_temp_low", 1);
    expect(callService).toHaveBeenNthCalledWith(2, grouped ? "velair" : "climate", "set_temperature", {
      entity_id: entityId, target_temp_low: 20.5, target_temp_high: 24,
    });
  });

  it("keeps rejecting Boost values outside the configured step or bounds", async () => {
    const { card, callService } = fixture(grouped, "heat");
    card["_openClimateCardBoost"](entityId);
    for (const target of ["24.25", "30.5"]) {
      card["_updateClimateCardBoost"]("target", target);
      await card["_runClimateCardService"]("boost", entityId);
    }
    expect(callService).not.toHaveBeenCalled();
  });
});

it("keeps an independent thermostat's published whole-degree step ahead of fallbacks", async () => {
  const { card, callService } = fixture(false, "heat");
  card.hass!.states[entityId].attributes.target_temp_step = 1;
  card["_data"].zones[groupId] = { target_temp_step_override: 0.25 };
  await card["_adjustClimateCardTarget"](entityId, "temperature", 1);
  expect(callService).toHaveBeenCalledWith("climate", "set_temperature", {
    entity_id: entityId, temperature: 25,
  });
  callService.mockClear();
  card["_openClimateCardBoost"](entityId);
  card["_updateClimateCardBoost"]("target", "24.5");
  await card["_runClimateCardService"]("boost", entityId);
  expect(callService).not.toHaveBeenCalled();
  card["_updateClimateCardBoost"]("target", "25");
  await card["_runClimateCardService"]("boost", entityId);
  expect(callService).toHaveBeenCalledWith("velair", "boost", expect.objectContaining({
    entity_id: entityId, temperature: 25,
  }));
});
