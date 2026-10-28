import { css } from "lit";

/** Only room-group layout; field, library, button and disclosure styling is shared. */
export const roomGroupsStyles = css`
  :host { color: var(--primary-text-color); display: block; font-family: var(--ha-font-family-body, inherit); font-weight: 400; min-width: 0; }
  .room-groups-workspace .template-list-wrap { align-self: start; }
  .room-group-list-copy { color: var(--secondary-text-color); font-size: 12px; line-height: 1.4; }
  .room-group-detail-header { align-items: end; margin-bottom: 12px; }
  .room-group-detail-header .template-name-field { flex: 1; }
  .room-group-detail-header .pill + .template-name-input-wrap { margin-top: 8px; }
  .room-group-detail-header .template-detail-actions { flex: 0 0 auto; margin-right: 0; }
  .room-group-fields { display: grid; gap: 12px; margin-top: 12px; min-width: 0; }
  .room-group-field { display: grid; gap: 6px; min-width: 0; }
  .room-group-editor section.settings-disclosure .label { color: var(--primary-text-color); font-size: 13px; font-weight: 600; }
  .room-group-adoption-notice { align-items: flex-start; margin: 0; }
  .room-group-field .select-wrap { margin-top: 0; min-width: 0; }
  .room-group-field select.invalid { border-color: var(--error-color); box-shadow: 0 0 0 1px var(--error-color); }
  .room-group-command-recipient { border-inline-start: 2px solid var(--divider-color); margin-inline-start: 8px; padding-inline-start: 12px; }
  .room-group-field select { box-sizing: border-box; width: 100%; }
  .room-group-copy { color: var(--secondary-text-color); font-size: 12px; line-height: 1.5; margin: 8px 0; overflow-wrap: anywhere; }
  .room-group-delivery-description, .room-group-adoption-description, .room-group-members-description { margin: 0; }
  .room-group-member-options { display: grid; gap: 4px; margin-top: 8px; }
  .room-group-member-option { align-items: center; display: flex; gap: 8px; min-height: 44px; min-width: 0; }
  .room-group-member-option .room-group-member-choice { align-items: center; display: flex; flex: 1; gap: 10px; justify-content: start; min-height: 44px; min-width: 0; }
  .room-group-member-choice > input[type="checkbox"] { accent-color: var(--primary-color); box-sizing: border-box; flex: 0 0 18px; height: 18px; margin: 0; min-height: 0; padding: 0; width: 18px; }
  .room-group-member-choice > span { min-width: 0; overflow-wrap: anywhere; }
  .room-group-member-choice small { color: var(--secondary-text-color); display: block; font-size: 11px; line-height: 1.4; }
  .room-group-order-actions { flex: 0 0 auto; }
  .room-group-review { border: 1px solid var(--divider-color); border-radius: 8px; margin-top: 12px; padding: 12px; }
  .room-group-review ul { font-size: 12px; line-height: 1.5; margin: 8px 0; padding-inline-start: 20px; }
  .room-group-review-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .room-group-error { color: var(--error-color); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; white-space: pre-line; }
  .room-group-warning { color: var(--warning-color); }
  .room-group-status { margin-top: 12px; }
  .room-group-summary-badges { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .room-group-member-identity { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .room-group-member-identity small { color: var(--secondary-text-color); display: block; font-size: 11px; line-height: 1.4; }
  .room-group-member-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .room-group-member-dialog.documentation-dialog, .room-group-review-dialog.documentation-dialog { position: fixed; left: var(--member-dialog-center, 50%); right: auto; margin-inline: 0; transform: translateX(-50%); width: min(560px, calc(100vw - 32px), var(--member-dialog-container-width, 560px)); }
  .room-group-member-search { margin-top: 12px; }
  .room-group-member-search input { box-sizing: border-box; width: 100%; }
  .room-group-picker-options { max-height: min(360px, 48dvh); margin-block: 8px; overflow: auto; overscroll-behavior: contain; }
  .room-group-member-choice:has(input:disabled) { color: var(--secondary-text-color); cursor: default; }
  .room-group-review-dialog .room-group-review { border: 0; margin: 0; padding: 0; }
  .room-group-review-dialog .room-group-error { white-space: pre-line; }
  .room-group-review-footer { border-top: 1px solid var(--divider-color); justify-content: flex-end; padding-top: 12px; }
  .room-group-review-footer > .command-button { flex: 0 1 auto; width: auto; }
  .room-group-picker-footer { border-top: 1px solid var(--divider-color); justify-content: space-between; padding-top: 8px; }
  .room-group-picker-footer > .command-button { flex: 0 0 auto; width: auto; }
  .room-groups-workspace input:not([type="checkbox"]), .room-group-field input { margin-top: 0; }
  @media (any-pointer: coarse) {
    .room-groups-workspace input:not([type="checkbox"]), .room-groups-workspace select { height: 44px; }
    .room-group-field .inline-help { height: 44px; width: 44px; }
  }
  @media (max-width: 600px) {
    .room-group-member-choice small { font-size: 10px; }
  }
`;
