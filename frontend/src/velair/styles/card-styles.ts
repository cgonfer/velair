import { css } from "lit";
import { baseStyles } from "./base-styles";
import { noticeStyles } from "./notice-styles";
import { overviewStyles } from "./overview-styles";
import { portabilityStyles } from "./portability-styles";
import { settingsStyles } from "./settings-styles";
import { templateStyles } from "./template-styles";
import { timelineStyles } from "./timeline-styles";
import { responsiveStyles } from "./responsive-styles";

export const cardStyles = [baseStyles, noticeStyles, overviewStyles, portabilityStyles, settingsStyles, templateStyles, timelineStyles, css`
    .summary {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin: 0 0 16px;
    }

    .summary > div,
    .next,
    .editor {
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 12px;
    }

    .summary > div {
      min-width: 0;
      overflow: hidden;
      position: relative;
    }

    .summary > .summary-status {
      overflow: visible;
      z-index: 3;
    }

    .summary-status.paused {
      padding-bottom: 20px;
    }

    .summary-status-header {
      align-items: start;
      display: grid;
      gap: 8px;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .summary-events {
      overflow: visible;
    }

    .summary strong,
    .summary span,
    label span {
      display: block;
    }

    .next,
    .schedule,
    .zones {
      margin-top: 14px;
    }

    .schedule-zone-picker {
      display: grid;
      gap: 8px;
      margin-top: 0;
    }

    .schedule-zone-picker .zones {
      margin-top: 0;
    }

    .schedule-zone-heading,
    .schedule-editor-heading,
    .schedule-step-heading {
      align-items: center;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      min-width: 0;
    }

    .schedule-zone-heading > div,
    .schedule-editor-heading > div:first-child {
      min-width: 0;
    }

    .schedule-zone-heading strong,
    .schedule-editor-heading h2,
    .schedule-editor-entity {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .schedule-editor-heading {
      margin-top: 16px;
    }

    .schedule-step-heading {
      margin-top: 14px;
    }

    .schedule-step-heading strong,
    .schedule-editor-heading strong {
      font-size: 14px;
      font-weight: 600;
      min-width: 0;
    }

    .schedule-editor-entity {
      color: var(--secondary-text-color);
      display: block;
      font-size: 12px;
      margin-top: 2px;
    }

    .schedule-editor-badges {
      align-items: center;
      display: flex;
      flex: 0 0 auto;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .zones {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 8px;
      scrollbar-gutter: stable;
    }

    .day-tabs {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(auto-fit, minmax(56px, 1fr));
      padding-bottom: 2px;
    }

    .zone,
    .day-tab {
      background: transparent;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      color: var(--primary-text-color);
      cursor: pointer;
      min-height: 40px;
      padding: 8px 12px;
    }

    .zone {
      flex: 0 0 auto;
      position: relative;
    }

    .zone.dirty::after {
      background: var(--warning-color, #f9a825);
      border: 2px solid var(--card-background-color);
      border-radius: 999px;
      content: "";
      height: 9px;
      position: absolute;
      right: -2px;
      top: -2px;
      width: 9px;
    }

    .zone.active,
    .day-tab.active {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--text-primary-color);
    }

    .day-tab {
      align-items: center;
      display: grid;
      gap: 3px;
      justify-items: center;
      min-width: 0;
      padding: 8px 6px;
    }

    .day-tab span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .day-tab strong {
      background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent);
      border-radius: 999px;
      font-size: 11px;
      line-height: 1;
      min-width: 18px;
      padding: 4px 6px;
    }

    .day-tabs,
    .editor {
      margin-top: 10px;
    }

    .copy-panel {
      border-top: 1px solid var(--divider-color);
      display: grid;
      gap: 10px;
      margin-top: 12px;
      padding-top: 12px;
    }

    .copy-targets {
      grid-template-columns: repeat(auto-fit, minmax(54px, 1fr));
    }

    .copy-targets.wide {
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }

    .copy-actions {
      display: flex;
      justify-content: flex-end;
    }

    .copy-actions .command-button {
      width: auto;
    }

    .scheduler-menu {
      justify-self: end;
      position: relative;
      z-index: 30;
    }

    .scheduler-menu summary {
      align-items: center;
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      color: var(--primary-text-color);
      cursor: pointer;
      display: inline-flex;
      height: 34px;
      justify-content: center;
      list-style: none;
      width: 34px;
    }

    .scheduler-menu summary::-webkit-details-marker {
      display: none;
    }

    .scheduler-menu summary:hover,
    .scheduler-menu[open] summary {
      background: color-mix(in srgb, var(--primary-color) 12%, var(--secondary-background-color));
      border-color: color-mix(in srgb, var(--primary-color) 38%, var(--divider-color));
    }

    .scheduler-menu summary ha-icon {
      --mdc-icon-size: 18px;
    }

    .scheduler-actions {
      align-items: stretch;
      background: color-mix(in srgb, var(--card-background-color) 94%, var(--primary-color) 6%);
      border: 1px solid color-mix(in srgb, var(--primary-color) 34%, var(--divider-color));
      border-radius: 8px;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28), var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.16));
      display: grid;
      gap: 10px;
      grid-template-columns: minmax(0, 1fr);
      padding: 18px 12px 12px;
      position: absolute;
      right: 50%;
      top: calc(100% + 8px);
      transform: translateX(50%);
      width: 280px;
      z-index: 20;
    }

    .dialog-close {
      align-items: center;
      background: color-mix(in srgb, var(--card-background-color) 88%, var(--primary-color) 12%);
      border: 1px solid color-mix(in srgb, var(--primary-color) 26%, var(--divider-color));
      border-radius: 999px;
      color: var(--primary-text-color);
      cursor: pointer;
      display: inline-flex;
      height: 26px;
      justify-content: center;
      padding: 0;
      position: absolute;
      right: 8px;
      top: 8px;
      width: 26px;
      z-index: 1;
    }

    .dialog-close:hover {
      background: color-mix(in srgb, var(--primary-color) 18%, var(--card-background-color));
      border-color: color-mix(in srgb, var(--primary-color) 42%, var(--divider-color));
    }

    .dialog-close ha-icon {
      --mdc-icon-size: 18px;
    }

    .pause-action-group {
      align-items: end;
      background: color-mix(in srgb, var(--primary-text-color) 5%, var(--card-background-color));
      border: 1px solid color-mix(in srgb, var(--primary-text-color) 12%, var(--divider-color));
      border-radius: 8px;
      display: grid;
      gap: 10px;
      grid-template-columns: 80px minmax(0, 1fr);
      padding: 10px;
    }

    .pause-duration-field {
      width: 80px;
    }

    .scheduler-actions .command-button {
      min-width: 0;
      width: 100%;
    }

    .scheduler-actions .command-button span {
      overflow: visible;
      text-overflow: clip;
    }

    .scheduler-secondary-actions {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pause-progress {
      bottom: 0;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
      display: grid;
      gap: 3px;
      left: 0;
      overflow: hidden;
      position: absolute;
      right: 0;
    }

    .pause-progress span {
      color: var(--secondary-text-color);
      display: block;
      font-size: 12px;
      line-height: 1.2;
      overflow: hidden;
      padding: 0 12px 2px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .progress-track {
      background: color-mix(in srgb, var(--warning-color, #f9a825) 16%, var(--card-background-color));
      height: 4px;
      overflow: hidden;
    }

    .progress-fill {
      background: var(--warning-color, #f9a825);
      border-radius: inherit;
      height: 100%;
      transition: width 200ms ease;
    }

    .boost-status {
      align-items: center;
      background: color-mix(in srgb, var(--warning-color, #f9a825) 12%, var(--card-background-color));
      border: 1px solid color-mix(in srgb, var(--warning-color, #f9a825) 38%, var(--divider-color));
      border-radius: 8px;
      display: grid;
      gap: 10px;
      grid-template-columns: 24px minmax(0, 1fr);
      margin-top: 10px;
      padding: 10px 12px;
    }

    .boost-status ha-icon {
      color: var(--warning-color, #f9a825);
    }

    .boost-status span {
      color: var(--secondary-text-color);
      display: block;
      font-size: 12px;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .check-target {
      align-items: center;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      gap: 8px;
      min-height: 38px;
      padding: 8px 10px;
    }

    .copy-targets:not(.wide) .check-target {
      justify-content: center;
      padding: 8px 6px;
    }

    .copy-targets:not(.wide) .check-target.disabled {
      color: var(--disabled-text-color, var(--secondary-text-color));
      cursor: default;
      opacity: 0.52;
    }

    .copy-targets:not(.wide) .check-target input {
      height: 16px;
      margin: 0;
      width: 16px;
    }

    .copy-targets:not(.wide) .check-target span {
      font-size: 12px;
      line-height: 1;
    }

    .check-target input {
      accent-color: var(--primary-color);
      background: transparent;
      border: 0;
      height: auto;
      margin: 0;
      padding: 0;
      width: auto;
    }

    .template-panel {
      align-items: end;
      display: grid;
      gap: 10px;
      grid-template-columns: minmax(140px, 1fr);
      margin: 0;
      width: 100%;
    }

    .template-panel > div {
      min-width: 0;
    }

    .schedule-config-helper {
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.35;
      margin-top: 12px;
    }

    .schedule-config-row {
      align-items: end;
      display: grid;
      gap: 12px;
      grid-template-columns: minmax(180px, 340px) minmax(24px, 1fr) auto;
      margin: 8px 0 12px;
      min-width: 0;
    }

    .schedule-config-row .template-panel {
      grid-column: 1;
    }

    .schedule-config-row .schedule-block-actions {
      grid-column: 3;
    }

    .editor-actions {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-bottom: 12px;
      margin-top: 12px;
      width: 100%;
    }

    .editor-actions .command-button {
      width: 100%;
    }

    .schedule-block-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      margin: 0;
      width: auto;
    }

    .schedule-block-actions .command-button {
      width: auto;
    }

    .template-editor .editor-actions {
      grid-template-columns: minmax(0, 180px);
    }

    .schedule-save-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .schedule-save-actions .command-button {
      width: auto;
    }

    .schedule-copy-helper {
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.35;
      margin-top: 14px;
    }

    .draft-list {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      column-gap: 4px;
      display: grid;
      grid-template-columns: minmax(94px, 1fr) minmax(112px, 1fr) minmax(90px, 0.8fr) 40px;
      overflow: hidden;
      padding: 12px;
      row-gap: 10px;
    }

    .draft-list-header,
    .editable-block {
      display: contents;
    }

    .draft-add-row {
      align-items: center;
      display: flex;
      grid-column: 1 / -1;
      justify-content: center;
      min-width: 0;
      padding: 2px 0;
    }

    .draft-add-button {
      border-radius: 999px;
      flex: 0 0 auto;
      height: 34px;
      width: 34px;
    }

    .draft-add-button ha-icon {
      --mdc-icon-size: 18px;
    }

    .editable-block label {
      min-width: 0;
    }

    .editable-block > label > .label {
      display: none;
    }

    .editable-block .icon-button.danger {
      background: transparent;
      border-color: transparent;
      color: var(--error-color, #c62828);
      min-width: 0;
      padding: 0;
      width: auto;
    }

    .editable-block .icon-button.danger:hover {
      background: color-mix(in srgb, var(--error-color, #c62828) 10%, transparent);
      border-color: transparent;
    }

    .editable-block input,
    .editable-block select {
      margin-top: 0;
    }

    .select-wrap {
      display: block;
      margin-top: 4px;
      position: relative;
    }

    .select-wrap select {
      appearance: none;
      margin-top: 0;
      padding-right: 24px;
    }

    .select-wrap::after {
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

    .select-wrap:has(select:open)::after {
      transform: translateY(-28%) rotate(225deg);
    }

    .editable-block .select-wrap {
      margin-top: 0;
    }

    input,
    select {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      box-sizing: border-box;
      color: var(--primary-text-color);
      font: inherit;
      height: 38px;
      margin-top: 4px;
      padding: 6px 8px;
      width: 100%;
    }

    input:disabled,
    select:disabled {
      cursor: default;
      opacity: 0.55;
    }

    input.invalid {
      border-color: var(--error-color, #c62828);
      box-shadow: 0 0 0 1px var(--error-color, #c62828);
    }

    .field-error {
      color: var(--error-color, #c62828);
      display: block;
      font-size: 11px;
      margin-top: 4px;
    }

    .draft-list-header {
      color: var(--secondary-text-color);
      font-size: 11px;
      text-transform: uppercase;
    }

    .draft-list-header span {
      padding: 2px 8px 4px;
    }

    .mode,
    .pill {
      background: color-mix(in srgb, var(--primary-color) 12%, transparent);
      border-radius: 999px;
      color: var(--primary-text-color);
      display: inline-flex;
      justify-self: start;
      padding: 3px 8px;
      white-space: nowrap;
    }

    .pill.muted {
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
    }

    .pill.accent {
      background: color-mix(in srgb, var(--warning-color) 18%, transparent);
    }

    .pill.warning {
      background: color-mix(in srgb, var(--warning-color, #f9a825) 22%, transparent);
      border: 1px solid color-mix(in srgb, var(--warning-color, #f9a825) 60%, var(--divider-color));
      color: var(--primary-text-color);
    }

  `, responsiveStyles];

