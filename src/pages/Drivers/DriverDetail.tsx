import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useDriver, type DriverAlias } from "../../api/drivers.queries";
import { usePayments } from "../../api/payments.queries";
import {
  ALIAS_SOURCE_LABEL,
  ALIAS_TYPE_LABEL,
  MATCH_METHOD_LABEL,
  PAYMENT_SOURCE_LABEL,
} from "../../components/payments/paymentLabels";
import ConversationCard from "../../components/sms/ConversationCard";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { cn, formatCents, formatDateTime, formatUsPhone } from "../../utils";

/** A white card with a title, the same look as the application page. */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

/** Label/value rows with dividers. */
function Rows({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map(([label, value]) => (
        <li key={label} className="flex items-start gap-5 py-2.5">
          <span className="w-1/3 text-sm text-gray-500">{label}</span>
          <span className="w-2/3 text-sm wrap-break-word text-gray-800">
            {value}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Splits the aliases by payment method, in the order the API sends them. Imported aliases that are obviously
 * not a name or handle (the old parser sometimes saved a chunk of email styling) are kept apart, so they never
 * clutter the real ones.
 */
function groupAliases(aliases: DriverAlias[]) {
  const looksBroken = (value: string) =>
    value.length > 80 || /[{}]|;\s*\}|<\/?\w+/.test(value);
  const groups = new Map<DriverAlias["type"], DriverAlias[]>();
  const broken: DriverAlias[] = [];
  for (const alias of aliases) {
    if (looksBroken(alias.value)) {
      broken.push(alias);
      continue;
    }
    groups.set(alias.type, [...(groups.get(alias.type) ?? []), alias]);
  }
  return { groups: [...groups.entries()], broken };
}

/**
 * Admin page for one driver: contact details, a payment summary, the payment aliases they pay from (grouped by
 * payment method) and their most recent payments. Read-only for now: adding and removing aliases comes with the
 * driver-approval rule (B53).
 */
export default function DriverDetail() {
  const { id = "" } = useParams();
  const { data: driver, isPending, isError, error } = useDriver(id);
  const payments = usePayments({ driverId: id, page: 1, limit: 10 });

  if (isPending) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }
  if (isError) {
    return (
      <div className="space-y-4">
        <Link to="/admin/drivers" className="text-sm text-brand-500">
          ← Back to drivers
        </Link>
        <p role="alert" className="text-sm text-error-600">
          {error.message}
        </p>
      </div>
    );
  }

  const fullName = `${driver.firstName} ${driver.lastName}`;
  const { groups, broken } = groupAliases(driver.aliases);

  return (
    <div className="space-y-6">
      <Link
        to="/admin/drivers"
        className="inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to drivers
      </Link>

      <div className="flex flex-col justify-between gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-800">{fullName}</h1>
          <Badge
            size="sm"
            color={driver.status === "active" ? "success" : "light"}
          >
            {driver.status === "active" ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-sm text-gray-500">
          Driver since {formatDateTime(driver.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card title="Payment aliases">
            <p className="mb-4 text-sm text-gray-500">
              Names, handles and company names this driver pays from. A payment
              from any of them is assigned to this driver automatically.
            </p>
            {driver.aliases.length === 0 ? (
              <p className="text-sm text-gray-500">None yet.</p>
            ) : (
              <div className="space-y-4">
                {groups.map(([type, items]) => (
                  <div key={type}>
                    <h3 className="mb-1.5 text-theme-xs font-medium text-gray-500">
                      {ALIAS_TYPE_LABEL[type]}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {items.map((alias) => (
                        <span
                          key={alias.value}
                          title={ALIAS_SOURCE_LABEL[alias.source]}
                          className="rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700"
                        >
                          {alias.value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {broken.length > 0 && (
                  <p className="text-theme-xs text-warning-600">
                    {broken.length} imported{" "}
                    {broken.length === 1 ? "alias looks" : "aliases look"}{" "}
                    damaged (leftover email formatting from the old system) and{" "}
                    {broken.length === 1 ? "is" : "are"} hidden.
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card title="Recent payments">
            {payments.isPending ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : payments.isError ? (
              <p role="alert" className="text-sm text-error-600">
                {payments.error.message}
              </p>
            ) : payments.data.items.length === 0 ? (
              <p className="text-sm text-gray-500">No payments yet.</p>
            ) : (
              <div className="-mx-6 max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="px-6 py-2 text-start text-theme-xs font-medium text-gray-500"
                      >
                        Paid at
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500"
                      >
                        Paid by
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-6 py-2 text-end text-theme-xs font-medium text-gray-500"
                      >
                        Amount
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100">
                    {payments.data.items.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="px-6 py-3 text-theme-sm whitespace-nowrap text-gray-500">
                          {formatDateTime(payment.occurredAt)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-theme-sm text-gray-500">
                          <span className="font-medium text-gray-800">
                            {payment.senderName}
                          </span>
                          <span className="block text-theme-xs">
                            {PAYMENT_SOURCE_LABEL[payment.source]}
                            {payment.matchMethod &&
                              ` · ${MATCH_METHOD_LABEL[payment.matchMethod]}`}
                          </span>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "px-6 py-3 text-end text-theme-sm font-medium whitespace-nowrap text-gray-800",
                          )}
                        >
                          {formatCents(payment.amountCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <ConversationCard kind="drivers" id={driver.id} />
          <Card title="Contact">
            <Rows
              rows={[
                ["Email", driver.email],
                ["Phone", formatUsPhone(driver.phone)],
              ]}
            />
          </Card>
          <Card title="Payments">
            <Rows
              rows={[
                [
                  "Payments received",
                  driver.paymentCount === 0 ? "None" : driver.paymentCount,
                ],
                ["Last payment", formatDateTime(driver.lastPaymentAt)],
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
