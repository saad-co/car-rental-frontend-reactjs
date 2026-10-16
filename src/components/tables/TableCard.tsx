import type { ReactNode } from "react";
import Pagination from "../ui/pagination/Pagination";
import FilterDropdown, { type FilterGroup } from "./FilterDropdown";
import SearchInput from "./SearchInput";

// Look copied from TailAdmin's "Recent Orders" card (components/crm/CrmRecentOrderTable.tsx): title left, controls
// right. Changes: dark-mode classes removed (D20); search and filter from ProductListTable; loading, error and empty
// states and the pagination built in (B75).

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
  return (
    // No `overflow-hidden` on the card: it would cut off the Filter panel when the list is short.
    <div className="rounded-2xl border border-gray-200 bg-white pt-4">
      <div className="mb-4 flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {actions}
          {search && (
            <SearchInput
              value={search.value}
              onSearch={search.onSearch}
              placeholder={search.placeholder}
            />
          )}
          {filters && (
            <FilterDropdown groups={filters.groups} onApply={filters.onApply} />
          )}
        </div>
      </div>

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
