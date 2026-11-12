import type {
  PaymentManualMethod,
  PaymentSource,
} from "../../api/payments.queries";

/** The methods that have a logo (Fleet revisions section 5: Zelle, Cash App and Venmo, then Stripe at Abulkalam's request, 2026-11-12). */
export type LogoMethod = "zelle" | "cashapp" | "venmo" | "stripe";

/**
 * Which logo a payment source (or a manual payment's method) takes, or null for the methods without one (Chime,
 * cash, check...). A manual payment recorded as Zelle shows the Zelle logo, like one read from an email.
 */
export function logoMethodOf(
  source: PaymentSource,
  manualMethod: PaymentManualMethod | null = null,
): LogoMethod | null {
  if (source === "email_zelle" || source === "plaid_zelle") return "zelle";
  if (source === "email_cashapp") return "cashapp";
  if (source === "email_venmo") return "venmo";
  if (source === "email_stripe") return "stripe";
  if (source === "manual") {
    if (manualMethod === "zelle") return "zelle";
    if (manualMethod === "cash_app") return "cashapp";
    if (manualMethod === "venmo") return "venmo";
    if (manualMethod === "stripe") return "stripe";
  }
  return null;
}
