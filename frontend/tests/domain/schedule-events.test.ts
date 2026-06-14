import { describe, expect, it } from "vitest";

import { ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../../src/velair/constants";
import { eventDateTime, nextEventForZone, scheduledEventAt, weekdayForDate } from "../../src/velair/domain/schedule-events";
import type { ScheduleZone } from "../../src/velair/types";

const emptySchedule = () => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
});

describe("schedule event calculations", () => {
  it("finds the active block at a specific resume time", () => {
    const zone: ScheduleZone = {
      enabled: true,
      schedule: {
        ...emptySchedule(),
        monday: [
          { action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 20, hvac_mode: "heat" },
          { action: ACTION_TURN_OFF, start: "22:00" },
        ],
      },
    };

    const event = scheduledEventAt("climate.office", zone, new Date(2026, 5, 8, 13, 30));

    expect(event).toMatchObject({
      entity_id: "climate.office",
      start: "08:00",
      temperature: 20,
      hvac_mode: "heat",
      weekday: "monday",
    });
  });

  it("uses the schedule at boost resume time before looking for a later event", () => {
    const zone: ScheduleZone = {
      enabled: true,
      schedule: {
        ...emptySchedule(),
        monday: [{ action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 21, hvac_mode: "heat" }],
        tuesday: [{ action: ACTION_TURN_OFF, start: "07:00" }],
      },
    };
    const boost = { type: "boost", temperature: 23, until: new Date(2026, 5, 8, 14, 0).toISOString() };

    const event = nextEventForZone("climate.office", zone, boost, new Date(2026, 5, 8, 10, 0));

    expect(event).toMatchObject({
      start: "08:00",
      temperature: 21,
      hvac_mode: "heat",
      weekday: "monday",
    });
  });

  it("skips disabled zones and invalid event times", () => {
    const zone: ScheduleZone = {
      enabled: true,
      schedule: {
        ...emptySchedule(),
        monday: [{ action: ACTION_SET_TEMPERATURE, start: "25:00", temperature: 19 }],
        tuesday: [{ action: ACTION_SET_TEMPERATURE, start: "09:00", temperature: 20 }],
      },
    };

    expect(nextEventForZone("climate.office", { ...zone, enabled: false }, undefined, new Date(2026, 5, 8, 10, 0))).toBeUndefined();
    expect(nextEventForZone("climate.office", zone, undefined, new Date(2026, 5, 8, 10, 0))).toMatchObject({
      start: "09:00",
      weekday: "tuesday",
    });
  });

  it("maps dates and valid times consistently", () => {
    expect(weekdayForDate(new Date(2026, 5, 8))).toBe("monday");
    expect(weekdayForDate(new Date(2026, 5, 14))).toBe("sunday");
    expect(eventDateTime(new Date(2026, 5, 8), "07:30")?.getHours()).toBe(7);
    expect(eventDateTime(new Date(2026, 5, 8), "24:00")).toBeUndefined();
  });
});
