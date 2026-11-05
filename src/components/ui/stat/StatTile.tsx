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
 * `value` arrives already formatted (`formatCents(...)`, a count): the tile does no maths.
 */
export default function StatTile({
  label,
  value,
  hint,
  tone = "none",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border px-5 py-4",
        tone === "hot"
          ? "border-error-200 bg-error-50"
          : "border-gray-200 bg-surface",
      )}
    >
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
    </div>
  );
}
