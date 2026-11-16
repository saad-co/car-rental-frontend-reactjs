import { useRef, useState } from "react";
import Button from "../../components/ui/button/Button";
import type { CaptureSession } from "./captureSession";
import { compressPhoto, type CompressedPhoto } from "./compressPhoto";
import { t, type Language } from "./i18n";
import LiveCamera from "./LiveCamera";
import type { Quality } from "./quality";

/** The longest note the server keeps for a photo. */
export const MAX_NOTE_LENGTH = 200;

interface Props {
  language: Language;
  session: CaptureSession;
  shotId: string;
  /** 1 for a required shot; 1 to 15 for a damage photo. */
  position: number;
  /** What the picture shows, for screen readers. */
  alt: string;
  /**
   * `link`: a "+ Damage note" link opens the note box (a required shot). `always`: the note box shows as soon as there is a
   * photo (a damage photo, whose whole point is its note).
   */
  noteMode: "link" | "always";
  /** Called after a photo was accepted, with the result of the quality check. */
  onPhoto?: (quality: Quality) => void;
}

/**
 * One photo place, used by every shot and every damage photo: the camera button, the live viewfinder (or the phone's camera app
 * when the browser has no live camera), the preview with retake, the quality warning, the upload status and the note.
 */
export default function PhotoSlot({
  language,
  session,
  shotId,
  position,
  alt,
  noteMode,
  onPhoto,
}: Props) {
  const view = session.view(shotId, position);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [warning, setWarning] = useState<"dark" | "blurry" | null>(null);
  const [noteOpen, setNoteOpen] = useState(view.note !== "");

  /** The live camera needs a secure page (https or localhost); without it the phone's camera app is used. */
  const hasLiveCamera =
    typeof navigator.mediaDevices?.getUserMedia === "function";

  function openCamera() {
    setProblem(null);
    if (hasLiveCamera) setCameraOpen(true);
    else inputRef.current?.click();
  }

  function accept(photo: CompressedPhoto) {
    session.setPhoto(shotId, position, photo.blob, photo.capturedAt);
    setWarning(
      photo.quality.dark ? "dark" : photo.quality.blurry ? "blurry" : null,
    );
    setCameraOpen(false);
    onPhoto?.(photo.quality);
  }

  async function onPicked(file: File | undefined) {
    if (!file) return;
    setProblem(null);
    try {
      accept(await compressPhoto(file));
    } catch (error) {
      console.error("Could not read the photo", error);
      setProblem(t(language, "x.photo_unreadable"));
    }
  }

  const status = view.status;
  const offline = typeof navigator.onLine === "boolean" && !navigator.onLine;
  const showNote = view.hasPhoto && (noteMode === "always" || noteOpen);
  const noteLabel =
    noteMode === "always"
      ? t(language, "damage.description_label")
      : t(language, "capture.damage_note_label");
  const notePlaceholder =
    noteMode === "always"
      ? t(language, "damage.description_placeholder")
      : t(language, "capture.damage_note_placeholder");

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="photo-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so the same file can be picked again for a retake.
          event.target.value = "";
          void onPicked(file);
        }}
      />

      {cameraOpen && (
        <LiveCamera
          language={language}
          onPhoto={accept}
          onClose={() => setCameraOpen(false)}
          onUseCameraApp={() => {
            setCameraOpen(false);
            inputRef.current?.click();
          }}
        />
      )}

      {view.hasPhoto && view.previewUrl ? (
        <button
          type="button"
          onClick={openCamera}
          className="relative overflow-hidden rounded-2xl ring-1 ring-gray-300"
          aria-label={t(language, "capture.retake")}
        >
          <img
            src={view.previewUrl}
            alt={alt}
            className="aspect-[4/3] w-full object-cover"
          />
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {t(language, "capture.retake")}
          </span>
        </button>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-surface ring-1 ring-gray-300">
          <Button onClick={openCamera}>
            {t(language, "capture.take_photo")}
          </Button>
        </div>
      )}

      {problem && <p className="text-sm text-error-500">{problem}</p>}
      {warning && (
        <p role="alert" className="text-sm text-warning-500">
          {t(
            language,
            warning === "dark"
              ? "capture.quality_dark"
              : "capture.quality_blurry",
          )}
        </p>
      )}
      {view.hasPhoto && (
        <p
          className={`text-sm ${status === "failed" ? "text-error-500" : "text-gray-500"}`}
        >
          {status === "uploading" &&
            t(
              language,
              offline ? "capture.saved_offline" : "x.photo_uploading",
            )}
          {status === "saved" && t(language, "x.photo_saved")}
          {status === "failed" && (
            <button
              type="button"
              className="underline"
              onClick={() => session.retry(shotId, position)}
            >
              {t(language, "x.photo_failed")}
            </button>
          )}
        </p>
      )}

      {view.hasPhoto &&
        (showNote ? (
          <label className="block text-sm text-gray-700">
            {noteLabel}
            <textarea
              value={view.note}
              maxLength={MAX_NOTE_LENGTH}
              rows={2}
              placeholder={notePlaceholder}
              onChange={(event) =>
                session.setNote(shotId, position, event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-surface p-3 text-gray-900"
            />
            <span className="text-xs text-gray-500">
              {t(language, "capture.chars_left", {
                count: MAX_NOTE_LENGTH - view.note.length,
              })}
            </span>
          </label>
        ) : (
          <button
            type="button"
            className="self-start text-sm text-brand-500 hover:underline"
            onClick={() => setNoteOpen(true)}
          >
            {t(language, "capture.damage_note_link")}
          </button>
        ))}
    </div>
  );
}
