// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import type { OperationStatus, ScheduleResponse } from "../../src/velair/types";
import {
  dismissOperationStatusAcrossViews,
  operationStatusIsVisible,
  renderOperationStatus,
} from "../../src/velair/views/operation-status-view";

function renderStatus(
  operation: OperationStatus,
  data: Partial<ScheduleResponse> = {},
) {
  const container = document.createElement("div");
  const host = {
    _data: {
      modes: [{ key: "away", name: "Away", profile_ids: [] }],
      profiles: [{ key: "sleep", name: "Sleep", zones: {} }],
      ...data,
    },
    _friendlyEntityName: (entityId: string) =>
      entityId === "climate.bedroom" ? "Bedroom" : entityId,
    _dismissOperationStatus: () => undefined,
    _t: (key: string, replacements: Record<string, string | number> = {}) =>
      Object.entries(replacements).reduce(
        (value, [name, replacement]) => value.replace(`{${name}}`, String(replacement)),
        ({
          operationCurrentZone: "Working on {zone}",
          operationCancelled: "The operation was cancelled",
          operationFailedHelp: "Review logs",
          operationFailureCount: "{count} zones with issues: {zones}",
          operationFailureOne: "1 zone with issues: {zones}",
          operationModePartial: "{target} mode applied with issues",
          operationModeRunning: "Applying {target} mode",
          operationNoZones: "No zones needed changes",
          operationProfileCompleted: "{target} Profile applied",
          operationProgress: "{completed} of {total} zones processed",
          operationProgressLabel: "Velair operation progress",
        } as Record<string, string>)[key] ?? key,
      ),
  } as unknown as VelairViewHost;

  render(renderOperationStatus(host, operation), container);
  return container;
}

const runningOperation: OperationStatus = {
  id: "operation-1",
  kind: "mode_change",
  state: "running",
  target_id: "away",
  completed: 2,
  total: 5,
  current_entity_id: "climate.bedroom",
  failed_entity_ids: [],
  started_at: "2026-07-29T12:00:00+00:00",
};

describe("operation status view", () => {
  it("auto-hides completed success while keeping attention states visible", () => {
    const finishedAt = Date.parse("2026-07-29T12:00:05+00:00");
    const completed = {
      ...runningOperation,
      state: "completed" as const,
      finished_at: new Date(finishedAt).toISOString(),
    };

    expect(operationStatusIsVisible(completed, undefined, finishedAt + 4_999)).toBe(true);
    expect(operationStatusIsVisible(completed, undefined, finishedAt + 5_000)).toBe(false);
    expect(operationStatusIsVisible(
      { ...completed, state: "completed_with_errors" },
      undefined,
      finishedAt + 60_000,
    )).toBe(true);
    expect(operationStatusIsVisible(
      { ...completed, state: "completed_with_errors" },
      completed.id,
      finishedAt,
    )).toBe(false);

    const dismissed = {
      ...completed,
      id: "dismissed-across-views",
      state: "completed_with_errors" as const,
    };
    dismissOperationStatusAcrossViews(dismissed.id);
    expect(operationStatusIsVisible(dismissed, undefined, finishedAt)).toBe(false);
  });

  it("shows authoritative progress and the current friendly zone name", () => {
    const container = renderStatus(runningOperation);
    const status = container.querySelector<HTMLElement>(".operation-status");
    const progress = container.querySelector<HTMLElement>('[role="progressbar"]');

    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.textContent).toContain("Applying Away mode");
    expect(status?.textContent).toContain("2 of 5 zones processed");
    expect(status?.textContent).toContain("Working on Bedroom");
    expect(status?.textContent).toContain("2/5");
    expect(progress?.getAttribute("aria-valuenow")).toBe("2");
    expect(progress?.getAttribute("aria-valuemax")).toBe("5");
    expect(progress?.querySelector("span")?.getAttribute("style")).toContain("40%");
  });

  it("announces partial completion and reports failed zones", () => {
    const container = renderStatus({
      ...runningOperation,
      state: "completed_with_errors",
      completed: 5,
      failed_entity_ids: ["climate.office"],
      current_entity_id: null,
      finished_at: "2026-07-29T12:00:05+00:00",
    });
    const status = container.querySelector<HTMLElement>(".operation-status");

    expect(status?.getAttribute("role")).toBe("alert");
    expect(status?.getAttribute("aria-live")).toBe("assertive");
    expect(status?.textContent).toContain("Away mode applied with issues");
    expect(status?.textContent).toContain("1 zone with issues: climate.office");
  });

  it("supports Profile completion without assuming a heating operation", () => {
    const container = renderStatus({
      ...runningOperation,
      kind: "profile_activation",
      state: "completed",
      target_id: "sleep",
      completed: 3,
      total: 3,
      current_entity_id: null,
      finished_at: "2026-07-29T12:00:05+00:00",
    });

    expect(container.textContent).toContain("Sleep Profile applied");
    expect(container.textContent).toContain("3 of 3 zones processed");
  });

  it("shows actionable fatal error details and localizes cancellation", () => {
    const failed = renderStatus({
      ...runningOperation,
      state: "failed",
      completed: 0,
      error_code: "operation_failed",
      error_message: "Storage unavailable",
      current_entity_id: null,
      finished_at: "2026-07-29T12:00:05+00:00",
    });
    const cancelled = renderStatus({
      ...runningOperation,
      id: "operation-cancelled",
      state: "failed",
      completed: 0,
      error_code: "cancelled",
      error_message: null,
      current_entity_id: null,
      finished_at: "2026-07-29T12:00:05+00:00",
    });

    expect(failed.textContent).toContain("Storage unavailable");
    expect(cancelled.textContent).toContain("The operation was cancelled");
  });
});
