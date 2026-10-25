import type { Driver } from "../../api/drivers.queries";
import ArchivedBadge from "../ui/badge/ArchivedBadge";
import Badge from "../ui/badge/Badge";
import { DRIVER_STATUS, ONBOARDING_STEPS, stepsDone } from "./driverStatus";

/**
 * A driver's status as a coloured badge (D56). An onboarding driver also shows how far along they are, e.g.
 * "Onboarding · 2/3". Used by the drivers list, the driver page and the assign-payment dialog.
 */
export default function DriverStatusBadge({
  driver,
}: {
  driver: Pick<Driver, "status" | "onboarding"> & {
    archivedAt?: string | null;
  };
}) {
  const { label, color } = DRIVER_STATUS[driver.status];
  // An archived driver keeps their status underneath (D80); show that they are archived, and what they were.
  if (driver.archivedAt) return <ArchivedBadge was={label} />;
  return (
    <Badge size="sm" color={color}>
      {driver.status === "onboarding"
        ? `${label} · ${stepsDone(driver)}/${ONBOARDING_STEPS.length}`
        : label}
    </Badge>
  );
}
