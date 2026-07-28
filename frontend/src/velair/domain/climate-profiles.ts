import { WEEKDAYS } from "../constants";
import {
  ACTION_SET_TEMPERATURE,
  ACTION_TURN_OFF,
  PROFILE_DESCRIPTION_MAX_LENGTH,
} from "../constants";
import { draftBlocksFromScheduleBlocks } from "./draft-blocks";
import type {
  ClimateProfile,
  ClimateProfileInput,
  ClimateProfileZone,
  DraftScheduleBlock,
  ScheduleBlock,
  ScheduleResponse,
} from "../types";

export type ClimateProfileDraftZone =
  | { behavior: "normal" }
  | { behavior: "schedule"; schedule: Record<string, DraftScheduleBlock[]> }
  | { behavior: "pause"; action: "none" | "turn_off" };

export type ClimateProfileDraft = Omit<ClimateProfile, "key" | "zones"> & {
  key?: string;
  zones: Record<string, ClimateProfileDraftZone>;
};

export function emptyProfileSchedule(): Record<string, DraftScheduleBlock[]> {
  return Object.fromEntries(WEEKDAYS.map((weekday) => [weekday, []]));
}

export function createClimateProfileDraft(profile?: ClimateProfile): ClimateProfileDraft {
  if (!profile) {
    return { name: "", icon: "mdi:account-outline", description: "", zones: {} };
  }
  return {
    ...structuredClone(profile),
    color: profile.color || climateProfileAccentColor(profile.key),
    zones: Object.fromEntries(Object.entries(profile.zones).map(([entityId, zone]) => [
      entityId,
      zone.behavior === "schedule"
        ? {
            behavior: "schedule",
            schedule: Object.fromEntries(WEEKDAYS.map((weekday) => [
              weekday,
              draftBlocksFromScheduleBlocks(zone.schedule[weekday] ?? []),
            ])),
          }
        : structuredClone(zone),
    ])),
  };
}

export function activeClimateProfiles(data?: ScheduleResponse): ClimateProfile[] {
  const profilesById = new Map(
    (data?.profiles ?? []).map((profile) => [profile.key, profile]),
  );
  return (data?.global?.active_profile_ids ?? [])
    .map((profileId) => profilesById.get(profileId))
    .filter((profile): profile is ClimateProfile => Boolean(profile));
}

export function activeClimateProfileZoneEffect(
  data: ScheduleResponse | undefined,
  entityId: string,
): { profile: ClimateProfile; zone: Exclude<ClimateProfileZone, { behavior: "normal" }> } | undefined {
  const profile = activeClimateProfiles(data).find(
    (activeProfile) => entityId in activeProfile.zones,
  );
  const zone = profile?.zones[entityId];
  if (!profile || !zone || zone.behavior === "normal") {
    return undefined;
  }
  return { profile, zone };
}

export function effectiveClimateSchedule(
  data: ScheduleResponse | undefined,
  entityId: string,
): Record<string, ScheduleBlock[]> | undefined {
  const effect = activeClimateProfileZoneEffect(data, entityId);
  if (effect?.zone.behavior === "pause") {
    return undefined;
  }
  if (effect?.zone.behavior === "schedule") {
    return effect.zone.schedule;
  }
  return data?.zones[entityId]?.schedule;
}

const PROFILE_ACCENT_COLORS = [
  "#3949ab",
  "#00897b",
  "#7b1fa2",
  "#d84315",
  "#00838f",
  "#c2185b",
  "#5d4037",
  "#2e7d32",
];

export function climateProfileAccentColor(key?: string, color?: string): string {
  if (color && /^#[0-9a-f]{6}$/i.test(color)) return color;
  if (!key) return "#546e7a";
  let hash = 0;
  for (const character of key) {
    hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }
  return PROFILE_ACCENT_COLORS[Math.abs(hash) % PROFILE_ACCENT_COLORS.length];
}

export function profileZoneBehavior(zone?: ClimateProfileDraftZone): ClimateProfileDraftZone["behavior"] {
  return zone?.behavior ?? "normal";
}

export function withProfileZoneBehavior(
  draft: ClimateProfileDraft,
  entityId: string,
  behavior: ClimateProfileDraftZone["behavior"],
): ClimateProfileDraft {
  const zones = { ...draft.zones };
  if (behavior === "normal") {
    delete zones[entityId];
  } else if (behavior === "schedule") {
    const existing = zones[entityId];
    zones[entityId] = {
      behavior,
      schedule: existing?.behavior === "schedule"
        ? completeProfileSchedule(existing.schedule)
        : emptyProfileSchedule(),
    };
  } else {
    zones[entityId] = { behavior, action: "none" };
  }
  return { ...draft, zones };
}

export function completeProfileSchedule(
  schedule?: Record<string, DraftScheduleBlock[]>,
): Record<string, DraftScheduleBlock[]> {
  return Object.fromEntries(WEEKDAYS.map((weekday) => [weekday, [...(schedule?.[weekday] ?? [])]]));
}

export function nextProfileBlockStart(blocks: Array<Pick<ScheduleBlock, "start">>): string {
  const used = new Set(blocks.map((block) => block.start));
  const preferred = ["08:00", "18:00", "22:00", "12:00", "06:00", "16:00", "20:00"];
  const available = preferred.find((start) => !used.has(start));
  if (available) return available;
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const start = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    if (!used.has(start)) return start;
  }
  return "00:00";
}

export function uniqueClimateProfileName(baseName: string, profiles: ClimateProfile[]): string {
  const existingNames = new Set(profiles.map((profile) => profile.name));
  if (!existingNames.has(baseName)) {
    return baseName;
  }
  let suffix = 2;
  while (existingNames.has(`${baseName} ${suffix}`)) {
    suffix += 1;
  }
  return `${baseName} ${suffix}`;
}

export function climateProfileValidationError(draft: ClimateProfileDraft): string | undefined {
  if (!draft.name.trim()) {
    return "name";
  }
  if (draft.icon?.trim() && !/^mdi:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.icon.trim())) {
    return "icon";
  }
  if (draft.color && !/^#[0-9a-f]{6}$/i.test(draft.color)) {
    return "color";
  }
  if ((draft.description?.trim().length ?? 0) > PROFILE_DESCRIPTION_MAX_LENGTH) {
    return "description";
  }
  for (const zone of Object.values(draft.zones)) {
    if (zone.behavior !== "schedule") {
      continue;
    }
    for (const weekday of WEEKDAYS) {
      const starts = new Set<string>();
      for (const block of zone.schedule[weekday] ?? []) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(block.start) || starts.has(block.start)) {
          return "schedule";
        }
        starts.add(block.start);
        if (block.action !== ACTION_TURN_OFF && !Number.isFinite(Number(block.temperature))) {
          return "schedule";
        }
      }
    }
  }
  return undefined;
}

export function climateProfileInput(draft: ClimateProfileDraft): ClimateProfileInput {
  const zones = Object.fromEntries(
    Object.entries(draft.zones)
      .filter(([, zone]) => zone.behavior !== "normal")
      .map(([entityId, zone]) => [entityId, zone.behavior === "schedule"
        ? {
            behavior: "schedule",
            schedule: Object.fromEntries(WEEKDAYS.map((weekday) => [
              weekday,
              (zone.schedule[weekday] ?? []).map(profileDraftBlockInput),
            ])),
          }
        : zone]),
  ) as Record<string, ClimateProfileZone>;
  return {
    ...(draft.key ? { key: draft.key } : {}),
    name: draft.name.trim(),
    ...(draft.icon?.trim() ? { icon: draft.icon.trim() } : {}),
    ...(draft.color ? { color: draft.color.toLowerCase() } : {}),
    ...(draft.description?.trim() ? { description: draft.description.trim() } : {}),
    zones,
  };
}

function profileDraftBlockInput(block: DraftScheduleBlock): ScheduleBlock {
  if ((block.action || ACTION_SET_TEMPERATURE) === ACTION_TURN_OFF) {
    return { start: block.start, action: ACTION_TURN_OFF };
  }
  return {
    start: block.start,
    action: ACTION_SET_TEMPERATURE,
    temperature: Number(block.temperature),
    ...(block.hvac_mode ? { hvac_mode: block.hvac_mode } : {}),
    ...(block.fan_mode ? { fan_mode: block.fan_mode } : {}),
    ...(block.preset_mode ? { preset_mode: block.preset_mode } : {}),
    ...(block.swing_mode ? { swing_mode: block.swing_mode } : {}),
    ...(block.swing_horizontal_mode ? { swing_horizontal_mode: block.swing_horizontal_mode } : {}),
    ...(String(block.humidity ?? "").trim() ? { humidity: Number(block.humidity) } : {}),
  };
}
