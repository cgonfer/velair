import { css } from "lit";

export const noticeStyles = css`
  .notice-stack {
    box-sizing: border-box;
    display: grid;
    gap: 8px;
    max-width: min(520px, calc(100vw - 32px));
    width: 100%;
  }

  .notice-stack.floating {
    bottom: max(16px, env(safe-area-inset-bottom));
    left: 50%;
    max-height: calc(100dvh - 32px - env(safe-area-inset-bottom));
    overflow: auto;
    position: fixed;
    transform: translateX(-50%);
    z-index: 1000;
  }

  .notice-stack.contextual {
    margin: 0;
    max-width: none;
  }

  .notice-row {
    display: grid;
    grid-template-rows: 1fr;
    opacity: 1;
    transition: grid-template-rows 140ms ease, opacity 140ms ease, transform 160ms ease;
  }

  .notice-row > .notice {
    min-height: 0;
  }

  .notice-row.entering {
    grid-template-rows: 0fr;
    opacity: 0;
    transform: translateY(6px);
  }

  .notice-row.leaving {
    grid-template-rows: 0fr;
    opacity: 0;
  }

  .notice {
    align-items: center;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    box-shadow: var(--ha-card-box-shadow, 0 4px 18px rgba(0, 0, 0, 0.18));
    box-sizing: border-box;
    display: flex;
    gap: 10px;
    justify-content: space-between;
    margin: 0;
    min-width: 0;
    overflow: hidden;
    padding: 12px;
    position: relative;
    width: 100%;
  }

  .notice > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .notice-close {
    align-items: center;
    background: transparent;
    border: 0;
    color: currentColor;
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    height: 28px;
    justify-content: center;
    padding: 0;
    width: 28px;
  }

  .notice-close ha-icon {
    --mdc-icon-size: 18px;
  }

  .notice.error {
    background: color-mix(in srgb, var(--error-color) 12%, transparent);
    border-color: var(--error-color);
  }

  .notice.success {
    background: color-mix(in srgb, var(--success-color) 12%, transparent);
    border-color: var(--success-color);
    padding-bottom: 16px;
  }

  .notice-progress-track {
    background: color-mix(in srgb, var(--success-color, #2e7d32) 16%, var(--card-background-color));
    bottom: 0;
    height: 4px;
    left: 0;
    position: absolute;
    right: 0;
  }

  .notice-progress-fill {
    background: var(--success-color, #2e7d32);
    height: 100%;
    transition: width 500ms linear;
  }

  @media (prefers-reduced-motion: reduce) {
    .notice-row {
      transition-duration: 0ms;
    }
  }
`;
