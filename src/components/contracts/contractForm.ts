import type {
  ContractDraft,
  ContractInput,
  ContractNumbersInput,
} from "../../api/contracts.queries";
import { centsToDollars, chicagoToday, parseDollarsToCents } from "../../utils";

/** The most the API accepts for a rate or a charge: $10,000 in cents. */
const MAX_CENTS = 1_000_000;

/** The most the API accepts for a purchase option price: what its database column holds, in cents. */
const MAX_PURCHASE_OPTION_CENTS = 2_147_483_647;

/** Term in months the API accepts, and the client's usual one. */
const MIN_TERM = 1;
const MAX_TERM = 60;
const DEFAULT_TERM = "18";

/** The money boxes after the total rate: key in the form, matching `…Cents` field of the API, and label. */
export const ONE_TIME_CHARGES = [
  ["securityDeposit", "Security deposit"],
  ["documentationFee", "Documentation fee"],
  ["insuranceStartFee", "Insurance policy start fee"],
  ["otherOneTime", "Other"],
  ["holdVehicle", "Hold vehicle payment"],
] as const;

export const RECURRING_CHARGES = [
  ["excessMileage", "Excess mileage (per mile)"],
  ["insuranceExcess", "Insurance excess (per month)"],
  ["otherRecurring", "Other"],
] as const;

export type ChargeKey =
  (typeof ONE_TIME_CHARGES)[number][0] | (typeof RECURRING_CHARGES)[number][0];

/** The contract's text details (step 2): key in the form, which is also the API's field name. */
export type DetailKey =
  | "vehicleModel"
  | "vehicleVin"
  | "vehiclePlate"
  | "vehiclePlateState"
  | "lesseeAddress"
  | "licenseNumber"
  | "licenseState";

/** Every box of the contract form, as the text typed in it (money in dollars). */
export interface ContractFormValues
  extends Record<ChargeKey, string>, Record<DetailKey, string> {
  schedule: ContractInput["schedule"];
  total: string;
  startDate: string;
  term: string;
  /** The chosen company's id; "" while none is chosen. */
  companyId: string;
  /** Purchase option price in dollars; empty when not set. */
  purchaseOption: string;
  /** Date of birth as `YYYY-MM-DD`; empty when not set. */
  dateOfBirth: string;
}

/** What is wrong with each box, by box name; a box that is fine has no entry. */
export type ContractFormProblems = Partial<
  Record<keyof ContractFormValues, string>
>;

/** The text of a money box: nothing for 0 (the box shows its placeholder), else dollars. */
const dollarsText = (cents: number) =>
  cents === 0 ? "" : centsToDollars(cents);

/** The boxes' starting text: the saved draft's values, or a weekly contract starting today with an 18 month term. */
export function valuesFromDraft(
  draft: ContractDraft | null,
): ContractFormValues {
  if (!draft) {
    return {
      schedule: "weekly",
      total: "",
      startDate: chicagoToday(),
      term: DEFAULT_TERM,
      securityDeposit: "",
      documentationFee: "",
      insuranceStartFee: "",
      otherOneTime: "",
      holdVehicle: "",
      excessMileage: "",
      insuranceExcess: "",
      otherRecurring: "",
      companyId: "",
      vehicleModel: "",
      vehicleVin: "",
      vehiclePlate: "",
      vehiclePlateState: "",
      purchaseOption: "",
      lesseeAddress: "",
      licenseNumber: "",
      licenseState: "",
      dateOfBirth: "",
    };
  }
  return {
    schedule: draft.schedule,
    total: centsToDollars(draft.totalRateCents),
    startDate: draft.startDate,
    term: String(draft.termMonths),
    securityDeposit: dollarsText(draft.securityDepositCents),
    documentationFee: dollarsText(draft.documentationFeeCents),
    insuranceStartFee: dollarsText(draft.insuranceStartFeeCents),
    otherOneTime: dollarsText(draft.otherOneTimeCents),
    holdVehicle: dollarsText(draft.holdVehicleCents),
    excessMileage: dollarsText(draft.excessMileageCents),
    insuranceExcess: dollarsText(draft.insuranceExcessCents),
    otherRecurring: dollarsText(draft.otherRecurringCents),
    companyId: draft.companyId ?? "",
    vehicleModel: draft.vehicleModel ?? "",
    vehicleVin: draft.vehicleVin ?? "",
    vehiclePlate: draft.vehiclePlate ?? "",
    vehiclePlateState: draft.vehiclePlateState ?? "",
    purchaseOption:
      draft.purchaseOptionCents == null
        ? ""
        : centsToDollars(draft.purchaseOptionCents),
    lesseeAddress: draft.lesseeAddress ?? "",
    licenseNumber: draft.licenseNumber ?? "",
    licenseState: draft.licenseState ?? "",
    dateOfBirth: draft.dateOfBirth ?? "",
  };
}

/** A charge box: empty or zero is 0, otherwise dollars up to $10,000. Null when the text is not an amount. */
function readCharge(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "" || /^\$?0+(\.0{1,2})?$/.test(trimmed)) return 0;
  const cents = parseDollarsToCents(trimmed);
  return cents !== null && cents <= MAX_CENTS ? cents : null;
}

/** A text box as the API takes it: what was typed, trimmed, or null when the box is empty. */
const textOrNull = (text: string): string | null => text.trim() || null;

/**
 * Reads the boxes into what the API takes (whole cents, by splitting the text, never through a float). `input` is the
 * whole body of a save; `numbersInput` is only the part the numbers are calculated from (so typing a vehicle detail never
 * asks for new numbers). Each is null while anything it needs is missing or wrong; `problems` says which box and why,
 * for the boxes that have text in them.
 */
export function readContractForm(values: ContractFormValues): {
  input: ContractInput | null;
  numbersInput: ContractNumbersInput | null;
  problems: ContractFormProblems;
} {
  const problems: ContractFormProblems = {};

  const total = parseDollarsToCents(values.total);
  if (total === null || total > MAX_CENTS) {
    if (values.total.trim() !== "") {
      problems.total = "Enter an amount from $0.01 to $10,000.00.";
    }
  }

  const startDateOk = /^\d{4}-\d{2}-\d{2}$/.test(values.startDate);

  const termOk =
    /^\d+$/.test(values.term.trim()) &&
    Number(values.term) >= MIN_TERM &&
    Number(values.term) <= MAX_TERM;
  if (!termOk) problems.term = "Enter a whole number from 1 to 60.";

  const charges = {} as Record<ChargeKey, number>;
  let chargesOk = true;
  for (const [key] of [...ONE_TIME_CHARGES, ...RECURRING_CHARGES]) {
    const cents = readCharge(values[key]);
    if (cents === null) {
      problems[key] = "Enter an amount from $0 to $10,000.00.";
      chargesOk = false;
    } else {
      charges[key] = cents;
    }
  }

  // The purchase option: empty means not set; zero is allowed (the shared parser refuses it, like readCharge's case).
  let purchaseOptionCents: number | null = null;
  const purchaseText = values.purchaseOption.trim();
  if (purchaseText !== "") {
    const cents = /^\$?0+(\.0{1,2})?$/.test(purchaseText)
      ? 0
      : parseDollarsToCents(purchaseText);
    if (cents === null || cents > MAX_PURCHASE_OPTION_CENTS) {
      problems.purchaseOption = "Enter an amount, for example 25000.00.";
    } else {
      purchaseOptionCents = cents;
    }
  }

  const complete =
    total !== null && total <= MAX_CENTS && startDateOk && termOk && chargesOk;
  if (!complete) return { input: null, numbersInput: null, problems };
  const numbersInput: ContractNumbersInput = {
    schedule: values.schedule,
    totalRateCents: total,
    startDate: values.startDate,
    termMonths: Number(values.term),
    securityDepositCents: charges.securityDeposit,
    documentationFeeCents: charges.documentationFee,
    insuranceStartFeeCents: charges.insuranceStartFee,
    otherOneTimeCents: charges.otherOneTime,
    holdVehicleCents: charges.holdVehicle,
    excessMileageCents: charges.excessMileage,
    insuranceExcessCents: charges.insuranceExcess,
    otherRecurringCents: charges.otherRecurring,
  };
  if (problems.purchaseOption !== undefined) {
    return { input: null, numbersInput, problems };
  }
  return {
    input: {
      ...numbersInput,
      companyId: values.companyId || null,
      vehicleModel: textOrNull(values.vehicleModel),
      vehicleVin: textOrNull(values.vehicleVin),
      vehiclePlate: textOrNull(values.vehiclePlate),
      vehiclePlateState: textOrNull(values.vehiclePlateState),
      purchaseOptionCents,
      lesseeAddress: textOrNull(values.lesseeAddress),
      licenseNumber: textOrNull(values.licenseNumber),
      licenseState: textOrNull(values.licenseState),
      dateOfBirth: textOrNull(values.dateOfBirth),
    },
    numbersInput,
    problems,
  };
}
