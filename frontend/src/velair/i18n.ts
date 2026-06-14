import type { HomeAssistant } from "./types";
import { TRANSLATIONS } from "./translations";
import type { SupportedLanguage, TranslationKey } from "./translations";

type DictionaryGroup = "hvacActions" | "hvacModes" | "schedulerModes" | "schedulerStatuses";

export function languageFromHass(hass?: Pick<HomeAssistant, "language" | "locale" | "selectedLanguage">): SupportedLanguage {
  const language =
    hass?.locale?.language ??
    hass?.language ??
    hass?.selectedLanguage ??
    "en";
  const normalizedLanguage = String(language).toLowerCase();
  const supportedLanguages = Object.keys(TRANSLATIONS) as SupportedLanguage[];
  return (
    supportedLanguages.find(
      (supportedLanguage) =>
        normalizedLanguage === supportedLanguage ||
        normalizedLanguage.startsWith(`${supportedLanguage}-`),
    ) ?? "en"
  );
}

export function translate(
  language: SupportedLanguage,
  key: TranslationKey,
  replacements: Record<string, string | number> = {},
): string {
  const dictionary = TRANSLATIONS[language];
  const value = dictionary[key] ?? TRANSLATIONS.en[key];
  if (typeof value !== "string") {
    return key;
  }

  let text: string = value;
  Object.entries(replacements).forEach(([name, replacement]) => {
    text = text.replaceAll(`{${name}}`, String(replacement));
  });
  return text;
}

export function weekdayName(language: SupportedLanguage, weekday: string): string {
  const dictionary = TRANSLATIONS[language];
  const localizedWeekdays = dictionary.weekdays as Record<string, string>;
  const fallbackWeekdays = TRANSLATIONS.en.weekdays as Record<string, string>;
  return localizedWeekdays[weekday] ?? fallbackWeekdays[weekday] ?? capitalize(weekday);
}

export function shortWeekdayName(language: SupportedLanguage, weekday: string): string {
  return weekdayName(language, weekday).slice(0, 3);
}

export function dictionaryLabel(language: SupportedLanguage, group: DictionaryGroup, key: string): string {
  const dictionary = TRANSLATIONS[language][group] as Record<string, string>;
  const fallback = TRANSLATIONS.en[group] as Record<string, string>;
  return dictionary[key] ?? fallback[key] ?? humanizeKey(key);
}

export function humanizeKey(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => capitalize(part))
    .join(" ");
}

export function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}
