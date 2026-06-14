import { css } from "lit";

export const responsiveStyles = css`
  @media (max-width: 900px) {
    .template-library-layout {
      grid-template-columns: minmax(0, 1fr);
      max-width: 100%;
      min-width: 0;
    }

    .template-detail,
    .template-list-wrap,
    .template-apply-panel,
    .template-editor,
    .template-block-list {
      min-width: 0;
      max-width: 100%;
    }
  }

  @container (max-width: 900px) {
    .template-library-layout {
      grid-template-columns: minmax(0, 1fr);
      max-width: 100%;
      min-width: 0;
    }

    .template-detail,
    .template-list-wrap,
    .template-apply-panel,
    .template-editor,
    .template-block-list {
      min-width: 0;
      max-width: 100%;
    }
  }

  @container (max-width: 760px) {
    .settings-zone-main {
      grid-template-columns: minmax(0, 1fr);
    }

    .settings-capability-composite {
      grid-template-columns: minmax(0, 1fr);
    }

    .settings-capability-row {
      align-items: start;
      display: grid;
      gap: 8px;
      grid-template-columns: minmax(104px, 0.8fr) minmax(0, 1fr);
    }

    .settings-capability-row > .label {
      padding-top: 6px;
    }

    .settings-capability-row .settings-data-icons,
    .settings-capability-row .settings-facts,
    .settings-capability-row .settings-mode-tags {
      justify-content: flex-end;
    }

    .settings-startup {
      grid-template-columns: 32px minmax(0, 1fr) auto;
    }

    .portability-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .maintenance-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 600px) {
    ha-card {
      --ha-card-background: transparent;
      --ha-card-border-width: 0;
      --ha-card-box-shadow: none;
      background: transparent;
      border: 0;
      box-shadow: none;
    }

    .card {
      padding: 0;
    }

    .portability-export-card {
      display: none;
    }

    .maintenance-grid,
    .settings-reset {
      grid-template-columns: minmax(0, 1fr);
    }

    .settings-reset-icon {
      display: none;
    }

    .summary {
      grid-template-columns: 1fr;
    }

    .draft-list {
      grid-template-columns: auto minmax(0, 1fr) auto auto;
    }

    .overview-status-heading {
      gap: 8px;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .overview-controls {
      justify-self: end;
    }

    .overview-pause-control {
      width: fit-content;
    }

    .overview-pause-input {
      --overview-pause-digits: 4ch;
      width: fit-content;
    }

    .event {
      min-width: 560px;
    }

    .scheduler-actions {
      right: 0;
      transform: none;
      grid-template-columns: 1fr;
      max-width: min(280px, calc(100vw - 48px));
      width: min(280px, calc(100vw - 48px));
    }

    .pause-action-group {
      grid-template-columns: 80px minmax(0, 1fr);
    }

    .pause-duration-field,
    .scheduler-actions .command-button {
      width: 100%;
    }

    .editor-header,
    .copy-header {
      align-items: stretch;
      flex-direction: column;
    }

    .schedule-zone-heading,
    .schedule-editor-heading {
      align-items: stretch;
      flex-direction: column;
    }

    .schedule-editor-badges {
      justify-content: flex-start;
    }

    .copy-targets {
      grid-template-columns: 1fr;
    }

    .template-panel {
      grid-template-columns: minmax(0, 1fr);
      justify-self: stretch;
      max-width: none;
      min-width: 0;
    }

    .schedule-config-row {
      grid-template-columns: minmax(0, 1fr);
      max-width: 100%;
      min-width: 0;
    }

    .schedule-config-row .template-panel,
    .schedule-config-row .schedule-block-actions {
      grid-column: auto;
      max-width: 100%;
      min-width: 0;
    }

    .draft-list,
    .template-list,
    .template-detail {
      max-width: 100%;
      min-width: 0;
    }

    .template-list-wrap.scrollable {
      padding: 20px 12px;
    }

    .template-list-wrap.scrollable.can-scroll-up::before,
    .template-list-wrap.scrollable.can-scroll-down::after {
      border-color: var(--secondary-text-color);
      border-style: solid;
      content: "";
      height: 9px;
      left: 50%;
      opacity: 0.8;
      pointer-events: none;
      position: absolute;
      width: 9px;
      z-index: 1;
    }

    .template-list-wrap.scrollable.can-scroll-up::before {
      border-width: 2px 0 0 2px;
      top: 54px;
      transform: translateX(-50%) rotate(45deg);
    }

    .template-list-wrap.scrollable.can-scroll-down::after {
      border-width: 0 2px 2px 0;
      bottom: 7px;
      transform: translateX(-50%) rotate(45deg);
    }

    .template-list-wrap.scrollable .template-list {
      max-height: min(326px, 58vh);
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 2px;
    }

    .template-detail-heading,
    .copy-header {
      align-items: stretch;
      flex-direction: column;
    }

    .template-apply-panel .copy-header {
      align-items: center;
      flex-direction: row;
    }

    .template-apply-panel .copy-header > div {
      min-width: 0;
    }

    .template-apply-panel .copy-header .command-button {
      flex: 0 0 auto;
      width: auto;
    }

    .editor-actions {
      grid-template-columns: 1fr;
    }

    .template-editor .editor-actions {
      grid-template-columns: 1fr;
    }

    .command-button {
      width: 100%;
    }

    .editable-block .icon-button {
      width: auto;
    }

    .settings-zone-row {
      grid-template-columns: 28px minmax(0, 1fr);
    }

    .settings-zone-row > ha-icon {
      grid-column: 1;
      grid-row: 1;
      justify-self: center;
    }

    .settings-zone-main {
      grid-column: 2;
      grid-row: 1 / span 2;
    }

    .settings-row-actions {
      align-items: center;
      flex-direction: column;
      grid-column: 1;
      grid-row: 2;
      justify-content: flex-start;
      justify-self: center;
    }
  }
`;
