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
  onConfirm: () => void;
  onCancel: () => void;
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
  onConfirm,
  onCancel,
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
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
