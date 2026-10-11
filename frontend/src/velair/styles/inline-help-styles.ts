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

.inline-help-wrapper.inline-help-overlay-wrapper {
  inset: 0;
  position: absolute;
}

.inline-help.inline-help-overlay {
  border-radius: var(--ha-card-border-radius, 6px);
  height: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

.inline-help.inline-help-overlay:focus-visible {
  outline-offset: -2px;
}

.inline-help-tooltip {
  background: Canvas;
  border: 1px solid GrayText;
  border-radius: 0;
  box-sizing: border-box;
  color: CanvasText;
  font: 400 12px/1.2 system-ui, sans-serif;
  max-height: calc(100dvh - 24px);
  max-width: min(260px, calc(100dvw - 24px));
  opacity: 0;
  overflow-wrap: anywhere;
  overflow-y: auto;
  padding: 4px 7px;
  pointer-events: none;
  position: fixed;
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
  --inline-help-max-width: 236px;
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

@media (prefers-color-scheme: dark) {
  .inline-help-tooltip {
    background: #252525;
    border-color: #bfbfbf;
    color: #fff;
  }
}

@media (forced-colors: active) {
  .inline-help-tooltip {
    background: Canvas;
    border-color: CanvasText;
    color: CanvasText;
  }
}

@media (max-width: 480px) {
  .inline-help-wrapper { position: static; }

  .inline-help-tooltip:not([data-open-cause="hover"]),
  .inline-help-tooltip.constrained:not([data-open-cause="hover"]) {
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
