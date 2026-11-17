import type { CaptureState } from "../../api/inspectionCapture.queries";
import { t, type Language } from "./i18n";

interface Props {
  language: Language;
  state: CaptureState;
}

/**
 * What a link that is not open shows: expired (an unknown link reads the same, so nobody can probe for real ones), revoked, or
 * already submitted with its reference. The "Call GonzoCar" button shows only when the server has a support number.
 */
export default function StatusScreen({ language, state }: Props) {
  let title: string;
  let body: string;
  if (state.state === "submitted") {
    const when = state.submittedAt ? new Date(state.submittedAt) : null;
    title = t(language, "link_status.already_submitted_title");
    body = t(language, "link_status.already_submitted_body", {
      date: when ? when.toLocaleDateString(language) : "",
      time: when
        ? when.toLocaleTimeString(language, {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      reference: state.reference ?? "",
    });
  } else if (state.state === "revoked") {
    title = t(language, "link_status.revoked_title");
    body = t(language, "link_status.revoked_body");
  } else {
    title = t(language, "link_status.expired_title");
    body = t(language, "link_status.expired_body");
  }
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <p className="text-gray-700">{body}</p>
      {state.supportPhone && (
        <a
          href={`tel:${state.supportPhone}`}
          className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3.5 text-sm text-white hover:bg-brand-600"
        >
          {t(language, "link_status.contact_button")}
        </a>
      )}
    </div>
  );
}
