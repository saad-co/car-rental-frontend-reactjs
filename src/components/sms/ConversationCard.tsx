import { useEffect } from "react";
import {
  useSmsStatus,
  useSyncSms,
  type SmsContactKind,
} from "../../api/sms.queries";
import Badge from "../ui/badge/Badge";
import Tabs from "../ui/tabs/Tabs";
import FilesTab from "./FilesTab";
import MessagesTab from "./MessagesTab";

/** The setup in one badge, so nobody mistakes a dry run for a sent text. */
function ModeBadge({ mode }: { mode: "off" | "dry_run" | "live" }) {
  if (mode === "live")
    return (
      <Badge size="sm" color="success">
        Live
      </Badge>
    );
  if (mode === "dry_run")
    return (
      <Badge size="sm" color="warning">
        Dry run: texts are saved, not sent
      </Badge>
    );
  return (
    <Badge size="sm" color="error">
      Texting is off
    </Badge>
  );
}

/** Up to two initials of a name, for the avatar circle. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/**
 * Texts with one application's or driver's phone (D50): a header with who it is, the chat and a Files tab. The
 * layout follows TailAdmin's chat page (header, scrolling messages, composer pinned at the bottom) and fills the
 * height its parent gives it, so the page decides how large the chat is. Opening it asks Quo for the history (so
 * texts sent from the Quo app appear too), then both tabs keep checking for new texts and files.
 */
export default function ConversationCard({
  kind,
  id,
  name,
  phone,
}: {
  kind: SmsContactKind;
  id: string;
  /** Who the chat is with, for the header. */
  name: string;
  /** Their phone as shown to people, for the header. */
  phone: string;
}) {
  const status = useSmsStatus();
  const sync = useSyncSms(kind, id);
  const { mutate: syncNow } = sync;

  // Once per contact: pull the history from Quo (adds nothing twice).
  useEffect(() => {
    syncNow();
  }, [kind, id, syncNow]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-500">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-800">
              {name}
            </h2>
            <p className="truncate text-theme-xs text-gray-500">{phone}</p>
          </div>
        </div>
        {status.data && <ModeBadge mode={status.data.mode} />}
      </div>

      {sync.isError && (
        <p className="mx-5 mt-4 shrink-0 rounded-lg bg-gray-50 px-3 py-2 text-theme-xs text-gray-600">
          Earlier texts could not be loaded from Quo: {sync.error.message}
        </p>
      )}

      <div className="min-h-0 flex-1 px-5 pt-1 pb-5">
        <Tabs
          fill
          tabs={[
            {
              id: "messages",
              label: "Messages",
              content: <MessagesTab kind={kind} id={id} />,
            },
            {
              id: "files",
              label: "Files",
              content: <FilesTab kind={kind} id={id} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
