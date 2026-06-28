import { describe, expect, it } from "vitest";

import { ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../../src/velair/constants";
import {
  overviewTimelineInitialScrollLeft,
  timelineBlocksFromDrafts,
  timelineBoostBlockFromOverride,
  timelineModeClass,
  timelineNowMarker,
  timelinePauseBlockFromOverride,
} from "../../src/velair/domain/timeline";

describe("timeline domain helpers", () => {
  it("sorts draft blocks and converts them into bounded timeline segments", () => {
    const blocks = timelineBlocksFromDrafts([
      { action: ACTION_TURN_OFF, hvac_mode: "off", start: "22:00", temperature: "" },
      { action: ACTION_SET_TEMPERATURE, hvac_mode: "heat", start: "08:00", temperature: 20 },
    ]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ startMinute: 480, endMinute: 1320 });
    expect(blocks[0]?.left).toBeCloseTo(480 / 14.4);
    expect(blocks[1]).toMatchObject({ startMinute: 1320, endMinute: 1440 });
  });

  it("projects boost and timed pause overrides onto the visible day", () => {
    const now = new Date(2026, 5, 8, 12, 0);
    const startedAt = new Date(2026, 5, 8, 10, 0).toISOString();
    const until = new Date(2026, 5, 8, 14, 0).toISOString();

    const boost = timelineBoostBlockFromOverride(
      { type: "boost", started_at: startedAt, until, temperature: 23, hvac_mode: "heat" },
      now,
    );
    const pause = timelinePauseBlockFromOverride({ type: "pause", started_at: startedAt, until }, now);

    expect(boost).toMatchObject({ startMinute: 600, endMinute: 840 });
    expect(boost?.block).toMatchObject({ temperature: 23, hvac_mode: "heat" });
    expect(pause).toMatchObject({ startMinute: 600, endMinute: 840, indefinite: false });
  });

  it("renders indefinite pauses across the full day", () => {
    expect(timelinePauseBlockFromOverride({ type: "pause" }, new Date(2026, 5, 8, 12, 0))).toEqual({
      endMinute: 1440,
      indefinite: true,
      left: 0,
      startMinute: 0,
      width: 100,
    });
  });

  it("creates stable now markers and mode classes", () => {
    expect(timelineNowMarker(new Date(2026, 5, 8, 6, 30))).toEqual({
      label: "06:30",
      left: 390 / 14.4,
      minute: 390,
    });

    expect(timelineModeClass({ action: ACTION_TURN_OFF })).toBe("off");
    expect(timelineModeClass({ action: ACTION_SET_TEMPERATURE, hvac_mode: "heat_cool" })).toBe("heat-cool");
    expect(timelineModeClass({ action: ACTION_SET_TEMPERATURE })).toBe("keep");
  });

  it("positions the current time toward the start of the visible timeline", () => {
    expect(overviewTimelineInitialScrollLeft(50, 620, 320, 140)).toBeCloseTo(177);
    expect(overviewTimelineInitialScrollLeft(75, 620, 320, 140)).toBeCloseTo(297);
    expect(overviewTimelineInitialScrollLeft(100, 620, 320, 140)).toBe(300);
  });

  it("does not scroll timelines that already fit in the viewport", () => {
    expect(overviewTimelineInitialScrollLeft(50, 620, 620, 140)).toBe(0);
  });
});
