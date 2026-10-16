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
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * An optional second way to go ahead, shown between Cancel and the confirm button (an outline button), e.g.
   * "Decline without text" next to "Decline and send text" (B72).
   */
  secondary?: { label: string; onClick: () => void };
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
  onConfirm,
  onCancel,
  secondary,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      showCloseButton={false}
      className="max-w-md p-6 sm:p-8"
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
        <Button size="sm" variant={confirmVariant} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
