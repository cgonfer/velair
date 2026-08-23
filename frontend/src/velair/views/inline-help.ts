import { html } from "lit";

const hideTimers = new WeakMap<HTMLElement, number>();
const HIDE_DELAY_MS = 300;

function tooltipFor(button: HTMLElement): HTMLElement | null {
  return button.parentElement?.querySelector<HTMLElement>(".inline-help-tooltip") ?? null;
}

function cancelHide(tooltip: HTMLElement): void {
  const timer = hideTimers.get(tooltip);
  if (timer !== undefined) window.clearTimeout(timer);
  hideTimers.delete(tooltip);
}

function hideTooltip(tooltip: HTMLElement): void {
  cancelHide(tooltip);
  tooltip.classList.remove("visible");
  delete tooltip.dataset.openCause;
}

function scheduleHide(tooltip: HTMLElement): void {
  if (tooltip.dataset.openCause === "click") return;
  cancelHide(tooltip);
  hideTimers.set(tooltip, window.setTimeout(() => hideTooltip(tooltip), HIDE_DELAY_MS));
}

function positionTooltip(button: HTMLElement, tooltip: HTMLElement): void {
  if (window.matchMedia?.("(max-width: 480px)").matches) {
    tooltip.style.removeProperty("left");
    tooltip.style.removeProperty("top");
    return;
  }
  const margin = 12;
  const gap = 6;
  const triggerRect = button.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const maxLeft = Math.max(margin, window.innerWidth - tooltipRect.width - margin);
  const left = Math.min(Math.max(triggerRect.left, margin), maxLeft);
  const below = triggerRect.bottom + gap;
  const above = triggerRect.top - tooltipRect.height - gap;
  const maxTop = Math.max(margin, window.innerHeight - tooltipRect.height - margin);
  const top = below + tooltipRect.height <= window.innerHeight - margin
    ? below
    : above >= margin ? above : Math.min(Math.max(below, margin), maxTop);
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function showTooltip(button: HTMLElement, cause: "focus" | "hover" | "click"): void {
  const tooltip = tooltipFor(button);
  if (!tooltip) return;
  cancelHide(tooltip);
  tooltip.dataset.openCause = cause;
  tooltip.classList.add("visible");
  positionTooltip(button, tooltip);
}

function handleClick(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  const button = event.currentTarget as HTMLElement;
  const tooltip = tooltipFor(button);
  if (!tooltip) return;
  if (tooltip.classList.contains("visible") && tooltip.dataset.openCause === "click") {
    hideTooltip(tooltip);
    return;
  }
  showTooltip(button, "click");
}

export function renderInlineHelp(
  id: string,
  label: string,
  text: string,
  options: { compact?: boolean } = {},
) {
  return html`
    <span class="inline-help-wrapper">
      <button
        type="button"
        class=${options.compact ? "inline-help compact" : "inline-help"}
        aria-label=${label}
        aria-describedby=${id}
        @focus=${(event: FocusEvent) => showTooltip(event.currentTarget as HTMLElement, "focus")}
        @focusout=${(event: FocusEvent) => {
          const tooltip = tooltipFor(event.currentTarget as HTMLElement);
          if (tooltip) hideTooltip(tooltip);
        }}
        @pointerenter=${(event: PointerEvent) => showTooltip(event.currentTarget as HTMLElement, "hover")}
        @pointerleave=${(event: PointerEvent) => {
          const tooltip = tooltipFor(event.currentTarget as HTMLElement);
          if (tooltip) scheduleHide(tooltip);
        }}
        @click=${handleClick}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key !== "Escape") return;
          const tooltip = tooltipFor(event.currentTarget as HTMLElement);
          if (!tooltip) return;
          event.preventDefault();
          hideTooltip(tooltip);
        }}
      >
        <ha-icon icon="mdi:information-outline"></ha-icon>
      </button>
      <span
        id=${id}
        class="inline-help-tooltip"
        role="tooltip"
        @pointerenter=${(event: PointerEvent) => cancelHide(event.currentTarget as HTMLElement)}
        @pointerleave=${(event: PointerEvent) => scheduleHide(event.currentTarget as HTMLElement)}
      >${text}</span>
    </span>
  `;
}
