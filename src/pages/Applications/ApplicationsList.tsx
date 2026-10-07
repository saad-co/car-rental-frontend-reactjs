import { useSearchParams } from "react-router";
import {
  useApplications,
  type ApplicationStatus,
} from "../../api/applications.queries";
import Pagination from "../../components/ui/pagination/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { cn, formatDateTime } from "../../utils";
import ApplicationStatusBadge, {
  APPLICATION_STATUS,
} from "../../components/applications/ApplicationStatusBadge";

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

/**
 * Admin list of driver applications, newest first, with a status filter and pagination.
 *
 * The filter and page live in the URL (`?status=pending&page=2`), not in React state, so a
 * refresh, the back button or a shared link shows the same view.
 */
export default function ApplicationsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseStatus(searchParams.get("status"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isPending, isError, error, isPlaceholderData } =
    useApplications({ status, page, limit: PAGE_SIZE });

  /** Writes the filter and page to the URL; changing the filter goes back to page 1. */
  const show = (next: { status?: ApplicationStatus; page?: number }) => {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    setSearchParams(params);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-800">Applications</h1>
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
                    <TableRow key={application.id}>
                      <TableCell
                        className={cn(cellClass, "font-medium text-gray-800")}
                      >
                        {application.firstName} {application.lastName}
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
