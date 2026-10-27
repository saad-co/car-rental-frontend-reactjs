import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  deleteResultMessage,
  useApplication,
  useApproveApplication,
  useArchiveApplication,
  useStartOnboarding,
  useUnarchiveApplication,
  useDeleteApplications,
  useHoldApplication,
  useRejectApplication,
  type ApplicationDetail as ApplicationDetailData,
} from "../../api/applications.queries";
import type { ApplicationsListState } from "./ApplicationsList";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import ApplicationDocuments from "../../components/applications/ApplicationDocuments";
import ApplicationNotesCard from "../../components/applications/ApplicationNotesCard";
import ConversationCard from "../../components/sms/ConversationCard";
import Button from "../../components/ui/button/Button";
import ConfirmDialog from "../../components/ui/modal/ConfirmDialog";
import ReviewTextDialog from "../../components/applications/ReviewTextDialog";
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
    // "Start onboarding" (D80) is offered on an approved application that has no driver yet; the page checks that.
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

  /** True while the Approve dialog is open (B81: pick and edit the text). */
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  /** True while the "Delete?" dialog is open. */
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /** True while the "Archive?" dialog is open: the driver is archived with the application (D84). */
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  /** True while the Decline dialog is open (B72, B81: with or without a text). */
  const [confirmingDecline, setConfirmingDecline] = useState(false);

  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const hold = useHoldApplication();
  const remove = useDeleteApplications();
  const startOnboarding = useStartOnboarding();
  const archive = useArchiveApplication();
  const unarchive = useUnarchiveApplication();
  const mutations = [
    approve,
    reject,
    hold,
    remove,
    startOnboarding,
    archive,
    unarchive,
  ];
  const busy = mutations.some((m) => m.isPending);
  const actionError = mutations.find((m) => m.isError)?.error;

  /** Clears the previous action's error, then runs this one. `message` is the text to send (approve, decline). */
  const run = (mutation: typeof approve, message?: string) => {
    mutations.forEach((m) => m.reset());
    mutation.mutate({ id, message });
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
            <ApplicationStatusBadge
              status={application.status}
              archivedAt={application.archivedAt}
            />
          </div>
          <p className="text-sm text-gray-500">
            Submitted {formatDateTime(application.submittedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {application.archivedAt ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                mutations.forEach((m) => m.reset());
                unarchive.mutate(id);
              }}
            >
              {unarchive.isPending ? "Unarchiving..." : "Unarchive"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                mutations.forEach((m) => m.reset());
                if (
                  application.driverStatus === "active" ||
                  application.driverStatus === "inactive"
                ) {
                  setConfirmingArchive(true);
                  return;
                }
                archive.mutate(id);
              }}
            >
              {archive.isPending ? "Archiving..." : "Archive"}
            </Button>
          )}
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
              onClick={() => setConfirmingDecline(true)}
            >
              {/* "Decline" is the client's word (B69); the API action is still `reject`. */}
              {reject.isPending ? "Declining..." : "Decline"}
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
          {application.status === "approved" &&
            !application.driverId &&
            !application.archivedAt && (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => {
                  mutations.forEach((m) => m.reset());
                  startOnboarding.mutate(id, {
                    // The driver now exists: go to their page, where the contract, deposit and vehicle are done.
                    onSuccess: (started) =>
                      void navigate(`/admin/drivers/${started.driverId}`),
                  });
                }}
              >
                {startOnboarding.isPending ? "Starting..." : "Start onboarding"}
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

      {application.archivedAt && (
        <p
          role="status"
          className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
        >
          This application is archived on{" "}
          {formatDateTime(application.archivedAt)}
          {application.driverId ? ", together with its driver" : ""}. It is
          hidden from the lists; Unarchive brings it back
          {application.driverId ? " (both)" : ""}.
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

      {confirmingApprove && (
        <ReviewTextDialog
          kind="application_approved"
          applicant={application}
          title={`Approve ${fullName}?`}
          confirmLabel="Approve and send text"
          onCancel={() => setConfirmingApprove(false)}
          onConfirm={(message) => {
            setConfirmingApprove(false);
            run(approve, message);
          }}
        >
          This marks the application approved and sends the text below from the
          business number to {application.phone}. No driver is created yet:
          press Start onboarding when {application.firstName} wants to go ahead.
          An approved application cannot be changed.
        </ReviewTextDialog>
      )}

      {confirmingDecline && (
        <ReviewTextDialog
          kind="application_declined"
          applicant={application}
          title={`Decline ${fullName}?`}
          confirmLabel="Decline and send text"
          confirmVariant="danger"
          onCancel={() => setConfirmingDecline(false)}
          onConfirm={(message) => {
            setConfirmingDecline(false);
            run(reject, message);
          }}
          secondary={{
            label: "Decline without text",
            onClick: () => {
              setConfirmingDecline(false);
              run(reject);
            },
          }}
        >
          Send {application.firstName} this text? You can also decline without
          texting them.
        </ReviewTextDialog>
      )}

      <ConfirmDialog
        isOpen={confirmingArchive}
        title={`Archive ${fullName}?`}
        confirmLabel="Archive"
        onCancel={() => setConfirmingArchive(false)}
        onConfirm={() => {
          setConfirmingArchive(false);
          archive.mutate(id);
        }}
      >
        {fullName} is already a driver, so their driver is archived too: billing
        and reminders stop. Unarchive brings both back.
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
                    archivedAt={application.archivedAt}
                  />,
                ],
                ["Last reviewed", formatDateTime(application.reviewedAt)],
                [
                  "Driver",
                  application.driverId ? (
                    <Link
                      key="driver"
                      to={`/admin/drivers/${application.driverId}`}
                      className="text-brand-500"
                    >
                      {application.driverStatus === "onboarding"
                        ? "Onboarding started: open driver"
                        : "View driver"}
                    </Link>
                  ) : (
                    "Not created (onboarding not started)"
                  ),
                ],
              ]}
            />
          </Card>

          <ApplicationNotesCard applicationId={application.id} />

          <Card title="Submission">
            <Rows
              rows={[
                ["Received", formatDateTime(application.receivedAt)],
                // Typed in by an admin (D68) or sent by the website form.
                application.createdBy
                  ? ["Added by", application.createdBy.email]
                  : ["Form", textOf(payload.source) ?? "—"],
                [
                  application.createdBy ? "Request id" : "Website id",
                  application.requestId,
                ],
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
