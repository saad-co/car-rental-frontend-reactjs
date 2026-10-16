import { useState } from "react";
import type { LedgerRow } from "../../api/ledger.queries";
import { formatCents, formatDay } from "../../utils";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { entryTypeLabel } from "./ledgerLabels";

interface ReverseLedgerEntryDialogProps {
  /** The entry to reverse; null keeps the dialog closed. */
  entry: LedgerRow | null;
  busy: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Confirms a reversal and asks why. The reversal is a new entry of the same amount in the other direction, dated
 * today; the original stays in the history, marked "Reversed".
 */
export default function ReverseLedgerEntryDialog({
  entry,
  busy,
  error,
  onConfirm,
  onCancel,
}: ReverseLedgerEntryDialogProps) {
  const [reason, setReason] = useState("");

  const close = () => {
    setReason("");
    onCancel();
  };

  return (
    <Modal
      isOpen={entry !== null}
      onClose={close}
      showCloseButton={false}
      className="max-w-md p-6 sm:p-8"
    >
      {entry && (
        <>
          <h2 className="text-lg font-semibold text-gray-800">
            Reverse this entry?
          </h2>
          <p className="mt-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <span className="font-medium">{entryTypeLabel(entry)}</span> of{" "}
            {formatCents(entry.amountCents)} on {formatDay(entry.effectiveDate)}
            <span className="block text-theme-xs text-gray-500">
              {entry.description}
            </span>
          </p>
          <p className="mt-3 text-sm text-gray-500">
            A {entry.direction === "debit" ? "credit" : "charge"} of{" "}
            {formatCents(entry.amountCents)} dated today cancels it. This cannot
            be undone.
          </p>
          <div className="mt-4">
            <TextArea
              ariaLabel="Reason"
              rows={2}
              placeholder="Why, e.g. Late fee waived by the owner"
              value={reason}
              onChange={setReason}
              maxLength={400}
            />
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-error-600">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy || reason.trim() === ""}
              onClick={() => onConfirm(reason.trim())}
            >
              {busy ? "Reversing..." : "Reverse"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
