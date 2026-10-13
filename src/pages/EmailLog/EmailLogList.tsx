import { useSearchParams } from "react-router";
import {
  useInboundEmails,
  type InboundEmailStatus,
} from "../../api/inbound-emails.queries";
import {
  EMAIL_PROVIDER_LABEL,
  EMAIL_STATUS,
} from "../../components/email-log/emailLabels";
import Badge from "../../components/ui/badge/Badge";
import Pagination from "../../components/ui/pagination/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { cn, formatDateTime } from "../../utils";

/** Emails per page. */
const PAGE_SIZE = 20;

/** The filter buttons, in display order. `undefined` means every outcome. */
const STATUS_FILTERS: {
  label: string;
  value: InboundEmailStatus | undefined;
}[] = [
  { label: "All", value: undefined },
  { label: "Payments", value: "processed" },
  { label: "Not payments", value: "not_payment" },
  { label: "Duplicates", value: "duplicate_payment" },
  { label: "Could not read", value: "extraction_failed" },
  { label: "Rejected", value: "rejected_unverified" },
];

/** Reads `?status=` from the URL, ignoring anything that is not a real outcome. */
function parseStatus(value: string | null): InboundEmailStatus | undefined {
  return STATUS_FILTERS.find((filter) => filter.value === value)?.value;
}

const headerCellClass =
  "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs";
const cellClass = "px-5 py-4 text-gray-500 text-start text-theme-sm";

/**
 * The email log (spec section 10): every payment email the system read, with what happened to it and
 * why. Problems (rejected, could not read) are never hidden: they show here with their reason.
 * Same structure as the other lists: the filter and page live in the URL.
 */
export default function EmailLogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseStatus(searchParams.get("status"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isPending, isError, error, isPlaceholderData } =
    useInboundEmails({ status, page, limit: PAGE_SIZE });

  /** Writes the filter and page to the URL; changing the filter goes back to page 1. */
  const show = (next: { status?: InboundEmailStatus; page?: number }) => {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    setSearchParams(params);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-800">Email log</h1>
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
            {status
              ? "No emails with this outcome."
              : "No emails read yet. They appear here as the payment mailbox is read."}
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
                      Received
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Provider
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Subject
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Outcome
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Details
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {data.items.map((email) => {
                    const outcome = EMAIL_STATUS[email.status];
                    return (
                      <TableRow key={email.id}>
                        <TableCell
                          className={cn(cellClass, "whitespace-nowrap")}
                        >
                          {formatDateTime(email.receivedAt)}
                        </TableCell>
                        <TableCell className={cellClass}>
                          {EMAIL_PROVIDER_LABEL[email.provider]}
                          <span className="block text-theme-xs">
                            {email.fromAddress ?? "no sender"}
                          </span>
                        </TableCell>
                        <TableCell
                          className={cn(cellClass, "max-w-80 text-gray-800")}
                        >
                          {email.subject || "(no subject)"}
                        </TableCell>
                        <TableCell className={cellClass}>
                          <Badge size="sm" color={outcome.color}>
                            {outcome.label}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(cellClass, "max-w-96")}>
                          {email.statusReason ??
                            (email.authDkimPass
                              ? `Verified (${email.authDkimDomain})`
                              : "—")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
