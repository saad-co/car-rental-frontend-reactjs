import { useState } from "react";
import { useParams } from "react-router";
import {
  useCaptureState,
  useReloadCaptureState,
  useSetCaptureLanguage,
} from "../../api/inspectionCapture.queries";
import Button from "../../components/ui/button/Button";
import Spinner from "../../components/ui/spinner/Spinner";
import CaptureFlow from "./CaptureFlow";
import { saveLanguage, savedLanguage } from "./device";
import { pickLanguage, t, type Language } from "./i18n";
import InspectionLayout from "./InspectionLayout";
import StatusScreen from "./StatusScreen";

/**
 * `/i/:token`, the page the driver's texted link opens (Module 3). Public: no login, the link is the credential. It loads the
 * state of the link and shows the walk-around when the link is open, or the expired / revoked / already-submitted screen.
 * Express comparison: a route in a public router with no auth middleware, reading its one parameter from `req.params.token`.
 */
export default function CapturePage() {
  const { token = "" } = useParams();
  const capture = useCaptureState(token);
  const reload = useReloadCaptureState(token);
  const setServerLanguage = useSetCaptureLanguage(token);
  const [language, setLanguage] = useState<Language>(() =>
    pickLanguage(savedLanguage(), navigator.language),
  );

  function chooseLanguage(next: Language) {
    setLanguage(next);
    saveLanguage(next);
    setServerLanguage.mutate(next);
  }

  if (capture.isPending) {
    return (
      <InspectionLayout>
        <div className="flex items-center justify-center gap-3 py-10 text-gray-700">
          <Spinner />
          <span>{t(language, "x.loading")}</span>
        </div>
      </InspectionLayout>
    );
  }

  if (capture.isError) {
    console.error("The photo page could not load", capture.error);
    return (
      <InspectionLayout>
        <div className="flex flex-col gap-4 rounded-2xl bg-surface p-6 text-center">
          <p className="text-gray-700">{t(language, "x.load_error")}</p>
          <Button onClick={() => void capture.refetch()}>
            {t(language, "permissions.try_again")}
          </Button>
        </div>
      </InspectionLayout>
    );
  }

  const state = capture.data;
  return (
    <InspectionLayout>
      {state.state === "open" && state.type ? (
        <CaptureFlow
          token={token}
          state={{ ...state, type: state.type }}
          language={language}
          onLanguage={chooseLanguage}
          onLinkClosed={() => void reload()}
        />
      ) : (
        <StatusScreen language={language} state={state} />
      )}
    </InspectionLayout>
  );
}
