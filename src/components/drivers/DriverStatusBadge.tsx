import type { Driver } from "../../api/drivers.queries";
import ArchivedBadge from "../ui/badge/ArchivedBadge";
import Badge from "../ui/badge/Badge";
import {
  DRIVER_STATUS,
  ONBOARDING_STEPS,
  stepsDone,
  type OnboardingDates,
} from "./driverStatus";

/**
 * A driver's status as a coloured badge (D56). An onboarding driver also shows how far along they are, e.g.
 * "Onboarding · 2/3". A driver in collections shows "In collections" (D81): they are inactive underneath, and the red
 * badge keeps them from looking like any other inactive driver. Used by the drivers list, the driver page and the
 * assign-payment dialog.
 */
export default function DriverStatusBadge({
  driver,
}: {
  driver: Pick<Driver, "status"> & {
    onboarding: OnboardingDates;
    archivedAt?: string | null;
    sentToCollectionsAt?: string | null;
  };
}) {
  const { label, color } = DRIVER_STATUS[driver.status];
  // An archived driver keeps their status underneath (D80); show that they are archived, and what they were.
  if (driver.archivedAt) return <ArchivedBadge was={label} />;
  if (driver.sentToCollectionsAt) {
    return (
      <Badge size="sm" color="error">
        In collections
      </Badge>
    );
  }
  return (
    <Badge size="sm" color={color}>
      {driver.status === "onboarding"
        ? `${label} · ${stepsDone(driver)}/${ONBOARDING_STEPS.length}`
        : label}
    </Badge>
  );
}
