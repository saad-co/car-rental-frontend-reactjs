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
