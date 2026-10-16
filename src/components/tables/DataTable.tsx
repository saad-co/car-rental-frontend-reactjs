import type { ReactNode } from "react";
import { cn } from "../../utils";
import Checkbox from "../form/input/Checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

// Look copied from TailAdmin's "Recent Orders" table (components/crm/CrmRecentOrderTable.tsx): grey header row, row
// checkboxes. Changes: dark-mode classes removed (D20); generic, driven by a column list (B75).

/** One column: its header and how to draw a row's cell. */
export interface Column<T> {
  /** Unique within the table (React key). */
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Alignment of the header and the cells (default start), e.g. `end` for amounts. */
  align?: "start" | "center" | "end";
  /** Extra classes for this column's body cells only (the header keeps the common look), e.g. `whitespace-nowrap`. */
  className?: string;
}

const ALIGN_CLASS = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
} as const;

/** Row checkboxes: which rows are ticked, and which may be. */
export interface RowSelection<T> {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Rows that may not be ticked get a disabled checkbox. Default: every row. */
  canSelect?: (row: T) => boolean;
  /** Shown on hover over a disabled checkbox, e.g. "Approved applications cannot be deleted". */
  disabledReason?: string;
  /** The row's name for screen readers, e.g. the person's name. */
  label: (row: T) => string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Makes rows clickable (e.g. open the detail page). Clicks on a checkbox or a button in a cell do not count. */
  onRowClick?: (row: T) => void;
  selection?: RowSelection<T>;
  /** Fades the rows, e.g. while the next page loads. */
  dimmed?: boolean;
}

const headerCellClass =
  "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 sm:px-6";
const cellClass = "px-4 py-3.5 text-start text-theme-sm text-gray-700 sm:px-6";

/**
 * The table of every list screen. Knows nothing about the data: each screen passes its columns.
 *
 * "Select all" ticks every selectable row on this page only (lists are paged on the server, so other pages' rows are
 * not loaded).
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selection,
  dimmed = false,
}: DataTableProps<T>) {
  const selectable = selection
    ? rows.filter((row) => selection.canSelect?.(row) ?? true)
    : [];
  const allTicked =
    selectable.length > 0 &&
    selectable.every((row) => selection!.selected.has(rowKey(row)));

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selection!.selected);
    if (checked) next.add(id);
    else next.delete(id);
    selection!.onChange(next);
  };

  return (
    <div className={cn("max-w-full overflow-x-auto", dimmed && "opacity-60")}>
      <Table>
        <TableHeader className="border-y border-gray-100 bg-gray-50">
          <TableRow>
            {selection && (
              <TableCell isHeader className="w-px py-3 pr-0 pl-4 sm:pl-6">
                <Checkbox
                  ariaLabel="Select all on this page"
                  checked={allTicked}
                  disabled={selectable.length === 0}
                  onChange={(checked) =>
                    selection.onChange(
                      checked ? new Set(selectable.map(rowKey)) : new Set(),
                    )
                  }
                />
              </TableCell>
            )}
            {columns.map((column) => (
              <TableCell
                key={column.key}
                isHeader
                className={cn(
                  headerCellClass,
                  column.align && ALIGN_CLASS[column.align],
                )}
              >
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const id = rowKey(row);
            const canTick = selection?.canSelect?.(row) ?? true;
            return (
              <TableRow
                key={id}
                className={cn(onRowClick && "cursor-pointer hover:bg-gray-50")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selection && (
                  <TableCell className="w-px py-3.5 pr-0 pl-4 sm:pl-6">
                    {/* Ticking must not also open the row. */}
                    <div
                      onClick={(event) => event.stopPropagation()}
                      title={canTick ? undefined : selection.disabledReason}
                    >
                      <Checkbox
                        ariaLabel={`Select ${selection.label(row)}`}
                        checked={selection.selected.has(id)}
                        disabled={!canTick}
                        onChange={(checked) => toggle(id, checked)}
                      />
                    </div>
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      cellClass,
                      column.align && ALIGN_CLASS[column.align],
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
