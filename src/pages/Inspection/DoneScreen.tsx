import { t, type Language } from "./i18n";

interface Props {
  language: Language;
  type: "check_in" | "check_out";
  reference: string;
}

/** The thank-you after a successful submit, with the reference number. */
export default function DoneScreen({ language, type, reference }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">
        {t(language, "submit.success_title")}
      </h1>
      <p className="text-gray-700">
        {t(
          language,
          type === "check_in"
            ? "submit.success_body_check_in"
            : "submit.success_body_check_out",
          { reference },
        )}
      </p>
    </div>
  );
}
