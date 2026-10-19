import type { ReactNode } from "react";
import Button from "../button/Button";
import { Modal } from "./index";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  /** What will happen if the user confirms. */
  children: ReactNode;
  /** Text of the confirm button, e.g. "Approve". */
  confirmLabel: string;
  /** `danger` makes the confirm button red, for actions that destroy data. Default `primary`. */
  confirmVariant?: "primary" | "danger";
  /** Greys out the confirm button, e.g. while a required field is empty. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * An optional second way to go ahead, shown between Cancel and the confirm button (an outline button), e.g.
   * "Decline without text" next to "Decline and send text" (B72).
   */
  secondary?: { label: string; onClick: () => void };
  /** A wider dialog, for content such as a text box (also used whenever there is a `secondary` button). */
  wide?: boolean;
}

/**
 * "Are you sure?" dialog for actions that cannot be undone, built on TailAdmin's Modal.
 * Replaces the browser's `window.confirm()`, which cannot be styled.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  children,
  confirmLabel,
  confirmVariant = "primary",
  confirmDisabled = false,
  onConfirm,
  onCancel,
  secondary,
  wide = secondary !== undefined,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      showCloseButton={false}
      // Wider with a second action, so the three buttons fit on one row.
      className={`${wide ? "max-w-lg" : "max-w-md"} p-6 sm:p-8`}
    >
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <div className="mt-2 text-sm text-gray-500">{children}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        {secondary && (
          <Button variant="outline" size="sm" onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        )}
        <Button
          size="sm"
          variant={confirmVariant}
          disabled={confirmDisabled}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
