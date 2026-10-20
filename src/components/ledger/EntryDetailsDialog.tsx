import { Link } from "react-router";
import {
  useLedgerEntry,
  type LedgerEntry,
  type LedgerEntryDetails,
} from "../../api/ledger.queries";
import { formatCents, formatDateTime, formatDay } from "../../utils";
import type { AppliesTo } from "./NewEntryDialog";
import { entryTypeColor, entryTypeLabel } from "../drivers/ledgerLabels";
import { paymentSourceLabel } from "../payments/paymentLabels";
import Badge from "../ui/badge/Badge";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";

/** A linked entry in the details: its reference opens that entry in this same dialog. */
function EntryLink({
  link,
  onOpen,
  extra,
}: {
  link: { id: string; ref: string; description: string };
  onOpen: (id: string) => void;
  extra?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(link.id)}
      className="text-start text-brand-500 hover:text-brand-600"
    >
      <span className="font-mono text-theme-xs">{link.ref}</span> ·{" "}
      {link.description}
      {extra}
    </button>
  );
}

/** One label and value line of the details list. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="min-w-0 text-sm text-gray-800">{children}</dd>
    </div>
  );
}

interface EntryDetailsDialogProps {
  driverId: string;
  /** The entry to show; null keeps the dialog closed. */
  entryId: string | null;
  onClose: () => void;
  /** Opens another entry (a link in the details). */
  onOpenEntry: (entryId: string) => void;
  /** "Credit against this": the screen opens the add dialog for this charge. */
  onCredit: (charge: AppliesTo) => void;
  /** "Reverse...": the screen opens the reverse dialog. */
  onReverse: (entry: LedgerEntry) => void;
  /** "Void payment...": the screen opens the void dialog. */
  onVoid: (paymentId: string) => void;
}

/**
 * One entry with everything that links to it (B86): what it reverses or was reversed by, the charge it is applied
 * against, the credits applied to it, and its payment. The buttons at the bottom are the actions that make sense for
 * this entry; nothing here edits it (entries are locked once written).
 */
export default function EntryDetailsDialog({
  driverId,
  entryId,
  onClose,
  onOpenEntry,
  onCredit,
  onReverse,
  onVoid,
}: EntryDetailsDialogProps) {
  const details = useLedgerEntry(driverId, entryId);

  return (
    <Modal
      isOpen={entryId !== null}
      onClose={onClose}
      showCloseButton={false}
      className="max-w-lg p-6 sm:p-8"
    >
      {details.isPending ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : details.isError ? (
        <p role="alert" className="text-sm text-error-600">
          {details.error.message}
        </p>
      ) : (
        <Content
          details={details.data}
          onClose={onClose}
          onOpenEntry={onOpenEntry}
          onCredit={onCredit}
          onReverse={onReverse}
          onVoid={onVoid}
        />
      )}
      {(details.isPending || details.isError) && (
        <div className="mt-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
}

function Content({
  details,
  onClose,
  onOpenEntry,
  onCredit,
  onReverse,
  onVoid,
}: {
  details: LedgerEntryDetails;
  onClose: () => void;
  onOpenEntry: (entryId: string) => void;
  onCredit: (charge: AppliesTo) => void;
  onReverse: (entry: LedgerEntry) => void;
  onVoid: (paymentId: string) => void;
}) {
  const { entry, payment } = details;
  const reversed = details.reversedBy !== null;

  return (
    <>
      <div className="flex items-center gap-3">
        <Badge size="sm" color={entryTypeColor(entry)}>
          {entryTypeLabel(entry)}
        </Badge>
        <span className="font-mono text-sm text-gray-500">{entry.ref}</span>
        {reversed ? (
          <Badge size="sm" color="warning">
            Reversed
          </Badge>
        ) : (
          <Badge size="sm" color="success">
            Posted
          </Badge>
        )}
      </div>
      <p className="mt-3 text-title-sm font-semibold text-gray-800">
        {entry.direction === "credit" ? "−" : ""}
        {formatCents(entry.amountCents)}
      </p>
      <p className="text-theme-xs text-gray-500">
        {entry.direction === "debit"
          ? "The driver owes this much more."
          : "The driver owes this much less."}
      </p>

      <dl className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
        <Row label="Date it belongs to">{formatDay(entry.effectiveDate)}</Row>
        <Row label="Recorded">{formatDateTime(entry.createdAt)}</Row>
        <Row label="Entered by">{entry.createdByEmail ?? "System"}</Row>
        <Row label="Description">{entry.description}</Row>
        {entry.internalNote && (
          <Row label="Internal note">
            {entry.internalNote}
            <span className="block text-theme-xs text-gray-500">
              Staff only. Not on the driver's statement.
            </span>
          </Row>
        )}

        {details.reversalOf && (
          <Row label="Reverses">
            <EntryLink link={details.reversalOf} onOpen={onOpenEntry} />
          </Row>
        )}
        {details.reversedBy && (
          <Row label="Reversed by">
            <EntryLink link={details.reversedBy} onOpen={onOpenEntry} />
          </Row>
        )}
        {details.appliesTo && (
          <Row label="Applied to">
            <EntryLink link={details.appliesTo} onOpen={onOpenEntry} />
          </Row>
        )}
        {details.appliedCredits.length > 0 && (
          <Row label="Credits applied">
            <ul className="space-y-1">
              {details.appliedCredits.map((credit) => (
                <li key={credit.id} className="flex flex-col">
                  <EntryLink
                    link={credit}
                    onOpen={onOpenEntry}
                    extra={` (${formatCents(credit.amountCents)}${credit.reversed ? ", reversed" : ""})`}
                  />
                </li>
              ))}
            </ul>
            {details.creditableCents !== null && (
              <span className="mt-1 block text-theme-xs text-gray-500">
                {formatCents(details.creditableCents)} still left to credit.
              </span>
            )}
          </Row>
        )}
        {payment && (
          <>
            <Row label="Paid by">
              {payment.senderName} via{" "}
              {paymentSourceLabel(payment.source, payment.manualMethod)}
            </Row>
            {payment.transactionId && (
              <Row label="Reference">
                <span className="font-mono text-theme-xs">
                  {payment.transactionId}
                </span>
              </Row>
            )}
            <Row label="Payment">
              <Link
                to={`/admin/payments?q=${encodeURIComponent(payment.senderName)}`}
                className="text-brand-500 hover:text-brand-600"
              >
                Open on the Payments page
              </Link>
            </Row>
          </>
        )}
      </dl>

      <p className="mt-4 rounded-lg bg-blue-light-50 px-4 py-3 text-theme-xs text-blue-light-500">
        Amounts are locked once posted. To fix a mistake, reverse the entry or
        add a credit; the history stays.
      </p>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
        {details.creditableCents !== null && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onCredit({
                id: entry.id,
                ref: entry.ref,
                description: entry.description,
                creditableCents: details.creditableCents ?? 0,
              })
            }
          >
            Credit against this
          </Button>
        )}
        {entry.canReverse && (
          <Button variant="outline" size="sm" onClick={() => onReverse(entry)}>
            Reverse...
          </Button>
        )}
        {details.canVoidPayment && payment && (
          <Button variant="danger" size="sm" onClick={() => onVoid(payment.id)}>
            Void payment...
          </Button>
        )}
      </div>
    </>
  );
}
