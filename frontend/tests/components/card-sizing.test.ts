// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import "../../src/velair-card";
import type { VelairCard } from "../../src/velair/components/velair-card-element";

describe("Lovelace Sections sizing (#47)", () => {
  it.each(["overview", "overview-status", "overview-zones", "climate", "overview-events", "planned-return"] as const)(
    "lets Sections reserve the content height for %s instead of a fixed row span",
    (view) => {
      const card = document.createElement("velair-card") as VelairCard;
      card.setConfig({ type: "custom:velair-card", view });
      const options = card.getGridOptions();
      // Fixed rows let expanded controls and additional zones paint over the next card.
      expect(options.rows).toBe("auto");
      expect(options).not.toHaveProperty("min_rows");
      expect(options).not.toHaveProperty("max_rows");
      expect(options.columns).toBe(12);
      expect(options.min_columns).toBe(6);
    },
  );
});
