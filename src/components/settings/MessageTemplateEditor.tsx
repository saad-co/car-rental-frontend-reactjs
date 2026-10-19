import { useId, useState } from "react";
import {
  fillTemplate,
  useCreateMessageTemplate,
  useDeleteMessageTemplate,
  useUpdateMessageTemplate,
  type MessageTemplate,
  type TemplateKind,
} from "../../api/templates.queries";
import { formatDateTime, smsParts } from "../../utils";
import InputField from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";

/** Longest template (the API and the database refuse more). */
const MAX_TEMPLATE_LENGTH = 1000;

/** Longest template name. */
const MAX_NAME_LENGTH = 60;

/** The sample person the preview is filled in with. */
const SAMPLE = { firstName: "Pat", lastName: "Smith" };

/** Placeholders every application text may use (the API refuses any other). */
const APPLICATION_PLACEHOLDERS = ["firstName", "lastName"];

/** The name, text, placeholder hint, preview and character count shared by "edit" and "add". */
function TemplateFields({
  name,
  body,
  placeholders,
  onName,
  onBody,
}: {
  name: string;
  body: string;
  placeholders: string[];
  onName: (value: string) => void;
  onBody: (value: string) => void;
}) {
  const parts = smsParts(body.trim());
  // One id per editor: several editors are on the Settings page at once, and a label must point at its own field.
  const nameId = useId();
  return (
    <>
      <div>
        <label
          className="mb-1.5 block text-theme-xs font-medium text-gray-700"
          htmlFor={nameId}
        >
          Name (shown in the list when you pick a text)
        </label>
        <InputField
          id={nameId}
          value={name}
          onChange={(event) =>
            onName(event.target.value.slice(0, MAX_NAME_LENGTH))
          }
          placeholder="e.g. No valid licence"
        />
      </div>

      <TextArea
        ariaLabel="Text"
        rows={5}
        value={body}
        onChange={onBody}
        maxLength={MAX_TEMPLATE_LENGTH}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-theme-xs text-gray-500">
        <span>
          You can use{" "}
          {placeholders.map((placeholder, index) => (
            <span key={placeholder}>
              {index > 0 && ", "}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-gray-700">{`{${placeholder}}`}</code>
            </span>
          ))}
        </span>
        <span>
          {body.trim().length} characters ·{" "}
          {parts === 1 ? "1 SMS" : `about ${parts} SMS`}
        </span>
      </div>

      <div>
        <p className="mb-1 text-theme-xs font-medium text-gray-500">
          Preview (for {SAMPLE.firstName} {SAMPLE.lastName})
        </p>
        <p className="rounded-lg bg-gray-50 p-3 text-sm whitespace-pre-line wrap-break-word text-gray-700">
          {fillTemplate(body.trim(), SAMPLE) || "—"}
        </p>
      </div>
    </>
  );
}

/**
 * Editor for one saved text template (B73, B81): its name and text, the placeholders it may use, a live preview with
 * a sample name, Save and Delete. Remount it (a `key` with `updatedAt`) to start again from the saved text.
 *
 * @param isLastOfKind true when the kind has no other template: the API refuses to delete it, so the button is off.
 */
export function MessageTemplateEditor({
  template,
  isLastOfKind,
}: {
  template: MessageTemplate;
  isLastOfKind: boolean;
}) {
  const [name, setName] = useState(template.name);
  const [body, setBody] = useState(template.body);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const update = useUpdateMessageTemplate();
  const remove = useDeleteMessageTemplate();
  const changed =
    body.trim() !== template.body || name.trim() !== template.name;
  const error = update.error ?? remove.error;
  const busy = update.isPending || remove.isPending;

  const edit = (setter: (value: string) => void) => (value: string) => {
    update.reset();
    remove.reset();
    setter(value);
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      <TemplateFields
        name={name}
        body={body}
        placeholders={template.placeholders}
        onName={edit(setName)}
        onBody={edit(setBody)}
      />

      {error && (
        <p role="alert" className="text-sm text-error-600">
          {error.message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-theme-xs text-gray-500">
          {update.isSuccess
            ? "Saved. The next text uses it."
            : template.updatedByEmail
              ? `Last edited by ${template.updatedByEmail}, ${formatDateTime(template.updatedAt)}`
              : "Original text, not edited yet."}
        </span>
        <div className="flex flex-wrap gap-2">
          {confirmingDelete ? (
            <>
              <span className="self-center text-sm text-gray-700">
                Delete this text?
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmingDelete(false)}
              >
                Keep it
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => remove.mutate(template.id)}
              >
                {remove.isPending ? "Deleting..." : "Yes, delete"}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || isLastOfKind}
                title={
                  isLastOfKind
                    ? "The last text of its kind cannot be deleted. Edit it instead."
                    : undefined
                }
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </Button>
              {changed && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    update.reset();
                    setName(template.name);
                    setBody(template.body);
                  }}
                >
                  Undo changes
                </Button>
              )}
              <Button
                size="sm"
                disabled={
                  !changed || name.trim() === "" || body.trim() === "" || busy
                }
                onClick={() =>
                  update.mutate({
                    id: template.id,
                    name: name.trim(),
                    body: body.trim(),
                  })
                }
              >
                {update.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** The form that adds a new template of a kind (B81). `onDone` closes it, after adding or on Cancel. */
export function NewTemplateForm({
  kind,
  onDone,
}: {
  kind: TemplateKind;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const create = useCreateMessageTemplate();

  return (
    <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-25 p-4">
      <TemplateFields
        name={name}
        body={body}
        placeholders={APPLICATION_PLACEHOLDERS}
        onName={(value) => {
          create.reset();
          setName(value);
        }}
        onBody={(value) => {
          create.reset();
          setBody(value);
        }}
      />
      {create.isError && (
        <p role="alert" className="text-sm text-error-600">
          {create.error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={create.isPending}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={
            name.trim() === "" || body.trim() === "" || create.isPending
          }
          onClick={() =>
            create.mutate(
              { kind, name: name.trim(), body: body.trim() },
              { onSuccess: onDone },
            )
          }
        >
          {create.isPending ? "Adding..." : "Add text"}
        </Button>
      </div>
    </div>
  );
}
