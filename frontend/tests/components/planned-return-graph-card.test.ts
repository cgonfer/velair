// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import "../../src/velair-card";
import type { VelairCard } from "../../src/velair/components/velair-card-element";
import type { PlannedReturnElement } from "../../src/velair/components/planned-return-element";
import type { OverviewPreparationTimeline } from "../../src/velair/components/overview-preparation-timeline-element";
import { plannedReturnDraft } from "../../src/velair/domain/planned-return";
import type { HomeAssistant, ScheduleResponse } from "../../src/velair/types";

afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });
it("uses the panel graphic for the household card while retaining presence, preparation help and editing", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-13T12:00:00Z"));
  const value = {
    configured_entities: ["climate.first", "climate.second", "climate.paused"], zones: {}, settings: { first_weekday: "monday" },
    temperature_migration: { required: false }, temperature_unit: "°C", active_overrides: {}, templates: [], next_events: [], global: { mode: "auto" },
    planned_return: { ...plannedReturnDraft(), occupancy_entity_ids: ["binary_sensor.home"] },
    planned_return_status: { state: "away", episode_active: true, can_start: true, can_cancel: true, occupancy: "away", sources: [{ entity_id: "binary_sensor.home", state: "away" }],
      departure_at: "2026-10-13T11:00:00Z", return_at: "2026-10-13T14:00:00Z", destination_mode_id: "default",
      preparation: { context: "arrival", mode_id: "default", return_at: "2026-10-13T14:00:00Z", zones: [
        { entity_id: "climate.first", profile_id: null, schedule_source: "default", preparation: "adaptive", state: "pending", reason: null, start_at: "2026-10-13T13:00:00Z" },
        { entity_id: "climate.second", profile_id: null, schedule_source: "default", preparation: "adaptive", state: "preparing", reason: null, start_at: "2026-10-13T11:30:00Z" },
        { entity_id: "climate.paused", profile_id: null, schedule_source: "default", preparation: "adaptive", state: "suspended", reason: "manual_control", start_at: null },
      ] },
    },
  } as unknown as ScheduleResponse;
  const subscribeMessage = vi.fn().mockResolvedValue(() => undefined);
  const sendMessagePromise = vi.fn().mockResolvedValue(value);
  const element = document.createElement("velair-card") as VelairCard;
  element.setConfig({ type: "custom:velair-card", view: "planned-return", entities: ["climate.hidden"] });
  element.hass = { connection: { subscribeMessage, sendMessagePromise }, states: {}, config: { time_zone: "UTC" } } as unknown as HomeAssistant;
  document.body.append(element);
  await new Promise(resolve => setTimeout(resolve, 0)); await element.updateComplete;
  const runtime = element.shadowRoot!.querySelector<PlannedReturnElement>("velair-planned-return")!; await runtime.updateComplete;
  const root = runtime.shadowRoot!;
  const timeline = root.querySelector<OverviewPreparationTimeline>("velair-overview-preparation-timeline")!; await timeline.updateComplete;
  expect(timeline.points.map(point => point.entityId)).toEqual(["climate.second", "climate.first"]);
  expect(timeline.showLegend).toBe(true); expect(timeline.expanded).toBe(false);
  expect(timeline.startTimeLabel(timeline.points[0].start)).toMatch(/11:30/);
  expect(root.querySelector(".return-preparation-status,.preparation-estimate")).toBeNull();
  expect(root.querySelectorAll(".return-preparation-badge")).toHaveLength(3);
  expect(root.querySelector(".compact-return-indicators")).not.toBeNull();
  expect(root.querySelector(".panel-arrival-input ha-icon")).toBeNull();
  for (const selector of ["#panel-return-departure-trigger", "#panel-return-arrival-trigger", "#compact-return-source-home-trigger", "#compact-return-source-away-trigger", "#return-current-phase-trigger"]) {
    const help = root.querySelector<HTMLButtonElement>(selector)!;
    expect(help).not.toBeNull();
    help.click(); expect(help.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelector("#episode-return-time")).toBeNull();
    help.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    expect(help.getAttribute("aria-expanded")).toBe("false");
    help.dispatchEvent(new FocusEvent("focus"));
    expect(help.getAttribute("aria-expanded")).toBe("true");
  }
  expect(root.querySelector("#panel-return-departure")?.textContent).toContain("Start of this absence:");
  expect(root.querySelector("#panel-return-arrival")?.textContent).toContain("Expected return:");
  expect(root.querySelector("#compact-return-source-away")?.textContent).toContain("binary_sensor.home");
  expect(root.querySelectorAll(".compact-return-indicators [title],.return-context-status[title]")).toHaveLength(0);
  const helper = root.querySelector<HTMLButtonElement>('[data-room-count="waiting"] button')!;
  helper.click(); expect(helper.getAttribute("aria-expanded")).toBe("true");
  expect(root.querySelector('[data-room-count="waiting"] .inline-help-tooltip')?.textContent).toContain("Starts in 60 min");
  root.querySelector<HTMLButtonElement>(".panel-arrival-input")!.click(); await runtime.updateComplete;
  expect(root.querySelector("#episode-return-time")).not.toBeNull();
  expect(subscribeMessage).toHaveBeenCalledTimes(1);
  for (const kind of ["badge", "timeline"]) {
    const current = element.shadowRoot!.querySelector<PlannedReturnElement>("velair-planned-return")!.shadowRoot!;
    const surface = kind === "badge" ? current.querySelector<HTMLButtonElement>('[data-room-count="waiting"] button')!
      : current.querySelector<OverviewPreparationTimeline>("velair-overview-preparation-timeline")!.shadowRoot!.querySelector<HTMLButtonElement>(".now button")!;
    if (surface.getAttribute("aria-expanded") === "true") surface.click();
    surface.click();
    expect(surface.getAttribute("aria-expanded")).toBe("true");
    element.remove();
    expect(surface.getAttribute("aria-expanded")).toBe("false");
    const escape = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    document.dispatchEvent(escape); expect(escape.defaultPrevented).toBe(false);
    document.body.append(element); await new Promise(resolve => setTimeout(resolve, 0)); await element.updateComplete;
    await element.shadowRoot!.querySelector<PlannedReturnElement>("velair-planned-return")!.updateComplete;
  }
  const currentRuntime = element.shadowRoot!.querySelector<PlannedReturnElement>("velair-planned-return")!;
  const phaseHelp = currentRuntime.shadowRoot!.querySelector<HTMLButtonElement>("#return-current-phase-trigger")!;
  phaseHelp.click(); expect(phaseHelp.getAttribute("aria-expanded")).toBe("true");
  currentRuntime.data = { ...value, planned_return_status: { ...value.planned_return_status!, state: "fulfilled", episode_active: false } };
  await currentRuntime.updateComplete;
  expect(phaseHelp.getAttribute("aria-expanded")).toBe("false");
  const escape = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
  document.dispatchEvent(escape); expect(escape.defaultPrevented).toBe(false);
});
