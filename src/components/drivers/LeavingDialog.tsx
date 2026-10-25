import { useState, type ReactNode } from "react";
import type { LeftReason } from "../../api/drivers.queries";
import Label from "../form/Label";
import Select from "../form/Select";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import { LEFT_REASON_LABEL } from "./driverStatus";

const REASON_OPTIONS = Object.entries(LEFT_REASON_LABEL).map(
  ([value, label]) => ({ value, label }),
);

/**
 * "How did the driver leave?" (D81): a confirm dialog with the client's three answers. Used to deactivate a driver and
 * to send one to collections that has no reason noted yet. Mount it only while it is open, so the choice starts empty
 * every time; `onConfirm` gets the chosen reason, and the confirm button stays off until one is picked.
 */
export default function LeavingDialog({
  title,
  confirmLabel,
  confirmVariant,
  children,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  /** What will happen, shown above the choice. */
  children: ReactNode;
  onConfirm: (reason: LeftReason) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<LeftReason | "">("");
  return (
    <ConfirmDialog
      isOpen
      title={title}
      confirmLabel={confirmLabel}
      confirmVariant={confirmVariant}
      confirmDisabled={reason === ""}
      onCancel={onCancel}
      onConfirm={() => {
        if (reason !== "") onConfirm(reason);
      }}
    >
      <div className="space-y-4">
        <div>{children}</div>
        <div>
          <Label htmlFor="left-reason">How did they leave?</Label>
          <Select
            id="left-reason"
            options={REASON_OPTIONS}
            value={reason}
            onChange={(value) => setReason(value as LeftReason)}
            placeholder="Choose one"
          />
        </div>
      </div>
    </ConfirmDialog>
  );
}
