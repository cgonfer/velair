import { css } from "lit";

export const profileStyles = css`
  :host {
    display: block;
    color: var(--primary-text-color);
  }

  .profile-intro {
    align-items: center;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    display: grid;
    gap: 12px;
    grid-template-columns: 32px minmax(0, 1fr);
    margin-bottom: 12px;
    padding: 12px 14px;
  }

  .profile-intro > ha-icon {
    color: var(--primary-color);
  }

  .profile-intro > span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .profile-intro strong {
    font-size: 14px;
  }

  .profile-intro small {
    color: var(--secondary-text-color);
    line-height: 1.35;
  }

  .profile-library-selector {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 16px 0;
  }

  .profile-library-tab {
    align-items: center;
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    color: var(--primary-text-color);
    cursor: pointer;
    display: grid;
    gap: 12px;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    min-height: 76px;
    padding: 12px 14px;
    text-align: left;
  }

  .profile-library-tab:hover {
    border-color: var(--primary-color);
  }

  .profile-library-tab:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .profile-library-tab.active {
    background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color));
    border-color: var(--primary-color);
  }

  .profile-library-tab > ha-icon {
    --mdc-icon-size: 24px;
    color: var(--primary-color);
  }

  .profile-library-tab-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .profile-library-tab-copy small {
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.35;
  }

  .profile-library-tab-count {
    align-items: center;
    background: var(--secondary-background-color);
    border-radius: 10px;
    color: var(--secondary-text-color);
    display: inline-flex;
    font-size: 12px;
    font-weight: 600;
    justify-content: center;
    min-height: 24px;
    min-width: 24px;
    padding: 0 5px;
  }

  [role="tabpanel"][hidden] {
    display: none !important;
  }

  .profile-item-copy span,
  .help {
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .profile-active-context {
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    display: grid;
    gap: 14px;
    margin-bottom: 16px;
    padding: 14px;
    position: relative;
  }

  :host([compact]) .profile-active-context {
    margin: 14px 0 0;
  }

  :host(:not([compact])) .profile-active-context {
    margin-bottom: 24px;
  }

  .active-setup-heading {
    align-items: center;
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .active-setup-heading > span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .active-setup-heading > span > strong {
    font-size: 15px;
  }

  .active-setup-heading > span > small,
  .active-setup-group-heading small {
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.35;
  }

  .active-setup-summary {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 9px;
    display: grid;
    gap: 14px;
    grid-template-columns: minmax(190px, 0.8fr) minmax(0, 1.2fr);
    padding: 12px;
  }

  .active-setup-mode {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: 36px minmax(0, 1fr);
    min-width: 0;
  }

  .active-setup-summary-icon {
    align-items: center;
    background: color-mix(in srgb, var(--secondary-text-color) 14%, var(--card-background-color));
    border-radius: 9px;
    color: var(--secondary-text-color);
    display: flex;
    height: 36px;
    justify-content: center;
    width: 36px;
  }

  .active-setup-summary-icon ha-icon {
    --mdc-icon-size: 20px;
  }

  .active-setup-summary-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .active-setup-summary-copy > small,
  .active-setup-summary-label {
    color: var(--secondary-text-color);
    font-size: 11px;
    font-weight: 600;
    line-height: 1.2;
  }

  .active-setup-summary-copy > span {
    color: var(--secondary-text-color);
    font-size: 12px;
    overflow-wrap: break-word;
    white-space: normal;
  }

  .active-setup-profiles {
    border-left: 1px solid var(--divider-color);
    display: grid;
    gap: 7px;
    min-width: 0;
    padding-left: 14px;
  }

  .active-setup-profile-list {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    min-width: 0;
  }

  .active-setup-profile {
    align-items: center;
    display: inline-grid;
    gap: 6px;
    grid-template-columns: 22px minmax(0, 1fr);
    max-width: 100%;
  }

  .active-setup-profile ha-icon {
    --mdc-icon-size: 20px;
    color: var(--profile-accent);
  }

  .active-setup-profile > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .active-setup-no-profiles,
  .active-setup-empty {
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .active-setup-menu {
    position: relative;
  }

  .active-setup-menu > summary {
    list-style: none;
  }

  .active-setup-menu > summary::-webkit-details-marker {
    display: none;
  }

  .active-setup-change {
    align-items: center;
    display: inline-flex;
    gap: 6px;
    min-height: 36px;
  }

  .active-setup-change[aria-disabled="true"] {
    cursor: default;
    opacity: 0.55;
    pointer-events: none;
  }

  .active-setup-change ha-icon {
    --mdc-icon-size: 18px;
  }

  .active-setup-popover {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.24);
    display: grid;
    gap: 16px;
    max-height: min(560px, calc(100vh - 160px));
    min-width: min(430px, calc(100vw - 32px));
    overflow: auto;
    padding: 12px;
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: min(470px, calc(100vw - 32px));
    z-index: 30;
  }

  .active-setup-option-group {
    display: grid;
    gap: 6px;
  }

  .active-setup-option-group + .active-setup-option-group {
    border-top: 1px solid var(--divider-color);
    padding-top: 14px;
  }

  .active-setup-group-heading {
    display: grid;
    gap: 2px;
    margin-bottom: 3px;
  }

  .active-setup-option {
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--primary-text-color);
    cursor: pointer;
    display: grid;
    gap: 10px;
    grid-template-columns: 26px minmax(0, 1fr) 20px;
    padding: 8px;
    text-align: left;
    width: 100%;
  }

  .active-setup-option:hover:not(:disabled) {
    background: var(--secondary-background-color);
  }

  .active-setup-option:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  .active-setup-option.current {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    border-color: color-mix(in srgb, var(--primary-color) 34%, var(--divider-color));
  }

  .active-setup-option:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .active-setup-option-icon {
    --mdc-icon-size: 21px;
    color: var(--profile-accent, var(--primary-color));
  }

  .active-setup-option-icon.neutral {
    color: var(--secondary-text-color);
  }

  .active-setup-option-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .active-setup-option-copy small {
    color: var(--secondary-text-color);
    font-size: 11px;
    line-height: 1.35;
    overflow-wrap: break-word;
    white-space: normal;
  }

  .active-setup-current {
    --mdc-icon-size: 18px;
    color: var(--primary-color);
  }

  .active-setup-linked-profiles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 4px;
  }

  .active-setup-linked-profiles > span {
    align-items: center;
    color: var(--secondary-text-color);
    display: inline-flex;
    font-size: 11px;
    gap: 4px;
  }

  .active-setup-linked-profiles ha-icon {
    --mdc-icon-size: 16px;
    color: var(--profile-accent);
  }

  .mode-library {
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    display: grid;
    gap: 14px;
    margin-bottom: 16px;
    padding: 14px;
  }

  .library-concept-note {
    align-items: start;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    display: grid;
    gap: 10px;
    grid-template-columns: 22px minmax(0, 1fr);
    padding: 10px 12px;
  }

  .library-concept-note > ha-icon {
    --mdc-icon-size: 19px;
    color: var(--primary-color);
  }

  .library-concept-note > span {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .library-concept-note small,
  .mode-field small,
  .mode-item small {
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.35;
  }

  .mode-entity-note {
    align-items: center;
    background: var(--card-background-color);
    border-radius: 8px;
    color: var(--secondary-text-color);
    display: flex;
    flex-wrap: wrap;
    font-size: 12px;
    gap: 6px;
    padding: 9px 10px;
  }

  .mode-entity-note ha-icon {
    --mdc-icon-size: 17px;
    color: var(--primary-color);
  }

  .mode-layout {
    min-width: 0;
  }

  .mode-list {
    align-content: start;
  }

  .mode-item {
    grid-template-columns: minmax(0, 1fr) 34px;
  }

  .mode-item.built-in {
    grid-template-columns: minmax(0, 1fr) 30px 34px;
  }

  .mode-item.built-in .mode-item-main,
  .mode-item.built-in .mode-lock {
    opacity: 0.76;
  }

  .mode-item-main {
    align-items: center;
    display: grid;
    gap: 9px;
    grid-template-columns: 22px minmax(0, 1fr);
    min-width: 0;
  }

  .mode-item.custom .mode-item-main {
    align-items: start;
    gap: 8px;
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: 10px;
    padding-top: 10px;
  }

  .mode-item.custom .mode-delete {
    align-self: start;
    margin-top: 4px;
  }

  .mode-item-identity {
    align-items: center;
    display: grid;
    gap: 9px;
    grid-template-columns: 22px minmax(0, 1fr);
    min-width: 0;
  }

  .mode-item-identity > ha-icon {
    --mdc-icon-size: 19px;
    color: var(--secondary-text-color);
  }

  .mode-item-identity strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mode-item-main > span,
  .mode-field,
  .mode-editor {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .mode-item-main strong,
  .mode-item-main small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mode-item-main > ha-icon,
  .mode-lock {
    --mdc-icon-size: 19px;
    color: var(--secondary-text-color);
  }

  .mode-lock {
    justify-self: center;
  }

  .mode-help {
    align-items: center;
    align-self: center;
    background: transparent;
    border: 0;
    color: var(--secondary-text-color);
    cursor: help;
    display: inline-flex;
    height: 30px;
    justify-content: center;
    justify-self: center;
    outline: none;
    padding: 0;
    position: relative;
    width: 30px;
  }

  .mode-help > ha-icon {
    --mdc-icon-size: 18px;
  }

  .mode-help-tooltip {
    background: var(--primary-text-color);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
    color: var(--primary-background-color);
    font-size: 11px;
    font-weight: 400;
    line-height: 1.35;
    max-width: min(240px, calc(100vw - 40px));
    opacity: 0;
    padding: 7px 8px;
    pointer-events: none;
    position: absolute;
    right: 0;
    text-align: left;
    top: calc(100% + 6px);
    transition: opacity 120ms ease, visibility 120ms ease;
    visibility: hidden;
    white-space: normal;
    width: max-content;
    z-index: 20;
  }

  .mode-help:hover .mode-help-tooltip,
  .mode-help:focus .mode-help-tooltip,
  .mode-help:focus-visible .mode-help-tooltip {
    opacity: 1;
    visibility: visible;
  }

  .mode-profile-avatar {
    align-items: center;
    align-self: center;
    background: transparent;
    color: var(--mode-profile-color);
    display: flex;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .mode-profile-avatar ha-icon {
    --mdc-icon-size: 20px;
    color: inherit;
  }

  .mode-item-main > .mode-profile-avatars {
    align-items: center;
    color: inherit;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
    padding-left: 31px;
  }

  .mode-item-main .mode-profile-avatar {
    color: var(--mode-profile-color);
  }

  .mode-name-row {
    align-items: center;
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) auto;
    min-width: 0;
  }

  .mode-name-row input {
    min-width: 0;
  }

  .mode-field > span:first-child,
  .mode-name-field > label {
    font-size: 12px;
    font-weight: 600;
  }

  .mode-field input,
  .mode-field select {
    box-sizing: border-box;
    min-height: 40px;
    padding-left: 10px;
    padding-right: 32px;
    width: 100%;
  }

  .mode-field [aria-invalid="true"] {
    border-color: var(--error-color);
  }

  .mode-profile-choices {
    border: 0;
    display: grid;
    gap: 8px;
    margin: 0;
    min-width: 0;
    padding: 0;
  }

  .mode-profile-choices legend {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
    padding: 0;
  }

  .mode-profile-choice {
    align-items: center;
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    cursor: pointer;
    display: grid;
    gap: 10px;
    grid-template-columns: auto auto minmax(0, 1fr);
    padding: 9px 10px;
  }

  .mode-profile-choice.selected {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    border-color: var(--primary-color);
  }

  .mode-profile-choice input {
    min-height: auto;
    padding: 0;
    width: auto;
  }

  .mode-profile-choice > span:last-child {
    display: grid;
    min-width: 0;
  }

  .mode-profile-choice code {
    color: var(--secondary-text-color);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-library {
    min-width: 0;
  }

  .profile-list .template-item {
    grid-template-columns: minmax(0, 1fr) 34px 34px;
  }

  .profile-item-activate {
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none;
    color: var(--success-color, #2e7d32);
    height: 34px;
    width: 34px;
  }

  .profile-item-activate:hover:not(:disabled) {
    background: transparent !important;
    border-color: transparent !important;
    color: color-mix(in srgb, var(--success-color, #2e7d32) 78%, var(--primary-text-color));
  }

  .profile-item-activate.active {
    background: #2e7d32 !important;
    border-color: #2e7d32 !important;
    color: #ffffff;
    opacity: 1;
  }

  .profile-item-activate.active:hover:not(:disabled) {
    background: #256628 !important;
    border-color: #256628 !important;
    color: #ffffff;
  }

  .profile-list-empty {
    padding: 16px;
  }

  .profile-item-main {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: 24px minmax(0, 1fr);
  }

  .profile-item-main > ha-icon {
    color: var(--profile-item-accent, var(--primary-color));
  }

  .profile-item-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
    text-align: left;
  }

  .profile-item-copy strong,
  .profile-item-copy code,
  .profile-item-copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-item-copy code {
    color: var(--secondary-text-color);
    font-family: var(--code-font-family, monospace);
    font-size: 11px;
  }

  .profile-editor,
  .profile-zones,
  .profile-zone,
  .profile-week {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .profile-actions,
  .zone-heading,
  .week-heading {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .profile-heading-main {
    display: grid;
    gap: 6px;
    min-width: min(320px, 100%);
  }

  .profile-name-field {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .profile-name-input-wrap {
    align-items: center;
    display: grid;
    gap: 8px;
    grid-template-columns: 20px minmax(0, 1fr);
  }

  .profile-name-input-wrap ha-icon {
    --mdc-icon-size: 18px;
    color: var(--secondary-text-color);
  }

  .profile-name-input-wrap input {
    font-size: 18px;
    font-weight: 600;
    min-width: 0;
  }

  .profile-heading-id {
    align-items: center;
    color: var(--secondary-text-color);
    display: flex;
    flex-wrap: wrap;
    font-size: 12px;
    gap: 5px;
    padding-left: 28px;
  }

  .profile-heading-id code {
    overflow-wrap: anywhere;
  }

  .profile-actions,
  .zone-heading,
  .week-heading {
    justify-content: space-between;
  }

  .metadata {
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-metadata-row {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .profile-field-label,
  .profile-metadata-row > label {
    color: var(--primary-text-color);
    font-size: 12px;
    font-weight: 600;
  }

  .profile-readonly-value {
    background: color-mix(in srgb, var(--secondary-background-color) 76%, var(--card-background-color));
    border: 1px dashed var(--divider-color);
    border-radius: 8px;
    box-sizing: border-box;
    color: var(--secondary-text-color);
    min-height: 38px;
    padding: 9px 10px;
    user-select: all;
    width: 100%;
  }

  .profile-readonly-value code {
    overflow-wrap: anywhere;
  }

  .metadata textarea {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    box-sizing: border-box;
    color: var(--primary-text-color);
    font: inherit;
    line-height: 1.4;
    min-height: 72px;
    padding: 9px 10px;
    resize: vertical;
    width: 100%;
  }

  .profile-character-count {
    color: var(--secondary-text-color);
    font-size: 11px;
    justify-self: end;
  }

  .profile-icon-input-wrap {
    align-items: center;
    display: grid;
    gap: 8px;
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .profile-color-input-wrap {
    align-items: center;
    display: flex;
    gap: 10px;
  }

  .profile-color-input-wrap input[type="color"] {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    box-sizing: border-box;
    cursor: pointer;
    height: 40px;
    padding: 3px;
    width: 52px;
  }

  .profile-color-code-input {
    font-family: var(--code-font-family, monospace);
    max-width: 150px;
    min-width: 100px;
  }

  .profile-color-invalid-icon {
    --mdc-icon-size: 18px;
    color: var(--error-color);
    flex: 0 0 auto;
  }

  .profile-icon-preview {
    align-items: center;
    background: var(--profile-draft-color, var(--primary-color));
    border: 1px solid var(--profile-draft-color, var(--primary-color));
    border-radius: 8px;
    color: white;
    display: flex;
    height: 40px;
    justify-content: center;
    margin: 0;
  }

  .profile-icon-preview.invalid {
    background: color-mix(in srgb, var(--error-color) 10%, transparent);
    border-color: var(--error-color);
    color: var(--error-color);
  }

  .profile-icon-preview.color-invalid {
    background: var(--secondary-background-color);
    border-color: var(--error-color);
    border-style: dashed;
    color: var(--secondary-text-color);
  }

  .profile-icon-help {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    justify-content: space-between;
  }

  .profile-icon-help a {
    align-items: center;
    color: var(--primary-color);
    display: inline-flex;
    gap: 4px;
    text-decoration: none;
  }

  .profile-icon-help a:hover {
    text-decoration: underline;
  }

  .profile-icon-help a ha-icon {
    --mdc-icon-size: 14px;
  }

  .profile-zone {
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    padding: 12px;
  }

  .profile-zone.collapsed {
    gap: 0;
  }

  .profile-zone-content {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .profile-zone-toggle {
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

  .profile-zone-toggle > ha-icon {
    --mdc-icon-size: 19px;
    color: var(--secondary-text-color);
  }

  .profile-zone-identity {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .profile-zone-identity strong,
  .profile-zone-identity span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-zone-identity span {
    color: var(--secondary-text-color);
    font-family: var(--code-font-family, monospace);
    font-size: 10px;
  }

  .profile-zone-actions,
  .profile-pause-action {
    display: grid;
    gap: 4px;
  }

  .profile-zone-actions .select-wrap {
    margin-top: 2px;
    min-width: 210px;
  }

  .profile-zone-actions select {
    box-sizing: border-box;
    min-height: 42px;
    padding-left: 10px;
    padding-right: 32px;
    width: 100%;
  }

  .profile-zone-actions > span:first-child,
  .profile-pause-action > span:first-child {
    color: var(--primary-text-color);
    font-size: 12px;
    font-weight: 600;
  }

  .profile-week {
    background: var(--secondary-background-color);
    border-radius: 8px;
    padding: 10px;
  }

  .profile-template-select {
    min-width: min(240px, 100%);
  }

  .profile-schedule-config-row {
    grid-template-columns: minmax(180px, 340px);
  }

  .profile-block-list {
    margin-top: 0;
  }

  @media (max-width: 760px) {
    .active-setup-summary {
      grid-template-columns: minmax(0, 1fr);
    }

    .active-setup-profiles {
      border-left: 0;
      border-top: 1px solid var(--divider-color);
      padding-left: 0;
      padding-top: 12px;
    }

    .mode-layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 600px) {
    .profile-library-selector {
      grid-template-columns: minmax(0, 1fr);
    }

    .active-setup-heading {
      align-items: stretch;
      grid-template-columns: minmax(0, 1fr);
    }

    .active-setup-menu,
    .active-setup-change {
      width: 100%;
    }

    .active-setup-change {
      box-sizing: border-box;
      justify-content: center;
    }

    .active-setup-popover {
      box-sizing: border-box;
      margin-top: 8px;
      max-height: none;
      min-width: 0;
      position: static;
      width: 100%;
    }

    .profile-detail-heading {
      align-items: center;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .profile-heading-main {
      min-width: 0;
    }

    .profile-detail-heading .template-detail-actions {
      align-self: center;
      margin-right: 0;
    }
  }

  @container (max-width: 760px) {
    .active-setup-summary {
      grid-template-columns: minmax(0, 1fr);
    }

    .active-setup-profiles {
      border-left: 0;
      border-top: 1px solid var(--divider-color);
      padding-left: 0;
      padding-top: 12px;
    }
  }

  @container (max-width: 600px) {
    .active-setup-heading {
      align-items: stretch;
      grid-template-columns: minmax(0, 1fr);
    }

    .active-setup-menu,
    .active-setup-change {
      width: 100%;
    }

    .active-setup-change {
      box-sizing: border-box;
      justify-content: center;
    }

    .active-setup-popover {
      box-sizing: border-box;
      margin-top: 8px;
      max-height: none;
      min-width: 0;
      position: static;
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .zone-heading,
    .week-heading {
      align-items: stretch;
      flex-direction: column;
    }

    .zone-heading {
      gap: 10px;
    }

    .profile-zone-toggle,
    .profile-zone-actions {
      width: 100%;
    }

    .profile-zone-actions .select-wrap {
      min-width: 0;
      width: 100%;
    }

    .profile-heading-id {
      padding-left: 0;
    }

    .profile-template-select {
      width: 100%;
    }

    .active-setup-option {
      grid-template-columns: 24px minmax(0, 1fr) 18px;
    }
  }
`;
