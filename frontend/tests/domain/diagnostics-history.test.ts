import { describe, expect, it } from "vitest";

import {
  EMPTY_DIAGNOSTIC_HISTORY_FILTERS,
  filterDiagnosticHistory,
  hasDiagnosticHistoryFilters,
  normalizeDiagnosticHistoryFilters,
  validDiagnosticHistoryRange,
  VELAIR_SYSTEM_SOURCE,
} from "../../src/velair/domain/diagnostics-history";
import type { DiagnosticHistoryItem } from "../../src/velair/types";

const history: DiagnosticHistoryItem[] = [
  { at: "2026-08-18T08:00:00Z", kind: "event", category: "control", severity: "info", data: {} },
  { at: "2026-08-18T09:00:00Z", kind: "event", category: "room_assist", severity: "info", entity_id: "climate.one", data: {} },
  { at: "2026-08-18T10:00:00Z", kind: "delivery", category: "delivery", severity: "warning", entity_id: "climate.two", data: {} },
];

describe("diagnostics history filters", () => {
  it("filters Velair-wide, climate, category and inclusive dates", () => {
    expect(filterDiagnosticHistory(history, { ...EMPTY_DIAGNOSTIC_HISTORY_FILTERS, sources: new Set([VELAIR_SYSTEM_SOURCE]) }))
      .toEqual([history[0]]);
    expect(filterDiagnosticHistory(history, { ...EMPTY_DIAGNOSTIC_HISTORY_FILTERS, sources: new Set(["climate.one"]) }))
      .toEqual([history[1]]);
    expect(filterDiagnosticHistory(history, {
      ...EMPTY_DIAGNOSTIC_HISTORY_FILTERS,
      sources: new Set([VELAIR_SYSTEM_SOURCE, "climate.two"]),
    })).toEqual([history[0], history[2]]);
    expect(filterDiagnosticHistory(history, { ...EMPTY_DIAGNOSTIC_HISTORY_FILTERS, category: "delivery" }))
      .toEqual([history[2]]);
    expect(filterDiagnosticHistory(history, {
      ...EMPTY_DIAGNOSTIC_HISTORY_FILTERS,
      from: "2026-08-18T09:00:00Z",
      to: "2026-08-18T10:00:00Z",
    })).toEqual([history[1], history[2]]);
  });

  it("rejects reversed ranges and detects active filters", () => {
    const filters = {
      ...EMPTY_DIAGNOSTIC_HISTORY_FILTERS,
      from: "2026-08-18T11:00",
      to: "2026-08-18T10:00",
    };
    expect(validDiagnosticHistoryRange(filters)).toBe(false);
    expect(filterDiagnosticHistory(history, filters)).toEqual([]);
    expect(hasDiagnosticHistoryFilters(filters)).toBe(true);
    expect(hasDiagnosticHistoryFilters(EMPTY_DIAGNOSTIC_HISTORY_FILTERS)).toBe(false);
  });

  it("combines all filters and includes both selected minute boundaries", () => {
    const localBoundaryHistory: DiagnosticHistoryItem[] = [
      {
        at: new Date(2026, 7, 18, 9, 0, 0, 0).toISOString(),
        kind: "event", category: "room_assist", severity: "info",
        entity_id: "climate.one", data: {},
      },
      {
        at: new Date(2026, 7, 18, 9, 1, 59, 999).toISOString(),
        kind: "event", category: "room_assist", severity: "info",
        entity_id: "climate.one", data: {},
      },
      {
        at: new Date(2026, 7, 18, 9, 2, 0, 0).toISOString(),
        kind: "event", category: "room_assist", severity: "info",
        entity_id: "climate.one", data: {},
      },
      {
        at: new Date(2026, 7, 18, 9, 1, 0, 0).toISOString(),
        kind: "event", category: "delivery", severity: "info",
        entity_id: "climate.one", data: {},
      },
    ];

    expect(filterDiagnosticHistory(localBoundaryHistory, {
      sources: new Set(["climate.one"]),
      category: "room_assist",
      from: "2026-08-18T09:00",
      to: "2026-08-18T09:01",
    })).toEqual(localBoundaryHistory.slice(0, 2));
  });

  it("normalizes removed and complete source selections", () => {
    const stale = normalizeDiagnosticHistoryFilters({
      ...EMPTY_DIAGNOSTIC_HISTORY_FILTERS,
      sources: new Set(["climate.removed", "climate.one"]),
    }, ["climate.one", "climate.two"]);
    expect([...stale.sources ?? []]).toEqual(["climate.one"]);

    const complete = normalizeDiagnosticHistoryFilters({
      ...EMPTY_DIAGNOSTIC_HISTORY_FILTERS,
      sources: new Set([VELAIR_SYSTEM_SOURCE, "climate.one", "climate.two"]),
    }, ["climate.one", "climate.two"]);
    expect(complete.sources).toBeNull();
  });
});
