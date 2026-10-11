import { describe, expect, it } from "vitest";
import { portableSectionsWithDependencies } from "../../src/velair/domain/portable";

describe("portable reference dependencies", () => {
  it("includes presets inherited through a complete template when only Profiles are selected", () => {
    const source = {
      profiles: [{ zones: { room: { template_links: { monday: { mode: "full", template_key: "work" } } } } }],
      templates: [{ key: "work", blocks: [{ start: "07:00", slot_id: "morning", preset_key: "comfort" }] }],
      block_presets: [{ key: "comfort", config: { action: "set_temperature", temperature: 21 } }],
    };
    expect([...portableSectionsWithDependencies(["profiles"], source)]).toEqual(["profiles", "templates", "block_presets"]);
    expect([...portableSectionsWithDependencies(["templates", "profiles"], source)]).toEqual(["templates", "profiles", "block_presets"]);
  });

  it("includes the presets of a template even when it has no linked schedules", () => {
    expect([...portableSectionsWithDependencies(["templates"], { templates: [
      { key: "unused", blocks: [{ start: "23:00", preset_key: "night" }] },
    ] })]).toEqual(["templates", "block_presets"]);
  });
  it("includes Default linked hours and their preset assignments", () => {
    const selected = portableSectionsWithDependencies(["zones"], {
      zones: { "climate.living_room": { template_links: { monday: {
        template_key: "workday", bindings: { morning: { preset_key: "comfort" } },
      } } } },
    });
    expect([...selected]).toEqual(["zones", "templates", "block_presets"]);
  });

  it("includes inactive Profile dependencies without selecting other consumers", () => {
    const selected = portableSectionsWithDependencies(["profiles"], {
      profiles: [{ key: "winter", zones: { room: { schedule: {
        monday: [{ start: "07:00", preset_key: "winter-comfort" }],
      } } } }],
      zones: { room: { template_links: { monday: { template_key: "unrelated" } } } },
    });
    expect([...selected]).toEqual(["profiles", "block_presets"]);
  });

  it("keeps independent schedules independent and does not mutate selection", () => {
    const original = new Set(["zones"] as const);
    expect([...portableSectionsWithDependencies(original, { zones: {
      room: { schedule: { monday: [{ start: "07:00", temperature: 20 }] } },
    } })]).toEqual(["zones"]);
    expect([...original]).toEqual(["zones"]);
  });

  it("retains required sections even when a damaged file lacks its library", () => {
    expect([...portableSectionsWithDependencies(["profiles"], {
      profiles: [{ zones: { room: { template_links: { monday: { template_key: "missing" } } } } }],
    })]).toEqual(["profiles", "templates"]);
  });
});
