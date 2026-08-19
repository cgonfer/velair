import { css } from "lit";

export const diagnosticsStyles = css`
  .diagnostics-view { display: grid; gap: 14px; }
  .diagnostics-intro { align-items: center; display: grid; gap: 10px; grid-template-columns: 24px minmax(0, 1fr); padding: 2px 4px 4px; }
  .diagnostics-intro > ha-icon { --mdc-icon-size: 22px; color: var(--primary-color); }
  .diagnostics-intro > span { display: grid; gap: 2px; min-width: 0; }
  .diagnostics-intro strong { color: var(--primary-text-color); font-size: 14px; line-height: 1.25; }
  .diagnostics-intro small { color: var(--secondary-text-color); font-size: 12px; line-height: 1.35; }
  .diagnostics-export-section { background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 10px; overflow: hidden; }
  .diagnostics-download { align-items: center; background: transparent; border: 0; color: var(--primary-text-color); cursor: pointer; display: grid; font: inherit; gap: 10px; grid-template-columns: auto minmax(0, 1fr) auto; padding: 12px 14px; text-align: left; width: 100%; }
  .diagnostics-download:hover { background: color-mix(in srgb, var(--primary-color) 8%, transparent); }
  .diagnostics-download:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
  .diagnostics-download > ha-icon:first-child { color: var(--primary-color); }
  .diagnostics-download > span { display: grid; gap: 2px; min-width: 0; }
  .diagnostics-download strong { font-size: 14px; }
  .diagnostics-download small { color: var(--secondary-text-color); font-size: 12px; line-height: 1.35; }
  .diagnostics-export-chevron { color: var(--secondary-text-color); }
  .diagnostics-export-panel { border-top: 1px solid var(--divider-color); display: grid; gap: 10px; padding: 14px; }
  .diagnostics-export-panel h3 { font-size: 14px; margin: 0; }
  .diagnostics-export-panel label { align-items: center; display: flex; gap: 8px; }
  .diagnostics-export-checkbox { justify-self: start; min-width: 0; }
  .diagnostics-export-checkbox input[type="checkbox"] { accent-color: var(--primary-color); box-sizing: border-box; flex: 0 0 18px; height: 18px; margin: 0; min-height: 0; padding: 0; width: 18px; }
  .diagnostics-export-checkbox span { line-height: 1.35; min-width: 0; }
  .diagnostics-export-panel p { color: var(--secondary-text-color); font-size: 12px; margin: 0; }
  .diagnostics-export-panel .diagnostics-export-warning { color: var(--error-color, #c62828); }
  .diagnostics-export-panel > div { display: flex; gap: 8px; justify-content: flex-end; }
  .diagnostics-history-policy h3 { font-size: 14px; font-weight: 600; line-height: 1.3; margin: 0; }
  .diagnostics-history-policy p { color: var(--secondary-text-color); font-size: 12px; line-height: 1.4; margin: 4px 0 0; }
  .diagnostics-summary { align-items: center; background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 10px; display: grid; gap: 12px; grid-template-columns: auto minmax(0, 1fr); padding: 14px; }
  .diagnostics-summary.status-warning { border-color: var(--warning-color, #f9a825); }
  .diagnostics-summary.status-error { border-color: var(--error-color, #c62828); }
  .diagnostics-summary strong, .diagnostics-summary span, .diagnostics-summary small { display: block; }
  .diagnostics-summary span, .diagnostics-summary small { color: var(--secondary-text-color); margin-top: 3px; }
  .diagnostics-master-detail { align-items: start; display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
  .diagnostics-unit-list { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 4px; scrollbar-width: thin; }
  .diagnostics-unit-option { align-items: center; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; color: var(--primary-text-color); cursor: pointer; display: grid; flex: 0 0 clamp(220px, 25vw, 280px); font: inherit; gap: 8px; grid-template-columns: auto minmax(0, 1fr) auto auto; min-width: 0; padding: 10px; text-align: left; }
  .diagnostics-unit-option:not(.selected) { background: color-mix(in srgb, var(--secondary-background-color) 78%, var(--card-background-color)); border-color: color-mix(in srgb, var(--secondary-text-color) 32%, var(--divider-color)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--card-background-color) 65%, transparent); }
  .diagnostics-unit-option:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
  .diagnostics-unit-option.selected { background: color-mix(in srgb, var(--primary-color) 10%, var(--card-background-color)); border-color: var(--primary-color); }
  .diagnostics-unit-name { min-width: 0; }
  .diagnostics-unit-name strong, .diagnostics-unit-name small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .diagnostics-unit-name small, .diagnostics-unit-heading small, .diagnostics-unit-state { color: var(--secondary-text-color); }
  .diagnostics-detail-panel, .diagnostics-history, .diagnostics-history-policy { background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 10px; min-width: 0; padding: 14px; }
  .diagnostics-history { container-type: inline-size; }
  .diagnostics-detail-panel.status-warning { border-top-color: var(--warning-color, #f9a825); }
  .diagnostics-detail-panel.status-error { border-top-color: var(--error-color, #c62828); }
  .diagnostics-unit-placeholder { align-items: center; color: var(--secondary-text-color); display: flex; gap: 8px; justify-content: center; min-height: 120px; }
  .diagnostics-unit-heading { align-items: center; display: grid; gap: 10px; grid-template-columns: auto minmax(0, 1fr) auto; }
  .diagnostics-unit-identity { min-width: 0; }
  .diagnostics-feature-chips { display: flex; flex-wrap: wrap; gap: 5px; justify-content: flex-start; margin-top: 6px; min-width: 0; }
  .diagnostics-feature-chips > span { align-items: center; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 999px; display: flex; font-size: 11px; gap: 4px; padding: 3px 7px; }
  .diagnostics-feature-chips ha-icon { --mdc-icon-size: 14px; color: var(--primary-color); }
  .diagnostics-unit-heading h3 { margin: 0; }
  .diagnostics-climate-icon { --mdc-icon-size: 22px; color: var(--primary-color); }
  .diagnostics-status-dot { background: var(--success-color, #2e7d32); border-radius: 50%; height: 10px; width: 10px; }
  .diagnostics-status-dot.warning { background: var(--warning-color, #f9a825); }
  .diagnostics-status-dot.error { background: var(--error-color, #c62828); }
  .diagnostics-issues { display: grid; gap: 6px; margin-top: 10px; }
  .diagnostics-issue { align-items: center; display: flex; gap: 8px; margin: 0; }
  .diagnostics-issue.warning ha-icon { color: var(--warning-color, #f9a825); }
  .diagnostics-issue.error ha-icon { color: var(--error-color, #c62828); }
  .diagnostics-privacy { color: var(--secondary-text-color); font-size: 12px; }
  .diagnostics-groups { display: grid; gap: 10px; margin-top: 12px; }
  .diagnostics-group, .diagnostics-detail { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; padding: 10px 12px; }
  .diagnostics-group h4 { align-items: center; display: flex; font-size: 14px; gap: 7px; margin: 0 0 8px; }
  .diagnostics-group h4 ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); }
  .diagnostics-rows { display: grid; gap: 6px; margin: 0; }
  .diagnostics-rows > div { align-items: baseline; display: grid; gap: 12px; grid-template-columns: minmax(130px, .45fr) minmax(0, 1fr); }
  .diagnostics-rows dt { color: var(--secondary-text-color); }
  .diagnostics-rows dd { margin: 0; overflow-wrap: anywhere; }
  .diagnostics-mode-list { align-items: center; display: flex; flex-wrap: wrap; gap: 6px; }
  .diagnostics-state-chip { border: 1px solid var(--divider-color); border-radius: 999px; display: inline-flex; font-size: 12px; line-height: 1; padding: 5px 8px; }
  .diagnostics-state-chip.success { background: color-mix(in srgb, var(--success-color, #2e7d32) 14%, var(--card-background-color)); border-color: color-mix(in srgb, var(--success-color, #2e7d32) 42%, var(--divider-color)); }
  .diagnostics-state-chip.warning { background: color-mix(in srgb, var(--warning-color, #f9a825) 15%, var(--card-background-color)); border-color: color-mix(in srgb, var(--warning-color, #f9a825) 45%, var(--divider-color)); }
  .diagnostics-state-chip.error { background: color-mix(in srgb, var(--error-color, #c62828) 13%, var(--card-background-color)); border-color: color-mix(in srgb, var(--error-color, #c62828) 42%, var(--divider-color)); }
  .diagnostics-state-chip.neutral { background: var(--secondary-background-color); }
  .diagnostics-function-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
  .diagnostics-function { border-left: 3px solid color-mix(in srgb, var(--primary-color) 55%, var(--divider-color)); padding: 2px 0 2px 10px; }
  .diagnostics-function > strong { align-items: center; display: flex; gap: 6px; margin-bottom: 6px; }
  .diagnostics-function > strong ha-icon { --mdc-icon-size: 16px; color: var(--secondary-text-color); }
  .diagnostics-function .diagnostics-rows > div { display: block; }
  .diagnostics-function .diagnostics-rows dd { margin-top: 2px; }
  .diagnostics-sensors { display: grid; gap: 6px; list-style: none; margin: 10px 0 0; padding: 0; }
  .diagnostics-sensors li { align-items: center; display: grid; gap: 12px; grid-template-columns: minmax(130px, .45fr) minmax(0, 1fr); }
  .diagnostics-sensor-detail { align-items: center; display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
  .diagnostics-sensor-detail > ha-icon { --mdc-icon-size: 16px; color: var(--secondary-text-color); flex: 0 0 auto; }
  .diagnostics-sensor-entity { color: var(--secondary-text-color); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .diagnostics-sensor-value { background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 999px; color: var(--primary-text-color); flex: 0 0 auto; font-size: 12px; padding: 3px 7px; }
  .diagnostics-detail summary, .diagnostics-history > summary { cursor: pointer; font-weight: 600; }
  .diagnostics-history-policy header { align-items: start; display: flex; gap: 12px; justify-content: space-between; }
  .diagnostics-section-heading { align-items: start; display: grid; gap: 8px; grid-template-columns: 36px minmax(0, 1fr); }
  .diagnostics-section-heading > ha-icon { --mdc-icon-size: 20px; color: var(--primary-color); justify-self: center; margin-top: 1px; }
  .diagnostics-history-policy .diagnostics-clear-history { background: transparent; border-color: var(--divider-color); color: var(--primary-text-color); flex: 0 0 auto; min-height: 36px; padding: 0 10px; width: auto; }
  .diagnostics-history-policy .diagnostics-clear-history ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
  .diagnostics-category-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); margin-top: 12px; }
  .diagnostics-category-grid label { align-items: center; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; cursor: pointer; display: grid; gap: 10px; grid-template-columns: 20px minmax(0, 1fr); min-height: 64px; padding: 12px; }
  .diagnostics-category-grid input { margin: 0; }
  .diagnostics-category-grid strong, .diagnostics-category-grid small { display: block; }
  .diagnostics-category-grid small { color: var(--secondary-text-color); margin-top: 3px; }
  .diagnostics-history > header { align-items: start; display: flex; gap: 12px; justify-content: space-between; }
  .diagnostics-history > header > div { min-width: 0; }
  .diagnostics-history h3 { font-size: 14px; font-weight: 600; margin: 0; }
  .diagnostics-history header p { color: var(--secondary-text-color); font-size: 12px; margin: 3px 0 0; }
  .diagnostics-clear-filters { background: transparent; border-color: var(--divider-color); color: var(--primary-text-color); flex: 0 0 auto; min-height: 36px; padding: 0 10px; width: auto; }
  .diagnostics-clear-filters ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
  .diagnostics-clear-filters.success ha-icon { color: currentColor; }
  .diagnostics-history-filters { display: grid; gap: 10px; grid-template-columns: repeat(4, minmax(150px, 1fr)); margin-top: 12px; }
  .diagnostics-history-filters > label, .diagnostics-source-filter { color: var(--secondary-text-color); display: grid; font-size: 12px; gap: 5px; min-width: 0; }
  .diagnostics-history-filters input, .diagnostics-history-filters select, .diagnostics-source-trigger { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 7px; box-sizing: border-box; color: var(--primary-text-color); font: inherit; min-height: 38px; min-width: 0; padding: 6px 8px; width: 100%; }
  .diagnostics-source-filter { position: relative; }
  .diagnostics-source-trigger { align-items: center; cursor: pointer; display: flex; gap: 8px; justify-content: space-between; text-align: left; }
  .diagnostics-source-trigger span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .diagnostics-source-trigger ha-icon { --mdc-icon-size: 18px; flex: 0 0 auto; }
  .diagnostics-source-popover { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; box-shadow: var(--ha-card-box-shadow, 0 4px 12px rgba(0, 0, 0, .2)); box-sizing: border-box; color: var(--primary-text-color); display: grid; gap: 8px; left: 0; max-width: 100%; overflow-y: auto; padding: 8px; position: absolute; top: calc(100% + 4px); width: min(320px, calc(100vw - 48px)); z-index: 4; }
  .diagnostics-source-popover.placement-up { bottom: calc(100% + 4px); top: auto; }
  .diagnostics-source-popover fieldset { border: 0; display: grid; gap: 2px; margin: 0; min-width: 0; padding: 0; }
  .diagnostics-source-popover legend { clip: rect(0 0 0 0); clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
  .diagnostics-source-popover label { align-items: center; cursor: pointer; display: grid; gap: 8px; grid-template-columns: 20px minmax(0, 1fr); min-height: 36px; padding: 0 6px; }
  .diagnostics-source-popover label span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .diagnostics-source-popover input { min-height: auto; padding: 0; width: auto; }
  .diagnostics-source-done { justify-self: end; min-height: 36px; width: auto; }
  .diagnostics-filter-error { color: var(--error-color, #c62828); font-size: 12px; margin: 8px 0 0; }
  .diagnostics-history-results { color: var(--secondary-text-color); font-size: 12px; margin: 10px 0 0; }
  .diagnostics-history-table { min-width: 0; }
  .diagnostics-history-header, .diagnostics-history li { grid-template-columns: var(--diagnostics-log-time, 180px) 12px var(--diagnostics-log-climate, 96px) 12px var(--diagnostics-log-type, 96px) 12px minmax(180px, 1fr); }
  .diagnostics-history-header { align-items: center; color: var(--secondary-text-color); display: grid; font-size: 11px; font-weight: 600; margin-top: 8px; padding: 0 10px 5px; }
  .diagnostics-log-resizer { align-self: stretch; cursor: col-resize; position: relative; touch-action: none; }
  .diagnostics-log-resizer::after { background: var(--divider-color); bottom: 2px; content: ""; left: 5px; position: absolute; top: 2px; width: 1px; }
  .diagnostics-log-resizer:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -1px; }
  .diagnostics-history ol { background: color-mix(in srgb, var(--secondary-background-color) 75%, var(--card-background-color)); border: 1px solid var(--divider-color); border-radius: 8px; display: grid; font-family: var(--code-font-family, ui-monospace, SFMono-Regular, Consolas, monospace); gap: 0; list-style: none; margin: 0; padding: 0; }
  .diagnostics-history li { align-items: start; display: grid; padding: 9px 10px; }
  .diagnostics-history li time { grid-column: 1; }
  .diagnostics-history-climate { grid-column: 3; }
  .diagnostics-history-type { grid-column: 5; }
  .diagnostics-history-message { grid-column: 7; }
  .diagnostics-history li + li { border-top: 1px solid var(--divider-color); }
  .diagnostics-history li time, .diagnostics-history-climate, .diagnostics-history-type { background: var(--card-background-color); border-radius: 4px; color: var(--secondary-text-color); font-size: 11px; overflow: hidden; padding: 2px 5px; text-overflow: ellipsis; white-space: nowrap; }
  .diagnostics-history-message { color: var(--primary-text-color); font-size: 12px; min-width: 0; overflow-wrap: anywhere; }
  @container (max-width: 609px) {
    .diagnostics-history-header { display: none; }
    .diagnostics-history ol { margin-top: 8px; }
    .diagnostics-history li { gap: 8px; grid-template-columns: minmax(110px, auto) minmax(0, 1fr) minmax(100px, auto); }
    .diagnostics-history li time { grid-column: 1; }
    .diagnostics-history-climate { grid-column: 2; }
    .diagnostics-history-type { grid-column: 3; }
    .diagnostics-history-message { grid-column: 1 / -1; }
  }
  @media (max-width: 899px) {
    .diagnostics-unit-option { flex-basis: min(260px, 78vw); }
    .diagnostics-history-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .diagnostics-history-header { display: none; }
    .diagnostics-history ol { margin-top: 8px; }
    .diagnostics-history li { gap: 8px; grid-template-columns: minmax(110px, auto) minmax(0, 1fr) minmax(100px, auto); }
    .diagnostics-history li time { grid-column: 1; }
    .diagnostics-history-climate { grid-column: 2; }
    .diagnostics-history-type { grid-column: 3; }
    .diagnostics-history-message { grid-column: 1 / -1; }
  }
  @media (max-width: 600px) {
    .diagnostics-intro { grid-template-columns: 24px minmax(0, 1fr); }
    .diagnostics-intro .command-button { grid-column: 1 / -1; width: 100%; }
    .diagnostics-history-policy header { align-items: start; }
    .diagnostics-history-policy .diagnostics-clear-history { height: 40px; min-height: 40px; padding: 0; width: 40px; }
    .diagnostics-history-policy .diagnostics-clear-history span { clip: rect(0 0 0 0); clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
    .diagnostics-clear-filters { min-height: 40px; }
    .diagnostics-history-filters { grid-template-columns: minmax(0, 1fr); }
    .diagnostics-source-trigger { min-height: 44px; }
    .diagnostics-source-popover { box-shadow: none; min-width: 0; position: static; width: 100%; }
    .diagnostics-source-popover label { min-height: 44px; }
    .diagnostics-source-done { min-height: 44px; width: 100%; }
    .diagnostics-history li { gap: 6px; grid-template-columns: max-content; max-width: 100%; overflow-x: auto; scrollbar-width: thin; }
    .diagnostics-history li time,
    .diagnostics-history-climate,
    .diagnostics-history-type,
    .diagnostics-history-message { grid-column: 1; max-width: none; overflow: visible; text-overflow: clip; white-space: nowrap; width: max-content; }
    .diagnostics-rows > div, .diagnostics-sensors li { display: block; }
    .diagnostics-rows dd, .diagnostics-sensor-detail { margin-top: 3px; }
    .diagnostics-sensor-detail { display: flex; }
  }
`;
