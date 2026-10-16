import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  deleteResultMessage,
  useApplication,
  useApproveApplication,
  useDeleteApplications,
  useHoldApplication,
  useRejectApplication,
  type ApplicationDetail as ApplicationDetailData,
} from "../../api/applications.queries";
import type { ApplicationsListState } from "./ApplicationsList";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import ApplicationDocuments from "../../components/applications/ApplicationDocuments";
import ConversationCard from "../../components/sms/ConversationCard";
import Button from "../../components/ui/button/Button";
import ConfirmDialog from "../../components/ui/modal/ConfirmDialog";
import Tabs from "../../components/ui/tabs/Tabs";
import { formatDateTime, formatUsPhone } from "../../utils";
import {
  ANSWER_TABS,
  DOCUMENT_FIELDS,
  otherFields,
  textOf,
  type FieldSpec,
  type Payload,
} from "./applicationFields";

/** A white card with a title, the look of TailAdmin's transaction page cards. */
function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      {title && (
        <h2 className="mb-4 text-base font-semibold text-gray-800">{title}</h2>
      )}
      {children}
    </div>
  );
}

/** Label/value rows with dividers (TailAdmin's `CustomerDetails` layout). */
function Rows({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map(([label, value]) => (
        <li key={label} className="flex items-start gap-5 py-2.5">
          <span className="w-1/2 text-sm text-gray-500 sm:w-2/5">{label}</span>
          <span className="w-1/2 text-sm wrap-break-word text-gray-800 sm:w-3/5">
            {value}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The rows of one tab, leaving out everything the applicant left empty. */
function FieldRows({
  fields,
  payload,
}: {
  fields: FieldSpec[];
  payload: Payload;
}) {
  const rows = fields.flatMap((f): [string, string][] => {
    const value = f.value(payload);
    return value === null ? [] : [[f.label, value]];
  });
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">Nothing submitted.</p>;
  }
  return <Rows rows={rows} />;
}

/** Which review buttons make sense in each status. Approved is final, and cannot be deleted (API rules). */
function availableActions(status: ApplicationDetailData["status"]) {
  return {
    approve: status !== "approved",
    hold: status === "pending" || status === "rejected",
    reject: status === "pending" || status === "on_hold",
    delete: status !== "approved",
  };
}

/**
 * Admin page for one application: a header with the review buttons, the answers in tabs
 * (Contact, Driving, Rental, Documents, and Other only when the website sent fields we don't place),
 * and a side column with the review state and where the submission came from.
 * Approve and Delete ask for confirmation because they cannot be undone.
 */
export default function ApplicationDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: application, isPending, isError, error } = useApplication(id);

  /** True while the "Approve?" dialog is open. */
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  /** True while the "Delete?" dialog is open. */
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const hold = useHoldApplication();
  const remove = useDeleteApplications();
  const mutations = [approve, reject, hold, remove];
  const busy = mutations.some((m) => m.isPending);
  const actionError = mutations.find((m) => m.isError)?.error;

  /** Clears the previous action's error, then runs this one. */
  const run = (mutation: typeof approve) => {
    mutations.forEach((m) => m.reset());
    mutation.mutate(id);
  };

  /** Deletes this application, then goes back to the list, which shows what was removed. */
  const runDelete = () => {
    setConfirmingDelete(false);
    mutations.forEach((m) => m.reset());
    remove.mutate([id], {
      onSuccess: (result) => {
        const state: ApplicationsListState = {
          deletedNotice: deleteResultMessage(result),
        };
        // `replace`: the back button must not return to a page that no longer exists.
        void navigate("/admin/applications", { replace: true, state });
      },
    });
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
  const payload = application.payload;
  const uploadError = textOf(payload.license_upload_error);
  const others = otherFields(payload).filter((f) => f.value(payload) !== null);

  const tabs = [
    ...ANSWER_TABS.map((tab) => ({
      id: tab.id,
      label: tab.label,
      content: <FieldRows fields={tab.fields} payload={payload} />,
    })),
    {
      id: "documents",
      label: "Documents",
      content: (
        <>
          <ApplicationDocuments applicationId={application.id} />
          <div className="mt-6">
            <FieldRows fields={DOCUMENT_FIELDS} payload={payload} />
          </div>
        </>
      ),
    },
    ...(others.length > 0
      ? [
          {
            id: "other",
            label: "Other",
            content: <FieldRows fields={others} payload={payload} />,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <Link
        to="/admin/applications"
        className="inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to applications
      </Link>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-800">{fullName}</h1>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <p className="text-sm text-gray-500">
            Submitted {formatDateTime(application.submittedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.delete && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmingDelete(true)}
            >
              {remove.isPending ? "Deleting..." : "Delete"}
            </Button>
          )}
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

      {application.alertError && (
        <p
          role="alert"
          className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700"
        >
          The text alert to staff about this new application was not sent:{" "}
          {application.alertError}
        </p>
      )}

      {uploadError && (
        <p
          role="alert"
          className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700"
        >
          The licence upload failed on the website: {uploadError}
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
        {application.phone}, and texts them their login (email and a temporary
        password) from the business number. An approved application cannot be
        changed.
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={confirmingDelete}
        title={`Delete ${fullName}'s application?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={runDelete}
      >
        The application and its documents are removed for good, and its text
        history too, unless another application or a driver has the same phone.
        This cannot be undone.
      </ConfirmDialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <Card>
            <Tabs tabs={tabs} />
          </Card>

          <Card title="Review">
            <Rows
              rows={[
                [
                  "Status",
                  <ApplicationStatusBadge
                    key="status"
                    status={application.status}
                  />,
                ],
                ["Last reviewed", formatDateTime(application.reviewedAt)],
                [
                  "Driver",
                  application.driverId ? "Created on approval" : "Not created",
                ],
              ]}
            />
          </Card>

          <Card title="Submission">
            <Rows
              rows={[
                ["Received", formatDateTime(application.receivedAt)],
                ["Form", textOf(payload.source) ?? "—"],
                ["Website id", application.requestId],
              ]}
            />
          </Card>
        </div>

        {/* The chat gets the space: tall (the screen's height, like TailAdmin's chat page) and wider than the details. */}
        <div className="h-[80vh] min-h-[36rem] lg:col-span-7 lg:h-[calc(100vh-9rem)]">
          <ConversationCard
            kind="applications"
            id={application.id}
            name={fullName}
            phone={formatUsPhone(application.phone)}
          />
        </div>
      </div>
    </div>
  );
}
