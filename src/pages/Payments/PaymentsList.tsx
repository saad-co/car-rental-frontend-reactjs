import { useState } from "react";
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
  paymentSourceLabel,
} from "../../components/payments/paymentLabels";
import DataTable, { type Column } from "../../components/tables/DataTable";
import TableCard from "../../components/tables/TableCard";
import {
  LIST_PAGE_SIZE,
  filterOptions,
  pageCount,
  useListParams,
} from "../../components/tables/useListParams";
import { cn, formatCents, formatDateTime } from "../../utils";

type MatchFilter = "assigned" | "review";

/** The Match choices of the filter dropdown. */
const MATCH_LABEL: Record<MatchFilter, string> = {
  assigned: "Assigned",
  review: "Needs review",
};

/** The sources payments are read from today, in display order (the Source choices of the filter dropdown). */
const SOURCE_LABEL: Partial<Record<PaymentSource, string>> = {
  email_zelle: "Zelle",
  email_cashapp: "Cash App",
  email_venmo: "Venmo",
  email_stripe: "Stripe",
  email_chime: "Chime",
};

const smallButtonClass =
  "rounded-md px-2 py-1 text-theme-xs font-medium ring-1 ring-inset";

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
          className="block text-theme-xs text-gray-500"
          title={payment.matchExplanation ?? undefined}
        >
          {how}
          {confidence}
        </span>
      </>
    );
  }
  if (!payment.matchExplanation && !payment.suggestedDriver) {
    return <span className="text-theme-xs text-gray-500">Matching...</span>;
  }
  return (
    <>
      <span className="font-medium text-warning-600">Needs review</span>
      <span
        className="block text-theme-xs text-gray-500"
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
 * Admin list of payments read from the payment emails, most recent first, on the shared table components (B75):
 * search (payer name or handle, driver name), Match and Source filters, 8 rows per page; the view lives in the URL.
 * Shows the driver each payment was matched to (alias, exact name, AI or manual) and lets the admin assign the ones
 * that need review.
 */
export default function PaymentsList() {
  const view = useListParams({
    match: Object.keys(MATCH_LABEL),
    source: Object.keys(SOURCE_LABEL),
  });
  const match = view.filters.match as MatchFilter | undefined;
  const source = view.filters.source as PaymentSource | undefined;

  const { data, isPending, isError, error, isPlaceholderData } = usePayments({
    match,
    source,
    search: view.search || undefined,
    from: view.from,
    to: view.to,
    page: view.page,
    limit: LIST_PAGE_SIZE,
  });
  const assign = useAssignPayment();

  /** The payment whose "Assign" dialog is open. */
  const [assigning, setAssigning] = useState<Payment | null>(null);
  /** Result of the last assignment, shown above the table. */
  const [notice, setNotice] = useState<string | null>(null);

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

  const columns: Column<Payment>[] = [
    {
      key: "paidAt",
      header: "Paid at",
      className: "whitespace-nowrap",
      render: (payment) => formatDateTime(payment.occurredAt),
    },
    {
      key: "payer",
      header: "Payer",
      render: (payment) => (
        <>
          <span className="font-medium text-gray-800">
            {payment.senderName}
          </span>
          <span className="block text-theme-xs text-gray-500">
            {paymentSourceLabel(payment.source, payment.manualMethod)}
            {payment.senderHandle && ` · ${payment.senderHandle}`}
          </span>
        </>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "end",
      className: "font-medium whitespace-nowrap text-gray-800",
      render: (payment) => formatCents(payment.amountCents),
    },
    {
      key: "driver",
      header: "Driver",
      render: (payment) => <DriverCell payment={payment} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "whitespace-nowrap",
      render: (payment) => {
        const suggested = payment.suggestedDriver;
        return (
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
        );
      },
    },
  ];

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
      {assign.isError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {assign.error.message}
        </p>
      )}

      <TableCard
        title="Payments"
        search={{
          value: view.search,
          onSearch: view.setSearch,
          placeholder: "Search payer or driver...",
        }}
        filters={{
          groups: [
            {
              key: "match",
              label: "Match",
              options: filterOptions(MATCH_LABEL),
              value: match,
            },
            {
              key: "source",
              label: "Source",
              options: filterOptions(
                SOURCE_LABEL as Record<string, string>,
                "All sources",
              ),
              value: source,
            },
          ],
          onApply: (values) =>
            view.setFilters({ match: values.match, source: values.source }),
        }}
        dateRange={{
          label: "Paid",
          value: { from: view.from, to: view.to },
          onChange: view.setDateRange,
        }}
        onClearAll={view.clearAll}
        isPending={isPending}
        error={isError ? error : null}
        isEmpty={data?.items.length === 0}
        emptyText={
          match === "review" &&
          !view.search &&
          !source &&
          !view.from &&
          !view.to
            ? "Nothing needs review."
            : view.search || match || source || view.from || view.to
              ? "No payments match this search or these filters."
              : "No payments yet. They appear here as payment emails are read."
        }
        page={view.page}
        totalPages={data ? pageCount(data.total) : 1}
        onPageChange={view.setPage}
      >
        {data && (
          <DataTable
            columns={columns}
            rows={data.items}
            rowKey={(payment) => payment.id}
            dimmed={isPlaceholderData}
          />
        )}
      </TableCard>

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
