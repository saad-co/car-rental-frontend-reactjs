import { useEffect, useRef, useState } from "react";
import Button from "../../components/ui/button/Button";
import { compressFrame, type CompressedPhoto } from "./compressPhoto";
import { t, type Language } from "./i18n";

interface Props {
  language: Language;
  /** A frame was taken and compressed. */
  onPhoto: (photo: CompressedPhoto) => void;
  /** The driver left without taking a photo. */
  onClose: () => void;
  /** The driver chose the phone's own camera app instead (the plain file input). */
  onUseCameraApp: () => void;
}

type CameraState = "starting" | "live" | "blocked";

/** True on an iPhone or iPad, to show the matching "camera is blocked" help. */
const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * The live viewfinder: the rear camera shown full screen with a shutter button (spec p. 4). No outline images over it (B138).
 * It asks the browser for the camera when it opens; if the browser refuses (the driver said no, or there is no camera) it shows
 * the client's "Camera is blocked" help with Try again, and a way to use the phone's camera app instead, so nobody is stuck.
 * The video stream is always stopped when the screen closes, so the camera light goes off.
 */
export default function LiveCamera({
  language,
  onPhoto,
  onClose,
  onUseCameraApp,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 2048 } },
        audio: false,
      })
      .then((opened) => {
        if (cancelled) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        if (videoRef.current) videoRef.current.srcObject = opened;
        setState("live");
      })
      .catch((error: unknown) => {
        console.warn("The camera could not be opened.", error);
        if (!cancelled) setState("blocked");
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [attempt]);

  function tryAgain() {
    setState("starting");
    setAttempt((count) => count + 1);
  }

  async function shoot() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || busy) return;
    setBusy(true);
    try {
      onPhoto(await compressFrame(video));
    } catch (error) {
      console.error("The camera frame could not be saved.", error);
      setState("blocked");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {state === "blocked" ? (
        <div className="flex flex-1 flex-col justify-center gap-4 p-6 text-center">
          <h2 className="text-xl font-semibold text-white">
            {t(language, "permissions.camera_denied_title")}
          </h2>
          <p className="text-gray-700">
            {t(
              language,
              isIos()
                ? "permissions.camera_denied_ios"
                : "permissions.camera_denied_android",
            )}
          </p>
          <Button onClick={tryAgain}>
            {t(language, "permissions.try_again")}
          </Button>
          <Button variant="outline" onClick={onUseCameraApp}>
            {t(language, "capture.take_photo")}
          </Button>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          data-testid="live-video"
          className="min-h-0 flex-1 bg-black object-contain"
        />
      )}
      <div className="flex items-center justify-between px-6 py-5">
        <button type="button" onClick={onClose} className="text-sm text-white">
          ← {t(language, "capture.back")}
        </button>
        {state !== "blocked" && (
          <button
            type="button"
            onClick={() => void shoot()}
            disabled={state !== "live" || busy}
            aria-label={t(language, "capture.take_photo")}
            data-testid="shutter"
            className="h-16 w-16 rounded-full border-4 border-white bg-white/80 disabled:opacity-40"
          />
        )}
        <span className="w-12" />
      </div>
    </div>
  );
}
