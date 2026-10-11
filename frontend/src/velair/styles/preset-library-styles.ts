import { css } from "lit";

export const presetLibraryStyles = css`
  :host { display: block; min-width: 0; }
  .preset-library { display: grid; gap: 12px; min-width: 0; }
  .preset-library-layout { display: grid; grid-template-columns: minmax(220px, .85fr) minmax(0, 1.65fr); gap: 12px; align-items: start; }
  .preset-fields, .preset-editor { display: grid; gap: 16px; min-width: 0; }
  .preset-editor .template-detail-heading { align-items: center; flex-direction: row; }
  .preset-editor .template-name-field { flex: 1; min-width: 0; }
  .preset-editor .template-detail-actions { flex: 0 0 auto; width: auto; }
  .preset-automation-id { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 8px; align-items: center; min-width: 0; }
  .preset-automation-id-value { display: grid; gap: 4px; min-width: 0; font-size: 12px; color: var(--secondary-text-color); }
  .preset-automation-id code { color: var(--primary-text-color); overflow-wrap: anywhere; }
  .preset-copy-status { grid-column: 1 / -1; font-size: 12px; }
  .preset-copy-status:empty { display: none; }
  .preset-copy-status.success { color: var(--success-color, #43a047); }
  .preset-copy-status.error { color: var(--error-color); }
  .preset-config-fields { border: 0; padding: 0; margin: 0; min-width: 0; display: grid; gap: 16px; }
  .preset-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .preset-fields label, .preset-compatibility label { display: grid; gap: 6px; color: var(--secondary-text-color); font-size: 12px; min-width: 0; }
  .preset-fields input { box-sizing: border-box; width: 100%; min-width: 0; min-height: 40px; padding: 9px 12px; border: 1px solid var(--divider-color); border-radius: 8px; background: var(--card-background-color); color: var(--primary-text-color); font: inherit; font-size: 14px; }
  .preset-fields input:focus { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .preset-fields .full-width { grid-column: 1 / -1; }
  .preset-editor details { border-top: 1px solid var(--divider-color); padding-top: 12px; }
  .preset-editor summary { cursor: pointer; color: var(--primary-text-color); font-size: 13px; line-height: 1.5; padding: 4px 0; }
  .preset-editor details[open] summary { margin-bottom: 12px; }
  .preset-editor p { margin: 0; color: var(--secondary-text-color); font-size: 12px; line-height: 1.5; }
  .preset-compatibility { display: grid; gap: 12px; }
  .preset-fields .select-wrap, .preset-check-controls .select-wrap { min-width: 0; width: 100%; margin-top: 0; }
  .preset-fields select, .preset-check-controls select { box-sizing: border-box; min-width: 0; width: 100%; font-size: 14px; }
  .preset-check-controls { display: grid; grid-template-columns: minmax(0, 1fr) 38px; gap: 8px; align-items: center; min-width: 0; }
  .preset-check-button { height: 38px; width: 38px; }
  .preset-compatibility-result { display: grid; grid-template-columns: 20px minmax(0, 1fr); align-items: start; gap: 8px; border: 1px solid var(--divider-color); border-radius: 8px; padding: 10px; min-width: 0; font-size: 12px; line-height: 1.4; }
  .preset-compatibility-result ha-icon { --mdc-icon-size: 20px; }
  .preset-compatibility-result > div { display: grid; gap: 4px; min-width: 0; overflow-wrap: anywhere; }
  .preset-compatibility-result.success { color: var(--success-color, #43a047); background: color-mix(in srgb, var(--success-color, #43a047) 8%, var(--card-background-color)); border-color: color-mix(in srgb, var(--success-color, #43a047) 30%, var(--divider-color)); }
  .preset-compatibility-result.error { color: var(--error-color); background: color-mix(in srgb, var(--error-color) 8%, var(--card-background-color)); border-color: color-mix(in srgb, var(--error-color) 30%, var(--divider-color)); }
  .preset-compatibility-result.pending { color: var(--primary-color); }
  .preset-editor .preset-compatibility-result p { color: var(--primary-text-color); }
  .preset-list .template-item-main span { white-space: normal; line-height: 1.4; }
  .preset-list .template-item-main .preset-item-heading { display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--primary-text-color); font-size: inherit; }
  .preset-item-heading > strong { flex: 0 1 auto; min-width: 0; }
  .preset-list .template-item-main small { color: var(--secondary-text-color); }
  .preset-use-count { display: inline-flex; align-items: center; gap: 5px; }
  .preset-list .template-item-main .preset-use-count { color: var(--primary-text-color); border: 1px solid color-mix(in srgb, var(--primary-color) 30%, transparent); }
  .preset-use-count ha-icon { --mdc-icon-size: 14px; width: 14px; height: 14px; color: var(--primary-color); }
  .preset-delete-control { display: inline-flex; align-items: center; justify-content: center; }
  .preset-delete-control > button:disabled { pointer-events: none; }
  .preset-list .section-heading { min-width: 0; }
  .preset-list-empty { margin: 0; padding: 8px 2px; color: var(--secondary-text-color); font-size: 12px; line-height: 1.4; }
  .preset-list .section-label { white-space: normal; overflow: visible; text-overflow: clip; line-height: 1.35; }
  @media (max-width: 760px) { .preset-library-layout { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 420px) { .preset-fields { grid-template-columns: minmax(0, 1fr); } }
`;
