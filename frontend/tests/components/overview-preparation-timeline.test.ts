// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { OverviewPreparationTimeline } from "../../src/velair/components/overview-preparation-timeline-element";

afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Overview preparation marker and legend helpers", () => {
  it("reserves the inline time and name spacing before revealing a truncated first entry", async () => {
    const rect = (width: number) => ({ width } as DOMRect);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if (this.classList.contains("track")) return rect(152);
      if (this.classList.contains("sample")) return rect(160);
      if (this.classList.contains("start-time") || this.classList.contains("more")) return rect(60);
      return rect(0);
    });
    const element = new OverviewPreparationTimeline();
    element.points = ["a", "b"].map(entityId => ({ entityId, start: 100, progress: .5, color: "red" }));
    document.body.append(element); await element.updateComplete; await element.updateComplete;
    // The 80px left beside More cannot hold a 60px time plus the name and gaps.
    expect(element.visibleCount).toBe(0);
    expect(element.shadowRoot!.querySelectorAll(".legend .entry")).toHaveLength(0);
    element.trackWidth = 170; await element.updateComplete; await element.updateComplete;
    expect(element.visibleCount).toBe(1);
    element.shadowRoot!.querySelector<HTMLButtonElement>(".legend .more")!.click();
    await element.updateComplete;
    expect(element.shadowRoot!.querySelectorAll(".legend time")).toHaveLength(2);
  });
  it("shows and updates each preparation start time beside its room name, including expanded entries", async () => {
    const element = new OverviewPreparationTimeline();
    const start = Date.parse('2026-10-17T13:15:00Z');
    element.points = [{ entityId: 'climate.a', start, progress: .5, color: 'red' }, { entityId: 'climate.b', start: start + 3600000, progress: .8, color: 'blue' }];
    element.names = { 'climate.a': 'Living room' };
    element.startTimeLabel = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).format(value);
    document.body.append(element); await element.updateComplete;
    element.visibleCount = 1; await element.updateComplete;
    const first = element.shadowRoot!.querySelector('.legend .entry')!;
    expect(first.querySelector('.name')?.textContent).toBe('Living room');
    expect(first.querySelector('time')?.textContent).toBe('15:15');
    expect(first.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-17T13:15:00.000Z');
    element.shadowRoot!.querySelector<HTMLButtonElement>('.legend .more')!.click(); await element.updateComplete;
    expect([...element.shadowRoot!.querySelectorAll('.legend time')].map(time => time.textContent)).toEqual(['15:15', '16:15']);
    element.points = [{ ...element.points[0], start: start + 1800000 }]; await element.updateComplete;
    expect(element.shadowRoot!.querySelector('.legend time')?.textContent).toBe('15:45');
  });
  it.each([0, .001, .5, .999, 1])("keeps Now aligned with elapsed progress %s at track boundaries", async progress => {
    const element = new OverviewPreparationTimeline();
    document.body.append(element); await element.updateComplete;
    element.trackWidth = 300;
    element.progress = progress; await element.updateComplete;
    const root = element.shadowRoot!;
    const target = root.querySelector<HTMLElement>(".now")!;
    const mark = root.querySelector<HTMLElement>(".now-mark")!;
    expect(parseFloat(target.style.left) + parseFloat(mark.style.left) + 1).toBeCloseTo(progress * 300);
    expect(parseFloat(root.querySelector<HTMLElement>(".elapsed")!.style.width)).toBeCloseTo(progress * 100);
    expect(parseFloat(target.style.left)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(target.style.left) + 32).toBeLessThanOrEqual(300);
  });
  it("reclusters on resize, keeps full estimate help, and disconnects/reconnects its observer", async () => {
    let resize: ResizeObserverCallback;
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: ResizeObserverCallback) { resize = callback; }
      disconnect = disconnect;
      observe = observe;
    });
    const element = new OverviewPreparationTimeline();
    element.points = [
      { entityId: "climate.a", start: 100, progress: .5, color: "red" },
      { entityId: "climate.b", start: 200, progress: .58, color: "blue" },
    ];
    element.names = { "climate.a": "Living room" };
    element.estimateLabel = start => `Estimated preparation start: ${start}`;
    const navigate = vi.fn();
    element.addEventListener("click", navigate);
    document.body.append(element);
    await element.updateComplete;
    const setWidth = async (width: number) => {
      resize!([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver);
      await element.updateComplete;
    };
    await setWidth(200);
    expect(element.shadowRoot!.querySelectorAll(".point")).toHaveLength(1);
    expect(element.shadowRoot!.querySelector(".track")?.hasAttribute("title")).toBe(false);
    expect(element.shadowRoot!.querySelector(".point [title]")).toBeNull();
    expect(element.shadowRoot!.querySelector(".point .dot")?.getAttribute("style")).toContain("conic-gradient");
    const marker = element.shadowRoot!.querySelector<HTMLButtonElement>(".point button")!;
    marker.click();
    expect(marker.getAttribute("aria-expanded")).toBe("true");
    expect(navigate).not.toHaveBeenCalled();
    expect(marker.getAttribute("aria-label")).toContain("Living room: Estimated preparation start: 100");
    expect(marker.getAttribute("aria-label")).toContain("climate.b: Estimated preparation start: 200");
    const legend = element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".entry button");
    expect(legend).toHaveLength(2);
    legend[0].dispatchEvent(new FocusEvent("focus"));
    expect(legend[0].getAttribute("aria-expanded")).toBe("true");
    legend[1].click();
    expect(navigate).not.toHaveBeenCalled();
    await setWidth(800);
    expect(element.shadowRoot!.querySelectorAll(".point")).toHaveLength(2);
    expect(element.shadowRoot!.querySelectorAll(".legend .entry")).toHaveLength(2);
    element.remove();
    expect(disconnect).toHaveBeenCalled();
    document.body.append(element);
    await element.updateComplete;
    expect(observe).toHaveBeenCalledTimes(2);
  });
  it("removes markers and legend when the current projection has no eligible climates", async () => {
    const element = new OverviewPreparationTimeline();
    element.points = [{ entityId: "climate.a", start: 100, progress: .5, color: "red" }];
    document.body.append(element); await element.updateComplete;
    element.trackWidth = 300; await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".point")).not.toBeNull();
    element.points = []; await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".point, .legend")).toBeNull();
    expect(element.shadowRoot!.querySelector(".now")).not.toBeNull();
  });
  it("expands and collapses climates inline without navigation and retains room/Now help", async () => {
    const element = new OverviewPreparationTimeline();
    element.points = Array.from({ length: 10 }, (_, index) => ({ entityId: `climate.${index}`, start: index, progress: .5, color: `hsl(${index * 30} 70% 55%)` }));
    element.names = { "climate.1": "A very long room name" };
    element.nowLabel = "Now: 12:00";
    element.progress = .5;
    element.moreLabel = count => `+${count} climates`;
    element.collapseLabel = "Show less";
    element.estimateLabel = start => `Estimated start: ${start}`;
    document.body.append(element); await element.updateComplete;
    element.visibleCount = 1; await element.updateComplete;
    const root = element.shadowRoot!;
    const navigate = vi.fn(); element.addEventListener("click", navigate);
    const overflow = root.querySelector<HTMLButtonElement>(".legend button.more")!;
    expect(overflow.textContent).toBe("+9 climates");
    overflow.click();
    await element.updateComplete;
    expect(overflow.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelectorAll(".legend .entry")).toHaveLength(10);
    expect(overflow.textContent).toBe("Show less");
    expect(root.querySelector('.legend [data-entity-id="climate.1"] button')?.getAttribute("aria-label")).toContain("A very long room name: Estimated start: 1");
    expect(root.querySelector('.legend [data-entity-id="climate.1"] .dot')?.getAttribute("style")).toContain("hsl(30");
    expect(root.querySelector("#overview-preparation-more")).toBeNull();
    overflow.click(); await element.updateComplete;
    expect(overflow.getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelectorAll(".legend .entry")).toHaveLength(1);
    const now = root.querySelector<HTMLButtonElement>(".now button")!;
    now.click();
    expect(now.getAttribute("aria-label")).toBe("Now: 12:00");
    expect(now.getAttribute("aria-expanded")).toBe("true");
    expect(navigate).not.toHaveBeenCalled();
    element.trackWidth = 300; await element.updateComplete;
    expect(root.querySelector(".point button")?.getAttribute("aria-label")).toContain("Now: 12:00");
    expect(root.querySelector(".point button")?.getAttribute("aria-label")).toContain("Estimated start");
    element.expanded = true; await element.updateComplete;
    element.points = []; await element.updateComplete; await element.updateComplete;
    expect(element.expanded).toBe(false);
    expect(root.querySelector(".legend")).toBeNull();
  });
});
