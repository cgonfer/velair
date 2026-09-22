import { describe, expect, it } from "vitest";
import {
  climateCardMenuPosition,
  validClimateCardActionColor,
  validClimateCardActionIcon,
} from "../../src/velair/domain/climate-card-menu";

describe("climate card action menu", () => {
  it("prefers opening below and aligns to the trigger end", () => {
    expect(climateCardMenuPosition(
      { top: 100, right: 300, bottom: 140, left: 220, width: 80 },
      280,
      200,
      { top: 0, left: 0, width: 500, height: 800 },
    )).toEqual({ left: 20, top: 146, width: 280, maxHeight: 200, placement: "down" });
  });

  it("opens above when needed and constrains a long menu to the viewport", () => {
    expect(climateCardMenuPosition(
      { top: 700, right: 490, bottom: 740, left: 410, width: 80 },
      400,
      900,
      { top: 0, left: 0, width: 500, height: 800 },
    )).toEqual({ left: 170, top: 8, width: 320, maxHeight: 686, placement: "up" });
  });

  it("keeps narrow mobile menus inside visual viewport offsets", () => {
    expect(climateCardMenuPosition(
      { top: 80, right: 70, bottom: 120, left: 20, width: 50 },
      280,
      120,
      { top: 30, left: 10, width: 200, height: 400 },
    )).toEqual({ left: 18, top: 126, width: 184, maxHeight: 120, placement: "down" });
  });

  it("accepts only safe MDI icons and six-digit colors", () => {
    expect(validClimateCardActionIcon("mdi:window-open-variant")).toBe("mdi:window-open-variant");
    expect(validClimateCardActionIcon("url(javascript:bad)")).toBeUndefined();
    expect(validClimateCardActionColor("#03a9f4")).toBe("#03a9f4");
    expect(validClimateCardActionColor("red;position:fixed")).toBeUndefined();
    expect(validClimateCardActionIcon({ value: "mdi:fan" })).toBeUndefined();
    expect(validClimateCardActionColor(["#03a9f4"])).toBeUndefined();
  });
});
