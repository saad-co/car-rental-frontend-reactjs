import { useRef, useState } from "react";
import {
  useApplicationDocuments,
  useUploadApplicationDocument,
  type ApplicationDocument,
  type ApplicationDocumentKind,
} from "../../api/applications.queries";
import {
  useDriverDocuments,
  useUploadDriverDocument,
} from "../../api/drivers.queries";
import { FILE_ACCEPT, fileProblem } from "../../pages/Applications/websiteForm";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import { formatBytes } from "../sms/formatBytes";

/** The three slots, in the order they are shown (the same as the website's form). */
const KINDS: ApplicationDocumentKind[] = ["license", "rating", "earnings"];

const KIND_LABEL: Record<ApplicationDocumentKind, string> = {
  license: "Driver's licence",
  rating: "Rating screenshot",
  earnings: "Earnings screenshot",
  contract: "Signed contract",
  license_back: "Driver's licence (back)",
  other: "Other document",
};

/** How many "Other" documents a driver can have (Fleet revisions section 5): each is a named slot. */
const OTHER_SLOTS = [1, 2, 3, 4, 5];

/** A tile's key: the kind, plus the slot for an "Other" document (0 for every fixed kind). */
const slotKey = (kind: ApplicationDocumentKind, slot: number) =>
  `${kind}:${slot}`;

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
  title,
  nameField,
  document,
  connected,
  busy,
  onPick,
}: {
  /** What the tile is called: the kind's name, or the name staff gave an "Other" document. */
  title: string;
  /** An "Other" document is named by staff before its file is chosen. */
  nameField?: { value: string; onChange: (value: string) => void };
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
      {nameField && (
        <input
          type="text"
          value={nameField.value}
          maxLength={60}
          placeholder="Name this document"
          aria-label={`Name of ${title}`}
          onChange={(event) => nameField.onChange(event.target.value)}
          className="mb-1.5 h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-theme-xs text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden"
        />
      )}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-theme-xs font-medium text-gray-700">{title}</p>
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
          aria-label={`${document ? "Replace" : "Upload"} ${title}`}
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
              alt={title}
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
            : document.origin === "firma"
              ? "Signed through our app"
              : "From the website"}
        </p>
      )}
    </div>
  );
}

/** What the panel needs from a documents query (an application's or a driver's): the same shape either way. */
interface DocumentsQuery {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data?: {
    items: ApplicationDocument[];
    sourceConnected: boolean;
    storageConnected: boolean;
  };
}

/** What the panel needs from an upload mutation. */
interface DocumentUpload {
  mutate: (vars: {
    kind: ApplicationDocumentKind;
    file: File;
    slot?: number;
    label?: string;
  }) => void;
  reset: () => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  variables?: { kind: ApplicationDocumentKind; slot?: number };
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
  return (
    <DocumentsPanel
      documents={useApplicationDocuments(applicationId)}
      upload={useUploadApplicationDocument(applicationId)}
      kinds={KINDS}
    />
  );
}

/**
 * The licence (front and back) and earnings files of a driver (D85), the driver's signed contract (D90) and up to five
 * "Other" documents named by staff (Fleet revisions section 5), on the driver page: the
 * application's files for a driver who came from an application (the same slots, so both pages agree), the driver's own
 * for one added directly. The contract is always the driver's own, whatever the application does.
 */
export function DriverDocuments({ driverId }: { driverId: string }) {
  return (
    <DocumentsPanel
      documents={useDriverDocuments(driverId)}
      upload={useUploadDriverDocument(driverId)}
      kinds={["license", "license_back", "earnings", "contract"]}
      otherSlots={OTHER_SLOTS}
    />
  );
}

/** The slots of a documents query, each with Upload or Replace; shared by the application and driver pages. */
function DocumentsPanel({
  documents,
  upload,
  kinds,
  otherSlots = [],
}: {
  documents: DocumentsQuery;
  upload: DocumentUpload;
  kinds: ApplicationDocumentKind[];
  /** The "Other" slots offered (empty: none). */
  otherSlots?: number[];
}) {
  /** A file chosen for a filled slot, waiting for the admin to confirm the replacement. */
  const [replacing, setReplacing] = useState<{
    kind: ApplicationDocumentKind;
    slot: number;
    label?: string;
    file: File;
  } | null>(null);
  /** The names typed for "Other" slots, by slot, not saved until a file is chosen. */
  const [names, setNames] = useState<Record<number, string>>({});
  /** Why the chosen file was refused before it was sent. */
  const [pickError, setPickError] = useState<string | null>(null);

  if (documents.isError)
    return (
      <p role="alert" className="text-sm text-error-600">
        {documents.error?.message}
      </p>
    );
  if (documents.isPending || !documents.data)
    return <p className="text-sm text-gray-500">Loading documents…</p>;

  const connected =
    documents.data.sourceConnected && documents.data.storageConnected;
  const byKey = new Map(
    documents.data.items.map((d) => [slotKey(d.kind, d.slot), d]),
  );

  const send = (
    kind: ApplicationDocumentKind,
    file: File,
    slot: number,
    label?: string,
  ) => {
    setReplacing(null);
    upload.mutate(
      kind === "other" ? { kind, file, slot, label } : { kind, file },
    );
  };
  const onPick = (
    kind: ApplicationDocumentKind,
    file: File,
    slot = 0,
    label?: string,
  ) => {
    setPickError(null);
    upload.reset();
    const problem = fileProblem(file);
    if (problem) {
      setPickError(`${label || KIND_LABEL[kind]}: ${problem}`);
      return;
    }
    if (kind === "other" && !label?.trim()) {
      setPickError("Type a name for this document first.");
      return;
    }
    if (byKey.has(slotKey(kind, slot)))
      setReplacing({ kind, slot, label, file });
    else send(kind, file, slot, label);
  };

  return (
    <div className="space-y-3">
      {(pickError || upload.isError) && (
        <p role="alert" className="text-sm text-error-600">
          {pickError ?? upload.error?.message}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {kinds.map((kind) => (
          <DocumentTile
            key={kind}
            title={KIND_LABEL[kind]}
            document={byKey.get(slotKey(kind, 0)) ?? null}
            connected={connected}
            busy={upload.isPending && upload.variables?.kind === kind}
            onPick={(file) => onPick(kind, file)}
          />
        ))}
      </div>
      {otherSlots.length > 0 && (
        <>
          <h3 className="pt-2 text-sm font-semibold text-gray-800">
            Other documents
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {otherSlots.map((slot) => {
              const document = byKey.get(slotKey("other", slot)) ?? null;
              const name = names[slot] ?? document?.label ?? "";
              return (
                <DocumentTile
                  key={slot}
                  title={name.trim() || `Other document ${slot}`}
                  nameField={{
                    value: name,
                    onChange: (value) =>
                      setNames((all) => ({ ...all, [slot]: value })),
                  }}
                  document={document}
                  connected={connected}
                  busy={
                    upload.isPending &&
                    upload.variables?.kind === "other" &&
                    upload.variables.slot === slot
                  }
                  onPick={(file) => onPick("other", file, slot, name.trim())}
                />
              );
            })}
          </div>
        </>
      )}
      <ConfirmDialog
        isOpen={replacing !== null}
        title={
          replacing
            ? `Replace the ${(replacing.label || KIND_LABEL[replacing.kind]).toLowerCase()}?`
            : ""
        }
        confirmLabel="Replace"
        onCancel={() => setReplacing(null)}
        onConfirm={() =>
          replacing &&
          send(replacing.kind, replacing.file, replacing.slot, replacing.label)
        }
      >
        The current file is removed and replaced by{" "}
        <span className="font-medium">{replacing?.file.name}</span>. This cannot
        be undone.
        {replacing &&
          byKey.get(slotKey(replacing.kind, replacing.slot))?.origin ===
            "firma" && (
            <>
              {" "}
              The current file is the copy of the contract signed through our
              app; the original stays on the contract page.
            </>
          )}
      </ConfirmDialog>
    </div>
  );
}
