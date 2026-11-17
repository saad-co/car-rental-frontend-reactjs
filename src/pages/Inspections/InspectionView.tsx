import { useState } from "react";
import { Link, useParams } from "react-router";
import { useDriver } from "../../api/drivers.queries";
import {
  useExportInspection,
  useInspection,
  type InspectionDetail,
  type InspectionPhoto,
} from "../../api/inspections.queries";
import {
  TYPE_LABEL,
  statusOf,
} from "../../components/drivers/inspectionLabels";
import AttentionBadge from "../../components/drivers/AttentionBadge";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import BackLink from "../../components/ui/button/BackLink";
import { formatDateTime } from "../../utils";
import {
  coordinatesLabel,
  fuelLabel,
  mileageLabel,
  photoTitle,
  SHOT_ORDER,
  shotTitle,
} from "./inspectionFormat";
import PhotoViewer from "./PhotoViewer";
import { ActivityPanel, ReviewPanel } from "./ReviewPanels";
import { saveBlob } from "./saveBlob";

/** A label and its value in the header card. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-theme-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-800">{value}</dd>
    </div>
  );
}

/** One thumbnail tile; a click opens the viewer on it. */
function Tile({
  title,
  photo,
  onOpen,
}: {
  title: string;
  photo: InspectionPhoto | undefined;
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {photo ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${title}`}
          className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-300"
        >
          {photo.thumbUrl ? (
            <img
              src={photo.thumbUrl}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full items-center justify-center p-2 text-theme-xs text-gray-500">
              No preview
            </span>
          )}
        </button>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-gray-300 text-theme-xs text-gray-500">
          No photo
        </div>
      )}
      <p className="text-theme-xs text-gray-700">{title}</p>
      {photo?.driverNote && (
        <p className="text-theme-xs text-gray-500">“{photo.driverNote}”</p>
      )}
    </div>
  );
}

/** The inspection once loaded: the header facts, the 19 shots, the damage photos, and the viewer. */
function InspectionBody({ inspection }: { inspection: InspectionDetail }) {
  const driver = useDriver(inspection.driverId);
  const exporter = useExportInspection();
  const [viewing, setViewing] = useState<number | null>(null);

  // The viewer walks the photos in the order shown: the 19 shots that have one, then the damage photos.
  const bySlot = new Map(
    inspection.photos.map((p) => [`${p.shotId}:${p.position}`, p]),
  );
  const shots = SHOT_ORDER.map((id) => ({ id, photo: bySlot.get(`${id}:1`) }));
  const damage = inspection.photos.filter((p) => p.shotId === "DAMAGE");
  const viewable = [
    ...shots.flatMap((s) => (s.photo ? [s.photo] : [])),
    ...damage,
  ];
  const openPhoto = (photo: InspectionPhoto) =>
    setViewing(viewable.findIndex((p) => p.id === photo.id));

  /** Fetches the file and saves it as `<reference>.zip` or `<reference>.pdf`. */
  const download = (kind: "zip" | "pdf") =>
    exporter.mutate(
      { inspectionId: inspection.id, kind },
      {
        onSuccess: (blob) => saveBlob(blob, `${inspection.reference}.${kind}`),
      },
    );
  const hasPhotos = inspection.photoCount + inspection.damagePhotoCount > 0;

  const status = statusOf(inspection);
  const place = coordinatesLabel(inspection.gpsLat, inspection.gpsLng);
  const driverName = driver.data
    ? `${driver.data.firstName} ${driver.data.lastName}`
    : "the driver";

  return (
    <div className="space-y-6">
      <BackLink to={`/admin/drivers/${inspection.driverId}`}>
        Back to {driverName}
      </BackLink>

      <div className="rounded-2xl border border-gray-200 bg-surface p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-800">
            {TYPE_LABEL[inspection.type]} photos
          </h1>
          <Badge size="sm" color={status.color}>
            {status.label}
          </Badge>
          <AttentionBadge inspection={inspection} />
          <span className="text-sm text-gray-500">{inspection.reference}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {hasPhotos && (
              <Button
                size="sm"
                variant="outline"
                disabled={exporter.isPending}
                onClick={() => download("zip")}
              >
                Download all (ZIP)
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={exporter.isPending}
              onClick={() => download("pdf")}
            >
              Report (PDF)
            </Button>
            {inspection.type === "check_out" &&
              inspection.pairedInspectionId && (
                <Link
                  to={`/admin/inspections/${inspection.id}/compare`}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Compare with check-in
                </Link>
              )}
          </div>
        </div>
        {exporter.isPending && (
          <p className="mt-2 text-sm text-gray-500">
            Preparing the file... a ZIP of many photos can take a few seconds.
          </p>
        )}
        {exporter.isError && (
          <p role="alert" className="mt-2 text-sm text-error-600">
            {exporter.error.message}
          </p>
        )}
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Driver" value={driverName} />
          <Fact
            label="Vehicle"
            value={[
              inspection.vehicle.model,
              inspection.vehicle.plate,
              inspection.vehicle.vin ? `VIN ${inspection.vehicle.vin}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <Fact
            label="Submitted"
            value={formatDateTime(inspection.submittedAt)}
          />
          <Fact
            label="Mileage"
            value={mileageLabel(inspection.odometerMiles)}
          />
          <Fact label="Fuel" value={fuelLabel(inspection.fuelLevel)} />
          <Fact
            label="Driver confirmed the photos show the car now"
            value={
              inspection.attestedAt
                ? formatDateTime(inspection.attestedAt)
                : "No"
            }
          />
          <Fact label="Location" value={place ?? "Not shared"} />
          <Fact label="Device" value={inspection.deviceInfo ?? "—"} />
        </dl>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-surface p-6">
        <h2 className="text-base font-semibold text-gray-800">
          The 19 photos ({inspection.photoCount} received)
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shots.map(({ id, photo }) => (
            <Tile
              key={id}
              title={shotTitle(id)}
              photo={photo}
              onOpen={() => photo && openPhoto(photo)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-surface p-6">
        <h2 className="text-base font-semibold text-gray-800">
          Damage photos added by the driver ({damage.length})
        </h2>
        {damage.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            The driver reported no damage.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {damage.map((photo) => (
              <Tile
                key={photo.id}
                title={photoTitle(photo)}
                photo={photo}
                onOpen={() => openPhoto(photo)}
              />
            ))}
          </div>
        )}
      </div>

      <ReviewPanel inspection={inspection} />
      <ActivityPanel inspection={inspection} />

      {viewing !== null && viewable.length > 0 && (
        <PhotoViewer
          photos={viewable}
          index={Math.min(viewing, viewable.length - 1)}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
          place={place}
        />
      )}
    </div>
  );
}

/**
 * `/admin/inspections/:id`: one check-in or check-out as staff see it (Module 3 chat 2). The photos open in a full-screen viewer
 * with zoom and a download of the original; every link to a file is signed for ten minutes and refreshed by the page.
 */
export default function InspectionView() {
  const { id = "" } = useParams();
  const inspection = useInspection(id);

  if (inspection.isPending) {
    return <p className="text-sm text-gray-500">Loading the photos...</p>;
  }
  if (inspection.isError) {
    return (
      <p role="alert" className="text-sm text-error-600">
        {inspection.error.message}
      </p>
    );
  }
  return <InspectionBody inspection={inspection.data} />;
}
