import { describe, expect, it } from "vitest";
import { activeSetupSummary } from "../../src/velair/domain/active-setup";
import type { ScheduleResponse } from "../../src/velair/types";

const profiles = [
  { key: "winter", name: "Winter", zones: { "climate.office": { behavior: "normal" }, "climate.bedroom": { behavior: "normal" } } },
  { key: "work", name: "Work", zones: { "climate.office": { behavior: "normal" } } },
  { key: "empty", name: "Empty routine", zones: {} },
];
function state(baseIds: string[], overrides: Record<string, string | null> = {}, modeId: string | null = null) {
  return { profiles, configured_entities: ["climate.office", "climate.bedroom", "climate.study"], modes: [{ key: "season", name: "Winter season", profile_ids: ["winter"] }],
    global: { active_profile_ids: baseIds },
    profile_selection: { base_profile_ids: baseIds, base_mode_id: modeId, zone_profile_overrides: overrides },
  } as unknown as ScheduleResponse;
}

describe("Active setup presentation", () => {
  it("identifies Mode, direct Profile, multiple Profiles and Default bases", () => {
    expect(activeSetupSummary(state(["winter"], {}, "season"))).toMatchObject({ baseKind: "mode", mode: { name: "Winter season" } });
    expect(activeSetupSummary(state(["winter"]))).toMatchObject({ baseKind: "profile", baseProfiles: [profiles[0]] });
    expect(activeSetupSummary(state(["winter", "empty"]))).toMatchObject({ baseKind: "profiles", baseProfiles: [profiles[0], profiles[2]] });
    expect(activeSetupSummary(state([]))).toMatchObject({ baseKind: "default", exceptionGroups: [] });
  });

  it("groups only explicit overrides and distinguishes null Default from a Profile with normal behavior", () => {
    const summary = activeSetupSummary(state(["winter"], {
      "climate.office": "work", "climate.study": "work", "climate.bedroom": null,
    }));
    expect(summary.exceptionGroups).toEqual([
      { profileId: "work", entityIds: ["climate.office", "climate.study"], profile: profiles[1] },
      { profileId: null, entityIds: ["climate.bedroom"], profile: undefined },
    ]);
  });

  it("keeps an explicit same-Profile override and preserves a completely masked or empty base", () => {
    const masked = activeSetupSummary(state(["winter"], { "climate.office": "winter", "climate.bedroom": null }));
    expect(masked.baseProfiles).toEqual([profiles[0]]);
    expect(masked.exceptionGroups.map((group) => group.profileId)).toEqual(["winter", null]);
    expect(activeSetupSummary(state(["empty"])).baseProfiles).toEqual([profiles[2]]);
  });

  it("uses legacy base state when structured selection is absent and respects explicit null mode identity", () => {
    const legacy = state(["winter"]);
    delete legacy.profile_selection;
    legacy.active_mode_id = "season";
    expect(activeSetupSummary(legacy)).toMatchObject({ baseKind: "mode", exceptionGroups: [] });
    expect(activeSetupSummary({ ...legacy, profile_selection: state(["winter"]).profile_selection }).baseKind).toBe("profile");
    expect(activeSetupSummary()).toMatchObject({ baseKind: "default", exceptionGroups: [] });
  });
});


describe("Base coverage attribution", () => {
  const managed = ["climate.office", "climate.office", "climate.bedroom", "climate.other"];
  it("counts unique managed zones claimed by the base, including explicit Default participation", () => {
    const data = { ...state(["winter"]), configured_entities: managed };
    // "normal" is the persisted explicit Default behavior; it still claims bedroom.
    data.profiles = data.profiles!.map((profile) => profile.key === "winter" ? { ...profile,
      zones: { "climate.office": { behavior: "pause", action: "none" }, "climate.bedroom": { behavior: "normal" } },
    } : profile);
    expect(activeSetupSummary(data).baseCoverage).toEqual({ active: 2, total: 2, status: "full" });
    expect(activeSetupSummary({ ...data, profile_selection: { ...data.profile_selection!,
      zone_profile_overrides: { "climate.other": null } } }).baseCoverage)
      .toEqual({ active: 2, total: 2, status: "full" });
    // The third zone follows Default outside this Profile and does not belong to its coverage.
    expect(activeSetupSummary({ ...data, configured_entities: ["climate.office"] }).baseCoverage.total).toBe(1);
  });
  it("distinguishes absent overrides from null and explicit same-Profile overrides", () => {
    expect(activeSetupSummary({ ...state(["winter"], { "climate.office": null }), configured_entities: managed }).baseCoverage)
      .toEqual({ active: 1, total: 2, status: "partial" });
    expect(activeSetupSummary({ ...state(["winter"], { "climate.office": "winter", "climate.bedroom": null }), configured_entities: managed }).baseCoverage)
      .toEqual({ active: 0, total: 2, status: "masked" });
    expect(activeSetupSummary({ ...state(["empty"]), configured_entities: managed }).baseCoverage)
      .toEqual({ active: 0, total: 0, status: "empty" });
  });
  it("covers all managed zones for a Default base while excluding explicit exceptions by provenance", () => {
    expect(activeSetupSummary({ ...state([], { "climate.office": null }), configured_entities: managed }).baseCoverage)
      .toEqual({ active: 2, total: 3, status: "partial" });
    expect(activeSetupSummary({ ...state([]), configured_entities: [] }).baseCoverage.status).toBe("empty");
  });
  it("unions multiple base Profiles and supports Mode and legacy selection", () => {
    const mode = { ...state(["winter", "work"], {}, "season"), configured_entities: managed };
    expect(activeSetupSummary(mode).baseCoverage).toEqual({ active: 2, total: 2, status: "full" });
    const legacy = { ...mode }; delete legacy.profile_selection;
    expect(activeSetupSummary(legacy).baseCoverage).toEqual({ active: 2, total: 2, status: "full" });
  });
});


describe("Coverage bar segments", () => {
  const compact = (data: ScheduleResponse) => activeSetupSummary(data).coverageSegments.map(({ origin, profileId, count }) => ({ origin, profileId, count }));
  it("segments each Mode component and all managed exceptions", () => {
    const data = { ...state(["work", "sleep"], { "climate.study": "remote", "climate.guest": "remote" }, "season"),
      configured_entities: ["climate.office", "climate.study", "climate.bedroom", "climate.guest", "climate.office"],
      profiles: [
        { key: "work", name: "Work", zones: { "climate.office": { behavior: "normal" }, "climate.study": { behavior: "normal" } } },
        { key: "sleep", name: "Sleep", zones: { "climate.bedroom": { behavior: "normal" } } },
        { key: "remote", name: "Remote", zones: { "climate.study": { behavior: "normal" }, "climate.guest": { behavior: "normal" } } },
      ],
    } as unknown as ScheduleResponse;
    expect(compact(data)).toEqual([
      { origin: "base", profileId: "work", count: 1 },
      { origin: "base", profileId: "sleep", count: 1 },
      { origin: "exception", profileId: "remote", count: 2 },
    ]);
    const summary = activeSetupSummary(data);
    expect(summary.coverageSegments.reduce((sum, segment) => sum + segment.count, 0)).toBe(summary.distributionTotal);
  });
  it("retains different provenance for the same Profile and separates neutral Default overrides", () => {
    const managed = ["climate.office", "climate.bedroom", "climate.other"];
    expect(compact({ ...state(["winter"], { "climate.office": "winter" }), configured_entities: managed })).toEqual([
      { origin: "base", profileId: "winter", count: 1 }, { origin: "exception", profileId: "winter", count: 1 },
      { origin: "default", profileId: null, count: 1 },
    ]);
    expect(compact({ ...state([], { "climate.office": "winter", "climate.bedroom": null }), configured_entities: managed })).toEqual([
      { origin: "base", profileId: null, count: 1 }, { origin: "exception", profileId: "winter", count: 1 },
      { origin: "exception", profileId: null, count: 1 },
    ]);
  });
  it("omits zero segments when fully overridden or when the base has no included zones", () => {
    const managed = ["climate.office", "climate.bedroom"];
    const masked = { ...state(["winter"], { "climate.office": null, "climate.bedroom": null }), configured_entities: managed };
    expect(compact(masked)).toEqual([{ origin: "exception", profileId: null, count: 2 }]);
    expect(compact({ ...state(["empty"]), configured_entities: managed })).toEqual([{ origin: "default", profileId: null, count: 2 }]);
  });
});


it("partitions the entire managed house while keeping Base coverage and exception counts consistent", () => {
  const entities = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => `climate.${id}`);
  const zones = Object.fromEntries(entities.slice(0, 6).map((id) => [id, { behavior: "normal" }]));
  const data = { ...state(["winter"], {
    "climate.g": "work", "climate.c": "visit", "climate.d": "visit", "climate.e": "visit", "climate.f": "visit", "climate.unmanaged": "work",
  }), configured_entities: [...entities, "climate.a"], profiles: [
    { key: "winter", name: "Winter", zones }, { key: "work", name: "Work", zones: {} }, { key: "visit", name: "Visit", zones: {} },
  ] } as unknown as ScheduleResponse;
  const summary = activeSetupSummary(data);
  expect(summary.baseCoverage).toMatchObject({ active: 2, total: 6 });
  expect(summary.distributionTotal).toBe(8);
  expect(summary.coverageSegments.map(({ origin, profileId, count }) => ({ origin, profileId, count }))).toEqual([
    { origin: "base", profileId: "winter", count: 2 }, { origin: "exception", profileId: "visit", count: 4 },
    { origin: "exception", profileId: "work", count: 1 }, { origin: "default", profileId: null, count: 1 },
  ]);
  expect(summary.coverageSegments.reduce((total, segment) => total + segment.count, 0)).toBe(8);
  for (const group of summary.exceptionGroups) {
    expect(summary.coverageSegments.find((segment) => segment.origin === "exception" && segment.profileId === group.profileId)?.count).toBe(group.entityIds.length);
  }
  expect(summary.exceptionGroups.flatMap((group) => group.entityIds)).not.toContain("climate.unmanaged");
  const empty = activeSetupSummary({ ...state(["empty"], {}, "season"), configured_entities: entities });
  expect(empty.baseCoverage.total).toBe(0);
  expect(empty.coverageSegments).toMatchObject([{ origin: "default", profileId: null, count: 8 }]);
  expect(activeSetupSummary({ ...data, configured_entities: [] })).toMatchObject({ distributionTotal: 0, coverageSegments: [], exceptionGroups: [] });
});
