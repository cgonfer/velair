import { describe, expect, it } from "vitest";
import { roomSensorScheduleDraft, roomSensorScheduleError, roomSensorSchedulesEqual } from "../../src/velair/domain/room-sensor-schedule";
import type { RoomSensorSchedule, RoomSensorSchedulePeriod } from "../../src/velair/types";

const period = (update: Partial<RoomSensorSchedulePeriod> = {}): RoomSensorSchedulePeriod => ({
  weekdays: ["monday"], start: "08:00", end: "17:00", source: "sensor.office", ...update,
});
const schedule = (...periods: RoomSensorSchedulePeriod[]): RoomSensorSchedule => ({
  enabled: true, default_source: null, periods,
});

describe("Room Assist sensor schedule drafts", () => {
  it("defaults to the saved fixed source without activating the feature", () => {
    expect(roomSensorScheduleDraft(undefined, "sensor.fixed")).toEqual({ enabled: false, default_source: "sensor.fixed", periods: [] });
    expect(roomSensorScheduleDraft(undefined, null).default_source).toBeNull();
  });
  it("does not mutate backend-owned settings while editing", () => {
    const saved = schedule(period());
    const draft = roomSensorScheduleDraft(saved, null);
    draft.periods[0].weekdays.push("tuesday"); draft.default_source = "sensor.other";
    expect(saved.periods[0].weekdays).toEqual(["monday"]);
    expect(saved.default_source).toBeNull();
  });
  it("allows native references, overnight periods and adjacent boundaries", () => {
    expect(roomSensorScheduleError(schedule(period({ source: null })))).toBeUndefined();
    expect(roomSensorScheduleError(schedule(period({ start: "22:00", end: "07:00" }), period({ weekdays: ["tuesday"], start: "07:00" })))).toBeUndefined();
  });
  it("rejects overlap after midnight and across the week boundary", () => {
    expect(roomSensorScheduleError(schedule(period({ start: "22:00", end: "07:00" }), period({ weekdays: ["tuesday"], start: "06:00" })))).toBe("roomSensorScheduleOverlap");
    expect(roomSensorScheduleError(schedule(period({ weekdays: ["sunday"], start: "22:00", end: "07:00" }), period({ start: "06:00" })))).toBe("roomSensorScheduleOverlap");
  });
  it.each([
    { weekdays: [] }, { weekdays: ["monday", "monday"] }, { weekdays: ["holiday"] },
    { start: "24:00" }, { end: "08:00" }, { source: "climate.room" }, { source: "sensor.bad name" },
  ])("rejects invalid period %j", update => {
    expect(roomSensorScheduleError(schedule(period(update)))).toBe("roomSensorScheduleInvalidPeriod");
  });
  it("accepts equivalent normalized backend ordering when completing a save", () => {
    const saved = schedule(period({ weekdays: ["tuesday", "monday"] }), period({ weekdays: ["wednesday"] }));
    const normalized = schedule(...saved.periods.toReversed().map(value => ({ ...value, weekdays: [...value.weekdays].sort() })));
    expect(roomSensorSchedulesEqual(saved, normalized)).toBe(true);
    normalized.enabled = false;
    expect(roomSensorSchedulesEqual(saved, normalized)).toBe(false);
  });
});
