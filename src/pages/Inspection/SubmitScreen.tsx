import { useState } from "react";
import Checkbox from "../../components/form/input/Checkbox";
import Button from "../../components/ui/button/Button";
import type { CaptureSession } from "./captureSession";
import { closeUpSlot, percent, type ShotInfo } from "./flow";
import { shotText, t, type Language } from "./i18n";

interface Props {
  language: Language;
  session: CaptureSession;
  shots: ShotInfo[];
  /** Everything needed is on the page: every required shot has its photo and damage answer, and each "yes" a close-up. */
  complete: boolean;
  onBack: () => void;
  /** The driver tapped a photo: go and retake it. */
  onRetake: (index: number) => void;
  /** The driver tapped a shot's damage line: go back to its damage question. */
  onEditDamage: (index: number) => void;
  /** Called once the photos are all on the server and the box is checked; throws when the server refuses. */
  onSubmit: () => Promise<void>;
}

/**
 * The last screen before the end: every shot's photo (tap one to retake it) with its damage answer under it ("No damage" or
 * "Damage: 2"; tap it to change the close-ups, D112), the one checkbox, and Submit. Submit waits for
 * the background uploads to finish, shows how far they are, and offers "Try again" for any the server refused; only then does it
 * close the inspection.
 */
export default function SubmitScreen({
  language,
  session,
  shots,
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

      <div className="grid grid-cols-3 gap-2">
        {shots.map((shot, index) => {
          const view = session.view(shot.shotId, 1);
          const closeUps = session.closeUpPositions(shot.shotId);
          const closeUpFailed = closeUps.some(
            (position) =>
              session.view(closeUpSlot(shot.shotId), position).status ===
              "failed",
          );
          const answer = session.answerOf(shot.shotId);
          const title = shotText(language, shot.shotId).title;
          return (
            <div key={shot.shotId} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => onRetake(index)}
                aria-label={title}
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
              <button
                type="button"
                onClick={() => onEditDamage(index)}
                className={`text-left text-xs underline-offset-2 hover:underline ${
                  closeUpFailed || (answer === true && closeUps.length === 0)
                    ? "text-error-500"
                    : answer === true
                      ? "text-warning-500"
                      : "text-gray-500"
                }`}
              >
                {answer === undefined
                  ? t(language, "x.damage_question")
                  : answer
                    ? t(language, "x.damage_count", { count: closeUps.length })
                    : t(language, "x.no_damage")}
              </button>
            </div>
          );
        })}
      </div>

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
