import type { AliasType } from "../../api/drivers.queries";
import { chicagoToday } from "../../utils";
import { fileProblem, phoneDigits } from "../Applications/websiteForm";

/**
 * The "Add driver" form (D85): the fields the client asked for (Saad's message, 2026-10-28). Only the name, email and
 * phone are required, because the driver table needs them; everything else may be left empty. The API checks again.
 */

/** One payment method and the handle or name the driver pays from; saved as a payment alias. */
export interface PaymentRow {
  /** Only for React's `key` and for removing the row. */
  key: string;
  type: AliasType;
  value: string;
}

/** Every text answer, as typed. "" means not answered. */
export interface DriverFormValues {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email: string;
  /** `YYYY-MM-DD` or "". */
  dateOfBirth: string;
  hasInsurance: "" | "yes" | "no";
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
}

export const EMPTY_DRIVER_VALUES: DriverFormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  hasInsurance: "",
  street: "",
  apt: "",
  city: "",
  state: "",
  zip: "",
};

export interface DriverFormFiles {
  license: File | null;
  earnings: File | null;
}

export type DriverFormErrors = Partial<
  Record<keyof DriverFormValues | keyof DriverFormFiles, string>
>;

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

/**
 * The age on `today` for a birth date, both `YYYY-MM-DD`; null when the date is not a real day or is in the future. Shown
 * under the date of birth while typing; the saved age is worked out by the API.
 */
export function ageOn(
  birthDate: string,
  today: string = chicagoToday(),
): number | null {
  if (!isRealDay(birthDate) || birthDate > today) return null;
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [year, month, day] = today.split("-").map(Number);
  const birthdayPassed =
    month > birthMonth || (month === birthMonth && day >= birthDay);
  return year - birthYear - (birthdayPassed ? 0 : 1);
}

/** A message per field or file that is not acceptable; empty when the form can be sent. */
export function validate(
  values: DriverFormValues,
  files: DriverFormFiles,
): DriverFormErrors {
  const errors: DriverFormErrors = {};
  if (values.firstName.trim() === "") errors.firstName = "First name required";
  if (values.lastName.trim() === "") errors.lastName = "Last name required";
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim()))
    errors.email = "Invalid email address";
  if (phoneDigits(values.phone).length !== 10) errors.phone = "Need 10 digits";
  if (values.dateOfBirth !== "" && ageOn(values.dateOfBirth) === null)
    errors.dateOfBirth = "Pick a day in the past";
  for (const kind of ["license", "earnings"] as const) {
    const problem = fileProblem(files[kind]);
    if (problem) errors[kind] = problem;
  }
  return errors;
}

/**
 * The multipart body of `POST /drivers`: every answer as text, the payment rows as one JSON list (rows with nothing typed
 * are left out), the files as `licenseFile` and `earningsFile`. Empty optional answers are not sent.
 */
export function toFormData(
  values: DriverFormValues,
  files: DriverFormFiles,
  payments: PaymentRow[],
): FormData {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value.trim() !== "") body.append(key, value.trim());
  }
  const aliases = payments
    .filter((row) => row.value.trim() !== "")
    .map((row) => ({ type: row.type, value: row.value.trim() }));
  if (aliases.length > 0) body.append("aliases", JSON.stringify(aliases));
  if (files.license) body.append("licenseFile", files.license);
  if (files.earnings) body.append("earningsFile", files.earnings);
  return body;
}
