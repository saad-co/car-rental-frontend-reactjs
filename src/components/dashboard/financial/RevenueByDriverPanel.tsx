import { useState } from "react";
import { Link } from "react-router";
import {
  useRevenueByDriver,
  type DriverRevenue,
} from "../../../api/dashboard.queries";
import { formatCents, formatDateTime } from "../../../utils";
import DataTable, { type Column } from "../../tables/DataTable";
import TableCard from "../../tables/TableCard";
import {
  LIST_PAGE_SIZE,
  pageCount,
  type DateRange,
} from "../../tables/useListParams";
import Badge from "../../ui/badge/Badge";
import StatTile from "../../ui/stat/StatTile";
import { plural } from "../dashboardFormat";

/**
 * Revenue per driver (D93): the confirmed payments received from each driver, biggest first, for all time or for a range of
 * Chicago days. It is money received, not rent billed, and it lists inactive and archived drivers too (money received stays
 * revenue).
 */
export default function RevenueByDriverPanel() {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<DateRange>({});
  const { data, isPending, error } = useRevenueByDriver({
    page,
    limit: LIST_PAGE_SIZE,
    ...range,
  });

  const columns: Column<DriverRevenue>[] = [
    {
      key: "driver",
      header: "Driver",
      render: (row) => (
        <span className="flex flex-wrap items-center gap-2">
          <Link
            to={`/admin/drivers/${row.driverId}`}
            className="font-medium text-gray-800 hover:text-brand-500"
          >
            {row.name}
          </Link>
          {row.status === "inactive" && (
            <Badge size="sm" color="light">
              Inactive
            </Badge>
          )}
          {row.archived && (
            <Badge size="sm" color="light">
              Archived
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
      key: "last",
      header: "Last payment",
      className: "whitespace-nowrap",
      render: (row) => formatDateTime(row.lastPaymentAt),
    },
    {
      key: "total",
      header: "Revenue",
      align: "end",
      render: (row) => (
        <span className="num font-medium text-gray-800">
          {formatCents(row.totalCents)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Revenue"
          value={data ? formatCents(data.totalCents) : "…"}
          hint="confirmed payments received"
          tone="good"
        />
        <StatTile
          label="Payments"
          value={data ? String(data.paymentCount) : "…"}
        />
        <StatTile
          label="Drivers"
          value={data ? String(data.total) : "…"}
          hint={
            data
              ? `${plural(data.total, "driver")} paid in this range`
              : undefined
          }
        />
      </div>
      <TableCard
        title="Revenue per driver"
        dateRange={{
          label: "Received",
          value: range,
          onChange: (next) => {
            setRange(next);
            setPage(1);
          },
        }}
        isPending={isPending}
        error={error}
        isEmpty={data?.items.length === 0}
        emptyText="No payments were received in this range."
        page={page}
        totalPages={pageCount(data?.total ?? 0)}
        onPageChange={setPage}
      >
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(row) => row.driverId}
        />
      </TableCard>
    </div>
  );
}
