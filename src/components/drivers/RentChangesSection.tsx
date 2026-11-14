import { useState } from "react";
import {
  useRecurringCharge,
  useRemoveRecurringCharge,
  type RecurringCharge,
} from "../../api/recurringCharges.queries";
import { formatCents, formatDay } from "../../utils";
import Badge from "../ui/badge/Badge";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import RecurringChargeDialog from "./RecurringChargeDialog";

const LINK_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50";

const STATUS: Record<
  RecurringCharge["status"],
  { label: string; color: "warning" | "success" | "light" }
> = {
  pending: { label: "Not started", color: "warning" },
  current: { label: "In force", color: "success" },
  past: { label: "Earlier", color: "light" },
};

/**
 * The rent set or changed by hand on a driver's Contract card (D100, D101): every rent with where it is (not started, in force,
 * earlier), a Remove link on one that has not started, and the button that sets the first rent or changes it. Used for a
 * driver whose rent comes from a charge set by hand and for one with a signed contract (the signed file keeps its own rent;
 * the changes here are what is billed from their date).
 */
export default function RentChangesSection({
  driverId,
  signedContract,
  contractRent,
}: {
  driverId: string;
  signedContract: boolean;
  /** The signed contract's rent, to start the form from when no change has been made yet. */
  contractRent?: {
    schedule: RecurringCharge["schedule"];
    amountCents: number;
  };
}) {
  const { data, isPending, isError, error } = useRecurringCharge(driverId);
  const remove = useRemoveRecurringCharge(driverId);
  const [dialog, setDialog] = useState(false);
  const [removing, setRemoving] = useState<RecurringCharge | null>(null);

  if (isPending) return <p className="text-sm text-gray-500">Loading...</p>;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-error-600">
        {error.message}
      </p>
    );
  }

  const changes = data.changes;
  const hasRent = signedContract || changes.length > 0;
  const start = data.charge ?? contractRent;

  return (
    <div className="space-y-3">
      {changes.length > 0 ? (
        <ul className="divide-y divide-gray-100">
          {changes.map((change) => (
            <li
              key={change.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2"
            >
              <p className="text-sm text-gray-800">
                <Badge size="sm" color={STATUS[change.status].color}>
                  {STATUS[change.status].label}
                </Badge>{" "}
                {formatCents(change.amountCents)}/
                {change.schedule === "weekly" ? "week" : "day"} · from{" "}
                {formatDay(change.firstDueDate)}
                {change.createdByEmail && (
                  <span className="text-gray-500">
                    {" "}
                    · set by {change.createdByEmail}
                  </span>
                )}
              </p>
              {change.status === "pending" && (
                <button
                  type="button"
                  onClick={() => setRemoving(change)}
                  className="text-sm font-medium text-error-600 hover:text-error-700"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !signedContract && (
          <p className="text-sm text-gray-500">
            No rent charge is set, so nothing is billed.
          </p>
        )
      )}
      {signedContract && changes.length > 0 && (
        <p className="text-xs text-gray-500">
          The signed contract file still shows its own rent. These changes are
          what is billed from their date.
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setDialog(true)}
          className={LINK_BUTTON}
        >
          {hasRent ? "Change rent" : "Set charge"}
        </button>
      </div>

      {dialog && (
        <RecurringChargeDialog
          driverId={driverId}
          mode={hasRent ? "change" : "set"}
          initial={start}
          signedContract={signedContract}
          onClose={() => setDialog(false)}
        />
      )}
      <ConfirmDialog
        isOpen={removing !== null}
        title="Remove this rent change?"
        confirmLabel={remove.isPending ? "Removing..." : "Remove"}
        confirmVariant="danger"
        confirmDisabled={remove.isPending}
        onCancel={() => {
          setRemoving(null);
          remove.reset();
        }}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(removing.id, {
            onSuccess: () => setRemoving(null),
          });
        }}
      >
        {remove.isError && (
          <span role="alert" className="mb-2 block text-error-600">
            {remove.error.message}
          </span>
        )}
        {removing &&
          `${formatCents(removing.amountCents)}/${removing.schedule === "weekly" ? "week" : "day"} from ${formatDay(removing.firstDueDate)} has not started, so nothing was billed from it. The rent before it keeps billing.`}
      </ConfirmDialog>
    </div>
  );
}
