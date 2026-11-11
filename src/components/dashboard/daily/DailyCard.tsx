import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { cn } from "../../../utils";
import DataTable, { type Column } from "../../tables/DataTable";
import DashboardCard from "../DashboardCard";

/**
 * A card of the daily operations page holding one driver list: the shared `DataTable` inside the dashboard card, a click
 * on a row opens the driver. An empty list says so in words instead of showing an empty table. `danger` is for the
 * Should Be Deactivated list: a red border so staff cannot miss it.
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
}) {
  const navigate = useNavigate();
  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      link={link}
      className={cn(danger && "border-error-300 bg-error-50/30")}
    >
      <DailyTable
        columns={columns}
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
