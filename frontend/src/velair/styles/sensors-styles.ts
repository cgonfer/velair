import { css } from "lit";

export const sensorsStyles = css`
.sensors-view {
  display: grid;
  gap: 12px;
  max-width: 100%;
  min-width: 0;
}

.sensor-reference-control {
  display: block;
  min-width: 0;
  grid-column: 1 / -1;
  padding: 0;
}

.sensors-intro {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 24px minmax(0, 1fr);
  padding: 2px 4px 4px;
}

.sensors-intro > ha-icon {
  --mdc-icon-size: 22px;
  color: var(--primary-color);
}

.sensors-intro > span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.sensors-intro strong {
  color: var(--primary-text-color);
  font-size: 14px;
  line-height: 1.25;
}

.sensors-intro small {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.35;
}

.sensor-zone {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  min-width: 0;
  overflow: visible;
  position: relative;
}

.sensor-zone-heading {
  align-items: center;
  background: var(--card-background-color);
  border-bottom: 1px solid var(--divider-color);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
  padding: 12px;
}

.sensor-zone.collapsed .sensor-zone-heading {
  border-bottom: 0;
  border-radius: 8px;
}

.sensor-zone-toggle {
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

.sensor-zone-toggle:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 4px;
}

.sensor-zone-toggle:disabled {
  cursor: default;
}

.sensor-zone-toggle:disabled .sensor-expand-icon {
  color: var(--disabled-text-color);
  opacity: 0.45;
}

.sensor-zone-toggle > ha-icon {
  --mdc-icon-size: 20px;
  color: var(--secondary-text-color);
}

.sensor-zone-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.sensor-zone-identity strong,
.sensor-zone-identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sensor-zone-identity strong {
  color: var(--primary-text-color);
  font-size: 14px;
}

.sensor-zone-identity span {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.sensor-zone-actions {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  justify-content: flex-end;
}

.sensor-enable-control.unavailable {
  cursor: help;
  opacity: 0.55;
}

.sensor-zone-content {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 12px;
}

.sensor-config-section,
.sensor-runtime-section {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
  position: relative;
}

.sensor-config-section:focus-within,
.sensor-config-section:hover,
.sensor-runtime-section:focus-within,
.sensor-runtime-section:hover {
  z-index: 3;
}

.sensor-config-section h3,
.sensor-runtime-section h3 {
  align-items: center;
  background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
  border-bottom: 1px solid var(--divider-color);
  color: var(--primary-text-color);
  display: flex;
  font-size: 13px;
  font-weight: 700;
  gap: 8px;
  justify-content: space-between;
  letter-spacing: 0;
  margin: 0;
  padding: 10px 12px;
}

.sensor-config-section {
  container-type: inline-size;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.sensor-config-section h3 {
  background: transparent;
  border-bottom: 0;
  justify-content: flex-start;
  padding: 4px 0 20px;
}

.sensor-section-title {
  align-items: center;
  display: inline-flex;
  gap: 8px;
  min-width: 0;
}

.sensor-config-section h3 ha-icon,
.sensor-runtime-section h3 ha-icon {
  color: var(--primary-color);
  height: 18px;
  width: 18px;
}

.sensor-config-rows {
  display: grid;
}

.sensor-config-row {
  align-items: center;
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) minmax(110px, 180px);
  padding: 12px 0;
}

.sensor-config-row:first-child {
  border-top: 0;
}

.sensor-assist-settings {
  border-top: 1px solid var(--divider-color);
  margin-top: 22px;
  padding-top: 18px;
  min-width: 0;
}

.sensor-config-rows > .sensor-assist-settings:first-child {
  border-top: 0;
  margin-top: 0;
}

.sensor-assist-settings h4 {
  font-size: 13px;
  font-weight: 500;
  margin: 0 0 16px;
}

.sensor-number-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
  gap: 9px 24px;
  align-items: start;
  min-width: 0;
}

.sensor-number-fields .sensor-config-row {
  grid-row: span 3;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: subgrid;
  border: 0;
  padding: 0;
  gap: 9px;
}

.sensor-field-description {
  grid-column: 1 / -1;
  align-self: start;
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.45;
}

.sensor-field-error:not([hidden]) {
  color: var(--error-color);
  display: block;
  margin-top: 6px;
}

.sensor-braking-row {
  border-top: 0;
  border-bottom: 1px solid var(--divider-color);
  grid-template-columns: minmax(0, 1fr) minmax(160px, 220px);
  margin-bottom: 18px;
  padding: 0 0 18px;
  min-width: 0;
}

.sensor-braking-row .sensor-braking-control {
  margin-top: 0;
  min-width: 0;
}

.sensor-braking-control select {
  min-height: 44px;
  padding-inline-end: 32px;
  width: 100%;
}

.sensor-braking-explanation,
.sensor-braking-depth,
.sensor-braking-requirement,
.sensor-braking-inactive {
  display: block;
  margin-top: 4px;
}

.sensor-braking-summary {
  color: var(--secondary-text-color);
  display: grid;
  font-size: 12px;
  gap: 4px;
  line-height: 1.45;
  min-width: 0;
  overflow-wrap: anywhere;
}

.sensor-temperature-display {
  display: grid;
  gap: 8px;
  max-width: 100%;
  min-width: 0;
}

.sensor-scale-braking-threshold {
  border-left: 2px dashed var(--primary-color, #03a9f4);
  display: block;
  height: 32px;
  position: absolute;
  top: 53px;
  width: 0;
  z-index: 2;
}

.sensor-scale-braking-threshold.braking-resume {
  border-left-style: dotted;
}

@supports not (grid-template-rows: subgrid) {
  .sensor-number-fields .sensor-config-row {
    grid-row: auto;
    grid-template-rows: minmax(32px, auto) 38px auto;
  }
}

@container (max-width: 640px) {
  .sensor-braking-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 9px;
  }

  .sensor-number-fields {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .sensor-number-fields .sensor-config-row {
    grid-row: auto;
    grid-template-rows: auto auto;
    grid-template-columns: minmax(0, 1fr) minmax(90px, 112px);
    gap: 12px;
  }
}

.sensor-config-row.inactive > .sensor-config-label > label,
.sensor-config-row.inactive > .sensor-config-label .inline-help,
.sensor-config-row.inactive > .sensor-number-input {
  opacity: 0.62;
}

.sensor-number-input {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.sensor-number-input > span {
  color: var(--secondary-text-color);
  font-size: 12px;
  white-space: nowrap;
}

.sensor-config-label {
  align-items: center;
  color: var(--primary-text-color);
  display: inline-flex;
  gap: 6px;
  min-width: 0;
}

.sensor-status-card {
  display: grid;
  gap: 12px;
  padding: 12px;
}

.sensors-view .sensor-runtime-section:not(.sensor-inactive-section) {
  background: transparent;
  border: 0;
  border-top: 1px solid var(--divider-color);
  border-radius: 0;
}

.sensors-view .sensor-runtime-heading {
  background: transparent;
  border-bottom: 0;
  padding: 14px 0;
}

.sensors-view .sensor-status-card {
  padding: 0;
}

.sensors-view velair-room-assist-graph {
  --ra-explanation-max-width: none;
}

.sensor-inactive-section p {
  color: var(--secondary-text-color);
  font-size: 13px;
  line-height: 1.4;
  margin: 0;
  padding: 12px;
}

.sensor-inactive-section h3 ha-icon {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  line-height: 1;
}

.sensor-status-pill {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  color: var(--primary-text-color);
  display: inline-flex;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  padding: 5px 9px;
  white-space: nowrap;
}

.sensor-status-pill.assisting,
.sensor-status-pill.ready {
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  border-color: color-mix(in srgb, var(--primary-color) 36%, var(--divider-color));
}

.sensor-status-pill.holding {
  background: color-mix(in srgb, var(--success-color, #43a047) 12%, transparent);
  border-color: color-mix(in srgb, var(--success-color, #43a047) 36%, var(--divider-color));
}

.sensor-status-pill.blocked,
.sensor-status-pill.unavailable {
  background: color-mix(in srgb, var(--warning-color, #f9a825) 14%, transparent);
  border-color: color-mix(in srgb, var(--warning-color, #f9a825) 38%, var(--divider-color));
}

.sensor-idle-state {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  color: var(--secondary-text-color);
  display: grid;
  font-size: 13px;
  gap: 8px;
  grid-template-columns: 20px minmax(0, 1fr);
  line-height: 1.35;
  padding: 12px;
}

.sensor-idle-state ha-icon {
  --mdc-icon-size: 19px;
  color: var(--secondary-text-color);
}

.sensor-selected-entity {
  color: var(--secondary-text-color);
  display: block;
  font-size: 11px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .sensor-zone-heading {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .sensor-zone-actions {
    justify-content: flex-end;
  }

}
`;
