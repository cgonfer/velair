import { describe, expect, it } from "vitest";

import { languageFromHass, translate } from "../../src/velair/i18n";
import { TRANSLATIONS } from "../../src/velair/translations";
import { de } from "../../src/velair/translations/de";
import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";
import { fr } from "../../src/velair/translations/fr";
import { it as itTranslation } from "../../src/velair/translations/it";
import { nl } from "../../src/velair/translations/nl";
import { pl } from "../../src/velair/translations/pl";
import { pt_br as ptBR } from "../../src/velair/translations/pt_br";
import { pt_pt as ptPT } from "../../src/velair/translations/pt_pt";
import { ru } from "../../src/velair/translations/ru";

function translationStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.values(value).flatMap(translationStrings);
}

function translationEntries(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") {
    return [[prefix, value]];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    translationEntries(child, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
}

const RESERVED_PRODUCT_NAMES = ["Velair", "Room Assist"] as const;
const RESERVED_ECOSYSTEM_NAMES = [
  "Home Assistant",
  "HACS",
  "Evohome",
  "RAMSES RF",
  "ramses_cc",
] as const;
const RESERVED_TECHNICAL_TERMS = [
  "HVAC",
  "JSON",
  "target_temp_step",
  "velair.activate_profile",
] as const;
const RESERVED_TRANSLATION_TERMS = [
  ...RESERVED_PRODUCT_NAMES,
  ...RESERVED_ECOSYSTEM_NAMES,
  ...RESERVED_TECHNICAL_TERMS,
] as const;

const completeTranslations = TRANSLATIONS;

function occurrenceCount(value: string, term: string): number {
  return value.split(term).length - 1;
}

describe("supported translations", () => {
  it("provide every source key with matching placeholders", () => {
    const sourceEntries = new Map(translationEntries(en));

    for (const [language, dictionary] of Object.entries(completeTranslations)) {
      const entries = new Map(translationEntries(dictionary));
      expect([...entries.keys()].sort(), `${language} keys`)
        .toEqual([...sourceEntries.keys()].sort());
      for (const [key, source] of sourceEntries) {
        expect(entries.get(key), `${language}.${key}`).not.toBe("");
        expect(placeholders(entries.get(key) ?? ""), `${language}.${key} placeholders`)
          .toEqual(placeholders(source));
      }
    }
  });

  it("contains no broken UTF-8 text", () => {
    for (const [language, dictionary] of Object.entries(completeTranslations)) {
      expect(translationStrings(dictionary).join("\n"), language)
        .not.toMatch(/(?:Ã.|Â[°·«»¿¡ ])/);
    }
  });

  it("selects new languages and their regional variants", () => {
    expect(languageFromHass({ language: "de-DE" })).toBe("de");
    expect(languageFromHass({ language: "fr-CA" })).toBe("fr");
    expect(languageFromHass({ language: "it-IT" })).toBe("it");
    expect(languageFromHass({ language: "nl-BE" })).toBe("nl");
    expect(languageFromHass({ language: "pl-PL" })).toBe("pl");
    expect(languageFromHass({ language: "pt-BR" })).toBe("pt-br");
    expect(languageFromHass({ language: "pt_BR" })).toBe("pt-br");
    expect(languageFromHass({ language: "pt-PT" })).toBe("pt-pt");
    expect(languageFromHass({ language: "pt_PT" })).toBe("pt-pt");
    expect(languageFromHass({ language: "pt" })).toBe("pt-pt");
    expect(languageFromHass({ language: "ru-RU" })).toBe("ru");
  });

  it("uses a concise localized diagnostics report action", () => {
    expect([
      en.diagnosticsDownloadAction,
      es.diagnosticsDownloadAction,
      de.diagnosticsDownloadAction,
      fr.diagnosticsDownloadAction,
      itTranslation.diagnosticsDownloadAction,
      nl.diagnosticsDownloadAction,
      pl.diagnosticsDownloadAction,
      ptBR.diagnosticsDownloadAction,
      ptPT.diagnosticsDownloadAction,
      ru.diagnosticsDownloadAction,
    ]).toEqual([
      "Download report…",
      "Descargar informe…",
      "Bericht herunterladen…",
      "Télécharger le rapport…",
      "Scarica rapporto…",
      "Rapport downloaden…",
      "Pobierz raport…",
      "Baixar relatório…",
      "Descarregar relatório…",
      "Скачать отчёт…",
    ]);
  });

  it("localizes the complete diagnostics catalogue in every maintained language", () => {
    const sourceEntries = new Map(translationEntries(en));
    const reservedTerms = {
      de: new Set(["Room Assist"]),
      es: new Set(["Room Assist"]),
      fr: new Set(["Room Assist", "Mode"]),
      it: new Set([
        "Room Assist",
        "Comfort",
        "{status}: {issues}",
        "{climate} + Velair",
        "{previous} → {current}",
      ]),
      nl: new Set(["Room Assist", "Comfort", "Diagnostics"]),
      pl: new Set(["Room Assist", "{status}: {issues}", "{previous} → {current}", "{climate} + Velair"]),
      "pt-br": new Set(["Room Assist", "Manual", "{status}: {issues}", "{previous} → {current}", "{climate} + Velair"]),
      "pt-pt": new Set(["Room Assist", "Manual", "{status}: {issues}", "{previous} → {current}", "{climate} + Velair"]),
      ru: new Set(["Room Assist"]),
    };

    for (const [language, dictionary] of Object.entries({ de, es, fr, it: itTranslation, nl, pl, "pt-br": ptBR, "pt-pt": ptPT, ru })) {
      const untranslated = translationEntries(dictionary).filter(([key, value]) =>
        key.startsWith("diagnostics")
        && value === sourceEntries.get(key)
        && !reservedTerms[language as keyof typeof reservedTerms].has(value),
      );
      expect(untranslated, `${language} diagnostics strings`).toEqual([]);
    }
  });

  it("preserves reserved names and technical terms in every discovered language", () => {
    const sourceEntries = new Map(translationEntries(en));

    for (const [language, dictionary] of Object.entries(completeTranslations)) {
      if (language === "en") {
        continue;
      }
      const entries = new Map(translationEntries(dictionary));
      for (const [key, source] of sourceEntries) {
        const translated = entries.get(key) ?? "";
        for (const term of RESERVED_TRANSLATION_TERMS) {
          expect(
            occurrenceCount(translated, term),
            `${language}.${key} must preserve ${term}`,
          ).toBeGreaterThanOrEqual(occurrenceCount(source, term));
        }
      }
    }
  });

  it("keeps reserved product names while maintaining complete Russian coverage", () => {
    expect(translationStrings(ru).join("\n")).not.toMatch(/[ÃƒÃ‚ï¿½]/);
    expect(translate("ru", "legacyImportTemperatureUnit"))
      .toBe(ru.legacyImportTemperatureUnit);
    expect(translate("ru", "addBlock")).toBe(ru.addBlock);
    expect(ru.appliedDays).toBe("Обновлено дней: {count}");
    expect(ru.appliedThermostats).toBe("Обновлено термостатов: {count}");
    expect(translationStrings(ru).join("\n")).not.toContain("{suffix}");
    expect(ru.sensors).toBe("Room Assist");
    expect(ru.roomSensorAssistBadge).toBe("Room Assist");
  });

  it("does not leave known English feature terminology in maintained translations", () => {
    const forbiddenTerms = {
      de: /\b(?:Mode|Modes|Climate|Comfort|Preconditioning|Boosts?)\b/,
      es: /\b(?:Default|Profiles?|Modes?|Comfort|Preconditioning|Climates?|Boosts?|Offset|Deadband)\b|Adaptive Preconditioning/,
      fr: /\b(?:Profiles?|Climates?|Comfort|Preconditioning|Boosts?)\b/,
      it: /\b(?:Default|Profiles?|Modes?|Preconditioning|Climates?|Schedules?|Deadband|Boosts?)\b|Adaptive Preconditioning|Room Sensor Assist/,
      nl: /\b(?:Profiles?|Modes?|Climates?|Preconditioning|Boosts?)\b|Room Sensor Assist/,
      pl: /\b(?:Default|Modes?|Climates?|Schedules?|Preconditioning|Boosts?|Holding|Apply|Save|Current|Cool|Heat)\b|Room Sensor Assist/,
      "pt-br": /\b(?:Default|Profiles?|Modes?|Climates?|Schedules?|Preconditioning|Boosts?)\b|Room Sensor Assist/,
      "pt-pt": /\b(?:Default|Profiles?|Modes?|Climates?|Schedules?|Preconditioning|Boosts?)\b|Room Sensor Assist/,
      ru: /\b(?:Default|Profiles?|Modes?|Comfort|Preconditioning|Climates?|Boosts?|Offset|Deadband)\b|Adaptive Preconditioning|Room Sensor Assist/,
    };

    for (const [language, dictionary] of Object.entries({ de, es, fr, it: itTranslation, nl, pl, "pt-br": ptBR, "pt-pt": ptPT, ru })) {
      expect(translationStrings(dictionary).join("\n"), language)
        .not.toMatch(forbiddenTerms[language as keyof typeof forbiddenTerms]);
    }
  });

  it("uses contextual terms for each Portuguese regional variant", () => {
    expect({
      apply: ptBR.apply,
      file: ptBR.importFile,
      save: ptBR.save,
      saving: ptBR.saving,
      time: ptBR.time,
      cool: ptBR.hvacModes.cool,
      heat: ptBR.hvacModes.heat,
    }).toEqual({
      apply: "Aplicar",
      file: "Arquivo de importação",
      save: "Salvar",
      saving: "Salvando…",
      time: "Hora",
      cool: "Refrigeração",
      heat: "Aquecimento",
    });
    expect({
      apply: ptPT.apply,
      file: ptPT.importFile,
      save: ptPT.save,
      saving: ptPT.saving,
      time: ptPT.time,
      cool: ptPT.hvacModes.cool,
      heat: ptPT.hvacModes.heat,
    }).toEqual({
      apply: "Aplicar",
      file: "Ficheiro de importação",
      save: "Guardar",
      saving: "A guardar…",
      time: "Hora",
      cool: "Arrefecimento",
      heat: "Aquecimento",
    });
  });

  it("uses contextual Polish terms for ambiguous UI actions and HVAC states", () => {
    expect({
      apply: pl.apply,
      manual: pl.overviewControlManual,
      save: pl.save,
      saving: pl.saving,
      swing: pl.swingMode,
      time: pl.time,
      cool: pl.hvacModes.cool,
      heat: pl.hvacModes.heat,
      holding: pl.roomSensorStatusHolding,
    }).toEqual({
      apply: "Zastosuj",
      manual: "Ręczny",
      save: "Zapisz",
      saving: "Zapisywanie…",
      swing: "Oscylacja",
      time: "Czas",
      cool: "Chłodzenie",
      heat: "Ogrzewanie",
      holding: "Utrzymywanie",
    });
  });

  it("uses contextual Italian translations for ambiguous UI terms", () => {
    expect({
      apply: itTranslation.apply,
      manualAdjustmentActive: itTranslation.manualAdjustmentActive,
      publishing: itTranslation.overviewExternalStatusPublishing,
      saving: itTranslation.saving,
      swingMode: itTranslation.swingMode,
      time: itTranslation.time,
      diagnosticsOn: itTranslation.diagnosticsOn,
      cool: itTranslation.hvacModes.cool,
      heat: itTranslation.hvacModes.heat,
    }).toEqual({
      apply: "Applica",
      manualAdjustmentActive: "Fuori dalla programmazione automatica",
      publishing: "Pubblicazione",
      saving: "Salvataggio…",
      swingMode: "Oscillazione",
      time: "Ora",
      diagnosticsOn: "Attivo",
      cool: "Raffreddamento",
      heat: "Riscaldamento",
    });
  });

  it("explains maximum Room Assist correction for both heating and cooling", () => {
    expect(en.roomSensorAssistMaxDeltaHelp).toContain("stop heating or cooling");
    expect(en.roomSensorAssistMaxDeltaHelp).toContain("only used when needed");
    expect(en.roomSensorAssistMaxDeltaHelp).not.toContain("valve");
    expect(es.roomSensorAssistMaxDeltaHelp).toContain("dejar de calentar o enfriar");
  });

  it("distinguishes the climate target and localizes step-alignment values", () => {
    expect(en.roomSensorClimateTargetHelp).toContain("currently reported");
    expect(en.roomSensorClimateTargetHelp).toContain("not the room temperature target");
    expect(en.roomSensorClimateTargetAppliedHelp).toContain("temporary setpoint");
    expect(en.roomSensorClimateTargetAppliedHelp).toContain("Room Assist is active");
    expect(en.roomSensorClimateTargetAppliedHelp).toContain("not the room temperature target");
    expect(en.roomSensorClimateTargetStepHelp).toContain("{calculated}");
    expect(en.roomSensorClimateTargetStepHelp).toContain("{step}");
    expect(en.roomSensorClimateTargetStepHelp).toContain("{applied}");
    expect(es.roomSensorClimateTargetHelp).toContain("no es el objetivo");
  });
});

describe("Spanish translations", () => {
  it("uses correct Castilian spelling and punctuation", () => {
    const values = translationStrings(es);
    const translations = values.join("\n");

    expect(es.preconditioningHistorySize).toContain("Tamaño");
    expect(es.preconditioningMinimumDeltaHelp).toContain("diferencias más grandes");
    expect(es.preconditioningMinStartHelp).toContain("anticipaciones más breves");
    expect(es.tagline).toBe("Automatiza la climatización para adaptarla a tu vida.");
    expect(translations).not.toMatch(
      /\b(?:antiguedad|conservaran|dias|dinamico|frio|invalida|invalidas|limites|mas|maxima|maximo|minima|minimo|pequena|pequenas|pequeno|pequenos|recomendacion|tamano|ultima|utiles)\b/i,
    );
    expect(translations).not.toMatch(/\b(?:build|card|fallback|storage)\b/i);
    expect(translations).not.toMatch(/\b(?:backup|overrides|scheduler|schedules|templates)\b/i);
    expect(translations).not.toMatch(/[ÃÂ�]/);
    expect(values.filter((value) => value.includes("?")))
      .toEqual(values.filter((value) => value.includes("?") && value.startsWith("¿")));
  });

  it("uses the same section-prefixed naming convention for Lovelace views", () => {
    const keys = [
      "cardViewOverviewStatus",
      "cardViewOverviewBoosts",
      "cardViewOverviewEvents",
      "cardViewOverviewTimeline",
      "cardViewOverviewZones",
      "cardViewActiveSetup",
      "cardViewSchedules",
      "cardViewSensors",
      "cardViewComfort",
      "cardViewPreconditioning",
    ] as const;

    for (const key of keys) {
      expect(en[key].split(":")).toHaveLength(2);
      expect(es[key].split(":")).toHaveLength(2);
    }
  });
});
