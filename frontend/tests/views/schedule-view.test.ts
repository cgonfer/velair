// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { timelineBlocksFromDrafts } from "../../src/velair/domain/timeline";
import { renderSchedulesView, renderTemplatePanel, renderTimeline } from "../../src/velair/views/schedule-view";

const TEST_SCHEDULE_CARD_TAG = "test-velair-schedule-workspace-card";
if (!customElements.get(TEST_SCHEDULE_CARD_TAG)) {
  customElements.define(TEST_SCHEDULE_CARD_TAG, VelairCard);
}

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
  it("derives the initial Schedules day from the local date", () => {
    const element = document.createElement(TEST_SCHEDULE_CARD_TAG) as VelairCard;
    element.setConfig({ view: "schedules" });
    const internal = element as unknown as {
      _initialScheduleWeekday: (firstWeekday: string) => string;
      _timelineNow: Date;
    };
    internal._timelineNow = new Date(2026, 7, 12, 12, 0, 0);

    expect(internal._initialScheduleWeekday("saturday")).toBe("wednesday");
  });

  it("keeps or discards the active source draft according to confirmation", () => {
    const element = document.createElement(TEST_SCHEDULE_CARD_TAG) as VelairCard;
    const internal = element as unknown as {
      _dirty: boolean;
      _profileScheduleDirty: boolean;
      _scheduleSource: "default" | "profile";
      _selectScheduleSource: (source: "default" | "profile") => void;
      _resetDraftBlocks: ReturnType<typeof vi.fn>;
    };
    internal._dirty = true;
    internal._scheduleSource = "default";
    internal._resetDraftBlocks = vi.fn(() => { internal._dirty = false; });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);

    internal._selectScheduleSource("profile");
    expect(internal._scheduleSource).toBe("default");
    expect(internal._resetDraftBlocks).not.toHaveBeenCalled();

    internal._selectScheduleSource("profile");
    expect(internal._scheduleSource).toBe("profile");
    expect(internal._resetDraftBlocks).toHaveBeenCalledOnce();
    expect(internal._profileScheduleDirty).toBe(false);
    confirm.mockRestore();
  });

  it("offers Default and Profile schedules only in the sidebar workspace", () => {
    const container = document.createElement("div");
    const selectSource = vi.fn();
    const viewHost = {
      _data: { profiles: [] },
      _hasExternalConfig: false,
      _scheduleSource: "default",
      _selectScheduleSource: selectSource,
      _t: (key: string) => key,
    } as unknown as VelairViewHost;

    render(renderSchedulesView(viewHost, []), container);

    const group = container.querySelector<HTMLElement>('.schedule-source-selector[role="group"]');
    const tabs = group?.querySelectorAll<HTMLElement>("button") ?? [];
    expect(group?.getAttribute("aria-label")).toBe("scheduleSourceLabel");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(tabs[1]?.getAttribute("aria-pressed")).toBe("false");
    expect(tabs[0]?.textContent).toContain("defaultSchedules");
    expect(tabs[1]?.textContent).toContain("profileSchedules");
    tabs[1]?.click();
    expect(selectSource).toHaveBeenCalledWith("profile");
  });

  it("routes Profile schedule failures to the host notice stack", () => {
    const container = document.createElement("div");
    const showError = vi.fn();
    const viewHost = {
      _applyScheduleData: vi.fn(),
      _currentTimelineNow: () => new Date(),
      _data: { configured_entities: [], profiles: [], settings: {}, zones: {} },
      _hasExternalConfig: false,
      _scheduleSource: "profile",
      _selectedWeekday: "monday",
      _setProfileScheduleDirty: vi.fn(),
      _showError: showError,
      _showSuccess: vi.fn(),
      _t: (key: string) => key,
    } as unknown as VelairViewHost;

    render(renderSchedulesView(viewHost, []), container);
    container.querySelector("velair-profiles-view")?.dispatchEvent(new CustomEvent(
      "profile-error",
      { bubbles: true, composed: true, detail: "Invalid Profile" },
    ));

    expect(showError).toHaveBeenCalledWith("Invalid Profile");
  });

  it("keeps the Lovelace schedules view on Default schedules", () => {
    const container = document.createElement("div");
    const viewHost = {
      _hasExternalConfig: true,
      _scheduleSource: "profile",
      _t: (key: string) => key,
    } as unknown as VelairViewHost;

    render(renderSchedulesView(viewHost, []), container);

    expect(container.querySelector(".schedule-source-selector")).toBeNull();
    expect(container.querySelector("velair-profiles-view")).toBeNull();
    expect(container.textContent).toContain("noManagedEntities");
  });

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
