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
