/** A required shot of the walk-around, as the API lists it. */
export interface ShotInfo {
  shotId: string;
  position: number;
  required: boolean;
}

/** The shots the driver is guided through, in order. */
export const ODOMETER_SHOT = "INT_ODOMETER";
export const FUEL_SHOT = "INT_FUEL";
export const DAMAGE_SHOT = "DAMAGE";

/** Which typed reading goes with a shot, if any: the mileage on the odometer shot, the fuel level on the fuel shot. */
export function readingOf(shotId: string): "odometer" | "fuel" | null {
  if (shotId === ODOMETER_SHOT) return "odometer";
  if (shotId === FUEL_SHOT) return "fuel";
  return null;
}

/**
 * Where to pick up: the index of the first required shot with no photo yet, or null when every required shot has one (then the
 * page goes on to the submit screen).
 */
export function firstMissingIndex(
  shots: ShotInfo[],
  have: ReadonlySet<string>,
): number | null {
  const index = shots.findIndex((s) => s.required && !have.has(s.shotId));
  return index === -1 ? null : index;
}

/**
 * The mileage typed from the odometer: digits only, a whole number, up to 7 digits (the server accepts up to 2,000,000).
 * @returns the number, or null when it is empty or not a valid mileage.
 */
export function parseMileage(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,7}$/.test(trimmed)) return null;
  const miles = Number(trimmed);
  return miles <= 2_000_000 ? miles : null;
}

/**
 * The size a photo is scaled down to so its longest side is at most `max` pixels, keeping its shape. A photo that is already
 * small enough keeps its size (never scaled up).
 */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Whole-number percent of `done` out of `total` (0 when there is nothing to do), for "Uploading photos… {percent}%". */
export function percent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.floor((done / total) * 100));
}
