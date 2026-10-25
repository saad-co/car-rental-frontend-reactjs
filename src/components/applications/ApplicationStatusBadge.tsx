import type { ApplicationStatus } from "../../api/applications.queries";
import ArchivedBadge from "../ui/badge/ArchivedBadge";
import Badge from "../ui/badge/Badge";
import { APPLICATION_STATUS } from "./applicationStatus";

/**
 * An application's status as a coloured badge. Used by the list and the detail page. An archived application (pass its
 * `archivedAt`) shows "Archived" with the status it had, so it is never mistaken for a live one (D80).
 */
export default function ApplicationStatusBadge({
  status,
  archivedAt,
}: {
  status: ApplicationStatus;
  archivedAt?: string | null;
}) {
  const { label, color } = APPLICATION_STATUS[status];
  if (archivedAt) return <ArchivedBadge was={label} />;
  return (
    <Badge size="sm" color={color}>
      {label}
    </Badge>
  );
}
