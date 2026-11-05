import type { Dashboard } from "../../api/dashboard.queries";
import { formatDateTime } from "../../utils";
import Badge from "../ui/badge/Badge";
import DashboardCard from "./DashboardCard";
import MiniStat from "./MiniStat";
import { plural } from "./dashboardFormat";

/**
 * How the payment mailbox is doing: how the latest run ended (and why, when it failed), what it stored in the last 24
 * hours and 7 days, and the payments waiting for the matcher. A failed run shows its reason here, not only in a log line.
 */
export default function IntakeCard({
  intake,
}: {
  intake: Dashboard["intake"];
}) {
  const run = intake.lastRun;
  return (
    <DashboardCard
      title="Email intake"
      subtitle="Latest mailbox run and what it stored"
      link={{ to: "/admin/email-log", label: "Open email log" }}
    >
      <div role="status" className="mb-4">
        {run === null ? (
          <p className="flex items-center gap-2 text-theme-sm text-gray-500">
            <Badge size="sm" color="light">
              No run yet
            </Badge>
            No mailbox run has been recorded yet.
          </p>
        ) : run.outcome === "off" ? (
          <p className="flex items-center gap-2 text-theme-sm text-gray-500">
            <Badge size="sm" color="light">
              Off
            </Badge>
            Email intake is switched off. Last checked {formatDateTime(run.at)}.
          </p>
        ) : run.outcome === "ok" ? (
          <p className="flex flex-wrap items-center gap-2 text-theme-sm text-gray-500">
            <Badge size="sm" color="success">
              Ok
            </Badge>
            Last run {formatDateTime(run.at)}: stored{" "}
            {plural(run.stored, "email")}.
          </p>
        ) : (
          <div>
            <p className="flex flex-wrap items-center gap-2 text-theme-sm text-gray-500">
              <Badge size="sm" color="error">
                Failed
              </Badge>
              Last run {formatDateTime(run.at)}.{" "}
              {run.lastSuccessAt
                ? `It last worked ${formatDateTime(run.lastSuccessAt)}.`
                : "It has not worked since it was first recorded."}
            </p>
            <p className="mt-2 rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-theme-sm text-error-600">
              {run.error}
            </p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat
          label="Payment emails"
          value={String(intake.last24Hours.processed)}
          hint={`${intake.last7Days.processed} in 7 days`}
        />
        <MiniStat
          label="Not a payment"
          value={String(intake.last24Hours.notPayment)}
          hint={`${intake.last7Days.notPayment} in 7 days`}
        />
        <MiniStat
          label="Rejected"
          value={String(intake.last24Hours.rejectedUnverified)}
          hint={`${intake.last7Days.rejectedUnverified} in 7 days`}
          valueClassName={
            intake.last24Hours.rejectedUnverified > 0
              ? "text-warning-600"
              : undefined
          }
        />
        <MiniStat
          label="Extraction failed"
          value={String(intake.last24Hours.extractionFailed)}
          hint={`${intake.last7Days.extractionFailed} in 7 days`}
          valueClassName={
            intake.last24Hours.extractionFailed > 0
              ? "text-error-600"
              : undefined
          }
        />
        <MiniStat
          label="Duplicates"
          value={String(intake.last24Hours.duplicatePayment)}
          hint={`${intake.last7Days.duplicatePayment} in 7 days`}
        />
        <MiniStat
          label="Awaiting match"
          value={String(intake.awaitingMatchCount)}
          hint="not looked at yet"
        />
      </div>
      <p className="mt-2 text-theme-xs text-gray-500">
        The big figure of each box is the last 24 hours.{" "}
        {intake.lastEmailAt
          ? `The newest email arrived ${formatDateTime(intake.lastEmailAt)}.`
          : "No email has been stored yet."}
      </p>
    </DashboardCard>
  );
}
