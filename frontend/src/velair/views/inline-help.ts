import { html, nothing } from "lit";

type OpenCause = "focus" | "hover" | "click";
type ActiveHelp = {
  button: HTMLElement;
  tooltip: HTMLElement;
};

const HOVER_DELAY_MS = 500;
let pendingHover: { button: HTMLElement; timer: number } | undefined;
const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 0;
let activeHelp: ActiveHelp | undefined;
let listenersAttached = false;
const gestureAnchors = new WeakSet<HTMLElement>();
const suppressedClicksUntil = new WeakMap<HTMLElement, number>();

function tooltipFor(button: HTMLElement): HTMLElement | null {
  const id = button.getAttribute("aria-controls");
  const root = button.getRootNode();
  if (id && "querySelectorAll" in root) {
    return [...(root as ParentNode).querySelectorAll<HTMLElement>(".inline-help-tooltip")].find((tooltip) => tooltip.id === id) ?? null;
  }
  return button.parentElement?.querySelector<HTMLElement>(".inline-help-tooltip") ?? null;
}

function cancelHover(button?: HTMLElement): void {
  if (!pendingHover || (button && pendingHover.button !== button)) return;
  window.clearTimeout(pendingHover.timer);
  pendingHover = undefined;
  if (!activeHelp) detachGlobalListeners();
}

/** Release only helpers owned by a retiring surface, including nested shadow roots. */
export function dismissInlineHelpWithin(owner: Node): void {
  const owns = (button: HTMLElement): boolean => {
    let node: Node | undefined = button;
    while (node) {
      if (node === owner || owner.contains(node)) return true;
      const root = node.getRootNode();
      node = root instanceof ShadowRoot ? root.host : undefined;
    }
    return false;
  };
  if (pendingHover && owns(pendingHover.button)) cancelHover(pendingHover.button);
  if (activeHelp && owns(activeHelp.button)) hideTooltip(activeHelp.tooltip);
}

/** A conditional render can remove an anchor without disconnecting its owner. */
export function dismissDisconnectedInlineHelp(): void {
  if (pendingHover && !pendingHover.button.isConnected) cancelHover(pendingHover.button);
  if (activeHelp && (!activeHelp.button.isConnected || !activeHelp.tooltip.isConnected)) hideTooltip(activeHelp.tooltip);
}

function scheduleHover(event: PointerEvent): void {
  const button = event.currentTarget as HTMLElement;
  if (event.pointerType === "touch" || (event.buttons ?? 0) || gestureAnchors.has(button)) return;
  const tooltip = tooltipFor(button);
  if (!tooltip) return;
  if (tooltip.classList.contains("visible")) return;
  cancelHover();
  pendingHover = { button, timer: window.setTimeout(() => {
    pendingHover = undefined;
    if (button.isConnected && tooltip.isConnected && !gestureAnchors.has(button)) showTooltip(button, "hover");
    else if (!activeHelp) detachGlobalListeners();
  }, HOVER_DELAY_MS) };
  attachGlobalListeners();
}

function leaveHelp(event: PointerEvent): void {
  const button = event.currentTarget as HTMLElement;
  cancelHover(button);
  const tooltip = tooltipFor(button);
  if (tooltip?.classList.contains("visible")) leaveTooltip(tooltip, event.relatedTarget);
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
  tooltip.classList.remove("visible");
  delete tooltip.dataset.openCause;
  const button = activeHelp?.tooltip === tooltip
    ? activeHelp.button
    : tooltip.parentElement?.querySelector<HTMLButtonElement>(".inline-help");
  button?.setAttribute("aria-expanded", "false");
  if (activeHelp?.tooltip === tooltip) {
    activeHelp = undefined;
    if (!pendingHover) detachGlobalListeners();
  }
  resetPosition(tooltip);
}

function closeActive(restoreFocus = false): void {
  const current = activeHelp;
  if (!current) return;
  if (restoreFocus && current.button.isConnected) current.button.focus();
  hideTooltip(current.tooltip);
}

function leaveTooltip(tooltip: HTMLElement, relatedTarget: EventTarget | null): void {
  if (tooltip.dataset.openCause === "click") return;
  if (tooltip.dataset.openCause === "focus" && activeHelp?.button.matches(":focus")) return;
  if (relatedTarget instanceof Node && (tooltip.contains(relatedTarget) || activeHelp?.button.contains(relatedTarget))) return;
  hideTooltip(tooltip);
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
  const mobile = window.matchMedia?.("(max-width: 480px)").matches;
  if (mobile) {
    const styles = getComputedStyle(tooltip);
    const safeInset = (edge: string) => Math.max(VIEWPORT_MARGIN,
      Number.parseFloat(styles.getPropertyValue(`--inline-help-safe-${edge}`)) || 0);
    // The shared placement code already reserves 12 px on each edge.
    viewport.left += safeInset("left") - VIEWPORT_MARGIN;
    viewport.right -= safeInset("right") - VIEWPORT_MARGIN;
    viewport.top += safeInset("top") - VIEWPORT_MARGIN;
    viewport.bottom -= safeInset("bottom") - VIEWPORT_MARGIN;
    viewport.width = Math.max(0, viewport.right - viewport.left);
    viewport.height = Math.max(0, viewport.bottom - viewport.top);
  }
  const triggerRect = button.getBoundingClientRect();
  const availableWidth = Math.max(0, viewport.width - (VIEWPORT_MARGIN * 2));
  const availableHeight = Math.max(0, viewport.height - (VIEWPORT_MARGIN * 2));
  // Respect the reading-width cap as well as the available viewport space.
  tooltip.style.maxWidth = `min(var(--inline-help-max-width, 260px), ${availableWidth}px)`;
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
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${mobile ? Math.min(Math.max(top, viewport.top + VIEWPORT_MARGIN), maxTop) : top}px`;
}

function repositionActive(): void {
  cancelHover();
  if (!activeHelp) return;
  if (!activeHelp.button.isConnected || !activeHelp.tooltip.isConnected) {
    closeActive();
    return;
  }
  positionTooltip(activeHelp.button, activeHelp.tooltip);
}

function handleOutsidePointerDown(event: Event): void {
  cancelHover();
  if (!activeHelp) return;
  const path = event.composedPath();
  if (path.includes(activeHelp.button) || path.includes(activeHelp.tooltip)) return;
  closeActive();
}

function handleGlobalKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  cancelHover();
  if (!activeHelp) return;
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

function showTooltip(button: HTMLElement, cause: OpenCause): void {
  cancelHover();
  const tooltip = tooltipFor(button);
  if (!tooltip) return;
  if (activeHelp?.tooltip !== tooltip) closeActive();
  tooltip.dataset.openCause = cause;
  tooltip.classList.add("visible");
  button.setAttribute("aria-expanded", "true");
  activeHelp = { button, tooltip };
  attachGlobalListeners();
  positionTooltip(button, tooltip);
}

/** Use the existing help lifecycle on an actual interactive element, without another hit area. */
export const inlineHelpAnchorHandlers = {
  focus: (event: FocusEvent) => {
    const anchor = event.currentTarget as HTMLElement;
    if (!gestureAnchors.has(anchor)) showTooltip(anchor, "focus");
  },
  focusout: (event: FocusEvent) => {
    const anchor = event.currentTarget as HTMLElement;
    cancelHover(anchor);
    const tooltip = tooltipFor(anchor);
    if (tooltip && tooltip.dataset.openCause !== "click" && !(event.relatedTarget instanceof Node && (anchor.contains(event.relatedTarget) || tooltip.contains(event.relatedTarget)))) hideTooltip(tooltip);
  },
  pointerenter: scheduleHover,
  pointerleave: leaveHelp,
  pointercancel: leaveHelp,
  click: (event: MouseEvent) => {
    if ((event.target as Element)?.closest?.(".timeline-resize-handle")) return;
    const anchor = event.currentTarget as HTMLElement;
    if ((suppressedClicksUntil.get(anchor) ?? 0) > Date.now()) return;
    const tooltip = tooltipFor(anchor);
    if (tooltip?.classList.contains("visible") && tooltip.dataset.openCause === "click") hideTooltip(tooltip);
    else showTooltip(anchor, "click");
  },
  keydown: (event: KeyboardEvent) => {
    if (event.key === "Escape") { handleGlobalKeyDown(event); return; }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inlineHelpAnchorHandlers.click(event as unknown as MouseEvent);
    }
  },
};

/** Closing details must not cancel the existing drag or resize gesture. */
export function dismissInlineHelpAnchor(event: Event): void {
  cancelHover();
  if (activeHelp && event.currentTarget instanceof Node && (activeHelp.button === event.currentTarget || activeHelp.button.contains(event.currentTarget))) closeActive();
  const element = event.currentTarget as HTMLElement;
  const anchor = element.closest<HTMLElement>(".timeline-block");
  if (!anchor) return;
  gestureAnchors.add(anchor);
  const finish = () => {
    gestureAnchors.delete(anchor);
    suppressedClicksUntil.set(anchor, Date.now() + 200);
    document.removeEventListener("pointerup", finish, true);
    document.removeEventListener("pointercancel", finish, true);
    anchor.removeEventListener("dragend", finish);
  };
  document.addEventListener("pointerup", finish, true);
  document.addEventListener("pointercancel", finish, true);
  anchor.addEventListener("dragend", finish, { once: true });
}

export function renderInlineHelpTooltip(id: string, anchorId: string, text: string | readonly string[], layout?: "default" | "constrained") {
  const blocks = typeof text === "string" ? undefined : text;
  return html`<span id=${id} class=${`inline-help-tooltip${layout === "constrained" ? " constrained" : ""}`} role="tooltip" aria-labelledby=${anchorId}
    @pointerleave=${(event: PointerEvent) => leaveTooltip(event.currentTarget as HTMLElement, event.relatedTarget)}
  >${blocks ? html`<span class="inline-help-tooltip-content">${blocks.map((block) => html`<span class="inline-help-tooltip-block" role="paragraph">${block}</span>`)}</span>` : text}</span>`;
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
  options: { icon?: string; layout?: "default" | "constrained"; appearance?: "default" | "overlay" } = {},
) {
  const buttonId = `${id}-trigger`;
  return html`
    <span class=${options.appearance === "overlay" ? "inline-help-wrapper inline-help-overlay-wrapper" : "inline-help-wrapper"}>
      <button
        id=${buttonId}
        type="button"
        class=${options.appearance === "overlay" ? "inline-help inline-help-overlay" : "inline-help"}
        aria-label=${label}
        aria-controls=${id}
        aria-describedby=${id}
        aria-expanded="false"
        @focus=${(event: FocusEvent) => showTooltip(event.currentTarget as HTMLButtonElement, "focus")}
        @focusout=${(event: FocusEvent) => {
          const button = event.currentTarget as HTMLButtonElement;
          cancelHover(button);
          const tooltip = tooltipFor(button);
          if (
            tooltip
            && tooltip.dataset.openCause !== "click"
            && !(event.relatedTarget instanceof Node && button.parentElement?.contains(event.relatedTarget))
          ) {
            hideTooltip(tooltip);
          }
        }}
        @pointerenter=${scheduleHover}
        @pointerleave=${leaveHelp}
        @pointercancel=${leaveHelp}
        @keydown=${handleGlobalKeyDown}
        @click=${handleClick}
      >
        ${options.appearance === "overlay" ? nothing : html`<ha-icon icon=${options.icon ?? "mdi:information-outline"}></ha-icon>`}
      </button>
      ${renderInlineHelpTooltip(id, buttonId, text, options.layout)}
    </span>
  `;
}
