import { useState } from "react";
import {
  useMessageTemplates,
  type TemplateKind,
} from "../../api/templates.queries";
import {
  MessageTemplateEditor,
  NewTemplateForm,
} from "../../components/settings/MessageTemplateEditor";
import LedgerPresetsSettings from "../../components/settings/LedgerPresetsSettings";
import Button from "../../components/ui/button/Button";

/** What each kind of text is for, as the Settings page explains it, in the order shown. */
const KINDS: { kind: TemplateKind; title: string; when: string }[] = [
  {
    kind: "application_approved",
    title: "Approved texts",
    when: "One of these is sent when you approve an application: you pick it in the Approve dialog and can edit it first. The driver's login (email and temporary password) follows in a second text, which is not editable. The first text in the list is the one offered first.",
  },
  {
    kind: "application_declined",
    title: "Declined texts",
    when: 'One of these is sent when you decline an application and choose "Decline and send text": you pick it in the Decline dialog and can edit it first.',
  },
];

/**
 * Settings (spec section 10). For now: the text templates sent when an application is approved or declined (B73,
 * B81): several per kind, each with a name; and the ledger presets, the quick-pick cards of the New ledger entry window
 * (D66). Later: SMS mode, automation switches, reminder tiers and the other
 * settings of the spec.
 */
export default function Settings() {
  const templates = useMessageTemplates();
  /** The kind whose "add a text" form is open, if any. */
  const [adding, setAdding] = useState<TemplateKind | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Settings</h1>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Message templates
        </h2>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          The texts applicants receive. Placeholders like{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-gray-700">
            {"{firstName}"}
          </code>{" "}
          are replaced with the applicant's details when the text is sent.
        </p>

        {templates.isPending ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : templates.isError ? (
          <p role="alert" className="text-sm text-error-600">
            {templates.error.message}
          </p>
        ) : (
          <div className="space-y-8 divide-y divide-gray-100 [&>*:not(:first-child)]:pt-8">
            {KINDS.map(({ kind, title, when }) => {
              const ofKind = templates.data.filter((t) => t.kind === kind);
              return (
                <section key={kind} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{when}</p>
                  </div>
                  {ofKind.map((template) => (
                    // Keyed by the saved time: after a save the editor restarts from the saved text.
                    <MessageTemplateEditor
                      key={`${template.id}-${template.updatedAt}`}
                      template={template}
                      isLastOfKind={ofKind.length <= 1}
                    />
                  ))}
                  {adding === kind ? (
                    <NewTemplateForm
                      kind={kind}
                      onDone={() => setAdding(null)}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAdding(kind)}
                    >
                      Add a text
                    </Button>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <LedgerPresetsSettings />
    </div>
  );
}
