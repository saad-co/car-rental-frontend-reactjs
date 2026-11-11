import { useState } from "react";
import { useCollections } from "../../../api/dashboard.queries";
import { formatCents } from "../../../utils";
import DateRangePicker from "../../tables/DateRangePicker";
import type { DateRange } from "../../tables/useListParams";
import StatTile from "../../ui/stat/StatTile";
import DashboardCard from "../DashboardCard";
import { plural } from "../dashboardFormat";
import PaymentRecords from "./PaymentRecords";

/** The total and every payment of the chosen days. Rendered only once both days are picked, so its queries always have them. */
function RangeResults({ from, to }: { from: string; to: string }) {
  // The totals of the whole range, from the same endpoint as the monthly, weekly and daily lists.
  const { data, error } = useCollections({
    view: "daily",
    from,
    to,
    page: 1,
    limit: 1,
  });
  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="text-theme-sm text-error-600">
          {error.message}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Total collected"
            value={data ? formatCents(data.totalCents) : "…"}
            hint="confirmed payments in the range"
            tone="good"
          />
          <StatTile
            label="Payments"
            value={data ? String(data.paymentCount) : "…"}
            hint={data ? plural(data.paymentCount, "payment") : undefined}
          />
        </div>
      )}
      <PaymentRecords from={from} to={to} />
    </div>
  );
}

/** The custom range (D93): pick a start and an end day; see the total and every payment collected in between. */
export default function CustomRangeView() {
  const [range, setRange] = useState<DateRange>({});
  return (
    <div className="space-y-4">
      <DashboardCard
        title="Custom date range"
        subtitle="Pick the first and the last day (Chicago days, both included)"
      >
        <DateRangePicker
          value={range}
          onChange={setRange}
          ariaLabel="Collected between"
        />
      </DashboardCard>
      {range.from && range.to ? (
        <RangeResults from={range.from} to={range.to} />
      ) : (
        <p className="rounded-2xl border border-gray-200 bg-surface p-6 text-theme-sm text-gray-500">
          Pick a start and an end day to see what was collected.
        </p>
      )}
    </div>
  );
}
