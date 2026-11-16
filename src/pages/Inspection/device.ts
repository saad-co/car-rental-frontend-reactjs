import type { Language } from "./i18n";

const LANGUAGE_KEY = "gonzo.inspection.language";

/** The language this driver chose on this phone, if any. localStorage can be blocked (private window): then there is none. */
export function savedLanguage(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

export function saveLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Not kept on this phone; the choice is still saved on the driver record and used for this visit.
  }
}

/** The browser and phone as the browser reports them, kept with the inspection for disputes (500 characters at most). */
export function deviceInfo(): string {
  return navigator.userAgent.slice(0, 500);
}

/**
 * Where the phone is, but only if the driver already allowed location for this site: the page never asks (spec: no permission
 * prompt for location). Resolves to null when not allowed, not known, or the browser has no way to tell.
 */
export async function locationIfAllowed(): Promise<{
  lat: number;
  lng: number;
} | null> {
  try {
    if (!navigator.geolocation || !navigator.permissions) return null;
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state !== "granted") return null;
    return await new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60_000 },
      ),
    );
  } catch {
    return null;
  }
}
