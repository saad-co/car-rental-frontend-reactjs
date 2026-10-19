import type { LedgerTypeFilter } from "../../api/ledger.queries";

/** The type filter's choices and their words. */
export const LEDGER_TYPE_LABEL: Record<LedgerTypeFilter, string> = {
  charges: "Charges",
  credits: "Credits",
  payments: "Payments",
  reversals: "Reversals",
};

/**
 * The URL filters of the ledger page, for `useListParams`: the type, and `order=asc` for oldest first. Kept here (a
 * .ts file) rather than in LedgerRegister.tsx: React's fast refresh only works when a .tsx file exports nothing but
 * components.
 */
export const LEDGER_URL_FILTERS = {
  type: Object.keys(LEDGER_TYPE_LABEL),
  order: ["asc"],
};
