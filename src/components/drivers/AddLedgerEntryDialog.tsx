import { useState } from "react";
import type { LedgerDirection, NewLedgerEntry } from "../../api/ledger.queries";
import {
  addDays,
  chicagoToday,
  cn,
  formatCents,
  formatDay,
  parseDollarsToCents,
} from "../../utils";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";

/** Same limits as the API (D60), checked here too so the admin sees the problem before saving. */
const MAX_CENTS = 1_000_000;
const MAX_BACKDATE_DAYS = 90;
const MAX_REASON = 500;

/** The two kinds of manual entry (D61). */
const DIRECTIONS: { value: LedgerDirection; label: string; hint: string }[] = [
  { value: "debit", label: "Charge", hint: "Driver owes more" },
  { value: "credit", label: "Credit", hint: "Driver owes less" },
];

interface AddLedgerEntryDialogProps {
  isOpen: boolean;
  driverName: string;
  busy: boolean;
  /** The last save's error message, shown in the dialog. */
  error: string | null;
  onSave: (entry: NewLedgerEntry) => void;
  onCancel: () => void;
}

/**
 * Adds a manual charge or credit: an amount, the date it belongs to and a reason (D61), e.g. a late fee or a flat
 * tire. The amount is read from text into whole cents (never a float). A request key is made once per opening of the
 * dialog, so a double click or a retry after an error sends the same key and the API makes only one entry.
 */
export default function AddLedgerEntryDialog({
  isOpen,
  driverName,
  busy,
  error,
  onSave,
  onCancel,
}: AddLedgerEntryDialogProps) {
  const today = chicagoToday();
  const [direction, setDirection] = useState<LedgerDirection>("debit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [touched, setTouched] = useState(false);

  const cents = parseDollarsToCents(amount);
  const minDate = addDays(today, -MAX_BACKDATE_DAYS);
  const isCharge = direction === "debit";

  const problems = {
    amount:
      cents === null
        ? "Enter an amount like 25 or 25.50."
        : cents > MAX_CENTS
          ? "At most $10,000 per entry."
          : null,
    date:
      date === "" || date > today
        ? "Pick today or an earlier day."
        : date < minDate
          ? `At most ${MAX_BACKDATE_DAYS} days back.`
          : null,
    reason: reason.trim() === "" ? "Say what it is for." : null,
  };
  const valid = Object.values(problems).every((p) => p === null);

  /** Resets the form (and makes a new request key) for the next entry, then closes. */
  const close = () => {
    setDirection("debit");
    setAmount("");
    setDate(chicagoToday());
    setReason("");
    setRequestKey(crypto.randomUUID());
    setTouched(false);
    onCancel();
  };

  const save = () => {
    setTouched(true);
    if (!valid || cents === null) return;
    onSave({
      direction,
      amountCents: cents,
      effectiveDate: date,
      reason: reason.trim(),
      requestKey,
    });
  };

  const show = (problem: string | null) => (touched ? problem : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      showCloseButton={false}
      className="max-w-lg p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-gray-800">
        Add a ledger entry for {driverName}
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Entries cannot be edited or deleted. A mistake is corrected by reversing
        the entry.
      </p>

      <div className="mt-5 space-y-4">
        <div role="radiogroup" aria-label="Charge or credit">
          <div className="grid grid-cols-2 gap-3">
            {DIRECTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-label={`${d.label}: ${d.hint.toLowerCase()}`}
                aria-checked={direction === d.value}
                onClick={() => setDirection(d.value)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-start",
                  direction === d.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-300 hover:bg-gray-50",
                )}
              >
                <span
                  className={cn(
                    "block text-sm font-medium",
                    direction === d.value ? "text-brand-600" : "text-gray-800",
                  )}
                >
                  {d.label}
                </span>
                <span className="block text-theme-xs text-gray-500">
                  {d.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ledger-amount">Amount ($)</Label>
            <Input
              id="ledger-amount"
              placeholder="25.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={show(problems.amount) !== null}
              hint={show(problems.amount) ?? undefined}
            />
          </div>
          <div>
            <Label htmlFor="ledger-date">Date it belongs to</Label>
            <Input
              id="ledger-date"
              type="date"
              value={date}
              min={minDate}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              error={show(problems.date) !== null}
              hint={show(problems.date) ?? undefined}
            />
          </div>
        </div>

        <div>
          <Label>Reason</Label>
          <TextArea
            ariaLabel="Reason"
            rows={3}
            placeholder={
              isCharge
                ? "e.g. Late fee, 3 days late / Flat tire, rear left"
                : "e.g. Discount for referring a driver"
            }
            value={reason}
            onChange={setReason}
            maxLength={MAX_REASON}
            error={show(problems.reason) !== null}
            hint={show(problems.reason) ?? undefined}
          />
        </div>

        {valid && cents !== null && (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {isCharge ? "Charge" : "Credit"} of{" "}
            <span className="font-semibold">{formatCents(cents)}</span> on{" "}
            {formatDay(date)}: the driver will owe {isCharge ? "more" : "less"}.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-error-600">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Add entry"}
        </Button>
      </div>
    </Modal>
  );
}
