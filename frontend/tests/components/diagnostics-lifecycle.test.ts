// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { VelairCard } from "../../src/velair/components/velair-card-element";
import type { DiagnosticsSnapshot, ScheduleResponse } from "../../src/velair/types";

const TEST_TAG = "test-velair-diagnostics-lifecycle-card";
if (!customElements.get(TEST_TAG)) customElements.define(TEST_TAG, VelairCard);

const snapshot = (generatedAt: string) => ({
  generated_at: generatedAt,
  history: [],
  history_limit: 100,
  history_policy: { categories: {}, runtime_only: true, cleared_on_restart: true },
  overall: {
    status: "ok", scheduler_mode: "auto", scheduler_status: "scheduled",
    unit_counts: { ok: 0, warning: 0, error: 0 }, issues: [],
  },
  units: {},
}) as unknown as DiagnosticsSnapshot;

const schedule = (diagnostics?: DiagnosticsSnapshot) => ({
  active_overrides: {}, configured_entities: [], diagnostics,
  global: { mode: "auto" }, next_event: null, next_events: [],
  operational_status: "running", settings: { first_weekday: "monday", zone_order: [] },
  temperature_unit: "°C", home_assistant_temperature_unit: "°C",
  temperature_migration: { required: false }, zones: {},
}) as unknown as ScheduleResponse;

type DiagnosticsInternals = {
  _data?: ScheduleResponse;
  _latestDiagnostics?: DiagnosticsSnapshot;
  _applyDiagnosticsSnapshot(value?: DiagnosticsSnapshot): void;
  _applyScheduleData(value: ScheduleResponse): void;
  _handleDiagnosticsSubscriptionMessage(message: {
    loaded: boolean;
    diagnostics?: DiagnosticsSnapshot;
  }): void;
  _diagnosticsSourceFilterOpen: boolean;
  _diagnosticsSourcePlacement: "up" | "down";
  _diagnosticsSourceMaxHeight?: number;
  _diagnosticsExportOpen: boolean;
  _diagnosticsRedactEntityIds: boolean;
  _setDiagnosticsSourceFilterOpen(open: boolean, returnFocus?: boolean): void;
  _positionDiagnosticsSourceFilter(): void;
  _scheduleDiagnosticsSourcePosition(): void;
};

function card(): DiagnosticsInternals {
  return document.createElement(TEST_TAG) as unknown as DiagnosticsInternals;
}

describe("diagnostics lifecycle", () => {
  it("clears stale diagnostics when the backend reports an unloaded runtime", () => {
    const element = card();
    const current = snapshot("2026-08-18T10:00:00Z");
    const fresh = snapshot("2026-08-18T10:02:00Z");
    element._data = schedule(current);
    element._applyDiagnosticsSnapshot(current);

    element._handleDiagnosticsSubscriptionMessage({ loaded: false });

    expect(element._latestDiagnostics).toBeUndefined();
    expect(element._data?.diagnostics).toBeUndefined();

    element._applyScheduleData(schedule(current));
    expect(element._data?.diagnostics).toBeUndefined();

    element._handleDiagnosticsSubscriptionMessage({ loaded: true, diagnostics: fresh });
    expect(element._latestDiagnostics).toBe(fresh);
    expect(element._data?.diagnostics).toBe(fresh);
  });

  it("does not let a later schedule response revert a mutation snapshot", () => {
    const element = card();
    const stale = snapshot("2026-08-18T10:00:00Z");
    const mutation = snapshot("2026-08-18T10:01:00Z");
    element._data = schedule(stale);

    element._applyDiagnosticsSnapshot(mutation);
    element._applyScheduleData(schedule(stale));

    expect(element._latestDiagnostics).toBe(mutation);
    expect(element._data?.diagnostics).toBe(mutation);
  });

  it("closes the source disclosure only for outside pointer events and cleans up on disconnect", () => {
    const element = card() as DiagnosticsInternals & HTMLElement;
    const inside = document.createElement("div");
    inside.className = "diagnostics-source-filter";
    const outside = document.createElement("button");
    element.append(inside);
    document.body.append(element, outside);

    element._setDiagnosticsSourceFilterOpen(true);
    inside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    expect(element._diagnosticsSourceFilterOpen).toBe(true);

    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    expect(element._diagnosticsSourceFilterOpen).toBe(false);

    element._setDiagnosticsSourceFilterOpen(true);
    element.remove();
    expect(element._diagnosticsSourceFilterOpen).toBe(false);
    outside.remove();
  });

  it("closes the source disclosure when Diagnostics is no longer visible", async () => {
    const element = card() as DiagnosticsInternals & VelairCard;
    element.view = "diagnostics";
    document.body.append(element);
    await element.updateComplete;
    element._setDiagnosticsSourceFilterOpen(true);
    element._diagnosticsExportOpen = true;
    element._diagnosticsRedactEntityIds = false;

    element.view = "overview-status";
    await element.updateComplete;

    expect(element._diagnosticsSourceFilterOpen).toBe(false);
    expect(element._diagnosticsExportOpen).toBe(false);
    expect(element._diagnosticsRedactEntityIds).toBe(true);
    element.remove();
  });

  it("places the desktop source disclosure in the larger available direction", async () => {
    const element = card() as DiagnosticsInternals & VelairCard;
    document.body.append(element);
    await element.updateComplete;
    const trigger = document.createElement("button");
    const popover = document.createElement("div");
    Object.defineProperty(popover, "scrollHeight", { configurable: true, value: 200 });
    const querySelector = vi.spyOn(element.renderRoot, "querySelector")
      .mockImplementation((selector) => selector === ".diagnostics-source-trigger" ? trigger : popover);
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1_000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 700 });
    element._diagnosticsSourceFilterOpen = true;

    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      top: 400, bottom: 440,
    } as DOMRect);
    element._positionDiagnosticsSourceFilter();
    expect(element._diagnosticsSourcePlacement).toBe("down");
    expect(element._diagnosticsSourceMaxHeight).toBe(248);

    Object.defineProperty(popover, "scrollHeight", { configurable: true, value: 600 });
    vi.mocked(trigger.getBoundingClientRect).mockReturnValue({
      top: 500, bottom: 540,
    } as DOMRect);
    element._positionDiagnosticsSourceFilter();
    expect(element._diagnosticsSourcePlacement).toBe("up");
    expect(element._diagnosticsSourceMaxHeight).toBe(488);

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 600 });
    element._positionDiagnosticsSourceFilter();
    expect(element._diagnosticsSourcePlacement).toBe("down");
    expect(element._diagnosticsSourceMaxHeight).toBeUndefined();

    querySelector.mockRestore();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
    element.remove();
  });

  it("resets report privacy when the card disconnects", async () => {
    const element = card() as DiagnosticsInternals & VelairCard;
    document.body.append(element);
    await element.updateComplete;
    element._diagnosticsExportOpen = true;
    element._diagnosticsRedactEntityIds = false;

    element.remove();

    expect(element._diagnosticsExportOpen).toBe(false);
    expect(element._diagnosticsRedactEntityIds).toBe(true);
  });

  it("coalesces source placement measurements and cancels pending work on close", () => {
    const element = card();
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(7);
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);

    element._scheduleDiagnosticsSourcePosition();
    element._scheduleDiagnosticsSourcePosition();

    expect(requestFrame).toHaveBeenCalledOnce();
    element._setDiagnosticsSourceFilterOpen(false);
    expect(cancelFrame).toHaveBeenCalledWith(7);

    requestFrame.mockRestore();
    cancelFrame.mockRestore();
  });
});
