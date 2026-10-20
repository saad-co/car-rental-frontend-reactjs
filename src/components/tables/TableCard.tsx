import type { ReactNode } from "react";
import { formatDay } from "../../utils";
import Pagination from "../ui/pagination/Pagination";
import ActiveFilters, { type ActiveFilter } from "./ActiveFilters";
import DateRangePicker from "./DateRangePicker";
import FilterDropdown, { type FilterGroup } from "./FilterDropdown";
import SearchInput from "./SearchInput";
import type { DateRange } from "./useListParams";

// Look copied from TailAdmin's "Recent Orders" card (components/crm/CrmRecentOrderTable.tsx): title left, controls
// right. Changes: dark-mode classes removed (D20); search and filter from ProductListTable; loading, error and empty
// states and the pagination built in (B75); date range picker and the applied-filters bar (B82).

interface TableCardProps {
  title: string;
  /** Search box. Omit for a list without search. */
  search?: {
    value: string;
    onSearch: (text: string) => void;
    placeholder?: string;
  };
  /** Filter dropdown. Omit for a list without filters. */
  filters?: {
    groups: FilterGroup[];
    onApply: (values: Record<string, string | undefined>) => void;
  };
  /**
   * Date range picker (B82). Omit for a list without one. `label` names the date being filtered, e.g. "Received",
   * and is used in the applied-filters bar.
   */
  dateRange?: {
    label: string;
    value: DateRange;
    onChange: (range: DateRange) => void;
  };
  /** Removes the search, every filter and the date range in one go; shown as "Clear all" in the applied-filters bar. */
  onClearAll?: () => void;
  /** Extra controls left of the search, e.g. a "Delete (2)" button while rows are ticked. */
  actions?: ReactNode;
  /** True while the first page loads (nothing to show yet). */
  isPending: boolean;
  /** Why loading failed, shown instead of the table. */
  error?: Error | null;
  /** True when the list is loaded but has no rows. */
  isEmpty: boolean;
  /** Text for an empty list, e.g. "No applications match." */
  emptyText: string;
  /** The page shown, starting at 1, and how many there are. Pagination is hidden when there is one page. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** The table (usually a DataTable). */
  children: ReactNode;
}

/** The card around every list: title, search, filters, the table, and the pagination. */
export default function TableCard({
  title,
  search,
  filters,
  dateRange,
  onClearAll,
  actions,
  isPending,
  error,
  isEmpty,
  emptyText,
  page,
  totalPages,
  onPageChange,
  children,
}: TableCardProps) {
  /** Everything narrowing the list now, for the bar above the table (B82). */
  const applied: ActiveFilter[] = [];
  if (search?.value) {
    applied.push({
      key: "search",
      label: "Search",
      value: search.value,
      onRemove: () => search.onSearch(""),
    });
  }
  for (const group of filters?.groups ?? []) {
    if (group.value === undefined) continue;
    applied.push({
      key: group.key,
      label: group.label,
      value:
        group.options.find((option) => option.value === group.value)?.label ??
        group.value,
      onRemove: () =>
        filters?.onApply({
          ...Object.fromEntries(filters.groups.map((g) => [g.key, g.value])),
          [group.key]: undefined,
        }),
    });
  }
  if (dateRange && (dateRange.value.from || dateRange.value.to)) {
    applied.push({
      key: "dates",
      label: dateRange.label,
      value: describeRange(dateRange.value),
      onRemove: () => dateRange.onChange({}),
    });
  }
  /** Fallback when the page gives no `onClearAll`: remove the chips one by one. */
  const clearEach = () => applied.forEach((chip) => chip.onRemove());

  return (
    // No `overflow-hidden` on the card: it would cut off the Filter panel when the list is short.
    <div className="rounded-2xl border border-gray-200 bg-white pt-4">
      <div className="mb-4 flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {actions}
          {search && (
            <SearchInput
              value={search.value}
              onSearch={search.onSearch}
              placeholder={search.placeholder}
            />
          )}
          {dateRange && (
            <DateRangePicker
              value={dateRange.value}
              onChange={dateRange.onChange}
              ariaLabel={`${dateRange.label} date range`}
            />
          )}
          {filters && (
            <FilterDropdown groups={filters.groups} onApply={filters.onApply} />
          )}
        </div>
      </div>

      <ActiveFilters filters={applied} onClearAll={onClearAll ?? clearEach} />

      {isPending ? (
        <p className="border-t border-gray-100 p-6 text-sm text-gray-500">
          Loading...
        </p>
      ) : error ? (
        <p
          role="alert"
          className="border-t border-gray-100 p-6 text-sm text-error-600"
        >
          {error.message}
        </p>
      ) : isEmpty ? (
        <p className="border-t border-gray-100 p-6 text-sm text-gray-500">
          {emptyText}
        </p>
      ) : (
        // Clipped here, not on the whole card: a row's hover colour must stay inside the rounded corners, but the
        // Filter panel above must be free to hang below the card when the list is short (one row).
        <div className="overflow-hidden rounded-b-2xl">
          {children}
          {totalPages > 1 && (
            <div className="border-t border-gray-100">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A date range in words: "Oct 1, 2026 – Oct 15, 2026", "from Oct 1, 2026", "until Oct 15, 2026"; one day alone is just that day. */
function describeRange({ from, to }: DateRange): string {
  if (from && to) {
    return from === to
      ? formatDay(from)
      : `${formatDay(from)} – ${formatDay(to)}`;
  }
  return from ? `from ${formatDay(from)}` : `until ${formatDay(to!)}`;
}
