import {
  useInboundEmails,
  type InboundEmail,
  type InboundEmailProvider,
  type InboundEmailStatus,
} from "../../api/inbound-emails.queries";
import {
  EMAIL_PROVIDER_LABEL,
  EMAIL_STATUS,
} from "../../components/email-log/emailLabels";
import DataTable, { type Column } from "../../components/tables/DataTable";
import TableCard from "../../components/tables/TableCard";
import {
  LIST_PAGE_SIZE,
  filterOptions,
  pageCount,
  useListParams,
} from "../../components/tables/useListParams";
import Badge from "../../components/ui/badge/Badge";
import { formatDateTime } from "../../utils";

/** The Outcome choices of the filter dropdown, worded as groups ("Payments", not "Payment"). */
const OUTCOME_LABEL: Record<InboundEmailStatus, string> = {
  processed: "Payments",
  not_payment: "Not payments",
  duplicate_payment: "Duplicates",
  extraction_failed: "Could not read",
  rejected_unverified: "Rejected",
};

const columns: Column<InboundEmail>[] = [
  {
    key: "received",
    header: "Received",
    className: "whitespace-nowrap",
    render: (email) => formatDateTime(email.receivedAt),
  },
  {
    key: "provider",
    header: "Provider",
    render: (email) => (
      <>
        {EMAIL_PROVIDER_LABEL[email.provider]}
        <span className="block text-theme-xs text-gray-500">
          {email.fromAddress ?? "no sender"}
        </span>
      </>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    className: "max-w-80 text-gray-800",
    render: (email) => email.subject || "(no subject)",
  },
  {
    key: "outcome",
    header: "Outcome",
    render: (email) => {
      const outcome = EMAIL_STATUS[email.status];
      return (
        <Badge size="sm" color={outcome.color}>
          {outcome.label}
        </Badge>
      );
    },
  },
  {
    key: "details",
    header: "Details",
    className: "max-w-96 text-gray-500",
    render: (email) =>
      email.statusReason ??
      (email.authDkimPass ? `Verified (${email.authDkimDomain})` : "—"),
  },
];

/**
 * The email log (spec section 10): every payment email the system read, with what happened to it and why, on the
 * shared table components (B75): search (subject, sender), Outcome and Provider filters, 8 rows per page; the view
 * lives in the URL. Problems (rejected, could not read) are never hidden: they show here with their reason.
 */
export default function EmailLogList() {
  const view = useListParams({
    status: Object.keys(OUTCOME_LABEL),
    provider: Object.keys(EMAIL_PROVIDER_LABEL),
  });
  const status = view.filters.status as InboundEmailStatus | undefined;
  const provider = view.filters.provider as InboundEmailProvider | undefined;

  const { data, isPending, isError, error, isPlaceholderData } =
    useInboundEmails({
      status,
      provider,
      search: view.search || undefined,
      page: view.page,
      limit: LIST_PAGE_SIZE,
    });

  return (
    <TableCard
      title="Email log"
      search={{
        value: view.search,
        onSearch: view.setSearch,
        placeholder: "Search subject or sender...",
      }}
      filters={{
        groups: [
          {
            key: "status",
            label: "Outcome",
            options: filterOptions(OUTCOME_LABEL),
            value: status,
          },
          {
            key: "provider",
            label: "Provider",
            options: filterOptions(EMAIL_PROVIDER_LABEL),
            value: provider,
          },
        ],
        onApply: (values) =>
          view.setFilters({ status: values.status, provider: values.provider }),
      }}
      isPending={isPending}
      error={isError ? error : null}
      isEmpty={data?.items.length === 0}
      emptyText={
        view.search || status || provider
          ? "No emails match this search or these filters."
          : "No emails read yet. They appear here as the payment mailbox is read."
      }
      page={view.page}
      totalPages={data ? pageCount(data.total) : 1}
      onPageChange={view.setPage}
    >
      {data && (
        <DataTable
          columns={columns}
          rows={data.items}
          rowKey={(email) => email.id}
          dimmed={isPlaceholderData}
        />
      )}
    </TableCard>
  );
}
