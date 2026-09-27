// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import { ACTION_SET_CLIMATE_OPTIONS, ACTION_SET_HVAC_MODE, ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import { cardStyles } from "../../src/velair/styles/card-styles";
import { responsiveStyles } from "../../src/velair/styles/responsive-styles";
import { renderEditableBlock } from "../../src/velair/views/schedule-view";
import type { BlockDraftSource, DraftScheduleBlock } from "../../src/velair/types";

function host() {
  return {
    _fanModeOptions: () => ["quiet"],
    _formatTemperature: (value: number) => String(value) + " °C",
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

function translatedHost() {
  const viewHost = host();
  return {
    ...viewHost,
    _t: (key: string, replacements: Record<string, string | number> = {}) => {
      const messages: Record<string, string> = {
        blockNoTarget: "No temperature target.",
        blockSendHelp: "What this block sends",
        blockOptionsOnlySummary: "Sends only {options}. Does not change the HVAC mode or turn on the climate.",
        blockSendsTarget: "Sends target {target}.",
        blockKeepModeSummary: "Keeps the current mode while on; if off, turns on in a compatible mode.",
        blockSingleNoRange: "One temperature is never converted into a range.",
        blockAlsoSendsOptions: "Also sends {options}.",
        keepModePrevious: "An earlier block selects {mode}.",
        keepModeCurrent: "The climate is currently in {mode}.",
        keepModeScalarWarning: "If that mode remains active, the single temperature will fail.",
        keepModeRangeWarning: "If that mode remains active, the range will fail.",
        keepModeOnlyOptionsHint: "Disable the target to apply only options.",
        presetMode: "Preset",
        swingMode: "Swing",
      };
      return Object.entries(replacements).reduce(
        (message, [name, value]) => message.replace("{" + name + "}", String(value)),
        messages[key] ?? key,
      );
    },
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
  it("shows a clear inline message when the final option is removed", () => {
    const container = document.createElement("div");
    render(renderEditableBlock(host(), {
      action: ACTION_SET_CLIMATE_OPTIONS, start: "08:00", hvac_mode: "",
    }, 0), container);
    expect(container.querySelector('[role="alert"]')?.textContent)
      .toBe("climateOptionsRequiredAt");
    expect(container.querySelector(".editable-block.invalid")).not.toBeNull();
  });

  it("uses selected options to disable the target and keeps their controls accessible", () => {
    const container = document.createElement("div");
    const viewHost = host();
    render(renderEditableBlock(viewHost, { ...block(""), preset_mode: "eco" }, 0), container);
    const toggle = container.querySelector<HTMLButtonElement>(".target-action-toggle");
    expect(toggle?.disabled).toBe(false);
    toggle?.click();
    expect(viewHost._updateDraftBlock).toHaveBeenCalledWith(
      0, "action", ACTION_SET_CLIMATE_OPTIONS, "schedule",
    );
    render(renderEditableBlock(viewHost, { ...block(""), action: ACTION_SET_CLIMATE_OPTIONS,
      preset_mode: "eco" }, 0), container);
    expect(container.querySelector<HTMLInputElement>(".single-temperature-field input")?.disabled).toBe(true);
    expect(container.querySelector<HTMLSelectElement>('select')?.disabled).toBe(true);
    expect(container.querySelector(".advanced-climate-options")).not.toBeNull();
    expect(container.textContent).toContain("presetMode");
    expect(container.querySelector<HTMLButtonElement>(".target-action-toggle")?.disabled).toBe(false);
  });

  it("keeps selected options compact and previews the commands inside their panel", () => {
    const container = document.createElement("div");
    const viewHost = translatedHost();
    const draft = { ...block(""), temperature: 19, preset_mode: "boost", swing_mode: "auto" };

    render(renderEditableBlock(viewHost, draft, 0), container);
    expect(container.querySelector(".block-action-guidance")).toBeNull();
    expect(container.querySelector(".climate-options-inline-summary")?.textContent)
      .toContain("Preset: boost • Swing: auto");
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("Sends target 19 °C.");
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("Also sends Preset: boost • Swing: auto.");
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("Keeps the current mode while on");
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("One temperature is never converted into a range.");
    expect(container.querySelector(".advanced-climate-options-fields .block-command-preview")).not.toBeNull();

    render(renderEditableBlock(viewHost, { ...draft, action: ACTION_SET_CLIMATE_OPTIONS }, 0), container);
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("No temperature target.");
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("Sends only Preset: boost • Swing: auto.");
    expect(container.querySelector(".block-command-preview")?.textContent).not.toContain("19 °C");
    expect(container.querySelector(".block-command-preview")?.textContent)
      .not.toContain("One temperature is never converted into a range.");
    expect(container.querySelector(".block-mode-warning")).toBeNull();
  });

  it("previews an explicit mode and either a single target or a range", () => {
    const container = document.createElement("div");
    const viewHost = translatedHost();
    render(renderEditableBlock(viewHost, { ...block("heat"), preset_mode: "eco" }, 0), container);
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("Sends target 21 °C.");
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("mode: heat");
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("Also sends Preset: eco.");

    render(renderEditableBlock(viewHost, {
      ...block("heat_cool"), temperature: undefined,
      target_temp_low: 20, target_temp_high: 24, preset_mode: "eco",
    }, 0), container);
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("Sends target 20–24 °C.");
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("mode: heat_cool");
    expect(container.querySelector(".block-command-preview")?.textContent)
      .not.toContain("One temperature is never converted into a range.");
  });

  it("warns about a preceding Heat/cool range while keeping the block valid", () => {
    const container = document.createElement("div");
    const viewHost = {
      ...translatedHost(),
      hass: { states: { "climate.room": {
        state: "heat",
        attributes: { supported_features: 3 },
      } } },
    };
    const first = {
      ...block("heat_cool"), start: "00:00",
      temperature: undefined, target_temp_low: 20, target_temp_high: 24,
    };
    const later = { ...block(""), start: "13:45", temperature: 19, preset_mode: "boost" };
    render(renderEditableBlock(viewHost, later, 1, "schedule", {
      entityId: "climate.room", dayBlocks: [first, later],
    }), container);

    const warning = container.querySelector(".block-mode-warning");
    expect(warning?.getAttribute("role")).toBe("status");
    expect(warning?.textContent).toContain("An earlier block selects heat_cool.");
    expect(warning?.textContent).toContain("the single temperature will fail");
    expect(warning?.textContent).toContain("Disable the target to apply only options.");
    expect(container.querySelector(".editable-block.invalid")).toBeNull();

    render(renderEditableBlock(viewHost, { ...later, action: ACTION_SET_CLIMATE_OPTIONS }, 1, "schedule", {
      entityId: "climate.room", dayBlocks: [first, later],
    }), container);
    expect(container.querySelector(".block-mode-warning")).toBeNull();
    expect(container.querySelector(".block-command-preview")?.textContent)
      .toContain("No temperature target.");
  });

  it("uses the live mode when no earlier block selects one, and stays general in templates", () => {
    const container = document.createElement("div");
    const viewHost = {
      ...translatedHost(),
      hass: { states: { "climate.room": {
        state: "heat_cool",
        attributes: { supported_features: 3 },
      } } },
    };
    const draft = { ...block(""), temperature: 19 };
    const context = { entityId: "climate.room", dayBlocks: [draft] };
    render(renderEditableBlock(viewHost, draft, 0, "schedule", context), container);
    expect(container.querySelector(".block-mode-warning")?.textContent)
      .toContain("The climate is currently in heat_cool.");

    render(renderEditableBlock(viewHost, draft, 0, "template"), container);
    expect(container.querySelector(".block-action-guidance")).toBeNull();
    expect(container.querySelector(".block-mode-warning")).toBeNull();
  });

  it("keeps exceptional warnings wrapped and the in-panel preview readable", () => {
    const css = cardStyles.map((style) => style.cssText).join("\n");
    expect(css).toMatch(/\.block-mode-warning\s*\{[^}]*grid-column:\s*1 \/ -1;/);
    expect(css).toMatch(/\.block-mode-warning\s*\{[^}]*white-space:\s*normal;/);
    expect(css).toMatch(/\.block-command-preview\s*\{[^}]*overflow-wrap:\s*anywhere;/);
  });

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
