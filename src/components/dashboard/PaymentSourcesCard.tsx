import type { Dashboard } from "../../api/dashboard.queries";
import { formatCents } from "../../utils";
import { PAYMENT_SOURCE_LABEL } from "../payments/paymentLabels";
import BarRow from "./BarRow";
import DashboardCard from "./DashboardCard";
import { SOURCE_BAR_CLASS, SOURCE_COLOR } from "./chartTheme";
import { Donut } from "./lazyCharts";

/** Where the confirmed money came from: a ring, and a bar per source with its payment count and unmatched ones. */
export default function PaymentSourcesCard({
  payments,
  sources,
}: {
  payments: Dashboard["payments"];
  sources: Dashboard["sources"];
}) {
  return (
    <DashboardCard
      title="Payment source split"
      subtitle="Confirmed money per source, and payments still unmatched"
      link={{ to: "/admin/payments", label: "Payments" }}
    >
      {sources.length === 0 ? (
        <p className="py-6 text-theme-sm text-gray-500">No payments yet.</p>
      ) : (
        <>
          <div className="mb-5 flex justify-center">
            <Donut
              slices={sources.map((s) => ({
                label: PAYMENT_SOURCE_LABEL[s.source],
                value: s.amountCents,
                color: SOURCE_COLOR[s.source],
              }))}
              centerLabel="Confirmed"
              centerValue={formatCents(payments.grossCents)}
              formatValue={formatCents}
            />
          </div>
          <div className="space-y-3.5">
            {sources.map((s) => (
              <BarRow
                key={s.source}
                label={PAYMENT_SOURCE_LABEL[s.source]}
                value={formatCents(s.amountCents)}
                hint={`${s.count} payments · ${s.unmatchedCount} unmatched · ${s.sharePercent}% share`}
                widthPercent={s.sharePercent}
                barClassName={SOURCE_BAR_CLASS[s.source]}
              />
            ))}
          </div>
        </>
      )}
    </DashboardCard>
  );
}
