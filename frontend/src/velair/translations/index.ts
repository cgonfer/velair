import type { PartialTranslationDictionary, TranslationDictionary } from "./types";

export { translationTemplate } from "./template";
export type { PartialTranslationDictionary, SupportedLanguage, TranslationDictionary, TranslationKey } from "./types";

type TranslationModule = Record<string, PartialTranslationDictionary>;

const translationModules = import.meta.glob<TranslationModule>("./*.ts", {
  eager: true,
});

export const TRANSLATIONS = Object.fromEntries(
  Object.entries(translationModules)
    .map(([path, module]) => {
      const moduleName = path.match(/\.\/(.+)\.ts$/)?.[1] ?? "";
      const language = moduleName.replaceAll("_", "-");
      return [language, module[moduleName]];
    })
    .filter(([language, dictionary]) =>
      Boolean(language && dictionary && language !== "index" && language !== "template" && language !== "types"),
    ),
) as Record<string, PartialTranslationDictionary> & { en: TranslationDictionary };
