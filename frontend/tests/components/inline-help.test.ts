// @vitest-environment jsdom

import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";

import { inlineHelpStyles } from "../../src/velair/styles/inline-help-styles";
import { renderInlineHelp } from "../../src/velair/views/inline-help";

afterEach(() => vi.useRealTimers());

function setup() {
  const container = document.createElement("div");
  render(renderInlineHelp("policy-help", "About this setting", "Future sessions only"), container);
  return {
    button: container.querySelector("button")!,
    container,
    tooltip: container.querySelector<HTMLElement>('[role="tooltip"]')!,
  };
}

describe("inline help", () => {
  it("links a real button to its tooltip without dialog state", () => {
    const { button, container, tooltip } = setup();
    expect(button.getAttribute("aria-describedby")).toBe("policy-help");
    expect(button.getAttribute("aria-label")).toBe("About this setting");
    expect(tooltip.id).toBe("policy-help");
    expect(tooltip.textContent).toBe("Future sessions only");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("clamps desktop placement to every viewport edge", () => {
    const { button, tooltip } = setup();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 200 });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      bottom: 190, height: 20, left: 300, right: 320, top: 170, width: 20,
      x: 300, y: 170, toJSON: () => ({}),
    });
    vi.spyOn(tooltip, "getBoundingClientRect").mockReturnValue({
      bottom: 60, height: 60, left: 0, right: 120, top: 0, width: 120,
      x: 0, y: 0, toJSON: () => ({}),
    });

    button.dispatchEvent(new Event("pointerenter"));
    expect(tooltip.style.left).toBe("188px");
    expect(tooltip.style.top).toBe("104px");
    expect(Number.parseInt(tooltip.style.left) + 120).toBeLessThanOrEqual(308);
    expect(Number.parseInt(tooltip.style.top) + 60).toBeLessThanOrEqual(188);

    vi.mocked(button.getBoundingClientRect).mockReturnValue({
      bottom: 22, height: 20, left: -8, right: 12, top: 2, width: 20,
      x: -8, y: 2, toJSON: () => ({}),
    });
    vi.mocked(tooltip.getBoundingClientRect).mockReturnValue({
      bottom: 176, height: 176, left: 0, right: 120, top: 0, width: 120,
      x: 0, y: 0, toJSON: () => ({}),
    });
    button.dispatchEvent(new Event("pointerenter"));
    expect(tooltip.style.left).toBe("12px");
    expect(tooltip.style.top).toBe("12px");
  });

  it("stays hoverable, toggles on click, and dismisses with Escape or focusout", () => {
    vi.useFakeTimers();
    const { button, tooltip } = setup();
    button.dispatchEvent(new Event("pointerenter"));
    button.dispatchEvent(new Event("pointerleave"));
    tooltip.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(400);
    expect(tooltip.classList).toContain("visible");

    button.click();
    expect(tooltip.classList).toContain("visible");
    button.click();
    expect(tooltip.classList).not.toContain("visible");

    button.dispatchEvent(new FocusEvent("focus"));
    expect(tooltip.classList).toContain("visible");
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    expect(tooltip.classList).not.toContain("visible");
    button.dispatchEvent(new FocusEvent("focus"));
    button.dispatchEvent(new FocusEvent("focusout"));
    expect(tooltip.classList).not.toContain("visible");
  });

  it("uses pointer events and a viewport-safe fixed mobile band", () => {
    const css = inlineHelpStyles.cssText;
    expect(css).toMatch(/\.inline-help-tooltip\.visible\s*\{[^}]*pointer-events:\s*auto/);
    expect(css).toMatch(/\.inline-help-tooltip\s*\{[^}]*max-height:\s*calc\(100dvh - 24px\)[^}]*position:\s*fixed/);
    expect(css).toMatch(/@media \(max-width: 480px\)[\s\S]*\.inline-help-tooltip\s*\{[^}]*bottom:\s*12px[^}]*inset-inline:\s*12px[^}]*max-height:\s*min\(40dvh, 180px\)[^}]*position:\s*fixed/);
  });
});
