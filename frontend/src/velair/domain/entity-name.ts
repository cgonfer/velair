import type { EntityNameDisplay, HassDeviceRegistryEntry, HassEntityNameItem, HomeAssistant, ScheduleResponse } from "../types";

type Presentation = { name: string; context?: string };
type Snapshot = {
  states: HomeAssistant["states"];
  entities: HomeAssistant["entities"];
  devices: HomeAssistant["devices"];
  areas: HomeAssistant["areas"];
  floors: HomeAssistant["floors"];
  formatter: HomeAssistant["formatEntityName"];
  connection: HomeAssistant["connection"];
  language?: string;
  selectedLanguage?: string;
  ids: string[];
  mode: EntityNameDisplay;
  values: Map<string, Presentation>;
};

// Bounded to the last immutable HA/configuration snapshot. Shared session facades
// are new objects on each access, but retain these underlying references.
let snapshot: Snapshot | undefined;

function nativeName(hass: HomeAssistant | undefined, id: string, part?: HassEntityNameItem): string | undefined {
  const state = hass?.states?.[id];
  if (!state || typeof hass?.formatEntityName !== "function") return undefined;
  try {
    const name = part ? hass.formatEntityName(state, part) : hass.formatEntityName(state);
    return typeof name === "string" && name.trim() ? name : undefined;
  } catch {
    // HA may still be installing its registry-aware formatter during startup.
    return undefined;
  }
}

function legacyName(hass: HomeAssistant | undefined, id: string, fallback?: string): string {
  return hass?.states?.[id]?.attributes?.friendly_name ?? fallback ?? nativeName(hass, id) ?? id;
}

function deviceName(device?: HassDeviceRegistryEntry): string | undefined {
  return (device?.name_by_user || device?.name)?.trim() || undefined;
}

function metadata(hass: HomeAssistant, id: string) {
  const entry = hass.entities?.[id];
  const device = entry?.device_id ? hass.devices?.[entry.device_id] : undefined;
  const parent = device?.parent_device_id ? hass.devices?.[device.parent_device_id] : undefined;
  const areaId = entry?.area_id || device?.area_id || parent?.area_id;
  const area = areaId ? hass.areas?.[areaId]?.name?.trim() || undefined : undefined;
  return { entry, device, parent, area };
}

function presentation(hass: HomeAssistant, id: string, mode: EntityNameDisplay): Presentation {
  const legacy = legacyName(hass, id);
  const { entry, device, parent, area } = metadata(hass, id);
  if (mode !== "entity_context" || !entry) return { name: legacy, context: area };
  const name = nativeName(hass, id, { type: "entity" });
  if (!name) return { name: legacy, context: area };

  // Match HA's picker: owners above an entity/device with its own area do not
  // contribute names. A main entity uses its device as its primary name.
  const ownName = entry.name ?? entry.original_name;
  const reachesDevice = entry.next_name_part === "device";
  const parentName = reachesDevice && device?.next_name_part === "parent_device" ? deviceName(parent) : undefined;
  const ownerName = ownName && reachesDevice ? deviceName(device) : undefined;
  return { name, context: [area, parentName, ownerName].filter(Boolean).join(" ▸ ") || undefined };
}

function key(value: string): string {
  return value.trim().toLowerCase();
}

function presentations(hass: HomeAssistant, data: ScheduleResponse, mode: EntityNameDisplay): Map<string, Presentation> {
  const ids = data.configured_entities;
  if (snapshot && snapshot.states === hass.states && snapshot.entities === hass.entities
    && snapshot.devices === hass.devices && snapshot.areas === hass.areas && snapshot.floors === hass.floors
    && snapshot.formatter === hass.formatEntityName && snapshot.connection === hass.connection
    && snapshot.language === hass.language && snapshot.selectedLanguage === hass.selectedLanguage
    && snapshot.ids === ids && snapshot.mode === mode) return snapshot.values;

  const values = new Map<string, Presentation>();
  const duplicates = new Map<string, string[]>();
  for (const id of new Set(ids)) {
    if (!id.startsWith("climate.")) continue;
    const value = presentation(hass, id, mode);
    values.set(id, value);
    const names = duplicates.get(key(value.name)) ?? [];
    names.push(id);
    duplicates.set(key(value.name), names);
  }
  for (const group of duplicates.values()) {
    if (group.length === 1) {
      values.get(group[0])!.context = undefined;
      continue;
    }
    const counts = new Map<string, number>();
    for (const id of group) {
      const context = values.get(id)!.context;
      if (context) counts.set(key(context), (counts.get(key(context)) ?? 0) + 1);
    }
    for (const id of group) {
      const value = values.get(id)!;
      if (!value.context) value.context = id;
      else if (counts.get(key(value.context))! > 1) value.context += ` ▸ ${id}`;
    }
  }
  snapshot = { states: hass.states, entities: hass.entities, devices: hass.devices, areas: hass.areas,
    floors: hass.floors, formatter: hass.formatEntityName, connection: hass.connection,
    language: hass.language, selectedLanguage: hass.selectedLanguage, ids, mode, values };
  return values;
}

function selectedPresentation(hass: HomeAssistant | undefined, id: string, data?: ScheduleResponse): Presentation | undefined {
  const mode = data?.settings?.entity_name_display ?? "legacy";
  if (!hass || !data || (mode !== "legacy_area" && mode !== "entity_context")) return undefined;
  return presentations(hass, data, mode).get(id);
}

/** The main label never contains area context or changes an entity identifier. */
export function entityName(hass: HomeAssistant | undefined, id: string, fallback?: string, data?: ScheduleResponse): string {
  return selectedPresentation(hass, id, data)?.name ?? legacyName(hass, id, fallback);
}

export function entityNameContext(hass: HomeAssistant | undefined, id: string, data?: ScheduleResponse): string | undefined {
  return selectedPresentation(hass, id, data)?.context;
}

/** Native selects cannot render a second line; keep context in their text label. */
export function entityLabel(hass: HomeAssistant | undefined, id: string, fallback?: string, data?: ScheduleResponse): string {
  const name = entityName(hass, id, fallback, data);
  const context = entityNameContext(hass, id, data);
  return context ? `${name} · ${context}` : name;
}
