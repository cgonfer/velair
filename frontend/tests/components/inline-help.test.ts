// @vitest-environment jsdom

import { html, render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";

import { inlineHelpStyles } from "../../src/velair/styles/inline-help-styles";
import { renderInlineHelp } from "../../src/velair/views/inline-help";

afterEach(() => {
  document.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }));
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setup() {
  const container = document.createElement("div");
  render(renderInlineHelp("policy-help", "About this setting", "Future sessions only"), container);
  document.body.append(container);
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
    expect(button.getAttribute("aria-controls")).toBe("policy-help");
    expect(button.getAttribute("aria-expanded")).toBe("false");
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
    button.dispatchEvent(new FocusEvent("focusout"));
    expect(tooltip.classList).toContain("visible");
    button.click();
    expect(tooltip.classList).not.toContain("visible");

    button.dispatchEvent(new FocusEvent("focus"));
    expect(tooltip.classList).toContain("visible");
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(tooltip.classList).not.toContain("visible");
    button.dispatchEvent(new FocusEvent("focus"));
    button.dispatchEvent(new FocusEvent("focusout"));
    expect(tooltip.classList).not.toContain("visible");
  });

  it("uses pointer events and a viewport-safe fixed mobile band", () => {
    const css = inlineHelpStyles.cssText;
    expect(css).toMatch(/\.inline-help-tooltip\.visible\s*\{[^}]*pointer-events:\s*auto/);
    expect(css).toMatch(/\.inline-help-tooltip\s*\{[^}]*max-height:\s*calc\(100dvh - 24px\)[^}]*position:\s*fixed/);
    expect(css).toMatch(/@media \(max-width: 480px\)[\s\S]*\.inline-help-tooltip,[\s\S]*\.inline-help-tooltip\.constrained\s*\{[^}]*bottom:\s*calc\(var\(--inline-help-mobile-bottom, 0px\) \+ max\(12px, env\(safe-area-inset-bottom\)\)\)/);
    expect(css).toContain("var(--inline-help-mobile-width, 100dvw)");
    expect(css).toContain("env(safe-area-inset-left)");
  });

  it("supports accessible constrained multi-block content without changing the mobile band", () => {
    const container = document.createElement("div");
    render(renderInlineHelp(
      "adjusted-humidity-help",
      "Adjusted outdoor humidity",
      ["First explanation.", "Second explanation."],
      { layout: "constrained" },
    ), container);
    const tooltip = container.querySelector<HTMLElement>('[role="tooltip"]')!;
    const blocks = tooltip.querySelectorAll('[role="paragraph"]');

    expect(tooltip.classList).toContain("constrained");
    expect(blocks).toHaveLength(2);
    expect(Array.from(blocks, (block) => block.textContent)).toEqual([
      "First explanation.",
      "Second explanation.",
    ]);
    expect(inlineHelpStyles.cssText).toMatch(
      /\.inline-help-tooltip\.constrained\s*\{[^}]*max-width:\s*min\(236px, calc\(100dvw - 24px\)\);[^}]*width:\s*min\(236px, calc\(100dvw - 24px\)\);/,
    );
    expect(inlineHelpStyles.cssText).toMatch(
      /@media \(max-width: 480px\)[\s\S]*\.inline-help-tooltip,[\s\S]*\.inline-help-tooltip\.constrained\s*\{[^}]*width:\s*calc\(/,
    );
  });

  it("uses one real 32px button without an overlapping pseudo hit area", () => {
    const css = inlineHelpStyles.cssText;
    expect(css).toMatch(
      /\.inline-help\s*\{[^}]*height:\s*32px;[^}]*width:\s*32px;/s,
    );
    expect(css).not.toContain(".inline-help::before");
    expect(css).not.toContain("@media (pointer: coarse)");
    expect(css).not.toMatch(/margin[^;]*:\s*-\d/);
    expect(css).not.toContain(".inline-help.compact");
  });

  it("keeps only one help open and closes it from outside clicks", () => {
    const container = document.createElement("div");
    render(html`${renderInlineHelp("first-help", "First", "First text")}${renderInlineHelp("second-help", "Second", "Second text")}`, container);
    document.body.append(container);
    const buttons = container.querySelectorAll<HTMLButtonElement>("button");

    buttons[0].click();
    expect(buttons[0].getAttribute("aria-expanded")).toBe("true");
    buttons[1].click();
    expect(buttons[0].getAttribute("aria-expanded")).toBe("false");
    expect(buttons[1].getAttribute("aria-expanded")).toBe("true");

    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }));
    expect(buttons[1].getAttribute("aria-expanded")).toBe("false");
  });
});
