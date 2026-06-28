import { describe, expect, it } from "vitest";

import { visibleZoneIds } from "../../src/velair/domain/settings";

describe("visible zone ids", () => {
  it("keeps all thermostats when a card has no entity filter", () => {
    expect(
      visibleZoneIds(["climate.office", "climate.bedroom"], {
        zone_order: ["climate.bedroom", "climate.office"],
      }),
    ).toEqual(["climate.bedroom", "climate.office"]);
  });

  it("filters the card to selected thermostats while preserving configured order", () => {
    expect(
      visibleZoneIds(["climate.office", "climate.bedroom", "climate.kitchen"], {
        entities: ["climate.kitchen", "climate.office"],
        zone_order: ["climate.bedroom", "climate.office", "climate.kitchen"],
      }),
    ).toEqual(["climate.office", "climate.kitchen"]);
  });

  it("ignores entities that are not managed by Velair", () => {
    expect(
      visibleZoneIds(["climate.office"], {
        entities: ["climate.missing"],
        zone_order: ["climate.missing", "climate.office"],
      }),
    ).toEqual([]);
  });
});
