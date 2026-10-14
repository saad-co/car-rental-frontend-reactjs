import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  useSendSms,
  useSmsMessages,
  useSmsStatus,
  type SmsAttachment,
  type SmsContactKind,
  type SmsMessage,
} from "../../api/sms.queries";
import { cn, formatDateTime } from "../../utils";
import { formatBytes } from "./formatBytes";

/** What a bubble says about the text's delivery, and whether that is a problem. */
function deliveryNote(
  message: SmsMessage,
): { text: string; bad: boolean } | null {
  if (message.direction === "inbound") return null;
  switch (message.status) {
    case "composed":
      return { text: "Dry run: not sent", bad: false };
    case "queued":
      return { text: "Sending…", bad: false };
    case "sent":
      return { text: "Sent", bad: false };
    case "delivered":
      return { text: "Delivered", bad: false };
    case "failed":
    case "undelivered":
      return { text: message.error ?? "Not delivered", bad: true };
    default:
      return null;
  }
}

/** One file inside a bubble: an image shows as a picture, anything else as a link. */
function AttachmentView({
  attachment,
  filesConfigured,
}: {
  attachment: SmsAttachment;
  filesConfigured: boolean;
}) {
  if (attachment.status === "stored" && attachment.url) {
    return attachment.contentType?.startsWith("image/") ? (
      <a href={attachment.url} target="_blank" rel="noreferrer">
        <img
          src={attachment.url}
          alt="Attached file"
          className="max-h-72 rounded-lg"
        />
      </a>
    ) : (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="block text-sm font-medium underline"
      >
        Open file ({attachment.contentType ?? "unknown type"}
        {attachment.sizeBytes ? `, ${formatBytes(attachment.sizeBytes)}` : ""})
      </a>
    );
  }
  return (
    <p className="text-theme-xs italic opacity-80">
      {attachment.status === "failed"
        ? "A file came with this text but could not be saved."
        : filesConfigured
          ? "A file came with this text; saving it…"
          : "A file came with this text (file storage is not set up yet)."}
    </p>
  );
}

function Bubble({
  message,
  filesConfigured,
}: {
  message: SmsMessage;
  filesConfigured: boolean;
}) {
  const outbound = message.direction === "outbound";
  const note = deliveryNote(message);
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] space-y-1.5 xl:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm",
          outbound
            ? "rounded-br-sm bg-brand-500 text-white"
            : "rounded-bl-sm bg-gray-100 text-gray-800",
        )}
      >
        {message.body && (
          <p className="break-words whitespace-pre-wrap">{message.body}</p>
        )}
        {message.attachments.map((attachment) => (
          <AttachmentView
            key={attachment.id}
            attachment={attachment}
            filesConfigured={filesConfigured}
          />
        ))}
        <p
          className={cn(
            "text-theme-xs",
            outbound ? "text-white/80" : "text-gray-500",
          )}
        >
          {formatDateTime(message.occurredAt)}
          {outbound && ` · ${message.sentByEmail ?? "from the Quo app"}`}
        </p>
        {note && (
          <p
            role={note.bad ? "alert" : undefined}
            className={cn(
              "text-theme-xs font-medium",
              note.bad
                ? "rounded bg-white/90 px-1.5 text-error-600"
                : "text-white/90",
            )}
          >
            {note.text}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The chat itself: texts oldest to newest (the newest page loads first, "Load older texts" adds earlier ones),
 * and a box to send a new one. Enter sends, Shift+Enter starts a new line.
 */
export default function MessagesTab({
  kind,
  id,
}: {
  kind: SmsContactKind;
  id: string;
}) {
  const status = useSmsStatus();
  const messagesQuery = useSmsMessages(kind, id);
  const send = useSendSms(kind, id);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // The API returns each page newest first; the chat reads oldest first.
  const messages = useMemo(
    () =>
      (messagesQuery.data?.pages.flatMap((page) => page.items) ?? []).reverse(),
    [messagesQuery.data],
  );
  const newestId = messages.at(-1)?.id;
  const off = status.data?.mode === "off";
  // Said before the admin types: the number cannot get texts (for example it was registered wrongly).
  const numberProblem =
    messagesQuery.data?.pages[0]?.contactPhoneProblem ?? null;
  const cannotSend = off || numberProblem !== null;

  // Jump to the newest text when the chat opens and when a newer one arrives.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [newestId]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;
    send.mutate(trimmed, { onSuccess: () => setText("") });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl bg-gray-50 p-3"
      >
        {messagesQuery.isPending && (
          <p className="text-sm text-gray-500">Loading texts…</p>
        )}
        {messagesQuery.isError && (
          <p role="alert" className="text-sm text-error-600">
            {messagesQuery.error.message}
          </p>
        )}
        {messagesQuery.hasNextPage && (
          <button
            type="button"
            onClick={() => void messagesQuery.fetchNextPage()}
            disabled={messagesQuery.isFetchingNextPage}
            className="mx-auto block text-theme-xs font-medium text-brand-500 hover:underline"
          >
            {messagesQuery.isFetchingNextPage ? "Loading…" : "Load older texts"}
          </button>
        )}
        {messagesQuery.isSuccess && messages.length === 0 && (
          <p className="pt-8 text-center text-sm text-gray-500">
            No texts yet.
          </p>
        )}
        {messages.map((message) => (
          <Bubble
            key={message.id}
            message={message}
            filesConfigured={status.data?.filesConfigured ?? false}
          />
        ))}
      </div>

      <form onSubmit={submit} className="shrink-0 space-y-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={1600}
          rows={2}
          disabled={cannotSend}
          placeholder={
            off
              ? "Texting is switched off."
              : numberProblem
                ? "This number cannot receive texts."
                : "Type a text…"
          }
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden disabled:bg-gray-100"
        />
        {numberProblem && (
          <p
            role="alert"
            className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-700"
          >
            {numberProblem}
          </p>
        )}
        {send.isError && (
          <p role="alert" className="text-sm text-error-600">
            {send.error.message}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-theme-xs text-gray-500">
            Only plain text can be sent. Enter sends.
          </span>
          <button
            type="submit"
            disabled={cannotSend || send.isPending || text.trim() === ""}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {send.isPending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
