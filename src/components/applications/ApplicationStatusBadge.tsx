import type { ApplicationStatus } from "../../api/applications.queries";
import Badge from "../ui/badge/Badge";
import { APPLICATION_STATUS } from "./applicationStatus";

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
