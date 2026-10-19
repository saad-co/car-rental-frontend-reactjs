import { Link } from "react-router";
import type { Driver } from "../../api/drivers.queries";
import type { LedgerOverview } from "../../api/ledger.queries";
import {
  chicagoToday,
  cn,
  formatCents,
  formatDateTime,
  formatDay,
  formatUsPhone,
} from "../../utils";
import DriverStatusBadge from "../drivers/DriverStatusBadge";
import { paymentSourceLabel } from "../payments/paymentLabels";

/**
 * The top card of the ledger page: who the driver is, their last payment, and the balance in big letters
 * ("Balance due" in red, "Credit balance" in green, "Settled" in grey).
 */
export default function LedgerHeader({
  driver,
  overview,
}: {
  driver: Driver;
  /** Undefined while it loads or when it failed: the balance then shows a dash. */
  overview: LedgerOverview | undefined;
}) {
  const fullName = `${driver.firstName} ${driver.lastName}`;
  const balance = overview?.balanceCents;
  const last = overview?.lastPayment;

  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 sm:flex-row sm:items-start">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-800">{fullName}</h1>
          <DriverStatusBadge driver={driver} />
          <Link
            to={`/admin/drivers/${driver.id}`}
            className="text-sm text-brand-500 hover:text-brand-600"
          >
            View driver
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          {formatUsPhone(driver.phone)} · Driver since{" "}
          {formatDateTime(driver.createdAt)}
        </p>
        <p className="text-sm text-gray-500">
          {last ? (
            <>
              Last payment{" "}
              <span className="font-medium text-gray-800">
                {formatCents(last.amountCents)}
              </span>{" "}
              via {paymentSourceLabel(last.source, last.manualMethod)} on{" "}
              {formatDay(chicagoToday(new Date(last.occurredAt)))}
            </>
          ) : overview ? (
            "No payments yet"
          ) : null}
        </p>
      </div>

      <div className="sm:text-end">
        <p className="text-theme-xs font-medium tracking-wide text-gray-500 uppercase">
          {balance !== undefined && balance > 0
            ? "Credit balance"
            : "Balance due"}
        </p>
        <p
          className={cn(
            "text-title-md font-semibold",
            balance === undefined || balance === 0
              ? "text-gray-500"
              : balance < 0
                ? "text-error-600"
                : "text-success-600",
          )}
        >
          {balance === undefined ? "—" : formatCents(Math.abs(balance))}
        </p>
        <p className="text-theme-xs text-gray-500">
          {balance === undefined
            ? ""
            : balance < 0
              ? "The driver owes this."
              : balance > 0
                ? "The driver has paid ahead."
                : "Nothing owed."}
        </p>
      </div>
    </div>
  );
}
