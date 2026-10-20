/**
 * The questions of the gonzocar.com application form and their rules (D68), read from the live site on 2026-10-19.
 * The lists are the same as the backend's `src/applications/manual/website-form.ts`: the API checks them again, so
 * a mismatch shows up as a plain error from the server rather than a wrong save.
 */

/** `value` is what the website stores; `label` what is shown. */
export interface Choice {
  value: string;
  label: string;
}

const same = (values: readonly string[]): Choice[] =>
  values.map((value) => ({ value, label: value }));

export const YEARS_DRIVING: Choice[] = same([
  "Less than 1 year",
  "1 to 2 years",
  "3 to 5 years",
  "More than 5 years",
]);

/** The website stores these codes and shows the words. */
export const DURATIONS: Choice[] = [
  { value: "corto", label: "Short term (1 to 3 weeks)" },
  { value: "mediano", label: "Medium term (more than 1 month)" },
  { value: "largo", label: "Long term (more than 3 months)" },
];

export const PLATFORMS: readonly string[] = [
  "Uber",
  "Lyft",
  "DoorDash",
  "Postmates",
  "Roadie",
  "Other",
];

export const YES_NO: Choice[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

/** Violations and accidents in the last 4 years: the website offers 0, 1, 2 and 3+. */
export const COUNTS: Choice[] = same(["0", "1", "2", "3+"]);

export const MIN_AGE = 25;
/** Per file, as the website and the API. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_ACCEPT = "image/jpeg,image/png,application/pdf";
export const FILE_MESSAGE = "Only JPG, PNG or PDF files, at most 10 MB.";

/** The three document slots of the form. */
export type DocumentKind = "license" | "rating" | "earnings";

export interface FormFiles {
  license: File | null;
  rating: File | null;
  earnings: File | null;
}

/** Every text answer, as typed. Choices hold the stored `value`; "" means not answered. */
export interface FormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  apt: string;
  city: string;
  zip: string;
  age: string;
  years_driving: string;
  violations: string;
  accidents: string;
  platforms: string[];
  driver_rating: string;
  earnings: string;
  previous_companies: string;
  referred_by: string;
  start_date: string;
  duration: string;
  has_startup_funds: string;
  capital: string;
  has_insurance: string;
  has_insurance_last_45_days: string;
}

export const EMPTY_VALUES: FormValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  street: "",
  apt: "",
  city: "",
  zip: "",
  age: "",
  years_driving: "",
  violations: "",
  accidents: "",
  platforms: [],
  driver_rating: "",
  earnings: "",
  previous_companies: "",
  referred_by: "",
  start_date: "",
  duration: "",
  has_startup_funds: "",
  capital: "",
  has_insurance: "",
  has_insurance_last_45_days: "",
};

/** A message per field or file that is not acceptable; empty when the form can be sent. */
export type FormErrors = Partial<
  Record<keyof FormValues | DocumentKind, string>
>;

/** The phone's digits, without a leading US country code. */
export function phoneDigits(text: string): string {
  const digits = text.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
}

/** True for a real calendar day written `YYYY-MM-DD` (no 2026-02-30). */
function isRealDay(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** What is wrong with one chosen file, or null. Checked by size and name here; the API checks the real content. */
export function fileProblem(file: File | null): string | null {
  if (!file) return null;
  if (file.size === 0 || file.size > MAX_FILE_BYTES) return FILE_MESSAGE;
  return /\.(jpe?g|png|pdf)$/i.test(file.name) ? null : FILE_MESSAGE;
}

/** The website's rules, in the website's words where it has them. The API checks all of them again. */
export function validate(values: FormValues, files: FormFiles): FormErrors {
  const errors: FormErrors = {};
  const required = (key: keyof FormValues, message: string) => {
    const value = values[key];
    if (typeof value === "string" && value.trim() === "") errors[key] = message;
  };
  required("first_name", "First name required");
  required("last_name", "Last name required");
  required("street", "Address required");
  required("city", "City required");
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim()))
    errors.email = "Invalid email address";
  if (phoneDigits(values.phone).length !== 10) errors.phone = "Need 10 digits";
  if (!/^\d{5}$/.test(values.zip.trim())) errors.zip = "Invalid ZIP code";
  if (!/^\d{1,3}$/.test(values.age.trim()) || Number(values.age) < MIN_AGE)
    errors.age = "Must be 25 or older";
  required("years_driving", "Pick an option");
  required("violations", "Pick an option");
  required("accidents", "Pick an option");
  if (values.platforms.length === 0) errors.platforms = "Pick at least one app";
  if (!isRealDay(values.start_date)) errors.start_date = "Pick a date";
  required("duration", "Pick a duration");
  required("has_startup_funds", "Pick an option");
  // Asked, and then required, only when the first week and deposit are not covered.
  if (
    values.has_startup_funds === "no" &&
    !/^\d{1,7}(\.\d{1,2})?$/.test(values.capital.trim())
  )
    errors.capital = "Enter an amount in USD, like 400";
  required("has_insurance", "Pick an option");
  required("has_insurance_last_45_days", "Pick an option");

  if (!files.license) errors.license = "Upload a photo of the licence";
  for (const kind of ["license", "rating", "earnings"] as const) {
    const problem = fileProblem(files[kind]);
    if (problem) errors[kind] = problem;
  }
  return errors;
}

/**
 * The multipart body of `POST /applications/manual`: every answer as text (`platforms` once per app), the files under
 * the `*_file` names. Empty optional answers are left out.
 */
export function toFormData(
  requestId: string,
  values: FormValues,
  files: FormFiles,
): FormData {
  const body = new FormData();
  body.append("request_id", requestId);
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) body.append(key, item);
    } else if (value.trim() !== "") {
      // The amount belongs to the "no" answer only.
      if (key === "capital" && values.has_startup_funds !== "no") continue;
      body.append(key, value.trim());
    }
  }
  if (files.license) body.append("license_file", files.license);
  if (files.rating) body.append("rating_file", files.rating);
  if (files.earnings) body.append("earnings_file", files.earnings);
  return body;
}
