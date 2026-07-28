import { describe, expect, it } from "vitest";

import {
  activeProfileOrigin,
  createVelairModeDraft,
  modeValidationError,
} from "../../src/velair/domain/modes";
import type { ClimateProfile, ScheduleResponse } from "../../src/velair/types";

const modes = [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }];
const profiles = [
  { key: "away", name: "Away", zones: { "climate.salon": { behavior: "normal" as const } } },
  { key: "bedroom", name: "Bedroom", zones: { "climate.bedroom": { behavior: "normal" as const } } },
] satisfies ClimateProfile[];

describe("modes", () => {
  it("creates backend-independent empty and editable drafts", () => {
    expect(createVelairModeDraft()).toEqual({ name: "", profileIds: [] });
    expect(createVelairModeDraft(modes[0])).toEqual({ key: "vacation", name: "Vacation", profileIds: ["away"] });
  });

  it("validates required, bounded, unique, reserved, and mapped values", () => {
    expect(modeValidationError({ name: "", profileIds: [] }, modes)).toBe("name");
    expect(modeValidationError({ name: "Away\nmode", profileIds: ["away"] }, modes)).toBe("name");
    expect(modeValidationError({ name: "\tAway\t", profileIds: ["away"] }, modes)).toBe("name");
    expect(modeValidationError({ name: "x".repeat(256), profileIds: ["away"] }, modes)).toBe("length");
    expect(modeValidationError({ name: " vacation ", profileIds: ["away"] }, modes)).toBe("duplicate");
    expect(modeValidationError({ name: "MANUAL", profileIds: ["away"] }, modes)).toBe("duplicate");
    expect(modeValidationError({ name: "Default", profileIds: ["away"] }, modes)).toBe("duplicate");
    expect(modeValidationError({ name: "PREDETERMINADO", profileIds: ["away"] }, modes)).toBe("duplicate");
    expect(modeValidationError({ name: "unknown", profileIds: ["away"] }, modes)).toBe("duplicate");
    expect(modeValidationError({ name: "UNAVAILABLE", profileIds: ["away"] }, modes)).toBe("duplicate");
    expect(modeValidationError(
      { name: "STRASSE", profileIds: ["away"] },
      [...modes, { key: "street", name: "Straße", profile_ids: ["away"] }],
    )).toBe("duplicate");
    expect(modeValidationError({ name: "Home", profileIds: ["missing"] }, modes, profiles)).toBe("profile");
    expect(modeValidationError({ key: "vacation", name: "Vacation", profileIds: [] }, modes, profiles)).toBe("profile");
    expect(modeValidationError({ key: "vacation", name: "Vacation", profileIds: ["away", "bedroom"] }, modes, profiles)).toBeUndefined();
    expect(modeValidationError(
      { key: "vacation", name: "Vacation", profileIds: ["away", "duplicate"] },
      modes,
      [...profiles, { key: "duplicate", name: "Duplicate", zones: profiles[0].zones }],
    )).toBe("profile");
  });

  it("derives Default, custom, and Manual origins from backend state", () => {
    const base = {
      global: { mode: "running", active_profile_ids: ["away"] },
      modes: modes,
      active_mode_id: "vacation",
    } as unknown as ScheduleResponse;
    expect(activeProfileOrigin(base)).toEqual(modes[0]);
    expect(activeProfileOrigin({ ...base, active_mode_id: null })).toBe("manual");
    expect(activeProfileOrigin({ ...base, global: { mode: "running", active_profile_ids: [] } })).toBe("default");
  });
});
