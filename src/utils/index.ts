import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, told about the theme's own font sizes (`--text-theme-*`, `--text-title-*` in index.css).
 * Without this it cannot tell `text-theme-sm` (a size) from `text-gray-700` (a colour), treats both as colours,
 * and silently drops the size whenever a colour comes after it (found 2026-10-17, B75).
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["theme-xs", "theme-sm", "theme-xl"] },
        { text: ["title-sm", "title-md", "title-lg", "title-xl", "title-2xl"] },
      ],
    },
  },
});

// Joins class names and resolves Tailwind conflicts (e.g. "p-2 p-4" keeps only "p-4").
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

/** The business's time zone (spec: billing runs in Chicago). Every time on screen is shown in it. */
export const BUSINESS_TIME_ZONE = "America/Chicago";

/**
 * Formats an ISO date string from the API in Chicago time, whatever the viewer's own zone, so everyone
 * sees the same time, e.g. "Oct 7, 2026, 3:55 PM". The header says which zone (`chicagoUtcOffset`).
 * Null shows as a dash.
 */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  });
}

/**
 * Chicago's current offset from UTC, e.g. "UTC-5" in summer (CDT) and "UTC-6" in winter (CST).
 * Worked out by the browser for today's date, so daylight saving is always right.
 */
export function chicagoUtcOffset(now = new Date()): string {
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    timeZoneName: "shortOffset",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value; // e.g. "GMT-5"
  return offset ? offset.replace("GMT", "UTC") : "UTC";
}

/**
 * Rough number of SMS a text is split into: 160 characters fit in one; longer texts go in parts of 153 (each part
 * carries a small header). Texts with emoji or some accented letters fit fewer characters per part, so this is a
 * guide, not an exact count.
 */
export function smsParts(text: string): number {
  return text.length <= 160 ? 1 : Math.ceil(text.length / 153);
}

/** Shows a stored US phone (`+13125550123`) as `(312) 555-0123`. Anything else is shown as-is. */
export function formatUsPhone(e164: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164;
}

/**
 * The one money formatter (frontend CLAUDE.md): integer cents from the API as `$1,234.56`.
 * Built from whole numbers (dollars and the remaining cents), so no float ever touches the amount.
 */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.trunc(abs / 100).toLocaleString("en-US");
  const rest = String(abs % 100).padStart(2, "0");
  return `${sign}$${dollars}.${rest}`;
}

/**
 * A ledger balance in words, so nobody has to remember what a minus sign means: credits minus debits, negative =
 * the driver owes. E.g. -12000 → "Owes $120.00", 4000 → "In credit $40.00", 0 → "Settled".
 */
export function formatBalance(cents: number): string {
  if (cents < 0) return `Owes ${formatCents(-cents)}`;
  if (cents > 0) return `In credit ${formatCents(cents)}`;
  return "Settled";
}

/**
 * Reads a dollar amount typed by an admin ("25", "25.5", "$1,250.00") into integer cents, by splitting the text,
 * never through a float. Null when it is not a positive amount with at most 2 decimals.
 */
export function parseDollarsToCents(text: string): number | null {
  const match = /^\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(
    text.trim(),
  );
  if (!match) return null;
  const dollars = Number(match[1].replaceAll(",", ""));
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const total = dollars * 100 + cents;
  return total > 0 && Number.isSafeInteger(total) ? total : null;
}

/** Today's date in Chicago as `YYYY-MM-DD` (the ledger's calendar). */
export function chicagoToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Adds whole days to a `YYYY-MM-DD` day (calendar arithmetic in UTC, so daylight saving cannot skip a day). */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Shows a calendar day (`YYYY-MM-DD`, no time) as e.g. "Oct 17, 2026". Formatted in UTC on purpose: the day has no
 * time zone, and formatting it in the viewer's zone could show the day before.
 */
export function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
}
