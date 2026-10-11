import { describe, expect, it } from "vitest";
import { directPresetUseCount, groupPresetUsages, splitPresetUsages } from "../../src/velair/domain/preset-usages";
import type { PresetResourceUsage, ResourceUsage, ScheduleResponse } from "../../src/velair/types";

describe("preset usage grouping", () => {
  it("counts template references once and keeps inherited climates out of the direct count", () => {
    const usages: PresetResourceUsage[] = [
      { source: "template", template_key: "work", slot_id: "morning", start: "07:00" },
      { source: "template", template_key: "unused", slot_id: "night", start: "23:00" },
      { source: "default", entity_id: "climate.room", weekday: "monday", start: "07:00", template_key: "work", indirect: true },
      { source: "profile", profile_key: "winter", entity_id: "climate.room", weekday: "tuesday", start: "07:00", template_key: "work", indirect: true },
      { source: "default", entity_id: "climate.room", weekday: "friday", start: "08:00" },
    ];
    expect(directPresetUseCount(usages)).toBe(3);
    const split = splitPresetUsages(usages);
    expect([...split.templates.keys()]).toEqual(["work", "unused"]);
    expect(split.inherited.get("work")).toHaveLength(2);
    expect(split.direct).toEqual([usages[4]]);
    const groups = groupPresetUsages(undefined, "comfort", usages, ["monday", "tuesday", "friday"]);
    expect(groups).toHaveLength(1);
    expect(groups[0].entity_id).toBe("climate.room");
    expect(groups[0].count).toBe(3);
  });
  it("preserves every use and separates source identity while showing backend-resolved slot times", () => {
    const data = { profiles: [{ key: "a", name: "Office" }, { key: "b", name: "Office" }, { key: "default", name: "Default" }],
      resolved_block_metadata: { profiles: { a: { "climate.heat": { monday: [{ slot_id: "morning", preset_key: "summer", start: "07:30" }] } } } },
      resolved_profile_schedules: { a: { "climate.heat": { monday: [{ start: "07:30", action: "set_temperature", temperature: 21 }] } } },
    } as unknown as ScheduleResponse;
    const usages: ResourceUsage[] = [
      { source: "profile", profile_key: "a", entity_id: "climate.heat", weekday: "monday", slot_id: "morning", start: "07:00" },
      { source: "default", entity_id: "climate.heat", weekday: "wednesday", start: "23:00" },
      { source: "default", entity_id: "climate.heat", weekday: "monday", start: "07:00" },
      { source: "profile", profile_key: "b", entity_id: "climate.heat", weekday: "friday", start: "18:00" },
      { source: "profile", profile_key: "default", entity_id: "climate.heat", weekday: "tuesday", start: "08:00" },
      { source: "profile", profile_key: "missing", entity_id: "climate.heat", weekday: "thursday", start: "09:00" },
      { source: "default", entity_id: "climate.cool", weekday: "monday", start: "06:00" },
      { source: "default", entity_id: "climate.heat", weekday: "monday", start: "07:00" },
    ];
    const groups = groupPresetUsages(data, "summer", usages, ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]);
    expect(groups.map((group) => [group.entity_id, group.count])).toEqual([["climate.heat", 7], ["climate.cool", 1]]);
    expect(groups[0].sources.map((source) => [source.source, source.profile_key])).toEqual([["default", undefined], ["profile", "a"], ["profile", "b"], ["profile", "default"], ["profile", "missing"]]);
    expect(groups[0].sources[0].entries).toEqual([{ weekday: "monday", start: "07:00" }, { weekday: "monday", start: "07:00" }, { weekday: "wednesday", start: "23:00" }]);
    expect(groups[0].sources[1].entries[0].start).toBe("07:30");
    expect(groups.reduce((total, group) => total + group.sources.reduce((sum, source) => sum + source.entries.length, 0), 0)).toBe(usages.length);
  });
});
