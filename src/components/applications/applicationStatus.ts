import type { ApplicationStatus } from "../../api/applications.queries";
import type { BadgeColor } from "../ui/badge/Badge";

/**
 * Label and badge colour for each application status. Kept out of the component file:
 * React's fast refresh only works when a .tsx file exports nothing but components.
 *
 * `rejected` is shown as "Declined" (B69, client's wording). Only the label changed: the stored value and the API
 * (`rejected`, `POST /applications/:id/reject`) are the same, so no migration was needed.
 */
export const APPLICATION_STATUS: Record<
  ApplicationStatus,
  { label: string; color: BadgeColor }
> = {
  pending: { label: "Pending", color: "warning" },
  on_hold: { label: "On hold", color: "info" },
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Declined", color: "error" },
};
