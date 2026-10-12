import type {
  InboundEmailProvider,
  InboundEmailStatus,
} from "../../api/inbound-emails.queries";
import type { BadgeColor } from "../ui/badge/Badge";

/** How each provider is shown. */
export const EMAIL_PROVIDER_LABEL: Record<InboundEmailProvider, string> = {
  zelle_chase: "Zelle",
  cashapp: "Cash App",
  venmo: "Venmo",
  stripe: "Stripe",
  chime: "Chime",
  unknown: "Unknown sender",
};

/**
 * Label and badge colour for each outcome, worded for the admin. Kept out of the component files:
 * React's fast refresh only works when a .tsx file exports nothing but components.
 */
export const EMAIL_STATUS: Record<
  InboundEmailStatus,
  { label: string; color: BadgeColor }
> = {
  processed: { label: "Payment", color: "success" },
  not_payment: { label: "Not a payment", color: "light" },
  duplicate_payment: { label: "Duplicate", color: "info" },
  extraction_failed: { label: "Could not read", color: "warning" },
  rejected_unverified: { label: "Rejected (not genuine)", color: "error" },
};
