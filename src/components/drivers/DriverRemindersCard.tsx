import { useState } from "react";
import {
  useDriverReminders,
  type ReminderLog,
} from "../../api/reminders.queries";
import { formatCents, formatDateTime } from "../../utils";
import Badge from "../ui/badge/Badge";
import Pagination from "../ui/pagination/Pagination";

/** How each kind of reminder is named in the list. */
const KIND_LABEL: Record<ReminderLog["kind"], string> = {
  upcoming: "Payment due soon",
  late: "Payment missed",
  high_balance: "Several payments behind",
  balance: "Balance over $100",
  payment_received: "Payment received",
};

/** The status as a badge: a failed text is red and shows why under it; a dry-run one says it was only composed. */
function StatusBadge({ reminder }: { reminder: ReminderLog }) {
  if (reminder.status === "failed") {
    return (
      <Badge size="sm" color="error">
        Failed
      </Badge>
    );
  }
  if (reminder.status === "composed") {
    return (
      <Badge size="sm" color="light">
        Test only, not sent
      </Badge>
    );
  }
  return (
    <Badge size="sm" color="success">
      Sent
    </Badge>
  );
}

/**
 * The reminders the system texted (or composed, or failed to send) to this driver, newest first, 10 per page (Fleet
 * revisions section 6: reminders are visible on the driver's record). A failed send says why, so a refused text (no Quo
 * credits, say) is seen here and not lost.
 */
export default function DriverRemindersCard({
  driverId,
}: {
  driverId: string;
}) {
  const [page, setPage] = useState(1);
  const reminders = useDriverReminders(driverId, page);
  const data = reminders.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-surface p-6">
      <h2 className="text-base font-semibold text-gray-800">
        Payment reminders
      </h2>
      <p className="mt-1 mb-4 text-theme-xs text-gray-500">
        Texts the system sent for late or low payments. Nothing here when
        reminders are switched off in Settings.
      </p>
      {reminders.isPending ? (
        <p className="text-sm text-gray-500">Loading reminders...</p>
      ) : reminders.isError ? (
        <p role="alert" className="text-sm text-error-600">
          {reminders.error.message}
        </p>
      ) : data && data.items.length === 0 ? (
        <p className="text-sm text-gray-500">No reminders yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {data?.items.map((reminder) => (
            <li key={reminder.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">
                  {KIND_LABEL[reminder.kind]}
                  {reminder.tier !== null && ` (${reminder.tier} behind)`}
                </span>
                <StatusBadge reminder={reminder} />
              </div>
              <p className="mt-1 text-sm whitespace-pre-line wrap-break-word text-gray-700">
                {reminder.body}
              </p>
              {reminder.error && (
                <p role="alert" className="mt-1 text-theme-xs text-error-600">
                  {reminder.error}
                </p>
              )}
              <p className="mt-1 text-theme-xs text-gray-500">
                {formatDateTime(reminder.createdAt)} · past due{" "}
                {formatCents(reminder.pastDueCents)} · balance{" "}
                {formatCents(reminder.balanceCents)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <div className="mt-3">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
