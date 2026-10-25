import type { Driver } from "../../api/drivers.queries";
import type { LedgerAging } from "../../api/ledger.queries";
import { cn, formatCents } from "../../utils";

type Tone = "none" | "warm" | "hot";

/** One tile: a label and a value, tinted when money is past due. `cents` shows as dollars; `text` is shown as it is. */
function Tile({
  label,
  cents,
  text,
  tone,
}: {
  label: string;
  cents?: number;
  text?: string;
  tone: Tone;
}) {
  const active = cents !== undefined && cents > 0 ? tone : "none";
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
              : text !== undefined
                ? "text-gray-500"
                : "text-gray-800",
        )}
      >
        {text ?? formatCents(cents ?? 0)}
      </p>
    </div>
  );
}

/**
 * What the driver still owes, by how old the charges are (first in, first out: payments and credits pay off the oldest
 * charges first). The first four tiles add up to what the driver owes; "Total past due" is everything 7 days old or
 * more. The last tile is the deposit amount paid (D82), for the later refund: the amount typed when the Deposit paid
 * step was ticked, not a ledger total. It is not part of what is owed.
 */
export default function AgingTiles({
  aging,
  deposit,
}: {
  aging: LedgerAging;
  /** The driver's deposit step: its date and the amount typed with it. Leave out for no deposit tile (the printed statement). */
  deposit?: Pick<Driver["onboarding"], "depositPaidAt" | "depositPaidCents">;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4",
        deposit ? "lg:grid-cols-6" : "lg:grid-cols-5",
      )}
      aria-label="Amount owed by age and deposit paid"
    >
      <Tile label="Current (0–6 days)" cents={aging.currentCents} tone="none" />
      <Tile label="7–13 days" cents={aging.days7to13Cents} tone="warm" />
      <Tile label="14–29 days" cents={aging.days14to29Cents} tone="warm" />
      <Tile label="30+ days" cents={aging.days30PlusCents} tone="hot" />
      <Tile label="Total past due" cents={aging.pastDueCents} tone="hot" />
      {deposit &&
        (deposit.depositPaidCents !== null ? (
          <Tile
            label="Deposit paid"
            cents={deposit.depositPaidCents}
            tone="none"
          />
        ) : (
          <Tile
            label="Deposit paid"
            text={deposit.depositPaidAt ? "Not recorded" : "Not paid"}
            tone="none"
          />
        ))}
    </div>
  );
}
