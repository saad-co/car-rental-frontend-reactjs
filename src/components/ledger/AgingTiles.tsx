import type { LedgerAging } from "../../api/ledger.queries";
import { cn, formatCents } from "../../utils";

type Tone = "none" | "warm" | "hot";

/** One tile: a label and an amount, tinted when money is past due. */
function Tile({
  label,
  cents,
  tone,
}: {
  label: string;
  cents: number;
  tone: Tone;
}) {
  const active = cents > 0 ? tone : "none";
  return (
    <div
      className={cn(
        "rounded-2xl border px-5 py-4",
        active === "hot"
          ? "border-error-200 bg-error-50"
          : "border-gray-200 bg-white",
      )}
    >
      <p className="text-theme-xs font-medium text-gray-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold",
          active === "hot"
            ? "text-error-600"
            : active === "warm"
              ? "text-warning-600"
              : "text-gray-800",
        )}
      >
        {formatCents(cents)}
      </p>
    </div>
  );
}

/**
 * What the driver still owes, by how old the charges are (first in, first out: payments and credits pay off the oldest
 * charges first). The first four tiles add up to what the driver owes; "Total past due" is everything 7 days old or
 * more.
 */
export default function AgingTiles({ aging }: { aging: LedgerAging }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 lg:grid-cols-5"
      aria-label="Amount owed by age"
    >
      <Tile label="Current (0–6 days)" cents={aging.currentCents} tone="none" />
      <Tile label="7–13 days" cents={aging.days7to13Cents} tone="warm" />
      <Tile label="14–29 days" cents={aging.days14to29Cents} tone="warm" />
      <Tile label="30+ days" cents={aging.days30PlusCents} tone="hot" />
      <Tile label="Total past due" cents={aging.pastDueCents} tone="hot" />
    </div>
  );
}
