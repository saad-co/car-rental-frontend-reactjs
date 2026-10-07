import { useSearchParams } from "react-router";
import { useDrivers, type DriverStatus } from "../../api/drivers.queries";
import Badge from "../../components/ui/badge/Badge";
import Pagination from "../../components/ui/pagination/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { cn, formatDateTime, formatUsPhone } from "../../utils";

/** Drivers per page. */
const PAGE_SIZE = 20;

/** The filter buttons, in display order. `undefined` means all statuses. */
const STATUS_FILTERS: { label: string; value: DriverStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

/** Reads `?status=` from the URL, ignoring anything that is not a real status. */
function parseStatus(value: string | null): DriverStatus | undefined {
  return value === "active" || value === "inactive" ? value : undefined;
}

const headerCellClass =
  "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs";
const cellClass = "px-5 py-4 text-gray-500 text-start text-theme-sm";

/**
 * Admin list of drivers, newest first, with a status filter and pagination. Drivers are
 * created by approving an application. Same structure as the applications list: the filter
 * and page live in the URL.
 */
export default function DriversList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseStatus(searchParams.get("status"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isPending, isError, error, isPlaceholderData } = useDrivers({
    status,
    page,
    limit: PAGE_SIZE,
  });

  /** Writes the filter and page to the URL; changing the filter goes back to page 1. */
  const show = (next: { status?: DriverStatus; page?: number }) => {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    setSearchParams(params);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-800">Drivers</h1>
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
          <p className="p-6 text-sm text-gray-500">
            No drivers. Drivers are created by approving an application.
          </p>
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
                      Status
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Since
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {data.items.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell
                        className={cn(cellClass, "font-medium text-gray-800")}
                      >
                        {driver.firstName} {driver.lastName}
                      </TableCell>
                      <TableCell className={cellClass}>
                        {driver.email}
                      </TableCell>
                      <TableCell className={cellClass}>
                        {formatUsPhone(driver.phone)}
                      </TableCell>
                      <TableCell className={cellClass}>
                        <Badge
                          size="sm"
                          color={
                            driver.status === "active" ? "success" : "light"
                          }
                        >
                          {driver.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className={cellClass}>
                        {formatDateTime(driver.createdAt)}
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
