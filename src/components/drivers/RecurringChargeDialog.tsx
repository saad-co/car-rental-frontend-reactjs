import { useState } from "react";
import {
  useSetRecurringCharge,
  type NewRecurringCharge,
} from "../../api/recurringCharges.queries";
import {
  centsToDollars,
  chicagoToday,
  formatCents,
  parseDollarsToCents,
} from "../../utils";
import DatePicker from "../form/DatePicker";
import { FormField } from "../form/FormLayout";
import Select from "../form/Select";
import Input from "../form/input/InputField";
import ConfirmDialog from "../ui/modal/ConfirmDialog";

const SCHEDULES = [
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
];

/**
 * The window that sets or changes a driver's rent by hand (D100, D101). Mount it only while open, so it starts from the
 * current rent every time. `set`: the first rent of a driver with no contract. `change`: a new rent from a date, for a charge
 * set by hand or for a signed contract (`signedContract`: its PDF keeps showing the old rent). The three fields are the
 * contract's own: how often, the rent of one period, and the date it is from. The server starts the new rent on the first due
 * day on or after that date, never before today and never on a day whose rent is already on the ledger.
 */
export default function RecurringChargeDialog({
  driverId,
  mode,
  initial,
  signedContract = false,
  onClose,
}: {
  driverId: string;
  mode: "set" | "change";
  /** The rent now, to start the form from (a change). */
  initial?: { schedule: NewRecurringCharge["schedule"]; amountCents: number };
  signedContract?: boolean;
  onClose: () => void;
}) {
  const save = useSetRecurringCharge(driverId);
  const [schedule, setSchedule] = useState<NewRecurringCharge["schedule"]>(
    initial?.schedule ?? "weekly",
  );
  const [amount, setAmount] = useState(
    initial ? centsToDollars(initial.amountCents) : "",
  );
  const [startDate, setStartDate] = useState(chicagoToday());
  const [touched, setTouched] = useState(false);
  const changing = mode === "change";

  const cents = parseDollarsToCents(amount);
  const amountProblem =
    cents === null ? "Enter an amount like 300 or 409.50." : undefined;
  const dateProblem = startDate === "" ? "Pick a date." : undefined;

  return (
    <ConfirmDialog
      isOpen
      title={changing ? "Change the rent" : "Set the rent charge"}
      confirmLabel={
        save.isPending ? "Saving..." : changing ? "Save change" : "Save charge"
      }
      confirmDisabled={save.isPending}
      onCancel={onClose}
      onConfirm={() => {
        setTouched(true);
        if (cents === null || startDate === "") return;
        save.mutate(
          { schedule, amountCents: cents, startDate },
          { onSuccess: onClose },
        );
      }}
    >
      <div className="space-y-4">
        {save.isError && (
          <p
            role="alert"
            className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600"
          >
            {save.error.message}
          </p>
        )}
        <FormField label="How often" htmlFor="charge-schedule">
          <Select
            id="charge-schedule"
            options={SCHEDULES}
            value={schedule}
            disabled={save.isPending}
            onChange={(value) =>
              setSchedule(value as NewRecurringCharge["schedule"])
            }
          />
        </FormField>
        <FormField
          label={
            schedule === "weekly" ? "Rent per week ($)" : "Rent per day ($)"
          }
          htmlFor="charge-amount"
          error={touched ? amountProblem : undefined}
        >
          <Input
            id="charge-amount"
            value={amount}
            placeholder="0.00"
            disabled={save.isPending}
            error={touched && amountProblem !== undefined}
            onChange={(event) => setAmount(event.target.value)}
          />
        </FormField>
        <FormField
          label={changing ? "From" : "Start date"}
          htmlFor="charge-start"
          error={touched ? dateProblem : undefined}
          hint={
            schedule === "weekly"
              ? "A weekly rent is due on this date's weekday."
              : "A daily rent is due every day."
          }
        >
          <DatePicker
            id="charge-start"
            value={startDate}
            error={touched && dateProblem !== undefined}
            disabled={save.isPending}
            onChange={setStartDate}
          />
        </FormField>
        <div className="space-y-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <p>
            {cents !== null &&
              `${formatCents(cents)} per ${schedule === "weekly" ? "week" : "day"}. `}
            Nothing in the past is charged: the new rent starts on the first due
            day on or after this date, never before today and never on a day
            whose rent is already on the ledger.
            {!changing && " The driver is billed only while active."}
          </p>
          {changing && (
            <p>
              Rent already on the ledger stays as it is: correct an entry with
              Edit entry on the ledger. A change that has not started yet is
              replaced by this one.
              {signedContract &&
                " The signed contract file keeps showing its own rent."}
            </p>
          )}
        </div>
      </div>
    </ConfirmDialog>
  );
}
