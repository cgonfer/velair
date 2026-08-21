import { css } from "lit";

export const inlineHelpStyles = css`
.inline-help-wrapper {
  display: inline-flex;
  flex: 0 0 auto;
  position: relative;
}

.inline-help {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 50%;
  color: var(--secondary-text-color);
  cursor: help;
  display: inline-flex;
  height: 28px;
  justify-content: center;
  padding: 0;
  width: 28px;
}

.inline-help ha-icon { --mdc-icon-size: 16px; }

.inline-help:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.inline-help-tooltip {
  background: var(--primary-text-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, .22);
  color: var(--primary-background-color);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.35;
  max-height: calc(100dvh - 24px);
  max-width: min(260px, calc(100vw - 32px));
  opacity: 0;
  overflow-y: auto;
  padding: 7px 8px;
  pointer-events: none;
  position: fixed;
  transition: opacity 120ms ease, visibility 120ms ease;
  visibility: hidden;
  white-space: normal;
  width: max-content;
  z-index: 30;
}

.inline-help-tooltip.visible {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}

@media (pointer: coarse) {
  .inline-help { height: 40px; width: 40px; }
}

@media (max-width: 480px) {
  .inline-help-wrapper { position: static; }
  .inline-help { height: 40px; width: 40px; }
  .inline-help-tooltip {
    bottom: 12px;
    inset-inline: 12px;
    max-height: min(40dvh, 180px);
    max-width: none;
    overflow-y: auto;
    position: fixed;
    top: auto;
    width: auto;
  }
}
`;
