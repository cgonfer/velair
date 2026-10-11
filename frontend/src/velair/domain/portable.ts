import { PORTABLE_FORMAT, PORTABLE_MODEL_VERSION, PORTABLE_SECTIONS } from "../constants";
import type { PortableSection, VelairPortablePayload } from "../types";

export type PortableValidationResult =
  | {
      ok: true;
      sections: PortableSection[];
    }
  | {
      ok: false;
      errorKey: "invalidImportFile" | "legacyImportTemperatureUnit" | "noImportSections";
    };

export type PortableSummaryValue = number | "included";

export type PortableSummaryItem = {
  section: PortableSection;
  value: PortableSummaryValue;
};

/** Select reference libraries alongside their consumers; resolution stays in the backend. */
export function portableSectionsWithDependencies(
  selected: Iterable<PortableSection>,
  data: unknown,
): Set<PortableSection> {
  const result = new Set(selected);
  const source = data && typeof data === "object" ? data as Record<string, unknown> : {};
  if (result.has("planned_return")) {
    const routine = source.planned_return as { away_mode_id?: string; destination_mode_id?: string } | undefined;
    if ([routine?.away_mode_id, routine?.destination_mode_id].some((key) => key && key !== "default")) {
      result.add("modes"); result.add("profiles");
    }
  }
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.template_key === "string") result.add("templates");
    if (typeof record.preset_key === "string") result.add("block_presets");
    Object.values(record).forEach(visit);
  };
  for (const section of result) visit(source[section]);
  return result;
}

export function validatePortablePayload(payload: VelairPortablePayload): PortableValidationResult {
  const modelVersion = Number(payload?.model_version);
  const declaredUnit = payload?.temperature_unit;
  const validUnit = declaredUnit === undefined
    || declaredUnit === "°C"
    || (modelVersion >= 3 && declaredUnit === "°F");
  if (
    !payload ||
    payload.format !== PORTABLE_FORMAT ||
    !Number.isInteger(payload.model_version) ||
    modelVersion < 1 ||
    modelVersion > PORTABLE_MODEL_VERSION ||
    !validUnit ||
    !payload.sections ||
    typeof payload.sections !== "object"
  ) {
    return { ok: false, errorKey: "invalidImportFile" };
  }

  const sections = portableSectionsFromPayload(payload);
  if (!sections.length) {
    return { ok: false, errorKey: "noImportSections" };
  }

  return { ok: true, sections };
}

export function portableSectionsFromPayload(payload?: VelairPortablePayload): PortableSection[] {
  const sections = payload?.sections;
  if (!sections || typeof sections !== "object") {
    return [];
  }
  return PORTABLE_SECTIONS.filter((section) => Object.prototype.hasOwnProperty.call(sections, section));
}

export function portableExportSummaryItems(
  sections: Set<PortableSection>,
  counts: { zones: number; templates: number; preconditioningLearning: number; profiles: number; modes: number; blockPresets?: number },
): PortableSummaryItem[] {
  const items: PortableSummaryItem[] = [];
  if (sections instanceof Set ? sections.has("planned_return") : Object.prototype.hasOwnProperty.call(sections, "planned_return")) items.push({ section: "planned_return", value: "included" });
  if (sections.has("block_presets")) items.push({ section: "block_presets", value: counts.blockPresets ?? 0 });
  if (sections.has("zones")) {
    items.push({ section: "zones", value: counts.zones });
  }
  if (sections.has("templates")) {
    items.push({ section: "templates", value: counts.templates });
  }
  if (sections.has("settings")) {
    items.push({ section: "settings", value: "included" });
  }
  if (sections.has("preconditioning_learning")) {
    items.push({
      section: "preconditioning_learning",
      value: counts.preconditioningLearning,
    });
  }
  if (sections.has("profiles")) {
    items.push({ section: "profiles", value: counts.profiles });
  }
  if (sections.has("modes")) {
    items.push({ section: "modes", value: counts.modes });
  }
  return items;
}

export function portableImportSummaryItems(payload?: VelairPortablePayload): PortableSummaryItem[] {
  const sections = payload?.sections;
  if (!sections) {
    return [];
  }

  const items: PortableSummaryItem[] = [];
  if (sections instanceof Set ? sections.has("planned_return") : Object.prototype.hasOwnProperty.call(sections, "planned_return")) items.push({ section: "planned_return", value: "included" });
  if (Object.prototype.hasOwnProperty.call(sections, "block_presets")) items.push({ section: "block_presets", value: Array.isArray(sections.block_presets) ? sections.block_presets.length : 0 });
  if (Object.prototype.hasOwnProperty.call(sections, "zones")) {
    const zones = sections.zones;
    items.push({
      section: "zones",
      value: zones && typeof zones === "object" && !Array.isArray(zones) ? Object.keys(zones).length : 0,
    });
  }
  if (Object.prototype.hasOwnProperty.call(sections, "templates")) {
    const templates = sections.templates;
    items.push({
      section: "templates",
      value: Array.isArray(templates) ? templates.length : 0,
    });
  }
  if (Object.prototype.hasOwnProperty.call(sections, "settings")) {
    items.push({ section: "settings", value: "included" });
  }
  if (Object.prototype.hasOwnProperty.call(sections, "preconditioning_learning")) {
    const learning = sections.preconditioning_learning;
    items.push({
      section: "preconditioning_learning",
      value: learning && typeof learning === "object" && !Array.isArray(learning)
        ? Object.keys(learning).length
        : 0,
    });
  }
  if (Object.prototype.hasOwnProperty.call(sections, "profiles")) {
    items.push({
      section: "profiles",
      value: Array.isArray(sections.profiles) ? sections.profiles.length : 0,
    });
  }
  if (Object.prototype.hasOwnProperty.call(sections, "modes")) {
    items.push({
      section: "modes",
      value: Array.isArray(sections.modes) ? sections.modes.length : 0,
    });
  }
  return items;
}

export function unmatchedPreconditioningLearningEntities(
  payload: VelairPortablePayload | undefined,
  configuredEntities: string[],
): string[] {
  const learning = payload?.sections?.preconditioning_learning;
  if (!learning || typeof learning !== "object" || Array.isArray(learning)) {
    return [];
  }

  const configured = new Set(configuredEntities);
  return Object.keys(learning).filter((entityId) => !configured.has(entityId));
}
