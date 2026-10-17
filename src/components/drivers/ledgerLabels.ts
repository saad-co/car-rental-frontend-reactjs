import type { LedgerRow } from "../../api/ledger.queries";

/**
 * The short type shown in the history: a manual entry is a "Charge" or a "Credit" (its reason says what for, D61);
 * the others say what made them.
 */
export function entryTypeLabel(row: LedgerRow): string {
  switch (row.kind) {
    case "adjustment":
      return row.direction === "debit" ? "Charge" : "Credit";
    case "payment":
      return "Payment";
    case "reversal":
      return "Reversal";
    case "rent":
      return "Rent";
    default:
      return row.kind;
  }
}
