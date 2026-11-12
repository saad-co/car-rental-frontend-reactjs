import { useState } from "react";
import { useCreateDriver, useDrivers } from "../../api/drivers.queries";
import DriverStatusBadge from "../drivers/DriverStatusBadge";
import type { Payment } from "../../api/payments.queries";
import {
  EMPTY_DRIVER_VALUES,
  toFormData,
  validate,
  type DriverFormValues,
} from "../../pages/Drivers/driverForm";
import { cn, formatCents } from "../../utils";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";

interface AssignDriverDialogProps {
  /** The payment to assign; null keeps the dialog closed. */
  payment: Payment | null;
  busy: boolean;
  onAssign: (driverId: string) => void;
  onCancel: () => void;
}

/**
 * Picks the driver a payment belongs to: a search box over all drivers (54 today, one page of 100 covers
 * them), the suggestion pre-selected when there is one. Assigning also teaches the payer's name as an alias.
 *
 * "+ Add driver" (Fleet revisions section 5) is for a payer who is not a driver yet: the same minimal form as Drivers >
 * Add driver (name, email, phone; everything else is added later on the driver page), the same `POST /drivers`, and then
 * the payment is assigned to the new driver, which saves the payer's name as their alias like any other assignment.
 */
export default function AssignDriverDialog({
  payment,
  busy,
  onAssign,
  onCancel,
}: AssignDriverDialogProps) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  /** The "Add driver" mini-form: closed (null) or the values typed so far. */
  const [adding, setAdding] = useState<DriverFormValues | null>(null);
  const [tried, setTried] = useState(false);
  const create = useCreateDriver();
  const { data, isPending, isError, error } = useDrivers({
    page: 1,
    limit: 100,
  });

  const selected =
    picked ?? payment?.suggestedDriver?.id ?? payment?.driver?.id ?? null;
  const query = search.trim().toLowerCase();
  const drivers = (data?.items ?? []).filter((driver) =>
    `${driver.firstName} ${driver.lastName} ${driver.email}`
      .toLowerCase()
      .includes(query),
  );

  /** Clears the dialog's own state, then closes it. */
  const close = () => {
    setSearch("");
    setPicked(null);
    setAdding(null);
    setTried(false);
    create.reset();
    onCancel();
  };

  const errors = adding
    ? validate(adding, { license: null, earnings: null })
    : {};
  /** Creates the driver, then assigns the payment to them. */
  const addAndAssign = () => {
    if (!adding) return;
    setTried(true);
    if (Object.keys(errors).length > 0) return;
    create.mutate(toFormData(adding, { license: null, earnings: null }, []), {
      onSuccess: (driver) => {
        setAdding(null);
        setTried(false);
        onAssign(driver.id);
      },
    });
  };
  const field = (
    key: "firstName" | "lastName" | "email" | "phone",
    label: string,
  ) => (
    <div>
      <Label htmlFor={`assign-new-${key}`}>{label}</Label>
      <Input
        id={`assign-new-${key}`}
        value={adding?.[key] ?? ""}
        onChange={(e) =>
          setAdding((all) => (all ? { ...all, [key]: e.target.value } : all))
        }
        error={tried && errors[key] !== undefined}
        hint={tried ? errors[key] : undefined}
      />
    </div>
  );

  return (
    <Modal
      isOpen={payment !== null}
      onClose={close}
      showCloseButton={false}
      className="max-w-lg p-6 sm:p-8"
    >
      {payment && (
        <>
          <h2 className="text-lg font-semibold text-gray-800">
            Assign {formatCents(payment.amountCents)} from {payment.senderName}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            The payer's name is also saved as the driver's alias, so their next
            payment is matched automatically.
          </p>

          {adding ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-700">
                Add <span className="font-medium">{payment.senderName}</span> as
                a new driver. Name, email and phone are enough; the rest can be
                filled in later on the driver page.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field("firstName", "First name")}
                {field("lastName", "Last name")}
                {field("email", "Email")}
                {field("phone", "Phone")}
              </div>
              {create.isError && (
                <p role="alert" className="text-sm text-error-600">
                  {create.error.message}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Input
                    placeholder="Search drivers by name or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdding({ ...EMPTY_DRIVER_VALUES })}
                >
                  + Add driver
                </Button>
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                {isPending ? (
                  <p className="p-4 text-sm text-gray-500">
                    Loading drivers...
                  </p>
                ) : isError ? (
                  <p role="alert" className="p-4 text-sm text-error-600">
                    {error.message}
                  </p>
                ) : drivers.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No driver found.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {drivers.map((driver) => (
                      <li key={driver.id}>
                        <button
                          type="button"
                          onClick={() => setPicked(driver.id)}
                          className={cn(
                            "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm",
                            driver.id === selected
                              ? "bg-brand-50 text-brand-600"
                              : "text-gray-700 hover:bg-gray-50",
                          )}
                        >
                          <span className="font-medium">
                            {driver.firstName} {driver.lastName}
                            {driver.id === payment.suggestedDriver?.id && (
                              <span className="ml-2 text-theme-xs text-gray-500">
                                (suggested)
                              </span>
                            )}
                          </span>
                          <DriverStatusBadge driver={driver} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div className="mt-6 flex justify-end gap-3">
            {adding ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={create.isPending || busy}
                  onClick={() => {
                    setAdding(null);
                    setTried(false);
                    create.reset();
                  }}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={create.isPending || busy}
                  onClick={addAndAssign}
                >
                  {create.isPending || busy
                    ? "Adding..."
                    : "Add driver and assign"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={close}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={busy || selected === null}
                  onClick={() => {
                    if (selected) onAssign(selected);
                  }}
                >
                  {busy ? "Assigning..." : "Assign"}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
