import { useState } from "react";
import {
  useAddInspectionNote,
  useReviewInspection,
  type InspectionDetail,
} from "../../api/inspections.queries";
import TextArea from "../../components/form/input/TextArea";
import Button from "../../components/ui/button/Button";
import { formatDateTime } from "../../utils";
import { eventLabel } from "./inspectionFormat";

/** The longest review or staff note the API keeps. */
const MAX_NOTE = 500;

/**
 * The review of a submitted inspection: "Mark reviewed" with an optional note, or, once done, who reviewed it and when. Only a
 * submitted or flagged inspection can be reviewed; an unfinished one shows nothing here.
 */
export function ReviewPanel({ inspection }: { inspection: InspectionDetail }) {
  const review = useReviewInspection(inspection.id, inspection.driverId);
  const [note, setNote] = useState("");

  if (inspection.status === "reviewed") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-surface p-6">
        <h2 className="text-base font-semibold text-gray-800">Review</h2>
        <p className="mt-2 text-sm text-gray-700">
          Reviewed by {inspection.reviewedByEmail ?? "an admin"} on{" "}
          {formatDateTime(inspection.reviewedAt)}.
        </p>
        {inspection.reviewNote && (
          <p className="mt-1 text-sm text-gray-500">
            “{inspection.reviewNote}”
          </p>
        )}
      </div>
    );
  }
  if (inspection.status !== "submitted" && inspection.status !== "flagged") {
    return null;
  }
  return (
    <div className="rounded-2xl border border-gray-200 bg-surface p-6">
      <h2 className="text-base font-semibold text-gray-800">Review</h2>
      <p className="mt-1 text-sm text-gray-500">
        Look through the photos, then mark the inspection reviewed. A note is
        optional.
      </p>
      <div className="mt-3">
        <TextArea
          ariaLabel="Review note"
          placeholder="Optional note, e.g. no new damage"
          rows={2}
          maxLength={MAX_NOTE}
          value={note}
          onChange={setNote}
        />
      </div>
      {review.isError && (
        <p role="alert" className="mt-2 text-sm text-error-600">
          {review.error.message}
        </p>
      )}
      <div className="mt-3">
        <Button
          size="sm"
          disabled={review.isPending}
          onClick={() => review.mutate(note)}
        >
          {review.isPending ? "Saving..." : "Mark reviewed"}
        </Button>
      </div>
    </div>
  );
}

/**
 * The activity log, oldest first, with a box for a staff note. The driver's photo uploads are many lines (one per photo), so they
 * start hidden behind a switch; everything else (link sent, opened, submitted, review, notes) is always shown.
 */
export function ActivityPanel({
  inspection,
}: {
  inspection: InspectionDetail;
}) {
  const addNote = useAddInspectionNote(inspection.id, inspection.driverId);
  const [text, setText] = useState("");
  const [showUploads, setShowUploads] = useState(false);

  const uploads = inspection.events.filter((e) => e.type === "photo_uploaded");
  const lines = showUploads
    ? inspection.events
    : inspection.events.filter((e) => e.type !== "photo_uploaded");

  const save = () => {
    const trimmed = text.trim();
    if (trimmed === "") return;
    addNote.mutate(trimmed, { onSuccess: () => setText("") });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-surface p-6">
      <h2 className="text-base font-semibold text-gray-800">
        Notes and activity
      </h2>
      <div className="mt-3">
        <TextArea
          ariaLabel="New staff note"
          placeholder="Add a staff note (only staff see it)"
          rows={2}
          maxLength={MAX_NOTE}
          value={text}
          onChange={setText}
        />
      </div>
      {addNote.isError && (
        <p role="alert" className="mt-2 text-sm text-error-600">
          {addNote.error.message}
        </p>
      )}
      <div className="mt-3">
        <Button
          size="sm"
          variant="outline"
          disabled={addNote.isPending || text.trim() === ""}
          onClick={save}
        >
          {addNote.isPending ? "Saving..." : "Add note"}
        </Button>
      </div>

      <ul className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
        {lines.map((event) => (
          <li key={event.id} className="flex flex-wrap gap-x-3 py-2 text-sm">
            <span className="w-40 shrink-0 text-theme-xs text-gray-500">
              {formatDateTime(event.createdAt)}
            </span>
            <span
              className={
                event.type === "staff_note" ? "text-gray-800" : "text-gray-700"
              }
            >
              {event.type === "staff_note" && (
                <span className="mr-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-theme-xs text-gray-600">
                  Note
                </span>
              )}
              {eventLabel(event)}
            </span>
            <span className="ml-auto text-theme-xs text-gray-500">
              {event.actorEmail ?? "driver / system"}
            </span>
          </li>
        ))}
      </ul>
      {uploads.length > 0 && (
        <button
          type="button"
          className="mt-3 text-sm text-brand-500 hover:underline"
          onClick={() => setShowUploads((v) => !v)}
        >
          {showUploads
            ? "Hide photo uploads"
            : `Show ${uploads.length} photo uploads`}
        </button>
      )}
    </div>
  );
}
