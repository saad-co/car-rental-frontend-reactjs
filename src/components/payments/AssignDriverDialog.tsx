import { useState } from "react";
import { useDrivers } from "../../api/drivers.queries";
import DriverStatusBadge from "../drivers/DriverStatusBadge";
import type { Payment } from "../../api/payments.queries";
import { cn, formatCents } from "../../utils";
import Input from "../form/input/InputField";
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
 */
export default function AssignDriverDialog({
  payment,
  busy,
  onAssign,
  onCancel,
}: AssignDriverDialogProps) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
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
    onCancel();
  };

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

          <div className="mt-4">
            <Input
              placeholder="Search drivers by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-gray-200">
            {isPending ? (
              <p className="p-4 text-sm text-gray-500">Loading drivers...</p>
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

          <div className="mt-6 flex justify-end gap-3">
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
          </div>
        </>
      )}
    </Modal>
  );
}
