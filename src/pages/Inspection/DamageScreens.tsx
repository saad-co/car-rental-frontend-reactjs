import type { CaptureState } from "../../api/inspectionCapture.queries";
import Button from "../../components/ui/button/Button";
import type { CaptureSession } from "./captureSession";
import { closeUpSlot } from "./flow";
import { t, type Language } from "./i18n";
import PhotoSlot from "./PhotoSlot";

interface AskProps {
  language: Language;
  /** The shot's title, and the photo the driver just took of it. */
  shotTitle: string;
  photoUrl: string | null;
  /** For a check-out: the close-ups of this shot recorded at the check-in, so the driver does not report them again. */
  prior: CaptureState["priorDamage"];
  /** Close-ups already added for this shot, and the most allowed (5). */
  closeUpCount: number;
  max: number;
  /** True while the answer is on its way to the server. */
  busy: boolean;
  /** The sentence to show when saving the answer failed. */
  error: string | null;
  onBack: () => void;
  /** "Yes": damage seen, go and add a close-up. */
  onYes: () => void;
  /** "No": no damage on this shot, go on. */
  onNo: () => void;
  /** The shot already has close-ups: add one more, or go on. */
  onAddAnother: () => void;
  onContinue: () => void;
}

/**
 * "Is there any damage in this photo?", asked after each required photo (Abulkalam, 2026-11-17, D112). Shows the photo, and on
 * a check-out the damage recorded at pickup for the same part. Once the shot has close-ups the answer stays "yes" (the server
 * keeps them as evidence), so the screen offers "Add another" and "Next" instead.
 */
export function DamageAskScreen({
  language,
  shotTitle,
  photoUrl,
  prior,
  closeUpCount,
  max,
  busy,
  error,
  onBack,
  onYes,
  onNo,
  onAddAnother,
  onContinue,
}: AskProps) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-brand-500 hover:underline"
      >
        ← {t(language, "capture.back")}
      </button>

      <div>
        <p className="text-sm text-gray-500">{shotTitle}</p>
        <h1 className="text-xl font-semibold text-gray-900">
          {t(language, "x.damage_question")}
        </h1>
        <p className="mt-1 text-gray-700">
          {t(language, "x.damage_question_hint")}
        </p>
      </div>

      {photoUrl && (
        <img
          src={photoUrl}
          alt={shotTitle}
          className="aspect-[4/3] w-full rounded-2xl object-cover ring-1 ring-gray-300"
        />
      )}

      {prior.length > 0 && (
        <div className="rounded-xl bg-surface p-4">
          <h2 className="text-sm font-semibold text-gray-800">
            {t(language, "damage.prior_title")}
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {prior.map((item, index) => (
              <li key={index} className="text-xs text-gray-700">
                {item.thumbUrl && (
                  <img
                    src={item.thumbUrl}
                    alt=""
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                )}
                {item.note && <p className="mt-1">{item.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-error-500">
          {error}
        </p>
      )}

      {closeUpCount > 0 ? (
        <>
          <p className="text-sm text-gray-700">
            {t(language, "x.closeups_taken", { count: closeUpCount, max })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button disabled={closeUpCount >= max} onClick={onAddAnother}>
              {t(language, "damage.add_another", { count: closeUpCount, max })}
            </Button>
            <Button variant="outline" onClick={onContinue}>
              {t(language, "x.next")}
            </Button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button disabled={busy} onClick={onYes}>
            {t(language, "damage.yes")}
          </Button>
          <Button variant="outline" disabled={busy} onClick={onNo}>
            {t(language, "damage.no")}
          </Button>
        </div>
      )}
    </div>
  );
}

interface CloseUpProps {
  language: Language;
  session: CaptureSession;
  /** The shot the damage is on, and its title. */
  parentShotId: string;
  shotTitle: string;
  /** Which close-up this is, 1 to `max`. */
  position: number;
  max: number;
  onBack: () => void;
  /** Go to the next close-up of the same shot. */
  onAddAnother: () => void;
  /** No more close-ups for this shot: on to the next shot. */
  onDone: () => void;
}

/**
 * One damage close-up of a shot, with its optional short note, the coin tip, and "Add another" / "Done". "Done" waits for at
 * least one close-up: the driver said there is damage, so the shot needs a photo of it.
 */
export function CloseUpScreen({
  language,
  session,
  parentShotId,
  shotTitle,
  position,
  max,
  onBack,
  onAddAnother,
  onDone,
}: CloseUpProps) {
  const slot = closeUpSlot(parentShotId);
  const view = session.view(slot, position);
  const count = session.closeUpPositions(parentShotId).length;
  const title = t(language, "damage.title", { current: position, max });
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-brand-500 hover:underline"
      >
        ← {t(language, "capture.back")}
      </button>
      <div>
        <p className="text-sm text-gray-500">{shotTitle}</p>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 text-gray-700">{t(language, "damage.size_tip")}</p>
      </div>

      <PhotoSlot
        language={language}
        session={session}
        shotId={slot}
        position={position}
        alt={`${shotTitle}: ${title}`}
        noteMode="always"
      />

      {count >= max && (
        <p className="text-sm text-gray-700">
          {t(language, "damage.max_reached", { max })}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button
          disabled={!view.hasPhoto || count >= max}
          onClick={onAddAnother}
        >
          {t(language, "damage.add_another", { count, max })}
        </Button>
        <Button variant="outline" disabled={count === 0} onClick={onDone}>
          {t(language, "damage.done")}
        </Button>
      </div>
    </div>
  );
}
