import { useState } from "react";
import type { DailyOperations } from "../../../api/dashboard.queries";
import { ChevronLeftIcon } from "../../../icons";
import { cn, formatCents, formatDay } from "../../../utils";
import Button from "../../ui/button/Button";
import DashboardCard from "../DashboardCard";
import { plural } from "../dashboardFormat";

type Week = DailyOperations["weeks"][number];

/** "Nov 9 - Nov 15, 2026" from the Monday and Sunday days; formatted from the days, never through a time zone. */
const weekLabel = (week: Week) =>
  `${formatDay(week.weekStart)} to ${formatDay(week.weekEnd)}`;

/**
 * The weekly total collected (D5): this week's confirmed payments, Monday to Sunday (Chicago days), with arrows to page back
 * through the earlier weeks and a list of every week the server sent. `weeks` is newest first, so index 0 is this week.
 * The browser only picks a week: every figure comes from the server.
 */
export default function WeeklyTotalCard({ weeks }: { weeks: Week[] }) {
  const [index, setIndex] = useState(0);
  const week = weeks[index];

  return (
    <DashboardCard
      title="Weekly total collected"
      subtitle="Confirmed payments, Monday to Sunday (Chicago)"
      link={{ to: "/admin/payments", label: "Payments" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={index >= weeks.length - 1}
          onClick={() => setIndex(index + 1)}
          startIcon={<ChevronLeftIcon className="size-4" />}
        >
          Older week
        </Button>
        <div className="text-center">
          <p className="text-theme-sm font-medium text-gray-800">
            {index === 0 ? "This week" : weekLabel(week)}
          </p>
          {index === 0 && (
            <p className="text-theme-xs text-gray-500">{weekLabel(week)}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
          endIcon={<ChevronLeftIcon className="size-4 rotate-180" />}
        >
          Newer week
        </Button>
      </div>

      <p className="num mt-4 text-center text-title-md font-semibold text-gray-900">
        {formatCents(week.totalCents)}
      </p>
      <p className="mt-1 text-center text-theme-xs text-gray-500">
        {plural(week.paymentCount, "payment")}
      </p>

      <ul className="mt-5 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
        {weeks.map((item, i) => (
          <li key={item.weekStart}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-theme-sm hover:bg-gray-100",
                i === index && "bg-brand-25 font-medium",
              )}
            >
              <span className="text-gray-700">
                {i === 0 ? "This week" : weekLabel(item)}
              </span>
              <span className="num text-gray-800">
                {formatCents(item.totalCents)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
