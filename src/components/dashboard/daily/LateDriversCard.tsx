import type { DailyOperations } from "../../../api/dashboard.queries";
import { formatCents } from "../../../utils";
import type { Column } from "../../tables/DataTable";
import DailyCard from "./DailyCard";
import { DriverName } from "./DailyBadges";
import { lateText, scheduleLabel } from "./dailyFormat";

type Row = DailyOperations["late"][number];

const COLUMNS: Column<Row>[] = [
  {
    key: "driver",
    header: "Driver",
    render: (row) => (
      <DriverName name={row.name} onPaymentPlan={row.onPaymentPlan} />
    ),
  },
  {
    key: "type",
    header: "Rate type",
    render: (row) => scheduleLabel(row.schedule),
  },
  {
    key: "past",
    header: "Amount past due",
    align: "end",
    className: "num whitespace-nowrap text-error-600",
    render: (row) => formatCents(row.pastDueCents),
  },
  {
    key: "late",
    header: "Late",
    className: "whitespace-nowrap",
    render: (row) => (
      <span>
        {lateText(row.daysLate, row.hoursLate)}
        {row.lateCount > 1 && (
          <span className="ml-2 text-theme-xs text-gray-500">
            {row.lateCount} payments
          </span>
        )}
      </span>
    ),
  },
];

/**
 * Late payments (D2): every driver with unpaid rent past its due time, the longest late first. The amount is what is still
 * unpaid after credits are applied oldest first. Late fees and the late-fee switch are not here: the client has not
 * confirmed them yet.
 */
export function LatePaymentsCard({ rows }: { rows: Row[] }) {
  return (
    <DailyCard
      title="Late payments"
      subtitle="Weekly and daily drivers with unpaid rent past the due time"
      columns={COLUMNS}
      rows={rows}
      emptyText="Nobody is late."
      ledgerLink
    />
  );
}

/**
 * Early Warning (D3): the oldest unpaid payment is a full day or more past its due date and time (due Wednesday 6 PM, still
 * unpaid Thursday 6 PM). The step before Should Be Deactivated.
 */
export function EarlyWarningCard({ rows }: { rows: Row[] }) {
  return (
    <DailyCard
      title="Early warning: 24+ hours late"
      subtitle="Flagged once a payment is a full day past its due date and time"
      columns={COLUMNS}
      rows={rows}
      emptyText="Nobody is a full day late."
      ledgerLink
    />
  );
}
