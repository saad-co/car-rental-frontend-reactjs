import Button from "../../components/ui/button/Button";
import { t, vehicleLine, type Language, type VehicleInfo } from "./i18n";

interface Props {
  language: Language;
  onLanguage: (language: Language) => void;
  type: "check_in" | "check_out";
  vehicle: VehicleInfo | null;
  /** Shots with a photo, out of all the shots (a reopened link): shows the "continue" wording when any are done. */
  progress: { done: number; total: number };
  onBegin: () => void;
}

const LANGUAGES: Language[] = ["en", "es"];

/** The first screen, in the order the client's file gives: headline, intro, vehicle, language switch, tips, start button. */
export default function WelcomeScreen({
  language,
  onLanguage,
  type,
  vehicle,
  progress,
  onBegin,
}: Props) {
  const resuming = progress.done > 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t(language, "welcome.welcome_headline")}
        </h1>
        <p className="mt-1 text-lg text-gray-800">
          {t(
            language,
            type === "check_in"
              ? "welcome.title_check_in"
              : "welcome.title_check_out",
          )}
        </p>
        <p className="mt-2 text-gray-700">
          {t(
            language,
            type === "check_in"
              ? "welcome.intro_check_in"
              : "welcome.intro_check_out",
          )}
        </p>
      </div>

      {vehicle && (
        <p className="rounded-xl bg-surface p-4 text-center text-sm text-gray-800">
          {vehicleLine(language, vehicle)}
        </p>
      )}

      <div
        role="group"
        aria-label={t(language, "lang_toggle.label")}
        className="flex justify-center gap-2"
      >
        {LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={language === code}
            onClick={() => onLanguage(code)}
            className={`rounded-full px-4 py-2 text-sm ring-1 ring-inset ${
              language === code
                ? "bg-brand-500 text-white ring-brand-500"
                : "bg-surface text-gray-700 ring-gray-300"
            }`}
          >
            {t(language, `lang_toggle.${code}`)}
          </button>
        ))}
      </div>

      <ul className="list-disc space-y-1 pl-6 text-sm text-gray-700">
        <li>{t(language, "tips.tip_light")}</li>
        <li>{t(language, "tips.tip_distance")}</li>
        <li>{t(language, "x.tip_key")}</li>
      </ul>
      <p className="text-center text-sm text-gray-500">
        {t(language, "welcome.time_estimate")}
      </p>

      {resuming && (
        <p className="text-center text-sm text-gray-700">
          {t(language, "resume.body", {
            done: progress.done,
            total: progress.total,
          })}
        </p>
      )}
      <Button className="w-full" onClick={onBegin}>
        {resuming
          ? t(language, "resume.continue")
          : t(
              language,
              type === "check_in"
                ? "welcome.start_button_check_in"
                : "welcome.start_button_check_out",
            )}
      </Button>
    </div>
  );
}
