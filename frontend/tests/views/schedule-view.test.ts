// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { ACTION_SET_HVAC_MODE } from "../../src/velair/constants";
import { timelineBlocksFromDrafts } from "../../src/velair/domain/timeline";
import { cardStyles } from "../../src/velair/styles/card-styles";
import type { DraftScheduleBlock } from "../../src/velair/types";
import {
  renderScheduleEditor,
  renderSchedulesView,
  renderTemplatePanel,
  renderTimeline,
} from "../../src/velair/views/schedule-view";

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
  it("applies Default clone presets without cloning and excludes the source day", () => {
    const element = document.createElement(TEST_SCHEDULE_CARD_TAG) as VelairCard;
    const clone = vi.fn();
    const internal = element as unknown as {
      _copySelectedDay: typeof clone;
      _copyTargets: Set<string>;
      _selectedWeekday: string;
      _setCopyTargetPreset: (preset: "weekdays" | "weekend" | "all" | "clear") => void;
    };
    internal._copySelectedDay = clone;
    internal._selectedWeekday = "saturday";

    internal._setCopyTargetPreset("weekend");
    expect([...internal._copyTargets]).toEqual(["sunday"]);
    internal._setCopyTargetPreset("all");
    expect(internal._copyTargets.has("saturday")).toBe(false);
    expect(internal._copyTargets.size).toBe(6);
    internal._setCopyTargetPreset("clear");
    expect(internal._copyTargets.size).toBe(0);
    expect(clone).not.toHaveBeenCalled();
  });

  it("shows controller switchpoint usage only in an externally executed Default schedule", () => {
    const container = document.createElement("div");
    const viewHost = {
      _addBlock: vi.fn(),
      _copySelectedDay: vi.fn(),
      _copyTargets: new Set<string>(),
      _copying: false,
      _currentTimelineNow: () => new Date(2026, 7, 12, 12, 0),
      _data: {
        configured_entities: ["climate.office"],
        external_execution: {
          systems: [{
            provider: "ramses_cc",
            capabilities: {
              max_switchpoints_per_day: 6,
              implicit_midnight_change_counts_toward_limit: true,
            },
          }],
        },
      },
      _dirty: false,
      _draftBlocks: [],
      _formatScheduleTime: (value: string) => value,
      _handleTimelineDragEnd: vi.fn(),
      _handleTimelineDragOver: vi.fn(),
      _handleTimelineDrop: vi.fn(),
      _handleTimelineResizeStart: vi.fn(),
      _hasDraftValidationError: () => false,
      _inputValue: () => "",
      _orderedWeekdays: () => ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      _saveSelectedDay: vi.fn(),
      _saveTemplate: vi.fn(),
      _scheduleTemplates: () => [],
      _selectedEntity: "climate.office",
      _selectedTemplateKey: "",
      _selectedWeekday: "monday",
      _selectScheduleTemplate: vi.fn(),
      _selectWeekday: vi.fn(),
      _setCopyTargetPreset: vi.fn(),
      _shortWeekdayName: (weekday: string) => weekday.slice(0, 3),
      _t: (key: string, values?: Record<string, string | number>) => {
        if (key === "externalSwitchpointUsage") return `${values?.used} of ${values?.max} controller switchpoints`;
        if (key === "externalSwitchpointBreakdown") return `${values?.count} scheduled blocks`;
        return key;
      },
      _templateLabel: () => "",
      _timelineBlocks: () => [],
      _toggleCopyTarget: vi.fn(),
      _visibleZoneIds: () => ["climate.office"],
      _weekdayName: (weekday: string) => weekday,
      _zoneTargets: new Set<string>(),
    } as unknown as VelairViewHost;
    const externalZone = {
      enabled: true,
      schedule: {},
      execution: { type: "external", provider: "ramses_cc" },
    } as const;

    render(renderScheduleEditor(viewHost, "climate.office", externalZone), container);
    const externalNotice = container.querySelector(".external-execution-notice");
    expect(externalNotice).not.toBeNull();
    expect(externalNotice?.getAttribute("role")).toBe("status");
    expect(externalNotice?.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:information-outline");
    expect(container.querySelector(".external-switchpoint-usage")?.textContent)
      .toContain("1 of 6 controller switchpoints");
    const presets = container.querySelector(".copy-presets")!;
    const dayTargets = container.querySelector(".copy-targets")!;
    expect(presets.compareDocumentPosition(dayTargets) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();

    render(renderScheduleEditor(viewHost, "climate.office", {
      enabled: true,
      schedule: {},
    }), container);
    expect(container.querySelector(".external-switchpoint-usage")).toBeNull();
  });

  it("balances external editor typography and scales additive clone presets toward day targets", () => {
    const cssText = cardStyles.map((style) => style.cssText).join("\n");

    expect(cssText).toMatch(/\.schedule-editor-badges \.pill\s*\{[^}]*font-size:\s*12px[^}]*line-height:\s*1\.2/);
    expect(cssText).toMatch(/\.external-execution-notice\s*\{[^}]*background:[^}]*var\(--info-color[^}]*border-color:[^}]*var\(--info-color[^}]*font-size:\s*12px[^}]*line-height:\s*1\.4/);
    expect(cssText).toMatch(/\.external-execution-notice ha-icon\s*\{[^}]*color:\s*var\(--info-color/);
    expect(cssText).toMatch(/\.copy-preset-button\s*\{[^}]*font-size:\s*13px[^}]*min-height:\s*34px/);
    expect(cssText).toMatch(/\.copy-preset-button ha-icon\s*\{[^}]*--mdc-icon-size:\s*17px/);
    expect(cssText).toMatch(/\.copy-preset-clear\.actionable\s*\{[^}]*background:[^}]*var\(--primary-color\)[^}]*border-color/);
    expect(cssText).toMatch(/\.copy-targets:not\(\.wide\) \.check-target\s*\{[^}]*padding:\s*8px 6px/);
    expect(cssText).toMatch(/\.copy-targets:not\(\.wide\) \.check-target input\s*\{[^}]*height:\s*16px/);
  });

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

  it("renders mode-only timeline and carry-over blocks without inventing a target", () => {
    const container = document.createElement("div");
    const drafts: DraftScheduleBlock[] = [{
      action: ACTION_SET_HVAC_MODE,
      start: "08:00",
      hvac_mode: "auto",
    }];
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
        monday: [{ action: ACTION_SET_HVAC_MODE, start: "22:00", hvac_mode: "auto" }],
        tuesday: drafts,
      },
      weekday: "tuesday",
    }), container);

    const blocks = [
      container.querySelector(".timeline-carry-over"),
      container.querySelector(".timeline-block:not(.timeline-carry-over)"),
    ];
    for (const block of blocks) {
      expect(block).not.toBeNull();
      expect(block?.classList.contains("mode-auto")).toBe(true);
      expect(block?.querySelector("small")?.textContent).toBe("auto");
      expect(block?.querySelector("span")?.textContent).not.toBe("invalidTemperatureRange");
      expect(block?.getAttribute("title")).not.toContain("invalidTemperatureRange");
      expect(block?.getAttribute("title")).not.toMatch(/\b\d+(?:\.\d+)?\s*C\b/);
    }
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
