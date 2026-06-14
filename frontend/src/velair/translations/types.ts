import type { en } from "./en";

type WidenTranslationValues<T> = {
  readonly [Key in keyof T]: T[Key] extends string
    ? string
    : T[Key] extends Record<string, unknown>
      ? WidenTranslationValues<T[Key]>
      : T[Key];
};

export type TranslationDictionary = WidenTranslationValues<typeof en>;
export type TranslationKey = keyof TranslationDictionary;
export type SupportedLanguage = string;
