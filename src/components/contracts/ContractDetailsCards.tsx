import { useEffect, useRef, useState } from "react";
import {
  useContractCompanies,
  useFleetVehicles,
  useReadLicence,
  type LicenceDetails,
} from "../../api/contracts.queries";
import Button from "../ui/button/Button";
import Spinner from "../ui/spinner/Spinner";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Select from "../form/Select";
import ContractCard from "./ContractCard";
import type {
  ContractFormProblems,
  ContractFormValues,
  DetailKey,
} from "./contractForm";

/** The text boxes of the details cards: key, label and the most characters the API accepts. */
const VEHICLE_BOXES: [DetailKey, string, number][] = [
  ["vehicleModel", "Model", 100],
  ["vehicleVin", "VIN", 50],
  ["vehiclePlate", "Plate", 20],
  ["vehiclePlateState", "Plate state", 50],
];

/** The four boxes the AI reads from the licence (B121), each with the field of the API's answer. */
type LicenceKey =
  "lesseeAddress" | "licenseNumber" | "licenseState" | "dateOfBirth";
const LICENCE_FIELDS: [LicenceKey, keyof LicenceDetails][] = [
  ["lesseeAddress", "address"],
  ["licenseNumber", "licenseNumber"],
  ["licenseState", "licenseState"],
  ["dateOfBirth", "dateOfBirth"],
];

const DRIVER_BOXES: [DetailKey, string, number][] = [
  ["licenseNumber", "Licence number", 50],
  ["licenseState", "Licence state", 50],
];

/**
 * The contract's details (Module 2 step 2): the company, the vehicle with its purchase option price, and the driver's
 * address, licence and date of birth. All are optional and typed as the contract shows them; the page saves them with the
 * rest of the draft.
 */
export default function ContractDetailsCards({
  driverId,
  readOnly,
  values,
  problems,
  set,
}: {
  driverId: string;
  /** A sent contract: shown as it was, the licence is not read. */
  readOnly: boolean;
  values: ContractFormValues;
  problems: ContractFormProblems;
  set: <K extends keyof ContractFormValues>(
    key: K,
    value: ContractFormValues[K],
  ) => void;
}) {
  const companies = useContractCompanies();
  const list = companies.data ?? [];
  const chosen = list.find((company) => company.id === values.companyId);
  const readLicence = useReadLicence(driverId);
  /** The driver-detail boxes the AI filled and the admin has not changed since (B121): they carry an "AI" note. */
  const [fromAi, setFromAi] = useState<Set<LicenceKey>>(new Set());

  /** Puts what the AI read into the boxes (only what it could read), and marks them. */
  const fillFromLicence = (details: LicenceDetails) => {
    const read = new Set<LicenceKey>();
    for (const [key, field] of LICENCE_FIELDS) {
      const value = details[field];
      if (value) {
        set(key, value);
        read.add(key);
      }
    }
    setFromAi(read);
  };
  const runRead = () =>
    readLicence.mutate(undefined, { onSuccess: fillFromLicence });

  /** A box typed in by hand is no longer the AI's. */
  const setDetail = (key: LicenceKey, value: string) => {
    set(key, value);
    setFromAi((previous) => {
      if (!previous.has(key)) return previous;
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
  };

  // Read the licence by itself once, when the draft is editable and none of the four boxes has a value yet.
  const autoRead = useRef(false);
  useEffect(() => {
    if (autoRead.current || readOnly) return;
    autoRead.current = true;
    if (LICENCE_FIELDS.every(([key]) => values[key].trim() === "")) runRead();
    // Only on the first render: later changes are the admin's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aiHint = (key: LicenceKey) =>
    fromAi.has(key) ? "Extracted by AI from the licence. Check it." : undefined;

  const vehicles = useFleetVehicles();
  const fleet = vehicles.data ?? [];
  /** The vehicle whose VIN is in the box, so the list shows it after a reload; none when typed by hand. */
  const pickedVehicle = fleet.findIndex(
    (vehicle) => vehicle.vin !== "" && vehicle.vin === values.vehicleVin.trim(),
  );

  /** The name alone, or with its address when the same name is on the list twice (Gonzo has two addresses). */
  const optionLabel = (company: (typeof list)[number]) =>
    list.filter((other) => other.name === company.name).length > 1
      ? `${company.name} — ${company.address}`
      : company.name;

  const textBox = ([key, label, max]: [DetailKey, string, number]) => (
    <div key={key}>
      <Label htmlFor={`contract-${key}`}>{label}</Label>
      <Input
        id={`contract-${key}`}
        value={values[key]}
        maxLength={max}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <>
      <ContractCard
        title="Company"
        note="The company on the contract. Its name is printed as the company's signature."
      >
        <Label htmlFor="contract-company">Company</Label>
        <Select
          id="contract-company"
          value={values.companyId}
          onChange={(value) => set("companyId", value)}
          options={list.map((company) => ({
            value: company.id,
            label: optionLabel(company),
          }))}
          placeholder={companies.isPending ? "Loading..." : "Choose a company"}
          disabled={companies.isPending}
        />
        {companies.isError && (
          <p role="alert" className="mt-1.5 text-sm text-error-600">
            {companies.error.message}
          </p>
        )}
        {chosen && (
          <p className="mt-1.5 text-sm text-gray-500">{chosen.address}</p>
        )}
      </ContractCard>

      <ContractCard
        title="Vehicle"
        note="Pick one of the business's vehicles to fill in the boxes below, or type them. The boxes can still be changed."
      >
        <div className="mb-4">
          <Label htmlFor="contract-fleetVehicle">Vehicle</Label>
          <Select
            id="contract-fleetVehicle"
            value={pickedVehicle >= 0 ? String(pickedVehicle) : ""}
            onChange={(index) => {
              const vehicle = fleet[Number(index)];
              set("vehicleModel", vehicle.model);
              set("vehicleVin", vehicle.vin);
              set("vehiclePlate", vehicle.plate);
              set("vehiclePlateState", vehicle.plateState);
            }}
            options={fleet.map((vehicle, index) => ({
              value: String(index),
              label: [
                vehicle.model,
                vehicle.color,
                vehicle.plate || "no plate",
                vehicle.vin || "no VIN",
                vehicle.plateState,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
            placeholder={vehicles.isPending ? "Loading..." : "Choose a vehicle"}
            disabled={vehicles.isPending}
          />
          {vehicles.isError && (
            <p role="alert" className="mt-1.5 text-sm text-error-600">
              {vehicles.error.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VEHICLE_BOXES.map(textBox)}
          <div>
            <Label htmlFor="contract-purchaseOption">
              Purchase option price ($)
            </Label>
            <Input
              id="contract-purchaseOption"
              placeholder="0.00"
              value={values.purchaseOption}
              onChange={(e) => set("purchaseOption", e.target.value)}
              error={problems.purchaseOption !== undefined}
              hint={problems.purchaseOption}
            />
          </div>
        </div>
      </ContractCard>

      <ContractCard
        title="Driver details"
        note="Extracted from the driver's licence by AI when the boxes are empty; check and change them as needed. The driver's name, email and phone come from the driver."
      >
        {!readOnly && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={readLicence.isPending}
              onClick={runRead}
            >
              {readLicence.isPending
                ? "Extracting text from licence..."
                : "Extract text from licence"}
            </Button>
            {fromAi.size > 0 && !readLicence.isPending && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-theme-xs font-medium text-brand-600">
                Filled in by AI
              </span>
            )}
          </div>
        )}
        {readLicence.isError && (
          <p role="alert" className="mb-4 text-sm text-error-600">
            {readLicence.error.message}
          </p>
        )}
        {/* While the AI reads the licence, only these boxes are covered: the rest of the page stays usable. */}
        <div className="relative" aria-busy={readLicence.isPending}>
          {readLicence.isPending && (
            <div
              role="status"
              className="absolute inset-0 z-10 flex items-center justify-center gap-3 rounded-lg bg-white/80 text-sm font-medium text-gray-700"
            >
              <Spinner />
              Extracting text from licence...
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="contract-lesseeAddress">Address</Label>
              <Input
                id="contract-lesseeAddress"
                value={values.lesseeAddress}
                maxLength={300}
                onChange={(e) => setDetail("lesseeAddress", e.target.value)}
                hint={aiHint("lesseeAddress")}
              />
            </div>
            {DRIVER_BOXES.map(([key, label, max]) => (
              <div key={key}>
                <Label htmlFor={`contract-${key}`}>{label}</Label>
                <Input
                  id={`contract-${key}`}
                  value={values[key]}
                  maxLength={max}
                  autoComplete="off"
                  onChange={(e) => setDetail(key as LicenceKey, e.target.value)}
                  hint={aiHint(key as LicenceKey)}
                />
              </div>
            ))}
            <div>
              <Label htmlFor="contract-dateOfBirth">Date of birth</Label>
              <Input
                id="contract-dateOfBirth"
                type="date"
                autoComplete="off"
                value={values.dateOfBirth}
                onChange={(e) => setDetail("dateOfBirth", e.target.value)}
                hint={aiHint("dateOfBirth")}
              />
            </div>
          </div>
        </div>
      </ContractCard>
    </>
  );
}
