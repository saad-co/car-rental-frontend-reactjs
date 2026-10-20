import { Link, useParams, useSearchParams } from "react-router";
import { useDriver } from "../../api/drivers.queries";
import {
  useLedgerOverview,
  useLedgerStatement,
  type LedgerRow,
} from "../../api/ledger.queries";
import BalanceText from "../../components/drivers/BalanceText";
import { entryTypeLabel } from "../../components/drivers/ledgerLabels";
import AgingTiles from "../../components/ledger/AgingTiles";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import {
  addDays,
  chicagoToday,
  formatBalance,
  formatCents,
  formatDay,
  formatUsPhone,
} from "../../utils";

/** The days a statement covers when none is chosen: the last 90. */
const DEFAULT_DAYS = 90;

/** A real `YYYY-MM-DD` day from the URL, or undefined. */
function validDay(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

/**
 * A printable account statement for one driver (B86, `/admin/drivers/:id/ledger/statement`): the balance at the start
 * of the period, every entry in date order with the balance after it, and the balance at the end. The sidebar, header
 * and buttons are hidden when printing (`print:hidden`), so the paper shows only the statement. The period is in the
 * URL (`?from=&to=`), 90 days up to today by default.
 */
export default function LedgerStatement() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const today = chicagoToday();
  let to = validDay(params.get("to")) ?? today;
  let from = validDay(params.get("from")) ?? addDays(to, -DEFAULT_DAYS);
  if (from > to) {
    from = addDays(to, -DEFAULT_DAYS);
    to = validDay(params.get("to")) ?? today;
  }

  const driver = useDriver(id);
  const overview = useLedgerOverview(id);
  const statement = useLedgerStatement(id, from, to);

  const setRange = (next: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    query.set("from", next.from ?? from);
    query.set("to", next.to ?? to);
    setParams(query);
  };

  if (driver.isPending || statement.isPending) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }
  const error = driver.error ?? statement.error;
  if (error || !driver.data || !statement.data) {
    return (
      <div className="space-y-4">
        <Link
          to={`/admin/drivers/${id}/ledger`}
          className="text-sm text-brand-500"
        >
          ← Back to the ledger
        </Link>
        <p role="alert" className="text-sm text-error-600">
          {error?.message ?? "Loading the statement failed."}
        </p>
      </div>
    );
  }

  const { rows, totals, balanceBeforeCents } = statement.data;
  // The balance after the last entry of the period (or the opening balance when there are none): read from the
  // rows, never worked out here.
  const closingCents =
    rows.length > 0
      ? rows[rows.length - 1].runningBalanceCents
      : balanceBeforeCents;

  return (
    <div className="space-y-6">
      <div className="space-y-4 print:hidden">
        <Link
          to={`/admin/drivers/${id}/ledger`}
          className="inline-block text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to the ledger
        </Link>
        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5">
          <div>
            <Label htmlFor="statement-from">From</Label>
            <Input
              id="statement-from"
              type="date"
              value={from}
              max={to}
              onChange={(e) =>
                e.target.value && setRange({ from: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="statement-to">To</Label>
            <Input
              id="statement-to"
              type="date"
              value={to}
              min={from}
              onChange={(e) =>
                e.target.value && setRange({ to: e.target.value })
              }
            />
          </div>
          <Button size="sm" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 print:rounded-none print:border-0 print:p-0">
        <h1 className="text-xl font-semibold text-gray-800">
          Gonzo Mobility LLC · GonzoCar
        </h1>
        <p className="text-sm text-gray-500">Driver account statement</p>

        <div className="mt-5 flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-gray-800">
              {driver.data.firstName} {driver.data.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {formatUsPhone(driver.data.phone)}
            </p>
            <p className="text-sm text-gray-500">{driver.data.email}</p>
          </div>
          <div className="text-sm text-gray-500 sm:text-end">
            <p>
              Period {formatDay(from)} – {formatDay(to)}
            </p>
            <p>Printed {formatDay(today)}</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 px-4 py-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">Balance at the start</dt>
            <dd className="font-medium">
              <BalanceText cents={balanceBeforeCents} />
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Charges</dt>
            <dd className="font-medium">{formatCents(totals.debitCents)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Credits and payments</dt>
            <dd className="font-medium">{formatCents(totals.creditCents)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Balance at the end</dt>
            <dd className="font-medium">
              <BalanceText cents={closingCents} />
            </dd>
          </div>
        </dl>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-start text-theme-xs text-gray-500">
                <th className="py-2 pe-3 text-start font-medium">Date</th>
                <th className="py-2 pe-3 text-start font-medium">Ref</th>
                <th className="py-2 pe-3 text-start font-medium">Entry</th>
                <th className="py-2 pe-3 text-end font-medium">Charge</th>
                <th className="py-2 pe-3 text-end font-medium">
                  Credit / paid
                </th>
                <th className="py-2 text-end font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-gray-500">
                    No entries in this period.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <StatementRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-theme-xs text-gray-500">
          Balance now: {formatBalance(statement.data.balanceCents)}. Entries are
          never edited; a correction is shown as a reversal.
        </p>

        {overview.data && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-gray-800">
              Owed by age, as of {formatDay(overview.data.asOf)}
            </p>
            <AgingTiles aging={overview.data.aging} />
          </div>
        )}
      </div>
    </div>
  );
}

/** One line of the statement table. */
function StatementRow({ row }: { row: LedgerRow }) {
  return (
    <tr>
      <td className="py-2 pe-3 whitespace-nowrap">
        {formatDay(row.effectiveDate)}
      </td>
      <td className="py-2 pe-3 font-mono text-theme-xs whitespace-nowrap text-gray-500">
        {row.ref}
      </td>
      <td className="py-2 pe-3">
        <span className="font-medium">{entryTypeLabel(row)}</span> ·{" "}
        {row.description}
      </td>
      <td className="py-2 pe-3 text-end whitespace-nowrap">
        {row.direction === "debit" ? formatCents(row.amountCents) : ""}
      </td>
      <td className="py-2 pe-3 text-end whitespace-nowrap">
        {row.direction === "credit" ? formatCents(row.amountCents) : ""}
      </td>
      <td className="py-2 text-end whitespace-nowrap">
        <BalanceText cents={row.runningBalanceCents} />
      </td>
    </tr>
  );
}
