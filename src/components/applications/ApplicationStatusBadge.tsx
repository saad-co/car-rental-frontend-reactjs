import type { ApplicationStatus } from "../../api/applications.queries";
import Badge, { type BadgeColor } from "../ui/badge/Badge";

/** Label and colour for each application status. */
export const APPLICATION_STATUS: Record<
  ApplicationStatus,
  { label: string; color: BadgeColor }
> = {
  pending: { label: "Pending", color: "warning" },
  on_hold: { label: "On hold", color: "info" },
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Rejected", color: "error" },
};

/** An application's status as a coloured badge. Used by the list and the detail page. */
export default function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  const { label, color } = APPLICATION_STATUS[status];
  return (
    <Badge size="sm" color={color}>
      {label}
    </Badge>
  );
}
