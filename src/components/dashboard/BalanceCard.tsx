import type { Dashboard } from "../../api/dashboard.queries";
import { cn, formatCents } from "../../utils";
import DashboardCard from "./DashboardCard";
import MiniStat from "./MiniStat";
import { CHART } from "./chartTheme";
import { Donut } from "./lazyCharts";

/** Counts as a whole-number share of `whole`, for the little "19%" under each count. */
function share(count: number, whole: number): string {
  return whole > 0 ? `${Math.round((count / whole) * 100)}%` : "0%";
}

/** How the drivers' balances split: in credit, settled, or owing, and the total still outstanding. */
export default function BalanceCard({
  balances,
}: {
  balances: Dashboard["balances"];
}) {
  return (
    <DashboardCard
      title="Driver balance distribution"
      subtitle="Active and inactive drivers; onboarding and archived ones are left out"
      link={{ to: "/admin/drivers", label: "Drivers" }}
    >
      <div className="mb-4 flex justify-center">
        <Donut
          slices={[
            {
              label: "In credit",
              value: balances.positiveCount,
              color: CHART.success,
            },
            { label: "Settled", value: balances.zeroCount, color: CHART.muted },
            {
              label: "Owing",
              value: balances.negativeCount,
              color: CHART.error,
            },
          ]}
          centerLabel="Drivers"
          centerValue={String(balances.driverCount)}
          formatValue={(n) => `${n} drivers`}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MiniStat
          label="In credit"
          value={String(balances.positiveCount)}
          hint={share(balances.positiveCount, balances.driverCount)}
          valueClassName="text-success-600"
        />
        <MiniStat
          label="Settled"
          value={String(balances.zeroCount)}
          hint={share(balances.zeroCount, balances.driverCount)}
        />
        <MiniStat
          label="Owing"
          value={String(balances.negativeCount)}
          hint={share(balances.negativeCount, balances.driverCount)}
          valueClassName={
            balances.negativeCount > 0 ? "text-error-600" : undefined
          }
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-theme-xs text-gray-500">
        <span>
          Credit total{" "}
          <span
            className={cn(
              "num",
              balances.creditCents > 0 ? "text-success-600" : "text-gray-500",
            )}
          >
            {formatCents(balances.creditCents)}
          </span>
        </span>
        <span>
          Total outstanding{" "}
          <span
            className={cn(
              "num",
              balances.outstandingCents > 0
                ? "text-error-600"
                : "text-gray-500",
            )}
          >
            {formatCents(balances.outstandingCents)}
          </span>
        </span>
      </div>
    </DashboardCard>
  );
}
