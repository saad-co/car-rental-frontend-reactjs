import type {
  Driver,
  DriverStatus,
  LeftReason,
} from "../../api/drivers.queries";
import type { BadgeColor } from "../ui/badge/Badge";

/**
 * Label and badge colour for each driver status (D56). Kept out of the component files: React's fast refresh only
 * works when a .tsx file exports nothing but components.
 */
export const DRIVER_STATUS: Record<
  DriverStatus,
  { label: string; color: BadgeColor }
> = {
  onboarding: { label: "Onboarding", color: "warning" },
  active: { label: "Active", color: "success" },
  inactive: { label: "Inactive", color: "light" },
};

/** Just the labels, for the Status filter. */
export const DRIVER_STATUS_LABEL = Object.fromEntries(
  Object.entries(DRIVER_STATUS).map(([status, { label }]) => [status, label]),
) as Record<DriverStatus, string>;

/** The client's three answers to "how did they leave?" (D81), in the order they are offered. */
export const LEFT_REASON_LABEL: Record<LeftReason, string> = {
  contract_ended: "Contract ended",
  bad_driver: "Bad driver",
  cooperative_returned_car: "Cooperative, returned the car properly",
};

/** The reason in words; drivers deactivated before reasons existed have none ("Reason not recorded"). */
export function leftReasonText(reason: LeftReason | null): string {
  return reason ? LEFT_REASON_LABEL[reason] : "Reason not recorded";
}

/** The three onboarding steps, in display order, with the field of `Driver["onboarding"]` that holds each date. */
export const ONBOARDING_STEPS = [
  { step: "contract", label: "Contract signed", field: "contractSignedAt" },
  { step: "deposit", label: "Deposit paid", field: "depositPaidAt" },
  { step: "vehicle", label: "Has a vehicle", field: "vehicleAssignedAt" },
] as const;

/** The three step dates of a driver; some DTOs carry only these (the Approved applications page), not the deposit amount. */
export type OnboardingDates = Pick<
  Driver["onboarding"],
  "contractSignedAt" | "depositPaidAt" | "vehicleAssignedAt"
>;

/** How many of the three onboarding steps are done. */
export function stepsDone(driver: { onboarding: OnboardingDates }): number {
  return ONBOARDING_STEPS.filter((s) => driver.onboarding[s.field] !== null)
    .length;
}
