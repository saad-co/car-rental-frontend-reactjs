import { useState } from "react";
import { Link, useParams } from "react-router";
import { useDriver } from "../../api/drivers.queries";
import {
  useAddLedgerEntry,
  useLedgerOverview,
  useReverseLedgerEntry,
  type LedgerEntry,
  type LedgerRow,
} from "../../api/ledger.queries";
import { useRecordPayment, useVoidPayment } from "../../api/payments.queries";
import ReverseLedgerEntryDialog from "../../components/drivers/ReverseLedgerEntryDialog";
import AgingTiles from "../../components/ledger/AgingTiles";
import EntryDetailsDialog from "../../components/ledger/EntryDetailsDialog";
import LedgerHeader from "../../components/ledger/LedgerHeader";
import { LEDGER_URL_FILTERS } from "../../components/ledger/ledgerFilters";
import LedgerRegister from "../../components/ledger/LedgerRegister";
import NewEntryDialog, {
  type AppliesTo,
  type EntryMode,
} from "../../components/ledger/NewEntryDialog";
import VoidPaymentDialog from "../../components/ledger/VoidPaymentDialog";
import { useListParams } from "../../components/tables/useListParams";
import Button from "../../components/ui/button/Button";

/** An opening of the "New ledger entry" dialog: the tab it starts on, and the charge it credits (if any). */
interface AddRequest {
  mode: EntryMode;
  appliesTo?: AppliesTo;
}

/**
 * A driver's ledger on its own page (B86, `/admin/drivers/:id/ledger`): the balance, what is owed by age, and the
 * register of every entry with filters, a search, sorting and totals; a details window per entry; and the manual actions (charge, credit, credit against a charge, reverse, record a payment, void it).
 * Nothing is ever edited or deleted: a mistake is a reversal.
 */
export default function DriverLedger() {
  const { id = "" } = useParams();
  const driver = useDriver(id);
  const overview = useLedgerOverview(id);
  const view = useListParams(LEDGER_URL_FILTERS);

  const add = useAddLedgerEntry(id);
  const reverse = useReverseLedgerEntry(id);
  const record = useRecordPayment();
  const voidPayment = useVoidPayment();

  const [adding, setAdding] = useState<AddRequest | null>(null);
  const [addRound, setAddRound] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reversing, setReversing] = useState<LedgerEntry | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const openAdd = (mode: EntryMode, appliesTo?: AppliesTo) => {
    add.reset();
    record.reset();
    setAddRound((n) => n + 1);
    setAdding({ mode, appliesTo });
  };
  const openReverse = (entry: LedgerEntry) => {
    reverse.reset();
    setReversing(entry);
  };
  const openVoid = (paymentId: string) => {
    voidPayment.reset();
    setVoidingId(paymentId);
  };
  /** The "Credit" button of a row: the charge it credits, with what is left of it. */
  const creditRow = (row: LedgerRow) => {
    if (row.creditableCents === null) return;
    openAdd("credit", {
      id: row.id,
      ref: row.ref,
      description: row.description,
      creditableCents: row.creditableCents,
    });
  };

  if (driver.isPending) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }
  if (driver.isError) {
    return (
      <div className="space-y-4">
        <Link to="/admin/drivers" className="text-sm text-brand-500">
          ← Back to drivers
        </Link>
        <p role="alert" className="text-sm text-error-600">
          {driver.error.message}
        </p>
      </div>
    );
  }

  const fullName = `${driver.data.firstName} ${driver.data.lastName}`;
  const statementQuery = new URLSearchParams();
  if (view.from) statementQuery.set("from", view.from);
  if (view.to) statementQuery.set("to", view.to);
  const statementLink = `/admin/drivers/${id}/ledger/statement${
    statementQuery.size > 0 ? `?${statementQuery}` : ""
  }`;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/drivers"
        className="inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to drivers
      </Link>

      <LedgerHeader driver={driver.data} overview={overview.data} />

      {overview.isError && (
        <p role="alert" className="text-sm text-error-600">
          {overview.error.message}
        </p>
      )}
      {overview.data && <AgingTiles aging={overview.data.aging} />}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => openAdd("debit")}>
          + Charge
        </Button>
        <Button variant="outline" size="sm" onClick={() => openAdd("credit")}>
          + Credit
        </Button>
        <Button variant="outline" size="sm" onClick={() => openAdd("payment")}>
          + Payment
        </Button>
        <Link
          to={statementLink}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50"
        >
          Statement
        </Link>
      </div>

      <LedgerRegister
        driverId={id}
        view={view}
        onOpen={(row) => setOpenId(row.id)}
        onCredit={creditRow}
        onReverse={openReverse}
      />

      <EntryDetailsDialog
        driverId={id}
        entryId={openId}
        onClose={() => setOpenId(null)}
        onOpenEntry={setOpenId}
        onCredit={(charge) => {
          setOpenId(null);
          openAdd("credit", charge);
        }}
        onReverse={(entry) => {
          setOpenId(null);
          openReverse(entry);
        }}
        onVoid={(paymentId) => {
          setOpenId(null);
          openVoid(paymentId);
        }}
      />

      <NewEntryDialog
        key={`add-${addRound}`}
        isOpen={adding !== null}
        driverId={id}
        driverName={fullName}
        balanceCents={overview.data?.balanceCents ?? 0}
        initialMode={adding?.mode ?? "debit"}
        appliesTo={adding?.appliesTo}
        busy={add.isPending || record.isPending}
        entryError={add.error}
        paymentError={record.error}
        onSaveEntry={(entry) =>
          add.mutate(entry, { onSuccess: () => setAdding(null) })
        }
        onSavePayment={(payment) =>
          record.mutate(payment, { onSuccess: () => setAdding(null) })
        }
        onCancel={() => setAdding(null)}
      />

      <ReverseLedgerEntryDialog
        key={`reverse-${reversing?.id ?? "none"}`}
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

      <VoidPaymentDialog
        key={`void-${voidingId ?? "none"}`}
        paymentId={voidingId}
        busy={voidPayment.isPending}
        error={voidPayment.error?.message ?? null}
        onConfirm={(paymentId, reason) =>
          voidPayment.mutate(
            { paymentId, reason },
            { onSuccess: () => setVoidingId(null) },
          )
        }
        onCancel={() => setVoidingId(null)}
      />
    </div>
  );
}
