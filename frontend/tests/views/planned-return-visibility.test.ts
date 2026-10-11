// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { PlannedReturnStatus, PlannedReturnControl, UnitDiagnostics } from "../../src/velair/types";
import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";
import { plannedReturnVisible, renderPlannedReturnOverview, renderPlannedReturnZoneSignal, renderPlannedReturnDiagnostics, renderPlannedReturnUnitDiagnostics } from "../../src/velair/views/planned-return-visibility";

const entity = "climate.office";
function status(overrides: Partial<PlannedReturnStatus> = {}): PlannedReturnStatus {
  return { state: "away", occupancy: "away", sources: [], origin: "manual", can_start: false,
    episode_active: true, return_at: "2026-10-11T14:00:00Z", departure_at: "2026-10-10T12:00:00Z",
    absence_confirm_at: null, zones: [], error: null, ...overrides };
}
function host(value = status(), intent?: PlannedReturnControl): VelairViewHost {
  return { _data: { planned_return_status: value, planned_return: { enabled: false },
    zone_runtime: { [entity]: { state: "scheduled", planned_return: intent } },
    modes: [{ key: "away", name: "Holidays" }], profiles: [] },
    _t: (key: keyof typeof en, params?: Record<string, string>) => Object.entries(params ?? {}).reduce(
      (text, [name, replacement]) => text.replace(`{${name}}`, replacement), String(en[key] ?? key)),
    _formatDateTime: (date: string) => date,
  } as unknown as VelairViewHost;
}
const intent: PlannedReturnControl = { phase: "away", origin: "automatic", mode_id: "away", effect: "schedule" };
function container(template: unknown) { const element = document.createElement("div"); render(template, element); return element; }

describe("Planned Return visibility", () => {
  it.each(["idle", "disabled", "fulfilled", "cancelled", "skipped"] as const)("hides inactive %s summaries", state => {
    expect(plannedReturnVisible(status({ state, episode_active: false }))).toBe(false);
  });
  it("keeps actionable errors and notices visible", () => {
    expect(plannedReturnVisible(status({ state: "error", episode_active: false, error: "selection failed" }))).toBe(true);
    expect(plannedReturnVisible(status({ state: "cancelled", episode_active: false, notice: "configuration_changed" }))).toBe(true);
    expect(plannedReturnVisible()).toBe(false);
  });
  it.each(["manual", "automatic"] as const)("shows %s origin, arrival and guarded navigation without controls", origin => {
    const element = container(renderPlannedReturnOverview(host(status({ origin }))));
    expect(element.textContent).toContain(origin === "manual" ? "One-off return" : "Weekly routine");
    expect(element.textContent).toContain("2026-10-11T14:00:00Z");
    const navigate = vi.fn(); element.addEventListener("velair-open-planned-return", navigate);
    element.querySelector<HTMLButtonElement>("button")!.click(); expect(navigate).toHaveBeenCalledOnce();
    expect(element.querySelector("input, velair-planned-return, .return-timeline")).toBeNull();
  });
  it("shows confirmation completion without departure simulation", () => {
    const element = container(renderPlannedReturnOverview(host(status({ state: "confirming_absence", departure_at: null, absence_confirm_at: "2026-10-10T12:05:00Z" }))));
    expect(element.textContent).toContain("Until 2026-10-10T12:05:00Z");
    expect(element.textContent).not.toContain("Left home");
  });
  it.each(["schedule", "pause", "turn_off"] as const)("labels effective %s intent only when supplied by backend", effect => {
    const element = container(renderPlannedReturnZoneSignal(host(status(), { ...intent, effect }), entity));
    expect(element.querySelector(".overview-planned-return-signal")).not.toBeNull();
    expect(element.querySelector("span")?.title).toContain("Holidays");
    expect(container(renderPlannedReturnZoneSignal(host(), entity)).querySelector(".overview-planned-return-signal")).toBeNull();
  });
  it("shows pending forecast separately from active control and suppresses suspended estimates", () => {
    const value = status(); value.preparation = { context: "arrival", return_at: value.return_at, mode_id: "return", zones: [{
      entity_id: entity, profile_id: null, schedule_source: "default", preparation: "adaptive", state: "pending", reason: null, start_at: "2026-10-11T13:00:00Z",
    }] };
    let element = container(renderPlannedReturnZoneSignal(host(value), entity));
    expect(element.querySelector(".overview-planned-return-forecast")).not.toBeNull();
    expect(element.querySelector(".overview-planned-return-signal")).toBeNull();
    value.preparation.zones[0].state = "suspended";
    element = container(renderPlannedReturnZoneSignal(host(value), entity));
    expect(element.textContent).toBe("");
  });
  it("distinguishes disabled weekly routine from available manual departures and unmonitored occupancy", () => {
    const element = container(renderPlannedReturnDiagnostics(host(status({ state: "disabled", episode_active: false, can_start: true }))));
    expect(element.textContent).toContain("Weekly routineDisabled");
    expect(element.textContent).toContain("One-off return availableOn");
    expect(element.textContent).toContain("Not monitored");
  });
  it("never revives stale runtime attribution when diagnostic unit has no intent", () => {
    const current = host(status(), intent);
    current._data!.diagnostics = { units: { [entity]: {} as UnitDiagnostics } } as never;
    const element = container(renderPlannedReturnUnitDiagnostics(current, entity));
    expect(element.textContent).toBe("");
  });
  it("reads effective attribution from the backend diagnostic intent projection", () => {
    const current = host();
    current._data!.diagnostics = { units: { [entity]: { intent: { planned_return: intent } } as UnitDiagnostics } } as never;
    const element = container(renderPlannedReturnUnitDiagnostics(current, entity));
    expect(element.textContent).toContain("Holidays");
    expect(element.textContent).toContain("Weekly routine");
    expect(element.textContent).toContain("Current control intent");
    expect(element.textContent).not.toContain("Not controlling this climate");
  });
  it("shows suspension reason separately from control delivery", () => {
    const value = status(); value.preparation = { context: "arrival", return_at: value.return_at, mode_id: "return", zones: [{ entity_id: entity, profile_id: null, schedule_source: "default", preparation: "adaptive", state: "suspended", reason: "boost", start_at: null }] };
    const current = host(value); current._data!.diagnostics = { units: { [entity]: {} as UnitDiagnostics } } as never;
    const element = container(renderPlannedReturnUnitDiagnostics(current, entity));
    expect(element.textContent).toContain("Not controlling this climate"); expect(element.textContent).toContain("Boost takes priority.");
    expect(element.textContent).toContain("separate from device delivery");
  });
  it("provides English and Spanish event and category labels", () => {
    for (const key of Object.keys(en).filter(key => key.startsWith("plannedReturnEvent") || key.startsWith("diagnosticsHistoryCategoryPlannedReturn"))) {
      expect(es[key as keyof typeof es]).toBeTruthy();
    }
  });
});
