import type { DailyOperations } from "../../../api/dashboard.queries";
import Badge from "../../ui/badge/Badge";

/** The driver's name with a small "On plan" badge when staff marked them On Payment Plan. */
export function DriverName({
  name,
  onPaymentPlan,
}: {
  name: string;
  onPaymentPlan: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-medium text-gray-800">{name}</span>
      {onPaymentPlan && (
        <Badge size="sm" color="info">
          On plan
        </Badge>
      )}
    </span>
  );
}

/** Paid / Not yet paid / Late as a coloured badge. */
export function DueStatusBadge({
  status,
}: {
  status: DailyOperations["dueToday"][number]["status"];
}) {
  if (status === "paid") {
    return (
      <Badge size="sm" color="success">
        Paid
      </Badge>
    );
  }
  if (status === "late") {
    return (
      <Badge size="sm" color="error">
        Late
      </Badge>
    );
  }
  return (
    <Badge size="sm" color="warning">
      Not yet paid
    </Badge>
  );
}
