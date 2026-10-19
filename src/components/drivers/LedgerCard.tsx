import { useState } from "react";
import { Link } from "react-router";
import {
  LEDGER_PAGE_SIZE,
  useAddLedgerEntry,
  useLedger,
  useReverseLedgerEntry,
  type LedgerRow,
} from "../../api/ledger.queries";
import { useRecordPayment } from "../../api/payments.queries";
import { chicagoToday, formatCents, formatDay } from "../../utils";
import NewEntryDialog from "../ledger/NewEntryDialog";
import DataTable, { type Column } from "../tables/DataTable";
import Badge from "../ui/badge/Badge";
import Button from "../ui/button/Button";
import Pagination from "../ui/pagination/Pagination";
import Tabs from "../ui/tabs/Tabs";
import BalanceText from "./BalanceText";
import LedgerSummaryTab from "./LedgerSummaryTab";
import { entryTypeLabel } from "./ledgerLabels";
import ReverseLedgerEntryDialog from "./ReverseLedgerEntryDialog";

/** The ledger history: newest first, 8 rows per page, each with the balance after it. */
function EntriesTab({
  driverId,
  onReverse,
}: {
  driverId: string;
  onReverse: (row: LedgerRow) => void;
}) {
  const [page, setPage] = useState(1);
  const ledger = useLedger(driverId, page);

  if (ledger.isPending)
    return <p className="text-sm text-gray-500">Loading...</p>;
  if (ledger.isError) {
    return (
      <p role="alert" className="text-sm text-error-600">
        {ledger.error.message}
      </p>
    );
  }
  if (ledger.data.total === 0) {
    return (
      <p className="text-sm text-gray-500">
        No entries yet. Payments matched to this driver and entries you add
        appear here.
      </p>
    );
  }

  const columns: Column<LedgerRow>[] = [
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap",
      render: (row) => {
        const recorded = chicagoToday(new Date(row.createdAt));
        return (
          <>
            {formatDay(row.effectiveDate)}
            {recorded !== row.effectiveDate && (
              <span className="block text-theme-xs text-gray-400">
                recorded {formatDay(recorded)}
              </span>
            )}
          </>
        );
      },
    },
    {
      key: "what",
      header: "Entry",
      render: (row) => (
        <>
          <span className="font-medium text-gray-800">
            {entryTypeLabel(row)}
          </span>
          {row.reversedById && (
            <span className="ml-2">
              <Badge size="sm" color="light">
                Reversed
              </Badge>
            </span>
          )}
          <span className="block text-theme-xs text-gray-500">
            {row.description}
            {row.createdByEmail && ` · by ${row.createdByEmail}`}
          </span>
        </>
      ),
    },
    {
      key: "charge",
      header: "Charge",
      align: "end",
      className: "whitespace-nowrap",
      render: (row) =>
        row.direction === "debit" ? formatCents(row.amountCents) : "",
    },
    {
      key: "credit",
      header: "Credit",
      align: "end",
      className: "whitespace-nowrap",
      render: (row) =>
        row.direction === "credit" ? formatCents(row.amountCents) : "",
    },
    {
      key: "balance",
      header: "Balance after",
      align: "end",
      className: "whitespace-nowrap",
      render: (row) => (
        <BalanceText cents={row.runningBalanceCents} className="font-medium" />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "end",
      render: (row) =>
        row.canReverse ? (
          <Button variant="outline" size="sm" onClick={() => onReverse(row)}>
            Reverse
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <div className="-mx-6 max-w-full overflow-x-auto">
        <DataTable
          columns={columns}
          rows={ledger.data.items}
          rowKey={(row) => row.id}
          dimmed={ledger.isPlaceholderData}
        />
      </div>
      {ledger.data.total > LEDGER_PAGE_SIZE && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(ledger.data.total / LEDGER_PAGE_SIZE)}
            onPageChange={setPage}
          />
        </div>
      )}
    </>
  );
}

/**
 * A driver's ledger (D58): the balance now, the history with the balance after each entry, and weekly and monthly
 * summaries. An admin adds manual charges or credits and reverses entries; nothing is ever edited or deleted.
 */
export default function LedgerCard({
  driverId,
  driverName,
  balanceCents,
}: {
  driverId: string;
  driverName: string;
  /** From the driver detail (refetched after every ledger change). */
  balanceCents: number;
}) {
  const add = useAddLedgerEntry(driverId);
  const record = useRecordPayment();
  const reverse = useReverseLedgerEntry(driverId);
  const [adding, setAdding] = useState(false);
  /** Bumped on every opening, so the dialog starts empty with a new request key. */
  const [addRound, setAddRound] = useState(0);
  const [reversing, setReversing] = useState<LedgerRow | null>(null);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Ledger</h2>
          <p className="mt-1">
            <BalanceText
              cents={balanceCents}
              className="text-title-sm font-semibold"
            />
          </p>
          <p className="text-theme-xs text-gray-500">
            Balance now: payments and credits minus charges. Rent charges start
            with billing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/admin/drivers/${driverId}/ledger`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50"
          >
            Open full ledger
          </Link>
          <Button
            size="sm"
            onClick={() => {
              add.reset();
              record.reset();
              setAddRound((n) => n + 1);
              setAdding(true);
            }}
          >
            Add entry
          </Button>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            id: "entries",
            label: "Entries",
            content: (
              <EntriesTab
                driverId={driverId}
                onReverse={(row) => {
                  reverse.reset();
                  setReversing(row);
                }}
              />
            ),
          },
          {
            id: "weekly",
            label: "Weekly",
            content: <LedgerSummaryTab driverId={driverId} period="week" />,
          },
          {
            id: "monthly",
            label: "Monthly",
            content: <LedgerSummaryTab driverId={driverId} period="month" />,
          },
        ]}
      />

      <NewEntryDialog
        key={addRound}
        isOpen={adding}
        driverId={driverId}
        driverName={driverName}
        balanceCents={balanceCents}
        initialMode="debit"
        busy={add.isPending || record.isPending}
        entryError={add.error}
        paymentError={record.error}
        onSaveEntry={(entry) =>
          add.mutate(entry, { onSuccess: () => setAdding(false) })
        }
        onSavePayment={(payment) =>
          record.mutate(payment, { onSuccess: () => setAdding(false) })
        }
        onCancel={() => setAdding(false)}
      />
      <ReverseLedgerEntryDialog
        key={reversing?.id ?? "none"}
        entry={reversing}
        busy={reverse.isPending}
        error={reverse.error?.message ?? null}
        onConfirm={(reason) => {
          if (!reversing) return;
          reverse.mutate(
            { entryId: reversing.id, reason },
            { onSuccess: () => setReversing(null) },
          );
        }}
        onCancel={() => setReversing(null)}
      />
    </div>
  );
}
