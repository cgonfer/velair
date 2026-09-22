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
  height: 32px;
  justify-content: center;
  padding: 0;
  position: relative;
  width: 32px;
}

.inline-help ha-icon {
  --mdc-icon-size: 16px;
  height: 16px;
  width: 16px;
}

.inline-help:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.inline-help-tooltip {
  background: var(--primary-text-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, .22);
  box-sizing: border-box;
  color: var(--primary-background-color);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.35;
  max-height: calc(100dvh - 24px);
  max-width: min(260px, calc(100dvw - 24px));
  opacity: 0;
  overflow-wrap: anywhere;
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

.inline-help-tooltip.constrained {
  max-width: min(236px, calc(100dvw - 24px));
  width: min(236px, calc(100dvw - 24px));
}

.inline-help-tooltip-content {
  display: grid;
  gap: 6px;
}

.inline-help-tooltip-block {
  display: block;
}

@media (max-width: 480px) {
  .inline-help-wrapper { position: static; }

  .inline-help-tooltip,
  .inline-help-tooltip.constrained {
    bottom: calc(var(--inline-help-mobile-bottom, 0px) + max(12px, env(safe-area-inset-bottom)));
    left: calc(var(--inline-help-mobile-left, 0px) + max(12px, env(safe-area-inset-left)));
    max-height: min(
      180px,
      calc(
        var(--inline-help-mobile-height, 100dvh)
        - max(12px, env(safe-area-inset-top))
        - max(12px, env(safe-area-inset-bottom))
      ),
      calc(100dvh - 24px)
    );
    max-width: none;
    right: auto;
    top: auto;
    width: calc(
      var(--inline-help-mobile-width, 100dvw)
      - max(12px, env(safe-area-inset-left))
      - max(12px, env(safe-area-inset-right))
    );
  }
}
`;
