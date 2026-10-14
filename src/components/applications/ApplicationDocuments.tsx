import {
  useApplicationDocuments,
  type ApplicationDocument,
} from "../../api/applications.queries";
import { formatBytes } from "../sms/formatBytes";

/** The three uploads on the website's form, in the order they are shown. */
const KIND_LABEL: Record<ApplicationDocument["kind"], string> = {
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
  document,
  connected,
}: {
  document: ApplicationDocument;
  connected: boolean;
}) {
  const openable = document.status === "stored" && document.url !== null;
  const isImage = document.contentType?.startsWith("image/") ?? false;
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-theme-xs font-medium text-gray-700">
        {KIND_LABEL[document.kind]}
      </p>
      {openable ? (
        <a href={document.url!} target="_blank" rel="noreferrer">
          {isImage ? (
            <img
              src={document.url!}
              alt={KIND_LABEL[document.kind]}
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
          role={document.status === "failed" ? "alert" : undefined}
          className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-center text-theme-xs text-gray-500"
        >
          {unavailableNote(document, connected)}
        </div>
      )}
      {openable && (
        <p className="mt-1 text-theme-xs text-gray-500">
          {document.contentType ?? "Unknown type"}
          {document.sizeBytes ? ` · ${formatBytes(document.sizeBytes)}` : ""}
        </p>
      )}
    </div>
  );
}

/**
 * The files the applicant uploaded on the website form (licence, rating and earnings screenshots), shown from
 * our own copies (D54). Click a picture to open it full size in a new tab; links last about 10 minutes and are
 * renewed whenever the page loads.
 */
export default function ApplicationDocuments({
  applicationId,
}: {
  applicationId: string;
}) {
  const documents = useApplicationDocuments(applicationId);

  if (documents.isPending)
    return <p className="text-sm text-gray-500">Loading documents…</p>;
  if (documents.isError)
    return (
      <p role="alert" className="text-sm text-error-600">
        {documents.error.message}
      </p>
    );
  if (documents.data.items.length === 0)
    return (
      <p className="text-sm text-gray-500">
        This application has no uploaded documents.
      </p>
    );

  const connected =
    documents.data.sourceConnected && documents.data.storageConnected;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {documents.data.items.map((document) => (
        <DocumentTile
          key={document.id}
          document={document}
          connected={connected}
        />
      ))}
    </div>
  );
}
