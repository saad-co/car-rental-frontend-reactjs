import type { Dashboard } from "../../api/dashboard.queries";
import BarRow from "./BarRow";
import DashboardCard from "./DashboardCard";
import MiniStat from "./MiniStat";

/** Applications by where they stand, and how many drivers are still in onboarding. Archived applications are not counted. */
export default function FunnelCard({
  applications,
}: {
  applications: Dashboard["applications"];
}) {
  const all = Math.max(1, applications.total);
  const rows: { label: string; count: number; bar: string }[] = [
    { label: "Pending", count: applications.pending, bar: "bg-warning-500" },
    { label: "Approved", count: applications.approved, bar: "bg-success-500" },
    { label: "Declined", count: applications.rejected, bar: "bg-error-500" },
    { label: "On hold", count: applications.onHold, bar: "bg-blue-light-500" },
    {
      label: "Onboarding (drivers)",
      count: applications.onboardingDrivers,
      bar: "bg-brand-500",
    },
  ];
  return (
    <DashboardCard
      title="Vetting funnel"
      subtitle="Applications and how they were decided"
      link={{ to: "/admin/applications", label: "Applications" }}
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <MiniStat
          label="Total applications"
          value={String(applications.total)}
        />
        <MiniStat
          label="Approval rate"
          value={`${applications.approvalPercent}%`}
          hint="of those reviewed"
        />
      </div>
      <div className="space-y-3.5">
        {rows.map((row) => (
          <BarRow
            key={row.label}
            label={row.label}
            value={String(row.count)}
            widthPercent={(row.count / all) * 100}
            barClassName={row.bar}
          />
        ))}
      </div>
    </DashboardCard>
  );
}
