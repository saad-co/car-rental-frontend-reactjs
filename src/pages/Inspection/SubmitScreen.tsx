import { useState } from "react";
import Checkbox from "../../components/form/input/Checkbox";
import Button from "../../components/ui/button/Button";
import type { CaptureSession } from "./captureSession";
import { DAMAGE_SHOT, percent, type ShotInfo } from "./flow";
import { shotText, t, type Language } from "./i18n";

interface Props {
  language: Language;
  session: CaptureSession;
  shots: ShotInfo[];
  /** The numbers of the damage photos added (shown after the shots, tap one to change it). */
  damagePositions: number[];
  maxDamage: number;
  /** Everything needed is on the page: every required shot has a photo and both readings are typed. */
  complete: boolean;
  onBack: () => void;
  /** The driver tapped a photo: go and retake it. */
  onRetake: (index: number) => void;
  /** The driver tapped a damage photo: go and change it. */
  onEditDamage: (position: number) => void;
  /** Called once the photos are all on the server and the box is checked; throws when the server refuses. */
  onSubmit: () => Promise<void>;
}

/**
 * The last screen before the end: a strip of every photo (tap one to retake it), the one checkbox, and Submit. Submit waits for
 * the background uploads to finish, shows how far they are, and offers "Try again" for any the server refused; only then does it
 * close the inspection.
 */
export default function SubmitScreen({
  language,
  session,
  shots,
  damagePositions,
  maxDamage,
  complete,
  onBack,
  onRetake,
  onEditDamage,
  onSubmit,
}: Props) {
  const [attested, setAttested] = useState(false);
  const [needBox, setNeedBox] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { done, total } = session.progress();
  const uploading = busy || done < total;

  async function submit() {
    if (!attested) {
      setNeedBox(true);
      return;
    }
    setNeedBox(false);
    setFailed(false);
    setBusy(true);
    try {
      const refused = await session.settled();
      if (refused.length > 0) {
        setFailed(true);
        return;
      }
      await onSubmit();
    } catch (error) {
      console.error("Submitting the inspection failed", error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function tryAgain() {
    session.retryAll();
    session.wake();
    void submit();
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-brand-500 hover:underline"
      >
        ← {t(language, "capture.back")}
      </button>
      <p className="text-sm text-gray-700">
        {t(language, "submit.thumbs_hint")}
      </p>

      <div className="grid grid-cols-4 gap-2">
        {shots.map((shot, index) => {
          const view = session.view(shot.shotId, 1);
          return (
            <button
              key={shot.shotId}
              type="button"
              onClick={() => onRetake(index)}
              aria-label={shotText(language, shot.shotId).title}
              className={`aspect-square overflow-hidden rounded-lg ring-1 ${
                view.status === "failed" ? "ring-error-500" : "ring-gray-300"
              }`}
            >
              {view.previewUrl && (
                <img
                  src={view.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          );
        })}
      </div>

      {damagePositions.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {damagePositions.map((position) => {
            const view = session.view(DAMAGE_SHOT, position);
            return (
              <button
                key={position}
                type="button"
                onClick={() => onEditDamage(position)}
                aria-label={t(language, "damage.title", {
                  current: position,
                  max: maxDamage,
                })}
                className={`aspect-square overflow-hidden rounded-lg ring-1 ${
                  view.status === "failed" ? "ring-error-500" : "ring-gray-300"
                }`}
              >
                {view.previewUrl && (
                  <img
                    src={view.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <Checkbox
        id="attest"
        checked={attested}
        onChange={(checked) => {
          setAttested(checked);
          if (checked) setNeedBox(false);
        }}
        label={t(language, "attestation.confirm")}
      />
      {needBox && (
        <p className="text-sm text-error-500">
          {t(language, "attestation.checkbox_required")}
        </p>
      )}

      {uploading && (
        <div className="text-sm text-gray-700">
          <p>
            {t(language, "submit.uploading", { percent: percent(done, total) })}
          </p>
          <p>{t(language, "submit.do_not_close")}</p>
        </div>
      )}
      {failed && (
        <p className="text-sm text-error-500">{t(language, "submit.error")}</p>
      )}

      {failed ? (
        <Button className="w-full" onClick={tryAgain}>
          {t(language, "submit.retry")}
        </Button>
      ) : (
        <Button
          className="w-full"
          disabled={!complete || busy}
          onClick={() => void submit()}
        >
          {t(language, "submit.button")}
        </Button>
      )}
    </div>
  );
}
