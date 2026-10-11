import { html, nothing } from "lit";
import { documentationDestination, type DocumentationTopic } from "../domain/documentation";
import type { TranslationKey } from "../translations";
import type { HomeAssistant } from "../types";

type DocumentationHelpHost = {
  hass?: Pick<HomeAssistant, "language" | "locale" | "selectedLanguage">;
  _t(key: TranslationKey, values?: Record<string, string | number>): string;
};

type DocumentationHelpOptions = {
  title?: TranslationKey;
  summary?: TranslationKey;
  label?: TranslationKey;
};

const TOPIC_COPY: Record<DocumentationTopic, { title: TranslationKey; summary: TranslationKey }> = {
  schedules: { title: "schedules", summary: "defaultSchedulesDescription" },
  linkedSchedules: { title: "templates", summary: "linkedHoursHelp" },
  blockPresets: { title: "blockPresets", summary: "presetLibraryHelp" },
  profiles: { title: "profilesAndModes", summary: "profilesPanelIntro" },
  preconditioning: { title: "preconditioningIntroTitle", summary: "preconditioningIntroDetail" },
  plannedReturn: { title: "plannedReturn", summary: "plannedReturnPreparationHelp" },
  roomAssist: { title: "roomSensorIntroTitle", summary: "roomSensorIntroDetail" },
  comfort: { title: "comfortIntroTitle", summary: "comfortIntroDetail" },
  diagnostics: { title: "diagnostics", summary: "diagnosticsDescription" },
  troubleshooting: { title: "diagnostics", summary: "diagnosticsDescription" },
  manualControl: { title: "externalChangePolicy", summary: "externalChangePolicyDescription" },
  externalSystems: { title: "externalSystems", summary: "externalSystemsDescription" },
};

function openDocumentationDialog(event: Event) {
  event.stopPropagation();
  const trigger = event.currentTarget as HTMLButtonElement;
  const dialog = trigger.parentElement?.querySelector<HTMLDialogElement>("dialog");
  if (dialog && !dialog.open) dialog.showModal();
}

function closeDocumentationDialog(event: Event) {
  event.stopPropagation();
  (event.currentTarget as HTMLElement).closest<HTMLDialogElement>("dialog")?.close();
}

function restoreTriggerFocus(event: Event) {
  event.stopPropagation();
  const dialog = event.currentTarget as HTMLDialogElement;
  const trigger = dialog.parentElement?.querySelector<HTMLButtonElement>(".documentation-help-button");
  if (trigger?.isConnected) trigger.focus();
}

function handleDialogClick(event: MouseEvent) {
  event.stopPropagation();
  const dialog = event.currentTarget as HTMLDialogElement;
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right
    || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  const dialog = event.currentTarget as HTMLDialogElement;
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"));
  const first = focusable[0];
  const last = focusable.at(-1);
  const target = event.composedPath()[0];
  if (first && last && ((!event.shiftKey && target === last) || (event.shiftKey && target === first))) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

function renderGuide(host: DocumentationHelpHost, topic: DocumentationTopic, label: TranslationKey) {
  const destination = documentationDestination(topic, host.hass);
  const requestedLanguage = host.hass?.locale?.language ?? host.hass?.language ?? host.hass?.selectedLanguage ?? "en";
  const englishFallback = destination.language === "en" && String(requestedLanguage).toLowerCase().split(/[-_]/)[0] !== "en";
  return html`<a class="documentation-guide" href=${destination.href}
    target="_blank" rel="noopener noreferrer">
    <span>${host._t(label)}${englishFallback ? html` · <small>${host._t("documentationLanguageNote")}</small>` : nothing}</span>
    <ha-icon icon="mdi:open-in-new" aria-hidden="true"></ha-icon>
  </a>`;
}

/** Feature help is local; published guides are opened only on request. */
export function renderDocumentationHelp(
  host: DocumentationHelpHost,
  topic: DocumentationTopic,
  options: DocumentationHelpOptions = {},
) {
  const copy = TOPIC_COPY[topic];
  const title = host._t(options.title ?? copy.title);
  const label = options.label
    ? host._t(options.label)
    : host._t("documentationHelpFor", { topic: title });
  return html`<span class="documentation-help">
    <button class="documentation-help-button" type="button" aria-haspopup="dialog"
      aria-label=${label} title=${label} @click=${openDocumentationDialog}>
      <ha-icon icon="mdi:help-circle-outline" aria-hidden="true"></ha-icon>
    </button>
    <dialog class="documentation-dialog" aria-label=${title}
      @click=${handleDialogClick} @keydown=${handleDialogKeydown} @close=${restoreTriggerFocus}>
      <header class="documentation-dialog-header">
        <h2>${title}</h2>
        <button class="documentation-close" type="button" autofocus
          aria-label=${host._t("close")} title=${host._t("close")} @click=${closeDocumentationDialog}>
          <ha-icon icon="mdi:close" aria-hidden="true"></ha-icon>
        </button>
      </header>
      <p class="documentation-dialog-summary">${host._t(options.summary ?? copy.summary)}</p>
      <footer class="documentation-dialog-footer">
        ${renderGuide(host, topic, "documentationViewGuide")}
        ${topic === "diagnostics" ? renderGuide(host, "troubleshooting", "documentationTroubleshooting") : ""}
      </footer>
    </dialog>
  </span>`;
}
