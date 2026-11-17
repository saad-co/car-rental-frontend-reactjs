import type { Inspection, InspectionType } from "../../api/inspections.queries";
import type { BadgeColor } from "../ui/badge/Badge";

export const TYPE_LABEL: Record<InspectionType, string> = {
  check_in: "Check-in",
  check_out: "Check-out",
};

/** The status as words and a colour. `expired` is worked out by the API from the link time. */
export function statusOf(inspection: Inspection): {
  label: string;
  color: BadgeColor;
} {
  switch (inspection.status) {
    case "created":
      return { label: "No link yet", color: "light" };
    case "link_sent":
      return {
        label: inspection.linkSentAt ? "Link sent" : "Link made (not texted)",
        color: "info",
      };
    case "opened":
      return { label: "Opened", color: "info" };
    case "in_progress":
      return { label: "In progress", color: "warning" };
    case "submitted":
      return { label: "Submitted", color: "success" };
    case "reviewed":
      return { label: "Reviewed", color: "success" };
    case "flagged":
      return { label: "Flagged", color: "error" };
    case "revoked":
      return { label: "Revoked", color: "light" };
    case "expired":
      return { label: "Link expired", color: "error" };
  }
}

/** True while the driver can still use (or be given) a link: not submitted, reviewed, flagged or revoked. */
export const isOpen = (inspection: Inspection) =>
  ["created", "link_sent", "opened", "in_progress", "expired"].includes(
    inspection.status,
  );
