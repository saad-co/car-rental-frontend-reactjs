import type { DriverAlias } from "../../api/drivers.queries";
import type { Payment, PaymentSource } from "../../api/payments.queries";

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
