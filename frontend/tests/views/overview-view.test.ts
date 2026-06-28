// @vitest-environment jsdom

import { html, render } from "lit";
import { describe, expect, it } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import type { ScheduleEvent } from "../../src/velair/types";
import {
  renderEvent,
  renderEventDetails,
  renderNextEvents,
  renderOverviewActiveBoosts,
  renderOverviewTimelineName,
  renderOverviewTimelineTrack,
} from "../../src/velair/views/overview-view";

function host() {
  return {
    _changedNextEventIds: new Set<string>(),
    _formatDateTime: (value: string) => `date:${value}`,
    _formatEventAction: (event: ScheduleEvent) => `${event.temperature} °C`,
    _formatEventMode: (event: ScheduleEvent) => String(event.hvac_mode),
    _friendlyEntityName: () => "Office",
    _nextEventChangeRevision: 1,
    _t: (key: string) => key,
  } as unknown as VelairViewHost;
}

describe("overview next events", () => {
  it("aligns empty boost and next-event messages beside their icons", () => {
    const container = document.createElement("div");
    const emptyHost = {
      ...host(),
      _data: {
        configured_entities: [],
        next_events: [],
        zones: {},
      },
      _orderedZoneIds: (entityIds: string[]) => entityIds,
    } as unknown as VelairViewHost;

    render(
      html`${renderOverviewActiveBoosts(emptyHost)}${renderNextEvents(emptyHost)}`,
      container,
    );

    const emptyStates = [...container.querySelectorAll(".overview-empty-state")];
    expect(emptyStates).toHaveLength(2);
    expect(
      emptyStates.every(
        (state) =>
          state.querySelector(":scope > ha-icon") !== null &&
          state.querySelector(":scope > .overview-empty-copy .section-label") !== null &&
          state.querySelector(":scope > .overview-empty-copy .overview-muted") !== null,
      ),
    ).toBe(true);
  });

  it("keeps target temperature and mode while showing both preconditioning times", () => {
    const container = document.createElement("div");
    const event: ScheduleEvent = {
      entity_id: "climate.office",
      hvac_mode: "heat",
      start: "08:00",
      temperature: 21,
      target_when: "2026-06-22T08:00:00+02:00",
      weekday: "monday",
      when: "2026-06-22T06:45:00+02:00",
    };

    render(renderEventDetails(host(), event), container);

    expect(container.querySelector(".event-details")?.classList).toContain("preconditioned");
    expect(container.querySelector(".preconditioning-icon")?.getAttribute("title")).toBe("preconditioning");
    expect(container.querySelector(".preconditioning-icon")?.getAttribute("aria-label")).toBe("preconditioning");
    expect(container.querySelector(".preconditioning-start")?.textContent).toContain(
      "date:2026-06-22T06:45:00+02:00",
    );
    expect(container.querySelector(".preconditioning-arrow")?.getAttribute("icon")).toBe("mdi:arrow-left");
    expect(container.querySelector(".target-time")?.textContent).toContain("date:2026-06-22T08:00:00+02:00");
    expect(
      [...container.querySelector(".event-time-flow")!.children].map((element) => element.className),
    ).toEqual([
      "preconditioning-icon",
      "preconditioning-start",
      "preconditioning-arrow",
      "target-time",
    ]);
    expect(container.querySelector(".event-time-sequence small")).toBeNull();
    expect(container.querySelector(".event-target")?.textContent).toBe("21 °C");
    expect(container.querySelector(".event-mode")?.textContent).toBe("heat");
  });

  it("keeps the compact single time for a normal next event", () => {
    const container = document.createElement("div");
    const event: ScheduleEvent = {
      entity_id: "climate.office",
      hvac_mode: "cool",
      start: "18:00",
      temperature: 24,
      weekday: "monday",
      when: "2026-06-22T18:00:00+02:00",
    };

    render(renderEventDetails(host(), event), container);

    expect(container.querySelector(".event-details")?.classList).not.toContain("preconditioned");
    expect(container.querySelector(".event-time-sequence")).toBeNull();
    expect(container.querySelector(".event-time-single")).not.toBeNull();
    expect(container.querySelector(".event-time-flow")?.textContent).toBe(
      "date:2026-06-22T18:00:00+02:00",
    );
    expect(container.querySelector(".event-time-single .target-time")?.textContent).toBe(
      "date:2026-06-22T18:00:00+02:00",
    );
    expect(container.querySelector(".event-target")?.textContent).toBe("24 °C");
    expect(container.querySelector(".event-mode")?.textContent).toBe("cool");
  });

  it("marks mixed next-event lists so normal times align with precondition targets", () => {
    const container = document.createElement("div");
    const viewHost = {
      ...host(),
      _data: {
        configured_entities: ["climate.office", "climate.bedroom"],
        next_events: [
          {
            entity_id: "climate.office",
            hvac_mode: "heat",
            start: "08:00",
            target_when: "2026-06-22T08:00:00+02:00",
            temperature: 21,
            weekday: "monday",
            when: "2026-06-22T07:00:00+02:00",
          },
          {
            entity_id: "climate.bedroom",
            hvac_mode: "cool",
            start: "18:00",
            temperature: 24,
            weekday: "monday",
            when: "2026-06-22T18:00:00+02:00",
          },
        ],
        zones: {},
      },
      _orderedZoneIds: (entityIds: string[]) => entityIds,
    } as unknown as VelairViewHost;

    render(renderNextEvents(viewHost), container);

    expect(container.querySelector(".event-list")?.classList).toContain("has-preconditioning");
    expect(container.querySelector(".event-time-single .target-time")?.textContent).toContain(
      "date:2026-06-22T18:00:00+02:00",
    );
  });

  it("filters next events to the thermostats selected for this card", () => {
    const container = document.createElement("div");
    const viewHost = {
      ...host(),
      _data: {
        configured_entities: ["climate.office", "climate.bedroom"],
        next_events: [
          {
            entity_id: "climate.office",
            hvac_mode: "heat",
            start: "08:00",
            temperature: 21,
            weekday: "monday",
            when: "2026-06-22T08:00:00+02:00",
          },
          {
            entity_id: "climate.bedroom",
            hvac_mode: "cool",
            start: "18:00",
            temperature: 24,
            weekday: "monday",
            when: "2026-06-22T18:00:00+02:00",
          },
        ],
        zones: {},
      },
      _friendlyEntityName: (entityId: string) => entityId,
      _orderedZoneIds: (entityIds: string[]) => entityIds,
    } as unknown as VelairViewHost;

    render(renderNextEvents(viewHost, ["climate.bedroom"]), container);

    expect(container.textContent).not.toContain("climate.office");
    expect(container.textContent).toContain("climate.bedroom");
  });

  it("marks only an event whose preconditioning time changed", () => {
    const container = document.createElement("div");
    const viewHost = host();
    viewHost._changedNextEventIds.add("climate.office");
    const event: ScheduleEvent = {
      entity_id: "climate.office",
      hvac_mode: "heat",
      start: "08:00",
      target_when: "2026-06-22T08:00:00+02:00",
      temperature: 21,
      weekday: "monday",
      when: "2026-06-22T07:00:00+02:00",
    };

    render(renderEvent(viewHost, event), container);

    expect(container.querySelector(".event-identity")?.textContent).toContain("Office");
    expect(container.querySelector(".event-identity .overview-climate-name")).not.toBeNull();
    expect(container.querySelector(".event")?.classList).not.toContain("next-event-updated");
    expect(container.querySelector(".event-time-flow")?.classList).toContain("next-event-updated");
    expect(container.querySelector(".event-time-flow")?.classList).toContain("update-odd");
  });

  it("filters active boosts to the thermostats selected for this card", () => {
    const container = document.createElement("div");
    const viewHost = {
      ...host(),
      _data: {
        active_overrides: {
          "climate.office": {
            type: "boost",
            temperature: 21,
            until: "2027-06-22T10:00:00+02:00",
          },
          "climate.bedroom": {
            type: "boost",
            temperature: 19,
            until: "2027-06-22T10:00:00+02:00",
          },
        },
        configured_entities: ["climate.office", "climate.bedroom"],
        zones: {
          "climate.office": { enabled: true, schedule: {} },
          "climate.bedroom": { enabled: true, schedule: {} },
        },
      },
      _formatRemaining: () => "1h",
      _formatTemperature: (value: number) => `${value} C`,
      _friendlyEntityName: (entityId: string) => entityId,
      _modeLabel: (mode: string) => mode,
      _orderedZoneIds: (entityIds: string[]) => entityIds,
    } as unknown as VelairViewHost;

    render(renderOverviewActiveBoosts(viewHost, ["climate.office"]), container);

    expect(container.textContent).toContain("climate.office");
    expect(container.textContent).not.toContain("climate.bedroom");
  });
});

describe("overview timeline", () => {
  it("uses the shared climate name style", () => {
    const container = document.createElement("div");
    const timelineHost = {
      ...host(),
      _data: { zones: { "climate.office": { enabled: true, schedule: {} } } },
    } as unknown as VelairViewHost;

    render(renderOverviewTimelineName(timelineHost, "climate.office"), container);

    expect(container.querySelector(".overview-timeline-name .overview-climate-name")?.textContent)
      .toBe("Office");
  });

  it("renders a dedicated empty-track label when a climate has no blocks", () => {
    const container = document.createElement("div");
    const timelineHost = {
      _currentTimelineNow: () => new Date("2026-06-22T12:00:00+02:00"),
      _data: {
        zones: {
          "climate.office": {
            enabled: true,
            schedule: {},
          },
        },
      },
      _t: (key: string) => key,
    } as unknown as VelairViewHost;

    render(renderOverviewTimelineTrack(timelineHost, "climate.office", []), container);

    expect(container.querySelector(".overview-timeline-empty")?.textContent).toBe("noBlocks");
  });
});
