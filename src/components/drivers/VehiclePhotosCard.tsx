import { useState } from "react";
import {
  INSPECTIONS_PAGE_SIZE,
  useCreateInspection,
  useDriverInspections,
  useReissueInspection,
  useRevokeInspection,
  useSendInspectionLink,
  type Inspection,
  type InspectionType,
  type SentInspectionLink,
} from "../../api/inspections.queries";
import { formatDateTime, formatUsPhone } from "../../utils";
import { FormField } from "../form/FormLayout";
import Input from "../form/input/InputField";
import Badge, { type BadgeColor } from "../ui/badge/Badge";
import Button from "../ui/button/Button";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import Pagination from "../ui/pagination/Pagination";

/** What the card needs to know about the driver. */
interface CardDriver {
  id: string;
  firstName: string;
  phone: string;
  smsOptedOut: boolean;
  profile: { preferredLanguage: "en" | "es" };
}

const TYPE_LABEL: Record<InspectionType, string> = {
  check_in: "Check-in",
  check_out: "Check-out",
};

/** The status as words and a colour. `expired` is worked out by the API from the link time. */
function statusOf(inspection: Inspection): {
  label: string;
  color: BadgeColor;
} {
  switch (inspection.status) {
    case "created":
      return { label: "No link yet", color: "light" };
    case "link_sent":
      return {
        label: inspection.linkSentAt ? "Link sent" : "Link made (not texted)",
        color: "info",
      };
    case "opened":
      return { label: "Opened", color: "info" };
    case "in_progress":
      return { label: "In progress", color: "warning" };
    case "submitted":
      return { label: "Submitted", color: "success" };
    case "reviewed":
      return { label: "Reviewed", color: "success" };
    case "flagged":
      return { label: "Flagged", color: "error" };
    case "revoked":
      return { label: "Revoked", color: "light" };
    case "expired":
      return { label: "Link expired", color: "error" };
  }
}

/** True while the driver can still use (or be given) a link: not submitted, reviewed, flagged or revoked. */
const isOpen = (inspection: Inspection) =>
  ["created", "link_sent", "opened", "in_progress", "expired"].includes(
    inspection.status,
  );

/** The link, shown once, with a copy button (the clipboard can be blocked, so it is also selectable text). */
function LinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(link).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <input
          readOnly
          aria-label="Link"
          value={link}
          onFocus={(event) => event.target.select()}
          className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-surface px-3 text-sm text-gray-800"
        />
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-1 text-theme-xs text-gray-500">
        Shown once: the system keeps only a fingerprint of the link, so it
        cannot be shown again. Copy it now, or make a new one later (the old one
        then stops working).
      </p>
    </div>
  );
}

/** What the card asks for in the vehicle boxes, when the driver's contract holds no vehicle. */
interface VehicleForm {
  model: string;
  plate: string;
  vin: string;
}

/**
 * The Vehicle Photos card (Module 3, D102): the driver's check-in and check-out inspections, with Send link (texts a fresh
 * link in the driver's language through the Quo chat), Copy link (a fresh link, not texted) and Revoke. A link is never
 * stored, so sending or copying makes a new one and the old one stops working (D103). The photos themselves are shown on
 * the staff review screens of the next chat.
 */
export default function VehiclePhotosCard({ driver }: { driver: CardDriver }) {
  const [page, setPage] = useState(1);
  const inspections = useDriverInspections(driver.id, page);
  const create = useCreateInspection(driver.id);
  const send = useSendInspectionLink(driver.id);
  const reissue = useReissueInspection(driver.id);
  const revoke = useRevokeInspection(driver.id);

  /** What the open dialog is about: sending (a new one of a type, or again for one that exists), revoking. */
  const [sending, setSending] = useState<
    | { kind: "new"; type: InspectionType }
    | { kind: "again"; inspection: Inspection }
    | null
  >(null);
  const [revoking, setRevoking] = useState<Inspection | null>(null);
  const [vehicle, setVehicle] = useState<VehicleForm>({
    model: "",
    plate: "",
    vin: "",
  });
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { kind: "sent"; sent: SentInspectionLink }
    | { kind: "copied"; link: string; reference: string }
    | null
  >(null);

  const data = inspections.data;
  const contractVehicle = data?.contractVehicle ?? null;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const busy =
    create.isPending || send.isPending || reissue.isPending || revoke.isPending;
  const language =
    driver.profile.preferredLanguage === "es" ? "Spanish" : "English";

  // A vehicle is asked for only when a new inspection is made for a driver whose contract holds none.
  const needsVehicle = sending?.kind === "new" && contractVehicle === null;
  const vehicleReady = !needsVehicle || vehicle.model.trim() !== "";

  const closeSending = () => {
    setSending(null);
    setProblem(null);
  };

  const confirmSend = async () => {
    if (!sending) return;
    setProblem(null);
    try {
      let inspectionId: string;
      if (sending.kind === "again") {
        inspectionId = sending.inspection.id;
      } else {
        const made = await create.mutateAsync({
          type: sending.type,
          vehicle: needsVehicle
            ? {
                model: vehicle.model.trim(),
                ...(vehicle.plate.trim()
                  ? { plate: vehicle.plate.trim() }
                  : {}),
                ...(vehicle.vin.trim() ? { vin: vehicle.vin.trim() } : {}),
              }
            : undefined,
        });
        inspectionId = made.id;
      }
      const sent = await send.mutateAsync(inspectionId);
      setSending(null);
      setResult({ kind: "sent", sent });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Sending failed.");
    }
  };

  const copyLink = async (inspection: Inspection) => {
    setResult(null);
    try {
      const made = await reissue.mutateAsync(inspection.id);
      setResult({
        kind: "copied",
        link: made.link,
        reference: inspection.reference,
      });
    } catch (error) {
      setResult(null);
      setProblem(
        error instanceof Error ? error.message : "Making the link failed.",
      );
    }
  };

  const confirmRevoke = async () => {
    if (!revoking) return;
    try {
      await revoke.mutateAsync(revoking.id);
      setRevoking(null);
      setProblem(null);
    } catch (error) {
      setRevoking(null);
      setProblem(error instanceof Error ? error.message : "Revoking failed.");
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-surface p-6">
      <h2 className="text-base font-semibold text-gray-800">Vehicle Photos</h2>
      <p className="mt-1 mb-4 text-theme-xs text-gray-500">
        Check-in (pickup) and check-out (return) photos. The driver gets a
        texted link, no login. {language} for {driver.firstName}.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => {
            setResult(null);
            setProblem(null);
            setSending({ kind: "new", type: "check_in" });
          }}
        >
          Send check-in link
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setResult(null);
            setProblem(null);
            setSending({ kind: "new", type: "check_out" });
          }}
        >
          Send check-out link
        </Button>
      </div>

      {problem && !sending && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600"
        >
          {problem}
        </p>
      )}

      {result?.kind === "sent" && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-success-200 bg-success-50 px-3 py-3 text-sm text-success-700"
        >
          {result.sent.textMode === "dry_run" ? (
            <p>
              <strong>Test mode:</strong> the text to {driver.firstName} was
              saved in the chat but not sent (texting is on dry run).
            </p>
          ) : (
            <p>
              The {TYPE_LABEL[result.sent.inspection.type].toLowerCase()} link
              was texted to {driver.firstName} ({result.sent.textStatus}).
            </p>
          )}
          <LinkBox link={result.sent.link} />
        </div>
      )}
      {result?.kind === "copied" && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-success-200 bg-success-50 px-3 py-3 text-sm text-success-700"
        >
          <p>
            New link for {result.reference}. It has not been texted to anyone.
          </p>
          <LinkBox link={result.link} />
        </div>
      )}

      <div className="mt-5">
        {inspections.isPending ? (
          <p className="text-sm text-gray-500">Loading vehicle photos...</p>
        ) : inspections.isError ? (
          <p role="alert" className="text-sm text-error-600">
            {inspections.error.message}
          </p>
        ) : data && data.items.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing sent yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {data?.items.map((inspection) => {
              const status = statusOf(inspection);
              const open = isOpen(inspection);
              const linkMade = [
                "link_sent",
                "opened",
                "in_progress",
                "expired",
              ].includes(inspection.status);
              return (
                <li key={inspection.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {TYPE_LABEL[inspection.type]}
                    </span>
                    <Badge size="sm" color={status.color}>
                      {status.label}
                    </Badge>
                    <span className="text-theme-xs text-gray-500">
                      {inspection.reference}
                    </span>
                  </div>
                  <p className="mt-1 text-theme-xs text-gray-500">
                    {inspection.vehicle.model}
                    {inspection.vehicle.plate
                      ? ` · ${inspection.vehicle.plate}`
                      : ""}
                  </p>
                  <p className="text-theme-xs text-gray-500">
                    {inspection.status === "submitted" ||
                    inspection.status === "reviewed" ||
                    inspection.status === "flagged"
                      ? `Submitted ${formatDateTime(inspection.submittedAt)}`
                      : inspection.status === "revoked"
                        ? `Made ${formatDateTime(inspection.createdAt)}`
                        : linkMade
                          ? `Link ${inspection.status === "expired" ? "expired" : "works until"} ${formatDateTime(inspection.tokenExpiresAt)}`
                          : `Made ${formatDateTime(inspection.createdAt)}`}
                    {" · "}
                    {inspection.photoCount} of 19 photos
                    {inspection.damagePhotoCount > 0
                      ? `, ${inspection.damagePhotoCount} damage`
                      : ""}
                  </p>
                  {open && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setResult(null);
                          setProblem(null);
                          setSending({ kind: "again", inspection });
                        }}
                      >
                        {inspection.linkSentAt ? "Send again" : "Send link"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => copyLink(inspection)}
                      >
                        Copy link
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
                        onClick={() => {
                          setProblem(null);
                          setRevoking(inspection);
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
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
        {data && data.total > INSPECTIONS_PAGE_SIZE && (
          <p className="mt-2 text-theme-xs text-gray-500">
            {data.total} in all.
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={sending !== null}
        wide
        title={
          sending?.kind === "again"
            ? `Send the ${TYPE_LABEL[sending.inspection.type].toLowerCase()} link again`
            : `Send the ${sending ? TYPE_LABEL[sending.type].toLowerCase() : ""} link`
        }
        confirmLabel={busy ? "Sending..." : "Send text"}
        confirmDisabled={busy || !vehicleReady || driver.smsOptedOut}
        onCancel={closeSending}
        onConfirm={confirmSend}
      >
        <p>
          This texts {driver.firstName} ({formatUsPhone(driver.phone)}) a link
          in {language}. The link works for 24 hours.
          {sending?.kind === "again" &&
            " An earlier link stops working: the photos already taken are kept."}
        </p>
        {driver.smsOptedOut && (
          <p className="mt-2 text-error-600">
            This driver texted STOP, so no text can be sent. Close this and use
            Copy link instead.
          </p>
        )}
        {needsVehicle && (
          <div className="mt-4 space-y-3">
            <p>
              This driver has no signed contract with a vehicle. Type the
              vehicle that is being{" "}
              {sending?.kind === "new" && sending.type === "check_in"
                ? "picked up"
                : "returned"}
              :
            </p>
            <FormField
              label="Make and model"
              htmlFor="inspection-model"
              required
            >
              <Input
                id="inspection-model"
                value={vehicle.model}
                placeholder="2021 Toyota Camry"
                maxLength={200}
                autoComplete="off"
                onChange={(event) =>
                  setVehicle((v) => ({ ...v, model: event.target.value }))
                }
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Plate" htmlFor="inspection-plate">
                <Input
                  id="inspection-plate"
                  value={vehicle.plate}
                  maxLength={20}
                  autoComplete="off"
                  onChange={(event) =>
                    setVehicle((v) => ({ ...v, plate: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="VIN" htmlFor="inspection-vin">
                <Input
                  id="inspection-vin"
                  value={vehicle.vin}
                  maxLength={50}
                  autoComplete="off"
                  onChange={(event) =>
                    setVehicle((v) => ({ ...v, vin: event.target.value }))
                  }
                />
              </FormField>
            </div>
          </div>
        )}
        {!needsVehicle && sending?.kind === "new" && contractVehicle && (
          <p className="mt-2">
            Vehicle (from the signed contract): {contractVehicle.model}
            {contractVehicle.plate ? ` · ${contractVehicle.plate}` : ""}.
          </p>
        )}
        {problem && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-error-600"
          >
            {problem}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={revoking !== null}
        title="Revoke this inspection?"
        confirmLabel={revoke.isPending ? "Revoking..." : "Revoke"}
        confirmVariant="danger"
        confirmDisabled={revoke.isPending}
        onCancel={() => setRevoking(null)}
        onConfirm={confirmRevoke}
      >
        {revoking && TYPE_LABEL[revoking.type]} {revoking?.reference} is
        cancelled and its link stops working for good. Photos already taken are
        kept. You can send a new one afterwards.
      </ConfirmDialog>
    </div>
  );
}
