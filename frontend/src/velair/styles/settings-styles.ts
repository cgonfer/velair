import { css } from "lit";

export const settingsStyles = css`
.settings-view {
  display: grid;
  gap: 12px;
  margin-top: 0;
  min-width: 0;
}

.settings-field,
.settings-zone-order,
.settings-portability,
.settings-maintenance,
.settings-reset,
.settings-startup,
.settings-temperature {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  min-width: 0;
  padding: 12px;
}

.settings-field {
  display: block;
}

.settings-startup {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: 36px minmax(0, 1fr) auto;
}

.settings-temperature {
  align-items: start;
  display: grid;
  gap: 12px;
  grid-template-columns: 36px minmax(0, 1fr) auto;
}

.settings-temperature.migration-required {
  border-color: var(--warning-color, #c99500);
}

.settings-temperature-copy {
  min-width: 0;
}

.settings-temperature-copy > p,
.temperature-migration-action p {
  color: var(--secondary-text-color);
  font-size: 12px;
  margin: 4px 0 0;
}

.settings-temperature-value {
  align-self: center;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  font-size: 16px;
  padding: 7px 12px;
}

.temperature-migration-action {
  border-top: 1px solid var(--divider-color);
  margin-top: 12px;
  padding-top: 12px;
}

.temperature-migration-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.temperature-migration-buttons .command-button {
  width: auto;
}

.settings-startup ha-switch {
  justify-self: end;
}

.settings-startup-icon {
  --mdc-icon-size: 24px;
  color: var(--primary-color);
  justify-self: center;
}

.settings-startup-copy {
  min-width: 0;
}

.external-systems-settings {
  align-items: start;
}

.external-systems-settings > .settings-startup-icon {
  align-self: start;
  margin-top: 1px;
}

.external-system-zone {
  align-items: center;
  background: var(--card-background-color);
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(160px, 1fr) minmax(220px, 0.8fr);
}

.external-system-zone-identity {
  min-width: 0;
}

.external-system-zone-identity strong {
  color: var(--primary-text-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.external-system-zone-select {
  margin-top: 0;
  min-width: 0;
}

.external-system-zone-select select {
  box-sizing: border-box;
  font-size: 14px;
  margin: 0;
  min-height: 40px;
  width: 100%;
}

.settings-maintenance {
  display: grid;
  gap: 12px;
}

.maintenance-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  min-width: 0;
}

.maintenance-item {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px;
}

.maintenance-item strong {
  color: var(--primary-text-color);
  font-size: 14px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.settings-reset {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: 36px minmax(0, 1fr) auto;
}

.settings-reset-icon {
  --mdc-icon-size: 24px;
  color: var(--error-color);
  justify-self: center;
}

.settings-reset-copy {
  min-width: 0;
}

.settings-reset .command-button {
  justify-self: end;
  width: auto;
}

.section-label {
  color: var(--primary-text-color);
  display: block;
  font-weight: 600;
}

.settings-zone-order p,
.settings-help .section-heading p,
.settings-maintenance p,
.settings-reset p,
.settings-startup p {
  color: var(--secondary-text-color);
  font-size: 12px;
  margin: 4px 0 0;
}

.settings-zone-order > .section-heading {
  grid-template-columns: 36px minmax(0, 1fr);
}

.settings-zone-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  min-width: 0;
}

.external-controllers-in-use {
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
}


.external-controller-conditions {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  min-width: 0;
}

.external-controller-conditions summary,
.external-controller-conditions .settings-section-heading {
  align-items: center;
  cursor: pointer;
  display: grid;
  gap: 8px;
  grid-template-columns: 20px minmax(0, 1fr) 20px;
  list-style: none;
  min-width: 0;
  padding: 10px;
}

.external-controller-conditions .settings-section-heading { cursor: default; grid-template-columns: 20px minmax(0, 1fr); }

.external-controller-conditions summary::-webkit-details-marker {
  display: none;
}

.external-controller-conditions summary > ha-icon:first-child,
.external-controller-conditions .settings-section-heading > ha-icon:first-child {
  --mdc-icon-size: 17px;
  color: var(--primary-color);
}

.external-controller-conditions summary strong,
.external-controller-conditions .settings-section-heading strong {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.external-controller-expand-icon {
  --mdc-icon-size: 18px;
  color: var(--secondary-text-color);
  transition: transform 140ms ease;
}

.external-controller-conditions[open] .external-controller-expand-icon {
  transform: rotate(180deg);
}

.external-controller-conditions-body {
  border-top: 1px solid var(--divider-color);
  padding: 9px 10px 10px;
}

.settings-disclosure .external-controller-conditions-body { display: grid; gap: 12px; padding-top: 12px; }
.settings-disclosure > summary,
.settings-disclosure > .settings-section-heading { box-sizing: border-box; min-height: 44px; }
.settings-disclosure > summary strong,
.settings-disclosure > .settings-section-heading strong { overflow: visible; overflow-wrap: anywhere; text-overflow: clip; white-space: normal; }
.settings-disclosure > summary:focus-visible { border-radius: 4px; outline: 2px solid var(--primary-color); outline-offset: 3px; }

.external-controller-conditions ul {
  color: var(--secondary-text-color);
  display: grid;
  font-size: 12px;
  gap: 4px;
  margin: 0;
  padding-left: 20px;
}

.settings-zone-row {
  align-items: start;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  padding: 10px;
}

.settings-drag-handle {
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--secondary-text-color);
  cursor: grab;
  display: inline-flex;
  height: 36px;
  justify-content: center;
  padding: 0;
  width: 36px;
}

.settings-drag-handle:active {
  cursor: grabbing;
}

.settings-drag-handle ha-icon {
  --mdc-icon-size: 18px;
}

.settings-zone-header {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  min-width: 0;
}

.settings-zone-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.settings-zone-configuration {
  align-items: start;
  display: grid;
  gap: 12px 16px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  min-width: 0;
}

.settings-zone-configuration > .settings-external-policy,
.settings-zone-configuration > .settings-target-temp-step,
.settings-zone-configuration > .settings-target-range-modes,
.settings-zone-configuration > .target-range-reference {
  align-items: start;
  grid-row: span 2;
  grid-template-rows: subgrid;
  row-gap: 4px;
}

@supports not (grid-template-rows: subgrid) {
  .settings-zone-configuration > .settings-external-policy,
  .settings-zone-configuration > .settings-target-temp-step,
  .settings-zone-configuration > .settings-target-range-modes,
  .settings-zone-configuration > .target-range-reference {
    grid-row: auto;
    grid-template-rows: minmax(24px, auto) auto;
  }
}

.settings-row-actions { align-items: center; display: flex; gap: 2px; }
.settings-row-actions .icon-button { height: 36px; width: 36px; }
.settings-zone-row .target-range-review { border-top: 1px solid var(--divider-color); margin-top: 4px; padding-top: 12px; }


.settings-zone-title {
  align-items: center;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
}

.settings-external-policy,
.settings-target-range-modes {
  display: grid;
  gap: 4px;
  min-width: 0;
  position: relative;
}

.settings-policy-heading {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
  min-height: 24px;
}

.settings-policy-heading .label { font-size: 12px; }
.settings-zone-configuration .settings-policy-heading .inline-help-wrapper,
.settings-zone-configuration .settings-policy-heading .documentation-help {
  height: 24px;
  position: relative;
  width: 32px;
}
.settings-zone-configuration .settings-policy-heading .inline-help,
.settings-zone-configuration .settings-policy-heading .documentation-help-button {
  height: 32px;
  position: absolute;
  top: -4px;
  width: 32px;
}
.settings-zone-configuration .settings-policy-heading .documentation-help-button ha-icon {
  --mdc-icon-size: 16px;
  height: 16px;
  width: 16px;
}

.settings-policy-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  width: 100%;
}

.settings-policy-controls > .select-wrap {
  box-sizing: border-box;
  flex: 1 1 180px;
  height: 44px;
  margin: 0;
  min-width: 0;
  width: 100%;
}

.settings-external-policy .select-wrap select {
  box-sizing: border-box;
  font-size: 12px;
  height: 100%;
  margin: 0;
  min-width: 0;
  width: 100%;
}

.settings-policy-duration {
  align-items: center;
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  box-sizing: border-box;
  display: flex;
  flex: 0 0 105px;
  height: 44px;
  min-width: 82px;
  overflow: hidden;
}

.settings-policy-duration input {
  background: var(--card-background-color);
  border: 0;
  border-radius: 0;
  box-sizing: border-box;
  box-shadow: none;
  flex: 1 1 auto;
  font-size: 12px;
  height: 100%;
  margin: 0;
  min-width: 0;
  outline: 0;
  padding-inline: 8px 2px;
  width: 100%;
}

.settings-policy-duration:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.settings-policy-duration span {
  color: var(--secondary-text-color);
  font-size: 11px;
  padding-inline-end: 7px;
}

.settings-target-temp-step-control {
  align-items: center;
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  box-sizing: border-box;
  display: flex;
  height: 44px;
  overflow: hidden;
  max-width: 100%;
  width: 100%;
}

.settings-target-temp-step-control input {
  background: var(--card-background-color);
  border: 0;
  box-shadow: none;
  box-sizing: border-box;
  color: var(--primary-text-color);
  flex: 1 1 auto;
  font: inherit;
  font-size: 12px;
  height: 100%;
  margin: 0;
  min-width: 0;
  outline: 0;
  padding-inline: 8px 2px;
  width: 100%;
}

.settings-target-temp-step-control:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.settings-target-temp-step-control span {
  color: var(--secondary-text-color);
  font-size: 11px;
  padding-inline-end: 7px;
}

.settings-target-temp-step { display: grid; gap: 4px; min-width: 0; }

.target-range-dropdown.select-wrap { margin: 0; min-width: 0; }
.target-range-dropdown > .target-range-trigger {
  align-items: center;
  cursor: pointer;
  display: flex;
  font-size: 12px;
  height: 44px;
  list-style: none;
  min-width: 0;
}
.target-range-trigger::-webkit-details-marker { display: none; }
.target-range-trigger > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.target-range-measure { height: 0; overflow: hidden; position: absolute; visibility: hidden; width: 0; }
.target-range-measure > span { display: inline-block; font: inherit; letter-spacing: inherit; white-space: nowrap; width: max-content; }
.target-range-trigger[aria-disabled="true"] { cursor: default; opacity: .55; }
.target-range-trigger:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
.target-range-options {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgb(0 0 0 / .2);
  box-sizing: border-box;
  inset-inline: 0;
  max-height: 280px;
  overflow: auto;
  padding: 4px;
  position: absolute;
  top: calc(100% + 4px);
  z-index: 30;
}
.target-range-options .checkbox-label { display: flex; gap: 10px; margin: 0; min-height: 44px; padding: 0 8px; }
.target-range-options .checkbox-label input { accent-color: var(--primary-color); flex: 0 0 auto; margin: 0; width: 18px; }
.target-range-options .checkbox-label span { min-width: 0; overflow-wrap: anywhere; }
.target-range-diagnostic { color: var(--warning-color, var(--primary-text-color)); font-size: 12px; overflow-wrap: anywhere; }
.target-range-diagnostic > span { align-items: center; display: inline-flex; gap: 4px; }

.target-range-review { display: grid; font-family: inherit; font-weight: 400; gap: 12px; min-width: 0; }
.target-review-heading { align-items: start; display: grid; gap: 4px 8px; grid-template-columns: 22px minmax(0, 1fr) auto; }
.target-review-heading > ha-icon { --mdc-icon-size: 22px; color: var(--primary-color); }
.target-review-heading h3 { font-size: 14px; font-weight: 600; line-height: 1.4; margin: 0; min-width: 0; overflow-wrap: anywhere; }
.target-review-heading p { color: var(--secondary-text-color); font-size: 12px; font-weight: 400; grid-column: 2 / -1; line-height: 1.5; margin: 0; }
.target-review-heading > .pill { font-size: 11px; grid-column: 3; grid-row: 1; justify-self: end; }
.target-review-counts, .target-review-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
.target-review-counts { font-size: 11px; }
.target-review-counts > strong { color: var(--secondary-text-color); font-weight: 500; }
.target-review-navigation, .target-review-pagination { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; }
.target-review-next-pending { margin-inline-start: auto; }
.target-review-navigation > span, .target-review-pagination > span { color: var(--secondary-text-color); font-size: 12px; }
.target-review-groups, .target-review-days, .target-review-blocks, .target-review-day-editor { display: grid; gap: 8px; min-width: 0; }
.target-review-group { background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 8px; padding: 0 10px; }
.target-review-group > summary, .target-review-day > summary { gap: 8px; }
.target-review-group > summary > .pill, .target-review-day > summary > .pill { flex: 0 0 auto; font-size: 11px; white-space: normal; }
.target-review-day > summary > .target-review-ready { background: color-mix(in srgb, var(--success-color, #43a047) 12%, transparent); border: 1px solid color-mix(in srgb, var(--success-color, #43a047) 45%, var(--divider-color)); color: color-mix(in srgb, var(--success-color, #43a047) 40%, var(--primary-text-color)); }
.target-review-days { margin-bottom: 10px; }
.target-review-day { border-top: 1px solid var(--divider-color); min-width: 0; }
.target-review-day-editor { gap: 12px; padding: 4px 0 12px; }
.target-review-block { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; display: grid; gap: 8px; min-width: 0; padding: 10px; }
.target-review-block.invalid { border-color: color-mix(in srgb, var(--warning-color, #f9a825) 55%, var(--divider-color)); }
.target-review-block > header { align-items: center; display: flex; flex-wrap: wrap; font-size: 12px; gap: 6px; }
.target-review-block-fields { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 120px), 1fr)); min-width: 0; }
.target-review-block-fields label { display: grid; gap: 4px; min-width: 0; }
.target-review-block-fields select, .target-review-block-fields input { font-size: 13px; height: 44px; margin: 0; min-width: 0; }
.target-review-block-fields .label { font-size: 11px; }
.target-review-block-fields .select-wrap { margin: 0; }
.target-review-block-fields input[aria-invalid="true"] { border-color: var(--error-color); }
.target-review-block .target-format-action { justify-self: start; }
.target-review-guidance { align-items: start; color: var(--secondary-text-color); display: flex; font-size: 12px; gap: 6px; line-height: 1.5; margin: 0; }
.target-review-guidance > ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); flex: 0 0 18px; }
.target-review-guidance.warning > ha-icon { color: var(--warning-color); }
.target-review-guidance.error > ha-icon { color: var(--error-color); }
.target-review-other-climates p, .target-review-other-climates ul { color: var(--secondary-text-color); font-size: 12px; font-weight: 400; line-height: 1.5; }
.target-review-other-climates ul { margin: 0 0 8px; padding-inline-start: 18px; }
.target-review-actions { border-top: 1px solid var(--divider-color); padding-top: 12px; }
.target-review-actions .command-button { flex: 1 1 150px; white-space: normal; }
.target-review-actions .command-button.secondary { background: var(--secondary-background-color); border-color: var(--divider-color); color: var(--primary-text-color); }

@media (max-width: 600px) {
  .target-review-heading { grid-template-columns: 20px minmax(0, 1fr) auto; }
  .target-review-block-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .target-review-block-fields > label:first-child { grid-column: 1 / -1; }
  .target-review-group > summary > .pill, .target-review-day > summary > .pill { max-width: 100px; text-align: center; }
  .target-review-pagination .command-button { flex: 1 1 100px; }
  .target-review-pagination > span { order: -1; width: 100%; }
}

@media (max-width: 600px) {
  .settings-zone-configuration { grid-template-columns: minmax(0, 1fr); }
  .settings-zone-header { grid-template-columns: 44px minmax(0, 1fr) auto; gap: 4px; }
  .settings-drag-handle { height: 44px; width: 44px; }
  .settings-row-actions .icon-button { height: 44px; width: 44px; }
}

.settings-zone-identity strong,
.settings-zone-identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-zone-identity span {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.settings-entity-status.ok {
  color: var(--success-color, #2e7d32);
}

.settings-entity-status.warning {
  color: var(--error-color, #c62828);
}

.settings-capability-section {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.settings-mode-tags,
.settings-data-icons,
.settings-facts,
.settings-capability-composite {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.settings-capability-composite {
  align-items: flex-start;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(150px, auto) minmax(90px, 1fr);
}

.settings-facts span {
  align-items: center;
  color: var(--secondary-text-color);
  display: inline-flex;
  font-size: 12px;
  gap: 4px;
  min-width: 0;
}

.settings-facts .capability-not-reported {
  color: var(--secondary-text-color);
}

.settings-facts ha-icon,
.settings-data-icons ha-icon {
  --mdc-icon-size: 16px;
  color: var(--secondary-text-color);
}

.settings-data-icons span {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  display: inline-flex;
  height: 26px;
  justify-content: center;
  width: 26px;
}

.mode-chip {
  background: var(--timeline-bg, color-mix(in srgb, var(--primary-color) 12%, var(--card-background-color)));
  border: 1px solid var(--timeline-border, color-mix(in srgb, var(--primary-color) 36%, var(--divider-color)));
  border-radius: 999px;
  color: var(--primary-text-color);
  display: inline-flex;
  font-size: 12px;
  line-height: 1;
  padding: 5px 8px;
  white-space: nowrap;
}

.mode-chip.mode-heat {
  --timeline-bg: color-mix(in srgb, #d95f24 18%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #d95f24 48%, var(--divider-color));
}

.mode-chip.mode-cool {
  --timeline-bg: color-mix(in srgb, #2d7dd2 18%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #2d7dd2 48%, var(--divider-color));
}

.mode-chip.mode-heat-cool {
  --timeline-bg: color-mix(in srgb, #6f7f91 16%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #6f7f91 45%, var(--divider-color));
}

.mode-chip.mode-auto {
  --timeline-bg: color-mix(in srgb, #6f7f91 18%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #6f7f91 45%, var(--divider-color));
}

.mode-chip.mode-dry {
  --timeline-bg: color-mix(in srgb, #b4872b 16%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #b4872b 42%, var(--divider-color));
}

.mode-chip.mode-fan-only {
  --timeline-bg: color-mix(in srgb, #2f8f83 16%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #2f8f83 42%, var(--divider-color));
}

.mode-chip.mode-off {
  --timeline-bg: color-mix(in srgb, var(--disabled-text-color) 16%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, var(--disabled-text-color) 42%, var(--divider-color));
}

@media (max-width: 720px) {
  .external-system-zone { align-items: stretch; grid-template-columns: minmax(0, 1fr); }
}

@container (max-width: 720px) {
  .external-system-zone { align-items: stretch; grid-template-columns: minmax(0, 1fr); }
}

@media (pointer: coarse) {
  .settings-policy-controls > .select-wrap,
  .settings-policy-duration,
  .settings-target-temp-step-control { height: 44px; }
}


  .room-group-warning { color: var(--warning-color); }
`;
