import { describe, expect, it } from "vitest";

import {
  DEFAULT_DIAGNOSTICS_LOG_COLUMNS,
  DIAGNOSTICS_LOG_HANDLE_WIDTH_TOTAL,
  DIAGNOSTICS_LOG_HORIZONTAL_CHROME,
  MAX_DIAGNOSTICS_LOG_COLUMNS,
  MIN_DIAGNOSTICS_LOG_COLUMNS,
  MIN_DIAGNOSTICS_LOG_MESSAGE,
  diagnosticsLogColumnMaximum,
  diagnosticsLogContentWidth,
  fitDiagnosticsLogColumns,
  resizeDiagnosticsLogColumn,
} from "../../src/velair/domain/diagnostics-log-layout";

describe("diagnostics log layout", () => {
  it("clamps a resized column while preserving the message minimum", () => {
    expect(resizeDiagnosticsLogColumn(
      DEFAULT_DIAGNOSTICS_LOG_COLUMNS, "time", 20, 900,
    ).time).toBe(MIN_DIAGNOSTICS_LOG_COLUMNS.time);
    const maximum = diagnosticsLogColumnMaximum(
      DEFAULT_DIAGNOSTICS_LOG_COLUMNS, "time", 900,
    );
    expect(resizeDiagnosticsLogColumn(
      DEFAULT_DIAGNOSTICS_LOG_COLUMNS, "time", 900, 900,
    ).time).toBe(maximum);
  });

  it("returns a new layout without mutating the defaults", () => {
    const resized = resizeDiagnosticsLogColumn(
      DEFAULT_DIAGNOSTICS_LOG_COLUMNS, "climate", 220, 1_000,
    );
    expect(resized.climate).toBe(220);
    expect(DEFAULT_DIAGNOSTICS_LOG_COLUMNS).toEqual(MIN_DIAGNOSTICS_LOG_COLUMNS);
  });

  it("re-clamps enlarged columns when the container becomes narrower", () => {
    const outerWidth = 700;
    const contentWidth = diagnosticsLogContentWidth(outerWidth);
    const fitted = fitDiagnosticsLogColumns({ time: 260, climate: 280, type: 240 }, contentWidth);
    expect(Object.values(fitted).reduce((total, width) => total + width, 0)
      + MIN_DIAGNOSTICS_LOG_MESSAGE + DIAGNOSTICS_LOG_HANDLE_WIDTH_TOTAL
      + DIAGNOSTICS_LOG_HORIZONTAL_CHROME)
      .toBeLessThanOrEqual(outerWidth);
    expect(fitted.time).toBeGreaterThanOrEqual(MIN_DIAGNOSTICS_LOG_COLUMNS.time);
    expect(fitted.climate).toBeGreaterThanOrEqual(MIN_DIAGNOSTICS_LOG_COLUMNS.climate);
    expect(fitted.type).toBeGreaterThanOrEqual(MIN_DIAGNOSTICS_LOG_COLUMNS.type);
  });

  it("uses the exact absolute column maxima", () => {
    for (const column of ["time", "climate", "type"] as const) {
      expect(diagnosticsLogColumnMaximum(
        DEFAULT_DIAGNOSTICS_LOG_COLUMNS, column, 2_000,
      )).toBe(MAX_DIAGNOSTICS_LOG_COLUMNS[column]);
    }
  });
});
