import { useDashboard, type Dashboard } from "../../api/dashboard.queries";
import BalanceCard from "../../components/dashboard/BalanceCard";
import BillingLoadCard from "../../components/dashboard/BillingLoadCard";
import DashboardCard from "../../components/dashboard/DashboardCard";
import FunnelCard from "../../components/dashboard/FunnelCard";
import IntakeCard from "../../components/dashboard/IntakeCard";
import PaymentSourcesCard from "../../components/dashboard/PaymentSourcesCard";
import {
  PendingApplicationsCard,
  UnmatchedPaymentsCard,
  WatchlistCard,
} from "../../components/dashboard/QueueCards";
import SystemStatusCard from "../../components/dashboard/SystemStatusCard";
import WeeklyDueCard from "../../components/dashboard/WeeklyDueCard";
import { RevenueTrend } from "../../components/dashboard/lazyCharts";
import {
  plural,
  weekdayName,
} from "../../components/dashboard/dashboardFormat";
import Button from "../../components/ui/button/Button";
import Spinner from "../../components/ui/spinner/Spinner";
import StatTile from "../../components/ui/stat/StatTile";
import { formatCents, formatDateTime, formatDay } from "../../utils";

/** The four big figures at the top; the fleet balance is red when drivers owe more than they hold. */
function HeadlineTiles({ data }: { data: Dashboard }) {
  const { payments, balances } = data;
  const fleet = balances.fleetBalanceCents;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Gross processed"
        value={formatCents(payments.processedCents)}
        hint={`${plural(payments.processedCount, "payment")} in total`}
      />
      <StatTile
        label="Matched value"
        value={formatCents(payments.grossCents)}
        hint={`${payments.matchedPercent}% matched to a driver`}
        tone="good"
      />
      <StatTile
        label="Queue value"
        value={formatCents(payments.queueCents)}
        hint={`${payments.queueCount} pending, ${payments.needsReviewCount} need review`}
        tone={payments.queueCount > 0 ? "warm" : "none"}
      />
      <StatTile
        label="Fleet balance"
        value={formatCents(fleet)}
        hint="credits minus debits"
        tone={fleet < 0 ? "hot" : fleet > 0 ? "good" : "none"}
      />
    </div>
  );
}

/** The ten smaller figures under the headline row. */
function SmallTiles({ data }: { data: Dashboard }) {
  const { payments, drivers, billing, applications } = data;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatTile
        label="Collected today"
        value={formatCents(payments.todayCents)}
        hint="Chicago day"
      />
      <StatTile
        label="7-day collection"
        value={formatCents(payments.last7DaysCents)}
        hint="rolling window"
      />
      <StatTile
        label="30-day collection"
        value={formatCents(payments.last30DaysCents)}
        hint="rolling window"
      />
      <StatTile
        label="Avg payment"
        value={formatCents(payments.averageCents)}
        hint="matched payments"
      />
      <StatTile
        label="Largest payment"
        value={formatCents(payments.largestCents)}
        hint="single payment"
      />
      <StatTile
        label="This week"
        value={formatCents(payments.thisWeekCents)}
        hint={`${plural(payments.thisWeekCount, "payment")}, Mon to today`}
      />
      <StatTile
        label="Drivers active"
        value={String(drivers.active)}
        hint={
          drivers.daily + drivers.weekly === 0
            ? "no contracts in force"
            : `${drivers.dailyPercent}% daily · ${drivers.weeklyPercent}% weekly`
        }
      />
      <StatTile
        label="Weekly due today"
        value={String(billing.weeklyDueDrivers)}
        hint={`${plural(drivers.weekly, "weekly driver")}`}
      />
      <StatTile
        label="Billing due today"
        value={formatCents(billing.dueTodayCents)}
        hint="daily plus weekly rent"
      />
      <StatTile
        label="Applications pending"
        value={String(applications.pending)}
        hint={`${applications.approved} approved`}
      />
    </div>
  );
}

/** The revenue bars: one bar per day for the last 21 days, with the best day named under them. */
function RevenueTrendCard({ trend }: { trend: Dashboard["trend"] }) {
  // The best day: picking the largest figure, no arithmetic.
  const peak = trend.reduce((best, day) =>
    day.amountCents > best.amountCents ? day : best,
  );
  return (
    <DashboardCard
      title={`Revenue trend (last ${trend.length} days)`}
      subtitle="Matched payments received per Chicago day"
      link={{ to: "/admin/payments", label: "Payments" }}
    >
      <RevenueTrend days={trend} />
      {peak.amountCents > 0 && (
        <p className="mt-2 text-theme-xs text-gray-500">
          Best day {formatDay(peak.day)}:{" "}
          <span className="num text-gray-800">
            {formatCents(peak.amountCents)}
          </span>
        </p>
      )}
    </DashboardCard>
  );
}

/** Everything the dashboard shows. One request fills it (`GET /dashboard`); the two queues load themselves. */
export default function Home() {
  const { data, error, refetch, isFetching, dataUpdatedAt } = useDashboard();

  // No figures at all yet: either still loading, or the first load failed.
  if (!data) {
    if (error) {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-error-200 bg-error-50 p-6"
        >
          <h1 className="text-base font-semibold text-gray-800">
            The dashboard could not be loaded
          </h1>
          <p className="mt-1 text-theme-sm text-error-600">{error.message}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-surface p-6 text-theme-sm text-gray-500"
      >
        <Spinner /> Loading the dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* A refresh failed but earlier figures are on screen: keep them, and say how old they are. */}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-error-200 bg-error-50 px-5 py-3"
        >
          <p className="text-theme-sm text-error-600">
            The dashboard could not be refreshed ({error.message}). The figures
            below are from{" "}
            {formatDateTime(new Date(dataUpdatedAt).toISOString())}.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      )}
      <header className="rounded-2xl border border-gray-200 bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-title-sm font-semibold text-gray-900">
              Statistics
            </h1>
            <p className="mt-1 text-theme-sm text-gray-500">
              Chicago snapshot {formatDateTime(data.asOf)} ·{" "}
              {weekdayName(data.today)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        <div className="mt-4">
          <HeadlineTiles data={data} />
        </div>
      </header>

      <SmallTiles data={data} />

      <div className="grid gap-4 lg:grid-cols-3">
        <RevenueTrendCard trend={data.trend} />
        <PaymentSourcesCard payments={data.payments} sources={data.sources} />
        <BillingLoadCard billing={data.billing} today={data.today} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WeeklyDueCard days={data.billing.weeklyByDay} today={data.today} />
        <FunnelCard applications={data.applications} />
        <BalanceCard balances={data.balances} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PendingApplicationsCard />
        <UnmatchedPaymentsCard />
        <WatchlistCard balances={data.balances} />
      </div>

      <IntakeCard intake={data.intake} />
      <SystemStatusCard intake={data.intake} sms={data.sms} />
    </div>
  );
}
