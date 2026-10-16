import { useMessageTemplates } from "../../api/templates.queries";
import MessageTemplateEditor from "../../components/settings/MessageTemplateEditor";

/**
 * Settings (spec section 10). For now: the text templates sent when an application is approved or declined (B73).
 * Later: SMS mode, automation switches, reminder tiers and the other settings of the spec.
 */
export default function Settings() {
  const templates = useMessageTemplates();

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
            {templates.data.map((template) => (
              // Keyed by the saved time: after a save the editor restarts from the saved text.
              <MessageTemplateEditor
                key={`${template.key}-${template.updatedAt}`}
                template={template}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
