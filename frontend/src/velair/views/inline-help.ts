import { html } from "lit";

type OpenCause = "focus" | "hover" | "click";
type ActiveHelp = {
  button: HTMLButtonElement;
  tooltip: HTMLElement;
};

const hideTimers = new WeakMap<HTMLElement, number>();
const HIDE_DELAY_MS = 300;
const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 6;
let activeHelp: ActiveHelp | undefined;
let listenersAttached = false;

function tooltipFor(button: HTMLElement): HTMLElement | null {
  return button.parentElement?.querySelector<HTMLElement>(".inline-help-tooltip") ?? null;
}

function cancelHide(tooltip: HTMLElement): void {
  const timer = hideTimers.get(tooltip);
  if (timer !== undefined) window.clearTimeout(timer);
  hideTimers.delete(tooltip);
}

function resetPosition(tooltip: HTMLElement): void {
  for (const property of [
    "bottom",
    "left",
    "max-height",
    "max-width",
    "right",
    "top",
    "width",
    "--inline-help-mobile-bottom",
    "--inline-help-mobile-height",
    "--inline-help-mobile-left",
    "--inline-help-mobile-width",
  ]) {
    tooltip.style.removeProperty(property);
  }
}

function detachGlobalListeners(): void {
  if (!listenersAttached) return;
  document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  document.removeEventListener("keydown", handleGlobalKeyDown, true);
  window.removeEventListener("resize", repositionActive);
  window.removeEventListener("scroll", repositionActive, true);
  window.visualViewport?.removeEventListener("resize", repositionActive);
  window.visualViewport?.removeEventListener("scroll", repositionActive);
  listenersAttached = false;
}

function hideTooltip(tooltip: HTMLElement): void {
  cancelHide(tooltip);
  tooltip.classList.remove("visible");
  delete tooltip.dataset.openCause;
  const button = activeHelp?.tooltip === tooltip
    ? activeHelp.button
    : tooltip.parentElement?.querySelector<HTMLButtonElement>(".inline-help");
  button?.setAttribute("aria-expanded", "false");
  if (activeHelp?.tooltip === tooltip) {
    activeHelp = undefined;
    detachGlobalListeners();
  }
  resetPosition(tooltip);
}

function closeActive(restoreFocus = false): void {
  const current = activeHelp;
  if (!current) return;
  if (restoreFocus && current.button.isConnected) current.button.focus();
  hideTooltip(current.tooltip);
}

function scheduleHide(tooltip: HTMLElement): void {
  if (tooltip.dataset.openCause === "click") return;
  cancelHide(tooltip);
  hideTimers.set(tooltip, window.setTimeout(() => hideTooltip(tooltip), HIDE_DELAY_MS));
}

function viewportBounds() {
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  return { bottom: top + height, height, left, right: left + width, top, width };
}

function positionTooltip(button: HTMLElement, tooltip: HTMLElement): void {
  resetPosition(tooltip);
  const viewport = viewportBounds();
  if (window.matchMedia?.("(max-width: 480px)").matches) {
    tooltip.style.setProperty("--inline-help-mobile-bottom", `${Math.max(0, window.innerHeight - viewport.bottom)}px`);
    tooltip.style.setProperty("--inline-help-mobile-height", `${viewport.height}px`);
    tooltip.style.setProperty("--inline-help-mobile-left", `${viewport.left}px`);
    tooltip.style.setProperty("--inline-help-mobile-width", `${viewport.width}px`);
    return;
  }
  const triggerRect = button.getBoundingClientRect();
  const availableWidth = Math.max(0, viewport.width - (VIEWPORT_MARGIN * 2));
  const availableHeight = Math.max(0, viewport.height - (VIEWPORT_MARGIN * 2));
  tooltip.style.maxWidth = `${availableWidth}px`;
  tooltip.style.maxHeight = `${availableHeight}px`;
  const tooltipRect = tooltip.getBoundingClientRect();
  const maxLeft = Math.max(
    viewport.left + VIEWPORT_MARGIN,
    viewport.right - tooltipRect.width - VIEWPORT_MARGIN,
  );
  const left = Math.min(
    Math.max(triggerRect.left, viewport.left + VIEWPORT_MARGIN),
    maxLeft,
  );
  const below = triggerRect.bottom + TOOLTIP_GAP;
  const above = triggerRect.top - tooltipRect.height - TOOLTIP_GAP;
  const maxTop = Math.max(
    viewport.top + VIEWPORT_MARGIN,
    viewport.bottom - tooltipRect.height - VIEWPORT_MARGIN,
  );
  const top = below + tooltipRect.height <= viewport.bottom - VIEWPORT_MARGIN
    ? below
    : above >= viewport.top + VIEWPORT_MARGIN
      ? above
      : Math.min(Math.max(below, viewport.top + VIEWPORT_MARGIN), maxTop);
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function repositionActive(): void {
  if (!activeHelp) return;
  if (!activeHelp.button.isConnected || !activeHelp.tooltip.isConnected) {
    closeActive();
    return;
  }
  positionTooltip(activeHelp.button, activeHelp.tooltip);
}

function handleOutsidePointerDown(event: Event): void {
  if (!activeHelp) return;
  const path = event.composedPath();
  if (path.includes(activeHelp.button) || path.includes(activeHelp.tooltip)) return;
  closeActive();
}

function handleGlobalKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape" || !activeHelp) return;
  event.preventDefault();
  event.stopPropagation();
  closeActive(true);
}

function attachGlobalListeners(): void {
  if (listenersAttached) return;
  document.addEventListener("pointerdown", handleOutsidePointerDown, true);
  document.addEventListener("keydown", handleGlobalKeyDown, true);
  window.addEventListener("resize", repositionActive);
  window.addEventListener("scroll", repositionActive, true);
  window.visualViewport?.addEventListener("resize", repositionActive);
  window.visualViewport?.addEventListener("scroll", repositionActive);
  listenersAttached = true;
}

function showTooltip(button: HTMLButtonElement, cause: OpenCause): void {
  const tooltip = tooltipFor(button);
  if (!tooltip) return;
  if (activeHelp?.tooltip !== tooltip) closeActive();
  cancelHide(tooltip);
  tooltip.dataset.openCause = cause;
  tooltip.classList.add("visible");
  button.setAttribute("aria-expanded", "true");
  activeHelp = { button, tooltip };
  attachGlobalListeners();
  positionTooltip(button, tooltip);
}

function handleClick(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  const button = event.currentTarget as HTMLButtonElement;
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
  text: string | readonly string[],
  options: { icon?: string; layout?: "default" | "constrained" } = {},
) {
  const buttonId = `${id}-trigger`;
  const blocks = typeof text === "string" ? undefined : text;
  return html`
    <span class="inline-help-wrapper">
      <button
        id=${buttonId}
        type="button"
        class="inline-help"
        aria-label=${label}
        aria-controls=${id}
        aria-describedby=${id}
        aria-expanded="false"
        @focus=${(event: FocusEvent) => showTooltip(event.currentTarget as HTMLButtonElement, "focus")}
        @focusout=${(event: FocusEvent) => {
          const button = event.currentTarget as HTMLButtonElement;
          const tooltip = tooltipFor(button);
          if (
            tooltip
            && tooltip.dataset.openCause !== "click"
            && !(event.relatedTarget instanceof Node && button.parentElement?.contains(event.relatedTarget))
          ) {
            hideTooltip(tooltip);
          }
        }}
        @pointerenter=${(event: PointerEvent) => showTooltip(event.currentTarget as HTMLButtonElement, "hover")}
        @pointerleave=${(event: PointerEvent) => {
          const tooltip = tooltipFor(event.currentTarget as HTMLElement);
          if (tooltip) scheduleHide(tooltip);
        }}
        @keydown=${handleGlobalKeyDown}
        @click=${handleClick}
      >
        <ha-icon icon=${options.icon ?? "mdi:information-outline"}></ha-icon>
      </button>
      <span
        id=${id}
        class=${`inline-help-tooltip${options.layout === "constrained" ? " constrained" : ""}`}
        role="tooltip"
        aria-labelledby=${buttonId}
        @pointerenter=${(event: PointerEvent) => cancelHide(event.currentTarget as HTMLElement)}
        @pointerleave=${(event: PointerEvent) => scheduleHide(event.currentTarget as HTMLElement)}
      >${blocks
        ? html`<span class="inline-help-tooltip-content">
            ${blocks.map((block) => html`<span class="inline-help-tooltip-block" role="paragraph">${block}</span>`)}
          </span>`
        : text}</span>
    </span>
  `;
}
