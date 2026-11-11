import type {
  Collections,
  CollectionPeriod,
} from "../../../api/dashboard.queries";
import { cn, formatCents } from "../../../utils";
import DataTable, { type Column } from "../../tables/DataTable";
import TableCard from "../../tables/TableCard";
import { pageCount } from "../../tables/useListParams";
import Badge from "../../ui/badge/Badge";
import { periodLabel, type CollectionView } from "./financialFormat";

const TITLE: Record<CollectionView, string> = {
  monthly: "Collected per month",
  weekly: "Collected per week",
  daily: "Collected per day",
};

/** The word for "no rows": a new database has no payments yet. */
const EMPTY: Record<CollectionView, string> = {
  monthly: "No payments have been collected yet.",
  weekly: "No payments have been collected yet.",
  daily: "No payments have been collected yet.",
};

/**
 * One page of the collections list: a row per month, Monday-to-Sunday week or day with what was collected (confirmed
 * payments, D93). The server did the adding up and the paging; this only draws it. `selectedStart` and `onSelect` let the
 * weekly view pick a week from its list.
 */
export default function PeriodsTable({
  view,
  data,
  isPending,
  error,
  page,
  onPageChange,
  selectedStart,
  onSelect,
}: {
  view: CollectionView;
  data: Collections | undefined;
  isPending: boolean;
  error: Error | null;
  page: number;
  onPageChange: (page: number) => void;
  /** The period start that is selected now (weekly view only). */
  selectedStart?: string;
  /** Called with a period's start when its row is clicked (weekly view only). */
  onSelect?: (start: string) => void;
}) {
  const columns: Column<CollectionPeriod>[] = [
    {
      key: "period",
      header: view === "monthly" ? "Month" : view === "weekly" ? "Week" : "Day",
      render: (row) => (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-800">
            {periodLabel(view, row)}
          </span>
          {row.periodStart === selectedStart && (
            <Badge size="sm" color="primary">
              Selected
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "count",
      header: "Payments",
      align: "end",
      render: (row) => <span className="num">{row.paymentCount}</span>,
    },
    {
      key: "total",
      header: "Collected",
      align: "end",
      render: (row) => (
        <span
          className={cn(
            "num font-medium",
            row.totalCents === 0 ? "text-gray-400" : "text-gray-800",
          )}
        >
          {formatCents(row.totalCents)}
        </span>
      ),
    },
  ];

  return (
    <TableCard
      title={TITLE[view]}
      isPending={isPending}
      error={error}
      isEmpty={data?.items.length === 0}
      emptyText={EMPTY[view]}
      page={page}
      totalPages={pageCount(data?.total ?? 0)}
      onPageChange={onPageChange}
    >
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.periodStart}
        onRowClick={onSelect ? (row) => onSelect(row.periodStart) : undefined}
      />
    </TableCard>
  );
}
