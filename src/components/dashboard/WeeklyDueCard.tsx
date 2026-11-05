import type { Dashboard } from "../../api/dashboard.queries";
import { formatCents } from "../../utils";
import BarRow from "./BarRow";
import DashboardCard from "./DashboardCard";
import { WEEKDAY_LABEL, plural, weekdayName } from "./dashboardFormat";

/** How the active weekly drivers spread over the week: the weekday their contract falls due on (its start date's weekday). */
export default function WeeklyDueCard({
  days,
  today,
}: {
  days: Dashboard["billing"]["weeklyByDay"];
  today: string;
}) {
  const busiest = Math.max(1, ...days.map((d) => d.drivers));
  const todayName = weekdayName(today);
  return (
    <DashboardCard
      title="Weekly due-day distribution"
      subtitle="Active drivers on a weekly contract, by the day their rent is due"
    >
      <div className="space-y-3.5">
        {days.map((day) => {
          const isToday = WEEKDAY_LABEL[day.weekday] === todayName;
          return (
            <BarRow
              key={day.weekday}
              label={
                isToday
                  ? `${WEEKDAY_LABEL[day.weekday]} (today)`
                  : WEEKDAY_LABEL[day.weekday]
              }
              value={plural(day.drivers, "driver")}
              hint={`Expected ${formatCents(day.expectedCents)}`}
              widthPercent={(day.drivers / busiest) * 100}
              barClassName={isToday ? "bg-brand-500" : "bg-blue-light-500"}
            />
          );
        })}
      </div>
    </DashboardCard>
  );
}
