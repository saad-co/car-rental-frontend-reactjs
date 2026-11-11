import type { CollectionPeriod } from "../../../api/dashboard.queries";
import { addDays, formatDay } from "../../../utils";

/** The three groupings of the collections list (D93), as the API names them. */
export type CollectionView = "monthly" | "weekly" | "daily";

/** The Monday of the week that holds a Chicago day (`YYYY-MM-DD`). Calendar arithmetic in UTC, so no daylight saving. */
export function mondayOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const sundayFirst = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(day, -((sundayFirst + 6) % 7));
}

/** "Nov 9, 2026 – Nov 15, 2026", from the Monday and Sunday days (formatted from the days, never through a time zone). */
export const weekLabel = (start: string, end: string) =>
  `${formatDay(start)} – ${formatDay(end)}`;

/** The row label of a period: "November 2026", "Nov 9, 2026 – Nov 15, 2026" or "Wed, Nov 11, 2026". */
export function periodLabel(
  view: CollectionView,
  period: CollectionPeriod,
): string {
  const [y, m, d] = period.periodStart.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  if (view === "monthly") {
    return start.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (view === "weekly") return weekLabel(period.periodStart, period.periodEnd);
  return start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
