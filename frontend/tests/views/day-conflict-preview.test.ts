// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { renderDayScheduleConflict } from "../../src/velair/views/day-layout-controls";
import { en } from "../../src/velair/translations/en";
import { WEEKDAYS } from "../../src/velair/constants";

const host = { _t: (key: string) => key, _weekdayName: (day: string) => day, _shortWeekdayName: (day: string) => day.slice(0, 3) };
describe("read-only candidate previews", () => {
  it("shows compact mode-specific intervals and transient full details without editing", () => {
    const container = document.createElement("div");
    const onChoose = vi.fn();
    const items = [
      { start: "08:00", block: { start: "08:00", hvac_mode: "heat", temperature: 21 }, time: "8 AM", description: "Heat · 21 °C" },
      { start: "10:00", block: { start: "10:00", hvac_mode: "cool", temperature: 24 }, time: "10 AM", description: "Cool · 24 °C" },
      { start: "12:00", block: { start: "12:00", action: "turn_off" }, time: "12 PM", description: "Off" },
      { start: "14:00", block: { start: "14:00", hvac_mode: "heat_cool", target_temp_low: 18, target_temp_high: 25 }, time: "2 PM", description: "Heat/Cool · 18–25 °C" },
      { start: "16:00", block: { start: "16:00", action: "set_climate_options", fan_mode: "quiet" }, time: "4 PM", description: "Fan: quiet" },
    ];
    render(renderDayScheduleConflict(host as never, { days: WEEKDAYS, fingerprint: () => "same", blockCount: () => items.length, blocks: () => items, onChoose }), container);
    expect(container.querySelectorAll(".day-conflict-row")).toHaveLength(1);
    const segments = [...container.querySelectorAll<HTMLElement>(".day-conflict-timeline .overview-timeline-block")];
    expect(segments.map(item => [...item.classList].find(name => name.startsWith("mode-")))).toEqual(["mode-heat", "mode-cool", "mode-off", "mode-heat-cool", "mode-keep"]);
    expect(parseFloat(segments[0].style.left)).toBeCloseTo(100 / 3);
    expect(container.querySelectorAll(".day-conflict-block-summary, details")).toHaveLength(0);
    expect(container.querySelectorAll(".inline-help-tooltip-block")).toHaveLength(5);
    expect(container.querySelector(".inline-help-tooltip")?.textContent).toContain("18–25 °C");
    expect(container.querySelector(".inline-help-tooltip")?.textContent).toContain("Fan: quiet");
    expect(container.querySelectorAll(".day-conflict-timeline button, .day-conflict-timeline [tabindex], input")).toHaveLength(0);
    container.querySelector<HTMLButtonElement>(".day-conflict-inspector button")!.click();
    expect(onChoose).not.toHaveBeenCalled();
    expect(items[0].start).toBe("08:00");
    container.querySelector<HTMLElement>('[role="radio"]')!.click();
    expect(onChoose).toHaveBeenCalledWith("monday");
  });
  it("shares Overview target and mode typography and bounds tiny read-only intervals", () => {
    const container = document.createElement("div");
    const items = [
      { start: "06:00", time: "6 AM", description: "Heat/Cool · 18–25 °C · Fan: quiet", block: { start: "06:00", hvac_mode: "heat_cool", target_temp_low: 18, target_temp_high: 25 }, graphic: { label: "18–25 °C", mode: "Heat/Cool", options: [{ short: "Fan: quiet" }], templateKey: "full", presetKey: "comfort" } },
      { start: "23:59", time: "11:59 PM", description: "Off", block: { start: "23:59", action: "turn_off" }, graphic: { label: "Off" } },
    ];
    render(renderDayScheduleConflict(host as never, { days: ["monday"], fingerprint: () => "same", blockCount: () => 2, blocks: () => items, onChoose: vi.fn() }), container);
    const segments = container.querySelectorAll<HTMLElement>(".overview-timeline-block");
    expect([...container.querySelectorAll(".timeline-hours > span")].map(item => item.textContent)).toEqual(["00", "06", "12", "18", "24"]);
    expect(segments[0].querySelector(".overview-timeline-block-main > span")?.textContent).toBe("18–25 °C");
    expect(segments[0].querySelector("small")?.textContent).toBe("Heat/Cool");
    expect(container.querySelector(".inline-help-tooltip")?.textContent).toContain("Fan: quiet");
    expect(container.querySelector(".inline-help-tooltip")?.textContent).toContain("comfort");
    expect(segments[1].classList.contains("tiny")).toBe(true);
    expect(parseFloat(segments[1].style.left) + parseFloat(segments[1].style.width)).toBeLessThanOrEqual(100);
    expect(segments[1].title).toContain("11:59 PM · Off");
    expect(container.querySelectorAll(".timeline-resize-handle, .overview-timeline-track [tabindex], .overview-timeline-track [draggable], .overview-timeline-track button, .timeline-carry-over")).toHaveLength(0);
  });
  it("supports radio arrow and activation keys without details selecting a candidate", () => {
    const container = document.createElement("div");
    const onChoose = vi.fn();
    let selectedDay: string | undefined;
    const blocks = Array.from({ length: 4 }, (_, index) => ({ start: `${8 + index}:00`, time: `${8 + index}:00`, description: "Heat 21", block: { start: `${8 + index}:00`, temperature: 21, hvac_mode: "heat" } }));
    const refresh = () => render(renderDayScheduleConflict(host as never, { days: ["monday", "tuesday"], selectedDay, fingerprint: day => day, blockCount: () => 4, blocks: () => blocks, onChoose: day => { onChoose(day); selectedDay = day; refresh(); } }), container);
    refresh();
    expect(container.querySelector(".day-conflict-selection-mark")).toBeNull();
    const summary = container.querySelector<HTMLElement>(".day-conflict-inspector button")!;
    summary.click(); summary.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(onChoose).not.toHaveBeenCalled();
    container.querySelector<HTMLElement>('[role="radio"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(selectedDay).toBe("tuesday");
    expect(container.querySelectorAll('[role="radio"][aria-checked="true"]')).toHaveLength(1);
    expect(container.querySelectorAll(".day-conflict-row.selected")).toHaveLength(1);
    expect(container.querySelector(".day-conflict-row.selected [role=radio]")?.getAttribute("aria-label")).toContain("tuesday");
    container.querySelector<HTMLElement>('[role="radio"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(selectedDay).toBe("monday");
    expect(container.querySelectorAll(".day-conflict-row.selected")).toHaveLength(1);
    expect(container.querySelector(".day-conflict-row.selected [role=radio]")?.getAttribute("aria-label")).toContain("monday");
    expect(container.querySelectorAll('[role="radio"] button, [role="radio"] details, [role="radio"] input')).toHaveLength(0);
  });
  it("explains equal-looking raw dependencies while keeping other climate options distinct", () => {
    const container = document.createElement("div");
    const translated = { ...host, _t: (key: string) => en[key as keyof typeof en] ?? key };
    const blocks = (day: string) => [{ start: "08:00", time: "8 AM", description: "Heat 21 °C", block: { start: "08:00", temperature: 21, hvac_mode: "heat", ...(day === "thursday" ? { fan_mode: "high" } : {}) }, presetLabel: day === "monday" ? "Comfort" : day === "tuesday" ? "Eco" : undefined, graphic: { label: "21 °C", mode: "Heat", presetKey: day === "monday" ? "internal-comfort" : day === "tuesday" ? "internal-eco" : undefined } }];
    render(renderDayScheduleConflict(translated as never, { days: WEEKDAYS.slice(0, 4), fingerprint: day => day, blockCount: () => 1, blocks, onChoose: vi.fn() }), container);
    const rows = [...container.querySelectorAll(".day-conflict-row")];
    expect(rows).toHaveLength(4);
    expect(rows[0].querySelector(".day-conflict-link")?.textContent).toContain("Comfort");
    expect(rows[1].querySelector(".day-conflict-link")?.textContent).toContain("Eco");
    expect(rows[2].querySelector(".day-conflict-link")?.textContent).toBe("Independent schedule");
    expect(rows[3].querySelector(".day-conflict-link")).toBeNull();
    expect(rows[0].querySelector(".day-conflict-link")?.textContent).not.toContain("internal-");
  });
  it("separates genuinely empty alternatives from unavailable links without zero-count clutter", () => {
    const container = document.createElement("div");
    const translated = { ...host, _t: (key: string) => en[key as keyof typeof en] ?? key };
    const onChoose = vi.fn();
    render(renderDayScheduleConflict(translated as never, { days: ["monday", "tuesday"], fingerprint: day => day, blockCount: () => 0, blocks: () => [], emptyMessage: day => day === "tuesday" ? "Template unavailable" : undefined, onChoose }), container);
    const rows = [...container.querySelectorAll(".day-conflict-row")];
    expect(rows[0].querySelector(".day-conflict-empty")?.textContent).toBe("No own blocks");
    expect(rows[0].querySelector(".inline-help-tooltip")?.textContent).toContain("not an off command");
    expect(rows[1].querySelector(".day-conflict-empty")?.textContent).toBe("Template unavailable");
    expect(rows[1].textContent).not.toContain("No own blocks");
    expect(container.querySelectorAll(".day-conflict-count")).toHaveLength(0);
    expect(onChoose).not.toHaveBeenCalled();
  });
  it("opens complete inspection on keyboard focus or tap and closes without choosing", () => {
    const container = document.createElement("div"); document.body.append(container);
    const onChoose = vi.fn();
    render(renderDayScheduleConflict(host as never, { days: ["monday"], fingerprint: () => "same", blockCount: () => 1, blocks: () => [{ start: "23:59", time: "11:59 PM", description: "Cool 24 °C · Fan: quiet" }], onChoose }), container);
    const button = container.querySelector<HTMLButtonElement>(".day-conflict-inspector button")!;
    button.focus();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".inline-help-tooltip.visible")?.textContent).toContain("11:59 PM — Cool 24 °C · Fan: quiet");
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(button.getAttribute("aria-expanded")).toBe("false");
    button.click(); expect(button.getAttribute("aria-expanded")).toBe("true");
    button.click(); expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(onChoose).not.toHaveBeenCalled();
    expect(container.querySelector('[role="radio"]')?.getAttribute("aria-checked")).toBe("false");
    container.remove();
  });
  it("describes radio values and returns focus to the checked option if selection is cancelled", () => {
    const container = document.createElement("div"); document.body.append(container);
    const onChoose = vi.fn(() => false);
    const options = { days: ["monday", "tuesday"], selectedDay: "monday", fingerprint: (day: string) => day, blockCount: () => 1, blocks: () => [{ start: "08:00", time: "8 AM", description: "Cool 24 °C", block: { start: "08:00", hvac_mode: "cool", temperature: 24 } }], onChoose };
    render(renderDayScheduleConflict(host as never, options), container);
    const radios = container.querySelectorAll<HTMLElement>('[role="radio"]');
    const description = container.querySelector<HTMLElement>(`#${radios[0].getAttribute("aria-describedby")!.split(" ")[1]}`)!;
    expect(description.textContent).toContain("Cool 24 °C");
    radios[0].focus(); radios[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(radios[0]);
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    container.remove();
  });

});
