import { css } from "lit";

export const templateStyles = css`
.templates-view {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.template-intro {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 24px minmax(0, 1fr);
  padding: 2px 4px 4px;
}

.template-intro > ha-icon {
  --mdc-icon-size: 22px;
  color: var(--primary-color);
}

.template-intro > span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.template-intro strong {
  color: var(--primary-text-color);
  font-size: 14px;
  line-height: 1.25;
}

.template-intro small {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.35;
}

.template-library {
  display: grid;
  gap: 12px;
  margin-top: 0;
  min-width: 0;
}

.template-detail-heading {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-width: 0;
}

.template-name-field {
  min-width: 0;
}

.template-item strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-library-layout {
  align-items: start;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(220px, 0.85fr) minmax(0, 1.65fr);
  min-width: 0;
}

.template-list-wrap,
.template-detail {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  min-width: 0;
  padding: 12px;
}

.template-list-wrap {
  min-height: 0;
  position: relative;
}

.template-list-heading {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  margin-bottom: 10px;
  min-width: 0;
}

.template-list-heading strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-list-heading .section-heading {
  flex: 1 1 auto;
}

.template-list-heading .icon-button {
  height: 34px;
  margin-right: 14px;
  width: 34px;
}

.template-list,
.template-block-list {
  display: grid;
  gap: 8px;
}

.template-item {
  align-items: center;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  color: var(--primary-text-color);
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) 40px;
  min-width: 0;
  padding: 8px;
}

.template-item-main {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 2px;
  text-align: left;
}

.template-item-main span,
.template-block small {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.template-item .icon-button.danger.template-item-delete {
  background: transparent;
  border-color: transparent;
  color: var(--error-color, #c62828);
  height: 34px;
  width: 34px;
}

.template-item .icon-button.danger.template-item-delete:hover {
  background: color-mix(in srgb, var(--error-color, #c62828) 10%, transparent);
  border-color: transparent;
  color: var(--error-color, #c62828);
}

.template-item.active {
  background: color-mix(in srgb, var(--primary-color) 14%, var(--card-background-color));
  border-color: color-mix(in srgb, var(--primary-color) 50%, var(--divider-color));
}

.template-detail {
  align-content: start;
  align-self: start;
  display: grid;
  gap: 12px;
}

.template-placeholder.compact {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px dashed var(--divider-color);
  border-radius: 8px;
  color: var(--secondary-text-color);
  display: grid;
  font-size: 14px;
  font-weight: 600;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  line-height: 1.35;
  min-height: 64px;
  min-width: 0;
  padding: 12px 56px;
  position: relative;
  text-align: center;
}

.template-placeholder.compact span {
  min-width: 0;
}

.template-placeholder.compact > .icon-button {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.template-editor {
  margin-top: 0;
}

.template-editor .editor-actions {
  grid-template-columns: repeat(2, minmax(0, 180px));
  justify-content: end;
}

.template-detail-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  justify-content: flex-end;
  margin-right: 14px;
}

.template-apply-button {
  width: auto;
}

.template-name-field {
  display: block;
  width: 100%;
}

.template-name-input-wrap {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: 20px minmax(0, 1fr);
  min-width: 0;
}

.template-name-input-wrap ha-icon {
  --mdc-icon-size: 18px;
  color: var(--secondary-text-color);
}

.template-apply-panel {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
  padding: 10px;
}

.template-apply-scroll-wrap {
  min-width: 0;
  overflow: auto;
  padding-bottom: 8px;
  position: relative;
  scrollbar-gutter: stable;
}

.template-apply-grid {
  display: grid;
  grid-template-columns: minmax(104px, 148px) repeat(7, minmax(62px, 1fr));
  min-width: 548px;
}

.template-apply-cell {
  align-items: center;
  border-bottom: 1px solid var(--divider-color);
  border-right: 1px solid var(--divider-color);
  display: flex;
  justify-content: center;
  min-height: 42px;
  padding: 6px 8px;
}

.template-apply-cell.header {
  background: var(--secondary-background-color);
  color: var(--secondary-text-color);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.template-apply-zone {
  background: var(--card-background-color);
  justify-content: flex-start;
  left: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  position: sticky;
  white-space: normal;
  z-index: 3;
}

.template-apply-zone.header {
  z-index: 5;
}

.template-apply-day {
  cursor: pointer;
}

.template-apply-day input {
  height: 18px;
  margin: 0;
  width: 18px;
}

.template-block {
  align-items: center;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  grid-template-columns: 72px minmax(0, 1fr);
  padding: 10px;
}

.template-block span,
.template-block small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-application { padding: 16px; gap: 16px; container: template-application / inline-size; }
.template-application ha-icon { --mdc-icon-size: 18px; flex: 0 0 auto; }
.application-heading { flex-wrap: wrap; gap: 12px; }
.application-heading strong, .application-group-heading strong { display: flex; align-items: center; gap: 10px; min-width: 0; overflow-wrap: anywhere; }
.application-heading strong > ha-icon { color: var(--primary-color); }
.application-count, .application-days { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--divider-color); border-radius: 16px; padding: 5px 10px; font-size: 12px; line-height: 1.4; background: var(--secondary-background-color); color: var(--secondary-text-color); overflow-wrap: anywhere; }
.template-application-controls { border: 0; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; min-width: 0; }
.template-application-controls label { display: grid; align-content: start; gap: 6px; min-width: 0; }
.template-application-controls .label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color); }
.template-application-controls .select-wrap { margin: 0; min-width: 0; }
.template-application-controls select { min-width: 0; width: 100%; box-sizing: border-box; padding: 10px 32px 10px 12px; min-height: 44px; }
.application-method-help, .application-layout-change, .application-notice { display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; overflow-wrap: anywhere; }
.application-method-help { font-size: 13px; }
.application-method-help ha-icon, .application-layout-change ha-icon { color: var(--primary-color); }
/* Keep day columns aligned at every width; only the table scrolls. */
.template-application-targets { min-width: 0; max-width: 100%; border: 1px solid var(--divider-color); border-radius: 10px; overflow-x: auto; }
.template-application-targets:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
.template-application-table { width: 100%; min-width: calc(180px + var(--application-columns) * 52px); table-layout: fixed; border-collapse: separate; border-spacing: 0; }
.template-application-table .application-zone-column { width: 180px; }
.template-application-table th, .template-application-table td { box-sizing: border-box; vertical-align: middle; }
.template-application-group-head th { background: var(--secondary-background-color); border-bottom: 1px solid var(--divider-color); font-size: 12px; font-weight: 600; color: var(--secondary-text-color); text-align: center; padding: 12px 4px; overflow-wrap: anywhere; }
.template-application-group-head th:not(:first-child) { padding: 4px; }
.application-column-toggle { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 44px; padding: 6px 2px; border: 0; border-radius: 6px; background: transparent; color: var(--primary-color); font: inherit; overflow-wrap: anywhere; cursor: pointer; }
.application-column-toggle:hover:not(:disabled), .application-column-toggle[aria-pressed="mixed"] { background: color-mix(in srgb, var(--primary-color) 8%, transparent); }
.application-column-toggle[aria-pressed="true"] { background: color-mix(in srgb, var(--primary-color) 16%, transparent); box-shadow: inset 0 -2px var(--primary-color); }
.application-column-toggle:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
.application-column-toggle:disabled { color: var(--disabled-text-color); cursor: default; }
.template-application-table th:first-child { position: sticky; left: 0; z-index: 1; text-align: start; padding: 10px 12px; border-inline-end: 1px solid var(--divider-color); }
.template-application-target th { background: var(--card-background-color); }
.template-application-target + .template-application-target > * { border-top: 1px solid var(--divider-color); }
.template-application-target strong { overflow-wrap: anywhere; font-size: 13px; font-weight: 500; }
.template-application-choices { padding: 4px; }
.template-application-choices label { display: flex; justify-content: center; align-items: center; min-height: 44px; cursor: pointer; border-radius: 8px; }
.template-application-choices label:has(input:checked) { background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
.template-application-choices label:has(input:focus-visible) { outline: 2px solid var(--primary-color); outline-offset: -2px; }
.template-application-choices input { width: 18px; height: 18px; flex-shrink: 0; accent-color: var(--primary-color); margin: 0; }
.template-application-review { display: grid; gap: 12px; min-width: 0; }
.application-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0; }
.application-summary > div { background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 10px; padding: 12px; min-width: 0; }
.application-summary dt { display: flex; align-items: center; gap: 6px; color: var(--secondary-text-color); font-size: 12px; }
.application-summary dd { margin: 8px 0 0; font-weight: 600; font-size: 14px; overflow-wrap: anywhere; }
.application-summary dt ha-icon { color: var(--primary-color); }
.template-application-review-group { display: grid; gap: 12px; padding: 14px; border: 1px solid var(--divider-color); border-radius: 10px; min-width: 0; }
.application-group-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.application-group-heading strong { font-size: 14px; }
.application-group-heading strong > ha-icon { color: var(--primary-color); }
.application-days { color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color)); }
.application-layout-change { font-size: 12px; }
.template-application .application-notice { border: 1px solid color-mix(in srgb, var(--warning-color, #ff9800) 40%, var(--divider-color)); border-inline-start: 3px solid var(--warning-color, #ff9800); border-radius: 8px; background: color-mix(in srgb, var(--warning-color, #ff9800) 7%, var(--card-background-color)); padding: 10px 12px; font-size: 13px; color: var(--primary-text-color); }
.application-notice ha-icon { color: var(--warning-color, #ff9800); }
.application-notice strong { display: block; }
.template-application .hint, .template-application .warning { margin: 0; }
.template-application-base { display: grid; gap: 8px; min-width: 0; }
.template-application-base button { display: grid; text-align: start; white-space: normal; overflow-wrap: anywhere; }
.template-application-footer { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--divider-color); }
.template-application-footer .command-button.secondary { background: var(--secondary-background-color); border-color: var(--divider-color); color: var(--primary-text-color); }
@container template-application (max-width: 620px) {
 .template-application-controls, .application-summary { grid-template-columns: minmax(0, 1fr); }
 .application-summary > div { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); align-items: center; gap: 10px; }
 .application-summary dd { margin: 0; }
 .template-application-review-group { padding: 12px; }
}
`;
