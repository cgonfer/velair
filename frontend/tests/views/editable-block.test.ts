// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import { ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import { renderEditableBlock } from "../../src/velair/views/schedule-view";
import type { BlockDraftSource, DraftScheduleBlock } from "../../src/velair/types";

function host() {
  return {
    _hvacModeOptions: () => ["heat", "cool", "off"],
    _inputValue: (event: Event) => (event.target as HTMLInputElement | HTMLSelectElement).value,
    _modeLabel: (mode: string) => mode,
    _removeBlock: vi.fn(),
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

  it("normalizes missing HVAC modes to keep instead of leaving the selector blank", async () => {
    const container = document.createElement("div");
    const draft = { ...block(""), hvac_mode: undefined } as unknown as DraftScheduleBlock;

    render(renderEditableBlock(host(), draft, 0, "template" as BlockDraftSource), container);
    await Promise.resolve();

    expect(modeSelect(container).value).toBe("");
    expect(modeSelect(container).selectedOptions[0]?.textContent).toBe("keep");
  });
});
