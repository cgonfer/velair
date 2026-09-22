// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import {
  cancelHorizontalDrag,
  endHorizontalDrag,
  horizontalDragClickGuard,
  moveHorizontalDrag,
  startHorizontalDrag,
} from "../../src/velair/controllers/horizontal-drag-scroll";

function pointer(type: string, clientX: number, pointerType = "mouse"): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX,
    isPrimary: true,
    pointerId: 7,
    pointerType,
  });
}

function draggableRow() {
  const row = document.createElement("div");
  const button = document.createElement("button");
  row.append(button);
  row.scrollLeft = 100;
  row.addEventListener("pointerdown", startHorizontalDrag);
  row.addEventListener("pointermove", moveHorizontalDrag);
  row.addEventListener("pointerup", endHorizontalDrag);
  row.addEventListener("pointercancel", cancelHorizontalDrag);
  row.addEventListener("click", horizontalDragClickGuard, { capture: true });
  return { row, button };
}

describe("horizontal drag scrolling", () => {
  it("scrolls with a mouse drag and suppresses the action click", () => {
    const { row, button } = draggableRow();
    const action = vi.fn();
    button.addEventListener("click", action);

    button.dispatchEvent(pointer("pointerdown", 100));
    button.dispatchEvent(pointer("pointermove", 70));
    expect(row.scrollLeft).toBe(130);
    expect(row.classList.contains("horizontal-dragging")).toBe(true);
    button.dispatchEvent(pointer("pointerup", 70));
    button.click();

    expect(action).not.toHaveBeenCalled();
    expect(row.classList.contains("horizontal-dragging")).toBe(false);
  });

  it("preserves a normal click below the drag threshold", () => {
    const { button } = draggableRow();
    const action = vi.fn();
    button.addEventListener("click", action);

    button.dispatchEvent(pointer("pointerdown", 100));
    button.dispatchEvent(pointer("pointermove", 98));
    button.dispatchEvent(pointer("pointerup", 98));
    button.click();

    expect(action).toHaveBeenCalledOnce();
  });

  it("leaves touch movement to native momentum scrolling", () => {
    const { row, button } = draggableRow();
    button.dispatchEvent(pointer("pointerdown", 100, "touch"));
    button.dispatchEvent(pointer("pointermove", 60, "touch"));
    button.dispatchEvent(pointer("pointerup", 60, "touch"));

    expect(row.scrollLeft).toBe(100);
    expect(row.classList.contains("horizontal-dragging")).toBe(false);
  });
});
