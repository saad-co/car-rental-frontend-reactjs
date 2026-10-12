import type { PaymentSource, PaymentStatus } from "../../api/payments.queries";
import type { BadgeColor } from "../ui/badge/Badge";

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

/**
 * Label and badge colour for each payment status. Kept out of the component files: React's fast
 * refresh only works when a .tsx file exports nothing but components.
 */
export const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; color: BadgeColor }
> = {
  unmatched: { label: "Unmatched", color: "warning" },
  reported: { label: "Reported", color: "info" },
  confirmed: { label: "Confirmed", color: "success" },
  rejected: { label: "Rejected", color: "error" },
  discrepancy: { label: "Discrepancy", color: "error" },
};
