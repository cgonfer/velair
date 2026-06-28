import { css } from "lit";

export const preconditioningStyles = css`
.preconditioning-view {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.preconditioning-zone {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  min-width: 0;
  overflow: visible;
  position: relative;
}

.preconditioning-zone-heading {
  align-items: center;
  background: var(--card-background-color);
  border-bottom: 1px solid var(--divider-color);
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
  padding: 12px;
  border-radius: 8px 8px 0 0;
}

.preconditioning-zone.collapsed .preconditioning-zone-heading {
  border-bottom: 0;
  border-radius: 8px;
}

.preconditioning-zone-toggle {
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 8px;
  grid-template-columns: 20px minmax(0, 1fr);
  min-width: 0;
  padding: 0;
  text-align: left;
}

.preconditioning-zone-toggle:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 4px;
}

.preconditioning-zone-toggle:disabled {
  cursor: default;
}

.preconditioning-zone-toggle:disabled .preconditioning-expand-icon {
  opacity: 0.45;
}

.preconditioning-zone-toggle > ha-icon {
  --mdc-icon-size: 20px;
}

.preconditioning-expand-icon {
  color: var(--secondary-text-color);
}

.preconditioning-zone-actions,
.preconditioning-enable-control {
  align-items: center;
  display: flex;
  gap: 8px;
  min-width: 0;
}

.preconditioning-settings-reset {
  height: 32px;
  width: 32px;
}

.preconditioning-settings-reset ha-icon {
  --mdc-icon-size: 18px;
}

.preconditioning-unavailable-message {
  color: var(--secondary-text-color);
  display: none;
  font-size: 12px;
  line-height: 1.3;
}

.preconditioning-zone-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
  text-align: left;
}

.preconditioning-zone-identity strong,
.preconditioning-zone-identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preconditioning-zone-identity strong {
  color: var(--primary-text-color);
  font-size: 14px;
}

.preconditioning-zone-identity span {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.preconditioning-zone-content {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 12px;
}

.preconditioning-config-sections {
  display: grid;
  gap: 16px 24px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.preconditioning-config-section {
  align-content: start;
  border: 1px solid var(--divider-color);
  border-radius: 6px;
  display: grid;
  gap: 0;
  grid-template-rows: max-content max-content;
  min-width: 0;
  position: relative;
}

.preconditioning-config-section:focus-within,
.preconditioning-config-section:hover {
  z-index: 3;
}

.preconditioning-config-section h3,
.preconditioning-learning-heading {
  align-items: center;
  border-bottom: 1px solid var(--divider-color);
  color: var(--primary-text-color);
  display: flex;
  font-size: 13px;
  font-weight: 700;
  gap: 6px;
  margin: 0;
  padding: 0 0 7px;
}

.preconditioning-config-section h3 {
  background: var(--secondary-background-color);
  border-radius: 5px 5px 0 0;
  padding: 8px 10px;
}

.preconditioning-config-section h3 ha-icon,
.preconditioning-learning-heading ha-icon {
  --mdc-icon-size: 17px;
  color: var(--primary-color);
}

.preconditioning-config-rows {
  align-content: start;
  display: grid;
  min-width: 0;
  padding: 0 10px 4px;
}

.preconditioning-config-row {
  align-items: center;
  border-top: 1px solid color-mix(in srgb, var(--divider-color) 65%, transparent);
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) minmax(96px, 120px);
  min-height: 42px;
  min-width: 0;
  padding: 6px 0;
  position: relative;
}

.preconditioning-config-row:first-child {
  border-top: 0;
}

.preconditioning-config-row > .label {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.3;
  min-width: 0;
  overflow-wrap: anywhere;
}

.preconditioning-config-label {
  align-items: center;
  display: flex;
  gap: 4px;
}

.preconditioning-help {
  align-items: center;
  color: var(--secondary-text-color);
  cursor: help;
  display: inline-flex;
  flex: 0 0 auto;
  outline: none;
  position: relative;
}

.preconditioning-help ha-icon {
  --mdc-icon-size: 15px;
}

.preconditioning-help-tooltip {
  background: var(--primary-text-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
  color: var(--primary-background-color);
  font-size: 11px;
  font-weight: 400;
  left: 50%;
  line-height: 1.35;
  max-width: min(240px, calc(100vw - 40px));
  opacity: 0;
  padding: 7px 8px;
  pointer-events: none;
  position: absolute;
  top: calc(100% + 6px);
  transform: translateX(-22px);
  transition: opacity 120ms ease, visibility 120ms ease;
  visibility: hidden;
  white-space: normal;
  width: max-content;
  z-index: 20;
}

.preconditioning-help:hover .preconditioning-help-tooltip,
.preconditioning-help:focus .preconditioning-help-tooltip,
.preconditioning-help:focus-visible .preconditioning-help-tooltip {
  opacity: 1;
  visibility: visible;
}

.preconditioning-config-row input,
.preconditioning-config-row select {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 6px;
  box-sizing: border-box;
  color: var(--primary-text-color);
  min-width: 0;
  padding: 7px 8px;
  width: 100%;
}

.preconditioning-sensor-row {
  grid-template-columns: minmax(0, 1fr) minmax(150px, 1.4fr);
}

.preconditioning-sensor-row.inactive select {
  background: color-mix(in srgb, var(--disabled-text-color) 10%, var(--card-background-color));
  border-style: dashed;
  color: var(--secondary-text-color);
}

.preconditioning-toggle-row ha-switch {
  justify-self: end;
}

.preconditioning-learning {
  border-top: 1px dashed var(--divider-color);
  display: grid;
  gap: 8px;
  min-width: 0;
  padding-top: 12px;
}

.preconditioning-learning-heading {
  margin-bottom: 8px;
}

.preconditioning-directions {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.preconditioning-direction {
  border: 1px solid var(--divider-color);
  border-radius: 6px;
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 8px;
}

.preconditioning-direction-heading {
  align-items: center;
  background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color));
  border: 1px solid color-mix(in srgb, var(--primary-color) 22%, var(--divider-color));
  border-radius: 5px;
  color: var(--primary-text-color);
  display: flex;
  font-size: 13px;
  font-weight: 700;
  justify-content: space-between;
  min-width: 0;
  padding: 6px 7px;
}

.preconditioning-direction-heading span {
  align-items: center;
  display: inline-flex;
  gap: 5px;
  min-width: 0;
}

.preconditioning-direction-heading ha-icon {
  --mdc-icon-size: 16px;
  color: var(--primary-color);
}

.preconditioning-learning-reset {
  height: 28px;
  width: 28px;
}

.preconditioning-learning-reset ha-icon {
  --mdc-icon-size: 16px;
  color: var(--error-color, #c62828);
}

.preconditioning-learning-summary {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.preconditioning-learning-indicator {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 6px;
  display: grid;
  gap: 7px;
  grid-template-columns: 20px minmax(0, 1fr);
  min-width: 0;
  padding: 7px;
}

.preconditioning-learning-indicator ha-icon {
  --mdc-icon-size: 19px;
  color: var(--secondary-text-color);
}

.preconditioning-learning-indicator.ready ha-icon,
.preconditioning-learning-indicator.history ha-icon {
  color: var(--success-color, #2e7d32);
}

.preconditioning-learning-indicator.learning ha-icon {
  color: var(--primary-color);
}

.preconditioning-learning-indicator > span {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.preconditioning-learning-indicator small,
.preconditioning-learning-indicator strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preconditioning-learning-indicator small {
  color: var(--secondary-text-color);
  font-size: 10px;
}

.preconditioning-learning-indicator strong {
  color: var(--primary-text-color);
  font-size: 12px;
  font-weight: 600;
}

.preconditioning-sample-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.preconditioning-sample-chip {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  color: var(--secondary-text-color);
  display: inline-flex;
  font-size: 11px;
  gap: 4px;
  min-height: 26px;
  padding: 0 8px;
  white-space: nowrap;
}

.preconditioning-sample-chip strong {
  color: var(--primary-text-color);
  font-size: 11px;
}

`;
