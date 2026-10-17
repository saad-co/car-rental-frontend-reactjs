import { cn, formatBalance } from "../../utils";

/**
 * A ledger balance in words, coloured: red "Owes $X", green "In credit $X", grey "Settled". Used on the driver page
 * and the drivers list so a balance reads the same everywhere.
 */
export default function BalanceText({
  cents,
  className,
}: {
  cents: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        cents < 0
          ? "text-error-600"
          : cents > 0
            ? "text-success-600"
            : "text-gray-500",
        className,
      )}
    >
      {formatBalance(cents)}
    </span>
  );
}
