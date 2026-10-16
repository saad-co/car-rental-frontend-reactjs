import type { Driver, DriverStatus } from "../../api/drivers.queries";
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

/** The three onboarding steps, in display order, with the field of `Driver["onboarding"]` that holds each date. */
export const ONBOARDING_STEPS = [
  { step: "contract", label: "Contract signed", field: "contractSignedAt" },
  { step: "deposit", label: "Deposit paid", field: "depositPaidAt" },
  { step: "vehicle", label: "Has a vehicle", field: "vehicleAssignedAt" },
] as const;

/** How many of the three onboarding steps are done. */
export function stepsDone(driver: Pick<Driver, "onboarding">): number {
  return ONBOARDING_STEPS.filter((s) => driver.onboarding[s.field] !== null)
    .length;
}
