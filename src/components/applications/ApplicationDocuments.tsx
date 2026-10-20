import { useRef, useState } from "react";
import {
  useApplicationDocuments,
  useUploadApplicationDocument,
  type ApplicationDocument,
  type ApplicationDocumentKind,
} from "../../api/applications.queries";
import { FILE_ACCEPT, fileProblem } from "../../pages/Applications/websiteForm";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import { formatBytes } from "../sms/formatBytes";

/** The three slots, in the order they are shown (the same as the website's form). */
const KINDS: ApplicationDocumentKind[] = ["license", "rating", "earnings"];

const KIND_LABEL: Record<ApplicationDocumentKind, string> = {
  license: "Driver's licence",
  rating: "Rating screenshot",
  earnings: "Earnings screenshot",
};

/** What a document tile says when its file cannot be opened (yet). */
function unavailableNote(
  document: ApplicationDocument,
  connected: boolean,
): string {
  if (document.status === "failed")
    return document.error ?? "Could not be copied.";
  return connected
    ? "Copying…"
    : "Not copied yet: the connection to the website's documents is not set up.";
}

function DocumentTile({
  kind,
  document,
  connected,
  busy,
  onPick,
}: {
  kind: ApplicationDocumentKind;
  /** Null: nothing in this slot yet. */
  document: ApplicationDocument | null;
  connected: boolean;
  busy: boolean;
  /** Called with the file the admin chose for this slot. */
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const openable = document?.status === "stored" && document.url !== null;
  const isImage = document?.contentType?.startsWith("image/") ?? false;
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-theme-xs font-medium text-gray-700">
          {KIND_LABEL[kind]}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="text-theme-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50"
        >
          {busy ? "Uploading…" : document ? "Replace" : "Upload"}
        </button>
        <input
          ref={input}
          type="file"
          accept={FILE_ACCEPT}
          aria-label={`${document ? "Replace" : "Upload"} ${KIND_LABEL[kind]}`}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = ""; // so choosing the same file again still fires
            if (file) onPick(file);
          }}
        />
      </div>
      {document && openable ? (
        <a href={document.url!} target="_blank" rel="noreferrer">
          {isImage ? (
            <img
              src={document.url!}
              alt={KIND_LABEL[kind]}
              className="aspect-[4/3] w-full rounded-lg border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-brand-500">
              Open file
            </div>
          )}
        </a>
      ) : (
        <div
          role={document?.status === "failed" ? "alert" : undefined}
          className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-center text-theme-xs text-gray-500"
        >
          {document ? unavailableNote(document, connected) : "No file"}
        </div>
      )}
      {document && openable && (
        <p className="mt-1 text-theme-xs text-gray-500">
          {document.contentType ?? "Unknown type"}
          {document.sizeBytes ? ` · ${formatBytes(document.sizeBytes)}` : ""}
          {" · "}
          {document.origin === "admin"
            ? `Uploaded by ${document.uploadedByEmail ?? "an admin"}`
            : "From the website"}
        </p>
      )}
    </div>
  );
}

/**
 * The application's three documents (licence, rating and earnings screenshots): the website's files shown from our
 * own copies (D54) and files an admin uploaded (D68), each slot with Upload or Replace. Replacing asks first, since
 * the current file is removed. Click a picture to open it full size in a new tab; links last about 10 minutes and are
 * renewed whenever the page loads.
 */
export default function ApplicationDocuments({
  applicationId,
}: {
  applicationId: string;
}) {
  const documents = useApplicationDocuments(applicationId);
  const upload = useUploadApplicationDocument(applicationId);
  /** A file chosen for a filled slot, waiting for the admin to confirm the replacement. */
  const [replacing, setReplacing] = useState<{
    kind: ApplicationDocumentKind;
    file: File;
  } | null>(null);
  /** Why the chosen file was refused before it was sent. */
  const [pickError, setPickError] = useState<string | null>(null);

  if (documents.isPending)
    return <p className="text-sm text-gray-500">Loading documents…</p>;
  if (documents.isError)
    return (
      <p role="alert" className="text-sm text-error-600">
        {documents.error.message}
      </p>
    );

  const connected =
    documents.data.sourceConnected && documents.data.storageConnected;
  const byKind = new Map(documents.data.items.map((d) => [d.kind, d]));

  const send = (kind: ApplicationDocumentKind, file: File) => {
    setReplacing(null);
    upload.mutate({ kind, file });
  };
  const onPick = (kind: ApplicationDocumentKind, file: File) => {
    setPickError(null);
    upload.reset();
    const problem = fileProblem(file);
    if (problem) {
      setPickError(`${KIND_LABEL[kind]}: ${problem}`);
      return;
    }
    if (byKind.has(kind)) setReplacing({ kind, file });
    else send(kind, file);
  };

  return (
    <div className="space-y-3">
      {(pickError || upload.isError) && (
        <p role="alert" className="text-sm text-error-600">
          {pickError ?? upload.error?.message}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {KINDS.map((kind) => (
          <DocumentTile
            key={kind}
            kind={kind}
            document={byKind.get(kind) ?? null}
            connected={connected}
            busy={upload.isPending && upload.variables.kind === kind}
            onPick={(file) => onPick(kind, file)}
          />
        ))}
      </div>
      <ConfirmDialog
        isOpen={replacing !== null}
        title={
          replacing
            ? `Replace the ${KIND_LABEL[replacing.kind].toLowerCase()}?`
            : ""
        }
        confirmLabel="Replace"
        onCancel={() => setReplacing(null)}
        onConfirm={() => replacing && send(replacing.kind, replacing.file)}
      >
        The current file is removed and replaced by{" "}
        <span className="font-medium">{replacing?.file.name}</span>. This cannot
        be undone.
      </ConfirmDialog>
    </div>
  );
}
