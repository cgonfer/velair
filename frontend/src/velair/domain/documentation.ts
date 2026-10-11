import { languageFromHass } from "../i18n";
import type { HomeAssistant } from "../types";

declare const __VELAIR_DOCUMENTATION_AVAILABILITY__: DocumentationAvailability;
declare const __VELAIR_RELEASE_VERSION__: string;

const REPOSITORY_URL = "https://github.com/cgonfer/velair";
const TOPIC_PATHS = {
  schedules: "docs/user/usage.md",
  linkedSchedules: "docs/user/linked-schedules.md#linked-templates",
  blockPresets: "docs/user/linked-schedules.md#block-presets",
  profiles: "docs/user/climate-profiles.md",
  preconditioning: "docs/user/adaptive-preconditioning.md",
  plannedReturn: "docs/user/planned-return.md",
  roomAssist: "docs/user/room-assist.md",
  comfort: "docs/user/comfort.md",
  diagnostics: "docs/user/diagnostics.md",
  troubleshooting: "docs/user/troubleshooting.md",
  manualControl: "docs/user/manual-control.md",
  externalSystems: "docs/user/external-systems.md",
} as const;

export type DocumentationTopic = keyof typeof TOPIC_PATHS;
export type DocumentationAvailability = Record<string, Partial<Record<string, string>>>;
type DocumentationLocale = Pick<HomeAssistant, "language" | "locale" | "selectedLanguage">;
export type DocumentationDestination = { href: string; language: string; translated: boolean };

const availability = typeof __VELAIR_DOCUMENTATION_AVAILABILITY__ === "undefined" ? {} : __VELAIR_DOCUMENTATION_AVAILABILITY__;
const releaseVersion = typeof __VELAIR_RELEASE_VERSION__ === "undefined" ? "" : __VELAIR_RELEASE_VERSION__;

/** Resolve each guide independently; availability is embedded at build time. */
export function documentationDestination(
  topic: DocumentationTopic | "index",
  hass?: DocumentationLocale,
  options: { availability?: DocumentationAvailability; releaseVersion?: string } = {},
): DocumentationDestination {
  const language = languageFromHass(hass);
  const [source, fragment] = (topic === "index" ? "docs/README.md" : TOPIC_PATHS[topic]).split("#");
  const translatedPath = (options.availability ?? availability)[source]?.[language];
  const path = language !== "en" && translatedPath ? translatedPath : source;
  const version = options.releaseVersion ?? releaseVersion;
  const ref = version ? `v${version}` : "main";
  return {
    href: `${REPOSITORY_URL}/blob/${ref}/${path}${fragment ? `#${fragment}` : ""}`,
    language: path === source ? "en" : language,
    translated: path !== source,
  };
}

/** English destinations retained for consumers needing a complete canonical map. */
export const DOCUMENTATION_LINKS = Object.fromEntries(
  Object.keys(TOPIC_PATHS).map((topic) => [topic, documentationDestination(topic as DocumentationTopic).href]),
) as Record<DocumentationTopic, string>;

export const COMMUNITY_LINKS = {
  documentation: documentationDestination("index").href,
  issues: `${REPOSITORY_URL}/issues`,
  discussions: `${REPOSITORY_URL}/discussions`,
} as const;
