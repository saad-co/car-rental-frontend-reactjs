import type { LedgerCategory, LedgerRow } from "../../api/ledger.queries";
import type { SelectGroup } from "../form/Select";

/** How each manual entry category is named on screen. */
export const CATEGORY_LABEL: Record<LedgerCategory, string> = {
  late_fee: "Late fee",
  repair: "Repair (e.g. flat tire)",
  damage: "Damage",
  toll: "Toll",
  ticket: "Ticket",
  cleaning: "Cleaning",
  other_charge: "Other charge",
  discount: "Discount",
  goodwill: "Goodwill credit",
  other_credit: "Other credit",
  opening_balance: "Opening balance",
};

/** The categories as the "Add entry" form offers them: charges first, then credits (D58). */
export const CATEGORY_GROUPS: SelectGroup[] = [
  {
    label: "Charges (driver owes more)",
    options: (
      [
        "late_fee",
        "repair",
        "damage",
        "toll",
        "ticket",
        "cleaning",
        "other_charge",
      ] as const
    ).map((value) => ({ value, label: CATEGORY_LABEL[value] })),
  },
  {
    label: "Credits (driver owes less)",
    options: (["discount", "goodwill", "other_credit"] as const).map(
      (value) => ({ value, label: CATEGORY_LABEL[value] }),
    ),
  },
  {
    label: "Starting point",
    options: [
      { value: "opening_balance", label: CATEGORY_LABEL.opening_balance },
    ],
  },
];

/** True for categories that are always a charge (a debit). */
export function isChargeCategory(category: LedgerCategory): boolean {
  return CATEGORY_GROUPS[0].options.some((o) => o.value === category);
}

/** The short type shown in the history: the category, or what made the entry. */
export function entryTypeLabel(row: LedgerRow): string {
  if (row.category) return CATEGORY_LABEL[row.category];
  switch (row.kind) {
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
