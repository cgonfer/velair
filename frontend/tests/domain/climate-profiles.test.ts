import { describe, expect, it } from "vitest";

import { PROFILE_DESCRIPTION_MAX_LENGTH, WEEKDAYS } from "../../src/velair/constants";
import {
  activeClimateProfileZoneEffect,
  climateProfileInput,
  climateProfileAccentColor,
  climateProfileValidationError,
  createClimateProfileDraft,
  effectiveClimateSchedule,
  nextProfileBlockStart,
  uniqueClimateProfileName,
  withProfileZoneBehavior,
} from "../../src/velair/domain/climate-profiles";

describe("climate profiles domain", () => {
  it("omits Normal zones and sends a complete week for scheduled zones", () => {
    let draft = createClimateProfileDraft();
    draft = { ...draft, name: "Away" };
    draft = withProfileZoneBehavior(draft, "climate.office", "normal");
    draft = withProfileZoneBehavior(draft, "climate.bedroom", "schedule");

    const input = climateProfileInput(draft);

    expect(input.zones["climate.office"]).toBeUndefined();
    expect(Object.keys(input.zones["climate.bedroom"].behavior === "schedule"
      ? input.zones["climate.bedroom"].schedule
      : {})).toEqual(WEEKDAYS);
  });

  it("rejects duplicate block times within a weekday", () => {
    let draft = withProfileZoneBehavior(createClimateProfileDraft(), "climate.office", "schedule");
    draft.name = "Holiday";
    const zone = draft.zones["climate.office"];
    if (zone.behavior === "schedule") {
      zone.schedule.monday = [
        { action: "set_temperature", start: "08:00", temperature: 20, hvac_mode: "" },
        { action: "set_temperature", start: "08:00", temperature: 21, hvac_mode: "" },
      ];
    }
    expect(climateProfileValidationError(draft)).toBe("schedule");
  });

  it("keeps pause actions explicit", () => {
    let draft = withProfileZoneBehavior(createClimateProfileDraft(), "climate.office", "pause");
    draft = { ...draft, name: "Sleep", zones: { "climate.office": { behavior: "pause", action: "turn_off" } } };
    expect(climateProfileInput(draft).zones["climate.office"]).toEqual({ behavior: "pause", action: "turn_off" });
  });

  it("chooses a distinct default time for consecutive blocks", () => {
    expect(nextProfileBlockStart([
      { start: "08:00", temperature: 20 },
      { start: "18:00", temperature: 21 },
    ])).toBe("22:00");
  });

  it("keeps all supported climate options when converting a profile draft", () => {
    let draft = withProfileZoneBehavior(createClimateProfileDraft(), "climate.office", "schedule");
    draft.name = "Work";
    const zone = draft.zones["climate.office"];
    if (zone.behavior === "schedule") {
      zone.schedule.monday = [{
        action: "set_temperature",
        start: "08:00",
        temperature: "21.5",
        hvac_mode: "heat",
        fan_mode: "auto",
        preset_mode: "eco",
        swing_mode: "on",
        swing_horizontal_mode: "middle",
        humidity: "45",
      }];
    }

    expect(climateProfileInput(draft).zones["climate.office"]).toMatchObject({
      behavior: "schedule",
      schedule: {
        monday: [{
          action: "set_temperature",
          start: "08:00",
          temperature: 21.5,
          hvac_mode: "heat",
          fan_mode: "auto",
          preset_mode: "eco",
          swing_mode: "on",
          swing_horizontal_mode: "middle",
          humidity: 45,
        }],
      },
    });
  });

  it("validates icon syntax and creates a unique default name", () => {
    const draft = { ...createClimateProfileDraft(), name: "Away", icon: "briefcase" };
    expect(climateProfileValidationError(draft)).toBe("icon");
    expect(uniqueClimateProfileName("New profile", [
      { key: "one", name: "New profile", zones: {} },
      { key: "two", name: "New profile 2", zones: {} },
    ])).toBe("New profile 3");
  });

  it("limits profile descriptions before they reach persistence", () => {
    const valid = {
      ...createClimateProfileDraft(),
      name: "Away",
      description: "a".repeat(PROFILE_DESCRIPTION_MAX_LENGTH),
    };
    expect(climateProfileValidationError(valid)).toBeUndefined();
    expect(climateProfileValidationError({
      ...valid,
      description: "a".repeat(PROFILE_DESCRIPTION_MAX_LENGTH + 1),
    })).toBe("description");
  });

  it("uses a persisted accent color and derives a stable fallback", () => {
    expect(climateProfileAccentColor("away")).toBe(climateProfileAccentColor("away"));
    expect(climateProfileAccentColor()).toBe("#546e7a");
    expect(climateProfileAccentColor("away", "#abcdef")).toBe("#abcdef");
    expect(climateProfileAccentColor("away")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("validates and serializes the profile color", () => {
    const draft = { ...createClimateProfileDraft(), name: "Away", color: "invalid" };
    expect(climateProfileValidationError(draft)).toBe("color");
    expect(climateProfileInput({ ...draft, color: "#ABCDEF" }).color).toBe("#abcdef");
  });

  it("resolves effective schedules and only reports zones changed by the active profile", () => {
    const normalSchedule = { monday: [{ start: "08:00", action: "set_temperature", temperature: 21 }] };
    const profileSchedule = { monday: [{ start: "09:00", action: "set_temperature", temperature: 18 }] };
    const data = {
      global: { mode: "auto", active_profile_id: "away" },
      zones: {
        "climate.normal": { enabled: true, schedule: normalSchedule },
        "climate.profiled": { enabled: true, schedule: normalSchedule },
        "climate.paused": { enabled: true, schedule: normalSchedule },
      },
      profiles: [{
        key: "away",
        name: "Away",
        zones: {
          "climate.profiled": { behavior: "schedule", schedule: profileSchedule },
          "climate.paused": { behavior: "pause", action: "none" },
        },
      }],
    } as never;

    expect(effectiveClimateSchedule(data, "climate.normal")).toBe(normalSchedule);
    expect(effectiveClimateSchedule(data, "climate.profiled")).toBe(profileSchedule);
    expect(effectiveClimateSchedule(data, "climate.paused")).toBeUndefined();
    expect(activeClimateProfileZoneEffect(data, "climate.normal")).toBeUndefined();
    expect(activeClimateProfileZoneEffect(data, "climate.profiled")?.profile.name).toBe("Away");
  });
});
