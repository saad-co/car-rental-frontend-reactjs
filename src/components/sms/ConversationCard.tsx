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

/**
 * Texts with one application's or driver's phone (D50): the chat and a Files tab. Opening it asks Quo for the
 * history (so texts sent from the Quo app appear too), then both tabs keep checking for new texts and files.
 */
export default function ConversationCard({
  kind,
  id,
}: {
  kind: SmsContactKind;
  id: string;
}) {
  const status = useSmsStatus();
  const sync = useSyncSms(kind, id);
  const { mutate: syncNow } = sync;

  // Once per contact: pull the history from Quo (adds nothing twice).
  useEffect(() => {
    syncNow();
  }, [kind, id, syncNow]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-800">Texts</h2>
        {status.data && <ModeBadge mode={status.data.mode} />}
      </div>
      {sync.isError && (
        <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-theme-xs text-gray-600">
          Earlier texts could not be loaded from Quo: {sync.error.message}
        </p>
      )}
      <Tabs
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
  );
}
