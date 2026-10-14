import { useState } from "react";
import {
  useSmsFiles,
  useSmsStatus,
  type SmsContactKind,
  type SmsFile,
} from "../../api/sms.queries";
import Pagination from "../ui/pagination/Pagination";
import { formatDateTime } from "../../utils";
import { formatBytes } from "./formatBytes";

/** What to show where a file cannot be opened (yet). */
function unavailableNote(file: SmsFile, filesConfigured: boolean): string {
  if (file.status === "failed") return "Could not be saved";
  return filesConfigured ? "Saving…" : "File storage is not set up yet";
}

function FileCard({
  file,
  filesConfigured,
}: {
  file: SmsFile;
  filesConfigured: boolean;
}) {
  const openable = file.status === "stored" && file.url !== null;
  const isImage = file.contentType?.startsWith("image/") ?? false;
  const caption = (
    <div className="px-1 pt-1.5">
      <p className="truncate text-theme-xs font-medium text-gray-700">
        {file.contentType ?? "Unknown type"}
        {file.sizeBytes ? ` · ${formatBytes(file.sizeBytes)}` : ""}
      </p>
      <p className="truncate text-theme-xs text-gray-500">
        {file.direction === "inbound" ? "Received" : "Sent"}{" "}
        {formatDateTime(file.occurredAt)}
      </p>
    </div>
  );

  if (!openable) {
    return (
      <div>
        <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2 text-center text-theme-xs text-gray-500">
          {unavailableNote(file, filesConfigured)}
        </div>
        {caption}
      </div>
    );
  }
  return (
    <a href={file.url!} target="_blank" rel="noreferrer" className="block">
      {isImage ? (
        <img
          src={file.url!}
          alt="Received file"
          className="aspect-square w-full rounded-lg border border-gray-200 object-cover"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-2 text-center text-sm font-medium text-brand-500">
          Open file
        </div>
      )}
      {caption}
    </a>
  );
}

/** Every file in the conversation as a grid, newest first, like WhatsApp's media view. */
export default function FilesTab({
  kind,
  id,
}: {
  kind: SmsContactKind;
  id: string;
}) {
  const [page, setPage] = useState(1);
  const status = useSmsStatus();
  const files = useSmsFiles(kind, id, page);
  const filesConfigured = status.data?.filesConfigured ?? false;

  if (files.isPending)
    return <p className="text-sm text-gray-500">Loading files…</p>;
  if (files.isError)
    return (
      <p role="alert" className="text-sm text-error-600">
        {files.error.message}
      </p>
    );
  if (files.data.total === 0)
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No files yet. Photos and documents texted in will appear here.
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {files.data.items.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            filesConfigured={filesConfigured}
          />
        ))}
      </div>
      {files.data.total > files.data.limit && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(files.data.total / files.data.limit)}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
