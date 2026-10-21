// @vitest-environment jsdom

import { html, render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";

import { inlineHelpStyles } from "../../src/velair/styles/inline-help-styles";
import { renderInlineHelp } from "../../src/velair/views/inline-help";

afterEach(() => {
  document.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }));
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
  it("opens after a settled 500ms hover and cancels a fast pass", () => {
    vi.useFakeTimers();
    const { button, tooltip } = setup();
    button.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(499);
    expect(tooltip.classList).not.toContain("visible");
    button.dispatchEvent(new Event("pointerleave"));
    vi.advanceTimersByTime(1000);
    expect(tooltip.classList).not.toContain("visible");
    button.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(500);
    expect(tooltip.classList).toContain("visible");
  });

  it.each(["pointerleave", "pointercancel", "outside", "Escape", "scroll", "remove"])("cancels pending hover on %s", (action) => {
    vi.useFakeTimers();
    const { button, tooltip, container } = setup();
    button.dispatchEvent(new Event("pointerenter"));
    if (action === "outside") document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    else if (action === "Escape") document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    else if (action === "scroll") window.dispatchEvent(new Event("scroll"));
    else if (action === "remove") container.remove();
    else button.dispatchEvent(new Event(action));
    vi.advanceTimersByTime(600);
    expect(tooltip.classList).not.toContain("visible");
  });

  it("opens on touch click and keyboard focus immediately, with click remaining pinned", () => {
    vi.useFakeTimers();
    const { button, tooltip } = setup();
    const touch = new Event("pointerenter");
    Object.defineProperty(touch, "pointerType", { value: "touch" });
    button.dispatchEvent(touch);
    vi.advanceTimersByTime(600);
    expect(tooltip.classList).not.toContain("visible");
    button.click();
    expect(tooltip.dataset.openCause).toBe("click");
    button.dispatchEvent(new Event("pointerleave"));
    button.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(600);
    expect(tooltip.dataset.openCause).toBe("click");
    button.click();
    expect(tooltip.classList).not.toContain("visible");
    button.dispatchEvent(new FocusEvent("focus"));
    expect(tooltip.dataset.openCause).toBe("focus");
  });

  it("keeps keyboard help open while its button still has focus", () => {
    vi.useFakeTimers();
    const { button, tooltip } = setup();
    button.focus();
    button.dispatchEvent(new Event("pointerleave"));
    vi.advanceTimersByTime(600);
    expect(tooltip.classList).toContain("visible");
    button.blur();
    expect(tooltip.classList).not.toContain("visible");
  });

  it("replaces an earlier pending hover when moving to another help", () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    render(html`${renderInlineHelp("first-help", "First", "First text")}${renderInlineHelp("second-help", "Second", "Second text")}`, container);
    document.body.append(container);
    const buttons = container.querySelectorAll<HTMLButtonElement>("button");
    buttons[0].dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(250);
    buttons[1].dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(500);
    expect(buttons[0].getAttribute("aria-expanded")).toBe("false");
    expect(buttons[1].getAttribute("aria-expanded")).toBe("true");
  });

  it.each(["outside", "scroll", "Escape"])("still cancels the next hover on %s after the previous help closes", (action) => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    render(html`${renderInlineHelp("first-help", "First", "First text")}${renderInlineHelp("second-help", "Second", "Second text")}`, container);
    document.body.append(container);
    const buttons = container.querySelectorAll<HTMLButtonElement>("button");
    buttons[0].dispatchEvent(new FocusEvent("focus"));
    buttons[0].dispatchEvent(new Event("pointerleave"));
    buttons[1].dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(300);
    if (action === "outside") document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    else if (action === "scroll") window.dispatchEvent(new Event("scroll"));
    else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    vi.advanceTimersByTime(300);
    expect(buttons[1].getAttribute("aria-expanded")).toBe("false");
  });

  it("closes immediately, clears its position and recalculates on reopening", () => {
    vi.useFakeTimers();
    const { button, tooltip } = setup();
    const rect = vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      bottom: 100, height: 32, left: 40, right: 72, top: 68, width: 32,
      x: 40, y: 68, toJSON: () => ({}),
    });
    button.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(500);
    expect(tooltip.style.left).toBe("40px");
    expect(tooltip.style.top).toBe("100px");

    button.dispatchEvent(new Event("pointerleave"));
    expect(tooltip.classList).not.toContain("visible");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(tooltip.style.left).toBe("");
    expect(tooltip.style.top).toBe("");
    expect(inlineHelpStyles.cssText).not.toContain("transition:");

    rect.mockReturnValue({
      bottom: 140, height: 32, left: 80, right: 112, top: 108, width: 32,
      x: 80, y: 108, toJSON: () => ({}),
    });
    button.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(500);
    expect(tooltip.classList).toContain("visible");
    expect(tooltip.style.left).toBe("80px");
    expect(tooltip.style.top).toBe("140px");
  });

  it("keeps narrow-screen hover and tap adjacent at fractional coordinates", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const { button, tooltip } = setup();
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      bottom: 100.6, height: 32, left: 40, right: 72, top: 68.6, width: 32,
      x: 40, y: 68.6, toJSON: () => ({}),
    });
    button.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(500);
    expect(tooltip.style.top).toBe("100.6px");
    expect(tooltip.style.getPropertyValue("--inline-help-mobile-width")).toBe("");
    button.dispatchEvent(new MouseEvent("pointerleave", { relatedTarget: tooltip }));
    expect(tooltip.classList).toContain("visible");
    tooltip.dispatchEvent(new MouseEvent("pointerleave", { relatedTarget: document.body }));
    expect(tooltip.classList).not.toContain("visible");
    button.click();
    expect(tooltip.dataset.openCause).toBe("click");
    expect(tooltip.style.top).toBe("100.6px");
    expect(tooltip.style.getPropertyValue("--inline-help-mobile-width")).toBe("");
  });

  it("reuses the help engine over a disabled input without an icon or input interaction", () => {
    const container = document.createElement("div");
    const input = vi.fn();
    render(html`<div><label for="locked-time">Start</label><span class="linked-time-input"><input id="locked-time" type="time" value="07:00" disabled @input=${input}>${renderInlineHelp("locked-help", "Linked time", "Edit the template or unlink", { appearance: "overlay" })}</span></div>`, container);
    document.body.append(container);
    const button = container.querySelector<HTMLButtonElement>(".inline-help-overlay")!;
    const tooltip = container.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(button.querySelector("ha-icon")).toBeNull();
    expect(button.closest("label")).toBeNull();
    expect(button.getAttribute("aria-describedby")).toBe("locked-help");
    expect(button.getAttribute("aria-label")).toBe("Linked time");
    button.dispatchEvent(new FocusEvent("focus"));
    expect(tooltip.classList).toContain("visible");
    button.focus();
    expect(document.activeElement).toBe(button);
    button.click();
    expect(tooltip.dataset.openCause).toBe("click");
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(tooltip.classList).not.toContain("visible");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect((container.querySelector("input") as HTMLInputElement).value).toBe("07:00");
    expect(input).not.toHaveBeenCalled();
  });
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

    button.dispatchEvent(new FocusEvent("focus"));
    expect(tooltip.style.left).toBe("188px");
    expect(tooltip.style.maxWidth).toBe("min(var(--inline-help-max-width, 260px), 296px)");
    expect(tooltip.style.top).toBe("110px");
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
    button.dispatchEvent(new FocusEvent("focus"));
    expect(tooltip.style.left).toBe("12px");
    expect(tooltip.style.top).toBe("12px");
  });

  it("stays hoverable, toggles on click, and dismisses with Escape or focusout", () => {
    vi.useFakeTimers();
    const { button, tooltip } = setup();
    button.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(500);
    button.dispatchEvent(new MouseEvent("pointerleave", { relatedTarget: tooltip }));
    tooltip.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(400);
    expect(tooltip.classList).toContain("visible");
    tooltip.dispatchEvent(new MouseEvent("pointerleave", { relatedTarget: button }));
    expect(tooltip.classList).toContain("visible");
    tooltip.dispatchEvent(new MouseEvent("pointerleave", { relatedTarget: document.body }));
    expect(tooltip.classList).not.toContain("visible");

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

  it("uses pointer events and viewport-safe mobile insets without a bottom band", () => {
    const css = inlineHelpStyles.cssText;
    expect(css).toMatch(/\.inline-help-tooltip\.visible\s*\{[^}]*pointer-events:\s*auto/);
    expect(css).toMatch(/\.inline-help-tooltip\s*\{[^}]*max-height:\s*calc\(100dvh - 24px\)[^}]*position:\s*fixed/);
    expect(css).toContain("env(safe-area-inset-left, 0px)");
    expect(css).not.toContain("--inline-help-mobile-bottom");
    expect(css).not.toContain("top: auto");
  });

  it("supports accessible constrained multi-block content with its existing reading width", () => {
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

  });

  it.each([true, false])("clamps to a changing visual viewport with mobile=%s", (mobile) => {
    vi.stubGlobal("matchMedia", () => ({ matches: mobile }));
    const viewport = Object.assign(new EventTarget(), { offsetLeft: 20, offsetTop: 100, width: 250, height: 200 });
    vi.stubGlobal("visualViewport", viewport);
    const { button, tooltip } = setup();
    const trigger = vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      left: 260, right: 280, top: 260, bottom: 280, width: 20, height: 20,
    } as DOMRect);
    vi.spyOn(tooltip, "getBoundingClientRect").mockReturnValue({ width: 120, height: 60 } as DOMRect);
    button.click();
    expect(tooltip.style.left).toBe("138px");
    expect(tooltip.style.top).toBe("200px");
    viewport.height = 100;
    viewport.dispatchEvent(new Event("resize"));
    expect(tooltip.style.top).toBe(mobile ? "128px" : "200px");
    trigger.mockReturnValue({ left: 0, top: 70, bottom: 90 } as DOMRect);
    viewport.dispatchEvent(new Event("scroll"));
    expect(tooltip.style.left).toBe("32px");
    if (mobile) expect(tooltip.style.top).toBe("112px");
    else expect(tooltip.style.top).toBe("90px"); // Preserve the existing desktop calculation.
  });

  it("reserves mobile safe areas and clamps a tall explanation to the available height", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const { button, tooltip } = setup();
    tooltip.style.setProperty("--inline-help-safe-top", "44px");
    tooltip.style.setProperty("--inline-help-safe-bottom", "34px");
    tooltip.style.setProperty("--inline-help-safe-left", "30px");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 200 });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, bottom: 20 } as DOMRect);
    vi.spyOn(tooltip, "getBoundingClientRect").mockReturnValue({ width: 120, height: 122 } as DOMRect);
    button.click();
    expect(tooltip.style.maxHeight).toBe("122px");
    expect(tooltip.style.left).toBe("30px");
    expect(tooltip.style.top).toBe("44px");
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
