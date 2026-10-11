import { css } from "lit";

export const documentationStyles = css`
  .documentation-help {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
  }

  .documentation-help-button,
  .documentation-close {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 50%;
    color: var(--secondary-text-color);
    cursor: pointer;
    display: inline-flex;
    height: 44px;
    justify-content: center;
    padding: 0;
    width: 44px;
  }

  .documentation-help-button ha-icon,
  .documentation-close ha-icon {
    --mdc-icon-size: 20px;
    color: inherit;
    height: 20px;
    width: 20px;
  }

  .documentation-help-button:hover,
  .documentation-close:hover {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    color: var(--primary-color);
  }

  .documentation-help-button:focus-visible,
  .documentation-close:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  .documentation-dialog {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: var(--ha-card-border-radius, 12px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, .25);
    box-sizing: border-box;
    color: var(--primary-text-color);
    max-height: calc(100dvh - 32px);
    overflow: auto;
    padding: 16px;
    text-align: left;
    width: min(440px, calc(100vw - 32px));
  }

  .documentation-dialog::backdrop {
    background: rgba(0, 0, 0, .35);
  }

  .documentation-dialog-header {
    align-items: center;
    display: grid;
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) 44px;
  }

  .documentation-dialog h2 {
    font-size: 18px;
    line-height: 1.4;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .documentation-dialog p {
    font-size: 14px;
    line-height: 1.6;
    margin: 8px 0 12px;
  }

  .documentation-dialog-footer {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
  }

  .documentation-guide {
    align-items: center;
    color: var(--primary-color);
    display: inline-flex;
    gap: 6px;
    min-height: 44px;
    overflow-wrap: anywhere;
    text-underline-offset: 3px;
  }

  .documentation-guide:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 3px;
  }

  .documentation-guide ha-icon {
    --mdc-icon-size: 18px;
    flex-shrink: 0;
  }

  .documentation-guide small {
    color: var(--secondary-text-color);
  }

  .documentation-dialog-footer > span {
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .documentation-link {
    align-items: center;
    color: var(--primary-color);
    display: inline-flex;
    gap: 6px;
    line-height: 1.4;
    min-height: 44px;
    max-width: 100%;
    overflow-wrap: anywhere;
    text-underline-offset: 3px;
  }

  .documentation-link ha-icon {
    --mdc-icon-size: 18px;
    flex-shrink: 0;
  }

  .documentation-link:focus-visible {
    border-radius: 4px;
    outline: 2px solid var(--primary-color);
    outline-offset: 3px;
  }

  .settings-help {
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    min-width: 0;
    padding: 12px;
  }

  .settings-help > p,
  .settings-help-links p {
    color: var(--secondary-text-color);
    line-height: 1.5;
    margin: 4px 0;
  }

  .settings-help-links {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
    margin-top: 8px;
  }

  .settings-help-links > div {
    min-width: 0;
  }

  .help-community-link {
    align-items: start;
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    display: grid;
    gap: 8px;
    grid-template-columns: 18px minmax(0, 1fr) 18px;
    padding: 10px;
    text-decoration: none;
  }

  .help-community-link:hover strong {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .help-community-link strong,
  .help-community-link small {
    display: block;
  }

  .help-community-link small {
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.5;
    margin-top: 4px;
  }

  .comfort-intro,
  .sensors-intro,
  .preconditioning-intro,
  .diagnostics-intro {
    grid-template-columns: 24px minmax(0, 1fr) 44px;
  }

  .profile-intro:has(> .documentation-help) {
    grid-template-columns: 24px minmax(0, 1fr) 44px;
  }

  .profile-library .section-heading:has(> .documentation-help) {
    grid-template-columns: 28px minmax(0, 1fr) 44px;
  }

  .documentation-heading {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    min-width: 0;
  }

  .settings-policy-heading {
    flex-wrap: wrap;
    min-width: 0;
  }
`;
