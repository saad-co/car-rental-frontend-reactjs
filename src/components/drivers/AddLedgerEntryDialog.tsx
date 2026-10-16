import { useState } from "react";
import type {
  LedgerCategory,
  LedgerDirection,
  NewLedgerEntry,
} from "../../api/ledger.queries";
import {
  addDays,
  chicagoToday,
  formatCents,
  formatDay,
  parseDollarsToCents,
} from "../../utils";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Label from "../form/Label";
import Select from "../form/Select";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import {
  CATEGORY_GROUPS,
  CATEGORY_LABEL,
  isChargeCategory,
} from "./ledgerLabels";

/** Same limits as the API (D58), checked here too so the admin sees the problem before saving. */
const MAX_CENTS = 1_000_000;
const MAX_BACKDATE_DAYS = 90;
const MAX_REASON = 500;

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
 * Adds a manual charge or credit (late fee, flat tire, discount, …). The amount is read from text into whole cents
 * (never a float). A request key is made once per opening of the dialog, so a double click or a retry after an error
 * sends the same key and the API makes only one entry.
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
  const [category, setCategory] = useState<LedgerCategory | "">("");
  const [direction, setDirection] = useState<LedgerDirection | "">("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [touched, setTouched] = useState(false);

  const cents = parseDollarsToCents(amount);
  const opening = category === "opening_balance";
  const minDate = addDays(today, -MAX_BACKDATE_DAYS);

  const problems = {
    category: category === "" ? "Pick a type." : null,
    direction:
      opening && direction === ""
        ? "Say whether it is owed or in credit."
        : null,
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
    reason: reason.trim() === "" ? "Say why." : null,
  };
  const valid = Object.values(problems).every((p) => p === null);

  /** Resets the form (and makes a new request key) for the next entry, then closes. */
  const close = () => {
    setCategory("");
    setDirection("");
    setAmount("");
    setDate(chicagoToday());
    setReason("");
    setRequestKey(crypto.randomUUID());
    setTouched(false);
    onCancel();
  };

  const save = () => {
    setTouched(true);
    if (!valid || category === "" || cents === null) return;
    onSave({
      category,
      ...(opening && direction !== "" ? { direction } : {}),
      amountCents: cents,
      effectiveDate: date,
      reason: reason.trim(),
      requestKey,
    });
  };

  const isCharge =
    category !== "" &&
    (opening ? direction === "debit" : isChargeCategory(category));
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
        <div>
          <Label htmlFor="ledger-category">Type</Label>
          <Select
            id="ledger-category"
            value={category}
            onChange={(value) => setCategory(value as LedgerCategory)}
            groups={CATEGORY_GROUPS}
            placeholder="Choose a type"
            error={show(problems.category) !== null}
          />
        </div>

        {opening && (
          <div>
            <Label>When the ledger started, the driver</Label>
            <div className="flex gap-6 text-sm text-gray-700">
              {(
                [
                  ["debit", "owed this amount"],
                  ["credit", "was in credit by this amount"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="ledger-direction"
                    checked={direction === value}
                    onChange={() => setDirection(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            {show(problems.direction) && (
              <p className="mt-1 text-theme-xs text-error-500">
                {problems.direction}
              </p>
            )}
            <p className="mt-1 text-theme-xs text-gray-500">
              A driver can have one opening balance.
            </p>
          </div>
        )}

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
            placeholder="e.g. Flat tire, rear left, replaced at Discount Tire"
            value={reason}
            onChange={setReason}
            maxLength={MAX_REASON}
            error={show(problems.reason) !== null}
            hint={show(problems.reason) ?? undefined}
          />
        </div>

        {valid && category !== "" && cents !== null && (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {isCharge ? "Charge" : "Credit"} of{" "}
            <span className="font-semibold">{formatCents(cents)}</span> (
            {CATEGORY_LABEL[category]}) on {formatDay(date)}: the driver will
            owe {isCharge ? "more" : "less"}.
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
