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

  .profile-active {
    align-items: center;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) minmax(180px, 280px);
    margin-bottom: 16px;
    padding: 14px;
  }

  .profile-active strong,
  .profile-active span {
    display: block;
  }

  .profile-active > div > span,
  .profile-item-copy span,
  .help {
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  :host([compact]) .profile-active {
    margin: 14px 0 0;
  }

  .profile-active-compact {
    border-color: color-mix(in srgb, var(--profile-accent) 42%, var(--divider-color));
    border-radius: 8px;
    display: grid;
    gap: 7px;
    grid-template-columns: minmax(0, 1fr);
    padding: 12px;
  }

  :host(:not([compact])) .profile-active-compact {
    margin-bottom: 24px;
  }

  .profile-compact-eyebrow {
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.2;
  }

  .profile-compact-picker {
    align-items: center;
    background: var(--card-background-color);
    border: 1px solid color-mix(in srgb, var(--profile-accent) 38%, var(--divider-color));
    border-radius: 8px;
    cursor: pointer;
    display: grid;
    gap: 10px;
    grid-template-columns: 38px minmax(0, 1fr) 18px;
    min-height: 48px;
    padding: 6px 10px 6px 6px;
    position: relative;
  }

  .profile-compact-picker:has(select:focus-visible) {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .profile-compact-picker:has(select:disabled) {
    cursor: default;
    opacity: 0.6;
  }

  .profile-active .profile-compact-icon {
    align-items: center;
    background: var(--profile-accent);
    border-radius: 10px;
    color: white;
    display: flex;
    height: 38px;
    justify-content: center;
    width: 38px;
  }

  .profile-active .profile-compact-icon ha-icon {
    --mdc-icon-size: 21px;
    align-items: center;
    display: flex;
    justify-content: center;
    line-height: 1;
  }

  .profile-compact-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .profile-compact-copy strong,
  .profile-compact-copy small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-compact-copy strong {
    font-size: 15px;
    line-height: 1.25;
  }

  .profile-compact-copy small {
    color: var(--secondary-text-color);
    display: block;
    font-size: 12px;
    max-width: 100%;
  }

  .profile-compact-chevron {
    border: solid var(--secondary-text-color);
    border-width: 0 2px 2px 0;
    height: 7px;
    justify-self: center;
    transform: translateY(-2px) rotate(45deg);
    transition: transform 120ms ease;
    width: 7px;
  }

  .profile-compact-picker:has(select:open) .profile-compact-chevron {
    transform: translateY(2px) rotate(225deg);
  }

  .profile-compact-picker select {
    cursor: pointer;
    height: 100%;
    inset: 0;
    margin: 0;
    opacity: 0;
    position: absolute;
    width: 100%;
    z-index: 1;
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
    color: var(--profile-item-accent, var(--success-color, #2e7d32));
    opacity: 1;
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
    .profile-active {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 600px) {
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

    .profile-compact-picker {
      grid-template-columns: 36px minmax(0, 1fr) 16px;
      gap: 8px;
      padding-right: 8px;
    }

    .profile-active .profile-compact-icon {
      height: 36px;
      width: 36px;
    }

    .profile-compact-copy small {
      min-width: 0;
    }
  }
`;
