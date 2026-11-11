import type { DailyOperations } from "../../../api/dashboard.queries";
import { formatCents, formatTimeOfDay } from "../../../utils";
import { plural } from "../dashboardFormat";

type Schedule = DailyOperations["dueToday"][number]["schedule"];

/** Rate type in words; a driver with no contract in force has none. */
export function scheduleLabel(schedule: Schedule): string {
  if (schedule === "weekly") return "Weekly";
  if (schedule === "daily") return "Daily";
  return "No contract";
}

/** The rent per period, "$200.00 / week"; a dash without a contract. */
export function rateText(cents: number | null, schedule: Schedule): string {
  if (cents === null) return "—";
  const per =
    schedule === "weekly" ? " / week" : schedule === "daily" ? " / day" : "";
  return `${formatCents(cents)}${per}`;
}

/** The due time as `6:00 PM`; "Not set" when staff have not set one (late when the due day ends). */
export function dueTimeText(time: string | null): string {
  return time ? formatTimeOfDay(time) : "Not set";
}

/** How late: whole days on the Chicago clock with the real hours, or just the hours inside the first day. */
export function lateText(daysLate: number, hoursLate: number): string {
  if (daysLate > 0) return `${plural(daysLate, "day")} (${hoursLate} h)`;
  return hoursLate === 0 ? "Under 1 h" : `${hoursLate} h`;
}

/** Why a driver is on the Should Be Deactivated list, in the client's words. */
export const REASON_LABEL: Record<
  DailyOperations["shouldBeDeactivated"][number]["reasons"][number],
  string
> = {
  daily_late: "Daily payments late (2+)",
  weekly_late: "Weekly payment 2+ days late",
  deposit_unpaid: "Deposit unpaid 7+ days",
};
