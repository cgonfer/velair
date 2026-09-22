type HorizontalDragState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  dragging: boolean;
};

const DRAG_THRESHOLD_PX = 5;
const dragStates = new WeakMap<HTMLElement, HorizontalDragState>();
const suppressNextClick = new WeakSet<HTMLElement>();

export function startHorizontalDrag(event: PointerEvent): void {
  if (event.pointerType === "touch" || event.button !== 0 || !event.isPrimary) return;
  const scroller = event.currentTarget as HTMLElement;
  dragStates.set(scroller, {
    pointerId: event.pointerId,
    startX: event.clientX,
    startScrollLeft: scroller.scrollLeft,
    dragging: false,
  });
}

export function moveHorizontalDrag(event: PointerEvent): void {
  const scroller = event.currentTarget as HTMLElement;
  const state = dragStates.get(scroller);
  if (!state || state.pointerId !== event.pointerId) return;
  const distance = event.clientX - state.startX;
  if (!state.dragging && Math.abs(distance) < DRAG_THRESHOLD_PX) return;
  if (!state.dragging) {
    state.dragging = true;
    scroller.classList.add("horizontal-dragging");
    try {
      scroller.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is an enhancement; document-level pointer delivery is not required.
    }
  }
  scroller.scrollLeft = state.startScrollLeft - distance;
  event.preventDefault();
}

export function endHorizontalDrag(event: PointerEvent): void {
  finishHorizontalDrag(event, true);
}

export function cancelHorizontalDrag(event: PointerEvent): void {
  finishHorizontalDrag(event, false);
}

function finishHorizontalDrag(event: PointerEvent, mayClick: boolean): void {
  const scroller = event.currentTarget as HTMLElement;
  const state = dragStates.get(scroller);
  if (!state || state.pointerId !== event.pointerId) return;
  if (state.dragging && mayClick) {
    suppressNextClick.add(scroller);
    window.setTimeout(() => suppressNextClick.delete(scroller), 0);
  }
  scroller.classList.remove("horizontal-dragging");
  try {
    if (scroller.hasPointerCapture?.(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
  } catch {
    // The browser may release capture automatically before this handler runs.
  }
  dragStates.delete(scroller);
}

export const horizontalDragClickGuard = {
  capture: true,
  handleEvent(event: Event): void {
    const scroller = event.currentTarget as HTMLElement;
    if (!suppressNextClick.has(scroller)) return;
    suppressNextClick.delete(scroller);
    event.preventDefault();
    event.stopImmediatePropagation();
  },
};
