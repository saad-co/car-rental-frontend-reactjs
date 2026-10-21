import type { ContractStatus } from "../../api/contracts.queries";
import type { BadgeColor } from "../ui/badge/Badge";

/**
 * Label and badge colour for each contract status (step 4). Kept out of the component files: React's fast refresh only
 * works when a .tsx file exports nothing but components.
 */
export const CONTRACT_STATUS: Record<
  ContractStatus,
  { label: string; color: BadgeColor }
> = {
  draft: { label: "Draft", color: "light" },
  sent: { label: "Sent", color: "info" },
  viewed: { label: "Opened", color: "info" },
  signed: { label: "Signed", color: "success" },
  declined: { label: "Declined", color: "error" },
  expired: { label: "Expired", color: "warning" },
  cancelled: { label: "Cancelled", color: "light" },
};

/** The same look as the "View ledger" button, for a link that opens a file. */
export const FILE_LINK_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50";
