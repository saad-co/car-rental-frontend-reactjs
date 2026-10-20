import { useState } from "react";
import type { NewLedgerEntry } from "../../api/ledger.queries";
import {
  useLedgerPresets,
  type LedgerPreset,
} from "../../api/ledgerPresets.queries";
import {
  PossibleDuplicateError,
  type NewManualPayment,
  type PaymentManualMethod,
} from "../../api/payments.queries";
import {
  addDays,
  centsToDollars,
  chicagoToday,
  cn,
  formatCents,
  formatDay,
  parseDollarsToCents,
} from "../../utils";
import BalanceText from "../drivers/BalanceText";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Label from "../form/Label";
import {
  EMAIL_METHODS,
  MANUAL_METHODS,
  MANUAL_METHOD_LABEL,
  paymentSourceLabel,
} from "../payments/paymentLabels";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";

/** Same limits as the API (D60, B79), checked here too so the admin sees the problem before saving. */
const MAX_CENTS = 1_000_000;
const MAX_BACKDATE_DAYS = 90;
const MAX_TEXT = 500;
const MAX_REFERENCE = 100;

/** What the dialog is making: a charge, a credit, or a payment received. */
export type EntryMode = "debit" | "credit" | "payment";

/** The three tabs of the client's "New ledger entry" window (the mockup): the name and what it does. */
const MODES: { value: EntryMode; label: string; hint: string }[] = [
  { value: "debit", label: "+ Charge", hint: "Adds to what they owe" },
  { value: "credit", label: "+ Credit", hint: "Reduces what they owe" },
  { value: "payment", label: "+ Payment", hint: "Money received" },
];

/** The words on the main button, as in the mockup. */
const SUBMIT_LABEL: Record<EntryMode, string> = {
  debit: "Post charge",
  credit: "Post credit",
  payment: "Record payment",
};

/** The charge a credit is applied against ("credit against this charge"). */
export interface AppliesTo {
  id: string;
  ref: string;
  description: string;
  /** How much of the charge is left to credit, in cents. */
  creditableCents: number;
}

interface NewEntryDialogProps {
  isOpen: boolean;
  driverId: string;
  driverName: string;
  /** The driver's balance now (credits minus debits), for the "Balance → ..." preview and the payment's starting amount. */
  balanceCents: number;
  /** The tab the dialog opens on. Ignored when `appliesTo` is given (always a credit). */
  initialMode: EntryMode;
  /** Set to credit against one charge: tabs hidden, the amount starts at what is left, the description says "Waived: ...". */
  appliesTo?: AppliesTo;
  busy: boolean;
  /** The last charge or credit save's error. */
  entryError: Error | null;
  /** The last payment save's error; a `PossibleDuplicateError` makes the dialog offer "Record anyway". */
  paymentError: Error | null;
  onSaveEntry: (entry: NewLedgerEntry) => void;
  onSavePayment: (payment: NewManualPayment) => void;
  onCancel: () => void;
}

/** What the driver owes, as text for the payment's starting amount: empty when the driver owes nothing. */
function owedAsText(balanceCents: number): string {
  return balanceCents < 0 ? centsToDollars(-balanceCents) : "";
}

/**
 * The client's "New ledger entry" window (B86): one dialog with three tabs (charge, credit, payment) and the same
 * fields in the same order as their mockup, in our TailAdmin look.
 *
 * - Charge and credit: common-reason chips, amount, the date it belongs to, a description (shows on the driver's
 *   statement; required) and an internal note (staff only).
 * - Payment: method chips, amount (starts at what the driver owes), date paid, an optional description, a
 *   reference / confirmation number and an internal note. It becomes a confirmed payment that credits the ledger.
 * - The footer previews the balance after the entry.
 *
 * Amounts are read from text into whole cents (never a float). A request key is made once per opening of the dialog,
 * so a double click or a retry sends the same key and the API makes only one entry. The form starts from its props
 * when first shown, so the screen gives it a new `key` for every opening.
 */
export default function NewEntryDialog({
  isOpen,
  driverId,
  driverName,
  balanceCents,
  initialMode,
  appliesTo,
  busy,
  entryError,
  paymentError,
  onSaveEntry,
  onSavePayment,
  onCancel,
}: NewEntryDialogProps) {
  const today = chicagoToday();
  const startMode: EntryMode = appliesTo ? "credit" : initialMode;
  const startAmount = appliesTo
    ? centsToDollars(appliesTo.creditableCents)
    : startMode === "payment"
      ? owedAsText(balanceCents)
      : "";
  const startDescription = appliesTo
    ? `Waived: ${appliesTo.description}`.slice(0, MAX_TEXT)
    : "";

  const [mode, setMode] = useState<EntryMode>(startMode);
  const [amount, setAmount] = useState(startAmount);
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState(startDescription);
  /** The preset card last clicked (highlighted); the text and amount it filled in can still be changed. */
  const [presetId, setPresetId] = useState<string | null>(null);
  const presets = useLedgerPresets();
  const [method, setMethod] = useState<PaymentManualMethod>("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [touched, setTouched] = useState(false);

  const isPayment = mode === "payment";
  const cents = parseDollarsToCents(amount);
  const minDate = addDays(today, -MAX_BACKDATE_DAYS);
  const error = isPayment ? paymentError : entryError;
  const duplicate = error instanceof PossibleDuplicateError ? error : null;

  const problems = {
    amount:
      cents === null
        ? "Enter an amount like 25 or 25.50."
        : cents > MAX_CENTS
          ? "At most $10,000 per entry."
          : appliesTo && cents > appliesTo.creditableCents
            ? `At most ${formatCents(appliesTo.creditableCents)} is left on ${appliesTo.ref}.`
            : null,
    date:
      date === "" || date > today
        ? "Pick today or an earlier day."
        : date < minDate
          ? `At most ${MAX_BACKDATE_DAYS} days back.`
          : null,
    // A payment writes its own description when this is left empty; a charge or credit needs one.
    description:
      !isPayment && description.trim() === "" ? "Say what it is for." : null,
  };
  const valid = Object.values(problems).every((p) => p === null);
  const show = (problem: string | null) => (touched ? problem : null);

  // The balance after this entry, for the footer. Whole cents added or subtracted for display only: the server works
  // out the real balance when the entry is saved.
  const balanceAfter =
    cents === null
      ? null
      : mode === "debit"
        ? balanceCents - cents
        : balanceCents + cents;

  /** Resets the form (and makes a new request key) for the next entry, then closes. */
  const close = () => {
    setMode(startMode);
    setAmount(startAmount);
    setDate(chicagoToday());
    setDescription(startDescription);
    setPresetId(null);
    setMethod("cash");
    setReference("");
    setNote("");
    setRequestKey(crypto.randomUUID());
    setTouched(false);
    onCancel();
  };

  /** A tab was chosen: what was typed for the other kind no longer fits, so the form starts fresh. */
  const changeMode = (next: EntryMode) => {
    if (next === mode) return;
    setMode(next);
    setAmount(next === "payment" ? owedAsText(balanceCents) : "");
    setDescription("");
    setPresetId(null);
    setTouched(false);
  };

  /** A preset card was clicked: fill in its description, and its amount when it has one (as in the client's mockup). */
  const pickPreset = (preset: LedgerPreset) => {
    setPresetId(preset.id);
    setDescription(preset.description);
    if (preset.amountCents !== null) {
      setAmount(centsToDollars(preset.amountCents));
    }
  };

  /** The preset cards for the tab: charges for a charge, credits for a credit. */
  const cards = (presets.data ?? []).filter(
    (preset) => preset.kind === (mode === "debit" ? "charge" : "credit"),
  );

  /** Sends the entry; `confirmDuplicate` after the duplicate warning (same request key). */
  const save = (confirmDuplicate: boolean) => {
    setTouched(true);
    if (!valid || cents === null) return;
    const text = description.trim() || undefined;
    const internalNote = note.trim() || undefined;
    if (isPayment) {
      onSavePayment({
        driverId,
        method,
        amountCents: cents,
        paidOn: date,
        reference: reference.trim() || undefined,
        requestKey,
        confirmDuplicate: confirmDuplicate || undefined,
        description: text,
        internalNote,
      });
    } else {
      onSaveEntry({
        direction: mode,
        amountCents: cents,
        effectiveDate: date,
        reason: description.trim(),
        requestKey,
        appliesToId: appliesTo?.id,
        internalNote,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      showCloseButton={false}
      className="max-w-xl p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-gray-800">
        {appliesTo ? "Credit against a charge" : "New ledger entry"}
        <span className="ml-2 text-sm font-normal text-gray-500">
          · {driverName}
        </span>
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Entries cannot be edited or deleted. A mistake is corrected by reversing
        the entry.
      </p>

      <div className="mt-5 space-y-4">
        {appliesTo ? (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            Applying against{" "}
            <span className="font-semibold">{appliesTo.ref}</span> ·{" "}
            {appliesTo.description} ·{" "}
            <span className="font-semibold">
              {formatCents(appliesTo.creditableCents)}
            </span>{" "}
            left
          </p>
        ) : (
          <div role="radiogroup" aria-label="Kind of entry">
            <div className="grid grid-cols-3 gap-3">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.value}
                  onClick={() => changeMode(m.value)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-start",
                    mode === m.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      mode === m.value ? "text-brand-600" : "text-gray-800",
                    )}
                  >
                    {m.label}
                  </span>
                  <span className="block text-theme-xs text-gray-500">
                    {m.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isPayment ? (
          <div>
            <Label>Method</Label>
            <div
              role="radiogroup"
              aria-label="Method"
              className="flex flex-wrap gap-2"
            >
              {MANUAL_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    method === m
                      ? "border-brand-500 bg-brand-50 font-medium text-brand-600"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {MANUAL_METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          !appliesTo &&
          (cards.length > 0 ? (
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="group"
              aria-label="Presets"
            >
              {cards.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={presetId === preset.id}
                  onClick={() => pickPreset(preset)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-start",
                    presetId === preset.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 bg-white hover:bg-gray-50",
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm leading-tight font-medium",
                      presetId === preset.id
                        ? "text-brand-600"
                        : "text-gray-800",
                    )}
                  >
                    {preset.name}
                  </span>
                  <span className="mt-0.5 block text-theme-xs text-gray-500">
                    {preset.amountCents === null
                      ? "enter amount"
                      : formatCents(preset.amountCents)}
                  </span>
                </button>
              ))}
            </div>
          ) : presets.isError ? (
            <p className="text-theme-xs text-gray-500">
              The preset cards could not be loaded. You can still type the
              description.
            </p>
          ) : null)
        )}

        {isPayment && EMAIL_METHODS.includes(method) && (
          <p
            role="note"
            className="rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-600"
          >
            {MANUAL_METHOD_LABEL[method]} payments usually arrive by email and
            are credited automatically. Check the Payments page first so the
            driver is not credited twice.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="entry-amount">Amount ($)</Label>
            <Input
              id="entry-amount"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={show(problems.amount) !== null}
              hint={show(problems.amount) ?? undefined}
            />
          </div>
          <div>
            <Label htmlFor="entry-date">
              {isPayment ? "Date paid" : "Date it belongs to"}
            </Label>
            <Input
              id="entry-date"
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
          <Label>
            Description{" "}
            <span className="font-normal text-gray-500">
              (shows on driver statement)
            </span>
          </Label>
          <TextArea
            ariaLabel="Description"
            rows={2}
            placeholder={
              isPayment
                ? "Leave empty to use the method and reference"
                : mode === "debit"
                  ? "e.g. Late fee, 3 days late / Flat tire, rear left"
                  : "e.g. Discount for referring a driver"
            }
            value={description}
            onChange={setDescription}
            maxLength={MAX_TEXT}
            error={show(problems.description) !== null}
            hint={show(problems.description) ?? undefined}
          />
        </div>

        {isPayment && (
          <div>
            <Label htmlFor="entry-reference">Reference / confirmation #</Label>
            <Input
              id="entry-reference"
              placeholder="Stripe ID, Zelle confirmation, receipt #"
              value={reference}
              maxLength={MAX_REFERENCE}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        )}

        <div>
          <Label>
            Internal note{" "}
            <span className="font-normal text-gray-500">(staff only)</span>
          </Label>
          <TextArea
            ariaLabel="Internal note"
            rows={2}
            placeholder="Optional"
            value={note}
            onChange={setNote}
            maxLength={MAX_TEXT}
          />
        </div>

        {duplicate && (
          <div
            role="alert"
            className="rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-600"
          >
            <p className="font-medium">Possible duplicate</p>
            <p className="mt-1">
              This driver already has a payment of{" "}
              {formatCents(duplicate.duplicate.amountCents)} (
              {paymentSourceLabel(
                duplicate.duplicate.source,
                duplicate.duplicate.manualMethod,
              )}
              ) on{" "}
              {formatDay(
                chicagoToday(new Date(duplicate.duplicate.occurredAt)),
              )}
              . If this is a different payment, record it anyway.
            </p>
          </div>
        )}
        {error && !duplicate && (
          <p role="alert" className="text-sm text-error-600">
            {error.message}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <p className="text-sm text-gray-500" aria-live="polite">
          Balance <BalanceText cents={balanceCents} />
          {balanceAfter !== null && (
            <>
              {" → "}
              <BalanceText cents={balanceAfter} className="font-semibold" />
            </>
          )}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => save(duplicate !== null)}
            disabled={busy}
          >
            {busy
              ? "Saving..."
              : duplicate
                ? "Record anyway"
                : SUBMIT_LABEL[mode]}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
