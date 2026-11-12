import { useNavigate } from "react-router";
import { useDailyOperations } from "../../api/dashboard.queries";
import {
  plural,
  weekdayName,
} from "../../components/dashboard/dashboardFormat";
import CollectionsCard from "../../components/dashboard/daily/CollectionsCard";
import {
  DepositsCollectedCard,
  DepositsPendingCard,
} from "../../components/dashboard/daily/DepositsCards";
import DueTodayCard from "../../components/dashboard/daily/DueTodayCard";
import {
  EarlyWarningCard,
  LatePaymentsCard,
} from "../../components/dashboard/daily/LateDriversCard";
import ShouldBeDeactivatedCard from "../../components/dashboard/daily/ShouldBeDeactivatedCard";
import WeeklyTotalCard from "../../components/dashboard/daily/WeeklyTotalCard";
import Button from "../../components/ui/button/Button";
import { PlusIcon } from "../../icons";
import Spinner from "../../components/ui/spinner/Spinner";
import StatTile from "../../components/ui/stat/StatTile";
import { HIDE_FINANCIALS } from "../../demoMode";
import { formatCents, formatDateTime } from "../../utils";

/**
 * The dashboard's main view (daily operations, D92), in the order the client listed it: the headline counts, drivers due
 * today, late payments, early warning, should be deactivated, the weekly total with prior weeks, deposits collected and
 * pending, collections. One request fills it; every figure is worked out by the server.
 */
export default function DailyOperations() {
  const { data, error, refetch, isFetching } = useDailyOperations();
  const navigate = useNavigate();

  if (!data) {
    if (error) {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-error-200 bg-error-50 p-6"
        >
          <h1 className="text-base font-semibold text-gray-800">
            The daily operations could not be loaded
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
        <Spinner /> Loading the daily operations…
      </div>
    );
  }

  const thisWeek = data.weeks[0];
  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-gray-200 bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-title-sm font-semibold text-gray-900">
              Daily operations
            </h1>
            <p className="mt-1 text-theme-sm text-gray-500">
              Chicago snapshot {formatDateTime(data.asOf)} ·{" "}
              {weekdayName(data.today)}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Quick action (Fleet revisions section 5): the same form as Drivers > Add driver. */}
            <Button
              size="sm"
              startIcon={<PlusIcon />}
              onClick={() => void navigate("/admin/drivers/new")}
            >
              Add driver
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatTile
            label="Due today"
            value={String(data.dueToday.length)}
            hint={plural(data.dueToday.length, "payment")}
            to="#due-today"
          />
          <StatTile
            label="Late payments"
            value={String(data.late.length)}
            hint={plural(data.late.length, "driver")}
            to="#late-payments"
            tone={data.late.length > 0 ? "warm" : "none"}
          />
          <StatTile
            label="Early warning"
            value={String(data.earlyWarning.length)}
            hint="a full day or more late"
            to="#early-warning"
            tone={data.earlyWarning.length > 0 ? "warm" : "none"}
          />
          <StatTile
            label="Should be deactivated"
            value={String(data.shouldBeDeactivated.length)}
            hint={plural(data.shouldBeDeactivated.length, "driver")}
            to="#should-be-deactivated"
            tone={data.shouldBeDeactivated.length > 0 ? "hot" : "none"}
          />
          {!HIDE_FINANCIALS && (
            <StatTile
              label="Collected this week"
              value={formatCents(thisWeek.totalCents)}
              hint={plural(thisWeek.paymentCount, "payment")}
              to="#weekly-total"
            />
          )}
          {!HIDE_FINANCIALS && (
            <StatTile
              label="Deposits pending"
              value={formatCents(data.depositsPending.totalCents)}
              hint={plural(data.depositsPending.drivers.length, "driver")}
              to="#deposits-pending"
            />
          )}
        </div>
      </header>

      {/* The ids are where the headline tiles scroll to (scroll-mt-24 keeps the card clear of the sticky header). */}
      <div id="due-today" className="scroll-mt-24">
        <DueTodayCard rows={data.dueToday} />
      </div>
      <div id="late-payments" className="scroll-mt-24">
        <LatePaymentsCard rows={data.late} />
      </div>
      <div id="early-warning" className="scroll-mt-24">
        <EarlyWarningCard rows={data.earlyWarning} />
      </div>
      <div id="should-be-deactivated" className="scroll-mt-24">
        <ShouldBeDeactivatedCard rows={data.shouldBeDeactivated} />
      </div>
      {/* Everything below is money: hidden in the investor-demo mode (src/demoMode.ts). */}
      {!HIDE_FINANCIALS && (
        <>
          <div id="weekly-total" className="scroll-mt-24">
            <WeeklyTotalCard weeks={data.weeks} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <DepositsCollectedCard data={data.depositsCollected} />
            <div id="deposits-pending" className="scroll-mt-24">
              <DepositsPendingCard data={data.depositsPending} />
            </div>
          </div>
          <CollectionsCard data={data.collections} />
        </>
      )}
    </div>
  );
}
