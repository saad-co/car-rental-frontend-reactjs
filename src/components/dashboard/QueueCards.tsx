import { Link } from "react-router";
import type { Dashboard } from "../../api/dashboard.queries";
import { useApplications } from "../../api/applications.queries";
import { usePayments } from "../../api/payments.queries";
import { formatCents, formatDateTime } from "../../utils";
import { PAYMENT_SOURCE_LABEL } from "../payments/paymentLabels";
import DashboardCard from "./DashboardCard";
import QueryState from "./QueryState";

/** How many rows each queue shows (the old dashboard showed 8). */
const QUEUE_SIZE = 8;

const ROW =
  "flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-100";

/** The newest applications waiting for a decision. Loads through the Applications list's own hook, so it fails on its own. */
export function PendingApplicationsCard() {
  const { data, isPending, error, refetch } = useApplications({
    status: "pending",
    page: 1,
    limit: QUEUE_SIZE,
  });
  return (
    <DashboardCard
      title="Pending vetting queue"
      subtitle="Newest applications waiting for review"
      link={{ to: "/admin/applications?status=pending", label: "Review" }}
    >
      <QueryState
        isPending={isPending}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={data?.items.length === 0}
        emptyText="No applications are waiting."
      >
        <ul className="space-y-2">
          {data?.items.map((application) => (
            <li key={application.id}>
              <Link
                to={`/admin/applications/${application.id}`}
                className={ROW}
              >
                <span className="min-w-0 truncate text-theme-sm font-medium text-gray-800">
                  {application.firstName} {application.lastName}
                </span>
                <span className="shrink-0 text-theme-xs text-gray-500">
                  {formatDateTime(application.receivedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </QueryState>
    </DashboardCard>
  );
}

/** Payments the matcher could not place, newest first: someone has to assign them to a driver. */
export function UnmatchedPaymentsCard() {
  const { data, isPending, error, refetch } = usePayments({
    match: "review",
    page: 1,
    limit: QUEUE_SIZE,
  });
  return (
    <DashboardCard
      title="Unmatched queue"
      subtitle="Payments that need a driver assigned"
      link={{ to: "/admin/payments?match=review", label: "Resolve" }}
    >
      <QueryState
        isPending={isPending}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={data?.items.length === 0}
        emptyText="Nothing to assign."
      >
        <ul className="space-y-2">
          {data?.items.map((payment) => (
            <li key={payment.id}>
              <Link to="/admin/payments?match=review" className={ROW}>
                <span className="min-w-0">
                  <span className="block truncate text-theme-sm font-medium text-gray-800">
                    {payment.senderName}
                  </span>
                  <span className="block truncate text-theme-xs text-gray-500">
                    {PAYMENT_SOURCE_LABEL[payment.source]} ·{" "}
                    {formatDateTime(payment.occurredAt)}
                  </span>
                </span>
                <span className="num shrink-0 text-theme-sm font-semibold text-warning-600">
                  {formatCents(payment.amountCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </QueryState>
    </DashboardCard>
  );
}

/** The drivers who owe the most, so the biggest balances are never a surprise. Each row opens that driver's ledger. */
export function WatchlistCard({
  balances,
}: {
  balances: Dashboard["balances"];
}) {
  return (
    <DashboardCard
      title="Balance watchlist"
      subtitle="Drivers who owe the most"
      link={{ to: "/admin/drivers", label: "Open Drivers" }}
    >
      {balances.watchlist.length === 0 ? (
        <p className="py-6 text-theme-sm text-gray-500">
          No driver owes money.
        </p>
      ) : (
        <ul className="space-y-2">
          {balances.watchlist.map((driver) => (
            <li key={driver.driverId}>
              <Link
                to={`/admin/drivers/${driver.driverId}/ledger`}
                className={ROW}
              >
                <span className="min-w-0 truncate text-theme-sm font-medium text-gray-800">
                  {driver.name}
                </span>
                <span className="num shrink-0 text-theme-sm font-semibold text-error-600">
                  {formatCents(driver.balanceCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
