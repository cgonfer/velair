// @vitest-environment jsdom
import { render } from "lit";
import { timelineStyles } from "../../src/velair/styles/timeline-styles";
import { describe, expect, it, vi } from "vitest";
import type { VelairViewHost } from "../../src/velair/host-types";
import { renderTimeline, renderTimelineBlock, renderTimelineCarryOverBlock } from "../../src/velair/views/schedule-view";

function fixture() {
  const container = document.createElement("div");
  document.body.append(container);
  const host = {
    _selectedWeekday: "tuesday", _selectedEntity: "climate.room",
    _t: (key: string) => key, _formatScheduleTime: (time: string) => time,
    _formatTemperature: (temperature: number) => `${temperature} C`,
    _shortWeekdayName: (day: string) => day, _modeLabel: (mode: string) => mode,
    _handleTimelineDragStart: vi.fn(), _handleTimelineDragEnd: vi.fn(), _handleTimelineResizeStart: vi.fn(),
    _data: { zones: {}, templates: [{ key: "work", name: "Working day", blocks: [] }],
      block_presets: [{ key: "comfort", name: "Shared comfort", config: { action: "set_temperature", temperature: 99 } }] },
    _effectivePresetBlock: () => ({ start: "07:00", action: "set_temperature", temperature: 20.5, hvac_mode: "cool", fan_mode: "low" }),
  } as unknown as VelairViewHost;
  const block = { index: 0, nextIndex: 1, startMinute: 420, endMinute: 1380, left: 29, width: 66,
    draft: { start: "07:00", preset_key: "comfort", action: "", hvac_mode: "", slot_id: "A" } };
  return { container, host, block };
}

describe("linked timeline details", () => {
  it("shows adapted target with distinct origin icons and complete details", () => {
    const { container, host, block } = fixture();
    host._draftTemplateLink = { template_key: "work", bindings: {} };
    render(renderTimelineBlock(host, block, "climate.room"), container);
    const anchor = container.querySelector<HTMLElement>(".timeline-block")!;
    expect(anchor.querySelector(".timeline-target")?.textContent).toContain("20.5 C");
    expect(anchor.textContent).not.toContain("Shared comfort");
    expect(anchor.querySelector('[icon="mdi:link-variant"]')).not.toBeNull();
    expect(anchor.querySelector('[icon="mdi:content-copy"]')).not.toBeNull();
    expect(anchor.getAttribute("aria-label")).toContain("velairPreset: Shared comfort");
    expect(anchor.getAttribute("aria-label")).toContain("timelineLinkedTemplate: Working day");
    expect(anchor.getAttribute("aria-label")).toContain("fanMode: low");
    expect(anchor.getAttribute("title")).toBe(anchor.getAttribute("aria-label"));
    expect(anchor.getAttribute("title")).toContain("20.5 C");
    expect(anchor.getAttribute("title")).not.toContain("99");
    anchor.focus();
    anchor.click();
    anchor.dispatchEvent(new Event("pointerenter"));
    expect(container.querySelector(".inline-help-tooltip")).toBeNull();
    expect(anchor.hasAttribute("aria-expanded")).toBe(false);
  });

  it("does not infer a template link from a copied slot or library editor", () => {
    const { container, host, block } = fixture();
    render(renderTimelineBlock(host, block, "climate.room"), container);
    expect(container.querySelector('[icon="mdi:content-copy"]')).toBeNull();
    host._draftTemplateLink = { template_key: "work", bindings: {} };
    render(renderTimelineBlock(host, block, "climate.room", "template"), container);
    expect(container.querySelector('[icon="mdi:content-copy"]')).toBeNull();
  });

  it("reports pending/error without using the library target", () => {
    const { container, host, block } = fixture();
    host._effectivePresetBlock = () => undefined;
    host._presetSettingsStatus = () => "loading";
    render(renderTimelineBlock(host, block, "climate.room"), container);
    expect(container.querySelector(".timeline-target")?.textContent).toContain("presetSettingsLoading");
    expect(container.querySelector(".timeline-block")?.textContent).not.toMatch(/99|0 C/);
    host._presetSettingsStatus = () => "unavailable";
    render(renderTimelineBlock(host, block, "climate.room"), container);
    expect(container.querySelector(".timeline-target")?.textContent).toContain("sharedPresetUnavailable");
  });

  it("shows ranges and non-temperature actions faithfully", () => {
    const { container, host, block } = fixture();
    for (const action of ["turn_off", "set_hvac_mode", "set_climate_options"] as const) {
      host._effectivePresetBlock = () => ({ start: "07:00", action, ...(action === "set_hvac_mode" ? { hvac_mode: "auto" } : action === "set_climate_options" ? { fan_mode: "low" } : {}) });
      render(renderTimelineBlock(host, block, "climate.room"), container);
      expect(container.querySelector(".timeline-target")?.textContent).not.toMatch(/\d+ C|invalidTemperatureRange/);
    }
    host._effectivePresetBlock = () => ({ start: "07:00", action: "set_temperature", target_temp_low: 19, target_temp_high: 24, hvac_mode: "heat_cool" });
    render(renderTimelineBlock(host, block, "climate.room"), container);
    expect(container.querySelector(".timeline-target")?.textContent).toContain("19");
    expect(container.querySelector(".timeline-target")?.textContent).toContain("24 C");
  });

  it("uses the carry-over source day callback and never the current day preset", () => {
    const { container, host, block } = fixture();
    const effective = vi.fn(() => ({ start: "23:00", action: "turn_off" as const }));
    host._effectivePresetBlockForDay = effective;
    host._timelineTemplateLinkForDay = (day) => day === "monday" ? { template_key: "work", bindings: {} } : undefined;
    render(renderTimelineCarryOverBlock(host, { block: { ...block.draft, start: "23:00" }, sourceWeekday: "monday", width: 29, left: 0 } as never, "climate.room"), container);
    expect(effective).toHaveBeenCalledWith(expect.objectContaining({ start: "23:00" }), 0, "monday");
    expect(container.querySelector(".timeline-target")?.textContent).toContain("off");
    expect(container.querySelector('[icon="mdi:content-copy"]')).not.toBeNull();
    expect(container.querySelector(".timeline-block")?.getAttribute("aria-label")).toContain("Working day");
  });

  it("retains drag/resize handlers without opening interactive help during gestures", () => {
    const { container, host, block } = fixture();
    render(renderTimelineBlock(host, block, "climate.room"), container);
    const anchor = container.querySelector<HTMLElement>(".timeline-block")!;
    anchor.focus();
    anchor.querySelector(".timeline-resize-handle")!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(host._handleTimelineResizeStart).toHaveBeenCalledWith(0, "start", "schedule", expect.any(Event));
    anchor.querySelector(".timeline-resize-handle.right")!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(host._handleTimelineResizeStart).toHaveBeenCalledWith(0, "end", "schedule", expect.any(Event));
    anchor.dispatchEvent(new FocusEvent("focus"));
    expect(container.querySelector(".inline-help-tooltip")).toBeNull();
    document.dispatchEvent(new Event("pointerup"));
    anchor.click();
    expect(anchor.hasAttribute("aria-expanded")).toBe(false);
    anchor.dispatchEvent(new Event("dragstart", { bubbles: true }));
    expect(host._handleTimelineDragStart).toHaveBeenCalled();
    anchor.dispatchEvent(new Event("dragend", { bubbles: true }));
    expect(host._handleTimelineDragEnd).toHaveBeenCalled();
    expect(anchor.getAttribute("title")).toContain("velairPreset: Shared comfort");
  });
  it("reads saved carry-over preset metadata from Default when a Profile inherits it", () => {
    const { container, host } = fixture();
    host._resourceProfileKey = "inherited";
    host._data = { ...host._data, profiles: [{ key: "inherited", name: "Inherited", zones: {} }],
      zones: { "climate.room": { schedule: {}, template_links: { monday: { template_key: "work", bindings: {} } } } },
      resolved_block_metadata: { default: { "climate.room": { monday: [{ start: "23:00", preset_key: "comfort", template_key: "work" }] } }, profiles: {} },
    } as never;
    render(renderTimelineCarryOverBlock(host, { block: { start: "23:00", action: "set_temperature", temperature: 18 }, sourceWeekday: "monday", width: 29, left: 0 } as never, "climate.room", "template", true), container);
    expect(container.querySelector(".timeline-target")?.textContent).toContain("18 C");
    expect(container.querySelector('[icon="mdi:link-variant"]')).not.toBeNull();
    expect(container.querySelector('[icon="mdi:content-copy"]')).not.toBeNull();
    expect(container.querySelector(".timeline-block")?.getAttribute("aria-label")).toContain("Shared comfort");
  });

  it("resolves raw Default carry-over references when only the selected day has blocks", () => {
    const { container, host, block } = fixture();
    host._selectedWeekday = "monday";
    host._draftTemplateLink = { template_key: "work", bindings: { A: { preset_key: "comfort" } } };
    host._timelineTemplateLinkForDay = () => host._draftTemplateLink;
    host._effectivePresetBlockForDay = (reference, index) => host._effectivePresetBlock?.(reference, index, "schedule");
    host._timelineBlocks = () => [block];
    host._currentTimelineNow = () => new Date("2026-10-05T12:00:00");
    render(renderTimeline(host, "climate.room", "schedule", {
      weekday: "monday", resolved: true, schedule: {
        monday: [{ start: "07:00", action: "set_temperature", temperature: 20.5 }],
        tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [],
      },
    }), container);
    const carry = container.querySelector(".timeline-carry-over")!;
    expect(carry.querySelector(".timeline-target")?.textContent).toContain("20.5 C");
    expect(carry.textContent).not.toContain("invalidTemperatureRange");
    expect(carry.querySelector('[icon="mdi:link-variant"]')).not.toBeNull();
    expect(carry.querySelector('[icon="mdi:content-copy"]')).not.toBeNull();
    expect(block.draft.preset_key).toBe("comfort");
    expect(host._draftTemplateLink.bindings.A).toEqual({ preset_key: "comfort" });
  });

  it("uses the actual last draft index for a moved current-day carry-over preset", () => {
    const { container, host, block } = fixture();
    host._selectedWeekday = "monday";
    const night = { ...block, index: 1, nextIndex: undefined, left: 92, width: 8,
      draft: { ...block.draft, start: "22:00", preset_key: "night", slot_id: "B" } };
    const getter = vi.fn((_reference, index: number) => index === 1
      ? { start: "23:00", action: "set_temperature" as const, temperature: 18 }
      : { start: "07:00", action: "set_temperature" as const, temperature: 21 });
    host._effectivePresetBlockForDay = getter;
    host._timelineBlocks = () => [block, night];
    host._currentTimelineNow = () => new Date("2026-10-05T12:00:00");
    render(renderTimeline(host, "climate.room", "schedule", {
      weekday: "monday", resolved: true, schedule: {
        monday: [{ start: "07:00", action: "set_temperature", temperature: 21 }, { start: "23:00", action: "set_temperature", temperature: 18 }],
        tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [],
      },
    }), container);
    expect(getter).toHaveBeenCalledWith(expect.objectContaining({ start: "22:00", preset_key: "night" }), 1, "monday");
    const carry = container.querySelector(".timeline-carry-over")!;
    expect(carry.querySelector(".timeline-target")?.textContent).toContain("18 C");
    expect(carry.textContent).not.toMatch(/Loading|invalidTemperatureRange/);
  });

  it("preserves interval width and uses actual-width responsive target priority", () => {
    const { container, host, block } = fixture();
    host._draftTemplateLink = { template_key: "work", bindings: {} };
    render(renderTimelineBlock(host, { ...block, width: 4.17 }, "climate.room"), container);
    const narrow = container.querySelector<HTMLElement>(".timeline-block")!;
    expect(timelineStyles.cssText).toContain("container-name: timeline-block");
    expect(timelineStyles.cssText).toMatch(/@container timeline-block \(max-width: 64px\)/);
    expect(timelineStyles.cssText).toMatch(/@container timeline-block[^}]*\{[^]*?ha-icon \{ display: none;/);
    expect(narrow.style.width).toBe("4.17%");
    expect(narrow.querySelector(".timeline-target")?.textContent).toContain("20.5 C");
    expect(narrow.getAttribute("aria-label")).toContain("Shared comfort");
    expect(narrow.getAttribute("aria-label")).toContain("Working day");
    render(renderTimelineBlock(host, { ...block, width: 8 }, "climate.room"), container);
    expect(container.querySelector(".timeline-block")?.classList.contains("narrow")).toBe(false);
    expect(container.querySelector('[icon="mdi:link-variant"]')).not.toBeNull();
  });

});
