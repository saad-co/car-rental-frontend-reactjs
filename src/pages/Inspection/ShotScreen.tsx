import { useState } from "react";
import type { FuelLevel } from "../../api/inspectionCapture.queries";
import Button from "../../components/ui/button/Button";
import type { CaptureSession } from "./captureSession";
import { parseMileage, readingOf, type ShotInfo } from "./flow";
import { fuelText, shotText, t, type Language } from "./i18n";
import PhotoSlot from "./PhotoSlot";

const FUEL_LEVELS: FuelLevel[] = [
  "empty",
  "1_8",
  "1_4",
  "3_8",
  "1_2",
  "5_8",
  "3_4",
  "7_8",
  "full",
];

interface Props {
  language: Language;
  session: CaptureSession;
  shot: ShotInfo;
  /** 0-based place in the walk-around, and how many shots there are. */
  index: number;
  total: number;
  /** The previous shot's photo, shown in the corner so the driver can go back and retake it. */
  previousPreview: string | null;
  onBack: () => void;
  onBackToPrevious: () => void;
  /** Go on to the next shot (or the submit screen after the last one). */
  onNext: () => void;
}

/**
 * One shot of the walk-around: the client's title and instruction, the camera button, a preview with retake, the "+ Damage note",
 * and on two shots a typed reading (the mileage on the odometer shot, the fuel level on the fuel shot). A normal shot moves on by
 * itself once the photo is accepted; the two reading shots wait for the reading and the Next button.
 */
export default function ShotScreen({
  language,
  session,
  shot,
  index,
  total,
  previousPreview,
  onBack,
  onBackToPrevious,
  onNext,
}: Props) {
  const text = shotText(language, shot.shotId);
  const reading = readingOf(shot.shotId);
  const view = session.view(shot.shotId, 1);
  const [mileageText, setMileageText] = useState(() => {
    const miles = session.getOdometer();
    return miles === null ? "" : String(miles);
  });
  const mileageInvalid =
    mileageText.trim() !== "" && parseMileage(mileageText) === null;
  const fuel = session.getFuel();

  const readingDone =
    reading === "odometer"
      ? session.getOdometer() !== null
      : reading === "fuel"
        ? fuel !== null
        : true;

  function onMileage(value: string) {
    const digits = value.replace(/\s/g, "");
    setMileageText(digits);
    session.setOdometer(parseMileage(digits));
  }

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

      <div className="relative">
        <div className={previousPreview ? "pr-[4.5rem]" : ""}>
          <h1 className="text-xl font-semibold text-gray-900">{text.title}</h1>
          <p className="mt-1 text-gray-700">{text.instruction}</p>
        </div>
        {previousPreview && (
          <button
            type="button"
            onClick={onBackToPrevious}
            className="absolute right-0 top-0 h-16 w-16 overflow-hidden rounded-lg ring-1 ring-gray-300"
            aria-label={t(language, "capture.tap_thumb_retake")}
          >
            <img
              src={previousPreview}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        )}
      </div>

      <PhotoSlot
        language={language}
        session={session}
        shotId={shot.shotId}
        position={1}
        alt={text.title}
        noteMode="link"
        onPhoto={(quality) => {
          // A normal shot moves on at once, unless the quality check warned (the driver should see it and may retake); the
          // readings wait for the driver to type them.
          if (reading === null && !quality.dark && !quality.blurry) onNext();
        }}
      />

      {reading === "odometer" && (
        <label className="block text-sm text-gray-700">
          {t(language, "readings.odometer_label")}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={mileageText}
            placeholder={t(language, "readings.odometer_placeholder")}
            onChange={(event) => onMileage(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-surface p-3 text-lg text-gray-900"
          />
          {mileageInvalid && (
            <span className="text-error-500">
              {t(language, "readings.odometer_error")}
            </span>
          )}
        </label>
      )}

      {reading === "fuel" && (
        <fieldset>
          <legend className="text-sm text-gray-700">
            {t(language, "readings.fuel_label")}
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {FUEL_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={fuel === level}
                onClick={() => session.setFuel(level)}
                className={`rounded-lg px-2 py-3 text-sm ring-1 ring-inset ${
                  fuel === level
                    ? "bg-brand-500 text-white ring-brand-500"
                    : "bg-surface text-gray-700 ring-gray-300"
                }`}
              >
                {fuelText(language, level)}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <Button
        className="w-full"
        disabled={!view.hasPhoto || !readingDone || mileageInvalid}
        onClick={onNext}
      >
        {t(language, "x.next")}
      </Button>
    </div>
  );
}
