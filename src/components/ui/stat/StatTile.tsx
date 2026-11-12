import { Link } from "react-router";
import { cn } from "../../../utils";

/** How the tile reads: plain, good (green value), warm (amber value), hot (red value on a red-tinted tile). */
export type StatTone = "none" | "good" | "warm" | "hot";

const VALUE_CLASS: Record<StatTone, string> = {
  none: "text-gray-800",
  good: "text-success-600",
  warm: "text-warning-600",
  hot: "text-error-600",
};

/**
 * One figure on the dashboard: a small label, a big value and an optional hint under it. Same card look as the ledger's
 * aging tiles (`components/ledger/AgingTiles.tsx`): a border, no shadow, and a red tint only when `tone` is `hot`.
 * `value` arrives already formatted (`formatCents(...)`, a count): the tile does no maths. With `to` the whole tile is a link:
 * a path ("/admin/statistics") opens that page, "#id" scrolls to the card with that id on the same page (Fleet revisions
 * section 5: dashboard items are clickable).
 */
export default function StatTile({
  label,
  value,
  hint,
  tone = "none",
  to,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
  /** Makes the tile a link: a path, or "#id" to scroll to a card on the page. */
  to?: string;
}) {
  const className = cn(
    "block min-w-0 rounded-2xl border px-5 py-4",
    tone === "hot"
      ? "border-error-200 bg-error-50"
      : "border-gray-200 bg-surface",
    to && "transition-colors hover:border-brand-300",
  );
  const body = (
    <>
      <p className="truncate text-theme-xs font-medium text-gray-500">
        {label}
      </p>
      <p
        className={cn(
          "num mt-1 truncate text-lg font-semibold",
          VALUE_CLASS[tone],
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-theme-xs text-gray-500">{hint}</p>
      )}
    </>
  );
  if (!to) return <div className={className}>{body}</div>;
  return to.startsWith("#") ? (
    <a href={to} className={className}>
      {body}
    </a>
  ) : (
    <Link to={to} className={className}>
      {body}
    </Link>
  );
}
