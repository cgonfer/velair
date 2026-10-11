import { css } from "lit";

export const resourceUsageStyles = css`
  .resource-section > summary { align-items: center; box-sizing: border-box; display: flex; gap: 8px; list-style: none; min-height: 44px; padding: 6px 0; cursor: pointer; color: var(--primary-text-color); font-size: 13px; line-height: 1.5; }
  .resource-section > summary::-webkit-details-marker { display: none; }
  .resource-section > summary > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .resource-section > summary > ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); flex: 0 0 18px; }
  .resource-section > summary > .resource-section-chevron { color: var(--secondary-text-color); transition: transform 160ms ease; }
  .resource-section[open] > summary > .resource-section-chevron { transform: rotate(180deg); }
  .resource-section > summary:focus-visible { border-radius: 4px; outline: 2px solid var(--primary-color); outline-offset: 3px; }
  .resource-usages { display: grid; gap: 8px; }
  .resource-usage-item { color: var(--secondary-text-color); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
  .resource-usage-group { border: 1px solid var(--divider-color); border-radius: 8px; display: grid; gap: 10px; min-width: 0; padding: 10px; }
  .resource-usage-group > header { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; gap: 8px; min-width: 0; }
  .resource-usage-group > header > ha-icon { --mdc-icon-size: 20px; color: var(--primary-color); }
  .resource-usage-group > header > strong { color: var(--primary-text-color); font-size: 12px; font-weight: 600; overflow-wrap: anywhere; }
  .resource-usage-group > header > .pill { white-space: nowrap; }
  .resource-usage-sources { display: grid; gap: 8px; min-width: 0; }
  .resource-usage-item { display: grid; grid-template-columns: minmax(80px, .8fr) minmax(0, 1.5fr); gap: 8px; min-width: 0; }
  .resource-usage-item > strong { color: var(--primary-text-color); font-weight: 500; }
  .template-usage-section { border-top: 1px solid var(--divider-color); padding-top: 12px; }
  .resource-usages p { margin: 0; color: var(--secondary-text-color); font-size: 12px; line-height: 1.5; }
  .resource-section[open] > summary { margin-bottom: 12px; }
  .template-item-main .resource-item-heading { display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--primary-text-color); font-size: inherit; }
  .resource-item-heading > strong { flex: 0 1 auto; min-width: 0; }
  .template-item-main .resource-item-footer { display: flex; align-items: center; min-width: 0; }
  .resource-use-count { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; color: var(--primary-text-color); border: 1px solid color-mix(in srgb, var(--primary-color) 30%, transparent); }
  .resource-use-count ha-icon { --mdc-icon-size: 14px; width: 14px; height: 14px; color: var(--primary-color); }
  .resource-delete-control { display: inline-flex; align-items: center; justify-content: center; }
  .resource-delete-control > button:disabled { pointer-events: none; }
  .template-assignment-source, .template-assignment-day, .template-assignment-slot { display: grid; gap: 10px; min-width: 0; }
  .template-assignment-source > strong { font-size: 13px; }
  .template-assignment-day { border-top: 1px solid var(--divider-color); padding-top: 10px; }
  .template-assignment-day > strong { color: var(--secondary-text-color); font-size: 12px; }
  .template-assignment-slot { margin: 0; border: 1px solid var(--divider-color); border-radius: 8px; padding: 10px; }
  .template-assignment-status { align-items: start; color: var(--secondary-text-color); display: flex; font-size: 12px; gap: 6px; line-height: 1.5; margin: 0; min-width: 0; }
  .template-assignment-status > ha-icon { --mdc-icon-size: 16px; flex: 0 0 16px; }
  .template-assignment-status > span { min-width: 0; overflow-wrap: anywhere; }
  .template-saved-diagnostics, .template-draft-diagnostics { background: var(--secondary-background-color); border-radius: 6px; display: grid; gap: 6px; padding: 8px; }
  .template-saved-diagnostics > strong, .template-draft-diagnostics > strong { font-size: 12px; }
  fieldset.template-editor { margin: 0; min-width: 0; }
  fieldset.template-editor[disabled] .timeline-panel { pointer-events: none; }
  .template-assignment-slot .editable-block { margin: 0; }
  .template-assignment-slot > .draft-list { background: transparent; border: 0; padding: 0; }
  @media (max-width: 420px) { .resource-usage-item { grid-template-columns: minmax(0, 1fr); gap: 3px; } }
`;
