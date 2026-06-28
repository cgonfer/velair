import { PORTABLE_FORMAT, PORTABLE_MODEL_VERSION, PORTABLE_SECTIONS } from "../constants";
import type { PortableSection, VelairPortablePayload } from "../types";

export type PortableValidationResult =
  | {
      ok: true;
      sections: PortableSection[];
    }
  | {
      ok: false;
      errorKey: "invalidImportFile" | "noImportSections";
    };

export type PortableSummaryValue = number | "included";

export type PortableSummaryItem = {
  section: PortableSection;
  value: PortableSummaryValue;
};

export function validatePortablePayload(payload: VelairPortablePayload): PortableValidationResult {
  if (
    !payload ||
    payload.format !== PORTABLE_FORMAT ||
    !Number.isInteger(payload.model_version) ||
    Number(payload.model_version) < 1 ||
    Number(payload.model_version) > PORTABLE_MODEL_VERSION ||
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
  counts: { zones: number; templates: number; preconditioningLearning: number },
): PortableSummaryItem[] {
  const items: PortableSummaryItem[] = [];
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
  return items;
}

export function portableImportSummaryItems(payload?: VelairPortablePayload): PortableSummaryItem[] {
  const sections = payload?.sections;
  if (!sections) {
    return [];
  }

  const items: PortableSummaryItem[] = [];
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
