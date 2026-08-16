import { describe, expect, it } from "vitest";

import { languageFromHass, translate } from "../../src/velair/i18n";
import { de } from "../../src/velair/translations/de";
import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";
import { fr } from "../../src/velair/translations/fr";
import { nl } from "../../src/velair/translations/nl";
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

const completeTranslations = { de, en, es, fr, nl };

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
    expect(languageFromHass({ language: "nl-BE" })).toBe("nl");
    expect(languageFromHass({ language: "ru-RU" })).toBe("ru");
  });

  it("supports reviewed partial community translations with English fallback", () => {
    const sourceEntries = new Map(translationEntries(en));
    const russianEntries = translationEntries(ru);

    expect(russianEntries.length).toBeGreaterThan(sourceEntries.size * 0.85);
    expect(translationStrings(ru).join("\n")).not.toMatch(/[ÃƒÃ‚ï¿½]/);
    for (const [key, value] of russianEntries) {
      expect(sourceEntries.has(key), `ru.${key}`).toBe(true);
      expect(value, `ru.${key}`).not.toBe("");
      expect(placeholders(value), `ru.${key} placeholders`)
        .toEqual(placeholders(sourceEntries.get(key) ?? ""));
    }
    expect(translate("ru", "legacyImportTemperatureUnit"))
      .toBe(en.legacyImportTemperatureUnit);
    expect(translate("ru", "addBlock")).toBe(ru.addBlock);
    expect(ru.appliedDays).toBe("Обновлено дней: {count}");
    expect(ru.appliedThermostats).toBe("Обновлено термостатов: {count}");
    expect(translationStrings(ru).join("\n")).not.toContain("{suffix}");
    expect(russianEntries.filter(([key, value]) => value === sourceEntries.get(key)))
      .toEqual([
        ["preconditioningDirectionSamples", "{count}/{required}"],
        ["sensors", "Room Assist"],
        ["roomSensorAssistBadge", "Room Assist"],
      ]);
  });

  it("explains maximum Room Assist correction for both heating and cooling", () => {
    expect(en.roomSensorAssistMaxDeltaHelp).toContain("stop heating or cooling");
    expect(en.roomSensorAssistMaxDeltaHelp).toContain("only used when needed");
    expect(en.roomSensorAssistMaxDeltaHelp).not.toContain("valve");
    expect(es.roomSensorAssistMaxDeltaHelp).toContain("dejar de calentar o enfriar");
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
