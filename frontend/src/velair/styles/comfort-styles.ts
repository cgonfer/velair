import { css } from "lit";

export const comfortStyles = css`
.comfort-view {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.comfort-intro {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 24px minmax(0, 1fr);
  padding: 2px 4px 4px;
}

.comfort-intro > ha-icon {
  --mdc-icon-size: 22px;
  color: var(--primary-color);
}

.comfort-intro > span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.comfort-intro strong {
  color: var(--primary-text-color);
  font-size: 14px;
  line-height: 1.25;
}

.comfort-intro small {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.35;
}

.comfort-zone {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  min-width: 0;
  overflow: visible;
  position: relative;
}

.comfort-zone-heading {
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

.comfort-zone.collapsed .comfort-zone-heading {
  border-bottom: 0;
  border-radius: 8px;
}

.comfort-zone-toggle {
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

.comfort-zone-toggle:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 4px;
}

.comfort-zone-toggle:disabled {
  cursor: default;
}

.comfort-zone-toggle:disabled .comfort-expand-icon {
  color: var(--disabled-text-color);
  opacity: 0.45;
}

.comfort-expand-icon {
  color: var(--secondary-text-color);
}

.comfort-zone-toggle > ha-icon {
  --mdc-icon-size: 20px;
}

.comfort-zone-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
  text-align: left;
}

.comfort-zone-identity strong,
.comfort-zone-identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comfort-zone-identity strong {
  color: var(--primary-text-color);
  font-size: 14px;
}

.comfort-zone-identity span {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.comfort-zone-actions {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  justify-content: flex-end;
  min-width: 0;
}

.comfort-assessment-summary {
  align-items: center;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.comfort-assessment-line {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.comfort-condition-pill {
  border-radius: 999px;
  border: 1px solid var(--divider-color);
  color: var(--secondary-text-color);
  font-size: 0.76rem;
  font-weight: 700;
  padding: 4px 8px;
  white-space: nowrap;
}

.comfort-condition-pill.condition-comfortable,
.comfort-condition-pill.condition-temperature_comfortable,
.comfort-condition-pill.condition-humidity_comfortable,
.comfort-condition-pill.range-within_range,
.comfort-air-pill.air-good {
  border-color: color-mix(in srgb, var(--success-color, #43a047) 28%, var(--divider-color));
  color: var(--success-color, #43a047);
}

.comfort-condition-pill.condition-dry,
.comfort-condition-pill.condition-humid,
.comfort-condition-pill.condition-cold_and_dry,
.comfort-condition-pill.condition-cold_and_humid,
.comfort-condition-pill.condition-hot_and_dry,
.comfort-condition-pill.condition-hot_and_humid,
.comfort-air-pill.air-elevated {
  border-color: color-mix(in srgb, var(--warning-color, #f9ab00) 35%, var(--divider-color));
  color: var(--warning-color, #b26a00);
}

.comfort-condition-pill.condition-hot,
.comfort-air-pill.air-poor {
  border-color: color-mix(in srgb, var(--error-color, #d93025) 32%, var(--divider-color));
  color: var(--error-color, #d93025);
}

.comfort-condition-pill.condition-cold {
  border-color: color-mix(in srgb, var(--info-color, #039be5) 35%, var(--divider-color));
  color: var(--info-color, #0277bd);
}

.comfort-air-pill {
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  color: var(--secondary-text-color);
  font-size: 0.76rem;
  font-weight: 700;
  padding: 4px 8px;
  white-space: nowrap;
}

.comfort-humidex-pill {
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  color: var(--secondary-text-color);
  font-size: 0.76rem;
  font-weight: 700;
  padding: 4px 8px;
  white-space: nowrap;
}

.comfort-humidex-pill.position-below {
  border-color: color-mix(in srgb, var(--info-color, #039be5) 35%, var(--divider-color));
  color: var(--info-color, #0277bd);
}

.comfort-humidex-pill.position-within {
  border-color: color-mix(in srgb, var(--success-color, #43a047) 28%, var(--divider-color));
  color: var(--success-color, #43a047);
}

.comfort-humidex-pill.position-above {
  border-color: color-mix(in srgb, var(--warning-color, #f9ab00) 35%, var(--divider-color));
  color: var(--warning-color, #b26a00);
}

.comfort-zone-content {
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 12px;
  padding: 12px;
}

.comfort-assessment-card,
.comfort-config-section {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  padding: 12px;
}

.comfort-assessment-card.idle {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  gap: 10px;
}

.comfort-assessment-heading {
  align-items: start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 10px;
}

.comfort-assessment-heading > span {
  align-items: center;
  display: flex;
  gap: 6px;
}

.comfort-assessment-heading-pills {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.comfort-data-warning {
  align-items: center;
  color: var(--warning-color, #b26a00);
  display: inline-flex;
}

.comfort-condition-pill.range-mixed {
  border-color: color-mix(in srgb, var(--info-color, #039be5) 35%, var(--divider-color));
  color: var(--info-color, #0277bd);
}

.comfort-condition-pill.range-outside_range {
  border-color: color-mix(in srgb, var(--warning-color, #f9ab00) 35%, var(--divider-color));
  color: var(--warning-color, #b26a00);
}

.comfort-data-warning .inline-help {
  color: inherit;
}

.comfort-visuals {
  display: grid;
  gap: 12px;
}

.comfort-insights {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}

.comfort-insight-context {
  align-items: center;
  border-radius: 8px;
  display: grid;
  min-width: 0;
}

.comfort-insight-context ha-icon {
  --mdc-icon-size: 19px;
  color: var(--secondary-text-color);
}

.comfort-insight-context-list {
  display: grid;
  gap: 7px;
  grid-template-columns: minmax(0, 1fr);
}

.comfort-insight-context {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  color: var(--secondary-text-color);
  font-size: 12px;
  gap: 7px;
  grid-template-columns: 20px minmax(0, 1fr);
  line-height: 1.35;
  padding: 8px 9px;
}

.comfort-insight-context.tone-attention ha-icon,
.comfort-insight-context.tone-warm ha-icon { color: var(--warning-color, #f9ab00); }
.comfort-insight-context.tone-cool ha-icon { color: var(--info-color, #039be5); }
.comfort-insight-context.tone-positive ha-icon { color: var(--success-color, #2e7d32); }
.comfort-insight-context.tone-critical ha-icon { color: var(--error-color, #d93025); }

.comfort-config-description {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.4;
  margin: -3px 0 11px;
}

.comfort-configuration {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  min-width: 0;
  overflow: hidden;
}

.comfort-configuration > summary {
  align-items: center;
  box-sizing: border-box;
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  list-style: none;
  min-height: 48px;
  padding: 10px 12px;
}

.comfort-configuration > summary::-webkit-details-marker {
  display: none;
}

.comfort-configuration > summary:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: -3px;
}

.comfort-configuration-summary {
  align-items: center;
  display: grid;
  gap: 9px;
  grid-template-columns: 22px minmax(0, 1fr);
  min-width: 0;
}

.comfort-configuration-summary > ha-icon {
  --mdc-icon-size: 20px;
  color: var(--primary-color);
}

.comfort-configuration-summary > span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.comfort-configuration-summary strong {
  color: var(--primary-text-color);
  font-size: 13px;
}

.comfort-configuration-summary small {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.3;
}

.comfort-configuration-chevron {
  --mdc-icon-size: 20px;
  color: var(--secondary-text-color);
  transform: rotate(-90deg);
  transition: transform 160ms ease;
}

.comfort-configuration[open] .comfort-configuration-chevron {
  transform: rotate(0);
}

.comfort-configuration-content {
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 10px;
  padding: 10px;
}

.comfort-derived-visual-section {
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
}

.comfort-outdoor-comparison {
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 8px;
  margin-top: 12px;
  min-width: 0;
  padding-top: 10px;
}

.comfort-outdoor-comparison > h3 {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  font-size: 13px;
  gap: 6px;
  margin: 0;
}

.comfort-outdoor-comparison > h3 ha-icon {
  --mdc-icon-size: 18px;
  color: var(--primary-color);
}

.comfort-outdoor-grid {
  align-items: start;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.comfort-outdoor-cell {
  align-content: start;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 7px;
  grid-auto-rows: max-content;
  min-width: 0;
  padding: 9px 10px;
}

.comfort-outdoor-cell > header {
  align-items: center;
  display: grid;
  gap: 7px;
  grid-template-columns: 18px minmax(0, 1fr);
  line-height: 1.3;
}

.comfort-outdoor-cell > header ha-icon {
  --mdc-icon-size: 18px;
  color: var(--primary-color);
}

.comfort-outdoor-cell > header strong {
  font-size: 13px;
  line-height: 1.25;
}

.comfort-outdoor-data {
  display: grid;
  grid-auto-rows: minmax(32px, auto);
  line-height: 1.35;
  row-gap: 0;
}

.comfort-outdoor-cell dl {
  display: contents;
  margin: 0;
}

.comfort-outdoor-cell dl > div {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 32px;
  min-width: 0;
}

.comfort-outdoor-cell dt,
.comfort-outdoor-cell p {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.35;
}

.comfort-outdoor-cell dd {
  color: var(--primary-text-color);
  font-size: 13px;
  font-weight: 700;
  margin: 0;
  overflow-wrap: anywhere;
  text-align: right;
}

.comfort-outdoor-adjusted-label {
  align-items: center;
  display: flex;
  gap: 2px;
  min-width: 0;
}

.comfort-outdoor-adjusted-label > span:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}

.comfort-outdoor-cell p {
  align-items: center;
  display: flex;
  margin: 0;
  min-height: 32px;
}

.comfort-outdoor-config-section > header {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.comfort-outdoor-config-section > header > span {
  align-items: center;
  display: grid;
  gap: 7px;
  grid-template-columns: 20px minmax(0, 1fr);
}

.comfort-outdoor-config-section > header ha-icon {
  --mdc-icon-size: 20px;
  color: var(--primary-color);
}

.comfort-outdoor-config-section > header strong {
  font-size: 13px;
}

.comfort-outdoor-config-section > .comfort-config-description {
  margin: 5px 0 10px;
}

.comfort-outdoor-config-rows {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.comfort-ventilation-guidance-config {
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
}

.comfort-ventilation-guidance-config > h4 {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  font-size: 12px;
  gap: 6px;
  margin: 0;
}

.comfort-ventilation-guidance-config > h4 ha-icon {
  --mdc-icon-size: 18px;
  color: var(--primary-color);
}

.comfort-ventilation-guidance-rows {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
}

.comfort-ventilation-guidance-rows .comfort-number-field-single small {
  display: none;
}

.comfort-derived-visual-section > h3 {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  font-size: 0.8rem;
  gap: 6px;
  margin: 0;
}

.comfort-derived-visual-section > h3 ha-icon {
  --mdc-icon-size: 18px;
  color: var(--primary-color);
}

.comfort-derived-visual-list {
  align-items: start;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  min-width: 0;
}

.comfort-derived-reading {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  min-width: 0;
  padding: 9px 10px;
}

.comfort-derived-reading > header {
  align-items: center;
  display: grid;
  gap: 7px;
  grid-template-columns: 18px minmax(0, 1fr);
  margin-bottom: 7px;
  min-width: 0;
}

.comfort-derived-summary-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-width: 0;
}

.comfort-derived-summary-row > header {
  align-items: center;
  display: grid;
  flex: 1 1 150px;
  gap: 7px;
  grid-template-columns: 18px minmax(0, 1fr);
  min-width: 0;
}

.comfort-derived-summary-row > header > ha-icon {
  --mdc-icon-size: 18px;
  color: var(--primary-color);
}

.comfort-derived-summary-value {
  flex: 0 1 auto;
  font-size: 1rem;
  line-height: 1.2;
  margin-left: auto;
  max-width: 100%;
  overflow-wrap: anywhere;
  text-align: right;
}

.comfort-derived-detail {
  color: var(--secondary-text-color);
  font-size: 0.78rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.comfort-derived-reading > header > ha-icon {
  --mdc-icon-size: 18px;
  color: var(--primary-color);
}

.comfort-derived-config-list {
  align-items: start;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
}

.comfort-derived-config {
  align-self: start;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  height: auto;
  overflow: hidden;
}

.comfort-derived-config > header {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 10px;
}

.comfort-derived-config > header > ha-icon {
  --mdc-icon-size: 20px;
  color: var(--primary-color);
}

.comfort-derived-title {
  align-items: center;
  display: flex;
  gap: 4px;
  min-width: 0;
}

.comfort-derived-title strong {
  font-size: 0.86rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comfort-derived-title .inline-help {
  flex: 0 0 auto;
}

.comfort-derived-config-section .comfort-derived-title strong {
  font-size: 0.9rem;
  line-height: 1.25;
}

.comfort-derived-body {
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 9px;
  min-width: 0;
  padding: 10px;
}

.comfort-derived-reading-value {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.comfort-derived-reading-value small {
  color: var(--secondary-text-color);
  font-size: 0.72rem;
}

.comfort-derived-current {
  color: var(--primary-text-color);
  font-size: 1rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comfort-derived-current:not(.availability-current) {
  color: var(--secondary-text-color);
  font-size: 0.86rem;
}

.comfort-derived-visual {
  color: var(--primary-text-color);
  display: grid;
  gap: 4px;
  min-width: 0;
}

.comfort-derived-visual > small,
.comfort-derived-endpoint small {
  color: var(--secondary-text-color);
  font-size: 0.72rem;
}

.comfort-derived-visual > strong,
.comfort-derived-endpoint strong {
  font-size: 1rem;
  line-height: 1.2;
}

.comfort-derived-visual[class*="availability-"]:not(.availability-current) {
  color: var(--secondary-text-color);
  opacity: 0.72;
}

.comfort-derived-relation {
  color: var(--secondary-text-color);
  font-size: 0.78rem;
  line-height: 1.35;
}

.comfort-humidex-comparison {
  align-items: center;
  display: grid;
  gap: 7px;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  min-width: 0;
}

.comfort-derived-endpoint {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.comfort-derived-endpoint.humidex {
  text-align: right;
}

.comfort-humidex-delta {
  align-items: center;
  background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color));
  border: 1px solid color-mix(in srgb, var(--primary-color) 24%, var(--divider-color));
  border-radius: 999px;
  color: var(--secondary-text-color);
  display: inline-flex;
  gap: 3px;
  justify-content: center;
  min-width: 0;
  padding: 3px 6px;
  white-space: nowrap;
}

.comfort-humidex-delta ha-icon {
  --mdc-icon-size: 14px;
}

.comfort-humidex-delta strong {
  font-size: 0.74rem;
  line-height: 1;
}

.comfort-derived-visual.tone-warm .comfort-humidex-delta {
  color: color-mix(in srgb, var(--warning-color, #f9ab00) 72%, var(--primary-text-color));
}

.comfort-derived-visual.tone-cool .comfort-humidex-delta {
  color: color-mix(in srgb, var(--primary-color) 68%, var(--primary-text-color));
}

.comfort-humidex-scale {
  display: grid;
  gap: 3px 8px;
  grid-template-areas:
    "air plot"
    "humidex plot"
    ". domain"
    "status status";
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: 24px 24px auto auto;
  margin-top: 5px;
  min-width: 0;
}

.comfort-humidex-scale-label {
  align-self: center;
  color: var(--secondary-text-color);
  font-size: 0.7rem;
  white-space: nowrap;
}

.comfort-humidex-scale-label.air { grid-area: air; }
.comfort-humidex-scale-label.humidex { grid-area: humidex; }

.comfort-humidex-scale-plot {
  grid-area: plot;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.comfort-humidex-scale-plot::before,
.comfort-humidex-scale-plot::after {
  background: var(--divider-color);
  content: "";
  height: 2px;
  left: 0;
  position: absolute;
  right: 0;
}

.comfort-humidex-scale-plot::before { top: 25%; }
.comfort-humidex-scale-plot::after { top: 75%; }

.comfort-humidex-range-band {
  background: color-mix(in srgb, var(--success-color, #43a047) 10%, transparent);
  border-left: 1px solid color-mix(in srgb, var(--success-color, #43a047) 45%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--success-color, #43a047) 45%, transparent);
  bottom: 2px;
  left: var(--comfort-band-start);
  position: absolute;
  top: 2px;
  width: calc(var(--comfort-band-end) - var(--comfort-band-start));
}

.comfort-humidex-connector {
  border-top: 1px dashed color-mix(in srgb, var(--secondary-text-color) 65%, transparent);
  left: var(--comfort-connector-start);
  position: absolute;
  top: 50%;
  width: var(--comfort-connector-width);
}

.comfort-humidex-marker {
  border: 2px solid var(--card-background-color);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--divider-color);
  height: 8px;
  left: var(--comfort-air-position);
  position: absolute;
  top: 25%;
  transform: translate(-50%, -50%);
  width: 8px;
}

.comfort-humidex-marker.air.condition-cold { background: var(--info-color, #039be5); }
.comfort-humidex-marker.air.condition-comfortable { background: var(--success-color, #43a047); }
.comfort-humidex-marker.air.condition-hot { background: var(--error-color, #d93025); }
.comfort-humidex-marker.air.condition-neutral { background: var(--secondary-text-color); }

.comfort-humidex-marker.humidex {
  left: var(--comfort-humidex-position);
  top: 75%;
}

.comfort-humidex-marker.humidex.position-below { background: var(--info-color, #039be5); }
.comfort-humidex-marker.humidex.position-within { background: var(--success-color, #43a047); }
.comfort-humidex-marker.humidex.position-above { background: var(--warning-color, #f9ab00); }
.comfort-humidex-marker.humidex.position-neutral { background: var(--secondary-text-color); }

.comfort-humidex-scale-domain {
  color: var(--secondary-text-color);
  display: grid;
  font-size: 0.66rem;
  gap: 4px;
  grid-area: domain;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-width: 0;
}

.comfort-humidex-scale-domain span:nth-child(2) {
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comfort-humidex-scale-status {
  color: var(--secondary-text-color);
  font-size: 0.7rem;
  grid-area: status;
  line-height: 1.25;
  margin-top: 2px;
}

.comfort-humidex-scale-status.position-below { color: var(--info-color, #039be5); }
.comfort-humidex-scale-status.position-within { color: var(--success-color, #43a047); }
.comfort-humidex-scale-status.position-above { color: var(--warning-color, #b26a00); }

.comfort-derived-source {
  box-sizing: border-box;
  display: grid;
  gap: 8px;
  margin: 0;
  min-width: 0;
  padding: 0 10px 10px;
}

.comfort-derived-source-row {
  align-items: stretch;
  grid-template-columns: minmax(0, 1fr);
}

.comfort-map {
  display: grid;
  gap: 5px 8px;
  grid-template-columns: 64px minmax(0, 1fr);
  grid-template-rows: minmax(180px, 24vh) auto auto;
  min-width: 0;
}

.comfort-map-plot {
  background:
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--primary-color) 14%, transparent) 0%,
      transparent 42%,
      transparent 58%,
      color-mix(in srgb, var(--warning-color, #f9ab00) 14%, transparent) 100%
    ),
    linear-gradient(
      to right,
      color-mix(in srgb, var(--info-color, #039be5) 15%, transparent) 0%,
      transparent 42%,
      transparent 58%,
      color-mix(in srgb, var(--error-color, #d93025) 13%, transparent) 100%
    ),
    var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  min-height: 180px;
  overflow: hidden;
  position: relative;
}

.comfort-map-plot::before,
.comfort-map-plot::after {
  background: var(--divider-color);
  content: "";
  opacity: 0.65;
  pointer-events: none;
  position: absolute;
}

.comfort-map-plot::before {
  height: 1px;
  left: 0;
  right: 0;
  top: 50%;
}

.comfort-map-plot::after {
  bottom: 0;
  left: 50%;
  top: 0;
  width: 1px;
}

.comfort-map-zone {
  background: color-mix(in srgb, var(--success-color, #43a047) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--success-color, #43a047) 48%, var(--divider-color));
  border-radius: 5px;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--success-color, #43a047) 9%, transparent);
  position: absolute;
  z-index: 1;
}

.comfort-map-zone.simple {
  inset: 33.333%;
}

.comfort-map-zone.shaped {
  border-radius: 0;
  box-shadow: none;
  clip-path: var(--comfort-zone-polygon);
  filter: drop-shadow(
    0 0 1px color-mix(in srgb, var(--success-color, #43a047) 72%, var(--divider-color))
  );
  inset: 0;
}

.comfort-map-regions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  inset: 0;
  position: absolute;
}

.comfort-map-regions > span {
  border: 1px solid color-mix(in srgb, var(--divider-color) 34%, transparent);
}

.comfort-map-marker {
  height: 12px;
  left: var(--comfort-x);
  position: absolute;
  top: var(--comfort-y);
  width: 12px;
  z-index: 3;
}

.comfort-map-marker-dot {
  background: var(--card-background-color);
  border: 2px solid var(--primary-text-color);
  border-radius: 50%;
  box-shadow:
    0 0 0 2px var(--card-background-color),
    0 1px 5px rgba(0, 0, 0, 0.32);
  display: block;
  height: 12px;
  position: absolute;
  transform: translate(-50%, -50%);
  width: 12px;
}

.comfort-map-marker-dot::after,
.comfort-scale-marker::after,
.comfort-legend-current::after {
  background: var(--primary-color);
  border-radius: 50%;
  content: "";
  inset: 3px;
  position: absolute;
}

.comfort-map-marker-label {
  align-items: center;
  background: var(--card-background-color);
  border: 1px solid color-mix(in srgb, var(--primary-color) 45%, var(--divider-color));
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.16);
  color: var(--primary-text-color);
  display: flex;
  gap: 5px;
  left: 0;
  padding: 4px 6px;
  position: absolute;
  bottom: 20px;
  transform: translateX(-50%);
  white-space: nowrap;
  z-index: 2;
}

.comfort-map-marker-label::after {
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--card-background-color);
  content: "";
  left: 50%;
  position: absolute;
  top: 100%;
  transform: translateX(-50%);
}

.comfort-map-marker.label-below .comfort-map-marker-label {
  bottom: auto;
  top: 20px;
}

.comfort-map-marker.label-below .comfort-map-marker-label::after {
  border-bottom: 5px solid var(--card-background-color);
  border-top: 0;
  bottom: 100%;
  top: auto;
}

.comfort-map-marker.label-left .comfort-map-marker-label {
  transform: translateX(-8px);
}

.comfort-map-marker.label-left .comfort-map-marker-label::after {
  left: 8px;
}

.comfort-map-marker.label-right .comfort-map-marker-label {
  left: auto;
  right: 8px;
  transform: none;
}

.comfort-map-marker.label-right .comfort-map-marker-label::after {
  left: auto;
  right: 0;
}

.comfort-map-marker-label strong {
  font-size: 0.78rem;
}

.comfort-map-marker-label small {
  color: var(--secondary-text-color);
  font-size: 0.72rem;
}

.comfort-map-axis {
  color: var(--secondary-text-color);
  display: flex;
  font-size: 0.7rem;
  justify-content: space-between;
}

.comfort-map-axis-y {
  align-items: flex-end;
  flex-direction: column;
  grid-column: 1;
  grid-row: 1;
  text-align: right;
}

.comfort-map-axis-x {
  grid-column: 2;
  grid-row: 2;
}

.comfort-map-legend {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.7rem;
  gap: 5px 14px;
  grid-column: 2;
  grid-row: 3;
  justify-content: center;
  padding-top: 2px;
  text-align: center;
}

.comfort-map-legend > span {
  align-items: center;
  display: inline-flex;
  gap: 6px;
}

.comfort-legend-zone {
  background: color-mix(in srgb, var(--success-color, #43a047) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--success-color, #43a047) 48%, var(--divider-color));
  border-radius: 3px;
  box-sizing: border-box;
  display: inline-block;
  height: 10px;
  width: 14px;
}

.comfort-legend-current {
  background: var(--card-background-color);
  border: 2px solid var(--primary-text-color);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--card-background-color);
  box-sizing: border-box;
  display: inline-block;
  height: 12px;
  position: relative;
  width: 12px;
}

.comfort-range-scale,
.comfort-co2-scale {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 8px;
  padding: 12px;
}

.comfort-range-scale header,
.comfort-co2-scale header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.comfort-range-scale header span,
.comfort-co2-scale header span {
  color: var(--secondary-text-color);
  font-size: 0.78rem;
  font-weight: 700;
}

.comfort-scale-track,
.comfort-co2-track {
  border-radius: 999px;
  height: 10px;
  position: relative;
}

.comfort-range-scale.metric-temperature .comfort-scale-track {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--info-color, #039be5) 72%, var(--divider-color)) 0%,
    color-mix(in srgb, var(--info-color, #039be5) 72%, var(--divider-color)) 30%,
    var(--success-color, #43a047) 36%,
    var(--success-color, #43a047) 64%,
    color-mix(in srgb, var(--error-color, #d93025) 66%, var(--divider-color)) 70%,
    color-mix(in srgb, var(--error-color, #d93025) 66%, var(--divider-color)) 100%
  );
}

.comfort-range-scale.metric-humidity .comfort-scale-track {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--warning-color, #f9ab00) 74%, var(--divider-color)) 0%,
    color-mix(in srgb, var(--warning-color, #f9ab00) 74%, var(--divider-color)) 30%,
    var(--success-color, #43a047) 36%,
    var(--success-color, #43a047) 64%,
    color-mix(in srgb, var(--primary-color) 62%, var(--divider-color)) 70%,
    color-mix(in srgb, var(--primary-color) 62%, var(--divider-color)) 100%
  );
}

.comfort-scale-marker {
  background: var(--card-background-color);
  border: 2px solid var(--primary-text-color);
  border-radius: 50%;
  box-shadow:
    0 0 0 2px var(--card-background-color),
    0 1px 4px rgba(0, 0, 0, 0.35);
  height: 14px;
  left: var(--comfort-position);
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  z-index: 2;
}

.comfort-range-limits,
.comfort-co2-scale footer {
  color: var(--secondary-text-color);
  font-size: 0.7rem;
}

.comfort-range-limits {
  min-height: 1em;
  position: relative;
}

.comfort-range-limits span {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

.comfort-range-limits span:first-child {
  left: 33.333%;
}

.comfort-range-limits span:last-child {
  left: 66.666%;
}

.comfort-co2-scale footer {
  display: flex;
  justify-content: space-between;
}

.comfort-co2-track {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--success-color, #43a047) 70%, var(--divider-color)) 0%,
    color-mix(in srgb, var(--success-color, #43a047) 70%, var(--divider-color)) calc(var(--comfort-attention) - 3%),
    var(--warning-color, #f9ab00) calc(var(--comfort-attention) + 3%),
    var(--warning-color, #f9ab00) calc(var(--comfort-poor) - 3%),
    var(--error-color, #d93025) calc(var(--comfort-poor) + 3%),
    var(--error-color, #d93025) 100%
  );
  overflow: visible;
}

.comfort-no-readings {
  align-items: center;
  background: var(--card-background-color);
  border: 1px dashed var(--divider-color);
  border-radius: 8px;
  color: var(--secondary-text-color);
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 12px;
}

.comfort-range-scale.unclassified {
  gap: 0;
}

.comfort-map-legend .comfort-effective-range {
  flex-basis: 100%;
  justify-content: center;
}

.comfort-no-readings ha-icon {
  --mdc-icon-size: 20px;
}

.comfort-config-section h3 {
  align-items: center;
  display: flex;
  font-size: 13px;
  gap: 6px;
  margin: 0 0 10px;
}

.comfort-config-section h3 ha-icon {
  color: var(--primary-color);
}

.comfort-config-subheading {
  color: var(--secondary-text-color);
  font-size: 12px;
  font-weight: 600;
  margin: 0 0 6px;
}

.comfort-config-rows {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.comfort-config-row {
  align-items: start;
  display: grid;
  gap: 6px;
  min-width: 0;
}

.comfort-config-label {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  font-size: 12px;
  font-weight: 700;
  gap: 5px;
}

.comfort-selected-entity {
  color: var(--secondary-text-color);
  display: block;
  min-height: 1.15rem;
  margin-top: 3px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  padding-left: 1px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comfort-select-wrap {
  display: grid;
  min-width: 0;
}

.comfort-select-wrap::after,
.comfort-select-wrap:has(select:open)::after {
  display: none;
}

.comfort-select-control {
  display: block;
  min-width: 0;
  position: relative;
}

.comfort-select-control select {
  width: 100%;
}

.comfort-select-control::after {
  border: solid var(--secondary-text-color);
  border-radius: 1px;
  border-width: 0 2px 2px 0;
  content: "";
  height: 7px;
  pointer-events: none;
  position: absolute;
  right: 11px;
  top: 50%;
  transform: translateY(-62%) rotate(45deg);
  transition: transform 120ms ease;
  width: 7px;
}

.comfort-select-control:has(select:open)::after {
  transform: translateY(-28%) rotate(225deg);
}

.comfort-number-pair,
.comfort-number-single {
  align-items: center;
  display: flex;
  gap: 6px;
}

.comfort-number-pair {
  align-items: end;
}

.comfort-number-separator {
  align-items: center;
  align-self: end;
  color: var(--secondary-text-color);
  display: inline-flex;
  height: 34px;
  justify-content: center;
}

.comfort-number-field {
  display: grid;
  gap: 3px;
}

.comfort-number-field small,
.comfort-number-unit,
.comfort-number-single-unit {
  color: var(--secondary-text-color);
  font-size: 12px;
  font-weight: 700;
}

.comfort-number-unit,
.comfort-number-single-unit {
  align-items: center;
  align-self: end;
  display: inline-flex;
  min-height: 34px;
}

.comfort-number-pair input,
.comfort-number-single input {
  min-width: 0;
  width: 76px;
}

.comfort-number-single .comfort-number-field {
  flex: 0 0 auto;
}

.comfort-model-row,
.comfort-temperature-aware-ranges {
  grid-column: 1 / -1;
}

.comfort-model-row .comfort-select-wrap > small {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.35;
  margin-top: 4px;
}

.comfort-model-requirement {
  color: var(--warning-color, #b26a00) !important;
}

.comfort-guided-reference {
  align-items: center;
  align-self: end;
  color: var(--secondary-text-color);
  display: grid;
  font-size: 12px;
  gap: 7px;
  grid-column: 1 / -1;
  grid-template-columns: 18px minmax(0, 1fr);
  line-height: 1.35;
  margin: 0;
}

.comfort-guided-reference ha-icon {
  --mdc-icon-size: 18px;
  color: var(--primary-color);
}

.comfort-data-sources-config-section .comfort-config-rows,
.comfort-preferences-config-section .comfort-config-rows {
  align-items: start;
}

.comfort-freshness-config-section .comfort-number-field-single small {
  display: none;
}

.comfort-temperature-aware-ranges {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.comfort-temperature-aware-range {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  margin: 0;
  min-width: 0;
  padding: 9px 10px 10px;
}

.comfort-temperature-aware-range-heading {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  font-size: 12px;
  font-weight: 600;
  gap: 8px;
  justify-content: space-between;
  line-height: 1.3;
  margin: 0 0 8px;
  min-width: 0;
}

.comfort-temperature-aware-range-heading strong {
  color: var(--primary-text-color);
  font-size: 13px;
  white-space: nowrap;
}

.comfort-temperature-aware-fields {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.comfort-temperature-aware-field {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.comfort-temperature-aware-field > small {
  color: var(--secondary-text-color);
  font-size: 12px;
  font-weight: 700;
}

.comfort-number-with-unit {
  align-items: center;
  display: grid;
  gap: 6px;
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
}

.comfort-number-with-unit input {
  min-width: 0;
  width: 100%;
}

.comfort-number-with-unit > span {
  color: var(--secondary-text-color);
  font-size: 12px;
  font-weight: 700;
}

@media (min-width: 681px) {
  .comfort-preferences-config-section .comfort-threshold-row {
    grid-template-rows: minmax(32px, auto) auto;
  }

  .comfort-metric-config-section .comfort-config-rows {
    align-items: start;
    column-gap: 24px;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
    row-gap: 8px;
  }

  .comfort-metric-config-section .comfort-number-pair {
    align-items: center;
    flex-wrap: wrap;
    min-height: 34px;
    min-width: 0;
  }

  .comfort-metric-config-section .comfort-number-field {
    align-items: center;
    display: flex;
    gap: 6px;
    min-width: 0;
  }

  .comfort-metric-config-section .comfort-number-field small {
    flex: 0 0 auto;
  }

  .comfort-metric-config-section .comfort-number-separator,
  .comfort-metric-config-section .comfort-number-unit {
    align-self: center;
  }
}

@media (max-width: 680px) {
  .comfort-outdoor-grid,
  .comfort-outdoor-config-rows {
    grid-template-columns: minmax(0, 1fr);
  }

  .comfort-zone-heading {
    align-items: center;
    gap: 6px 8px;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .comfort-zone-toggle {
    align-items: center;
    grid-column: 1 / 2;
    grid-row: 1;
  }

  .comfort-zone-identity {
    align-self: center;
  }

  .comfort-zone-actions {
    display: contents;
  }

  .comfort-zone-actions ha-switch {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
  }

  .comfort-assessment-summary {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: start;
    min-width: 0;
    padding-inline-start: 28px;
  }

  .comfort-assessment-line {
    gap: 4px;
    justify-content: flex-start;
    min-width: 0;
  }

  .comfort-air-pill,
  .comfort-humidex-pill,
  .comfort-condition-pill {
    max-width: min(100%, 220px);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .comfort-map {
    grid-template-columns: 58px minmax(0, 1fr);
    grid-template-rows: 180px auto auto;
  }

  .comfort-config-rows {
    grid-template-columns: 1fr;
  }

  .comfort-derived-config-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .comfort-derived-visual-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .comfort-temperature-aware-ranges {
    grid-template-columns: minmax(0, 1fr);
  }

  .comfort-config-row,
  .comfort-number-pair,
  .comfort-number-single {
    width: 100%;
  }

  .comfort-number-field {
    flex: 1 1 0;
  }

  .comfort-number-pair input,
  .comfort-number-single input {
    width: 100%;
  }
}
`;
