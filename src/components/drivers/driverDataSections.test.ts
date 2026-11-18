import { describe, expect, it } from "vitest";
import type { ApplicationDetail } from "../../api/applications.queries";
import type { ContractDraft } from "../../api/contracts.queries";
import type { DriverDetail } from "../../api/drivers.queries";
import {
  buildDriverDataSections,
  copyAllText,
  licenceSection,
  type DriverDataSources,
} from "./driverDataSections";

const driver = {
  id: "d1",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "+13125550100",
  applicationId: "a1",
  aliases: [
    { id: "x1", type: "zelle", value: "JANE DOE", source: "manual" },
    { id: "x2", type: "cashapp", value: "$janedoe", source: "manual" },
  ],
  profile: {
    middleName: null,
    street: "12 Main St",
    apt: "",
    city: "Chicago",
    state: "IL",
    zip: "60601",
    dateOfBirth: "1990-04-30",
    age: 36,
    hasInsurance: true,
    preferredLanguage: "en",
  },
} as unknown as DriverDetail;

const application = {
  payload: {
    years_driving: 8,
    platforms: ["Uber", "Lyft"],
    has_insurance: "no",
    favourite_colour: "blue",
    utm_source: "google",
    violations: null,
  },
} as unknown as ApplicationDetail;

const contract = {
  companyId: "c1",
  vehicleModel: "2020 Toyota Prius",
  vehicleVin: "JT123",
  vehiclePlate: "AB 123",
  vehiclePlateState: "IL",
  startDate: "2026-11-01",
  termMonths: 12,
  schedule: "weekly",
  totalRateCents: 35000,
  securityDepositCents: 50000,
  licenseNumber: null,
  licenseState: null,
} as unknown as ContractDraft;

const base: DriverDataSources = {
  driver,
  application,
  contract,
  companies: [{ id: "c1", name: "Gonzo Illinois LLC", address: "x" }],
  hideMoney: false,
};

const section = (sources: DriverDataSources, title: string) =>
  buildDriverDataSections(sources).find((s) => s.title === title);

describe("buildDriverDataSections", () => {
  it("lists contact and profile values, formatted as on the page, and leaves empty ones out", () => {
    const contact = section(base, "Contact")!;
    expect(contact.rows).toContainEqual({
      label: "Full name",
      value: "Jane Doe",
    });
    expect(contact.rows).toContainEqual({
      label: "Phone",
      value: "(312) 555-0100",
    });
    expect(contact.rows.map((r) => r.label)).not.toContain("Middle name");
    const profile = section(base, "Profile")!;
    expect(profile.rows).toContainEqual({
      label: "Date of birth",
      value: "Apr 30, 1990",
    });
    expect(profile.rows.map((r) => r.label)).not.toContain("Apartment");
  });

  it("shows the application's answers with the application page's labels, unknown questions too, never tracking keys", () => {
    const rows = section(base, "Application answers")!.rows;
    expect(rows).toContainEqual({ label: "Years driving", value: "8" });
    expect(rows).toContainEqual({ label: "Platforms", value: "Uber, Lyft" });
    expect(rows).toContainEqual({ label: "Has auto insurance", value: "No" });
    expect(rows).toContainEqual({ label: "Favourite colour", value: "blue" });
    expect(rows.map((r) => r.value)).not.toContain("google");
    expect(rows.map((r) => r.label)).not.toContain("Violations (last 4 years)");
  });

  it("leaves out the application and contract sections when there are none", () => {
    const titles = buildDriverDataSections({
      ...base,
      application: null,
      contract: null,
    }).map((s) => s.title);
    expect(titles).toEqual(["Contact", "Profile", "Payment aliases"]);
  });

  it("names the contract's company and shows money unless money is hidden (demo mode)", () => {
    const rows = section(base, "Contract and vehicle")!.rows;
    expect(rows).toContainEqual({
      label: "Company",
      value: "Gonzo Illinois LLC",
    });
    expect(rows).toContainEqual({ label: "Rate", value: "$350.00" });
    const hidden = section(
      { ...base, hideMoney: true },
      "Contract and vehicle",
    )!.rows;
    expect(hidden.map((r) => r.label)).not.toContain("Rate");
    expect(hidden.map((r) => r.label)).not.toContain("Security deposit");
    expect(hidden).toContainEqual({ label: "VIN", value: "JT123" });
  });
});

describe("copyAllText", () => {
  it("writes a heading per section and a Label: value line per row", () => {
    expect(
      copyAllText([
        { title: "Contact", rows: [{ label: "Email", value: "a@b.c" }] },
        {
          title: "Payment aliases",
          rows: [
            { label: "Zelle", value: "JANE DOE" },
            { label: "Cash App", value: "$jane" },
          ],
        },
      ]),
    ).toBe(
      "Contact\nEmail: a@b.c\n\nPayment aliases\nZelle: JANE DOE\nCash App: $jane",
    );
  });
});

describe("licenceSection", () => {
  it("lists what the AI read, dates formatted, and leaves out what it could not read", () => {
    const section = licenceSection({
      fullName: "JANE Q DOE",
      address: "12 Main St, Chicago, IL 60601",
      licenseNumber: "D123-4567-8901",
      licenseState: "IL",
      licenseClass: "D",
      dateOfBirth: "1990-04-30",
      issueDate: "2022-01-15",
      expiryDate: "2030-04-30",
      sex: "F",
      height: null,
      eyeColor: "BRO",
      restrictions: "NONE",
      endorsements: null,
      documentNumber: "X1",
    });
    expect(section.title).toBe("Licence (read by AI)");
    expect(section.rows).toContainEqual({
      label: "Expiry date",
      value: "Apr 30, 2030",
    });
    expect(section.rows).toContainEqual({
      label: "Licence number",
      value: "D123-4567-8901",
    });
    expect(section.rows.map((r) => r.label)).not.toContain("Height");
    expect(section.rows).toHaveLength(12);
  });
});
