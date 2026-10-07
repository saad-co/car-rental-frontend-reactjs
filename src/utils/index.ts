import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Joins class names and resolves Tailwind conflicts (e.g. "p-2 p-4" keeps only "p-4").
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

/**
 * Formats an ISO date string from the API for display, in the viewer's time zone and locale,
 * e.g. "Oct 7, 2026, 3:55 PM". Null shows as a dash.
 */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Shows a stored US phone (`+13125550123`) as `(312) 555-0123`. Anything else is shown as-is. */
export function formatUsPhone(e164: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164;
}
