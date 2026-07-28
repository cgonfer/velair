import { describe, expect, it } from "vitest";

import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";

function translationStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.values(value).flatMap(translationStrings);
}

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
