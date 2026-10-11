// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as documentation from "../../src/velair/domain/documentation";
import { DOCUMENTATION_LINKS, COMMUNITY_LINKS, documentationDestination } from "../../src/velair/domain/documentation";
import type { VelairViewHost } from "../../src/velair/host-types";
import { translate } from "../../src/velair/i18n";
import type { TranslationKey } from "../../src/velair/translations";
import { TRANSLATIONS } from "../../src/velair/translations";
import { renderDocumentationHelp } from "../../src/velair/views/documentation-links";
import { renderHelpCommunitySettings, renderSettingsView, renderSettingsExternalChangePolicy, renderExternalSystemsSettings } from "../../src/velair/views/settings-view";
import { renderPreconditioningWorkspace } from "../../src/velair/views/preconditioning-workspace";
import { renderTemplatesView } from "../../src/velair/views/templates-view";
import { renderSchedulesView } from "../../src/velair/views/schedule-view";
import { renderSensorsView } from "../../src/velair/views/sensors-view";
import { renderComfortView } from "../../src/velair/views/comfort-view";
import { renderDiagnosticsView } from "../../src/velair/views/diagnostics-view";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import { VelairCard } from "../../src/velair/components/velair-card-element";

class DocumentationTestCard extends VelairCard {}
customElements.define("documentation-test-card", DocumentationTestCard);
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

function host(extra: Record<string, unknown> = {}): VelairViewHost {
  return {
    _t: (key: TranslationKey, values?: Record<string, string | number>) => translate("es", key, values),
    _weekdayName: (day: string) => day,
    _currentTimelineNow: () => new Date(),
    _scheduleTemplates: () => [],
    _selectScheduleSource: vi.fn(),
    _selectPreconditioningSource: vi.fn(),
    _selectTemplateLibrarySource: vi.fn(),
    _scheduleSource: "default",
    _preconditioningSource: "preconditioning",
    _templateLibrarySource: "templates",
    _templateDraftBlocks: [],
    ...extra,
  } as unknown as VelairViewHost;
}

function container() {
  const element = document.createElement("div");
  document.body.append(element);
  return element;
}

const resolveDestination = documentationDestination;
function availablePilotGuides() {
  vi.spyOn(documentation, "documentationDestination").mockImplementation((topic, hass) => resolveDestination(topic, hass, {
    availability: {
      "docs/README.md": { es: "docs/README.es.md", fr: "docs/README.fr.md" },
      "docs/user/diagnostics.md": { es: "docs/user/diagnostics.es.md", fr: "docs/user/diagnostics.fr.md" },
    },
    releaseVersion: "",
  }));
}

describe("documentation and community access", () => {
  it.each(["es", "fr"])("localizes available guides and labels each diagnostics link separately in %s", (language) => {
    const root = container();
    availablePilotGuides();
    const localizedHost = host({
      hass: { locale: { language }, states: {} },
      _t: (key: TranslationKey, values?: Record<string, string | number>) => translate(language, key, values),
    });
    render(renderDocumentationHelp(localizedHost, "diagnostics"), root);
    const links = root.querySelectorAll<HTMLAnchorElement>("dialog a");
    expect(links[0].href).toContain(`/docs/user/diagnostics.${language}.md`);
    expect(links[0].textContent?.trim()).toBe(translate(language, "documentationViewGuide"));
    expect(links[0].querySelector("small")).toBeNull();
    expect(links[1].href).toBe(DOCUMENTATION_LINKS.troubleshooting);
    expect(links[1].textContent).toContain(translate(language, "documentationLanguageNote"));
    expect(links[1].textContent).toContain(translate(language, "documentationTroubleshooting"));
    expect(links[1].querySelectorAll("small")).toHaveLength(1);
    expect(root.querySelector(".documentation-dialog-footer > span")).toBeNull();
  });

  it.each(["en", "en-GB", "en_US"])("omits the English notice for an English-speaking audience (%s)", (language) => {
    const root = container();
    availablePilotGuides();
    render(renderDocumentationHelp(host({ hass: { locale: { language }, states: {} } }), "diagnostics"), root);
    const links = root.querySelectorAll<HTMLAnchorElement>("dialog a");
    expect(links).toHaveLength(2);
    expect(links[0].href).toBe(DOCUMENTATION_LINKS.diagnostics);
    expect(links[1].href).toBe(DOCUMENTATION_LINKS.troubleshooting);
    expect(root.querySelector("dialog small")).toBeNull();
  });

  it("marks English fallback for an unsupported non-English Home Assistant language", () => {
    const root = container();
    render(renderDocumentationHelp(host({ hass: { language: "ja", states: {} } }), "roomAssist"), root);
    expect(root.querySelector("dialog a small")?.textContent).toBe(translate("es", "documentationLanguageNote"));
  });

  it("uses the authorized compact guide action in all maintained interface languages", () => {
    const labels = {
      en: "Open guide", es: "Abrir guía", fr: "Ouvrir le guide", de: "Anleitung öffnen",
      it: "Apri la guida", nl: "Handleiding openen", pl: "Otwórz poradnik",
      "pt-br": "Abrir guia", "pt-pt": "Abrir guia", ru: "Открыть руководство",
    } as const;
    expect(Object.keys(labels).sort()).toEqual(Object.keys(TRANSLATIONS).sort());
    for (const [language, label] of Object.entries(labels)) {
      const root = container();
      const localizedHost = host({
        hass: { language, states: {} },
        _t: (key: TranslationKey, values?: Record<string, string | number>) => translate(language as keyof typeof labels, key, values),
      });
      render(renderDocumentationHelp(localizedHost, "roomAssist"), root);
      const labelText = [...root.querySelector("dialog a span")!.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join("").trim();
      const fallbackNote = root.querySelector("dialog a small");
      expect(labelText).toBe(fallbackNote ? `${label} ·` : label);
    }
  });

  it("opens the localized index from Help and community", () => {
    availablePilotGuides();
    const root = container();
    render(renderHelpCommunitySettings(host({ hass: { language: "es", states: {} } })), root);
    const documentation = root.querySelector<HTMLAnchorElement>(".help-community-link")!;
    expect(documentation.href).toContain("/docs/README.es.md");
    expect(documentation.target).toBe("_blank");
    expect(documentation.rel).toBe("noopener noreferrer");
    expect(documentation.textContent).toContain(translate("es", "documentationLocalizedDescription"));
  });

  it("localizes the contextual preparation explanations in every supported language", () => {
    const keys: TranslationKey[] = [
      "comfortPreparationDescription", "comfortPreparationAdaptiveDescription", "comfortPreparationReturnDescription",
      "plannedReturnPreparationConfigurationHelp", "plannedReturnDismissHelp", "plannedReturnLeavingHelp",
      "plannedReturnConflictHelp", "plannedReturnPresenceDescription", "plannedReturnSetupsDescription",
      "plannedReturnWeeklyDescription", "plannedReturnPreparationHelp", "plannedReturnUnknownHelp",
      "plannedReturnArrivalPreparation",
    ];
    for (const [language, dictionary] of Object.entries(TRANSLATIONS)) {
      if (language === "en") continue;
      for (const key of keys) {
        expect(dictionary[key], `${language}.${key}`).toBeTruthy();
        expect(dictionary[key], `${language}.${key}`).not.toBe(TRANSLATIONS.en[key]);
      }
    }
  });
  it("links to existing guides and real section anchors in the repository", () => {
    for (const destination of [...Object.values(DOCUMENTATION_LINKS), COMMUNITY_LINKS.documentation]) {
      const url = new URL(destination);
      expect(url.origin).toBe("https://github.com");
      expect(url.pathname).toMatch(/^\/cgonfer\/velair\/blob\/main\/docs\//);
      const path = url.pathname.replace("/cgonfer/velair/blob/main/", "");
      const file = resolve(process.cwd(), "..", path);
      expect(existsSync(file), path).toBe(true);
      if (url.hash) {
        const headings = [...readFileSync(file, "utf8").matchAll(/^## (.+)$/gm)]
          .map((match) => `#${match[1].trim().toLowerCase().replaceAll(" ", "-")}`);
        expect(headings, path).toContain(url.hash);
      }
    }
  });

  it("keeps translated help and the fallback language notice inside a dialog", () => {
    const root = container();
    availablePilotGuides();
    render(renderDocumentationHelp(host({ hass: { language: "es", states: {} } }), "roomAssist"), root);
    const link = root.querySelector("a")!;
    const dialog = root.querySelector("dialog")!;
    const trigger = root.querySelector<HTMLButtonElement>(".documentation-help-button")!;
    expect(link.textContent).toContain(translate("es", "documentationViewGuide"));
    expect(dialog.textContent).toContain(translate("es", "documentationLanguageNote"));
    expect(dialog.open).toBe(false);
    expect(trigger.textContent?.trim()).toBe("");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-label")).not.toContain("{topic}");
    expect(link.href).toBe(DOCUMENTATION_LINKS.roomAssist);
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
    expect(link.getAttribute("role")).toBeNull();
    expect(link.querySelector("ha-icon")?.getAttribute("aria-hidden")).toBe("true");
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    expect(root.querySelector('[role="tooltip"] a')).toBeNull();
  });

  it("opens local help without bubbling, closes explicitly and restores focus", () => {
    const root = container();
    render(renderDocumentationHelp(host(), "schedules"), root);
    const trigger = root.querySelector<HTMLButtonElement>(".documentation-help-button")!;
    const dialog = root.querySelector("dialog")!;
    const showModal = vi.fn(() => dialog.setAttribute("open", ""));
    const close = vi.fn(() => { dialog.removeAttribute("open"); dialog.dispatchEvent(new Event("close")); });
    Object.defineProperty(dialog, "showModal", { value: showModal });
    Object.defineProperty(dialog, "close", { value: close });
    const parentClick = vi.fn();
    root.addEventListener("click", parentClick);
    trigger.click();
    expect(showModal).toHaveBeenCalledOnce();
    expect(parentClick).not.toHaveBeenCalled();
    root.querySelector<HTMLButtonElement>(".documentation-close")!.click();
    expect(close).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
  });

  it("wraps Tab in both directions while leaving Escape to the native dialog", () => {
    const root = container();
    render(renderDocumentationHelp(host(), "diagnostics"), root);
    const close = root.querySelector<HTMLButtonElement>(".documentation-close")!;
    const guides = root.querySelectorAll<HTMLAnchorElement>("dialog a");
    const last = guides[guides.length - 1];
    last.focus();
    const forward = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true, cancelable: true });
    last.dispatchEvent(forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
    const backward = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, composed: true, cancelable: true });
    close.dispatchEvent(backward);
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    last.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
  });

  it("offers three distinct community destinations without configuration actions", () => {
    const root = container();
    const save = vi.fn();
    const viewHost = host({ _saveSettings: save });
    render(renderHelpCommunitySettings(viewHost), root);
    expect(root.textContent).toContain(translate("es", "helpCommunity"));
    expect([...root.querySelectorAll("a")].map((link) => link.href))
      .toEqual([COMMUNITY_LINKS.documentation, COMMUNITY_LINKS.issues, COMMUNITY_LINKS.discussions]);
    for (const link of root.querySelectorAll("a")) {
      expect(link.target).toBe("_blank");
      expect(link.rel).toBe("noopener noreferrer");
      link.addEventListener("click", (event) => event.preventDefault());
      link.click();
    }
    expect(save).not.toHaveBeenCalled();
  });

  it("places Help and community immediately before Maintenance", () => {
    const card = new DocumentationTestCard();
    card.hass = { language: "es", states: {} } as never;
    const root = container();
    render(renderSettingsView(card as unknown as VelairViewHost, []), root);
    expect(root.querySelector(".settings-help")?.nextElementSibling?.classList.contains("settings-maintenance")).toBe(true);
  });

  it.each(["preconditioning", "planned-return"])("offers help for both preparation choices with %s active", (source) => {
    const root = container();
    render(renderPreconditioningWorkspace(host({ _preconditioningSource: source }), []), root);
    expect([...root.querySelectorAll("dialog a")].map((link) => (link as HTMLAnchorElement).href))
      .toEqual([DOCUMENTATION_LINKS.preconditioning, DOCUMENTATION_LINKS.plannedReturn]);
    expect(root.querySelectorAll(".schedule-source-option")).toHaveLength(2);
    expect(root.querySelectorAll(".documentation-help-button")).toHaveLength(2);
    expect(root.querySelector("button button")).toBeNull();
  });

  it.each(["templates", "presets"])("offers independent guides for both library choices with %s active", (source) => {
    const root = container();
    const viewHost = host({ _templateLibrarySource: source });
    render(renderTemplatesView(viewHost), root);
    expect([...root.querySelectorAll("dialog a")].map((link) => (link as HTMLAnchorElement).href))
      .toEqual([DOCUMENTATION_LINKS.linkedSchedules, DOCUMENTATION_LINKS.blockPresets]);
    const inactive = root.querySelector(".schedule-source-option:not(.active)")!;
    const dialog = inactive.querySelector("dialog")!;
    Object.defineProperty(dialog, "showModal", { value: vi.fn() });
    inactive.querySelector<HTMLButtonElement>(".documentation-help-button")!.click();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(viewHost._selectTemplateLibrarySource).not.toHaveBeenCalled();
    expect(root.querySelectorAll(".schedule-source-option.active")).toHaveLength(1);
  });

  it("keeps help available while library selection is disabled during saving", () => {
    const root = container();
    render(renderTemplatesView(host({ _templateAction: "save" })), root);
    for (const button of root.querySelectorAll<HTMLButtonElement>(".schedule-source-option > button")) expect(button.disabled).toBe(true);
    for (const button of root.querySelectorAll<HTMLButtonElement>(".documentation-help-button")) expect(button.disabled).toBe(false);
  });

  it("exposes schedule, Room Assist and Comfort guides even before climates are configured", () => {
    const root = container();
    for (const [view, topic] of [[renderSchedulesView, "schedules"], [renderSensorsView, "roomAssist"], [renderComfortView, "comfort"]] as const) {
      render(view(host(), []), root);
      expect(root.querySelector("a")?.href).toBe(DOCUMENTATION_LINKS[topic]);
    }
  });

  it.each(["profiles", "modes"] as const)("exposes the profiles guide in workspace %s", async (workspace) => {
    const element = new VelairProfilesView();
    element.workspace = workspace;
    element.hass = { language: "es", states: {} } as never;
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector("dialog a.documentation-guide")?.getAttribute("href")).toBe(documentationDestination("profiles", element.hass).href);
  });

  it("keeps diagnostics and troubleshooting available when diagnostics are missing", () => {
    const root = container();
    render(renderDiagnosticsView(host()), root);
    const links = root.querySelectorAll("a");
    expect([...links].map((link) => link.href)).toEqual([DOCUMENTATION_LINKS.diagnostics, DOCUMENTATION_LINKS.troubleshooting]);
    expect(links[0].textContent).not.toBe(links[1].textContent);
    expect(links[1].textContent).toContain(translate("es", "documentationTroubleshooting"));
    expect(root.querySelectorAll(".documentation-help-button")).toHaveLength(1);
  });

  it("reuses the external adjustment icon with its guide inside the dialog", () => {
    const root = container();
    render(renderSettingsExternalChangePolicy(host(), "climate.office"), root);
    expect(root.querySelector("a")?.href).toBe(DOCUMENTATION_LINKS.manualControl);
    expect(root.querySelectorAll(".documentation-help-button")).toHaveLength(1);
    expect(root.querySelector('[role="tooltip"]')).toBeNull();
    expect(root.querySelector(".documentation-help-button ha-icon")?.getAttribute("icon")).toBe("mdi:help-circle-outline");
    expect(root.querySelector("dialog a")?.getAttribute("href")).toBe(DOCUMENTATION_LINKS.manualControl);
  });

  it("shows the external execution guide whenever an external system is present", () => {
    const root = container();
    render(renderExternalSystemsSettings(host({ _data: { external_execution: { systems: [{ provider: "test", name: "Test", entities: [] }], zones: {} } } })), root);
    expect(root.querySelector("a")?.href).toBe(DOCUMENTATION_LINKS.externalSystems);
  });
});
