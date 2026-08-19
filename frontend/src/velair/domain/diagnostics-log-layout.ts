export type DiagnosticsLogColumn = "time" | "climate" | "type";
export type DiagnosticsLogColumns = Record<DiagnosticsLogColumn, number>;

export const DEFAULT_DIAGNOSTICS_LOG_COLUMNS: DiagnosticsLogColumns = {
  time: 180,
  climate: 96,
  type: 96,
};

export const MIN_DIAGNOSTICS_LOG_COLUMNS: DiagnosticsLogColumns = {
  time: 180,
  climate: 96,
  type: 96,
};

export const MAX_DIAGNOSTICS_LOG_COLUMNS: DiagnosticsLogColumns = {
  time: 300,
  climate: 320,
  type: 280,
};

export const MIN_DIAGNOSTICS_LOG_MESSAGE = 180;
export const DIAGNOSTICS_LOG_HANDLE_WIDTH_TOTAL = 36;
export const DIAGNOSTICS_LOG_HORIZONTAL_CHROME = 22;

export function diagnosticsLogContentWidth(outerWidth: number): number {
  return Math.max(0, outerWidth - DIAGNOSTICS_LOG_HORIZONTAL_CHROME);
}

export function diagnosticsLogColumnMaximum(
  columns: DiagnosticsLogColumns,
  column: DiagnosticsLogColumn,
  availableWidth: number,
): number {
  const otherWidth = Object.entries(columns)
    .filter(([key]) => key !== column)
    .reduce((total, [, width]) => total + width, 0);
  return Math.min(
    MAX_DIAGNOSTICS_LOG_COLUMNS[column],
    Math.max(
      MIN_DIAGNOSTICS_LOG_COLUMNS[column],
      availableWidth - otherWidth - MIN_DIAGNOSTICS_LOG_MESSAGE
        - DIAGNOSTICS_LOG_HANDLE_WIDTH_TOTAL,
    ),
  );
}

export function resizeDiagnosticsLogColumn(
  columns: DiagnosticsLogColumns,
  column: DiagnosticsLogColumn,
  requestedWidth: number,
  availableWidth: number,
): DiagnosticsLogColumns {
  const maximum = diagnosticsLogColumnMaximum(columns, column, availableWidth);
  return {
    ...columns,
    [column]: Math.min(maximum, Math.max(MIN_DIAGNOSTICS_LOG_COLUMNS[column], requestedWidth)),
  };
}

export function fitDiagnosticsLogColumns(
  columns: DiagnosticsLogColumns,
  availableWidth: number,
): DiagnosticsLogColumns {
  const fitted = Object.fromEntries(
    (Object.keys(columns) as DiagnosticsLogColumn[]).map((column) => [
      column,
      Math.min(
        MAX_DIAGNOSTICS_LOG_COLUMNS[column],
        Math.max(MIN_DIAGNOSTICS_LOG_COLUMNS[column], columns[column]),
      ),
    ]),
  ) as DiagnosticsLogColumns;
  let overflow = Object.values(fitted).reduce((total, width) => total + width, 0)
    + MIN_DIAGNOSTICS_LOG_MESSAGE + DIAGNOSTICS_LOG_HANDLE_WIDTH_TOTAL - availableWidth;
  for (const column of ["type", "climate", "time"] as const) {
    if (overflow <= 0) break;
    const reducible = fitted[column] - MIN_DIAGNOSTICS_LOG_COLUMNS[column];
    const reduction = Math.min(overflow, reducible);
    fitted[column] -= reduction;
    overflow -= reduction;
  }
  return fitted;
}
