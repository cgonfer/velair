// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { timelineBlocksFromDrafts } from "../../src/velair/domain/timeline";
import { renderTemplatePanel, renderTimeline } from "../../src/velair/views/schedule-view";

function host() {
  const state = {
    _inputValue: (event: Event) => (event.target as HTMLSelectElement).value,
    _scheduleTemplates: () => [{ key: "comfort", name: "Comfort", blocks: [] }],
    _selectScheduleTemplate: vi.fn((key: string) => {
      state._selectedTemplateKey = key ? "" : key;
    }),
    _selectedTemplateKey: "",
    _t: (key: string) => key,
    _templateLabel: (template: { name?: string; key: string }) => template.name ?? template.key,
  };
  return state as unknown as VelairViewHost;
}

describe("schedule view", () => {
  it("resets the template selector visually after applying a schedule template", () => {
    const container = document.createElement("div");
    const viewHost = host();

    render(renderTemplatePanel(viewHost), container);

    const select = container.querySelector("select") as HTMLSelectElement;
    select.value = "comfort";
    select.dispatchEvent(new Event("change"));

    expect(viewHost._selectScheduleTemplate).toHaveBeenCalledWith("comfort");
    expect(select.value).toBe("");
  });

  it("renders weekly carry-over as informational without adding editable behavior", () => {
    const container = document.createElement("div");
    const drafts = [{ start: "08:00", action: "set_temperature", temperature: 21, hvac_mode: "heat" }];
    const viewHost = {
      _currentTimelineNow: () => new Date("2026-08-04T12:00:00"),
      _formatScheduleTime: (value: string) => value,
      _formatTemperature: (value: number) => `${value} C`,
      _handleTimelineDragEnd: vi.fn(),
      _handleTimelineDragOver: vi.fn(),
      _handleTimelineDrop: vi.fn(),
      _handleTimelineResizeStart: vi.fn(),
      _modeLabel: (mode: string) => mode,
      _t: (key: string, replacements?: Record<string, string>) =>
        replacements ? `${key}:${Object.values(replacements).join("")}` : key,
      _timelineBlocks: () => timelineBlocksFromDrafts(drafts),
      _shortWeekdayName: (weekday: string) => weekday.slice(0, 3),
      _weekdayName: (weekday: string) => weekday,
    } as unknown as VelairViewHost;

    render(renderTimeline(viewHost, "climate.office", "schedule", {
      schedule: {
        monday: [{ start: "22:00", action: "turn_off" }],
        tuesday: drafts,
      },
      weekday: "tuesday",
    }), container);

    const carry = container.querySelector(".timeline-carry-over");
    expect(carry?.getAttribute("draggable")).toBe("false");
    expect(carry?.getAttribute("role")).toBe("img");
    expect(carry?.getAttribute("title")).toContain("timelineContinuesFrom:mon22:00");
    expect(carry?.textContent).toContain("off");
    expect(carry?.querySelector(".timeline-resize-handle")).toBeNull();
    expect(container.querySelectorAll(".timeline-block:not(.timeline-carry-over)")).toHaveLength(1);
  });

  it("does not derive weekly carry-over for a template timeline", () => {
    const container = document.createElement("div");
    const viewHost = {
      _currentTimelineNow: () => new Date("2026-08-04T12:00:00"),
      _t: (key: string) => key,
      _timelineBlocks: () => [],
    } as unknown as VelairViewHost;

    render(renderTimeline(viewHost, undefined, "template"), container);

    expect(container.querySelector(".timeline-carry-over")).toBeNull();
    expect(container.querySelector(".timeline-empty")?.textContent).toBe("noBlocks");
  });
});
