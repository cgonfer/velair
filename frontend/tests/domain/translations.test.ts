import { describe, expect, it } from "vitest";

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
    expect(es.preconditioningMinimumDeltaHelp).toContain("pequeñas");
    expect(es.preconditioningMinStartHelp).toContain("pequeños");
    expect(translations).not.toMatch(
      /\b(?:antiguedad|conservaran|dias|dinamico|frio|invalida|invalidas|limites|mas|maxima|maximo|minima|minimo|pequena|pequenas|pequeno|pequenos|recomendacion|tamano|ultima|utiles)\b/i,
    );
    expect(translations).not.toMatch(/\b(?:build|card|fallback|storage)\b/i);
    expect(translations).not.toMatch(/[ÃÂ�]/);
    expect(values.filter((value) => value.includes("?")))
      .toEqual(values.filter((value) => value.includes("?") && value.startsWith("¿")));
  });
});
