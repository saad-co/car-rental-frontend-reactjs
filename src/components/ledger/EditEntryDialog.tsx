import { useState } from "react";
import type {
  EditLedgerEntryBody,
  LedgerEntry,
} from "../../api/ledger.queries";
import {
  centsToDollars,
  chicagoToday,
  formatCents,
  formatDay,
  parseDollarsToCents,
} from "../../utils";
import { entryTypeLabel } from "../drivers/ledgerLabels";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";

/** The same limits as the API: $10,000 at most, 500 characters of text. */
const MAX_CENTS = 1_000_000;
const MAX_TEXT = 500;

interface EditEntryDialogProps {
  /** The entry to correct. */
  entry: LedgerEntry;
  busy: boolean;
  error: string | null;
  /** Called with only the fields that changed. */
  onSave: (changes: EditLedgerEntryBody) => void;
  onCancel: () => void;
}

/**
 * Corrects an entry that was logged wrongly (Fleet revisions section 5): its amount, the day it belongs to, its description
 * and its staff memo. Mount it with a `key` per entry, so it starts from that entry's values.
 *
 * Saving changes the entry in place (D99): no reversal and no second entry. Since the old values are no longer on the
 * ledger, the audit trail records who changed what, when, and the old and new values. A payment from an email keeps the
 * text the sender gave it (only its amount, date and memo can change).
 */
export default function EditEntryDialog({
  entry,
  busy,
  error,
  onSave,
  onCancel,
}: EditEntryDialogProps) {
  const [amount, setAmount] = useState(centsToDollars(entry.amountCents));
  const [date, setDate] = useState(entry.effectiveDate);
  const [description, setDescription] = useState(entry.description);
  const [memo, setMemo] = useState(entry.internalNote ?? "");
  const [tried, setTried] = useState(false);

  const today = chicagoToday();
  const cents = parseDollarsToCents(amount);
  const problems = {
    amount:
      cents === null
        ? "Enter an amount like 25 or 25.50."
        : cents > MAX_CENTS
          ? "The amount can be at most $10,000."
          : null,
    date:
      date === ""
        ? "Choose a date."
        : date > today
          ? "The date cannot be in the future."
          : null,
    description: description.trim() === "" ? "Write a description." : null,
  };
  const hasProblem = Object.values(problems).some((p) => p !== null);

  // Only what changed is sent; nothing changed = nothing to save.
  const changes: EditLedgerEntryBody = {};
  if (cents !== null && cents !== entry.amountCents)
    changes.amountCents = cents;
  if (date !== entry.effectiveDate) changes.effectiveDate = date;
  if (description.trim() !== entry.description) {
    changes.description = description.trim();
  }
  if (memo.trim() !== (entry.internalNote ?? "")) {
    changes.internalNote = memo.trim();
  }
  const changed = Object.keys(changes).length > 0;
  const show = (message: string | null) => (tried ? message : null);

  const save = () => {
    setTried(true);
    if (hasProblem || !changed) return;
    onSave(changes);
  };

  return (
    <Modal
      isOpen
      onClose={busy ? () => undefined : onCancel}
      showCloseButton={false}
      className="max-w-lg p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-gray-800">Edit this entry</h2>
      <p className="mt-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <span className="font-medium">{entryTypeLabel(entry)}</span>{" "}
        <span className="font-mono text-theme-xs">{entry.ref}</span> of{" "}
        {formatCents(entry.amountCents)} on {formatDay(entry.effectiveDate)}
      </p>
      <p className="mt-3 text-sm text-gray-500">
        The entry itself is changed; no extra entry is added. The change is
        logged with your name, the time and the old and new values.
      </p>

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="edit-amount">Amount ($)</Label>
            <Input
              id="edit-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={show(problems.amount) !== null}
              hint={show(problems.amount) ?? undefined}
            />
          </div>
          <div>
            <Label htmlFor="edit-date">Date it belongs to</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              error={show(problems.date) !== null}
              hint={show(problems.date) ?? undefined}
            />
          </div>
        </div>

        <div>
          <Label>
            Description{" "}
            <span className="font-normal text-gray-500">
              (shows on driver statement)
            </span>
          </Label>
          {entry.kind === "payment" && entry.paymentId && (
            <p className="mb-1 text-theme-xs text-gray-500">
              A payment that came from an email keeps the text its sender gave
              it; the description of a payment recorded by hand can change.
            </p>
          )}
          <TextArea
            ariaLabel="Description"
            rows={2}
            value={description}
            onChange={setDescription}
            maxLength={MAX_TEXT}
          />
          {show(problems.description) && (
            <p role="alert" className="mt-1 text-theme-xs text-error-600">
              {problems.description}
            </p>
          )}
        </div>

        <div>
          <Label>
            Memo{" "}
            <span className="font-normal text-gray-500">
              (staff only, never on the statement)
            </span>
          </Label>
          <TextArea
            ariaLabel="Memo"
            rows={2}
            value={memo}
            onChange={setMemo}
            maxLength={MAX_TEXT}
          />
        </div>
      </div>

      {tried && !changed && !hasProblem && (
        <p role="alert" className="mt-3 text-sm text-error-600">
          Nothing was changed.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-error-600">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" disabled={busy} onClick={save}>
          {busy ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </Modal>
  );
}
