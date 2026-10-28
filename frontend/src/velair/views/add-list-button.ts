import { html, nothing } from "lit";

/** Shared trailing add action for editable lists. */
export function renderAddListButton(label: string, onClick: () => void, disabled = false, action?: string) {
  return html`<div class="draft-add-row">
    <button class="icon-button success draft-add-button" type="button"
      title=${label} aria-label=${label} data-action=${action ?? nothing}
      ?disabled=${disabled} @click=${onClick}>
      <ha-icon icon="mdi:plus" aria-hidden="true"></ha-icon>
    </button>
  </div>`;
}
