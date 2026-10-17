import type { ClimateProfile, ScheduleResponse } from "../types";

/** Describe persisted selection, independently from which schedules currently have blocks. */
export function activeSetupSummary(data?: ScheduleResponse) {
  const profiles = data?.profiles ?? [];
  const ids = data?.profile_selection?.base_profile_ids ?? data?.global.active_profile_ids ?? [];
  const modeId = data?.profile_selection ? data.profile_selection.base_mode_id : data?.active_mode_id;
  const mode = data?.modes?.find((candidate) => candidate.key === modeId);
  const baseProfiles = ids.map((id) => profiles.find((profile) => profile.key === id))
    .filter((profile): profile is ClimateProfile => Boolean(profile));
  const overrides = data?.profile_selection?.zone_profile_overrides ?? {};
  const managed = new Set(data?.configured_entities ?? []);
  const covered = mode || ids.length ? new Set(baseProfiles.flatMap((profile) => Object.keys(profile.zones))
    .filter((entityId) => managed.has(entityId))) : managed;
  const active = [...covered].filter((entityId) => !Object.prototype.hasOwnProperty.call(overrides, entityId)).length;
  const total = covered.size;
  const segments = new Map<string, { origin: "base" | "exception" | "default"; profileId: string | null; count: number }>();
  for (const entityId of managed) {
    const origin = Object.prototype.hasOwnProperty.call(overrides, entityId) ? "exception" as const
      : covered.has(entityId) ? "base" as const : "default" as const;
    const profileId = origin === "exception" ? overrides[entityId]
      : baseProfiles.find((profile) => entityId in profile.zones)?.key ?? null;
    const key = JSON.stringify([origin, profileId]);
    const segment = segments.get(key);
    if (segment) segment.count += 1;
    else segments.set(key, { origin, profileId, count: 1 });
  }
  const groups = new Map<string | null, string[]>();
  for (const [entityId, profileId] of Object.entries(overrides)) {
    if (managed.has(entityId)) groups.set(profileId, [...(groups.get(profileId) ?? []), entityId]);
  }
  return {
    baseKind: mode ? "mode" as const : ids.length === 0 ? "default" as const : ids.length === 1 ? "profile" as const : "profiles" as const,
    mode, baseProfiles, baseProfileIds: ids,
    baseCoverage: { active, total, status: total === 0 ? "empty" as const : active === 0 ? "masked" as const : active === total ? "full" as const : "partial" as const },
    distributionTotal: managed.size,
    coverageSegments: [...segments.values()]
      .sort((left, right) => ["base", "exception", "default"].indexOf(left.origin) - ["base", "exception", "default"].indexOf(right.origin))
      .map((segment) => ({ ...segment, profile: profiles.find((profile) => profile.key === segment.profileId) })),
    exceptionGroups: [...groups].map(([profileId, entityIds]) => ({
      profileId, entityIds, profile: profiles.find((profile) => profile.key === profileId),
    })),
    overrideIds: Object.keys(overrides).filter((entityId) => managed.has(entityId)),
  };
}
