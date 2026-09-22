import { css } from "lit";

export const climateCardStyles = css`
  .climate-card-view {
    --climate-action-color: var(--secondary-text-color);
    --climate-card-surface: color-mix(in srgb, var(--secondary-background-color) 72%, var(--card-background-color));
    --climate-card-elevated-surface: color-mix(in srgb, var(--card-background-color) 88%, var(--climate-action-color) 12%);
    --climate-card-border: color-mix(in srgb, var(--divider-color) 82%, var(--climate-action-color) 18%);
    --climate-card-soft-shadow: 0 10px 28px color-mix(in srgb, var(--climate-action-color) 9%, transparent);
    color: var(--primary-text-color);
    container: climate-card / inline-size;
    display: grid;
    gap: 12px;
    overflow: visible;
    padding-top: 4px;
    position: relative;
  }
  .climate-card-view::before {
    background:
      radial-gradient(circle at 9% 4%, color-mix(in srgb, var(--climate-action-color) 15%, transparent) 0 16%, transparent 38%),
      linear-gradient(145deg, color-mix(in srgb, var(--climate-action-color) 7%, transparent), transparent 42%);
    border-radius: 16px;
    content: "";
    inset: -6px;
    opacity: .72;
    pointer-events: none;
    position: absolute;
    z-index: 0;
  }
  .climate-card-view > * { position: relative; z-index: 1; }
  .climate-card-view.climate-action-heating,
  .climate-card-view.climate-action-preheating { --climate-action-color: var(--warning-color, #e69b35); }
  .climate-card-view.climate-action-cooling { --climate-action-color: var(--primary-color, #4f8fcf); }
  .climate-card-view.climate-action-drying { --climate-action-color: var(--info-color, #4b9c9a); }
  .climate-card-view.climate-action-fan { --climate-action-color: var(--primary-color, #4f8fcf); }
  .climate-card-view.climate-action-idle.climate-mode-heat { --climate-action-color: color-mix(in srgb, var(--warning-color, #e69b35) 55%, var(--secondary-text-color)); }
  .climate-card-view.climate-action-idle.climate-mode-cool { --climate-action-color: color-mix(in srgb, var(--primary-color, #4f8fcf) 55%, var(--secondary-text-color)); }
  .climate-card-view.climate-action-unavailable { --climate-action-color: var(--error-color, #db5a5a); }
  .climate-card-state-line { background: linear-gradient(90deg, color-mix(in srgb, var(--climate-action-color) 56%, transparent), var(--climate-action-color), color-mix(in srgb, var(--climate-action-color) 48%, transparent)); border-radius: 999px; box-shadow: 0 0 12px color-mix(in srgb, var(--climate-action-color) 18%, transparent); height: 4px; overflow: hidden; position: relative; }
  .climate-action-idle .climate-card-state-line { opacity: .58; }
  .climate-action-off .climate-card-state-line { opacity: .38; }
  .climate-action-unavailable .climate-card-state-line { background: repeating-linear-gradient(90deg, var(--climate-action-color) 0 9px, transparent 9px 14px); }
  .climate-action-heating .climate-card-state-line::after,
  .climate-action-preheating .climate-card-state-line::after,
  .climate-action-cooling .climate-card-state-line::after {
    animation: climate-card-energy 4.8s ease-in-out 1;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--card-background-color) 62%, transparent), transparent);
    content: ""; inset: 0; position: absolute; transform: translateX(-100%);
  }
  @keyframes climate-card-energy { 0%, 12% { transform: translateX(-100%); } 68%, 100% { transform: translateX(100%); } }
  .climate-card-header { align-items: center; display: flex; gap: 10px; min-width: 0; }
  .climate-card-operation-icon { --mdc-icon-size: 24px; background: linear-gradient(145deg, color-mix(in srgb, var(--climate-action-color) 20%, var(--card-background-color)), color-mix(in srgb, var(--climate-action-color) 7%, var(--card-background-color))); border: 1px solid color-mix(in srgb, var(--climate-action-color) 34%, var(--divider-color)); border-radius: 12px; box-shadow: inset 0 1px 0 color-mix(in srgb, var(--primary-text-color) 8%, transparent), 0 5px 14px color-mix(in srgb, var(--climate-action-color) 11%, transparent); color: var(--climate-action-color); flex: 0 0 auto; padding: 7px; }
  .climate-card-header-content { display: grid; flex: 1 1 auto; min-width: 0; }
  .climate-card-brand { align-items: center; align-self: center; background: transparent; border: 0; border-radius: 9px; color: var(--secondary-text-color); cursor: pointer; display: inline-flex; flex: 0 0 auto; font: inherit; gap: 6px; justify-content: center; margin-inline-start: auto; min-height: 44px; min-width: 44px; padding: 5px 6px; }
  .climate-card-brand { transition: background-color 150ms ease, color 150ms ease, transform 150ms ease; }
  .climate-card-brand:hover { background: color-mix(in srgb, var(--primary-color) 8%, transparent); color: var(--primary-color); transform: translateY(-1px); }
  .climate-card-brand:focus-visible { box-shadow: inset 0 0 0 2px var(--primary-color); outline: none; }
  .climate-card-brand img { display: block; flex: 0 0 auto; height: 20px; object-fit: contain; width: 20px; }
  .climate-card-brand-copy { align-content: center; display: grid; flex: 0 0 auto; grid-template-rows: repeat(2, auto); line-height: 1.05; text-align: left; white-space: nowrap; }
  .climate-card-brand-copy strong { color: var(--primary-text-color); display: block; font-size: 10px; font-weight: 600; }
  .climate-card-brand-copy small { color: var(--secondary-text-color); display: block; font-size: 8px; font-weight: 400; }
  .climate-card-title { align-items: center; display: flex; gap: 6px; min-width: 0; }
  .climate-card-title h2 { font-size: 18px; line-height: 1.2; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .climate-card-title ha-icon { --mdc-icon-size: 16px; flex: 0 0 auto; }
  .climate-card-title ha-icon.available { color: var(--success-color, #65a56f); }
  .climate-card-title ha-icon.unavailable { color: var(--error-color, #db5a5a); }
  .climate-card-operation { align-items: baseline; display: flex; flex-wrap: wrap; gap: 2px 6px; margin-top: 2px; min-width: 0; }
  .climate-card-operation strong, .climate-card-operation small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .climate-card-operation strong { font-size: 13px; }
  .climate-card-operation small { color: var(--secondary-text-color); font-size: 11px; }
  .climate-card-thermostat-controls { background: transparent; border: 0; border-radius: 11px; display: grid; min-width: 0; overflow: visible; }
  .climate-card-control-toolbar { --climate-card-toolbar-island-height: 46px; align-items: end; background: transparent; column-gap: 12px; display: grid; grid-template-columns: max-content minmax(0, 1fr); min-width: 0; }
  .climate-card-thermostat-controls:not(.has-actions) .climate-card-control-toolbar { grid-template-columns: max-content; }
  .climate-card-thermostat-controls:not(.has-authority) .climate-card-control-toolbar { grid-template-columns: minmax(0, 1fr); }
  .climate-card-manual-control { align-items: center; align-self: stretch; background: linear-gradient(145deg, color-mix(in srgb, var(--secondary-background-color) 88%, var(--climate-action-color) 12%), var(--secondary-background-color)); border: 1px solid var(--climate-card-border); border-bottom: 0; border-radius: 11px 11px 0 0; box-sizing: border-box; display: grid; gap: 5px; grid-column: 1; grid-template-columns: auto; justify-items: start; justify-self: start; min-height: var(--climate-card-toolbar-island-height); min-width: 0; padding: 7px; }
  .climate-card-thermostat-controls:not(.has-pane) .climate-card-manual-control { border-bottom: 1px solid var(--climate-card-border); border-radius: 11px; }
  .climate-card-manual-segmented { background: var(--secondary-background-color); border: 1px solid color-mix(in srgb, var(--primary-text-color) 24%, var(--divider-color)); border-radius: 8px; display: grid; flex: 0 0 auto; grid-column: 1; grid-row: 1; grid-template-columns: repeat(2, max-content); isolation: isolate; justify-self: start; max-width: 100%; min-width: 0; overflow: hidden; position: relative; z-index: 3; }
  .climate-card-manual-segmented button { align-items: center; background: transparent; border: 0; border-radius: 0; color: var(--secondary-text-color); cursor: pointer; display: inline-flex; font: inherit; font-size: 10px; gap: 4px; justify-content: center; line-height: 1; min-height: 28px; min-width: 0; padding: 2px 6px; transition: background-color 120ms ease, color 120ms ease, filter 120ms ease; white-space: nowrap; }
  .climate-card-manual-segmented button ha-icon { --mdc-icon-size: 12px; color: currentColor; flex: 0 0 auto; }
  .climate-card-manual-segmented button + button { border-inline-start: 1px solid color-mix(in srgb, var(--primary-text-color) 20%, var(--divider-color)); }
  .climate-card-manual-segmented button:not([aria-pressed="true"]):not([aria-disabled="true"]):hover { background: color-mix(in srgb, var(--primary-color) 18%, var(--secondary-background-color)); color: var(--primary-text-color); }
  .climate-card-manual-segmented button[aria-pressed="true"] { background: var(--primary-color); color: var(--text-primary-color, var(--card-background-color)); font-weight: 600; }
  .climate-card-manual-segmented button[aria-pressed="true"]:not([aria-disabled="true"]):hover { background: color-mix(in srgb, var(--primary-color) 88%, var(--primary-text-color)); }
  .climate-card-manual-segmented button:active:not([aria-disabled="true"]) { filter: brightness(.92); }
  .climate-card-manual-segmented button[aria-disabled="true"] { cursor: not-allowed; opacity: .55; }
  .climate-card-manual-segmented[aria-busy="true"] button[aria-disabled="true"] { cursor: wait; opacity: 1; }
  .climate-card-manual-segmented button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -3px; position: relative; z-index: 1; }
  .climate-card-manual-segmented button[aria-pressed="true"]:focus-visible { outline-color: var(--text-primary-color, var(--card-background-color)); }
  .climate-card-control-reason { color: var(--secondary-text-color); font-size: 10px; grid-column: 1 / -1; line-height: 1.3; min-width: 0; }
  .climate-card-control-surface { align-items: stretch; background: linear-gradient(145deg, var(--climate-card-elevated-surface), var(--secondary-background-color)); border: 1px solid var(--climate-card-border); border-radius: 11px; box-shadow: var(--climate-card-soft-shadow); display: grid; grid-template-columns: minmax(88px, 1fr) auto 56px; min-width: 0; overflow: visible; }
  .climate-card-thermostat-controls.has-authority.has-actions .climate-card-control-surface,
  .climate-card-thermostat-controls.has-authority.has-actions .climate-card-control-pane { border-radius: 0 0 11px 11px; }
  .climate-card-thermostat-controls.has-authority:not(.has-actions) .climate-card-control-surface,
  .climate-card-thermostat-controls.has-authority:not(.has-actions) .climate-card-control-pane { border-radius: 0 11px 11px 11px; }
  .climate-card-thermostat-controls.has-actions:not(.has-authority) .climate-card-control-surface,
  .climate-card-thermostat-controls.has-actions:not(.has-authority) .climate-card-control-pane { border-radius: 11px 0 11px 11px; }
  .climate-card-thermostat-controls:not(.has-toolbar) .climate-card-control-surface { border-radius: 11px; border-top: 0; }
  .climate-card-control-surface:not(:has(.climate-card-native-link)) { grid-template-columns: minmax(88px, 1fr) auto; }
  .climate-card-target-control, .climate-card-mode-control { box-sizing: border-box; min-width: 0; }
  .climate-card-target-control { align-items: center; display: flex; grid-column: 2; grid-row: 1; justify-content: center; padding: 5px 7px; }
  .climate-card-target-stepper { align-items: stretch; background: transparent; display: grid; grid-template-columns: 44px minmax(64px, 1fr) 44px; overflow: hidden; }
  .climate-card-target-value { align-content: center; display: grid; line-height: 1.05; min-width: 0; row-gap: 4px; text-align: center; }
  .climate-card-target-value small { color: var(--secondary-text-color); font-size: 8px; font-weight: 500; line-height: 1; }
  .climate-card-target-control strong { font-size: 15px; text-align: center; white-space: nowrap; }
  .climate-card-target-control button, .climate-card-native-link { align-items: center; background: transparent; border: 0; border-radius: 8px; color: var(--primary-text-color); cursor: pointer; display: inline-flex; font: inherit; justify-content: center; min-height: 44px; padding: 0; }
  .climate-card-target-control button { border-radius: 8px; min-height: 44px; width: 44px; }
  .climate-card-target-control button:hover:not(:disabled) { background: color-mix(in srgb, var(--primary-color) 14%, var(--secondary-background-color)); }
  .climate-card-target-control button:active:not(:disabled) { filter: brightness(.94); transform: scale(.96); }
  .climate-card-native-link:hover { background: color-mix(in srgb, var(--primary-color) 9%, var(--card-background-color)); }
  .climate-card-target-control button:focus-visible, .climate-card-native-link:focus-visible, .climate-card-mode-control summary:focus-visible, .climate-card-mode-options button:focus-visible { box-shadow: inset 0 0 0 2px var(--primary-color); outline: none; }
  .climate-card-target-control button:disabled { cursor: default; opacity: .5; }
  .climate-card-target-control button:disabled { background: transparent; }
  .climate-card-target-control ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); }
  .climate-card-range-controls { display: grid; grid-column: 2; grid-row: 1; grid-template-columns: repeat(2, minmax(0, 1fr)); min-width: 0; position: relative; }
  .climate-card-range-controls > .climate-card-target-control { grid-column: auto; grid-row: auto; }
  .climate-card-range-controls > .climate-card-target-control + .climate-card-target-control { position: relative; }
  .climate-card-range-controls > .climate-card-target-control { border-inline-start: 0; }
  .climate-card-mode-control { background: transparent; grid-column: 1; grid-row: 1; min-width: 0; position: relative; }
  .climate-card-mode-control summary { align-items: center; border-radius: 8px; cursor: pointer; display: grid; gap: 8px; grid-template-columns: auto minmax(0, 1fr) auto; list-style: none; margin: 4px; min-height: 48px; padding: 0 9px; transition: background-color 120ms ease, box-shadow 120ms ease; }
  .climate-card-mode-control:not([data-disabled]) summary { background: color-mix(in srgb, var(--primary-color) 6%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 20%, var(--divider-color)); }
  .climate-card-mode-control:not([data-disabled]) summary:hover { background: color-mix(in srgb, var(--primary-color) 11%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 34%, var(--divider-color)); }
  .climate-card-mode-control[open]:not([data-disabled]) summary { background: color-mix(in srgb, var(--primary-color) 14%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 44%, var(--divider-color)); }
  .climate-card-mode-control summary::-webkit-details-marker { display: none; }
  .climate-card-mode-control summary > ha-icon:first-child { --mdc-icon-size: 20px; color: var(--climate-action-color); }
  .climate-card-mode-control summary strong { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .climate-card-mode-control .select-indicator { --mdc-icon-size: 18px; color: var(--secondary-text-color); transition: transform 120ms ease; }
  .climate-card-mode-control[open] .select-indicator { transform: rotate(180deg); }
  .climate-card-mode-control[data-disabled] summary { cursor: default; opacity: .5; }
  .climate-card-mode-control[data-pending] summary, .climate-card-target-control[data-pending] button { cursor: progress; }
  .climate-card-mode-control[data-disabled] .climate-card-mode-options { display: none; }
  .climate-card-mode-options { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 9px; box-shadow: 0 6px 18px rgba(0, 0, 0, .22); display: grid; left: 0; max-height: var(--climate-card-mode-menu-max-height, 240px); max-width: calc(100vw - 32px); min-width: min(max(100%, 160px), calc(100vw - 32px)); overflow: auto; padding: 4px; position: absolute; top: calc(100% + 5px); z-index: 20; }
  .climate-card-mode-control[data-placement="up"] .climate-card-mode-options { bottom: calc(100% + 5px); top: auto; }
  .climate-card-mode-options button { align-items: center; background: transparent; border: 0; border-radius: 7px; color: var(--primary-text-color); cursor: pointer; display: grid; font: inherit; font-size: 12px; gap: 8px; grid-template-columns: 22px minmax(0, 1fr) 18px; min-height: 40px; padding: 6px 8px; text-align: left; }
  .climate-card-mode-options button:hover, .climate-card-mode-options button[aria-current="true"] { background: color-mix(in srgb, var(--primary-color) 12%, var(--card-background-color)); }
  .climate-card-mode-options button > ha-icon:first-child { --mdc-icon-size: 18px; color: var(--climate-action-color); }
  .climate-card-mode-control[data-mode="heat"] summary > ha-icon:first-child,
  .climate-card-mode-options button[data-mode="heat"] > ha-icon:first-child { color: var(--warning-color, #e69b35); }
  .climate-card-mode-control[data-mode="cool"] summary > ha-icon:first-child,
  .climate-card-mode-options button[data-mode="cool"] > ha-icon:first-child { color: var(--primary-color, #4f8fcf); }
  .climate-card-mode-control[data-mode="dry"] summary > ha-icon:first-child,
  .climate-card-mode-options button[data-mode="dry"] > ha-icon:first-child { color: var(--info-color, #4b9c9a); }
  .climate-card-mode-control[data-mode="fan_only"] summary > ha-icon:first-child,
  .climate-card-mode-options button[data-mode="fan_only"] > ha-icon:first-child { color: var(--primary-color, #4f8fcf); }
  .climate-card-mode-control[data-mode="off"] summary > ha-icon:first-child,
  .climate-card-mode-options button[data-mode="off"] > ha-icon:first-child { color: var(--secondary-text-color); }
  .climate-card-mode-options button .selected { --mdc-icon-size: 16px; color: var(--primary-color); }
  .climate-card-control-surface:not(:has(.climate-card-mode-control)) > .climate-card-target-control,
  .climate-card-control-surface:not(:has(.climate-card-mode-control)) > .climate-card-range-controls { grid-column: 1 / 3; grid-row: 1; border-inline-start: 0; }
  .climate-card-native-link { border-radius: 0 11px 11px 0; display: grid; grid-column: 3; grid-row: 1; position: relative; width: 56px; }
  .climate-card-control-surface > .climate-card-target-control, .climate-card-range-controls, .climate-card-native-link { position: relative; }
  .climate-card-control-surface > .climate-card-target-control::before, .climate-card-range-controls::before, .climate-card-range-controls > .climate-card-target-control + .climate-card-target-control::before, .climate-card-native-link::before { background: linear-gradient(to top, var(--divider-color), color-mix(in srgb, var(--divider-color) 35%, transparent) 58%, transparent); content: ""; inset-block: 0; inset-inline-start: 0; pointer-events: none; position: absolute; width: 1px; }
  .climate-card-control-surface:not(:has(.climate-card-mode-control)) > .climate-card-target-control::before, .climate-card-control-surface:not(:has(.climate-card-mode-control)) > .climate-card-range-controls::before, .climate-card-native-link:only-child::before { display: none; }
  .climate-card-native-link:only-child { grid-column: 1 / -1; justify-self: end; }
  .climate-card-native-link ha-icon { --mdc-icon-size: 22px; color: var(--primary-color); }
  .climate-card-panel { background: linear-gradient(145deg, var(--climate-card-surface), color-mix(in srgb, var(--card-background-color) 92%, var(--climate-action-color) 8%)); border: 1px solid var(--climate-card-border); border-radius: 12px; box-shadow: 0 6px 18px color-mix(in srgb, var(--climate-action-color) 6%, transparent); padding: 12px; }
  .climate-card-panel h3, .climate-card-section-heading h3 { align-items: center; display: flex; font-size: 13px; gap: 7px; margin: 0; }
  .climate-card-panel h3 ha-icon, .climate-card-section-heading h3 ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); }
  .climate-card-current-heading { align-items: center; border-radius: 8px; column-gap: 8px; display: grid; grid-template-columns: max-content minmax(0, 1fr) 30px; min-width: 0; transition: background 150ms ease; }
  .climate-card-current-heading h3 { grid-column: 1; grid-row: 1; }
  .climate-card-current.collapsed .climate-card-current-heading { align-items: start; display: flex; flex-wrap: wrap; gap: 6px 8px; padding-inline-end: 34px; position: relative; }
  .climate-card-current.collapsed .climate-card-current-heading h3 { align-self: start; flex: 0 0 auto; min-height: 30px; }
  .climate-card-current.collapsed .climate-card-current-toggle { inset-block-start: 0; inset-inline-end: 0; position: absolute; }
  .climate-card-current.collapsed .climate-card-current-summary-wrap { align-self: start; display: contents; }
  .climate-card-current.collapsed .climate-card-current-summary { display: contents; }
  .climate-card-current:not(.collapsed) .climate-card-current-heading { cursor: pointer; }
  .climate-card-current:not(.collapsed) .climate-card-current-heading:hover { background: color-mix(in srgb, var(--primary-color) 6%, transparent); }
  .climate-card-current-summary-wrap { display: grid; grid-column: 2; grid-row: 1; grid-template-rows: 0fr; min-width: 0; opacity: 0; pointer-events: none; transform: translateY(3px); transition: grid-template-rows 200ms ease, opacity 160ms ease, transform 200ms ease, visibility 0s linear 200ms; visibility: hidden; }
  .climate-card-current.collapsed .climate-card-current-summary-wrap { grid-template-rows: 1fr; opacity: 1; pointer-events: auto; transform: translateY(0); transition-delay: 0s; visibility: visible; }
  .climate-card-current-toggle { align-items: center; background: transparent; border: 0; border-radius: 50%; color: var(--secondary-text-color); cursor: pointer; display: inline-flex; grid-column: 3; grid-row: 1; height: 30px; justify-content: center; padding: 0; width: 30px; }
  .climate-card-current-toggle:hover { color: var(--primary-color); }
  .climate-card-current:not(.collapsed) .climate-card-current-heading:hover .climate-card-current-toggle { color: var(--primary-color); }
  .climate-card-current-toggle:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
  .climate-card-current-toggle ha-icon { --mdc-icon-size: 19px; transition: transform 200ms ease; }
  .climate-card-current.collapsed .climate-card-current-toggle ha-icon { transform: rotate(180deg); }
  .climate-card-current-summary { align-items: center; display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-start; min-height: 30px; min-width: 0; overflow: hidden; }
  .climate-card-current-summary-item { --current-summary-accent: var(--primary-color); align-items: center; background: color-mix(in srgb, var(--current-summary-accent) 7%, var(--card-background-color)); border: 1px solid color-mix(in srgb, var(--current-summary-accent) 25%, var(--divider-color)); border-radius: 999px; box-sizing: border-box; color: var(--primary-text-color); display: inline-flex; flex: 0 0 auto; gap: 6px; min-height: 28px; min-width: 0; padding: 3px 9px; }
  .climate-card-current-summary-item ha-icon { --mdc-icon-size: 16px; align-items: center; color: var(--current-summary-accent); display: inline-flex; flex: 0 0 16px; height: 16px; justify-content: center; line-height: 1; width: 16px; }
  .climate-card-current-summary-item strong { align-items: center; display: inline-flex; flex-wrap: nowrap; font-size: 11px; gap: 4px; line-height: 16px; min-width: 0; white-space: nowrap; }
  .climate-card-current-summary-item.temperature { --current-summary-accent: var(--deep-orange-color, var(--warning-color, #e67e45)); }
  .climate-card-current-summary-item.humidity, .climate-card-current-summary-item.outdoor { --current-summary-accent: var(--info-color, #3aa7c9); }
  .climate-card-current-summary-item.clickable { cursor: pointer; transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, color 150ms ease; }
  .climate-card-current-summary-item.clickable:hover { background: color-mix(in srgb, var(--current-summary-accent) 13%, var(--card-background-color)); border-color: color-mix(in srgb, var(--current-summary-accent) 42%, var(--divider-color)); color: var(--primary-text-color); }
  .climate-card-current-summary-item.clickable:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--current-summary-accent) 44%, transparent); outline: 0; }
  .climate-card-current-summary-item.windows .open { color: var(--primary-color); }
  .climate-card-current-collapsed-comfort { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 200ms ease, opacity 140ms ease; }
  .climate-card-current.collapsed .climate-card-current-collapsed-comfort { grid-template-rows: 1fr; opacity: 1; }
  .climate-card-current-collapsed-comfort-inner { min-height: 0; overflow: hidden; }
  .climate-card-current-collapsed-comfort-row { --comfort-primary-accent: var(--current-comfort-accent); --comfort-secondary-accent: var(--comfort-primary-accent); --current-comfort-accent: var(--success-color, #65a56f); align-items: flex-start; background: linear-gradient(135deg, color-mix(in srgb, var(--comfort-primary-accent) 12%, var(--card-background-color)) 0%, color-mix(in srgb, var(--comfort-secondary-accent) 9%, var(--card-background-color)) 100%); border-radius: 7px; color: var(--secondary-text-color); display: flex; font-size: 12px; gap: 6px; margin-top: 9px; min-height: 30px; min-width: 0; overflow: visible; padding: 5px 9px 5px 12px; position: relative; white-space: normal; }
  .climate-card-current-collapsed-comfort-row::before { background: linear-gradient(to bottom, var(--comfort-primary-accent), var(--comfort-secondary-accent)); border-radius: 999px; bottom: 0; content: ""; inset-inline-start: 0; position: absolute; top: 0; width: 3px; }
  .climate-card-current-collapsed-comfort-row.warning { --current-comfort-accent: var(--warning-color, #e69b35); }
  .climate-card-current-collapsed-comfort-row.info { --current-comfort-accent: var(--info-color, #3aa7c9); }
  .climate-card-current-collapsed-comfort-row.bad { --current-comfort-accent: var(--error-color, #db5a5a); }
  .climate-card-current-collapsed-comfort-row > ha-icon { --mdc-icon-size: 17px; color: var(--comfort-primary-accent); flex: 0 0 auto; margin-top: 3px; }
  .climate-card-current-collapsed-comfort-row .climate-card-comfort-chip { min-height: 24px; padding: 3px 7px; }
  .climate-card-current-collapsed-comfort-row .climate-card-comfort-chip small { font-size: 11px; font-weight: 400; line-height: 1.3; }
  .climate-card-current-collapsed-comfort-row .climate-card-comfort-chip strong { font-size: 11px; font-weight: 600; line-height: 1.3; white-space: normal; }
  .climate-card-current-collapsed-comfort-row .climate-card-comfort-chip ha-icon { --mdc-icon-size: 15px; }
  .climate-card-comfort-chip-list { align-items: center; display: flex; flex-wrap: wrap; gap: 5px 6px; min-width: 0; }
  .climate-card-comfort-chip { --comfort-chip-accent: var(--comfort-accent, var(--primary-color)); align-items: center; background: color-mix(in srgb, var(--comfort-chip-accent) 8%, var(--card-background-color)); border: 1px solid color-mix(in srgb, var(--comfort-chip-accent) 24%, var(--divider-color)); border-radius: 999px; box-sizing: border-box; color: var(--primary-text-color); display: inline-flex; gap: 5px; max-width: 100%; min-height: 26px; min-width: 0; padding: 3px 8px; }
  .climate-card-comfort-chip.good { --comfort-chip-accent: var(--success-color, #65a56f); }
  .climate-card-comfort-chip.warning { --comfort-chip-accent: var(--warning-color, #e69b35); }
  .climate-card-comfort-chip.info { --comfort-chip-accent: var(--info-color, #3aa7c9); }
  .climate-card-comfort-chip.bad { --comfort-chip-accent: var(--error-color, #db5a5a); }
  .climate-card-comfort-chip ha-icon { --mdc-icon-size: 16px; color: var(--comfort-chip-accent); flex: 0 0 auto; }
  .climate-card-comfort-chip small { color: var(--secondary-text-color); font-size: 12px; line-height: 1.35; margin: 0; }
  .climate-card-comfort-chip strong { color: var(--primary-text-color); font-size: 12px; line-height: 1.35; min-width: 0; overflow-wrap: anywhere; white-space: normal; }
  .climate-card-current-body { display: grid; grid-template-rows: 1fr; opacity: 1; transition: grid-template-rows 220ms ease, opacity 160ms ease; }
  .climate-card-current-body-inner { min-height: 0; overflow: hidden; }
  .climate-card-current.collapsed .climate-card-current-body { grid-template-rows: 0fr; opacity: 0; }
  .climate-card-current-grid { background: linear-gradient(145deg, var(--card-background-color), color-mix(in srgb, var(--secondary-background-color) 68%, var(--card-background-color))); border: 1px solid var(--climate-card-border); border-radius: 11px; display: grid; grid-template-columns: minmax(0, 1fr); margin-top: 10px; overflow: hidden; }
  .climate-card-current-readings { align-items: stretch; display: flex; min-width: 0; width: 100%; }
  .climate-card-metric, .climate-card-context-item { --current-cell-accent: var(--primary-color); align-items: center; display: grid; gap: 9px; grid-template-columns: 31px minmax(0, 1fr); min-width: 0; padding: 11px 13px; }
  .climate-card-metric { grid-template-columns: 31px minmax(0, 1fr) 30px; }
  .climate-card-context-item.with-history { grid-template-columns: 31px minmax(0, 1fr) 30px; }
  .climate-card-metric { flex: 1 1 50%; min-width: 72px; }
  .climate-card-metric + .climate-card-metric { border-left: 1px solid var(--divider-color); }
  .climate-card-metric strong { font-size: 16px; white-space: nowrap; }
  .climate-card-metric ha-icon, .climate-card-context-item > ha-icon { --mdc-icon-size: 19px; background: color-mix(in srgb, var(--current-cell-accent) 11%, var(--card-background-color)); border-radius: 8px; color: var(--current-cell-accent); padding: 6px; }
  .climate-card-metric-history { align-items: center; background: transparent; border: 0; border-radius: 50%; color: var(--secondary-text-color); cursor: pointer; display: inline-flex; height: 30px; justify-content: center; margin: -4px; padding: 0; width: 30px; }
  .climate-card-metric-history:hover { background: color-mix(in srgb, var(--primary-color) 10%, transparent); color: var(--primary-color); }
  .climate-card-metric-history:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
  .climate-card-metric-history ha-icon { --mdc-icon-size: 17px; background: transparent; border-radius: 0; color: currentColor; padding: 0; }
  .climate-card-metric.temperature { --current-cell-accent: var(--deep-orange-color, var(--warning-color, #e67e45)); }
  .climate-card-metric.humidity { --current-cell-accent: var(--info-color, #3aa7c9); }
  .climate-card-context-item.outdoor { --current-cell-accent: var(--cyan-color, var(--info-color, #3aa7c9)); }
  .climate-card-current-context { border-top: 1px solid var(--divider-color); display: flex; min-width: 0; }
  .climate-card-current-grid:not(.has-readings) .climate-card-current-context { border-top: 0; }
  .climate-card-current-context > .climate-card-context-item { flex: 1 1 0; }
  .climate-card-context-item + .climate-card-context-item { border-left: 1px solid var(--divider-color); }
  .climate-card-context-item > div { display: grid; min-width: 0; width: 100%; }
  .climate-card-context-item small, .climate-card-context-item span { color: var(--secondary-text-color); font-size: 11px; }
  .climate-card-context-item > div > small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .climate-card-context-item strong { font-size: 13px; }
  .climate-card-context-detail { align-items: baseline; display: flex; flex-wrap: wrap; gap: 3px 7px; margin-top: 2px; }
  .climate-card-window-summary { align-items: center; display: flex; flex-wrap: wrap; gap: 5px; }
  .climate-card-window-summary > span { color: var(--primary-text-color); font-size: inherit; font-weight: inherit; }
  .climate-card-window-summary > .open { background: color-mix(in srgb, var(--primary-color) 13%, transparent); border-radius: 999px; color: var(--primary-color); padding: 2px 7px; }
  .climate-card-window-summary > .separator { color: var(--secondary-text-color); }
  .climate-card-window-list { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 3px; }
  .climate-card-window-list span { align-items: center; display: inline-flex; gap: 3px; }
  .climate-card-window-list ha-icon { --mdc-icon-size: 15px; }
  .climate-card-window-list .open, .climate-card-window-list .open ha-icon { color: var(--primary-color); }
  .climate-card-comfort { --comfort-accent: var(--secondary-text-color); --comfort-primary-accent: var(--comfort-accent); --comfort-secondary-accent: var(--comfort-primary-accent); align-items: flex-start; background: linear-gradient(135deg, color-mix(in srgb, var(--comfort-primary-accent) 13%, var(--card-background-color)) 0%, color-mix(in srgb, var(--comfort-secondary-accent) 8%, var(--card-background-color)) 100%); border-top: 1px solid color-mix(in srgb, var(--comfort-primary-accent) 20%, var(--divider-color)); display: grid; gap: 9px; grid-template-columns: 31px minmax(0, 1fr); margin: 0; padding: 10px 13px 10px 13px; position: relative; }
  .climate-card-comfort::before { background: linear-gradient(to bottom, var(--comfort-primary-accent), var(--comfort-secondary-accent)); border-radius: 999px; bottom: 0; content: ""; inset-inline-start: 0; position: absolute; top: 0; width: 4px; }
  .climate-card-comfort.good { --comfort-accent: var(--success-color, #65a56f); }
  .climate-card-comfort.warning { --comfort-accent: var(--warning-color, #e69b35); }
  .climate-card-comfort.info { --comfort-accent: var(--info-color, #3aa7c9); }
  .climate-card-comfort.bad { --comfort-accent: var(--error-color, #db5a5a); }
  .climate-card-comfort > ha-icon { --mdc-icon-size: 19px; background: color-mix(in srgb, var(--comfort-primary-accent) 13%, var(--card-background-color)); border-radius: 8px; color: var(--comfort-primary-accent); margin-top: 1px; padding: 6px; }
  .climate-card-comfort-content { display: grid; gap: 7px; min-width: 0; }
  .climate-card-comfort-heading-row { align-items: center; display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
  .climate-card-comfort-heading-row strong { min-width: 0; overflow-wrap: anywhere; }
  .climate-card-comfort-notices { display: grid; gap: 5px; min-width: 0; }
  .climate-card-comfort-notice { align-items: flex-start; color: var(--secondary-text-color); display: flex; font-size: 12px; gap: 6px; line-height: 1.35; min-width: 0; overflow-wrap: anywhere; }
  .climate-card-comfort-notice.info ha-icon { color: var(--info-color, #3aa7c9); }
  .climate-card-comfort-notice.warning ha-icon { color: var(--warning-color, #e69b35); }
  .climate-card-comfort-notice ha-icon { --mdc-icon-size: 16px; flex: 0 0 auto; margin-top: 1px; }
  .climate-card-comfort-metrics { align-items: center; display: flex; flex-wrap: wrap; gap: 5px 6px; min-width: 0; }
  .climate-card-timeline { min-width: 0; }
  .climate-card-timeline-grid { align-items: center; display: grid; gap: 7px 12px; grid-template-columns: minmax(118px, .42fr) minmax(0, 1fr); min-width: 0; }
  .climate-card-timeline.no-heading .climate-card-timeline-grid { grid-template-columns: minmax(0, 1fr); }
  .climate-card-timeline-meta { align-content: center; display: grid; gap: 6px; min-width: 0; }
  .climate-card-timeline-meta h3 { align-items: center; display: flex; font-size: 13px; gap: 7px; margin: 0; min-width: 0; }
  .climate-card-timeline-meta h3 ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); }
  .overview-timeline-scroll.climate-card-timeline-scroll { align-self: center; border: 0; border-radius: 0; margin: 0; min-width: 0; padding: 0; scrollbar-gutter: auto; }
  .overview-timeline-layout.climate-card-timeline-layout { --overview-timeline-name-column: 0px; --overview-timeline-sticky-left: 12px; grid-template-columns: minmax(0, 1fr); min-width: 0; width: 100%; }
  .climate-card-context-chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-start; min-width: 0; }
  .climate-card-timeline .climate-card-context-chip { --climate-chip-accent: var(--primary-color); align-items: center; background: color-mix(in srgb, var(--climate-chip-accent) 7%, var(--secondary-background-color)); border: 1px solid color-mix(in srgb, var(--climate-chip-accent) 72%, var(--divider-color)); border-radius: 7px; box-shadow: 0 2px 8px color-mix(in srgb, var(--climate-chip-accent) 8%, transparent); box-sizing: border-box; display: inline-flex; flex: 0 1 auto; gap: 4px; height: 22px; max-width: 100%; min-width: 0; overflow: hidden; padding: 0 6px 0 0; }
  .climate-card-timeline .climate-card-context-chip.is-mode { --climate-chip-accent: var(--info-color, #3aa7c9); }
  .climate-card-timeline .climate-card-chip-accent { align-items: center; align-self: stretch; background: var(--climate-chip-accent); border-radius: 6px 0 0 6px; color: var(--text-primary-color, #fff); display: inline-flex; flex: 0 0 auto; gap: 3px; justify-content: center; padding: 2px 5px; }
  .climate-card-timeline .climate-card-context-chip ha-icon { --mdc-icon-size: 13px; }
  .climate-card-timeline .climate-card-context-chip small { color: inherit; font-size: 9px; font-weight: 600; letter-spacing: .02em; line-height: 1; }
  .climate-card-timeline .climate-card-context-chip strong { color: var(--primary-text-color); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .climate-card-runtime { align-items: center; background: color-mix(in srgb, var(--warning-color, #e69b35) 11%, var(--card-background-color)); border: 1px solid color-mix(in srgb, var(--warning-color, #e69b35) 32%, var(--divider-color)); border-radius: 10px; display: grid; gap: 7px; grid-template-columns: auto auto minmax(0, 1fr); padding: 9px 11px; }
  .climate-card-runtime ha-icon { --mdc-icon-size: 20px; color: var(--warning-color, #e69b35); }
  .climate-card-runtime span { color: var(--secondary-text-color); font-size: 12px; text-align: right; }
  .climate-card-runtime.boost { background: color-mix(in srgb, var(--primary-color) 10%, var(--card-background-color)); border-color: color-mix(in srgb, var(--primary-color) 30%, var(--divider-color)); }
  .climate-card-runtime.boost ha-icon { color: var(--primary-color); }
  .climate-card-features { display: grid; gap: 10px; min-width: 0; }
  .climate-card-feature-panel { --feature-panel-accent: var(--cyan-color, var(--info-color, #3aa7c9)); background: linear-gradient(145deg, color-mix(in srgb, var(--feature-panel-accent) 6%, var(--card-background-color)), color-mix(in srgb, var(--card-background-color) 94%, var(--feature-panel-accent) 6%)); border: 1px solid color-mix(in srgb, var(--feature-panel-accent) 26%, var(--divider-color)); border-radius: 11px; box-shadow: 0 5px 16px color-mix(in srgb, var(--feature-panel-accent) 7%, transparent); min-width: 0; overflow: hidden; }
  .climate-card-feature-panel.preconditioning { --feature-panel-accent: var(--purple-color, #8b6fc2); }
  .climate-card-feature-heading { align-items: center; background: transparent; border: 0; color: var(--primary-text-color); cursor: pointer; display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr) 30px; min-height: 43px; padding: 6px 8px 6px 11px; text-align: start; width: 100%; }
  .climate-card-feature-heading.static { cursor: default; grid-template-columns: minmax(0, 1fr); padding-inline-end: 11px; }
  .climate-card-feature-heading:hover { background: color-mix(in srgb, var(--feature-panel-accent) 7%, transparent); }
  .climate-card-feature-heading.static:hover { background: transparent; }
  .climate-card-feature-heading:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
  .climate-card-feature-heading-content { display: grid; gap: 4px; min-width: 0; }
  .climate-card-feature-title-row { align-items: center; display: flex; gap: 10px; justify-content: space-between; min-width: 0; }
  .climate-card-feature-title { align-items: center; display: inline-flex; flex: 0 0 auto; gap: 7px; min-width: 0; overflow: hidden; white-space: nowrap; }
  .climate-card-feature-title ha-icon { --mdc-icon-size: 19px; color: var(--feature-panel-accent); }
  .climate-card-feature-title strong { font-size: 13px; overflow: hidden; text-overflow: ellipsis; }
  .climate-card-feature-status { color: var(--feature-panel-accent); flex: 0 0 auto; font-size: 11px; font-weight: 600; }
  .climate-card-feature-status.blocked { color: var(--warning-color, #e69b35); }
  .climate-card-feature-status.unavailable { color: var(--error-color, #db5a5a); }
  .climate-card-feature-status.active { color: var(--warning-color, #e69b35); }
  .climate-card-feature-description { color: var(--secondary-text-color); display: block; font-size: 11px; line-height: 1.35; min-width: 0; }
  .climate-card-feature-description.preconditioning { align-items: baseline; display: flex; flex-wrap: wrap; gap: 2px 5px; }
  .climate-card-feature-description.preconditioning > span { align-items: baseline; display: inline-flex; gap: 3px; }
  .climate-card-feature-description.preconditioning small { color: var(--secondary-text-color); font-size: 9px; }
  .climate-card-feature-description.preconditioning .separator { color: var(--divider-color); }
  .climate-card-feature-chevron { --mdc-icon-size: 19px; color: var(--secondary-text-color); justify-self: center; transition: transform 200ms ease; }
  .climate-card-feature-panel.collapsed .climate-card-feature-chevron { transform: rotate(180deg); }
  .climate-card-feature-body { display: grid; grid-template-rows: 1fr; opacity: 1; transition: grid-template-rows 220ms ease, opacity 160ms ease; }
  .climate-card-feature-panel.collapsed .climate-card-feature-body { grid-template-rows: 0fr; opacity: 0; }
  .climate-card-feature-body-inner { display: grid; gap: 10px; min-height: 0; overflow: hidden; padding: 0 10px 10px; transition: padding-bottom 220ms ease; }
  .climate-card-feature-panel.collapsed .climate-card-feature-body-inner { padding-bottom: 0; }
  .climate-card-room-assist-graph { min-width: 0; }
  .climate-card-room-assist-graph .sensor-temperature-scale { background: color-mix(in srgb, var(--secondary-background-color) 72%, var(--card-background-color)); }
  .climate-card-preconditioning-preview { --preconditioning-preview-accent: var(--warning-color, #e69b35); border: 1px solid color-mix(in srgb, var(--preconditioning-preview-accent) 48%, var(--divider-color)); border-radius: 10px; box-shadow: inset 0 1px 0 color-mix(in srgb, var(--primary-text-color) 7%, transparent); display: grid; grid-template-columns: minmax(105px, .8fr) minmax(0, 1.6fr); overflow: hidden; }
  .climate-card-preconditioning-preview.cool { --preconditioning-preview-accent: var(--primary-color, #2d7dd2); }
  .climate-card-preconditioning-start, .climate-card-preconditioning-target { display: grid; gap: 1px; min-width: 0; padding: 7px 10px; }
  .climate-card-preconditioning-start { background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--preconditioning-preview-accent) 8%, var(--card-background-color)) 0 8px, var(--card-background-color) 8px 16px); border-right: 1px solid color-mix(in srgb, var(--preconditioning-preview-accent) 42%, var(--divider-color)); }
  .climate-card-preconditioning-target { background: color-mix(in srgb, var(--preconditioning-preview-accent) 12%, var(--card-background-color)); }
  .climate-card-preconditioning-preview small { color: var(--secondary-text-color); font-size: 9px; }
  .climate-card-preconditioning-preview strong { font-size: 11px; }
  .climate-card-preconditioning-preview span { color: var(--primary-text-color); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .climate-card-actions { align-content: center; align-self: stretch; background: linear-gradient(145deg, color-mix(in srgb, var(--secondary-background-color) 88%, var(--climate-action-color) 12%), var(--secondary-background-color)); border: 1px solid var(--climate-card-border); border-bottom: 0; border-radius: 11px 11px 0 0; box-sizing: border-box; display: grid; grid-column: 2; justify-self: end; max-width: 100%; min-height: var(--climate-card-toolbar-island-height); min-width: 0; overflow: hidden; padding: 7px; width: max-content; }
  .climate-card-thermostat-controls:not(.has-authority) .climate-card-actions { grid-column: 1; }
  .climate-card-thermostat-controls:not(.has-pane) .climate-card-actions { border-bottom: 1px solid var(--climate-card-border); border-radius: 11px; }
  .climate-card-actions-scroll { align-items: center; display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; overflow: hidden; position: relative; }
  .climate-card-actions-row { -webkit-overflow-scrolling: touch; display: flex; flex-wrap: nowrap; gap: 6px; grid-column: 1; min-width: 0; overflow-x: auto; overflow-y: hidden; overscroll-behavior-inline: contain; scrollbar-width: none; touch-action: pan-x; }
  .climate-card-actions-row.horizontal-dragging,
  .climate-card-actions-row.horizontal-dragging * { cursor: grabbing !important; user-select: none; }
  .climate-card-actions-row::-webkit-scrollbar { display: none; height: 0; width: 0; }
  .climate-card-actions-scroll-button { align-items: center; background: color-mix(in srgb, var(--primary-color) 13%, var(--secondary-background-color)) !important; border: 1px solid color-mix(in srgb, var(--primary-color) 24%, var(--divider-color)) !important; border-radius: 999px !important; box-shadow: 0 2px 7px color-mix(in srgb, var(--primary-color) 12%, transparent); box-sizing: border-box; color: var(--primary-text-color) !important; display: flex; height: 30px; justify-content: center; line-height: 1; margin: 0 !important; min-height: 30px !important; opacity: 1; padding: 0 !important; pointer-events: auto; position: absolute; top: 50%; transform: translateY(-50%) scale(1) !important; transition: opacity 160ms ease, transform 180ms ease, visibility 0s linear 0s; width: 28px; z-index: 2; }
  .climate-card-actions-scroll-button.scroll-previous { inset-inline-start: 2px; }
  .climate-card-actions-scroll-button.scroll-next { inset-inline-end: 2px; }
  .climate-card-actions-scroll:not(.has-overflow) .climate-card-actions-scroll-button { display: none; }
  .climate-card-actions .climate-card-actions-scroll-button:disabled { opacity: 0; pointer-events: none; transform: translateY(-50%) scale(.78) !important; visibility: hidden; transition-delay: 0s, 0s, 160ms; }
  .climate-card-actions .climate-card-actions-scroll-button ha-icon { --mdc-icon-size: 18px; color: color-mix(in srgb, var(--primary-color) 68%, var(--primary-text-color)); }
  .climate-card-actions button { align-items: center; background: color-mix(in srgb, var(--card-background-color) 92%, var(--climate-card-action-accent, var(--primary-color)) 8%); border: 1px solid color-mix(in srgb, var(--divider-color) 82%, var(--climate-card-action-accent, var(--primary-color)) 18%); border-radius: 8px; color: var(--primary-text-color); cursor: pointer; display: inline-flex; gap: 5px; justify-content: center; min-height: 32px; padding: 5px 8px; transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease, flex-basis 160ms ease, transform 160ms ease, width 160ms ease; }
  .climate-card-external button, .climate-card-boost-form button { align-items: center; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 10px; color: var(--primary-text-color); cursor: pointer; display: inline-flex; gap: 6px; justify-content: center; min-height: 40px; padding: 8px 10px; }
  .climate-card-actions-row > button { flex: 0 0 auto; min-width: max-content; }
  .climate-card-actions-row > button.icon-only { flex: 0 0 34px; min-width: 34px; padding-inline: 0; width: 34px; }
  .climate-card-actions-row > button.icon-only.name-hidden.panel-open { flex-basis: 52px; min-width: 52px; width: 52px; }
  .climate-card-actions-row > button > span:not(.climate-card-action-icon-stack) { white-space: nowrap; }
  .climate-card-actions ha-icon { --mdc-icon-size: 17px; color: var(--secondary-text-color); }
  .climate-card-actions .boost { --climate-card-action-accent: var(--warning-color, #e69b35); }
  .climate-card-actions .pause, .climate-card-actions .resume { --climate-card-action-accent: var(--info-color, #3aa7c9); }
  .climate-card-actions .custom { --climate-card-action-accent: var(--custom-action-color, var(--primary-color)); }
  .climate-card-actions .boost ha-icon, .climate-card-actions .pause ha-icon, .climate-card-actions .resume ha-icon, .climate-card-actions .custom ha-icon { color: var(--climate-card-action-accent); }
  .climate-card-actions .more ha-icon { color: var(--primary-color); }
  .climate-card-actions .climate-card-action-icon-stack { display: grid; flex: 0 0 17px; height: 17px; overflow: visible; place-items: center; width: 17px; }
  .climate-card-action-icon-stack ha-icon { grid-area: 1 / 1; opacity: 0; transform: scale(.62); transition: opacity 140ms ease, transform 180ms ease; }
  .climate-card-action-icon-stack .action-result-default { opacity: 1; transform: scale(1); }
  .climate-card-actions button.feedback-running .action-result-default, .climate-card-actions button.feedback-success .action-result-default, .climate-card-actions button.feedback-error .action-result-default { opacity: 0; transform: scale(.72); }
  .climate-card-actions button.feedback-running .action-result-running, .climate-card-actions button.feedback-success .action-result-success, .climate-card-actions button.feedback-error .action-result-error { opacity: 1; transform: scale(1); }
  .climate-card-actions button.feedback-running .action-result-running { animation: climate-card-menu-spin 1s linear infinite; }
  .climate-card-actions .panel-close { --mdc-icon-size: 14px; color: var(--primary-text-color); flex: 0 0 auto; margin-inline-start: 0; opacity: 0; overflow: hidden; transform: scale(.55) rotate(-35deg); transition: margin-inline-start 160ms ease, opacity 140ms ease, transform 160ms ease, width 160ms ease; width: 0; }
  .climate-card-actions button.panel-open .panel-close { margin-inline-start: 1px; opacity: .82; transform: scale(1) rotate(0); width: 14px; }
  .climate-card-actions button.feedback-running { cursor: wait; }
  .climate-card-actions button.feedback-success { background: color-mix(in srgb, var(--success-color, #65a56f) 16%, var(--card-background-color)); border-color: color-mix(in srgb, var(--success-color, #65a56f) 58%, var(--divider-color)); }
  .climate-card-actions button.feedback-success ha-icon { color: var(--success-color, #65a56f); }
  .climate-card-actions button.feedback-error { background: color-mix(in srgb, var(--error-color, #db5a5a) 14%, var(--card-background-color)); border-color: color-mix(in srgb, var(--error-color, #db5a5a) 58%, var(--divider-color)); }
  .climate-card-actions button.feedback-error ha-icon { color: var(--error-color, #db5a5a); }
  .climate-card-action-feedback-label { clip: rect(0 0 0 0); clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
  .climate-card-actions button.panel-open { background: color-mix(in srgb, var(--climate-card-action-accent, var(--primary-color)) 13%, var(--card-background-color)); border-color: color-mix(in srgb, var(--climate-card-action-accent, var(--primary-color)) 55%, var(--divider-color)); }
  .climate-card-actions button.runtime-active:not(.panel-open) { box-shadow: inset 0 -2px 0 var(--climate-card-action-accent, var(--primary-color)); }
  .climate-card-actions button:hover:not(:disabled) { background: color-mix(in srgb, var(--climate-card-action-accent, var(--primary-color)) 12%, var(--card-background-color)); box-shadow: 0 4px 12px color-mix(in srgb, var(--climate-card-action-accent, var(--primary-color)) 12%, transparent); transform: translateY(-1px); }
  .climate-card-actions button:focus-visible { box-shadow: inset 0 0 0 2px var(--primary-color); outline: none; }
  .climate-card-actions button:disabled { cursor: default; opacity: 0.55; }
  .climate-card-actions-menu { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 11px; box-shadow: var(--ha-card-box-shadow, 0 8px 24px rgba(0, 0, 0, .24)); box-sizing: border-box; color: var(--primary-text-color); display: grid; gap: 3px; inset: auto; margin: 0; overflow-x: hidden; overflow-y: auto; padding: 6px; position: fixed; z-index: 1000; }
  .climate-card-actions-menu::backdrop {
    -webkit-backdrop-filter: blur(1.5px) saturate(.72);
    backdrop-filter: blur(1.5px) saturate(.72);
    background: color-mix(in srgb, var(--primary-background-color) 24%, transparent);
  }
  .climate-card-actions-menu button { --custom-action-color: var(--secondary-text-color); align-items: center; background: transparent; border: 0; border-radius: 8px; color: var(--primary-text-color); cursor: pointer; display: grid; font: inherit; gap: 9px; grid-template-columns: 24px minmax(0, 1fr); min-height: 44px; padding: 7px 10px; text-align: left; width: 100%; }
  .climate-card-actions-menu button:hover, .climate-card-actions-menu button:focus-visible { background: color-mix(in srgb, var(--primary-color) 9%, var(--card-background-color)); outline: none; }
  .climate-card-actions-menu button:focus-visible { box-shadow: inset 0 0 0 2px var(--primary-color); }
  .climate-card-actions-menu button:disabled { cursor: default; opacity: .55; }
  .climate-card-actions-menu button ha-icon { --mdc-icon-size: 20px; color: var(--custom-action-color); }
  .climate-card-actions-menu .boost ha-icon { color: var(--warning-color, #e69b35); }
  .climate-card-actions-menu .pause ha-icon, .climate-card-actions-menu .resume ha-icon { color: var(--info-color, #3aa7c9); }
  .climate-card-actions-menu-brand { display: block; height: 22px; object-fit: contain; width: 22px; }
  .climate-card-actions-menu button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .climate-card-actions-menu-separator { border-top: 1px solid var(--divider-color); margin: 3px 5px; }
  @keyframes climate-card-menu-spin { to { transform: rotate(360deg); } }
  .climate-card-boost-form { background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 12px; display: grid; gap: 10px; padding: 12px; }
  .climate-card-control-pane { border-width: 0; }
  .climate-card-boost-form > div { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); }
  .climate-card-boost-form label span { color: var(--secondary-text-color); display: block; font-size: 11px; margin-bottom: 3px; }
  .climate-card-boost-form input, .climate-card-boost-form select { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; box-sizing: border-box; color: var(--primary-text-color); min-height: 38px; padding: 9px; width: 100%; }
  .climate-card-form-checkbox { align-items: center; display: flex; gap: 7px; }
  .climate-card-form-checkbox input { min-height: auto; width: auto; }
  .climate-card-form-checkbox span { margin: 0; }
  .climate-card-boost-form footer { display: flex; gap: 8px; justify-content: end; }
  .climate-card-boost-form button.primary { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
  .climate-card-external { align-items: center; display: grid; gap: 10px; grid-template-columns: auto minmax(0, 1fr) auto; }
  .climate-card-external > ha-icon { color: var(--primary-color); }
  .climate-card-external div { display: grid; }
  .climate-card-external small { color: var(--secondary-text-color); margin-top: 3px; }
  .climate-card-external-readings { display: grid; gap: 8px; grid-column: 1 / -1; grid-template-columns: repeat(auto-fit, minmax(125px, 1fr)); }
  .climate-card-empty { color: var(--secondary-text-color); padding: 16px; text-align: center; }
  @media (max-width: 600px) {
    .climate-card-view { box-sizing: border-box; padding: 4px; }
    .climate-card-current-grid { grid-template-columns: minmax(0, 1fr); }
    .climate-card-current-context { display: grid; grid-template-columns: minmax(0, 1fr); }
    .climate-card-current-grid:not(.has-readings) .climate-card-current-context { border-top: 0; }
    .climate-card-context-item + .climate-card-context-item { border-left: 0; border-top: 1px solid var(--divider-color); }
    .climate-card-external { grid-template-columns: auto minmax(0, 1fr); }
    .climate-card-external button { grid-column: 1 / -1; }
    .climate-card-runtime { grid-template-columns: auto 1fr; }
    .climate-card-runtime span { grid-column: 1 / -1; text-align: left; }
    .climate-card-preconditioning-preview { grid-template-columns: minmax(95px, .85fr) minmax(0, 1.4fr); }
    .overview-timeline-layout.climate-card-timeline-layout { --overview-timeline-name-column: 0px; --overview-timeline-sticky-left: 12px; grid-template-columns: minmax(640px, 1fr); min-width: 640px; }
  }
  @container climate-card (max-width: 520px) {
    .climate-card-control-toolbar { column-gap: 6px; }
    .climate-card-manual-control { padding: 7px; }
    .climate-card-actions { padding-inline: 7px; }
  }
  @container climate-card (max-width: 380px) {
    .climate-card-brand { padding-inline: 7px; }
    .climate-card-control-surface { grid-template-columns: minmax(74px, 1fr) auto 52px; }
    .climate-card-control-surface:not(:has(.climate-card-native-link)) { grid-template-columns: minmax(74px, 1fr) auto; }
    .climate-card-mode-control summary { gap: 5px; padding-inline: 6px; }
    .climate-card-native-link { width: 52px; }
    .climate-card-range-controls { border-inline-start: 0; border-top: 1px solid var(--divider-color); grid-column: 1 / -1; grid-row: 2; }
    .climate-card-range-controls { grid-template-columns: minmax(0, 1fr); }
    .climate-card-range-controls > .climate-card-target-control + .climate-card-target-control { border-inline-start: 0; border-top: 1px solid var(--divider-color); }
    .climate-card-range-controls::before, .climate-card-range-controls > .climate-card-target-control + .climate-card-target-control::before { display: none; }
    .climate-card-native-link:only-child { grid-column: 1 / -1; justify-self: end; }
  }
  @media (prefers-reduced-motion: reduce) {
    .climate-card-state-line::after, .climate-card-actions button.feedback-running .action-result-running { animation: none !important; }
    .climate-card-manual-segmented button, .climate-card-brand { transition: none; }
    .climate-card-mode-control summary, .climate-card-mode-control .select-indicator { transition: none; }
    .climate-card-actions button, .climate-card-actions .panel-close, .climate-card-action-icon-stack ha-icon { transition: none; }
    .climate-card-brand:hover, .climate-card-actions button:hover:not(:disabled) { transform: none; }
    .climate-card-current-body, .climate-card-current-summary-wrap, .climate-card-current-collapsed-comfort, .climate-card-current-toggle ha-icon,
    .climate-card-feature-body, .climate-card-feature-body-inner, .climate-card-feature-chevron { transition: none; }
  }
`;
