// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { PlannedReturnStatus, PlannedReturnControl, UnitDiagnostics } from "../../src/velair/types";
import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";
import { TRANSLATIONS } from "../../src/velair/translations";
import { OverviewPreparationTimeline } from "../../src/velair/components/overview-preparation-timeline-element";
import { overviewPreparationPoints } from "../../src/velair/domain/overview-preparation-timeline";
import { currentArrivalPreparation } from "../../src/velair/domain/planned-return-preparation";
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
    _currentTimelineNow: () => new Date("2026-10-11T12:00:00Z"),
  } as unknown as VelairViewHost;
}
const intent: PlannedReturnControl = { phase: "away", origin: "automatic", mode_id: "away", effect: "schedule" };
function container(template: unknown) { const element = document.createElement("div"); render(template, element); return element; }

describe("Planned Return visibility", () => {
  it.each(["en", "es", "de", "fr", "it", "nl", "pl", "pt-br", "pt-pt", "ru"])("uses clear preparation help in %s without diagnostic wording", language => {
    const value = status({ destination_mode_id: "default" });
    value.preparation = { context: "arrival", return_at: value.return_at, mode_id: "default", zones: [{ entity_id: entity, profile_id: null, schedule_source: "default", preparation: "adaptive", state: "preparing", reason: null, start_at: null }] };
    const viewHost = host(value);
    const dictionary = TRANSLATIONS[language];
    const translate = viewHost._t;
    viewHost._t = ((key, params) => key === "plannedReturnVisibilityPreparingHelp" ? dictionary[key]! : translate(key, params)) as typeof viewHost._t;
    const tooltip = container(renderPlannedReturnOverview(viewHost)).querySelector('[data-room-count="preparing"] .inline-help-tooltip');
    expect(dictionary.plannedReturnVisibilityPreparingHelp).toBeTruthy();
    expect(tooltip?.textContent).toContain(dictionary.plannedReturnVisibilityPreparingHelp);
    expect(tooltip?.textContent).not.toContain(en.plannedReturnDiagnosticsIntentHelp);
    expect(tooltip?.textContent).not.toContain(es.plannedReturnDiagnosticsIntentHelp);
  });
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
    expect(element.querySelector('time[datetime="2026-10-11T14:00:00Z"]')).not.toBeNull();
    const navigate = vi.fn(); element.addEventListener("velair-open-planned-return", navigate);
    element.querySelector<HTMLButtonElement>("button")!.click(); expect(navigate).toHaveBeenCalledOnce();
    expect(element.querySelector("input, velair-planned-return, .return-timeline")).toBeNull();
  });
  it("shows confirmation completion without departure simulation", () => {
    const element = container(renderPlannedReturnOverview(host(status({ state: "confirming_absence", departure_at: null, absence_confirm_at: "2026-10-10T12:05:00Z" }))));
    expect(element.textContent).toContain("Until 2026-10-10T12:05:00Z");
    expect(element.textContent).not.toContain("Left home");
    expect(element.querySelector(".overview-return-timeline")).toBeNull();
    expect(element.textContent).toContain(`${en.plannedReturnArrival}: 2026-10-11T14:00:00Z`);
  });
  it.each(["schedule", "pause", "turn_off"] as const)("labels effective %s intent only when supplied by backend", effect => {
    const element = container(renderPlannedReturnZoneSignal(host(status(), { ...intent, effect }), entity));
    expect(element.querySelector(".overview-planned-return-signal")).not.toBeNull();
    expect(element.querySelector(".inline-help-tooltip")?.textContent).toContain("Holidays");
    expect(element.querySelector("[title]")).toBeNull();
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
    expect(element.querySelector('[data-state="suspended"]')).not.toBeNull();
    expect(element.textContent).not.toContain("Estimated preparation start");
  });
  it.each(["pending", "preparing", "reached", "suspended", "unavailable"] as const)("keeps %s preparation compact with independent touch and keyboard details", state => {
    const value = status();
    value.preparation = { context: "arrival", return_at: value.return_at, mode_id: "return", zones: [{
      entity_id: entity, profile_id: null, schedule_source: "default", preparation: "adaptive", state, reason: "boost",
      start_at: "2026-10-11T13:00:00Z", target: { target_temp_low: 19, target_temp_high: 23, hvac_mode: "heat_cool" },
    }] };
    const element = container(renderPlannedReturnZoneSignal(host(value, intent), entity));
    expect(element.querySelectorAll(".overview-zone-return")).toHaveLength(1);
    expect(element.querySelector(".return-preparation-room")).toBeNull();
    expect(element.querySelector(".overview-zone-return-label")?.textContent).toContain("19–23 °C");
    expect(element.querySelector(".overview-zone-return-label")?.textContent).not.toContain("Arrival:");
    expect(element.querySelector(".inline-help-tooltip")?.textContent).toContain("Boost takes priority.");
    const navigate = vi.fn(); element.addEventListener("click", navigate);
    const help = element.querySelector<HTMLButtonElement>("button")!;
    help.click(); expect(help.getAttribute("aria-expanded")).toBe("true");
    expect(navigate).not.toHaveBeenCalled();
    help.dispatchEvent(new FocusEvent("focus"));
    expect(help.getAttribute("aria-expanded")).toBe("true");
    expect(element.querySelector(".inline-help-tooltip")?.textContent).toContain("2026-10-11T14:00:00.000Z");
  });
  it("keeps arrival-only control compact and does not invent targets or early starts", () => {
    const value = status();
    value.preparation = { context: "arrival", return_at: value.return_at, mode_id: "return", zones: [{
      entity_id: entity, profile_id: null, schedule_source: "default", preparation: "arrival_only", state: "pending", reason: null,
      start_at: "2026-10-11T13:00:00Z", target: { temperature: Number.NaN, hvac_mode: "off" },
    }] };
    const element = container(renderPlannedReturnZoneSignal(host(value), entity));
    expect(element.querySelector('[data-state="arrivalOnly"]')).not.toBeNull();
    expect(element.querySelector(".overview-zone-return-label")?.textContent).toContain("At arrival");
    expect(element.textContent).not.toContain("NaN");
    expect(element.textContent).not.toContain("Estimated preparation start");
    expect(element.querySelector(".inline-help-tooltip")?.textContent).toContain(en.plannedReturnVisibilityArrivalOnlyHelp);
  });
  it("keeps Away attribution and its room's future preparation visible together", async () => {
    const value = status();
    value.preparation = { context: "arrival", return_at: value.return_at, mode_id: "return", zones: [{
      entity_id: entity, profile_id: null, schedule_source: "default", preparation: "adaptive", state: "pending", reason: null,
      start_at: "2026-10-11T13:00:00Z", target: { temperature: 20, hvac_mode: "heat", action: "set_temperature" },
    }] };
    const element = container(renderPlannedReturnZoneSignal(host(value, intent), entity));
    expect(element.querySelector(".overview-planned-return-signal")).not.toBeNull();
    expect(element.textContent).toContain("Estimated preparation start: 2026-10-11T13:00:00.000Z");
    expect(element.textContent).toContain("20");
    const overview = container(renderPlannedReturnOverview(host(value)));
    expect(overview.querySelector('[data-room-count="waiting"] button')?.getAttribute("aria-label")).toContain("1 waiting");
    expect(overview.querySelectorAll(".overview-return-open")).toHaveLength(1);
    expect(overview.querySelector("button button, input")).toBeNull();
    document.body.append(overview);
    const timeline = overview.querySelector<OverviewPreparationTimeline>("velair-overview-preparation-timeline")!;
    await timeline.updateComplete;
    timeline.trackWidth = 300; await timeline.updateComplete;
    expect(timeline.points).toHaveLength(1);
    expect(timeline.shadowRoot!.querySelector(".point")).not.toBeNull();
    value.preparation.return_at = "2026-10-11T15:00:00Z";
    expect(container(renderPlannedReturnZoneSignal(host(value, intent), entity)).querySelector(".return-preparation-room")).toBeNull();
    expect(container(renderPlannedReturnOverview(host(value))).querySelector(".return-preparation-status")).toBeNull();
    render(renderPlannedReturnOverview(host(value)), overview);
    await timeline.updateComplete;
    expect(timeline.points).toEqual([]);
    expect(timeline.shadowRoot!.querySelector(".point, .legend")).toBeNull();
    overview.remove();
  });
  it("wires friendly names, roster colors and HA date/time formatting into Overview", () => {
    const value = status({ destination_mode_id: "default", departure_at: "2026-10-10T20:00:00Z" });
    value.preparation = { context: "arrival", return_at: value.return_at, mode_id: "default", zones: [{ entity_id: entity,
      profile_id: null, schedule_source: "default", preparation: "adaptive", state: "pending", reason: null,
      start_at: "2026-10-11T13:00:00Z" }] };
    const viewHost = host(value);
    viewHost.hass = { config: { time_zone: "America/New_York" }, locale: { language: "en", time_format: "12" },
      states: { [entity]: { attributes: { friendly_name: "Office" } } } } as never;
    viewHost._data!.configured_entities = ["climate.a", entity, "climate.z"];
    const timeline = container(renderPlannedReturnOverview(viewHost)).querySelector<OverviewPreparationTimeline>("velair-overview-preparation-timeline")!;
    expect(timeline.names[entity]).toBe("Office");
    expect(timeline.points).toEqual(overviewPreparationPoints(currentArrivalPreparation(value, Date.parse("2026-10-11T12:00:00Z")), Date.parse(value.departure_at!), viewHost._data!.configured_entities));
    const label = timeline.estimateLabel(Date.parse(value.preparation.zones[0].start_at!));
    expect(label).toContain("9:00");
    expect(label).toContain("AM");
    expect(label).toContain("Oct");
    const startLabel = timeline.startTimeLabel(Date.parse(value.preparation.zones[0].start_at!));
    expect(startLabel).toContain("AM");
    expect(startLabel).toContain("Oct");
    expect(startLabel).not.toContain("Estimated");
  });
  it("shows snapshot Modes and read-only time endpoints with independent count helpers", () => {
    const value = status({ away_mode_id: "away", destination_mode_id: "default" });
    value.preparation = { context: "arrival", return_at: value.return_at, mode_id: "default", zones: [{ entity_id: entity, profile_id: null, schedule_source: "default", preparation: "adaptive", state: "reached", reason: null, start_at: null }] };
    const element = container(renderPlannedReturnOverview(host(value)));
    expect(element.querySelector(".overview-return-modes")?.textContent).toContain("Holidays");
    expect(element.querySelector(".overview-return-modes")?.textContent).toContain("Default");
    expect(element.querySelector(".overview-return-timeline")).not.toBeNull();
    expect(element.querySelector('time[datetime="2026-10-11T14:00:00Z"]')?.getAttribute("aria-label")).toContain(en.plannedReturnArrival);
    expect(element.querySelector(".return-preparation-status, input, .cancel-return, button button")).toBeNull();
    const navigate = vi.fn(); element.addEventListener("velair-open-planned-return", navigate);
    const helper = element.querySelector<HTMLButtonElement>('[data-room-count="reached"] button')!;
    helper.click();
    expect(helper.getAttribute("aria-expanded")).toBe("true");
    expect(navigate).not.toHaveBeenCalled();
    expect(element.querySelector('[data-room-count="reached"] .inline-help-tooltip')?.textContent).toContain("configured margin");
    expect(element.querySelector(".overview-return-count-keyword")?.textContent).toBe("Ready");
    expect(element.querySelector('[data-room-count="reached"] .overview-return-count-value')?.textContent).toBe("1");
    const end = element.querySelector<HTMLButtonElement>(".overview-return-end")!;
    expect(element.querySelector(".overview-return-open .overview-return-end")).toBeNull();
    end.click(); expect(navigate).toHaveBeenCalledOnce();
    expect(helper.classList.contains("inline-help-overlay")).toBe(true);
    expect(element.querySelector('[data-room-count="reached"] ha-icon[icon="mdi:help-circle-outline"]')).toBeNull();
    for (const selector of [".overview-planned-return-summary", ".overview-return-body", ".overview-return-timeline", "velair-overview-preparation-timeline"]) {
      navigate.mockClear();
      element.querySelector<HTMLElement>(selector)!.click();
      expect(navigate).toHaveBeenCalledOnce();
    }
    navigate.mockClear();
    element.querySelector<HTMLElement>(".overview-return-count-keyword")!.click();
    element.querySelector<HTMLElement>(".overview-return-count-value")!.click();
    expect(navigate).not.toHaveBeenCalled();
    element.querySelector<HTMLElement>(".inline-help-tooltip")!.click();
    expect(navigate).not.toHaveBeenCalled();
    const timelineHelpers = element.querySelectorAll<HTMLButtonElement>(".overview-return-timeline-help button");
    expect(timelineHelpers).toHaveLength(4);
    for (const button of timelineHelpers) {
      button.click();
      expect(button.getAttribute("aria-expanded")).toBe("true");
      expect(button.classList.contains("inline-help-overlay")).toBe(true);
      expect(navigate).not.toHaveBeenCalled();
    }
    expect(element.querySelector("#overview-return-away-mode")?.textContent).toContain("Mode applied when leaving: Holidays");
    expect(element.querySelector("#overview-return-destination-mode")?.textContent).toContain("Mode scheduled for arrival: Default");
    expect(element.querySelector(".overview-return-identity")?.textContent).not.toContain("Arrival in");
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
