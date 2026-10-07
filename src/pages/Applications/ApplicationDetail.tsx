import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import {
  useApplication,
  useApproveApplication,
  useHoldApplication,
  useRejectApplication,
  type ApplicationDetail as ApplicationDetailData,
} from "../../api/applications.queries";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import Button from "../../components/ui/button/Button";
import ConfirmDialog from "../../components/ui/modal/ConfirmDialog";
import { formatDateTime } from "../../utils";

/** A titled white card, the same look as TailAdmin's ComponentCard. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <h2 className="px-6 py-4 text-base font-medium text-gray-800">{title}</h2>
      <div className="border-t border-gray-100 px-6 py-4">{children}</div>
    </div>
  );
}

/** Label/value rows in two columns on wide screens. */
function Fields({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-theme-xs text-gray-500">{label}</dt>
          <dd className="text-sm text-gray-800 wrap-break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Shows any submitted value as text: lists joined, true/false as Yes/No, empty as a dash. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** `has_insurance_last_45_days` → `Has insurance last 45 days`. */
function formatKey(key: string): string {
  const words = key.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Which review buttons make sense in each status. Approved is final (API rule). */
function availableActions(status: ApplicationDetailData["status"]) {
  return {
    approve: status !== "approved",
    hold: status === "pending" || status === "rejected",
    reject: status === "pending" || status === "on_hold",
  };
}

/**
 * Admin page for one application: contact details, the full submission, and the review
 * buttons. Approve asks for confirmation because it creates a driver and cannot be undone.
 */
export default function ApplicationDetail() {
  const { id = "" } = useParams();
  const { data: application, isPending, isError, error } = useApplication(id);

  /** True while the "Approve?" dialog is open. */
  const [confirmingApprove, setConfirmingApprove] = useState(false);

  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const hold = useHoldApplication();
  const mutations = [approve, reject, hold];
  const busy = mutations.some((m) => m.isPending);
  const actionError = mutations.find((m) => m.isError)?.error;

  /** Clears the previous action's error, then runs this one. */
  const run = (mutation: typeof approve) => {
    mutations.forEach((m) => m.reset());
    mutation.mutate(id);
  };

  if (isPending) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }
  if (isError) {
    return (
      <div className="space-y-4">
        <Link to="/admin/applications" className="text-sm text-brand-500">
          ← Back to applications
        </Link>
        <p role="alert" className="text-sm text-error-600">
          {error.message}
        </p>
      </div>
    );
  }

  const actions = availableActions(application.status);
  const fullName = `${application.firstName} ${application.lastName}`;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/applications"
        className="inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to applications
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-800">{fullName}</h1>
          <ApplicationStatusBadge status={application.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.hold && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => run(hold)}
            >
              Put on hold
            </Button>
          )}
          {actions.reject && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => run(reject)}
            >
              Reject
            </Button>
          )}
          {actions.approve && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => setConfirmingApprove(true)}
            >
              {approve.isPending ? "Approving..." : "Approve"}
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {actionError.message}
        </p>
      )}

      <ConfirmDialog
        isOpen={confirmingApprove}
        title={`Approve ${fullName}?`}
        confirmLabel="Approve"
        onCancel={() => setConfirmingApprove(false)}
        onConfirm={() => {
          setConfirmingApprove(false);
          run(approve);
        }}
      >
        This creates a driver with {application.email} and phone{" "}
        {application.phone}. An approved application cannot be changed.
      </ConfirmDialog>

      <Section title="Applicant">
        <Fields
          rows={[
            ["Email", application.email],
            ["Phone (as entered)", application.phone],
            ["City", formatValue(application.city)],
            ["ZIP", formatValue(application.zip)],
            ["Submitted", formatDateTime(application.submittedAt)],
            ["Received", formatDateTime(application.receivedAt)],
          ]}
        />
      </Section>

      <Section title="Review">
        <Fields
          rows={[
            ["Last reviewed", formatDateTime(application.reviewedAt)],
            [
              "Driver",
              application.driverId ? "Created on approval" : "Not created",
            ],
          ]}
        />
      </Section>

      <Section title="Documents">
        <Fields
          rows={[
            ["Licence", formatValue(application.licenseStoragePath)],
            ["Driver rating", formatValue(application.ratingStoragePath)],
            ["Earnings", formatValue(application.earningsStoragePath)],
          ]}
        />
        <p className="mt-3 text-theme-xs text-gray-500">
          Files are stored in the client's Supabase bucket; viewing them needs
          access to it (B17).
        </p>
      </Section>

      <Section title="Full submission">
        <Fields
          rows={Object.entries(application.payload).map(([key, value]) => [
            formatKey(key),
            formatValue(value),
          ])}
        />
      </Section>
    </div>
  );
}
