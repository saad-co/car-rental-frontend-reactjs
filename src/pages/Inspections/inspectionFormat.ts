import texts from "../../i18n/inspection-i18n.json";
import extraTexts from "../../i18n/inspection-i18n-extra.json";

/**
 * Words for the staff pages of the vehicle photos (Module 3 chat 2). Staff read English, so the titles come from the English side
 * of the client's translation file, the same words the driver's page shows.
 */

/**
 * The 21 shot ids in the order the driver is guided through them: the client's 19, with the two side mirrors added next to the
 * front corner of their side (D112). The same order as `inspection_shots.position` in the database.
 */
export const SHOT_ORDER: string[] = [
  "EXT_DRIVER_SIDE",
  "EXT_LEFT_FRONT_CORNER",
  "EXT_LEFT_MIRROR",
  "TIRE_FRONT_LEFT",
  "EXT_FRONT",
  "EXT_WINDSHIELD",
  "EXT_RIGHT_FRONT_CORNER",
  "EXT_RIGHT_MIRROR",
  "TIRE_FRONT_RIGHT",
  "EXT_PASSENGER_SIDE",
  "EXT_RIGHT_REAR_CORNER",
  "TIRE_REAR_RIGHT",
  "EXT_REAR",
  "TRUNK_INTERIOR",
  "TRUNK_SPARE_JACK",
  "EXT_LEFT_REAR_CORNER",
  "TIRE_REAR_LEFT",
  "INT_ODOMETER",
  "INT_FUEL",
  "INT_FRONT_SEATS",
  "INT_REAR_SEATS",
];

/** Shot titles: the client's file, and our extra file for the two mirrors (D112). */
const SHOTS = {
  ...texts.en.shots,
  ...extraTexts.en.shots,
} as Record<string, { title: string } | undefined>;
const FUEL = texts.en.readings.fuel_levels as Record<
  string,
  string | undefined
>;

/** The client's title of a shot, or the id itself for one it does not know. */
export function shotTitle(shotId: string): string {
  return SHOTS[shotId]?.title ?? shotId;
}

/**
 * A photo's name on screen: the shot's title; "Left side mirror — damage close-up 2" for a close-up of a shot (D112); or
 * "Damage photo 2" for an old free-standing damage photo.
 */
export function photoTitle(photo: {
  shotId: string;
  position: number;
  parentShotId?: string | null;
}): string {
  if (photo.shotId !== "DAMAGE") return shotTitle(photo.shotId);
  return photo.parentShotId
    ? `${shotTitle(photo.parentShotId)} — damage close-up ${photo.position}`
    : `Damage photo ${photo.position}`;
}

/**
 * The driver's damage answer for a shot, in words: "No damage", "Damage: 2 close-ups", or null when there is no answer (an
 * inspection made before the per-shot question, D112, or one not finished).
 */
export function answerLabel(
  answer: boolean | null | undefined,
  closeUps: number,
): string | null {
  if (answer === null || answer === undefined) return null;
  if (!answer) return "No damage";
  return `Damage: ${closeUps} close-up${closeUps === 1 ? "" : "s"}`;
}

/** The fuel level in words ("3/4", "Full"), or a dash when it is not known. */
export function fuelLabel(level: string | null): string {
  if (level === null) return "—";
  return FUEL[level] ?? level;
}

/** The mileage with a thousands separator, or a dash. */
export function mileageLabel(miles: number | null): string {
  return miles === null ? "—" : `${miles.toLocaleString("en-US")} mi`;
}

/** Miles between the two readings, "1,001 mi driven", or a dash when a reading is missing. */
export function milesDrivenLabel(miles: number | null): string {
  if (miles === null) return "—";
  return `${miles.toLocaleString("en-US")} mi driven`;
}

/** The fuel change in eighths of a tank in words: "Same level", "4/8 of a tank less", "1/8 of a tank more"; a dash when unknown. */
export function fuelChangeLabel(eighths: number | null): string {
  if (eighths === null) return "—";
  if (eighths === 0) return "Same level";
  return `${Math.abs(eighths)}/8 of a tank ${eighths < 0 ? "less" : "more"}`;
}

/** Where the phone was, as "41.88000, -87.63000", or null when it was not shared. Both numbers or none. */
export function coordinatesLabel(
  lat: number | null,
  lng: number | null,
): string | null {
  if (lat === null || lng === null) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** The first characters of a SHA-256 fingerprint, enough to recognise it on screen. */
export function shortHash(sha256: string): string {
  return sha256.slice(0, 12);
}

/** The log line a staff member reads for one event, in words (the event's `meta` carries the details). */
export function eventLabel(event: {
  type: string;
  meta: Record<string, unknown> | null;
}): string {
  const meta = event.meta ?? {};
  switch (event.type) {
    case "created":
      return "Inspection made";
    case "link_issued":
      return meta.reason === "copy"
        ? "Fresh link made to copy (the old link stopped working)"
        : "Fresh link made for a text (the old link stopped working)";
    case "link_sent":
      return meta.textMode === "live"
        ? "Link texted to the driver"
        : "Link text saved, not sent (test mode)";
    case "opened":
      return "Driver opened the link";
    case "photo_uploaded": {
      const photo = {
        shotId: String(meta.shotId ?? ""),
        position: Number(meta.position ?? 1),
        parentShotId:
          typeof meta.parentShotId === "string" ? meta.parentShotId : null,
      };
      return `${photoTitle(photo)} ${meta.retake ? "retaken" : "uploaded"}`;
    }
    case "damage_answered":
      return `Driver answered ${meta.hasDamage ? "“damage”" : "“no damage”"} for ${shotTitle(String(meta.shotId ?? ""))}`;
    case "language_changed":
      return `Driver chose ${meta.language === "es" ? "Español" : "English"}`;
    case "submitted":
      return typeof meta.photos === "number"
        ? `Driver submitted (${meta.photos} photos)`
        : "Driver submitted";
    case "revoked":
      return "Link revoked";
    case "reviewed":
      return typeof meta.note === "string" && meta.note
        ? `Marked reviewed: ${meta.note}`
        : "Marked reviewed";
    case "flagged":
      return "Flagged for new damage";
    case "damage_marked":
      return `New damage marked (${shotTitle(String(meta.shotId ?? ""))}): ${String(meta.description ?? "")}`;
    case "damage_cleared":
      return `Damage cleared: ${String(meta.description ?? "")}`;
    case "damage_charged":
      return `Damage charged to the driver (${String(meta.ledgerRef ?? "ledger")})`;
    case "staff_note":
      return typeof meta.text === "string" ? meta.text : "Staff note";
    default:
      return event.type;
  }
}
