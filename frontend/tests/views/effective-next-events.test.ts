// @vitest-environment jsdom
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { overviewEffectiveNextEvents } from "../../src/velair/controllers/overview-data";
import { renderNextEvents } from "../../src/velair/views/overview-view";
import { renderCardContent } from "../../src/velair/views/card-content";
import { en } from "../../src/velair/translations/en";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { EffectiveNextEvent, ScheduleEvent } from "../../src/velair/types";

const weekly: ScheduleEvent = { entity_id: "climate.office", when: "2026-10-12T17:15:00Z", temperature: 28, hvac_mode: "heat", weekday: "monday", start: "17:15" };
const forecast = (patch: Partial<EffectiveNextEvent> = {}): EffectiveNextEvent => ({ entity_id: weekly.entity_id, source: "planned_return", phase: "preparation", when: "2026-10-12T18:00:00Z", event: { ...weekly, temperature: 21 }, weekly_event: weekly, mode_id: "return", return_at: "2026-10-12T19:17:00Z", ...patch });
function host(rows?: EffectiveNextEvent[]): VelairViewHost {
  return { _data: { configured_entities: [weekly.entity_id], zones: {}, settings: {}, temperature_migration: { required: false }, global: { mode: "auto" }, next_events: [weekly], next_event: weekly,
    ...(rows !== undefined ? { next_effective_events: rows } : {}), modes: [{ key: "return", name: "Home" }], profiles: [] },
    _t: (key: keyof typeof en, values: Record<string, string> = {}) => Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, value), String(en[key] ?? key)),
    _formatDateTime: (value: string) => value,
    _formatEventAction: (event: ScheduleEvent) => event.action === "turn_off" ? "Turn off" : event.target_temp_low != null ? `${event.target_temp_low}–${event.target_temp_high}` : event.temperature != null ? `${event.temperature} °C` : "Mode/options change",
    _formatEventMode: (event: ScheduleEvent) => event.hvac_mode ?? "",
    _friendlyEntityName: () => "Office", _orderedZoneIds: (ids: string[]) => ids,
    _visibleZoneIds: (ids: string[]) => ids, _effectiveView: () => "overview-events", _selectedEntityId: () => weekly.entity_id,
  } as unknown as VelairViewHost;
}
function mounted(template: unknown) { const root = document.createElement("div"); render(template, root); return root; }
afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });
describe("effective next events in Overview and cards", () => {
  it("keeps heterogeneous events in one shared column grid inside the scroll container", () => {
    const root = mounted(renderNextEvents(host([
      forecast({ entity_id: "climate.weekly", source: "weekly_schedule", phase: "scheduled" }),
      forecast({ entity_id: "climate.preparing" }),
      forecast({ entity_id: "climate.arrival", phase: "arrival", event: null }),
      forecast({ entity_id: "climate.suspended", phase: "suspended", event: null, when: null }),
    ])));
    const grid = root.querySelector(".effective-event-list > .effective-event-grid");
    expect(grid?.querySelectorAll(":scope > .effective-event")).toHaveLength(4);
    for (const row of grid!.children) {
      expect(row.querySelectorAll(".effective-event-origin")).toHaveLength(1);
      expect(row.querySelectorAll(".event-time, .event-target, .event-mode")).toHaveLength(3);
      expect(row.querySelectorAll(".effective-event-help")).toHaveLength(1);
    }
  });
  it("uses the backend projection and identifies weekly reference without promoting it", () => {
    const view = host([forecast()]);
    const root = mounted(renderNextEvents(view));
    expect(root.querySelector('.effective-event[data-source="planned_return"]')).not.toBeNull();
    expect(root.querySelector(".effective-event-identity")?.textContent).toBe("Office");
    expect(root.querySelector(".effective-event-identity small")).toBeNull();
    expect(root.querySelector(".effective-event-origin")?.textContent).toBe("Return");
    expect(root.querySelector(".effective-event-body > .event-details")?.textContent).toContain("18:00");
    expect(root.querySelector(".effective-event-body > .event-details")?.textContent).toContain("19:17");
    expect(root.querySelector(".effective-event-help .inline-help-tooltip")?.textContent).toContain("28 °C");
    expect(root.querySelector(".effective-event-help .inline-help-tooltip")?.textContent).toContain("estimated preparation");
    expect(root.querySelector("details, .effective-weekly-reference")).toBeNull();
    expect(overviewEffectiveNextEvents(view as never)[0].phase).toBe("preparation");
  });
  it("treats empty projection as authoritative and falls back only when absent", () => {
    expect(mounted(renderNextEvents(host([]))).textContent).toContain(en.noUpcomingEvent);
    expect(mounted(renderNextEvents(host([]))).textContent).not.toContain("28 °C");
    expect(overviewEffectiveNextEvents(host([]) as never)).toEqual([]);
    expect(mounted(renderNextEvents(host())).textContent).toContain("28 °C");
    expect(overviewEffectiveNextEvents(host() as never)[0].source).toBe("weekly_schedule");
  });
  it("shows suspensions with explanatory expiry, not a blocked command or promised start", () => {
    const root = mounted(renderNextEvents(host([forecast({ phase: "suspended", when: null, event: null, reason: "boost", blocked_until: "2026-10-12T18:30:00Z" })])));
    expect(root.querySelector(".event-time")?.textContent).toBe("Suspended");
    expect(root.querySelector(".effective-event-help .inline-help-tooltip")?.textContent).toContain("18:30");
    expect(root.querySelector(".event-target")?.textContent).toBe("—");
    expect(root.querySelector(".event-mode")?.textContent).toBe("—");
    expect(root.querySelector(".effective-event-help .inline-help-tooltip")?.textContent).toContain("not a guaranteed preparation start");
  });
  it("renders arrival control changes without manufacturing a temperature and preserves event actions", () => {
    const row = forecast({ phase: "arrival", when: "2026-10-12T19:17:00Z", event: null });
    const root = mounted(renderNextEvents(host([row])));
    expect(root.querySelector(".event-target")?.textContent).toBe("Apply Mode");
    expect(root.querySelector(".event-mode")?.textContent).toBe("—");
    expect(root.querySelector(".effective-event-help .inline-help-tooltip")?.textContent).toContain("Arrival Mode: Home");
    for (const event of [{ ...weekly, action: "turn_off" }, { ...weekly, temperature: null, target_temp_low: 19, target_temp_high: 24, hvac_mode: "heat_cool" }, { ...weekly, temperature: 24, hvac_mode: "cool" }, { ...weekly, temperature: null, fan_mode: "auto" }]) {
      const output = mounted(renderNextEvents(host([forecast({ ...row, event })])));
      expect(output.querySelector(".effective-event-body > .event-details")?.textContent).toContain("19:17");
      expect(output.querySelector(".effective-event-body > .event-details")?.textContent).not.toContain("17:15");
    }
  });
  it("does not duplicate weekly context for a weekly winner and filters selected card zones", () => {
    const rows = [forecast({ source: "weekly_schedule", phase: "scheduled", when: weekly.when, event: weekly }), forecast({ entity_id: "climate.other" })];
    const root = mounted(renderNextEvents(host(rows), [weekly.entity_id]));
    expect(root.querySelectorAll(".effective-event")).toHaveLength(1);
    expect(root.querySelector(".effective-weekly-reference")).toBeNull();
    expect(root.textContent).toContain("Weekly schedule");
  });
  it("uses the identical projection in the overview-events Lovelace card", () => {
    const root = mounted(renderCardContent(host([forecast()])));
    expect(root.querySelector('.effective-event[data-source="planned_return"]')).not.toBeNull();
    expect(root.querySelector(".effective-event-body > .event-details")?.textContent).toContain("21 °C");
    expect(root.querySelector(".effective-event-help .inline-help-tooltip")?.textContent).toContain("28 °C");
  });
  it("uses the identical compact row for old backends and weekly winners", () => {
    const legacy = mounted(renderNextEvents(host()));
    const modern = mounted(renderNextEvents(host([forecast({ source: "weekly_schedule", phase: "scheduled", when: weekly.when, event: weekly })])));
    for (const root of [legacy, modern]) {
      expect(root.querySelectorAll(".effective-event")).toHaveLength(1);
      expect(root.querySelector(".effective-event-origin")?.textContent).toBe("Schedule");
      expect(root.querySelector(".effective-event-identity small")).toBeNull();
      expect(root.querySelectorAll(".effective-event-help button")).toHaveLength(1);
    }
  });
  it("opens complete help by hover, focus and click without propagating navigation", () => {
    vi.useFakeTimers();
    const root = mounted(renderNextEvents(host([forecast()]))); document.body.append(root);
    const button = root.querySelector<HTMLButtonElement>(".effective-event-help button")!;
    const tooltip = root.querySelector<HTMLElement>(".inline-help-tooltip")!;
    const navigate = vi.fn(); root.addEventListener("click", navigate);
    button.dispatchEvent(new Event("pointerenter")); vi.advanceTimersByTime(500);
    expect(tooltip.classList.contains("visible")).toBe(true);
    button.dispatchEvent(new FocusEvent("focus"));
    expect(button.getAttribute("aria-expanded")).toBe("true");
    button.click();
    expect(navigate).not.toHaveBeenCalled();
    expect(tooltip.textContent).toContain("Arrival Mode: Home");
    expect(tooltip.textContent).toContain("17:15");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
