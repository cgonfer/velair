import { html } from "lit";

/** Common empty state for resource libraries, matching Templates. */
export function renderEmptyLibrary(options: {
  message: string;
  addLabel: string;
  onAdd: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return html`<div class=${`template-placeholder compact${options.className ? ` ${options.className}` : ""}`}>
    <span>${options.message}</span>
    <button class="icon-button primary" data-action="add" type="button"
      title=${options.addLabel} aria-label=${options.addLabel}
      ?disabled=${options.disabled} @click=${options.onAdd}>
      <ha-icon icon="mdi:plus" aria-hidden="true"></ha-icon>
    </button>
  </div>`;
}
