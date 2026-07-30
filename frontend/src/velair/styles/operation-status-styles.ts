import { css } from "lit";

export const operationStatusStyles = css`
  .operation-status {
    --operation-status-color: var(--primary-color);
    align-items: center;
    background: color-mix(in srgb, var(--operation-status-color) 9%, var(--card-background-color));
    border: 1px solid color-mix(in srgb, var(--operation-status-color) 42%, var(--divider-color));
    border-radius: 8px;
    box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.12));
    box-sizing: border-box;
    display: grid;
    gap: 8px 10px;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    margin-bottom: 12px;
    overflow: hidden;
    padding: 10px 12px 8px;
    position: sticky;
    top: var(--velair-operation-sticky-top, 8px);
    z-index: 20;
  }

  .operation-status.completed {
    --operation-status-color: var(--success-color, #2e7d32);
  }

  .operation-status.completed_with_errors {
    --operation-status-color: var(--warning-color, #f9a825);
  }

  .operation-status.failed {
    --operation-status-color: var(--error-color, #c62828);
  }

  .operation-status-icon {
    align-items: center;
    color: var(--operation-status-color);
    display: flex;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .operation-status-icon ha-icon {
    --mdc-icon-size: 21px;
  }

  .operation-status-spinner {
    animation: velair-operation-spin 800ms linear infinite;
    border: 2px solid color-mix(in srgb, var(--operation-status-color) 24%, transparent);
    border-radius: 999px;
    border-top-color: var(--operation-status-color);
    box-sizing: border-box;
    height: 18px;
    width: 18px;
  }

  .operation-status-copy {
    min-width: 0;
  }

  .operation-status-copy strong,
  .operation-status-copy span {
    display: block;
  }

  .operation-status-copy strong {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.25;
  }

  .operation-status-copy span {
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.35;
    margin-top: 2px;
    overflow-wrap: anywhere;
  }

  .operation-status-count {
    color: var(--secondary-text-color);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .operation-status-actions {
    align-items: center;
    display: flex;
    gap: 6px;
  }

  .operation-status-dismiss {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 999px;
    color: var(--secondary-text-color);
    cursor: pointer;
    display: inline-flex;
    height: 32px;
    justify-content: center;
    padding: 0;
    width: 32px;
  }

  .operation-status-dismiss:hover,
  .operation-status-dismiss:focus-visible {
    background: color-mix(in srgb, var(--operation-status-color) 14%, transparent);
    color: var(--primary-text-color);
  }

  .operation-status-dismiss ha-icon {
    --mdc-icon-size: 18px;
  }

  .operation-status-progress {
    background: color-mix(in srgb, var(--operation-status-color) 16%, var(--card-background-color));
    border-radius: 999px;
    grid-column: 1 / -1;
    height: 3px;
    overflow: hidden;
  }

  .operation-status-progress > span {
    background: var(--operation-status-color);
    display: block;
    height: 100%;
    transition: width 180ms ease;
  }

  @keyframes velair-operation-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .operation-status-spinner {
      animation: none;
    }

    .operation-status-progress > span {
      transition: none;
    }
  }

  @container (max-width: 480px) {
    .operation-status {
      grid-template-columns: 22px minmax(0, 1fr) auto;
      padding-inline: 10px;
    }
  }
`;
