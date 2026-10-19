import { useSearchParams } from "react-router";

/** Rows per page on every list screen (B75, Abulkalam). */
export const LIST_PAGE_SIZE = 8;

/** A list's view as it is kept in the URL. */
export interface ListParams<K extends string> {
  /** The search text, "" for none (`?q=`). */
  search: string;
  /** The page, from 1 (`?page=`). */
  page: number;
  /** First day of the date range, `YYYY-MM-DD` (`?from=`), undefined for no limit (B82). */
  from: string | undefined;
  /** Last day of the date range, inclusive (`?to=`), undefined for no limit. */
  to: string | undefined;
  /** Each filter's value, undefined for "any" (`?status=pending`...). Only values in `allowed` are kept. */
  filters: Record<K, string | undefined>;
  setSearch: (text: string) => void;
  setPage: (page: number) => void;
  setFilters: (values: Partial<Record<K, string | undefined>>) => void;
  /** Sets the date range (either end can be undefined); goes back to page 1. */
  setDateRange: (range: DateRange) => void;
  /** Removes the search, every filter and the date range at once (one URL change). */
  clearAll: () => void;
}

/** A range of whole days, `YYYY-MM-DD`, either end optional. */
export interface DateRange {
  from?: string;
  to?: string;
}

/** A real `YYYY-MM-DD` day (so `?from=junk` or `2026-02-30` typed into the URL is ignored). */
function validDay(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

/**
 * Reads and writes a list's search, filters, date range and page in the URL (`?q=pat&status=pending&from=2026-10-01&to=2026-10-15&page=2`), so a refresh, the
 * back button or a shared link shows the same view. A new search or filter goes back to page 1: page 3 of the old
 * results may not exist in the new ones.
 *
 * @param allowed every filter's URL key and its valid values. A value typed into the URL that is not in the list is
 *   ignored, so the API is never asked for a status that does not exist.
 */
export function useListParams<K extends string>(
  allowed: Record<K, readonly string[]>,
): ListParams<K> {
  const [searchParams, setSearchParams] = useSearchParams();
  const keys = Object.keys(allowed) as K[];

  const search = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  let from = validDay(searchParams.get("from"));
  let to = validDay(searchParams.get("to"));
  // A reversed range typed into the URL would make the API answer 400: ignore it.
  if (from && to && from > to) {
    from = undefined;
    to = undefined;
  }
  const filters = Object.fromEntries(
    keys.map((key) => {
      const value = searchParams.get(key);
      return [key, value && allowed[key].includes(value) ? value : undefined];
    }),
  ) as Record<K, string | undefined>;

  /** Writes a whole view to the URL, leaving out empty values and page 1. */
  const write = (next: {
    search: string;
    page: number;
    filters: Record<K, string | undefined>;
    from?: string;
    to?: string;
  }) => {
    const params = new URLSearchParams();
    if (next.search) params.set("q", next.search);
    for (const key of keys) {
      const value = next.filters[key];
      if (value) params.set(key, value);
    }
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.page > 1) params.set("page", String(next.page));
    setSearchParams(params);
  };

  const noFilters = Object.fromEntries(
    keys.map((key) => [key, undefined]),
  ) as Record<K, string | undefined>;

  return {
    search,
    page,
    from,
    to,
    filters,
    setSearch: (text) => write({ search: text, page: 1, filters, from, to }),
    setPage: (next) => write({ search, page: next, filters, from, to }),
    setFilters: (values) =>
      write({ search, page: 1, filters: { ...filters, ...values }, from, to }),
    setDateRange: (range) =>
      write({ search, page: 1, filters, from: range.from, to: range.to }),
    clearAll: () => write({ search: "", page: 1, filters: noFilters }),
  };
}

/**
 * The choices of a filter group from a label map, "All" first: `{ active: "Active", inactive: "Inactive" }` gives
 * All / Active / Inactive. Kept here (a .ts file) rather than in FilterDropdown.tsx: React's fast refresh only works
 * when a .tsx file exports nothing but components.
 */
export function filterOptions(
  labels: Record<string, string>,
  allLabel = "All",
): { label: string; value: string | undefined }[] {
  return [
    { label: allLabel, value: undefined },
    ...Object.entries(labels).map(([value, label]) => ({ label, value })),
  ];
}

/** Number of pages for `total` rows (at least 1, so an empty list still shows "page 1 of 1"). */
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
}
