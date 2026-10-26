import type { ReactNode } from "react";
import { Link } from "react-router";
import type { ContractDraft } from "../../api/contracts.queries";
import { formatCents, formatDateTime } from "../../utils";
import ContractDocumentLinks from "./ContractDocumentLinks";
import { FILE_LINK_BUTTON } from "./contractStatus";

/** A coloured notice, as used on the contract page. */
function Notice({
  tone,
  children,
}: {
  tone: "success" | "info" | "error" | "warning" | "neutral";
  children: ReactNode;
}) {
  const colours = {
    success: "border-success-200 bg-success-50 text-success-700",
    info: "border-blue-light-200 bg-blue-light-50 text-blue-light-700",
    error: "border-error-200 bg-error-50 text-error-600",
    warning: "border-warning-200 bg-warning-50 text-warning-700",
    neutral: "border-gray-200 bg-gray-50 text-gray-700",
  };
  return (
    <div
      role="status"
      className={`space-y-3 rounded-lg border px-4 py-3 text-sm ${colours[tone]}`}
    >
      {children}
    </div>
  );
}

/**
 * Where a sent contract is (step 4, D75), one banner per status: sent, opened by the driver, signed (with the signed
 * contract and certificate, or the reason they are not saved yet, and what went on the driver's ledger, step 5, D83),
 * declined, expired, cancelled. Each carries its date.
 */
export default function ContractStatusBanner({
  contract,
  driverName,
}: {
  contract: ContractDraft;
  driverName: string;
}) {
  const sentTo = contract.sentValues?.recipientEmail ?? "the driver";

  switch (contract.status) {
    case "draft":
      return null;
    case "sent":
      return (
        <Notice tone="info">
          <p>
            Sent on {formatDateTime(contract.sentAt)} to {sentTo}. Waiting for{" "}
            {driverName} to sign.
          </p>
        </Notice>
      );
    case "viewed":
      return (
        <Notice tone="info">
          <p>
            Opened by the driver on {formatDateTime(contract.statusUpdatedAt)}.
            Waiting for {driverName} to sign.
          </p>
        </Notice>
      );
    case "signed":
      return (
        <Notice tone="success">
          <p>
            Signed on {formatDateTime(contract.signedAt)}.{" "}
            {contract.documentsSaved
              ? "The signed contract is saved on file."
              : contract.documentsError
                ? "The signed contract could not be saved yet; it is tried again every few minutes."
                : "The signed contract is being saved."}
          </p>
          {contract.documentsError && !contract.documentsSaved && (
            <p role="alert">Reason: {contract.documentsError}</p>
          )}
          <ContractDocumentLinks contract={contract} />
          {/* Signing puts the pickup charges and the first rent on the driver's ledger (step 5, D83). */}
          <p>
            The pickup charges (
            {formatCents(contract.numbers.amountDueAtPickupCents)}) were added
            to the driver&apos;s ledger.
          </p>
          <Link
            to={`/admin/drivers/${contract.driverId}/ledger`}
            className={FILE_LINK_BUTTON}
          >
            View ledger
          </Link>
          {contract.notPostedAutomatically.length > 0 && (
            <p
              role="note"
              className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-warning-700"
            >
              Not posted automatically yet:{" "}
              {contract.notPostedAutomatically.join(", ")}.
            </p>
          )}
        </Notice>
      );
    case "declined":
      return (
        <Notice tone="error">
          <p>
            Declined by the driver on {formatDateTime(contract.statusUpdatedAt)}
            . It was not signed.
          </p>
        </Notice>
      );
    case "expired":
      return (
        <Notice tone="warning">
          <p>
            Expired on {formatDateTime(contract.statusUpdatedAt)} without being
            signed.
          </p>
        </Notice>
      );
    case "cancelled":
      return (
        <Notice tone="neutral">
          <p>
            Cancelled on {formatDateTime(contract.statusUpdatedAt)}. It was not
            signed.
          </p>
        </Notice>
      );
  }
}
