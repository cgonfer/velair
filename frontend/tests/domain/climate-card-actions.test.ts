import { describe, expect, it } from "vitest";
import {
  climateCardConfiguredActions,
  climateCardEligibleActions,
  splitClimateCardActions,
} from "../../src/velair/domain/climate-card-actions";

describe("climate card ordered actions", () => {
  it("normalizes legacy visibility and scripts without accepting invalid entities", () => {
    expect(climateCardConfiguredActions({
      climate_show_boost_action: false,
      climate_custom_actions: [
        { name: "Scene", script: "scene.movie" },
        { name: "Ventilate", script: "script.ventilate" },
      ],
    })).toEqual([
      { type: "boost", enabled: false },
      { type: "pause", enabled: true },
      { type: "script", name: "Ventilate", script: "script.ventilate" },
    ]);
  });

  it("sanitizes malformed runtime configuration before it reaches the view", () => {
    const longName = `  ${"Long name ".repeat(10)}  `;
    const actions = climateCardConfiguredActions({ climate_actions: [
      null,
      [],
      { type: "boost", enabled: "false", hide_name: true },
      { type: "boost", enabled: false },
      { type: "script", script: "script.safe_action", name: 42, icon: [], color: null, confirmation: "yes" },
      { type: "script", script: "script.long", name: longName, icon: "mdi:fan", color: "#123456", confirmation: true, hide_name: true },
      { type: "script", script: "scene.unsafe", name: "Unsafe" },
    ] } as unknown);
    expect(actions).toEqual([
      { type: "boost", enabled: true, hide_name: true },
      { type: "script", script: "script.safe_action", name: "safe action" },
      { type: "script", script: "script.long", name: longName.trim().slice(0, 60), icon: "mdi:fan", color: "#123456", confirmation: true, hide_name: true },
    ]);
    expect(climateCardConfiguredActions({ climate_custom_actions: null } as unknown)).toEqual([
      { type: "boost", enabled: true },
      { type: "pause", enabled: true },
    ]);
  });

  it("filters Velair actions before choosing three direct actions", () => {
    const config = { climate_actions: [
      { type: "boost" as const },
      { type: "script" as const, name: "One", script: "script.one" },
      { type: "pause" as const },
      { type: "script" as const, name: "Two", script: "script.two" },
      { type: "script" as const, name: "Missing", script: "script.missing" },
      { type: "script" as const, name: "Three", script: "script.three" },
    ] };
    const hass = { states: {
      "script.one": { state: "off" },
      "script.two": { state: "off" },
      "script.three": { state: "off" },
    } } as never;
    const external = climateCardEligibleActions(config, hass, { velairActionsAvailable: false, manual: false });
    const split = splitClimateCardActions(external);
    expect(split.direct.map((action) => action.type)).toEqual(["script", "script", "script"]);
    expect(split.direct[2]).toMatchObject({ type: "script", available: false });
    expect(split.overflow).toHaveLength(1);
  });

  it("uses an automatic direct limit of three", () => {
    const actions = Array.from({ length: 6 }, (_, sourceIndex) => ({
      type: "script" as const,
      action: { name: `${sourceIndex}`, script: `script.action_${sourceIndex}` },
      sourceIndex,
      available: true,
      placement: "auto" as const,
    }));
    expect(splitClimateCardActions(actions).direct).toHaveLength(3);
    expect(splitClimateCardActions(actions).overflow).toHaveLength(3);
  });

  it("keeps explicitly delegated actions in More and preserves menu order", () => {
    const actions = Array.from({ length: 7 }, (_, sourceIndex) => ({
      type: "script" as const,
      action: { name: `${sourceIndex}`, script: `script.action_${sourceIndex}` },
      sourceIndex,
      available: true,
      placement: sourceIndex === 1 || sourceIndex === 4 ? "more" as const : "auto" as const,
    }));
    const split = splitClimateCardActions(actions);
    expect(split.direct.map((action) => action.sourceIndex)).toEqual([0, 2, 3]);
    expect(split.overflow.map((action) => action.sourceIndex)).toEqual([1, 4, 5, 6]);
  });

  it("shows no direct action when every eligible action is delegated", () => {
    const actions = Array.from({ length: 3 }, (_, sourceIndex) => ({
      type: "script" as const,
      action: { name: `${sourceIndex}`, script: `script.action_${sourceIndex}` },
      sourceIndex,
      available: true,
      placement: "more" as const,
    }));
    const split = splitClimateCardActions(actions);
    expect(split.direct).toEqual([]);
    expect(split.overflow).toHaveLength(3);
  });

  it("sanitizes action placement and defaults unknown values to automatic", () => {
    expect(climateCardConfiguredActions({ climate_actions: [
      { type: "boost", placement: "more" },
      { type: "pause", placement: "outside" },
      { type: "script", name: "One", script: "script.one", placement: "more" },
      { type: "script", name: "Two", script: "script.two", placement: 42 },
    ] } as unknown)).toEqual([
      { type: "boost", enabled: true, placement: "more" },
      { type: "pause", enabled: true },
      { type: "script", name: "One", script: "script.one", placement: "more" },
      { type: "script", name: "Two", script: "script.two" },
    ]);
  });
});
