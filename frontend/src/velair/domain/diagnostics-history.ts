import type {
  DiagnosticHistoryCategory,
  DiagnosticHistoryItem,
} from "../types";

export const VELAIR_SYSTEM_SOURCE: unique symbol = Symbol("velair-system-source");
export type DiagnosticHistorySource = string | typeof VELAIR_SYSTEM_SOURCE;

export type DiagnosticHistoryFilters = {
  sources: ReadonlySet<DiagnosticHistorySource> | null;
  category: "all" | DiagnosticHistoryCategory;
  from: string;
  to: string;
};

export const EMPTY_DIAGNOSTIC_HISTORY_FILTERS: DiagnosticHistoryFilters = {
  sources: null,
  category: "all",
  from: "",
  to: "",
};

export function validDiagnosticHistoryRange(
  filters: DiagnosticHistoryFilters,
): boolean {
  const from = localDateTimeValue(filters.from);
  const to = localDateTimeValue(filters.to, true);
  return from === undefined || to === undefined || from <= to;
}

export function filterDiagnosticHistory(
  history: DiagnosticHistoryItem[],
  filters: DiagnosticHistoryFilters,
): DiagnosticHistoryItem[] {
  if (!validDiagnosticHistoryRange(filters)) return [];
  const from = localDateTimeValue(filters.from);
  const to = localDateTimeValue(filters.to, true);
  return history.filter((item) => {
    const at = Date.parse(item.at);
    if (filters.sources !== null) {
      const source = item.entity_id ?? VELAIR_SYSTEM_SOURCE;
      if (!filters.sources.has(source)) return false;
    }
    if (filters.category !== "all" && item.category !== filters.category) return false;
    if (from !== undefined && at < from) return false;
    if (to !== undefined && at > to) return false;
    return true;
  });
}

export function hasDiagnosticHistoryFilters(
  filters: DiagnosticHistoryFilters,
): boolean {
  return filters.sources !== null || filters.category !== "all"
    || filters.from !== "" || filters.to !== "";
}

export function normalizeDiagnosticHistoryFilters(
  filters: DiagnosticHistoryFilters,
  entityIds: readonly string[],
): DiagnosticHistoryFilters {
  if (filters.sources === null) return filters;
  const allowed = new Set<DiagnosticHistorySource>([
    VELAIR_SYSTEM_SOURCE,
    ...entityIds,
  ]);
  const normalized = new Set(
    [...filters.sources].filter((source) => allowed.has(source)),
  );
  return {
    ...filters,
    sources: normalized.size === allowed.size ? null : normalized,
  };
}

function localDateTimeValue(
  value: string,
  includeSelectedMinute = false,
): number | undefined {
  if (!value) return undefined;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return undefined;
  return includeSelectedMinute && /T\d{2}:\d{2}$/.test(value)
    ? parsed + 59_999
    : parsed;
}
