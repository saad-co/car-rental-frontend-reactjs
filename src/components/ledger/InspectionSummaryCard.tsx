import { Link } from "react-router";
import {
  useLatestInspections,
  type Inspection,
} from "../../api/inspections.queries";
import { formatDateTime } from "../../utils";
import AttentionBadge from "../drivers/AttentionBadge";
import { TYPE_LABEL, statusOf } from "../drivers/inspectionLabels";
import Badge from "../ui/badge/Badge";

/** One of the two rows: the latest check-in or check-out, or "Not yet". */
function Row({
  title,
  inspection,
  driverId,
}: {
  title: string;
  inspection: Inspection | null;
  driverId: string;
}) {
  if (!inspection) {
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
        <span className="w-24 text-sm font-medium text-gray-800">{title}</span>
        <span className="text-sm text-gray-500">Not yet</span>
        <Link
          to={`/admin/drivers/${driverId}`}
          className="ml-auto text-sm text-brand-500 hover:underline"
        >
          Send the link
        </Link>
      </li>
    );
  }
  const status = statusOf(inspection);
  const done = ["submitted", "reviewed", "flagged"].includes(inspection.status);
  const photos = inspection.photoCount + inspection.damagePhotoCount;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
      <span className="w-24 text-sm font-medium text-gray-800">{title}</span>
      <Badge size="sm" color={status.color}>
        {status.label}
      </Badge>
      <AttentionBadge inspection={inspection} />
      <span className="text-theme-xs text-gray-500">
        {inspection.vehicle.model} ·{" "}
        {done
          ? `submitted ${formatDateTime(inspection.submittedAt)}`
          : `made ${formatDateTime(inspection.createdAt)}`}{" "}
        · {inspection.photoCount} of {inspection.requiredPhotoCount} photos
        {inspection.damagePhotoCount > 0
          ? `, ${inspection.damagePhotoCount} damage`
          : ""}
      </span>
      {photos > 0 ? (
        <Link
          to={`/admin/inspections/${inspection.id}`}
          className="ml-auto text-sm text-brand-500 hover:underline"
        >
          View
        </Link>
      ) : (
        <Link
          to={`/admin/drivers/${driverId}`}
          className="ml-auto text-sm text-brand-500 hover:underline"
        >
          Open on the driver page
        </Link>
      )}
    </li>
  );
}

/**
 * The summary card on a driver's ledger page (spec p. 11): the latest check-in and check-out of the driver with their status,
 * photo and damage counts and a View link, or "Not yet" with a way to send the link. A red badge shows when an inspection
 * was flagged for damage or has waited more than 24 hours for a review. Nothing here changes data.
 */
export default function InspectionSummaryCard({
  driverId,
}: {
  driverId: string;
}) {
  const latest = useLatestInspections(driverId);
  return (
    <div className="rounded-2xl border border-gray-200 bg-surface px-6 py-4">
      <h2 className="text-base font-semibold text-gray-800">Vehicle photos</h2>
      {latest.isPending ? (
        <p className="mt-2 text-sm text-gray-500">Loading...</p>
      ) : latest.isError ? (
        <p role="alert" className="mt-2 text-sm text-error-600">
          {latest.error.message}
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-gray-100">
          <Row
            title={TYPE_LABEL.check_in}
            inspection={latest.data.checkIn}
            driverId={driverId}
          />
          <Row
            title={TYPE_LABEL.check_out}
            inspection={latest.data.checkOut}
            driverId={driverId}
          />
        </ul>
      )}
    </div>
  );
}
