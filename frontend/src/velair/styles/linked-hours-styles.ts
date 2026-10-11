import { css } from "lit";

/** Shared by the Default day editor and the atomic Profile editor. */
export const linkedHoursStyles = css`
  .hours-source-control,
  .hours-source-field,
  .copy-template-control {
    display: grid;
    gap: 8px;
    min-width: 0;
  }

  .template-link-scope { display: grid; gap: 0; min-width: 0; }

  .hours-source-field {
    gap: 0;
  }

  .hours-source-control.linked {
    align-items: end;
    grid-template-columns: minmax(0, 2fr) minmax(200px, 1fr) auto;
    gap: 16px;
  }

  .hours-source-control .select-wrap,
  .hours-source-control select {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
  }

  .hours-source-label {
    align-items: flex-end;
    display: flex;
    gap: 4px;
    min-width: 0;
  }

  .hours-source-label .inline-help {
    align-items: flex-end;
  }

  .block-time-field {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .block-time-field > .label { font-size: 11px; }

  .linked-time-input {
    align-self: start;
    display: block;
    min-width: 0;
    position: relative;
  }

  .linked-time-input > input {
    box-sizing: border-box;
    display: block;
    min-width: 0;
    width: 100%;
  }

  .hours-source-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }

  .hours-source-actions .command-button {
    background: transparent;
    border: 0;
    color: var(--primary-color);
    max-width: 100%;
    white-space: normal;
  }

  .hours-source-actions .command-button:not(:disabled):hover {
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    color: var(--primary-color);
  }

  .hours-source-actions .command-button:disabled {
    color: var(--secondary-text-color);
  }

  .hours-source-actions .command-button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  @container (max-width: 640px) {
    .hours-source-control.linked { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  }
  @media (max-width: 640px) {
    .hours-source-control.linked { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  }
`;
