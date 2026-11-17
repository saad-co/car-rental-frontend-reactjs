import clientTexts from "../../i18n/inspection-i18n.json";
import extraTexts from "../../i18n/inspection-i18n-extra.json";

/** The two languages of the vehicle-photo page. */
export type Language = "en" | "es";

/**
 * Every text of the page: the client's file exactly as shipped (`inspection-i18n.json`), plus our few extra words under `x`
 * (`inspection-i18n-extra.json`).
 */
const MESSAGES = {
  en: { ...clientTexts.en, x: extraTexts.en },
  es: { ...clientTexts.es, x: extraTexts.es },
};

type Messages = typeof MESSAGES.en;

/** `"welcome.start_button_check_in"`-style paths to every text, so a mistyped key is a type error, not a blank on a phone. */
type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Paths<Messages>;

/** Values for the `{placeholders}` of a text. */
export type Params = Record<string, string | number>;

/** The text at a dotted path, or undefined. */
function lookup(language: Language, path: string): string | undefined {
  let node: unknown = MESSAGES[language];
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * A text in the chosen language with its `{placeholders}` filled in. A placeholder with no value is left as written, so a
 * missing value is visible instead of silently empty.
 */
export function t(
  language: Language,
  key: MessageKey,
  params: Params = {},
): string {
  const text = lookup(language, key) ?? lookup("en", key) ?? key;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/**
 * The language to start in (the client's file: the phone's language, `es` if it starts with "es", otherwise English), unless the
 * driver already chose one on this phone.
 */
export function pickLanguage(
  saved: string | null,
  phoneLanguage: string | undefined,
): Language {
  if (saved === "en" || saved === "es") return saved;
  return phoneLanguage?.toLowerCase().startsWith("es") ? "es" : "en";
}

/** The title and instruction of a required shot, in the chosen language. */
export function shotText(
  language: Language,
  shotId: string,
): { title: string; instruction: string } {
  const shots = MESSAGES[language].shots as Record<
    string,
    { title: string; instruction: string } | undefined
  >;
  const shot = shots[shotId] ?? (MESSAGES.en.shots as typeof shots)[shotId];
  return shot ?? { title: shotId, instruction: "" };
}

/** The words for a fuel level (`"1_8"`, `"full"`...). */
export function fuelText(language: Language, level: string): string {
  const levels = MESSAGES[language].readings.fuel_levels as Record<
    string,
    string | undefined
  >;
  return levels[level] ?? level;
}

/** The vehicle as the page shows it: what we know of it. */
export interface VehicleInfo {
  model: string;
  plate: string | null;
  vinLast4: string | null;
}

/**
 * The line that lets the driver confirm they are at the right car. The client's text is
 * `{year} {make} {model} · Plate {plate} · VIN ending {vin_last4}`, but our contract keeps one typed text for year, make and
 * model, so that text takes the place of the first part (B140). A plate or a VIN end we do not have drops its part instead of
 * leaving a blank.
 */
export function vehicleLine(language: Language, vehicle: VehicleInfo): string {
  const template = MESSAGES[language].welcome.vehicle_line;
  // The first part is `{year} {make} {model}`: the model text takes its place as a whole.
  const [, ...rest] = template.split(" · ");
  const parts = [vehicle.model.trim()];
  for (const part of rest) {
    const value = part.includes("{plate}")
      ? vehicle.plate
      : part.includes("{vin_last4}")
        ? vehicle.vinLast4
        : "x";
    if (!value) continue;
    parts.push(part.replace("{plate}", value).replace("{vin_last4}", value));
  }
  return parts.join(" · ");
}
