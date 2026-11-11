import { useState } from "react";
import { Link } from "react-router";
import { usePayments, type Payment } from "../../../api/payments.queries";
import { formatCents, formatDateTime } from "../../../utils";
import DataTable, { type Column } from "../../tables/DataTable";
import TableCard from "../../tables/TableCard";
import { LIST_PAGE_SIZE, pageCount } from "../../tables/useListParams";

/**
 * Every payment collected in a range of Chicago days (D93): amount, date and time received, driver (the client's "every
 * payment record shows..."; the On Time / Late status and fee wait for the late-fee decision, B126). Read from the
 * existing payments list (`GET /payments`, confirmed only), so the same payments the totals above add up.
 */
export default function PaymentRecords({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = usePayments({
    status: "confirmed",
    from,
    to,
    page,
    limit: LIST_PAGE_SIZE,
  });

  const columns: Column<Payment>[] = [
    {
      key: "amount",
      header: "Amount",
      render: (row) => (
        <span className="num font-medium text-gray-800">
          {formatCents(row.amountCents)}
        </span>
      ),
    },
    {
      key: "received",
      header: "Received",
      className: "whitespace-nowrap",
      render: (row) => formatDateTime(row.occurredAt),
    },
    {
      key: "driver",
      header: "Driver",
      render: (row) =>
        row.driver ? (
          <Link
            to={`/admin/drivers/${row.driver.id}`}
            className="font-medium text-gray-800 hover:text-brand-500"
          >
            {row.driver.firstName} {row.driver.lastName}
          </Link>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <TableCard
      title="Payments collected"
      isPending={isPending}
      error={error}
      isEmpty={data?.items.length === 0}
      emptyText="No payments were collected in this range."
      page={page}
      totalPages={pageCount(data?.total ?? 0)}
      onPageChange={setPage}
    >
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.id}
      />
    </TableCard>
  );
}
