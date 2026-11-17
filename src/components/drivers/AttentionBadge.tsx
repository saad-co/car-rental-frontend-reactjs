import type { Inspection } from "../../api/inspections.queries";
import Badge from "../ui/badge/Badge";

/**
 * The red "Needs review" badge (spec p. 11): shown when staff should look at an inspection, either because it was flagged for new
 * damage or because it was submitted more than 24 hours ago and nobody has reviewed it. The API works this out
 * (`needsAttention`); this only draws it. Nothing is drawn for an inspection that needs nothing.
 */
export default function AttentionBadge({
  inspection,
}: {
  inspection: Pick<Inspection, "needsAttention" | "status">;
}) {
  if (!inspection.needsAttention) return null;
  const flagged = inspection.status === "flagged";
  return (
    <span
      title={
        flagged
          ? "New damage was found. Review it."
          : "Submitted more than 24 hours ago and not reviewed yet."
      }
    >
      <Badge size="sm" color="error">
        {flagged ? "Damage flagged" : "Review overdue"}
      </Badge>
    </span>
  );
}
