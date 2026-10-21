import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  SendContractError,
  useContractNumbers,
  useCreateContractDraft,
  useDeleteContractDraft,
  useDriverContract,
  useSendContract,
  useUpdateContractDraft,
  type ContractDraft as Draft,
} from "../../api/contracts.queries";
import { useDriver } from "../../api/drivers.queries";
import {
  ONE_TIME_CHARGES,
  RECURRING_CHARGES,
  readContractForm,
  valuesFromDraft,
  type ChargeKey,
  type ContractFormValues,
} from "../../components/contracts/contractForm";
import Card from "../../components/contracts/ContractCard";
import ContractDetailsCards from "../../components/contracts/ContractDetailsCards";
import ContractStatusBanner from "../../components/contracts/ContractStatusBanner";
import LeaseDisclosureSummary from "../../components/contracts/LeaseDisclosureSummary";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import ConfirmDialog from "../../components/ui/modal/ConfirmDialog";
import { formatDateTime } from "../../utils";

/**
 * The form and the live summary. Mounted once the contract has loaded: the boxes start from the saved draft (or from a
 * blank weekly contract) and are then owned by this component, so a refetch never overwrites what is being typed. A
 * contract that was sent for signing (step 3) is shown read-only, with a banner.
 */
function ContractEditor({
  driverId,
  driverName,
  driverEmail,
  draft,
}: {
  driverId: string;
  driverName: string;
  driverEmail: string;
  draft: Draft | null;
}) {
  const navigate = useNavigate();
  const [values, setValues] = useState<ContractFormValues>(() =>
    valuesFromDraft(draft),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);

  const create = useCreateContractDraft(driverId);
  const update = useUpdateContractDraft(driverId);
  const remove = useDeleteContractDraft(driverId);
  const send = useSendContract(driverId);
  const mutations = [create, update, remove];
  const busy = [...mutations, send].some((m) => m.isPending);
  const actionError = mutations.find((m) => m.isError)?.error;
  const sentAt = draft?.sentAt ?? null;
  const sent = sentAt !== null;
  const sendError = send.error;
  /** Values still empty: the admin must close the dialog and fill them in before trying again. */
  const missing =
    sendError instanceof SendContractError ? sendError.missing : [];

  const { input, numbersInput, problems } = readContractForm(values);
  const numbers = useContractNumbers(numbersInput);

  /** Saved, never saved, or changed since: compares the boxes with the saved draft's own values. */
  const savedInput = draft
    ? readContractForm(valuesFromDraft(draft)).input
    : null;
  const unsaved =
    draft === null || JSON.stringify(input) !== JSON.stringify(savedInput);

  const set = <K extends keyof ContractFormValues>(
    key: K,
    value: ContractFormValues[K],
  ) => {
    mutations.forEach((m) => m.reset());
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const save = () => {
    if (!input) return;
    mutations.forEach((m) => m.reset());
    if (draft) update.mutate({ id: draft.id, body: input });
    else create.mutate(input);
  };

  const per = values.schedule === "weekly" ? "week" : "day";

  /** One money box. */
  const moneyBox = (key: ChargeKey, label: string) => (
    <div key={key}>
      <Label htmlFor={`contract-${key}`}>{label}</Label>
      <Input
        id={`contract-${key}`}
        placeholder="0.00"
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
        error={problems[key] !== undefined}
        hint={problems[key]}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <Link
        to={`/admin/drivers/${driverId}`}
        className="inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to {driverName}
      </Link>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold text-gray-800">
            {sent ? "Contract" : "Contract draft"} for {driverName}
          </h1>
          <p className="text-sm text-gray-500">
            {sent
              ? "Sent for signing. It can no longer be changed."
              : draft === null
                ? "Not saved yet."
                : unsaved
                  ? "You have unsaved changes."
                  : `Saved ${formatDateTime(draft.updatedAt)}.`}
          </p>
        </div>
        {!sent && (
          <div className="flex flex-wrap items-center gap-3">
            {draft && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
              >
                {remove.isPending ? "Deleting..." : "Delete draft"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={busy || input === null || !unsaved}
              title={
                input === null
                  ? "Fill in the boxes marked in red first."
                  : !unsaved
                    ? "Nothing has changed since the last save."
                    : undefined
              }
              onClick={save}
            >
              {create.isPending || update.isPending
                ? "Saving..."
                : "Save draft"}
            </Button>
            <Button
              size="sm"
              disabled={busy || draft === null || unsaved}
              title={
                draft === null || unsaved
                  ? "Save the draft first: the saved values are what is sent."
                  : undefined
              }
              onClick={() => {
                send.reset();
                setConfirmingSend(true);
              }}
            >
              Send for signing
            </Button>
          </div>
        )}
      </div>

      {sent && draft && (
        <ContractStatusBanner contract={draft} driverName={driverName} />
      )}

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {actionError.message}
        </p>
      )}

      <ConfirmDialog
        isOpen={confirmingDelete}
        title="Delete this draft?"
        confirmLabel="Delete draft"
        confirmVariant="danger"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          if (!draft) return;
          mutations.forEach((m) => m.reset());
          remove.mutate(draft.id, {
            onSuccess: () => navigate(`/admin/drivers/${driverId}`),
          });
        }}
      >
        The numbers typed here are removed. Nothing has been sent to the driver,
        and you can start a new draft any time.
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={confirmingSend}
        title={`Send the contract to ${driverName}?`}
        confirmLabel={send.isPending ? "Sending..." : "Send for signing"}
        confirmDisabled={send.isPending || missing.length > 0}
        onCancel={() => {
          setConfirmingSend(false);
          send.reset();
        }}
        onConfirm={() => {
          if (!draft) return;
          send.mutate(draft.id, {
            onSuccess: () => setConfirmingSend(false),
          });
        }}
      >
        <p>
          It will be emailed to {driverEmail} to sign. It cannot be edited
          afterwards.
        </p>
        {send.isError &&
          (missing.length > 0 ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-error-600"
            >
              <p>Fill these in first (close this and edit the draft):</p>
              <ul className="mt-2 list-disc pl-5">
                {missing.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-error-600"
            >
              {send.error.message}
            </p>
          ))}
      </ConfirmDialog>

      {/* A sent contract is shown as it was sent: every box is switched off. */}
      <fieldset
        disabled={sent}
        className="m-0 grid min-w-0 grid-cols-1 gap-6 border-0 p-0 lg:grid-cols-2"
      >
        <div className="space-y-6">
          <Card title="Rate and term">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contract-schedule">Payment schedule</Label>
                <Select
                  id="contract-schedule"
                  value={values.schedule}
                  onChange={(value) =>
                    set("schedule", value as ContractFormValues["schedule"])
                  }
                  options={[
                    { value: "weekly", label: "Weekly" },
                    { value: "daily", label: "Daily" },
                  ]}
                />
              </div>
              <div>
                <Label htmlFor="contract-total">Total rate ($ per {per})</Label>
                <Input
                  id="contract-total"
                  placeholder="0.00"
                  value={values.total}
                  onChange={(e) => set("total", e.target.value)}
                  error={problems.total !== undefined}
                  hint={problems.total}
                />
              </div>
              <div>
                <Label htmlFor="contract-start">Start date</Label>
                <Input
                  id="contract-start"
                  type="date"
                  value={values.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contract-term">Term (months)</Label>
                <Input
                  id="contract-term"
                  type="number"
                  min="1"
                  max="60"
                  step={1}
                  value={values.term}
                  onChange={(e) => set("term", e.target.value)}
                  error={problems.term !== undefined}
                  hint={problems.term}
                />
              </div>
            </div>
          </Card>

          <Card
            title="One-time charges ($)"
            note="Due at pickup, on top of the first payment. Leave empty for none."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ONE_TIME_CHARGES.map(([key, label]) => moneyBox(key, label))}
            </div>
          </Card>

          <Card
            title="Recurring charges ($)"
            note={`Added to every ${per}'s payment in the summary. Leave empty for none.`}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {RECURRING_CHARGES.map(([key, label]) => moneyBox(key, label))}
            </div>
          </Card>

          <ContractDetailsCards values={values} problems={problems} set={set} />
        </div>

        <div>
          <Card
            title="Lease disclosure summary"
            note="Calculated from the total rate. Nothing here is typed by hand."
          >
            {numbersInput === null || !numbers.data ? (
              numbers.isError && numbersInput !== null ? (
                <p role="alert" className="text-sm text-error-600">
                  {numbers.error.message}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  {numbersInput === null
                    ? "Enter the total rate to see the summary."
                    : "Calculating..."}
                </p>
              )
            ) : (
              <div
                className={numbers.isPlaceholderData ? "opacity-60" : undefined}
              >
                <LeaseDisclosureSummary
                  input={numbers.data.input}
                  numbers={numbers.data.numbers}
                />
              </div>
            )}
          </Card>
        </div>
      </fieldset>
    </div>
  );
}

/**
 * A driver's contract (Module 2, `/admin/drivers/:id/contract`): the admin types the rate, the dates and the charges, the
 * system works out the rest (D71) and shows it as the lease disclosure; the company, vehicle and driver details (step 2)
 * are typed below; "Save draft" keeps it all, and "Send for signing" (step 3) emails it to the driver through firma and
 * freezes it. A driver has at most one draft.
 */
export default function ContractDraftPage() {
  const { id = "" } = useParams();
  const driver = useDriver(id);
  const draft = useDriverContract(id);

  if (driver.isPending || draft.isPending) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }
  const loadError = driver.error ?? draft.error;
  if (loadError || !driver.data || !draft.data) {
    return (
      <div className="space-y-4">
        <Link to="/admin/drivers" className="text-sm text-brand-500">
          ← Back to drivers
        </Link>
        <p role="alert" className="text-sm text-error-600">
          {loadError?.message ?? "Loading failed."}
        </p>
      </div>
    );
  }

  return (
    <ContractEditor
      driverId={id}
      driverName={`${driver.data.firstName} ${driver.data.lastName}`}
      driverEmail={driver.data.email}
      draft={draft.data.contract}
    />
  );
}
