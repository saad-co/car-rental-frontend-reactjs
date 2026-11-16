import type { CaptureState } from "../../api/inspectionCapture.queries";
import Button from "../../components/ui/button/Button";
import type { CaptureSession } from "./captureSession";
import { DAMAGE_SHOT } from "./flow";
import { t, type Language } from "./i18n";
import PhotoSlot from "./PhotoSlot";

interface AskProps {
  language: Language;
  /** Damage photos added so far, and the most the server allows. */
  count: number;
  max: number;
  /** For a check-out: the damage recorded at the check-in, so the driver does not report it again. */
  prior: CaptureState["priorDamage"];
  onBack: () => void;
  /** Add a damage photo (the first, or another). */
  onYes: () => void;
  /** No (more) damage: on to the submit screen. */
  onNo: () => void;
}

/** "Any other damage?" after the last shot, with the check-in damage listed first on a check-out. */
export function DamageAskScreen({
  language,
  count,
  max,
  prior,
  onBack,
  onYes,
  onNo,
}: AskProps) {
  const full = count >= max;
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-brand-500 hover:underline"
      >
        ← {t(language, "capture.back")}
      </button>

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

      <h1 className="text-xl font-semibold text-gray-900">
        {t(language, "damage.question")}
      </h1>
      {full && (
        <p className="text-sm text-gray-700">
          {t(language, "damage.max_reached", { max })}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button disabled={full} onClick={onYes}>
          {count > 0
            ? t(language, "damage.add_another", { count, max })
            : t(language, "damage.yes")}
        </Button>
        <Button variant="outline" onClick={onNo}>
          {count > 0 ? t(language, "damage.done") : t(language, "damage.no")}
        </Button>
      </div>
    </div>
  );
}

interface DamageProps {
  language: Language;
  session: CaptureSession;
  /** Which damage photo this is, 1 to `max`. */
  position: number;
  max: number;
  onBack: () => void;
  /** Go to the next damage photo. */
  onAddAnother: () => void;
  onDone: () => void;
}

/** One damage photo with its short note, the coin tip, and "Add another" / "Done". */
export function DamageScreen({
  language,
  session,
  position,
  max,
  onBack,
  onAddAnother,
  onDone,
}: DamageProps) {
  const view = session.view(DAMAGE_SHOT, position);
  const count = session.damagePositions().length;
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-brand-500 hover:underline"
      >
        ← {t(language, "capture.back")}
      </button>
      <h1 className="text-xl font-semibold text-gray-900">
        {t(language, "damage.title", { current: position, max })}
      </h1>
      <p className="text-gray-700">{t(language, "damage.size_tip")}</p>

      <PhotoSlot
        language={language}
        session={session}
        shotId={DAMAGE_SHOT}
        position={position}
        alt={t(language, "damage.title", { current: position, max })}
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
        <Button variant="outline" onClick={onDone}>
          {t(language, "damage.done")}
        </Button>
      </div>
    </div>
  );
}
