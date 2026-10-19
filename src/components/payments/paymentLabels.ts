import type { DriverAlias } from "../../api/drivers.queries";
import type {
  Payment,
  PaymentManualMethod,
  PaymentSource,
} from "../../api/payments.queries";

/** How each payment source is shown. */
export const PAYMENT_SOURCE_LABEL: Record<PaymentSource, string> = {
  email_zelle: "Zelle",
  email_cashapp: "Cash App",
  email_venmo: "Venmo",
  email_stripe: "Stripe",
  email_chime: "Chime",
  plaid_zelle: "Zelle (bank)",
  manual: "Manual",
};

/** How a payment recorded by hand was paid. */
export const MANUAL_METHOD_LABEL: Record<PaymentManualMethod, string> = {
  zelle: "Zelle",
  cash_app: "Cash App",
  venmo: "Venmo",
  stripe: "Stripe",
  chime: "Chime",
  cash: "Cash",
  check: "Check",
  card: "Card (in office)",
  money_order: "Money order",
  other: "Other",
};

/**
 * The methods the "New ledger entry" form offers: the client's six in their order, plus Other for anything unusual
 * (Abulkalam, 2026-10-19). The API still accepts the older values (Venmo, Chime, Money order), so a payment saved with
 * one of them still displays correctly; they are only not offered in the form.
 */
export const MANUAL_METHODS: PaymentManualMethod[] = [
  "stripe",
  "zelle",
  "cash_app",
  "cash",
  "card",
  "check",
  "other",
];

/** The methods whose payments normally arrive by email and are credited by themselves (so recording one by hand may double-credit). */
export const EMAIL_METHODS: PaymentManualMethod[] = [
  "zelle",
  "cash_app",
  "venmo",
  "stripe",
  "chime",
];

/** A payment's source for a table cell: "Zelle", or "Manual · Cash" for a payment an admin recorded. */
export function paymentSourceLabel(
  source: PaymentSource,
  manualMethod: PaymentManualMethod | null,
): string {
  if (source === "manual" && manualMethod) {
    return `${PAYMENT_SOURCE_LABEL[source]} · ${MANUAL_METHOD_LABEL[manualMethod]}`;
  }
  return PAYMENT_SOURCE_LABEL[source];
}

/** How a payment was assigned, as shown next to the driver. */
export const MATCH_METHOD_LABEL: Record<
  NonNullable<Payment["matchMethod"]>,
  string
> = {
  alias: "Alias",
  name: "Exact name",
  ai: "AI",
  manual: "Manual",
};

/** How each alias type is shown on a driver (the payment method it belongs to). */
export const ALIAS_TYPE_LABEL: Record<DriverAlias["type"], string> = {
  zelle: "Zelle",
  cashapp: "Cash App",
  venmo: "Venmo",
  chime: "Chime",
  stripe: "Stripe",
  email: "Email",
  phone: "Phone",
};

/** Where an alias came from, shown when hovering a chip. */
export const ALIAS_SOURCE_LABEL: Record<DriverAlias["source"], string> = {
  legacy: "Imported from the old system",
  ai_match: "Learned from a confident AI match",
  manual: "Added by an admin",
};
