import { describe, expect, it } from "vitest";
import { overviewLegendLayout } from "../../src/velair/domain/overview-legend-layout";
describe("single-row Overview legend", () => {
  it("shows the full legend when it fits without reserving an overflow button", () => {
    expect(overviewLegendLayout([80, 80], 172, 80).count).toBe(2);
  });
  it("reserves overflow width and gaps, and progressively reveals entries on resize", () => {
    expect(overviewLegendLayout([80, 80, 80], 200, 80).count).toBe(1);
    expect(overviewLegendLayout([80, 80, 80], 300, 80).count).toBe(3);
  });
  it("truncates the first long name while preserving the overflow button", () => {
    expect(overviewLegendLayout([160, 100], 180, 80)).toEqual({ count: 1, firstMaxWidth: 88 });
    expect(overviewLegendLayout([160, 100], 110, 80).count).toBe(0);
  });
  it("reserves enough space for the start time before showing a truncated first entry", () => {
    expect(overviewLegendLayout([160, 100], 150, 80, 70).count).toBe(0);
    expect(overviewLegendLayout([160, 100], 170, 80, 70)).toEqual({ count: 1, firstMaxWidth: 78 });
  });
});
