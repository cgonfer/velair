// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it } from "vitest";
import { currentArrivalPreparation } from "../../src/velair/domain/planned-return-preparation";
import { renderPreparationRoom, renderPreparationStatus } from "../../src/velair/views/planned-return-preparation-status";
import { en } from "../../src/velair/translations/en";
import type { TranslationKey } from "../../src/velair/translations";
import type { PlannedReturnPreparationZone, PlannedReturnStatus } from "../../src/velair/types";

const now = Date.parse("2026-10-12T10:00:00Z");
const room = (patch: Partial<PlannedReturnPreparationZone> = {}): PlannedReturnPreparationZone => ({ entity_id: "climate.test", profile_id: null, schedule_source: "default", preparation: "adaptive", state: "pending", reason: null, start_at: "2026-10-12T11:00:00Z", target: { temperature: 20 }, ...patch });
const status = (zones: PlannedReturnPreparationZone[]): PlannedReturnStatus => ({ state: "away", occupancy: "away", sources: [], origin: "manual", can_start: false, episode_active: true, return_at: "2026-10-12T12:00:00Z", absence_confirm_at: null, zones: [], error: null, preparation: { context: "arrival", return_at: "2026-10-12T12:00:00Z", mode_id: "default", zones } });

const t = (key: TranslationKey, params?: Record<string, string | number>) => Object.entries(params ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), en[key]);
const displayTime = (iso: string) => iso.slice(11, 16);
const container = (template: unknown) => { const root = document.createElement("div"); render(template, root); return root; };
describe("shared preparation visibility renderers", () => {
  it("identifies return preparation and qualifies preparing as control intent", () => {
    const summary = currentArrivalPreparation(status([room({ state: "preparing" })]), now)!;
    const global = container(renderPreparationStatus(summary, t, displayTime, now));
    const local = container(renderPreparationRoom(summary.zones[0], t, displayTime, { arrival: summary.arrival }));
    for (const element of [global, local]) {
      expect(element.querySelector("strong")?.textContent).toContain("Return preparation");
      expect(element.querySelector("strong")?.getAttribute("title")).toBe(en.plannedReturnVisibilityPreparingHelp);
    }
  });
  it("retains past waiting estimates without a countdown or a synthesized active state", () => {
    const summary = currentArrivalPreparation(status([room({ start_at: "2026-10-12T09:00:00Z" })]), now)!;
    const element = container(renderPreparationStatus(summary, t, displayTime, now));
    expect(element.textContent).toContain("Estimated preparation start: 09:00");
    expect(element.textContent).toContain("Waiting for preparation");
    expect(element.textContent).not.toContain("Starts in");
  });
  it("shows state, future start, arrival countdown and nonzero room counts without controls", () => {
    const summary = currentArrivalPreparation(status([room(), room({ state: "suspended", reason: "boost" })]), now)!;
    const element = container(renderPreparationStatus(summary, t, displayTime, now));
    expect(element.textContent).toContain("Waiting for preparation");
    expect(element.textContent).toContain("Estimated preparation start: 11:00");
    expect(element.textContent).toContain("Starts in 60 min"); expect(element.textContent).toContain("Arrival in 120 min");
    expect(element.querySelectorAll("[data-room-count]")).toHaveLength(2);
    expect(element.querySelector("button, a, input, [role=progressbar]")).toBeNull();
    expect(element.textContent).not.toContain("%");
  });
  it("renders cooling ranges and known suspension reasons without an upcoming start", () => {
    const summary = currentArrivalPreparation(status([room({ state: "suspended", reason: "manual_adjustment", target: { target_temp_low: 22, target_temp_high: 25 } })]), now)!;
    const element = container(renderPreparationRoom(summary.zones[0], t, displayTime, { temperatureUnit: "°C", arrival: summary.arrival }));
    expect(element.textContent).toContain("Preparation suspended"); expect(element.textContent).toContain("22–25 °C");
    expect(element.textContent).toContain("A manual adjustment takes priority."); expect(element.textContent).not.toContain("Estimated preparation start");
    expect(element.textContent).toContain("Arrival: 12:00");
  });
  it("explains unknown reasons and hides missing targets and absent projections", () => {
    const summary = currentArrivalPreparation(status([room({ reason: "unknown_reason", target: null })]), now)!;
    const element = container(renderPreparationRoom(summary.zones[0], t, displayTime, { temperatureUnit: "°F", arrival: summary.arrival }));
    expect(element.textContent).toContain("Preparation is currently unavailable."); expect(element.textContent).not.toContain("Arrival target");
    expect(container(renderPreparationRoom(undefined, t, displayTime, { temperatureUnit: "°C", arrival: summary.arrival })).textContent).toBe("");
    expect(container(renderPreparationStatus(undefined, t, displayTime, now)).textContent).toBe("");
  });
});
