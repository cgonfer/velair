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

.comfort-data-warning {
  align-items: center;
  color: var(--warning-color, #b26a00);
  cursor: help;
  display: inline-flex;
  position: relative;
}

.comfort-data-warning ha-icon {
  --mdc-icon-size: 17px;
}

.comfort-data-warning:hover .comfort-help-tooltip,
.comfort-data-warning:focus .comfort-help-tooltip,
.comfort-data-warning:focus-visible .comfort-help-tooltip {
  display: block;
}

.comfort-data-warning .comfort-help-tooltip {
  left: auto;
  max-width: min(260px, calc(100vw - 32px));
  overflow-wrap: anywhere;
  right: 0;
  text-align: left;
  transform: none;
  white-space: normal;
}

.comfort-visuals {
  display: grid;
  gap: 12px;
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
  inset: 33.333%;
  position: absolute;
  z-index: 1;
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
  min-height: 96px;
  padding: 12px;
}

.comfort-no-readings ha-icon {
  --mdc-icon-size: 20px;
}

.comfort-config-section h3 {
  align-items: center;
  display: flex;
  font-size: 0.9rem;
  gap: 6px;
  margin: 0 0 10px;
}

.comfort-config-section h3 ha-icon {
  color: var(--primary-color);
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
  font-size: 0.78rem;
  font-weight: 700;
  gap: 5px;
}

.comfort-help {
  align-items: center;
  cursor: help;
  display: inline-flex;
  position: relative;
}

.comfort-help ha-icon {
  --mdc-icon-size: 16px;
}

.comfort-help-tooltip {
  background: var(--primary-text-color);
  border-radius: 6px;
  bottom: calc(100% + 8px);
  box-sizing: border-box;
  color: var(--card-background-color);
  display: none;
  font-size: 0.76rem;
  font-weight: 500;
  left: auto;
  line-height: 1.35;
  max-width: min(260px, calc(100vw - 32px));
  overflow-wrap: anywhere;
  padding: 7px 9px;
  position: absolute;
  right: 0;
  text-align: left;
  transform: none;
  white-space: normal;
  width: max-content;
  z-index: 20;
}

.comfort-help:hover .comfort-help-tooltip,
.comfort-help:focus .comfort-help-tooltip,
.comfort-help:focus-visible .comfort-help-tooltip {
  display: block;
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
  font-size: 0.78rem;
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

@media (min-width: 681px) {
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
  .comfort-zone-heading {
    align-items: center;
  }

  .comfort-assessment-heading {
    display: grid;
  }

  .comfort-zone-actions {
    gap: 5px;
  }

  .comfort-assessment-line {
    gap: 4px;
  }

  .comfort-air-pill,
  .comfort-condition-pill {
    max-width: 130px;
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

  .comfort-config-row,
  .comfort-number-pair,
  .comfort-number-single {
    width: 100%;
  }

  .comfort-config-label {
    box-sizing: border-box;
    position: relative;
    width: 100%;
  }

  .comfort-config-label .comfort-help {
    position: static;
  }

  .comfort-config-label .comfort-help-tooltip {
    bottom: auto;
    left: 0;
    max-width: 100%;
    right: 0;
    top: calc(100% + 6px);
    width: auto;
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
