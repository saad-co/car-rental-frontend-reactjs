import Button from "../../components/ui/button/Button";
import type { CaptureSession } from "./captureSession";
import { FUEL_SHOT, type ShotInfo } from "./flow";
import { shotText, t, type Language } from "./i18n";
import PhotoSlot from "./PhotoSlot";

/** Our own drawing of a fuel gauge (`public/inspection/`), shown on the fuel shot so the driver knows what to photograph (D112). */
const FUEL_SAMPLE_URL = "/inspection/fuel-gauge-sample.svg";

interface Props {
  language: Language;
  session: CaptureSession;
  shot: ShotInfo;
  /** 0-based place in the walk-around, and how many shots there are. */
  index: number;
  total: number;
  onBack: () => void;
  /** Go on to this shot's damage question. */
  onNext: () => void;
}

/**
 * One shot of the walk-around: the client's title and instruction, the camera button, a preview with retake and the
 * "+ Damage note". It moves on by itself once the photo is accepted (unless the quality check warned). Since D112 there is no
 * thumbnail of the previous photo and no typed reading: the mileage and the fuel level are read from their photos, and the fuel
 * shot shows a sample gauge.
 */
export default function ShotScreen({
  language,
  session,
  shot,
  index,
  total,
  onBack,
  onNext,
}: Props) {
  const text = shotText(language, shot.shotId);
  const view = session.view(shot.shotId, 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-brand-500 hover:underline"
        >
          ← {t(language, "capture.back")}
        </button>
        <span className="text-sm text-gray-500">
          {t(language, "capture.progress", { current: index + 1, total })}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
      >
        <div
          className="h-full bg-brand-500"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">{text.title}</h1>
        <p className="mt-1 text-gray-700">{text.instruction}</p>
      </div>

      {shot.shotId === FUEL_SHOT && !view.hasPhoto && (
        <figure className="rounded-xl bg-surface p-3">
          <img
            src={FUEL_SAMPLE_URL}
            alt={t(language, "x.fuel_sample_alt")}
            className="mx-auto w-full max-w-xs"
          />
          <figcaption className="mt-2 text-center text-sm text-gray-700">
            {t(language, "x.fuel_sample")}
          </figcaption>
        </figure>
      )}

      <PhotoSlot
        language={language}
        session={session}
        shotId={shot.shotId}
        position={1}
        alt={text.title}
        noteMode="link"
        onPhoto={(quality) => {
          // Moves on at once, unless the quality check warned (the driver should see it and may retake).
          if (!quality.dark && !quality.blurry) onNext();
        }}
      />

      <Button className="w-full" disabled={!view.hasPhoto} onClick={onNext}>
        {t(language, "x.next")}
      </Button>
    </div>
  );
}
