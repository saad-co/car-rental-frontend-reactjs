import { useState } from "react";
import { useSearchParams } from "react-router";
import {
  useAssignPayment,
  usePayments,
  type AssignPaymentResult,
  type Payment,
  type PaymentSource,
} from "../../api/payments.queries";
import AssignDriverDialog from "../../components/payments/AssignDriverDialog";
import {
  MATCH_METHOD_LABEL,
  PAYMENT_SOURCE_LABEL,
} from "../../components/payments/paymentLabels";
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

type MatchFilter = "assigned" | "review";

/** The match filter buttons. `undefined` means every payment. */
const MATCH_FILTERS: { label: string; value: MatchFilter | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Assigned", value: "assigned" },
  { label: "Needs review", value: "review" },
];

/** The source filter buttons, in display order. `undefined` means all sources. */
const SOURCE_FILTERS: { label: string; value: PaymentSource | undefined }[] = [
  { label: "All sources", value: undefined },
  { label: "Zelle", value: "email_zelle" },
  { label: "Cash App", value: "email_cashapp" },
  { label: "Venmo", value: "email_venmo" },
  { label: "Stripe", value: "email_stripe" },
  { label: "Chime", value: "email_chime" },
];

/** Reads a filter from the URL, ignoring anything that is not one of the buttons. */
function parse<T>(
  filters: { value: T | undefined }[],
  value: string | null,
): T | undefined {
  return filters.find((filter) => filter.value === value)?.value;
}

const headerCellClass =
  "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs";
const cellClass = "px-5 py-4 text-gray-500 text-start text-theme-sm";
const smallButtonClass =
  "rounded-md px-2 py-1 text-theme-xs font-medium ring-1 ring-inset";

/** A row of filter buttons; the selected one is filled. */
function FilterButtons<T>({
  filters,
  value,
  onChange,
}: {
  filters: { label: string; value: T | undefined }[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.label}
          type="button"
          onClick={() => onChange(filter.value)}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            filter.value === value
              ? "bg-brand-500 text-white"
              : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

/** The driver cell: who it belongs to and how that was decided, or the AI's suggestion for review. */
function DriverCell({ payment }: { payment: Payment }) {
  if (payment.driver) {
    const how = payment.matchMethod
      ? MATCH_METHOD_LABEL[payment.matchMethod]
      : "";
    const confidence =
      payment.matchMethod === "ai" && payment.matchConfidence !== null
        ? ` ${Math.round(payment.matchConfidence * 100)}%`
        : "";
    return (
      <>
        <span className="font-medium text-gray-800">
          {payment.driver.firstName} {payment.driver.lastName}
        </span>
        <span
          className="block text-theme-xs"
          title={payment.matchExplanation ?? undefined}
        >
          {how}
          {confidence}
        </span>
      </>
    );
  }
  if (!payment.matchExplanation && !payment.suggestedDriver) {
    return <span className="text-theme-xs">Matching...</span>;
  }
  return (
    <>
      <span className="font-medium text-warning-600">Needs review</span>
      <span
        className="block text-theme-xs"
        title={payment.matchExplanation ?? undefined}
      >
        {payment.suggestedDriver
          ? `Suggested: ${payment.suggestedDriver.firstName} ${payment.suggestedDriver.lastName}` +
            (payment.matchConfidence !== null
              ? ` (${Math.round(payment.matchConfidence * 100)}%)`
              : "")
          : "No suggestion"}
      </span>
    </>
  );
}

/** What the last assignment did, worded for the admin, including an alias that belongs to someone else. */
function assignMessage(result: AssignPaymentResult): string {
  const driver = result.payment.driver;
  const name = driver ? `${driver.firstName} ${driver.lastName}` : "the driver";
  let message = `Assigned to ${name}.`;
  if (result.aliasSaved) {
    message += ` "${result.payment.senderName}" is now their alias.`;
  }
  if (result.aliasOwnedBy) {
    message += ` Note: "${result.payment.senderName}" is still an alias of ${result.aliasOwnedBy.firstName} ${result.aliasOwnedBy.lastName}, so future payments from it go to them.`;
  }
  return message;
}

/**
 * Admin list of payments read from the payment emails, most recent first. Shows the driver each payment was
 * matched to (alias, exact name, AI or manual) and lets the admin assign the ones that need review. The
 * filters and page live in the URL.
 */
export default function PaymentsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const match = parse(MATCH_FILTERS, searchParams.get("match"));
  const source = parse(SOURCE_FILTERS, searchParams.get("source"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isPending, isError, error, isPlaceholderData } = usePayments({
    match,
    source,
    page,
    limit: PAGE_SIZE,
  });
  const assign = useAssignPayment();

  /** The payment whose "Assign" dialog is open. */
  const [assigning, setAssigning] = useState<Payment | null>(null);
  /** Result of the last assignment, shown above the table. */
  const [notice, setNotice] = useState<string | null>(null);

  /** Writes the filters and page to the URL; changing a filter goes back to page 1. */
  const show = (next: {
    match?: MatchFilter;
    source?: PaymentSource;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    if (next.match) params.set("match", next.match);
    if (next.source) params.set("source", next.source);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    setSearchParams(params);
  };

  /** Assigns, then closes the dialog and shows what happened. */
  const runAssign = (payment: Payment, driverId: string) => {
    setNotice(null);
    assign.mutate(
      { paymentId: payment.id, driverId },
      {
        onSuccess: (result) => {
          setAssigning(null);
          setNotice(assignMessage(result));
        },
      },
    );
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-800">Payments</h1>
          <FilterButtons
            filters={MATCH_FILTERS}
            value={match}
            onChange={(value) => show({ match: value, source })}
          />
        </div>
        <FilterButtons
          filters={SOURCE_FILTERS}
          value={source}
          onChange={(value) => show({ match, source: value })}
        />
      </div>

      {notice && (
        <p className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {notice}
        </p>
      )}
      {assign.isError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {assign.error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {isPending ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : isError ? (
          <p role="alert" className="p-6 text-sm text-error-600">
            {error.message}
          </p>
        ) : data.items.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            {match === "review"
              ? "Nothing needs review."
              : match || source
                ? "No payments match these filters."
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
                    <TableCell
                      isHeader
                      className={cn(headerCellClass, "text-end")}
                    >
                      Amount
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      Driver
                    </TableCell>
                    <TableCell isHeader className={headerCellClass}>
                      <span className="sr-only">Actions</span>
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {data.items.map((payment) => {
                    const suggested = payment.suggestedDriver;
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
                          <span className="block text-theme-xs">
                            {PAYMENT_SOURCE_LABEL[payment.source]}
                            {payment.senderHandle &&
                              ` · ${payment.senderHandle}`}
                          </span>
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
                          <DriverCell payment={payment} />
                        </TableCell>
                        <TableCell
                          className={cn(cellClass, "whitespace-nowrap")}
                        >
                          <div className="flex justify-end gap-2">
                            {!payment.driver && suggested && (
                              <button
                                type="button"
                                disabled={assign.isPending}
                                onClick={() => runAssign(payment, suggested.id)}
                                className={cn(
                                  smallButtonClass,
                                  "bg-brand-500 text-white ring-brand-500 hover:bg-brand-600",
                                )}
                              >
                                Accept
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setAssigning(payment)}
                              className={cn(
                                smallButtonClass,
                                "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50",
                              )}
                            >
                              {payment.driver ? "Change" : "Assign"}
                            </button>
                          </div>
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
                  onPageChange={(next) => show({ match, source, page: next })}
                />
              </div>
            )}
          </>
        )}
      </div>

      <AssignDriverDialog
        payment={assigning}
        busy={assign.isPending}
        onAssign={(driverId) => {
          if (assigning) runAssign(assigning, driverId);
        }}
        onCancel={() => setAssigning(null)}
      />
    </div>
  );
}
