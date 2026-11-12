import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { cn } from "../../../utils";
import DataTable, { type Column } from "../../tables/DataTable";
import DashboardCard from "../DashboardCard";

/**
 * A card of the daily operations page holding one driver list: the shared `DataTable` inside the dashboard card, a click
 * on a row opens the driver. An empty list says so in words instead of showing an empty table. `danger` is for the
 * Should Be Deactivated list: a red border so staff cannot miss it. `ledgerLink` adds a "View ledger" link to every row
 * (Fleet revisions section 5), so staff can go straight from a late driver to their ledger.
 */
export default function DailyCard<T extends { driverId: string }>({
  title,
  subtitle,
  columns,
  rows,
  emptyText,
  danger = false,
  link,
  scroll = false,
  ledgerLink = false,
}: {
  title: string;
  subtitle?: string;
  columns: Column<T>[];
  rows: T[];
  emptyText: string;
  danger?: boolean;
  link?: { to: string; label: string };
  /** A long list scrolls inside the card instead of stretching the page. */
  scroll?: boolean;
  /** Add a "View ledger" link to each row. */
  ledgerLink?: boolean;
}) {
  const navigate = useNavigate();
  const shown: Column<T>[] = ledgerLink
    ? [
        ...columns,
        {
          key: "ledger",
          header: <span className="sr-only">Ledger</span>,
          align: "end",
          className: "whitespace-nowrap",
          render: (row) => (
            <Link
              to={`/admin/drivers/${row.driverId}/ledger`}
              onClick={(event) => event.stopPropagation()}
              className="text-theme-xs font-medium text-brand-500 hover:text-brand-600"
            >
              View ledger
            </Link>
          ),
        },
      ]
    : columns;
  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      link={link}
      className={cn(danger && "border-error-300 bg-error-50/30")}
    >
      <DailyTable
        columns={shown}
        rows={rows}
        emptyText={emptyText}
        scroll={scroll}
        onOpen={(row) => navigate(`/admin/drivers/${row.driverId}`)}
      />
    </DashboardCard>
  );
}

/** The table, or the empty text; also used inside tabs, where the card frame is shared. */
export function DailyTable<T extends { driverId: string }>({
  columns,
  rows,
  emptyText,
  onOpen,
  scroll = false,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyText: string;
  onOpen: (row: T) => void;
  scroll?: boolean;
}): ReactNode {
  if (rows.length === 0) {
    return <p className="py-4 text-theme-sm text-gray-500">{emptyText}</p>;
  }
  return (
    <div className={cn("-mx-5", scroll && "max-h-96 overflow-y-auto")}>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.driverId}
        onRowClick={onOpen}
      />
    </div>
  );
}
