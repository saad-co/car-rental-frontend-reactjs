import type { ApplicationDetail } from "../../api/applications.queries";
import type {
  ContractCompany,
  ContractDraft,
  LicenceFullDetails,
} from "../../api/contracts.queries";
import type { DriverDetail } from "../../api/drivers.queries";
import {
  ANSWER_TABS,
  otherFields,
} from "../../pages/Applications/applicationFields";
import { formatCents, formatDay, formatUsPhone } from "../../utils";
import { ALIAS_TYPE_LABEL } from "../payments/paymentLabels";

/** One copyable value: what it is, and the text that is shown and copied. */
export interface DataRow {
  label: string;
  value: string;
}

/** A group of rows under a heading, e.g. "Contact". */
export interface DataSection {
  title: string;
  rows: DataRow[];
}

/** What the "Driver data" card is built from: everything the driver page already loads (D116). */
export interface DriverDataSources {
  driver: DriverDetail;
  /** The application the driver came from; null when added directly (D85) or not loaded yet. */
  application: ApplicationDetail | null;
  /** The current contract (draft or last sent); null when there is none. */
  contract: ContractDraft | null;
  /** The companies, to show the contract's Lessor by name. */
  companies: ContractCompany[];
  /** Leave money out (investor-demo mode, D99). */
  hideMoney: boolean;
}

/** Rows with an empty value are left out: there is nothing to copy. */
function rows(pairs: [string, string | null | undefined][]): DataRow[] {
  return pairs.flatMap(([label, value]) => {
    const text = value?.trim();
    return text ? [{ label, value: text }] : [];
  });
}

/** A yes / no / unknown answer as text. */
function yesNo(value: boolean | null): string | null {
  return value === null ? null : value ? "Yes" : "No";
}

/**
 * The card's sections, in display order. Empty values are left out, and a section with no values at all is left out,
 * so every row shown can be copied. Values are formatted as on the rest of the page (dates "Oct 17, 2026", phone
 * "(312) 555-0100", money "$1,234.00").
 */
export function buildDriverDataSections({
  driver,
  application,
  contract,
  companies,
  hideMoney,
}: DriverDataSources): DataSection[] {
  const p = driver.profile;
  const fullName = [driver.firstName, p.middleName, driver.lastName]
    .filter(Boolean)
    .join(" ");
  const sections: DataSection[] = [
    {
      title: "Contact",
      rows: rows([
        ["Full name", fullName],
        ["First name", driver.firstName],
        ["Middle name", p.middleName],
        ["Last name", driver.lastName],
        ["Email", driver.email],
        ["Phone", formatUsPhone(driver.phone)],
      ]),
    },
    {
      title: "Profile",
      rows: rows([
        ["Street", p.street],
        ["Apartment", p.apt],
        ["City", p.city],
        ["State", p.state],
        ["ZIP", p.zip],
        ["Date of birth", p.dateOfBirth && formatDay(p.dateOfBirth)],
        ["Age", p.age === null ? null : String(p.age)],
        ["Auto insurance", yesNo(p.hasInsurance)],
        ["Language", p.preferredLanguage === "es" ? "Español" : "English"],
      ]),
    },
    {
      title: "Payment aliases",
      rows: driver.aliases.map((alias) => ({
        label: ALIAS_TYPE_LABEL[alias.type],
        value: alias.value,
      })),
    },
  ];

  if (application) {
    const payload = application.payload;
    const fields = [
      ...ANSWER_TABS.flatMap((tab) => tab.fields),
      ...otherFields(payload),
    ];
    sections.push({
      title: "Application answers",
      rows: rows(fields.map((field) => [field.label, field.value(payload)])),
    });
  }

  if (contract) {
    const company = companies.find((c) => c.id === contract.companyId);
    const money = (cents: number) => (hideMoney ? null : formatCents(cents));
    sections.push({
      title: "Contract and vehicle",
      rows: rows([
        ["Company", company?.name],
        ["Vehicle", contract.vehicleModel],
        ["VIN", contract.vehicleVin],
        ["Plate", contract.vehiclePlate],
        ["Plate state", contract.vehiclePlateState],
        ["Start date", formatDay(contract.startDate)],
        [
          "Term",
          `${contract.termMonths} month${contract.termMonths === 1 ? "" : "s"}`,
        ],
        ["Schedule", contract.schedule === "daily" ? "Daily" : "Weekly"],
        ["Rate", money(contract.totalRateCents)],
        ["Security deposit", money(contract.securityDepositCents)],
        ["Licence number", contract.licenseNumber],
        ["Licence state", contract.licenseState],
      ]),
    });
  }

  return sections.filter((section) => section.rows.length > 0);
}

/** The title of the licence section, so the card can put its button next to it. */
export const LICENCE_SECTION_TITLE = "Licence (read by AI)";

/** What the AI read from the licence front (D116), as rows; dates formatted like the rest of the card. */
export function licenceSection(licence: LicenceFullDetails): DataSection {
  const day = (value: string | null) => value && formatDay(value);
  return {
    title: LICENCE_SECTION_TITLE,
    rows: rows([
      ["Full name", licence.fullName],
      ["Address", licence.address],
      ["Licence number", licence.licenseNumber],
      ["State", licence.licenseState],
      ["Class", licence.licenseClass],
      ["Date of birth", day(licence.dateOfBirth)],
      ["Issue date", day(licence.issueDate)],
      ["Expiry date", day(licence.expiryDate)],
      ["Sex", licence.sex],
      ["Height", licence.height],
      ["Eyes", licence.eyeColor],
      ["Restrictions", licence.restrictions],
      ["Endorsements", licence.endorsements],
      ["Document number (DD)", licence.documentNumber],
    ]),
  };
}

/** All sections as plain text for "Copy all": a heading line per section, then one "Label: value" line per row. */
export function copyAllText(sections: DataSection[]): string {
  return sections
    .map((section) =>
      [
        section.title,
        ...section.rows.map((row) => `${row.label}: ${row.value}`),
      ].join("\n"),
    )
    .join("\n\n");
}
