import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  useAnswerDamage,
  useSubmitCapture,
  useUploadCapturePhoto,
  type CaptureState,
} from "../../api/inspectionCapture.queries";
import { CaptureSession } from "./captureSession";
import { deviceInfo, locationIfAllowed } from "./device";
import { CloseUpScreen, DamageAskScreen } from "./DamageScreens";
import DoneScreen from "./DoneScreen";
import { resumePoint, type ResumePoint } from "./flow";
import { shotText, t, type Language } from "./i18n";
import { openPhotoStore } from "./photoStore";
import ShotScreen from "./ShotScreen";
import SubmitScreen from "./SubmitScreen";
import WelcomeScreen from "./WelcomeScreen";

/**
 * The screens of the walk-around (D112): for each shot its photo (`shot`), then "Is there any damage in this photo?" (`ask`), then
 * on "yes" up to 5 close-ups (`closeUp`); after the last shot, submit.
 */
type Step =
  | { kind: "welcome" }
  | { kind: "shot"; index: number }
  | { kind: "ask"; index: number }
  | { kind: "closeUp"; index: number; position: number }
  | { kind: "submit" }
  | { kind: "done"; reference: string };

interface Props {
  token: string;
  /** An open link's state. */
  state: CaptureState & { type: "check_in" | "check_out" };
  language: Language;
  onLanguage: (language: Language) => void;
  /** The server said the link is no longer usable: the page reloads its state and shows the matching screen. */
  onLinkClosed: () => void;
}

const statusOf = (error: unknown) =>
  typeof error === "object" && error !== null
    ? (error as { status?: unknown }).status
    : undefined;

/**
 * The walk-around of an open link: welcome, each shot with its damage question and close-ups, then submit and done. It owns the
 * `CaptureSession` (photos, notes, answers and the background uploading); the screens only show it and call it.
 */
export default function CaptureFlow({
  token,
  state,
  language,
  onLanguage,
  onLinkClosed,
}: Props) {
  const upload = useUploadCapturePhoto(token);
  const answer = useAnswerDamage(token);
  const submit = useSubmitCapture(token);
  // The session is made once and lives as long as the page. `mutateAsync` stays the same function for the life of the hook (it
  // always runs with the current options), and the link's token never changes, so nothing here can go stale.
  const [{ session, store }] = useState(() => {
    // The phone's own storage for photos that have not reached the server yet (null when the browser has none).
    const photoStore = openPhotoStore(token);
    const created = new CaptureSession({
      send: upload.mutateAsync,
      onLinkClosed: () => {
        photoStore?.clear();
        onLinkClosed();
      },
      persist: photoStore ?? undefined,
    });
    created.hydrate(state.photos, state.answers);
    return { session: created, store: photoStore };
  });
  // Photos kept from an earlier visit that never reached the server go back in the upload line.
  useEffect(() => {
    let cancelled = false;
    void store?.loadAll().then((entries) => {
      if (cancelled) return;
      for (const entry of entries) {
        session.restorePhoto(
          entry.shotId,
          entry.position,
          entry.blob,
          entry.capturedAt,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session, store]);
  useSyncExternalStore(session.subscribe, () => session.version);

  // The phone found its signal again: do not wait out the pause before the next try.
  useEffect(() => {
    const onOnline = () => {
      session.retryAll();
      session.wake();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [session]);

  const [step, setStep] = useState<Step>({ kind: "welcome" });
  /** True after the driver tapped a photo on the submit screen: the change returns there instead of going on. */
  const [fromSubmit, setFromSubmit] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const location = useRef<{ lat: number; lng: number } | null>(null);

  const shots = state.shots;
  const maxCloseUps = state.maxCloseUpsPerShot;

  const nextCloseUp = (shotId: string) =>
    (session.closeUpPositions(shotId).at(-1) ?? 0) + 1;

  /** Where the walk-around stands now; null = everything is in. */
  function whereNow(): ResumePoint | null {
    return resumePoint(
      shots,
      session.shotsWithPhoto(),
      session.answerMap(),
      (shotId) => session.closeUpPositions(shotId).length,
    );
  }

  function goTo(step: Step) {
    setAnswerError(null);
    setStep(step);
  }

  function goToSubmit() {
    setFromSubmit(false);
    goTo({ kind: "submit" });
  }

  function begin() {
    void locationIfAllowed().then((found) => {
      location.current = found;
    });
    const point = whereNow();
    if (point === null) goToSubmit();
    else if (point.kind === "closeUp") {
      const shotId = shots[point.index].shotId;
      goTo({ ...point, position: nextCloseUp(shotId) });
    } else goTo(point);
  }

  /** After a shot's photo: its damage question (straight back to submit when retaking from there and already answered). */
  function afterPhoto(index: number) {
    if (fromSubmit && session.answerOf(shots[index].shotId) !== undefined) {
      goToSubmit();
    } else goTo({ kind: "ask", index });
  }

  /** After a shot's damage is settled: the next shot, or the submit screen after the last one. */
  function afterDamage(index: number) {
    if (fromSubmit || index + 1 >= shots.length) goToSubmit();
    else goTo({ kind: "shot", index: index + 1 });
  }

  /** Saves the answer first (the page waits for it), then moves on; a failure stays on the screen with its sentence. */
  async function sendAnswer(index: number, hasDamage: boolean) {
    const shotId = shots[index].shotId;
    setAnswerError(null);
    try {
      await answer.mutateAsync({ shotId, hasDamage });
    } catch (error) {
      console.error("Saving the damage answer failed", error);
      const status = statusOf(error);
      if (status === 410 || status === 409) {
        onLinkClosed();
        return;
      }
      setAnswerError(t(language, "x.answer_failed"));
      return;
    }
    session.recordAnswer(shotId, hasDamage);
    if (hasDamage) {
      goTo({ kind: "closeUp", index, position: nextCloseUp(shotId) });
    } else afterDamage(index);
  }

  async function submitInspection() {
    try {
      const done = await submit.mutateAsync({
        attested: true,
        ...(location.current
          ? { gpsLat: location.current.lat, gpsLng: location.current.lng }
          : {}),
        deviceInfo: deviceInfo(),
      });
      store?.clear();
      goTo({ kind: "done", reference: done.reference });
    } catch (error) {
      const status = statusOf(error);
      if (status === 410 || status === 409) onLinkClosed();
      throw error;
    }
  }

  if (step.kind === "done") {
    return (
      <DoneScreen
        language={language}
        type={state.type}
        reference={step.reference}
      />
    );
  }

  if (step.kind === "shot") {
    const shot = shots[step.index];
    return (
      <ShotScreen
        key={shot.shotId}
        language={language}
        session={session}
        shot={shot}
        index={step.index}
        total={shots.length}
        onBack={() => {
          if (fromSubmit) goToSubmit();
          else if (step.index === 0) goTo({ kind: "welcome" });
          else goTo({ kind: "ask", index: step.index - 1 });
        }}
        onNext={() => afterPhoto(step.index)}
      />
    );
  }

  if (step.kind === "ask") {
    const shot = shots[step.index];
    return (
      <DamageAskScreen
        key={shot.shotId}
        language={language}
        shotTitle={shotText(language, shot.shotId).title}
        photoUrl={session.view(shot.shotId, 1).previewUrl}
        prior={state.priorDamage.filter(
          (item) => item.parentShotId === shot.shotId,
        )}
        closeUpCount={session.closeUpPositions(shot.shotId).length}
        max={maxCloseUps}
        busy={answer.isPending}
        error={answerError}
        onBack={() =>
          fromSubmit ? goToSubmit() : goTo({ kind: "shot", index: step.index })
        }
        onYes={() => void sendAnswer(step.index, true)}
        onNo={() => void sendAnswer(step.index, false)}
        onAddAnother={() =>
          goTo({
            kind: "closeUp",
            index: step.index,
            position: nextCloseUp(shot.shotId),
          })
        }
        onContinue={() => afterDamage(step.index)}
      />
    );
  }

  if (step.kind === "closeUp") {
    const shot = shots[step.index];
    return (
      <CloseUpScreen
        key={`${shot.shotId}:${step.position}`}
        language={language}
        session={session}
        parentShotId={shot.shotId}
        shotTitle={shotText(language, shot.shotId).title}
        position={step.position}
        max={maxCloseUps}
        onBack={() => goTo({ kind: "ask", index: step.index })}
        onAddAnother={() =>
          goTo({
            kind: "closeUp",
            index: step.index,
            position: nextCloseUp(shot.shotId),
          })
        }
        onDone={() => afterDamage(step.index)}
      />
    );
  }

  if (step.kind === "submit") {
    return (
      <SubmitScreen
        language={language}
        session={session}
        shots={shots}
        complete={whereNow() === null}
        onBack={() => goTo({ kind: "ask", index: shots.length - 1 })}
        onRetake={(index) => {
          setFromSubmit(true);
          goTo({ kind: "shot", index });
        }}
        onEditDamage={(index) => {
          setFromSubmit(true);
          goTo({ kind: "ask", index });
        }}
        onSubmit={submitInspection}
      />
    );
  }

  return (
    <WelcomeScreen
      language={language}
      onLanguage={onLanguage}
      type={state.type}
      vehicle={state.vehicle}
      progress={{
        done: session.shotsWithPhoto().size,
        total: shots.length,
      }}
      onBegin={begin}
    />
  );
}
