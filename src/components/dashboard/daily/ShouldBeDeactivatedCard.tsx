import type { DailyOperations } from "../../../api/dashboard.queries";
import BalanceText from "../../drivers/BalanceText";
import type { Column } from "../../tables/DataTable";
import Badge from "../../ui/badge/Badge";
import { plural } from "../dashboardFormat";
import DailyCard from "./DailyCard";
import { REASON_LABEL } from "./dailyFormat";

type Row = DailyOperations["shouldBeDeactivated"][number];

const COLUMNS: Column<Row>[] = [
  {
    key: "driver",
    header: "Driver",
    render: (row) => (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="font-medium text-gray-800">{row.name}</span>
        {row.driverStatus === "onboarding" && (
          <Badge size="sm" color="light">
            Onboarding
          </Badge>
        )}
      </span>
    ),
  },
  {
    key: "reason",
    header: "Reason",
    render: (row) => (
      <span className="flex flex-wrap gap-1.5">
        {row.reasons.map((reason) => (
          <Badge key={reason} size="sm" color="error" variant="solid">
            {REASON_LABEL[reason]}
          </Badge>
        ))}
      </span>
    ),
  },
  {
    key: "balance",
    header: "Balance",
    className: "num whitespace-nowrap",
    render: (row) => <BalanceText cents={row.balanceCents} />,
  },
  {
    key: "late",
    header: "Days late",
    className: "whitespace-nowrap",
    render: (row) => {
      const parts: string[] = [];
      if (row.daysLate > 0) parts.push(plural(row.daysLate, "day"));
      if (row.depositDaysSinceDue !== null) {
        parts.push(`deposit due ${plural(row.depositDaysSinceDue, "day")} ago`);
      }
      return parts.length > 0 ? parts.join(", ") : "—";
    },
  },
];

/**
 * Should Be Deactivated (D4): drivers who meet a rule (2 daily payments late, a weekly payment 2 days late, a deposit
 * unpaid 7 days after its due date) and are not on a payment plan. Red on purpose, so staff cannot miss it. It only shows:
 * nothing is deactivated automatically, staff open the driver and decide.
 */
export default function ShouldBeDeactivatedCard({ rows }: { rows: Row[] }) {
  return (
    <DailyCard
      title="Should be deactivated"
      subtitle="Nobody is deactivated automatically. Open the driver to decide. Drivers on a payment plan are not listed."
      columns={COLUMNS}
      rows={rows}
      emptyText="Nobody meets a deactivation rule."
      danger={rows.length > 0}
      ledgerLink
    />
  );
}
