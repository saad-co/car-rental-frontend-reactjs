import {
  useContractCompanies,
  useFleetVehicles,
} from "../../api/contracts.queries";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Select from "../form/Select";
import ContractCard from "./ContractCard";
import type {
  ContractFormProblems,
  ContractFormValues,
  DetailKey,
} from "./contractForm";

/** The vehicle's text boxes: key, label and the most characters the API accepts. */
const VEHICLE_BOXES: [DetailKey, string, number][] = [
  ["vehicleModel", "Model", 100],
  ["vehicleVin", "VIN", 50],
  ["vehiclePlate", "Plate", 20],
  ["vehiclePlateState", "Plate state", 50],
];

/**
 * The contract's details (Module 2 step 2): the company, and the vehicle with its purchase option price (the driver's
 * details are `DriverDetailsCard`, in the right column). All are optional and typed as the contract shows them; the page saves them with the
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
    </>
  );
}
