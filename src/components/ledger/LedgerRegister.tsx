import {
  useLedgerPage,
  type LedgerRow,
  type LedgerTypeFilter,
} from "../../api/ledger.queries";
import { cn, chicagoToday, formatCents, formatDay } from "../../utils";
import BalanceText from "../drivers/BalanceText";
import {
  enteredBy,
  entryTypeColor,
  entryTypeLabel,
} from "../drivers/ledgerLabels";
import DataTable, { type Column } from "../tables/DataTable";
import TableCard from "../tables/TableCard";
import {
  LIST_PAGE_SIZE,
  filterOptions,
  pageCount,
  type ListParams,
} from "../tables/useListParams";
import Badge from "../ui/badge/Badge";
import { LEDGER_TYPE_LABEL, type LEDGER_URL_FILTERS } from "./ledgerFilters";
import Button from "../ui/button/Button";

/** A compact outline button for the actions at the end of a row (the shared Button is too big for a table row). */
const ROW_BUTTON =
  "rounded-lg bg-white px-3 py-1.5 text-theme-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50";

/** A small grey tag in the Item column, e.g. "Reversed · RV-1101". */
function Tag({ children }: { children: string }) {
  return (
    <Badge size="sm" color="light">
      {children}
    </Badge>
  );
}

interface LedgerRegisterProps {
  driverId: string;
  /** Search, filters, dates and page, kept in the URL. */
  view: ListParams<keyof typeof LEDGER_URL_FILTERS>;
  /** Opens the details of an entry. */
  onOpen: (row: LedgerRow) => void;
  /** "Credit" on a charge that has something left to credit. */
  onCredit: (row: LedgerRow) => void;
  /** "Reverse" on an entry that can be reversed. */
  onReverse: (row: LedgerRow) => void;
}

/**
 * The ledger's register (B86): every entry with its reference, type, who entered it, the charge or credit amount and
 * the balance after it, filtered and sorted by the API. A reversed entry and its reversal are greyed with the amount
 * struck through, because together they are zero. A row opens the entry's details.
 */
export default function LedgerRegister({
  driverId,
  view,
  onOpen,
  onCredit,
  onReverse,
}: LedgerRegisterProps) {
  const type = view.filters.type as LedgerTypeFilter | undefined;
  const oldestFirst = view.filters.order === "asc";

  const ledger = useLedgerPage(driverId, {
    type,
    from: view.from,
    to: view.to,
    search: view.search || undefined,
    order: oldestFirst ? "asc" : undefined,
    page: view.page,
    limit: LIST_PAGE_SIZE,
  });

  const filtered = Boolean(view.search || type || view.from || view.to);

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
      key: "ref",
      header: "Ref",
      className: "whitespace-nowrap font-mono text-theme-xs text-gray-500",
      render: (row) => row.ref,
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge size="sm" color={entryTypeColor(row)}>
          {entryTypeLabel(row)}
        </Badge>
      ),
    },
    {
      key: "item",
      header: "Item",
      render: (row) => (
        <div className={cn(isMuted(row) && "text-gray-400")}>
          <span className="font-medium">{row.description}</span>
          {row.internalNote && (
            <span
              className="ml-1.5 text-gray-400"
              title={`Internal note: ${row.internalNote}`}
              aria-label={`Internal note: ${row.internalNote}`}
            >
              ✎
            </span>
          )}
          <span className="mt-1 flex flex-wrap gap-1.5">
            {row.reversedByRef && (
              <Tag>{`Reversed · ${row.reversedByRef}`}</Tag>
            )}
            {row.reversalOfRef && <Tag>{`Reverses ${row.reversalOfRef}`}</Tag>}
            {row.appliesToRef && <Tag>{`Applied to ${row.appliesToRef}`}</Tag>}
          </span>
        </div>
      ),
    },
    {
      key: "by",
      header: "Entered by",
      render: (row) => {
        const by = enteredBy(row);
        return (
          <>
            {by.primary}
            {by.secondary && (
              <span className="block text-theme-xs text-gray-400">
                {by.secondary}
              </span>
            )}
          </>
        );
      },
    },
    {
      key: "charge",
      header: "Charge",
      align: "end",
      className: "whitespace-nowrap",
      render: (row) => (row.direction === "debit" ? <Amount row={row} /> : ""),
    },
    {
      key: "credit",
      header: "Credit / paid",
      align: "end",
      className: "whitespace-nowrap",
      render: (row) =>
        row.direction === "credit" ? (
          <Amount row={row} className="text-success-600" />
        ) : (
          ""
        ),
    },
    {
      key: "balance",
      header: "Balance",
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
      className: "whitespace-nowrap",
      render: (row) => (
        // A click on a button must not also open the row.
        <div
          className="flex justify-end gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          {row.creditableCents !== null && (
            <button
              type="button"
              onClick={() => onCredit(row)}
              className={ROW_BUTTON}
            >
              Credit
            </button>
          )}
          {row.canReverse && (
            <button
              type="button"
              onClick={() => onReverse(row)}
              className={ROW_BUTTON}
            >
              Reverse
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <TableCard
      title="Entries"
      search={{
        value: view.search,
        onSearch: view.setSearch,
        placeholder: "Search entries or CH-1042",
      }}
      filters={{
        groups: [
          {
            key: "type",
            label: "Type",
            options: filterOptions(LEDGER_TYPE_LABEL),
            value: type,
          },
        ],
        onApply: (values) => view.setFilters({ type: values.type }),
      }}
      dateRange={{
        label: "Dates",
        value: { from: view.from, to: view.to },
        onChange: view.setDateRange,
      }}
      onClearAll={view.clearAll}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            view.setFilters({ order: oldestFirst ? undefined : "asc" })
          }
        >
          {oldestFirst ? "Oldest first ↑" : "Newest first ↓"}
        </Button>
      }
      isPending={ledger.isPending}
      error={ledger.isError ? ledger.error : null}
      isEmpty={ledger.data?.items.length === 0}
      emptyText={
        filtered
          ? "No entries match these filters."
          : "No entries yet. Payments matched to this driver and entries you add appear here."
      }
      page={view.page}
      totalPages={ledger.data ? pageCount(ledger.data.total) : 1}
      onPageChange={view.setPage}
    >
      {ledger.data && (
        <>
          <DataTable
            columns={columns}
            rows={ledger.data.items}
            rowKey={(row) => row.id}
            onRowClick={onOpen}
            dimmed={ledger.isPlaceholderData}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3 text-theme-sm text-gray-700">
            <span>
              {ledger.data.total}{" "}
              {ledger.data.total === 1 ? "entry" : "entries"}
              {filtered ? " (filtered)" : ""}
            </span>
            <span className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Charges{" "}
                <span className="font-medium">
                  {formatCents(ledger.data.totals.debitCents)}
                </span>
              </span>
              <span>
                Credits / paid{" "}
                <span className="font-medium text-success-600">
                  {formatCents(ledger.data.totals.creditCents)}
                </span>
              </span>
              <span>
                Balance now{" "}
                <BalanceText
                  cents={ledger.data.balanceCents}
                  className="font-medium"
                />
              </span>
            </span>
          </div>
        </>
      )}
    </TableCard>
  );
}

/** A reversed entry and a reversal are shown greyed: together they are zero. */
function isMuted(row: LedgerRow): boolean {
  return row.reversedById !== null || row.kind === "reversal";
}

/** An amount in a Charge or Credit cell, struck through when the entry is cancelled. */
function Amount({ row, className }: { row: LedgerRow; className?: string }) {
  return (
    <span
      className={cn(className, isMuted(row) && "text-gray-400 line-through")}
    >
      {formatCents(row.amountCents)}
    </span>
  );
}
