// @vitest-environment jsdom

import { html, render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { overviewStyles } from "../../src/velair/styles/overview-styles";
import { timelineStyles } from "../../src/velair/styles/timeline-styles";
import { de } from "../../src/velair/translations/de";
import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";
import { fr } from "../../src/velair/translations/fr";
import { nl } from "../../src/velair/translations/nl";
import { ru } from "../../src/velair/translations/ru";
import { translationTemplate } from "../../src/velair/translations/template";
import type { ScheduleEvent } from "../../src/velair/types";
import {
  renderEvent,
  renderEventDetails,
  renderNextEvents,
  renderOverviewActiveBoosts,
  renderOverviewTimelineName,
  renderOverviewTimelineTrack,
  renderOverviewTimelines,
  renderOverviewZones,
} from "../../src/velair/views/overview-view";

function host() {
  return {
    _changedNextEventIds: new Set<string>(),
    _formatDateTime: (value: string) => `date:${value}`,
    _formatEventAction: (event: ScheduleEvent) => `${event.temperature} °C`,
    _formatEventMode: (event: ScheduleEvent) => String(event.hvac_mode),
    _formatScheduleTime: (value: string) => `time:${value}`,
    _friendlyEntityName: () => "Office",
    _hvacActionLabel: (action: string) => `action:${action}`,
    _modeLabel: (mode: string) => `mode:${mode}`,
    _nextEventChangeRevision: 1,
    _shortWeekdayName: (weekday: string) => weekday.slice(0, 3),
    _t: (key: string, params?: Record<string, string>) => `${key}${Object.values(params ?? {}).join("")}`,
    _weekdayName: (weekday: string) => weekday,
  } as unknown as VelairViewHost;
}

describe("overview next events", () => {
  it("renders a permanent accessible segmented control and ignores the active option", () => {
    const container = document.createElement("div");
    const enter = vi.fn();
    const resume = vi.fn();
    const overviewHost = {
      ...host(),
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
        zone_runtime: {
          "climate.office": {
            state: "scheduled",
            control_mode: "automatic",
            manual_adjustment_allowed: true,
          },
        },
      },
      _manualControlActions: {},
      _enterManualAdjustment: enter,
      _resumeAutomaticControl: resume,
    } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);
    const group = container.querySelector('[role="group"]')!;
    const options = [...group.querySelectorAll<HTMLButtonElement>('button')];

    expect(group.getAttribute("aria-label")).toBe("velairControl");
    expect(options.map((option) => option.querySelector("span")?.textContent)).toEqual([
      "overviewControlAutomatic", "overviewControlManual",
    ]);
    expect(options.map((option) => option.querySelector("ha-icon")?.getAttribute("icon"))).toEqual([
      "mdi:calendar-clock", "mdi:hand-back-right-outline",
    ]);
    expect(options.every((option) => option.querySelector("ha-icon")?.getAttribute("aria-hidden") === "true"))
      .toBe(true);
    expect(options.map((option) => option.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    options[0].click();
    expect(resume).not.toHaveBeenCalled();
    options[1].click();
    expect(enter).toHaveBeenCalledWith("climate.office");
  });

  it("resumes from Manual, keeps the active option a no-op, and blocks only migration", () => {
    const renderManual = (reason?: "already_manual" | "temperature_migration") => {
      const container = document.createElement("div");
      const resume = vi.fn();
      const overviewHost = {
        ...host(),
        _data: {
          zones: { "climate.office": { enabled: true, schedule: {} } },
          zone_runtime: {
            "climate.office": {
              state: "paused",
              control_mode: "manual",
              manual_control: { active: true, policy: "until_resumed" },
              manual_adjustment_allowed: false,
              manual_adjustment_unavailable_reason: reason ?? "already_manual",
            },
          },
        },
        _manualControlActions: {},
        _enterManualAdjustment: vi.fn(),
        _resumeAutomaticControl: resume,
      } as unknown as VelairViewHost;
      render(renderOverviewZones(overviewHost, ["climate.office"]), container);
      return { container, resume };
    };

    const normal = renderManual();
    const normalOptions = [...normal.container.querySelectorAll<HTMLButtonElement>('.manual-control-segmented button')];
    normalOptions[1].click();
    expect(normal.resume).not.toHaveBeenCalled();
    normalOptions[0].click();
    expect(normal.resume).toHaveBeenCalledWith("climate.office");

    const migration = renderManual("temperature_migration");
    const automatic = migration.container.querySelector<HTMLButtonElement>('.manual-control-segmented button')!;
    expect(automatic.getAttribute("aria-disabled")).toBe("true");
    expect(automatic.getAttribute("aria-describedby")).toBeTruthy();
    automatic.click();
    expect(migration.resume).not.toHaveBeenCalled();
  });

  it("projects per-entity busy state on both segmented options", () => {
    const container = document.createElement("div");
    const overviewHost = {
      ...host(),
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
        zone_runtime: { "climate.office": { state: "scheduled", control_mode: "automatic" } },
      },
      _manualControlActions: { "climate.office": "enter" },
    } as unknown as VelairViewHost;
    render(renderOverviewZones(overviewHost, ["climate.office"]), container);
    expect([...container.querySelectorAll('.manual-control-segmented button')].map(
      (option) => option.getAttribute("aria-disabled"),
    )).toEqual(["true", "true"]);
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-busy")).toBe("true");
  });

  it("shows the active Manual session policy and expiry for all policies", () => {
    const cases = [
      {
        manual_control: { active: true, policy: "until_next_block", until: "2026-08-20T22:00:00+02:00" },
        expected: "manualSessionNextBlockAtdate:2026-08-20T22:00:00+02:00",
      },
      {
        manual_control: { active: true, policy: "for_duration", duration_minutes: 45, until: "2026-08-20T19:00:00+02:00" },
        expected: "manualSessionDurationUntil45date:2026-08-20T19:00:00+02:00",
      },
      {
        manual_control: { active: true, policy: "until_resumed" },
        expected: "manualSessionUntilResumed",
      },
    ] as const;

    for (const entry of cases) {
      const container = document.createElement("div");
      const overviewHost = {
        ...host(),
        _data: {
          zones: { "climate.office": { enabled: true, schedule: {} } },
          zone_runtime: {
            "climate.office": {
              state: "paused",
              control_mode: "manual",
              manual_control: entry.manual_control,
            },
          },
        },
      } as unknown as VelairViewHost;

      render(renderOverviewZones(overviewHost, ["climate.office"]), container);
      expect(container.querySelector(".manual-control-detail")?.textContent).toContain(entry.expected);
      const options = [...container.querySelectorAll('.manual-control-segmented button')];
      expect(options.map((option) => option.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
    }
  });

  it("explains that a next-block session without a future block lasts until resumed", () => {
    const container = document.createElement("div");
    const overviewHost = {
      ...host(),
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
        zone_runtime: {
          "climate.office": {
            state: "paused",
            control_mode: "manual",
            manual_control: { active: true, policy: "until_next_block" },
          },
        },
      },
    } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);
    expect(container.querySelector(".manual-control-detail")?.textContent)
      .toContain("manualSessionNoNextBlock");
  });

  it("keeps Manual focusable but aria-disabled with an authoritative reason", () => {
    const container = document.createElement("div");
    const overviewHost = {
      ...host(),
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
        zone_runtime: {
          "climate.office": {
            state: "paused",
            control_mode: "automatic",
            manual_adjustment_allowed: false,
            manual_adjustment_unavailable_reason: "zone_paused",
          },
        },
      },
    } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);
    const manual = container.querySelectorAll('.manual-control-segmented button')[1];
    expect(manual.getAttribute("aria-disabled")).toBe("true");
    expect(manual.getAttribute("aria-describedby")).toBeTruthy();
    expect(container.querySelector(".manual-control-reason")?.textContent)
      .toContain("manualUnavailableZonePause");
  });

  it("shows authoritative zone state and only relevant secondary signals", () => {
    const container = document.createElement("div");
    const overviewHost = {
      ...host(),
      _formatTemperature: (value: number) => `${value} °C`,
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
        zone_runtime: { "climate.office": { state: "scheduled", room_temperature: 20, target_temperature: 21, applied_temperature: 21 } },
        room_sensor_assist: { "climate.office": { status: "ready" } },
        comfort: { "climate.office": { enabled: true, condition: "comfortable", air_quality: "good", data_quality: "complete", data_issues: [] } },
      },
    } as unknown as VelairViewHost;
    render(renderOverviewZones(overviewHost, ["climate.office"]), container);
    const heading = container.querySelector(".overview-zone-card-heading")!;
    expect([...heading.children].map((node) => node.className)).toEqual([
      "overview-zone-card-name",
      "overview-manual-control",
      "overview-zone-activity state-scheduled",
      "overview-zone-signals",
    ]);
    expect(container.querySelector(".overview-zone-card")).not.toBeNull();
    expect(container.querySelector(".overview-zone-details .overview-zone-metrics")).not.toBeNull();
    expect(container.querySelector(".overview-zone-activity")?.textContent).toContain("overviewZoneScheduled");
    expect(container.querySelector(".overview-zone-activity-eyebrow")).toBeNull();
    expect(container.querySelectorAll(".overview-zone-metric")).toHaveLength(2);
    expect(container.querySelectorAll(".overview-zone-signal")).toHaveLength(2);
    expect(container.querySelector(".comfort-environment.normal")?.textContent)
      .toContain("overviewZoneComfort");
    expect(container.querySelector(".comfort-environment.normal")?.textContent)
      .toContain("comfortConditionComfortable");
    expect(container.querySelector(".comfort-air.normal")?.textContent)
      .toContain("comfortAirQualityGood");
  });

  it("falls back to live climate temperatures when zone runtime is absent", () => {
    const container = document.createElement("div");
    const overviewHost = {
      ...host(),
      _formatTemperature: (value: number) => `${value} °C`,
      hass: {
        states: {
          "climate.office": {
            state: "heat",
            attributes: { current_temperature: 19.5, temperature: 21 },
          },
        },
      },
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
      },
    } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    const metrics = [...container.querySelectorAll(".overview-zone-metric")].map(
      (node) => node.textContent,
    );
    expect(metrics).toEqual([
      "overviewZoneRoom19.5 °C",
      "overviewZoneTarget21 °C",
    ]);
  });

  it("ignores stale range attributes outside heat/cool mode", () => {
    const container = document.createElement("div");
    const overviewHost = {
      ...host(),
      _formatTemperature: (value: number) => `${value} Â°C`,
      hass: {
        states: {
          "climate.office": {
            state: "heat",
            attributes: {
              current_temperature: 19.5,
              temperature: 21,
              target_temp_low: 18,
              target_temp_high: 24,
            },
          },
        },
      },
      _data: { zones: { "climate.office": { enabled: true, schedule: {} } } },
    } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    const metrics = [...container.querySelectorAll(".overview-zone-metric")].map(
      (node) => node.textContent,
    );
    expect(metrics).toContain("overviewZoneTarget21 Â°C");
    expect(container.textContent).not.toContain("18–24");
  });

  it("does not bypass null temperatures from an authoritative zone runtime", () => {
    const container = document.createElement("div");
    const overviewHost = {
      ...host(),
      _formatTemperature: (value: number) => `${value} °F`,
      hass: {
        states: {
          "climate.office": {
            state: "heat",
            attributes: { current_temperature: 316.4, temperature: 145 },
          },
        },
      },
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
        zone_runtime: {
          "climate.office": {
            state: "idle",
            room_temperature: null,
            target_temperature: null,
            applied_temperature: null,
          },
        },
      },
    } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    expect(container.querySelectorAll(".overview-zone-metric")).toHaveLength(0);
    expect(container.textContent).not.toContain("316.4");
    expect(container.textContent).not.toContain("145");
  });

  it("does not render empty metrics or Applied without a Target", () => {
    const container = document.createElement("div");
    const overviewHost = {
      ...host(),
      _formatTemperature: (value: number) => `${value} °C`,
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
        zone_runtime: { "climate.office": { state: "idle", applied_temperature: 22 } },
      },
    } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    expect(container.querySelectorAll(".overview-zone-metric")).toHaveLength(0);
    expect(container.querySelector(".overview-zone-details")).toBeNull();
  });

  it("does not present the climate target as the Room temperature", () => {
    const container = document.createElement("div");
    const overviewHost = {
      ...host(),
      _formatTemperature: (value: number) => `${value} °C`,
      hass: {
        states: {
          "climate.office": {
            state: "cool",
            attributes: { temperature: 24 },
          },
        },
      },
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
      },
    } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    expect([...container.querySelectorAll(".overview-zone-metric small")].map(
      (node) => node.textContent,
    )).toEqual(["overviewZoneTarget"]);
  });

  it("shows Applied and signed Room Assist only while assisting", () => {
    const container = document.createElement("div");
    const overviewHost = { ...host(), _formatTemperature: (value: number) => `${value} °C`, _data: {
      zones: { "climate.office": { enabled: true, schedule: {} } },
      zone_runtime: { "climate.office": { state: "scheduled", target_temperature: 21, applied_temperature: 22 } },
      room_sensor_assist: { "climate.office": {
        status: "assisting",
        room_temperature: 20,
        climate_temperature: 19,
        target_temperature: 21,
        climate_target_temperature: 22,
        assist_delta: 1,
        direction: "heat",
      } },
    } } as unknown as VelairViewHost;
    render(renderOverviewZones(overviewHost, ["climate.office"]), container);
    expect(container.querySelector(".overview-zone-details .overview-assist-flow")).not.toBeNull();
    expect([...container.querySelectorAll(".overview-assist-group > small, .overview-assist-metric small, .overview-assist-offset small")].map((node) => node.textContent))
      .toEqual([
        "overviewZoneTemperature",
        "overviewZoneClimate",
        "overviewZoneSensor",
        "overviewZoneSetpoint",
        "overviewZoneClimate",
        "overviewZoneScheduledSetpoint",
        "overviewZoneOffset",
      ]);
    expect(container.textContent).not.toContain("overviewZoneBaseTarget");
    expect(container.textContent).not.toContain("overviewZoneAppliedSetpoint");
    expect(container.querySelector(".room-assist")?.textContent).toContain("overviewZoneRoomAssistActive");
    expect(container.querySelector(".room-assist")?.textContent).not.toContain("+1 °C");
  });

  it("shows the signed applied Room Assist offset while holding", () => {
    const container = document.createElement("div");
    const overviewHost = { ...host(), _formatTemperature: (value: number) => `${value} °C`, _data: {
      zones: { "climate.office": { enabled: true, schedule: {} } },
      zone_runtime: { "climate.office": { state: "scheduled" } },
      room_sensor_assist: { "climate.office": {
        status: "holding",
        room_temperature: 26,
        climate_temperature: 25,
        target_temperature: 24,
        climate_target_temperature: 22,
        applied_offset: -2,
        assist_delta: 2,
        direction: "heat",
      } },
    } } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    expect(container.querySelector(".overview-assist-offset")?.textContent)
      .toContain("-2 °C");
    expect(container.querySelector(".room-assist")?.textContent).toContain("overviewZoneRoomAssistHolding");
    expect(container.querySelector(".room-assist")?.textContent).not.toContain("-2 °C");
  });

  it("identifies scheduled target protection in the compact Room Assist signal", () => {
    const container = document.createElement("div");
    const overviewHost = { ...host(), _formatTemperature: (value: number) => `${value}`, _data: {
      zones: { "climate.office": { enabled: true, schedule: {} } },
      zone_runtime: { "climate.office": { state: "scheduled" } },
      room_sensor_assist: { "climate.office": {
        status: "holding",
        room_temperature: 21,
        climate_temperature: 19,
        target_temperature: 22,
        applied_temperature: 22,
        calculated_temperature: 20,
        scheduled_target_guard: "cooling_floor",
        direction: "cool",
      } },
    } } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    expect(container.querySelector(".room-assist")?.textContent)
      .toContain("overviewZoneRoomAssistGuarded");
  });

  it("shows scheduled and applied Room Assist ranges with their signed shift", () => {
    const container = document.createElement("div");
    const overviewHost = { ...host(), _formatTemperature: (value: number) => `${value} Â°C`, _data: {
      zones: { "climate.office": { enabled: true, schedule: {} } },
      zone_runtime: { "climate.office": { state: "scheduled" } },
      room_sensor_assist: { "climate.office": {
        status: "assisting",
        room_temperature: 18,
        climate_temperature: 19,
        target_temp_low: 20,
        target_temp_high: 24,
        applied_target_temp_low: 21,
        applied_target_temp_high: 25,
        range_shift: 1,
        applied_offset: 9,
        direction: "heat",
      } },
    } } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    expect(container.textContent).toContain("overviewZoneScheduledRange20–24 Â°C");
    expect(container.textContent).toContain("overviewZoneAppliedRange21–25 Â°C");
    expect(container.querySelector(".overview-assist-offset")?.textContent)
      .toContain("overviewZoneRangeShift+1 Â°C");
    expect(container.textContent).not.toContain("overviewZoneOffset9 Â°C");
  });

  it("keeps a compact status structure without a fixed heading or empty context row", () => {
    const container = document.createElement("div");
    const overviewHost = { ...host(), _data: {
      zones: {
        "climate.office": { enabled: true, schedule: {} },
        "climate.bedroom": { enabled: true, schedule: {} },
      },
      zone_runtime: {
        "climate.office": { state: "boost", until: "2026-07-11T18:00:00Z" },
        "climate.bedroom": { state: "idle" },
      },
    } } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office", "climate.bedroom"]), container);

    const badges = [...container.querySelectorAll(".overview-zone-activity")];
    expect(badges).toHaveLength(2);
    expect(badges.every((badge) => badge.querySelector(".overview-zone-activity-icon")
      && badge.querySelector(".overview-zone-activity-copy strong"))).toBe(true);
    expect(badges.every((badge) => !badge.querySelector(".overview-zone-activity-eyebrow"))).toBe(true);
    expect(badges[1].querySelector(".overview-zone-activity-context")).toBeNull();
  });

  it("shows activity, Velair control, HVAC mode, and timing once in the status summary", () => {
    const manualContainer = document.createElement("div");
    const manualHost = {
      ...host(),
      hass: {
        states: {
          "climate.office": {
            state: "off",
            attributes: { hvac_action: "idle" },
          },
        },
      },
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
        zone_runtime: { "climate.office": { state: "idle", hvac_mode: "off" } },
      },
    } as unknown as VelairViewHost;

    render(renderOverviewZones(manualHost, ["climate.office"]), manualContainer);

    const manualActivity = manualContainer.querySelector(".overview-zone-activity");
    expect(manualActivity?.querySelector("strong")?.textContent).toBe("action:idle");
    expect(manualActivity?.querySelector("ha-icon")?.getAttribute("icon"))
      .toBe("mdi:hand-back-right-outline");
    expect(manualActivity?.querySelector(".overview-zone-activity-context")?.textContent)
      .toBe("overviewZoneManual · mode:off");
    expect(manualContainer.querySelector(".overview-zone-signal.hvac-action")).toBeNull();

    const scheduledContainer = document.createElement("div");
    const scheduledHost = {
      ...host(),
      hass: {
        states: {
          "climate.office": {
            state: "heat",
            attributes: { hvac_action: "heating" },
          },
        },
      },
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
        zone_runtime: { "climate.office": { state: "scheduled", hvac_mode: "heat" } },
        next_events: [{ entity_id: "climate.office", when: "2026-07-30T16:30:00Z" }],
      },
    } as unknown as VelairViewHost;

    render(renderOverviewZones(scheduledHost, ["climate.office"]), scheduledContainer);

    const scheduledActivity = scheduledContainer.querySelector(".overview-zone-activity");
    expect(scheduledActivity?.querySelector("strong")?.textContent).toBe("action:heating");
    expect(scheduledActivity?.querySelector(".overview-zone-activity-context")?.textContent)
      .toBe("overviewZoneScheduled · mode:heat");
    expect(scheduledActivity?.querySelector(".overview-zone-activity-detail")?.textContent)
      .toBe("overviewZoneNextAtdate:2026-07-30T16:30:00Z");
  });

  it("uses the scheduled icon when a scheduled climate reports idle activity", () => {
    const container = document.createElement("div");
    const overviewHost = {
      ...host(),
      hass: {
        states: {
          "climate.office": {
            state: "off",
            attributes: { hvac_action: "idle" },
          },
        },
      },
      _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } },
        zone_runtime: { "climate.office": { state: "scheduled", hvac_mode: "off" } },
      },
    } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    const activity = container.querySelector(".overview-zone-activity");
    expect(activity?.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:calendar-clock");
    expect(activity?.querySelector("strong")?.textContent).toBe("action:idle");
    expect(activity?.querySelector(".overview-zone-activity-context")?.textContent)
      .toBe("overviewZoneScheduled · mode:off");
  });

  it("omits missing Room Assist fields and empty groups without changing field order", () => {
    const container = document.createElement("div");
    const overviewHost = { ...host(), _formatTemperature: (value: number) => `${value} °C`, _data: {
      zones: { "climate.office": { enabled: true, schedule: {} } },
      room_sensor_assist: { "climate.office": {
        status: "assisting",
        room_temperature: 20,
        assist_delta: 1,
        direction: "heat",
      } },
    } } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    expect([...container.querySelectorAll(".overview-assist-group > small")].map((node) => node.textContent))
      .toEqual(["overviewZoneTemperature"]);
    expect([...container.querySelectorAll(".overview-assist-metric small")].map((node) => node.textContent))
      .toEqual(["overviewZoneSensor"]);
    expect(container.querySelector(".overview-assist-offset")?.textContent).toContain("+1 °C");
  });

  it("merges device activity into Now and keeps the remaining secondary signals ordered", () => {
    const container = document.createElement("div");
    const climate = {
      states: {
        "climate.office": {
          state: "heat",
          attributes: { hvac_action: "heating" },
        },
      },
    };
    const overviewHost = { ...host(), _formatTemperature: (value: number) => `${value} °C`, _data: {
      zones: { "climate.office": { enabled: true, schedule: {} } },
      zone_runtime: { "climate.office": { state: "scheduled" } },
      room_sensor_assist: { "climate.office": { status: "assisting", assist_delta: 1, direction: "heat" } },
      comfort: { "climate.office": {
        enabled: true,
        condition: "cold",
        air_quality: "poor",
        data_quality: "partial",
        data_issues: ["humidity_missing"],
      } },
    }, hass: climate } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    const activity = container.querySelector(".overview-zone-activity");
    expect(activity?.classList).toContain("action-heating");
    expect(activity?.querySelector("strong")?.textContent).toBe("action:heating");
    expect(activity?.querySelector(".overview-zone-activity-context")?.textContent)
      .toBe("overviewZoneScheduled");
    expect([...container.querySelectorAll(".overview-zone-signal")].map((node) =>
      ["room-assist", "comfort-environment", "comfort-air", "comfort-data"]
        .find((className) => node.classList.contains(className)),
    )).toEqual(["room-assist", "comfort-environment", "comfort-air", "comfort-data"]);
  });

  it("renders accessible icons and localized values for every live HVAC action", () => {
    const presentations = {
      heating: "mdi:fire",
      cooling: "mdi:snowflake",
      drying: "mdi:water-percent",
      fan: "mdi:fan",
      idle: "mdi:calendar-clock",
      off: "mdi:power",
      preheating: "mdi:radiator",
      defrosting: "mdi:snowflake-melt",
    };

    for (const [action, icon] of Object.entries(presentations)) {
      const container = document.createElement("div");
      const overviewHost = {
        ...host(),
        hass: {
          states: {
            "climate.office": {
              state: action === "off" ? "off" : "heat",
              attributes: { hvac_action: action },
            },
          },
        },
        _data: {
          zones: { "climate.office": { enabled: true, schedule: {} } },
          zone_runtime: { "climate.office": { state: "scheduled" } },
        },
      } as unknown as VelairViewHost;

      render(renderOverviewZones(overviewHost, ["climate.office"]), container);

      const activity = container.querySelector(".overview-zone-activity");
      expect(activity?.classList).toContain(`action-${action}`);
      if (action === "preheating") expect(activity?.classList).toContain("action-heating");
      if (action === "defrosting") expect(activity?.classList).toContain("action-drying");
      expect(activity?.querySelector("ha-icon")?.getAttribute("icon")).toBe(icon);
      expect(activity?.querySelector("strong")?.textContent).toBe(`action:${action}`);
      expect(activity?.querySelector(".overview-zone-activity-context")?.textContent)
        .toBe("overviewZoneScheduled");
      expect(activity?.getAttribute("aria-label")).toBe(
        `action:${action}. overviewZoneScheduled`,
      );
    }
  });

  it("does not infer device activity when HVAC action is invalid or missing", () => {
    for (const action of [undefined, "unknown", "unavailable", 42]) {
      const container = document.createElement("div");
      const overviewHost = {
        ...host(),
        hass: {
          states: {
            "climate.office": {
              state: "heat",
              attributes: { ...(action ? { hvac_action: action } : {}) },
            },
          },
        },
        _data: {
          zones: { "climate.office": { enabled: true, schedule: {} } },
          zone_runtime: { "climate.office": { state: "scheduled" } },
        },
      } as unknown as VelairViewHost;

      render(renderOverviewZones(overviewHost, ["climate.office"]), container);

      const activity = container.querySelector(".overview-zone-activity");
      expect(activity?.className).toBe("overview-zone-activity state-scheduled");
      expect(activity?.querySelector("strong")?.textContent).toBe("overviewZoneScheduled");
      expect(activity?.querySelector(".overview-zone-activity-context")).toBeNull();
    }
  });

  it("provides concise manual-state translations alongside HVAC action dictionaries", () => {
    expect(en.overviewZoneManual).toBe("Manual");
    expect(es.overviewZoneManual).toBe("Manual");
    expect(en.overviewControlAutomatic).toBe("Automatic");
    expect(en.overviewControlManual).toBe("Manual");
    expect(es.overviewControlAutomatic).toBe("Automático");
    expect(es.overviewControlManual).toBe("Manual");
    expect(translationTemplate).toHaveProperty("overviewZoneManual");
    expect(translationTemplate).toHaveProperty("overviewControlAutomatic");
    expect(translationTemplate).toHaveProperty("overviewControlManual");
    for (const dictionary of [de, en, es, fr, nl, ru]) {
      expect(dictionary.overviewControlAutomatic.trim()).toBeTruthy();
      expect(dictionary.overviewControlManual.trim()).toBeTruthy();
      expect(dictionary.overviewControlAutomatic).not.toMatch(/\s/);
      expect(dictionary.overviewControlManual).not.toMatch(/\s/);
    }
    for (const action of [
      "heating",
      "cooling",
      "drying",
      "fan",
      "idle",
      "off",
      "preheating",
      "defrosting",
    ] as const) {
      expect(en.hvacActions[action]).toBeTruthy();
      expect(es.hvacActions[action]).toBeTruthy();
      expect(translationTemplate.hvacActions).toHaveProperty(action);
    }
  });

  it("uses restrained activity colors in Now and wraps the remaining secondary signals", () => {
    const cssText = overviewStyles.cssText;

    expect(cssText).toMatch(/\.overview-zone-signals\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(cssText).toMatch(/\.overview-zone-signals\s*\{[^}]*overflow:\s*visible/);
    expect(cssText).toMatch(/\.overview-zone-signal\s*\{[^}]*flex:\s*0 0 auto/);
    expect(cssText).toMatch(/\.overview-zone-signal\s*\{[^}]*white-space:\s*nowrap/);
    expect(cssText).toMatch(/\.overview-zone-card-heading\s*\{[^}]*grid-template-columns:\s*minmax\(150px, \.75fr\) minmax\(0, 1\.5fr\) minmax\(160px, 220px\)/);
    expect(cssText).toMatch(/\.overview-zone-activity\s*\{[^}]*align-self:\s*start[^}]*grid-column:\s*3[^}]*grid-template-columns:\s*32px minmax\(0, max-content\)[^}]*width:\s*fit-content/);
    expect(cssText).toMatch(/\.overview-zone-activity-summary\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(cssText).toMatch(/\.overview-zone-activity-summary strong\s*\{[^}]*font-size:\s*13px/);
    expect(cssText).toMatch(/\.overview-zone-activity-context,\s*\.overview-zone-activity-separator\s*\{[^}]*font-size:\s*12px/);
    expect(cssText).toMatch(/\.overview-zone-activity-detail\s*\{[^}]*font-size:\s*11px/);
    expect(cssText).not.toMatch(/\.overview-zone-activity-eyebrow/);
    expect(cssText).toMatch(/\.overview-zone-activity\.action-heating \.overview-zone-activity-icon\s*\{[^}]*#e65100/);
    expect(cssText).toMatch(/\.overview-zone-activity\.action-cooling \.overview-zone-activity-icon\s*\{[^}]*#0277bd/);
    expect(cssText).toMatch(/\.overview-zone-activity\.action-drying \.overview-zone-activity-icon,[\s\S]*var\(--primary-color\)/);
    expect(cssText).toMatch(/\.overview-zone-activity\.action-idle \.overview-zone-activity-icon,[\s\S]*var\(--secondary-text-color\)/);
    expect(cssText).not.toMatch(/\.overview-zone-signals\s*\{[^}]*overflow-x:\s*auto/);
    expect(cssText).not.toMatch(/\.overview-zone-signal\.hvac-action/);
    expect(cssText).toMatch(/\.manual-control-segmented\s*\{[^}]*grid-template-columns:\s*repeat\(2, max-content\)[^}]*max-width:\s*100%[^}]*width:\s*fit-content/);
    expect(cssText).toMatch(/\.manual-control-segmented\s*\{[^}]*border:[^}]*color-mix[^}]*overflow:\s*hidden/);
    expect(cssText).toMatch(/\.manual-control-segmented button\s*\{[^}]*background:\s*transparent[^}]*border-radius:\s*0[^}]*line-height:\s*1[^}]*min-height:\s*30px[^}]*white-space:\s*nowrap/);
    expect(cssText).toMatch(/\.manual-control-segmented button\s*\{[^}]*display:\s*inline-flex[^}]*gap:\s*4px/);
    expect(cssText).toMatch(/\.manual-control-segmented button ha-icon\s*\{[^}]*--mdc-icon-size:\s*13px[^}]*color:\s*currentColor/);
    const segmentRule = cssText.match(/\.manual-control-segmented button\s*\{[^}]*\}/)?.[0] ?? "";
    const selectedSegmentRule = cssText.match(/\.manual-control-segmented button\[aria-pressed="true"\]\s*\{[^}]*\}/)?.[0] ?? "";
    expect(segmentRule).toContain("border: 0");
    expect(segmentRule).not.toContain("box-shadow");
    expect(selectedSegmentRule).not.toContain("box-shadow");
    expect(cssText).toMatch(/\.manual-control-segmented button \+ button\s*\{[^}]*border-inline-start:\s*1px solid/);
    expect(cssText).toMatch(/\.manual-control-segmented button\[aria-pressed="true"\]\s*\{[^}]*background:\s*var\(--primary-color\)[^}]*var\(--text-primary-color, var\(--card-background-color\)\)/);
    expect(cssText).toMatch(/\.manual-control-segmented button:not\(\[aria-pressed="true"\]\):not\(\[aria-disabled="true"\]\):hover\s*\{[^}]*color-mix\(in srgb, var\(--primary-color\) 18%/);
    expect(cssText).toMatch(/\.manual-control-segmented button\[aria-pressed="true"\]:not\(\[aria-disabled="true"\]\):hover\s*\{[^}]*color-mix\(in srgb, var\(--primary-color\) 88%/);
    expect(cssText).toMatch(/\.manual-control-segmented button:active:not\(\[aria-disabled="true"\]\)\s*\{[^}]*filter:\s*brightness/);
    expect(cssText).toMatch(/\.manual-control-segmented button\[aria-pressed="true"\]:focus-visible\s*\{[^}]*outline-color:\s*var\(--text-primary-color, var\(--card-background-color\)\)/);
    expect(cssText).toMatch(/\.overview-zone-signals\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*grid-row:\s*2/);
    expect(cssText).toMatch(/@container overview-zone-card \(max-width: 1120px\)[\s\S]*\.overview-manual-control\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*grid-row:\s*2/);
    expect(cssText).toMatch(/@container overview-zone-card \(max-width: 1120px\)[\s\S]*\.overview-zone-signals\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*grid-row:\s*3/);
    expect(cssText).toMatch(/@container overview-zone-card \(max-width: 600px\)[\s\S]*\.overview-zone-card-heading\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(120px, 46%\)/);
    const compactContainerRules = cssText.match(
      /@container overview-zone-card \(max-width: 600px\) \{([\s\S]*?)\n\}/,
    )?.[1] ?? "";
    const compactViewportRules = cssText.match(/@media \(max-width: 600px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
    for (const compactRules of [compactContainerRules, compactViewportRules]) {
      expect(compactRules).toMatch(/\.overview-zone-activity\s*\{[^}]*grid-column:\s*2[^}]*grid-row:\s*1/);
      expect(compactRules).toMatch(/\.overview-zone-activity\s*\{[^}]*grid-template-columns:\s*32px minmax\(0, max-content\)/);
      expect(compactRules).toMatch(/\.overview-zone-activity\s*\{[^}]*justify-self:\s*end[^}]*max-width:\s*100%[^}]*width:\s*fit-content/);
      expect(compactRules).not.toMatch(/\.overview-zone-activity\s*\{[^}]*(?:^|;)\s*width:\s*100%/);
    }
  });

  it("surfaces environmental comfort and monitored air quality as separate signals", () => {
    const chips = (condition: string, airQuality: string) => {
      const container = document.createElement("div");
      const overviewHost = { ...host(), _formatTemperature: (value: number) => `${value} °C`, _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } }, zone_runtime: { "climate.office": { state: "idle" } },
        comfort: { "climate.office": { enabled: true, condition, air_quality: airQuality, data_quality: "complete", data_issues: [] } },
      } } as unknown as VelairViewHost;
      render(renderOverviewZones(overviewHost, ["climate.office"]), container);
      return container;
    };
    const environmentIssue = chips("hot_and_humid", "good");
    expect(environmentIssue.querySelector(".comfort-environment.warning")?.textContent)
      .toContain("comfortConditionHotAndHumid");
    expect(environmentIssue.querySelector(".comfort-air.normal")?.textContent)
      .toContain("comfortAirQualityGood");

    const airIssue = chips("comfortable", "poor");
    expect(airIssue.querySelector(".comfort-environment.normal")?.textContent)
      .toContain("comfortConditionComfortable");
    expect(airIssue.querySelector(".comfort-air.error")?.textContent)
      .toContain("comfortAirQualityPoor");
  });

  it("hides Comfort when disabled and hides only unmonitored air quality", () => {
    const renderComfort = (enabled: boolean, airQuality: string) => {
      const container = document.createElement("div");
      const overviewHost = { ...host(), _formatTemperature: (value: number) => `${value} °C`, _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } }, zone_runtime: { "climate.office": { state: "idle" } },
        comfort: { "climate.office": { enabled, condition: "comfortable", air_quality: airQuality, data_quality: "complete", data_issues: [] } },
      } } as unknown as VelairViewHost;
      render(renderOverviewZones(overviewHost, ["climate.office"]), container);
      return container;
    };

    const disabled = renderComfort(false, "good");
    expect(disabled.querySelector(".comfort-environment")).toBeNull();
    expect(disabled.querySelector(".comfort-air")).toBeNull();

    const noAir = renderComfort(true, "not_monitored");
    expect(noAir.querySelector(".comfort-environment")?.textContent)
      .toContain("comfortConditionComfortable");
    expect(noAir.querySelector(".comfort-air")).toBeNull();
  });

  it("keeps the Comfort condition visible when sensor data is incomplete", () => {
    const container = document.createElement("div");
    const overviewHost = { ...host(), _data: {
      zones: { "climate.office": { enabled: true, schedule: {} } },
      zone_runtime: { "climate.office": { state: "idle" } },
      comfort: { "climate.office": {
        enabled: true,
        condition: "hot",
        air_quality: "not_monitored",
        data_quality: "partial",
        data_issues: ["humidity_missing"],
      } },
    } } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    expect(container.querySelector(".comfort-environment")?.textContent)
      .toContain("comfortConditionHot");
    expect(container.querySelector(".comfort-data")?.textContent)
      .toContain("overviewZoneSensorIssue");
  });

  it("does not duplicate a no-readings Comfort state with a Data signal", () => {
    const container = document.createElement("div");
    const overviewHost = { ...host(), _data: {
      zones: { "climate.office": { enabled: true, schedule: {} } },
      zone_runtime: { "climate.office": { state: "idle" } },
      comfort: { "climate.office": {
        enabled: true,
        condition: "no_readings",
        air_quality: "not_monitored",
        data_quality: "unavailable",
        data_issues: ["temperature_missing", "humidity_missing"],
      } },
    } } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    expect(container.querySelector(".comfort-environment.error")?.textContent)
      .toContain("comfortConditionNoReadings");
    expect(container.querySelector(".comfort-data")).toBeNull();
  });

  it("keeps a comfortable condition neutral when only sensor quality needs attention", () => {
    const container = document.createElement("div");
    const overviewHost = { ...host(), _data: {
      zones: { "climate.office": { enabled: true, schedule: {} } },
      zone_runtime: { "climate.office": { state: "idle" } },
      comfort: { "climate.office": {
        enabled: true,
        condition: "comfortable",
        air_quality: "not_monitored",
        data_quality: "partial",
        data_issues: ["co2_missing"],
      } },
    } } as unknown as VelairViewHost;

    render(renderOverviewZones(overviewHost, ["climate.office"]), container);

    expect(container.querySelector(".comfort-environment.normal")).not.toBeNull();
    expect(container.querySelector(".comfort-data.warning")).not.toBeNull();
  });

  it("shows boost, pause, and preconditioning timing", () => {
    const textFor = (runtime: Record<string, unknown>) => {
      const container = document.createElement("div");
      const overviewHost = { ...host(), _formatTemperature: (value: number) => `${value} °C`, _data: {
        zones: { "climate.office": { enabled: true, schedule: {} } }, zone_runtime: { "climate.office": runtime },
      } } as unknown as VelairViewHost;
      render(renderOverviewZones(overviewHost, ["climate.office"]), container);
      return container.textContent ?? "";
    };
    expect(textFor({ state: "boost", until: "2026-07-11T18:00:00Z" })).toContain("overviewZoneUntil");
    expect(textFor({ state: "paused", until: "2026-07-11T18:00:00Z" })).toContain("overviewZoneResumes");
    expect(textFor({ state: "preconditioning", active_from: "2026-07-11T17:00:00Z", target_when: "2026-07-11T18:00:00Z" }))
      .toContain("overviewZoneReadyAtdate:2026-07-11T18:00:00Z");
  });

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
  it("keeps the boost shimmer inside its responsive block geometry", () => {
    const cssText = overviewStyles.cssText;
    const shimmerRule = cssText.match(
      /\.overview-timeline-boost::before,[\s\S]*?\.overview-timeline-boost::after\s*\{[^}]*\}/,
    )?.[0] ?? "";

    expect(shimmerRule).toContain("inset: 0");
    expect(shimmerRule).toContain("width: auto");
    expect(shimmerRule).toContain("border-radius: inherit");
    expect(shimmerRule).toContain("background-repeat: no-repeat");
    expect(shimmerRule).toContain("background-size: 42% 100%");
    const keyframes = cssText.slice(
      cssText.indexOf("@keyframes velair-overview-boost-bars"),
      cssText.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(keyframes).toMatch(/background-position:\s*-72% 0[\s\S]*background-position:\s*172% 0/);
    expect(keyframes).not.toContain("transform:");
    expect(cssText).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.overview-timeline-boost::before,[\s\S]*animation:\s*none/);
  });

  it("identifies a Manual zone pause with one hand icon and accessible detail", () => {
    const container = document.createElement("div");
    const timelineHost = {
      ...host(),
      _currentTimelineNow: () => new Date("2026-08-21T12:00:00+02:00"),
      _data: {
        global: { mode: "auto" },
        zones: {
          "climate.office": {
            enabled: true,
            schedule: {},
            override: { type: "pause", action: "none" },
            pauses: [
              { started_at: "2026-08-21T11:00:00+02:00", action: "none", pause_id: "manual" },
              { started_at: "2026-08-21T11:30:00+02:00", action: "turn_off", pause_id: "window" },
            ],
          },
        },
        zone_runtime: {
          "climate.office": { state: "paused", control_mode: "manual" },
        },
      },
    } as unknown as VelairViewHost;

    render(html`
      ${renderOverviewTimelineName(timelineHost, "climate.office")}
      ${renderOverviewTimelineTrack(timelineHost, "climate.office", [])}
    `, container);

    const name = container.querySelector(".overview-timeline-name")!;
    const pause = container.querySelector(".overview-timeline-pause")!;
    expect(name.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:hand-back-right-outline");
    expect(pause.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:hand-back-right-outline");
    expect(name.getAttribute("title")).toContain("pauseActive - manualAdjustment");
    expect(pause.getAttribute("aria-label")).toContain("pauseActive - manualAdjustment");
    expect(name.getAttribute("title")).toContain("pauseReasons: 2");
    expect(pause.getAttribute("aria-label")).toContain("pauseReasons: 2");
    expect(pause.querySelectorAll("ha-icon")).toHaveLength(1);
  });

  it("keeps ordinary zone and global pauses distinct from Manual adjustment", () => {
    const renderPause = (global: boolean) => {
      const container = document.createElement("div");
      const timelineHost = {
        ...host(),
        _currentTimelineNow: () => new Date("2026-08-21T12:00:00+02:00"),
        _formatRemaining: () => "2h",
        _data: {
          global: global
            ? {
                mode: "paused",
                paused_started_at: "2026-08-21T11:00:00+02:00",
                paused_until: "2026-08-21T14:00:00+02:00",
              }
            : { mode: "auto" },
          zones: {
            "climate.office": {
              enabled: true,
              schedule: {},
              ...(global ? {} : { override: { type: "pause", action: "none" } }),
            },
          },
          zone_runtime: {
            "climate.office": { state: "paused", control_mode: global ? "manual" : "automatic" },
          },
        },
      } as unknown as VelairViewHost;
      render(html`
        ${renderOverviewTimelineName(timelineHost, "climate.office")}
        ${renderOverviewTimelineTrack(timelineHost, "climate.office", [])}
      `, container);
      return container;
    };

    for (const [kind, container] of [["zone", renderPause(false)], ["global", renderPause(true)]] as const) {
      expect(container.querySelector(".overview-timeline-name ha-icon")?.getAttribute("icon"))
        .toBe("mdi:pause-circle");
      expect(container.querySelector(".overview-timeline-pause ha-icon")?.getAttribute("icon"), kind)
        .toBe("mdi:pause");
      expect(container.querySelector(".overview-timeline-name")?.getAttribute("title"))
        .not.toContain("manualAdjustment");
      expect(container.querySelector(".overview-timeline-pause")?.getAttribute("aria-label"))
        .not.toContain("manualAdjustment");
    }
  });

  it("keeps editor carry-over informational while Overview carry-over is interactive", () => {
    expect(timelineStyles.cssText).toMatch(
      /\.timeline-block\.timeline-carry-over,[\s\S]*pointer-events:\s*none/,
    );
    expect(timelineStyles.cssText).toMatch(
      /\.overview-timeline-block\.overview-timeline-carry-over\s*\{[^}]*cursor:\s*pointer[^}]*pointer-events:\s*auto/,
    );
  });

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

  it("renders an interactive carry-over with source, target, and mode details", () => {
    const container = document.createElement("div");
    const showDetail = vi.fn();
    const timelineHost = {
      ...host(),
      _currentTimelineNow: () => new Date("2026-08-04T12:00:00"),
      _formatTemperature: (value: number) => `${value} C`,
      _showOverviewTimelineDetail: showDetail,
      _data: { zones: { "climate.office": { enabled: true, schedule: {} } } },
    } as unknown as VelairViewHost;
    const week = {
      monday: [{ start: "22:00", action: "set_temperature", temperature: 19, hvac_mode: "heat" }],
      tuesday: [{ start: "06:00", action: "set_temperature", temperature: 21 }],
    };

    render(renderOverviewTimelineTrack(
      timelineHost,
      "climate.office",
      week.tuesday,
      week,
      "tuesday",
    ), container);

    const carry = container.querySelector(".overview-timeline-carry-over");
    expect(carry?.tagName).toBe("BUTTON");
    expect(carry?.getAttribute("type")).toBe("button");
    expect(carry?.getAttribute("title")).toContain("timelineContinuesFrommontime:22:00");
    expect(carry?.getAttribute("title")).toContain("19");
    expect(carry?.getAttribute("title")).toContain("heat");
    expect(carry?.getAttribute("aria-label")).toBe(carry?.getAttribute("title"));
    expect(carry?.textContent).toContain("heat");
    expect(carry?.getAttribute("style")).toContain("width: 25%");
    expect(container.querySelectorAll("button.overview-timeline-block")).toHaveLength(2);

    (carry as HTMLButtonElement).click();
    expect(showDetail).toHaveBeenCalledWith(
      "climate.office",
      carry?.getAttribute("title"),
      12.5,
      expect.any(Event),
    );
  });

  it("uses Home Assistant time for the selected day, carry-over, and now marker", () => {
    const container = document.createElement("div");
    const timelineHost = {
      ...host(),
      hass: { config: { time_zone: "America/Los_Angeles" } },
      _currentTimelineNow: () => new Date("2026-08-10T00:30:00Z"),
      _data: {
        configured_entities: ["climate.office"],
        global: { mode: "auto", active_profile_ids: [] },
        zones: {
          "climate.office": {
            enabled: true,
            schedule: {
              saturday: [{ start: "23:00", action: "turn_off" }],
              sunday: [{ start: "06:00", action: "set_temperature", temperature: 18 }],
              monday: [{ start: "07:00", action: "set_temperature", temperature: 25 }],
            },
          },
        },
      },
    } as unknown as VelairViewHost;

    render(renderOverviewTimelines(timelineHost, ["climate.office"]), container);

    expect(container.querySelector(".overview-timeline-now-label")?.textContent?.trim()).toBe("17:30");
    expect(container.querySelector(".overview-timeline-carry-over")?.getAttribute("title"))
      .toContain("timelineContinuesFromsattime:23:00");
    expect(container.querySelector(".overview-timeline-block:not(.overview-timeline-carry-over)")?.getAttribute("title"))
      .toContain("time:06:00");
    expect(container.querySelector(".overview-timeline-block:not(.overview-timeline-carry-over)")?.getAttribute("title"))
      .not.toContain("time:07:00");
  });

  it("renders the active profile schedule and identifies affected zones", () => {
    const container = document.createElement("div");
    const week = (start: string, temperature: number) => Object.fromEntries([
      "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    ].map((day) => [day, [{ start, action: "set_temperature", temperature, hvac_mode: "heat" }]]));
    const timelineHost = {
      ...host(),
      _currentTimelineNow: () => new Date("2026-07-21T12:00:00+02:00"),
      _formatTemperature: (value: number) => `${value} C`,
      _modeLabel: (mode: string) => mode,
      _showOverviewTimelineDetail: () => undefined,
      _data: {
        global: { mode: "auto", active_profile_ids: ["away"] },
        configured_entities: ["climate.office"],
        zones: { "climate.office": { enabled: true, schedule: week("08:00", 21) } },
        profiles: [{
          key: "away",
          name: "Away",
          icon: "mdi:briefcase-outline",
          color: "#123456",
          zones: { "climate.office": { behavior: "schedule", schedule: week("09:00", 18) } },
        }],
      },
    } as unknown as VelairViewHost;

    render(renderOverviewTimelines(timelineHost, ["climate.office"]), container);

    expect(container.querySelector(".overview-timeline-name.profiled ha-icon")?.getAttribute("icon"))
      .toBe("mdi:briefcase-outline");
    expect(container.querySelector(".overview-timeline-carry-over")?.getAttribute("title"))
      .toContain("18 °C");
    expect(container.querySelector(".overview-timeline-carry-over")?.getAttribute("title"))
      .not.toContain("21 °C");
    expect(container.querySelector(".overview-timeline-block:not(.overview-timeline-carry-over)")?.getAttribute("title"))
      .toContain("time:09:00");
    expect(container.querySelector(".overview-timeline-block:not(.overview-timeline-carry-over)")?.getAttribute("title"))
      .not.toContain("time:08:00");
  });

  it("lets a temporary override replace the profile marker while keeping the zone badge", () => {
    const container = document.createElement("div");
    const data = {
      global: { mode: "auto", active_profile_ids: ["away"] },
      zones: {
        "climate.office": {
          enabled: true,
          schedule: {},
          override: { type: "boost", temperature: 22, until: "2027-07-21T12:00:00+02:00" },
        },
      },
      profiles: [{
        key: "away",
        name: "Away",
        icon: "mdi:briefcase-outline",
        color: "#123456",
        zones: { "climate.office": { behavior: "pause", action: "none" } },
      }],
      zone_runtime: { "climate.office": { state: "boost" } },
      room_sensor_assist: {
        "climate.office": {
          status: "assisting",
          assist_delta: 1,
          direction: "heat",
        },
      },
      comfort: {
        "climate.office": {
          enabled: true,
          condition: "comfortable",
          air_quality: "good",
          data_quality: "partial",
          data_issues: ["humidity_missing"],
        },
      },
    } as never;
    const timelineHost = {
      ...host(),
      _data: data,
      _formatTemperature: (value: number) => `${value} C`,
      _modeLabel: (mode: string) => mode,
    } as unknown as VelairViewHost;

    render(html`
      ${renderOverviewTimelineName(timelineHost, "climate.office")}
      ${renderOverviewZones(timelineHost, ["climate.office"])}
    `, container);

    expect(container.querySelector(".overview-timeline-name.profiled")).toBeNull();
    expect(container.querySelector(".overview-zone-profile")?.textContent).toContain("Away");
    expect(container.querySelector(".overview-zone-profile")?.parentElement?.classList)
      .toContain("overview-zone-signals");
    expect(container.querySelector(".overview-zone-card-heading")?.firstElementChild?.classList)
      .toContain("overview-zone-card-name");
    expect([...container.querySelector(".overview-zone-signals")!.children].map((element) => element.className))
      .toEqual([
        "overview-zone-profile",
        "overview-zone-signal room-assist normal",
        "overview-zone-signal comfort-environment normal",
        "overview-zone-signal comfort-air normal",
        "overview-zone-signal comfort-data warning",
      ]);
    expect(container.querySelector(".overview-zone-profile ha-icon")?.getAttribute("icon"))
      .toBe("mdi:briefcase-outline");
    expect(container.querySelector(".overview-zone-profile")?.getAttribute("style"))
      .toContain("--overview-profile-accent: #123456");
    expect(container.querySelector(".overview-zone-profile-accent")).not.toBeNull();
    expect(overviewStyles.cssText).toMatch(/\.overview-zone-profile-accent\s*\{[^}]*background:\s*var\(--overview-profile-accent/);
    expect(overviewStyles.cssText).toMatch(/\.overview-zone-profile-accent\s*\{[^}]*align-items:\s*center/);
    expect(overviewStyles.cssText).toMatch(/\.overview-zone-profile\s*\{[^}]*border-radius:\s*8px/);
    expect(overviewStyles.cssText).not.toMatch(/\.overview-zone-profile\s*\{[^}]*border-radius:\s*999px/);
    expect(overviewStyles.cssText).toMatch(/\.overview-timeline-name ha-icon\s*\{[^}]*display:\s*inline-flex/);
    expect(overviewStyles.cssText).toMatch(/\.overview-timeline-name ha-icon\s*\{[^}]*height:\s*100%/);
  });
});
