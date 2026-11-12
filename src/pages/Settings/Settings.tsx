import { useState } from "react";
import {
  useMessageTemplates,
  type MessageTemplate,
  type TemplateKind,
} from "../../api/templates.queries";
import {
  MessageTemplateEditor,
  NewTemplateForm,
} from "../../components/settings/MessageTemplateEditor";
import LedgerPresetsSettings from "../../components/settings/LedgerPresetsSettings";
import ReminderSettingsCard from "../../components/settings/ReminderSettingsCard";
import Button from "../../components/ui/button/Button";

interface KindInfo {
  kind: TemplateKind;
  title: string;
  when: string;
}

/** What each kind of application text is for, as the Settings page explains it, in the order shown. */
const APPLICATION_KINDS: KindInfo[] = [
  {
    kind: "application_approved",
    title: "Approved texts",
    when: "One of these is sent when you approve an application: you pick it in the Approve dialog and can edit it first. A driver added with Add driver gets the first text in the list. The first text in the list is the one offered first.",
  },
  {
    kind: "application_declined",
    title: "Declined texts",
    when: 'One of these is sent when you decline an application and choose "Decline and send text": you pick it in the Decline dialog and can edit it first.',
  },
];

/**
 * The payment-reminder texts (Fleet revisions section 6), one per kind, in the order a driver meets them. Each can be
 * edited here; the placeholders each may use are listed under its box.
 */
const REMINDER_KINDS: KindInfo[] = [
  {
    kind: "reminder_upcoming",
    title: "Payment due soon",
    when: "Sent to a weekly driver 48 hours before the rent is due (a driver can be switched off on their page).",
  },
  {
    kind: "reminder_late",
    title: "Payment missed",
    when: "Sent once when a payment is missed, the first time the driver is late.",
  },
  {
    kind: "reminder_high_balance",
    title: "Several payments behind",
    when: "Sent daily to a daily driver who is 2, 3, 4 or 5 payments behind. It takes the place of any other text that day.",
  },
  {
    kind: "reminder_balance",
    title: "Balance over $100",
    when: "Sent every 3 days while more than $100 is past due; a payment starts the 3 days again (a driver can be switched off on their page).",
  },
  {
    kind: "reminder_payment_received",
    title: "Payment received",
    when: "Sent after a payment, with what is still past due.",
  },
];

/** The kinds of one group of texts, each with its editors (and an "Add a text" button when the group allows several). */
function TemplateSections({
  kinds,
  templates,
  allowAdd,
}: {
  kinds: KindInfo[];
  templates: MessageTemplate[];
  allowAdd: boolean;
}) {
  /** The kind whose "add a text" form is open, if any. */
  const [adding, setAdding] = useState<TemplateKind | null>(null);
  return (
    <div className="space-y-8 divide-y divide-gray-100 [&>*:not(:first-child)]:pt-8">
      {kinds.map(({ kind, title, when }) => {
        const ofKind = templates.filter((t) => t.kind === kind);
        return (
          <section key={kind} className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800">{title}</h3>
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
            {allowAdd &&
              (adding === kind ? (
                <NewTemplateForm kind={kind} onDone={() => setAdding(null)} />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdding(kind)}
                >
                  Add a text
                </Button>
              ))}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Settings (spec section 10): the text templates sent when an application is approved or declined (B73, B81): several
 * per kind, each with a name; the payment reminders (Fleet revisions section 6): the switch, the payment link and the
 * five reminder texts; and the ledger presets, the quick-pick cards of the New ledger entry window (D66). Later: the other
 * settings of the spec.
 */
export default function Settings() {
  const templates = useMessageTemplates();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Settings</h1>

      <div className="rounded-2xl border border-gray-200 bg-surface p-6">
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
          <TemplateSections
            kinds={APPLICATION_KINDS}
            templates={templates.data}
            allowAdd
          />
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-surface p-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Payment reminders
        </h2>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          Automatic texts to drivers who are behind. A driver is never texted
          more than once a day, a paid driver is not texted, and a driver who
          replied STOP is left out. Each driver's page lists the reminders sent
          to them.
        </p>
        <ReminderSettingsCard />

        <h3 className="mt-8 mb-4 border-t border-gray-100 pt-8 text-base font-semibold text-gray-800">
          Reminder texts
        </h3>
        {templates.isPending ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : templates.isError ? (
          <p role="alert" className="text-sm text-error-600">
            {templates.error.message}
          </p>
        ) : (
          <TemplateSections
            kinds={REMINDER_KINDS}
            templates={templates.data}
            allowAdd={false}
          />
        )}
      </div>

      <LedgerPresetsSettings />
    </div>
  );
}
