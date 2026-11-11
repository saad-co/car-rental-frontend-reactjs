import { useNavigate } from "react-router";
import type { DailyOperations } from "../../../api/dashboard.queries";
import { formatCents } from "../../../utils";
import type { Column } from "../../tables/DataTable";
import Tabs from "../../ui/tabs/Tabs";
import DashboardCard from "../DashboardCard";
import { plural } from "../dashboardFormat";
import { DailyTable } from "./DailyCard";
import { DriverName, DueStatusBadge } from "./DailyBadges";
import { dueTimeText, rateText } from "./dailyFormat";

type Row = DailyOperations["dueToday"][number];

const COLUMNS: Column<Row>[] = [
  {
    key: "driver",
    header: "Driver",
    render: (row) => (
      <DriverName name={row.name} onPaymentPlan={row.onPaymentPlan} />
    ),
  },
  { key: "vehicle", header: "Vehicle", render: (row) => row.vehicle ?? "—" },
  {
    key: "rate",
    header: "Rate",
    className: "num whitespace-nowrap",
    render: (row) => rateText(row.rateCents, row.schedule),
  },
  {
    key: "due",
    header: "Due time",
    className: "whitespace-nowrap",
    render: (row) => dueTimeText(row.dueTime),
  },
  {
    key: "amount",
    header: "Amount due",
    align: "end",
    className: "num whitespace-nowrap",
    render: (row) => formatCents(row.amountDueCents),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <span className="inline-flex flex-wrap items-center gap-2">
        <DueStatusBadge status={row.status} />
        {row.status === "late" && row.openCents < row.amountDueCents && (
          <span className="num text-theme-xs text-gray-500">
            {formatCents(row.openCents)} left
          </span>
        )}
      </span>
    ),
  },
];

/**
 * Payments due today (D1): weekly drivers first, daily drivers on their own tab (the client asked for a separate group or a
 * filter). The status is worked out by the server: Paid when nothing of today's rent is open (credits pay the oldest
 * charges first), Late after the driver's due time, Not yet paid before it.
 */
export default function DueTodayCard({ rows }: { rows: Row[] }) {
  const navigate = useNavigate();
  const weekly = rows.filter((row) => row.schedule === "weekly");
  const daily = rows.filter((row) => row.schedule === "daily");
  const other = rows.filter((row) => row.schedule === null);
  const table = (list: Row[], emptyText: string) => (
    <DailyTable
      columns={COLUMNS}
      rows={list}
      emptyText={emptyText}
      onOpen={(row) => navigate(`/admin/drivers/${row.driverId}`)}
    />
  );
  const tabs = [
    {
      id: "weekly",
      label: `Weekly (${weekly.length})`,
      content: table(weekly, "No weekly payments are due today."),
    },
    {
      id: "daily",
      label: `Daily (${daily.length})`,
      content: table(daily, "No daily drivers are due today."),
    },
    ...(other.length > 0
      ? [
          {
            id: "other",
            label: `No contract (${other.length})`,
            content: table(other, ""),
          },
        ]
      : []),
  ];

  return (
    <DashboardCard
      title="Drivers due today"
      subtitle={`${plural(rows.length, "payment")} due today (Chicago). Click a row to open the driver.`}
    >
      <Tabs tabs={tabs} />
    </DashboardCard>
  );
}
