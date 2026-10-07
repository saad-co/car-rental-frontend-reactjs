import type { ApplicationStatus } from "../../api/applications.queries";
import type { BadgeColor } from "../ui/badge/Badge";

/**
 * Label and badge colour for each application status. Kept out of the component file:
 * React's fast refresh only works when a .tsx file exports nothing but components.
 */
export const APPLICATION_STATUS: Record<
  ApplicationStatus,
  { label: string; color: BadgeColor }
> = {
  pending: { label: "Pending", color: "warning" },
  on_hold: { label: "On hold", color: "info" },
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Rejected", color: "error" },
};
