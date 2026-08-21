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

.settings-zone-row {
  align-items: start;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 8px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
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
  height: 28px;
  justify-content: center;
  margin: -2px;
  padding: 0;
  width: 28px;
}

.settings-drag-handle:active {
  cursor: grabbing;
}

.settings-drag-handle ha-icon {
  --mdc-icon-size: 18px;
}

.settings-zone-main {
  align-items: start;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(150px, 0.65fr) minmax(260px, 1.35fr);
  min-width: 0;
}

.settings-zone-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.settings-zone-title {
  align-items: center;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
}

.settings-external-policy {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  min-width: 0;
  position: relative;
}

.settings-policy-heading {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
}

.settings-policy-heading .label { font-size: 12px; }

.settings-policy-controls {
  align-items: center;
  display: flex;
  flex: 0 1 auto;
  gap: 8px;
  min-width: 0;
}

.settings-policy-controls > .select-wrap {
  box-sizing: border-box;
  flex: 0 1 170px;
  height: 34px;
  margin: 0;
  min-width: 0;
  width: 170px;
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
  border-radius: 6px;
  box-sizing: border-box;
  display: flex;
  flex: 0 1 105px;
  height: 34px;
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

.settings-row-actions {
  display: inline-flex;
  gap: 4px;
}

.settings-row-actions .icon-button {
  height: 34px;
  width: 34px;
}

@media (max-width: 720px) {
  .settings-zone-main { grid-template-columns: minmax(0, 1fr); }
}

@media (pointer: coarse) {
  .settings-policy-controls > .select-wrap,
  .settings-policy-duration { height: 40px; }
}

@media (max-width: 480px) {
  .settings-zone-row { grid-template-columns: 24px minmax(0, 1fr); }
  .settings-row-actions { grid-column: 2; justify-self: end; }
  .settings-external-policy { align-items: stretch; flex-direction: column; gap: 4px; }
  .settings-policy-controls { width: 100%; }
  .settings-policy-controls > .select-wrap { flex: 1 1 160px; height: 40px; max-width: 170px; width: auto; }
  .settings-policy-duration { flex: 0 1 105px; height: 40px; }
}
`;
