import { useSearchParams } from "react-router";

/** Rows per page on every list screen (B75, Abulkalam). */
export const LIST_PAGE_SIZE = 8;

/** A list's view as it is kept in the URL. */
export interface ListParams<K extends string> {
  /** The search text, "" for none (`?q=`). */
  search: string;
  /** The page, from 1 (`?page=`). */
  page: number;
  /** Each filter's value, undefined for "any" (`?status=pending`...). Only values in `allowed` are kept. */
  filters: Record<K, string | undefined>;
  setSearch: (text: string) => void;
  setPage: (page: number) => void;
  setFilters: (values: Partial<Record<K, string | undefined>>) => void;
}

/**
 * Reads and writes a list's search, filters and page in the URL (`?q=pat&status=pending&page=2`), so a refresh, the
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
  }) => {
    const params = new URLSearchParams();
    if (next.search) params.set("q", next.search);
    for (const key of keys) {
      const value = next.filters[key];
      if (value) params.set(key, value);
    }
    if (next.page > 1) params.set("page", String(next.page));
    setSearchParams(params);
  };

  return {
    search,
    page,
    filters,
    setSearch: (text) => write({ search: text, page: 1, filters }),
    setPage: (next) => write({ search, page: next, filters }),
    setFilters: (values) =>
      write({ search, page: 1, filters: { ...filters, ...values } }),
  };
}

/** Number of pages for `total` rows (at least 1, so an empty list still shows "page 1 of 1"). */
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
}
