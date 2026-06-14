import type { TranslationDictionary } from "./types";

export { translationTemplate } from "./template";
export type { SupportedLanguage, TranslationDictionary, TranslationKey } from "./types";

type TranslationModule = Record<string, TranslationDictionary>;

const translationModules = import.meta.glob<TranslationModule>("./*.ts", {
  eager: true,
});

export const TRANSLATIONS = Object.fromEntries(
  Object.entries(translationModules)
    .map(([path, module]) => {
      const language = path.match(/\.\/(.+)\.ts$/)?.[1] ?? "";
      return [language, module[language]];
    })
    .filter(([language, dictionary]) =>
      Boolean(language && dictionary && language !== "index" && language !== "template" && language !== "types"),
    ),
) as Record<string, TranslationDictionary>;
