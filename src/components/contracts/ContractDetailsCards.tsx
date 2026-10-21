import { useContractCompanies } from "../../api/contracts.queries";
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
  values,
  problems,
  set,
}: {
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

      <ContractCard title="Vehicle">
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
        note="Typed for this contract. The driver's name, email and phone come from the driver."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="contract-lesseeAddress">Address</Label>
            <Input
              id="contract-lesseeAddress"
              value={values.lesseeAddress}
              maxLength={300}
              onChange={(e) => set("lesseeAddress", e.target.value)}
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
                onChange={(e) => set(key, e.target.value)}
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
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
          </div>
        </div>
      </ContractCard>
    </>
  );
}
