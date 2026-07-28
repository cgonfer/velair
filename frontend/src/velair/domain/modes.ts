import { MODE_NAME_MAX_LENGTH } from "../constants";
import type { ClimateProfile, VelairMode, ScheduleResponse } from "../types";

export type VelairModeDraft = {
  key?: string;
  name: string;
  profileIds: string[];
};
const RESERVED_MODE_NAMES = new Set([
  "default",
  "predeterminado",
  "manual",
  "unknown",
  "unavailable",
]);

function foldModeName(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("ß", "ss")
    .replaceAll("ς", "σ");
}

export function createVelairModeDraft(mode?: VelairMode): VelairModeDraft {
  return mode
    ? { key: mode.key, name: mode.name, profileIds: [...mode.profile_ids] }
    : { name: "", profileIds: [] };
}

export function modeValidationError(
  draft: VelairModeDraft,
  modes: VelairMode[],
  profiles?: ClimateProfile[],
): "name" | "length" | "duplicate" | "profile" | undefined {
  const name = draft.name.trim();
  if (!name) return "name";
  if (/[\u0000-\u001F\u007F-\u009F]/u.test(draft.name)) return "name";
  if (name.length > MODE_NAME_MAX_LENGTH) return "length";
  const foldedName = foldModeName(name);
  if (RESERVED_MODE_NAMES.has(foldedName)
    || modes.some((mode) => mode.key !== draft.key && foldModeName(mode.name.trim()) === foldedName)) {
    return "duplicate";
  }
  if (!draft.profileIds.length || new Set(draft.profileIds).size !== draft.profileIds.length) {
    return "profile";
  }
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.key, profile]));
  const claimedZones = new Set<string>();
  for (const profileId of draft.profileIds) {
    const profile = profilesById.get(profileId);
    if (profiles && !profile) return "profile";
    for (const entityId of Object.keys(profile?.zones ?? {})) {
      if (claimedZones.has(entityId)) return "profile";
      claimedZones.add(entityId);
    }
  }
  return undefined;
}

export function activeProfileOrigin(data?: ScheduleResponse): "default" | "manual" | VelairMode {
  if (!(data?.global.active_profile_ids?.length)) return "default";
  return data.modes?.find((mode) => mode.key === data.active_mode_id) ?? "manual";
}
