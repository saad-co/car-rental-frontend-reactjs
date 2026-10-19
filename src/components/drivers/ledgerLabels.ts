import type { LedgerEntry, LedgerRow } from "../../api/ledger.queries";
import { paymentSourceLabel } from "../payments/paymentLabels";
import type { BadgeColor } from "../ui/badge/Badge";

/**
 * The short type shown in the history: a manual entry is a "Charge" or a "Credit" (its reason says what for, D61);
 * the others say what made them.
 */
export function entryTypeLabel(
  entry: Pick<LedgerEntry, "kind" | "direction">,
): string {
  switch (entry.kind) {
    case "adjustment":
      return entry.direction === "debit" ? "Charge" : "Credit";
    case "payment":
      return "Payment";
    case "reversal":
      return "Reversal";
    case "rent":
      return "Rent";
    default:
      return entry.kind;
  }
}

/** The colour of a type's badge on the ledger page. */
export function entryTypeColor(
  entry: Pick<LedgerEntry, "kind" | "direction">,
): BadgeColor {
  switch (entry.kind) {
    case "adjustment":
      return entry.direction === "debit" ? "light" : "success";
    case "payment":
      return "info";
    case "reversal":
      return "warning";
    default:
      return "light";
  }
}

/**
 * Who or what made an entry, in two lines for the "Entered by" column: a payment says how it was paid (and by whom
 * when an admin recorded or moved it), a manual entry says who typed it, the rest are the system's.
 */
export function enteredBy(row: LedgerRow): {
  primary: string;
  secondary: string | null;
} {
  if (row.kind === "payment" && row.paymentSource) {
    return {
      primary: paymentSourceLabel(row.paymentSource, row.paymentManualMethod),
      secondary: row.createdByEmail
        ? `by ${row.createdByEmail}`
        : "Automatically",
    };
  }
  return { primary: row.createdByEmail ?? "System", secondary: null };
}
