import { formatUsPhone } from "../../utils";

/** The submission exactly as the website sent it (minus the bot-check token). */
export type Payload = Record<string, unknown>;

/** One label/value row in a tab. */
export interface FieldSpec {
  label: string;
  /** The payload keys this row shows. Listed so they never appear again under "Other". */
  keys: string[];
  /** The text to show, or null when nothing was submitted (the row is then hidden). */
  value: (payload: Payload) => string | null;
}

/** One tab of the application page and its rows, in display order. */
export interface TabSpec {
  id: string;
  label: string;
  fields: FieldSpec[];
}

/** Any submitted value as text: lists joined, true/false as Yes/No. Empty (null, "", []) is null. */
export function textOf(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const parts = value.map(textOf).filter((part) => part !== null);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value).trim();
  return text === "" ? null : text;
}

/** A row showing one payload key as submitted. */
const field = (label: string, key: string): FieldSpec => ({
  label,
  keys: [key],
  value: (p) => textOf(p[key]),
});

/** A row for the website's "yes" / "no" answers, shown as Yes / No. */
const yesNo = (label: string, key: string): FieldSpec => ({
  label,
  keys: [key],
  value: (p) => {
    const text = textOf(p[key]);
    if (text === "yes") return "Yes";
    if (text === "no") return "No";
    return text;
  },
});

/** The website's stored lease values. Only `corto` is confirmed (2026-10-11 test); others are shown as sent. */
const LEASE_LENGTHS: Record<string, string> = {
  corto: "Short term (1 to 3 weeks)",
};

/** A `YYYY-MM-DD` date as "Oct 12, 2026". Built from its parts, so no time zone can shift the day. */
function formatDay(text: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return text;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * Website fields the page never shows: the name (in the header), tracking (utm_*, gclid, fbclid), form
 * internals, and file details (shown in the Documents tab instead). `source` and `request_id` are in the side card.
 */
export const HIDDEN_KEYS = new Set([
  "first_name",
  "last_name",
  "request_id",
  "source",
  "submitted_at",
  "elapsed_ms",
  "locale",
  "captcha_status",
  "turnstile_token",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
]);

/** Contact, Driving, Rental: the applicant's answers, grouped like the website's form. */
export const ANSWER_TABS: TabSpec[] = [
  {
    id: "contact",
    label: "Contact",
    fields: [
      field("Email", "email"),
      {
        label: "Phone",
        keys: ["phone"],
        value: (p) => {
          const text = textOf(p.phone);
          if (text === null) return null;
          const digits = text.replace(/\D/g, "");
          return digits.length === 10 ? formatUsPhone(`+1${digits}`) : text;
        },
      },
      {
        label: "Address",
        keys: ["street", "apt", "city", "zip"],
        value: (p) => {
          const parts = [
            [textOf(p.street), textOf(p.apt)].filter(Boolean).join(", "),
            [textOf(p.city), textOf(p.zip)].filter(Boolean).join(" "),
          ].filter((part) => part !== "");
          return parts.length > 0 ? parts.join(", ") : null;
        },
      },
    ],
  },
  {
    id: "driving",
    label: "Driving",
    fields: [
      field("Age", "age"),
      field("Years driving", "years_driving"),
      field("Violations (last 4 years)", "violations"),
      field("Accidents (last 4 years)", "accidents"),
      field("Platforms", "platforms"),
      field("Driver rating", "driver_rating"),
      field("Earnings per week", "earnings"),
      field("Previous rental companies", "previous_companies"),
    ],
  },
  {
    id: "rental",
    label: "Rental",
    fields: [
      {
        label: "Start date",
        keys: ["start_date"],
        value: (p) => {
          const text = textOf(p.start_date);
          return text === null ? null : formatDay(text);
        },
      },
      {
        label: "Lease length",
        keys: ["duration"],
        value: (p) => {
          const text = textOf(p.duration);
          return text === null ? null : (LEASE_LENGTHS[text] ?? text);
        },
      },
      yesNo("Has first week + deposit", "has_startup_funds"),
      field("Capital", "capital"),
      yesNo("Has auto insurance", "has_insurance"),
      yesNo("Insured in the last 45 days", "has_insurance_last_45_days"),
      field("Vehicle preference", "vehicle_preference"),
      field("Referred by", "referred_by"),
    ],
  },
];

/** The upload fields, each shown as one Documents row (file name, or "Uploaded"). */
export const DOCUMENT_FIELDS: FieldSpec[] = [
  {
    label: "Driver's licence",
    keys: [
      "license_file_name",
      "has_license_file",
      "license_url",
      "license_storage_path",
      "license_upload_error",
    ],
    value: (p) =>
      textOf(p.license_file_name) ??
      (textOf(p.license_storage_path) ? "Uploaded" : null),
  },
  {
    label: "Rating screenshot",
    keys: [
      "rating_file_name",
      "has_rating_file",
      "rating_url",
      "rating_storage_path",
    ],
    value: (p) =>
      textOf(p.rating_file_name) ??
      (textOf(p.rating_storage_path) ? "Uploaded" : null),
  },
  {
    label: "Proof of earnings",
    keys: [
      "has_earnings_file",
      "earnings_url",
      "earnings_storage_path",
      "earnings_count",
    ],
    value: (p) => {
      const count = Number(p.earnings_count ?? 0);
      if (count > 0) return `${count} file${count === 1 ? "" : "s"}`;
      return textOf(p.earnings_storage_path) ? "Uploaded" : null;
    },
  },
];

/** Every key some tab, the Documents rows or the hidden list already accounts for. */
const PLACED_KEYS = new Set([
  ...HIDDEN_KEYS,
  ...ANSWER_TABS.flatMap((tab) => tab.fields.flatMap((f) => f.keys)),
  ...DOCUMENT_FIELDS.flatMap((f) => f.keys),
]);

/**
 * Rows for fields the page does not know yet (e.g. a question the website adds later), so nothing
 * submitted is ever silently hidden. Empty ones are left out like everywhere else.
 */
export function otherFields(payload: Payload): FieldSpec[] {
  return Object.keys(payload)
    .filter((key) => !PLACED_KEYS.has(key))
    .map((key) => {
      const words = key.replace(/_/g, " ");
      return field(words.charAt(0).toUpperCase() + words.slice(1), key);
    });
}
