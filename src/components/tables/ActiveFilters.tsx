/** One applied filter, shown as a chip above the table. */
export interface ActiveFilter {
  /** Unique within the bar, e.g. `status` or `dates`. */
  key: string;
  /** Which filter, e.g. "Status". */
  label: string;
  /** What it is set to, e.g. "Pending". */
  value: string;
  /** Removes just this filter. */
  onRemove: () => void;
}

interface ActiveFiltersProps {
  filters: ActiveFilter[];
  /** Removes every filter at once. */
  onClearAll: () => void;
}

/**
 * The bar above a table that lists everything currently narrowing it (search, filters, date range), each as a chip
 * with a "×", plus "Clear all" (B82). Nothing is shown when no filter is applied. Chip look: TailAdmin's badge
 * (light brand background), with a close button.
 */
export default function ActiveFilters({
  filters,
  onClearAll,
}: ActiveFiltersProps) {
  if (filters.length === 0) return null;
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2 px-6"
      aria-label="Applied filters"
      role="group"
    >
      <span className="text-theme-xs font-medium text-gray-500">
        Filtered by:
      </span>
      {filters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pr-1.5 pl-3 text-theme-xs font-medium text-brand-500"
        >
          <span>
            {filter.label}:{" "}
            <span className="font-semibold">{filter.value}</span>
          </span>
          <button
            type="button"
            onClick={filter.onRemove}
            aria-label={`Remove filter ${filter.label}`}
            className="flex size-5 items-center justify-center rounded-full text-brand-500 hover:bg-brand-100"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 2.5l7 7m0-7l-7 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 text-theme-xs font-medium text-gray-500 underline hover:text-gray-700"
      >
        Clear all
      </button>
    </div>
  );
}
