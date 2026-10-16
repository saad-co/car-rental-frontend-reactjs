import { useState } from "react";
import {
  useAddApplicationNote,
  useApplicationNotes,
  useDeleteApplicationNote,
  type ApplicationNote,
} from "../../api/applications.queries";
import { useAuth } from "../../context/AuthContext";
import { TrashBinIcon } from "../../icons";
import { formatDateTime } from "../../utils";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import ConfirmDialog from "../ui/modal/ConfirmDialog";

/** Longest note (the API and the database refuse more). */
const MAX_NOTE_LENGTH = 2000;

/**
 * "Internal notes" card on the application page (B74, D57): staff-only notes such as "insufficient earnings" or
 * "too far from the service area". Never sent to the applicant. Newest first; older ones load on demand. Notes are
 * never edited; you can delete only your own.
 */
export default function ApplicationNotesCard({
  applicationId,
}: {
  applicationId: string;
}) {
  const { user } = useAuth();
  const notes = useApplicationNotes(applicationId);
  const add = useAddApplicationNote(applicationId);
  const remove = useDeleteApplicationNote(applicationId);

  /** What is typed in the box, not saved yet. */
  const [draft, setDraft] = useState("");
  /** The note the "Delete?" dialog is asking about; null when it is closed. */
  const [toDelete, setToDelete] = useState<ApplicationNote | null>(null);

  const items = notes.data?.pages.flatMap((page) => page.items) ?? [];
  const total = notes.data?.pages[0]?.total ?? 0;
  const canSave = draft.trim().length > 0 && !add.isPending;

  const save = () => {
    remove.reset();
    add.mutate(draft, { onSuccess: () => setDraft("") });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-base font-semibold text-gray-800">Internal notes</h2>
      <p className="mt-1 mb-4 text-theme-xs text-gray-500">
        Staff only. Never sent to the applicant.
      </p>

      <TextArea
        ariaLabel="New internal note"
        placeholder="e.g. Insufficient earnings, too far from the service area..."
        rows={3}
        value={draft}
        onChange={setDraft}
        maxLength={MAX_NOTE_LENGTH}
        disabled={add.isPending}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-theme-xs text-gray-400">
          {draft.length > MAX_NOTE_LENGTH - 200 &&
            `${draft.length} / ${MAX_NOTE_LENGTH}`}
        </span>
        <Button size="sm" disabled={!canSave} onClick={save}>
          {add.isPending ? "Saving..." : "Add note"}
        </Button>
      </div>

      {(add.error ?? remove.error) && (
        <p role="alert" className="mt-3 text-sm text-error-600">
          {(add.error ?? remove.error)!.message}
        </p>
      )}

      <div className="mt-6">
        {notes.isPending ? (
          <p className="text-sm text-gray-500">Loading notes...</p>
        ) : notes.isError ? (
          <p role="alert" className="text-sm text-error-600">
            {notes.error.message}
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">No notes yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {items.map((note) => (
              <li key={note.id} className="flex gap-3 py-3">
                <div className="min-w-0 flex-1">
                  {/* whitespace-pre-line keeps the line breaks the admin typed. */}
                  <p className="text-sm whitespace-pre-line wrap-break-word text-gray-800">
                    {note.body}
                  </p>
                  <p className="mt-1 text-theme-xs text-gray-500">
                    {note.authorEmail ?? "Former admin"} ·{" "}
                    {formatDateTime(note.createdAt)}
                  </p>
                </div>
                {user && note.authorId === user.id && (
                  <button
                    type="button"
                    aria-label="Delete this note"
                    title="Delete"
                    disabled={remove.isPending}
                    onClick={() => setToDelete(note)}
                    className="h-fit text-gray-500 hover:text-error-500 disabled:opacity-50"
                  >
                    <TrashBinIcon />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {notes.hasNextPage && (
          <button
            type="button"
            onClick={() => void notes.fetchNextPage()}
            disabled={notes.isFetchingNextPage}
            className="mt-3 text-sm font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50"
          >
            {notes.isFetchingNextPage
              ? "Loading..."
              : `Show older notes (${total - items.length} more)`}
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={toDelete !== null}
        title="Delete this note?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const note = toDelete;
          setToDelete(null);
          add.reset();
          if (note) remove.mutate(note.id);
        }}
      >
        The note is removed for good. This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
