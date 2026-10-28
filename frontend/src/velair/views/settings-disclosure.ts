import { html, noChange, type TemplateResult } from "lit";

/** Bordered settings container shared by supply control and room groups. */
export function renderSettingsDisclosure(section: string, icon: string, title: string, body: TemplateResult, open: boolean | typeof noChange = noChange) {
  return html`<details class="external-controller-conditions settings-disclosure" data-section=${section} .open=${open}>
    <summary>${renderSettingsHeading(icon, title)}<ha-icon class="external-controller-expand-icon" icon="mdi:chevron-down" aria-hidden="true"></ha-icon></summary>
    <div class="external-controller-conditions-body">${body}</div>
  </details>`;
}

function renderSettingsHeading(icon: string, title: string) {
  return html`<ha-icon icon=${icon} aria-hidden="true"></ha-icon><strong>${title}</strong>`;
}

/** Always-visible counterpart using the same settings container and body. */
export function renderSettingsSection(section: string, icon: string, title: string, body: TemplateResult) {
  return html`<section class="external-controller-conditions settings-disclosure" data-section=${section} aria-labelledby=${`settings-section-${section}`}>
    <header class="settings-section-heading" id=${`settings-section-${section}`}>${renderSettingsHeading(icon, title)}</header>
    <div class="external-controller-conditions-body">${body}</div>
  </section>`;
}
