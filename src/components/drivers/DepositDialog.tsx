import { useState } from "react";
import { centsToDollars, parseDollarsToCents } from "../../utils";
import Label from "../form/Label";
import InputField from "../form/input/InputField";
import ConfirmDialog from "../ui/modal/ConfirmDialog";

/** The most the API takes for the deposit: what a 4-byte integer column holds (D82). */
const MAX_DEPOSIT_CENTS = 2_147_483_647;

/**
 * "How much was the deposit?" (D82): the amount typed when the Deposit paid step is ticked, or recorded / corrected
 * later. Shown as dollars, sent as integer cents. Mount it only while it is open, so the box starts from
 * `initialCents` (empty for a first tick) every time.
 */
export default function DepositDialog({
  title,
  confirmLabel,
  initialCents,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmLabel: string;
  /** The amount already recorded, when correcting it. */
  initialCents: number | null;
  onConfirm: (cents: number) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(
    initialCents === null ? "" : centsToDollars(initialCents),
  );
  const [touched, setTouched] = useState(false);
  const cents = parseDollarsToCents(amount);
  const problem =
    cents === null
      ? "Enter an amount like 500 or 500.00."
      : cents > MAX_DEPOSIT_CENTS
        ? "That amount is too large."
        : null;

  return (
    <ConfirmDialog
      isOpen
      title={title}
      confirmLabel={confirmLabel}
      confirmDisabled={problem !== null}
      onCancel={onCancel}
      onConfirm={() => {
        if (cents !== null && problem === null) onConfirm(cents);
      }}
    >
      <div>
        <Label htmlFor="deposit-amount">Deposit paid ($)</Label>
        <InputField
          id="deposit-amount"
          value={amount}
          placeholder="500.00"
          onChange={(event) => {
            setAmount(event.target.value);
            setTouched(true);
          }}
          onBlur={() => setTouched(true)}
          error={touched && problem !== null}
          hint={touched && problem !== null ? problem : undefined}
        />
      </div>
    </ConfirmDialog>
  );
}
