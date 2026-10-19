import { useState } from "react";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";

const MAX_REASON = 400;

interface VoidPaymentDialogProps {
  /** The payment to void; null keeps the dialog closed. */
  paymentId: string | null;
  busy: boolean;
  error: string | null;
  onConfirm: (paymentId: string, reason: string) => void;
  onCancel: () => void;
}

/**
 * Confirms voiding a payment that was recorded by hand (it bounced, or was a mistake) and asks why. The payment is
 * marked rejected and its credit on the ledger is reversed; both stay in the history.
 */
export default function VoidPaymentDialog({
  paymentId,
  busy,
  error,
  onConfirm,
  onCancel,
}: VoidPaymentDialogProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const close = () => {
    setReason("");
    setTouched(false);
    onCancel();
  };

  const confirm = () => {
    setTouched(true);
    if (paymentId && reason.trim() !== "") onConfirm(paymentId, reason.trim());
  };

  return (
    <Modal
      isOpen={paymentId !== null}
      onClose={close}
      showCloseButton={false}
      className="max-w-md p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-gray-800">
        Void this payment?
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        The payment is marked voided and its credit is reversed, so the driver
        owes it again. Nothing is deleted: the history keeps both.
      </p>
      <div className="mt-4">
        <TextArea
          ariaLabel="Reason for voiding"
          rows={3}
          placeholder="e.g. Check bounced / recorded by mistake"
          value={reason}
          onChange={setReason}
          maxLength={MAX_REASON}
          error={touched && reason.trim() === ""}
          hint={touched && reason.trim() === "" ? "Say why." : undefined}
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
        <Button variant="danger" size="sm" onClick={confirm} disabled={busy}>
          {busy ? "Voiding..." : "Void payment"}
        </Button>
      </div>
    </Modal>
  );
}
