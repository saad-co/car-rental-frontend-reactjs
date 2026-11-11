import type { DailyOperations } from "../../../api/dashboard.queries";
import { formatCents, formatDateTime, formatDay } from "../../../utils";
import type { Column } from "../../tables/DataTable";
import Badge from "../../ui/badge/Badge";
import { plural } from "../dashboardFormat";
import DailyCard from "./DailyCard";
import { DriverName } from "./DailyBadges";

type Collected = DailyOperations["depositsCollected"];
type Pending = DailyOperations["depositsPending"];

const COLLECTED_COLUMNS: Column<Collected["drivers"][number]>[] = [
  {
    key: "driver",
    header: "Driver",
    render: (row) => (
      <span className="font-medium text-gray-800">{row.name}</span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    align: "end",
    className: "num whitespace-nowrap",
    render: (row) =>
      row.amountCents === null ? (
        <span className="text-gray-400">Not recorded</span>
      ) : (
        formatCents(row.amountCents)
      ),
  },
  {
    key: "paid",
    header: "Ticked paid",
    className: "whitespace-nowrap",
    render: (row) => formatDateTime(row.paidAt),
  },
];

/**
 * Deposits collected (D6): the drivers whose "Deposit paid" step is ticked, with the amount typed then. It is a record of
 * what staff ticked, not a sum of ledger entries (ticking does not credit the ledger, B106).
 */
export function DepositsCollectedCard({ data }: { data: Collected }) {
  const note =
    data.withoutAmountCount > 0
      ? ` ${plural(data.withoutAmountCount, "driver")} with no amount recorded ${data.withoutAmountCount === 1 ? "is" : "are"} not in the total.`
      : "";
  return (
    <DailyCard
      title={`Deposits collected: ${formatCents(data.totalCents)}`}
      subtitle={`${plural(data.drivers.length, "driver")}.${note}`}
      columns={COLLECTED_COLUMNS}
      rows={data.drivers}
      emptyText="No deposit has been ticked as paid."
      scroll
    />
  );
}

const PENDING_COLUMNS: Column<Pending["drivers"][number]>[] = [
  {
    key: "driver",
    header: "Driver",
    render: (row) => (
      <DriverName name={row.name} onPaymentPlan={row.onPaymentPlan} />
    ),
  },
  {
    key: "amount",
    header: "Still owed",
    align: "end",
    className: "num whitespace-nowrap",
    render: (row) => formatCents(row.amountCents),
  },
  {
    key: "due",
    header: "Due",
    className: "whitespace-nowrap",
    render: (row) => formatDay(row.dueDate),
  },
  {
    key: "status",
    header: "Status",
    render: (row) =>
      row.overdue ? (
        <Badge size="sm" color="error">
          {row.daysSinceDue} days overdue
        </Badge>
      ) : (
        <Badge size="sm" color="warning">
          {row.daysSinceDue < 0
            ? `Due in ${plural(-row.daysSinceDue, "day")}`
            : row.daysSinceDue === 0
              ? "Due today"
              : `${plural(row.daysSinceDue, "day")} since due`}
        </Badge>
      ),
  },
];

/**
 * Deposits pending (D7): the signed contract asks for a deposit and the "Deposit paid" step is not ticked. The due day is
 * the contract start date (pickup). From 7 days after it the driver is also on the Should Be Deactivated list.
 */
export function DepositsPendingCard({ data }: { data: Pending }) {
  return (
    <DailyCard
      title={`Deposits pending: ${formatCents(data.totalCents)}`}
      subtitle={`${plural(data.drivers.length, "driver")} still owe a deposit`}
      columns={PENDING_COLUMNS}
      rows={data.drivers}
      emptyText="No deposit is pending."
      scroll
    />
  );
}
