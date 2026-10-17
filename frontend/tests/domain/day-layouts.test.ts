import { describe, expect, it } from "vitest";
import { dayGroupLabel, schedulePresentationFingerprint, groupScheduleCandidates, dayConfigurationFingerprint, BUILTIN_DAY_LAYOUTS, dayGroups, resolveDayLayout, schedulesEqual } from "../../src/velair/domain/day-layouts";
import { WEEKDAYS } from "../../src/velair/constants";
import { portableSectionsWithDependencies } from "../../src/velair/domain/portable";

describe("day layouts", () => {
  it("offers only the three builtins and falls back to individual days for older unknown references", () => {
    expect(BUILTIN_DAY_LAYOUTS.map((layout) => layout.key)).toEqual(["individual", "weekdays_weekend", "all"]);
    expect(dayGroups(undefined)).toEqual(WEEKDAYS.map((day) => [day]));
    expect(resolveDayLayout("missing").invalid).toBe(true);
    expect(resolveDayLayout(undefined).invalid).toBe(false);
    expect(dayGroups("weekdays_weekend")).toEqual([WEEKDAYS.slice(0, 5), WEEKDAYS.slice(5)]);
    expect(dayGroups("all")).toEqual([[...WEEKDAYS]]);
  });
  it("compares raw dependencies and canonicalizes key order", () => {
    const zone = { schedule: { monday: [{ start: "08:00", preset_key: "comfort" }], tuesday: [{ preset_key: "comfort", start: "08:00" }] } };
    expect(schedulesEqual(zone, ["monday", "tuesday"])).toBe(true);
    zone.schedule.tuesday[0].preset_key = "other";
    expect(schedulesEqual(zone, ["monday", "tuesday"])).toBe(false);
    expect(schedulesEqual({ schedule: {}, template_links: { monday: { template_key: "a", mode: "full" }, tuesday: { template_key: "b", mode: "full" } } }, ["monday", "tuesday"])).toBe(false);
  });
  it("formats the full targeted group independently of display week order", () => {
    expect(dayGroupLabel(WEEKDAYS.slice(0, 5), day => day, "all")).toBe("monday–friday");
    expect(dayGroupLabel(["sunday", "saturday"], day => day, "all")).toBe("saturday–sunday");
    expect(dayGroupLabel([...WEEKDAYS], day => day, "all")).toBe("all");
  });
  it("compares effective presentation without merging raw dependencies or hidden climate options", () => {
    const first = [{ start: "08:00", action: "set_temperature", temperature: 21, preset_key: "comfort", fan_mode: "quiet" }];
    const second = [{ start: "08:00", temperature: 21, preset_key: "eco", fan_mode: "quiet" }];
    expect(schedulePresentationFingerprint(first)).toBe(schedulePresentationFingerprint(second));
    expect(schedulesEqual({ schedule: { monday: first, tuesday: second } }, ["monday", "tuesday"])).toBe(false);
    expect(schedulePresentationFingerprint(first)).not.toBe(schedulePresentationFingerprint([{ ...second[0], fan_mode: "high" }]));
    expect(schedulePresentationFingerprint(undefined)).toBeUndefined();
  });
  it("does not export a layout library dependency", () => {
    expect([...portableSectionsWithDependencies(["zones"], { zones: { room: { day_layout_key: "legacy-custom" } } })]).toEqual(["zones"]);
    expect([...portableSectionsWithDependencies(["profiles"], { profiles: [{ zones: { room: { day_layout_key: "all" } } }] })]).toEqual(["profiles"]);
  });
});

describe("schedule candidates", () => {
  it("groups raw identical schedules in configured order and keeps different dependencies separate", () => {
    const zone = { schedule: Object.fromEntries(WEEKDAYS.map((day) => [day, day === "saturday" || day === "sunday" ? [] : [{ start: "08:00", preset_key: "comfort" }]])) };
    expect(groupScheduleCandidates(WEEKDAYS, (day) => dayConfigurationFingerprint(zone, day))).toEqual([
      { sourceDay: "monday", days: WEEKDAYS.slice(0, 5) }, { sourceDay: "saturday", days: WEEKDAYS.slice(5) },
    ]);
    const linked = { schedule: {}, template_links: {
      monday: { mode: "hours" as const, template_key: "a", bindings: { slot: { preset_key: "comfort" } } },
      tuesday: { mode: "hours" as const, template_key: "a", bindings: { slot: { preset_key: "other" } } },
      wednesday: { mode: "full" as const, template_key: "a" },
    } };
    expect(groupScheduleCandidates(["monday", "tuesday", "wednesday"], (day) => dayConfigurationFingerprint(linked, day))).toHaveLength(3);
    expect(groupScheduleCandidates(["sunday", ...WEEKDAYS.slice(0, 6)], (day) => dayConfigurationFingerprint(zone, day))[0]).toEqual({ sourceDay: "sunday", days: ["sunday", "saturday"] });
  });
});
