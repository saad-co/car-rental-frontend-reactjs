import { useState, type ReactNode } from "react";
import {
  fillTemplate,
  useMessageTemplates,
  type TemplateKind,
} from "../../api/templates.queries";
import { smsParts } from "../../utils";
import Select from "../form/Select";
import TextArea from "../form/input/TextArea";
import ConfirmDialog from "../ui/modal/ConfirmDialog";

/** Longest text (the API and the database refuse more). */
const MAX_TEXT_LENGTH = 1000;

interface ReviewTextDialogProps {
  /** Which templates to offer: the approved texts or the declined texts. */
  kind: TemplateKind;
  /** The applicant, to fill the placeholders in. */
  applicant: { firstName: string; lastName: string };
  title: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  /** What will happen, shown above the text. */
  children: ReactNode;
  /** Called with the text exactly as shown in the box (placeholders already filled in). */
  onConfirm: (message: string) => void;
  /** An optional second way to go ahead without sending a text (decline). */
  secondary?: { label: string; onClick: () => void };
  onCancel: () => void;
}

/**
 * The Approve / Decline dialog with a text to send (B81): pick one of the saved templates from Settings, see it
 * filled in with the applicant's name, and edit it before it goes out. The first template is offered at first.
 * Mount it only while it is open (`{open && <ReviewTextDialog ... />}`), so every opening starts again from a
 * template.
 */
export default function ReviewTextDialog({
  kind,
  applicant,
  title,
  confirmLabel,
  confirmVariant,
  children,
  onConfirm,
  secondary,
  onCancel,
}: ReviewTextDialogProps) {
  const templates = useMessageTemplates();
  const ofKind = templates.data?.filter((t) => t.kind === kind) ?? [];
  /** The template the admin picked; none yet means the first one. */
  const [pickedId, setPickedId] = useState<string | null>(null);
  /** The admin's own edits; null until they type, then it replaces the template's text. */
  const [edited, setEdited] = useState<string | null>(null);

  const picked = ofKind.find((t) => t.id === pickedId) ?? ofKind[0];
  const text = edited ?? (picked ? fillTemplate(picked.body, applicant) : "");
  const parts = smsParts(text.trim());

  return (
    <ConfirmDialog
      isOpen
      wide
      title={title}
      confirmLabel={confirmLabel}
      confirmVariant={confirmVariant}
      confirmDisabled={text.trim() === ""}
      onCancel={onCancel}
      onConfirm={() => onConfirm(text.trim())}
      secondary={secondary}
    >
      {children}

      {templates.isPending ? (
        <p className="mt-4">Loading the texts...</p>
      ) : templates.isError ? (
        <p role="alert" className="mt-4 text-error-600">
          {templates.error.message}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="review-template"
              className="mb-1.5 block text-theme-xs font-medium text-gray-700"
            >
              Text to send
            </label>
            <Select
              id="review-template"
              value={picked?.id ?? ""}
              options={ofKind.map((t) => ({ value: t.id, label: t.name }))}
              onChange={(id) => {
                setPickedId(id);
                // A new template replaces what was typed: the edits belonged to the old one.
                setEdited(null);
              }}
            />
          </div>
          <TextArea
            ariaLabel="Text to send"
            rows={6}
            value={text}
            onChange={setEdited}
            maxLength={MAX_TEXT_LENGTH}
            hint={
              edited !== null
                ? "Edited for this applicant only. The saved template is not changed."
                : undefined
            }
          />
          <p className="flex justify-between text-theme-xs text-gray-500">
            <span>Choosing another text replaces what is in the box.</span>
            <span>
              {text.trim().length} characters ·{" "}
              {parts === 1 ? "1 SMS" : `about ${parts} SMS`}
            </span>
          </p>
        </div>
      )}
    </ConfirmDialog>
  );
}
