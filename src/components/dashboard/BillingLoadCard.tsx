import type { Dashboard } from "../../api/dashboard.queries";
import { formatCents } from "../../utils";
import DashboardCard from "./DashboardCard";
import MiniStat from "./MiniStat";
import { plural, weekdayName } from "./dashboardFormat";

/**
 * The rent billed today, and what drivers who left still owe. "Due today" is worked out by the server with the rent job's
 * own schedule, so it is what the job posts today. The old dashboard's "paused / terminated exposure" (the rates of paused
 * drivers) has no meaning here; this shows the balances inactive drivers and collections still owe instead.
 */
export default function BillingLoadCard({
  billing,
  today,
}: {
  billing: Dashboard["billing"];
  today: string;
}) {
  return (
    <DashboardCard
      title="Billing load forecast"
      subtitle="Rent due today, and what drivers who left still owe"
    >
      <div className="rounded-xl border border-gray-200 px-4 py-3">
        <p className="text-theme-xs text-gray-500">Expected rent right now</p>
        <p className="num mt-0.5 text-title-sm font-semibold text-success-600">
          {formatCents(billing.dueTodayCents)}
        </p>
        <p className="mt-0.5 text-theme-xs text-gray-500">
          Daily rent plus weekly rent due today ({weekdayName(today)})
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MiniStat
          label="Daily rent today"
          value={formatCents(billing.dailyDueCents)}
          hint={plural(billing.dailyDueDrivers, "driver")}
        />
        <MiniStat
          label="Weekly rent today"
          value={formatCents(billing.weeklyDueCents)}
          hint={plural(billing.weeklyDueDrivers, "driver")}
        />
        <MiniStat
          label="Owed by inactive drivers"
          value={formatCents(billing.inactiveOwedCents)}
          hint="not in collections"
          valueClassName={
            billing.inactiveOwedCents > 0 ? "text-warning-600" : undefined
          }
        />
        <MiniStat
          label="In collections"
          value={formatCents(billing.collectionsOwedCents)}
          hint="still owed"
          valueClassName={
            billing.collectionsOwedCents > 0 ? "text-error-600" : undefined
          }
        />
      </div>
    </DashboardCard>
  );
}
