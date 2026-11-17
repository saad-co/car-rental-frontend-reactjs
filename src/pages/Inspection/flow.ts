/** A required shot of the walk-around, as the API lists it. */
export interface ShotInfo {
  shotId: string;
  position: number;
  required: boolean;
}

/** The fuel shot: it shows a sample gauge so the driver knows what to photograph (D112). */
export const FUEL_SHOT = "INT_FUEL";
/** The API's shot id of a damage close-up. */
export const DAMAGE_SHOT = "DAMAGE";

/**
 * Inside the page, a damage close-up of a shot lives in its own photo slot, named `DAMAGE@<shot>` (e.g. `DAMAGE@EXT_FRONT`), so
 * the close-ups of different shots never share a slot. The API gets `DAMAGE` with `parentShotId` (see `apiShotOf`).
 */
export const closeUpSlot = (parentShotId: string) =>
  `${DAMAGE_SHOT}@${parentShotId}`;

/** What the API calls a page slot: the shot itself, or `DAMAGE` with the shot it belongs to. */
export function apiShotOf(slotShotId: string): {
  shotId: string;
  parentShotId?: string;
} {
  const prefix = `${DAMAGE_SHOT}@`;
  return slotShotId.startsWith(prefix)
    ? { shotId: DAMAGE_SHOT, parentShotId: slotShotId.slice(prefix.length) }
    : { shotId: slotShotId };
}

/** Where the walk-around stands for one shot: take its photo, answer its damage question, or add its first close-up. */
export type ResumePoint =
  | { kind: "shot"; index: number }
  | { kind: "ask"; index: number }
  | { kind: "closeUp"; index: number };

/**
 * Where to pick up (D112): the first required shot that has no photo, or no damage answer, or "yes" with no close-up yet. Null
 * when every shot is complete (then the page goes on to the submit screen).
 */
export function resumePoint(
  shots: ShotInfo[],
  haveShot: ReadonlySet<string>,
  answers: ReadonlyMap<string, boolean>,
  closeUpCount: (shotId: string) => number,
): ResumePoint | null {
  for (const [index, shot] of shots.entries()) {
    if (!shot.required) continue;
    if (!haveShot.has(shot.shotId)) return { kind: "shot", index };
    const answer = answers.get(shot.shotId);
    if (answer === undefined) return { kind: "ask", index };
    if (answer && closeUpCount(shot.shotId) === 0) {
      return { kind: "closeUp", index };
    }
  }
  return null;
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
