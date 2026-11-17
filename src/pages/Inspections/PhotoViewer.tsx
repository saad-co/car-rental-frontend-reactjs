import { useEffect, useState } from "react";
import type { InspectionPhoto } from "../../api/inspections.queries";
import { formatDateTime } from "../../utils";
import { photoTitle, shortHash } from "./inspectionFormat";

interface Props {
  photos: InspectionPhoto[];
  /** Which of `photos` is showing. */
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  /** Where the phone was when the driver submitted, as text; null when it was not shared. */
  place: string | null;
  /** A line under each photo's title, in the same order as `photos` (e.g. "Check-in" and "Check-out"). */
  captions?: string[];
}

const ZOOM_STEPS = [1, 1.5, 2, 3, 4];

/**
 * The full-screen photo viewer: the photo, zoom (the buttons, or a click to jump in and out), Previous / Next (also the arrow
 * keys), Escape to close, and the facts of the photo: when the phone says it was taken, when our server received it, the driver's
 * note, how many times it was retaken, its fingerprint and where the phone was. "Download original" saves the full file.
 * The links come from the page (signed, ten minutes) and are never kept here.
 */
export default function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  place,
  captions,
}: Props) {
  const [zoomStep, setZoomStep] = useState(0);
  const photo = photos[index];
  const zoom = ZOOM_STEPS[zoomStep];

  const go = (next: number) => {
    if (next < 0 || next >= photos.length) return;
    setZoomStep(0);
    onIndex(next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && index > 0) {
        setZoomStep(0);
        onIndex(index - 1);
      }
      if (event.key === "ArrowRight" && index < photos.length - 1) {
        setZoomStep(0);
        onIndex(index + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onIndex, onClose]);

  const buttonClass =
    "rounded-lg bg-white/10 px-3 py-2 text-sm text-white ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-40";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photoTitle(photo)}
      className="fixed inset-0 z-99999 flex flex-col bg-black/95"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-white">
        <div>
          <p className="text-base font-semibold">{photoTitle(photo)}</p>
          <p className="text-xs text-white/70">
            {captions?.[index] ? `${captions[index]} · ` : ""}
            {index + 1} of {photos.length}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={buttonClass}
            disabled={zoomStep === 0}
            onClick={() => setZoomStep((s) => Math.max(0, s - 1))}
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="w-12 text-center text-xs text-white/70">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className={buttonClass}
            disabled={zoomStep === ZOOM_STEPS.length - 1}
            onClick={() =>
              setZoomStep((s) => Math.min(ZOOM_STEPS.length - 1, s + 1))
            }
            aria-label="Zoom in"
          >
            +
          </button>
          {photo.downloadUrl && (
            <a href={photo.downloadUrl} className={buttonClass} download>
              Download original
            </a>
          )}
          <button type="button" className={buttonClass} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        {photo.fullUrl ? (
          <img
            src={photo.fullUrl}
            alt={photoTitle(photo)}
            data-testid="viewer-image"
            onClick={() => setZoomStep((s) => (s === 0 ? 2 : 0))}
            className={
              zoom === 1
                ? "mx-auto max-h-full max-w-full cursor-zoom-in object-contain"
                : "max-w-none cursor-zoom-out"
            }
            style={zoom === 1 ? undefined : { width: `${zoom * 100}%` }}
          />
        ) : (
          <p className="p-6 text-sm text-white/70">
            The photo files are not available here (no storage is set up).
          </p>
        )}
        <button
          type="button"
          aria-label="Previous photo"
          disabled={index === 0}
          onClick={() => go(index - 1)}
          className="fixed left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-4 text-xl text-white ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next photo"
          disabled={index === photos.length - 1}
          onClick={() => go(index + 1)}
          className="fixed right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-4 text-xl text-white ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <dl className="grid gap-x-6 gap-y-1 px-4 py-3 text-xs text-white/80 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="inline text-white/50">Taken (phone clock): </dt>
          <dd className="inline">
            {photo.capturedAt ? formatDateTime(photo.capturedAt) : "not sent"}
          </dd>
        </div>
        <div>
          <dt className="inline text-white/50">Received by our server: </dt>
          <dd className="inline">{formatDateTime(photo.uploadedAt)}</dd>
        </div>
        <div>
          <dt className="inline text-white/50">Retaken: </dt>
          <dd className="inline">
            {photo.retakeCount === 0 ? "no" : `${photo.retakeCount} time(s)`}
          </dd>
        </div>
        <div>
          <dt className="inline text-white/50">Location: </dt>
          <dd className="inline">{place ?? "not shared"}</dd>
        </div>
        <div>
          <dt className="inline text-white/50">Fingerprint (SHA-256): </dt>
          <dd className="inline font-mono">{shortHash(photo.sha256)}…</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="inline text-white/50">Driver's note: </dt>
          <dd className="inline">{photo.driverNote || "none"}</dd>
        </div>
      </dl>
    </div>
  );
}
