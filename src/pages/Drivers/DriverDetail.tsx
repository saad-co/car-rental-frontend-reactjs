import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import {
  useDriverContract,
  type ContractDraft,
} from "../../api/contracts.queries";
import {
  useDeactivateDriver,
  useDriver,
  useReactivateDriver,
  useRemoveFromCollections,
  useSendToCollections,
  useSetDriverArchived,
  useSetOnboardingStep,
  type Driver,
  type OnboardingStep,
} from "../../api/drivers.queries";
import { usePayments } from "../../api/payments.queries";
import ContractDocumentLinks from "../../components/contracts/ContractDocumentLinks";
import { CONTRACT_STATUS } from "../../components/contracts/contractStatus";
import BalanceText from "../../components/drivers/BalanceText";
import DepositDialog from "../../components/drivers/DepositDialog";
import DriverAliasesCard from "../../components/drivers/DriverAliasesCard";
import LeavingDialog from "../../components/drivers/LeavingDialog";
import DriverStatusBadge from "../../components/drivers/DriverStatusBadge";
import {
  leftReasonText,
  ONBOARDING_STEPS,
} from "../../components/drivers/driverStatus";
import Checkbox from "../../components/form/input/Checkbox";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import ConfirmDialog from "../../components/ui/modal/ConfirmDialog";
import {
  MATCH_METHOD_LABEL,
  paymentSourceLabel,
} from "../../components/payments/paymentLabels";
import ConversationCard from "../../components/sms/ConversationCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  cn,
  formatCents,
  formatDateTime,
  formatDay,
  formatUsPhone,
} from "../../utils";

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
 * The Onboarding card (D56): contract, deposit and vehicle, ticked in any order. The driver becomes active when the
 * third is ticked (the API decides). Locked while the driver is inactive.
 */
function OnboardingCard({
  driver,
  busy,
  onChange,
  onEditDeposit,
}: {
  driver: Driver;
  busy: boolean;
  onChange: (step: OnboardingStep, done: boolean) => void;
  /** Opens the amount box for a ticked deposit: records an amount that is missing, or corrects it (D82). */
  onEditDeposit: () => void;
}) {
  const locked = driver.status === "inactive";
  // The contract step is ticked by the system when the driver signs (D75): that tick carries the contract's signing
  // time exactly, so the same instant means "automatic". An admin's own tick has its own time.
  const contract = useDriverContract(driver.id).data?.contract ?? null;
  const contractTickedBySigning = (doneAt: string | null) =>
    doneAt !== null &&
    contract?.status === "signed" &&
    contract.signedAt !== null &&
    new Date(contract.signedAt).getTime() === new Date(doneAt).getTime();
  return (
    <Card title="Onboarding">
      <p className="mb-4 text-sm text-gray-500">
        {locked
          ? "This driver is inactive. Reactivate them to change these steps."
          : driver.status === "active"
            ? "All steps are done: the driver is active."
            : "They become an active driver as soon as all three are done, in any order."}
      </p>
      <ul className="space-y-3">
        {ONBOARDING_STEPS.map(({ step, label, field }) => {
          const doneAt = driver.onboarding[field];
          return (
            <li key={step} className="flex items-center justify-between gap-4">
              <Checkbox
                label={label}
                checked={doneAt !== null}
                disabled={locked || busy}
                onChange={(checked) => onChange(step, checked)}
              />
              <span className="text-theme-xs text-gray-500">
                {doneAt
                  ? `Done ${formatDateTime(doneAt)}${
                      step === "contract" && contractTickedBySigning(doneAt)
                        ? " · automatic, from the signed contract"
                        : ""
                    }${
                      step === "deposit"
                        ? driver.onboarding.depositPaidCents === null
                          ? " · amount not recorded"
                          : ` · ${formatCents(driver.onboarding.depositPaidCents)}`
                        : ""
                    }`
                  : "Not done"}
                {step === "deposit" && doneAt && !locked && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onEditDeposit}
                    className="ml-2 text-brand-500 hover:underline disabled:opacity-50"
                  >
                    {driver.onboarding.depositPaidCents === null
                      ? "Add amount"
                      : "Edit amount"}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** The same look as the "View ledger" button, for a link that opens another page. */
const LINK_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50";

/** The date that goes with a contract's status: when it was sent, opened, signed, declined, expired or cancelled. */
function contractWhen(contract: ContractDraft): string {
  switch (contract.status) {
    case "draft":
      return "";
    case "sent":
      return formatDateTime(contract.sentAt);
    case "signed":
      return formatDateTime(contract.signedAt);
    default:
      return formatDateTime(contract.statusUpdatedAt);
  }
}

/**
 * The Contract card (Module 2): one line about the driver's contract with its status and date (a draft, sent, opened,
 * signed, declined, expired or cancelled) and an "Open" link, plus "Open signed contract" once it is signed and filed, or a
 * "Create contract" link when there is none. The links go to the contract page.
 */
function ContractCard({ driverId }: { driverId: string }) {
  const { data, isPending, isError, error } = useDriverContract(driverId);
  const contract = data?.contract ?? null;
  return (
    <Card title="Contract">
      {isPending ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p role="alert" className="text-sm text-error-600">
          {error.message}
        </p>
      ) : contract ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-gray-800">
            <Badge size="sm" color={CONTRACT_STATUS[contract.status].color}>
              {CONTRACT_STATUS[contract.status].label}
            </Badge>{" "}
            {contractWhen(contract)} · {formatCents(contract.totalRateCents)}/
            {contract.schedule === "weekly" ? "week" : "day"} · from{" "}
            {formatDay(contract.startDate)} · due at pickup{" "}
            {formatCents(contract.numbers.amountDueAtPickupCents)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ContractDocumentLinks
              contract={contract}
              withCertificate={false}
            />
            <Link
              to={`/admin/drivers/${driverId}/contract`}
              className={LINK_BUTTON}
            >
              Open
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">No contract yet.</p>
          <Link
            to={`/admin/drivers/${driverId}/contract`}
            className={LINK_BUTTON}
          >
            Create contract
          </Link>
        </div>
      )}
    </Card>
  );
}

/**
 * Admin page for one driver: status and onboarding (D56), contact details, a payment summary, the payment aliases
 * they pay from (added and removed by an admin, D69) and their most recent payments. Aliases the driver adds
 * themselves, with admin approval, wait for the driver portal (B53).
 */
export default function DriverDetail() {
  const { id = "" } = useParams();
  const { data: driver, isPending, isError, error } = useDriver(id);
  const payments = usePayments({ driverId: id, page: 1, limit: 10 });

  const setStep = useSetOnboardingStep(id);
  const deactivate = useDeactivateDriver(id);
  const reactivate = useReactivateDriver(id);
  const setArchived = useSetDriverArchived();
  const sendToCollections = useSendToCollections(id);
  const removeFromCollections = useRemoveFromCollections();
  const mutations = [
    setStep,
    deactivate,
    reactivate,
    setArchived,
    sendToCollections,
    removeFromCollections,
  ];
  const busy = mutations.some((m) => m.isPending);
  const actionError = mutations.find((m) => m.isError)?.error;

  /** True while the "Archive?" dialog is open: their application is archived with them (D84). */
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  /** An un-tick waiting for confirmation (it would take an active driver back to onboarding). */
  const [confirmingUntick, setConfirmingUntick] =
    useState<OnboardingStep | null>(null);
  /** Which "how did they leave?" dialog is open (D81). */
  const [leaving, setLeaving] = useState<"deactivate" | "collections" | null>(
    null,
  );
  /** The deposit amount box: "tick" for a first tick, "edit" to record or correct the amount (D82). */
  const [depositDialog, setDepositDialog] = useState<"tick" | "edit" | null>(
    null,
  );

  /** Clears the previous action's error, then runs this one. */
  const run = (action: () => void) => {
    mutations.forEach((m) => m.reset());
    action();
  };

  const changeStep = (step: OnboardingStep, done: boolean) => {
    // Ticking the deposit asks how much was paid (D82).
    if (
      done &&
      step === "deposit" &&
      driver?.onboarding.depositPaidAt === null
    ) {
      setDepositDialog("tick");
      return;
    }
    if (!done && driver?.status === "active") {
      setConfirmingUntick(step);
      return;
    }
    run(() => setStep.mutate({ step, done }));
  };

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

  return (
    <div className="space-y-6">
      {/* Someone still in onboarding is not a driver yet: they came from, and go back to, Approved applications. */}
      <Link
        to={
          driver.status === "onboarding"
            ? "/admin/approved-applications"
            : "/admin/drivers"
        }
        className="inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        {driver.status === "onboarding"
          ? "← Back to approved applications"
          : "← Back to drivers"}
      </Link>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-800">{fullName}</h1>
            <DriverStatusBadge driver={driver} />
          </div>
          <p className="text-sm text-gray-500">
            {driver.status === "onboarding"
              ? "Onboarding since"
              : "Driver since"}{" "}
            {formatDateTime(driver.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {driver.applicationId && (
            <Link
              to={`/admin/applications/${driver.applicationId}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50"
            >
              View application
            </Link>
          )}
          {/* The one ledger lives on its own page (B86); this page only links to it. */}
          <Link
            to={`/admin/drivers/${driver.id}/ledger`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50"
          >
            View ledger
          </Link>
          {/* Their application is archived and unarchived with them (D84). */}
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (!driver.archivedAt && driver.applicationId) {
                setConfirmingArchive(true);
                return;
              }
              run(() =>
                setArchived.mutate({
                  id: driver.id,
                  archived: !driver.archivedAt,
                }),
              );
            }}
          >
            {driver.archivedAt
              ? setArchived.isPending
                ? "Unarchiving..."
                : "Unarchive"
              : setArchived.isPending
                ? "Archiving..."
                : "Archive"}
          </Button>
          {/* Leaving options (D81): deactivate, archive (above), send to collections. */}
          {driver.status !== "onboarding" &&
            (driver.sentToCollectionsAt ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(() => removeFromCollections.mutate(driver.id))
                }
              >
                {removeFromCollections.isPending
                  ? "Removing..."
                  : "Remove from collections"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setLeaving("collections")}
              >
                Send to collections
              </Button>
            ))}
          {driver.status === "inactive" ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => run(() => reactivate.mutate(undefined))}
            >
              {reactivate.isPending ? "Reactivating..." : "Reactivate"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setLeaving("deactivate")}
            >
              {deactivate.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          )}
        </div>
      </div>

      {driver.status === "inactive" && (
        <p
          role="status"
          className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
        >
          Left: {leftReasonText(driver.leftReason)}
          {driver.leftAt && ` · noted ${formatDateTime(driver.leftAt)}`}.
          {driver.sentToCollectionsAt &&
            ` In collections since ${formatDateTime(driver.sentToCollectionsAt)}.`}{" "}
          Balance: <BalanceText cents={driver.balanceCents} />.
        </p>
      )}

      {driver.archivedAt && (
        <p
          role="status"
          className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
        >
          This driver is archived on {formatDateTime(driver.archivedAt)}
          {driver.applicationId ? ", together with their application" : ""}.
          They are hidden from the Drivers list and are not billed or reminded;
          Unarchive brings them back
          {driver.applicationId ? " (both)" : ""}.
        </p>
      )}

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {actionError.message}
        </p>
      )}

      {leaving === "deactivate" && (
        <LeavingDialog
          title={`Deactivate ${fullName}?`}
          confirmLabel="Deactivate"
          confirmVariant="danger"
          onCancel={() => setLeaving(null)}
          onConfirm={(reason) => {
            setLeaving(null);
            run(() => deactivate.mutate({ reason }));
          }}
        >
          Use this when the driver leaves. They can no longer log in to the
          driver portal, and are signed out at once. Their history and
          onboarding steps are kept, and you can reactivate them later.
        </LeavingDialog>
      )}

      {leaving === "collections" &&
        (driver.leftReason ? (
          <ConfirmDialog
            isOpen
            title={`Send ${fullName} to collections?`}
            confirmLabel="Send to collections"
            confirmVariant="danger"
            onCancel={() => setLeaving(null)}
            onConfirm={() => {
              setLeaving(null);
              run(() => sendToCollections.mutate({}));
            }}
          >
            They will be listed on the Collections page, where you can message
            them about what they owe. Balance:{" "}
            <BalanceText cents={driver.balanceCents} />. You can remove them
            from collections later.
          </ConfirmDialog>
        ) : (
          <LeavingDialog
            title={`Send ${fullName} to collections?`}
            confirmLabel="Send to collections"
            confirmVariant="danger"
            onCancel={() => setLeaving(null)}
            onConfirm={(reason) => {
              setLeaving(null);
              run(() => sendToCollections.mutate({ reason }));
            }}
          >
            They will be listed on the Collections page, where you can message
            them about what they owe. Balance:{" "}
            <BalanceText cents={driver.balanceCents} />.
            {driver.status === "active" &&
              " They are deactivated at the same time: they can no longer log in to the driver portal."}
          </LeavingDialog>
        ))}

      {depositDialog && (
        <DepositDialog
          title={
            depositDialog === "tick"
              ? "How much was the deposit?"
              : "Deposit amount"
          }
          confirmLabel={depositDialog === "tick" ? "Tick deposit paid" : "Save"}
          initialCents={driver.onboarding.depositPaidCents}
          onCancel={() => setDepositDialog(null)}
          onConfirm={(cents) => {
            setDepositDialog(null);
            run(() =>
              setStep.mutate({
                step: "deposit",
                done: true,
                depositPaidCents: cents,
              }),
            );
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmingArchive}
        title={`Archive ${fullName}?`}
        confirmLabel="Archive"
        onCancel={() => setConfirmingArchive(false)}
        onConfirm={() => {
          setConfirmingArchive(false);
          run(() => setArchived.mutate({ id: driver.id, archived: true }));
        }}
      >
        Their application is archived too, and billing and reminders stop.
        Unarchive brings both back.
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={confirmingUntick !== null}
        title="Take this driver out of active?"
        confirmLabel="Un-tick"
        confirmVariant="danger"
        onCancel={() => setConfirmingUntick(null)}
        onConfirm={() => {
          const step = confirmingUntick;
          setConfirmingUntick(null);
          if (step) run(() => setStep.mutate({ step, done: false }));
        }}
      >
        {fullName} is active. Un-ticking "
        {ONBOARDING_STEPS.find((s) => s.step === confirmingUntick)?.label}" puts
        them back in onboarding: once billing is running, an onboarding driver
        is not billed or reminded until the step is ticked again.
      </ConfirmDialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <OnboardingCard
            driver={driver}
            busy={busy}
            onChange={changeStep}
            onEditDeposit={() => setDepositDialog("edit")}
          />
          <ContractCard driverId={driver.id} />
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

          <DriverAliasesCard driver={driver} />

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
                            {paymentSourceLabel(
                              payment.source,
                              payment.manualMethod,
                            )}
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

        {/* The chat gets the space, like on the application page: wider than the details and nearly screen-tall. */}
        <div className="h-[80vh] min-h-[36rem] lg:col-span-7 lg:h-[calc(100vh-9rem)]">
          <ConversationCard
            kind="drivers"
            id={driver.id}
            name={fullName}
            phone={formatUsPhone(driver.phone)}
          />
        </div>
      </div>
    </div>
  );
}
