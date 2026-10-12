import { useSearchParams } from "react-router";
import { usePayments, type PaymentSource } from "../../api/payments.queries";
import {
  PAYMENT_SOURCE_LABEL,
  PAYMENT_STATUS,
} from "../../components/payments/paymentLabels";
import Badge from "../../components/ui/badge/Badge";
import Pagination from "../../components/ui/pagination/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { cn, formatCents, formatDateTime } from "../../utils";

/** Payments per page. */
const PAGE_SIZE = 20;

/** The filter buttons, in display order. `undefined` means all sources. */
const SOURCE_FILTERS: { label: string; value: PaymentSource | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Zelle", value: "email_zelle" },
  { label: "Cash App", value: "email_cashapp" },
  { label: "Venmo", value: "email_venmo" },
  { label: "Stripe", value: "email_stripe" },
  { label: "Chime", value: "email_chime" },
];

/** Reads `?source=` from the URL, ignoring anything that is not a real source. */
function parseSource(value: string | null): PaymentSource | undefined {
  return SOURCE_FILTERS.find((filter) => filter.value === value)?.value;
}

const headerCellClass =
  "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs";
const cellClass = "px-5 py-4 text-gray-500 text-start text-theme-sm";

/**
 * Admin list of payments read from the payment emails, most recent first, with a source filter and
 * pagination. Until matching exists (M4) every payment is "Unmatched". Same structure as the drivers
 * list: the filter and page live in the URL.
 */
export default function PaymentsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const source = parseSource(searchParams.get("source"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isPending, isError, error, isPlaceholderData } = usePayments({
    source,
    page,
    limit: PAGE_SIZE,
  });

  /** Writes the filter and page to the URL; changing the filter goes back to page 1. */
  const show = (next: { source?: PaymentSource; page?: number }) => {
    const params = new URLSearchParams();
    if (next.source) params.set("source", next.source);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    setSearchParams(params);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-800">Payments</h1>
        <div className="flex flex-wrap gap-2">
          {SOURCE_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => show({ source: filter.value })}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                filter.value === source
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
            {source
              ? `No ${PAYMENT_SOURCE_LABEL[source]} payments.`
              : "No payments yet. They appear here as payment emails are read."}
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
                      Paid at
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Payer
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Source
                    </TableCell>
                    <TableCell
                      isHeader
                      className={cn(headerCellClass, "text-end")}
                    >
                      Amount
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Status
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Transaction id
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {data.items.map((payment) => {
                    const status = PAYMENT_STATUS[payment.status];
                    return (
                      <TableRow key={payment.id}>
                        <TableCell
                          className={cn(cellClass, "whitespace-nowrap")}
                        >
                          {formatDateTime(payment.occurredAt)}
                        </TableCell>
                        <TableCell className={cellClass}>
                          <span className="font-medium text-gray-800">
                            {payment.senderName}
                          </span>
                          {payment.senderHandle && (
                            <span className="block text-theme-xs">
                              {payment.senderHandle}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={cellClass}>
                          {PAYMENT_SOURCE_LABEL[payment.source]}
                        </TableCell>
                        <TableCell
                          className={cn(
                            cellClass,
                            "text-end font-medium whitespace-nowrap text-gray-800",
                          )}
                        >
                          {formatCents(payment.amountCents)}
                        </TableCell>
                        <TableCell className={cellClass}>
                          <Badge size="sm" color={status.color}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        {/* Cash App ids are very long: cut, with the full id on hover. */}
                        <TableCell className={cellClass}>
                          <span
                            className="block max-w-40 truncate"
                            title={payment.transactionId ?? undefined}
                          >
                            {payment.transactionId ?? "—"}
                          </span>
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
                  onPageChange={(next) => show({ source, page: next })}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
