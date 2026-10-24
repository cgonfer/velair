import { cloneWithTargetDrafts } from "./target-format-policy";
import { resolveDayLayout } from "./day-layouts";
import { WEEKDAYS } from "../constants";
import {
  ACTION_SET_CLIMATE_OPTIONS,
  ACTION_SET_HVAC_MODE,
  ACTION_SET_TEMPERATURE,
  ACTION_TURN_OFF,
  PROFILE_DESCRIPTION_MAX_LENGTH,
} from "../constants";
import { draftBlocksFromScheduleBlocks, draftBlockHasClimateOptions, draftBlockUsesRange } from "./draft-blocks";
import type {
  ClimateProfile,
  ClimateProfileInput,
  ClimateProfileZone,
  DraftScheduleBlock,
  ScheduleBlock,
  ScheduleResponse,
  TemplateLink,
} from "../types";

export type ClimateProfileDraftZone =
  | { behavior: "normal" }
  | { behavior: "schedule"; schedule: Record<string, DraftScheduleBlock[]>; day_layout_key?: string; template_links?: Record<string, TemplateLink> }
  | { behavior: "pause"; action: "none" | "turn_off" };

export type ClimateProfileDraft = Omit<ClimateProfile, "key" | "zones"> & {
  key?: string;
  zones: Record<string, ClimateProfileDraftZone>;
  rememberedSchedules: Record<string, Record<string, DraftScheduleBlock[]>>;
  rememberedDayLayouts?: Record<string, string>;
  rememberedTemplateLinks?: Record<string, Record<string, TemplateLink>>;
};

export function emptyProfileSchedule(): Record<string, DraftScheduleBlock[]> {
  return Object.fromEntries(WEEKDAYS.map((weekday) => [weekday, []]));
}

export function createClimateProfileDraft(profile?: ClimateProfile): ClimateProfileDraft {
  if (!profile) {
    return {
      name: "",
      icon: "mdi:account-outline",
      description: "",
      zones: {},
      rememberedSchedules: {},
    };
  }
  const zones = Object.fromEntries(Object.entries(profile.zones).map(([entityId, zone]) => [
    entityId,
    zone.behavior === "schedule"
      ? {
          behavior: "schedule",
          ...(zone.day_layout_key ? { day_layout_key: resolveDayLayout(zone.day_layout_key).layout.key } : {}),
          template_links: cloneWithTargetDrafts(zone.template_links ?? {}),
          schedule: Object.fromEntries(WEEKDAYS.map((weekday) => [
            weekday,
            draftBlocksFromScheduleBlocks(zone.schedule[weekday] ?? []),
          ])),
        }
      : cloneWithTargetDrafts(zone),
  ])) as Record<string, ClimateProfileDraftZone>;
  return {
    ...cloneWithTargetDrafts(profile),
    color: profile.color || climateProfileAccentColor(profile.key),
    zones,
    rememberedSchedules: Object.fromEntries(
      Object.entries(zones)
        .filter(([, zone]) => zone.behavior === "schedule")
        .map(([entityId, zone]) => [
          entityId,
          cloneProfileSchedule(
            (zone as Extract<ClimateProfileDraftZone, { behavior: "schedule" }>).schedule,
          ),
        ]),
    ),
  };
}

export function activeClimateProfiles(data?: ScheduleResponse): ClimateProfile[] {
  const profilesById = new Map(
    (data?.profiles ?? []).map((profile) => [profile.key, profile]),
  );
  const effectiveIds = data?.profile_selection
    ? [...new Set((data.profiles ?? []).flatMap((profile) => Object.keys(profile.zones))
      .map((entityId) => effectiveZoneProfileId(data, entityId)).filter((id): id is string => id !== null))]
    : data?.global?.active_profile_ids ?? [];
  return (data?.effective_profile_ids ?? effectiveIds)
    .map((profileId) => profilesById.get(profileId))
    .filter((profile): profile is ClimateProfile => Boolean(profile));
}

/** Resolve ownership separately from behavior: explicit Default still claims a zone. */
export function effectiveZoneProfileId(data: ScheduleResponse | undefined, entityId: string): string | null {
  if (data?.effective_zone_profiles && entityId in data.effective_zone_profiles) return data.effective_zone_profiles[entityId];
  const selection = data?.profile_selection;
  if (selection && entityId in selection.zone_profile_overrides) return selection.zone_profile_overrides[entityId];
  const baseIds = selection?.base_profile_ids ?? data?.global?.active_profile_ids ?? [];
  return data?.profiles?.find((profile) => baseIds.includes(profile.key) && entityId in profile.zones)?.key ?? null;
}

export function activeClimateProfileZoneEffect(
  data: ScheduleResponse | undefined,
  entityId: string,
): { profile: ClimateProfile; zone: Exclude<ClimateProfileZone, { behavior: "normal" }> } | undefined {
  const profileId = effectiveZoneProfileId(data, entityId);
  const profile = data?.profiles?.find((candidate) => candidate.key === profileId);
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
  if (data?.effective_schedules && entityId in data.effective_schedules) return data.effective_schedules[entityId] ?? undefined;
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

export function profileZoneBehavior(zone?: ClimateProfileDraftZone): ClimateProfileDraftZone["behavior"] | "unconfigured" {
  return zone?.behavior ?? "unconfigured";
}

export function withProfileZoneBehavior(
  draft: ClimateProfileDraft,
  entityId: string,
  behavior: ClimateProfileDraftZone["behavior"] | "unconfigured",
): ClimateProfileDraft {
  const zones = { ...draft.zones };
  const rememberedSchedules = { ...draft.rememberedSchedules };
  const rememberedTemplateLinks = cloneWithTargetDrafts(draft.rememberedTemplateLinks ?? {});
  const rememberedDayLayouts = { ...draft.rememberedDayLayouts };
  const existing = zones[entityId];
  if (existing?.behavior === "schedule") {
    rememberedSchedules[entityId] = cloneProfileSchedule(existing.schedule);
    rememberedDayLayouts[entityId] = existing.day_layout_key ?? "individual";
    rememberedTemplateLinks[entityId] = cloneWithTargetDrafts(existing.template_links ?? {});
  }
  if (behavior === "unconfigured") {
    delete zones[entityId];
  } else if (behavior === "normal") {
    zones[entityId] = { behavior: "normal" };
  } else if (behavior === "schedule") {
    const links = existing?.behavior === "schedule" ? existing.template_links : rememberedTemplateLinks[entityId];
    zones[entityId] = {
      behavior,
      day_layout_key: existing?.behavior === "schedule" ? existing.day_layout_key ?? "individual" : rememberedDayLayouts[entityId] ?? "individual",
      ...(links && Object.keys(links).length ? { template_links: cloneWithTargetDrafts(links) } : {}),
      schedule: cloneProfileSchedule(
        existing?.behavior === "schedule"
          ? existing.schedule
          : rememberedSchedules[entityId],
      ),
    };
  } else {
    zones[entityId] = { behavior, action: "none" };
  }
  return { ...draft, zones, rememberedSchedules, rememberedTemplateLinks, rememberedDayLayouts };
}

export function cloneProfileSchedule(
  schedule?: Record<string, DraftScheduleBlock[]>,
): Record<string, DraftScheduleBlock[]> {
  return Object.fromEntries(WEEKDAYS.map((weekday) => [
    weekday,
    cloneWithTargetDrafts(schedule?.[weekday] ?? []),
  ]));
}

export function cloneProfileScheduleDay(
  schedule: Record<string, DraftScheduleBlock[]>,
  sourceWeekday: string,
  targetWeekdays: Iterable<string>,
): Record<string, DraftScheduleBlock[]> {
  const nextSchedule = cloneProfileSchedule(schedule);
  for (const weekday of targetWeekdays) {
    if (weekday !== sourceWeekday && weekday in nextSchedule) {
      nextSchedule[weekday] = cloneWithTargetDrafts(schedule[sourceWeekday] ?? []);
    }
  }
  return nextSchedule;
}

export function cloneProfileDayToClimates(
  draft: ClimateProfileDraft,
  sourceEntityId: string,
  weekday: string,
  targetEntityIds: Iterable<string>,
): ClimateProfileDraft {
  const sourceZone = draft.zones[sourceEntityId];
  if (sourceZone?.behavior !== "schedule" || !WEEKDAYS.includes(weekday)) return draft;
  const zones = { ...draft.zones };
  const rememberedSchedules = { ...draft.rememberedSchedules };
  const rememberedTemplateLinks = cloneWithTargetDrafts(draft.rememberedTemplateLinks ?? {});
  for (const entityId of targetEntityIds) {
    if (entityId === sourceEntityId) continue;
    const existing = zones[entityId];
    const schedule = cloneProfileSchedule(
      existing?.behavior === "schedule"
        ? existing.schedule
        : rememberedSchedules[entityId],
    );
    const links = cloneWithTargetDrafts(existing?.behavior === "schedule" ? existing.template_links ?? {} : rememberedTemplateLinks[entityId] ?? {});
    const sourceLink = sourceZone.template_links?.[weekday];
    if (sourceLink) links[weekday] = cloneWithTargetDrafts(sourceLink);
    else delete links[weekday];
    schedule[weekday] = sourceLink ? [] : cloneWithTargetDrafts(sourceZone.schedule[weekday] ?? []);
    zones[entityId] = { behavior: "schedule", schedule, template_links: links, day_layout_key: existing?.behavior === "schedule" ? existing.day_layout_key : draft.rememberedDayLayouts?.[entityId] };
    rememberedSchedules[entityId] = cloneProfileSchedule(schedule);
    rememberedTemplateLinks[entityId] = cloneWithTargetDrafts(links);
  }
  return { ...draft, zones, rememberedSchedules, rememberedTemplateLinks };
}

export function cloneProfileDayToDays(
  draft: ClimateProfileDraft,
  entityId: string,
  sourceWeekday: string,
  targetWeekdays: Iterable<string>,
): ClimateProfileDraft {
  const zone = draft.zones[entityId];
  if (zone?.behavior !== "schedule" || !WEEKDAYS.includes(sourceWeekday)) return draft;
  const schedule = cloneProfileSchedule(zone.schedule);
  const links = cloneWithTargetDrafts(zone.template_links ?? {});
  const sourceLink = zone.template_links?.[sourceWeekday];
  for (const target of targetWeekdays) {
    if (target === sourceWeekday || !WEEKDAYS.includes(target)) continue;
    schedule[target] = sourceLink ? [] : cloneWithTargetDrafts(zone.schedule[sourceWeekday] ?? []);
    if (sourceLink) links[target] = cloneWithTargetDrafts(sourceLink);
    else delete links[target];
  }
  return { ...draft, zones: { ...draft.zones, [entityId]: { ...zone, schedule, template_links: links } },
    rememberedSchedules: { ...draft.rememberedSchedules, [entityId]: cloneProfileSchedule(schedule) },
    rememberedTemplateLinks: { ...draft.rememberedTemplateLinks, [entityId]: cloneWithTargetDrafts(links) } };
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
        if (block.preset_key) continue;
        if (block.action === ACTION_SET_HVAC_MODE) {
          if (!block.hvac_mode || block.hvac_mode === "off") return "schedule";
        } else if (block.action === ACTION_SET_CLIMATE_OPTIONS) {
          if (!draftBlockHasClimateOptions(block) || (String(block.humidity ?? "").trim()
            && !Number.isFinite(Number(block.humidity)))) return "schedule";
        } else if (block.action !== ACTION_TURN_OFF) {
          const validTarget = draftBlockUsesRange(block)
            ? Number.isFinite(Number(block.target_temp_low))
              && Number.isFinite(Number(block.target_temp_high))
              && Number(block.target_temp_low) <= Number(block.target_temp_high)
            : Number.isFinite(Number(block.temperature));
          if (!validTarget) return "schedule";
        }
      }
    }
  }
  return undefined;
}

export function climateProfileInput(draft: ClimateProfileDraft): ClimateProfileInput {
  const zones = Object.fromEntries(
    Object.entries(draft.zones)
      .map(([entityId, zone]) => [entityId, zone.behavior === "schedule"
        ? {
            behavior: "schedule",
            ...(zone.day_layout_key ? { day_layout_key: resolveDayLayout(zone.day_layout_key).layout.key } : {}),
            template_links: cloneWithTargetDrafts(zone.template_links ?? {}),
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

export function profileDraftBlockInput(block: DraftScheduleBlock): ScheduleBlock {
  if (block.preset_key) return { start: block.start, preset_key: block.preset_key };
  if ((block.action || ACTION_SET_TEMPERATURE) === ACTION_TURN_OFF) {
    return { start: block.start, action: ACTION_TURN_OFF };
  }
  if ((block.action || ACTION_SET_TEMPERATURE) === ACTION_SET_HVAC_MODE) {
    return {
      start: block.start,
      action: ACTION_SET_HVAC_MODE,
      ...(block.hvac_mode ? { hvac_mode: block.hvac_mode } : {}),
    };
  }
  return {
    start: block.start,
    action: block.action === ACTION_SET_CLIMATE_OPTIONS ? ACTION_SET_CLIMATE_OPTIONS : ACTION_SET_TEMPERATURE,
    ...(block.action === ACTION_SET_CLIMATE_OPTIONS ? {} : draftBlockUsesRange(block)
      ? {
          target_temp_low: Number(block.target_temp_low),
          target_temp_high: Number(block.target_temp_high),
        }
      : { temperature: Number(block.temperature) }),
    ...(block.temperature_only ? { temperature_only: true } : {}),
    ...(block.action !== ACTION_SET_CLIMATE_OPTIONS && block.hvac_mode ? { hvac_mode: block.hvac_mode } : {}),
    ...(block.fan_mode ? { fan_mode: block.fan_mode } : {}),
    ...(block.preset_mode ? { preset_mode: block.preset_mode } : {}),
    ...(block.swing_mode ? { swing_mode: block.swing_mode } : {}),
    ...(block.swing_horizontal_mode ? { swing_horizontal_mode: block.swing_horizontal_mode } : {}),
    ...(String(block.humidity ?? "").trim() ? { humidity: Number(block.humidity) } : {}),
  };
}
