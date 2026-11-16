import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  useSubmitCapture,
  useUploadCapturePhoto,
  type CaptureState,
} from "../../api/inspectionCapture.queries";
import { CaptureSession } from "./captureSession";
import { deviceInfo, locationIfAllowed } from "./device";
import { DamageAskScreen, DamageScreen } from "./DamageScreens";
import DoneScreen from "./DoneScreen";
import { FUEL_SHOT, firstMissingIndex, ODOMETER_SHOT } from "./flow";
import type { Language } from "./i18n";
import { openPhotoStore } from "./photoStore";
import ShotScreen from "./ShotScreen";
import SubmitScreen from "./SubmitScreen";
import WelcomeScreen from "./WelcomeScreen";

type Step =
  | { kind: "welcome" }
  | { kind: "shot"; index: number }
  | { kind: "damageAsk" }
  | { kind: "damage"; position: number }
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

/**
 * The walk-around of an open link: welcome, the shots one by one, then submit and done. It owns the `CaptureSession` (photos,
 * notes, readings and the background uploading); the screens only show it and call it.
 */
export default function CaptureFlow({
  token,
  state,
  language,
  onLanguage,
  onLinkClosed,
}: Props) {
  const upload = useUploadCapturePhoto(token);
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
    created.hydrate(state.photos, state.odometerMiles, state.fuelLevel);
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
  /** True after the driver tapped a photo on the submit screen: the retake returns there instead of going on. */
  const [fromSubmit, setFromSubmit] = useState(false);
  const location = useRef<{ lat: number; lng: number } | null>(null);

  const shots = state.shots;
  const maxDamage = state.maxDamagePhotos;

  /** Shots that count as done: a photo, and for the odometer and fuel shots the typed reading too. */
  function doneShots(): Set<string> {
    const have = session.shotsWithPhoto();
    if (session.getOdometer() === null) have.delete(ODOMETER_SHOT);
    if (session.getFuel() === null) have.delete(FUEL_SHOT);
    return have;
  }

  function goToSubmit() {
    setFromSubmit(false);
    setStep({ kind: "submit" });
  }

  function begin() {
    void locationIfAllowed().then((found) => {
      location.current = found;
    });
    const index = firstMissingIndex(shots, doneShots());
    if (index === null) goToSubmit();
    else setStep({ kind: "shot", index });
  }

  function next(index: number) {
    if (fromSubmit) goToSubmit();
    else if (index + 1 >= shots.length) setStep({ kind: "damageAsk" });
    else setStep({ kind: "shot", index: index + 1 });
  }

  function back(index: number) {
    if (fromSubmit) goToSubmit();
    else if (index === 0) setStep({ kind: "welcome" });
    else setStep({ kind: "shot", index: index - 1 });
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
      setStep({ kind: "done", reference: done.reference });
    } catch (error) {
      const status = (error as { status?: unknown }).status;
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
    const previous = step.index > 0 ? shots[step.index - 1] : null;
    return (
      <ShotScreen
        key={shot.shotId}
        language={language}
        session={session}
        shot={shot}
        index={step.index}
        total={shots.length}
        previousPreview={
          previous ? session.view(previous.shotId, 1).previewUrl : null
        }
        onBack={() => back(step.index)}
        onBackToPrevious={() =>
          setStep({ kind: "shot", index: step.index - 1 })
        }
        onNext={() => next(step.index)}
      />
    );
  }

  if (step.kind === "damageAsk") {
    const positions = session.damagePositions();
    return (
      <DamageAskScreen
        language={language}
        count={positions.length}
        max={maxDamage}
        prior={state.priorDamage}
        onBack={() => setStep({ kind: "shot", index: shots.length - 1 })}
        onYes={() =>
          setStep({ kind: "damage", position: (positions.at(-1) ?? 0) + 1 })
        }
        onNo={goToSubmit}
      />
    );
  }

  if (step.kind === "damage") {
    return (
      <DamageScreen
        key={step.position}
        language={language}
        session={session}
        position={step.position}
        max={maxDamage}
        onBack={() =>
          fromSubmit ? goToSubmit() : setStep({ kind: "damageAsk" })
        }
        onAddAnother={() =>
          setStep({
            kind: "damage",
            position: (session.damagePositions().at(-1) ?? 0) + 1,
          })
        }
        onDone={goToSubmit}
      />
    );
  }

  if (step.kind === "submit") {
    const have = doneShots();
    return (
      <SubmitScreen
        language={language}
        session={session}
        shots={shots}
        damagePositions={session.damagePositions()}
        maxDamage={maxDamage}
        complete={shots.every(
          (shot) => !shot.required || have.has(shot.shotId),
        )}
        onBack={() => setStep({ kind: "damageAsk" })}
        onRetake={(index) => {
          setFromSubmit(true);
          setStep({ kind: "shot", index });
        }}
        onEditDamage={(position) => {
          setFromSubmit(true);
          setStep({ kind: "damage", position });
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
