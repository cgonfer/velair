// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import { ACTION_SET_HVAC_MODE, ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import { cardStyles } from "../../src/velair/styles/card-styles";
import { responsiveStyles } from "../../src/velair/styles/responsive-styles";
import { renderEditableBlock } from "../../src/velair/views/schedule-view";
import type { BlockDraftSource, DraftScheduleBlock } from "../../src/velair/types";

function host() {
  return {
    _fanModeOptions: () => ["quiet"],
    _humidityLimits: () => [30, 70] as [number, number],
    _hvacModeOptions: () => ["heat", "cool", "off"],
    _inputValue: (event: Event) => (event.target as HTMLInputElement | HTMLSelectElement).value,
    _modeLabel: (mode: string) => mode,
    _presetModeOptions: () => ["eco"],
    _removeBlock: vi.fn(),
    _swingHorizontalModeOptions: () => ["left"],
    _swingModeOptions: () => ["vertical"],
    _t: (key: string) => key,
    _temperatureError: () => undefined,
    _temperatureLimits: () => [5, 30] as [number, number],
    _temperatureStep: () => 0.5,
    _updateDraftBlock: vi.fn(),
  };
}

function block(hvacMode: string): DraftScheduleBlock {
  return {
    action: ACTION_SET_TEMPERATURE,
    hvac_mode: hvacMode,
    start: "08:00",
    temperature: 21,
  };
}

function modeSelect(container: HTMLElement): HTMLSelectElement {
  const select = container.querySelector("select");
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error("Mode select was not rendered.");
  }
  return select;
}

describe("editable schedule block view", () => {
  it("gives the target three mobile grid segments at 320–340 px", () => {
    expect(responsiveStyles.cssText).toMatch(
      /(?:@container|@media) \(max-width: 340px\)[\s\S]*"mode target target target";[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) 36px 36px 36px;/,
    );
  });

  it("keeps the explicit target label aligned with existing desktop and mobile visibility rules", () => {
    const cardCssText = cardStyles.map((style) => style.cssText).join("\n");
    expect(cardCssText).toMatch(
      /\.editable-block > label > \.label,\s*\.editable-block > \.target-action-field > label\.label\s*\{\s*display:\s*none;/,
    );
    expect(responsiveStyles.cssText).toMatch(
      /(?:@container|@media) \(max-width: 340px\)[\s\S]*\.editable-block > label > \.label,\s*\.editable-block > \.target-action-field > label\.label\s*\{\s*display:\s*block;/,
    );
  });

  it.each(["00:00", "00:30", "18:00", "23:00"])(
    "preserves the native time value %s",
    (start) => {
      const container = document.createElement("div");

      render(renderEditableBlock(host(), { ...block("heat"), start }, 0), container);

      expect(container.querySelector<HTMLInputElement>('input[type="time"]')?.value).toBe(start);
    },
  );

  it("keeps the mode selector in sync when a reused row receives another mode", async () => {
    const container = document.createElement("div");
    const viewHost = host();

    render(renderEditableBlock(viewHost, block("cool"), 0, "schedule"), container);
    await Promise.resolve();
    expect(modeSelect(container).value).toBe("cool");

    render(renderEditableBlock(viewHost, block("heat"), 0, "schedule"), container);
    await Promise.resolve();
    expect(modeSelect(container).value).toBe("heat");
  });

  it("switches between a temperature target and device-controlled target in the same cell", async () => {
    const container = document.createElement("div");
    const viewHost = host();

    render(renderEditableBlock(viewHost, block("auto"), 0, "schedule"), container);
    const modeOnlyToggle = container.querySelector<HTMLButtonElement>(".target-action-toggle");
    expect(modeOnlyToggle).not.toBeNull();
    expect(modeOnlyToggle?.getAttribute("aria-pressed")).toBe("true");
    expect(modeOnlyToggle?.getAttribute("aria-label")).toBe("includeTargetTemperature");
    expect(modeOnlyToggle?.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:thermometer");
    expect(container.querySelector<HTMLInputElement>('.single-temperature-field input[type="number"]')?.value).toBe("21");
    const targetLabel = container.querySelector<HTMLLabelElement>(".single-temperature-field > label");
    const targetInput = container.querySelector<HTMLInputElement>('.single-temperature-field input[type="number"]');
    expect(targetLabel?.htmlFor).toBe(targetInput?.id);
    expect(targetLabel?.querySelector("button")).toBeNull();
    modeOnlyToggle?.click();
    expect(viewHost._updateDraftBlock).toHaveBeenCalledWith(
      0,
      "action",
      ACTION_SET_HVAC_MODE,
      "schedule",
    );

    render(renderEditableBlock(viewHost, {
      ...block("auto"),
      action: ACTION_SET_HVAC_MODE,
    }, 0, "schedule"), container);
    await Promise.resolve();
    const deviceTarget = container.querySelector<HTMLButtonElement>(".target-action-toggle.device-controlled");
    const disabledInput = container.querySelector<HTMLInputElement>('.single-temperature-field input[type="number"]');
    expect(deviceTarget?.getAttribute("aria-pressed")).toBe("false");
    expect(deviceTarget?.getAttribute("aria-label")).toBe("includeTargetTemperature");
    expect(deviceTarget?.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:thermometer-off");
    expect(disabledInput?.disabled).toBe(true);
    expect(disabledInput?.placeholder).toBe("—");
    expect(disabledInput?.value).toBe("");
    deviceTarget?.click();
    expect(viewHost._updateDraftBlock).toHaveBeenCalledWith(
      0,
      "action",
      ACTION_SET_TEMPERATURE,
      "schedule",
    );
  });

  it("keeps the compact disabled state for a remembered range target", () => {
    const container = document.createElement("div");
    render(renderEditableBlock(host(), {
      action: ACTION_SET_HVAC_MODE,
      hvac_mode: "heat_cool",
      start: "08:00",
      target_temp_low: 19,
      target_temp_high: 24,
    }, 0), container);

    const inputs = [...container.querySelectorAll<HTMLInputElement>('.temperature-range-fields input')];
    expect(inputs).toHaveLength(2);
    expect(inputs.every((input) => input.disabled && input.placeholder === "—")).toBe(true);
    expect(container.querySelector(".target-action-toggle")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("normalizes missing HVAC modes to keep instead of leaving the selector blank", async () => {
    const container = document.createElement("div");
    const draft = { ...block(""), hvac_mode: undefined } as unknown as DraftScheduleBlock;

    render(renderEditableBlock(host(), draft, 0, "template" as BlockDraftSource), container);
    await Promise.resolve();

    expect(modeSelect(container).value).toBe("");
    expect(modeSelect(container).selectedOptions[0]?.textContent).toBe("keep");
  });

  it("anchors the spinner step at the climate minimum", async () => {
    const container = document.createElement("div");
    const viewHost = {
      ...host(),
      _temperatureLimits: () => [41.3, 95] as [number, number],
      _temperatureStep: () => 1,
    };

    render(renderEditableBlock(viewHost, { ...block("heat"), temperature: 42.3 }, 0), container);

    const input = container.querySelector<HTMLInputElement>('input[type="number"]');
    expect(input?.min).toBe("41.3");
    expect(input?.step).toBe("1");
    expect(input?.value).toBe("42.3");
  });

  it("uses step any when Home Assistant publishes no valid target step", () => {
    const container = document.createElement("div");
    const viewHost = { ...host(), _temperatureStep: () => undefined };

    render(renderEditableBlock(viewHost, { ...block("heat"), temperature: 42.17 }, 0), container);

    const input = container.querySelector<HTMLInputElement>('input[type="number"]');
    expect(input?.step).toBe("any");
    expect(input?.min).toBe("5");
    expect(input?.value).toBe("42.17");
  });

  it("renders separate heating and cooling targets for a range block", () => {
    const container = document.createElement("div");
    render(renderEditableBlock(host(), {
      action: ACTION_SET_TEMPERATURE,
      hvac_mode: "heat_cool",
      start: "08:00",
      target_temp_low: 19,
      target_temp_high: 24,
    }, 0), container);

    const inputs = [...container.querySelectorAll<HTMLInputElement>('.temperature-range-fields input')];
    expect(inputs.map((input) => input.value)).toEqual(["19", "24"]);
    expect(inputs.map((input) => input.getAttribute("aria-label"))).toEqual([
      "heatBelow (°C)",
      "coolAbove (°C)",
    ]);
    expect([...container.querySelectorAll(".range-input-label")].map((label) => label.textContent))
      .toEqual(["minimumShort", "maximumShort"]);
    expect(container.querySelector(".temperature-range-control")).not.toBeNull();
    expect(container.querySelector(".temperature-range-help")).toBeNull();
    expect(container.querySelector(".temperature-range-fields")?.textContent).not.toContain("Â°C");
  });

  it("renders optional climate controls when supported by the selected source", async () => {
    const container = document.createElement("div");

    render(renderEditableBlock(host(), {
      ...block("cool"),
      fan_mode: "quiet",
      humidity: "45",
      preset_mode: "eco",
      swing_horizontal_mode: "left",
      swing_mode: "vertical",
    }, 0, "template" as BlockDraftSource), container);
    await Promise.resolve();

    expect(container.textContent).toContain("climateOptions");
    expect(container.querySelector(".climate-options-toggle")).not.toBeNull();
    expect(container.querySelector(".climate-options-badge")?.textContent).toBe("5");
    expect(container.querySelector(".climate-options-inline-summary")?.textContent).toContain("fanMode: quiet");
    expect(container.textContent).toContain("fanMode");
    expect(container.textContent).toContain("presetMode");
    expect(container.textContent).toContain("swingMode");
    expect(container.textContent).toContain("horizontalSwingMode");
    expect(container.textContent).toContain("targetHumidity");
  });

  it("keeps optional climate controls compact when no value is selected", async () => {
    const container = document.createElement("div");

    render(renderEditableBlock(host(), block("cool"), 0, "schedule"), container);
    await Promise.resolve();

    expect(container.querySelector(".climate-options-toggle")).not.toBeNull();
    expect(container.querySelector(".climate-options-badge")).toBeNull();
    expect(container.querySelector(".climate-options-inline-summary")).toBeNull();
  });

  it("reserves the optional climate controls column when unsupported", async () => {
    const container = document.createElement("div");
    const viewHost = {
      ...host(),
      _fanModeOptions: () => [],
      _humidityLimits: () => undefined,
      _presetModeOptions: () => [],
      _swingHorizontalModeOptions: () => [],
      _swingModeOptions: () => [],
    };

    render(renderEditableBlock(viewHost, block("cool"), 0, "schedule"), container);
    await Promise.resolve();

    expect(container.querySelector(".climate-options-toggle")).toBeNull();
    expect(container.querySelector(".advanced-climate-options-placeholder")).not.toBeNull();
  });

  it("limits the optional climate controls popover width on wide screens", async () => {
    const container = document.createElement("div");

    render(renderEditableBlock(host(), block("cool"), 0, "schedule"), container);
    await Promise.resolve();

    const details = container.querySelector(".advanced-climate-options");
    const summary = container.querySelector(".climate-options-toggle");
    if (!(details instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement)) {
      throw new Error("Optional climate controls button was not rendered.");
    }

    vi.spyOn(summary, "getBoundingClientRect").mockReturnValue({
      bottom: 148,
      height: 38,
      left: 820,
      right: 858,
      top: 110,
      width: 38,
      x: 820,
      y: 110,
      toJSON: () => ({}),
    });
    vi.stubGlobal("innerWidth", 1280);
    vi.stubGlobal("innerHeight", 760);

    summary.click();
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    expect(details.style.getPropertyValue("--climate-options-width")).toBe("420px");
  });

  it("closes optional climate controls when the outside scrim is clicked", async () => {
    const container = document.createElement("div");

    render(renderEditableBlock(host(), block("cool"), 0, "schedule"), container);
    await Promise.resolve();

    const details = container.querySelector(".advanced-climate-options");
    const scrim = container.querySelector(".climate-options-scrim");
    if (!(details instanceof HTMLDetailsElement) || !(scrim instanceof HTMLButtonElement)) {
      throw new Error("Optional climate controls dialog was not rendered.");
    }

    details.open = true;
    scrim.click();

    expect(details.open).toBe(false);
  });

  it("positions optional climate controls near the clicked button", async () => {
    const container = document.createElement("div");

    render(renderEditableBlock(host(), block("cool"), 0, "schedule"), container);
    await Promise.resolve();

    const details = container.querySelector(".advanced-climate-options");
    const summary = container.querySelector(".climate-options-toggle");
    if (!(details instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement)) {
      throw new Error("Optional climate controls button was not rendered.");
    }

    vi.spyOn(summary, "getBoundingClientRect").mockReturnValue({
      bottom: 148,
      height: 38,
      left: 240,
      right: 278,
      top: 110,
      width: 38,
      x: 240,
      y: 110,
      toJSON: () => ({}),
    });
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 760);

    summary.click();
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    expect(details.open).toBe(true);
    expect(details.style.getPropertyValue("--climate-options-top")).toBe("156px");
    expect(details.style.getPropertyValue("--climate-options-translate-y")).toBe("0");
    expect(details.style.getPropertyValue("--climate-options-width")).toBe("358px");
  });
});
