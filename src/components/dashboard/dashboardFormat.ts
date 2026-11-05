import type { Dashboard } from "../../api/dashboard.queries";

/** `2026-11-05` as "Thursday". Formatted in UTC on purpose: a calendar day has no time zone. */
export function weekdayName(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

/** "1 driver" / "3 drivers". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The weekday key the API uses, as shown on a card. */
export const WEEKDAY_LABEL: Record<
  Dashboard["billing"]["weeklyByDay"][number]["weekday"],
  string
> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};
