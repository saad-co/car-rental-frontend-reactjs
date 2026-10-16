import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  deleteResultMessage,
  useApplications,
  useDeleteApplications,
  type ApplicationStatus,
} from "../../api/applications.queries";
import Checkbox from "../../components/form/input/Checkbox";
import Button from "../../components/ui/button/Button";
import ConfirmDialog from "../../components/ui/modal/ConfirmDialog";
import Pagination from "../../components/ui/pagination/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { cn, formatDateTime } from "../../utils";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import { APPLICATION_STATUS } from "../../components/applications/applicationStatus";

/** Applications per page. */
const PAGE_SIZE = 20;

/** The filter buttons, in display order. `undefined` means all statuses. */
const STATUS_FILTERS: {
  label: string;
  value: ApplicationStatus | undefined;
}[] = [
  { label: "All", value: undefined },
  ...(Object.keys(APPLICATION_STATUS) as ApplicationStatus[]).map((value) => ({
    label: APPLICATION_STATUS[value].label,
    value,
  })),
];

/** Reads `?status=` from the URL, ignoring anything that is not a real status. */
function parseStatus(value: string | null): ApplicationStatus | undefined {
  return value && value in APPLICATION_STATUS
    ? (value as ApplicationStatus)
    : undefined;
}

const headerCellClass =
  "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs";
const cellClass = "px-5 py-4 text-gray-500 text-start text-theme-sm";

/** Message the detail page leaves for this page after deleting (`navigate(..., { state })`). */
export interface ApplicationsListState {
  deletedNotice?: string;
}

/**
 * Admin list of driver applications, newest first, with a status filter and pagination.
 *
 * The filter and page live in the URL (`?status=pending&page=2`), not in React state, so a
 * refresh, the back button or a shared link shows the same view.
 *
 * Rows can be ticked and deleted together (B66). Approved applications cannot be ticked: the API refuses to
 * delete them. The selection holds only rows of the page on screen and is cleared when the filter or page
 * changes, so nothing out of sight is ever deleted.
 */
export default function ApplicationsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const status = parseStatus(searchParams.get("status"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isPending, isError, error, isPlaceholderData } =
    useApplications({ status, page, limit: PAGE_SIZE });

  /** Ids of the ticked rows. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** True while the "Delete?" dialog is open. */
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /** What the last delete did, shown above the table. Starts with the detail page's message, if any. */
  const [notice, setNotice] = useState<string | null>(
    (location.state as ApplicationsListState | null)?.deletedNotice ?? null,
  );
  const deleteApplications = useDeleteApplications();

  /** Writes the filter and page to the URL; changing the filter goes back to page 1. */
  const show = (next: { status?: ApplicationStatus; page?: number }) => {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    setSelected(new Set());
    setSearchParams(params);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  /** Rows on this page that may be deleted (not approved). */
  const deletable = (data?.items ?? []).filter((a) => a.status !== "approved");
  const allTicked =
    deletable.length > 0 && deletable.every((a) => selected.has(a.id));

  const toggle = (id: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(deletable.map((a) => a.id)) : new Set());

  const runDelete = () => {
    setConfirmingDelete(false);
    setNotice(null);
    deleteApplications.mutate([...selected], {
      onSuccess: (result) => {
        setSelected(new Set());
        setNotice(deleteResultMessage(result));
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-800">Applications</h1>
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="danger"
              disabled={deleteApplications.isPending}
              onClick={() => setConfirmingDelete(true)}
            >
              {deleteApplications.isPending
                ? "Deleting..."
                : `Delete (${selected.size})`}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => show({ status: filter.value })}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                filter.value === status
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

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

      <ConfirmDialog
        isOpen={confirmingDelete}
        title={
          selected.size === 1
            ? "Delete 1 application?"
            : `Delete ${selected.size} applications?`
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={runDelete}
      >
        Their documents are removed too, and their text history unless another
        application or a driver has the same phone. This cannot be undone.
      </ConfirmDialog>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {isPending ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : isError ? (
          <p role="alert" className="p-6 text-sm text-error-600">
            {error.message}
          </p>
        ) : data.items.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No applications.</p>
        ) : (
          <>
            <div
              className={cn(
                "max-w-full overflow-x-auto",
                isPlaceholderData && "opacity-60",
              )}
            >
              <Table>
                <TableHeader className="border-b border-gray-100">
                  <TableRow>
                    <TableCell isHeader className="w-12 py-3 pl-5">
                      <Checkbox
                        ariaLabel="Select all deletable applications on this page"
                        checked={allTicked}
                        disabled={deletable.length === 0}
                        onChange={toggleAll}
                      />
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Name
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Email
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Phone
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      City
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Status
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Received
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {data.items.map((application) => (
                    <TableRow
                      key={application.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        navigate(`/admin/applications/${application.id}`)
                      }
                    >
                      <TableCell className="w-12 py-4 pl-5">
                        {/* Ticking must not also open the row. */}
                        <div
                          onClick={(event) => event.stopPropagation()}
                          title={
                            application.status === "approved"
                              ? "Approved applications cannot be deleted"
                              : undefined
                          }
                        >
                          <Checkbox
                            ariaLabel={`Select ${application.firstName} ${application.lastName}`}
                            checked={selected.has(application.id)}
                            disabled={application.status === "approved"}
                            onChange={(checked) =>
                              toggle(application.id, checked)
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(cellClass, "font-medium text-gray-800")}
                      >
                        {/* A real link too, so the row works with the keyboard and middle-click. */}
                        <Link
                          to={`/admin/applications/${application.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="hover:text-brand-500"
                        >
                          {application.firstName} {application.lastName}
                        </Link>
                        {application.alertError && (
                          <span
                            title={`The text alert to staff was not sent: ${application.alertError}`}
                            className="ml-2 rounded-full bg-warning-50 px-2 py-0.5 text-theme-xs font-medium text-warning-700"
                          >
                            Alert not sent
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={cellClass}>
                        {application.email}
                      </TableCell>
                      <TableCell className={cellClass}>
                        {application.phone}
                      </TableCell>
                      <TableCell className={cellClass}>
                        {application.city ?? "—"}
                      </TableCell>
                      <TableCell className={cellClass}>
                        <ApplicationStatusBadge status={application.status} />
                      </TableCell>
                      <TableCell className={cellClass}>
                        {formatDateTime(application.receivedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="border-t border-gray-100">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(next) => show({ status, page: next })}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
