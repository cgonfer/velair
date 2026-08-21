import { css } from "lit";

export const sensorsStyles = css`
.sensors-view {
  display: grid;
  gap: 12px;
  max-width: 100%;
  min-width: 0;
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
  grid-template-columns: minmax(0, 1fr) minmax(180px, 260px);
  padding: 12px;
}

.sensor-config-row:first-child {
  border-top: 0;
}

.sensor-config-row.inactive {
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

.sensor-help {
  align-items: center;
  color: var(--secondary-text-color);
  cursor: help;
  display: inline-flex;
  flex: 0 0 auto;
  outline: none;
  position: relative;
}

.sensor-help ha-icon {
  --mdc-icon-size: 15px;
}

.sensor-help-tooltip {
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

.sensor-help:hover .sensor-help-tooltip,
.sensor-help:focus .sensor-help-tooltip,
.sensor-help:focus-visible .sensor-help-tooltip {
  opacity: 1;
  visibility: visible;
}

.sensor-status-card {
  display: grid;
  gap: 12px;
  padding: 12px;
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

.sensor-block-summary {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sensor-block-detail {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 7px;
  color: var(--secondary-text-color);
  display: grid;
  font-size: 12px;
  gap: 7px;
  grid-template-columns: 18px minmax(0, 1fr);
  line-height: 1.3;
  min-width: 0;
  padding: 8px 9px;
}

.sensor-block-detail ha-icon {
  --mdc-icon-size: 17px;
  color: var(--secondary-text-color);
}

.sensor-block-detail.emphasis {
  border-color: color-mix(in srgb, var(--primary-color) 35%, var(--divider-color));
  color: var(--primary-text-color);
}

.sensor-block-detail.emphasis ha-icon {
  color: var(--primary-color);
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

.sensor-temperature-scale {
  --sensor-scale-applied-color: color-mix(
    in srgb,
    var(--primary-color) 68%,
    var(--secondary-text-color)
  );
  --sensor-scale-room-color: color-mix(
    in srgb,
    var(--success-color, #43a047) 68%,
    var(--secondary-text-color)
  );
  --sensor-scale-scheduled-color: color-mix(
    in srgb,
    var(--error-color, #d93025) 68%,
    var(--secondary-text-color)
  );
  --sensor-scale-line-end: var(--sensor-scale-applied-color);
  --sensor-scale-line-start: color-mix(in srgb, var(--secondary-text-color) 22%, transparent);
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  box-sizing: border-box;
  display: grid;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 12px 12px 10px;
  width: 100%;
}

.sensor-temperature-scale.mode-heat {
  --sensor-scale-line-end: var(--sensor-scale-scheduled-color);
}

.sensor-limit-warning {
  align-items: start;
  background: color-mix(in srgb, var(--warning-color, #f9a825) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning-color, #f9a825) 42%, var(--divider-color));
  border-radius: 8px;
  display: grid;
  gap: 9px;
  grid-template-columns: 20px minmax(0, 1fr);
  padding: 10px 11px;
}

.sensor-limit-warning ha-icon {
  --mdc-icon-size: 19px;
  color: var(--warning-color, #f9a825);
  margin-top: 1px;
}

.sensor-limit-warning span {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.sensor-config-label-stacked {
  align-items: start;
  display: grid;
  gap: 3px;
}

.sensor-config-help-text {
  color: var(--secondary-text-color);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.sensor-limit-warning strong {
  color: var(--primary-text-color);
  font-size: 13px;
  line-height: 1.3;
}

.sensor-limit-warning small {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.sensor-safety-info {
  align-items: start;
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary-color) 30%, var(--divider-color));
  border-radius: 8px;
  display: grid;
  gap: 9px;
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 0;
  padding: 10px 11px;
}

.sensor-safety-info ha-icon {
  --mdc-icon-size: 19px;
  color: var(--primary-color);
  margin-top: 1px;
}

.sensor-safety-info span {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.sensor-safety-info strong {
  color: var(--primary-text-color);
  font-size: 13px;
  line-height: 1.3;
}

.sensor-safety-info small {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.sensor-temperature-scale.mode-heat-cool {
  --sensor-scale-line-end: var(--sensor-scale-applied-color);
  --sensor-scale-line-start: color-mix(
    in srgb,
    var(--sensor-scale-scheduled-color) 62%,
    transparent
  );
}

.sensor-scale-track {
  min-height: 136px;
  min-width: 640px;
  position: relative;
}

.sensor-temperature-scale.has-range .sensor-scale-track {
  min-height: 204px;
}

.sensor-scale-line {
  background: linear-gradient(
    90deg,
    var(--sensor-scale-line-start),
    color-mix(in srgb, var(--sensor-scale-line-end) 38%, transparent)
  );
  border-radius: 999px;
  display: block;
  height: 6px;
  left: 0;
  position: absolute;
  right: 0;
  top: 66px;
  z-index: 1;
}

.sensor-scale-deadband-zone {
  background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
  background-image: repeating-linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary-color) 30%, transparent) 0,
    color-mix(in srgb, var(--primary-color) 30%, transparent) 1px,
    transparent 1px,
    transparent 6px
  );
  border-block: 1px solid color-mix(in srgb, var(--primary-color) 28%, transparent);
  box-sizing: border-box;
  display: block;
  height: 20px;
  pointer-events: none;
  position: absolute;
  top: 59px;
  z-index: 0;
}

.sensor-scale-relation {
  display: block;
  height: 0;
  min-width: 18px;
  position: absolute;
}

.sensor-scale-room-gap {
  border-top: 2px solid color-mix(in srgb, var(--secondary-text-color) 46%, transparent);
  top: 83px;
}

.sensor-scale-assist-offset {
  top: 108px;
}

.sensor-temperature-scale.has-range .sensor-scale-room-gap {
  top: 150px;
}

.sensor-temperature-scale.has-range .sensor-scale-assist-offset {
  top: 178px;
}

.sensor-scale-assist-offset.assist-offset-active {
  border-top: 3px dashed color-mix(
    in srgb,
    var(--sensor-scale-room-color) 74%,
    transparent
  );
}

.sensor-scale-assist-offset.assist-offset-holding {
  border-top: 2px dotted color-mix(in srgb, var(--secondary-text-color) 62%, transparent);
}

.sensor-scale-assist-offset.assist-offset-unknown {
  border-top: 2px dashed color-mix(in srgb, var(--secondary-text-color) 42%, transparent);
}

.sensor-scale-relation span {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  color: var(--primary-text-color);
  font-size: 10px;
  font-weight: 700;
  left: 50%;
  line-height: 1;
  padding: 3px 6px;
  position: absolute;
  top: 6px;
  transform: translateX(-50%);
  white-space: nowrap;
}

.sensor-scale-room-gap span {
  color: var(--secondary-text-color);
}

.sensor-scale-assist-offset.assist-offset-active span {
  border-color: color-mix(
    in srgb,
    var(--sensor-scale-room-color) 38%,
    var(--divider-color)
  );
  color: var(--sensor-scale-room-color);
}

.sensor-scale-assist-offset.assist-offset-holding span,
.sensor-scale-assist-offset.assist-offset-unknown span {
  color: var(--secondary-text-color);
}

.sensor-scale-marker {
  display: block;
  height: 0;
  position: absolute;
  top: 69px;
  transform: translateX(-50%);
  width: 0;
  z-index: 1;
}

.sensor-scale-range-band {
  color: var(--secondary-text-color);
  display: block;
  height: 0;
  min-width: 2px;
  position: absolute;
  z-index: 2;
}

.sensor-scale-range-band.range-band-scheduled {
  color: var(--sensor-scale-scheduled-color);
  top: 92px;
}

.sensor-scale-range-band.range-band-applied {
  color: var(--sensor-scale-applied-color);
  top: 122px;
}

.sensor-scale-range-bracket {
  border-top: 2px solid currentColor;
  display: block;
  height: 0;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.sensor-scale-range-bracket::before,
.sensor-scale-range-bracket::after {
  border-left: 2px solid currentColor;
  content: "";
  height: 8px;
  position: absolute;
  top: -4px;
}

.sensor-scale-range-bracket::before {
  left: 0;
}

.sensor-scale-range-bracket::after {
  right: 0;
}

.sensor-scale-range-label {
  align-items: baseline;
  background: var(--secondary-background-color);
  border: 1px solid color-mix(in srgb, currentColor 42%, var(--divider-color));
  border-radius: 999px;
  color: currentColor;
  display: inline-flex;
  gap: 5px;
  left: 50%;
  line-height: 1;
  max-width: 190px;
  min-width: max-content;
  padding: 3px 7px;
  position: absolute;
  top: 6px;
  transform: translateX(-50%);
  white-space: nowrap;
}

.sensor-scale-range-label small {
  color: var(--secondary-text-color);
  font-size: 10px;
}

.sensor-scale-range-label strong {
  color: currentColor;
  font-size: 11px;
  font-weight: 700;
}

.sensor-scale-callout-marker {
  --callout-left: 50%;
  display: block;
  height: 0;
  left: clamp(72px, var(--callout-left), calc(100% - 72px));
  position: absolute;
  top: 69px;
  width: 0;
  z-index: 2;
}

.sensor-scale-callout {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-left: 3px solid var(--secondary-text-color);
  border-radius: 6px;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  bottom: 18px;
  display: grid;
  gap: 1px;
  left: 0;
  max-width: 144px;
  min-width: 96px;
  padding: 5px 7px 5px 6px;
  pointer-events: auto;
  position: absolute;
  text-align: left;
  transform: translateX(-50%);
}

.sensor-scale-callout::after {
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid var(--card-background-color);
  bottom: -6px;
  content: "";
  height: 0;
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
  width: 0;
}

.sensor-scale-callout-marker.shifted .sensor-scale-callout::after {
  display: none;
}

.sensor-scale-callout small,
.sensor-scale-callout strong,
.sensor-scale-bounds span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sensor-scale-callout small {
  color: var(--secondary-text-color);
  font-size: 10px;
  line-height: 1.15;
}

.sensor-scale-callout strong {
  color: var(--primary-text-color);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.15;
}

.sensor-scale-value-row {
  align-items: center;
  display: inline-flex;
  gap: 5px;
  min-width: 0;
  overflow: visible;
  white-space: nowrap;
}

.sensor-scale-callout.has-offset {
  width: max-content;
}

.sensor-scale-callout.has-offset .sensor-scale-value-row > strong {
  overflow: visible;
  text-overflow: clip;
}

.sensor-scale-offset {
  align-items: center;
  color: var(--sensor-scale-applied-color);
  display: inline-flex;
  font-size: 10px;
  font-weight: 700;
  gap: 3px;
  line-height: 1.1;
  min-width: 0;
  overflow: visible;
  white-space: nowrap;
}

.sensor-scale-offset-help {
  align-items: center;
  color: var(--secondary-text-color);
  cursor: help;
  display: inline-flex;
  flex: 0 0 auto;
  outline: none;
  overflow: visible;
  position: relative;
}

.sensor-scale-offset-help ha-icon {
  --mdc-icon-size: 12px;
  height: 12px;
  width: 12px;
}

.sensor-scale-offset-tooltip {
  background: var(--primary-text-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
  color: var(--primary-background-color);
  font-size: 11px;
  font-weight: 400;
  left: 50%;
  line-height: 1.35;
  max-width: min(220px, calc(100vw - 40px));
  opacity: 0;
  padding: 7px 8px;
  pointer-events: none;
  position: absolute;
  top: calc(100% + 6px);
  transform: translateX(-50%);
  transition: opacity 120ms ease, visibility 120ms ease;
  visibility: hidden;
  white-space: normal;
  width: max-content;
  z-index: 30;
}

.sensor-scale-callout-marker.edge-left .sensor-scale-offset-tooltip {
  left: 0;
  transform: none;
}

.sensor-scale-callout-marker.edge-right .sensor-scale-offset-tooltip {
  left: auto;
  right: 0;
  transform: none;
}

.sensor-scale-offset-help:hover .sensor-scale-offset-tooltip,
.sensor-scale-offset-help:focus .sensor-scale-offset-tooltip,
.sensor-scale-offset-help:focus-visible .sensor-scale-offset-tooltip {
  opacity: 1;
  visibility: visible;
}

.sensor-scale-dot {
  background: var(--card-background-color);
  border: 3px solid var(--secondary-text-color);
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--card-background-color);
  height: 12px;
  left: 0;
  position: absolute;
  top: 0;
  transform: translate(-50%, -50%);
  width: 12px;
}

.sensor-scale-marker.marker-target .sensor-scale-dot {
  background: var(--sensor-scale-scheduled-color);
  border-color: var(--sensor-scale-scheduled-color);
  height: 14px;
  width: 14px;
}

.sensor-scale-callout-marker.marker-target .sensor-scale-callout {
  border-left-color: var(--sensor-scale-scheduled-color);
}

.sensor-scale-marker.marker-room .sensor-scale-dot {
  border-color: var(--sensor-scale-room-color);
}

.sensor-scale-callout-marker.marker-room .sensor-scale-callout {
  border-left-color: var(--sensor-scale-room-color);
}

.sensor-scale-marker.marker-climateTarget .sensor-scale-dot {
  border-color: var(--sensor-scale-applied-color);
}

.sensor-scale-callout-marker.marker-climateTarget .sensor-scale-callout {
  border-left-color: var(--sensor-scale-applied-color);
}

.sensor-scale-marker.marker-climate .sensor-scale-dot {
  border-color: var(--secondary-text-color);
}

.sensor-scale-marker .sensor-scale-dot.segmented {
  background: var(--sensor-scale-dot-segments, var(--secondary-text-color));
  border: 0;
  height: 16px;
  width: 16px;
}

.sensor-scale-marker .sensor-scale-dot.segmented::after {
  background: var(--card-background-color);
  border-radius: 50%;
  content: "";
  inset: 4px;
  position: absolute;
}

.sensor-scale-callout-marker.marker-climate .sensor-scale-callout {
  border-left-color: var(--secondary-text-color);
}

.sensor-scale-bounds {
  color: var(--secondary-text-color);
  font-size: 11px;
}

.sensor-scale-bounds {
  display: flex;
  justify-content: space-between;
  min-width: 640px;
}

.sensor-scale-deadband-legend-track {
  height: 15px;
  min-width: 640px;
}

.sensor-scale-deadband-legend-range {
  clip-path: inset(0);
  container-type: inline-size;
  display: flex;
  height: 15px;
  justify-content: center;
}

.sensor-scale-deadband-legend-anchor {
  display: flex;
  flex: 0 0 max-content;
  height: 15px;
  left: 0;
  position: sticky;
  right: 0;
  width: max-content;
}

.sensor-scale-deadband-legend {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  flex: 0 0 max-content;
  font-size: 11px;
  gap: 6px;
  line-height: 1.3;
  width: fit-content;
}

.sensor-scale-deadband-legend:not(.is-zero) {
  gap: 0;
  white-space: nowrap;
}

.sensor-scale-deadband-legend:not(.is-zero) .sensor-scale-deadband-swatch,
.sensor-scale-deadband-label-brief,
.sensor-scale-deadband-label-compact,
.sensor-scale-deadband-label-full {
  display: none;
}

.sensor-scale-deadband-label-short {
  display: inline;
}

@container (min-width: 54px) {
  .sensor-scale-deadband-label-short {
    display: none;
  }

  .sensor-scale-deadband-label-brief {
    display: inline;
    font-size: 9px;
    letter-spacing: -0.15px;
  }
}

@container (min-width: 112px) {
  .sensor-scale-deadband-label-brief {
    display: none;
  }

  .sensor-scale-deadband-label-compact {
    display: inline;
  }
}

@container (min-width: 220px) {
  .sensor-scale-deadband-legend:not(.is-zero) {
    gap: 6px;
  }

  .sensor-scale-deadband-legend:not(.is-zero) .sensor-scale-deadband-swatch,
  .sensor-scale-deadband-label-full {
    display: inline;
  }

  .sensor-scale-deadband-label-compact,
  .sensor-scale-deadband-label-brief {
    display: none;
  }
}

.sensor-scale-deadband-swatch {
  background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
  background-image: repeating-linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary-color) 42%, transparent) 0,
    color-mix(in srgb, var(--primary-color) 42%, transparent) 1px,
    transparent 1px,
    transparent 4px
  );
  border-block: 1px solid color-mix(in srgb, var(--primary-color) 34%, transparent);
  box-sizing: border-box;
  flex: 0 0 22px;
  height: 10px;
}

.sensor-scale-deadband-legend.is-zero .sensor-scale-deadband-swatch {
  background: none;
  border-bottom: 0;
  border-top-color: var(--secondary-text-color);
  height: 1px;
  opacity: 0.55;
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

  .sensor-config-row {
    align-items: stretch;
    grid-template-columns: minmax(0, 1fr);
  }

  .sensor-config-label {
    box-sizing: border-box;
    position: relative;
    width: 100%;
  }

  .sensor-config-label .sensor-help {
    position: static;
  }

  .sensor-config-label .sensor-help-tooltip {
    left: 0;
    max-width: 100%;
    right: 0;
    transform: none;
    width: auto;
  }

  .sensor-block-summary {
    grid-template-columns: minmax(0, 1fr);
  }

}
`;
