import {
  useLedgerSummary,
  type LedgerPeriod,
  type LedgerPeriodTotals,
} from "../../api/ledger.queries";
import { formatCents, formatDay } from "../../utils";
import DataTable, { type Column } from "../tables/DataTable";
import BalanceText from "./BalanceText";

/** Zero shows as a dash, so the weeks with activity stand out. */
const money = (cents: number) => (cents === 0 ? "—" : formatCents(cents));

/**
 * The last 12 weeks (Monday to Sunday) or months, newest first, empty ones included. Each period's opening is the
 * previous closing; closing = opening + payments + credits − charges + reversals (computed by the API, D58).
 */
export default function LedgerSummaryTab({
  driverId,
  period,
}: {
  driverId: string;
  period: LedgerPeriod;
}) {
  const summary = useLedgerSummary(driverId, period);

  if (summary.isPending) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }
  if (summary.isError) {
    return (
      <p role="alert" className="text-sm text-error-600">
        {summary.error.message}
      </p>
    );
  }

  const columns: Column<LedgerPeriodTotals>[] = [
    {
      key: "period",
      header: period === "week" ? "Week" : "Month",
      className: "whitespace-nowrap",
      render: (p) =>
        period === "week"
          ? `${formatDay(p.start)} – ${formatDay(p.end)}`
          : new Date(`${p.start}T00:00:00Z`).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }),
    },
    {
      key: "opening",
      header: "Opening",
      align: "end",
      className: "whitespace-nowrap",
      render: (p) => <BalanceText cents={p.openingCents} />,
    },
    {
      key: "charges",
      header: "Charges",
      align: "end",
      className: "whitespace-nowrap",
      render: (p) => money(p.chargesCents),
    },
    {
      key: "payments",
      header: "Payments",
      align: "end",
      className: "whitespace-nowrap",
      render: (p) => money(p.paymentsCents),
    },
    {
      key: "credits",
      header: "Credits",
      align: "end",
      className: "whitespace-nowrap",
      render: (p) => money(p.creditsCents),
    },
    {
      key: "reversals",
      header: "Reversals",
      align: "end",
      className: "whitespace-nowrap",
      render: (p) => money(p.reversalsCents),
    },
    {
      key: "closing",
      header: "Closing",
      align: "end",
      className: "whitespace-nowrap",
      render: (p) => (
        <BalanceText cents={p.closingCents} className="font-medium" />
      ),
    },
    {
      key: "entries",
      header: "Entries",
      align: "end",
      render: (p) => p.entryCount,
    },
  ];

  return (
    <>
      <div className="-mx-6 max-w-full overflow-x-auto">
        <DataTable
          columns={columns}
          rows={summary.data.items}
          rowKey={(p) => p.start}
        />
      </div>
      <p className="mt-3 text-theme-xs text-gray-500">
        Entries count in the {period} of their date (Chicago). Reversals count
        in the {period} they were made: positive gives money back to the driver,
        negative takes it.
      </p>
    </>
  );
}
