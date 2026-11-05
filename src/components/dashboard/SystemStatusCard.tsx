import type { ReactNode } from "react";
import type { Dashboard } from "../../api/dashboard.queries";
import Badge, { type BadgeColor } from "../ui/badge/Badge";
import DashboardCard from "./DashboardCard";
import { plural } from "./dashboardFormat";

const SMS_MODE_TEXT: Record<Dashboard["sms"]["mode"], string> = {
  off: "Texting is switched off.",
  dry_run: "Dry run: texts are saved, not sent.",
  live: "Live: texts are really sent.",
};

/** One integration: its name, a coloured status badge and a line saying more. */
function StatusBox({
  name,
  badge,
  color,
  children,
}: {
  name: string;
  badge: string;
  color: BadgeColor;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-theme-sm font-medium text-gray-800">{name}</span>
        <Badge size="sm" color={color}>
          {badge}
        </Badge>
      </div>
      <p className="mt-1.5 text-theme-xs text-gray-500">{children}</p>
    </div>
  );
}

/**
 * The health of the parts around the app. The database is "Connected" because this page could load at all; the mailbox
 * comes from the latest recorded run; texting shows its mode and any failures. Nothing here calls Gmail or Quo (a slow or
 * failing outside call must never break the dashboard), so a mailbox problem shows once a run has recorded it.
 */
export default function SystemStatusCard({
  intake,
  sms,
}: {
  intake: Dashboard["intake"];
  sms: Dashboard["sms"];
}) {
  const run = intake.lastRun;
  return (
    <DashboardCard
      title="System status"
      subtitle="Health of the database, the mailbox and texting"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatusBox name="Database" badge="Ok" color="success">
          Connected.
        </StatusBox>
        {run === null ? (
          <StatusBox name="Mailbox" badge="No run yet" color="light">
            No run has been recorded yet.
          </StatusBox>
        ) : run.outcome === "ok" ? (
          <StatusBox name="Mailbox" badge="Ok" color="success">
            The last run finished without errors.
          </StatusBox>
        ) : run.outcome === "off" ? (
          <StatusBox name="Mailbox" badge="Off" color="light">
            Email intake is switched off.
          </StatusBox>
        ) : (
          <StatusBox name="Mailbox" badge="Error" color="error">
            {run.error}
          </StatusBox>
        )}
        <StatusBox
          name="Texting (Quo)"
          badge={
            !sms.quoConfigured
              ? "Not set up"
              : sms.failedLast7Days > 0
                ? "Check"
                : "Ok"
          }
          color={
            !sms.quoConfigured
              ? "light"
              : sms.failedLast7Days > 0
                ? "warning"
                : "success"
          }
        >
          {SMS_MODE_TEXT[sms.mode]}{" "}
          {sms.failedLast7Days > 0
            ? `${plural(sms.failedLast7Days, "text")} failed in the last 7 days.`
            : ""}
        </StatusBox>
      </div>
    </DashboardCard>
  );
}
