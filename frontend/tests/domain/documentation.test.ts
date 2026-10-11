import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { documentationDestination } from "../../src/velair/domain/documentation";
import type { DocumentationTopic } from "../../src/velair/domain/documentation";
// @ts-ignore The build uses this dependency-free Node ES module too.
import { buildDocumentationAvailability } from "../../../scripts/documentation-translations.mjs";

const availability = {
  "docs/README.md": { es: "docs/README.es.md", fr: "docs/README.fr.md" },
  "docs/user/usage.md": { es: "docs/user/usage.es.md", fr: "docs/user/usage.fr.md" },
  "docs/user/linked-schedules.md": { es: "docs/user/linked-schedules.es.md" },
  "docs/user/diagnostics.md": { fr: "docs/user/diagnostics.fr.md" },
};
const options = { availability, releaseVersion: "" };

describe("localized documentation destinations", () => {
  it.each(["es", "es-ES", "ES_es"])("uses existing HA locale normalization for %s", (language) => {
    expect(documentationDestination("schedules", { language }, options)).toEqual({
      href: "https://github.com/cgonfer/velair/blob/main/docs/user/usage.es.md",
      language: "es", translated: true,
    });
  });
  it("honors locale.language ahead of language and selectedLanguage", () => {
    const destination = documentationDestination("schedules", {
      locale: { language: "fr-FR" }, language: "es", selectedLanguage: "en",
    } as never, options);
    expect(destination.href).toContain("/docs/user/usage.fr.md");
  });
  it.each(["en", "unknown", "de-DE", "pt_BR", "pt"])("falls back per guide for %s", (language) => {
    expect(documentationDestination("schedules", { language }, options)).toMatchObject({
      href: "https://github.com/cgonfer/velair/blob/main/docs/user/usage.md",
      language: "en", translated: false,
    });
  });
  it("resolves partial diagnostics translation independently of troubleshooting", () => {
    expect(documentationDestination("diagnostics", { language: "fr" }, options).translated).toBe(true);
    expect(documentationDestination("troubleshooting", { language: "fr" }, options).translated).toBe(false);
  });
  it("retains explicit section anchors in translated guides", () => {
    expect(documentationDestination("linkedSchedules", { language: "es" }, options).href)
      .toBe("https://github.com/cgonfer/velair/blob/main/docs/user/linked-schedules.es.md#linked-templates");
    expect(documentationDestination("blockPresets", { language: "es" }, options).href)
      .toMatch(/#block-presets$/);
  });
  it("localizes the documentation index and uses release references", () => {
    expect(documentationDestination("index", { language: "fr" }, { availability, releaseVersion: "1.9.0-beta.1" }).href)
      .toBe("https://github.com/cgonfer/velair/blob/v1.9.0-beta.1/docs/README.fr.md");
    expect(documentationDestination("comfort", { language: "fr" }, { availability, releaseVersion: "1.9.0" }).href)
      .toBe("https://github.com/cgonfer/velair/blob/v1.9.0/docs/user/comfort.md");
  });
});

describe("complete documentation availability used by the build", () => {
  const completeAvailability = buildDocumentationAvailability(resolve(import.meta.dirname, "../../.."));
  const topics: [DocumentationTopic | "index", string][] = [
    ["index", "docs/README.md"],
    ["schedules", "docs/user/usage.md"],
    ["linkedSchedules", "docs/user/linked-schedules.md#linked-templates"],
    ["blockPresets", "docs/user/linked-schedules.md#block-presets"],
    ["profiles", "docs/user/climate-profiles.md"],
    ["preconditioning", "docs/user/adaptive-preconditioning.md"],
    ["plannedReturn", "docs/user/planned-return.md"],
    ["roomAssist", "docs/user/room-assist.md"],
    ["comfort", "docs/user/comfort.md"],
    ["diagnostics", "docs/user/diagnostics.md"],
    ["troubleshooting", "docs/user/troubleshooting.md"],
    ["manualControl", "docs/user/manual-control.md"],
    ["externalSystems", "docs/user/external-systems.md"],
  ];
  it.each([
    ["es-ES", "es"], ["fr-FR", "fr"], ["de-DE", "de"], ["it-IT", "it"],
    ["nl-NL", "nl"], ["pl-PL", "pl"], ["pt_BR", "pt-br"],
    ["pt-br", "pt-br"], ["pt", "pt-pt"], ["pt-PT", "pt-pt"],
    ["ru-RU", "ru"],
  ])("opens every registered help topic for HA language %s", (language, locale) => {
    for (const releaseVersion of ["", "1.8.0"]) {
      for (const [topic, canonical] of topics) {
        const [source, fragment] = canonical.split("#");
        const path = source.replace(/\.md$/, `.${locale}.md`);
        const ref = releaseVersion ? `v${releaseVersion}` : "main";
        expect(documentationDestination(topic, { language }, { availability: completeAvailability, releaseVersion })).toEqual({
          href: `https://github.com/cgonfer/velair/blob/${ref}/${path}${fragment ? `#${fragment}` : ""}`,
          language: locale, translated: true,
        });
      }
    }
  });
});
