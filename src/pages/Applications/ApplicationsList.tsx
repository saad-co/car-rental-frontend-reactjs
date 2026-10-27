import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  deleteResultMessage,
  useApplications,
  useArchiveApplication,
  useDeleteApplications,
  useUnarchiveApplication,
  type ApplicationListItem,
  type ApplicationStatus,
} from "../../api/applications.queries";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import { APPLICATION_STATUS } from "../../components/applications/applicationStatus";
import DataTable, { type Column } from "../../components/tables/DataTable";
import {
  APPLICATIONS_SHOW_FILTER,
  applicationsShowFilterGroup,
} from "../../components/tables/archivedFilter";
import TableCard from "../../components/tables/TableCard";
import {
  LIST_PAGE_SIZE,
  pageCount,
  useListParams,
} from "../../components/tables/useListParams";
import AvatarText from "../../components/ui/avatar/AvatarText";
import Button from "../../components/ui/button/Button";
import ConfirmDialog from "../../components/ui/modal/ConfirmDialog";
import { PlusIcon, TrashBinIcon } from "../../icons";
import { formatDateTime } from "../../utils";

/** Every status, in display order. */
const STATUSES = Object.keys(APPLICATION_STATUS) as ApplicationStatus[];

/** The Status choices of the filter dropdown. */
const STATUS_OPTIONS = [
  { label: "All", value: undefined },
  ...STATUSES.map((value) => ({
    label: APPLICATION_STATUS[value].label,
    value,
  })),
];

/** Message the detail page leaves for this page after deleting (`navigate(..., { state })`). */
export interface ApplicationsListState {
  deletedNotice?: string;
}

const isDeletable = (application: ApplicationListItem) =>
  application.status !== "approved";

/** The person is already an active or inactive driver: archiving the application archives the driver too (D84). */
const hasLiveDriver = (application: ApplicationListItem) =>
  application.driverStatus === "active" ||
  application.driverStatus === "inactive";

/**
 * Admin list of driver applications, newest first, built on the shared table components (B75): search, a Status
 * filter, 8 rows per page. The view lives in the URL (`?q=pat&status=pending&page=2`).
 *
 * Archived applications are hidden; the Show filter ("Archived only") lists them (D80). Each row has Archive or
 * Unarchive, which is not a delete: archived ones keep their documents and texts. Delete stays separate.
 *
 * Rows can be ticked and deleted together, or one by one with the trash icon (B66). Approved applications can be
 * neither: the API refuses to delete them. The selection holds only rows of the page on screen and is cleared
 * whenever the view changes (search, filter, page, back button), so nothing out of sight is ever deleted.
 */
export default function ApplicationsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const view = useListParams({ status: STATUSES, ...APPLICATIONS_SHOW_FILTER });
  const status = view.filters.status as ApplicationStatus | undefined;
  const archivedOnly = view.filters.show === "archived";
  /** The "Became drivers" view (D84): applications whose person is now an active or inactive driver. */
  const becameDriver = view.filters.show === "driver";

  const { data, isPending, isError, error, isPlaceholderData } =
    useApplications({
      status,
      archived: archivedOnly || undefined,
      becameDriver: becameDriver || undefined,
      search: view.search || undefined,
      from: view.from,
      to: view.to,
      page: view.page,
      limit: LIST_PAGE_SIZE,
    });

  /** Ids of the ticked rows. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** The view the selection belongs to; when the view changes, the selection is dropped. */
  const viewKey = `${view.search}|${status ?? ""}|${archivedOnly}|${becameDriver}|${view.from ?? ""}|${view.to ?? ""}|${view.page}`;
  const [selectionView, setSelectionView] = useState(viewKey);
  if (viewKey !== selectionView) {
    setSelectionView(viewKey);
    setSelected(new Set());
  }

  /** The applications the "Delete?" dialog is asking about; null when it is closed. */
  const [toDelete, setToDelete] = useState<ApplicationListItem[] | null>(null);
  /** The application the "Archive?" dialog is asking about: one whose driver is active or inactive (D84). */
  const [toArchive, setToArchive] = useState<ApplicationListItem | null>(null);
  /** What the last delete did, shown above the table. Starts with the detail page's message, if any. */
  const [notice, setNotice] = useState<string | null>(
    (location.state as ApplicationsListState | null)?.deletedNotice ?? null,
  );
  const deleteApplications = useDeleteApplications();
  const archive = useArchiveApplication();
  const unarchive = useUnarchiveApplication();
  const archiveBusy = archive.isPending || unarchive.isPending;
  /** Why the last archive or unarchive failed, shown above the table. */
  const archiveError = archive.error ?? unarchive.error;

  const runDelete = () => {
    if (!toDelete) return;
    const ids = toDelete.map((a) => a.id);
    setToDelete(null);
    setNotice(null);
    deleteApplications.mutate(ids, {
      onSuccess: (result) => {
        setSelected(
          (current) => new Set([...current].filter((id) => !ids.includes(id))),
        );
        setNotice(deleteResultMessage(result));
      },
    });
  };

  const columns: Column<ApplicationListItem>[] = [
    {
      key: "applicant",
      header: "Applicant",
      render: (application) => {
        const name = `${application.firstName} ${application.lastName}`;
        return (
          <div className="flex items-center gap-3">
            <AvatarText name={name} />
            <div className="min-w-0">
              {/* A real link too, so the row works with the keyboard and middle-click. */}
              <Link
                to={`/admin/applications/${application.id}`}
                onClick={(event) => event.stopPropagation()}
                className="block font-medium text-gray-800 hover:text-brand-500"
              >
                {name}
              </Link>
              <span className="block text-gray-500">{application.email}</span>
            </div>
            {application.alertError && (
              <span
                title={`The text alert to staff was not sent: ${application.alertError}`}
                className="rounded-full bg-warning-50 px-2 py-0.5 text-theme-xs font-medium whitespace-nowrap text-warning-700"
              >
                Alert not sent
              </span>
            )}
          </div>
        );
      },
    },
    { key: "phone", header: "Phone", render: (a) => a.phone },
    { key: "city", header: "City", render: (a) => a.city ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <ApplicationStatusBadge status={a.status} archivedAt={a.archivedAt} />
      ),
    },
    {
      key: "received",
      header: "Received",
      render: (a) => formatDateTime(a.receivedAt),
    },
    {
      key: "action",
      header: "Action",
      align: "center",
      className: "w-px",
      render: (application) => (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label={`${application.archivedAt ? "Unarchive" : "Archive"} ${application.firstName} ${application.lastName}`}
            disabled={archiveBusy}
            onClick={(event) => {
              event.stopPropagation(); // not also open the row
              archive.reset();
              unarchive.reset();
              if (!application.archivedAt && hasLiveDriver(application)) {
                setToArchive(application);
                return;
              }
              (application.archivedAt ? unarchive : archive).mutate(
                application.id,
              );
            }}
            className="text-sm text-gray-700 hover:text-brand-500 disabled:opacity-50"
          >
            {application.archivedAt ? "Unarchive" : "Archive"}
          </button>
          {isDeletable(application) && (
            <button
              type="button"
              aria-label={`Delete ${application.firstName} ${application.lastName}`}
              title="Delete"
              disabled={deleteApplications.isPending}
              onClick={(event) => {
                event.stopPropagation(); // not also open the row
                setToDelete([application]);
              }}
              className="text-gray-700 hover:text-error-500 disabled:opacity-50"
            >
              <TrashBinIcon />
            </button>
          )}
        </div>
      ),
    },
  ];

  const ticked = (data?.items ?? []).filter((a) => selected.has(a.id));
  const deleteCount = toDelete?.length ?? 0;

  return (
    <div className="space-y-6">
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700"
        >
          {notice}
        </p>
      )}

      {deleteApplications.isError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {deleteApplications.error.message}
        </p>
      )}

      {archiveError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {archiveError.message}
        </p>
      )}

      <ConfirmDialog
        isOpen={toArchive !== null}
        title={`Archive ${toArchive?.firstName} ${toArchive?.lastName}?`}
        confirmLabel="Archive"
        onCancel={() => setToArchive(null)}
        onConfirm={() => {
          if (toArchive) archive.mutate(toArchive.id);
          setToArchive(null);
        }}
      >
        They are already a driver, so their driver is archived too: billing and
        reminders stop. Unarchive brings both back.
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={toDelete !== null}
        title={
          deleteCount === 1
            ? `Delete ${toDelete![0].firstName} ${toDelete![0].lastName}'s application?`
            : `Delete ${deleteCount} applications?`
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setToDelete(null)}
        onConfirm={runDelete}
      >
        {deleteCount === 1 ? "Its documents are" : "Their documents are"}{" "}
        removed too, and the text history unless another application or a driver
        has the same phone. This cannot be undone.
      </ConfirmDialog>

      <TableCard
        title="Applications"
        search={{
          value: view.search,
          onSearch: view.setSearch,
          placeholder: "Search name, email, phone, city...",
        }}
        filters={{
          groups: [
            {
              key: "status",
              label: "Status",
              options: STATUS_OPTIONS,
              value: status,
            },
            applicationsShowFilterGroup(view.filters.show),
          ],
          onApply: (values) =>
            view.setFilters({ status: values.status, show: values.show }),
        }}
        dateRange={{
          label: "Received",
          value: { from: view.from, to: view.to },
          onChange: view.setDateRange,
        }}
        onClearAll={view.clearAll}
        actions={
          <>
            {ticked.length > 0 && (
              <Button
                size="sm"
                variant="danger"
                disabled={deleteApplications.isPending}
                onClick={() => setToDelete(ticked)}
              >
                {deleteApplications.isPending
                  ? "Deleting..."
                  : `Delete (${ticked.length})`}
              </Button>
            )}
            <Button
              size="sm"
              startIcon={<PlusIcon />}
              onClick={() => void navigate("/admin/applications/new")}
            >
              Add application
            </Button>
          </>
        }
        isPending={isPending}
        error={isError ? error : null}
        isEmpty={data?.items.length === 0}
        emptyText={
          view.search ||
          status ||
          archivedOnly ||
          becameDriver ||
          view.from ||
          view.to
            ? "No applications match this search or filter."
            : "No applications."
        }
        page={view.page}
        totalPages={data ? pageCount(data.total) : 1}
        onPageChange={view.setPage}
      >
        {data && (
          <DataTable
            columns={columns}
            rows={data.items}
            rowKey={(a) => a.id}
            onRowClick={(a) => void navigate(`/admin/applications/${a.id}`)}
            selection={{
              selected,
              onChange: setSelected,
              canSelect: isDeletable,
              disabledReason: "Approved applications cannot be deleted",
              label: (a) => `${a.firstName} ${a.lastName}`,
            }}
            dimmed={isPlaceholderData}
          />
        )}
      </TableCard>
    </div>
  );
}
