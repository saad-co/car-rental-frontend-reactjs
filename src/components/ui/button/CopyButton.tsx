import { useEffect, useState } from "react";

// Copied from TailAdmin (components/api-keys/ApiKeyTable.tsx: its copy button, the copy and check icons, "Copied" for
// 1.5 s). Changes: dark-mode classes removed (D20); a standalone button instead of one glued to an input; a small
// icon-only size; "Not copied" when the browser blocks the clipboard (the value stays on screen as selectable text).

type CopyState = "idle" | "copied" | "failed";

interface CopyButtonProps {
  /** The text put on the clipboard. */
  text: string;
  /** What is copied, for screen readers and the hover hint, e.g. "Email". */
  label: string;
  /** `icon`: a small square button with the icon only (one per row). `labelled`: icon and "Copy" text. */
  variant?: "icon" | "labelled";
  /** The text of the labelled variant (default "Copy"). */
  children?: string;
}

/** Copies `text` to the clipboard; the icon turns into a check for 1.5 s. */
export default function CopyButton({
  text,
  label,
  variant = "icon",
  children = "Copy",
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1500);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setState("copied"),
      () => setState("failed"),
    );
  };

  const word =
    state === "copied" ? "Copied" : state === "failed" ? "Not copied" : null;
  const icon =
    state === "copied" ? (
      <svg
        className="fill-current"
        width="16"
        height="16"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16.707 6.293a1 1 0 00-1.414 0L9 12.586l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z"
        />
      </svg>
    ) : (
      <svg
        className="fill-current"
        width="16"
        height="16"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.58822 4.58398C6.58822 4.30784 6.81207 4.08398 7.08822 4.08398H15.4154C15.6915 4.08398 15.9154 4.30784 15.9154 4.58398L15.9154 12.9128C15.9154 13.189 15.6916 13.4128 15.4154 13.4128H7.08821C6.81207 13.4128 6.58822 13.189 6.58822 12.9128V4.58398ZM7.08822 2.58398C5.98365 2.58398 5.08822 3.47942 5.08822 4.58398V5.09416H4.58496C3.48039 5.09416 2.58496 5.98959 2.58496 7.09416V15.4161C2.58496 16.5207 3.48039 17.4161 4.58496 17.4161H12.9069C14.0115 17.4161 14.9069 16.5207 14.9069 15.4161L14.9069 14.9128H15.4154C16.52 14.9128 17.4154 14.0174 17.4154 12.9128L17.4154 4.58398C17.4154 3.47941 16.52 2.58398 15.4154 2.58398H7.08822ZM13.4069 14.9128H7.08821C5.98364 14.9128 5.08822 14.0174 5.08822 12.9128V6.59416H4.58496C4.30882 6.59416 4.08496 6.81801 4.08496 7.09416V15.4161C4.08496 15.6922 4.30882 15.9161 4.58496 15.9161H12.9069C13.183 15.9161 13.4069 15.6922 13.4069 15.4161L13.4069 14.9128Z"
        />
      </svg>
    );

  if (variant === "labelled") {
    return (
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        {icon}
        <span aria-live="polite">{word ?? children}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      title={word ?? `Copy ${label}`}
      className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 ${
        state === "failed" ? "text-error-600" : "text-gray-700"
      }`}
    >
      {icon}
      <span className="sr-only" aria-live="polite">
        {word ?? ""}
      </span>
    </button>
  );
}
