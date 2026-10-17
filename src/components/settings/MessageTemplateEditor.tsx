import { useState } from "react";
import {
  fillTemplate,
  useUpdateMessageTemplate,
  type MessageTemplate,
  type TemplateKey,
} from "../../api/templates.queries";
import { formatDateTime } from "../../utils";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";

/** Longest template (the API and the database refuse more). */
const MAX_TEMPLATE_LENGTH = 1000;

/** What each template is for, as the Settings page explains it. */
const TEMPLATE_INFO: Record<TemplateKey, { title: string; when: string }> = {
  application_approved: {
    title: "Approved text",
    when: "Sent automatically when you approve an application. The driver's login (email and temporary password) follows in a second text, which is not editable.",
  },
  application_declined: {
    title: "Declined text",
    when: 'Sent when you decline an application and choose "Decline and send text".',
  },
};

/** The sample person the preview is filled in with. */
const SAMPLE = { firstName: "Pat", lastName: "Smith" };

/**
 * Rough number of SMS a text is split into: 160 characters fit in one; longer texts go in parts of 153 (each part
 * carries a small header). Texts with emoji or some accented letters fit fewer characters per part, so this is a
 * guide, not an exact count.
 */
function smsParts(text: string): number {
  return text.length <= 160 ? 1 : Math.ceil(text.length / 153);
}

/**
 * Editor for one text template (B73): the text, the placeholders it may use, a live preview with a sample name, and
 * Save. Remount it (a `key` with `updatedAt`) to start again from the saved text.
 */
export default function MessageTemplateEditor({
  template,
}: {
  template: MessageTemplate;
}) {
  const [draft, setDraft] = useState(template.body);
  const update = useUpdateMessageTemplate();
  const info = TEMPLATE_INFO[template.key];
  const changed = draft.trim() !== template.body;
  const parts = smsParts(draft.trim());

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-800">{info.title}</h3>
        <p className="mt-1 text-sm text-gray-500">{info.when}</p>
      </div>

      <TextArea
        ariaLabel={info.title}
        rows={5}
        value={draft}
        onChange={(value) => {
          update.reset();
          setDraft(value);
        }}
        maxLength={MAX_TEMPLATE_LENGTH}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-theme-xs text-gray-500">
        <span>
          You can use{" "}
          {template.placeholders.map((name, index) => (
            <span key={name}>
              {index > 0 && ", "}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-gray-700">{`{${name}}`}</code>
            </span>
          ))}
        </span>
        <span>
          {draft.trim().length} characters ·{" "}
          {parts === 1 ? "1 SMS" : `about ${parts} SMS`}
        </span>
      </div>

      <div>
        <p className="mb-1 text-theme-xs font-medium text-gray-500">
          Preview (for {SAMPLE.firstName} {SAMPLE.lastName})
        </p>
        <p className="rounded-lg bg-gray-50 p-3 text-sm whitespace-pre-line wrap-break-word text-gray-700">
          {fillTemplate(draft.trim(), SAMPLE) || "—"}
        </p>
      </div>

      {update.isError && (
        <p role="alert" className="text-sm text-error-600">
          {update.error.message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-theme-xs text-gray-500">
          {update.isSuccess
            ? "Saved. The next text uses it."
            : template.updatedByEmail
              ? `Last edited by ${template.updatedByEmail}, ${formatDateTime(template.updatedAt)}`
              : "Default text, not edited yet."}
        </span>
        <div className="flex gap-2">
          {changed && (
            <Button
              size="sm"
              variant="outline"
              disabled={update.isPending}
              onClick={() => {
                update.reset();
                setDraft(template.body);
              }}
            >
              Undo changes
            </Button>
          )}
          <Button
            size="sm"
            disabled={!changed || draft.trim() === "" || update.isPending}
            onClick={() =>
              update.mutate({ key: template.key, body: draft.trim() })
            }
          >
            {update.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
